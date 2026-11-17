'use client';

/**
 * @file TopBar.tsx
 * @description Cabeçalho superior da aplicação autenticada contendo navegação de retorno,
 * identidade visual MedHUSM, gatilho do modal informativo/ético e menu de perfil expandido.
 */

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, User, Info, Sliders, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { AppInfoModal } from '@/components/common/AppInfoModal';
import { maskEmailAddress } from '@/lib/utils/formatters';
import styles from '@/components/ui/ui.module.css';

interface UserProfileDropdownProps {
  userName: string;
  maskedEmail: string;
  userRoleBadgeLabel: string;
  aiLanguageLevel: number;
  aiDetailLevel: number;
  onNavigateProfile: () => void;
  onNavigatePreferences: () => void;
  onOpenEthicalGuidelines: () => void;
  onLogout: () => void;
}

function UserProfileDropdown({
  userName,
  maskedEmail,
  userRoleBadgeLabel,
  aiLanguageLevel,
  aiDetailLevel,
  onNavigateProfile,
  onNavigatePreferences,
  onOpenEthicalGuidelines,
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
        width: '236px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-min)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '0 var(--spacing-sm) var(--spacing-sm) var(--spacing-sm)',
          borderBottom:
            'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
          marginBottom: 'var(--spacing-min)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <p style={{ fontWeight: 'var(--typography-fontweights-semibold)', fontSize: '0.9rem', margin: 0 }}>
          {userName}
        </p>
        <p style={{ fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textlight)', margin: 0 }}>
          {maskedEmail}
        </p>
        <p style={{ fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)', margin: '2px 0 0 0' }}>
          {userRoleBadgeLabel} • Ling. {aiLanguageLevel}/5 • Det. {aiDetailLevel}/5
        </p>
      </div>

      <button type="button" className={styles.menuItem} style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--spacing-sm) var(--spacing-ml)' }} onClick={onNavigateProfile}>
        <User size={16} />
        <span>Meu Perfil</span>
      </button>

      <button type="button" className={styles.menuItem} style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--spacing-sm) var(--spacing-ml)' }} onClick={onNavigatePreferences}>
        <Sliders size={16} />
        <span>Preferências de IA</span>
      </button>

      <button type="button" className={styles.menuItem} style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--spacing-sm) var(--spacing-ml)' }} onClick={onOpenEthicalGuidelines}>
        <ShieldAlert size={16} />
        <span>Diretrizes Éticas</span>
      </button>

      <button
        type="button"
        className={styles.menuItem}
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          padding: 'var(--spacing-sm) var(--spacing-ml)',
          color: 'var(--color-primitive-general-error)',
        }}
        onClick={onLogout}
      >
        <LogOut size={16} />
        <span>Sair</span>
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
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent): void => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isUserMenuOpen]);

  if (!user) return null;

  const handleLogout = async (): Promise<void> => {
    setIsUserMenuOpen(false);
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
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: '88px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', minWidth: '88px' }}>
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

          <div ref={menuContainerRef} style={{ position: 'relative' }}>
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
                maskedEmail={maskEmailAddress(user.email)}
                userRoleBadgeLabel={userRoleBadgeLabel}
                aiLanguageLevel={user.aiLanguageLevel}
                aiDetailLevel={user.aiDetailLevel}
                onNavigateProfile={() => {
                  setIsUserMenuOpen(false);
                  router.push('/profile');
                }}
                onNavigatePreferences={() => {
                  setIsUserMenuOpen(false);
                  router.push('/profile#preferencias');
                }}
                onOpenEthicalGuidelines={() => {
                  setIsUserMenuOpen(false);
                  setIsInfoModalOpen(true);
                }}
                onLogout={() => void handleLogout()}
              />
            )}
          </div>
        </div>
      </header>

      <AppInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
