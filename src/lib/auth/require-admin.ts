import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

const SIGN_IN_PATH = '/auth/sign-in';
const DENIED_TEACH_PATH = '/dashboard/overview?denied=teach';

export interface AdminSession {
  user: User;
  role: Extract<UserRole, 'admin'>;
}

/**
 * Server-only RBAC gate for Teach Admin surfaces.
 * - Redirects unauthenticated callers to /auth/sign-in.
 * - Redirects authenticated non-admins to /dashboard/overview?denied=teach.
 * - Returns the validated admin session on success.
 *
 * MUST be called from Server Components, Route Handlers, or Server Actions.
 * MUST NOT be called from client components — `import 'server-only'` enforces this.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      redirect(SIGN_IN_PATH);
    }
    user = data.user;
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(SIGN_IN_PATH);
  }

  // user is non-null here (redirect would have thrown otherwise).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .maybeSingle();

  if (profileError) {
    // Treat lookup failure as denial — never leak to the route.
    redirect(DENIED_TEACH_PATH);
  }

  if (!profile || profile.role !== 'admin') {
    redirect(DENIED_TEACH_PATH);
  }

  return { user: user!, role: 'admin' };
}

/**
 * Detect Next.js's internal redirect sentinel so we don't swallow it in catch blocks.
 * Next throws an error with `digest` starting with 'NEXT_REDIRECT'.
 */
function isRedirectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}
