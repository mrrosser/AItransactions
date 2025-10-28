import { getFlag } from '../store/settings';
import { log } from '../store/logs';
import { runUiSmoke } from './ui-smoke';

const LOOP_INTERVAL = Number(process.env.LOOP_INTERVAL_MS || 60_000);

let timer: NodeJS.Timeout | null = null;

async function tick() {
  if (!getFlag('LOOP_ENABLED')) return;
  log('info', 'loop: heartbeat');
  try {
    await runUiSmoke();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ui-smoke: unknown failure';
    log('error', message);
  }
}

export async function startLoop() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((error) => {
      const message =
        error instanceof Error ? error.message : 'loop tick failed';
      log('error', `loop: ${message}`);
    });
  }, LOOP_INTERVAL);
  log('info', 'loop: started');
  tick().catch((error) => {
    const message = error instanceof Error ? error.message : 'loop tick failed';
    log('error', `loop: ${message}`);
  });
}

export async function stopLoop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  log('warn', 'loop: stopped');
}
