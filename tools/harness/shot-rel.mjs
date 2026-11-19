// 관계 탭: dev와 나란히 볼 화면 (인물 둘 · 사건 몇 개)
import { open, sleep } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); const L = m.book.people[0]; Object.assign(L, { line: '도시 경비대 기사 · 무뚝뚝하지만 다정함', face: '🛡️', up: [{ act: '칭찬', d: 3 }, { act: '도와줌', d: 4 }], down: [{ act: '거짓말', d: -5 }], likes: ['꽃', '단검'], hates: ['담배'], signs: [{ at: 20, text: '눈을 마주치면 헛기침' }], routine: [{ at: '낮', place: '시장' }], day: '10월 6일 생일', want: '동맹의 무사 항해' }); m.book.people.push({ name: 'Mia', aka: [], face: '🦊', line: '시장 꽃집 주인 · 장난스러움', start: { aff: 30, trust: 45 }, up: [], down: [], signs: [], syn: [], haunt: ['시장'], routine: [], likes: [], hates: [], day: '', want: '', noLove: false }); st.saveMeta(); });
    await page.evaluate(() => window.__addUser('시장 가자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nwith: Leon, Mia\nact: Leon | 칭찬\ngift: Leon | 꽃\nmemory: Leon | 처음으로 웃어 줌\njealous: Mia | Leon에게만 꽃을 줌\n</meatball>'));
    await sleep(400);
    for (const [w, h, tag] of [[1300, 900, 'pc'], [390, 844, 'ph']]) {
        await page.setViewportSize({ width: w, height: h }); await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(200);
        await page.screenshot({ path: `/tmp/n-rel-${tag}.png` });
    }
    await page.setViewportSize({ width: 1300, height: 900 });
    await page.evaluate(() => document.querySelector('#ml-full [data-act="person"]').click()); await sleep(200);
    await page.screenshot({ path: '/tmp/n-rel-more.png' });
    await page.evaluate(() => document.querySelector('.ml-bs [data-bs="x"]').click());
    await page.setViewportSize({ width: 1440, height: 900 }); await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(200); await page.screenshot({ path: '/tmp/n-rel-laptop.png' });
} finally { await close(); }
