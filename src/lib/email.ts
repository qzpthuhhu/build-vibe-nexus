import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget transactional email sender.
 * Never throws — silently logs errors so it cannot block UX flows.
 */
export async function sendTransactionalEmail(params: {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, any>;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: params.templateName,
        recipientEmail: params.recipientEmail,
        templateData: params.templateData ?? {},
        idempotencyKey: params.idempotencyKey,
      },
    });
    if (error) console.warn('[email] send failed', params.templateName, error);
  } catch (e) {
    console.warn('[email] send threw', params.templateName, e);
  }
}

/**
 * Check whether a user has a particular notification preference enabled.
 * Falls back to `true` if the row is missing (defaults are all-on).
 */
export async function userHasPreference(
  userId: string,
  field: 'comment_notify' | 'like_digest' | 'favorite_digest' | 'review_notify' | 'announcement_notify',
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('email_preferences')
      .select(field)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return true;
    return (data as any)[field] !== false;
  } catch {
    return true;
  }
}

export async function getAdminNotifyEmail(): Promise<string> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('admin_notify_email')
      .eq('id', 1)
      .maybeSingle();
    return data?.admin_notify_email ?? 'richardandelu50@gmail.com';
  } catch {
    return 'richardandelu50@gmail.com';
  }
}

export async function getSiteUrl(): Promise<string> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('site_url')
      .eq('id', 1)
      .maybeSingle();
    return data?.site_url ?? window.location.origin;
  } catch {
    return window.location.origin;
  }
}
