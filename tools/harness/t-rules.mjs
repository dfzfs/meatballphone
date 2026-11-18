import { open, makeStatus, check } from './lib.mjs';
// 엔딩 · 자동 규칙 조건: 여러 조건(· && 그리고 || 또는) · ≥ · 1,000
const { page, close } = await open();
await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'ach', 'fate']);
const r = await page.evaluate(async () => {
  const { ruleTrue } = await import('/ext/src/engine.js'); const s = window.__SS_TEST__.api.app.current.state;
  s.data.wallet.cash = 1500; const nm = s.data.rel.user[0]?.name; if (s.data.rel.user[0]) s.data.rel.user[0].aff = 95;
  return [nm, ...['돈 >= 1,000', '돈 >= 1000 · 호감:' + nm + ' >= 90', '돈 >= 2000 · 호감:' + nm + ' >= 90', '돈 >= 2000 || 호감:' + nm + ' >= 90', '돈 ≥ 1000', '돈 >= 1000, 호감:' + nm + ' >= 99', '돈 >= 1000 그리고 돈 < 2000', nm + ' 호감 >= 90', nm + '의 호감도 >= 99'].map(w => [w, ruleTrue(s, w)])];
});
const want = [true, true, false, true, true, false, true, true, false];
r.slice(1).forEach(([w, v], i) => check(v === want[i], `${w} → ${want[i]}`, String(v))); await close();
