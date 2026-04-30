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
    let cancelled = false;

    async function applySession(user: User | null) {
      if (cancelled) return;

      if (!user) {
        setState({ user: null, profile: null, isLoading: false });
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (error) {
          // RLS denial / network error — keep user but null profile so callers
          // can decide. This is a UI-state hook; auth gating is enforced server-side.
          console.warn('[use-auth] profile fetch failed:', error.message);
          setState({ user, profile: null, isLoading: false });
          return;
        }

        setState({ user, profile: (profile as Profile) ?? null, isLoading: false });
      } catch (err) {
        if (cancelled) return;
        console.warn('[use-auth] profile fetch threw:', (err as Error).message);
        setState({ user, profile: null, isLoading: false });
      }
    }

    // Initial load: use getSession() (no network call — reads the SSR cookie) so
    // a cancelled getUser() request from React StrictMode double-effect can't
    // leave state stuck on isLoading. Auth correctness is still enforced
    // server-side via requireAdmin(); this hook only drives client UI state.
    (async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        await applySession(session?.user ?? null);
      } catch (err) {
        if (cancelled) return;
        console.warn('[use-auth] getSession failed:', (err as Error).message);
        setState({ user: null, profile: null, isLoading: false });
      }
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/auth/sign-in';
}
