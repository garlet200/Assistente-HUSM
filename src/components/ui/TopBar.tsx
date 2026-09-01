'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from './Card';
import styles from './ui.module.css';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isMainTab = pathname === '/chat' || pathname === '/study' || pathname === '/tools' || pathname === '/';

  if (!user) return null;

  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: 'var(--spacing-md) var(--spacing-lg)', 
      backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
      position: 'relative',
      zIndex: 50
    }}>
      {!isMainTab ? (
        <button 
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
            color: 'var(--color-semantic-text-textdark)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      ) : (
        <div style={{ width: '40px' }} />
      )}

      <div style={{ 
        fontWeight: 600, 
        color: 'var(--color-semantic-text-textdark)', 
        fontSize: '1.5rem', 
        fontFamily: 'var(--typography-fontfamilies-mainmono)', 
        fontStyle: 'italic',
        textAlign: 'center'
      }}>
        MedHUSM
      </div>

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-radius-full)',
            border: 'none',
            background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
            boxShadow: 'var(--shadow-extruded-flat)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-text-textdark)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>

        {menuOpen && (
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
              zIndex: 100
            }}
          >
            <div style={{ padding: '0 8px 8px 8px', borderBottom: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)', marginBottom: 'var(--spacing-min)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-semantic-text-textlight)' }}>{user.role === 'doctor' ? 'Profissional' : 'Estudante'}</p>
            </div>
            <button 
              className={styles.menuItem} 
              style={{ width: '100%', justifyContent: 'flex-start' }} 
              onClick={() => setMenuOpen(false)}
            >
              Minha Conta
            </button>
            <button 
              className={styles.menuItem} 
              style={{ width: '100%', justifyContent: 'flex-start', color: '#E53E3E' }} 
              onClick={handleLogout}
            >
              Sair
            </button>
          </Card>
        )}
      </div>
    </header>
  );
}
