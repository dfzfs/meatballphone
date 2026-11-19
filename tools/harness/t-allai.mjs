// ✏️ 편집 · ✨ AI로 수정이 모든 앱 + 설정집에 · 음악 · 구절 · 설정집 AI 수정이 실제로 반영
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const say = async (t) => { await page.evaluate((t) => { document.querySelector('.ml-bs textarea, .ml-bs [id^="mlf-say"]').value = t; document.querySelector('.ml-bs [data-bs="ok"]').click(); }, t); await sleep(400); };
const ok = async () => { await page.evaluate(() => document.querySelector('.ml-bs [data-bs="ok"]').click()); await sleep(400); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>')); await sleep(300);
    // 앱 전부 켜기
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); for (const k of ['stats', 'wallet', 'rel', 'map', 'calendar', 'dice', 'news', 'record', 'music', 'quote', 'mind', 'custom', 'traits']) (m.mods ??= {})[k] = true; st.saveMeta(); });
    const apps = ['now', 'dice', 'bag', 'rel', 'map', 'cal', 'news', 'music', 'quote', 'rec', 'mind', 'traits', 'custom'];
    const miss = [];
    for (const a of apps) {
        await page.evaluate((a) => __ML__.app.openSheet(a), a); await sleep(120);
        const r = await page.evaluate(() => ({ e: !!document.querySelector('.ml-tools2 [data-act="t-edit"]'), ai: !!document.querySelector('.ml-tools2 [data-act="t-ai"]') }));
        if (!r.e || !r.ai) miss.push(`${a}${r.e ? '' : ' 편집'}${r.ai ? '' : ' AI'}`);
    }
    check(!miss.length, `앱 ${apps.length}개 모두 ✏️ 편집 · ✨ AI로 수정`, miss.join(', '));
    await page.evaluate(() => __ML__.app.openSheet('book')); await sleep(150);
    check(await page.evaluate(() => !!document.querySelector('.ml-body [data-act="t-ai"][data-v="book"]')), '설정집에도 ✨ AI로 수정');

    // 음악: AI로 수정 → bgm 줄
    await page.evaluate(() => { window.__ai = (p) => { window.__aiP = p; return '<meatball>\nbgm: 봄날 - BTS | 그리움 | 잔잔하게\n</meatball>'; }; });
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-ai"]').click()); await sleep(200);
    await say('잔잔한 곡으로 바꿔 줘'); await ok();
    check(await page.evaluate(() => __ML__.fold().S.bgm?.title) === '봄날' && await page.evaluate(() => /now song|no song/.test(window.__aiP)), '음악 AI로 수정 → 지금 곡 바뀜 (지금 곡 정보를 넘김)');
    // 구절: 직접 편집
    await page.evaluate(() => __ML__.app.openSheet('quote')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-edit"]').click()); await sleep(200);
    await page.evaluate(() => { document.querySelector('#mlf-text').value = '천 리 길도 한 걸음부터'; document.querySelector('#mlf-src').value = '한국 속담'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(400);
    check(await page.evaluate(() => __ML__.fold().S.quote?.text) === '천 리 길도 한 걸음부터', '구절 ✏️ 편집 → 직접 고친 구절');
    // 음악: 직접 편집
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-edit"]').click()); await sleep(200);
    await page.evaluate(() => { document.querySelector('#mlf-title').value = 'Hype Boy'; document.querySelector('#mlf-artist').value = 'NewJeans'; document.querySelector('.ml-bs [data-bs="ok"]').click(); }); await sleep(400);
    check(await page.evaluate(() => __ML__.fold().S.bgm?.title) === 'Hype Boy', '음악 ✏️ 편집 → 직접 고친 곡');
    // 설정집: AI로 수정 → 세계 장르 바뀜 (설정집 조각)
    await page.evaluate(() => { window.__ai = () => '```json\n{"world":{"genre":"판타지"}}\n```'; });
    await page.evaluate(() => __ML__.app.openSheet('book')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-body [data-act="t-ai"][data-v="book"]').click()); await sleep(200);
    await say('판타지로 바꿔 줘'); await ok();
    check(await page.evaluate(async () => (await import('/ext/src/base/st.js')).getMeta().book.world.genre) === '판타지', '설정집 AI로 수정 → 세계 장르 바뀜');
    // 수치 앱에서 people 조각은 무시 (범위 밖)
    await page.evaluate(() => { window.__ai = () => '```json\n{"people":[]}\n```'; });
    await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-ai"]').click()); await sleep(200);
    await say('인물 다 지워'); await sleep(200);
    check(await page.evaluate(async () => (await import('/ext/src/base/st.js')).getMeta().book.people.length > 0 && !document.querySelector('.ml-bs [data-bs="ok"]')), '앱 범위 밖 설정집 조각은 버림 (수치 앱이 인물을 못 지움)');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
