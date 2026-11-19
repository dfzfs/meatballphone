// 🌐 용어집 (번역 고정) — 모든 채팅 + 이 채팅. 상태창 화면 · 이름 맞추기 · 미트볼 AI 호출에서만 쓴다 (본편엔 안 감)
import { settings, getMeta } from './st.js';
export const glossList = () => [...(settings().glossary ?? []), ...(getMeta()?.glossary ?? [])].filter(g => g?.from && g?.to);
export const gloss = () => { const L = glossList(); return L.length ? `Glossary (always use the right side): ${L.map(g => `${g.from}=${g.to}`).join(', ')}` : ''; };
