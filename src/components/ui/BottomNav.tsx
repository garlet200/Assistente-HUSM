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
