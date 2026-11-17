// 🧪 AI가 돌려준 JSON 고치기 (prompts.js parseJSON) — 흔한 모델 실수들
import { open, check } from './lib.mjs';
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
} finally { await close(); }
