// 🌐 상태창 번역 — 폰 화면 · HUD · 답 밑 칩에 보이는 글만 (본편 · 저장된 상태는 그대로)
//   · 화면을 긁지 않는다: 상태(S) · 설정집에서 고른 종류의 글만 모은다 (숫자 · 단위 · 이미 한국어인 글은 안 보냄)
//   · 🌐 용어집이 먼저: 용어집으로 다 바뀌는 글은 번역기에 안 보냄 · 보낼 때도 용어집을 입힌 글로 · 받은 뒤에도 한 번 더
//   · 새로 나온 말만 잠깐 모아서 한 번에 (차례로 한 묶음씩 · 동시에 여러 개 안 보냄) · 받은 번역은 채팅에 저장해서 다시 안 물음
//   · 오류면 남은 걸 보내지 않고 1분 쉼 · 알림은 한 번
//   · 엔진: free = 실리태번 기본 번역(무료 · 빠름) · ai = 고른 AI 연결(제대로 · 토큰)
import { app, ctx, settings, getMeta, saveMeta, TITLE } from '../base/st.js';
import { glossText, glossIn } from '../base/gloss.js';
import { short } from '../base/util.js';

export const TR_CATS = [
    ['trSent', 'sent', '문장', '세계 소식 · 속마음 · 기억 · 약속 · 성격 한 줄'],
    ['trPhrase', 'phrase', '단어 · 짧은 구절', '상태 · 날씨 · 행동 · 취향 · 분위기'],
    ['trPlace', 'place', '장소 이름', '지금 장소 · 가 본 곳 · 설정집 장소'],
    ['trName', 'name', '고유 명칭', '인물 · 물건 · 가게 상품 이름'],
    ['trUnit', 'unit', '숫자 · 단위', '돈 단위(Gold 같은)'],
];
export const trMode = () => { const m = settings().trMode; return m === 'free' || m === 'ai' ? m : 'off'; };
const catOn = (c) => { const k = TR_CATS.find(x => x[1] === c)?.[0]; return !!k && !!settings()[k]; };
const MAX_DICT = 2000, BATCH_N = 80, BATCH_CH = 3500, WAIT = 700, COOL = 60000;

// ───── 사전 (채팅마다 · 다른 기기에서도 같게) ─────  meta.tr2 = { 원문: { t: 번역, c: 종류, k?: 1(직접 고침 · 다시 번역에서 빠짐) } }
export const dict = (meta = getMeta()) => (meta ? (meta.tr2 ??= migrateOld(meta)) : {});
function migrateOld(meta) { // 옛 화면 번역 사전은 「단어」로 옮겨 두고 지움
    const out = {}; for (const [k, v] of Object.entries(meta.tr ?? {})) if (typeof v === 'string' && v && v !== k) out[k] = { t: v, c: 'phrase' };
    delete meta.tr; delete meta.trRules; delete meta.trOrig;
    return out;
}
let dictRev = 0;
function put(src, t, c, lock = false) {
    const D = dict(); delete D[src]; D[src] = { t, c, ...(lock ? { k: 1 } : {}) }; dictRev++;
    const keys = Object.keys(D); for (let i = 0; keys.length - i > MAX_DICT && i < keys.length; i++) if (!D[keys[i]].k) delete D[keys[i]];
}

// ───── 보낼 글인가 ─────
const FOREIGN = /[A-Za-z]{2}|[぀-ヿ㐀-鿿]/;
function needs(s) {
    if (!s || s.length > 400 || !FOREIGN.test(s)) return false;
    const ko = (s.match(/[가-힣]/g) ?? []).length, fo = (s.match(/[A-Za-z぀-ヿ㐀-鿿]/g) ?? []).length;
    if (ko >= fo) return false; // 이미 한국어가 많은 글
    if (/^[\s\d.,:+\-−%/×x~()]*[A-Za-z]{1,4}[\s\d.,]*$/.test(s) && /\d/.test(s)) return false; // 18.7ms · 3km · 632 tok
    if (/:\/\/|www\./i.test(s)) return false;
    return true;
}

// ───── 상태 · 설정집에서 고른 종류의 글 모으기 ─────
function collect(r) {
    const { S, book } = r, out = new Map();
    const add = (c, s) => { if (typeof s !== 'string') return; s = s.trim(); if (s && !out.has(s)) out.set(s, c); };
    const each = (c, L, f = (x) => x) => { for (const x of L ?? []) add(c, f(x)); };
    // 문장
    each('sent', S.news, n => n.text); each('sent', Object.values(S.mind ?? {})); each('sent', S.mindLog, m => m.text); each('sent', S.promises, p => p.text);
    for (const x of Object.values(S.rel ?? {})) { each('sent', x.mem, m => m.text); add('sent', x.life); add('sent', x.want); add('sent', x.jealous); add('sent', x.line); }
    for (const p of book.people ?? []) { add('sent', p.line); add('sent', p.want); each('sent', p.signs, s => s.text); }
    if (S.quote) { add('sent', S.quote.mean); add('sent', S.quote.why); } if (S.bgm) add('sent', S.bgm.why);
    // 단어 · 구절
    each('phrase', S.status, s => s.name); add('phrase', S.weather); if (S.bgm) add('phrase', S.bgm.mood);
    for (const pr of Object.values(S.pairs ?? {})) add('phrase', pr.label);
    for (const x of Object.values(S.rel ?? {})) { add('phrase', x.gone); each('phrase', x.seen?.likes); each('phrase', x.seen?.hates); }
    for (const p of book.people ?? []) { each('phrase', p.up, a => a.act); each('phrase', p.down, a => a.act); each('phrase', p.likes); each('phrase', p.hates); }
    each('phrase', book.stages, s => s.name); each('phrase', book.me?.needs, n => n.name); each('phrase', book.me?.gauges, g => g.name); each('phrase', book.me?.attrs, a => a.name);
    // 장소
    add('place', S.loc); each('place', S.visited); each('place', book.world?.places, p => p.name);
    // 명칭
    each('name', Object.keys(S.rel ?? {})); each('name', S.items, it => it.name); each('name', book.people, p => p.name);
    for (const pl of book.world?.places ?? []) each('name', pl.goods, g => g.name);
    // 단위
    add('unit', book.world?.currency);
    return out;
}

// ───── 모으기 → 한 번에 보내기 ─────
const pending = new Map();
let busy = false, timer = 0, coolUntil = 0, warned = '', lastScan = null;
export const trStats = { calls: 0, items: 0, ms: 0, lastError: '' };
export const trBusy = () => busy;
export function trScan(r) {
    if (trMode() === 'off' || !r?.S || r.S === lastScan) return;
    lastScan = r.S;
    const D = dict();
    for (const [s, c] of collect(r)) {
        if (D[s] || pending.has(s) || !catOn(c) || !needs(s)) continue;
        const g = glossText(s); if (!needs(g)) continue; // 용어집으로 다 바뀌면 안 보냄
        pending.set(s, c);
    }
    if (pending.size) { clearTimeout(timer); timer = setTimeout(run, WAIT); }
}
async function run() {
    if (busy || !pending.size || trMode() === 'off') return;
    if (Date.now() < coolUntil) { clearTimeout(timer); timer = setTimeout(run, coolUntil - Date.now() + 50); return; }
    const meta = getMeta(); if (!meta) return;
    const batch = []; let ch = 0;
    for (const [s, c] of pending) { const g = glossText(s); if (batch.length >= BATCH_N || (batch.length && ch + g.length > BATCH_CH)) break; batch.push({ s, c, g }); ch += g.length + 8; }
    busy = true; app.refresh?.();
    const t0 = performance.now();
    try {
        const got = await (trMode() === 'ai' ? viaAI(batch) : viaFree(batch));
        if (getMeta() !== meta) return; // 그새 다른 채팅
        for (const [k, b] of batch.entries()) {
            pending.delete(b.s);
            const t = got[k]?.trim();
            if (t) put(b.s, short(glossText(t), 400), b.c);
            else { b.miss = (missed.get(b.s) ?? 0) + 1; missed.set(b.s, b.miss); if (b.miss >= 2) put(b.s, b.s, b.c); else pending.set(b.s, b.c); } // 두 번 빠지면 원문 그대로 두고 다시 안 물음
        }
        trStats.calls++; trStats.items += batch.length; trStats.ms = Math.round(performance.now() - t0); trStats.lastError = '';
        saveMeta();
    } catch (e) {
        const msg = String(e?.message ?? e);
        trStats.lastError = short(msg, 200); coolUntil = Date.now() + COOL;
        console.info(`[${TITLE}] 번역 실패 · 1분 쉬어요 · ${msg}`);
        if (warned !== trMode()) { warned = trMode(); (await import('../ui/kit.js')).toast(`번역이 안 됐어요 · 1분 뒤 다시 해요 (${short(msg, 80)})${trMode() === 'free' ? ' · 확장 메뉴에서 실리태번 기본 「번역」 확장이 켜져 있는지 봐 주세요' : ''}`, 'bad'); }
    } finally {
        busy = false; app.refresh?.();
        if (pending.size) { clearTimeout(timer); timer = setTimeout(run, Date.now() < coolUntil ? coolUntil - Date.now() + 50 : 0); }
    }
}
const missed = new Map();
// [[1]] 글 · [[2]] 글 … — 번호로 맞춰서 줄 수가 달라도 맞는 것만 받음
const pack = (batch) => batch.map((b, i) => `[[${i + 1}]] ${b.g.replace(/\s*\n\s*/g, ' ')}`).join('\n');
function unpack(text, n) {
    const out = new Array(n).fill(''), re = /\[\[\s*(\d+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*\d+\s*\]\]|$)/g;
    for (let m; (m = re.exec(String(text ?? '')));) { const k = Number(m[1]) - 1; if (k >= 0 && k < n && !out[k]) out[k] = m[2].replace(/\s+/g, ' ').trim(); }
    return out;
}
// 무료: 실리태번 기본 번역 확장의 /translate 명령을 그대로 부름 (내부 파일을 직접 불러오지 않음)
async function viaFree(batch) {
    const C = ctx().SlashCommandParser?.commands, cmd = C instanceof Map ? C.get('translate') : C?.translate;
    if (typeof cmd?.callback !== 'function') throw new Error('실리태번 기본 번역(/translate)을 찾지 못했어요');
    const es = ctx().extensionSettings?.translate ?? {};
    const out = await cmd.callback({ target: 'ko', ...(es.provider ? { provider: es.provider } : {}) }, pack(batch));
    if (typeof out !== 'string' || !out.trim()) throw new Error('번역 결과가 비었어요');
    return unpack(out, batch.length);
}
// 제대로: AI 1회 (번역 연결 → 없으면 상태창 만들기 연결) · 그 묶음에 나온 용어만 같이
async function viaAI(batch) {
    const terms = glossIn(batch.map(b => b.s).join('\n'));
    const sys = 'You translate short UI texts of a roleplay status window into natural, concise Korean. '
        + 'Keep every [[n]] marker and output exactly one line per marker, nothing else. Keep numbers and units as they are. '
        + 'Proper names: keep the original spelling unless the glossary gives a Korean form.'
        + (terms.length ? ` Glossary (always use the right side): ${terms.map(g => `${g.from}=${g.to}`).join(', ')}` : '');
    const prof = settings().trProfile, c = ctx();
    let text;
    if (prof && c.ConnectionManagerRequestService) { const r = await c.ConnectionManagerRequestService.sendRequest(prof, [{ role: 'system', content: sys }, { role: 'user', content: pack(batch) }], 3000, { stream: false, extractData: true, includePreset: false, includeInstruct: false }); text = String(r?.content ?? r ?? ''); }
    else text = await (await import('../rules/ai.js')).ask(pack(batch), sys);
    if (!String(text ?? '').trim()) throw new Error('AI 답이 비었어요');
    return unpack(text, batch.length);
}

// ───── 다시 번역 ─────  하나 · 종류 · 전부 (직접 고친 것은 하나씩만)
export function retranslate({ src = null, cat = null } = {}) {
    const D = dict(); let n = 0;
    for (const [s, e] of Object.entries(D)) {
        if (src != null ? s !== src : (e.k || (cat && e.c !== cat))) continue;
        delete D[s]; missed.delete(s); pending.set(s, e.c); n++;
    }
    if (n) { dictRev++; lastScan = null; saveMeta(); clearTimeout(timer); timer = setTimeout(run, 50); app.refresh?.(); }
    return n;
}
export function setTr(src, t) { const e = dict()[src]; put(src, t, e?.c ?? 'phrase', true); saveMeta(); app.refresh?.(); }
export function dropTr(src) { delete dict()[src]; dictRev++; saveMeta(); app.refresh?.(); }

// ───── 화면에 입히기 ─────  (용어집보다 먼저 · 입력칸 · 코드 · 끈 곳은 안 건드림)
let mcache = { key: '', re: null, list: [] };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isW = (ch) => /[A-Za-z0-9]/.test(ch ?? '');
function matcher(D, meta) {
    const key = `${dictRev}|${Object.keys(D).length}|${meta?.tr2 === D ? 1 : 0}`;
    if (mcache.key === key && mcache.D === D) return mcache;
    const list = Object.entries(D).filter(([s, e]) => e.t && e.t !== s).sort((a, b) => b[0].length - a[0].length);
    let re = null; try { re = list.length ? new RegExp(list.map(([s]) => `(${escRe(s)})`).join('|'), 'g') : null; } catch { re = null; }
    mcache = { key, re, list, D };
    return mcache;
}
export function trText(t) {
    if (trMode() === 'off' || !t) return t;
    const meta = getMeta(), D = meta?.tr2; if (!D) return t;
    const raw = String(t), s = raw.trim();
    if (D[s]?.t) return raw.replace(s, D[s].t);
    if (s.endsWith('…') && s.length > 4) { const head = s.slice(0, -1); const hit = Object.keys(D).find(k => k.startsWith(head)); if (hit && D[hit].t !== hit) return raw.replace(s, short(D[hit].t, s.length)); } // 잘린 글
    const { re, list } = matcher(D, meta); if (!re) return raw;
    return raw.replace(re, (...m) => {
        const at = m[list.length + 1], k = m.slice(1, list.length + 1).findIndex(x => x != null);
        if (k < 0) return m[0];
        const [src, e] = list[k];
        if ((isW(src[0]) && isW(raw[at - 1])) || (isW(src.slice(-1)) && isW(raw[at + m[0].length]))) return m[0];
        return e.t;
    });
}
export function applyTr(root) {
    if (trMode() === 'off' || !root || !getMeta()?.tr2) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('input, textarea, script, style, pre, .ml-tr-off') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { const t = trText(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
}
export const trSig = () => (trMode() === 'off' ? 'off' : `${trMode()}|${dictRev}|${Object.keys(getMeta()?.tr2 ?? {}).length}`);
