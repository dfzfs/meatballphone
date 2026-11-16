// 💬 옆 창 미니 채팅: 처음부터 같은 높이 · 꾸민 뒤에도 그대로(길어지지 않음) · 아래 창 자리를 남김 · 상태창을 닫으면 실리 화면 위에 떠 있지 않음 · 다시 열면 다시 붙음
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact', 'news']);
const r = await page.evaluate(async () => {
  const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const hp = await import('/ext/src/hompy.js'); const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), S = core.settings();
  await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Leon +30\n</meatball>'); await wait(300);
  window.__autoPopup = null; S.sheetFull = false; S.hpSkin = 'clean';
  const openFull = async () => { shell.openSheet('home'); await wait(400); const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop')); const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;'; if (!el.querySelector('.ss-hompy')) el.querySelector('[data-act="fullscreen"]').click(); await wait(800); return el; };
  let el = await openFull(); const F = () => document.getElementById('ss-ctfloat');
  const info = () => { const f = F(); if (!f || !f.isConnected) return 'gone'; const r = f.getBoundingClientRect(), nx = f.closest('.ss-hp-win')?.nextElementSibling?.getBoundingClientRect(); return `${f.classList.contains('docked') ? 'dock' : 'float'}/h${Math.round(r.height)}/${getComputedStyle(f).display}${nx ? `/gapToNext${Math.round(nx.top - r.bottom)}` : ''}`; };
  const out = {};
  S.ctFloat = true; app.renderPanel(el); await wait(350); out.first = info(); app.renderPanel(el); await wait(350); out.second = info();
  hp._edit.start(); app.renderPanel(el); await wait(350); out.inEdit = info(); hp._edit.end(true); await wait(450); out.afterEdit = info(); app.renderPanel(el); await wait(350); out.afterEdit2 = info();
  // 연락 창 아래에 다른 창을 둔다
  const Ly = hp.hpLayout(); S.hpLayout = { ...Ly, r: ['contact', ...Ly.r.filter(k => k !== 'contact')], off: Ly.off.filter(k => k !== 'friends') }; app.renderPanel(el); await wait(400); out.withBelow = info(); out.order = [...el.querySelectorAll('.ss-hp-rcol .ss-hp-win')].map(w => w.dataset.win).join(','); { const col = F().closest('.ss-hp-col'), cr = col.getBoundingClientRect(), nx = F().closest('.ss-hp-win').nextElementSibling.getBoundingClientRect(); out.geom = { colTop: Math.round(cr.top), colBottom: Math.round(cr.bottom), floatTop: Math.round(F().getBoundingClientRect().top), nextH: Math.round(nx.height), nextBottom: Math.round(nx.bottom), ctf: F().style.getPropertyValue('--ctf-h'), zoom: col.firstElementChild.style.zoom, scrollH: col.scrollHeight, clientH: col.clientHeight }; }
  // 닫기 → 실리 화면 위에 떠 있으면 안 됨
  el.closest('dialog').querySelector('.popup-button-ok')?.click(); await wait(400); document.querySelectorAll('dialog').forEach(d => { try { d.close(); d.remove(); } catch {} }); await wait(200);
  shell.ensureUI(); shell.rerenderPanels(true); await wait(400); out.afterClose = info();
  await window.__addUser('x'); await window.__addAI('y\n<meatball>\ncash: +1\n</meatball>'); await wait(600); out.afterTurnClosed = info();
  el = await openFull(); await wait(300); out.reopened = info();
  // 보통 창(전체화면 아님)에서는 창 안에 떠 있음
  el.querySelector('[data-act="fullscreen"]')?.click(); await wait(600); out.popupMode = info() + '/in:' + (F()?.parentElement?.tagName ?? '-');
  return out;
});

const h = (x) => Number(/h(\d+)/.exec(x)?.[1] ?? -1);
check(r.first.startsWith('dock/') && h(r.first) >= 260 && r.first === r.second, 'ctfloat: 처음부터 같은 높이로 붙음', `${r.first} → ${r.second}`);
check(r.inEdit.endsWith('/none'), 'ctfloat: 꾸미기 중에는 숨김', r.inEdit);
check(r.afterEdit === r.first && r.afterEdit2 === r.first, 'ctfloat: 꾸민 뒤에도 높이 그대로', `${r.first} → ${r.afterEdit} → ${r.afterEdit2}`);
check(r.order.startsWith('contact,') && r.geom.nextBottom <= r.geom.colBottom + 1 && /gapToNext\d/.test(r.withBelow), 'ctfloat: 아래 창이 칸 안에 남음', JSON.stringify(r.geom));
check(r.afterClose === 'gone' && r.afterTurnClosed === 'gone', 'ctfloat: 상태창을 닫으면 떠 있지 않음', `${r.afterClose} / ${r.afterTurnClosed}`);
check(r.reopened.startsWith('dock/'), 'ctfloat: 다시 열면 다시 붙음', r.reopened);
check(!logs.some(l => /pageerror|TypeError/.test(l)), 'ctfloat: 오류 없음', logs.slice(0, 2).join(' | '));
await close();
