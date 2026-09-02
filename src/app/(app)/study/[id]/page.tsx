'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/auth';
import { MultipleChoiceQuestion } from '@/components/ui/MultipleChoiceQuestion';
import { createClient } from '@/lib/supabase/client';

type StudyMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  isMCQ?: boolean;
  options?: string[];
  answered?: boolean;
};

export default function StudyChat({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const resolvedParams = use(params);
  const resolvedId = resolvedParams.id;
  
  const [topicSelected, setTopicSelected] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('Sessão de Estudo');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async (dbChatId: string) => {
    const { data: chatData } = await supabase
      .from('chats')
      .select('title')
      .eq('id', dbChatId)
      .single();
      
    if (chatData) {
      setChatTitle(chatData.title);
    }

    const { data: dbMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', dbChatId)
      .order('created_at', { ascending: true });

    if (!error && dbMessages && dbMessages.length > 0) {
      setTopicSelected(true);
      const formatted: StudyMessage[] = dbMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'model',
        content: m.content,
        isMCQ: m.metadata?.isMCQ,
        options: m.metadata?.options,
        answered: m.metadata?.answered
      }));
      setMessages(formatted);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      if (resolvedId !== 'new') {
        sessionStorage.setItem('activeStudyId', resolvedId);
        loadHistory(resolvedId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, resolvedId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleTitleChange = async (newTitle: string) => {
    setChatTitle(newTitle);
    setIsEditingTitle(false);
    if (resolvedId !== 'new') {
      await supabase.from('chats').update({ title: newTitle }).eq('id', resolvedId);
    }
  };

  const enableEditMode = () => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  const saveMessageToDB = async (role: string, content: string, metadata: Record<string, unknown> = {}) => {
    if (resolvedId === 'new') return null;
    const { data } = await supabase
      .from('messages')
      .insert({
        chat_id: resolvedId,
        role,
        content,
        metadata
      })
      .select()
      .single();
    return data;
  };

  const updateMessageMetadata = async (messageId: string, metadata: Record<string, unknown>) => {
    if (resolvedId === 'new') return;
    await supabase.from('messages').update({ metadata }).eq('id', messageId);
  };

  const handleStartStudy = async (topic: string) => {
    setTopicSelected(true);
    if (resolvedId !== 'new' && chatTitle === 'Nova Sessão de Estudo') {
      handleTitleChange(`Estudo: ${topic}`);
    }

    const initMsg: StudyMessage = {
      id: Date.now().toString(),
      role: 'model',
      content: `Iniciando sessão de estudos sobre: **${topic}**. Aguarde, estou elaborando o caso clínico...`,
    };
    setMessages([initMsg]);
    setLoading(true);
    
    await saveMessageToDB('user', `Quero estudar sobre: ${topic}`);

    try {
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Gere um caso clínico sobre ${topic} seguido de uma pergunta de múltipla escolha.`,
          role: 'MODEL_ROLE_EDUCATIONAL',
          responseFormat: 'json',
          systemInstruction: `Você é um preceptor médico examinando um estudante ou médico residente. Você deve gerar um caso clínico desafiador, com história da moléstia atual, exame físico e exames laboratoriais se relevante, terminando com UMA pergunta de múltipla escolha com 4 ou 5 opções (A, B, C, D). A sua saída DEVE ser estritamente em JSON válido seguindo a estrutura: {"content": "O texto do caso clínico e a pergunta em si.", "isMCQ": true, "options": ["A) opção", "B) opção", "C) opção", "D) opção"]}`
        }),
      });

      if (!response.ok) throw new Error('Erro na API');
      
      const result = await response.json();
      const parsed = JSON.parse(result.text); // Since responseFormat=json, the text is a JSON string
      
      const aiMsg: StudyMessage = {
        id: Date.now().toString(),
        role: 'model',
        content: parsed.content,
        isMCQ: parsed.isMCQ,
        options: parsed.options,
        answered: false
      };
      
      setMessages(prev => [...prev, aiMsg]);
      const savedMsg = await saveMessageToDB('model', parsed.content, { isMCQ: parsed.isMCQ, options: parsed.options, answered: false });
      if (savedMsg) {
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, id: savedMsg.id } : m));
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: 'err', role: 'model', content: 'Ocorreu um erro ao gerar o caso. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (messageId: string, option: string) => {
    // 1. Mark current question as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, answered: true } : m));
    
    // Find the original message to update its metadata in DB
    const originalMsg = messages.find(m => m.id === messageId);
    if (originalMsg) {
      await updateMessageMetadata(messageId, { ...originalMsg, answered: true });
    }

    // 2. Add user answer
    const userMsg: StudyMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: option
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessageToDB('user', option);

    setLoading(true);

    try {
      // Build history to send to LLM
      const history = messages.map(m => ({ role: m.role, content: m.isMCQ ? `${m.content}\nOpções: ${m.options?.join(' | ')}` : m.content }));
      
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `O aluno respondeu: ${option}. Avalie a resposta. Diga se está correta ou incorreta, explique detalhadamente o porquê referenciando as diretrizes e, em seguida, crie uma NOVA pergunta sobre a evolução do caso. Responda em JSON.`,
          role: 'MODEL_ROLE_EDUCATIONAL',
          history,
          responseFormat: 'json',
          systemInstruction: `Você é um preceptor médico. Avalie a resposta do aluno e faça a próxima pergunta do caso. A sua saída DEVE ser estritamente em JSON válido seguindo a estrutura: {"content": "Sua avaliação da resposta (correta ou incorreta) com as explicações, seguido da história da evolução do paciente e a nova pergunta.", "isMCQ": true, "options": ["A) opção", "B) opção", "C) opção", "D) opção"]}`
        }),
      });

      if (!response.ok) throw new Error('Erro na API');
      
      const result = await response.json();
      const parsed = JSON.parse(result.text);
      
      const aiMsg: StudyMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: parsed.content,
        isMCQ: parsed.isMCQ,
        options: parsed.options,
        answered: false
      };
      
      setMessages(prev => [...prev, aiMsg]);
      const savedMsg = await saveMessageToDB('model', parsed.content, { isMCQ: parsed.isMCQ, options: parsed.options, answered: false });
      if (savedMsg) {
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, id: savedMsg.id } : m));
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: 'err', role: 'model', content: 'Erro ao avaliar a resposta. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md) var(--spacing-lg) 0 var(--spacing-lg)', backgroundColor: 'transparent' }}>
        <button 
          onClick={enableEditMode}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-text-textlight)',
            padding: 'var(--spacing-min)'
          }}
          title="Editar Título"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        {isEditingTitle ? (
          <input 
            ref={titleInputRef}
            value={chatTitle}
            onChange={(e) => setChatTitle(e.target.value)}
            onBlur={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleChange(e.currentTarget.value);
            }}
            placeholder="Nome da Sessão..."
            style={{ 
              fontSize: '1.2rem', 
              fontWeight: 600, 
              color: 'var(--color-semantic-text-textdark)',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--color-semantic-text-textlight)',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--typography-fontfamilies-mainsans)'
            }}
          />
        ) : (
          <h1 style={{ 
            fontSize: '1.2rem', 
            fontWeight: 600, 
            color: 'var(--color-semantic-text-textdark)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {chatTitle}
          </h1>
        )}
      </div>

      <div style={{
        flex: 1,
        margin: 'var(--spacing-md)',
        backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
        boxShadow: 'var(--shadow-extruded-large)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <main 
          ref={mainRef}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--spacing-lg)' 
          }}>
          {!topicSelected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Selecione um Tema de Estudo</h2>
              <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center', maxWidth: '400px' }}>
                Escolha uma das especialidades abaixo ou digite um tema específico para gerar um caso clínico focado.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-ml)', justifyContent: 'center', maxWidth: '500px' }}>
                {['Cardiologia', 'Neurologia', 'Pediatria', 'Infectologia', 'Terapia Intensiva'].map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleStartStudy(topic)}
                    className="neu-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      cursor: 'pointer',
                      color: 'var(--color-semantic-text-textdark)',
                      fontWeight: 500,
                      fontFamily: 'var(--typography-fontfamilies-mainsans)'
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-ml)', marginTop: 'var(--spacing-md)', width: '100%', maxWidth: '400px' }}>
                <input 
                  type="text"
                  placeholder="Ou digite um tema (ex: Sepse)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customTopic.trim() && handleStartStudy(customTopic.trim())}
                  style={{
                    flex: 1,
                    background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                    border: 'none',
                    borderRadius: '999px',
                    padding: 'var(--spacing-ml) var(--spacing-md)',
                    boxShadow: 'var(--shadow-inset-medium)',
                    color: 'var(--color-semantic-text-textdark)',
                    fontFamily: 'var(--typography-fontfamilies-mainsans)',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => customTopic.trim() && handleStartStudy(customTopic.trim())}
                  disabled={!customTopic.trim()}
                  className="neu-button"
                  style={{
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: customTopic.trim() ? 'pointer' : 'not-allowed',
                    opacity: customTopic.trim() ? 1 : 0.6,
                    color: 'var(--color-semantic-text-textdark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth: '90%', 
                    padding: 'var(--spacing-ml) var(--spacing-md)', 
                    backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)', 
                    borderRadius: msg.role === 'model' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                    boxShadow: 'var(--shadow-extruded-flat)'
                  }}>
                    {msg.isMCQ ? (
                      <MultipleChoiceQuestion 
                        question={msg.content}
                        options={msg.options || []}
                        onSelect={(opt) => handleAnswerSelect(msg.id, opt)}
                        disabled={msg.answered || loading}
                      />
                    ) : (
                      <div 
                        style={{ 
                          fontFamily: msg.role === 'model' ? 'var(--typography-fontfamilies-mainserif)' : 'var(--typography-fontfamilies-mainsans)',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--color-semantic-text-textdark)'
                        }}
                      >
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ 
                    padding: 'var(--spacing-ml) var(--spacing-md)', 
                    backgroundColor: 'transparent',
                    fontStyle: 'italic',
                    color: 'var(--color-semantic-text-textlight)'
                  }}>
                    Analisando e gerando caso...
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endOfMessagesRef} />
        </main>
      </div>
    </div>
  );
}
