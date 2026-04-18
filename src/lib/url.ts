/**
 * Ensure a URL has an http(s) protocol.
 * - "example.com"          -> "https://example.com"
 * - "see-knowledge.site"   -> "https://see-knowledge.site"
 * - "http://x.com"         -> unchanged
 * - "https://x.com"        -> unchanged
 * - empty / mailto / tel   -> unchanged
 */
export function ensureHttpUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:|sms:)/i.test(trimmed)) return trimmed;
  // Skip relative-looking root paths
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Notify the author of an engagement event (like / favorite) by
 * inserting into pending_engagement_notifications. The daily digest
 * Edge Function later batches and sends emails.
 *
 * Silent failure — we never block UX on notification side-effects.
 */
export async function queueEngagementNotification(
  supabase: any,
  params: {
    appId: string;
    actorUserId: string;
    recipientUserId: string;
    eventType: 'like' | 'favorite';
  },
) {
  if (!params.appId || !params.actorUserId || !params.recipientUserId) return;
  if (params.actorUserId === params.recipientUserId) return; // skip self
  try {
    await supabase.from('pending_engagement_notifications').insert({
      app_id: params.appId,
      actor_user_id: params.actorUserId,
      recipient_user_id: params.recipientUserId,
      event_type: params.eventType,
    });
  } catch {
    // ignore
  }
}
