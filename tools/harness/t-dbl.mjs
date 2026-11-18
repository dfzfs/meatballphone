import { open, makeStatus, check } from './lib.mjs';
// 같은 단추를 빨리 여러 번 눌러도 한 번만 (구매 세 번 → 돈이 세 번 빠지던 것)
const { page, logs, close } = await open();
await makeStatus(page, ['profile', 'wallet', 'shop', 'calendar']);
const r = await page.evaluate(async () => {
  const app = window.__SS_TEST__.api.app, w = (ms) => new Promise(r => setTimeout(r, ms));
  app.openSheet('shop'); await w(700);
  const b = document.querySelector('dialog [data-act="buy"]'); if (!b) return 'nobuy';
  const c0 = app.current.state.data.wallet.cash;
  b.click(); b.click(); b.click(); await w(1200);
  return { c0, c1: app.current.state.data.wallet.cash, adj: (await import('/ext/src/core.js')).getMeta().adjust.length };
});
check(r.c0 - r.c1 === 2 && r.adj === 1, '구매 단추 세 번 연타 → 한 번만 산다', JSON.stringify(r));
check(!logs.some(l => /error/i.test(l)), '오류 없음');
await close();
