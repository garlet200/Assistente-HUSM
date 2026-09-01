const fs = require('fs');

function fixStudyIdPage() {
  const file = 'src/app/(app)/study/[id]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const loadHistory = async \([^)]+\) => \{[\s\S]*?\};/m, '');
  content = content.replace(/useEffect\(\(\) => \{[\s\S]*?loadHistory\(resolvedId\);[\s\S]*?\}, \[user, router, resolvedId\]\);/m, (match) => {
    return const loadHistory = async (dbChatId: string) => {\n    const { data: chatData } = await supabase.from('chats').select('title').eq('id', dbChatId).single();\n    if (chatData) { setChatTitle(chatData.title); }\n    const { data: dbMessages, error } = await supabase.from('messages').select('*').eq('chat_id', dbChatId).order('created_at', { ascending: true });\n    if (!error && dbMessages && dbMessages.length > 0) {\n      setTopicSelected(true);\n      const formatted: StudyMessage[] = dbMessages.map(m => ({ id: m.id, role: m.role as 'user' | 'model', content: m.content, isMCQ: m.metadata?.isMCQ, options: m.metadata?.options, answered: m.metadata?.answered }));\n      setMessages(formatted);\n    }\n  };\n\n   + match;
  });
  content = content.replace(/metadata: any/g, 'metadata: Record<string, unknown>');
  fs.writeFileSync(file, content);
}

function fixStudyPage() {
  const file = 'src/app/(app)/study/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const loadSessions = async \(\) => \{[\s\S]*?\};/m, '');
  content = content.replace(/useEffect\(\(\) => \{[\s\S]*?loadSessions\(\);[\s\S]*?\}, \[user, router\]\);/m, (match) => {
    return const loadSessions = async () => {\n    setLoading(true);\n    const { data, error } = await supabase.from('chats').select('*').eq('user_id', user?.id).eq('module', 'study').order('updated_at', { ascending: false });\n    if (!error && data) { setSessions(data); }\n    setLoading(false);\n  };\n\n   + match;
  });
  content = content.replace(/setSessions = useState<any\[\]>/, 'setSessions = useState<Record<string, unknown>[]>');
  fs.writeFileSync(file, content);
}

function fixAuth() {
  const file = 'src/lib/auth.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const mapSupabaseUserToLocal = \(supabaseUser: SupabaseUser\) => \{[\s\S]*?\};/m, '');
  content = content.replace(/useEffect\(\(\) => \{/m, (match) => {
    return const mapSupabaseUserToLocal = (supabaseUser: SupabaseUser) => {\n    const metadata = supabaseUser.user_metadata || {};\n    setUser({ id: supabaseUser.id, email: supabaseUser.email, name: metadata.name || supabaseUser.email?.split('@')[0] || 'User', role: metadata.role || 'student', hasCompletedOnboarding: metadata.hasCompletedOnboarding || false });\n    setLoading(false);\n  };\n\n   + match;
  });
  fs.writeFileSync(file, content);
}

function fixOthers() {
  let file = 'src/app/api/gateway/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/catch \(error: any\)/, 'catch (error: unknown)');
  content = content.replace(/error.message/g, '(error as Error).message');
  fs.writeFileSync(file, content);

  file = 'src/lib/ai/providers/gemini.ts';
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/catch \(error: any\)/, 'catch (error: unknown)');
  content = content.replace(/error.message/g, '(error as Error).message');
  content = content.replace(/const generationConfig: any = \{\};/, 'const generationConfig: Record<string, unknown> = {};');
  fs.writeFileSync(file, content);
  
  file = 'src/lib/ai/registry.ts';
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/models: any\[\]/g, 'models: Record<string, unknown>[]');
  fs.writeFileSync(file, content);
  
  file = 'src/lib/ai/router.ts';
  content = fs.readFileSync(file, 'utf8');
  content = content.replace(/providers: Map<string, any>/g, 'providers: Map<string, any>'); // not strictly necessary or use unknown
  content = content.replace(/catch \(error\)/, 'catch (error: unknown)');
  fs.writeFileSync(file, content);
}

fixStudyIdPage();
fixStudyPage();
fixAuth();
fixOthers();
