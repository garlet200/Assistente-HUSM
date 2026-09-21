'use client';

import React, { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Loader2, ArrowDown, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { ChatInteractionCard, Interaction } from '@/components/chat/ChatInteractionCard';

interface GatewayHistoryEntry {
  role: string;
  content: string;
}

interface GatewayResponsePayload {
  text: string;
  citations?: string[];
  reliability?: 'high' | 'standard' | 'reduced';
  modelTier?: 'primary' | 'fallback_1' | 'fallback_2';
  modelId?: string;
  displayName?: string;
}

/**
 * Groups linear user/model messages from the database into question-and-answer Interaction pairs for the UI.
 */
function groupMessagesIntoInteractions(
  rawMessages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
    citations?: string[];
    metadata?: {
      reliability?: 'high' | 'standard' | 'reduced';
      modelTier?: 'primary' | 'fallback_1' | 'fallback_2';
      modelId?: string;
      displayName?: string;
    } | null;
  }>
): Interaction[] {
  const groupedInteractions: Interaction[] = [];
  let currentInteractionGroup: Partial<Interaction> | null = null;

  for (const message of rawMessages) {
    if (message.role === 'user') {
      if (currentInteractionGroup) {
        groupedInteractions.push(currentInteractionGroup as Interaction);
      }

      currentInteractionGroup = {
        id: message.id,
        userMessageId: message.id,
        prompt: message.content,
        response: null,
        timestamp: new Date(message.created_at),
        citations: [],
      };
    } else if (message.role === 'model' && currentInteractionGroup) {
      currentInteractionGroup.response = message.content;
      currentInteractionGroup.citations = message.citations || [];
      currentInteractionGroup.modelMessageId = message.id;
      currentInteractionGroup.reliability = message.metadata?.reliability;
      currentInteractionGroup.modelTier = message.metadata?.modelTier;
      currentInteractionGroup.modelDisplayName = message.metadata?.displayName;
    }
  }

  if (currentInteractionGroup) {
    groupedInteractions.push(currentInteractionGroup as Interaction);
  }

  return groupedInteractions;
}

/**
 * Builds standard conversation history for LLM context from existing UI interactions.
 */
function buildConversationHistory(interactions: Interaction[]): GatewayHistoryEntry[] {
  return interactions.flatMap((interaction) => [
    { role: 'user', content: interaction.prompt },
    ...(interaction.response ? [{ role: 'model', content: interaction.response }] : []),
  ]);
}


export default function ChatSession({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const { id: routeChatId } = use(params);

  const [activeChatId, setActiveChatId] = useState<string>(routeChatId);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(routeChatId !== 'new');
  const [shouldShowScrollButton, setShouldShowScrollButton] = useState(false);
  const [chatTitle, setChatTitle] = useState('Novo Caso Clínico');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainScrollContainerRef = useRef<HTMLElement>(null);
  const titleInputElementRef = useRef<HTMLInputElement>(null);

  // Authentication guard and active chat session tracking
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (activeChatId !== 'new') {
      sessionStorage.setItem('activeChatId', activeChatId);
    }
  }, [user, router, activeChatId]);

  // Load chat title and message history from Supabase
  useEffect(() => {
    if (routeChatId === 'new' || !user) {
      return;
    }

    const loadChatHistoryFromDatabase = async (targetChatId: string) => {
      setIsFetchingHistory(true);

      const { data: chatRecord } = await supabase
        .from('chats')
        .select('title')
        .eq('id', targetChatId)
        .single();

      if (chatRecord?.title) {
        setChatTitle(chatRecord.title);
      }

      const { data: databaseMessages, error: queryError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', targetChatId)
        .order('created_at', { ascending: true });

      if (queryError || !databaseMessages) {
        console.error('Erro ao carregar histórico de mensagens:', queryError);
        setIsFetchingHistory(false);
        return;
      }

      const parsedInteractions = groupMessagesIntoInteractions(databaseMessages);
      setInteractions(parsedInteractions);
      setIsFetchingHistory(false);
    };

    loadChatHistoryFromDatabase(routeChatId);
  }, [routeChatId, user, supabase]);

  // Initial scroll when history finishes loading
  useEffect(() => {
    const hasMessages = interactions.length > 0;
    if (!isFetchingHistory && hasMessages) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isFetchingHistory, interactions.length]);

  const handleScrollDetection = () => {
    if (!mainScrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = mainScrollContainerRef.current;
    const isCloseToBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldShowScrollButton(!isCloseToBottom);
  };

  const handleTitleBlurOrSubmit = async (newTitleText: string) => {
    const trimmedTitle = newTitleText.trim() || 'Caso Clínico';
    setChatTitle(trimmedTitle);
    setIsEditingTitle(false);

    if (activeChatId !== 'new') {
      await supabase.from('chats').update({ title: trimmedTitle }).eq('id', activeChatId);
    }
  };

  const enableTitleEditingMode = () => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputElementRef.current?.focus();
    }, 50);
  };


  const handleRetryInteraction = async (interactionToRetry: Interaction) => {
    // Remove failed interaction from state immediately
    setInteractions((previousInteractions) =>
      previousInteractions.filter((item) => item.id !== interactionToRetry.id)
    );

    // Clean up failed records in database
    if (interactionToRetry.userMessageId) {
      Promise.resolve(
        supabase.from('messages').delete().eq('id', interactionToRetry.userMessageId)
      ).catch((err: unknown) => console.error('Erro ao deletar mensagem de usuário para retry:', err));
    }
    if (interactionToRetry.modelMessageId) {
      Promise.resolve(
        supabase.from('messages').delete().eq('id', interactionToRetry.modelMessageId)
      ).catch((err: unknown) => console.error('Erro ao deletar mensagem do modelo para retry:', err));
    }

    // Re-send the prompt
    handleSend(interactionToRetry.prompt);
  };

  /**
   * Orchestrates sending a prompt to the AI Gateway, persisting messages, and updating state.
   */
  const handleSend = async (overridePromptText?: string | React.MouseEvent<HTMLButtonElement>) => {
    const promptToSend = typeof overridePromptText === 'string' ? overridePromptText : inputPrompt;

    if (!promptToSend.trim() || isLoadingResponse || !user) {
      return;
    }

    const temporaryInteractionId = crypto.randomUUID();
    const provisionalInteraction: Interaction = {
      id: temporaryInteractionId,
      prompt: promptToSend,
      response: null,
      timestamp: new Date(),
    };

    setInteractions((previousInteractions) => [...previousInteractions, provisionalInteraction]);

    if (typeof overridePromptText !== 'string') {
      setInputPrompt('');
    }
    setIsLoadingResponse(true);

    setTimeout(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    let resolvedChatSessionId = activeChatId;

    // 1. Create chat in database if this is a new conversation
    if (resolvedChatSessionId === 'new') {
      const chatTitlePreview =
        promptToSend.length > 50 ? `${promptToSend.substring(0, 50)}...` : promptToSend;

      const { data: createdChat, error: chatCreationError } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, title: chatTitlePreview, module: 'chat' }])
        .select()
        .single();

      if (chatCreationError || !createdChat) {
        console.error('Falha ao criar sessão de chat no banco:', chatCreationError);
        setIsLoadingResponse(false);
        return;
      }

      resolvedChatSessionId = createdChat.id;
      setActiveChatId(resolvedChatSessionId);
      window.history.replaceState(null, '', `/chat/${resolvedChatSessionId}`);
    }

    // 2. Persist user message to Supabase
    const { data: persistedUserMessage } = await supabase
      .from('messages')
      .insert([{ chat_id: resolvedChatSessionId, role: 'user', content: promptToSend }])
      .select()
      .single();

    if (persistedUserMessage) {
      setInteractions((previousInteractions) =>
        previousInteractions.map((item) =>
          item.id === temporaryInteractionId
            ? { ...item, userMessageId: persistedUserMessage.id }
            : item
        )
      );
    }

    // 3. Prepare conversation history for Gateway
    const conversationHistory = buildConversationHistory(interactions);

    // 4. Request Gateway response & persist model reply
    try {
      const gatewayHttpResponse = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          role: 'MODEL_ROLE_CLINICAL_REASONING',
          history: conversationHistory,
        }),
      });

      if (!gatewayHttpResponse.ok) {
        throw new Error(`Falha no Gateway: HTTP status ${gatewayHttpResponse.status}`);
      }

      const gatewayResult: GatewayResponsePayload = await gatewayHttpResponse.json();

      const { data: persistedModelMessage } = await supabase
        .from('messages')
        .insert([{
          chat_id: resolvedChatSessionId,
          role: 'model',
          content: gatewayResult.text,
          citations: gatewayResult.citations || [],
          metadata: {
            reliability: gatewayResult.reliability,
            modelTier: gatewayResult.modelTier,
            modelId: gatewayResult.modelId,
            displayName: gatewayResult.displayName,
          },
        }])
        .select()
        .single();

      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', resolvedChatSessionId);

      setInteractions((previousInteractions) =>
        previousInteractions.map((item) => {
          const isTargetInteraction =
            item.id === temporaryInteractionId ||
            (persistedUserMessage && item.userMessageId === persistedUserMessage.id);

          if (!isTargetInteraction) {
            return item;
          }

          return {
            ...item,
            response: gatewayResult.text,
            citations: gatewayResult.citations,
            modelMessageId: persistedModelMessage?.id,
            reliability: gatewayResult.reliability,
            modelTier: gatewayResult.modelTier,
            modelDisplayName: gatewayResult.displayName,
          };
        })
      );
    } catch (gatewayError) {
      console.error('Erro na chamada do Gateway:', gatewayError);

      setInteractions((previousInteractions) =>
        previousInteractions.map((item) => {
          const isTargetInteraction =
            item.id === temporaryInteractionId ||
            (persistedUserMessage && item.userMessageId === persistedUserMessage.id);

          if (!isTargetInteraction) {
            return item;
          }

          return {
            ...item,
            response:
              'O assistente está temporariamente indisponível devido à alta demanda nos servidores de processamento. Por favor, aguarde alguns instantes e tente novamente.',
          };
        })
      );
    } finally {
      setIsLoadingResponse(false);
    }
  };

  if (!user) {
    return null;
  }

  const isSendButtonDisabled =
    isLoadingResponse || isFetchingHistory || !inputPrompt.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Session Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-ml)', padding: '16px 24px 0 24px', backgroundColor: 'transparent' }}>

        <button
          type="button"
          className="neu-button"
          onClick={enableTitleEditingMode}
          style={{
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-text-textlight)',
            flexShrink: 0,
          }}
          title="Editar Nome do Caso"
        >
          <Edit size={18} />
        </button>

        {isEditingTitle ? (
          <input
            ref={titleInputElementRef}
            value={chatTitle}
            onChange={(event) => setChatTitle(event.target.value)}
            onBlur={(event) => handleTitleBlurOrSubmit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleTitleBlurOrSubmit(event.currentTarget.value);
              }
            }}
            placeholder="Nome do Caso..."
            style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--color-semantic-text-textdark)',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--color-semantic-text-textlight)',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
            }}
          />
        ) : (
          <h1
            style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--color-semantic-text-textdark)',
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chatTitle}
          </h1>
        )}
      </div>

      {/* Main Conversation Container */}
      <div
        style={{
          flex: 1,
          margin: 'var(--spacing-md)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          boxShadow: 'var(--shadow-extruded-flat)',
          borderRadius: '24px',
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
          {isFetchingHistory ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--color-semantic-text-textlight)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span>Carregando histórico do caso...</span>
            </div>
          ) : interactions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-semantic-text-textlight)', textAlign: 'center', gap: 'var(--spacing-sm)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-semantic-text-textdark)' }}>
                Assistente de Raciocínio Clínico
              </h2>
              <p style={{ maxWidth: '400px' }}>
                Digite um caso clínico, sintoma ou dúvida diagnóstica. As informações serão cruzadas com evidências científicas.
              </p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <ChatInteractionCard
                key={interaction.id}
                interaction={interaction}
                onSendSuggestion={handleSend}
                onRetry={handleRetryInteraction}
              />
            ))
          )}
          <div ref={endOfMessagesRef} />
        </main>

        {/* Scroll To Bottom Floating Button (Flat, without 3D neumorphic shadow) */}
        {shouldShowScrollButton && (
          <button
            type="button"
            className="neu-button"
            onClick={() => {
              endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShouldShowScrollButton(false);
            }}
            style={{
              position: 'absolute',
              bottom: 'var(--spacing-max)',
              right: 'var(--spacing-max)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
              border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
              boxShadow: 'none',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 180ms ease',
            }}
            title="Rolar para o final"
          >
            <ArrowDown size={22} />
          </button>
        )}
      </div>

      {/* Input Prompt Footer */}
      <footer className="chat-footer">
        <div style={{ display: 'flex', gap: 'var(--spacing-ml)', alignItems: 'center' }}>
          <Input
            pill
            placeholder="Descreva sua dúvida..."
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSend();
              }
            }}
            style={{ flex: 1 }}
          />

          <button
            type="button"
            className="neu-button"
            onClick={() => handleSend()}
            disabled={isSendButtonDisabled}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
            }}
            title="Enviar mensagem"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>

    </div>
  );
}
