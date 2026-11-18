// 🧪 🔎 상태창 검색: 띄어 쓴 낱말 여럿 · 조사 · 띄어쓰기 · 설명/메모/본거지까지 · 꺼 둔 칸 빼기 · 찾은 말 칠하기 · 결과 누르면 그 탭
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
  await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'home', 'memo']);
  const r = await page.evaluate(async () => {
    const eng = await import('/ext/src/engine.js'), ex = await import('/ext/src/extra.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    await window.__addUser('u'); await window.__addAI('s\n<meatball>\nitem: +검은 열쇠\ndecor: +흔들의자\nmemo: 레온과 금요일 밤 분수대 약속\n</meatball>'); await wait(300);
    const s = app.current.state, q = (x) => ex.searchAll(s, x);
    const titles = (x) => q(x).list.map(h => `${h.tab}:${h.title}`);
    const out = {
      key: titles('열쇠'), keyObj: titles('열쇠를'), spaced: titles('검은열쇠'),
      two: titles('레온 약속'), chair: titles('흔들의자'), none: q('절대없는말').total,
      time: titles('시간'), money: titles('돈'), weather: titles('날씨'),
    };
    core.getMeta().mods = { ...(core.getMeta().mods ?? {}), memo: false }; app.refreshNow?.(); await wait(100);
    out.memoOff = titles('약속').filter(t => t.startsWith('memo:')).length;
    core.getMeta().mods.memo = true;
    return out;
  });
  check(r.key.includes('wallet:검은 열쇠'), '소지품 이름으로 찾음', JSON.stringify(r.key));
  check(r.keyObj.includes('wallet:검은 열쇠'), '「열쇠를」처럼 조사가 붙어도 찾음', JSON.stringify(r.keyObj));
  check(r.spaced.includes('wallet:검은 열쇠'), '띄어쓰기 없이 적어도 찾음', JSON.stringify(r.spaced));
  check(r.two.some(t => t.startsWith('memo:')), '띄어 쓴 두 낱말이 모두 든 메모를 찾음 (예전엔 「레온약속」 붙은 글만)', JSON.stringify(r.two));
  check(r.chair.some(t => t.startsWith('base:')), '본거지 창고도 찾음 (누르면 홈이 아니라 본거지 탭)', JSON.stringify(r.chair));
  check(r.time[0] === 'calendar:달력 칸', '「시간」 → 맨 위에 달력 칸 (자료 안에 「시간」이란 말이 없어도)', JSON.stringify(r.time));
  check(r.money[0] === 'wallet:재산 칸' && r.weather[0] === 'calendar:달력 칸', '「돈」 → 재산 · 「날씨」 → 달력', JSON.stringify([r.money, r.weather]));
  check(r.none === 0, '없는 말은 0개');
  check(r.memoOff === 0, '꺼 둔 칸(메모)은 결과에서 빠짐');
  // 화면: 창을 열고 적으면 칠한 결과 · 개수 · 누르면 그 탭
  await page.evaluate(() => { window.__SS_TEST__.api.app.openSearch(); });
  await page.waitForSelector('dialog .ss-search .ss-q');
  await page.fill('dialog .ss-search .ss-q', '열쇠');
  await sleep(300);
  const ui = await page.evaluate(() => ({ n: document.querySelectorAll('dialog .ss-results .ss-note').length, mark: document.querySelector('dialog .ss-results mark')?.textContent ?? '', cnt: document.querySelector('dialog .ss-q-n')?.textContent ?? '' }));
  check(ui.n >= 1 && /열쇠/.test(ui.mark) && /찾음/.test(ui.cnt), '검색 창: 결과 · 찾은 말 칠하기 · 개수', JSON.stringify(ui));
  await page.click('dialog .ss-results .ss-note[data-tab="wallet"]');
  await sleep(600);
  const tab = await page.evaluate(() => [...document.querySelectorAll('.ss-panel-pop')].find(p => p.closest('dialog[open]'))?._ss?.tab ?? '');
  check(tab === 'wallet', '결과를 누르면 그 탭이 열림', tab);
  const pe = logs.filter(l => /pageerror|TypeError/.test(l)); check(!pe.length, 'no page errors', pe.join('\n').slice(0, 300));
} finally { await close(); }
