'use client';

/**
 * @file page.tsx
 * @description Hub de Sessões de Estudo (/study) que lista simulações de casos clínicos
 * anteriores (`module = 'study'`) e permite criar, renomear ou excluir sessões no Supabase.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  deleteSessionFromDatabase,
  fetchUserSessionsByModule,
  updateSessionTitleInDatabase,
} from '@/lib/supabase/sessionRepository';
import {
  SessionHistoryList,
  SessionSummaryItem,
} from '@/components/common/SessionHistoryList';
import {
  SESSION_STORAGE_KEYS,
  DEFAULT_SESSION_TITLES,
  notifySessionsUpdated,
} from '@/lib/constants/session';

export default function StudyHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [studySessions, setStudySessions] = useState<SessionSummaryItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID);

    const loadUserStudySessions = async (): Promise<void> => {
      setIsLoadingSessions(true);
      const userStudies = await fetchUserSessionsByModule(supabase, user.id, 'study');
      setStudySessions(userStudies);
      setIsLoadingSessions(false);
    };

    void loadUserStudySessions();
  }, [user, router, supabase]);

  if (!user) {
    return null;
  }

  const handleCreateNewStudySession = async (): Promise<void> => {
    const { data: createdSession, error: creationError } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: DEFAULT_SESSION_TITLES.NEW_STUDY,
        module: 'study',
      })
      .select()
      .single();

    if (creationError) {
      console.error('Falha ao criar nova sessão de estudo no Supabase:', creationError);
      return;
    }

    if (createdSession) {
      notifySessionsUpdated();
      router.push(`/study/${createdSession.id}`);
    }
  };

  const handleRenameStudySession = async (sessionId: string, newTitle: string): Promise<void> => {
    await updateSessionTitleInDatabase(supabase, sessionId, newTitle);
    setStudySessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, title: newTitle } : session))
    );
  };

  const handleDeleteStudySession = async (sessionId: string): Promise<void> => {
    const deleted = await deleteSessionFromDatabase(supabase, sessionId);
    if (!deleted) return;
    if (sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID) === sessionId) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID);
    }
    setStudySessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  return (
    <SessionHistoryList
      heading="Sessões de Estudo"
      subtitle="Pratique raciocínio clínico com casos simulados."
      createButtonTitle="Nova sessão de estudo"
      loadingMessage="Carregando sessões..."
      emptyMessage="Nenhuma sessão de estudo iniciada ainda. Comece uma nova!"
      isLoading={isLoadingSessions}
      sessions={studySessions}
      onCreateNewSession={handleCreateNewStudySession}
      onSelectSession={(selectedSessionId) => router.push(`/study/${selectedSessionId}`)}
      onRenameSession={handleRenameStudySession}
      onDeleteSession={handleDeleteStudySession}
    />
  );
}
