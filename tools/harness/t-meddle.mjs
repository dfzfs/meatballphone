import { open, makeStatus, check } from './lib.mjs';
// ✍ 인물이 상태창에 손댄다: 리롤 · 스와이프 · 지우기로 그 답이 사라지면 손댄 것도 없던 일로 · 이름 바꾸기가 연락처에 보인다 (제보)
const { page, logs, close } = await open();
await makeStatus(page, ['profile', 'rel', 'contact', 'calendar']);
const r = await page.evaluate(async () => {
  const app = window.__SS_TEST__.api.app, w = (ms) => new Promise(r => setTimeout(r, ms));
  const { commit } = await import('/ext/src/engine.js'), { getMeta } = await import('/ext/src/core.js');
  window.__st.extensionSettings.statussim.meddleOn = true;
  const rl = structuredClone(app.current.state.data.rel); let L = rl.user.find(x => x.name === 'Leon'); if (!L) rl.user.push(L = { name: 'Leon' }); L.aff = 80; L.jealous = 0; await commit('rel', rl, 'r');
  const ct = structuredClone(app.current.state.data.contact); ct.mode = 'phone'; if (!ct.contacts.some(c => c.name === 'Leon')) ct.contacts.push({ name: 'Leon' }); await commit('contact', ct, 'c');
  const md = () => getMeta()?.story?.meddle ?? [];
  const seq = (a) => { let k = 0; app.__meddleRand = () => (k < a.length ? a[k++] : 0.99); };
  const out = {};
  // ① 낙서 → 리롤(같은 자리에 새 답)
  await window.__addUser('안녕'); await window.__addAI('답 1'); seq([0.01, 0.01, 0.01, 0.01]); await w(1000);
  out.memo1 = md().length === 1 && md()[0].kind === 'memo';
  window.__st.chat.pop(); await window.__addAI('답 1 (다시)'); seq([]); await w(700);
  out.rerollGone = md().length === 0;
  // ② 이름 바꾸기 → 연락처에 보임 → 스와이프로 사라짐
  await window.__addUser('또'); await window.__addAI('답 2'); seq([0.01, 0.01, 0.9, 0.9]); await w(700);
  const e = md()[0]; out.nick = e?.kind === 'nick';
  app.openSheet('contact'); await w(500);
  out.nickShown = [...document.querySelectorAll('dialog .ss-ct-row b')].some(b => b.textContent.includes('♥ Leon ♥'));
  const m = window.__st.chat.at(-1); m.swipe_id = 1; m.swipes.push('다른 답'); m.send_date = String(Date.now());
  const { eventSource, event_types } = window.SillyTavern.getContext(); seq([]); await eventSource.emit(event_types.MESSAGE_SWIPED, window.__st.chat.length - 1); await w(800);
  out.swipeGone = md().length === 0 && !getMeta()?.story?.nick?.Leon;
  // ③ 지우지 않은 답의 손대기는 남는다
  await window.__addUser('셋'); await window.__addAI('답 3'); seq([0.01, 0.01, 0.01, 0.01]); await w(700);
  await window.__addUser('넷'); await window.__addAI('답 4'); seq([]); await w(700);
  out.keepsOld = md().length === 1;
  delete app.__meddleRand;
  return out;
});
for (const [k, v] of Object.entries(r)) check(v === true, k);
check(!logs.some(l => /error/i.test(l)), '오류 없음', logs.filter(l => /error/i.test(l)).slice(0, 2).join(' | '));
await close();
