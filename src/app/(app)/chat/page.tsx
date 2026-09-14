'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

interface ChatSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

/**
 * Formats ISO timestamps into Portuguese Brazilian short date format.
 */
function formatTimestampToLocaleString(dateString: string): string {
  const dateObject = new Date(dateString);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObject);
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
          onClick={handleStartNewChat}
          style={{
            background: 'var(--color-semantic-accent-accentprimary)',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            boxShadow: 'var(--shadow-extruded-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
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
              onClick={() => handleOpenChatSession(session.id)}
              style={{
                background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                border: 'none',
                borderRadius: '16px',
                padding: 'var(--spacing-md-lg)',
                boxShadow: 'var(--shadow-extruded-flat)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--color-semantic-text-textdark)',
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
