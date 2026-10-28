'use client';

/**
 * @file page.tsx
 * @description Menu de Ferramentas Médicas (/tools) que dá acesso aos módulos de cálculo
 * clínico determinístico (Zero-LLM).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function ToolsMenu() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleNavigateToCalculator = () => {
    router.push('/tools/cha2ds2-vasc');
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        height: '100%',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--typography-fontsizes-subheading)',
          fontWeight: 'var(--typography-fontweights-semibold)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        Ferramentas Médicas
      </h1>
      <p style={{ color: 'var(--color-semantic-text-textlight)' }}>
        Módulos práticos de cálculo determinístico (Zero-LLM).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        <button
          type="button"
          className="neu-button"
          onClick={handleNavigateToCalculator}
          style={{
            borderRadius: 'var(--radius-radius-medium)',
            padding: 'var(--spacing-lg) var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-ml)',
            color: 'var(--color-semantic-text-textdark)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-radius-full)',
              boxShadow: 'var(--shadow-extruded-flat)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-accent-accentprimary)',
            }}
          >
            <Activity size={24} />
          </div>
          <span style={{ fontWeight: 500, fontSize: '0.875rem', textAlign: 'center' }}>
            CHA₂DS₂-VASc
          </span>
        </button>
      </div>
    </div>
  );
}
