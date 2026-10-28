# Verificação de Rotina e Limpeza de Código - MedHUSM

Este arquivo contém o comando e as diretrizes padrão para auditorias completas e checks rápidos de pós-feature no Google Antigravity.

## Modos de Execução (Escolha o escopo ao acionar o agente)
- **Modo Pós-Feature (Rápido):** "Execute o `routinecheck` no Modo Pós-Feature (analise apenas os arquivos alterados no `git status` / `git diff` em relação aos padrões do projeto)."
- **Modo Auditoria Completa:** "Execute o `routinecheck` no Modo Auditoria Completa em todo o repositório."

## Comando de Execução

Faça uma verificação de rotina e limpeza do código deste projeto (MedHUSM). Este é um check de manutenção e legibilidade humana, não uma rearquitetura — priorize identificar e corrigir problemas pontuais com 100% de paridade funcional. Verifique e reporte antes de corrigir automaticamente qualquer item que exija mudança estrutural maior:

1. Higiene de código e resíduos de Vibe Coding
- Imports não utilizados, variáveis mortas, funções/componentes que não são mais referenciados em lugar nenhum.
- Console.logs, comentários de debug, comentários óbvios gerados por IA ou código comentado esquecido de sessões anteriores.
- Duplicação introduzida recentemente que poderia ser consolidada.

2. Consistência com padrões já estabelecidos (MedHUSM)
- Nomenclatura de arquivos/pastas fora do padrão já definido para o projeto.
- Uso de valores de estilo "hardcoded" (cores, sombras, espaçamentos) que deveriam vir do design-tokens mas foram inseridos manualmente.
- Componentes que deveriam reusar um componente compartilhado existente, mas foram implementados de forma isolada.

3. Dependências
- Pacotes no package.json não utilizados no código.
- Dependências desatualizadas com atualização de segurança disponível (liste, não atualize automaticamente).

4. Erros silenciosos e riscos
- Blocos try/catch vazios ou que engolem erros sem log.
- Chamadas de API sem tratamento de erro.
- Chaves de API, tokens, ou dados sensíveis expostos diretamente no código-fonte.

5. Acessibilidade e legibilidade humana (Clean Code)
- Elementos interativos sem estado de foco visível (`:focus-visible`).
- Nomes de variáveis, funções ou propriedades vagos (`data`, `temp`, `res`, `item2`, `handleStuff`) que não seguem o padrão de clareza do domínio.
- Complexidade cognitiva alta: múltiplos níveis de `if/else` aninhados ou ternários encadeados que devem ser simplificados com Guard Clauses (Early Returns), números mágicos soltos e falta de tipagem explícita (`any`).

Formato do relatório e execução (Artifacts):
1. Antes de aplicar qualquer correção, entregue um Artifact de Relatório organizado pelas 5 categorias acima, indicando arquivo, linha (se aplicável) e severidade (Crítico / Recomendado / Opcional).
2. Corrija automaticamente apenas os itens de severidade "Crítico" e "Recomendado" que não envolvam mudança estrutural.
3. Após aplicar as correções automáticas, rode obrigatoriamente o build, linter e typecheck no terminal integrado para comprovar zero regressão funcional.
4. Itens de severidade "Opcional" ou que exijam decisão de design/arquitetura (como dividir um arquivo grande) ficam pendentes no relatório para minha aprovação.

## Critérios de Severidade

- **Crítico**: Vulnerabilidades ativas, falhas de execução/build, chamadas assíncronas com risco de *unhandled rejection*, vazamento de dados/tokens ou dependências com risco severo de segurança.
- **Recomendado**: Código morto / dados mockados residuais, blocos de erro silenciosos sem log, valores visuais fora dos design-tokens, elementos interativos sem `:focus-visible`, variáveis com nomes genéricos (`data`, `temp`) e condicionais profundamente aninhadas sem Guard Clauses.
- **Opcional**: Desmembramento de arquivos grandes/monolíticos em sub-módulos, refatorações de arquivos legados mantidos para compatibilidade, pequenas discrepâncias de espaçamento não-críticas e atualizações menores de pacotes sem impacto de segurança.
