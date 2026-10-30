# Correções de segurança aprovadas — 30/10/2026

Este registro complementa a auditoria histórica e a refatoração. Nenhum dado real do usuário é utilizado nos testes. A chave `gerenciador-tarefas:v1`, o formato e os IDs de registros válidos são preservados. Não há limpeza, conversão ou exclusão automática de registros inválidos.

## 1. Validação estrita de tipos — concluída

Problema: `Object.hasOwn` converte chaves, permitindo arrays como `["pending"]` em campos que deveriam ser strings. O adaptador também não validava a coleção antes da escrita.

Alterações: `js/task-rules.js` exige strings em prioridade/status e valida os textos do formulário sem chamar `trim` sobre tipos inválidos. A função `validateTaskCollection` reúne esquema e unicidade dos IDs. `js/task-storage.js` usa essa validação tanto na leitura quanto antes da escrita. Os mesmos limites por campo e os valores permitidos continuam válidos.

Preservação: conteúdo inválido continua bloqueando alterações e permanece byte a byte no LocalStorage, sem correção silenciosa. O teste de compatibilidade de registros válidos do formato anterior permanece ativo.

Verificações reais:

| Momento | Comando | Resultado |
| --- | --- | --- |
| Antes da correção, com testes novos | `npx playwright test tests/seguranca.spec.js` | 6 falhas: prioridade/status com arrays foram aceitos e a escrita inválida não foi rejeitada. |
| Depois da correção | `npx playwright test` | 34 aprovados, 0 falhas, em 37,2 s; saída 0. |

Os testes de leitura usam arrays, null, número, booleano e objeto em prioridade/status, misturados a um registro válido. Verificam aviso, bloqueio de cadastro e preservação exata do JSON original. O teste do adaptador confirma que uma tentativa de escrita inválida não modifica o registro válido. São operações no Storage real em contextos descartáveis, sem mock da API.

## 2. Separação de erros de persistência e renderização — concluída

Problema: o mesmo `try/catch` envolvia escrita e renderização. Se a gravação terminasse e a interface falhasse, o aplicativo dizia que nada tinha sido salvo, mantinha formulários abertos e podia incentivar um cadastro duplicado. A alteração de status também podia aparentar reversão apesar da gravação.

Alterações em `script.js`: o `try/catch` da escrita agora envolve somente o adaptador. A leitura também fica separada da apresentação de mensagens. `render` trata suas próprias exceções e mostra o alerta persistente `interface-warning`, separado do aviso de armazenamento. A gravação concluída retorna sucesso independentemente da renderização; não há segunda tentativa automática, rollback ou nova escrita para corrigir um erro visual.

Preservação: falhas visuais não modificam o armazenamento; falhas reais de escrita mantêm os registros anteriores e os campos preenchidos. O aviso visual desaparece após uma renderização bem-sucedida ou recarga. Os caminhos de cadastro, edição, exclusão e status continuam informando o resultado real da persistência.

Verificações reais:

| Momento | Comando | Resultado |
| --- | --- | --- |
| Antes da correção, com testes novos | `npx playwright test tests/erros-interface.spec.js` | 8 falhas de tratamento visual; 2 testes de quota real aprovados. Duração: 34,2 s; saída 1. |
| Depois da correção | `npx playwright test` | 44 aprovados, 0 falhas, em 43,1 s; saída 0. |

As falhas de interface são injetadas no setter de um elemento do DOM, sem alterar o Storage. Os testes conferem os quatro tipos de mutação, o aviso distinto, o encerramento dos diálogos, ausência de exceções não tratadas, os dados gravados e a recuperação após recarregar.

O teste de quota preenche efetivamente o LocalStorage do contexto descartável até `QuotaExceededError`, sem interceptar ou substituir a API. Confere preservação dos dados anteriores, erro de escrita e manutenção do formulário. Isso não comprova todos os tipos de falha de permissão de todos os navegadores.

## 3. Orientação sobre informações sensíveis — concluída

Problema: a limitação de privacidade era explicada no README, mas não no formulário onde o usuário informa o conteúdo.

Alteração: `index.html` mostra “Os dados ficam neste navegador. Não registre senhas, tokens ou informações sensíveis.” tanto no cadastro quanto na edição. Título e descrição referenciam a orientação por `aria-describedby`. O aviso não examina o texto, não bloqueia palavras e não promete criptografia ou autenticação.

Preservação: nenhuma tarefa existente é alterada. O novo teste confere a orientação, as associações acessíveis e que abrir/cancelar a edição mantém o conteúdo salvo exatamente igual.

Verificação: `npx playwright test` terminou com **46 aprovados, 0 falhas, 0 ignorados e 0 instáveis**, em **39,0 s**, saída **0**. São 23 cenários executados em dois projetos Chromium (desktop e celular).

## Estado final desta etapa

| Item | Estado |
| --- | --- |
| Tipos estritos e validação antes da escrita | Corrigido e testado |
| Separação de erros de persistência/renderização | Corrigido e testado |
| Orientação sobre dados sensíveis | Implementada e testada |
| Concorrência entre abas | Pendente de escolha e aprovação |
| Recuperação/exportação/importação de conteúdo inválido | Pendente de escolha e aprovação |
| Limites preventivos e apresentação de conjuntos grandes | Pendente de escolha e aprovação |
| Foco por teclado e atualização à meia-noite | Pendências funcionais ainda não implementadas |

As alternativas e seus impactos estão em [PROXIMAS_CORRECOES.md](PROXIMAS_CORRECOES.md). Não houve migração de dados nem exclusão automática; nenhum teste existente foi removido ou teve expectativas enfraquecidas. Os relatórios automáticos da última execução ficam em `test-results/results.json` e `playwright-report/index.html`; cada nova execução sobrescreve esses artefatos. As execuções anteriores, incluindo as falhas que reproduziram os defeitos, estão registradas nas tabelas acima.

`AUDITORIA.md` recebeu uma atualização de estado, preservando o relatório histórico abaixo dela; `BUGS_CONHECIDOS.md` distingue corrigidos e pendentes. `REFATORACAO.md` continua sendo o registro da refatoração anterior às correções.

Limites: os testes usam dados sintéticos e contextos não persistentes, sem back-end artificial. A exceção visual é controlada pelo teste e não prova que uma falha visual espontânea foi observada em produção. A quota foi efetivamente esgotada no navegador de teste. Não houve ensaio de invasão, medição de cobertura de linhas, teste de aparelho físico ou teste de todos os cenários de falhas de permissão.
