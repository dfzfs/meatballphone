// 🟰 「기본 6칸만 켠 채」 같은 이야기를 돌린 뒤의 모습을 한 덩어리 글로 찍는다 — 두 판을 비교할 때 쓴다 (run-all엔 안 들어감)
//   node tools/harness/ab-same.mjs > /tmp/new.json ; EXT_DIR=<비교할 판 폴더> node tools/harness/ab-same.mjs > /tmp/old.json ; diff /tmp/old.json /tmp/new.json
// 찍는 것: AI에게 가는 글 전부 · 계산된 상태 · 답마다의 칩 · 채팅에 저장된 것 · 프롬프트 목록 · 그래프 · 탭마다의 화면 · 불러온 파일 목록
import { open, makeStatus } from './lib.mjs';
const { page, close } = await open({ defaults: process.env.DEFAULTS === '1' });
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar']);
    const out = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const shell = await import('/ext/src/shell.js'); const pr = await import('/ext/src/prompts.js'); const trend = await import('/ext/src/trend.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const turns = ['stat: 체력 -12\ncash: +150\naff: Leon +8\ntrust: Leon +3', 'item: +낡은 지도 1\ncash: -40\naff: Mira +5\nweather: 비', 'days: +1\naff: Leon -4\nstat: 체력 +5', 'cash: +20\naff: Mira +12\ntrust: Mira +6\ndays: +1'];
        for (const [i, t] of turns.entries()) { await window.__addUser(`u${i}`); await window.__addAI(`이야기 ${i}\n<meatball>\n${t}\n</meatball>`); await wait(350); }
        app.refreshNow?.(); await wait(300);
        const scrub = (v) => JSON.parse(JSON.stringify(v ?? null, (k, x) => (['id', 't', 'at', 'seen', 'realAt'].includes(k) ? undefined : x)));
        const st = app.current.state, c = SillyTavern.getContext();
        const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return `${t.length}:${(h >>> 0).toString(16)}`; };
        const tabs = {}; // 탭마다 화면 글 전체의 지문 (시험 서버의 포트 번호만 빼고)
        shell.openSheet('home'); await wait(300);
        const el = [...shell.panels].find(p => p.isConnected);
        for (const tab of ['home', 'profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'manage']) { try { el._ss.tab = tab; el._ss.ui = {}; el._ss.mode = 'view'; app.renderPanel(el); await wait(200); tabs[tab] = hash(el.innerHTML.replace(/\s+/g, ' ').replace(/127\.0\.0\.1:\d+/g, 'HOST')); } catch (e) { tabs[tab] = `err ${e.message}`; } }
        const td = trend.trendData();
        return {
            prompts: Object.fromEntries(Object.entries(window.__prompts ?? {}).map(([k, v]) => [k, v?.value ?? ''])),
            state: scrub(st.data), days: scrub(st.days), turn: st.turn,
            chips: [...app.current.snaps.entries()].map(([i, s]) => [i, s.labels]),
            meta: scrub(Object.fromEntries(Object.entries(core.getMeta()).filter(([k]) => !['base'].includes(k)))),
            msgExtra: c.chat.map(m => scrub(m.extra?.statussim ?? null)),
            promptKeys: pr.PROMPT_DEFS.map(d => d.key),
            trend: { xs: td.xs, cash: td.cash, aff: td.aff, trust: td.trust }, trendHTML: hash(trend.trendHTML()),
            skill: (() => { const r = Math.random; Math.random = () => 0.5; const x = eng.skillRoll(st, '매력', 12); Math.random = r; return x; })(),
            tabs,
            newFiles: performance.getEntriesByType('resource').map(x => x.name.replace(/^.*\/ext\//, '')).filter(n => /src\/(addons|minihome|relgraph)\.js/.test(n)),
            appHooks: ['extraInject', 'gearBonus', 'rollBonus', 'giftAff', 'haggleDC', 'shopClosed', 'contactLore', 'mergeContactAsk', 'gbNudge', 'ilchon', 'ambient'].filter(k => app[k] !== undefined),
            newSettings: ['trendMore', 'mergeContact', 'gearOn', 'ambientOn', 'ambientShop', 'giftTaste', 'promiseClock', 'guestbook', 'guestbookAuto'].filter(k => core.settings()[k] === true),
        };
    });
    console.log(JSON.stringify(out, null, 1));
} finally { await close(); }
