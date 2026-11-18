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
  const core = await import('/ext/src/core.js'), eng = await import('/ext/src/engine.js');
  const res = { c0, c1: app.current.state.data.wallet.cash, adj: core.getMeta().adjust.length };
  // 재고가 있는 물건: 사면 재고 −1 · 구매 기록을 지우면 재고도 돌아온다
  const m = core.getMeta(true); m.base.data.shop.shops[0].items[0].stock = 2; await core.saveMeta(); app.refreshNow(); await w(300);
  const it = () => app.current.state.data.shop.shops[0].items[0];
  app.openSheet('shop'); await w(600);
  [...document.querySelectorAll('dialog')].at(-1).querySelector('[data-act="buy"][data-arg="0|0"]').click(); await w(800);
  res.stockAfterBuy = it().stock; res.adj2 = core.getMeta().adjust.length;
  await eng.undoAt(core.getMeta().adjust.at(-1).t); await w(400);
  res.stockAfterUndo = it().stock; res.cashAfterUndo = app.current.state.data.wallet.cash;
  return res;
});
check(r.c0 - r.c1 === 2 && r.adj === 1, '구매 단추 세 번 연타 → 한 번만 산다', JSON.stringify(r));
check(r.stockAfterBuy === 1 && r.adj2 === 2 && r.stockAfterUndo === 2 && r.cashAfterUndo === r.c1, '재고 −1 · 구매를 지우면 재고 · 돈 모두 돌아옴', JSON.stringify(r));
check(!logs.some(l => /error/i.test(l)), '오류 없음');
await close();
