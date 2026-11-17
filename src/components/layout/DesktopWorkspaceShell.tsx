'use client';

/**
 * @file DesktopWorkspaceShell.tsx
 * @description Orquestrador responsivo do Route Group (app): mantém o fluxo Mobile (< 1024px)
 * intacto e ativa no Desktop (>= 1024px) o grid de 3 colunas (1 coluna de histórico + 2 colunas de área de trabalho).
 */

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { DesktopSidebarColumn } from './DesktopSidebarColumn';
import { StudyTopicSelector } from '@/components/study/StudyTopicSelector';
import ChatSession from '@/app/(app)/chat/[id]/page';
import {
  notifySessionsUpdated,
  SESSION_STORAGE_KEYS,
} from '@/lib/constants/session';
import styles from './DesktopWorkspaceShell.module.css';

const NEW_CHAT_PARAMS_PROMISE = Promise.resolve({ id: 'new' });

function DesktopNewStudyWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const handleSelectInitialTopic = async (topicName: string): Promise<void> => {
    if (!user) return;
    const { data: createdSession, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: `Estudo: ${topicName}`,
        module: 'study',
      })
      .select()
      .single();

    if (error || !createdSession) {
      console.error('Falha ao iniciar estudo no desktop:', error);
      return;
    }

    sessionStorage.setItem(SESSION_STORAGE_KEYS.PENDING_STUDY_TOPIC, topicName);
    notifySessionsUpdated();
    router.push(`/study/${createdSession.id}`);
  };

  return (
    <div className={styles.desktopStudyNewWrapper}>
      <StudyTopicSelector onSelectTopic={(topic) => void handleSelectInitialTopic(topic)} />
    </div>
  );
}

export function DesktopWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncDesktopState = (): void => setIsDesktop(mediaQuery.matches);
    syncDesktopState();
    mediaQuery.addEventListener('change', syncDesktopState);
    return () => mediaQuery.removeEventListener('change', syncDesktopState);
  }, []);

  if (!isDesktop) {
    return <main className={styles.mobileMain}>{children}</main>;
  }

  if (pathname.startsWith('/profile')) {
    return (
      <div className={styles.desktopWorkspace}>
        <section className={styles.columnFullSpan}>{children}</section>
      </div>
    );
  }

  const renderWorkspaceContent = () => {
    if (pathname === '/chat') {
      return <ChatSession params={NEW_CHAT_PARAMS_PROMISE} />;
    }
    if (pathname === '/study') {
      return <DesktopNewStudyWorkspace />;
    }
    if (pathname === '/tools') {
      return (
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
            boxShadow: 'var(--shadow-extruded-flat)',
            borderRadius: 'var(--radius-radius-large)',
          }}
        />
      );
    }
    return children;
  };

  return (
    <div className={styles.desktopWorkspace}>
      <aside className={styles.columnLeft}>
        <div className={styles.columnLeftScroll}>
          <DesktopSidebarColumn />
        </div>
      </aside>

      <section className={styles.columnWorkspace}>{renderWorkspaceContent()}</section>
    </div>
  );
}
