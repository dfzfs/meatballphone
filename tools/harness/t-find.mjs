// 🔍 검색 강화 (조사 떼기 · 칠하기 · 모든 칸 · 본문)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('창고에서 녹슨 칼을 찾았다'));
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.getMeta().mods.mind = true; }); // 속마음 앱을 깔아 둠 (지운 앱 줄은 버려짐)
    await page.evaluate(() => window.__addAI('Leon이 어깨를 으쓱했다.\n<meatball>\nmind: Leon | 또 무모한 짓을\ngot: Rusty Sword\nstatus: 감기 | 2d\n</meatball>')); await sleep(300);
    const R = (q, g) => page.evaluate(async ([q, g]) => { const f = await import('/ext/src/extra/find.js'); return f.results(q, g); }, [q, g]);
    let h = await R('Leon이', 'all');
    check(/<mark>Leon<\/mark>/.test(h), '조사 떼고 찾기 · 칠하기', h.slice(0, 160));
    check(/속마음|무모한/.test(h), '속마음도 찾음');
    h = await R('창고에서', 'story'); check(/창고/.test(h) && /#\d/.test(h), '이야기 본문 찾기', h.slice(0, 120));
    h = await R('감기를', 'now'); check(/<mark>감기<\/mark>/.test(h), '상태 딱지 찾기');
    check(!logs.filter(l => !/404/.test(l)).length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
