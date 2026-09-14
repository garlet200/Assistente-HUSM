'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { formatTimestampToLocaleString } from '@/lib/utils/formatters';

interface StudySessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

export default function StudyHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [studySessions, setStudySessions] = useState<StudySessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    sessionStorage.removeItem('activeStudyId');

    const fetchUserStudySessions = async () => {
      setIsLoadingSessions(true);

      const { data: databaseSessions, error: fetchError } = await supabase
        .from('chats')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .eq('module', 'study')
        .order('updated_at', { ascending: false });

      if (!fetchError && databaseSessions) {
        setStudySessions(databaseSessions);
      }

      setIsLoadingSessions(false);
    };

    fetchUserStudySessions();
  }, [user, router, supabase]);

  if (!user) {
    return null;
  }

  const handleCreateNewStudySession = async () => {
    const { data: createdSession, error: creationError } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: 'Nova Sessão de Estudo',
        module: 'study',
      })
      .select()
      .single();

    if (creationError) {
      console.error('Falha ao criar nova sessão de estudo no Supabase:', creationError);
      return;
    }

    if (createdSession) {
      router.push(`/study/${createdSession.id}`);
    }
  };

  const handleOpenStudySession = (selectedSessionId: string) => {
    router.push(`/study/${selectedSessionId}`);
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
            Sessões de Estudo
          </h1>
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>
            Pratique raciocínio clínico com casos simulados.
          </p>
        </div>

        <button
          type="button"
          className="neu-button"
          onClick={handleCreateNewStudySession}
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
          title="Nova sessão de estudo"
        >
          <Plus size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
        {isLoadingSessions ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
            Carregando sessões...
          </p>
        ) : studySessions.length === 0 ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
            Nenhuma sessão de estudo iniciada ainda. Comece uma nova!
          </p>
        ) : (
          studySessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="neu-button"
              onClick={() => handleOpenStudySession(session.id)}
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
