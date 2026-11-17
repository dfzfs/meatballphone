// 🧪 깨진 저장 자료 (검수): 손으로 고친 파일 · 다른 확장 · 옛 판 때문에 모양이 어긋난 칸이 있어도 계산 · 화면이 멈추지 않는다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
  const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
  await makeStatus(page, all);
  await page.evaluate((x) => window.__addUser(x), 'u'); await page.evaluate((x) => window.__addAI(x), 'ok\n<meatball>\ncash: +5\naff: Leon +1\n</meatball>'); await sleep(400);
  const r = await page.evaluate(async () => {
    const core = await import('/ext/src/core.js'), app = window.__SS_TEST__.api.app;
    const good = JSON.stringify(window.__st.chatMetadata.statussim);
    const junks = { adjust: [null, 'x', 5, [{}], [{ ops: 'x' }], [{ ops: [[null, null]], at: 'x' }], [{ set: { mod: 'nope', data: 1 } }], [{ set: { mod: 'wallet', data: null }, at: -5 }]],
      mods: [null, 'x', [], { wallet: 'yes' }], startAt: [-5, 'x', 1e9, null], base: [{ core: null, data: null }, { core: {}, data: { wallet: 'x' } }, { data: { rel: { user: 'x' } } }],
      saves: ['x', [null]], notes: ['x', [null, 5]], album: [{}], difficulty: ['nope', 5], play: ['x', { mode: 'nope' }], simple: ['x'], life: ['x', { needs: 'x' }], tr: ['x', [1]], mapStyle: ['x', { pos: 'x' }], mapPins: ['x'], dolls: ['x'], auto: ['x', { tpl: 'x' }] };
    const out = [];
    for (const [k, vals] of Object.entries(junks)) for (const v of vals) {
      const m = JSON.parse(good); m[k] = v; window.__st.chatMetadata.statussim = m;
      const n0 = core.errLog.length; let threw = '';
      try { core.ctxReset?.(); core.rev.n++; app.refreshNow(); window.__SS_TEST__.api.app.rerenderPanels?.(true); } catch (e) { threw = e.message; }
      try { document.querySelectorAll('dialog').forEach(d => { try { d.close(); } catch {} d.remove(); }); app.openSheet('home'); await new Promise(r => setTimeout(r, 120)); app.openSheet('manage'); await new Promise(r => setTimeout(r, 120)); } catch (e) { threw ||= 'open ' + e.message; }
      const errs = core.errLog.slice(n0).filter(e => e.level !== 'note').map(e => e.text.split('\n')[0].slice(0, 120));
      if (threw || errs.length) out.push(`${k}=${JSON.stringify(v).slice(0, 50)} → ${threw} ${errs.slice(0, 2).join(' | ')}`);
    }
    window.__st.chatMetadata.statussim = JSON.parse(good);
    return out;
  });
  check(!r.length, '깨진 자료 30가지에도 계산 · 화면이 멈추지 않음', r.join('\n').slice(0, 800));
  const pe = logs.filter(l => /pageerror/.test(l)); check(!pe.length, 'no page errors', pe.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
