const fs = require('fs');

// Fix chat page
let file = 'src/app/(app)/chat/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const \[chats, setChats\] = useState<Record<string, unknown>\[\]>\(\[\]\);/, 'const [chats, setChats] = useState<{id: string, title: string, updated_at: string}[]>([]);');
fs.writeFileSync(file, content);

// Fix study page
file = 'src/app/(app)/study/page.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/const \[sessions, setSessions\] = useState<Record<string, unknown>\[\]>\(\[\]\);/, 'const [sessions, setSessions] = useState<{id: string, title: string, updated_at: string}[]>([]);');
fs.writeFileSync(file, content);
