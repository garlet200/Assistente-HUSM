# Verificação de Rotina e Limpeza de Código - MedHUSM

Este arquivo contém o comando e as diretrizes padrão para auditorias e checks de manutenção periódicos do projeto.

---

## Comando de Execução

Ao solicitar uma nova verificação, utilize o prompt abaixo:

```text
Faça uma verificação de rotina e limpeza do código deste projeto. Este é um check de manutenção, não uma refatoração de fundo — priorize identificar e corrigir problemas pontuais, sem redesenhar arquitetura ou alterar comportamento funcional. Verifique e reporte antes de corrigir automaticamente qualquer item que exija mudança estrutural maior:

1. Higiene de código
- Imports não utilizados, variáveis mortas, funções/componentes que não são mais referenciados em lugar nenhum.
- Console.logs, comentários de debug, ou código comentado esquecido de sessões anteriores.
- Duplicação introduzida recentemente que poderia ser consolidada.

2. Consistência com padrões já estabelecidos
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

5. Acessibilidade e legibilidade (conforme padrão já definido para o projeto)
- Elementos interativos sem estado de foco visível.
- Textos ou nomes de variáveis que não seguem o padrão de clareza já estabelecido.

Formato do relatório: antes de aplicar qualquer correção, me entregue uma lista organizada por categoria (as 5 acima), indicando arquivo, linha (se aplicável) e severidade (crítico / recomendado / opcional). Corrija automaticamente apenas os itens de severidade "crítico" e "recomendado" que não envolvam mudança estrutural; itens "opcional" ou que exigem decisão de design ficam pendentes para minha aprovação.
```

---

## Critérios de Severidade

- **Crítico**: Vulnerabilidades ativas, falhas de execução, chamadas assíncronas com risco de *unhandled rejection*, vazamento de dados ou dependências com risco severo de segurança.
- **Recomendado**: Código morto / dados mockados residuais, blocos de erro silenciosos sem log, valores visuais sem design-tokens, elementos interativos sem `:focus-visible`.
- **Opcional**: Refatorações de arquivos legados mantidos para compatibilidade, pequenas discrepâncias de espaçamento não-críticas, atualizações menores de pacotes sem impacto de segurança.
