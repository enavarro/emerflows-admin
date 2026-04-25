import { requireAdmin } from '@/lib/auth/require-admin';

export default async function TeachLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // RBAC gate: redirects non-admins / unauthenticated users.
  // Throws NEXT_REDIRECT on failure paths — never returns null.
  await requireAdmin();

  return <>{children}</>;
}
