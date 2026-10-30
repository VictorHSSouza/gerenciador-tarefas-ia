# Auditoria — Gerenciador de Tarefas

Data: 30/10/2026. Escopo: aplicação local em HTML, CSS e JavaScript puro, com LocalStorage.

## Atualização posterior à auditoria

O texto a partir de “Método e limites” é o relatório histórico da versão inicialmente auditada. Depois dele foram implementados os testes do Prompt 3 e a refatoração aprovada. Na etapa de correções de segurança, foram corrigidas a validação permissiva de tipos e a classificação incorreta de falhas de renderização como falhas de escrita. O formulário recebeu orientação sobre dados sensíveis. Os resultados reais por etapa estão em [CORRECOES_SEGURANCA.md](CORRECOES_SEGURANCA.md).

O achado A03 deixou de representar ausência de suíte, mas a cobertura continua parcial. A01 (concorrência), A02 (recuperação), A04 (foco) e A05 (virada de dia) permanecem pendentes. Os arquivos e linhas abaixo referem-se à versão original; consulte [BUGS_CONHECIDOS.md](BUGS_CONHECIDOS.md) para os locais e estados atuais. As alternativas complexas estão em [PROXIMAS_CORRECOES.md](PROXIMAS_CORRECOES.md), aguardando aprovação.

## Método e limites

Foi realizada leitura estática de `index.html`, `style.css`, `script.js`, `README.md` e `.gitignore`, com referências às linhas da versão inspecionada. Foi feita uma listagem dos arquivos, inclusive ocultos, e da pasta `tests/`, que estava vazia. Também foram pesquisados pontos de acesso ao armazenamento, manipulação do DOM e eventos. Somente este relatório foi escrito; nenhuma correção foi aplicada à aplicação.

Não foram executados testes funcionais no navegador, simulações de falhas, testes entre abas, testes de acessibilidade ou medições de cobertura nesta etapa. Cenários abaixo são deduções do código e propostas de reprodução, não resultados observados em execução. O sucesso da checagem de sintaxe informado na etapa anterior não comprova funcionalidades nem cobertura e não foi reexecutado nesta auditoria.

Risco contextual: **médio** para possível perda de alterações, indisponibilidade ou falta de evidência de regressão; **baixo** para problemas localizados de uso e atualização visual. Não foi confirmada vulnerabilidade crítica ou alta nesta revisão estática; isso não certifica ausência de vulnerabilidades.

## Cinco principais achados

| ID | Achado e risco | Arquivo | Linha(s) | Evidência estática e impacto | Correção sugerida |
| --- | --- | --- | --- | --- | --- |
| A01 | Concorrência entre abas pode sobrescrever alterações — **Médio** | `script.js` | 86–105; 244–253; 284–291 | `getItem` compara o snapshot e `setItem` grava o array inteiro em etapas separadas. Não há exclusão mútua entre abas. Também, ao detectar conflito, `loadTasks()` atualiza o snapshot, mas mantém os valores antigos do formulário; um segundo envio pode sobrescrever a versão concorrente sem mostrar as diferenças. A comparação existente reduz conflitos, mas não os elimina. | Serializar leitura, validação da versão e escrita entre abas, por exemplo com Web Locks onde suportado e política explícita para ambientes sem suporte. Guardar a versão original da tarefa ao abrir o formulário e bloquear nova gravação conflitante até o usuário recarregar ou resolver as diferenças. Manter o rascunho separado. |
| A02 | Um registro inválido bloqueia toda a coleção, sem recuperação pela interface — **Médio** | `script.js`; `README.md` | JS 64–82, 86–90; README 47–49 | `parsed.every(validateTask)` e a unicidade dos IDs validam o conjunto inteiro. Qualquer falha define `storageReady = false`, impedindo todas as alterações. Preservar o valor original é correto, mas a recuperação depende de ferramentas do navegador; não existem exportação, backup ou recuperação guiada na interface. Se a falha ocorrer depois de uma leitura bem-sucedida, a lista anterior pode continuar visível, acompanhada do aviso. | Oferecer exportação do conteúdo original e recuperação explícita, preservando uma cópia antes de qualquer mudança. Separar registros válidos e inválidos em uma visualização de recuperação, sem descarte silencioso. Distinguir falha de permissão, JSON inválido e esquema inválido nas mensagens. |
| A03 | Não há suíte automatizada nem evidência de cobertura funcional — **Médio** | `tests/`; `README.md` | tests: não aplicável (pasta vazia); README 51–97 | Não foram encontrados arquivos de teste ou configuração de execução no diretório inspecionado. O README fornece um roteiro e declara que não é relatório de resultados. Não há evidência de regressão para CRUD, status, pesquisa, falhas de armazenamento e concorrência. A porcentagem de cobertura é **não verificada**, e não deve ser declarada como 0% ou 100%. | Criar testes de calendário, esquema e filtros; testes de persistência com falhas de leitura/escrita; e testes de integração do CRUD, confirmação de exclusão, conteúdo HTML literal e conflito entre abas. Registrar comandos, ambiente e resultados reais. Separar funções de domínio e adaptador de armazenamento para facilitar testes sem bibliotecas na aplicação. |
| A04 | Reconstrução da lista remove o controle que tinha foco — **Baixo** | `script.js` | 138–142; 98–101; 175; 293–302 | A mudança da caixa de status persiste e chama `render()`, que substitui todos os cartões por novos elementos com `replaceChildren`. O checkbox ativo é removido, sem restauração explícita de foco. Leituras ao fechar diálogos ou retornar à janela também reconstroem a lista. Isso pode interromper a navegação por teclado e o retorno do foco ao botão que abriu um diálogo. | Atualizar os cartões existentes por ID ou guardar e restaurar o foco por tarefa e ação. Se a tarefa sair pelo filtro ou for excluída, direcionar o foco para a próxima tarefa ou para o título da lista e anunciar a mudança. |
| A05 | Indicadores de atraso podem ficar desatualizados na virada do dia — **Baixo** | `script.js` | 18–20; 36–37; 117–121; 164–175; 275–304 | A data atual é calculada quando ocorre uma renderização. Não existe agendamento para a mudança do dia; o único temporizador é o de ocultação da notificação (linha 55). Uma aba continuamente ativa, sem interação, pode continuar mostrando como não atrasada uma tarefa cujo prazo venceu à meia-noite. | Agendar uma atualização para o próximo início de dia local e reagendar após executá-la. Manter as atualizações por foco e visibilidade e considerar diálogos abertos. Testar com relógio controlado e mudanças de data/fuso. |

### Como confirmar os achados — não executado

- **A01:** abrir a mesma tarefa para edição em duas abas. Salvar uma versão na primeira; enviar o formulário antigo na segunda e observar o bloqueio inicial. Sem atualizar os campos, reenviar e verificar se a versão anterior substitui a alteração concorrente. Para a janela entre comparação e escrita, usar instrumentação de teste que controle a ordem das operações; dois cliques manuais não garantem reproduzi-la.
- **A02:** em uma origem descartável, preservar o valor da chave, inserir um item de esquema inválido junto a itens válidos e recarregar. Conferir o bloqueio, a preservação do valor salvo e a ausência de recuperação na interface. Restaurar a cópia ao terminar.
- **A03:** estabelecer uma suíte e só então executar e medir sua cobertura. O roteiro manual existente ainda precisa de registro de execução.
- **A04:** focar um checkbox com o teclado, alterná-lo com espaço e verificar `document.activeElement` e a sequência seguinte de `Tab`. Repetir ao fechar detalhes ou edição e quando um filtro faz a tarefa desaparecer.
- **A05:** em um ambiente com relógio controlado, manter a aba ativa e sem interação durante a virada do dia. Conferir o contador e o rótulo de atraso antes de provocar nova renderização. Não é necessário alterar o relógio da máquina de uso pessoal.

## Análise dos controles solicitados

| Área | Evidência no código | Conclusão e limite da verificação |
| --- | --- | --- |
| Cadastro e edição | `script.js:183–197`, `227–254` | Existem formulários preenchidos para edição, geração de ID para cadastro e atualização por ID. Mensagens de sucesso dependem do retorno da persistência. **Execução funcional não verificada.** |
| Listagem e consulta | `script.js:132–181`, `199–208` | Existem cartões e diálogo com título, descrição e metadados. **Execução funcional não verificada.** |
| Exclusão | `index.html:44`; `script.js:210–217`, `256–265` | Há diálogo de confirmação, opção de cancelar e remoção por ID. **Cancelamento e exclusão não verificados em navegador.** |
| Pesquisa e filtros | `script.js:169–174`, `275–282` | Pesquisa parcial pelo título com normalização de caixa em pt-BR. Filtros de status e prioridade são combinados por AND. Não há normalização de acentos, o que não viola o requisito informado. **Comportamento em execução não verificado.** |
| Status e prazos | `script.js:23–37`, `138–142`, `165–168` | Alternância pendente/concluída e contadores estão implementados. Só pendentes anteriores ao dia local contam como atrasadas. Datas passadas são permitidas por regra documentada. Ver A04 e A05. |
| Leitura do LocalStorage | `script.js:64–82` | Há `try/catch`, validação de JSON, formato, registros e IDs duplicados. Campos desconhecidos não entram no estado. Ver A02. **Falhas reais de permissão e corrupção não simuladas.** |
| Escrita do LocalStorage | `script.js:86–105` | A escrita precede a atualização do estado e a confirmação. Há tratamento de exceções. O `catch` também abrange a renderização posterior; uma exceção nessa renderização poderia emitir mensagem de falha apesar de a escrita já ter ocorrido. Essa possibilidade não foi reproduzida. **Quota e indisponibilidade não verificadas.** |
| Validações | `script.js:23–46`, `234–242`; `index.html:36–39` | Há trim e limites de texto, valores permitidos de status/prioridade e validação de calendário com ano bissexto. `novalidate` deixa o envio sob controle das validações JavaScript; sua presença não significa ausência de validação. **Casos de borda não executados.** |
| XSS | `script.js:109–114`, `145–150`, `203–215` | Nos caminhos inspecionados, textos entram por `textContent` e valores do formulário por `.value`. Não foram encontrados `innerHTML`, `outerHTML`, `insertAdjacentHTML` ou `eval` no JavaScript. Não foi identificado caminho de execução de HTML fornecido nas tarefas. **Payloads não foram executados; não há certificação de ausência de XSS.** |
| Autenticação e back-end | `script.js:4`, `64–105`; `README.md:3`, `43–49` | O projeto é local, sem identidade de usuário ou autorização entre contas. Não há chamadas de rede no JavaScript inspecionado. Isso é compatível com o escopo acadêmico; não é falha de autenticação de um serviço remoto. Quem usa o mesmo perfil/origem tem acesso às tarefas. Não há garantia de integridade contra alterações locais nem adequação para dados sensíveis ou uso multiusuário. |
| Múltiplas abas | `script.js:92–95`, `284–302` | Existem snapshot, evento `storage` e recarga por foco/visibilidade. Diálogos abertos suspendem a atualização automática. Proteção parcial, conforme A01. **Concorrência real não testada.** |
| Organização | `script.js:3–305`; `style.css:4–6`; `index.html:13–44` | Há IIFE, modo estrito, nomes claros, funções por responsabilidade e arquivos separados por tecnologia. Estado, persistência, regras e DOM permanecem acoplados na mesma IIFE; CSS e boa parte do HTML estão condensados em linhas longas, dificultando revisão e manutenção. Recomenda-se formatação legível e separação lógica em futura etapa, preservando JavaScript puro. |
| Testes e experiência responsiva | `tests/`; `README.md:51–97`; `style.css:5–6` | Há roteiro manual e regras de mídia no CSS. Não há testes automatizados no diretório inspecionado. **Cobertura, navegadores, contraste, leitor de tela, foco efetivo e layout em dispositivos não verificados.** |

## Controles não aplicáveis ao escopo atual

| Controle | Classificação | Motivo |
| --- | --- | --- |
| Autenticação/autorização de API, JWT, OAuth, rate limiting e contratos de endpoints | **Não aplicável** | Não existe API da aplicação. A ausência de autenticação local e suas limitações estão explicitadas acima. |
| Pagamentos, PCI, antifraude e webhooks de cobrança | **Não aplicável** | Não há fluxo de pagamento ou integração financeira. |
| RLS, políticas por linha e isolamento de usuários em banco remoto | **Não aplicável** | Não existe banco remoto, SQL ou serviço de dados com políticas RLS. |
| Controles exclusivos de servidor: sessões de back-end, segredos de servidor, injeção SQL no servidor, permissões de infraestrutura e configuração de servidor de produção | **Não aplicável** | Não há back-end ou infraestrutura de produção fornecida para auditoria. O servidor estático opcional descrito no README serve apenas os arquivos localmente. |

Uma eventual hospedagem futura exigirá avaliação própria da configuração de entrega, incluindo HTTPS e cabeçalhos. Essa infraestrutura não foi fornecida e está **não verificada**; não se presume configurada nem vulnerável.

## Prioridades propostas

Tratar A01 antes de depender de edições em múltiplas abas. Em seguida, estabelecer evidência de testes (A03) e recuperação segura dos dados (A02). Corrigir a preservação do foco (A04) e a atualização temporal (A05) na evolução da interface. Nenhuma dessas correções foi executada nesta etapa.
