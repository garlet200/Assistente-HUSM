'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Cha2ds2VascCalculator() {
  const router = useRouter();
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);

  // Local Zero-LLM Deterministic Tool (CHA2DS2-VASc)
  const [calcState, setCalcState] = useState({
    c: false, h: false, a2: false, d: false, s2: false, v: false, a: false, sc: false
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const calculateScore = () => {
    let s = 0;
    if (calcState.c) s += 1; // Congestive heart failure
    if (calcState.h) s += 1; // Hypertension
    if (calcState.a2) s += 2; // Age >= 75
    if (calcState.d) s += 1; // Diabetes
    if (calcState.s2) s += 2; // Stroke/TIA
    if (calcState.v) s += 1; // Vascular disease
    if (calcState.a) s += 1; // Age 65-74
    if (calcState.sc) s += 1; // Sex category (female)
    setScore(s);
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <button 
          onClick={() => router.push('/tools')}
          style={{
            background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            boxShadow: 'var(--shadow-extruded-flat)',
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Voltar</h1>
      </div>

      <Card variant="out">
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>Calculadora CHA₂DS₂-VASc (Zero-LLM)</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)', marginBottom: 'var(--spacing-md)' }}>
          Execução 100% local no dispositivo. A IA não é necessária para cálculos determinísticos.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          {Object.entries({
            c: 'Insuficiência Cardíaca Congestiva (+1)',
            h: 'Hipertensão (+1)',
            a2: 'Idade ≥ 75 anos (+2)',
            d: 'Diabetes Mellitus (+1)',
            s2: 'Stroke / AIT / Tromboembolismo prévio (+2)',
            v: 'Doença Vascular (+1)',
            a: 'Idade 65-74 anos (+1)',
            sc: 'Sexo Feminino (+1)',
          }).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <input 
                type="checkbox" 
                checked={calcState[key as keyof typeof calcState]}
                onChange={(e) => setCalcState({...calcState, [key]: e.target.checked})}
              />
              {label}
            </label>
          ))}
        </div>

        <Button onClick={calculateScore}>Calcular Escore</Button>

        {score !== null && (
          <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)', borderRadius: '8px', boxShadow: 'var(--shadow-extruded-flat)' }}>
            <h3 style={{ fontFamily: 'var(--typography-fontfamilies-mainmono)' }}>Escore: {score}</h3>
            <p style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>
              {score === 0 ? 'Risco baixo (considerar não anticoagular).' : 
               score === 1 ? 'Risco moderado (considerar anticoagulação oral).' : 
               'Risco alto (anticoagulação oral recomendada).'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
