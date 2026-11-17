'use client';

/**
 * @file BottomNav.tsx
 * @description Barra de navegação inferior mobile (Clínico, Estudos e Ferramentas) com retomada
 * inteligente de sessões ativas armazenadas em sessionStorage. Oculta no Desktop (>= 1024px).
 */

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, BookOpen, Grid } from 'lucide-react';
import { SESSION_STORAGE_KEYS } from '@/lib/constants/session';
import styles from '@/components/ui/ui.module.css';
import shellStyles from './DesktopWorkspaceShell.module.css';

export interface NavigationTabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeSessionStorageKey?: string;
}

export const NAVIGATION_TAB_ITEMS: readonly NavigationTabItem[] = [
  {
    path: '/chat',
    label: 'Clínico',
    icon: <MessageSquare size={22} />,
    activeSessionStorageKey: SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID,
  },
  {
    path: '/study',
    label: 'Estudos',
    icon: <BookOpen size={22} />,
    activeSessionStorageKey: SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID,
  },
  {
    path: '/tools',
    label: 'Ferramentas',
    icon: <Grid size={22} />,
  },
];

/**
 * Resolves the target route for a navigation tab.
 * Resumes an active session when switching tabs, or navigates to the tab root if already inside it.
 */
export function resolveTabDestinationPath(
  tabItem: NavigationTabItem,
  currentPathname: string
): string {
  if (!tabItem.activeSessionStorageKey) {
    return tabItem.path;
  }

  if (currentPathname.startsWith(tabItem.path)) {
    return tabItem.path;
  }

  const activeSessionId = sessionStorage.getItem(tabItem.activeSessionStorageKey);
  if (activeSessionId) {
    return `${tabItem.path}/${activeSessionId}`;
  }

  return tabItem.path;
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (tabItem: NavigationTabItem): void => {
    router.push(resolveTabDestinationPath(tabItem, pathname));
  };

  return (
    <div
      className={shellStyles.mobileOnly}
      style={{
        width: '100%',
        backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        paddingBottom: 'calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px))',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      <nav
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          boxShadow: 'var(--shadow-extruded-medium)',
          borderRadius: 'var(--radius-radius-larger)',
          gap: 'var(--spacing-sm)',
        }}
      >
        {NAVIGATION_TAB_ITEMS.map((tabItem) => {
          const isActive = pathname.startsWith(tabItem.path);

          return (
            <button
              key={tabItem.path}
              type="button"
              className={styles.menuItem}
              onClick={() => handleTabClick(tabItem)}
              title={tabItem.label}
              aria-label={tabItem.label}
              style={{
                flex: 1,
                padding: 'var(--spacing-ml)',
                fontSize: '0.875rem',
                color: isActive
                  ? 'var(--color-semantic-accent-accentprimary)'
                  : 'var(--color-semantic-text-textdark)',
                boxShadow: isActive ? 'var(--shadow-inset-medium)' : 'none',
                borderRadius: 'var(--radius-radius-large)',
                flexDirection: 'column',
                gap: 'var(--spacing-min)',
              }}
            >
              {tabItem.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
