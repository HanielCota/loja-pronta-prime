import type { ReactNode } from 'react';
import { PageShell } from '@/components/brand/page-shell';
import { AuthErrorRecovery } from '@/features/auth/components/action-error-boundary';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PageShell>
      <AuthErrorRecovery>{children}</AuthErrorRecovery>
    </PageShell>
  );
}
