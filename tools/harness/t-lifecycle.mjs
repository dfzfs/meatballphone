// 🧪 저장 · 옮기기 흐름 (검수 · 예전엔 결과를 보는 시험이 없었다): 세이브 슬롯 · 전체 백업 → 되살리기 · 카드에 붙이기 → 새 채팅에서 불러오기 · 2회차
import { open, makeStatus, sleep, check } from './lib.mjs';
const run = async (mods, fn) => { const { page, logs, close } = await open(); try { await makeStatus(page, mods); const r = await page.evaluate(fn); const pe = logs.filter(l => /pageerror|TypeError/.test(l)); return { r, pe }; } finally { await close(); } };
const BASE = ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'contact', 'ach', 'memo'];
{ const { r, pe } = await run(BASE, async () => {
    const safe = await import('/ext/src/safe.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current.state;
    const say = async (b) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${b}\n</meatball>`); await wait(200); };
    window.__autoPopup = 'ok';
    await say('cash: +100\naff: Leon +5\nloc: 시장\nquest: 반지 | 새 | 찾기');
    const snap = () => JSON.stringify({ cash: st().data.wallet.cash, aff: st().data.rel.user.find(x => x.name === 'Leon')?.aff, here: st().data.map.here, q: st().data.quest.list.map(x => x.title + x.status), d: st().data.calendar.d });
    const before = snap();
    await safe.saveSlot(); await wait(300);
    const slot = core.getMeta().saves.filter(x => !x.auto).at(-1);
    await say('cash: +900\naff: Leon +40\nloc: 여관\nquest: 반지 | 완료\ndays: +3');
    const changed = snap();
    await safe.loadSlot(slot.id); await wait(500); app.refreshNow(); await wait(200);
    const after = snap();
    // 불러온 뒤 다음 답도 제대로 쌓이나
    await say('cash: +1');
    const next = st().data.wallet.cash;
    return { before, changed, after, next, slots: core.getMeta().saves.length };
  });
  check(r.after === r.before && r.changed !== r.before, '세이브 슬롯: 불러오면 그때 상태 그대로', JSON.stringify(r));
  check(r.next === JSON.parse(r.before).cash + 1, '세이브 슬롯: 불러온 뒤 다음 답도 쌓임', String(r.next));
  check(!pe.length, 'no page errors (슬롯)', pe.join('\n').slice(0, 300)); }
{ const { r, pe } = await run(BASE, async () => {
    const safe = await import('/ext/src/safe.js'), eng = await import('/ext/src/engine.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current.state;
    const say = async (b) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${b}\n</meatball>`); await wait(200); };
    window.__autoPopup = 'ok';
    await say('cash: +100\naff: Leon +5\nloc: 시장\nquest: 반지 | 새 | 찾기\nmsg: Leon | 안녕');
    await eng.addAdjust({ ops: [['cash', '+7']], label: '직접' }); await wait(200);
    const snap = () => JSON.stringify({ cash: st().data.wallet.cash, aff: st().data.rel.user.find(x => x.name === 'Leon')?.aff, here: st().data.map.here, q: st().data.quest.list.map(x => x.title + x.status), msgs: (st().data.contact.threads.Leon ?? []).length });
    const before = snap();
    // 백업 파일 잡기
    let file = null; const oc = URL.createObjectURL; URL.createObjectURL = (b) => { file = b; return oc.call(URL, b); };
    const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
    safe.fullBackup(); await wait(200);
    URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ac;
    const text = file ? await file.text() : null;
    // 바꾸기
    await say('cash: +900\naff: Leon +40\nloc: 여관\nquest: 반지 | 완료');
    await eng.addAdjust({ ops: [['cash', '+1000']], label: '직접2' }); await wait(200);
    const changed = snap();
    // 되살리기: 파일 고르기 창을 흉내
    const ce = document.createElement.bind(document);
    document.createElement = (tag, ...a) => { const el = ce(tag, ...a); if (String(tag).toLowerCase() === 'input') { Object.defineProperty(el, 'files', { value: [new File([text], 'b.json')] }); el.click = () => el.onchange?.(); } return el; };
    safe.restoreFile(eng.setBase); await wait(800);
    document.createElement = ce;
    app.refreshNow(); await wait(200);
    const after = snap();
    return { size: text?.length ?? 0, before, changed, after };
  });
  const b = JSON.parse(r.before), a = JSON.parse(r.after), c = JSON.parse(r.changed);
  check(r.size > 1000, '전체 백업 파일이 만들어짐', String(r.size));
  check(a.cash === c.cash - 1000 && a.aff === c.aff, '되살리기: 백업 뒤 직접 한 편집은 사라지고 · 그 뒤 AI 답은 다시 더해짐', JSON.stringify(r));
  check(!pe.length, 'no page errors (백업)', pe.join('\n').slice(0, 300)); }
{ const { r, pe } = await run(BASE, async () => {
    const safe = await import('/ext/src/safe.js'), eng = await import('/ext/src/engine.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current?.state;
    const ctx = SillyTavern.getContext(); const ch = ctx.characters[0]; ch.data ??= {}; ch.data.extensions ??= {};
    const orig = ctx.writeExtensionField; const c0 = SillyTavern.getContext;
    SillyTavern.getContext = () => ({ ...c0(), writeExtensionField: async (id, k, v) => { if (v === null) delete ch.data.extensions[k]; else ch.data.extensions[k] = structuredClone(v); } });
    core.ctxReset?.();
    const say = async (b) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${b}\n</meatball>`); await wait(200); };
    await say('cash: +100\naff: Leon +5\nloc: 시장\nquest: 반지 | 새 | 찾기');
    const snap = () => st() ? JSON.stringify({ cash: st().data.wallet.cash, aff: st().data.rel.user.find(x => x.name === 'Leon')?.aff ?? null, here: st().data.map.here, q: st().data.quest.list.map(x => x.title + x.status), mods: core.MOD_IDS.filter(id => core.modOn(id)).length }) : 'none';
    const now = snap();
    // 「지금 상태」로 붙이기 (창에서 두 번째 단추)
    window.__autoPopup = null;
    const p = safe.attachToCard(); await wait(300);
    const dlg = [...document.querySelectorAll('dialog[open]')].at(-1); dlg.querySelector('[data-v="now"]')?.click(); dlg.querySelector('.popup-button-ok').click(); await p; await wait(200);
    const packed = !!safe.cardPack();
    // 새 채팅 → 불러오기
    await window.__changeChat('new1'); await wait(300);
    window.__autoPopup = 'ok';
    await safe.offerCard(eng.setBase); await wait(500); app.refreshNow(); await wait(200);
    const loaded = snap();
    // 떼기
    await safe.detachFromCard(); await wait(200);
    SillyTavern.getContext = c0;
    return { now, packed, loaded, detached: !safe.cardPack() };
  });
  check(r.packed && r.loaded === r.now && r.detached, '카드에 붙이기 → 새 채팅에서 불러오기 → 떼기', JSON.stringify(r));
  check(!pe.length, 'no page errors (카드)', pe.join('\n').slice(0, 300)); }
{ const { r, pe } = await run(BASE, async () => {
    const safe = await import('/ext/src/safe.js'), eng = await import('/ext/src/engine.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current?.state;
    const say = async (b) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${b}\n</meatball>`); await wait(200); };
    const a0 = st().data.ach.list[0]?.name;
    await say(`cash: +1000\naff: Leon +40\ntrust: Leon +20\nitem: +전설의 검\nach: ${a0}\nloc: 시장`);
    window.__autoPopup = null;
    const p = safe.prepareCarry(); await wait(300);
    const dlg = [...document.querySelectorAll('dialog[open]')].at(-1);
    dlg.querySelectorAll('[data-c]').forEach(i => { i.checked = true; });
    dlg.querySelector('.popup-button-ok').click(); await p; await wait(200);
    await window.__changeChat('round2'); await wait(300);
    window.__autoPopup = 'ok';
    await safe.offerCard(eng.setBase); await wait(500); app.refreshNow(); await wait(200);
    const s = st();
    return s ? { round: core.getMeta()?.round, cash: s.data.wallet.cash, sword: !!s.data.wallet.items.find(i => i.name === '전설의 검'), aff: s.data.rel.user.find(x => x.name === 'Leon')?.aff, ach: s.data.ach.list.find(a => a.name === a0)?.done, memo: s.data.memo.list.some(m => /2회차/.test(m.text)), here: s.data.map.here, carryLeft: Object.keys(core.settings().carry ?? {}).length } : 'no state';
  });
  check(r.round === 2 && r.sword && r.ach && r.memo && r.carryLeft === 0 && r.aff === 20 && r.cash === 210 && r.here === '여관', '2회차: 돈 10% · 관계 절반 · 소지품 · 업적 · 메모 · 지도는 처음으로', JSON.stringify(r));
  check(!pe.length, 'no page errors (2회차)', pe.join('\n').slice(0, 300)); }
