# Gerenciador de Tarefas

Sistema web para uma atividade acadêmica de Desenvolvimento de Software com IA. Implementado com HTML5, CSS3 e JavaScript puro, sem frameworks, bibliotecas externas, recursos de terceiros ou banco de dados remoto.

## Executar localmente

1. Mantenha `index.html`, `style.css` e `script.js` na mesma pasta.
2. Abra `index.html` em um navegador moderno (Chrome, Edge, Firefox ou Safari atualizado). Não é necessária instalação ou compilação.
3. Para uma origem local estável, recomenda-se servir a pasta por HTTP. Se tiver Python instalado, abra um terminal nesta pasta e execute:

   ```sh
   python -m http.server 8000 --bind 127.0.0.1
   ```

4. Acesse `http://127.0.0.1:8000`. Encerre o servidor com `Ctrl+C`.

O servidor é apenas uma opção para entregar os arquivos estáticos. Os dados continuam no LocalStorage do navegador. Ao abrir por `file://`, a disponibilidade e a separação do LocalStorage dependem do navegador; use HTTP se houver bloqueio. Usar outro endereço, porta, perfil ou navegador cria um armazenamento separado. O aplicativo utiliza elementos nativos `dialog` e APIs modernas do DOM.

## Funcionalidades

- Cadastro com título, descrição opcional, prioridade, prazo e status.
- Listagem, consulta de detalhes, edição e exclusão com confirmação.
- Alternância entre pendente e concluída pela caixa de seleção.
- Busca pelo título, sem distinção entre maiúsculas e minúsculas; filtros combináveis por status e prioridade.
- Resumo de todas as tarefas, pendentes, concluídas e atrasadas, independentemente dos filtros.
- Validação de campos, mensagens de resultado, estados vazios e layout responsivo.
- Persistência local e tratamento de erros de leitura e escrita.

O título é obrigatório (até 120 caracteres); a descrição aceita até 2.000 caracteres. Prioridade, status e prazo são obrigatórios. Datas devem existir no calendário e ter ano entre 0001 e 9999. Datas passadas são permitidas: tarefas pendentes com prazo anterior ao dia local atual aparecem em atraso. Tarefas concluídas não contam como atrasadas. Novas tarefas aparecem no início da lista.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura semântica, filtros, resumos e diálogos |
| `style.css` | Layout, cores, estados e adaptação para celulares |
| `script.js` | CRUD, validação, manipulação segura do DOM e persistência |
| `README.md` | Instruções e roteiro de testes manuais |
| `.gitignore` | Exclusões de arquivos locais no Git |

## Persistência e segurança

A chave `gerenciador-tarefas:v1` contém um array JSON com `id`, `title`, `description`, `priority`, `deadline` e `status`. Identificadores usam `crypto.randomUUID()` quando disponível, com alternativa local. Não são armazenados senhas, tokens ou dados sensíveis. Não há login, sincronização remota ou envio de informações.

Os textos informados pelo usuário são inseridos com `textContent`, `createElement` e `replaceChildren`, sem `innerHTML` ou execução de conteúdo. Os dados lidos do LocalStorage também são validados. O LocalStorage não é criptografado; qualquer script da mesma origem pode acessá-lo. Não registre informações sensíveis nas tarefas.

A interface só confirma uma alteração depois que a escrita termina. Se não houver espaço ou permissão, a operação falha com aviso e o formulário é preservado. Se a leitura falhar ou o formato salvo for inválido, as alterações são bloqueadas e o conteúdo original não é sobrescrito automaticamente. Verifique as permissões e recarregue a página; para conteúdo inválido, preserve uma cópia antes de corrigi-lo nas ferramentas do navegador. Remover a chave reinicia as tarefas e apaga os registros locais.

Mudanças em outras abas atualizam a lista quando não há diálogo aberto. Se há um diálogo aberto, o aplicativo avisa e compara o conteúdo salvo antes de gravar; uma divergência exige revisar e tentar novamente. Essa proteção é de melhor esforço: LocalStorage não oferece transações entre abas para leitura seguida de escrita simultâneas. Limpar dados de navegação apaga as tarefas; a navegação privada pode descartá-las ao encerrar a sessão. Não existe backup automático.

## Roteiro de testes manuais

Este roteiro descreve verificações a executar; não é um relatório de resultados. Use dados descartáveis em um perfil ou origem de teste.

### Criar (Create)

1. Clique em **Nova tarefa** ou **Criar primeira tarefa**.
2. Informe um título como `Entregar atividade`, descrição, prioridade alta, prazo e status pendente.
3. Salve. Verifique a mensagem de sucesso, a nova tarefa e os contadores.
4. Repita com prioridades baixa e média e status concluído. Confirme os rótulos.
5. Cancele outro cadastro e confirme que nada foi adicionado.

### Consultar (Read)

1. Confira as tarefas na lista. Clique no título ou em **Detalhes**.
2. Confira o título completo, descrição, prioridade, status e prazo; feche pelo botão ou por `Esc`.
3. Pesquise uma parte do título, inclusive usando outra combinação de maiúsculas e minúsculas.
4. Combine filtros de status e prioridade. Confira que os resultados obedecem a todos os critérios.
5. Pesquise um título inexistente; confirme o estado sem resultados. Use **Limpar filtros**.

### Editar (Update)

1. Clique em **Editar**, na lista ou nos detalhes.
2. Altere título, descrição, prioridade, prazo e status; salve.
3. Confira os novos valores na lista e nos detalhes, sem criar uma tarefa duplicada.
4. Abra novamente, altere um campo e clique em **Cancelar**; o registro deve continuar com os valores anteriores.
5. Marque a caixa ao lado da tarefa. Confira o status concluído e os contadores; desmarque para voltar a pendente. Com filtro ativo, a tarefa pode sair da lista ao mudar de status.

### Excluir (Delete)

1. Clique em **Excluir**; confira o título na confirmação.
2. Clique em **Cancelar** ou pressione `Esc`; a tarefa deve permanecer.
3. Repita e confirme em **Excluir tarefa**; verifique a mensagem, a remoção e os contadores.
4. Atualize a página e confirme que a tarefa continua excluída.

### Validação, persistência e interface

1. Tente salvar sem título, com título só de espaços ou sem prazo. Confira a mensagem e o foco no campo correspondente.
2. Tente informar uma data inexistente, como 31/02. O navegador pode impedir a entrada; o aplicativo deve rejeitar um campo inválido. Verifique também uma data válida de ano bissexto, como 29/02/2028.
3. Cadastre uma tarefa pendente com prazo de ontem: deve aparecer em atraso. Use o prazo de hoje: não deve aparecer em atraso. Conclua a tarefa atrasada: deve sair desse contador.
4. Cadastre tarefas, atualize a página e feche/reabra no mesmo navegador e origem. Confira a permanência de dados e edições.
5. Digite `<img src=x onerror=alert(1)>` no título e na descrição. Confira a exibição como texto literal na lista e nos detalhes, inclusive após recarregar.
6. Em uma origem de teste, guarde uma cópia do valor da chave pelo painel Application/Storage do navegador. Substitua-a por JSON inválido e recarregue. Confira o aviso e que o aplicativo não sobrescreve o valor. Restaure a cópia e recarregue.
7. Se o navegador permitir bloquear o armazenamento, bloqueie-o e tente salvar. Confira a mensagem de erro e a ausência de confirmação de sucesso. O comportamento exato do bloqueio depende do navegador; não é necessário lotar seu armazenamento para testar.
8. Abra duas abas na mesma origem. Altere uma tarefa em uma delas e confira a atualização na outra. Repita com um formulário aberto na segunda aba: confira o aviso de conflito, revise os dados e tente novamente.
9. Verifique em uma janela estreita (por exemplo, 360 px), tablet e desktop: sem rolagem horizontal, controles legíveis e diálogos utilizáveis. Use títulos longos e descrições com quebras de linha.
10. Navegue com `Tab`/`Shift+Tab`, use `Enter` para botões, espaço para a caixa de status e `Esc` para fechar diálogos. Confira o foco visível e as mensagens.

## Escopo desta entrega

Esta é a implementação inicial. Os quatro prompts de auditoria não foram executados, e este documento não declara resultados de testes manuais ou de auditorias. O arquivo vazio `AUDITORIA.md` já existente no diretório não foi alterado.
