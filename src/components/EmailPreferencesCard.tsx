import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Prefs = {
  comment_notify: boolean;
  like_digest: boolean;
  favorite_digest: boolean;
  review_notify: boolean;
  announcement_notify: boolean;
};

const DEFAULTS: Prefs = {
  comment_notify: true,
  like_digest: true,
  favorite_digest: true,
  review_notify: true,
  announcement_notify: true,
};

export default function EmailPreferencesCard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('email_preferences')
        .select('comment_notify, like_digest, favorite_digest, review_notify, announcement_notify')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setPrefs(data as Prefs);
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    setPrefs((p) => ({ ...p, [key]: value }));
    setSavingKey(key);
    const { error } = await supabase
      .from('email_preferences')
      .upsert(
        { user_id: user.id, ...{ ...prefs, [key]: value } },
        { onConflict: 'user_id' },
      );
    setSavingKey(null);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !value }));
      toast.error(t('email_prefs.save_failed'));
    } else {
      toast.success(t('email_prefs.saved'));
    }
  };

  const ROWS: { key: keyof Prefs; titleKey: string; descKey: string }[] = [
    { key: 'review_notify', titleKey: 'email_prefs.review_title', descKey: 'email_prefs.review_desc' },
    { key: 'comment_notify', titleKey: 'email_prefs.comment_title', descKey: 'email_prefs.comment_desc' },
    { key: 'like_digest', titleKey: 'email_prefs.like_title', descKey: 'email_prefs.like_desc' },
    { key: 'favorite_digest', titleKey: 'email_prefs.favorite_title', descKey: 'email_prefs.favorite_desc' },
    { key: 'announcement_notify', titleKey: 'email_prefs.announce_title', descKey: 'email_prefs.announce_desc' },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        {t('email_prefs.title')}
      </h3>
      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {ROWS.map((r) => (
            <div key={r.key} className="flex items-start justify-between gap-4 py-1">
              <div className="flex-1 min-w-0">
                <Label htmlFor={`pref-${r.key}`} className="text-sm cursor-pointer">
                  {t(r.titleKey)}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t(r.descKey)}</p>
              </div>
              <Switch
                id={`pref-${r.key}`}
                checked={prefs[r.key]}
                disabled={savingKey === r.key}
                onCheckedChange={(v) => toggle(r.key, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
