# Refatoração segura do JavaScript

Realizada em 30/10/2026, após aprovação do plano. Objetivo: separar responsabilidades sem mudar funcionalidades, regras, mensagens ou o formato dos dados persistidos. Não foram introduzidos frameworks, módulos que exijam compilação ou serviços remotos.

## Organização resultante

| Arquivo | Responsabilidade e dependências |
| --- | --- |
| `js/task-rules.js` | Constantes e funções de calendário, validação, IDs, busca, filtros e contadores. Não acessa DOM nem armazenamento. Usa relógio e gerador de IDs nativos como antes. |
| `js/task-storage.js` | Adaptador que guarda snapshot e disponibilidade; lê, valida e grava no LocalStorage. Depende das regras e não acessa o DOM. Retorna estados de escrita ou propaga exceções ao controlador. |
| `js/task-view.js` | Criação de elementos com APIs seguras, renderização, formulários, diálogos e notificações. Recebe ações por callbacks; não lê nem grava o LocalStorage. Usa as regras existentes para apresentar metadados. |
| `script.js` | Estado da coleção e IDs selecionados, coordenação do CRUD, tratamento dos resultados de persistência e eventos de sincronização entre abas, foco e visibilidade. |

Os scripts são carregados nessa ordem com `defer`, em IIFEs, compartilhando somente o namespace `globalThis.TaskManager`. Não há importações ES modules nem novas dependências em tempo de execução. A abertura por `index.html` continua prevista; seu funcionamento depende das permissões de LocalStorage para `file://` do navegador. Os testes automatizados usam HTTP local.

## Misturas e duplicações tratadas

- Regras de pesquisa e contadores saíram da renderização para funções que recebem a coleção e os critérios.
- A validação do formulário saiu do evento de envio. A validação de registros persistidos continua separada porque inclui ID, tipos e regras de leitura diferentes das mensagens e normalização do formulário; ambas continuam usando as mesmas regras de data e constantes.
- Os cartões encaminham ações ao controlador por callbacks em vez de decidir sobre persistência.
- O acesso ao LocalStorage, JSON e snapshot ficou no adaptador. O controlador decide as mensagens e a atualização do estado e da interface.
- A busca por tarefa foi reunida em `findTask`, e a verificação repetida de diálogos abertos foi reunida em `hasOpenDialog`/`reloadWhenNoDialog`.
- A abrangência original do `try/catch` que inclui a renderização depois da escrita foi mantida para não corrigir o defeito de mensagem descrito em `BUGS_CONHECIDOS.md`.

## Compatibilidade dos dados

A chave continua sendo `gerenciador-tarefas:v1`. O valor continua sendo um array JSON com os campos `id`, `title`, `description`, `priority`, `deadline` e `status`. Não há migração, limpeza, nova chave ou regravação automática ao carregar. Foram mantidas a seleção dos campos conhecidos, a geração de IDs para novas tarefas, a ordem dos registros e a estratégia de comparação entre abas.

O novo teste de compatibilidade usa um registro sintético no formato da versão anterior, com ID fixo e JSON formatado. Confere que a leitura mantém o texto bruto salvo intacto e que uma edição explícita preserva o ID e os demais campos. Usa o LocalStorage real de um contexto isolado; nenhum dado pessoal foi acessado ou alterado.

## Verificações por etapa

Todas as execuções abaixo usaram `npx playwright test`, sem retentativas e sem alterar as expectativas dos testes existentes.

| Etapa | Aprovados | Falhas | Duração informada pelo Playwright |
| --- | --- | --- | --- |
| Referência antes da refatoração | 26 | 0 | 34,5 s |
| Extração das regras | 26 | 0 | 20,7 s |
| Extração da persistência | 26 | 0 | 22,7 s |
| Extração da interface e controlador | 26 | 0 | 22,1 s |
| Verificação final com compatibilidade acrescentada | 28 | 0 | 18,5 s |

Na verificação final, foram executados 14 cenários em cada projeto Chromium: desktop 1280 × 800 e celular 360 × 800. O relatório JSON registrou 28 resultados esperados, nenhuma falha, nenhum teste ignorado e nenhum instável. A execução encerrou com código 0. Os relatórios ficam em `test-results/results.json` e `playwright-report/index.html`.

O servidor de testes recebeu apenas entradas explícitas para os três novos arquivos JS. O CSS não foi alterado; o HTML recebeu somente as tags de carregamento dos arquivos extraídos. Na extração da interface, uma inconsistência de sintaxe introduzida durante a edição foi detectada e corrigida antes da execução da suíte da etapa; não foi tratada como defeito preexistente nem ocultada por alteração de testes.

## Limites e pendências

Os defeitos e limitações conhecidos estão registrados separadamente em `BUGS_CONHECIDOS.md`, com os locais atuais. Não foram corrigidos durante esta entrega. `AUDITORIA.md` foi preservado como relatório histórico da versão auditada.

A suíte confirma os fluxos cobertos e o cenário sintético de compatibilidade. Não comprova ausência de regressões fora desses casos. Falhas de quota/permissão, concorrência simultânea, recuperação de JSON inválido, foco por teclado, virada de dia e comportamento em aparelhos físicos não foram testados nesta refatoração. Não houve medição de cobertura de linhas.
