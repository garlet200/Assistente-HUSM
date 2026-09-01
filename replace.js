const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/calc\(var\(--spacing-md\) \* 1\.5\)/g, 'var(--spacing-lg)');
  content = content.replace(/calc\(var\(--spacing-min\) \* 2\)/g, 'var(--spacing-sm)');
  content = content.replace(/calc\(var\(--spacing-min\) \* 3\)/g, 'var(--spacing-ml)');
  content = content.replace(/calc\(var\(--spacing-md\) \+ var\(--spacing-min\)\)/g, 'var(--spacing-md-lg)');
  
  // also fix shadows from extruded-large to extruded-medium for the buttons the user asked
  if(file.includes('BottomNav.tsx')) {
    content = content.replace(/var\(--shadow-extruded-large\)/g, 'var(--shadow-extruded-medium)');
  }
  if(file.includes('chat/page.tsx')) {
    content = content.replace(/var\(--shadow-extruded-large\)/g, 'var(--shadow-extruded-medium)');
  }
  if(file.includes('study/page.tsx')) {
    content = content.replace(/var\(--shadow-extruded-large\)/g, 'var(--shadow-extruded-medium)');
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
