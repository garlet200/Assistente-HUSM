const fs = require('fs');
const file = 'src/app/(app)/chat/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Interaction type
content = content.replace(
  /type Interaction = {[\s\S]*?};/,
  \	ype Interaction = {
  id: string;
  userMessageId?: string;
  modelMessageId?: string;
  prompt: string;
  response: string | null;
  timestamp: Date;
  citations?: string[];
};\
);

// 2. Update loadHistory
content = content.replace(
  /currentInt = {[\s\S]*?timestamp: new Date\(msg.created_at\),[\s\S]*?citations: \[\][\s\S]*?};/,
  \currentInt = {
          id: msg.id,
          userMessageId: msg.id,
          prompt: msg.content,
          response: null,
          timestamp: new Date(msg.created_at),
          citations: []
        };\
);
content = content.replace(
  /currentInt\.citations = msg\.citations \|\| \[\];/,
  \currentInt.citations = msg.citations || [];\n        currentInt.modelMessageId = msg.id;\
);

// 3. Update handleSend signature and prompt extraction
content = content.replace(
  /const handleSend = async \(\) => {[\s\S]*?const currentPrompt = input;/,
  \const handleSend = async (overridePrompt?: string) => {
    const currentPrompt = overridePrompt || input;
    if (!currentPrompt.trim() || loading || !user) return;\
);
content = content.replace(
  /if \(!input\.trim\(\) \|\| loading \|\| !user\) return;/,
  \\ // Remove the old check since we moved it above
);

content = content.replace(
  /setInput\(''\);/,
  \if (!overridePrompt) setInput('');\
);

// 4. Update handleSend DB inserts
// We need to capture dbUserMsg and dbModelMsg
content = content.replace(
  /const { error: userError } = await supabase\.from\('messages'\)\.insert\({([\s\S]*?)}\);/,
  \const { data: dbUserMsg, error: userError } = await supabase.from('messages').insert({}).select().single();
        if (dbUserMsg) {
          setInteractions(prev => prev.map(int => int.id === tempId ? { ...int, userMessageId: dbUserMsg.id } : int));
        }\
);

content = content.replace(
  /const { error: modelError } = await supabase\.from\('messages'\)\.insert\({([\s\S]*?)}\);/,
  \const { data: dbModelMsg, error: modelError } = await supabase.from('messages').insert({}).select().single();\
);

content = content.replace(
  /setInteractions\(prev => prev\.map\(int => [\s\S]*?int\.id === tempId [\s\S]*?\? { \.\.\.int, response: data\.text, citations: data\.citations \|\| \[\] }[\s\S]*?: int[\s\S]*?\)\);/,
  \setInteractions(prev => prev.map(int => 
          int.id === tempId 
          ? { ...int, response: data.text, citations: data.citations || [], modelMessageId: dbModelMsg?.id }
          : int
        ));\
);

// 5. Add handleRetry function after handleSend
content = content.replace(
  /const handleKeyDown = /,
  \const handleRetry = async (interaction: Interaction) => {
    setInteractions(prev => prev.filter(int => int.id !== interaction.id));
    if (interaction.userMessageId) {
      await supabase.from('messages').delete().eq('id', interaction.userMessageId);
    }
    if (interaction.modelMessageId) {
      await supabase.from('messages').delete().eq('id', interaction.modelMessageId);
    }
    handleSend(interaction.prompt);
  };

  const handleKeyDown = \
);

// 6. Update JSX to add Retry button
content = content.replace(
  /<\/ReactMarkdown>\s*<\/div>\s*\{interaction\.citations/,
  \</ReactMarkdown>
                      </div>

                      {interaction.response.includes('Aviso do Sistema') && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            onClick={() => handleRetry(interaction)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-sm)',
                              background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                              border: '1px solid var(--color-semantic-text-textlight)',
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
                      
                      {interaction.citations\
);

fs.writeFileSync(file, content);
console.log('Chat updated');
