// 🪪 카드 이름(Law)이 설정집 인물(트라팔가 로)과 다를 때: 한 번 묻고 → 고르면 다른 이름으로 합쳐짐 · 다시 안 물음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const first = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const b = st.getMeta().book; const p = b.people.find(x => x.name === 'Leon') ?? b.people[0]; p.name = '트라팔가 로'; p.aka = []; st.saveMeta(); return p.name; });
    await page.evaluate(() => window.__addUser('안녕')); await page.evaluate(() => window.__addAI('Leon이 웃었다.\n<meatball>\nnpc: Leon | 해적 의사\nwith: Leon\n</meatball>')); await sleep(600);
    check(await page.evaluate(() => /「Leon」는 누구예요/.test(document.body.textContent)), '카드 이름이 새 인물로 생기면 한 번 물음', first);
    await page.evaluate(() => { const b = [...document.querySelectorAll('[data-pick]')].find(x => x.dataset.pick === '트라팔가 로'); b.click(); });
    await page.evaluate(() => { const ok = [...document.querySelectorAll('.ml-bs button, .ml-bs .ml-btn')].find(x => /확인/.test(x.textContent)); ok?.click(); }); await sleep(600);
    const after = await page.evaluate(async () => { const e = await import('/ext/src/rules/engine.js'); const r = e.fold(); return { rel: Object.keys(r.S.rel), aka: r.book.people.find(p => p.name === '트라팔가 로')?.aka }; });
    check(!after.rel.includes('Leon') && after.rel.includes('트라팔가 로') && after.aka.includes('Leon'), '고르면 하나로 합쳐짐 (Leon은 다른 이름)', JSON.stringify(after));
    await page.evaluate(() => window.__addUser('또')); await page.evaluate(() => window.__addAI('Leon이 손을 흔들었다.')); await sleep(500);
    check(await page.evaluate(() => !/「Leon」는 누구예요/.test(document.body.textContent)), '다시 묻지 않음');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
