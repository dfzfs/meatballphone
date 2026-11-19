// 📚 설정집이 읽을 곳: 고르는 화면 · 연결된 로어북 기본 켜짐 · 고른 것만 · 잘라 내지 않고 전부 · 채팅마다 기억
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    const LONG = '현대 AU: 모두 대학생이고 배는 없다. '.repeat(200) + '끝표시XYZ';
    await page.evaluate((LONG) => {
        const c = SillyTavern.getContext();
        c.chatMetadata.world_info = 'AU설정';
        c.loadWorldInfo = async (n) => n === 'AU설정' ? { entries: { 1: { uid: 1, key: ['세계'], content: LONG, constant: true }, 2: { uid: 2, key: ['꺼짐'], content: '안읽혀야함', disable: true } } }
            : n === '다른책' ? { entries: { 1: { uid: 1, key: ['원작'], content: '써니호가 있다' } } } : null;
        window.__ai = (p) => { window.__lastPrompt = p; return JSON.stringify({ world: { genre: '현대', currency: '원', meal: 9000, places: [{ name: '집', kind: 'home' }] }, me: { name: '나' }, people: [{ name: 'Law', aka: ['트라팔가 로'] }] }); };
    }, LONG);
    await page.evaluate(async () => { const m = await import('/ext/src/rules/ai.js'); window.__list = (await m.sourceList()).map(x => `${x.id}:${x.on ? 1 : 0}`); });
    // 실리태번에 있는 다른 로어북(world_names)도 고를 수 있어야 함 — 시험장엔 world-info.js가 없으니 목록 함수에 직접 넣어 봄
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('Law가 손을 흔들었다.')); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="mk-ai"]').click()); await sleep(500);
    const ui = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.ml-src-cb')].map(c => `${c.dataset.id}:${c.checked ? 1 : 0}`), sum: document.querySelector('.ml-src-sum')?.textContent }));
    check(ui.rows.includes('card:1') && ui.rows.includes('first:1') && ui.rows.includes('wi:AU설정:1'), '고르는 화면: 카드 · 첫 메시지 · 연결된 로어북 켜짐', ui.rows.join(' '));
    check(/약 [\d,]+토큰/.test(ui.sum ?? ''), '고른 양 · 토큰 어림', ui.sum);
    await page.evaluate(() => { const c = [...document.querySelectorAll('.ml-src-cb')].find(x => x.dataset.id === 'persona'); if (c) c.checked = false; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(1200);
    const p = await page.evaluate(() => window.__lastPrompt ?? '');
    check(p.includes('끝표시XYZ') && p.length > 4400, '로어북 항목을 잘라 내지 않고 전부 읽음', String(p.length));
    check(!p.includes('안읽혀야함') && !p.includes('써니호') && !p.includes('[USER'), '꺼진 항목 · 안 고른 로어북 · 끈 페르소나는 안 읽음');
    const saved = await page.evaluate(async () => (await import('/ext/src/base/st.js')).getMeta().srcPick);
    check(Array.isArray(saved) && saved.includes('wi:AU설정') && !saved.includes('persona'), '고른 것을 채팅에 기억', JSON.stringify(saved));
    check(!logs.some((l) => /error/i.test(l) && !/404/.test(l)), '오류 없음 (시험장엔 world-info.js가 없어 404만)', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
