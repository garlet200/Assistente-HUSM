const fs = require('fs');

let file = 'src/app/(app)/chat/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('import ReactMarkdown')) {
  content = content.replace(/import \{ useRouter \} from 'next\/navigation';/, "import { useRouter } from 'next/navigation';\nimport ReactMarkdown from 'react-markdown';");
  content = content.replace(/>\s*\{interaction\.response\}\s*<\/div>/, '>\n                        <ReactMarkdown>{interaction.response}</ReactMarkdown>\n                      </div>');
  fs.writeFileSync(file, content);
}

file = 'src/app/(app)/study/[id]/page.tsx';
content = fs.readFileSync(file, 'utf8');
if (!content.includes('import ReactMarkdown')) {
  content = content.replace(/import \{ useRouter \} from 'next\/navigation';/, "import { useRouter } from 'next/navigation';\nimport ReactMarkdown from 'react-markdown';");
  content = content.replace(/>\s*\{msg\.content\}\s*<\/div>/, '>\n                        <ReactMarkdown>{msg.content}</ReactMarkdown>\n                      </div>');
  fs.writeFileSync(file, content);
}
