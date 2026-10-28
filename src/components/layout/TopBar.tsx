'use client';

/**
 * @file TopBar.tsx
 * @description Cabeçalho superior da aplicação autenticada contendo navegação de retorno,
 * identidade visual MedHUSM, gatilho do modal informativo/ético e menu de perfil/logout.
 */

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, User, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { AppInfoModal } from '@/components/common/AppInfoModal';
import styles from '@/components/ui/ui.module.css';

interface UserProfileDropdownProps {
  userName: string;
  userRoleBadgeLabel: string;
  onCloseMenu: () => void;
  onLogout: () => void;
}

function UserProfileDropdown({
  userName,
  userRoleBadgeLabel,
  onCloseMenu,
  onLogout,
}: UserProfileDropdownProps) {
  return (
    <Card
      variant="out"
      style={{
        position: 'absolute',
        top: '56px',
        right: '0',
        padding: 'var(--spacing-ml)',
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '0 var(--spacing-sm) var(--spacing-sm) var(--spacing-sm)',
          borderBottom:
            'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
          marginBottom: 'var(--spacing-min)',
        }}
      >
        <p style={{ fontWeight: 'var(--typography-fontweights-semibold)', fontSize: '0.9rem' }}>
          {userName}
        </p>
        <p
          style={{
            fontSize: 'var(--typography-fontsizes-caption)',
            color: 'var(--color-semantic-text-textlight)',
          }}
        >
          {userRoleBadgeLabel}
        </p>
      </div>

      <button
        type="button"
        className={styles.menuItem}
        style={{ width: '100%', justifyContent: 'flex-start' }}
        onClick={onCloseMenu}
      >
        Minha Conta
      </button>

      <button
        type="button"
        className={styles.menuItem}
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          color: 'var(--color-primitive-general-error)',
        }}
        onClick={onLogout}
      >
        Sair
      </button>
    </Card>
  );
}

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/');
  };

  const isRootTabRoute =
    pathname === '/chat' || pathname === '/study' || pathname === '/tools' || pathname === '/';
  const userRoleBadgeLabel = user.role === 'doctor' ? 'Profissional' : 'Estudante';

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          position: 'relative',
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minWidth: '88px',
          }}
        >
          {!isRootTabRoute ? (
            <button
              type="button"
              className="neu-button"
              onClick={() => router.back()}
              style={{
                border: 'none',
                borderRadius: 'var(--radius-radius-full)',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-semantic-text-textdark)',
              }}
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div style={{ width: '40px', height: '40px' }} />
          )}
        </div>

        <div
          style={{
            fontWeight: 'var(--typography-fontweights-semibold)',
            color: 'var(--color-semantic-text-textdark)',
            fontSize: 'var(--typography-fontsizes-subheading)',
            fontFamily: 'var(--typography-fontfamilies-mainmono)',
            fontStyle: 'italic',
            textAlign: 'center',
            flex: 1,
          }}
        >
          MedHUSM
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)',
            minWidth: '88px',
          }}
        >
          <button
            type="button"
            className="neu-button"
            onClick={() => setIsInfoModalOpen(true)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
            }}
            title="Sobre o MedHUSM e Diretrizes"
            aria-label="Sobre o MedHUSM e Diretrizes"
          >
            <Info size={20} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="neu-button"
              onClick={() => setIsUserMenuOpen((previousState) => !previousState)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-semantic-text-textdark)',
              }}
              title="Menu do usuário"
              aria-label="Menu do usuário"
            >
              <User size={24} />
            </button>

            {isUserMenuOpen && (
              <UserProfileDropdown
                userName={user.name}
                userRoleBadgeLabel={userRoleBadgeLabel}
                onCloseMenu={() => setIsUserMenuOpen(false)}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </header>

      <AppInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
