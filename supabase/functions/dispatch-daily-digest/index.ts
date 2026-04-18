// Aggregates pending like/favorite engagement events from the past 24h,
// groups them by recipient + app, and triggers digest emails.
// Triggered by pg_cron daily at 20:00. Service-role only.

import { createClient } from 'npm:@supabase/supabase-js@2'

interface PendingRow {
  id: string
  recipient_user_id: string
  app_id: string
  actor_user_id: string
  event_type: 'like' | 'favorite'
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  const token = authHeader.slice(7).trim()
  const claims = parseJwtClaims(token)
  if (claims?.role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch up to last 24h pending events
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: pending, error: pendingErr } = await supabase
    .from('pending_engagement_notifications')
    .select('id, recipient_user_id, app_id, actor_user_id, event_type')
    .gte('created_at', cutoff)
    .returns<PendingRow[]>()

  if (pendingErr) {
    console.error('Failed to load pending notifications', pendingErr)
    return new Response(JSON.stringify({ error: 'load_failed' }), { status: 500 })
  }
  if (!pending?.length) {
    return new Response(JSON.stringify({ processed: 0, message: 'no_pending' }), { status: 200 })
  }

  // Group by recipient + event_type + app
  type Bucket = Map<string, Map<string, number>> // recipient -> appId -> count
  const likeBuckets: Bucket = new Map()
  const favBuckets: Bucket = new Map()
  const allIds: string[] = []

  for (const row of pending) {
    // Skip self-engagement
    if (row.actor_user_id === row.recipient_user_id) {
      allIds.push(row.id)
      continue
    }
    const target = row.event_type === 'like' ? likeBuckets : favBuckets
    if (!target.has(row.recipient_user_id)) target.set(row.recipient_user_id, new Map())
    const appMap = target.get(row.recipient_user_id)!
    appMap.set(row.app_id, (appMap.get(row.app_id) ?? 0) + 1)
    allIds.push(row.id)
  }

  // Collect all recipient ids
  const recipientIds = new Set<string>([...likeBuckets.keys(), ...favBuckets.keys()])
  if (recipientIds.size === 0) {
    if (allIds.length) {
      await supabase.from('pending_engagement_notifications').delete().in('id', allIds)
    }
    return new Response(JSON.stringify({ processed: 0, message: 'no_recipients' }), { status: 200 })
  }

  // Load preferences for recipients
  const { data: prefs } = await supabase
    .from('email_preferences')
    .select('user_id, like_digest, favorite_digest')
    .in('user_id', Array.from(recipientIds))

  const prefMap = new Map<string, { like: boolean; fav: boolean }>()
  for (const p of prefs ?? []) {
    prefMap.set(p.user_id, { like: !!p.like_digest, fav: !!p.favorite_digest })
  }

  // Load recipient emails + display names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', Array.from(recipientIds))

  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p.display_name ?? '创作者')
  }

  // Get auth emails via admin
  const emailMap = new Map<string, string>()
  for (const uid of recipientIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid)
    if (userData?.user?.email) emailMap.set(uid, userData.user.email)
  }

  // Collect all app titles
  const allAppIds = new Set<string>()
  for (const m of likeBuckets.values()) for (const id of m.keys()) allAppIds.add(id)
  for (const m of favBuckets.values()) for (const id of m.keys()) allAppIds.add(id)
  const { data: apps } = await supabase
    .from('apps')
    .select('id, title')
    .in('id', Array.from(allAppIds))
  const appTitleMap = new Map<string, string>()
  for (const a of apps ?? []) appTitleMap.set(a.id, a.title)

  let sent = 0

  // Send like digests
  for (const [uid, appMap] of likeBuckets) {
    const pref = prefMap.get(uid)
    if (pref && !pref.like) continue
    const email = emailMap.get(uid)
    if (!email) continue
    const items = Array.from(appMap.entries()).map(([appId, count]) => ({
      appId, count, appTitle: appTitleMap.get(appId) ?? '未命名作品',
    }))
    const total = items.reduce((s, i) => s + i.count, 0)
    if (total === 0) continue
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'app-likes-daily-digest',
        recipientEmail: email,
        idempotencyKey: `likes-${uid}-${new Date().toISOString().slice(0, 10)}`,
        templateData: { authorName: profileMap.get(uid) ?? '创作者', totalLikes: total, apps: items },
      },
    })
    sent++
  }

  // Send favorite digests
  for (const [uid, appMap] of favBuckets) {
    const pref = prefMap.get(uid)
    if (pref && !pref.fav) continue
    const email = emailMap.get(uid)
    if (!email) continue
    const items = Array.from(appMap.entries()).map(([appId, count]) => ({
      appId, count, appTitle: appTitleMap.get(appId) ?? '未命名作品',
    }))
    const total = items.reduce((s, i) => s + i.count, 0)
    if (total === 0) continue
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'app-favorites-daily-digest',
        recipientEmail: email,
        idempotencyKey: `favs-${uid}-${new Date().toISOString().slice(0, 10)}`,
        templateData: { authorName: profileMap.get(uid) ?? '创作者', totalFavs: total, apps: items },
      },
    })
    sent++
  }

  // Cleanup processed events
  if (allIds.length) {
    await supabase.from('pending_engagement_notifications').delete().in('id', allIds)
  }

  return new Response(JSON.stringify({ processed: sent, total_events: pending.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
