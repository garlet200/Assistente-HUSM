'use client';

import React, { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Trash2, Edit, Loader2, RotateCcw, ArrowDown, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { DeleteConfirmationModal } from '@/components/common/DeleteConfirmationModal';
import { ChatCitationList } from '@/components/chat/ChatCitationList';

export interface Interaction {
  id: string;
  userMessageId?: string;
  modelMessageId?: string;
  prompt: string;
  response: string | null;
  timestamp: Date;
  citations?: string[];
}

interface GatewayHistoryEntry {
  role: string;
  content: string;
}

interface GatewayResponsePayload {
  text: string;
  citations?: string[];
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  const handleDeleteCurrentChat = async () => {
    if (activeChatId !== 'new') {
      await supabase.from('chats').delete().eq('id', activeChatId);
    }
    router.push('/chat');
  };

  const handleRetryInteraction = async (interactionToRetry: Interaction) => {
    // Remove failed interaction from state immediately
    setInteractions((previousInteractions) =>
      previousInteractions.filter((item) => item.id !== interactionToRetry.id)
    );

    // Clean up failed records in database
    if (interactionToRetry.userMessageId) {
      supabase.from('messages').delete().eq('id', interactionToRetry.userMessageId).then();
    }
    if (interactionToRetry.modelMessageId) {
      supabase.from('messages').delete().eq('id', interactionToRetry.modelMessageId).then();
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
              '⚠️ **Aviso do Sistema:** Ocorreu um erro ao processar sua solicitação. Tente novamente.',
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
          onClick={() => setIsDeleteModalOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-status-error)',
            padding: 'var(--spacing-min)',
          }}
          title="Excluir Caso"
        >
          <Trash2 size={18} />
        </button>

        <button
          type="button"
          onClick={enableTitleEditingMode}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-text-textlight)',
            padding: 'var(--spacing-min)',
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
          boxShadow: 'var(--shadow-extruded-large)',
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
            gap: 'var(--spacing-xl)',
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
              <div
                key={interaction.id}
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
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-extruded-flat)',
                  }}
                >
                  {/* Prompt do usuário no topo do card com horário */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-semantic-text-textdark)', fontFamily: 'var(--typography-fontfamilies-mainsans)' }}>
                      {interaction.prompt}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-semantic-text-textlight)', whiteSpace: 'nowrap', marginLeft: 'var(--spacing-md)' }}>
                      {new Date(interaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)', margin: '12px 0' }} />

                  {!interaction.response ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontFamily: 'var(--typography-fontfamilies-mainsans)', color: 'var(--color-semantic-text-textlight)', fontStyle: 'italic' }}>
                      <Loader2 size={18} className="animate-spin" />
                      Processando resposta...
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontFamily: 'var(--typography-fontfamilies-mainserif)',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--color-semantic-text-textdark)',
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            a: ({ href, children, ...anchorProps }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
                              if (href?.startsWith('#sugestao-')) {
                                const rawTopic = href.replace('#sugestao-', '');
                                const readableSuggestionText = decodeURIComponent(rawTopic);

                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleSend(readableSuggestionText)}
                                    style={{
                                      background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                                      border: '1px solid var(--color-semantic-accent-accentprimary)',
                                      borderRadius: '16px',
                                      padding: 'var(--spacing-sm) var(--spacing-md)',
                                      color: 'var(--color-semantic-accent-accentprimary)',
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      margin: 'var(--spacing-min)',
                                      fontSize: '0.875rem',
                                    }}
                                  >
                                    {children}
                                  </button>
                                );
                              }

                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--color-semantic-accent-accentprimary)' }}
                                  {...anchorProps}
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {interaction.response}
                        </ReactMarkdown>
                      </div>

                      {/* Retry Action if error occurred */}
                      {interaction.response.includes('Aviso do Sistema:') && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            type="button"
                            onClick={() => handleRetryInteraction(interaction)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-sm)',
                              background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                              border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                              borderRadius: '16px',
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              color: 'var(--color-semantic-text-textdark)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontFamily: 'var(--typography-fontfamilies-mainsans)',
                            }}
                          >
                            <RotateCcw size={16} />
                            Tentar novamente
                          </button>
                        </div>
                      )}

                      {/* RAG Evidence Sources */}
                      <ChatCitationList citations={interaction.citations} />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={endOfMessagesRef} />
        </main>

        {/* Scroll To Bottom Floating Button */}
        {shouldShowScrollButton && (
          <button
            type="button"
            onClick={() => {
              endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShouldShowScrollButton(false);
            }}
            style={{
              position: 'absolute',
              bottom: 'var(--spacing-max)',
              right: 'var(--spacing-max)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
              border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
              zIndex: 10,
            }}
            title="Rolar para o final"
          >
            <ArrowDown size={24} />
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
              cursor: isSendButtonDisabled ? 'not-allowed' : 'pointer',
              opacity: isSendButtonDisabled ? 0.6 : 1,
              color: 'var(--color-semantic-text-textdark)',
            }}
            title="Enviar mensagem"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>

      {/* Shared Delete Confirmation Dialog */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Excluir Caso?"
        description="Tem certeza que deseja excluir este caso? Todas as mensagens serão perdidas para sempre."
        onConfirm={handleDeleteCurrentChat}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
