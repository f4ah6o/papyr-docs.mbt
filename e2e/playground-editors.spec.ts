import { expect, test, type Page } from '@playwright/test';

const LOAD_TIMEOUT = 60_000;
const STORAGE_KEY = 'papyr-docs:playground-source:v1';

test.setTimeout(90_000);

async function openPlayground(page: Page, source?: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    },
    { key: STORAGE_KEY, value: source ?? null },
  );
  await page.goto('/playground');
}

async function expectVisualEditor(page: Page): Promise<void> {
  await expect(page.locator('.editor-workspace__prosemirror')).toBeVisible({
    timeout: LOAD_TIMEOUT,
  });
}

async function readStoredSource(page: Page): Promise<string> {
  return page.evaluate((key) => window.localStorage.getItem(key) ?? '', STORAGE_KEY);
}

async function selectEditorText(editor: ReturnType<Page['locator']>): Promise<void> {
  await editor.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode();
    if (text === null) {
      throw new Error('missing editor text node');
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

test.beforeEach(async ({ page }) => {
  await openPlayground(page);
  await expectVisualEditor(page);
});

test('visual editor: embedded block previews are rendered inline', async ({ page }) => {
  const tableBlock = page.locator('.editor-workspace__prosemirror [data-papyr-block="table"]');
  const mermaidBlock = page.locator('.editor-workspace__prosemirror [data-papyr-block="mermaid"]');
  const excalidrawBlock = page.locator(
    '.editor-workspace__prosemirror [data-papyr-block="excalidraw"]',
  );

  await expect(tableBlock.locator('table')).toBeVisible();
  await expect(tableBlock).toContainText('Review');
  await expect(mermaidBlock.locator('svg')).toBeVisible({ timeout: LOAD_TIMEOUT });
  await expect(excalidrawBlock.locator('svg')).toBeVisible();
});

test('visual editor: table caption の編集が block と markdown source に反映される', async ({
  page,
}) => {
  const tableBlock = page
    .locator('.editor-workspace__prosemirror [data-papyr-block="table"]')
    .first();
  const caption = 'Updated checklist from e2e';

  await expect(tableBlock).toHaveAttribute('data-papyr', /Publishing checklist/);
  await tableBlock.dblclick();
  await page.getByRole('textbox', { name: 'Caption' }).fill(caption);

  await expect(tableBlock).toHaveAttribute('data-papyr', new RegExp(caption));
  await expect(tableBlock).not.toHaveAttribute('data-papyr', /Publishing checklist/);
  await expect.poll(() => readStoredSource(page)).toContain(caption);
});

test('visual editor: toolbar bold を適用すると ProseMirror content が強調される', async ({
  page,
}) => {
  await openPlayground(page, 'bold-test');
  await expectVisualEditor(page);

  const editor = page.locator('.editor-workspace__prosemirror');

  await editor.click();
  await selectEditorText(editor);
  await page.locator('.editor-workspace__toolbar-button', { hasText: 'Bold' }).click();

  await expect(editor.locator('strong').filter({ hasText: 'bold-test' })).toBeVisible();
  await expect.poll(() => readStoredSource(page)).toContain('**bold-test**');
});

test('visual editor: bold selection では italic marker を誤って出力しない', async ({ page }) => {
  await openPlayground(page, 'bold-test');
  await expectVisualEditor(page);

  const editor = page.locator('.editor-workspace__prosemirror');
  const boldButton = page.locator('.editor-workspace__toolbar-button', { hasText: 'Bold' });

  await editor.click();
  await selectEditorText(editor);
  await boldButton.click();

  await expect.poll(() => readStoredSource(page)).toContain('**bold-test**');
  await expect.poll(() => readStoredSource(page)).not.toContain('*_bold-test_*');
});

test('parse error 時は markdown recovery surface で修正できて diagram action は停止する', async ({
  page,
}) => {
  await openPlayground(page, '```papyr-table\nnot-json\n```');

  const recovery = page.locator('.editor-workspace__markdown--recovery');
  await expect(recovery).toBeVisible({ timeout: LOAD_TIMEOUT });
  await expect(page.locator('.editor-workspace__banner--error')).toBeVisible();
  await expect(
    page.locator('button.editor-workspace__action', { hasText: 'Add Mermaid' }),
  ).toBeDisabled();

  await recovery.fill('# recovered');

  await expect(page.locator('.editor-workspace__banner--error')).toHaveCount(0);
  await expectVisualEditor(page);
});

test('mermaid: visual block を double click すると focused editor が開く', async ({ page }) => {
  const mermaidBlock = page
    .locator('.editor-workspace__prosemirror [data-papyr-block="mermaid"]')
    .first();

  await expect(mermaidBlock).toBeVisible();
  await mermaidBlock.dblclick();

  await expect(page.locator('.editor-workspace__modal')).toBeVisible();
  await expect(page.locator('.editor-workspace__modal')).toContainText('Mermaid editor');
  await expect(page.locator('.editor-workspace__mermaid-source')).toBeVisible();
  await expect(page.locator('.editor-workspace__modal-field input').first()).toBeFocused();
});

test('mermaid modal: backdrop click で閉じる', async ({ page }) => {
  const mermaidBlock = page
    .locator('.editor-workspace__prosemirror [data-papyr-block="mermaid"]')
    .first();
  const modal = page.locator('.editor-workspace__modal');
  const backdrop = page.locator('.editor-workspace__modal-backdrop');

  await mermaidBlock.dblclick();
  await expect(modal).toBeVisible();

  await backdrop.click({ position: { x: 8, y: 8 } });

  await expect(modal).toHaveCount(0);
});

test('mermaid modal: Tab focus が dialog 内で循環する', async ({ page }) => {
  const mermaidBlock = page
    .locator('.editor-workspace__prosemirror [data-papyr-block="mermaid"]')
    .first();
  const closeButton = page.getByRole('button', { name: 'Close block editor' });
  const sourceField = page.locator('.editor-workspace__mermaid-source');

  await mermaidBlock.dblclick();
  await expect(page.locator('.editor-workspace__modal-field input').first()).toBeFocused();

  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(sourceField).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
});

test('mermaid editor: source を更新すると markdown source も更新される', async ({ page }) => {
  const mermaidBlock = page
    .locator('.editor-workspace__prosemirror [data-papyr-block="mermaid"]')
    .first();
  const marker = 'e2e-mermaid-node';

  await mermaidBlock.dblclick();
  await page.locator('.editor-workspace__mermaid-source').click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(`  Review --> ${marker}`);

  await expect.poll(() => readStoredSource(page)).toContain(marker);
});

test('Add Excalidraw で focused editor がすぐ開く', async ({ page }) => {
  const excalidrawBlocks = page.locator(
    '.editor-workspace__prosemirror [data-papyr-block="excalidraw"]',
  );
  const before = await excalidrawBlocks.count();

  await page.locator('button.editor-workspace__action', { hasText: 'Add Excalidraw' }).click();

  await expect(excalidrawBlocks).toHaveCount(before + 1);
  await expect(page.locator('.editor-workspace__modal')).toContainText('Excalidraw editor');
  await expect(page.locator('.editor-workspace__excalidraw--modal')).toBeVisible();
});
