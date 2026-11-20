// ✏️ 편집: 항목 정의(이름 · 아이콘 · 설명 · 속도) + 지금 값을 한 화면에서 · 추가 · 빼기 · 지금 값은 ✋ 직접
import { open, sleep, check } from './lib.mjs';
const { page, logs, close, shot } = await open();
const ai = async (b) => { await page.evaluate(() => window.__addUser('.')); await page.evaluate((b) => window.__addAI(`a\n<meatball>\n${b}\n</meatball>`), b); await sleep(220); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await ai('got: Apple | 2');
    await page.evaluate(() => __ML__.app.openSheet('now')); await sleep(200);
    page.evaluate(async () => { const t = await import('/ext/src/ui/tools.js'); t.editApp('now'); }); await sleep(500);
    const n0 = await page.evaluate(() => document.querySelectorAll('.ml-ed-sec[data-sec="needs"] .ml-ed-it').length);
    check(n0 >= 3, '욕구 항목이 펼칠 수 있는 카드로 다 나옴', String(n0));
    await page.evaluate(() => {
        const d = document.querySelector('.ml-ed-sec[data-sec="needs"] .ml-ed-it'); d.open = true;
        d.querySelector('[data-f="desc"]').value = '배고픔 정도';
        d.querySelector('[data-f="rate"]').value = '7';
        const nw = d.querySelector('[data-f="now"]'); nw.value = String(Math.max(0, Number(nw.value) - 10));
        document.querySelector('[data-ed="add"][data-sec="needs"]')?.click();
    }); await sleep(100);
    await page.evaluate(() => { const L = document.querySelectorAll('.ml-ed-sec[data-sec="needs"] .ml-ed-it'); const d = L[L.length - 1]; d.querySelector('[data-f="name"]').value = '갈증'; d.querySelector('[data-f="icon"]').value = '💧'; d.querySelector('[data-f="desc"]').value = '목마름'; });
    await page.evaluate(() => { document.querySelector('[data-ed="add"][data-sec="attrs"]').click(); const L = document.querySelectorAll('.ml-ed-sec[data-sec="attrs"] .ml-ed-it'); const d = L[L.length - 1]; d.querySelector('[data-f="name"]').value = '행운'; d.querySelector('[data-f="desc"]').value = '운 판정'; });
    if (shot) await shot('editfull');
    await page.evaluate(() => document.querySelector('.ml-bs [data-bs="ok"]').click()); await sleep(500);
    const b = await page.evaluate(() => { const m = __ML__.getMeta(); return { needs: m.book.me.needs, attrs: m.book.me.attrs }; });
    check(b.needs[0].desc === '배고픔 정도' && b.needs[0].rate === 7, '설명 · 속도 저장', JSON.stringify(b.needs[0]));
    check(b.needs.some(n => n.name === '갈증' && n.icon === '💧' && n.desc === '목마름'), '욕구 추가', JSON.stringify(b.needs.map(n => n.name)));
    check(b.attrs.some(a => a.name === '행운' && a.desc === '운 판정'), '능력치 추가 (설명 포함)', JSON.stringify(b.attrs));
    const hand = await page.evaluate(() => { const r = __ML__.fold(true); return r.changes.flat().filter(c => c?.hand).map(c => c.f); });
    check(hand.length >= 1, '지금 값은 ✋ 직접으로', JSON.stringify(hand));
    // 소지품: 물건 효과 · 개수 · 새 물건
    page.evaluate(async () => { const t = await import('/ext/src/ui/tools.js'); t.editApp('bag'); }); await sleep(500);
    await page.evaluate(() => {
        const d = document.querySelector('.ml-ed-sec[data-sec="items"] .ml-ed-it'); d.querySelector('[data-f="n"]').value = '5'; d.querySelector('[data-f="fx"]').value = '허기+15';
        document.querySelector('[data-ed="add"][data-sec="items"]').click(); const L = document.querySelectorAll('.ml-ed-sec[data-sec="items"] .ml-ed-it'); L[L.length - 1].querySelector('[data-f="name"]').value = 'Umbrella';
        document.querySelector('.ml-bs [data-bs="ok"]').click();
    }); await sleep(500);
    const it = await page.evaluate(() => { const r = __ML__.fold(true); return { items: r.S.items.map(i => `${i.name}×${i.n}`), fx: __ML__.getMeta().book.world.itemFx }; });
    check(it.items.includes('Apple×5') && it.items.includes('Umbrella×1'), '소지품 개수 · 새 물건', JSON.stringify(it.items));
    check(Object.values(it.fx.Apple ?? {})[0] === 15, '물건 효과 저장', JSON.stringify(it.fx));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
