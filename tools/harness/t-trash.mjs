// 🧪 본거지 쓰레기통 (검수): 버리기 → AI에게 「이제 없음」 · 되살리기 · 완전 삭제 → AI에게도 안 알림 (예전엔 지운 뒤에도 「이제 없음」 줄에 남았다)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
  await makeStatus(page, ['profile', 'stats', 'wallet', 'home', 'calendar']);
  const r = await page.evaluate(async () => {
    const eng = await import('/ext/src/engine.js'), core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current.state;
    const say = async (b) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${b}\n</meatball>`); await wait(200); };
    const inj = () => { const i = eng.buildInjection(app.current); return `${i.main}`; };
    core.settings().deltaMode = false; core.saveSettings();
    await say('decor: +저주받은 인형');
    const has = () => (st().data.home?.storage ?? []).includes('저주받은 인형');
    const inTrash = () => !!(st().data.home?.trash ?? []).find(t => t.name === '저주받은 인형');
    const out = { start: has() };
    await eng.addAdjust({ ops: [['_trash', '저주받은 인형']], label: '버림' }); await wait(200);
    out.trashed = { bag: has(), trash: inTrash(), aiGone: /저주받은 인형/.test(inj()) };
    await eng.addAdjust({ ops: [['_restore', '저주받은 인형']], label: '되살림' }); await wait(200);
    out.restored = { bag: has(), trash: inTrash() };
    await eng.addAdjust({ ops: [['_trash', '저주받은 인형']], label: '버림' }); await wait(200);
    window.__autoPopup = 'ok';
    const ok = await eng.purgeTrash(['저주받은 인형']); await wait(300); app.refreshNow(); await wait(100);
    out.line = inj().split('\n').filter(l => /저주받은 인형/.test(l)); out.purged = { ok, bag: has(), trash: inTrash(), aiMention: /저주받은 인형/.test(inj()), adjustMention: JSON.stringify(core.getMeta().adjust).includes('저주받은 인형') };
    return out;
  });
  check(r.start && !r.trashed.bag && r.trashed.trash && r.trashed.aiGone, '버리면 창고에서 쓰레기통으로 · AI에게 「이제 없음」', JSON.stringify(r.trashed));
  check(r.restored.bag && !r.restored.trash, '되살리면 창고로', JSON.stringify(r.restored));
  check(r.purged.ok && !r.purged.bag && !r.purged.trash && !r.purged.aiMention, '완전 삭제: 어디에도 없고 AI에게도 안 알림', JSON.stringify(r.purged));
  const pe = logs.filter(l => /pageerror|TypeError/.test(l)); check(!pe.length, 'no page errors', pe.join('\n').slice(0, 300));
} finally { await close(); }
