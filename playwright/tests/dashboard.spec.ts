import { test, expect } from '@playwright/test';

test.describe('Dashboard smoke', () => {
  test('allows toggling sandbox settings and updating analytics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Agentic Transactions/ })).toBeVisible();
    const sandboxToggle = page.locator('#sandbox_mode');
    await sandboxToggle.scrollIntoViewIfNeeded();

    const initial = await sandboxToggle.isChecked();
    await sandboxToggle.setChecked(!initial, { force: true });
    await page.locator('[data-action="save-toggles"]').first().click();
    await expect(sandboxToggle).toHaveJSProperty('checked', !initial);

    // Restore original state to avoid side effects.
    await sandboxToggle.setChecked(initial, { force: true });
    await page.locator('[data-action="save-toggles"]').first().click();
    await expect(sandboxToggle).toHaveJSProperty('checked', initial);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const navPanel = page.locator('#nav_panel');
    await navPanel.waitFor({ state: 'visible' });
    const analyticsTab = navPanel.getByRole('tab', { name: 'Analytics' });
    await analyticsTab.click();
    await page.locator('#analytics [data-action="refresh-analytics"]').click();
    await expect(page.locator('#metrics .metric')).toHaveCount(4);
    await expect(page.locator('#breakdown')).not.toHaveText('{}');
  });

  test('renders live logs stream and inbound refresh controls', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const navPanel = page.locator('#nav_panel');
    await navPanel.waitFor({ state: 'visible' });
    const logsTab = navPanel.getByRole('tab', { name: 'Logs' });
    await logsTab.click();
    const logBox = page.locator('#logbox');
    await expect(logBox).toContainText('Listening', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await navPanel.waitFor({ state: 'visible' });
    const inboundTab = navPanel.getByRole('tab', { name: 'Inbound' });
    await inboundTab.click();
    const refreshButton = page.locator('[data-action="refresh-inbound"]');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(page.locator('#inbounds')).toBeVisible();
  });
});
