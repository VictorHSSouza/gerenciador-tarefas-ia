const { test, expect } = require('@playwright/test');
const KEY = 'gerenciador-tarefas:v1';

async function openFilledForm(page, title) {
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.locator('#task-title').fill(title);
  await page.locator('#task-description').fill('Descrição fictícia.');
  await page.locator('#task-deadline').fill('2030-08-21');
}

async function createTask(page, title) {
  await openFilledForm(page, title);
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(page.locator('#task-dialog')).not.toBeVisible();
  await expect(page.locator('.task-title')).toHaveText(title);
}

async function failRendering(page) {
  // Falha controlada apenas no DOM. A persistência permanece real e intacta.
  await page.evaluate(() => {
    const element = document.getElementById('total-count');
    Object.defineProperty(element, 'textContent', {
      configurable: true,
      get() { return '0'; },
      set() { throw new Error('Falha de renderização injetada pelo teste'); },
    });
  });
}

for (const operation of ['cadastro', 'edição', 'exclusão', 'status']) {
  test(`falha de renderização após ${operation} não é tratada como falha de gravação`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (operation !== 'cadastro') await createTask(page, 'Registro original');
    const original = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), KEY);

    if (operation === 'cadastro') await openFilledForm(page, 'Registro novo');
    if (operation === 'edição') {
      await page.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.locator('#task-title').fill('Registro editado');
    }
    if (operation === 'exclusão') {
      await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    }
    await failRendering(page);
    if (['cadastro', 'edição'].includes(operation)) {
      await page.getByRole('button', { name: 'Salvar tarefa' }).click();
    } else if (operation === 'exclusão') {
      await page.getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
    } else {
      await page.getByRole('checkbox').check();
    }

    await expect(page.locator('#interface-warning')).toContainText('Não foi possível atualizar a interface');
    await expect(page.locator('#storage-warning')).not.toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('#notification')).not.toContainText('Não foi possível salvar');
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
    if (operation === 'exclusão') expect(saved).toEqual([]);
    else {
      expect(saved).toHaveLength(1);
      if (operation === 'cadastro') expect(saved[0].title).toBe('Registro novo');
      if (operation === 'edição') expect(saved[0]).toEqual({ ...original[0], title: 'Registro editado' });
      if (operation === 'status') expect(saved[0]).toEqual({ ...original[0], status: 'completed' });
    }
    await page.reload();
    await expect(page.locator('#interface-warning')).not.toBeVisible();
    await expect(page.locator('.task-card')).toHaveCount(operation === 'exclusão' ? 0 : 1);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(saved);
    expect(errors).toEqual([]);
  });
}

test('quota real esgotada preserva dados e formulário e informa falha de persistência', async ({ page }) => {
  await page.goto('/');
  await createTask(page, 'Registro preservado');
  const before = await page.evaluate((key) => localStorage.getItem(key), KEY);
  // Preenche somente o Storage descartável deste teste. Não intercepta setItem.
  const quota = await page.evaluate(() => {
    let lower = 0;
    let upper = 10 * 1024 * 1024;
    let errorName;
    while (lower < upper) {
      const size = Math.ceil((lower + upper) / 2);
      try {
        localStorage.setItem('preenchimento-quota-teste', 'x'.repeat(size));
        lower = size;
      } catch (error) {
        errorName = error.name;
        upper = size - 1;
      }
    }
    return { size: lower, errorName };
  });
  expect(quota.errorName).toBe('QuotaExceededError');
  expect(quota.size).toBeGreaterThan(0);
  await openFilledForm(page, 'Cadastro que excede a quota');
  await page.getByRole('button', { name: 'Salvar tarefa' }).click();
  await expect(page.locator('#task-dialog')).toBeVisible();
  await expect(page.locator('#task-title')).toHaveValue('Cadastro que excede a quota');
  await expect(page.locator('#form-error')).toContainText('A tarefa não foi salva');
  await expect(page.locator('#notification')).toContainText('Não foi possível salvar');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(before);
  await expect(page.locator('#interface-warning')).not.toBeVisible();
});
