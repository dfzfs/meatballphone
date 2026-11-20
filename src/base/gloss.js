// 🌐 용어집 (표기 고정) — 「Leon → 레온」. 모든 채팅 + 이 채팅. 상태창 화면 · 이름 맞추기 · 미트볼 AI 호출에서만 쓴다 (본편엔 안 감)
//   · 이 채팅 것이 먼저: 같은 말(대소문자 · 띄어쓰기 · 하이픈 무시)이 둘 다 있으면 이 채팅 것만
//   · 영어 · 숫자로 시작하거나 끝나는 말은 낱말로만 바꾼다 (「Leo」가 「Leon」 안에서 바뀌어 「레오n」이 되던 것)
//   · AI에는 그 글에 나온 말만 보낸다 (용어집이 길어도 토큰이 늘지 않게)
import { settings, getMeta } from './st.js';

export const GLOSS_MAX = 200;
const ok = (t) => typeof t === 'string' && t.trim() && t.length <= 60 && !/[\r\n<>]/.test(t);
// 찾기용: 소문자 · 하이픈 · 밑줄 · 가운뎃점 · 연속 공백을 한 칸으로
export const fold = (t) => String(t ?? '').toLowerCase().replace(/[\s\-‐‑–—_·・]+/g, ' ').trim();
export function glossList() {
    const seen = new Set(), out = [];
    for (const g of [...(getMeta()?.glossary ?? []), ...(settings().glossary ?? [])]) {
        if (!ok(g?.from) || !ok(g?.to)) continue;
        const k = fold(g.from); if (!k || seen.has(k)) continue;
        seen.add(k); out.push({ from: g.from.trim(), to: g.to.trim() });
        if (out.length >= GLOSS_MAX) break;
    }
    return out;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isW = (ch) => /[A-Za-z0-9]/.test(ch ?? '');
// 「Sky-Tower」 「sky tower」를 같은 말로 (옛 아이폰 사파리는 뒤보기 정규식을 못 써서 낱말 경계는 아래에서 직접 본다)
const patternOf = (from) => from.trim().split(/[\s\-‐‑–—_·・]+/).filter(Boolean).map(esc).join('[\\s\\-‐‑–—_·・]+');
const edgeOk = (g, s, at, len) => !((isW(g.from.trim()[0]) && isW(s[at - 1])) || (isW(g.from.trim().slice(-1)) && isW(s[at + len])));
let reCache = { key: '', re: null, list: [] };
function matcher(L) {
    const key = L.map(g => `${g.from}\u0001${g.to}`).join('\u0002');
    if (reCache.key === key) return reCache;
    const list = [...L].sort((a, b) => b.from.length - a.from.length); // 긴 말 먼저 (「Sky Tower」가 「Sky」보다)
    let re = null;
    try { re = list.length ? new RegExp(list.map(g => `(${patternOf(g.from)})`).join('|'), 'gi') : null; } catch { re = null; }
    reCache = { key, re, list };
    return reCache;
}
// 글 하나에 용어집 입히기 (한 번에 · 바꾼 말을 다시 바꾸지 않음)
export function glossText(t, L = glossList()) {
    if (!L.length || !t) return t;
    const { re, list } = matcher(L); if (!re) return t;
    const s = String(t);
    return s.replace(re, (...m) => {
        const at = m[list.length + 1], k = m.slice(1, list.length + 1).findIndex(x => x != null);
        return k >= 0 && edgeOk(list[k], s, at, m[0].length) ? list[k].to : m[0];
    });
}
// 이 글에 나온 용어만
export function glossIn(text, L = glossList()) {
    const s = String(text ?? ''); if (!L.length || !s) return [];
    return L.filter(g => { let re; try { re = new RegExp(patternOf(g.from), 'gi'); } catch { return false; } for (let m; (m = re.exec(s));) { if (edgeOk(g, s, m.index, m[0].length)) return true; if (!m[0]) re.lastIndex++; } return false; });
}
// AI에 붙일 한 줄 — text를 주면 그 글에 나온 말만 (없으면 모두)
export const gloss = (text) => { const L = text == null ? glossList() : glossIn(text); return L.length ? `Glossary (always use the right side): ${L.map(g => `${g.from}=${g.to}`).join(', ')}` : ''; };
// 화면 글에 용어집을 입힌다 (HUD · 폰 화면) — 입력칸 · 코드 · 끈 곳은 건드리지 않음
export function applyGloss(root) {
    const L = glossList(); if (!L.length || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('input, textarea, script, style, pre, .ml-gloss-off') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { const t = glossText(n.nodeValue, L); if (t !== n.nodeValue) n.nodeValue = t; }
}
