// dev 시험 되살리기: 스와이프 · 지우기 · 이어쓰기 · 옛 미트볼 채팅 · 이상한 AI 답 · 퀵리플라이 · 일시정지 · 건너뛰기 · OOC · 휴대폰 폭
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = () => page.evaluate(() => { const r = __ML__.fold(); return { cash: r.S.cash, loc: r.S.loc, items: r.S.items.map(i => i.name), n: window.__st.chat.length }; });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    await page.evaluate(() => window.__addUser('1')); await page.evaluate(() => window.__addAI('a\n<meatball>\ncash: +10\n</meatball>')); await sleep(200);
    // 스와이프: 새 답(다른 변화) → 돌아가면 옛 값
    await page.evaluate(async () => {
        const st = window.__st,
            i = st.chat.length - 1,
            m = st.chat[i];
        m.swipes.push('b\n<meatball>\ncash: +99\n</meatball>');
        m.swipe_info.push({ extra: {} });
        m.swipe_id = 1;
        m.mes = m.swipes[1];
        await SillyTavern.getContext().eventSource.emit('message_received', i, 'swipe');
        await SillyTavern.getContext().eventSource.emit('message_swiped', i);
    });
    await sleep(200); check((await S()).cash === 149, '스와이프 → 새 스와이프 값');
    await page.evaluate(async () => { const st = window.__st, i = st.chat.length - 1, m = st.chat[i]; m.swipe_id = 0; m.mes = m.swipes[0]; await SillyTavern.getContext().eventSource.emit('message_swiped', i); });
    await sleep(200); check((await S()).cash === 60, '옛 스와이프로 돌아가면 옛 값');
    // 지우기
    await page.evaluate(() => window.__addAI('c\n<meatball>\ngot: 열쇠\n</meatball>')); await sleep(200);
    check((await S()).items.includes('열쇠'), '물건 얻음');
    await page.evaluate(async () => { window.__st.chat.pop(); window.__renderAll(); await SillyTavern.getContext().eventSource.emit('message_deleted', window.__st.chat.length); });
    await sleep(200); check(!(await S()).items.includes('열쇠'), '메시지 지우면 그 값도 사라짐');
    // 이어쓰기
    await page.evaluate(() => window.__addAI('d')); await sleep(200);
    await page.evaluate(() => window.__continue('\n<meatball>\nloc: 시장\n</meatball>')); await sleep(300);
    check((await S()).loc === '시장', '이어쓰기로 붙은 태그도 읽음');
    // 이상한 AI 답
    await page.evaluate(() => window.__addAI('e\n<meatball>\n__proto__: 1\nconstructor: x\naff: constructor +5\ncash: abc\nitem: \nloc: \n알수없는키: 3\ntime: 99:99\nslept: 999999h\n</meatball>')); await sleep(300);
    const st = await S(); check(st.cash === 60 && !(await page.evaluate(() => window.__errors.length)), '이상한 줄은 건너뜀 (오류 없음)');
    // 퀵리플라이 · /gen (조용한 생성)은 안 붙임
    await page.evaluate(() => window.__addAI('q\n<meatball>\ncash: +500\n</meatball>', { type: 'quiet' })); await sleep(200);
    check((await S()).cash === 60, '조용한 생성은 상태창에 안 붙음');
    // 일시정지
    await page.evaluate(async () => { const s = await import('/ext/src/base/st.js'); s.getMeta().paused = true; }); 
    await page.evaluate(() => window.__addAI('p\n<meatball>\ncash: +7\n</meatball>')); await sleep(200);
    check((await S()).cash === 60 && !(await page.evaluate(() => window.__prompts.meatlite_rule?.value)), '일시정지: 계산 · 주입 없음');
    await page.evaluate(async () => { const s = await import('/ext/src/base/st.js'); s.getMeta().paused = false; s.getMeta().skipNext = true; });
    await page.evaluate(() => window.__addAI('s\n<meatball>\ncash: +7\n</meatball>')); await sleep(200);
    check((await S()).cash === 60, '다음 1번 건너뛰기');
    await page.evaluate(() => window.__addAI('t\n<meatball>\ncash: +7\n</meatball>')); await sleep(200);
    check((await S()).cash === 67, '건너뛴 다음엔 다시 반영');
    // OOC
    await page.evaluate(() => window.__addUser('(( OOC: 잠깐 얘기 ))')); await page.evaluate(() => window.__addAI('ooc\n<meatball>\ncash: +7\n</meatball>')); await sleep(200);
    check((await S()).cash === 67, 'OOC 답은 건너뜀');
    // 옛 미트볼 채팅 옮겨 오기
    await page.evaluate(async () => {
        await window.__changeChat('old-chat');
        const st = window.__st;
        st.chatMetadata.statussim = { base: { data: { rel: { user: [{ name: 'Leon', aff: 30 }] }, map: { places: [{ name: '여관' }] } } } };
        st.chat.push({
            name: 'Leon',
            is_user: false,
            mes: '옛 답',
            swipe_id: 0,
            swipes: ['옛 답'],
            swipe_info: [{ extra: {} }],
            extra: {
                statussim: {
                    bySwipe: {
                        0: [
                            ['cash', '+30'],
                            ['loc', '여관'],
                            ['quest', '사라진 칸'],
                        ],
                    },
                },
            },
        });
        window.__renderAll();
    });
    await page.evaluate(() => document.querySelector('[data-ml="migrate"]').click()); await sleep(400);
    const o = await page.evaluate(() => { const r = __ML__.fold(); return { cash: r.S.cash, loc: r.S.loc, ppl: r.book.people.map(p => p.name) }; });
    check(o.loc === '여관' && o.ppl.includes('Leon') && !(await page.evaluate(() => window.__errors.length)), '옛 미트볼 옮겨 오기 (지운 칸 줄은 조용히 건너뜀)', JSON.stringify(o));
    // 휴대폰 폭: 가로로 넘치지 않음
    await page.setViewportSize({ width: 360, height: 760 });
    for (const a of ['home', 'now', 'rel', 'map', 'cal', 'dice', 'traits', 'market']) {
        await page.evaluate((a) => __ML__.app.openSheet(a), a);
        await sleep(120);
        const ov = await page.evaluate(() => {
            const b = document.querySelector('.ml-body');
            return b.scrollWidth - b.clientWidth;
        });
        check(ov <= 2, `휴대폰 폭 ${a} 가로 넘침 없음 (${ov}px)`);
    }
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
