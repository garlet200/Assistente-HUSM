'use client';

/**
 * @file useStudySession.ts
 * @description Hook de gerenciamento de estado e progressão do Simulador de Casos Clínicos (Modo Estudo),
 * controlando geração de questões MCQ em JSON, avaliação de respostas, edição/exclusão e exportação PDF.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  buildStudyConversationHistory,
  buildStudyModelReplyPayload,
  DatabaseMessageRow,
  deleteMessageByIdSilently,
  deleteSessionFromDatabase,
  fetchSessionTitleAndMessages,
  insertSessionMessageRecord,
  mapDatabaseRowToStudyMessage,
  postRequestToAiGateway,
  updateMessageMetadataInDatabase,
  updateSessionTitleInDatabase,
} from '@/lib/supabase/sessionRepository';
import { StudyMessage } from '@/components/study/StudySimulationCard';
import {
  buildInitialCaseSystemInstruction,
  buildInitialCaseUserPrompt,
  buildAnswerEvaluationSystemInstruction,
  buildAnswerEvaluationUserPrompt,
  EducationalSimulationJsonPayload,
} from '@/lib/ai/prompts';
import { AIRequestHistoryMessage } from '@/lib/ai/types';
import { deIdentify } from '@/lib/ai/privacyGate';
import {
  SESSION_STORAGE_KEYS,
  DEFAULT_SESSION_TITLES,
  STUDY_TOPIC_PROMPT_PREFIX,
  STUDY_TITLE_PREFIX_REGEX,
  STUDY_ERROR_MESSAGE_ID_PREFIX,
} from '@/lib/constants/session';
import { ASSISTANT_UNAVAILABLE_MESSAGE } from '@/lib/utils/formatters';

export function useStudySession(routeSessionId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [hasSelectedTopic, setHasSelectedTopic] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>(DEFAULT_SESSION_TITLES.STUDY_DEFAULT);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainScrollContainerRef = useRef<HTMLElement>(null);
  const hasAutoStartedPendingTopicRef = useRef(false);

  const handleTitleCommit = async (newTitleText: string): Promise<void> => {
    const sanitizedTitle = deIdentify(newTitleText).trim() || DEFAULT_SESSION_TITLES.STUDY_DEFAULT;
    setSessionTitle(sanitizedTitle);
    await updateSessionTitleInDatabase(supabase, routeSessionId, sanitizedTitle);
  };

  const persistStudyModelReplyInBackground = async (
    temporaryMessageId: string,
    content: string,
    metadata: Record<string, unknown>,
    precedingDbPromise?: Promise<unknown>
  ): Promise<void> => {
    if (precedingDbPromise) await precedingDbPromise;

    const persistedRecord = await insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'model',
      content,
      metadata,
    });

    if (persistedRecord) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === temporaryMessageId ? { ...msg, id: persistedRecord.id } : msg))
      );
    }
  };

  const requestAndPersistStudyStep = async (stepParams: {
    prompt: string;
    systemInstruction: string;
    history?: AIRequestHistoryMessage[];
    replaceAllMessages?: boolean;
    precedingDbPromise?: Promise<unknown>;
  }): Promise<void> => {
    const gatewayResult = await postRequestToAiGateway({
      prompt: stepParams.prompt,
      role: 'MODEL_ROLE_EDUCATIONAL',
      userId: user?.id,
      history: stepParams.history,
      responseFormat: 'json',
      systemInstruction: stepParams.systemInstruction,
    });

    const parsedAiPayload: EducationalSimulationJsonPayload = JSON.parse(gatewayResult.text);
    const temporaryMessageId = crypto.randomUUID();
    const { message: generatedStudyMessage, metadata } = buildStudyModelReplyPayload(
      temporaryMessageId,
      parsedAiPayload,
      gatewayResult
    );

    setMessages((prev) =>
      stepParams.replaceAllMessages ? [generatedStudyMessage] : [...prev, generatedStudyMessage]
    );
    setIsLoadingAiResponse(false);

    void persistStudyModelReplyInBackground(
      temporaryMessageId,
      parsedAiPayload.content,
      metadata,
      stepParams.precedingDbPromise
    );
  };

  const appendUnavailableErrorMessage = (): void => {
    const errorMessageId = `${STUDY_ERROR_MESSAGE_ID_PREFIX}-${crypto.randomUUID()}`;
    setMessages((prev) => [
      ...prev,
      { id: errorMessageId, role: 'model', content: ASSISTANT_UNAVAILABLE_MESSAGE },
    ]);
  };

  const handleStartStudy = async (topicToStudy: string): Promise<void> => {
    const sanitizedTopic = deIdentify(topicToStudy).trim() || topicToStudy;
    setSelectedTopic(sanitizedTopic);
    setHasSelectedTopic(true);
    setMessages([]);
    setIsLoadingAiResponse(true);

    const titleUpdatePromise =
      routeSessionId !== 'new' && sessionTitle === DEFAULT_SESSION_TITLES.NEW_STUDY
        ? handleTitleCommit(`Estudo: ${sanitizedTopic}`)
        : Promise.resolve();
    const userTopicPromise = insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'user',
      content: `${STUDY_TOPIC_PROMPT_PREFIX}${sanitizedTopic}`,
    });

    try {
      await requestAndPersistStudyStep({
        prompt: buildInitialCaseUserPrompt(sanitizedTopic),
        systemInstruction: buildInitialCaseSystemInstruction(),
        replaceAllMessages: true,
        precedingDbPromise: Promise.all([titleUpdatePromise, userTopicPromise]),
      });
    } catch (studySimulationError) {
      console.error('Erro na simulação clínica:', studySimulationError);
      appendUnavailableErrorMessage();
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (routeSessionId === 'new') return;
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID, routeSessionId);

    const loadStudySessionFromDatabase = async (targetSessionId: string): Promise<void> => {
      const { title, messages: databaseMessages } = await fetchSessionTitleAndMessages(supabase, targetSessionId);
      if (title) {
        setSessionTitle(title);
        const extractedTopic = title.replace(STUDY_TITLE_PREFIX_REGEX, '');
        if (extractedTopic) setSelectedTopic(extractedTopic);
      }
      if (!databaseMessages || databaseMessages.length === 0) {
        const pendingTopic = sessionStorage.getItem(SESSION_STORAGE_KEYS.PENDING_STUDY_TOPIC);
        if (pendingTopic && !hasAutoStartedPendingTopicRef.current) {
          hasAutoStartedPendingTopicRef.current = true;
          sessionStorage.removeItem(SESSION_STORAGE_KEYS.PENDING_STUDY_TOPIC);
          await handleStartStudy(pendingTopic);
        }
        return;
      }
      setHasSelectedTopic(true);

      const firstTopicMsg = databaseMessages.find(
        (m: DatabaseMessageRow) => m.role === 'user' && m.content.startsWith(STUDY_TOPIC_PROMPT_PREFIX)
      );
      if (firstTopicMsg) setSelectedTopic(firstTopicMsg.content.replace(STUDY_TOPIC_PROMPT_PREFIX, ''));
      setMessages(databaseMessages.map(mapDatabaseRowToStudyMessage));
    };

    void loadStudySessionFromDatabase(routeSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, routeSessionId, supabase]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAiResponse]);

  const handleAnswerSelect = async (questionMessageId: string, chosenOptionText: string): Promise<void> => {
    const sanitizedOptionText = deIdentify(chosenOptionText);
    const studyHistory = buildStudyConversationHistory(messages);
    const targetQuestion = messages.find((msg) => msg.id === questionMessageId);
    const temporaryUserAnswerId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev.map((msg) => (msg.id === questionMessageId ? { ...msg, answered: true } : msg)),
      { id: temporaryUserAnswerId, role: 'user', content: sanitizedOptionText },
    ]);
    setIsLoadingAiResponse(true);

    const metadataUpdatePromise = targetQuestion
      ? updateMessageMetadataInDatabase(supabase, routeSessionId, questionMessageId, { ...targetQuestion, answered: true })
      : Promise.resolve();

    const userAnswerPromise = insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'user',
      content: sanitizedOptionText,
    }).then((persisted) => {
      if (persisted) {
        setMessages((prev) => prev.map((m) => (m.id === temporaryUserAnswerId ? { ...m, id: persisted.id } : m)));
      }
      return persisted;
    });

    try {
      await requestAndPersistStudyStep({
        prompt: buildAnswerEvaluationUserPrompt(sanitizedOptionText),
        systemInstruction: buildAnswerEvaluationSystemInstruction(),
        history: studyHistory,
        precedingDbPromise: Promise.all([metadataUpdatePromise, userAnswerPromise]),
      });
    } catch (evaluationError) {
      console.error('Erro ao avaliar resposta:', evaluationError);
      appendUnavailableErrorMessage();
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  const handleRetryInteraction = async (targetMessageId: string): Promise<void> => {
    const errorItemIndex = messages.findIndex((msg) => msg.id === targetMessageId);
    if (errorItemIndex === -1) {
      if (selectedTopic) await handleStartStudy(selectedTopic);
      return;
    }

    const errorNoticeMessage = messages[errorItemIndex];
    const precedingUserMessage = messages[errorItemIndex - 1];
    const updatedMessagesList = [...messages];
    updatedMessagesList.splice(errorItemIndex - 1, 2);
    setMessages(updatedMessagesList);

    deleteMessageByIdSilently(supabase, errorNoticeMessage?.id, 'study error retry');
    deleteMessageByIdSilently(supabase, precedingUserMessage?.id, 'study user retry');

    if (!precedingUserMessage) {
      if (selectedTopic) await handleStartStudy(selectedTopic);
      return;
    }
    if (precedingUserMessage.content.startsWith(STUDY_TOPIC_PROMPT_PREFIX)) {
      await handleStartStudy(precedingUserMessage.content.replace(STUDY_TOPIC_PROMPT_PREFIX, ''));
      return;
    }

    const previousQuestion = messages[errorItemIndex - 2];
    if (!previousQuestion) return;
    await updateMessageMetadataInDatabase(supabase, routeSessionId, previousQuestion.id, { ...previousQuestion, answered: false });
    setMessages((prev) => prev.map((msg) => (msg.id === previousQuestion.id ? { ...msg, answered: false } : msg)));
    await handleAnswerSelect(previousQuestion.id, precedingUserMessage.content);
  };

  const handleDeleteCurrentStudySession = async (): Promise<void> => {
    await deleteSessionFromDatabase(supabase, routeSessionId);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID);
    router.push('/study');
  };

  const resolvedDisplayTopic = selectedTopic || sessionTitle.replace(STUDY_TITLE_PREFIX_REGEX, '') || 'Tema de Estudo';

  return {
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
    handleDeleteCurrentStudySession,
  };
}
