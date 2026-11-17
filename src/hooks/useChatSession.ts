'use client';

/**
 * @file useChatSession.ts
 * @description Hook de gerenciamento de estado e ciclo de vida do Chat de Raciocínio Clínico,
 * orquestrando Optimistic UI, persistência via sessionRepository, edição/exclusão e exportação PDF.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  buildChatPreviewTitle,
  buildConversationHistory,
  deleteMessageByIdSilently,
  deleteSessionFromDatabase,
  fetchSessionTitleAndMessages,
  groupMessagesIntoInteractions,
  insertSessionMessageRecord,
  postRequestToAiGateway,
  touchSessionUpdatedAtInDatabase,
  updateSessionTitleInDatabase,
} from '@/lib/supabase/sessionRepository';
import { AIRequestHistoryMessage } from '@/lib/ai/types';
import { Interaction } from '@/components/chat/ChatInteractionCard';
import {
  SESSION_STORAGE_KEYS,
  DEFAULT_SESSION_TITLES,
  SCROLL_BOTTOM_THRESHOLD_PX,
  AUTO_SCROLL_DELAY_MS,
  notifySessionsUpdated,
} from '@/lib/constants/session';
import { exportConversationAsPdf } from '@/lib/utils/exporters';
import { ASSISTANT_UNAVAILABLE_MESSAGE } from '@/lib/utils/formatters';

export function useChatSession(routeChatId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [activeChatId, setActiveChatId] = useState<string>(routeChatId);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(routeChatId !== 'new');
  const [shouldShowScrollButton, setShouldShowScrollButton] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>(DEFAULT_SESSION_TITLES.NEW_CHAT);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainScrollContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (activeChatId !== 'new') {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID, activeChatId);
    }
  }, [user, router, activeChatId]);

  useEffect(() => {
    if (routeChatId === 'new' || !user) return;
    const loadChatHistoryFromDatabase = async (targetChatId: string): Promise<void> => {
      setIsFetchingHistory(true);
      const { title, messages: databaseMessages } = await fetchSessionTitleAndMessages(supabase, targetChatId);
      if (title) setChatTitle(title);
      if (databaseMessages) setInteractions(groupMessagesIntoInteractions(databaseMessages));
      setIsFetchingHistory(false);
    };
    void loadChatHistoryFromDatabase(routeChatId);
  }, [routeChatId, user, supabase]);

  useEffect(() => {
    if (!isFetchingHistory && interactions.length > 0) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isFetchingHistory, interactions.length]);

  const handleScrollDetection = (): void => {
    if (!mainScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainScrollContainerRef.current;
    setShouldShowScrollButton(scrollHeight - scrollTop - clientHeight >= SCROLL_BOTTOM_THRESHOLD_PX);
  };

  const scrollToBottomSmoothly = (): void => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShouldShowScrollButton(false);
  };

  const handleTitleCommit = async (newTitleText: string): Promise<void> => {
    const trimmedTitle = newTitleText.trim() || DEFAULT_SESSION_TITLES.CHAT_FALLBACK;
    setChatTitle(trimmedTitle);
    await updateSessionTitleInDatabase(supabase, activeChatId, trimmedTitle);
  };

  const updateTargetInteractionInState = (
    temporaryInteractionId: string,
    persistedUserMessageId: string | undefined,
    updater: (interaction: Interaction) => Interaction
  ): void => {
    setInteractions((prev) =>
      prev.map((item) => {
        const isTarget =
          item.id === temporaryInteractionId ||
          Boolean(persistedUserMessageId && item.userMessageId === persistedUserMessageId);
        return isTarget ? updater(item) : item;
      })
    );
  };

  const ensureActiveChatSessionId = async (promptToSend: string): Promise<string | null> => {
    if (activeChatId !== 'new') return activeChatId;
    if (!user) return null;

    const chatTitlePreview = buildChatPreviewTitle(promptToSend);
    const { data: createdChat, error: chatCreationError } = await supabase
      .from('chats')
      .insert([{ user_id: user.id, title: chatTitlePreview, module: 'chat' }])
      .select()
      .single();

    if (chatCreationError || !createdChat) {
      console.error('Falha ao criar sessão de chat no banco:', chatCreationError);
      return null;
    }

    setActiveChatId(createdChat.id);
    setChatTitle(createdChat.title);
    window.history.replaceState(null, '', `/chat/${createdChat.id}`);
    notifySessionsUpdated();
    return createdChat.id;
  };

  const requestGatewayAndPersistReply = async (requestParams: {
    sessionId: string;
    promptToSend: string;
    history: AIRequestHistoryMessage[];
    temporaryInteractionId: string;
    persistedUserMessageId?: string;
  }): Promise<void> => {
    const gatewayResult = await postRequestToAiGateway({
      prompt: requestParams.promptToSend,
      role: 'MODEL_ROLE_CLINICAL_REASONING',
      history: requestParams.history,
      aiLanguageLevel: user?.aiLanguageLevel,
      aiDetailLevel: user?.aiDetailLevel,
    });

    const persistedModelMessage = await insertSessionMessageRecord(supabase, {
      sessionId: requestParams.sessionId,
      role: 'model',
      content: gatewayResult.text,
      citations: gatewayResult.citations || [],
      metadata: {
        reliability: gatewayResult.reliability,
        modelTier: gatewayResult.modelTier,
        modelId: gatewayResult.modelId,
        displayName: gatewayResult.displayName,
      },
    });

    await touchSessionUpdatedAtInDatabase(supabase, requestParams.sessionId);

    updateTargetInteractionInState(
      requestParams.temporaryInteractionId,
      requestParams.persistedUserMessageId,
      (interaction) => ({
        ...interaction,
        response: gatewayResult.text,
        citations: gatewayResult.citations,
        modelMessageId: persistedModelMessage?.id,
        reliability: gatewayResult.reliability,
        modelTier: gatewayResult.modelTier,
        modelDisplayName: gatewayResult.displayName,
      })
    );
  };

  const handleSend = async (overridePromptText?: string | React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    const promptToSend = typeof overridePromptText === 'string' ? overridePromptText : inputPrompt;
    if (!promptToSend.trim() || isLoadingResponse || !user) return;

    const temporaryInteractionId = crypto.randomUUID();
    setInteractions((prev) => [
      ...prev,
      { id: temporaryInteractionId, prompt: promptToSend, response: null, timestamp: new Date() },
    ]);

    if (typeof overridePromptText !== 'string') setInputPrompt('');
    setIsLoadingResponse(true);
    setTimeout(() => endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' }), AUTO_SCROLL_DELAY_MS);

    const resolvedChatSessionId = await ensureActiveChatSessionId(promptToSend);
    if (!resolvedChatSessionId) {
      setIsLoadingResponse(false);
      return;
    }

    const persistedUserMessage = await insertSessionMessageRecord(supabase, {
      sessionId: resolvedChatSessionId,
      role: 'user',
      content: promptToSend,
    });

    if (persistedUserMessage) {
      updateTargetInteractionInState(temporaryInteractionId, undefined, (item) => ({
        ...item,
        userMessageId: persistedUserMessage.id,
      }));
    }

    try {
      await requestGatewayAndPersistReply({
        sessionId: resolvedChatSessionId,
        promptToSend,
        history: buildConversationHistory(interactions),
        temporaryInteractionId,
        persistedUserMessageId: persistedUserMessage?.id,
      });
    } catch (gatewayError) {
      console.error('Erro na chamada do Gateway:', gatewayError);
      updateTargetInteractionInState(temporaryInteractionId, persistedUserMessage?.id, (item) => ({
        ...item,
        response: ASSISTANT_UNAVAILABLE_MESSAGE,
      }));
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleRetryInteraction = async (interactionToRetry: Interaction): Promise<void> => {
    setInteractions((prev) => prev.filter((item) => item.id !== interactionToRetry.id));
    deleteMessageByIdSilently(supabase, interactionToRetry.userMessageId, 'chat user retry');
    deleteMessageByIdSilently(supabase, interactionToRetry.modelMessageId, 'chat model retry');
    await handleSend(interactionToRetry.prompt);
  };

  const handleDeleteCurrentSession = async (): Promise<void> => {
    await deleteSessionFromDatabase(supabase, activeChatId);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID);
    router.push('/chat');
  };

  const handleExportCurrentSessionPdf = (): void => {
    exportConversationAsPdf(
      chatTitle,
      interactions.map((item) => ({
        heading: item.prompt,
        body: item.response || '',
        timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: item.citations,
      }))
    );
  };

  return {
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
    handleDeleteCurrentSession,
    handleExportCurrentSessionPdf,
  };
}
