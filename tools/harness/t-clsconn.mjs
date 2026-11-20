// 🔌 분류 연결: 깨끗한 프리셋 · 지금 API에서 모델만 · 진짜 오류 남기기 · 생각 설정 거절 → 빼고 다시 · 빈 답 · 시험 버튼 · 본문만 보내기 · 이름 나온 인물 · 첫 메시지 시작 상태
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const settle = () => page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); for (let k = 0; k < 100 && !c.idle(); k++) await new Promise(r => setTimeout(r, 30)); await new Promise(r => setTimeout(r, 60)); });
try {
    // 첫 메시지: 상태줄에 돈 · 시각 · 장소 → 상태창 시작 상태
    await page.evaluate(() => {
        const c = SillyTavern.getContext();
        c.characters[0].first_mes = '<div class="status">📍 장소: 편의점 | 🕐 오후 2:30 | 💰 소지금: 32,000원</div>\n민지는 편의점 앞에서 친구를 기다렸다. 커피는 4,500원이었다.';
    });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const st0 = await page.evaluate(() => { const r = __ML__.fold(), m = __ML__.getMeta(); return { cash: r.S.cash, t: ((r.S.t % 1440) + 1440) % 1440, loc: r.S.loc, from: m.start.from }; });
    check(st0.cash === 32000 && st0.t === 870 && st0.loc === '편의점' && st0.from === 'first', '첫 메시지의 돈 32,000 · 오후 2:30 · 장소를 시작 상태로 (기본값 아님)', JSON.stringify(st0));
    const parse = await page.evaluate(async () => { const f = await import('/ext/src/rules/firstmsg.js'); return [f.moneyIn('잔고 ₩45,000'), f.moneyIn('돈: 3만 2천원'), f.moneyIn('Gold: 120'), f.clockIn('밤 11시'), f.clockIn('오전 12시 10분'), f.clockIn('14:05'), f.clockIn('새벽 3시 반')]; });
    check(JSON.stringify(parse) === JSON.stringify([45000, 32000, 120, 1380, 10, 845, 210]), '돈 · 시각 읽기 (₩ · 만/천 · 골드 · 밤 · 오전 12시 · 24시 · 반)', JSON.stringify(parse));

    // 분류 연결 (프로필) + 인물 둘
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().mode = 'B'; st.settings().clsProfile = 'p-flash'; st.saveSettings();
        const m = st.getMeta(), b = m.book;
        b.people[0].up = [{ act: '칭찬', d: 3 }]; b.people[0].down = [{ act: '거짓말', d: -5 }];
        const bk = await import('/ext/src/rules/book.js');
        m.book = bk.normBook({ ...b, people: [...b.people, { name: '도윤', up: [{ act: '칭찬', d: 3 }], down: [{ act: '무시', d: -3 }] }] }); st.saveMeta();
        window.__cls = (p) => { const j = JSON.parse(p); window.__lastUser = j[1].content; return '<meatball>\nact: 도윤 | 칭찬\n</meatball>'; };
        __ML__.app.refresh(true);
    });
    // 본문만: <scene_plan> · <choices> · 주석 · details는 빠지고 <p> 글은 남음
    const reply = '<scene_plan>계획: 도윤을 등장시킨다 SECRET_PLAN</scene_plan>\n<p>민지는 웃었다. 도윤이 다가와 칭찬했다.</p>\n<!-- 메모 HIDDEN_NOTE -->\n<details><summary>상태</summary>DETAILS_BOX</details>\n<choices>1. 따라간다 CHOICE_X\n2. 거절한다</choices>';
    await page.evaluate(() => window.__addUser('<choices>USER_BLOCK</choices>안녕'));
    await page.evaluate((t) => window.__addAI(t), reply); await settle();
    const u = await page.evaluate(() => window.__lastUser ?? '');
    const rep = u.slice(u.indexOf('[REPLY]'));
    check(/민지는 웃었다/.test(rep) && !/SECRET_PLAN|HIDDEN_NOTE|DETAILS_BOX|CHOICE_X/.test(u) && !/USER_BLOCK/.test(u), '분류 모델엔 이야기 본문만 (scene_plan · choices · 주석 · details 빠짐)', rep);
    check(/\[ACTIONS\][\s\S]*도윤 — up: 칭찬/.test(u), '답 글에 이름이 나온 인물(도윤)은 장면에 없어도 행동 목록에', u.slice(u.indexOf('[ACTIONS]'), u.indexOf('[ACTIONS]') + 120));
    check(await page.evaluate(() => __ML__.fold().S.rel['도윤']?.aff) > 10, '도윤 칭찬이 계산됨');
    let sent = await page.evaluate(() => window.__sent.at(-1));
    check(sent.custom?.includePreset === false && sent.custom?.includeInstruct === false && sent.custom?.stream === false && sent.max === 32000
        && sent.over.temperature === 0 && sent.over.reasoning_effort === 'min' && sent.over.include_reasoning === false && sent.prompt.length === 2 && /status tracker/.test(sent.prompt[0].content),
    '프로필: API · 모델만 빌림 (프리셋 · 지시문 안 씀) · 미트볼 분류용 값 (온도 0 · 답 길이 제한 없음 · 생각 최소 · 스트리밍 끔) · 지시는 라이트 것만', JSON.stringify({ c: sent.custom, max: sent.max, over: sent.over }));

    // 진짜 오류: 「API request failed」 안의 cause를 로그 · 전체 복사에
    await page.evaluate(() => { window.__cls = () => new Error('API request failed', { cause: { error: { code: 400, message: 'Model gemini-x does not support SECRET-free test', status: 'INVALID_ARGUMENT' } } }); });
    const r1 = await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    check(!r1.ok && /400/.test(r1.error) && /does not support/.test(r1.error) && /INVALID_ARGUMENT/.test(r1.error) && /API request failed/.test(r1.error), '실패: 서버의 진짜 오류(코드 · 내용 · 상태)', r1.error);
    const rep1 = await page.evaluate(async () => (await import('/ext/src/extra/report.js')).buildReport({}).text);
    check(/## 마지막 분류 모델[\s\S]*오류: .*400 .*does not support/.test(rep1) && /분류 요청 실패 .*does not support/.test(rep1), '전체 복사 · 로그에 진짜 오류', rep1.slice(rep1.indexOf('## 마지막 분류 모델'), rep1.indexOf('## 마지막 분류 모델') + 300));

    // 생각 설정을 못 받는 모델 → 생각 칸만 빼고 다시 (다음부터 계속 뺌)
    await page.evaluate(() => { window.__n = 0; window.__cls = (p, info) => { window.__n++; return info.over?.reasoning_effort ? new Error('API request failed', { cause: { error: { message: 'Unknown field reasoning_effort' } } }) : '<meatball>\nloc: 편의점\n</meatball>'; }; });
    const r2 = await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    check(r2.ok && await page.evaluate(() => window.__n) === 2, '생각 설정을 거절하면 빼고 한 번 더 → 성공', JSON.stringify(r2));
    await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    check(await page.evaluate(() => window.__n) === 3, '다음부터는 처음부터 빼고 보냄 (1회)');

    // 빈 답 (생각이 길이를 다 씀)
    await page.evaluate(async () => { (await import('/ext/src/rules/clsconn.js')).resetThink(); window.__cls = () => ''; });
    const r3 = await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    check(!r3.ok && /빈 답/.test(r3.error), '빈 답이면 이유와 함께 실패', r3.error);

    // 「지금 쓰는 API에서 모델만 고르기」: 프로필 없이 · 모델 이름만
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.settings().clsProfile = '@current'; st.settings().clsModel = 'gemini-3.8-flash'; st.saveSettings();
        const c = SillyTavern.getContext(); c.chatCompletionSettings.chat_completion_source = 'vertexai'; c.chatCompletionSettings.vertexai_region = 'us-central1'; c.chatCompletionSettings.vertexai_auth_mode = 'full';
        c.chatCompletionSettings.temp_openai = 1.4; c.chatCompletionSettings.openai_max_tokens = 8000;
        window.__cls = () => '<meatball>\nate: 삼각김밥\nbuy: 삼각김밥 | 1500\nact: 도윤 | 칭찬\n</meatball>';
    });
    const r4 = await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    sent = await page.evaluate(() => window.__sent.at(-1));
    const b = sent.over;
    check(r4.ok && sent.id === '@current' && b.model === 'gemini-3.8-flash' && b.chat_completion_source === 'vertexai' && b.vertexai_region === 'us-central1' && b.vertexai_auth_mode === 'full'
        && b.temperature === 0 && b.max_tokens === 32000 && b.stream === false && b.reasoning_effort === 'min' && !('temp_openai' in b) && !('openai_max_tokens' in b) && !sent.options?.presetName,
    '지금 API(Vertex) + 모델 이름만 → 연결 칸만 복사 · 사용자 프리셋 값(온도 1.4 · 8000)은 안 섞임', JSON.stringify(b));
    check(await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).mode()) === 'B', '「지금 API」도 B 모드로 침');
    check(sent.options?.direct === true, '지금 API: 만든 몸통을 그대로 서버로 (sendRequest · 연결 칸이 안 버려짐)');
    // 프로필이 Vertex면 인증 방식 · 리전을 지금 연결에서 채움 (안 넣으면 서버가 Express(API 키)로 봄)
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().clsProfile = 'p-vx'; st.saveSettings(); });
    const r5 = await page.evaluate(async () => (await import('/ext/src/rules/classify.js')).testConnection());
    sent = await page.evaluate(() => window.__sent.at(-1));
    check(r5.ok && sent.id === 'p-vx' && sent.over.vertexai_auth_mode === 'full' && sent.over.vertexai_region === 'us-central1' && /인증 full/.test(r5.route), 'Vertex 프로필: 인증 방식(full) · 리전을 같이 보냄', JSON.stringify(sent.over));
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.settings().clsProfile = '@current'; st.saveSettings(); });

    // 설정의 🔌 분류 연결 시험 버튼: 결과 · 걸린 시간 바로
    await page.evaluate(() => { const sel = document.querySelector('[data-ml-s="clsProfile"]'); sel.value = '@current'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    const ui = await page.evaluate(async () => {
        const sel = document.querySelector('[data-ml-s="clsProfile"]'); if (!sel) return { none: true };
        const opts = [...sel.options].map(o => o.value);
        document.querySelector('[data-ml="cls-test"]')?.click();
        for (let k = 0; k < 40 && !document.querySelector('.ml-cls-res'); k++) await new Promise(r => setTimeout(r, 25));
        return { opts, model: !!document.querySelector('[data-ml-s="clsModel"]'), res: document.querySelector('.ml-cls-res')?.textContent ?? '' };
    });
    check(ui.opts?.includes('@current') && ui.opts.includes('p-flash') && ui.model, '설정: 「지금 쓰는 API에서 모델만」 · 프로필 · 모델 이름 칸', JSON.stringify(ui));
    check(/✅ 성공 · \d+ms/.test(ui.res) && /gemini-3\.8-flash/.test(ui.res) && /ate: 삼각김밥/.test(ui.res), '🔌 시험 버튼: 성공 · 걸린 시간 · 연결 · 고른 사건', ui.res);
    await page.evaluate(() => { window.__cls = () => new Error('API request failed', { cause: { error: { code: 403, message: 'Permission denied on Vertex' } } }); });
    const bad = await page.evaluate(async () => {
        document.querySelector('.ml-cls-test').innerHTML = ''; document.querySelector('[data-ml="cls-test"]').click();
        for (let k = 0; k < 40 && !document.querySelector('.ml-cls-res'); k++) await new Promise(r => setTimeout(r, 25));
        return document.querySelector('.ml-cls-res')?.textContent ?? '';
    });
    check(/❌ 실패/.test(bad) && /403/.test(bad) && /Permission denied on Vertex/.test(bad), '🔌 시험 버튼: 실패면 서버 오류 내용', bad);
    check(await page.evaluate(() => /🧼 미트볼 분류용: 온도 0 · 답 길이 제한 없음/.test(document.querySelector('.ml-set')?.textContent ?? '')), '설정에 「미트볼 분류용」 프리셋 값 한 줄');
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
