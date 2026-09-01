'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './ui.module.css';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { 
      path: '/chat', 
      label: 'Clínico',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    { 
      path: '/study', 
      label: 'Estudos',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      )
    },
    { 
      path: '/tools', 
      label: 'Ferramentas',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
  ];

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      margin: '0 24px 24px 24px',
      backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
      boxShadow: 'var(--shadow-extruded-medium)',
      borderRadius: '32px',
      position: 'relative',
      zIndex: 50,
      gap: 'var(--spacing-sm)'
    }}>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            className={styles.menuItem}
            onClick={() => {
              if (item.path === '/chat') {
                const activeChatId = sessionStorage.getItem('activeChatId');
                if (activeChatId && !pathname.startsWith('/chat')) {
                  router.push(`/chat/${activeChatId}`);
                } else {
                  router.push(item.path);
                }
              } else if (item.path === '/study') {
                const activeStudyId = sessionStorage.getItem('activeStudyId');
                if (activeStudyId && !pathname.startsWith('/study')) {
                  router.push(`/study/${activeStudyId}`);
                } else {
                  router.push(item.path);
                }
              } else {
                router.push(item.path);
              }
            }}
            title={item.label}
            style={{
              flex: 1,
              padding: 'var(--spacing-ml)',
              fontSize: '0.875rem',
              color: isActive ? 'var(--color-semantic-accent-accentprimary)' : 'var(--color-semantic-text-textdark)',
              boxShadow: isActive ? 'var(--shadow-inset-medium)' : 'none',
              borderRadius: '24px',
              flexDirection: 'column',
              gap: 'var(--spacing-min)'
            }}
          >
            {item.icon}
          </button>
        );
      })}
    </nav>
  );
}
