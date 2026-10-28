'use client';

/**
 * @file useStudySession.ts
 * @description Hook de gerenciamento de estado e progressão do Simulador de Casos Clínicos (Modo Estudo),
 * controlando geração de questões MCQ em JSON, avaliação de respostas e persistência via sessionRepository.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  buildStudyConversationHistory,
  DatabaseMessageRow,
  deleteMessageByIdSilently,
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

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (routeSessionId === 'new') return;

    sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID, routeSessionId);

    const loadStudySessionFromDatabase = async (targetSessionId: string): Promise<void> => {
      const { title, messages: databaseMessages } = await fetchSessionTitleAndMessages(
        supabase,
        targetSessionId
      );

      if (title) {
        setSessionTitle(title);
        const extractedTopic = title.replace(STUDY_TITLE_PREFIX_REGEX, '');
        if (extractedTopic) setSelectedTopic(extractedTopic);
      }

      if (!databaseMessages || databaseMessages.length === 0) return;
      setHasSelectedTopic(true);

      const firstUserTopicMessage = databaseMessages.find(
        (messageRecord: DatabaseMessageRow) =>
          messageRecord.role === 'user' &&
          messageRecord.content.startsWith(STUDY_TOPIC_PROMPT_PREFIX)
      );
      if (firstUserTopicMessage) {
        setSelectedTopic(firstUserTopicMessage.content.replace(STUDY_TOPIC_PROMPT_PREFIX, ''));
      }

      setMessages(databaseMessages.map(mapDatabaseRowToStudyMessage));
    };

    void loadStudySessionFromDatabase(routeSessionId);
  }, [user, router, routeSessionId, supabase]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAiResponse]);

  const handleTitleCommit = async (newTitleText: string): Promise<void> => {
    const trimmedTitle = newTitleText.trim() || DEFAULT_SESSION_TITLES.STUDY_DEFAULT;
    setSessionTitle(trimmedTitle);
    await updateSessionTitleInDatabase(supabase, routeSessionId, trimmedTitle);
  };

  const requestAndPersistStudyStep = async (stepParams: {
    prompt: string;
    systemInstruction: string;
    history?: AIRequestHistoryMessage[];
    replaceAllMessages?: boolean;
  }): Promise<void> => {
    const gatewayResult = await postRequestToAiGateway({
      prompt: stepParams.prompt,
      role: 'MODEL_ROLE_EDUCATIONAL',
      history: stepParams.history,
      responseFormat: 'json',
      systemInstruction: stepParams.systemInstruction,
    });

    const parsedAiPayload: EducationalSimulationJsonPayload = JSON.parse(gatewayResult.text);
    const temporaryMessageId = crypto.randomUUID();
    const generatedStudyMessage: StudyMessage = {
      id: temporaryMessageId,
      role: 'model',
      content: parsedAiPayload.content,
      isMCQ: parsedAiPayload.isMCQ,
      options: parsedAiPayload.options,
      answered: false,
      reliability: gatewayResult.reliability,
      modelTier: gatewayResult.modelTier,
    };

    setMessages((prev) =>
      stepParams.replaceAllMessages ? [generatedStudyMessage] : [...prev, generatedStudyMessage]
    );

    const persistedRecord = await insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'model',
      content: parsedAiPayload.content,
      metadata: {
        isMCQ: parsedAiPayload.isMCQ,
        options: parsedAiPayload.options,
        answered: false,
        reliability: gatewayResult.reliability,
        modelTier: gatewayResult.modelTier,
        modelId: gatewayResult.modelId,
        displayName: gatewayResult.displayName,
      },
    });

    if (persistedRecord) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === temporaryMessageId ? { ...msg, id: persistedRecord.id } : msg))
      );
    }
  };

  const appendUnavailableErrorMessage = (): void => {
    const errorMessageId = `${STUDY_ERROR_MESSAGE_ID_PREFIX}-${crypto.randomUUID()}`;
    setMessages((prev) => [
      ...prev,
      { id: errorMessageId, role: 'model', content: ASSISTANT_UNAVAILABLE_MESSAGE },
    ]);
  };

  const handleStartStudy = async (topicToStudy: string): Promise<void> => {
    setSelectedTopic(topicToStudy);
    setHasSelectedTopic(true);

    if (routeSessionId !== 'new' && sessionTitle === DEFAULT_SESSION_TITLES.NEW_STUDY) {
      await handleTitleCommit(`Estudo: ${topicToStudy}`);
    }

    setMessages([]);
    setIsLoadingAiResponse(true);

    await insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'user',
      content: `${STUDY_TOPIC_PROMPT_PREFIX}${topicToStudy}`,
    });

    try {
      await requestAndPersistStudyStep({
        prompt: buildInitialCaseUserPrompt(topicToStudy),
        systemInstruction: buildInitialCaseSystemInstruction(),
        replaceAllMessages: true,
      });
    } catch (studySimulationError) {
      console.error('Erro na simulação clínica:', studySimulationError);
      appendUnavailableErrorMessage();
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  const handleAnswerSelect = async (
    questionMessageId: string,
    chosenOptionText: string
  ): Promise<void> => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === questionMessageId ? { ...msg, answered: true } : msg))
    );

    const targetQuestion = messages.find((msg) => msg.id === questionMessageId);
    if (targetQuestion) {
      await updateMessageMetadataInDatabase(supabase, routeSessionId, questionMessageId, {
        ...targetQuestion,
        answered: true,
      });
    }

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: chosenOptionText },
    ]);
    await insertSessionMessageRecord(supabase, {
      sessionId: routeSessionId,
      role: 'user',
      content: chosenOptionText,
    });

    setIsLoadingAiResponse(true);

    try {
      await requestAndPersistStudyStep({
        prompt: buildAnswerEvaluationUserPrompt(chosenOptionText),
        systemInstruction: buildAnswerEvaluationSystemInstruction(),
        history: buildStudyConversationHistory(messages),
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
      const topicToRetry = precedingUserMessage.content.replace(STUDY_TOPIC_PROMPT_PREFIX, '');
      await handleStartStudy(topicToRetry);
      return;
    }

    const previousQuestion = messages[errorItemIndex - 2];
    if (!previousQuestion) return;

    await updateMessageMetadataInDatabase(supabase, routeSessionId, previousQuestion.id, {
      ...previousQuestion,
      answered: false,
    });

    setMessages((prev) =>
      prev.map((msg) => (msg.id === previousQuestion.id ? { ...msg, answered: false } : msg))
    );

    await handleAnswerSelect(previousQuestion.id, precedingUserMessage.content);
  };

  const resolvedDisplayTopic =
    selectedTopic || sessionTitle.replace(STUDY_TITLE_PREFIX_REGEX, '') || 'Tema de Estudo';

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
  };
}
