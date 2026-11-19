// 시험대 공통: 가짜 실리태번 + Playwright
import { chromium } from './pw.mjs';
import { serve } from './server.mjs';
export async function open({ width = 1300, height = 900 } = {}) {
    const srv = await serve(0), port = srv.address().port;
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
    const page = await browser.newPage({ viewport: { width, height } });
    const logs = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e}`));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
    return { page, logs, close: async () => { await browser.close(); srv.close(); } };
}
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function check(cond, label, extra = '') { console.log(`  ${cond ? '✔' : '✘'} ${label} ${cond ? '' : extra}`); if (!cond) process.exitCode = 1; }
