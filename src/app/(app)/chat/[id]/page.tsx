'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

type Interaction = {
  id: string;
  userMessageId?: string;
  modelMessageId?: string;
  prompt: string;
  response: string | null;
  timestamp: Date;
  citations?: string[];
};

export default function ChatSession({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const { id: resolvedId } = use(params);
  
  const [chatId, setChatId] = useState<string>(resolvedId);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(resolvedId !== 'new');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatTitle, setChatTitle] = useState('Novo Caso Clínico');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      if (chatId !== 'new') {
        sessionStorage.setItem('activeChatId', chatId);
      }
    }
  }, [user, router, chatId]);

  useEffect(() => {
    if (resolvedId !== 'new' && user) {
      loadHistory(resolvedId);
    }
  }, [resolvedId, user]);

  // Initial scroll to bottom when history is loaded
  useEffect(() => {
    if (!fetchingHistory && interactions.length > 0) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [fetchingHistory]);

  const handleRetry = async (interaction: Interaction) => {
    // Remove from UI immediately
    setInteractions(prev => prev.filter(int => int.id !== interaction.id));
    
    // Delete from DB in background
    if (interaction.userMessageId) {
      supabase.from('messages').delete().eq('id', interaction.userMessageId).then();
    }
    if (interaction.modelMessageId) {
      supabase.from('messages').delete().eq('id', interaction.modelMessageId).then();
    }

    // Resend automatically
    handleSend(interaction.prompt);
  };


  const handleScroll = () => {
    if (mainRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollButton(!isNearBottom);
    }
  };

  const loadHistory = async (dbChatId: string) => {
    setFetchingHistory(true);
    
    // Fetch chat title
    const { data: chatData } = await supabase
      .from('chats')
      .select('title')
      .eq('id', dbChatId)
      .single();
      
    if (chatData) {
      setChatTitle(chatData.title);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', dbChatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      setFetchingHistory(false);
      return;
    }

    // Group messages into interactions (user -> model)
    const newInteractions: Interaction[] = [];
    let currentInt: any = null;

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        if (currentInt) newInteractions.push(currentInt);
        currentInt = {
          id: msg.id,
          userMessageId: msg.id,
          prompt: msg.content,
          response: null,
          timestamp: new Date(msg.created_at),
          citations: []
        };
      } else if (msg.role === 'model' && currentInt) {
        currentInt.response = msg.content;
        currentInt.citations = msg.citations || [];
        currentInt.modelMessageId = msg.id;
      }
    });
    if (currentInt) newInteractions.push(currentInt);

    setInteractions(newInteractions);
    setFetchingHistory(false);
  };

  const handleSend = async (overridePrompt?: string | React.MouseEvent | any) => {
    const currentPrompt = typeof overridePrompt === 'string' ? overridePrompt : input;
    if (!currentPrompt.trim() || loading || !user) return;

    const tempId = Date.now().toString();
    const newInteraction: Interaction = { 
      id: tempId, 
      prompt: currentPrompt, 
      response: null,
      timestamp: new Date()
    };
    
    setInteractions(prev => [...prev, newInteraction]);
    if (typeof overridePrompt !== 'string') setInput('');
    setLoading(true);
    
    // Scroll to bottom when sending a new message
    setTimeout(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    let activeChatId = chatId;

    // 1. If this is a new chat, create it in the database first
    if (activeChatId === 'new') {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([{ 
          user_id: user.id, 
          title: currentPrompt.substring(0, 50) + (currentPrompt.length > 50 ? '...' : '') 
        }])
        .select()
        .single();

      if (chatError || !newChat) {
        console.error(chatError);
        setLoading(false);
        return;
      }
      activeChatId = newChat.id;
      setChatId(activeChatId);
      window.history.replaceState(null, '', `/chat/${activeChatId}`);
    }

    // 2. Save user message to DB
    const { data: dbUserMsg } = await supabase.from('messages').insert([{
      chat_id: activeChatId,
      role: 'user',
      content: currentPrompt
    }]).select().single();

    if (dbUserMsg) {
      setInteractions(prev => prev.map(int => int.id === tempId ? { ...int, userMessageId: dbUserMsg.id } : int));
    }

    // 3. Reconstruct history for the API
    const history = interactions.flatMap(int => [
      { role: 'user', content: int.prompt },
      ...(int.response ? [{ role: 'model', content: int.response }] : [])
    ]);

    try {
      // 4. Call AI Gateway
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          role: 'MODEL_ROLE_CLINICAL_REASONING',
          history: history
        })
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com o Gateway');
      }

      const data = await response.json();
      
      // 5. Save model response to DB
      const { data: dbModelMsg } = await supabase.from('messages').insert([{
        chat_id: activeChatId,
        role: 'model',
        content: data.text,
        citations: data.citations || []
      }]).select().single();

      // Update 'updated_at' of the chat
      await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', activeChatId);

      setInteractions(prev => prev.map(int => 
        (int.id === tempId || (dbUserMsg && int.userMessageId === dbUserMsg.id))
          ? { ...int, response: data.text, citations: data.citations, modelMessageId: dbModelMsg?.id }
          : int
      ));
    } catch (error) {
      console.error(error);
      setInteractions(prev => prev.map(int => 
        (int.id === tempId || (dbUserMsg && int.userMessageId === dbUserMsg.id))
          ? { ...int, response: '⚠️ **Aviso do Sistema:** Ocorreu um erro ao processar sua solicitação. Tente novamente.' }
          : int
      ));
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = async (newTitle: string) => {
    setChatTitle(newTitle);
    setIsEditingTitle(false);
    if (chatId !== 'new') {
      await supabase.from('chats').update({ title: newTitle }).eq('id', chatId);
    }
  };

  const enableEditMode = () => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  const handleDeleteChat = async () => {
    if (chatId !== 'new') {
      await supabase.from('chats').delete().eq('id', chatId);
    }
    router.push('/chat');
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-ml)', padding: '16px 24px 0 24px', backgroundColor: 'transparent' }}>
        <button 
          onClick={() => setShowDeleteModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-status-error)',
            padding: 'var(--spacing-min)'
          }}
          title="Excluir Caso"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
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
          title="Editar Nome do Caso"
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
            placeholder="Nome do Caso..."
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
          onScroll={handleScroll}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--spacing-lg)'
          }}>
          {fetchingHistory ? (
             <div style={{ textAlign: 'center', color: 'var(--color-semantic-text-textlight)', marginTop: '40px' }}>
               <p>Carregando histórico...</p>
             </div>
          ) : interactions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-semantic-text-textlight)', marginTop: '40px' }}>
              <p>Descreva o caso clínico, sinais ou sintomas.</p>
              <p style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>O roteador enviará para o modelo mais adequado (Free-First).</p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div key={interaction.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                  width: '100%', 
                  padding: 'var(--spacing-md)', 
                  backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)', 
                  borderRadius: '16px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-semantic-text-textdark)' }}>
                      {interaction.prompt}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-semantic-text-textlight)', whiteSpace: 'nowrap', marginLeft: 'var(--spacing-md)' }}>
                      {interaction.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)', margin: '12px 0' }} />
                  
                  {!interaction.response ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontFamily: 'var(--typography-fontfamilies-mainsans)', color: 'var(--color-semantic-text-textlight)', fontStyle: 'italic' }}>
                      <style>{`@keyframes spin-anim { 100% { transform: rotate(360deg); } }`}</style>
                      <svg style={{ animation: 'spin-anim 1s linear infinite', transformOrigin: 'center' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                        <path d="M12 2v4"></path>
                      </svg>
                      Processando resposta...
                    </div>
                  ) : (
                    <>
                      <div 
                        style={{ 
                          fontFamily: 'var(--typography-fontfamilies-mainserif)',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--color-semantic-text-textdark)'
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            a: ({ node, href, children, ...props }: any) => {
                              if (href?.startsWith('#sugestao-')) {
                                const suggestionText = decodeURIComponent(href.replace('#sugestao-', ''));
                                return (
                                  <button
                                    onClick={() => setInput(suggestionText)}
                                    style={{
                                      background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                                      border: '1px solid var(--color-semantic-accent-accentprimary)',
                                      borderRadius: '16px',
                                      padding: 'var(--spacing-sm) var(--spacing-md)',
                                      color: 'var(--color-semantic-accent-accentprimary)',
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      margin: 'var(--spacing-min)',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    {children}
                                  </button>
                                );
                              }
                              return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-semantic-accent-accentprimary)' }} {...props}>{children}</a>;
                            }
                          }}
                        >
                          {interaction.response}
                        </ReactMarkdown>
                      </div>

                      {interaction.response.includes('Aviso do Sistema:') && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            onClick={() => handleRetry(interaction)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-sm)',
                              background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                              border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                              borderRadius: '16px',
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              color: 'var(--color-semantic-text-textdark)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontFamily: 'var(--typography-fontfamilies-mainsans)'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                              <path d="M3 3v5h5"></path>
                            </svg>
                            Tentar novamente
                          </button>
                        </div>
                      )}
                      
                      {interaction.citations && interaction.citations.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-md)', paddingTop: '12px' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)', color: 'var(--color-semantic-text-textlight)' }}>Fontes (RAG):</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                            {interaction.citations.map((cit, idx) => {
                              const isPmid = cit.startsWith('PMID: ');
                              if (!isPmid) {
                                return (
                                  <span key={idx} style={{ fontFamily: 'var(--typography-fontfamilies-mainmono)', fontSize: '0.75rem', backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)', padding: 'var(--spacing-min) var(--spacing-sm)', borderRadius: '4px', border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)' }}>
                                    {cit}
                                  </span>
                                );
                              }
                              
                              const citParts = cit.split(' | ');
                              const pmidCode = citParts[0].replace('PMID:', '').trim();
                              const title = citParts[1] || pmidCode;
                              const displayTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
                              const url = `https://pubmed.ncbi.nlm.nih.gov/${pmidCode}/`;
                              
                              return (
                                <a 
                                  key={idx} 
                                  href={url}
                                  target="_blank"
                                  title={title}
                                  style={{ 
                                    fontFamily: 'var(--typography-fontfamilies-mainmono)', 
                                    fontSize: '0.75rem', 
                                    backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)', 
                                    padding: 'var(--spacing-min) var(--spacing-sm)', 
                                    borderRadius: '4px', 
                                    border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                                    textDecoration: 'none',
                                    color: 'var(--color-semantic-accent-accentprimary)',
                                    cursor: 'pointer'
                                  }}>
                                  🔗 {displayTitle}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={endOfMessagesRef} />
        </main>

        {showScrollButton && (
          <button
            onClick={() => {
              endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShowScrollButton(false);
            }}
            style={{
              position: 'absolute',
              bottom: 'var(--spacing-max)',
              right: 'var(--spacing-max)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
              border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-semantic-text-textdark)',
              zIndex: 10,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </button>
        )}
      </div>

      <footer className="chat-footer">
        <div style={{ display: 'flex', gap: 'var(--spacing-ml)', alignItems: 'center' }}>
          <Input 
            pill
            placeholder="Descreva sua dúvida..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            style={{ flex: 1 }}
          />
          <button 
            className="neu-button"
            onClick={handleSend} 
            disabled={loading || fetchingHistory || !input.trim()}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (loading || fetchingHistory || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || fetchingHistory || !input.trim()) ? 0.6 : 1,
              color: 'var(--color-semantic-text-textdark)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </footer>

      {showDeleteModal && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
            padding: 'var(--spacing-xl)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-extruded-large)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 var(--spacing-md) 0', color: 'var(--color-semantic-text-textdark)' }}>Excluir Caso?</h3>
            <p style={{ margin: '0 0 var(--spacing-xl) 0', color: 'var(--color-semantic-text-textlight)' }}>
              Tem certeza que deseja excluir este caso? Todas as mensagens serão perdidas para sempre.
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                  border: 'none',
                  padding: 'var(--spacing-sm) var(--spacing-lg)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--color-semantic-text-textdark)'
                }}
              >
                Não excluir
              </button>
              <button 
                onClick={handleDeleteChat}
                style={{
                  background: 'var(--color-semantic-status-error)',
                  border: 'none',
                  padding: 'var(--spacing-sm) var(--spacing-lg)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--color-primitive-white)'
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
