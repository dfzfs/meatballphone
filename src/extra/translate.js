// 🌐 상태창 번역 — 영어로 저장하는 채팅에서만: 저장은 영어 그대로, 화면만 한국어로 (본편엔 영향 없음)
//   사전 = 채팅 메타 tr { 영어: 한국어 } · 🌐 용어집(번역 고정)이 늘 먼저 · 모르는 말은 모아서 AI 1회 (화면이 열려 있을 때만 · 몇 초 기다렸다가)
import { app, settings, getMeta, saveMeta } from '../base/st.js';
import { glossList } from '../base/gloss.js';
import { ask, parseJSON } from '../rules/ai.js';

export const trOn = () => settings().saveLang === 'en';
const LATIN = /[A-Za-z]{2,}/;
const pending = new Set();
let timer = 0, busy = false;
export const trBusy = () => busy || pending.size > 0;

function dict() {
    const meta = getMeta(); const d = { ...(meta?.tr ?? {}) };
    for (const g of glossList()) d[g.from] = g.to; // 용어집이 이긴다
    return d;
}
// 화면 글자 바꾸기: 통째로 같은 글 → 사전, 아니면 사전에 있는 말을 길이 순서로 바꿔 넣음 · 모르는 영어 덩어리는 모아 둠
// 번역 규칙 (예: 「이름은 원어 발음 · 존댓말 없이 · 짧게」) — 이 채팅 것이 먼저, 없으면 모든 채팅
export const trRules = () => (getMeta()?.trRules || settings().trRules || '').trim();
// 👁 원문 보기: 잠깐 번역을 끄고 영어 그대로
export const trOrig = () => !!getMeta()?.trOrig;
export function applyTr(root) {
    if (!trOn() || !root || trOrig()) return;
    const d = dict(), keys = Object.keys(d).sort((a, b) => b.length - a.length);
    const res = keys.map(k => [new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), d[k]]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('input, textarea, script, style, pre, .ml-tr-off') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) {
        const raw = n.nodeValue, t = raw.trim(); if (!LATIN.test(t)) continue;
        if (d[t]) { n.nodeValue = raw.replace(t, d[t]); continue; }
        let x = raw; for (const [re, to] of res) x = x.replace(re, to);
        if (x !== raw) n.nodeValue = x;
        // 아직 영어가 남은 덩어리 (문장 부호로 자름 · 너무 긴 건 빼고)
        for (const piece of x.split(/[·|,()\[\]「」:→]/)) { const p = piece.trim(); if (LATIN.test(p) && p.length <= 80 && !d[p]) pending.add(p); }
    }
    if (pending.size && settings().trAuto !== 'off') { clearTimeout(timer); timer = setTimeout(flush, 1500); }
}
// 모은 말 번역 (AI 1회 · 60개씩)
export async function flush() {
    if (busy || !pending.size || !document.getElementById('ml-full')) return;
    busy = true;
    const list = [...pending].slice(0, 60); list.forEach(x => pending.delete(x));
    try {
        const g = glossList(), rules = trRules(); const raw = await ask(`Translate each item into natural Korean for a game status window (names: keep a natural Korean reading). Return JSON object {"original":"번역"} only.\n${rules ? `Rules: ${rules}\n` : ''}${g.length ? `Fixed: ${g.map(x => `${x.from}=${x.to}`).join(', ')}\n` : ''}${JSON.stringify(list)}`, 'You translate UI terms. JSON only.');
        const j = parseJSON(raw);
        if (j && typeof j === 'object') { const meta = getMeta(); meta.tr ??= {}; for (const [k, v] of Object.entries(j)) if (typeof v === 'string' && v.trim() && list.includes(k)) meta.tr[k] = v.trim().slice(0, 80); saveMeta(); }
    } catch (e) { console.warn('[미트볼 라이트] 번역 실패', e); }
    busy = false; app.refresh?.();
}
export const trList = () => Object.entries(getMeta()?.tr ?? {});
