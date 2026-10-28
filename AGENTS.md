<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Padrão de Código para Leitura Humana

- Proibido deixar código morto, blocos comentados de tentativas anteriores, imports órfãos ou logs de debug após concluir uma tarefa.
- Priorize código explícito e legível sobre one-liners complexos ou ternários aninhados.
- Use Guard Clauses (Early Returns) para manter a indentação rasa.
- Antes de criar uma nova função utilitária ou componente, busque no repositório se já existe algo equivalente para evitar código duplicado de sessões passadas.
- Mantenha arquivos enxutos e modulares (máximo de 250-300 linhas por arquivo e 40-50 linhas por função).
- Sempre valide o build/typecheck no terminal antes de dar a tarefa por concluída.
