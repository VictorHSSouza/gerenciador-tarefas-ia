# Alternativas para as próximas correções — aguardando aprovação

Estas propostas não estão implementadas. A pausa segue a instrução do usuário: “Antes de implementar mudanças mais complexas, como resolução de conflitos entre abas, apresente as alternativas e aguarde minha aprovação.” As correções simples já executadas estão em `CORRECOES_SEGURANCA.md`.

## 1. Conflitos entre abas

**Alternativa A — recomendada:** executar cada operação sob um Web Lock da aplicação, reler a coleção dentro do lock e comparar a versão original da tarefa que foi aberta para edição/exclusão. Alterações em tarefas diferentes podem ser preservadas; se a mesma tarefa mudou, impedir a gravação e mostrar a versão atual e o rascunho para decisão explícita. Manter chave e esquema atuais, usando a comparação da tarefa em memória, sem migrar registros.

Essa alternativa exige tornar o fluxo de gravação assíncrono e desabilitar envios repetidos enquanto há uma operação pendente. Em navegadores/contextos sem Web Locks, a proposta é manter consulta/exportação e bloquear gravações com explicação, evitando prometer atomicidade inexistente. Essa restrição precisa de aprovação. A coordenação vale para abas cooperantes desta aplicação; não impede alterações feitas pelas ferramentas do navegador ou outros scripts da mesma origem.

**Alternativa B — menor alteração:** manter a gravação síncrona e impedir o reenvio de formulário antigo após uma divergência, exigindo reabrir a tarefa. Corrige o conflito de edição obsoleta, mas permanece uma janela entre comparação e escrita simultâneas. Não deve ser descrita como solução completa de concorrência.

Testes previstos: duas abas no mesmo contexto, atualizações de tarefas distintas, conflito sobre a mesma tarefa, exclusão concorrente, preservação do rascunho e ausência de duplicação por duplo envio. O LocalStorage continua real.

## 2. Recuperação de conteúdo inválido

**Alternativa A — recomendada:** permitir baixar o conteúdo bruto original, mostrar os problemas e oferecer importação de uma coleção corrigida e validada. Para JSON parseável, mostrar registros válidos somente como prévia, sem salvá-los sobre o conjunto original. Uma substituição exige confirmação explícita com indicação de diferenças e orientação para guardar a cópia original. Não descartar ou converter itens silenciosamente.

**Alternativa B — escopo menor:** oferecer somente exportação do conteúdo bruto e diagnóstico, mantendo o bloqueio de escrita até o conteúdo ser corrigido externamente. Evita acrescentar um fluxo de substituição, mas continua exigindo conhecimento técnico para recuperar tarefas.

Testes previstos: JSON inválido, conjunto misto, cancelamento, exportação exata e rejeição de importação inválida. Nenhum caminho deve apagar o original automaticamente.

## 3. Quantidade e tamanho de dados

**Alternativa A — recomendada:** paginação dos cartões e limites preventivos de crescimento. Proposta inicial de política: 1.000 tarefas e 1 MiB de JSON serializado em UTF-8. São limites conservadores propostos, não resultados de um benchmark nem equivalentes à quota do navegador. Permitir operações que reduzam um conjunto legado acima do limite; bloquear somente seu crescimento. Manter o conteúdo original, oferecer exportação e explicar o motivo do bloqueio. Definir uma abertura explícita para conjuntos muito grandes antes de tentar processá-los integralmente.

**Alternativa B — escopo menor:** paginar os cartões e mostrar aviso de volume, sem limites preventivos. Reduz custo do DOM, mas continua permitindo leitura/processamento de JSON volumoso e não resolve integralmente o risco de disponibilidade.

Testes previstos: limiares, coleção antiga acima deles, edição que reduz volume, paginação com filtros e pesquisa e preservação dos registros não exibidos.

## Fora destas mudanças

Foco por teclado e atualização automática dos atrasos continuam pendentes de uma etapa funcional própria. Não há proposta de autenticação fictícia, controle de API, servidor, RLS ou pagamentos. O aplicativo permanece local.
