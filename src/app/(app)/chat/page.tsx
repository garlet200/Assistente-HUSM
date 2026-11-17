'use client';

/**
 * @file page.tsx
 * @description Hub de Histórico Clínico (/chat) que lista as consultas anteriores do usuário
 * salvas no Supabase (`module = 'chat'`) e permite iniciar, renomear, exportar ou excluir sessões.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  deleteSessionFromDatabase,
  fetchSessionExportCards,
  fetchUserSessionsByModule,
  updateSessionTitleInDatabase,
} from '@/lib/supabase/sessionRepository';
import {
  SessionHistoryList,
  SessionSummaryItem,
} from '@/components/common/SessionHistoryList';
import { SESSION_STORAGE_KEYS } from '@/lib/constants/session';
import { exportConversationAsPdf } from '@/lib/utils/exporters';

export default function ChatHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [chatSessions, setChatSessions] = useState<SessionSummaryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID);

    const loadUserChatSessions = async (): Promise<void> => {
      setIsLoadingHistory(true);
      const userChats = await fetchUserSessionsByModule(supabase, user.id, 'chat');
      setChatSessions(userChats);
      setIsLoadingHistory(false);
    };

    void loadUserChatSessions();
  }, [user, router, supabase]);

  if (!user) {
    return null;
  }

  const handleRenameChatSession = async (sessionId: string, newTitle: string): Promise<void> => {
    await updateSessionTitleInDatabase(supabase, sessionId, newTitle);
    setChatSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, title: newTitle } : session))
    );
  };

  const handleDeleteChatSession = async (sessionId: string): Promise<void> => {
    const deleted = await deleteSessionFromDatabase(supabase, sessionId);
    if (!deleted) return;
    if (sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID) === sessionId) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID);
    }
    setChatSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const handleExportChatSessionPdf = async (session: SessionSummaryItem): Promise<void> => {
    const cards = await fetchSessionExportCards(supabase, session.id, session.title);
    exportConversationAsPdf(session.title, cards);
  };

  return (
    <SessionHistoryList
      heading="Histórico Clínico"
      subtitle="Acesse pesquisas anteriores ou inicie uma nova."
      createButtonTitle="Novo caso clínico"
      loadingMessage="Carregando histórico..."
      emptyMessage="Nenhum chat anterior encontrado."
      isLoading={isLoadingHistory}
      sessions={chatSessions}
      onCreateNewSession={() => router.push('/chat/new')}
      onSelectSession={(selectedChatId) => router.push(`/chat/${selectedChatId}`)}
      onRenameSession={handleRenameChatSession}
      onDeleteSession={handleDeleteChatSession}
      onExportSessionPdf={handleExportChatSessionPdf}
    />
  );
}
