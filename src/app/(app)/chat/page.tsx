'use client';

/**
 * @file page.tsx
 * @description Hub de Histórico Clínico (/chat) que lista as consultas anteriores do usuário
 * salvas no Supabase (`module = 'chat'`) e permite iniciar um novo caso clínico.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { fetchUserSessionsByModule } from '@/lib/supabase/sessionRepository';
import {
  SessionHistoryList,
  SessionSummaryItem,
} from '@/components/common/SessionHistoryList';
import { SESSION_STORAGE_KEYS } from '@/lib/constants/session';

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

  const handleStartNewChat = (): void => {
    router.push('/chat/new');
  };

  const handleOpenChatSession = (selectedChatId: string): void => {
    router.push(`/chat/${selectedChatId}`);
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
      onCreateNewSession={handleStartNewChat}
      onSelectSession={handleOpenChatSession}
    />
  );
}
