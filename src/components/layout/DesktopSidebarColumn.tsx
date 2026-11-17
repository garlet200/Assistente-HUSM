'use client';

/**
 * @file DesktopSidebarColumn.tsx
 * @description Coluna 01 do layout Desktop (>= 1024px), exibindo o histórico de sessões do modo
 * ativo (/chat ou /study) com destaque da sessão aberta e sincronização automática, ou o menu de ferramentas.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import {
  deleteSessionFromDatabase,
  fetchSessionExportCards,
  fetchUserSessionsByModule,
  SessionModuleType,
  updateSessionTitleInDatabase,
} from '@/lib/supabase/sessionRepository';
import {
  SessionHistoryList,
  SessionSummaryItem,
} from '@/components/common/SessionHistoryList';
import {
  DEFAULT_SESSION_TITLES,
  notifySessionsUpdated,
  SESSION_STORAGE_KEYS,
  SESSIONS_UPDATED_EVENT,
} from '@/lib/constants/session';
import { exportConversationAsPdf } from '@/lib/utils/exporters';
import ToolsMenu from '@/app/(app)/tools/page';

function resolveActiveSessionIdFromPath(pathname: string, prefix: string): string | undefined {
  if (!pathname.startsWith(`${prefix}/`)) return undefined;
  const candidateId = pathname.slice(prefix.length + 1).split('/')[0];
  return candidateId && candidateId !== 'new' ? candidateId : undefined;
}

function ModeHistorySidebar({ moduleType }: { moduleType: SessionModuleType }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();

  const [sessions, setSessions] = useState<SessionSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isChatMode = moduleType === 'chat';
  const routePrefix = isChatMode ? '/chat' : '/study';
  const activeSessionId = resolveActiveSessionIdFromPath(pathname, routePrefix);

  useEffect(() => {
    let isCancelled = false;

    const refreshSessions = async (): Promise<void> => {
      if (!user) return;
      const records = await fetchUserSessionsByModule(supabase, user.id, moduleType);
      if (!isCancelled) {
        setSessions(records);
        setIsLoading(false);
      }
    };

    void refreshSessions();

    const handleSessionsUpdated = (): void => {
      void refreshSessions();
    };
    window.addEventListener(SESSIONS_UPDATED_EVENT, handleSessionsUpdated);
    return () => {
      isCancelled = true;
      window.removeEventListener(SESSIONS_UPDATED_EVENT, handleSessionsUpdated);
    };
  }, [user, supabase, moduleType]);

  const handleCreateNew = async (): Promise<void> => {
    if (isChatMode) {
      router.push('/chat/new');
      return;
    }
    if (!user) return;
    const { data: created, error } = await supabase
      .from('chats')
      .insert({ user_id: user.id, title: DEFAULT_SESSION_TITLES.NEW_STUDY, module: 'study' })
      .select()
      .single();
    if (!error && created) {
      notifySessionsUpdated();
      router.push(`/study/${created.id}`);
    }
  };

  const handleRename = async (sessionId: string, newTitle: string): Promise<void> => {
    await updateSessionTitleInDatabase(supabase, sessionId, newTitle);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s)));
  };

  const handleDelete = async (sessionId: string): Promise<void> => {
    const deleted = await deleteSessionFromDatabase(supabase, sessionId);
    if (!deleted) return;
    const storageKey = isChatMode
      ? SESSION_STORAGE_KEYS.ACTIVE_CHAT_ID
      : SESSION_STORAGE_KEYS.ACTIVE_STUDY_ID;
    if (sessionStorage.getItem(storageKey) === sessionId) {
      sessionStorage.removeItem(storageKey);
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      router.push(routePrefix);
    }
  };

  const handleExportPdf = async (session: SessionSummaryItem): Promise<void> => {
    const cards = await fetchSessionExportCards(supabase, session.id, session.title);
    exportConversationAsPdf(session.title, cards);
  };

  return (
    <SessionHistoryList
      heading={isChatMode ? 'Histórico Clínico' : 'Sessões de Estudo'}
      subtitle={
        isChatMode
          ? 'Acesse pesquisas anteriores ou inicie uma nova.'
          : 'Pratique raciocínio clínico com casos simulados.'
      }
      createButtonTitle={isChatMode ? 'Novo caso clínico' : 'Nova sessão de estudo'}
      loadingMessage={isChatMode ? 'Carregando histórico...' : 'Carregando sessões...'}
      emptyMessage={
        isChatMode
          ? 'Nenhum chat anterior encontrado.'
          : 'Nenhuma sessão de estudo iniciada ainda. Comece uma nova!'
      }
      isLoading={isLoading}
      sessions={sessions}
      activeSessionId={activeSessionId}
      onCreateNewSession={() => void handleCreateNew()}
      onSelectSession={(sessionId) => router.push(`${routePrefix}/${sessionId}`)}
      onRenameSession={handleRename}
      onDeleteSession={handleDelete}
      onExportSessionPdf={isChatMode ? handleExportPdf : undefined}
    />
  );
}

export function DesktopSidebarColumn() {
  const pathname = usePathname();

  if (pathname.startsWith('/study')) {
    return <ModeHistorySidebar moduleType="study" />;
  }
  if (pathname.startsWith('/tools')) {
    return <ToolsMenu />;
  }
  return <ModeHistorySidebar moduleType="chat" />;
}
