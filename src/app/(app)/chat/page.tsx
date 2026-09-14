'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { formatTimestampToLocaleString } from '@/lib/utils/formatters';

interface ChatSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    sessionStorage.removeItem('activeChatId');

    const fetchUserChatSessions = async () => {
      setIsLoadingHistory(true);

      const { data: databaseChats, error: fetchError } = await supabase
        .from('chats')
        .select('id, title, updated_at')
        .eq('module', 'chat')
        .order('updated_at', { ascending: false });

      if (databaseChats && !fetchError) {
        setChatSessions(databaseChats);
      }

      setIsLoadingHistory(false);
    };

    fetchUserChatSessions();
  }, [user, router, supabase]);

  if (!user) {
    return null;
  }

  const handleStartNewChat = () => {
    router.push('/chat/new');
  };

  const handleOpenChatSession = (selectedChatId: string) => {
    router.push(`/chat/${selectedChatId}`);
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
            Histórico Clínico
          </h1>
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>
            Acesse pesquisas anteriores ou inicie uma nova.
          </p>
        </div>

        <button
          type="button"
          className="neu-button"
          onClick={handleStartNewChat}
          style={{
            background: 'var(--color-semantic-accent-accentprimary)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
          title="Novo caso clínico"
        >
          <Plus size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
        {isLoadingHistory ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
            Carregando histórico...
          </p>
        ) : chatSessions.length === 0 ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
            Nenhum chat anterior encontrado.
          </p>
        ) : (
          chatSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="neu-button"
              onClick={() => handleOpenChatSession(session.id)}
              style={{
                borderRadius: '16px',
                padding: 'var(--spacing-md-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'left',
                color: 'var(--color-semantic-text-textdark)',
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 'var(--spacing-min)' }}>
                  {session.title}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)' }}>
                  {formatTimestampToLocaleString(session.updated_at)}
                </div>
              </div>
              <div style={{ color: 'var(--color-semantic-accent-accentprimary)' }}>
                <ChevronRight size={20} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
