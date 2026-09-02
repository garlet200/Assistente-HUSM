'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

export default function ChatHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [chats, setChats] = useState<{ id: string, title: string, updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      sessionStorage.removeItem('activeChatId');
      fetchChats();
    }
  }, [user, router]);

  const fetchChats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('module', 'chat')
      .order('updated_at', { ascending: false });

    if (data && !error) {
      setChats(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!user) return null;

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Histórico Clínico</h1>
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Acesse pesquisas anteriores ou inicie uma nova.</p>
        </div>

        <button
          onClick={() => router.push('/chat/new')}
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
            flexShrink: 0
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
        {loading ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>Carregando histórico...</p>
        ) : chats.length === 0 ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>Nenhum chat anterior encontrado.</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => router.push(`/chat/${chat.id}`)}
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
                color: 'var(--color-semantic-text-textdark)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 'var(--spacing-min)' }}>{chat.title}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)' }}>{formatDate(chat.updated_at)}</div>
              </div>
              <div style={{ color: 'var(--color-semantic-accent-accentprimary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
