'use client';

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
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
        Ferramentas Médicas
      </h1>
      <p style={{ color: 'var(--color-semantic-text-textlight)' }}>
        Módulos práticos de cálculo determinístico (Zero-LLM).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={handleNavigateToCalculator}
          style={{
            background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
            border: 'none',
            borderRadius: '16px',
            padding: 'var(--spacing-lg) var(--spacing-md)',
            boxShadow: 'var(--shadow-extruded-large)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-ml)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            color: 'var(--color-semantic-text-textdark)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
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
