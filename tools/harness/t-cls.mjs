// 🧭 B 모드(분류 모델): 태그 없는 답 → 목록에서 고른 사건 · 같은 글은 다시 안 부름 · 스와이프 · 편집 · 다시 열기 · 건너뛰기 · 실패 · A 모드 · 선택지 결과 · 새 인물 · 숫자 규칙 판
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const calls = () => page.evaluate(() => (window.__sent ?? []).filter(x => x.id === 'p-flash' && /status tracker/.test(x.prompt?.[0]?.content ?? '')).length);
const settle = () => page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); for (let k = 0; k < 100 && !c.idle(); k++) await new Promise(r => setTimeout(r, 30)); await new Promise(r => setTimeout(r, 60)); });
const S = () => page.evaluate(() => { const r = __ML__.fold(); return { loc: r.S.loc, aff: r.S.rel.Leon?.aff, cash: r.S.cash, flags: Object.values(r.flags).flat().length }; });
try {
    await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
    // 분류 연결 고르기 · Leon의 행동 목록
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; st.saveSettings();
        const m = st.getMeta(); m.book.people[0].up = [{ act: '칭찬', d: 3 }, { act: '도와줌', d: 4 }]; m.book.people[0].down = [{ act: '거짓말', d: -5 }];
        // 가짜 분류 모델: 답 글에 따라 줄을 돌려줌 (목록 밖 행동 · 키도 섞어서)
        window.__clsReply = { '시장 장면': '<meatball>\nloc: 시장\nwith: Leon\nact: Leon | 다정하게 칭찬해 줌\nact: Leon | 춤을 춤\nbogus: 이상한 키\naff: Leon +50\n</meatball>', '집 장면': '<meatball>\nloc: 집\n</meatball>', '고친 장면': '<meatball>\nloc: 식당\n</meatball>' };
        window.__cls = (p) => { const j = JSON.parse(p), sys = j[0].content, user = j[1].content;
            if (/rule card/.test(sys)) return '{"line":"꽃집 주인","face":"🌸","up":[{"act":"꽃 칭찬","d":3},{"act":"도와줌","d":2},{"act":"웃음","d":2}],"down":[{"act":"무시","d":-3},{"act":"꽃 밟기","d":-5},{"act":"거짓말","d":-4}],"start":{"aff":15,"trust":20}}';
            if (window.__clsFail) return new Error('연결 오류');
            const key = Object.keys(window.__clsReply).find(k => user.includes(k)); return key ? window.__clsReply[key] : '<meatball></meatball>'; };
        __ML__.app.refresh(true);
    });
    await page.evaluate(() => window.__addUser('시장에 가자'));
    await page.evaluate(() => __ML__.inject());
    check(await page.evaluate(() => !(window.__prompts.meatlite_rule?.value ?? '') && !!window.__prompts.meatlite_facts?.value), 'B: 본편 주입에 적는 법 규칙 없음 · 현재 사실은 있음');
    const tShow = Date.now();
    await page.evaluate(() => window.__addAI('시장 장면. Leon이 다정하게 말을 걸었다.'));
    check(await page.evaluate(() => !!document.querySelector('.ml-msg') && document.querySelector('.ml-msg').textContent.includes('…')) || Date.now() - tShow < 2000, '본편을 막지 않음 (답 먼저 · 칩 자리 「…」)');
    await settle();
    let s = await S();
    check(s.loc === '시장' && s.aff === 13, '태그 없는 답 → 분류 결과로 계산 (비슷한 말 → 「칭찬」 +3)', JSON.stringify(s));
    check(s.flags === 0, '목록 밖 행동 · 키(춤 · bogus · aff 숫자)는 조용히 버림 · 확인 필요 없음');
    const sent = await page.evaluate(() => window.__sent.at(-1));
    check(sent.over?.temperature === 0 && sent.max <= 300 && /\[ACTIONS\][\s\S]*칭찬/.test(sent.prompt[1].content) && /\[REPLY\]/.test(sent.prompt[1].content), '온도 0 · 출력 길이 제한 · 목록 · 원문을 보냄');
    check(await page.evaluate(() => /🧭\d+/.test(document.querySelector('#ml-hud .meter')?.textContent ?? '')), '토큰 계기판에 분류로 보낸 토큰');
    const n1 = await calls();
    check(n1 === 1, `답 하나에 분류 1회 (${n1})`);
    // 같은 글 리롤 → 저장된 결과 · 호출 0
    await page.evaluate(() => window.__swipe('시장 장면. Leon이 다정하게 말을 걸었다.')); await settle();
    s = await S();
    check(await calls() === n1 && s.aff === 13 && s.loc === '시장', '같은 글 리롤 → 같은 결과 · 호출 그대로', JSON.stringify(s));
    // 새 스와이프(다른 글) → 따로 분류 · 옛 스와이프로 넘기면 그 결과로
    await page.evaluate(() => window.__swipe('집 장면. 혼자 쉬었다.')); await settle();
    s = await S(); const n2 = await calls();
    check(n2 === n1 + 1 && s.loc === '집' && s.aff === 10, '새 스와이프는 따로 분류', JSON.stringify(s));
    await page.evaluate(() => window.__swipeTo(0)); await settle();
    s = await S();
    check(await calls() === n2 && s.loc === '시장' && s.aff === 13, '옛 스와이프로 넘기면 그 결과 · 호출 0', JSON.stringify(s));
    // 편집으로 글이 바뀌면 다시 분류
    await page.evaluate(() => window.__edit(SillyTavern.getContext().chat.length - 1, '고친 장면. 식당으로 갔다.')); await settle();
    s = await S();
    check(await calls() === n2 + 1 && s.loc === '식당', '편집으로 글이 바뀌면 다시 분류', JSON.stringify(s));
    // 채팅 다시 열기 → 호출 0
    const n3 = await calls();
    await page.evaluate(() => window.__reload()); await settle(); await page.evaluate(() => __ML__.app.refresh(true)); await settle();
    check(await calls() === n3 && (await S()).loc === '식당', '채팅 다시 열기 · 다시 계산 → 호출 0');
    // 조용한 생성 · 일시정지 · 건너뛰기 → 호출 0
    await page.evaluate(() => window.__addAI('시장 장면 조용', { type: 'quiet' })); await settle();
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.getMeta().paused = true; }); await page.evaluate(() => window.__addAI('시장 장면 멈춤')); await settle();
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.paused = false; m.skipNext = true; }); await page.evaluate(() => window.__addAI('시장 장면 건너뜀')); await settle();
    check(await calls() === n3, '조용한 생성 · 일시정지 · 건너뛰기 → 호출 0');
    // 실패 → 한 번 다시 · 「분류 실패 · 다시」 칩 → 누르면 다시
    await page.evaluate(() => { window.__clsFail = true; }); await page.evaluate(() => window.__addUser('또 가자')); await page.evaluate(() => window.__addAI('시장 장면 두 번째. Leon을 도와줌.')); await settle();
    check(await calls() === n3 + 2, '실패하면 한 번만 다시 시도 (2회)');
    check(await page.evaluate(() => [...document.querySelectorAll('.ml-msg .ml-chip')].some(c => c.textContent.includes('분류 실패'))), '「분류 실패 · 다시」 칩');
    await page.evaluate(() => { window.__clsFail = false; [...document.querySelectorAll('.ml-msg .ml-chip')].find(c => c.textContent.includes('분류 실패')).click(); }); await settle();
    check((await S()).loc === '시장' && await calls() === n3 + 3, '「다시」 → 분류 성공');
    // 선택지 결과가 분류로 감
    await page.evaluate(() => { const C = SillyTavern.getContext(); window.__addUser('문을 부순다'); C.chat.at(-1).extra.mbc = { label: '문을 부순다', kind: 'act', risk: 'trap', check: { roll: 3, mod: 1, dc: 12, ok: false } }; });
    await page.evaluate(() => window.__addAI('시장 장면 세 번째.')); await settle();
    const cp = await page.evaluate(() => window.__sent.filter(x => x.id === 'p-flash').at(-1).prompt[1].content);
    check(/\[CHOICE\][^\n]*문을 부순다[^\n]*FAILURE/.test(cp) && /trap/.test(cp), '선택지에서 고른 결과(주사위 실패 · 함정)를 분류에 넘김');
    check(await page.evaluate(() => globalThis.MeatballLite.mode()) === 'B' && await page.evaluate(() => globalThis.MeatballLite.pendingChoice(SillyTavern.getContext().chat.length - 2)?.label) === '문을 부순다', '통로: mode() · pendingChoice()');
    // 새 인물: 처음 나오면 그 인물당 한 번만 규칙 채우기
    await page.evaluate(() => { window.__clsReply['새 손님 장면'] = '<meatball>\nnpc: Mia | 꽃집 주인\nwith: Leon, Mia\n</meatball>'; window.__addUser('꽃집'); }); await page.evaluate(() => window.__addAI('새 손님 장면. Mia가 인사했다.')); await settle(); await sleep(300);
    await page.evaluate(() => window.__addAI('새 손님 장면. Mia가 또 웃었다.')); await settle(); await sleep(300);
    const mia = await page.evaluate(() => ({ p: __ML__.getMeta().book.people.find(p => p.name === 'Mia'), n: window.__sent.filter(x => /rule card/.test(x.prompt?.[0]?.content ?? '')).length, aff: __ML__.fold().S.rel.Mia?.aff }));
    check(mia.p?.up.length === 3 && mia.p.down.length === 3 && mia.p.face === '🌸' && mia.n === 1, '새 인물 규칙 채우기 (그 인물당 한 번)', JSON.stringify(mia));
    // 숫자 규칙 판: 고친 시점부터만 새 폭 (도와줌 +4 → +6)
    const v0 = await page.evaluate(() => (__ML__.getMeta().ruleVers ?? []).length);
    const before = (await S()).aff, hist = await page.evaluate(() => __ML__.fold().changes.map(ch => ch.filter(c => c.f === 'rel.Leon.aff').map(c => c.to - c.from)).flat());
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.people.find(p => p.name === 'Leon').up[1].d = 6; __ML__.app.refresh(true); }); await sleep(200);
    await page.evaluate(() => { window.__clsReply['도움 장면'] = '<meatball>\nact: Leon | 도와줌\n</meatball>'; }); await page.evaluate(() => window.__addAI('도움 장면.')); await settle();
    const after = (await S()).aff, hist2 = await page.evaluate(() => __ML__.fold().changes.map(ch => ch.filter(c => c.f === 'rel.Leon.aff').map(c => c.to - c.from)).flat());
    check(after - before === 6 && JSON.stringify(hist2.slice(0, hist.length)) === JSON.stringify(hist), `숫자 규칙 판: 고친 뒤 도와줌 +6 · 앞 메시지는 옛 규칙 그대로 (${JSON.stringify(hist)} → ${JSON.stringify(hist2)})`);
    check(await page.evaluate(() => (__ML__.getMeta().ruleVers ?? []).length) === v0 + 1, '판 번호가 하나 늘어남');
    // 앞에서 쓴 행동의 폭을 고쳐도 앞 메시지는 그대로 (칭찬 +3 → +7, 다시 계산해도 첫 칭찬은 +3)
    await page.evaluate(() => { const m = __ML__.getMeta(); m.book.people.find(p => p.name === 'Leon').up[0].d = 7; __ML__.app.refresh(true); }); await sleep(200);
    const h3 = await page.evaluate(() => __ML__.fold(true).changes.map(ch => ch.filter(c => c.f === 'rel.Leon.aff').map(c => c.to - c.from)).flat());
    check(h3[0] === 3, `앞 메시지는 그때 규칙으로 다시 계산 (${JSON.stringify(h3)})`);
    // 빨리 연달아 온 답: 메시지마다 차례로 하나씩 (둘 다 분류)
    const nq = await calls();
    await page.evaluate(() => { window.__clsReply['빠른 하나'] = '<meatball>\nloc: 시장\n</meatball>'; window.__clsReply['빠른 둘'] = '<meatball>\nloc: 식당\n</meatball>'; window.__addAI('빠른 하나.'); window.__addAI('빠른 둘.'); });
    await settle();
    check(await calls() === nq + 2 && (await S()).loc === '식당', '연달아 온 답은 줄 세워 차례로 (마지막 상태가 맞음)');
    // 분류 연결이 없으면 B는 A로 · 설정 화면에 한 줄
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().clsProfile = ''; });
    check(await page.evaluate(() => globalThis.MeatballLite.mode()) === 'A' && await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).modeNote().length > 0), '연결이 없으면 B → A로 · 알림 한 줄');
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().clsProfile = 'p-flash'; });
    // A 모드: 지금과 같음 (태그 · 규칙 주입 · 호출 0)
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().mode = 'A'; st.saveSettings(); __ML__.inject(); });
    const nA = await calls();
    await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 목욕탕\n</meatball>')); await settle();
    check((await S()).loc === '목욕탕' && await calls() === nA && /STATUS LOG/.test(await page.evaluate(() => window.__prompts.meatlite_rule?.value ?? '')), 'A 모드: 본편 태그 · 적는 법 주입 · 호출 0');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
