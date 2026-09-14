'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './ui.module.css';
import { MessageSquare, BookOpen, Grid } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { 
      path: '/chat', 
      label: 'Clínico',
      icon: <MessageSquare size={24} />
    },
    { 
      path: '/study', 
      label: 'Estudos',
      icon: <BookOpen size={24} />
    },
    { 
      path: '/tools', 
      label: 'Ferramentas',
      icon: <Grid size={24} />
    },
  ];

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        paddingBottom: 'calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      <nav style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
        boxShadow: 'var(--shadow-extruded-medium)',
        borderRadius: 'var(--radius-radius-larger)',
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
                borderRadius: 'var(--radius-radius-large)',
                flexDirection: 'column',
                gap: 'var(--spacing-min)'
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
