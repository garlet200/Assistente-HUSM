'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Cha2ds2VascCriteria {
  hasCongestiveHeartFailure: boolean;
  hasHypertension: boolean;
  isAge75YearsOrOlder: boolean;
  hasDiabetesMellitus: boolean;
  hasPriorStrokeOrTiaOrThromboembolism: boolean;
  hasVascularDisease: boolean;
  isAge65To74Years: boolean;
  isFemaleSexCategory: boolean;
}

const INITIAL_CRITERIA_STATE: Cha2ds2VascCriteria = {
  hasCongestiveHeartFailure: false,
  hasHypertension: false,
  isAge75YearsOrOlder: false,
  hasDiabetesMellitus: false,
  hasPriorStrokeOrTiaOrThromboembolism: false,
  hasVascularDisease: false,
  isAge65To74Years: false,
  isFemaleSexCategory: false,
};

const CRITERIA_DEFINITIONS: Array<{
  key: keyof Cha2ds2VascCriteria;
  label: string;
  points: number;
}> = [
  { key: 'hasCongestiveHeartFailure', label: 'Insuficiência Cardíaca Congestiva (+1)', points: 1 },
  { key: 'hasHypertension', label: 'Hipertensão (+1)', points: 1 },
  { key: 'isAge75YearsOrOlder', label: 'Idade ≥ 75 anos (+2)', points: 2 },
  { key: 'hasDiabetesMellitus', label: 'Diabetes Mellitus (+1)', points: 1 },
  { key: 'hasPriorStrokeOrTiaOrThromboembolism', label: 'Stroke / AIT / Tromboembolismo prévio (+2)', points: 2 },
  { key: 'hasVascularDisease', label: 'Doença Vascular (+1)', points: 1 },
  { key: 'isAge65To74Years', label: 'Idade 65-74 anos (+1)', points: 1 },
  { key: 'isFemaleSexCategory', label: 'Sexo Feminino (+1)', points: 1 },
];

/**
 * Provides clinical risk guidance based on calculated CHA2DS2-VASc score.
 * Structured with explicit branches instead of nested ternaries for readable auditability.
 */
function getClinicalRiskRecommendation(totalCalculatedScore: number): string {
  if (totalCalculatedScore === 0) {
    return 'Risco baixo. Anticoagulação geralmente não recomendada.';
  }

  if (totalCalculatedScore === 1) {
    return 'Risco intermediário. Considerar anticoagulação oral.';
  }

  return 'Risco alto. Anticoagulação oral recomendada na ausência de contraindicações.';
}

export default function Cha2ds2VascCalculator() {
  const router = useRouter();
  const { user } = useAuth();

  const [criteriaState, setCriteriaState] = useState<Cha2ds2VascCriteria>(INITIAL_CRITERIA_STATE);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleToggleCriterion = (criterionKey: keyof Cha2ds2VascCriteria, isChecked: boolean) => {
    setCriteriaState((previousState) => ({
      ...previousState,
      [criterionKey]: isChecked,
    }));
  };

  const handleCalculateScore = () => {
    let accumulatedScore = 0;

    for (const criterion of CRITERIA_DEFINITIONS) {
      if (criteriaState[criterion.key]) {
        accumulatedScore += criterion.points;
      }
    }

    setCalculatedScore(accumulatedScore);
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <button
          type="button"
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
            color: 'var(--color-semantic-text-textdark)',
          }}
          title="Voltar para ferramentas"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Voltar</h1>
      </div>

      <Card variant="out">
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>Calculadora CHA₂DS₂-VASc (Zero-LLM)</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)', marginBottom: 'var(--spacing-md)' }}>
          Execução 100% local no dispositivo. A IA não é necessária para cálculos determinísticos.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          {CRITERIA_DEFINITIONS.map((criterion) => (
            <label key={criterion.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <input
                type="checkbox"
                checked={criteriaState[criterion.key]}
                onChange={(event) => handleToggleCriterion(criterion.key, event.target.checked)}
              />
              <span>{criterion.label}</span>
            </label>
          ))}
        </div>

        <Button onClick={handleCalculateScore}>Calcular Escore</Button>

        {calculatedScore !== null && (
          <div
            style={{
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-semantic-accent-accentprimary)' }}>
              Pontuação Total: {calculatedScore} {calculatedScore === 1 ? 'ponto' : 'pontos'}
            </h3>
            <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
              {getClinicalRiskRecommendation(calculatedScore)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
