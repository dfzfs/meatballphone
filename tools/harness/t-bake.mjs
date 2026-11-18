import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'contact', 'memo', 'ach', 'shop', 'home', 'fate', 'news']);
const r = await page.evaluate(async () => {
  const app = window.__SS_TEST__.api.app, w = (ms) => new Promise(r => setTimeout(r, ms));
  const { addAdjust, squash } = await import('/ext/src/engine.js'), { getMeta, saveMeta } = await import('/ext/src/core.js');
  const L = ['stat: 체력 -3', 'cash: +17', 'aff: Leon +2', 'trust: Mia -1', 'time: +1', 'date: +1', 'item: 빵 x2', 'item: -빵 1', 'quest: 약초 캐기 | 마을', 'quest: 약초 캐기 | 완료', 'event: 내일 | 파티', 'memo: 단서 하나', 'loc: 시장', 'cond: +감기', 'cond: -감기', 'ach: 첫 걸음', 'msg: Leon | 안녕', 'weather: 비', 'news: 축제 | 광장에서 열림', 'curse: 불운 | 2일'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    await window.__addUser('u' + i);
    const ops = Array.from({ length: 3 }, () => L[Math.floor(rnd() * L.length)]);
    await window.__addAI(`장면 ${i}\n<meatball>\n${ops.join('\n')}\n</meatball>`);
    if (i % 7 === 3) await addAdjust({ ops: [['cash', '-5']], label: 'm' + i });
  }
  await w(500); app.refreshNow?.(); await w(300);
  const snap = () => JSON.stringify({ d: app.current.state.data, t: app.current.state.turn });
  const a = snap();
  squash(getMeta(true), 10); await saveMeta(); app.refreshNow(); await w(300);
  const b = snap();
  squash(getMeta(true), 0); await saveMeta(); app.refreshNow(); await w(300);
  const c = snap();
  const diff = (x, y) => { const X = JSON.parse(x).d, Y = JSON.parse(y).d; return Object.keys({ ...X, ...Y }).filter(k => JSON.stringify(X[k]) !== JSON.stringify(Y[k])); };
  return { ab: a === b, bc: b === c, d1: diff(a, b), d2: diff(a, c), t: [JSON.parse(a).t, JSON.parse(b).t, JSON.parse(c).t] };
});
check(r.ab && r.bc && r.t.every(x => x === r.t[0]), '굳히기(최근 10 남김 · 전부) 전후 상태가 같다 — 60턴 · 14칸 · 편집 섞어서', JSON.stringify(r));
check(!logs.some(l => /error/i.test(l)), '오류 없음');
await close();
