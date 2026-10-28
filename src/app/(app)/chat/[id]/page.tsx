'use client';

/**
 * @file page.tsx
 * @description Tela de sessão ativa do Assistente de Raciocínio Clínico (/chat/[id]),
 * conectando o hook useChatSession aos cards de interação, cabeçalho editável e barra de envio.
 */

import React, { use } from 'react';
import { Loader2, ArrowDown, Send } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ChatInteractionCard } from '@/components/chat/ChatInteractionCard';
import { EditableSessionHeader } from '@/components/common/EditableSessionHeader';
import { useChatSession } from '@/hooks/useChatSession';

export default function ChatSession({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeChatId } = use(params);

  const {
    user,
    interactions,
    inputPrompt,
    setInputPrompt,
    isLoadingResponse,
    isFetchingHistory,
    shouldShowScrollButton,
    chatTitle,
    setChatTitle,
    endOfMessagesRef,
    mainScrollContainerRef,
    handleScrollDetection,
    scrollToBottomSmoothly,
    handleTitleCommit,
    handleSend,
    handleRetryInteraction,
  } = useChatSession(routeChatId);

  if (!user) {
    return null;
  }

  const isSendButtonDisabled = isLoadingResponse || isFetchingHistory || !inputPrompt.trim();

  const renderConversationBody = () => {
    if (isFetchingHistory) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 'var(--spacing-sm)',
            color: 'var(--color-semantic-text-textlight)',
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          <span>Carregando histórico do caso...</span>
        </div>
      );
    }

    if (interactions.length === 0) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-semantic-text-textlight)',
            textAlign: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--typography-fontsizes-subtitle)',
              fontWeight: 'var(--typography-fontweights-semibold)',
              color: 'var(--color-semantic-text-textdark)',
            }}
          >
            Assistente de Raciocínio Clínico
          </h2>
          <p style={{ maxWidth: '400px' }}>
            Digite um caso clínico, sintoma ou dúvida diagnóstica. As informações serão cruzadas
            com evidências científicas.
          </p>
        </div>
      );
    }

    return interactions.map((interaction) => (
      <ChatInteractionCard
        key={interaction.id}
        interaction={interaction}
        onSendSuggestion={handleSend}
        onRetry={handleRetryInteraction}
      />
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <EditableSessionHeader
        title={chatTitle}
        onTitleChange={setChatTitle}
        onTitleCommit={handleTitleCommit}
        placeholder="Nome do Caso..."
        editButtonTitle="Editar Nome do Caso"
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
          onScroll={handleScrollDetection}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
          }}
        >
          {renderConversationBody()}
          <div ref={endOfMessagesRef} />
        </main>

        {shouldShowScrollButton && (
          <button
            type="button"
            className="neu-button"
            onClick={scrollToBottomSmoothly}
            style={{
              position: 'absolute',
              bottom: 'var(--spacing-max)',
              right: 'var(--spacing-max)',
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
              border: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
              boxShadow: 'none',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 180ms ease',
            }}
            title="Rolar para o final"
            aria-label="Rolar para o final"
          >
            <ArrowDown size={22} />
          </button>
        )}
      </div>

      <footer className="chat-footer">
        <div style={{ display: 'flex', gap: 'var(--spacing-ml)', alignItems: 'center' }}>
          <Input
            pill
            placeholder="Descreva sua dúvida..."
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSend();
              }
            }}
            style={{ flex: 1 }}
          />

          <button
            type="button"
            className="neu-button"
            onClick={() => void handleSend()}
            disabled={isSendButtonDisabled}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-radius-full)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
            }}
            title="Enviar mensagem"
            aria-label="Enviar mensagem"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
