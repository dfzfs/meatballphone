// 📅 달력 더하기: 📌 D-day · ✅ 할 일 · 🩸 생리 주기 · 📝 날짜 메모 · 👀 애인이 메모를 본다 · 😌 눈 감기
import { open, sleep, check } from './lib.mjs';
const W = Number(process.env.W || 0);
const { page, logs, close } = await open(W ? { width: W, height: 844 } : {});
const click = (sel) => page.evaluate((s) => { if (/cp-cy|cp-peek/.test(s) && !document.querySelector(s)) document.querySelector('[data-act="cp-set"]')?.click(); return s; }, sel).then(() => sleep(120)).then(() => page.evaluate((s) => { const el = document.querySelector(s); if (!el) throw new Error(`없음: ${s}`); el.click(); }, sel)).then(() => sleep(150)); // ⚙ 달력 설정은 접혀 있음
const fill = (vals) => page.evaluate((vals) => { for (const [k, v] of Object.entries(vals)) document.querySelector(`#mlf-${k}`).value = v; document.querySelector('.ml-bs [data-bs="ok"]').click(); }, vals).then(() => sleep(200));
const inj = () => page.evaluate(() => { __ML__.inject(); return __ML__.app.lastInj(); });
const all = (o) => `${o.facts ?? ''}\n${o.hint ?? ''}`;
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    // 오늘 = 3월 1일 (날짜 번호 0)
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    check(await page.evaluate(() => document.querySelectorAll('.ml-cptabs button').length === 3), '달력 위쪽 탭 3개');

    // ── 1. 📌 D-day ──
    await click('.ml-cptabs [data-v="dday"]');
    await click('[data-act="cp-dd-add"]'); await fill({ name: '우리 100일', date: '3일 뒤' });
    await click('[data-act="cp-dd-add"]'); await fill({ name: '시험', date: '2026-2-26' });
    const dd = await page.evaluate(() => [...document.querySelectorAll('.ml-cpdd')].map(x => x.textContent));
    check(dd.includes('D-3') && dd.includes('D+3'), 'D-day: 남은 날 D-3 · 지난 날 D+3', JSON.stringify(dd));
    // 「시험」을 홈에 걸기 → 홈 달력 위젯 맨 위
    await page.evaluate(() => { const id = __ML__.getMeta().cal.dday.find(d => d.name === '시험').id; document.querySelector(`[data-act="cp-dd-pin"][data-v="${id}"]`).click(); }); await sleep(150);
    check(await page.evaluate(() => __ML__.getMeta().cal.dday.filter(d => d.pin).map(d => d.name).join()) === '시험', '홈에 걸기는 하나만');
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(250);
    const pin = await page.evaluate(() => { const p = document.querySelector('.ml-cppin'); return p ? { first: p.previousElementSibling?.tagName === 'H4', t: p.textContent } : null; });
    check(pin?.first && pin.t.includes('시험') && pin.t.includes('D+3'), '홈 위젯 맨 위에 걸린 D-day', JSON.stringify(pin));
    // 본편: 당일 · 하루 전만 (영향력 2)
    check(!/우리 100일|시험/.test(all(await inj())), 'D-3 · D+3은 본편에 안 감');
    await page.evaluate(async () => { const c = __ML__.getMeta().cal; c.dday.push({ id: 'a', name: '첫 데이트', day: 0 }, { id: 'b', name: '발표', day: 1 }); });
    let o = await inj();
    check(o.facts.includes('Today is "첫 데이트".') && o.facts.includes('Tomorrow is "발표".'), 'D-day 당일 · 하루 전 한 줄', o.facts);
    await page.evaluate(() => { __ML__.getMeta().influence = { all: 1, by: {} }; });
    check(!/첫 데이트|발표/.test(all(await inj())), '달력 영향력 1이면 D-day 주입 0');
    await page.evaluate(() => { __ML__.getMeta().influence = null; });

    // ── 2. ✅ 할 일 ──
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(200);
    await click('.ml-cptabs [data-v="todo"]');
    await click('[data-act="cp-todo-add"]'); await fill({ text: '선물 사기', date: '3/5' });
    await click('[data-act="cp-todo-add"]'); await fill({ text: '방 청소', date: '' });
    await click('.ml-cpchk');
    const td = await page.evaluate(() => ({ m: __ML__.getMeta().cal.todo.map(t => [t.text, t.done, t.day]), dom: document.querySelectorAll('.ml-cptodo.done').length }));
    check(td.m[0][1] === true && td.m[0][2] === 4 && td.m[1][2] === null && td.dom === 1, '할 일 체크 저장 · 줄 그음', JSON.stringify(td));
    check(!all(await inj()).includes('선물'), '할 일은 본편에 안 감');

    // ── 3. 🩸 생리 주기 ──
    await click('.ml-cptabs [data-v="cal"]');
    check(await page.evaluate(() => !document.querySelector('.ml-cpcy') && !document.querySelector('.ml-cc.cy, .ml-cc.cyp')), '생리 주기 꺼짐: 아무것도 안 보임');
    await click('[data-act="cp-cy"][data-v="on"]');
    await click('[data-act="cp-cy"][data-v="add"]'); await fill({ date: '2일 전' });
    const cy = await page.evaluate(async () => { const m = await import('/ext/src/rules/calplus.js'); return { ...m.cycleInfo(m.calOf(), 0), txt: document.querySelector('.ml-cpcy-now')?.textContent, cells: document.querySelectorAll('.ml-cc.cy').length, pred: document.querySelectorAll('.ml-cc.cyp').length }; });
    check(cy.last === -2 && cy.dayN === 3 && cy.next === 26 && cy.txt.includes('3일째'), '생리 주기: 3일째 · 다음 예상일 = 시작 + 28', JSON.stringify(cy));
    check(cy.cells === 3 && cy.pred === 5, '달력 칸: 기간 연한 색 3칸(3월 1~3일) · 예상 5칸(3월 27~31일)', JSON.stringify(cy));
    check(!/period/.test(all(await inj())), '본편에 알리기 꺼짐: 주입 0');
    await click('[data-act="cp-cy"][data-v="tell"]');
    o = await inj();
    check(o.facts.includes('Me is on her period (day 3).') && !/26|3\/27|28/.test(o.facts.split('\n').find(l => l.includes('period'))), '알리기 켬: 기간 중 한 줄 · 숫자 · 예상일 없음', o.facts);
    await page.screenshot({ path: `/tmp/calplus-${W || 1300}.png` });

    // ── 4. 📝 메모 · 👀 애인이 본다 ──
    await click('[data-act="c-day"][data-v="5"]'); // 3월 5일 (날짜 번호 4)
    await page.evaluate(() => { document.getElementById('ml-cpn-4').value = '하 누구 짜증나\n내일은 쉬자'; }); await click('[data-act="cp-note-save"][data-v="4"]');
    check(await page.evaluate(() => !!document.querySelector('[data-act="c-day"][data-v="5"] .ml-cpm') && __ML__.getMeta().cal.notes[4].text.includes('\n')), '메모 저장 (여러 줄) · 칸 표시');
    await click('[data-act="cp-peek"]');
    await click('[data-act="cp-note-show"][data-v="4"]');
    check(await page.evaluate(() => __ML__.getMeta().cal.notes[4].show === true), '메모 보여 주기 켬');
    const seen = [];
    for (let n = 1; n <= 9; n++) {
        await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('…\n<meatball>\ntime: +1h\n</meatball>')); await sleep(60);
        const h = (await inj()).hint ?? '', k = h.split('\n').filter(l => l.includes('calendar note')).length;
        if (k) seen.push([n + 1, k, h]);
    }
    check(seen.length === 1 && seen[0][0] === 8 && seen[0][1] === 1, '메모 힌트는 8번째 답에만 1줄', JSON.stringify(seen));
    check(seen[0]?.[2].includes('Leon may notice Me\'s calendar note on 3/5: "하 누구 짜증나 / 내일은 쉬자"'), '애정 가장 높은 ⭐ 인물 · 날짜 · 메모', seen[0]?.[2]);
    // 다음 답에서 언급 → noted
    for (let n = 0; n < 6; n++) { await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('…')); }
    check((await inj()).hint.split('\n').filter(l => l.includes('calendar note')).length === 1, '아직 안 봤으면 16번째 답에 다시 1줄');
    await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('Leon: 짜증 난다고 적었더라?\n<meatball>\nnoted: Leon | 3/5\n</meatball>')); await sleep(100);
    const nt = await page.evaluate(() => ({ turn: __ML__.fold().S.turn, noted: __ML__.fold().S.noted }));
    check(nt.turn === 16 && nt.noted?.[0]?.who === 'Leon' && nt.noted[0].md === '3/5', 'noted 사건 → 본 메모로', JSON.stringify(nt));
    for (let n = 0; n < 7; n++) { await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('…')); }
    o = await inj();
    check(await page.evaluate(() => (__ML__.fold().S.turn + 1) % 8 === 0) && !o.hint.includes('calendar note'), 'noted 뒤엔 8번째 답에도 다시 안 들어감', o.hint);
    await page.evaluate(() => __ML__.app.openSheet('cal')); await sleep(150); await click('[data-act="c-day"][data-v="5"]');
    check(await page.evaluate(() => document.querySelector('.ml-cpday')?.textContent.includes('Leon이(가) 이 메모를 봤어요')), '메모에 「Leon이 봤어요」');

    // ── 5. 😌 달력 눈 감기 → 달력 주입 0 ──
    await page.evaluate(() => { const c = __ML__.getMeta().cal; c.dday.push({ id: 'c', name: '오늘 행사', day: Math.floor(__ML__.fold().S.t / 1440) }); c.cycle.starts.push(Math.floor(__ML__.fold().S.t / 1440)); delete c.notes[4]; c.notes[40] = { text: '비밀', show: true, at: 1 }; });
    o = await inj();
    check(o.facts.includes('오늘 행사') && o.facts.includes('period'), '눈 감기 전엔 달력 줄이 있음', o.facts);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('calendar', 'on'); });
    o = await inj();
    check(!/오늘 행사|period|calendar note|now:/.test(all(o)), '😌 달력 눈 감기: 달력 주입 0', all(o));
    await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('…\n<meatball>\nnoted: Leon | 3/5\n</meatball>')); await sleep(80);
    check(await page.evaluate(() => (__ML__.fold().S.noted ?? []).length === 1), '눈 감은 답의 noted는 버림');
    // ⏸ 멈춤이면 0
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('calendar', ''); __ML__.getMeta().paused = true; });
    check(!all(await inj()).trim(), '⏸ 멈춤: 주입 0');
    await page.evaluate(() => { __ML__.getMeta().paused = false; });

    // ── 6. ⚡ 바로 받기 (다음 답 1번) ──
    if (await page.evaluate(() => (__ML__.fold().S.turn + 1) % 8 === 0)) { await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('…')); }
    await page.evaluate(() => { const c = __ML__.getMeta().cal; c.notes = { 5: { text: '바로 메모', show: false, at: 2 } }; __ML__.app.openSheet('cal'); }); await sleep(200);
    await click('[data-act="c-day"][data-v="6"]');
    check(await page.evaluate(() => !!document.querySelector('[data-act="cp-now-peek"][data-v="5"]') && !!document.querySelector('[data-act="cp-now-sneak"][data-v="5"]')), '날짜 칸에 ⚡ 바로 받기 버튼 둘');
    check(!(await inj()).hint.includes('calendar note'), '바로 받기 전: 8번째 답이 아니면 메모 힌트 없음');
    await click('[data-act="cp-now-peek"][data-v="5"]');
    o = await inj();
    check(o.hint.split('\n').filter(l => l.includes('calendar note')).length === 1 && o.hint.includes('on 3/6: "바로 메모"'), '👀 바로: 보여 주기를 안 켠 메모도 다음 답에 1줄', o.hint);
    check(await page.evaluate(() => document.querySelector('[data-act="cp-now-peek"]').classList.contains('on')), '👀 바로 버튼 켜짐 표시');
    await click('[data-act="cp-now-sneak"][data-v="5"]');
    o = await inj();
    check(o.hint.includes('Leon secretly writes a short, sweet note in Me\'s calendar on 3/6') && o.hint.includes('meddle: Leon | 달력 | 3/6'), '✍ 바로: 그 날짜에 몰래 적기 1줄', o.hint);
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).setEyes('rel', 'on'); });
    check(!(await inj()).hint.includes('secretly writes'), '😌 관계 눈 감기면 ✍ 바로도 0');
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).setEyes('rel', ''); });
    await page.evaluate(() => window.__addUser('응')); await page.evaluate(() => window.__addAI('Leon: 메모 봤어\n<meatball>\nnoted: Leon | 3/6\nmeddle: Leon | 달력 | 3/6 | 같이 가자\n</meatball>')); await sleep(100);
    o = await inj();
    check(!/calendar note|secretly writes/.test(o.hint), '답이 오면 바로 받기는 저절로 꺼짐', o.hint);
    check(await page.evaluate(() => (__ML__.fold().S.sneak ?? []).some(e => e.kind === 'cal' && e.who === 'Leon')), '✍ 몰래 적은 메모가 달력에 생김');

    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
