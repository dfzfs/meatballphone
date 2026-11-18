import { open, makeStatus, check } from './lib.mjs';
// 화면 없이 안에만 있던 기능 4개에 단추를 붙였다: 단체방 본편 알리기 · 연락처별 로어북 · 상태 카드 그림 · 이 채팅 크기
const { page, logs, close } = await open();
await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'contact', 'calendar']);
const r = await page.evaluate(async () => {
  const app = window.__SS_TEST__.api.app, w = (ms) => new Promise(r => setTimeout(r, ms)), set = window.__st.extensionSettings.statussim;
  const { commit } = await import('/ext/src/engine.js'), { getMeta } = await import('/ext/src/core.js');
  const out = {}; window.__autoPopup = null;
  const pop = () => window.__popups.filter(p => !('result' in p)).at(-1)?.dlg;
  const until = async (f) => { for (let k = 0; k < 40; k++) { const v = f(); if (v) return v; await w(100); } return null; };
  // ① 단체방
  set.groupChat = true;
  const ct = structuredClone(app.current.state.data.contact); ct.mode = 'phone'; ct.contacts.push({ name: 'Leon' }, { name: 'Mia' });
  ct.rooms = { 동아리: { members: ['Leon', 'Mia'], msgs: [{ id: 'r1', from: 'them', who: 'Leon', text: '내일 소풍 가자' }, { id: 'r2', from: 'them', who: 'Mia', text: '좋아, 도시락은 내가' }] } };
  await commit('contact', ct, 'c');
  app.openSheet('contact');
  const el = await until(() => [...document.querySelectorAll('dialog .ss-panel, .ss-dlg .ss-panel')].at(-1)); el._ss.ui = { rooms: true, room: '동아리' }; app.renderPanel(el);
  out.tellBtn = !!el.querySelector('[data-act="crtell"]');
  window.__ai = () => '레온과 미아가 내일 소풍을 가기로 했고 미아가 도시락을 맡았다.';
  el.querySelector('[data-act="crtell"]').click();
  let d = await until(() => pop()?.querySelector('[data-choice="summary"]')); d.click();
  d = await until(() => pop()?.querySelector('textarea.popup-input')); pop().querySelector('.popup-button-ok').click(); await w(600);
  app.refreshNow(); await w(200);
  out.summaryInj = Object.values(window.__prompts).some(p => /GROUP CHAT «동아리».*소풍/s.test(p.value ?? ''));
  // 고른 말풍선
  el.querySelector('[data-act="crtell"]').click();
  d = await until(() => pop()?.querySelector('[data-choice="pick"]')); d.click(); await w(600);
  el.querySelector('[data-act="crpick"][data-arg="r2"]')?.click(); await w(400); app.refreshNow(); await w(200);
  const inj = Object.values(window.__prompts).map(p => p.value ?? '').join('\n');
  out.pickInj = /Mia: 좋아, 도시락은 내가/.test(inj) && !/내일 소풍 가자/.test(inj);
  // ② 연락처별 로어북 (가짜 로어북)
  window.SillyTavern.getContext().loadWorldInfo = async () => ({ entries: { 1: { uid: 1, comment: '왕국 역사', content: '왕국은 300년 전 세워졌다.' }, 2: { uid: 2, comment: '마법 규칙', content: '마법은 하루 세 번.' } } });
  window.__st.chatMetadata.world_info = 'TestBook';
  el._ss.ui = { who: 'Leon' }; app.renderPanel(el);
  el.querySelector('[data-act="cmenu"]').click();
  d = await until(() => pop()?.querySelector('[data-m="lore"]')); d.click();
  d = await until(() => pop()?.querySelector('[data-lk]')); out.loreList = pop().querySelectorAll('[data-lk]').length;
  pop().querySelector('[data-lk]').checked = true; pop().querySelector('.popup-button-ok').click(); await w(500);
  out.loreSaved = getMeta()?.ctLore?.Leon?.[0]?.body === '왕국은 300년 전 세워졌다.';
  let seen = ''; window.__ai = (p, sys) => { seen += p + sys; return '응'; };
  const ta = el.querySelector('.ss-cin'); ta.value = '안녕'; el.querySelector('[data-act="csend"]').click(); await w(900);
  out.loreUsed = /300년 전/.test(seen);
  // ③ 상태 카드 그림 · ④ 채팅 크기
  let dl = null; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { dl = this.download; };
  const V = await import('/ext/src/views.js'); await V.VIEW_ACTIONS.cardpng(el); HTMLAnchorElement.prototype.click = oc;
  out.card = /-status\.png$/.test(dl ?? '');
  const sz = V.VIEW_ACTIONS.chatsize(el); const sd = await until(() => pop()?.innerText.includes('이 채팅에 미트볼이 쓰는 양') && pop()); out.size = !!sd; sd?.querySelector('.popup-button-ok')?.click(); await sz;
  // 관리 탭에 단추가 보인다
  el._ss = { tab: 'manage', mode: 'view', ui: {} }; set.mgOpen = { tools: true, fix: true, look: true }; app.renderPanel(el);
  out.btns = !!el.querySelector('[data-act="cardpng"]') && !!el.querySelector('[data-act="chatsize"]');
  return out;
});
for (const [k, v] of Object.entries(r)) check(v === true || (k === 'loreList' && v === 2), k, String(v));
const errs = logs.filter(l => /error/i.test(l) && !/status of 404/.test(l)); // 404 = 시험 서버엔 실리의 /scripts/world-info.js가 없다
check(!errs.length, '오류 없음', errs.slice(0, 2).join(' | '));
await close();
