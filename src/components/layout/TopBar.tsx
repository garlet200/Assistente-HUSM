'use client';

/**
 * @file TopBar.tsx
 * @description Cabeçalho superior da aplicação autenticada com navegação integrada no Desktop,
 * identidade visual MedHUSM, gatilho do modal institucional e menu dropdown do usuário.
 */

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, User, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AppInfoModal } from '@/components/common/AppInfoModal';
import { BrandLogo } from '@/components/common/BrandLogo';
import { maskEmailAddress } from '@/lib/utils/formatters';
import { NAVIGATION_TAB_ITEMS, resolveTabDestinationPath } from './BottomNav';
import { UserProfileDropdown } from './UserProfileDropdown';
import styles from '@/components/ui/ui.module.css';
import shellStyles from './DesktopWorkspaceShell.module.css';

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
  const isProfileRoute = pathname.startsWith('/profile');
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
          gap: 'var(--spacing-md)',
        }}
      >
        <div className={shellStyles.topBarLeftSlot}>
          {!isRootTabRoute && (
            <button
              type="button"
              className={`neu-button ${isProfileRoute ? '' : shellStyles.mobileOnly}`}
              onClick={() => router.back()}
              style={{
                border: 'none',
                borderRadius: 'var(--radius-radius-full)',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-semantic-text-textdark)',
                flexShrink: 0,
              }}
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className={shellStyles.topBarBrandDesktop}>
            <BrandLogo variant="icon" size="md" />
          </div>
        </div>

        <div className={shellStyles.topBarBrandMobile}>
          <BrandLogo variant="icon" size="md" />
        </div>

        <nav className={shellStyles.desktopOnlyNav} aria-label="Navegação Principal">
          {NAVIGATION_TAB_ITEMS.map((tabItem) => {
            const isActive = pathname.startsWith(tabItem.path);
            return (
              <button
                key={tabItem.path}
                type="button"
                className={styles.menuItem}
                onClick={() => router.push(resolveTabDestinationPath(tabItem, pathname))}
                style={{
                  flexDirection: 'row',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-radius-large)',
                  color: isActive
                    ? 'var(--color-semantic-accent-accentprimary)'
                    : 'var(--color-semantic-text-textdark)',
                  boxShadow: isActive ? 'var(--shadow-inset-medium)' : 'none',
                }}
              >
                {tabItem.icon}
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </nav>

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
