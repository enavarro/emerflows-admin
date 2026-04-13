'use client';

import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ user: null, profile: null, isLoading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      setState({
        user,
        profile: profile as Profile | null,
        isLoading: false
      });
    }

    void loadUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setState({ user: null, profile: null, isLoading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url')
        .eq('id', session.user.id)
        .single();

      setState({
        user: session.user,
        profile: profile as Profile | null,
        isLoading: false
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/auth/sign-in';
}
