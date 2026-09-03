const fs = require('fs');
let file = 'src/app/(app)/study/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');
let lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('systemInstruction')) {
    console.log(study page line : );
  }
});
file = 'src/app/(app)/chat/[id]/page.tsx';
content = fs.readFileSync(file, 'utf8');
lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('systemInstruction')) {
    console.log(chat page line : );
  }
});
