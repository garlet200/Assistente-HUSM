'use client';

/**
 * @file page.tsx
 * @description Página de Perfil e Preferências do Usuário (/profile), exibindo o painel modular
 * ProfileSettingsPanel dentro do layout autenticado.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ProfileSettingsPanel } from '@/components/profile/ProfileSettingsPanel';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        width: '100%',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 'var(--typography-fontsizes-subheading)',
            fontWeight: 'var(--typography-fontweights-semibold)',
            marginBottom: 'var(--spacing-min)',
            color: 'var(--color-semantic-text-textdark)',
          }}
        >
          Perfil e Preferências
        </h1>
        <p style={{ color: 'var(--color-semantic-text-textlight)', margin: 0 }}>
          Gerencie seus dados cadastrais e o comportamento do assistente.
        </p>
      </div>

      <ProfileSettingsPanel />
    </div>
  );
}
