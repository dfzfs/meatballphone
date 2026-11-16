// ⚡ 미니홈피 「바뀐 창만 갈아 끼우기」(mountHompy): 28가지 변화마다 갈아 끼운 화면이 통째로 새로 그린 화면과 글자 하나까지 같은지 · 안 바뀐 옆 창은 실제로 그대로 남는지
//   (그릴 때마다 달라지는 것 — 탭 바뀜 움직임 표시 · 미니 채팅 높이 — 은 견주기 전에 뺀다)
import { open, makeStatus, check } from './lib.mjs';
for (const [width, height] of [[1300, 900], [390, 844]]) {
const { page, logs, close } = await open({ width, height });
try {
  await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact']);
  const r = await page.evaluate(async () => {
    const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const hp = await import('/ext/src/hompy.js'); const tr = await import('/ext/src/translate.js');
    const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings();
    await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ncash: +100\nquest: Find the Gate | 진행\n</meatball>'); await wait(300);
    window.__autoPopup = null; S.sheetFull = false; S.hpSkin = 'clean'; shell.openSheet('home'); await wait(400);
    const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')); const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
    el.querySelector('[data-act="fullscreen"]').click(); await wait(800);
    const norm = () => el.innerHTML.replace(/ ss-hp-(swap|enter)\b/g, '').replace(/\bpop\b/g, '').replace(/ data-n0="[^"]*"/g, '').replace(/--ctf-h: \d+px;/g, '').replace(/\s+"/g, '"').replace(/\s+/g, ' ').replace(/ class=""/g, '').replace(/ style=""/g, '');
    const diffs = [], kept = [];
    const step = async (name, fn) => {
      await fn(); await wait(250);
      const marks = [...el.querySelectorAll('.ss-hp-col .ss-hp-win')]; marks.forEach(n => { n.__k = true; });
      app.renderPanel(el); await wait(250); const A = norm(); kept.push([...el.querySelectorAll('.ss-hp-col .ss-hp-win')].filter(n => n.__k).length);
      S.hpPatch = false; app.renderPanel(el); await wait(250); const B = norm(); delete S.hpPatch;
      if (A !== B) { let i = 0; while (i < A.length && A[i] === B[i]) i++; diffs.push(`${name}: @${i} A=…${A.slice(Math.max(0, i - 60), i + 90)} | B=…${B.slice(Math.max(0, i - 60), i + 90)}`); }
      app.renderPanel(el); await wait(150);
    };
    const tab = (t) => () => { el._ss.tab = t; el._ss.mode = 'view'; el._ss.ui = {}; delete el._ss.group; };
    await step('home', tab('home'));
    await step('rel', tab('rel')); await step('stats', tab('stats')); await step('guide', tab('guide')); await step('manage', tab('manage')); await step('contact', tab('contact')); await step('home2', tab('home'));
    await step('turn-cash', async () => { await window.__addUser('a'); await window.__addAI('x\n<meatball>\ncash: -30\n체력: -10\n</meatball>'); });
    await step('turn-aff', async () => { await window.__addUser('b'); await window.__addAI('y\n<meatball>\naff: Leon +5\naff: Nova +12\n</meatball>'); });
    await step('quest-done', async () => { await window.__addUser('c'); await window.__addAI('z\n<meatball>\nquest: Find the Gate | 완료\n</meatball>'); });
    await step('hide-win', () => { S.hpLayout = { ...hp.hpLayout(), off: [...hp.hpLayout().off, 'friends'] }; });
    await step('show-win', () => { S.hpLayout = { ...hp.hpLayout(), off: hp.hpLayout().off.filter(x => x !== 'friends') }; });
    await step('move-main', () => { S.hpLayout = { ...hp.hpLayout(), main: 'l' }; });
    await step('main-back', () => { S.hpLayout = { ...hp.hpLayout(), main: 'c' }; });
    await step('titles', () => { S.hpTitles = { stats: '컨디션' }; S.hpGroupNames = { people: '인연' }; });
    await step('skin-dot', () => { S.hpSkin = 'dot'; hp.applyRetro(); });
    await step('skin-phone-dark', () => { S.hpSkin = 'phone'; S.hpDark = 'dark'; hp.applyRetro(); });
    await step('theme', () => { S.hpSkin = 'clean'; S.hpDark = 'light'; S.hpTheme = 3; hp.applyRetro(); });
    await step('pause', () => { core.getMeta().paused = true; });
    await step('unpause', () => { delete core.getMeta().paused; });
    await step('enview', () => { S.ssGenLang = 'enview'; S.trAuto = 'off'; const d = (core.getMeta().tr ??= {}); d['Find the Gate'] = '문을 찾아라'; });
    await step('tr-change', () => { tr.fixTr?.('Find the Gate', '관문 찾기'); const d = core.getMeta().tr; d['Find the Gate'] = '관문 찾기'; });
    await step('ko', () => { S.ssGenLang = 'ko'; });
    await step('ctfloat', () => { S.ctFloat = true; });
    await step('ctfloat-turn', async () => { await window.__addUser('d'); await window.__addAI('w\n<meatball>\ncash: +7\n</meatball>'); });
    await step('ctfloat-off', () => { S.ctFloat = false; });
    await step('edit-mode', () => { hp._edit.start(); });
    await step('edit-end', () => { hp._edit.end(false); });
    return { steps: kept.length, kept: kept.join(','), diffs };
  });
  check(r.steps === 28 && !r.diffs.length, `patch (${width}px): 갈아 끼운 화면 = 새로 그린 화면 (${r.steps}가지)`, r.diffs.map(d => d.slice(0, 300)).join(' ‖ '));
  check(r.kept.split(',').filter(x => Number(x) >= 3).length >= 15, `patch (${width}px): 안 바뀐 옆 창은 그대로 둠`, r.kept);
  check(!logs.some(l => /pageerror|TypeError/.test(l)), `patch (${width}px): 오류 없음`, logs.slice(0, 2).join(' | '));
} catch (e) { check(false, 'patch: 시나리오가 끝까지 돌았다', String(e).slice(0, 400)); }
await close();
}
