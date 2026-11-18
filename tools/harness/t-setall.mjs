// 🧪 ⚙ 관리 › 전체 설정: 서랍의 칸이 상태창 안에 다 있음 · 찾기 칸 · 한쪽에서 바꾸면 다른 쪽도 · 🔎 검색에서 설정을 누르면 그 칸으로
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
  await makeStatus(page, ['profile', 'stats', 'wallet', 'calendar', 'contact']);
  await page.evaluate(() => { const a = window.__SS_TEST__.api.app; a.openSheet('manage'); });
  await sleep(500);
  await page.evaluate(() => { document.querySelector('.ss-mg-tabs [data-arg="all"]')?.click(); });
  await sleep(500);
  const a = await page.evaluate(() => {
    const host = [...document.querySelectorAll('.ss-set-sheet')].find(x => x.offsetParent);
    const drawer = document.querySelectorAll('#ss-settings [data-s]').length;
    return { ok: !!host, n: host?.querySelectorAll('[data-s]').length ?? 0, drawer };
  });
  check(a.ok && a.n === a.drawer && a.n > 100, '관리 › 전체 설정에 서랍의 칸이 전부', JSON.stringify(a));
  await page.fill('.ss-set-sheet .ss-set-q', '번역');
  await sleep(400);
  const f = await page.evaluate(() => { const h = document.querySelector('.ss-set-sheet'); const vis = [...h.querySelectorAll('.ss-set-body [data-s]')].filter(i => !i.closest('[hidden]')).map(i => i.dataset.s); return { vis, cnt: h.querySelector('.ss-set-n').textContent }; });
  check(f.vis.includes('trLang') && !f.vis.includes('toastSec') && /곳/.test(f.cnt), '찾기 「번역」: 번역 칸만 보임', JSON.stringify(f).slice(0, 300));
  await page.fill('.ss-set-sheet .ss-set-q', '없는설정말');
  await sleep(400);
  const none = await page.evaluate(() => document.querySelector('.ss-set-sheet .ss-set-n').textContent);
  check(/찾지 못/.test(none), '없는 말은 「찾지 못했어요」', none);
  await page.fill('.ss-set-sheet .ss-set-q', '');
  await sleep(300);
  // 바꾸면 settings와 서랍 칸이 같이
  const sy = await page.evaluate(async () => {
    const i = document.querySelector('.ss-set-sheet [data-s="toastSec"]'); i.value = '9'; i.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    const core = await import('/ext/src/core.js');
    return { set: core.settings().toastSec, drawer: document.querySelector('#ss-settings [data-s="toastSec"]').value };
  });
  check(sy.set === 9 && sy.drawer === '9', '상태창에서 바꾸면 설정 · 서랍 칸도 같은 값', JSON.stringify(sy));
  const sy2 = await page.evaluate(async () => {
    const i = document.querySelector('#ss-settings [data-s="toastSec"]'); i.value = '6'; i.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    return document.querySelector('.ss-set-sheet [data-s="toastSec"]').value;
  });
  check(sy2 === '6', '서랍에서 바꾸면 상태창 칸도', sy2);
  // 🔎 상태창 검색에 설정이 나오고, 누르면 전체 설정의 그 칸
  const sr = await page.evaluate(async () => { const ex = await import('/ext/src/extra.js'); const s = window.__SS_TEST__.api.app.current.state; return ex.searchAll(s, '번역 언어').list.filter(x => x.key).map(x => x.key); });
  check(sr.includes('trLang'), '🔎 검색 「번역 언어」에 설정 칸이 나옴', JSON.stringify(sr));
  await page.evaluate(async () => { const core = await import('/ext/src/core.js'); core.settings().mgTab = 'play'; document.querySelector('dialog[open] .popup-button-ok, dialog[open] .popup-button-close')?.click(); });
  await sleep(500);
  await page.evaluate(() => { window.__SS_TEST__.api.app.openSearch(); });
  await page.waitForSelector('dialog .ss-search .ss-q');
  await page.fill('dialog .ss-search .ss-q', '팝업 시간');
  await sleep(400);
  const has = await page.evaluate(() => !!document.querySelector('dialog .ss-results [data-key="toastSec"]'));
  check(has, '「팝업 시간」 → 팝업이 보이는 시간 설정', '');
  await page.click('dialog .ss-results [data-key="toastSec"]');
  await sleep(1200);
  const fo = await page.evaluate(() => { const h = [...document.querySelectorAll('.ss-set-sheet')].find(x => x.offsetParent); const i = h?.querySelector('[data-s="toastSec"]'); const r = i?.getBoundingClientRect(); return { open: !!h, flash: !!i?.closest('.ss-set-flash'), inView: r ? r.top >= 0 && r.bottom <= innerHeight : false }; });
  check(fo.open && fo.inView, '누르면 관리 › 전체 설정이 열리고 그 칸이 보임', JSON.stringify(fo));
  const pe = logs.filter(l => /pageerror|TypeError/.test(l)); check(!pe.length, 'no page errors', pe.join('\n').slice(0, 300));
} finally { await close(); }
