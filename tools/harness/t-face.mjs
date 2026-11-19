// 얼굴 이모지가 여러 조각(🙇‍♂️)이어도 잘려서 「🙇…」가 되지 않음 · 옛 채팅의 잘린 얼굴도 고쳐짐
import { open, sleep, check } from './lib.mjs';
const { page, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('식당 가자'));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nnpc: 강민석 | 깍듯한 신입생 | 🙇‍♂️\n</meatball>')); await sleep(400);
    const f = await page.evaluate(() => __ML__.fold().S.rel['강민석']?.face);
    check(f === '🙇‍♂️', '새 인물 얼굴: 여러 조각 이모지 그대로', JSON.stringify(f));
    const b = await page.evaluate(async () => { const { normBook } = await import('/ext/src/rules/book.js'); const st = await import('/ext/src/base/st.js'); const bk = st.getMeta().book; return normBook({ ...bk, people: [{ name: '민석', face: '🙇‍…' }] }).people[0].face; });
    check(b === '🙇', '설정집의 잘린 얼굴(「🙇‍…」) → 🙇', JSON.stringify(b));
    await page.evaluate(() => __ML__.app.openSheet('rel')); await sleep(200);
    check(await page.evaluate(() => !/…\s*강민석|\.강민석/.test(document.querySelector('.ml-body').textContent)), '관계 화면에 「…강민석」 없음');
} finally { await close(); }
