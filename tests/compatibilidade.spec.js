const { test, expect } = require('@playwright/test');

test('lê o formato anterior sem regravar e preserva o ID ao editar', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const key = 'gerenciador-tarefas:v1';
  const task = {
    id: 'registro-ficticio-anterior-a-refatoracao',
    title: 'Atividade anterior', description: 'Ação & revisão\nSegunda linha',
    priority: 'medium', deadline: '2030-08-21', status: 'pending',
  };
  // Dado sintético de compatibilidade, escrito no Storage REAL do contexto isolado.
  // A formatação distinta permite detectar regravação automática durante a leitura.
  const original = JSON.stringify([task], null, 2);
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key, original });
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText(task.title);
  await expect(page.locator('#total-count')).toHaveText('1');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(original);
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.locator('#details-description')).toHaveText(task.description);
  await expect(page.locator('#details-meta')).toContainText('21/08/2030');
  await page.getByRole('button', { name: 'Editar tarefa', exact: true }).click();
  await page.getByLabel('Título *', { exact: true }).fill('Atividade anterior editada');
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText('Atividade anterior editada');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual([
    { ...task, title: 'Atividade anterior editada' },
  ]);
  expect(errors).toEqual([]);
});
