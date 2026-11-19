// 🎵 📜 AI가 고르는 음악 · 구절: B는 분류 1회에 같이 · A는 본편 줄 · 곡 3개 · 다른 구절 · 지난 목록 · 열 곳 · 알림 · 취향
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const settle = () => page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); for (let k = 0; k < 100 && !c.idle(); k++) await new Promise(r => setTimeout(r, 30)); await new Promise(r => setTimeout(r, 80)); });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.mods.music = true; m.mods.quote = true; m.musicTaste = '시티팝';
        st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash';
        window.__cls = (p) => { const j = JSON.parse(p), sys = j[0].content, user = j[1].content;
            if (/Suggest 3 REAL/.test(sys)) return '{"songs":[{"title":"Plastic Love","artist":"Mariya Takeuchi","mood":"그리움","why":"밤거리"},{"title":"Stay With Me","artist":"Miki Matsubara","mood":"아련","why":"이별"},{"title":"Ride on Time","artist":"Tatsuro Yamashita","mood":"설렘","why":"출발"}]}';
            if (/Pick ONE short line/.test(sys)) { window.__qUser = user; return '{"text":"Carpe diem","src":"호라티우스 · 로마","mean":"오늘을 붙잡아라","why":"지금 고백할 때"}'; }
            window.__clsUser = user;
            return '<meatball>\nbgm: 비와 당신 - 럼블피쉬 | 쓸쓸함 | 비 오는 이별 장면\nquote: 비 온 뒤에 땅이 굳어진다 | 한국 속담 | | 다툰 뒤 더 가까워짐\n</meatball>'; };
        __ML__.app.refresh(true);
    });
    await page.evaluate(() => window.__addUser('비가 온다')); await page.evaluate(() => window.__addAI('비 오는 밤. 둘은 말없이 걸었다.')); await settle();
    const s = await page.evaluate(() => { const S = __ML__.fold().S; return { bgm: S.bgm, quote: S.quote }; });
    check(s.bgm?.title === '비와 당신' && s.bgm.artist === '럼블피쉬' && s.bgm.mood === '쓸쓸함' && s.quote?.text.startsWith('비 온 뒤에') && s.quote.src === '한국 속담', 'B: 분류 1회에 곡 · 구절 같이 받음', JSON.stringify(s));
    check(await page.evaluate(() => /\[NOW\][^\n]*taste 시티팝/.test(window.__clsUser) && /bgm: 곡 제목/.test(window.__clsUser) && /노래 가사는 안 됨/.test(window.__clsUser)), '분류 입력: 지금 곡 · 구절 · 취향 · bgm/quote 키(가사 금지)');
    check(await page.evaluate(() => (window.__sent ?? []).filter(x => x.id === 'p-flash').length) === 1, '추가 호출 없음 (같은 1회)');
    await sleep(400); check(await page.evaluate(() => [...document.querySelectorAll('.ml-toast')].some(t => t.textContent.includes('비와 당신'))), '곡이 바뀌면 작은 알림');
    // 음악 앱: 지금 곡 · 열 곳 4 · 곡 3개 → 고르기
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(200);
    const mv = await page.evaluate(() => ({ t: document.querySelector('.ml-body').textContent, apps: document.querySelectorAll('[data-act="musicapp"]').length, href: document.querySelector('.ml-song a.ml-play')?.href }));
    check(mv.t.includes('비와 당신') && mv.apps === 4 && /youtube\.com\/results\?search_query=.*%EB%B9%84/.test(mv.href), '음악 앱: 지금 곡 · ▶ 열 곳 4개(유튜브 · 유튜브 뮤직 · 스포티파이 · 멜론)', JSON.stringify(mv));
    await page.evaluate(() => document.querySelector('[data-act="musicapp"][data-v="melon"]').click()); await sleep(150);
    check(await page.evaluate(() => /melon\.com/.test(document.querySelector('.ml-song a.ml-play')?.href ?? '')), '멜론으로 바꾸면 ▶가 멜론');
    await page.evaluate(() => document.querySelector('[data-act="song3"]').click()); await sleep(500);
    check(await page.evaluate(() => document.querySelectorAll('.ml-bs [data-song]').length) === 3, '「곡 3개」 (AI 1회)');
    await page.evaluate(() => document.querySelector('.ml-bs [data-song="0"]').click()); await sleep(400);
    check(await page.evaluate(() => __ML__.fold().S.bgm?.title) === 'Plastic Love', '하나 고르면 지금 곡으로');
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(200);
    check(await page.evaluate(() => [...document.querySelectorAll('.ml-body [data-act="jump"]')].some(x => x.textContent.includes('비와 당신'))), '지난 곡 목록 (누르면 그 답으로)');
    // 한 구절: 「AI가 고름」 · 다른 구절 → 최근 10개를 피하게 넘김
    await page.evaluate(() => __ML__.app.openSheet('quote')); await sleep(200);
    check(await page.evaluate(() => document.querySelector('.ml-qcard')?.textContent.includes('AI가 고름')), '구절 · 출처 옆 「AI가 고름」');
    await page.evaluate(() => document.querySelector('[data-act="quote-new"]').click()); await sleep(500);
    const q2 = await page.evaluate(() => ({ q: __ML__.fold().S.quote, u: window.__qUser }));
    check(q2.q?.text === 'Carpe diem' && q2.q.mean === '오늘을 붙잡아라' && /Avoid[^\n]*비 온 뒤에/.test(q2.u), '「다른 구절」: 외국어면 원문 + 뜻 · 최근 구절은 피하게', JSON.stringify(q2.q));
    // A 모드: 본편 적는 법에 bgm · quote 줄
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().mode = 'A'; __ML__.inject(); });
    const rule = await page.evaluate(() => window.__prompts.meatlite_rule?.value ?? '');
    check(/bgm: 곡 제목 - 가수/.test(rule) && /quote: 구절 원문/.test(rule) && /가사 금지/.test(rule) && /피할 것: [^\n]*Carpe/.test(rule), 'A: 본편 적는 법에 bgm · quote (가사 금지 · 최근 구절 피함)');
    await page.evaluate(() => window.__addAI('…\n<meatball>\nbgm: Moon River - Audrey Hepburn | 잔잔함 | 창가\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => __ML__.fold().S.bgm?.title) === 'Moon River', 'A: 본편 줄로 곡이 바뀜');
    // 리롤: 그 스와이프의 것이라 다른 글로 리롤하면 앞 곡으로
    await page.evaluate(() => window.__swipe('…')); await sleep(300);
    check(await page.evaluate(() => __ML__.fold().S.bgm?.title) === 'Plastic Love', '리롤하면 그 답의 곡은 빠짐 (메시지 · 스와이프 칸에 저장)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
