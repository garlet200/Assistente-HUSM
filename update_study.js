const fs = require('fs');
const file = 'src/app/(app)/study/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const handleRetryCode = \
  const handleRetry = async (errorIndex: number) => {
    const errorMsg = messages[errorIndex];
    const userMsg = messages[errorIndex - 1];
    
    // UI removal
    const newMessages = [...messages];
    newMessages.splice(errorIndex - 1, 2);
    setMessages(newMessages);
    
    // DB removal
    if (errorMsg.id !== 'err' && !errorMsg.id.includes('err')) {
      supabase.from('messages').delete().eq('id', errorMsg.id).then();
    }
    if (userMsg && userMsg.id !== 'err' && !userMsg.id.includes('err')) {
      supabase.from('messages').delete().eq('id', userMsg.id).then();
    }
    
    // Retry logic
    if (userMsg.content.startsWith('Quero estudar sobre: ')) {
      const topic = userMsg.content.replace('Quero estudar sobre: ', '');
      handleStartStudy(topic);
    } else {
      const previousMCQ = messages[errorIndex - 2];
      if (previousMCQ) {
        await updateMessageMetadata(previousMCQ.id, { ...previousMCQ, answered: false });
        setMessages(prev => prev.map(m => m.id === previousMCQ.id ? { ...m, answered: false } : m));
        handleAnswerSelect(previousMCQ.id, userMsg.content);
      }
    }
  };\;

content = content.replace(
  /const enableEditMode = \(\) => {/,
  handleRetryCode + '\n\n  const enableEditMode = () => {'
);

const jsxReplacement = \
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.content.includes('Aviso do Sistema:') && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            onClick={() => handleRetry(messages.indexOf(msg))}
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
\;

content = content.replace(
  /<ReactMarkdown>\{msg\.content\}<\/ReactMarkdown>\\s*<\/div>/,
  jsxReplacement + '\\n                    </div>'
);

fs.writeFileSync(file, content);
console.log('Done');
