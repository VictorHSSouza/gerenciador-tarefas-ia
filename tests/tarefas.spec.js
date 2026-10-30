const { test: base, expect } = require('@playwright/test');

const STORAGE_KEY = 'gerenciador-tarefas:v1';
// O fixture page padrão fornece contexto não persistente novo a cada teste.
// Não há storageState compartilhado, mock do Storage ou tarefas pré-injetadas.
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'Erros JavaScript não tratados').toEqual([]);
  },
});

function card(page, title) {
  return page.locator('.task-card').filter({
    has: page.getByRole('button', { name: `Consultar detalhes: ${title}`, exact: true }),
  });
}

async function storedTasks(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), STORAGE_KEY);
}

async function fillForm(page, values = {}) {
  const task = {
    title: 'Entregar atividade de integração',
    description: 'Dados fictícios exclusivos deste teste.',
    priority: 'high', deadline: '2030-06-15', status: 'pending', ...values,
  };
  await page.getByLabel('Título *', { exact: true }).fill(task.title);
  await page.getByLabel('Descrição', { exact: true }).fill(task.description);
  await page.getByLabel('Prioridade *', { exact: true }).selectOption(task.priority);
  await page.getByLabel('Prazo *', { exact: true }).fill(task.deadline);
  await page.getByLabel('Status *', { exact: true }).selectOption(task.status);
  return task;
}

async function createTask(page, values = {}) {
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  const task = await fillForm(page, values);
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(page.locator('#task-dialog')).not.toBeVisible();
  await expect(card(page, task.title)).toBeVisible();
  return task;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#total-count')).toHaveText('0');
  expect(await storedTasks(page)).toEqual([]);
});

test('cadastra tarefa válida e consulta todos os detalhes', async ({ page }) => {
  const task = await createTask(page);
  await expect(page.locator('#notification')).toHaveText('Tarefa criada com sucesso.');
  await expect(page.locator('#total-count')).toHaveText('1');
  await card(page, task.title).getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.locator('#details-title')).toHaveText(task.title);
  await expect(page.locator('#details-description')).toHaveText(task.description);
  await expect(page.locator('#details-meta')).toContainText('Prioridade alta');
  await expect(page.locator('#details-meta')).toContainText('Pendente');
  await expect(page.locator('#details-meta')).toContainText('15/06/2030');
  const saved = await storedTasks(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject(task);
});

for (const [label, title] of [['vazio', ''], ['somente espaços', '   ']]) {
  test(`impede cadastro com título ${label}`, async ({ page }) => {
    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    await fillForm(page, { title });
    await page.getByRole('button', { name: 'Salvar tarefa' }).click();
    await expect(page.locator('#form-error')).toContainText('Informe um título');
    await expect(page.locator('#task-title')).toBeFocused();
    await expect(page.locator('.task-card')).toHaveCount(0);
    expect(await storedTasks(page)).toEqual([]);
  });
}

test('impede cadastro sem prazo', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await fillForm(page, { deadline: '' });
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(page.locator('#form-error')).toContainText('Informe um prazo válido');
  await expect(page.locator('#task-deadline')).toBeFocused();
  expect(await storedTasks(page)).toEqual([]);
});

test('edita todos os campos sem duplicar a tarefa', async ({ page }) => {
  const original = await createTask(page);
  const originalId = (await storedTasks(page))[0].id;
  await card(page, original.title).getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.locator('#task-title')).toHaveValue(original.title);
  const edited = await fillForm(page, {
    title: 'Atividade revisada', description: 'Descrição revisada.', priority: 'low',
    deadline: '2031-07-20', status: 'completed',
  });
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(page.locator('#notification')).toHaveText('Tarefa atualizada com sucesso.');
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(card(page, original.title)).toHaveCount(0);
  await expect(card(page, edited.title)).toContainText('Concluída');
  expect(await storedTasks(page)).toEqual([{ id: originalId, ...edited }]);
  await page.reload();
  await expect(card(page, edited.title)).toContainText('20/07/2031');
});

test('cancelar edição preserva os valores', async ({ page }) => {
  const task = await createTask(page);
  const before = await storedTasks(page);
  await card(page, task.title).getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#task-title').fill('Não salvar');
  await page.locator('#task-dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(card(page, task.title)).toBeVisible();
  expect(await storedTasks(page)).toEqual(before);
});

test('conclui e reabre tarefa com persistência do status', async ({ page }) => {
  const task = await createTask(page);
  await card(page, task.title).getByRole('checkbox').check();
  await expect(card(page, task.title).getByRole('checkbox')).toBeChecked();
  await expect(page.locator('#completed-count')).toHaveText('1');
  await expect(page.locator('#pending-count')).toHaveText('0');
  await page.reload();
  await expect(card(page, task.title)).toContainText('Concluída');
  expect((await storedTasks(page))[0].status).toBe('completed');
  await card(page, task.title).getByRole('checkbox').uncheck();
  await expect(page.locator('#pending-count')).toHaveText('1');
  await expect(page.locator('#completed-count')).toHaveText('0');
  await page.reload();
  await expect(card(page, task.title).getByRole('checkbox')).not.toBeChecked();
  expect((await storedTasks(page))[0].status).toBe('pending');
});

test('cancela exclusão e depois exclui somente a tarefa confirmada', async ({ page }) => {
  const target = await createTask(page, { title: 'Excluir esta tarefa' });
  const kept = await createTask(page, { title: 'Preservar esta tarefa' });
  await card(page, target.title).getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.locator('#delete-description')).toContainText(target.title);
  await page.locator('#delete-dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.task-card')).toHaveCount(2);
  expect(await storedTasks(page)).toHaveLength(2);
  await card(page, target.title).getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
  await expect(page.locator('#notification')).toHaveText('Tarefa excluída com sucesso.');
  await expect(card(page, target.title)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(card(page, kept.title)).toBeVisible();
  expect((await storedTasks(page)).map((task) => task.title)).toEqual([kept.title]);
});

test('pesquisa parte do título sem distinguir maiúsculas e mostra estado vazio', async ({ page }) => {
  await createTask(page, { title: 'Revisar relatório' });
  await createTask(page, { title: 'Preparar apresentação', description: 'Revisar relatório' });
  await page.getByLabel('Pesquisar pelo título').fill('RELATÓRIO');
  await expect(page.locator('.task-title')).toHaveText(['Revisar relatório']);
  await page.getByLabel('Pesquisar pelo título').fill('inexistente');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await expect(page.locator('#empty-title')).toHaveText('Nenhuma tarefa encontrada');
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.task-card')).toHaveCount(2);
});

test('combina filtros de status, prioridade e pesquisa', async ({ page }) => {
  await createTask(page, { title: 'Entrega A', priority: 'high' });
  await createTask(page, { title: 'Entrega B', priority: 'low' });
  await createTask(page, { title: 'Entrega C', priority: 'high', status: 'completed' });
  await page.locator('#status-filter').selectOption('pending');
  await expect(page.locator('.task-card')).toHaveCount(2);
  await page.locator('#priority-filter').selectOption('high');
  await expect(page.locator('.task-title')).toHaveText(['Entrega A']);
  await page.locator('#search').fill('Entrega C');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await page.locator('#status-filter').selectOption('completed');
  await expect(page.locator('.task-title')).toHaveText(['Entrega C']);
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.task-card')).toHaveCount(3);
  await expect(page.locator('#search')).toHaveValue('');
  await expect(page.locator('#status-filter')).toHaveValue('all');
  await expect(page.locator('#priority-filter')).toHaveValue('all');
});

test('persiste a coleção completa no LocalStorage real após recarregar', async ({ page }) => {
  await createTask(page, { title: 'Persistência A', description: 'Linha 1\nLinha 2' });
  await createTask(page, { title: 'Persistência B', priority: 'medium', status: 'completed' });
  const before = await storedTasks(page);
  expect(before).toHaveLength(2);
  expect(new Set(before.map((task) => task.id)).size).toBe(2);
  await page.reload();
  expect(await storedTasks(page)).toEqual(before);
  await expect(page.locator('.task-card')).toHaveCount(2);
  await expect(page.locator('#pending-count')).toHaveText('1');
  await expect(page.locator('#completed-count')).toHaveText('1');
  await card(page, 'Persistência A').getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.locator('#details-description')).toHaveText('Linha 1\nLinha 2');
});

test('exibe caracteres especiais e HTML como texto sem executar JavaScript', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  const title = 'Ação "IA" & revisão 🧪 <img src=x onerror=alert(1)>';
  const description = '<script>window.__xssExecutado = true</script>\nAspas: \' " & < >';
  await createTask(page, { title, description });
  await page.reload();
  await expect(card(page, title).locator('.task-title')).toHaveText(title);
  await card(page, title).getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.locator('#details-description')).toHaveText(description);
  await expect(page.locator('#task-list img, #task-list script, #details-dialog img, #details-dialog script')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xssExecutado)).toBeUndefined();
  expect(dialogs).toEqual([]);
  expect((await storedTasks(page))[0]).toMatchObject({ title, description });
});

test('layout não transborda e permite cadastrar, consultar e editar', async ({ page }) => {
  async function expectNoHorizontalOverflow() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await expectNoHorizontalOverflow();
  const task = await createTask(page, { title: 'T'.repeat(120), description: 'Descrição longa '.repeat(50) });
  await expectNoHorizontalOverflow();
  await card(page, task.title).getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.locator('#details-title')).toHaveText(task.title);
  await expectNoHorizontalOverflow();
  const dialogBox = await page.locator('#details-dialog').boundingBox();
  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.locator('#details-dialog').getByRole('button', { name: 'Editar tarefa', exact: true }).click();
  await page.locator('#task-title').fill('Editada no viewport atual');
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(card(page, 'Editada no viewport atual')).toBeVisible();
  await expectNoHorizontalOverflow();
});
