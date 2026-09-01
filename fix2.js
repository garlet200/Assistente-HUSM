const fs = require('fs');
let file = 'src/app/(app)/study/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/metadata: any/g, 'metadata: Record<string, unknown>');
fs.writeFileSync(file, content);

file = 'src/app/(app)/study/page.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
fs.writeFileSync(file, content);

file = 'src/app/(app)/chat/page.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
fs.writeFileSync(file, content);

file = 'src/app/api/gateway/route.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/catch \(error: any\)/, 'catch (error: unknown)');
content = content.replace(/error\.message/g, '(error as Error).message');
fs.writeFileSync(file, content);

file = 'src/lib/ai/providers/gemini.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/catch \(error: any\)/, 'catch (error: unknown)');
content = content.replace(/error\.message/g, '(error as Error).message');
content = content.replace(/generationConfig: any/g, 'generationConfig: Record<string, unknown>');
fs.writeFileSync(file, content);

file = 'src/lib/ai/registry.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/models: any\[\]/g, 'models: Record<string, unknown>[]');
fs.writeFileSync(file, content);

file = 'src/lib/ai/router.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/catch \(error\)/, 'catch (error: unknown)');
fs.writeFileSync(file, content);
