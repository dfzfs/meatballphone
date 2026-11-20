// 공통 도구줄: 편집(장소 · 물건 · 달력) · AI로 수정 · 숨기기 · 보일 것 · 용어집
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const fill = async (vals) => {
    await page.evaluate((vals) => {
        for (const [k, v] of Object.entries(vals)) {
            const el = document.querySelector(`#mlf-${k}`);
            if (el) el.value = v;
            else {
                const b = document.querySelector(`.ml-picks[data-k="${k}"] [data-pick="${v}"]`);
                b?.click();
            }
        }
        document.querySelector('.ml-bs [data-bs="ok"]').click();
    }, vals);
    await sleep(250);
};
// ✏️ 새 편집 화면: 목록에 ＋ 추가 → 칸 채우기 → 저장
const edAdd = async (sec, vals, why = '') => { await page.evaluate(([sec, vals, why]) => {
    document.querySelector(`.ml-bs [data-ed="add"][data-sec="${sec}"]`).click();
    const L = document.querySelectorAll(`.ml-bs .ml-ed-sec[data-sec="${sec}"] .ml-ed-it`), d = L[L.length - 1];
    for (const [k, v] of Object.entries(vals)) { const el = d.querySelector(`[data-f="${k}"]`); el.value = v; }
    if (why) document.querySelector('.ml-bs .ml-ed-why [data-f="why"]').value = why;
    document.querySelector('.ml-bs [data-bs="ok"]').click();
}, [sec, vals, why]); await sleep(400); };
try {
    await page.addStyleTag({ content: 'input[type="range"]{width:100%}' });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('map')); await sleep(150);
    check(await page.evaluate(() => !!document.querySelector('.ml-tools2 [data-act="t-edit"]')), '지도에 도구줄');
    // 장소 추가: 대장간 (시장과 이어짐 · 물건)
    await page.evaluate(() => document.querySelector('[data-act="t-edit"]').click()); await sleep(250);
    await edAdd('places', { name: '대장간', kind: 'shop', near: '시장', goods: '단검 | 40 | 힘+1\n숫돌 | 5' });
    const pl = await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const b = st.getMeta().book; return { smith: b.world.places.find(p => p.name === '대장간'), market: b.world.places.find(p => p.name === '시장') }; });
    check(pl.smith?.goods?.length === 2 && pl.market?.near?.includes('대장간'), '장소 추가 · 노선 양쪽 연결', JSON.stringify(pl));
    // 물건 넣기 (효과) → 기록에 ✋
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(100);
    await page.evaluate(() => document.querySelector('[data-act="t-edit"]').click()); await sleep(250);
    await edAdd('items', { name: '사과', n: '2', fx: '허기 +15' }, '이야기에서 얻음');
    const it = await page.evaluate(() => { const r = __ML__.fold(); return { it: r.S.items.find(i => i.name === '사과'), hand: r.changes.at(-1).some(c => c.src === 'hand') }; });
    check(it.it?.n === 2 && it.it?.fx?.hunger === 15 && it.hand, '물건 넣기 · 효과 · ✋기록', JSON.stringify(it));
    // 달력: 시간 · 날씨 · 일정
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(100);
    await page.evaluate(() => document.querySelector('[data-act="t-edit"]').click()); await sleep(300);
    await page.evaluate(() => { document.querySelector('.ml-bs .ml-ed-top [data-f="time"]').value = '저녁'; document.querySelector('.ml-bs .ml-ed-top [data-f="weather"]').value = '비'; });
    await edAdd('proms', { text: '레온과 저녁', due: '3/5' });
    const cal = await page.evaluate(() => { const r = __ML__.fold(); return { w: r.S.weather, p: r.S.promises.length, clock: r.S.t % 1440 }; });
    check(cal.w === '비' && cal.p === 1 && cal.clock >= 19 * 60, '달력 편집 (시간 · 날씨 · 일정)', JSON.stringify(cal));
    // AI로 수정
    await page.evaluate(() => { window.__ai = () => '<meatball>\ncash: +100\nstatus: 행운 | 1d\n</meatball>'; });
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(100);
    await page.evaluate(() => document.querySelector('[data-act="t-ai"]').click()); await sleep(150);
    await fill({ say: '돈 100 더 줘' }); await sleep(300);
    await page.evaluate(() => document.querySelector('.ml-bs [data-bs="ok"]').click()); await sleep(300);
    const ai = await page.evaluate(() => { const r = __ML__.fold(); return { cash: r.S.cash, ai: r.changes.at(-1).some(c => c.src === 'ai') }; });
    check(ai.cash >= 150 && ai.ai, 'AI로 수정 → 미리 보기 → 반영', JSON.stringify(ai));
    // 😌 눈 감기 › 🙈 결과만 본편에 숨기기 → 주입에서 빠짐
    await page.evaluate(() => document.querySelector('.ml-tools2 [data-act="t-eye"]').click()); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="eye-set"][data-v$="|hide"]').click()); await sleep(200);
    const inj = await page.evaluate(() => { __ML__.inject(); return window.__prompts.meatlite_facts?.value ?? ''; });
    check(!/money/.test(inj), '🙈 소지품 숨기기 → 본편에 돈 안 감', inj);
    // 용어집
    await page.evaluate(() => document.querySelector('[data-act="t-gloss"]').click()); await sleep(250);
    await page.evaluate(() => document.querySelector('.ml-bs [data-act="g-edit"]').click()); await sleep(200);
    await fill({ from: '사과', to: '애플' }); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-bs [data-bs="x"]').click()); await sleep(100);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(150);
    check(await page.evaluate(() => document.querySelector('.ml-body').textContent.includes('애플')), '🌐 용어집이 화면에 적용');
    await page.screenshot({ path: '/tmp/t-bag.png' });
    // 보일 것
    await page.evaluate(() => document.querySelector('[data-act="t-parts"]').click()); await sleep(150);
    await page.evaluate(() => { const c = document.querySelector('.ml-bs [data-part="bag|cash"]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.ml-body [data-act="edit-cash"]')), '👁 보일 것 (재산 숨김)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
