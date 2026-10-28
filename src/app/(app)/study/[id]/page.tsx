'use client';

/**
 * @file page.tsx
 * @description Tela de simulação interativa de casos clínicos (/study/[id]), exibindo o seletor
 * de especialidades médicas ou a progressão de questões de múltipla escolha (MCQ).
 */

import React, { use } from 'react';
import { EditableSessionHeader } from '@/components/common/EditableSessionHeader';
import { StudyTopicSelector } from '@/components/study/StudyTopicSelector';
import {
  StudySimulationCard,
  StudyLoadingCard,
} from '@/components/study/StudySimulationCard';
import { useStudySession } from '@/hooks/useStudySession';

export default function StudyChat({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeSessionId } = use(params);

  const {
    user,
    hasSelectedTopic,
    resolvedDisplayTopic,
    messages,
    isLoadingAiResponse,
    sessionTitle,
    setSessionTitle,
    endOfMessagesRef,
    mainScrollContainerRef,
    handleTitleCommit,
    handleStartStudy,
    handleAnswerSelect,
    handleRetryInteraction,
  } = useStudySession(routeSessionId);

  if (!user) {
    return null;
  }

  const modelStudyMessages = messages.filter((studyMessage) => studyMessage.role === 'model');

  const renderStudyWorkspaceBody = () => {
    if (!hasSelectedTopic) {
      return <StudyTopicSelector onSelectTopic={handleStartStudy} />;
    }

    return (
      <>
        {modelStudyMessages.map((studyMessage) => (
          <StudySimulationCard
            key={studyMessage.id}
            topicTitle={resolvedDisplayTopic}
            studyMessage={studyMessage}
            isLoadingAiResponse={isLoadingAiResponse}
            onSelectAnswer={handleAnswerSelect}
            onRetryInteraction={handleRetryInteraction}
          />
        ))}

        {isLoadingAiResponse && <StudyLoadingCard topicTitle={resolvedDisplayTopic} />}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <EditableSessionHeader
        title={sessionTitle}
        onTitleChange={setSessionTitle}
        onTitleCommit={handleTitleCommit}
        placeholder="Nome da Sessão..."
        editButtonTitle="Editar Título"
        containerStyle={{
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-md) var(--spacing-lg) 0 var(--spacing-lg)',
        }}
      />

      <div
        style={{
          flex: 1,
          margin: 'var(--spacing-md)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          boxShadow: 'var(--shadow-extruded-flat)',
          borderRadius: 'var(--radius-radius-large)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <main
          ref={mainScrollContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
          }}
        >
          {renderStudyWorkspaceBody()}
          <div ref={endOfMessagesRef} />
        </main>
      </div>
    </div>
  );
}
