// 🧵 실타래: 저장 0 · 시간 줄 읽기 · 빈 선물/행동 · 인물/장소/하루/가계부/통계 묶기 · 화면이 오류 없이 열림
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 390, height: 844 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const turns = [
        ['시장 가자', 'loc: 시장\nwith: Leon\nact: Leon | 칭찬\nbuy: 빵 | 3\nate: 빵\nbgm: Lovers Rock - TV Girl | 설렘 | 장보기'],
        ['선물', 'gift: Leon\nact: Leon\ntime: 밤 11시'],
        ['자자', 'loc: 집\nslept: 8h\nstatus: 감기 | 1d'],
        ['일하자', 'worked: 4h | +40\ntime: 2시간 후\nwith: Leon\nnpc: Mia | 꽃집 주인 | 🦊'],
        ['또 시장', 'loc: 시장\nwith: Leon, Mia\naff: Leon +8 | 고백\nearn: 10 | 용돈'],
    ];
    const meta0 = await page.evaluate(() => JSON.stringify(SillyTavern.getContext().chatMetadata).length);
    for (const [u, a] of turns) { await page.evaluate((u) => window.__addUser(u), u); await page.evaluate((a) => window.__addAI(`…\n<meatball>\n${a}\n</meatball>`), a); await sleep(250); }
    const r = await page.evaluate(async () => {
        const T = await import('/ext/src/rules/thread.js'), { fold } = await import('/ext/src/rules/engine.js'), u = await import('/ext/src/base/util.js');
        const R = fold(), F = T.personFirsts(R, 'Leon'), P = T.placeLife(R, '시장'), G = T.ledger(R), S = T.stats(R);
        const gift = R.changes.flat().filter(c => c.f === 'rel.Leon.aff').map(c => c.why);
        return { at: R.at.length === window.__st.chat.length, meet: F.meet, together: F.together, songs: F.songs.length, visits: P.visits, ppl: [...P.ppl.keys()], spend: G.spend, earn: G.earn, turns: S.turns,
            album: T.album(R).length, gift, clock: [u.clockOf('밤 11시'), u.clockOf('저녁 7시'), u.clockOf('2시간 후'), u.clockOf('midnight'), u.clockOf('11 PM'), u.clockOf('새벽 3시 반')] };
    });
    console.log(JSON.stringify(r));
    check(r.at, '메시지마다 그때 장소 · 시각 (메모리)');
    check(JSON.stringify(r.clock) === JSON.stringify([1380, 1140, null, 0, 1380, 210]), '시간 줄 읽기 (밤 · 저녁 · 후 · midnight · PM · 반)', JSON.stringify(r.clock));
    check(!r.gift.some(w => w.includes('취향 저격')) && r.gift.length === 2 && r.gift[0] === '🎁 선물', '빈 선물은 취향 판정 안 함 · 빈 행동은 건너뜀', JSON.stringify(r.gift));
    check(r.meet === 1 && r.together >= 3 && r.songs === 1, '인물: 처음 만남 · 함께한 답 · 같이 들은 곡');
    check(r.visits === 2 && r.ppl.includes('Mia'), '장소: 두 번 옴 · 여기서 만난 사람');
    check(r.spend === 3 && r.earn === 50, '가계부: 쓴 돈 · 들어온 돈');
    check(r.turns === 5 && r.album >= 1, '통계 · 앨범');
    // 화면: 모든 새 칸이 오류 없이 열림
    for (const [tab, fn] of [['rec', null], ['bag', null], ['map', null], ['cal', null], ['home', null], ['now', null], ['dice', null], ['news', null]]) { await page.evaluate((t) => __ML__.app.openSheet(t), tab); await sleep(120); if (fn) await page.evaluate(fn); }
    for (const v of ['album', 'days', 'stats', 'line']) { await page.evaluate((v) => document.querySelector(`#ml-full .ml-seg[data-seg="v:rec"] button[data-v="${v}"]`)?.click(), v); await sleep(100); }
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(150);
    await page.evaluate(() => document.querySelector('#ml-full [data-act="person"]').click()); await sleep(150);
    const sheet = await page.evaluate(() => document.querySelector('.ml-bs')?.textContent ?? '');
    check(/처음 만남/.test(sheet) && /연표/.test(sheet) && /같이 들은 곡/.test(sheet), '인물 시트: 처음 · 연표 · 같이 들은 곡');
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="th-dday"]').click()); await sleep(150);
    const dd = await page.evaluate(() => SillyTavern.getContext().chatMetadata.meatlite?.cal?.dday?.length ?? -1);
    check(dd === 1, '📌 D-day로 → 달력 D-day 한 줄', String(dd));
    // 저장 0: 메타가 D-day 한 줄 말고는 실타래 때문에 커지지 않음 (가볍게 확인: at 같은 칸이 메타에 없음)
    const meta = await page.evaluate(() => JSON.stringify(SillyTavern.getContext().chatMetadata));
    check(!/"at":\[|visits|personFirsts/.test(meta), '채팅 메타에 실타래 데이터 없음', String(meta.length - meta0));
    const errs = await page.evaluate(() => window.__errors);
    check(!errs.length && !logs.some(l => /pageerror|error/.test(l)), '콘솔 오류 없음', [...errs, ...logs].join('\n'));
} finally { await close(); }
