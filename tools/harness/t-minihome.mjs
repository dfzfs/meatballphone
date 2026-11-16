// 📒 미니홈피 자료 (src/minihome.js · 화면 없음): 다이어리 · 연표 · 파도타기는 읽기만(AI 0회 · 저장 0) · 방명록은 끄면 흔적 없음, 켜면 누를 때 1회 · 자동은 이야기 속 하루에 1회까지
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'memo']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const mh = await import('/ext/src/minihome.js');
        await window.__SS_TEST__.api.app.loadAddons(true);
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {}, set = core.settings();
        let calls = 0; const ai0 = window.__ai; window.__ai = (p, sys) => { calls++; return '"들렀다 가.\n내일 봐."'; }; // 줄이 나뉘어 와도 이어 붙인다 (첫 줄만 집으면 글이 중간에서 끊겼음)
        const P4 = () => JSON.stringify(Object.fromEntries(Object.entries(window.__prompts ?? {}).map(([k, v]) => [k, v?.value ?? ''])));
        // ── 끈 채로: 아무것도 안 남는다 ──
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ncash: +100\n</meatball>'); await wait(300);
        out.offNoWrite = (await mh.gbWrite('Leon')) === null && (await mh.gbTick()) === null && !core.getMeta().gbook && calls === 0;
        // ── 📔 다이어리: 오늘(안 끝난 하루) → 날짜를 넘기면 지난 하루로 ──
        const d0 = mh.diaryEntries();
        out.today = d0.length >= 1 && d0[0].today === true && d0[0].aff.some(([n, v]) => n === 'Leon' && v === 30) && d0[0].cash === 100 && d0[0].mood === 'good';
        await window.__addUser('next'); await window.__addAI('s\n<meatball>\ndays: +1\naff: Leon -12\n</meatball>'); await wait(300);
        const d1 = mh.diaryEntries(), past = d1.find(e => !e.today);
        out.closed = !!past && past.aff.some(([n, v]) => n === 'Leon' && v === 30) && past.n >= 1 && typeof past.kinds === 'object';
        out.todayBad = d1[0].today === true && d1[0].mood === 'bad' && d1[0].aff.some(([n, v]) => n === 'Leon' && v === -12);
        out.sameAsRecord = JSON.stringify(mh.diaryEntries(st(), { withToday: false }).map(e => e.date)) === JSON.stringify([...(st().days ?? [])].reverse().map(x => x.date));
        out.kinds = mh.labelKind('💞 Leon: 친구') === 'love' && mh.labelKind('📜 완료: 등대') === 'quest' && mh.labelKind('🏆 첫 걸음') === 'ach' && mh.labelKind('아무 글') === 'etc' && mh.isMilestone('📜 등대: 완료') && !mh.isMilestone('📜 등대: ✔ 열쇠 찾기');
        out.timeline = Array.isArray(mh.timeline()) && mh.timeline().every(x => x.date !== undefined && x.label && x.kind);
        // ── 🌊 파도타기 ──
        const v = mh.visitable(), pg = mh.personPage('leon');
        out.visit = v.some(x => x.name === 'Leon') && v.every(x => x.name);
        out.page = !!pg && pg.name === 'Leon' && pg.rel.aff === 18 && Array.isArray(pg.sns) && Array.isArray(pg.pairs) && Array.isArray(pg.recent) && pg.recent.some(x => x.delta === -12 && x.today) && pg.recent.some(x => x.delta === 30 && !x.today);
        out.pageNone = mh.personPage('없는사람') === null && mh.personPage('constructor') === null && mh.personPage('') === null;
        out.readOnly = calls === 0 && !core.getMeta().gbook;
        const t0 = performance.now(); for (let i = 0; i < 200; i++) { mh.diaryEntries(); mh.timeline(); mh.personPage('Leon'); } out._ms = +((performance.now() - t0) / 200).toFixed(3);
        const injBefore = P4();
        // ── 📝 방명록 켜기: 누를 때 1회 ──
        set.guestbook = true;
        const e1 = await mh.gbWrite('Leon');
        out.write = !!e1 && e1.who === 'Leon' && e1.text === '들렀다 가. 내일 봐.' && calls === 1 && mh.gbList().length === 1 && mh.gbUnread() === 1;
        app.refreshNow?.(); await wait(200);
        out.writeNoInject = P4() === injBefore; // 방명록은 본편 AI에게 가는 글을 글자 하나 안 바꾼다
        out.pick = (() => { const a = mh.gbPick(st(), () => 0), b = mh.gbPick(st(), () => 0.999); return !!a && !!b && a !== 'Leon' && b !== 'Leon'; })(); // 방금 쓴 사람은 한 번 쉰다
        const tr0 = st().data.rel.user.find(x => x.name === 'Leon').trust;
        out.reply = mh.gbReply(e1.id, '고마워') && mh.gbList()[0].reply === '고마워' && calls === 1;
        await wait(400); mh.gbReply(e1.id, '또 고마워'); await wait(400);
        out.replyTrust = st().data.rel.user.find(x => x.name === 'Leon').trust === tr0 + 1; // 글마다 한 번만 우정 +1
        mh.gbSeen(); out.seen = mh.gbUnread() === 0;
        out.inPage = mh.personPage('Leon').guestbook.length === 1;
        app.refreshNow?.(); await wait(200);
        out.notInjected = !P4().includes('들렀다 가') && !P4().includes('또 고마워');
        // ── 자동: 켠 날은 세기만 · 같은 날 0회 · 날이 넘어가면 1회 · 바로 또 넘겨도(3분 안) 0회 ──
        out.autoOff = (await mh.gbTick()) === null && calls === 1;
        set.guestbookAuto = true;
        out.autoFirst = (await mh.gbTick()) === null && calls === 1 && Number.isFinite(core.getMeta().gbook.day);
        out.autoSameDay = (await mh.gbTick()) === null && calls === 1;
        await window.__addUser('n2'); await window.__addAI('s\n<meatball>\ndays: +1\n</meatball>'); await wait(1200);
        out.autoNextDay = calls === 2 && mh.gbList().length === 2 && mh.gbList()[0].auto === true;
        await window.__addUser('n3'); await window.__addAI('s\n<meatball>\ndays: +1\n</meatball>'); await wait(1200);
        out.autoGap = calls === 2;
        // ── 지우기 · 비우기 · 다시 끄기 ──
        out.del = mh.gbDelete(e1.id) && mh.gbList().length === 1 && !mh.gbDelete('nope');
        out.clear = mh.gbClear() && !core.getMeta().gbook && mh.gbList().length === 0;
        set.guestbook = false; set.guestbookAuto = false;
        out.offAgain = (await mh.gbWrite('Leon')) === null && !core.getMeta().gbook && calls === 2;
        window.__ai = ai0;
        return out;
    });
    console.log(`  · 다이어리+연표+파도타기 한 번: ${r._ms}ms`); delete r._ms;
    for (const [k, v] of Object.entries(r)) check(v === true, `minihome ${k}`, v === true ? '' : JSON.stringify(v));
    check(!logs.some(l => /error/i.test(l) && !/favicon/.test(l)), 'minihome: 콘솔 오류 없음', logs.filter(l => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
