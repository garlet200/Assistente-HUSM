'use client';

/**
 * @file UserProfileDropdown.tsx
 * @description Menu dropdown do usuário exibido na TopBar com resumo de perfil/IA e ações rápidas.
 */

import { User, Sliders, ShieldAlert, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/Card';
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

export function UserProfileDropdown({
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
