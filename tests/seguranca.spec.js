const { test, expect } = require('@playwright/test');

const KEY = 'gerenciador-tarefas:v1';
const validTask = {
  id: 'tarefa-ficticia-seguranca', title: 'Registro válido preservado',
  description: 'Dados sintéticos.', priority: 'medium', status: 'pending', deadline: '2030-08-21',
};

for (const field of ['priority', 'status']) {
  test(`rejeita tipos inválidos em ${field} sem apagar o conteúdo original`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const expectedValue = field === 'priority' ? 'high' : 'pending';
    for (const value of [[expectedValue], null, 1, true, { value: expectedValue }]) {
      const raw = JSON.stringify([
        validTask,
        { ...validTask, id: 'registro-adulterado', [field]: value },
      ], null, 2);
      // Entrada adulterada no Storage real, nunca substituição da API Storage.
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw });
      await page.reload();
      await expect(page.locator('#storage-warning')).toBeVisible();
      await expect(page.locator('.task-card')).toHaveCount(0);
      await page.getByRole('button', { name: 'Nova tarefa' }).click();
      await page.locator('#task-title').fill('Não deve sobrescrever os registros');
      await page.locator('#task-deadline').fill('2030-08-22');
      await page.getByRole('button', { name: 'Salvar tarefa' }).click();
      await expect(page.locator('#form-error')).toBeVisible();
      expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(raw);
      await page.locator('#task-dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    }
    expect(errors).toEqual([]);
  });
}

test('o adaptador rejeita escrita de coleção inválida e preserva registros válidos', async ({ page }) => {
  await page.goto('/');
  const raw = JSON.stringify([validTask], null, 2);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw });
  const result = await page.evaluate(({ key, task }) => {
    const storage = TaskManager.storage.createStorage();
    storage.readTasks();
    let rejected = false;
    try {
      storage.writeTasks([{ ...task, status: ['pending'] }]);
    } catch {
      rejected = true;
    }
    return { rejected, raw: localStorage.getItem(key) };
  }, { key: KEY, task: validTask });
  expect(result.rejected).toBe(true);
  expect(result.raw).toBe(raw);
});

test('orienta sobre dados sensíveis no cadastro e na edição sem modificar dados', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await expect(page.locator('#privacy-note')).toBeVisible();
  await expect(page.locator('#privacy-note')).toContainText('Não registre senhas, tokens ou informações sensíveis');
  await expect(page.locator('#task-title')).toHaveAttribute('aria-describedby', 'privacy-note');
  await expect(page.locator('#task-description')).toHaveAttribute('aria-describedby', 'privacy-note');
  await page.locator('#task-title').fill('Registro fictício sem informação sensível');
  await page.locator('#task-deadline').fill('2030-08-21');
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  const before = await page.evaluate((key) => localStorage.getItem(key), KEY);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.locator('#privacy-note')).toBeVisible();
  await page.locator('#task-dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(before);
});
