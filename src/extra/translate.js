// 🌐 상태창 번역 — 영어로 저장하는 채팅에서만: 저장은 영어 그대로, 화면만 한국어로 (본편엔 영향 없음)
//   사전 = 채팅 메타 tr { 영어: 한국어 } · 🌐 용어집(번역 고정)이 늘 먼저 · 모르는 말은 모아서 AI 1회 (화면이 열려 있을 때만 · 몇 초 기다렸다가)
import { app, settings, getMeta, saveMeta } from '../base/st.js';
import { glossList } from '../base/gloss.js';
import { ask, parseJSON } from '../rules/ai.js';

export const trOn = () => settings().saveLang === 'en';
const LATIN = /[A-Za-z]{2,}/;
const pending = new Set();
let timer = 0, busy = false;
const engine = () => (settings().trEngine === 'ai' ? 'ai' : 'st'); // st = 실리 기본 번역(무료 · 빠름 · dev와 같음) · ai = AI(분류 연결)
const autoOn = () => engine() === 'st' || settings().trAuto !== 'off'; // 실리 기본 번역은 무료라 늘 저절로 · AI는 설정대로
export const trBusy = () => busy || (pending.size > 0 && autoOn()); // 실제로 번역할 때만 「번역 중」

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
        for (const piece of x.split(/[·|,()\[\]「」:→]/)) { const p = piece.trim(); if (LATIN.test(p) && p.length <= 300 && !d[p] && !tried.has(p)) pending.add(p); }
    }
    if (pending.size && autoOn()) { clearTimeout(timer); timer = setTimeout(flush, 400); }
}
// ───── 실리 기본 번역 (Chat Translation 확장의 translate() · dev 미트볼과 같은 길 · 토큰 0) ─────
let stMod = null;
async function stTranslate(text) {
    let fn = typeof globalThis.translate === 'function' ? globalThis.translate : null;
    if (!fn && (await import('../base/st.js')).ctx().extensionSettings?.translate) { try { stMod ??= await import('/scripts/extensions/translate/index.js'); } catch { stMod = {}; } fn = stMod?.translate; } // 번역 확장이 없으면 불러오지도 않음
    if (typeof fn !== 'function') throw new Error('실리 번역 확장을 찾지 못했어요');
    const es = (await import('../base/st.js')).ctx().extensionSettings?.translate ?? {};
    const out = await fn(String(text), 'ko', es.provider || 'google');
    if (typeof out !== 'string') throw new Error('실리 번역 실패');
    return out;
}
// 줄로 묶어서 한 번에 (40줄 · 1,500자씩 · 세 묶음 동시에) · 줄 수가 안 맞으면 그 묶음만 하나씩
async function stMany(list) {
    const out = {}, batches = []; let cur = [], len = 0;
    for (const s of list) { if (cur.length && (len + s.length > 1500 || cur.length >= 40)) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += s.length + 1; }
    if (cur.length) batches.push(cur);
    const one = async (b) => {
        let lines = null; try { lines = (await stTranslate(b.join('\n'))).split(/\r?\n/).map(x => x.trim()).filter(Boolean); } catch (e) { console.warn('[미트볼폰] 실리 번역 묶음', e); }
        if (lines && lines.length === b.length) b.forEach((s, i) => { out[s] = lines[i]; });
        else await Promise.all(b.map(async (s) => { try { out[s] = (await stTranslate(s)).trim(); } catch { /* 건너뜀 */ } }));
    };
    const q = [...batches]; await Promise.all(Array.from({ length: Math.min(3, q.length) }, async () => { while (q.length) await one(q.shift()); }));
    return out;
}
// 모은 말 번역 (실리 기본 번역이면 토큰 0 · AI면 1회 120개씩 · 남은 게 있으면 바로 이어서 · 두 묶음까지 동시에)
//   가벼운 연결(분류 모델과 같은 깨끗한 경로 · 생각 최소)로 보내서 빠르게
let running = 0, stWarned = false;
const tried = new Set(); // 이번에 물어봤는데 답이 없던 말은 다시 안 물음 (같은 말을 계속 부르는 것 막기)
export async function flush() {
    if (running >= 2 || !pending.size || !document.getElementById('ml-full')) return;
    running++; busy = true;
    const list = [...pending].slice(0, 120); list.forEach(x => pending.delete(x));
    if (pending.size) setTimeout(flush, 0); // 다음 묶음은 기다리지 않고 바로
    try {
        if (engine() === 'st' && (typeof globalThis.translate === 'function' || (await import('../base/st.js')).ctx().extensionSettings?.translate)) { // 실리 번역 확장이 없으면 AI 길로
            const j = await stMany(list).catch(() => null);
            list.forEach(x => tried.add(x));
            if (j && Object.keys(j).length) { const meta = getMeta(); meta.tr ??= {}; for (const [k, v] of Object.entries(j)) if (v && v !== k) meta.tr[k] = v.slice(0, 400); saveMeta(); }
            else if (!stWarned) { stWarned = true; console.warn('[미트볼폰] 실리 기본 번역이 안 돼요 — 확장 메뉴 › Chat Translation을 켜거나, 설정에서 번역 담당을 AI로'); }
            running--; busy = running > 0; app.refresh?.(); return;
        }
        const g = glossList(), rules = trRules(); const { askLight } = await import('../rules/classify.js'); const raw = await askLight('You translate UI terms. JSON only.', `Translate each item into natural Korean for a game status window (names: keep a natural Korean reading). Return JSON object {"original":"번역"} `
            + `only.\n${rules ? `Rules: ${rules}\n` : ''}${g.length ? `Fixed: ${g.map(x => `${x.from}=${x.to}`).join(', ')}\n` : ''}`
            + `${JSON.stringify(list)}`);
        const j = parseJSON(raw);
        list.forEach(x => tried.add(x));
        if (j && typeof j === 'object') { const meta = getMeta(); meta.tr ??= {}; for (const [k, v] of Object.entries(j)) if (typeof v === 'string' && v.trim() && list.includes(k)) meta.tr[k] = v.trim().slice(0, 400); saveMeta(); }
    } catch (e) { console.warn('[미트볼폰] 번역 실패', e); }
    running--; busy = running > 0; app.refresh?.();
}
export const trList = () => Object.entries(getMeta()?.tr ?? {});
