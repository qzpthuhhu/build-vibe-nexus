import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type State = 'loading' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { t } = useTranslation();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage(t('unsubscribe.invalid_token'));
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
          body: { token },
        });
        if (error || !data?.success) {
          setState('error');
          setMessage(data?.error || error?.message || t('unsubscribe.error_default'));
          return;
        }
        setState('success');
        setMessage(data.message || t('unsubscribe.success_default'));
      } catch (e: any) {
        setState('error');
        setMessage(e?.message || t('unsubscribe.error_default'));
      }
    })();
  }, [token, t]);

  return (
    <div className="container max-w-md py-24">
      <div className="glass-card p-8 text-center space-y-4">
        {state === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">{t('unsubscribe.processing')}</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-xl font-bold">{t('unsubscribe.success_title')}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">
              {t('unsubscribe.manage_hint')}
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">{t('unsubscribe.error_title')}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
        <Link to="/">
          <Button variant="outline" className="mt-4">
            {t('unsubscribe.return_home')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
