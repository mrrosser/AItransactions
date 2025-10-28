import { chromium } from '@playwright/test';
import { log } from '../store/logs';

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const BASE_URL = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
const LOOP_INTERVAL = Number(process.env.SMOKE_INTERVAL_MS || 5 * 60_000);

let running = false;
let lastRun = 0;

async function visitDashboard() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Sandbox' }).click();
    await page.waitForSelector('#sandbox_mode');
    await page.getByRole('tab', { name: 'Analytics' }).click();
    await page.locator('[data-action="refresh-analytics"]').click();
    await page.waitForSelector('#metrics .metric');
    await page.getByRole('tab', { name: 'Logs' }).click();
    await page.waitForSelector('#logbox');
  } finally {
    await browser.close();
  }
}

export async function runUiSmoke() {
  if (process.env.UI_SMOKE_DISABLED === 'true') return;
  if (running) return;
  const now = Date.now();
  if (now - lastRun < LOOP_INTERVAL) return;

  running = true;
  try {
    await visitDashboard();
    lastRun = Date.now();
    log('info', 'ui-smoke: dashboard smoke run succeeded');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown ui-smoke error';
    log('error', `ui-smoke failed: ${message}`);
  } finally {
    running = false;
  }
}
