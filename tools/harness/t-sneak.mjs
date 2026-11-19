// ✍ 애인이 몰래 손대기: 🎁 소지품 · 💸 돈(한도) · 📅 달력 · ❗ 배지 · 알아채기 1번 · 되돌리기 · 스와이프/삭제 · 😌 눈 감기
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const S = () => page.evaluate(() => { const r = __ML__.fold(); return JSON.parse(JSON.stringify({ cash: r.S.cash, items: r.S.items, sneak: r.S.sneak ?? [] })); });
const hint = () => page.evaluate(async () => { const { factText } = await import('/ext/src/rules/inject.js'); return factText(__ML__.fold(), []).hint; });
const ai = async (t) => { await page.evaluate(() => window.__addUser('…')); await page.evaluate((t) => window.__addAI(t), t); await sleep(250); };
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().mode = 'A'; st.saveSettings(); });
    await ai('a\n<meatball>\ncash: 1000\n</meatball>');
    // 1. 세 모양
    await ai('b\n<meatball>\nmeddle: Leon | 소지품 | 손편지 | 몰래 넣어 둠\nmeddle: Leon | 돈 | +30 | 간식 사 먹어\nmeddle: Leon | 달력 | 3/4 | 같이 영화 보자\n</meatball>');
    let s = await S();
    const it = s.items.find((x) => x.name === '손편지');
    check(it && it.secret && it.from === 'Leon' && it.note === '몰래 넣어 둠', '🎁 소지품: from · note · secret', JSON.stringify(s.items));
    check(s.cash === 1030, '💸 돈 +30', String(s.cash));
    const ch = await page.evaluate(() => __ML__.fold().changes.at(-1).map((c) => `${c.f}|${c.why}|${c.src}`));
    check(ch.some((c) => /^cash\|✍ Leon/.test(c)) && ch.some((c) => /^item\|✍ Leon/.test(c)) && ch.some((c) => /^sneak\.cal\|✍ Leon/.test(c)), '기록에 ✍ 이름', ch.join(' / '));
    check(s.sneak.length === 3, 'S.sneak 3개', String(s.sneak.length));
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    const calT = await page.evaluate(() => document.querySelector('.ml-body')?.textContent ?? '');
    check(/✍Leon: 같이 영화 보자|✍ ?Leon: 같이 영화 보자/.test(calT.replace(/\s+/g, '')) || calT.includes('Leon: 같이 영화 보자'), '📅 달력 칸에 ✍ 메모', calT.slice(0, 200));
    // 2. 돈 한도: 1030의 20% = 206
    await ai('c\n<meatball>\nmeddle: Leon | 돈 | +99999 | 부자 되라\n</meatball>');
    s = await S();
    check(s.cash === 1236, '돈 한도로 자름 (+206)', String(s.cash));
    await ai('c2\n<meatball>\nmeddle: Leon | 돈 | -99999 | 장난\n</meatball>');
    s = await S();
    check(s.cash === 1236 - 247, '빼는 쪽도 한도 (−247)', String(s.cash));
    // 3. ❗ 배지 (소지품 · 달력은 이미 열어 봄)
    check(!/just found/.test(await hint()), '열어 보기 전엔 알아채기 없음');
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    check(await page.evaluate(() => !!document.querySelector('.ml-app[data-v="bag"] .ml-badge')), '홈 소지품 아이콘에 ❗ 배지');
    await page.evaluate(() => document.querySelector('.ml-app[data-v="bag"]').click()); await sleep(250);
    const bagT = await page.evaluate(() => document.querySelector('.ml-body').textContent);
    check(bagT.includes('누가 몰래 넣어 둠') && bagT.includes('몰래 생긴 것'), '소지품: 🎁 딱지 · 몰래 생긴 것 카드');
    await page.screenshot({ path: '/tmp/sneak-1440.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(250);
    await page.screenshot({ path: '/tmp/sneak-390.png', fullPage: false });
    const over = await page.evaluate(() => [...document.querySelectorAll('.ml-body .ml-row')].some((r) => r.scrollWidth > r.clientWidth + 1));
    check(!over, '휴대폰 폭에서 줄이 넘치지 않음');
    await page.setViewportSize({ width: 1440, height: 900 }); await sleep(100);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.ml-app[data-v="bag"] .ml-badge')), '열어 보면 배지가 사라짐');
    // 4. 알아채기: 다음 답 1번만
    const h1 = await hint();
    check(h1.includes('just found the 손편지 that Leon secretly left in their bag') && /slipped 30 골드/.test(h1), '다음 답에 알아채기 한 줄', h1);
    await ai('d\n<meatball>\nloc: 집\n</meatball>');
    check(!/just found|just noticed/.test(await hint()), '그다음 답엔 없음');
    // 5. 되돌리기
    const c0 = (await S()).cash;
    await page.evaluate(() => __ML__.app.openSheet('bag')); await sleep(200);
    const keys = await page.evaluate(() => __ML__.fold().S.sneak.filter((e) => !e.undone).map((e) => [e.kind, e.key, e.n ?? 0]));
    for (const k of keys.filter((k) => k[0] === 'item' || (k[0] === 'cash' && k[2] === 30))) {
        await page.evaluate((key) => document.querySelector(`[data-act="sneak-undo"][data-v="${key}"]`).click(), k[1]); await sleep(250);
    }
    s = await S();
    check(!s.items.some((x) => x.name === '손편지') && s.cash === c0 - 30, '되돌리기: 손편지 빠짐 · 돈 −30', JSON.stringify({ cash: s.cash, c0, items: s.items.map((x) => x.name) }));
    const calKey = keys.find((k) => k[0] === 'cal')[1];
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    await page.evaluate((key) => document.querySelector(`[data-act="sneak-undo"][data-v="${key}"]`).click(), calKey); await sleep(250);
    check(!(await page.evaluate(() => document.querySelector('.ml-body').textContent)).includes('Leon: 같이 영화 보자'), '되돌리기: 달력 메모 지움');
    // 6. 스와이프 · 삭제
    await ai('e\n<meatball>\nmeddle: Leon | 소지품 | 꽃 | 몰래\n</meatball>');
    check((await S()).items.some((x) => x.name === '꽃'), '꽃이 생김');
    await page.evaluate(() => window.__swipe('그냥 답')); await sleep(300);
    check(!(await S()).items.some((x) => x.name === '꽃'), '스와이프하면 꽃이 사라짐');
    const c1 = (await S()).cash;
    await ai('f\n<meatball>\nmeddle: Leon | 돈 | +5 | 몰래\n</meatball>');
    check((await S()).cash === c1 + 5, '돈 +5');
    await page.evaluate(async () => { const st = window.__st; st.chat.splice(st.chat.length - 2, 2); await SillyTavern.getContext().eventSource.emit('message_deleted', st.chat.length); }); await sleep(300);
    check((await S()).cash === c1, '삭제하면 돈도 원래대로', String((await S()).cash));
    // 7. 힌트 돌려 가며 · 😌 눈 감기면 0
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.getMeta().influence = { all: 2, by: { rel: 2, quote: -2 } }; st.saveMeta(); });
    const hintAt = (turn) => page.evaluate(async (turn) => { const { factText } = await import('/ext/src/rules/inject.js'); const r = __ML__.fold(); const S2 = structuredClone(r.S); S2.turn = turn; S2.rel.Leon.aff = 70; return factText({ ...r, S: S2 }, []).hint; }, turn);
    const H = [await hintAt(5), await hintAt(13), await hintAt(21)];
    check(/meddle: Leon \| 소지품/.test(H[0]) && /meddle: Leon \| 돈 \| \+\d+/.test(H[1]) && /meddle: Leon \| 달력 \| \d+\/\d+/.test(H[2]), '8번째 답 힌트: 소지품 · 돈 · 달력 돌려 가며', H.join(' // '));
    check(!/meddle/.test(await hintAt(6)), '다른 답엔 힌트 없음');
    const allow = await page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); return [...c.ALLOW()]; });
    check(allow.includes('meddle'), '분류 모델 목록에 meddle');
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('rel', 'on'); });
    check(!/meddle/.test(await hintAt(5)), '😌 관계 눈 감기: 힌트 0');
    const rule = await page.evaluate(async () => { const { ruleText } = await import('/ext/src/rules/inject.js'); return ruleText(__ML__.fold().book); });
    check(!/meddle:/.test(rule), '😌 관계 눈 감기: 적는 법에도 없음');
    check(!logs.some((l) => /error/i.test(l)) && !(await page.evaluate(() => window.__errors.length)), '오류 없음', logs.slice(0, 3).join(' | '));
} finally { await close(); }
