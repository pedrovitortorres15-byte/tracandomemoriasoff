import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['catharinaferrario@gmail.com'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkRole = async (u: User | null) => {
      if (!u) {
        if (mounted) setIsAdmin(false);
        return;
      }
      // 1) shortcut: e-mail da dona é sempre admin (resiliente a falha de migração)
      if (ADMIN_EMAILS.includes(u.email?.toLowerCase() || '')) {
        if (mounted) setIsAdmin(true);
      }
      // 2) ainda assim, valida no banco
      const { data } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', u.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (mounted) setIsAdmin(!!data || ADMIN_EMAILS.includes(u.email?.toLowerCase() || ''));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // defer DB call to avoid blocking auth callback
      setTimeout(() => checkRole(u), 0);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      if (mounted) {
        setUser(u);
        checkRole(u);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return { user, isAdmin, loading, signOut };
}
