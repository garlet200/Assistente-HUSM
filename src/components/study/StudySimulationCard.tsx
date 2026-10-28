'use client';

/**
 * @file StudySimulationCard.tsx
 * @description Cards de exibição das etapas de simulação clínica (StudySimulationCard e StudyLoadingCard),
 * encapsulando o cabeçalho do tema, o badge de confiabilidade e a questão MCQ.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { ReliabilityBadge } from '@/components/chat/ReliabilityBadge';
import { RetryActionButton } from '@/components/common/RetryActionButton';
import { ModelTier, ReliabilityLevel } from '@/lib/ai/cascadeConfig';
import { isRetryableResponse } from '@/lib/utils/formatters';

export interface StudyMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  isMCQ?: boolean;
  options?: string[];
  answered?: boolean;
  reliability?: ReliabilityLevel;
  modelTier?: ModelTier;
}

interface StudyCardContainerProps {
  topicTitle: string;
  children: React.ReactNode;
}

/**
 * Shared container shell for both active study simulation steps and loading states.
 * Eliminates visual duplication of the topic header and divider.
 */
function StudyCardContainer({ topicTitle, children }: StudyCardContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '90%',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          padding: 'var(--spacing-ml) var(--spacing-md)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
          borderRadius: 'var(--radius-radius-medium)',
        }}
      >
        <div
          style={{
            fontWeight: 'var(--typography-fontweights-semibold)',
            color: 'var(--color-semantic-text-textdark)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          {topicTitle}
        </div>

        <hr
          style={{
            border: 'none',
            borderTop:
              'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
            margin: 'var(--spacing-ml) 0',
          }}
        />

        {children}
      </div>
    </div>
  );
}

interface StudySimulationCardProps {
  topicTitle: string;
  studyMessage: StudyMessage;
  isLoadingAiResponse: boolean;
  onSelectAnswer: (questionMessageId: string, chosenOption: string) => void;
  onRetryInteraction: (targetMessageId: string) => void;
}

/**
 * Renders a clinical case simulation step (either an interactive MCQ or a markdown message with retry).
 */
export function StudySimulationCard({
  topicTitle,
  studyMessage,
  isLoadingAiResponse,
  onSelectAnswer,
  onRetryInteraction,
}: StudySimulationCardProps) {
  const showReliabilityBadge =
    Boolean(studyMessage.reliability) && studyMessage.reliability !== 'high';

  const renderSimulationStepBody = () => {
    if (studyMessage.isMCQ) {
      return (
        <MultipleChoiceQuestion
          question={studyMessage.content}
          options={studyMessage.options || []}
          onSelectOption={(chosenOption) => onSelectAnswer(studyMessage.id, chosenOption)}
          disabled={studyMessage.answered || isLoadingAiResponse}
        />
      );
    }

    return (
      <>
        <div
          style={{
            fontFamily: 'var(--typography-fontfamilies-mainserif)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            color: 'var(--color-semantic-text-textdark)',
          }}
        >
          <ReactMarkdown>{studyMessage.content}</ReactMarkdown>
        </div>

        {isRetryableResponse(studyMessage.content) && (
          <RetryActionButton onRetry={() => onRetryInteraction(studyMessage.id)} />
        )}
      </>
    );
  };

  return (
    <StudyCardContainer topicTitle={topicTitle}>
      {showReliabilityBadge && (
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <ReliabilityBadge
            reliability={studyMessage.reliability}
            modelTier={studyMessage.modelTier}
          />
        </div>
      )}

      {renderSimulationStepBody()}
    </StudyCardContainer>
  );
}

interface StudyLoadingCardProps {
  topicTitle: string;
}

/**
 * Renders the loading state card while the AI generates the next simulated clinical case step.
 */
export function StudyLoadingCard({ topicTitle }: StudyLoadingCardProps) {
  return (
    <StudyCardContainer topicTitle={topicTitle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          fontFamily: 'var(--typography-fontfamilies-mainsans)',
          color: 'var(--color-semantic-text-textlight)',
          fontStyle: 'italic',
        }}
      >
        <Loader2 size={18} className="animate-spin" />
        Processando resposta...
      </div>
    </StudyCardContainer>
  );
}
