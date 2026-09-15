'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, User, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from './Card';
import { AppInfoModal } from '@/components/common/AppInfoModal';
import styles from './ui.module.css';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isRootTabRoute =
    pathname === '/chat' || pathname === '/study' || pathname === '/tools' || pathname === '/';

  if (!user) {
    return null;
  }

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
        {/* Back button visible only in nested pages - balanced to 88px */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: '88px' }}>
          {!isRootTabRoute ? (
            <button
              type="button"
              className="neu-button"
              onClick={() => router.back()}
              style={{
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-semantic-text-textdark)',
              }}
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div style={{ width: '40px', height: '40px' }} />
          )}
        </div>

        {/* Brand Header */}
        <div
          style={{
            fontWeight: 600,
            color: 'var(--color-semantic-text-textdark)',
            fontSize: '1.5rem',
            fontFamily: 'var(--typography-fontfamilies-mainmono)',
            fontStyle: 'italic',
            textAlign: 'center',
            flex: 1,
          }}
        >
          MedHUSM
        </div>

        {/* Right Actions: Info Button & User Profile Menu */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)',
            minWidth: '88px',
          }}
        >
          {/* Info Button */}
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

          {/* User Profile / Menu Trigger */}
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
                    padding: '0 8px 8px 8px',
                    borderBottom: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                    marginBottom: 'var(--spacing-min)',
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-semantic-text-textlight)' }}>
                    {userRoleBadgeLabel}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.menuItem}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Minha Conta
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-primitive-general-error)' }}
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </Card>
            )}
          </div>
        </div>
      </header>

      {/* Info & Ethical Guidelines Modal */}
      <AppInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
