// 지도: dev와 나란히 볼 화면 (장소 7곳 · 이어진 길 · 건물 층 · 루틴)
import { open, sleep } from './lib.mjs';
const { page, close } = await open({ width: 1440, height: 900 });
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%}' });
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), { normBook } = await import('/ext/src/rules/book.js'); const m = st.getMeta();
        m.book = normBook({ ...m.book, world: { ...m.book.world, places: [
            { name: '여관', kind: 'home', line: '빨강선', near: ['마을 광장'], rest: { energy: 25 }, floors: ['1층: 식당, 카운터', '2층: 내 방, 복도, 손님방', '지하: 창고'] },
            { name: '마을 광장', kind: 'street', line: '빨강선', near: ['시장', '모험가 길드', '신전'] },
            { name: '시장', kind: 'shop', line: '빨강선', near: ['마을 광장', '빵집'], goods: [{ name: '빵', price: 3, fx: { hunger: 20 } }, { name: '꽃', price: 5 }, { name: '단검', price: 40 }] },
            { name: '빵집', kind: 'food', near: ['시장'], goods: [{ name: '크림빵', price: 4, fx: { hunger: 25, mood: 3 } }, { name: '수프', price: 6, fx: { hunger: 35 } }] },
            { name: '모험가 길드', kind: 'work', line: '파랑선', near: ['마을 광장'], floors: ['1층: 접수처, 게시판', '2층: 길드장실'] },
            { name: '신전', kind: 'other', line: '파랑선', near: ['마을 광장', '목욕탕'], note: '아침마다 종이 울림' },
            { name: '목욕탕', kind: 'bath', near: ['신전'], goods: [{ name: '입욕', price: 4, fx: { hygiene: 70 } }] },
        ] } });
        const L = m.book.people[0]; Object.assign(L, { face: '🛡️', routine: [{ at: '아침', place: '모험가 길드' }, { at: '낮', place: '시장' }], haunt: ['모험가 길드'] });
        m.book.people.push({ ...L, name: 'Mia', face: '🦊', routine: [{ at: '낮', place: '빵집' }], haunt: ['빵집'], aka: [], up: [], down: [], signs: [], syn: [], likes: [], hates: [] });
        m.book.world.places[0].photo = (() => { const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 320, 200); gr.addColorStop(0, '#c9a27a'); gr.addColorStop(1, '#6d4c3d'); g.fillStyle = gr; g.fillRect(0, 0, 320, 200); return c.toDataURL('image/jpeg', .8); })();
        m.start = { cash: 50, loc: '여관' }; st.saveMeta();
    });
    await page.evaluate(() => window.__addUser('나가자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\ntime: 13:00\n</meatball>'));
    await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('map')); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100);
    await page.screenshot({ path: '/tmp/m-laptop.png' });
    await page.evaluate(() => document.querySelector('#ml-full .node[data-v="시장"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-body').scrollTo(0, 9999)); await sleep(100);
    await page.screenshot({ path: '/tmp/m-laptop-sel.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => __ML__.app.openSheet('map')); await sleep(200);
    await page.screenshot({ path: '/tmp/m-phone.png' });
    console.log(await page.evaluate(() => window.__errors.join('\n') || 'no errors'));
} finally { await close(); }
