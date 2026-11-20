// 🌐 용어집 (번역 고정) — 모든 채팅 + 이 채팅. 상태창 화면 · 이름 맞추기 · 미트볼 AI 호출에서만 쓴다 (본편엔 안 감)
import { settings, getMeta } from './st.js';
export const glossList = () => [...(settings().glossary ?? []), ...(getMeta()?.glossary ?? [])].filter(g => g?.from && g?.to);
export const gloss = () => { const L = glossList(); return L.length ? `Glossary (always use the right side): ${L.map(g => `${g.from}=${g.to}`).join(', ')}` : ''; };
// 화면 글에 용어집을 입힌다 (HUD · 폰 화면)
export function applyGloss(root) {
    const L = glossList(); if (!L.length || !root) return;
    const res = L.map(g => [new RegExp(g.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), g.to]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('input, textarea, script, style, .ml-gloss-off') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { let t = n.nodeValue; for (const [re, to] of res) t = t.replace(re, to); if (t !== n.nodeValue) n.nodeValue = t; }
}
