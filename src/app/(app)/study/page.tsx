'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

export default function StudyHub() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [sessions, setSessions] = useState<{id: string, title: string, updated_at: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user?.id)
      .eq('module', 'study')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      sessionStorage.removeItem('activeStudyId');
      loadSessions();
    }
  }, [user, router]);

  const createNewSession = async () => {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user?.id,
        title: 'Nova Sessão de Estudo',
        module: 'study'
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/study/${data.id}`);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Sessões de Estudo</h1>
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Pratique raciocínio clínico com casos simulados.</p>
        </div>
        
        <button 
          onClick={createNewSession}
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
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Carregando sessões...</p>
        ) : sessions.length === 0 ? (
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>Nenhuma sessão de estudo iniciada ainda. Comece uma nova!</p>
        ) : (
          sessions.map((session) => (
            <button 
              key={session.id}
              onClick={() => router.push(`/study/${session.id}`)}
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
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 'var(--spacing-min)' }}>{session.title}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)' }}>
                  {new Date(session.updated_at).toLocaleDateString()} {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
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
