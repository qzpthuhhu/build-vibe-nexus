import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      return data?.map((r: any) => r.role) || [];
    },
    enabled: !!user,
  });

  return {
    isAdmin: roles.includes('admin') || roles.includes('super_admin'),
    isSuperAdmin: roles.includes('super_admin'),
    roles,
    isLoading,
  };
}
