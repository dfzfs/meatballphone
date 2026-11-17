// 🧪 AI가 돌려준 JSON 고치기 (prompts.js parseJSON) — 흔한 모델 실수들
import { open, makeStatus, check } from './lib.mjs';
const { page, close } = await open();
const cases = [
    ['```json\n{"a":1}\n```', { a: 1 }, '코드 울타리'],
    ['Sure! Here it is:\n{"a":1}\nHope it helps', { a: 1 }, '앞뒤 말'],
    ['{"a":1,}', { a: 1 }, '끝 쉼표'],
    ['{“a”: “b”}', { a: 'b' }, '둥근 따옴표로 감싼 키 · 값'],
    ['{"t": "그는 “안녕”이라 했다", "n": 1,}', { t: '그는 “안녕”이라 했다', n: 1 }, '글 안의 둥근 따옴표는 그대로 (다른 곳이 깨졌어도)'],
    ["{'a': 'b', 'c': 'it\"s'}", { a: 'b', c: 'it"s' }, '홑따옴표 JSON'],
    ['{"aff": +3, "list": [+1, -2]}', { aff: 3, list: [1, -2] }, '+3 숫자'],
    ['{"a": 1\n"b": 2}', { a: 1, b: 2 }, '줄 바꿈 사이 빠진 쉼표'],
    ['{"list": [{"x":1},{"x":2}\n{"x":3}]}', { list: [{ x: 1 }, { x: 2 }, { x: 3 }] }, '목록 안 빠진 쉼표'],
    ['{"a": "체력: +3 회복", "b": 1,}', { a: '체력: +3 회복', b: 1 }, '글 안의 「: +3」은 그대로'],
    ['{"a": "https://example.com/x", "b": 2,}', { a: 'https://example.com/x', b: 2 }, '주소 · 끝 쉼표'],
    ['{"a": 1, // note\n"b": 2}', { a: 1, b: 2 }, '// 주석'],
    ['{"list": [{"name":"A"},{"name":"B"},{"na', { list: [{ name: 'A' }, { name: 'B' }] }, '잘린 답'],
    ['{"a": True, "b": None, "c": False}', { a: true, b: null, c: false }, 'True · None · False'],
    ['<think>{"x":0}</think>{"a":1}', { a: 1 }, '생각 태그'],
];
try {
    const r = await page.evaluate(async (cs) => { const p = await import('/ext/src/prompts.js'); return cs.map(([t]) => { try { return JSON.stringify(p.parseJSON(t)); } catch (e) { return `FAIL ${e.message}`; } }); }, cases);
    cases.forEach(([, want, label], i) => check(r[i] === JSON.stringify(want), label, r[i]));
    // 🧠 생각 과정 떼기: 모든 AI 호출(문자 답장 같은 글 답도)
    const th = await page.evaluate(async () => { const p = await import('/ext/src/prompts.js'); return [p.stripThink('<think>음…</think>\n안녕'), p.stripThink('생각 중…\n</think>\n안녕'), p.stripThink('<thinking>a</thinking>안녕'), p.stripThink('그냥 안녕')].join('|'); });
    check(th === '안녕|안녕|안녕|그냥 안녕', 'stripThink', th);
    // AI가 세계 핵심을 null · 글로 돌려줘도 멈추지 않게 (예전엔 NORM.core(null)이 오류)
    const core = await page.evaluate(async () => { const c = await import('/ext/src/core.js'); try { return [c.NORM.core(null), c.NORM.core('x'), c.NORM.core({ title: 5 })].map(x => x.title).join('|'); } catch (e) { return `THROW ${e.message}`; } });
    check(core === '||5', 'NORM.core(null · 글 · 숫자 제목)', core);
    // 고장 난 모델이 끝없이 쓴 문자 답장: 한 줄 1,200자까지만 (채팅 파일이 커지지 않게)
    await makeStatus(page, ['profile', 'rel', 'contact', 'calendar']);
    const cap = await page.evaluate(async () => { const ai = await import('/ext/src/ai.js'); window.__ai = () => 'x'.repeat(20000) + '\n둘째 줄'; return (await ai.phoneReply('Leon', window.__SS_TEST__.api.app.current.state)).map(l => l.length).join(','); });
    check(cap === '1200,4', '문자 답장 한 줄 최대 1,200자', cap);
} finally { await close(); }
