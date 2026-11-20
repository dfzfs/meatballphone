// 🌐 이야기 언어 — AI에게 가는 것(설정집 값 · 본편 지시 · 분류)은 이야기 언어로, 화면은 번역(🌐)으로 한국어
//   설정 saveLang: auto(채팅 글을 보고) · en · ko
import { settings, getMeta, ctx } from '../base/st.js';

export const textLang = (t) => { t = String(t ?? ''); const h = (t.match(/[가-힣]/g) ?? []).length, l = (t.match(/[A-Za-z]/g) ?? []).length; if (h * 2 + l < 60) return null; return h * 2 >= l ? 'ko' : 'en'; }; // 글이 너무 짧으면 모름 (카드 첫 메시지 → 한국어)
let memo = { key: '', v: 'ko' };
export function storyLang() {
    const s = settings().saveLang; if (s === 'ko' || s === 'en') return s;
    const m = getMeta(); if (m?.lang === 'ko' || m?.lang === 'en') return m.lang;
    const c = ctx(), chat = c.chat ?? [], key = `${c.getCurrentChatId?.() ?? ''}|${Math.min(chat.length, 8)}`;
    if (memo.key === key) return memo.v;
    // 사용자 말 · AI 답 앞쪽 몇 개 (태그 · 꾸밈은 빼고) — 없으면 카드 첫 메시지
    // 이야기 언어 = AI 답의 언어 (사용자는 한국어로 쳐도 답이 영어면 영어)
    let t = chat.filter(x => !x.is_system && !x.is_user).slice(0, 6).map(x => String(x.mes ?? '').replace(/<[^>]+>/g, ' ')).join('\n').slice(0, 4000);
    if (!t.trim()) t = String(c.characters?.[c.characterId]?.first_mes ?? '');
    memo = { key, v: textLang(t) ?? textLang(c.characters?.[c.characterId]?.first_mes) ?? 'ko' };
    return memo.v;
}
export const isEN = () => storyLang() === 'en';
