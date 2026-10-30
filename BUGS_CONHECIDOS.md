# Pendências preservadas durante a refatoração

Registro de 30/10/2026. As pendências abaixo já foram apontadas nas análises anteriores. Foram mantidas para separar mudança de estrutura e correção de comportamento. A refatoração não afirma resolvê-las. O relatório `AUDITORIA.md` permanece como registro da versão original, com suas referências de linha históricas.

| Pendência | Risco contextual | Local atual | Evidência e encaminhamento futuro |
| --- | --- | --- | --- |
| Sobrescrita concorrente entre abas | Médio, integridade local | `js/task-storage.js`: `writeTasks`; `script.js`: `persistTasks`, `saveTask` | Comparação e gravação continuam separadas. Após um conflito, um formulário antigo pode ser reenviado contra o snapshot atualizado. Avaliar coordenação entre abas e resolução explícita por tarefa. Não reproduzido nesta refatoração. |
| Tipos permissivos para status/prioridade no JSON | Baixo | `js/task-rules.js`: `validateTask` | `Object.hasOwn` ainda permite coerção de chaves. Arrays como `["pending"]` podem ser aceitos e divergir das comparações estritas dos filtros. Adicionar tipos estritos em uma correção separada. Não executado na suíte atual. |
| Um item inválido bloqueia a coleção | Médio, disponibilidade local | `js/task-storage.js`: `readTasks`; `script.js`: `loadTasks` | Validação integral e bloqueio de escrita preservados. Continua sem recuperação guiada, exportação ou backup. Avaliar recuperação com cópia do original; não descartar dados automaticamente. Não simulado nesta refatoração. |
| Reconstrução da lista remove elementos focados | Baixo | `js/task-view.js`: `render`, `createTaskCard` | `replaceChildren` continua reconstruindo todos os cartões. Não há restauração explícita de foco. Verificar teclado e retorno dos diálogos antes de uma correção futura; não coberto pelos testes atuais. |
| Atrasos não atualizados automaticamente à meia-noite | Baixo | `js/task-rules.js`: `isOverdue`; `script.js`: eventos de foco/visibilidade | O dia continua sendo consultado durante os cálculos de renderização, sem agendamento à meia-noite. Avaliar atualização temporal separadamente. Não testado com relógio controlado nesta refatoração. |
| Erro de renderização pode ser informado como falha de escrita | Baixo | `script.js`: `persistTasks` | O `try/catch` ainda engloba a escrita e a renderização posterior. A mensagem pode dizer que a alteração não foi aplicada após escrita bem-sucedida. Manter esse escopo foi intencional; separá-lo seria mudança de comportamento. Não foi provocada exceção de renderização. |
| Ausência de limite do conjunto de tarefas | Médio, disponibilidade local | `js/task-storage.js`: `readTasks`; `js/task-view.js`: `render` | Não foram introduzidos limites de quantidade/tamanho total nem paginação. Volume excessivo pode degradar a interface; não foi realizado teste de carga. |

Não foram adicionados autenticação, criptografia ou controles de servidor. O acesso aos dados por quem usa o mesmo perfil/origem é uma limitação do aplicativo local, e não um mecanismo de autorização corrigível por esconder controles da interface. Não usar para informações sensíveis.

A ausência anterior de testes automatizados já havia sido tratada no Prompt 3. Existem testes de integração, mas eles não cobrem todas as pendências acima; não há medição de cobertura de linhas ou certificação de ausência de bugs.
