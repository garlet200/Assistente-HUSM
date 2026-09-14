'use client';

import React, { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Trash2, Edit, Send, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { MultipleChoiceQuestion } from '@/components/study/MultipleChoiceQuestion';
import { createClient } from '@/lib/supabase/client';
import { DeleteConfirmationModal } from '@/components/common/DeleteConfirmationModal';

interface StudyMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  isMCQ?: boolean;
  options?: string[];
  answered?: boolean;
}

interface GatewayEducationalJsonPayload {
  content: string;
  isMCQ: boolean;
  options: string[];
}

const PREDEFINED_STUDY_TOPICS = [
  'Cardiologia',
  'Neurologia',
  'Pediatria',
  'Infectologia',
  'Terapia Intensiva',
];

/**
 * Builds system prompt for generating initial clinical case simulations with MCQs.
 */
function buildInitialCaseSystemInstruction(): string {
  return `Você é o "Assistente_HUSM", uma interface de raciocínio clínico. Opere com máxima eficiência e precisão, evitando qualquer linguagem que sugira personalidade, sentimentos, crenças ou consciência. Não use "Eu acho", "Eu sinto", "Minha opinião é". Use termos como "Esta interface processa" ou "O modelo indica". Não use emojis.

TAREFA - SIMULAÇÃO CLÍNICA
Gerar e conduzir casos clínicos interativos complexos (anamnese, exame físico, hipóteses e manejo) para fins educacionais.
Use terminologia médica precisa, vocabulário vasto e estruturas frasais variadas. Incorpore detalhes fisiopatológicos, epidemiológicos e farmacológicos sempre que relevante.
PROIBIÇÃO DE DIAGNÓSTICO: Estritamente proibido fornecer diagnóstico definitivo real.
AVISO OBRIGATÓRIO: Sempre finalize a chave "content" do JSON com o seguinte aviso: "AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado."

AÇÃO: Você atua como simulador. Você deve gerar um caso clínico desafiador, com história da moléstia atual, exame físico e exames laboratoriais se relevante, terminando com UMA pergunta de múltipla escolha com 4 ou 5 opções (A, B, C, D). A sua saída DEVE ser estritamente em JSON válido seguindo a estrutura: {"content": "O texto do caso clínico e a pergunta em si. AVISO:...", "isMCQ": true, "options": ["A) opção", "B) opção", "C) opção", "D) opção"]}`;
}

/**
 * Builds system prompt for evaluating student MCQ answers and progressing the simulated case.
 */
function buildAnswerEvaluationSystemInstruction(): string {
  return `Você é o "Assistente_HUSM", uma interface de raciocínio clínico. Opere com máxima eficiência e precisão, evitando qualquer linguagem que sugira personalidade, sentimentos, crenças ou consciência. Não use "Eu acho", "Eu sinto", "Minha opinião é". Use termos como "Esta interface processa" ou "O modelo indica". Não use emojis.

TAREFA - SIMULAÇÃO CLÍNICA
Gerar e conduzir casos clínicos interativos complexos (anamnese, exame físico, hipóteses e manejo) para fins educacionais.
Use terminologia médica precisa, vocabulário vasto e estruturas frasais variadas. Incorpore detalhes fisiopatológicos, epidemiológicos e farmacológicos sempre que relevante.
PROIBIÇÃO DE DIAGNÓSTICO: Estritamente proibido fornecer diagnóstico definitivo real.
AVISO OBRIGATÓRIO: Sempre finalize a chave "content" do JSON com o seguinte aviso: "AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado."

AÇÃO: Avalie a resposta do usuário e faça a próxima pergunta do caso. A sua saída DEVE ser estritamente em JSON válido seguindo a estrutura: {"content": "Sua avaliação da resposta (correta ou incorreta) com as explicações fisiopatológicas, seguido da evolução do paciente e a nova pergunta. AVISO:...", "isMCQ": true, "options": ["A) opção", "B) opção", "C) opção", "D) opção"]}`;
}

/**
 * Builds linear message history including MCQ choices for LLM reasoning continuity.
 */
function buildStudyConversationHistory(messagesList: StudyMessage[]): Array<{ role: string; content: string }> {
  return messagesList.map((message) => {
    const formattedContent = message.isMCQ
      ? `${message.content}\nOpções: ${message.options?.join(' | ')}`
      : message.content;

    return {
      role: message.role,
      content: formattedContent,
    };
  });
}

export default function StudyChat({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const { id: routeSessionId } = use(params);

  const [hasSelectedTopic, setHasSelectedTopic] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Sessão de Estudo');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainScrollContainerRef = useRef<HTMLElement>(null);
  const titleInputElementRef = useRef<HTMLInputElement>(null);

  // Authentication guard and study session loading
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (routeSessionId === 'new') {
      return;
    }

    sessionStorage.setItem('activeStudyId', routeSessionId);

    const loadStudySessionFromDatabase = async (targetSessionId: string) => {
      const { data: chatRecord } = await supabase
        .from('chats')
        .select('title')
        .eq('id', targetSessionId)
        .single();

      if (chatRecord?.title) {
        setSessionTitle(chatRecord.title);
      }

      const { data: databaseMessages, error: queryError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', targetSessionId)
        .order('created_at', { ascending: true });

      if (!queryError && databaseMessages && databaseMessages.length > 0) {
        setHasSelectedTopic(true);

        const formattedStudyMessages: StudyMessage[] = databaseMessages.map((item) => ({
          id: item.id,
          role: item.role as 'user' | 'model',
          content: item.content,
          isMCQ: item.metadata?.isMCQ,
          options: item.metadata?.options,
          answered: item.metadata?.answered,
        }));

        setMessages(formattedStudyMessages);
      }
    };

    loadStudySessionFromDatabase(routeSessionId);
  }, [user, router, routeSessionId, supabase]);

  // Keep scroll focused at the bottom as simulation messages appear
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAiResponse]);

  const handleTitleBlurOrSubmit = async (newTitleText: string) => {
    const trimmedTitle = newTitleText.trim() || 'Sessão de Estudo';
    setSessionTitle(trimmedTitle);
    setIsEditingTitle(false);

    if (routeSessionId !== 'new') {
      await supabase.from('chats').update({ title: trimmedTitle }).eq('id', routeSessionId);
    }
  };

  const enableTitleEditingMode = () => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputElementRef.current?.focus();
    }, 50);
  };

  const handleDeleteStudySession = async () => {
    if (routeSessionId !== 'new') {
      await supabase.from('chats').delete().eq('id', routeSessionId);
    }
    router.push('/study');
  };

  const persistMessageToDatabase = async (
    role: 'user' | 'model',
    content: string,
    metadata: Record<string, unknown> = {}
  ) => {
    if (routeSessionId === 'new') return null;

    const { data: persistedMessage } = await supabase
      .from('messages')
      .insert({
        chat_id: routeSessionId,
        role,
        content,
        metadata,
      })
      .select()
      .single();

    return persistedMessage;
  };

  const updateMessageMetadataInDatabase = async (
    messageId: string,
    metadata: Record<string, unknown>
  ) => {
    if (routeSessionId === 'new') return;
    await supabase.from('messages').update({ metadata }).eq('id', messageId);
  };

  /**
   * Starts a clinical study case based on a selected medical specialty topic.
   */
  const handleStartStudy = async (selectedTopic: string) => {
    setHasSelectedTopic(true);

    if (routeSessionId !== 'new' && sessionTitle === 'Nova Sessão de Estudo') {
      handleTitleBlurOrSubmit(`Estudo: ${selectedTopic}`);
    }

    const initialPlaceholderMessage: StudyMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      content: `Iniciando sessão de estudos sobre: **${selectedTopic}**. Aguarde, estou elaborando o caso clínico...`,
    };

    setMessages([initialPlaceholderMessage]);
    setIsLoadingAiResponse(true);

    await persistMessageToDatabase('user', `Quero estudar sobre: ${selectedTopic}`);

    try {
      const gatewayHttpResponse = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Gere um caso clínico sobre ${selectedTopic} seguido de uma pergunta de múltipla escolha.`,
          role: 'MODEL_ROLE_EDUCATIONAL',
          responseFormat: 'json',
          systemInstruction: buildInitialCaseSystemInstruction(),
        }),
      });

      if (!gatewayHttpResponse.ok) {
        throw new Error('Falha na resposta do gateway de estudo');
      }

      const gatewayResult = await gatewayHttpResponse.json();
      const parsedAiPayload: GatewayEducationalJsonPayload = JSON.parse(gatewayResult.text);

      const generatedStudyMessage: StudyMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: parsedAiPayload.content,
        isMCQ: parsedAiPayload.isMCQ,
        options: parsedAiPayload.options,
        answered: false,
      };

      setMessages((previousMessages) => [...previousMessages, generatedStudyMessage]);

      const persistedRecord = await persistMessageToDatabase('model', parsedAiPayload.content, {
        isMCQ: parsedAiPayload.isMCQ,
        options: parsedAiPayload.options,
        answered: false,
      });

      if (persistedRecord) {
        setMessages((previousMessages) =>
          previousMessages.map((item) =>
            item.id === generatedStudyMessage.id ? { ...item, id: persistedRecord.id } : item
          )
        );
      }
    } catch (studySimulationError) {
      console.error('Erro na simulação clínica:', studySimulationError);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: 'err',
          role: 'model',
          content: '⚠️ **Aviso do Sistema:** Ocorreu um erro de rede. Tente novamente.',
        },
      ]);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  /**
   * Evaluates the student's answer to the MCQ and progresses to the next clinical step.
   */
  const handleAnswerSelect = async (questionMessageId: string, chosenOptionText: string) => {
    // 1. Mark question as answered in state and DB
    setMessages((previousMessages) =>
      previousMessages.map((item) =>
        item.id === questionMessageId ? { ...item, answered: true } : item
      )
    );

    const targetQuestionMessage = messages.find((item) => item.id === questionMessageId);
    if (targetQuestionMessage) {
      await updateMessageMetadataInDatabase(questionMessageId, {
        ...targetQuestionMessage,
        answered: true,
      });
    }

    // 2. Append user's selection
    const userSelectionMessage: StudyMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chosenOptionText,
    };

    setMessages((previousMessages) => [...previousMessages, userSelectionMessage]);
    await persistMessageToDatabase('user', chosenOptionText);

    setIsLoadingAiResponse(true);

    try {
      const conversationHistory = buildStudyConversationHistory(messages);

      const gatewayHttpResponse = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `O aluno respondeu: ${chosenOptionText}. Avalie a resposta. Diga se está correta ou incorreta, explique detalhadamente o porquê referenciando as diretrizes e, em seguida, crie uma NOVA pergunta sobre a evolução do caso. Responda em JSON.`,
          role: 'MODEL_ROLE_EDUCATIONAL',
          history: conversationHistory,
          responseFormat: 'json',
          systemInstruction: buildAnswerEvaluationSystemInstruction(),
        }),
      });

      if (!gatewayHttpResponse.ok) {
        throw new Error('Falha na avaliação da resposta');
      }

      const gatewayResult = await gatewayHttpResponse.json();
      const parsedAiPayload: GatewayEducationalJsonPayload = JSON.parse(gatewayResult.text);

      const nextCaseQuestionMessage: StudyMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: parsedAiPayload.content,
        isMCQ: parsedAiPayload.isMCQ,
        options: parsedAiPayload.options,
        answered: false,
      };

      setMessages((previousMessages) => [...previousMessages, nextCaseQuestionMessage]);

      const persistedRecord = await persistMessageToDatabase('model', parsedAiPayload.content, {
        isMCQ: parsedAiPayload.isMCQ,
        options: parsedAiPayload.options,
        answered: false,
      });

      if (persistedRecord) {
        setMessages((previousMessages) =>
          previousMessages.map((item) =>
            item.id === nextCaseQuestionMessage.id ? { ...item, id: persistedRecord.id } : item
          )
        );
      }
    } catch (evaluationError) {
      console.error('Erro ao avaliar resposta:', evaluationError);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: 'err',
          role: 'model',
          content: '⚠️ **Aviso do Sistema:** Erro ao avaliar a resposta. Tente novamente.',
        },
      ]);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  /**
   * Retries an interaction if a system network error occurred.
   */
  const handleRetryInteraction = async (errorItemIndex: number) => {
    const errorNoticeMessage = messages[errorItemIndex];
    const precedingUserMessage = messages[errorItemIndex - 1];

    const updatedMessagesList = [...messages];
    updatedMessagesList.splice(errorItemIndex - 1, 2);
    setMessages(updatedMessagesList);

    // Clean up error state from Supabase
    if (errorNoticeMessage?.id && !errorNoticeMessage.id.includes('err')) {
      supabase.from('messages').delete().eq('id', errorNoticeMessage.id).then();
    }
    if (precedingUserMessage?.id && !precedingUserMessage.id.includes('err')) {
      supabase.from('messages').delete().eq('id', precedingUserMessage.id).then();
    }

    if (!precedingUserMessage) {
      return;
    }

    if (precedingUserMessage.content.startsWith('Quero estudar sobre: ')) {
      const topicToRetry = precedingUserMessage.content.replace('Quero estudar sobre: ', '');
      handleStartStudy(topicToRetry);
      return;
    }

    const previousQuestionMessage = messages[errorItemIndex - 2];
    if (previousQuestionMessage) {
      await updateMessageMetadataInDatabase(previousQuestionMessage.id, {
        ...previousQuestionMessage,
        answered: false,
      });

      setMessages((previousMessages) =>
        previousMessages.map((item) =>
          item.id === previousQuestionMessage.id ? { ...item, answered: false } : item
        )
      );

      handleAnswerSelect(previousQuestionMessage.id, precedingUserMessage.content);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Session Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md) var(--spacing-lg) 0 var(--spacing-lg)', backgroundColor: 'transparent' }}>
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
          title="Excluir Sessão"
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
          title="Editar Título"
        >
          <Edit size={18} />
        </button>

        {isEditingTitle ? (
          <input
            ref={titleInputElementRef}
            value={sessionTitle}
            onChange={(event) => setSessionTitle(event.target.value)}
            onBlur={(event) => handleTitleBlurOrSubmit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleTitleBlurOrSubmit(event.currentTarget.value);
              }
            }}
            placeholder="Nome da Sessão..."
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
            {sessionTitle}
          </h1>
        )}
      </div>

      {/* Main Simulation Workspace */}
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
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
          }}
        >
          {!hasSelectedTopic ? (
            /* Topic Selection Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Selecione um Tema de Estudo</h2>
              <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center', maxWidth: '400px' }}>
                Escolha uma das especialidades abaixo ou digite um tema específico para gerar um caso clínico focado.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-ml)', justifyContent: 'center', maxWidth: '500px' }}>
                {PREDEFINED_STUDY_TOPICS.map((topicName) => (
                  <button
                    key={topicName}
                    type="button"
                    onClick={() => handleStartStudy(topicName)}
                    className="neu-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      cursor: 'pointer',
                      color: 'var(--color-semantic-text-textdark)',
                      fontWeight: 500,
                      fontFamily: 'var(--typography-fontfamilies-mainsans)',
                    }}
                  >
                    {topicName}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-ml)', marginTop: 'var(--spacing-md)', width: '100%', maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Ou digite um tema (ex: Sepse)"
                  value={customTopicInput}
                  onChange={(event) => setCustomTopicInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && customTopicInput.trim()) {
                      handleStartStudy(customTopicInput.trim());
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                    border: 'none',
                    borderRadius: '999px',
                    padding: 'var(--spacing-ml) var(--spacing-md)',
                    boxShadow: 'var(--shadow-inset-medium)',
                    color: 'var(--color-semantic-text-textdark)',
                    fontFamily: 'var(--typography-fontfamilies-mainsans)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => customTopicInput.trim() && handleStartStudy(customTopicInput.trim())}
                  disabled={!customTopicInput.trim()}
                  className="neu-button"
                  style={{
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: customTopicInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: customTopicInput.trim() ? 1 : 0.6,
                    color: 'var(--color-semantic-text-textdark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Iniciar com tema personalizado"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Simulation Message Thread */
            <>
              {messages.map((studyMessage, messageIndex) => (
                <div
                  key={studyMessage.id}
                  style={{
                    display: 'flex',
                    justifyContent: studyMessage.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '90%',
                      padding: 'var(--spacing-ml) var(--spacing-md)',
                      backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                      borderRadius:
                        studyMessage.role === 'model' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                      boxShadow: 'var(--shadow-extruded-flat)',
                    }}
                  >
                    {studyMessage.isMCQ ? (
                      <MultipleChoiceQuestion
                        question={studyMessage.content}
                        options={studyMessage.options || []}
                        onSelectOption={(chosenOption) =>
                          handleAnswerSelect(studyMessage.id, chosenOption)
                        }
                        disabled={studyMessage.answered || isLoadingAiResponse}
                      />
                    ) : (
                      <>
                        <div
                          style={{
                            fontFamily:
                              studyMessage.role === 'model'
                                ? 'var(--typography-fontfamilies-mainserif)'
                                : 'var(--typography-fontfamilies-mainsans)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            color: 'var(--color-semantic-text-textdark)',
                          }}
                        >
                          <ReactMarkdown>{studyMessage.content}</ReactMarkdown>
                        </div>

                        {studyMessage.content.includes('Aviso do Sistema:') && (
                          <div style={{ marginTop: 'var(--spacing-md)' }}>
                            <button
                              type="button"
                              onClick={() => handleRetryInteraction(messageIndex)}
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={endOfMessagesRef} />
        </main>
      </div>

      {/* Shared Delete Confirmation Dialog */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Excluir Sessão?"
        description="Tem certeza que deseja excluir esta sessão de estudo? Todo o histórico será perdido."
        onConfirm={handleDeleteStudySession}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
