// 상태 엔진: <meatball> 변화량 → 상태 재계산 · 직접 편집 기록 · 프롬프트 주입
import {
    letterMode, instantLetter, contactSimple, app, ctx, settings, getMeta, saveMeta, modOn, MOD_IDS, MOD, EMPTY, DIFFS, NORM, normalize, clone, clamp, num, norm, findBy, splitBar, fmtNum, short, dayIndex, addDays, dateStr, eventsOn, parseDate, nowTick, tickUnit, stamp, esc,
    waitText, setAlias, TITLE, INJECT_KEY, INJECT_KEY2, INJECT_KEY3, INJECT_KEY4, trLook, trBack, viewTr, weekday, PROMPT_IN_CHAT, ROLE_SYSTEM, MODULE, AI_PARTS, aiOff, uid, diffOf, LOG, loveIndex, CONTACT_MODES, tidy, msgText, DEFAULT_STAGES, arr, playOf, swapUser, ssWarn, relAxes, INJ, isHidden, modOnRaw, DATA_V, normPlay, ssNote, heroIsUser,
} from './core.js';
import { P } from './prompts.js';
import { pairStage, KEYMAP, KEY_MOD, seeded, effSum, today, applyLines, seasonOf, pickWeather, stageIndex, noLoveStage, updateStage, startDay, applyOp, stagesOn, dateFromIndex , needsTick } from './ops.js';
export * from './ops.js'; // 떼어 낸 것 — 다른 파일은 예전처럼 여기서 받아도 된다


// 미트볼 블록 = <meatball> (v2.5.1~) · 예전 <status>.
// 다른 프리셋도 <status>를 쓸 수 있어서(<summary>/<details>, 「| Physical:」 표 모양) 그런 블록은 읽지도 지우지도 않는다.
const FOREIGN_RE = /<summary\b|<details\b|\|\s*Physical\s*:|Relationship \(mutual/i;
// 옛 <status>도 미트볼 것으로 읽을지 (v2.5 이전 채팅 호환 · 다른 프리셋이 <status>를 쓰면 끄기)
const legacyOn = () => { try { return settings().legacyStatus !== false; } catch { return true; } };
// 블록 찾기 — 닫는 태그가 있으면 거기까지.
// <meatball>을 안 닫았으면: 「키: 값」 모양의 줄이 이어지는 데까지만 (사이의 빈 줄은 허용). 태그로 시작하는 줄(</prose>, <tracker>)이나 이야기 문장에서 멈춘다.
//   → 예전엔 글 끝까지 다 지웠음. 읽히는 변화(키: 값)는 예전과 같아서 옛 채팅의 숫자는 그대로.
// 옛 <status>는 예전 규칙 그대로 (안 닫혔으면 글 끝·다음 블록까지) — 옛 채팅 호환. 다른 프리셋 모양(<details>·표)이면 건드리지 않는다.
// 「키: 값」 줄이 이어지는 데까지 — 값이 따옴표로 시작하면 대사(「레온: "안녕"」)로 보고 멈추되, 아는 키(「loc: "Tavern"」)면 변화 줄로 읽는다
const KV_LINE = /^\s*(?:[-*•]\s*|\d+[.)]\s*)?([^<:：\n]{1,24})[:：]([^\n]*)$/;
function kvRun(rest) {
    let len = 0;
    for (const part of rest.split(/(\n)/)) {
        if (part === '\n' || !part.trim()) { len += part.length; continue; }
        const m = KV_LINE.exec(part);
        if (!m) break;
        if (/^\s*["“”'‘’「『]/.test(m[2]) && !KEYMAP[m[1].replace(/\*\*|__|`/g, '').trim().toLowerCase()]) break;
        len += part.length;
    }
    return rest.slice(0, len).replace(/\s+$/, '');
}
function scanBlocks(text) {
    const t = String(text ?? '');
    const out = [];
    const open = /<(meatball|status)>/gi;
    let m;
    while ((m = open.exec(t))) {
        const tag = m[1].toLowerCase(), from = m.index + m[0].length;
        const close = t.toLowerCase().indexOf(`</${tag}>`, from);
        open.lastIndex = from;
        const nx = (() => { const r = /<(?:meatball|status)>/gi; r.lastIndex = from; const k = r.exec(t); return k ? k.index : -1; })();
        let end, body, closed = close >= 0 && (nx < 0 || close < nx);
        if (closed) { body = t.slice(from, close); end = close + tag.length + 3; }
        else if (tag === 'meatball') {
            const rest = nx < 0 ? t.slice(from) : t.slice(from, nx);
            body = kvRun(rest); end = from + body.length;
        } else { body = nx < 0 ? t.slice(from) : t.slice(from, nx); end = from + body.length; } // 옛 <status>: 예전 그대로
        let start = m.index; while (start > 0 && /\s/.test(t[start - 1])) start--;
        const ours = tag === 'meatball' || (legacyOn() && !FOREIGN_RE.test(body));
        out.push({ start, end, tag, body, ours, all: t.slice(start, end) });
        open.lastIndex = end;
    }
    return out;
}
const cut = (text, spans) => { let t = String(text ?? ''); for (const b of [...spans].reverse()) t = t.slice(0, b.start) + t.slice(b.end); return t; };
export const ourBlocks = (text) => scanBlocks(text).filter(b => b.ours).map(b => Object.assign([b.all, b.tag, b.body], { index: b.start }));
export const hasStatus = (text) => ourBlocks(text).length > 0;
export const removeStatus = (text) => cut(text, scanBlocks(text).filter(b => b.ours));
export function extractOps(text) {
    const ops = [];
    const seen = new Set(); // 이어 쓰기 등으로 블록이 두 개면, 앞 블록에 똑같이 있던 줄은 다시 세지 않는다
    for (const m of ourBlocks(text)) {
        const mine = [];
        for (const line of m[2].split(/\r?\n/)) {
            // 가벼운 모델이 붙이는 꾸밈(**굵게**, `코드`, 번호)을 벗겨 낸다
            const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*|__|`/g, '');
            const lm = clean.match(/^\s*([^:：\n]{1,24}?)\s*[:：]\s*(.+?)\s*$/);
            if (lm && !/^```/.test(lm[1])) { const k = `${norm(lm[1])}\u0000${norm(lm[2])}`; if (!seen.has(k)) { ops.push([lm[1].trim(), lm[2]]); mine.push(k); } }
        }
        for (const k of mine) seen.add(k);
    }
    return ops;
}
// 읽기용(요약·앨범·AI에게 보내는 최근 대화): 미트볼 블록과 다른 프리셋의 상태 블록을 모두 뺀 이야기 본문
export const stripStatus = (t) => cut(t, scanBlocks(t).filter(b => b.ours || (b.tag === 'status' && b.end > b.start))).trim();

// ───── 서랍: <status>를 읽은 뒤 본문에서 떼어 메시지 숨은 칸(extra)에 보관 ─────
// 본문엔 이야기만 남아서 다른 확장(요약·번역·로그 복사)이 변화량 줄을 보지 않는다.
export function drawerOps(m) {
    const d = m?.extra?.[MODULE]?.bySwipe?.[m?.swipe_id ?? 0];
    return Array.isArray(d) ? d : null;
}
// 실리는 왼쪽으로 스와이프할 때 지금 답(mes · extra)을 스와이프 칸에 저장하지 않아요 → 고친 것을 직접 같이 적어 둔다
// 굳힌 답에 보일 칩: 굳힐 때 적어 둔 글 → 없으면(예전에 굳힌 답) 보관된 변화 줄을 그대로 (속마음 줄은 숨김)
const RAW_CHIP = new Set(['stat', 'attr', 'cond', 'cash', 'item', 'loc', 'aff', 'trust', 'date', 'time', 'weather']); // 속마음 · 기사 본문 같은 긴 글 · 숨긴 정보는 안 보임
export function bakedLabels(m) {
    if (!m || m.is_user) return null;
    const saved = m.extra?.[MODULE]?.chips?.[m.swipe_id ?? 0];
    if (Array.isArray(saved) && saved.length) return saved.map(String);
    const ops = drawerOps(m);
    if (!ops?.length) return null;
    const out = ops.filter(([k]) => RAW_CHIP.has(KEYMAP[String(k).trim().toLowerCase()])).map(([k, v]) => `${String(k).trim()} ${String(v).trim()}`.slice(0, 60));
    return out.length ? out.slice(0, 14) : null;
}
export function syncSwipe(m) {
    const sid = m.swipe_id;
    if (typeof sid !== 'number' || !Array.isArray(m.swipes) || typeof m.swipes[sid] !== 'string') return;
    m.swipes[sid] = m.mes;
    if (Array.isArray(m.swipe_info) && m.swipe_info[sid] && typeof m.swipe_info[sid] === 'object') m.swipe_info[sid].extra = structuredClone(m.extra);
}
// 스와이프를 지우면 실리가 뒤쪽 스와이프 번호를 하나씩 당긴다 → 답마다 「스와이프 번호 → 변화」로 적어 둔 것도 같이 당긴다 (v2.7.10)
// (안 당기면 앞 스와이프를 지운 뒤 지금 스와이프의 변화를 못 찾아 숫자가 조용히 바뀌었음)
export function shiftSwipeKeys(m, removed) {
    if (!m || !Number.isInteger(removed)) return false;
    const seen = new Set();
    let changed = false;
    const fix = (ex) => {
        const b = ex?.[MODULE];
        if (!b || typeof b !== 'object' || seen.has(b)) return;
        seen.add(b);
        for (const key of ['bySwipe', 'skip']) {
            const o = b[key];
            if (!o || typeof o !== 'object') continue;
            const n = {};
            for (const [k, v] of Object.entries(o)) {
                const i = Number(k);
                if (!Number.isInteger(i)) { n[k] = v; continue; }
                if (i === removed) { changed = true; continue; }
                if (i > removed) changed = true;
                n[i > removed ? i - 1 : i] = v;
            }
            b[key] = n;
        }
    };
    fix(m.extra);
    for (const si of Array.isArray(m.swipe_info) ? m.swipe_info : []) fix(si?.extra);
    return changed;
}
export function setDrawer(m, ops) {
    m.extra ??= {};
    m.extra[MODULE] ??= {};
    m.extra[MODULE].bySwipe ??= {};
    m.extra[MODULE].bySwipe[m.swipe_id ?? 0] = ops;
    syncSwipe(m);
}
// replace = true: 서랍을 새 내용으로 바꿈 / false: 이어 쓰기(continue)처럼 뒤에 덧붙임
export function stashStatus(m, { replace = false } = {}) {
    if (!m || m.is_user || typeof m.mes !== 'string' || !hasStatus(m.mes)) return false;
    const ops = extractOps(m.mes);
    const old = replace ? [] : (drawerOps(m) ?? []);
    m.mes = removeStatus(m.mes).replace(/\s+$/, ''); // 다른 프리셋의 <status>는 본문에 그대로
    // 이어 쓰기: 모델이 앞에서 쓴 변화를 다시 적으면 두 번 세지 않게 (새로 생긴 줄만 덧붙임)
    const had = new Set(old.map(([k, v]) => `${norm(k)}\u0000${norm(v)}`));
    setDrawer(m, [...old, ...ops.filter(([k, v]) => !had.has(`${norm(k)}\u0000${norm(v)}`))]);
    return true;
}
// 한 메시지의 모든 스와이프에서 태그를 보관 (옛 채팅 정리용) → 옮긴 개수
export function stashAllSwipes(m) {
    if (!m || m.is_user) return 0;
    let n = 0;
    if (Array.isArray(m.swipes)) m.swipes.forEach((t, sid) => {
        if (sid === (m.swipe_id ?? 0) || typeof t !== 'string' || !hasStatus(t)) return;
        const info = m.swipe_info?.[sid];
        if (!info || typeof info !== 'object') return; // 보관할 칸이 없으면 그대로 둔다
        info.extra ??= {}; info.extra[MODULE] ??= {}; info.extra[MODULE].bySwipe ??= {};
        info.extra[MODULE].bySwipe[sid] = extractOps(t);
        m.swipes[sid] = removeStatus(t).replace(/\s+$/, '');
        n++;
    });
    if (stashStatus(m, { replace: true })) n++;
    return n;
}
// 상태 계산에 넣을 AI 메시지인가: 숨김(/hide·요약 확장)으로 is_system이 된 답도 포함, 진짜 시스템 메시지(extra.type)는 제외
// 🙈 hideSkip: 눈 단추로 직접 숨긴 답(extra.ss_skip — index.js가 눈 단추를 누를 때 적는다)은 뺀다 · 숨김을 풀면 표식도 지워져 그대로 돌아온다
// 🛡 guardData: 실리태번이 쓰는 종류가 아닌 extra.type(다른 확장이 답을 빼려고 적어 둔 표식)은 못 본 걸로 하고 그대로 더한다
const ST_SYS = new Set(['help', 'welcome', 'group', 'empty', 'generic', 'narrator', 'comment', 'slash_commands', 'formatting', 'hotkeys', 'macros', 'welcome_prompt', 'assistant_note', 'assistant_message']);
const sysType = (m) => { const t = m.extra?.type; return !!t && (settings().guardData !== true || ST_SYS.has(String(t))); };
export const isStoryAI = (m) => !!m && !m.is_user && (!m.is_system || (!sysType(m) && !(m.extra?.ss_skip === true && settings().hideSkip === true)));

export const priceMul = (s) => Math.max(0.1, 1 + effSum(s, /(?:가격|물가|prices?)\s*([+\-−]?\d+(?:\.\d+)?)\s*%/i) / 100);
export const loanBlocked = (s) => (s?.data?.fate?.curses ?? []).some(c => c.effects.some(e => /대출\s*불가|no\s+loans?/i.test(e)));
// 자동 규칙: 조건이 '거짓 → 참'으로 바뀔 때 한 번 실행
function metric(s, lhs) {
    const t = lhs.trim();
    const w = s.data.wallet;
    if (w && (['돈', '소지금', 'cash', 'money'].includes(t) || norm(t) === norm(w.currency))) return w.cash;
    const rm = t.match(/^(호감|신뢰|애정|우정|aff|trust)\s*[:：]\s*(.+)$/i);
    if (rm) { const r = findBy(s.data.rel?.user ?? [], rm[2]); return r ? r[/호감|애정|aff/i.test(rm[1]) ? 'aff' : 'trust'] : null; }
    if (t === '빚' || t === 'debt') return (w?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late').reduce((a, l) => a + l.owed, 0);
    const bar = findBy(s.data.stats?.bars ?? [], t); if (bar) return bar.cur;
    const at = findBy(s.data.stats?.attrs ?? [], t); if (at) return at.val;
    if (/^(날짜수|지난날|days?)$/i.test(t)) return s.data.calendar ? dayIndex(s.data.calendar) - (s.day0 ?? dayIndex(s.data.calendar)) : s.turn;
    if (/^(턴|turns?)$/i.test(t)) return s.turn;
    const km = t.match(/^(아이템|item|질투|jealous|단계|stage)\s*[:：]\s*(.+)$/i);
    if (km) {
        if (/아이템|item/i.test(km[1])) return findBy(w?.items ?? [], km[2])?.qty ?? 0;
        const r = findBy(s.data.rel?.user ?? [], km[2]); if (!r) return null;
        return /질투|jealous/i.test(km[1]) ? r.jealous : Math.max(0, r.stage ?? 0);
    }
    // 내 탭: "탭:항목" 또는 항목 이름
    const tabs = s.data.custom?.tabs ?? [];
    const cm = t.match(/^(.+?)\s*[:：]\s*(.+)$/);
    const fld = cm ? findBy(findBy(tabs, cm[1])?.fields ?? [], cm[2], 'k') : tabs.map(tb => findBy(tb.fields, t, 'k')).find(Boolean);
    if (fld && fld.type !== 'text') return fld.v;
    return null;
}
export function ruleTrue(s, when) {
    const m = String(when ?? '').match(/^(.+?)\s*(<=|>=|==|=|<|>)\s*(-?[\d.,]+)\s*$/);
    if (!m) return false;
    const v = metric(s, m[1]); if (v === null || v === undefined) return false;
    const n = parseFloat(m[3].replace(/,/g, ''));
    return { '<': v < n, '<=': v <= n, '>': v > n, '>=': v >= n, '=': v === n, '==': v === n }[m[2]];
}
function checkEndings(s, info) {
    const ac = s.data.ach;
    if (!ac?.endings?.length || info.mods?.ach === false) return;
    for (const e of ac.endings) {
        const now = !!ruleTrue(s, e.when);
        if (now && !e.on) { e.on = true; if (!e.done) { e.done = true; e.at = stamp(s); info.labels.push(`🎬 ${e.name}`); info.alerts.push({ kind: 'ending', name: e.name, text: e.desc }); } }
        else if (!now && e.on) e.on = false;
    }
}
// 🏆 기본 업적은 숫자로 직접 확인 (v2.7.19 · AI 0회) — 예전엔 AI가 알아서 「ach:」를 적어야만 됐고,
//    설명이 그 채팅에 없는 단계 이름(「친구」 단계)을 가리켜서 사실상 안 깨졌음
const ACH_AUTO = [
    [/^(첫 친구|First Friend)$/i, (s) => (s.data.rel?.user ?? []).some(r => r.trust >= 25)],
    [/^(마음을 연 사람|Opened Up)$/i, (s) => (s.data.rel?.user ?? []).some(r => r.trust >= 50)],
    [/^(사랑의 시작|Love Begins)$/i, (s) => { const rl = s.data.rel; const L = loveIndex(rl?.stages ?? []); return (rl?.user ?? []).some(r => r.bond || (L >= 0 && (r.stage ?? -1) >= L)); }],
    [/^(탐험가|Explorer)$/i, (s) => (s.data.map?.places ?? []).filter(p => p.known !== false).length >= 10],
    [/^(해결사|Fixer)$/i, (s) => [...(s.data.quest?.list ?? []), ...(s.data.quest?.archive ?? [])].filter(q => q.status === 'done').length >= 5],
];
function autoAch(s, info) {
    const ac = s.data.ach; if (!ac?.list?.length || info.mods?.ach === false) return;
    for (const a of ac.list) {
        if (a.done) continue;
        const hit = ACH_AUTO.find(([re]) => re.test(String(a.name).trim()));
        if (hit && hit[1](s)) applyOp(s, 'ach', a.name, info);
    }
}
function checkRules(s, info) {
    checkEndings(s, info);
    autoAch(s, info);
    questClock(s, info);
    const f = s.data.fate;
    if (!f?.rules.length || info.mods?.fate === false || info.inRule) return;
    info.inRule = true;
    try {
        for (const r of f.rules) {
            const now = !!ruleTrue(s, r.when);
            if (now && !r.on) { r.on = true; info.labels.push(`⚙ ${r.name}`); applyLines(s, r.then, info); }
            else if (!now && r.on) r.on = false;
        }
    } finally { info.inRule = false; }
}

export const SEASON_NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
// ───── 사람 위치: 사는 곳 · 일과 ─────
// 일과 "아침:시장, 낮:항구, 밤:집" → 지금 시간대에 있는 곳 ('집'은 사는 곳)
export function whereNow(p, cal) {
    const parts = String(p.sched ?? '').split(/\s*[,，;；、|\n]\s*/).map(x => x.split(/\s*[:：]\s*/)).filter(x => x.length === 2 && x[1]);
    const t = cal?.time ?? '';
    const hit = parts.find(([k]) => norm(k) === norm(t)) ?? parts.find(([k]) => /^(항상|늘|always|\*)$/i.test(k));
    const place = hit?.[1] ?? '';
    if (!place) return p.home || '';
    return /^(집|home)$/i.test(place) ? (p.home || place) : place;
}
export function peopleAt(s, place) {
    const list = s.data.profile?.list ?? [];
    const cal = s.data.calendar;
    const live = [], now = [];
    for (const p of list) {
        if (p.role === 'user') continue;
        if (p.home && norm(p.home) === norm(place)) live.push(p.name);
        const w = whereNow(p, cal);
        if (w && norm(w) === norm(place)) now.push(p.name);
    }
    return { live, now };
}
// /ss-get · 매크로용: 키 하나의 값
export function ssValue(s, key0) {
    if (!s) return '';
    const key = String(key0 ?? '').trim();
    const d = s.data;
    const [k, arg] = key.split(/\s*[:：]\s*/);
    const K = k.toLowerCase();
    if (['cash', 'money', '돈', '소지금'].includes(K)) return String(d.wallet?.cash ?? '');
    if (['currency', '화폐'].includes(K)) return d.wallet?.currency ?? '';
    if (['loc', 'here', '위치', '장소'].includes(K)) return d.map?.here ?? '';
    if (['date', '날짜'].includes(K)) return d.calendar ? dateStr(d.calendar) : '';
    if (['time', 'period', '시간대'].includes(K)) return d.calendar?.time ?? '';
    if (['weather', '날씨'].includes(K)) return d.calendar?.weather ?? '';
    if (['season', '계절'].includes(K)) return d.calendar ? SEASON_NAME[seasonOf(d.calendar)] : '';
    if (['curse', 'curses', '저주'].includes(K)) return (d.fate?.curses ?? []).map(c => c.name).join(', ');
    if (['quest', 'quests', '퀘스트'].includes(K)) return (d.quest?.list ?? []).filter(q => q.status === 'active').map(q => q.title).join(', ');
    if (['here_now', '여기있는사람'].includes(K)) return d.map ? peopleAt(s, d.map.here).now.join(', ') : '';
    if (['bgm', 'music', '음악', '노래'].includes(K)) return d.music?.now ? `${d.music.now.title}${d.music.now.artist ? ` - ${d.music.now.artist}` : ''}` : '';
    if ((K === 'stage' || K === '단계') && arg) { const r = findBy(d.rel?.user ?? [], arg); const st = d.rel?.stages?.length ? d.rel.stages : DEFAULT_STAGES; return r ? st[clamp(r.stage ?? 0, 0, st.length - 1)]?.name ?? '' : ''; }
    if ((K === 'jealous' || K === '질투') && arg) { const r = findBy(d.rel?.user ?? [], arg); return r ? String(r.jealous ?? 0) : ''; }
    if (['aff', '호감', '애정', 'trust', '신뢰', '우정'].includes(K) && arg) { const r = findBy(d.rel?.user ?? [], arg); return r ? String(r[/^(aff|호감|애정)$/.test(K) ? 'aff' : 'trust']) : ''; }
    if ((K === 'stat' || K === '수치') && arg) { const b = findBy(d.stats?.bars ?? [], arg); return b ? String(b.cur) : ''; }
    if ((K === 'item' || K === '아이템') && arg) { const it = findBy(d.wallet?.items ?? [], arg); return it ? String(it.qty) : '0'; }
    const v = metric(s, key);
    return v === null || v === undefined ? '' : String(v);
}

// 이 채팅에서 로맨스 보정을 처음 켠 지점 기록 (그 전 메시지는 예전 규칙 그대로 → 옛 채팅 숫자가 안 바뀜)
function markRomFrom(meta, chat) {
    const set = settings();
    if (!meta || Number.isFinite(meta.romFrom)) return;
    if (!(set.romBond || set.romCap || set.romFatigue)) return;
    meta.romFrom = chat.length;
    Promise.resolve().then(() => saveMeta()).catch(() => { /* ignore */ });
}
// ⌛ 퀘스트 기한 (v2.7.5): 「3월 14일까지」 · 「3일 안에」 같은 기한을 달력 날짜로 바꿔 두고, 지나면 실패 · 마지막 날엔 알림
// 기한 글을 못 읽으면(「이번 축제 전」 같은 것) 그냥 글로만 둬요. 달력이 꺼져 있으면 아무것도 안 해요.
export function questDue(s, q) {
    if (Number.isFinite(q.due) && q.dueFor === q.deadline) return q.due;
    const cal = s.data.calendar; const t = String(q.deadline ?? '').trim();
    if (!cal || !t) return null;
    const rel = t.match(/(\d+)\s*(?:일|days?)\s*(?:안|내|이내|뒤|후|까지|within|later|left)?/i) || t.match(/^D\s*-\s*(\d+)$/i) || t.match(/within\s+(\d+)\s+days?/i);
    if (rel && !/월/.test(t)) return Number.isFinite(q.since) ? q.since + Number(rel[1]) : null;
    const pd = parseDate(cal, t);
    if (!pd || !pd.m || !pd.d) return null;
    try { const y = pd.y ?? cal.y; let idx = dayIndex(cal, y, pd.m, pd.d); if (pd.y === null && Number.isFinite(q.since) && idx < q.since) idx = dayIndex(cal, y + 1, pd.m, pd.d); return idx; } catch { return null; }
}
function questClock(s, info) {
    const qs = s.data.quest, now = today(s);
    if (!qs?.list?.length || now === null || settings().questExpire === false || info.mods?.quest === false) return;
    for (const q of qs.list) {
        if (q.status !== 'active' && q.status !== 'open') continue;
        const due = questDue(s, q);
        if (due === null) continue;
        q.due = due; q.dueFor = q.deadline;
        if (now > due) {
            q.status = 'failed'; q.expired = true;
            info.labels.push(`⌛ ${q.title}: 기한 지남`);
            info.alerts.push(`⌛ 퀘스트 기한이 지났어요 — ${q.title}`);
        } else if (now === due && q.warned !== due && q.status === 'active') {
            q.warned = due;
            info.alerts.push(`⏳ 오늘까지예요 — ${q.title}`);
        }
    }
}
// 🎲 판정 공통 (v2.7.6): d20 + 능력치 보정 vs 목표(난이도 보정 포함) — 20 대성공 · 1 대실패
export const SOCIAL_RE = /매력|화술|말솜씨|설득|사교|교섭|협상|카리스마|charisma|charm|persuasion|speech|social|negotiat/i;
export function skillRoll(s, attrPick, dc = 12) {
    const attrs = s.data.stats?.attrs ?? [];
    const a = attrPick instanceof RegExp ? attrs.find(x => attrPick.test(x.name)) : attrPick ? findBy(attrs, attrPick) : null;
    const goal = num(dc, 12) + (DIFFS[diffOf()]?.dc ?? 0);
    const roll = Math.floor(Math.random() * 20) + 1, mod = (a?.val ?? 0) + (app.rollBonus?.(a?.name) ?? 0); // ⚔ 착용 장비 보정 (addons.js · 끄면 0)
    const cls = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : roll + mod >= goal ? 'ok' : 'fail';
    return { roll, mod, dc: goal, cls, attr: a ? a.name : '', detail: `d20 ${roll}${mod ? `${mod > 0 ? '+' : ''}${mod}=${roll + mod}` : ''} vs ${goal}` };
}

export function freshState(base) {
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? clone(base.data[id]) : null;
    const s = { core: clone(base?.core ?? EMPTY.core()), data, pendingRoll: null, recent: [], turn: 0, tally: clone(base?.tally) ?? null, days: clone(base?.days) ?? [], day0: base?.day0 ?? null, gone: clone(base?.gone) ?? [] };
    if (s.day0 === null && data.calendar) s.day0 = dayIndex(data.calendar);
    // 관계: 처음 단계 맞추기 (알림 없이)
    if (data.rel) { data.rel.stages ??= clone(DEFAULT_STAGES); data.rel.life ??= []; for (const r of data.rel.user ?? []) { r.jealous ??= 0; if (r.stage === undefined || r.stage === null || r.stage < 0) { r.stage = stageIndex(data.rel.stages, r.aff, r.trust); if (r.noLove) r.stage = noLoveStage(data.rel, data.rel.stages, r, r.stage); } } }
    if (data.ach) data.ach.endings ??= [];
    s.dayBuf = startDay(s);
    return s;
}
// 생일: 프로필 항목 「생일」을 달력에 (매년)
function birthdays(s) {
    const cal = s.data.calendar, pf = s.data.profile;
    if (!cal || !pf) return;
    for (const p of pf.list) {
        const f = p.fields.find(x => /생일|탄생일|birthday/i.test(x.k)); if (!f) continue;
        const dt = parseDate(cal, f.v); if (!dt) continue;
        const title = viewTr() ? `🎂 ${p.name}'s birthday` : `🎂 ${p.name} 생일`;
        const m = clamp(dt.m, 1, cal.months.length);
        // 같은 날 같은 사람 생일이 이미 있으면 (번역된 제목이라도) 또 넣지 않는다
        if (!cal.events.some(e => norm(e.title) === norm(title) || (e.m === m && e.d === dt.d && /🎂/.test(e.title) && norm(e.title).includes(norm(p.name)))))
            cal.events.push({ y: null, m, d: dt.d, title, desc: viewTr() ? 'from profile' : '프로필에서 자동', repeat: 'yearly', auto: 'bday' });
    }
}
function resolveStart(meta, chat) {
    let st = Math.min(meta.startAt ?? 0, chat.length);
    if (meta.startKey && chat[st - 1]?.send_date !== meta.startKey) {
        const j = chat.findIndex(m => m.send_date === meta.startKey);
        if (j >= 0) st = j + 1;
    }
    return st;
}
// 🔍 칩 점검 (v2.7.3): 이 키를 미트볼이 알아보나 · 어느 칸의 키인가
export function opInfo(s, rawKey) {
    let key = KEYMAP[String(rawKey).trim().toLowerCase()] ?? (String(rawKey).startsWith('_') ? String(rawKey) : null);
    const nm = String(rawKey).trim();
    if (!key && s?.data?.stats && (findBy(s.data.stats.bars, nm) || findBy(s.data.stats.attrs, nm))) key = 'stat';
    if (!key && s?.data?.wallet && norm(nm) === norm(s.data.wallet.currency)) key = 'cash';
    return { key, mod: key ? KEY_MOD[key] ?? null : null };
}
// 답 글이 그대로면 다시 읽지 않는다 (v2.7.9 · 매 계산마다 모든 답의 글을 정규식으로 다시 훑던 것이 계산 시간의 1/3)
const opsCache = new WeakMap();
export function msgOps(m) {
    const lg = legacyOn();
    let hit = opsCache.get(m);
    if (!hit || hit.mes !== m.mes || hit.lg !== lg) { hit = { mes: m.mes, lg, ops: extractOps(m.mes) }; opsCache.set(m, hit); }
    const ops = hit.ops.map(o => [...o]);
    const extra = m.extra?.[MODULE]?.bySwipe?.[m.swipe_id ?? 0];
    if (Array.isArray(extra) && !ops.length) ops.push(...extra);
    return ops;
}

// 편집 기록 차례 (v2.7.20): 예전엔 「그때 메시지 수(at)」 → 시간 순으로 다시 계산해서,
// 메시지를 지우고(at이 작아짐) 한 편집이 그 전에 한 편집(at이 큼)보다 먼저 계산됐다 → 지운 대화방 · 연락처가 되살아남.
// 이제 시간 순서를 지키되, 나중 편집의 at보다 앞 편집의 at이 크면 그 at으로 당긴다 (앞 편집이 뒤 편집보다 늦게 계산되지 않게).
export function orderAdjust(list) {
    const byT = (list ?? []).slice().sort((a, b) => a.t - b.t);
    let min = Infinity;
    for (let i = byT.length - 1; i >= 0; i--) { if (byT[i]._off) continue; if (!byT[i].an && byT[i].at > min) byT[i].at = min; min = Math.min(min, byT[i].at); }
    return byT.sort((a, b) => a.at - b.at || a.t - b.t);
}
// 메시지를 지웠을 때: 그 뒤에 묶였던 편집을 지금 끝으로 당긴다 (편집은 남기고, 분기 채팅과 구별되게) → 당긴 개수
// 묶음 열쇠: 메시지의 첫 스와이프 시각(다시 생성하면 새 메시지라 다름) + 지금 스와이프
// 메시지 열쇠: 실리의 send_date는 분 단위라 1분 안에 다시 생성하면 옛 답과 같아짐 → 첫 스와이프의 밀리초 생성 시각(gen_started)을 먼저
// 시각은 숫자(밀리초)로 통일 — 실리는 방금 만든 답엔 Date 객체, 저장 뒤 다시 읽으면 ISO 글자를 줘서 그대로 쓰면 다시 열 때 열쇠가 달라짐 (v2.7.21)
// ISO 꼴만 숫자로 (그 밖의 날짜 글자는 브라우저마다 읽는 법이 달라 PC ↔ 모바일에서 어긋나므로 글자 그대로)
const timeKey = (t) => {
    if (t === null || t === undefined || t === '') return '';
    if (t instanceof Date) { const n = t.getTime(); return Number.isFinite(n) ? String(n) : ''; }
    if (typeof t === 'number') return String(t);
    const x = String(t);
    if (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x)) { const n = Date.parse(x); if (Number.isFinite(n)) return String(n); }
    return x;
};
const msgHead = (m) => `${m?.is_user ? 'u' : 'a'}:${m?.name ?? ''}:`;
// 내 메시지엔 생성 시각이 없고 send_date는 분 단위 → 행동을 묶을 때 메시지에 밀리초 표(extra.ss_at)를 붙여 둠 (내 메시지는 스와이프가 없어 extra가 안 바뀜)
const msgTime = (m) => { if (m?.is_user && m?.extra?.ss_at) return m.extra.ss_at; const first = m?.swipe_info?.[0]; return first?.gen_started ?? (first ? null : m?.gen_started) ?? first?.send_date ?? m?.send_date ?? ''; };
function stampUser(meta, m) {
    if (!m?.is_user || m.extra?.ss_at) return;
    const old = msgKey(m);
    if (!m.extra || typeof m.extra !== 'object') m.extra = {};
    m.extra.ss_at = Math.floor(Date.now() * 1000 + Math.random() * 1000);
    const now = msgKey(m);
    for (const a of meta.adjust ?? []) if (a.an && a.an.slice(0, a.an.lastIndexOf('|')) === old) a.an = `${now}${a.an.slice(a.an.lastIndexOf('|'))}`; // 표 붙이기 전에 묶인 것도 따라옴
}
export function msgKey(m) { return msgHead(m) + timeKey(msgTime(m)); }
// 이어쓰기: 실리가 그 답의 생성 시각을 새로 써서 열쇠가 바뀜 → 시작할 때 옛 열쇠를 적어 두고, 바뀌면 묶인 편집을 새 열쇠로 옮김
let contNote = null;
export function noteGeneration(type) {
    const chat = ctx().chat ?? [], last = chat.at(-1);
    contNote = type === 'continue' && last && !last.is_user ? { i: chat.length - 1, old: msgKey(last), sid: last.swipe_id ?? 0, m: last } : null;
}
export const dropContinueNote = () => { contNote = null; };
function moveContinued(meta, chat) {
    const n = contNote; if (!n) return;
    const m = chat[n.i];
    if (m !== n.m || (m.swipe_id ?? 0) !== n.sid) { contNote = null; return; } // 다른 메시지가 됐으면 버림
    const now = msgKey(m); if (now === n.old) return;
    for (const a of meta.adjust ?? []) if (a.an && a.an.slice(0, a.an.lastIndexOf('|')) === n.old) a.an = `${now}${a.an.slice(a.an.lastIndexOf('|'))}`;
    n.old = now;
}
// 2.7.21 시험판이 남긴 옛 꼴 열쇠(시각을 글자 그대로)를 지금 메시지와 맞춰 새 꼴로 — 못 찾을 때만 한 번
function legacyKeys(chat) {
    const map = new Map();
    chat.forEach((m, i) => { const t = msgTime(m), h = msgHead(m); const d = t instanceof Date ? t : (typeof t === 'string' && /^\d{4}-\d\d-\d\dT/.test(t) ? new Date(t) : null);
        if (typeof t === 'string') map.set(h + t, i);
        if (d && Number.isFinite(d.getTime())) { map.set(h + String(d), i); map.set(h + d.toISOString(), i); } });
    return map;
}
export const anchorOf = (m) => `${msgKey(m)}|${m?.swipe_id ?? 0}`;
// ⏪ 되감기 고침 (v2.7.23): 답을 보고 한 행동(아이템 사용 · 구매 · 이동 …)은 그 답에 묶였다 → 그 뒤 내 메시지와 다음 답을 지워도 행동은 남았음 (「썼던 물건이 안 돌아와요」)
// → 내 메시지를 보내면, 바로 앞 답에 묶여 있던 행동을 그 「내 메시지」로 옮겨 묶는다. 그 턴(내 메시지부터)을 지우면 행동도 같이 사라지고, 다음 답만 다시 생성하면 행동은 그대로.
//   답을 보낸 뒤 아직 내 메시지를 안 보냈을 때는 예전처럼 그 답에 묶여 있다 (그 답을 다시 생성 · 스와이프하면 같이 사라짐).
export function rebindToUser(meta = getMeta()) {
    const chat = ctx().chat ?? [];
    if (!meta?.adjust?.some(a => typeof a?.an === 'string')) return false;
    const idx = new Map(); chat.forEach((m, i) => idx.set(anchorOf(m), i));
    let changed = false;
    for (const a of meta.adjust) {
        if (typeof a?.an !== 'string') continue;
        const i = idx.get(a.an); if (i === undefined || chat[i].is_user) continue;
        const u = chat[i + 1]; if (!u?.is_user) continue;
        stampUser(meta, u);
        a.an = anchorOf(u); changed = true;
    }
    return changed;
}
// 스와이프 삭제 (v2.7.21 고침): 묶인 행동의 열쇠는 「첫 스와이프의 생성 시각 | 스와이프 번호」라서,
// 앞 스와이프를 지우면 번호가 하나씩 당겨지고 · 첫 스와이프를 지우면 열쇠 자체가 바뀐다 → 그 답에 묶인 행동이 계산에서 조용히 빠졌음
// → 계산할 때마다 메시지의 열쇠를 적어 두고(스와이프가 줄어든 채로는 덮어쓰지 않음), 지웠다는 신호가 오면 옛 열쇠로 찾아 새 열쇠 · 새 번호로 옮긴다.
//   지운 스와이프에 묶여 있던 행동은 돌아올 스와이프가 없으니 「|x」로 표시해 다른 스와이프에 잘못 붙지 않게 한다 (기록은 남음).
const keyMemo = new WeakMap();
function rememberKey(m) {
    if (!m || typeof m !== 'object') return;
    const n = Array.isArray(m.swipes) ? m.swipes.length : 0, old = keyMemo.get(m);
    if (old && n < old.n) return; // 스와이프가 줄었는데 아직 옮기지 않았다 → 옛 열쇠를 지킨다
    keyMemo.set(m, { k: msgKey(m), n });
}
export function shiftSwipeAnchors(meta, m, removed) {
    if (!m || !Number.isInteger(removed) || removed < 0) return false;
    const now = msgKey(m), old = keyMemo.get(m)?.k ?? now;
    keyMemo.set(m, { k: now, n: Array.isArray(m.swipes) ? m.swipes.length : 0 });
    let changed = false;
    for (const a of meta?.adjust ?? []) {
        if (typeof a?.an !== 'string') continue;
        const cut = a.an.lastIndexOf('|');
        if (cut < 0 || a.an.slice(0, cut) !== old) continue;
        const sid = Number(a.an.slice(cut + 1));
        if (!Number.isInteger(sid)) continue; // 이미 「|x」
        const next = sid === removed ? `${now}|x` : `${now}|${sid > removed ? sid - 1 : sid}`;
        if (next !== a.an) { a.an = next; changed = true; }
    }
    return changed;
}
// 이야기와 상관없는 정리 · 설정 편집은 묶지 않음 (메시지를 지워도 남음): 번역 · 영어 저장(라벨 없는 칸 저장) · 완전 삭제 · 읽음 · 메모 · 업적 표시 · 애정 끄기 · 연인 확정
const META_OPS = new Set(['_purge', '_read', '_nread', '_memo', '_achtog', '_nolove', '_love', '_bond', '_unbond', '_alert', '_merge']);
export const isMetaEdit = (a) => (a?.ops?.length ? a.ops.every(([k]) => META_OPS.has(k)) : !!a?.set && !a.label && !a.silent) || a?.keep === true; // 조용한 저장(구매 때 상점 재고 −1 등)은 행동이라 묶음
export function clampAdjust(meta, len) {
    let n = 0;
    for (const e of meta?.adjust ?? []) if (!e.an && e.at > len) { e.at = len; n++; } // 묶인 편집은 당기지 않음 (묶인 메시지가 없으면 계산에서 빠짐)
    return n;
}
// 다시 생성 · 스와이프한 답이 편집보다 새것이면, 그 편집에 남은 「그 답이 만든 소식」 사본은 옛 답의 것 → 지금 답의 것을 살린다 (v2.7.20)
const FEED_LISTS = { news: 'items', gossip: 'issues', board: 'posts', sns: 'posts' };
const genTime = (m) => { const t = Date.parse(m?.swipe_info?.[m?.swipe_id ?? 0]?.gen_finished ?? m?.gen_finished ?? m?.send_date ?? ''); return Number.isFinite(t) ? t : NaN; };
function keepFreshFeed(list, before, after, a, seed, chat) {
    if (!Array.isArray(before) || !Array.isArray(after)) return after;
    const pre = `${seed}:`;
    const idx = (it) => { const id = String(it?.id ?? ''); if (!id.startsWith(pre)) return -1; const m = /^(\d+):/.exec(id.slice(pre.length)); return m ? +m[1] : -1; };
    const newer = new Set();
    for (const it of [...before, ...after]) { const i = idx(it); if (i >= 0 && !newer.has(i) && genTime(chat[i]) > a.t) newer.add(i); }
    if (!newer.size) return after;
    return after.filter(it => !newer.has(idx(it))).concat(before.filter(it => newer.has(idx(it))));
}

// ───── 옛 채팅 한 번 손보기 ─────
// 판이 바뀌며 저장 모양이 달라진 것을 채팅마다 한 번만 고친다 (표시는 meta.*Fix) — 계산(compute) 본문에 섞여 있던 것을 모음
// 새 수리는 여기에 한 줄씩 보탠다
function fixOldMeta(meta, chat) {
    // 지운 메시지 뒤의 편집은 지울 때 당겨 둔다(clampAdjust) · 2.7.20 앞 채팅은 처음 한 번 당긴다
    if (!meta.atFix) { clampAdjust(meta, chat.length); meta.atFix = true; }
    // 2.7.21: 탭 고치기(✏️ 직접 편집 · 💬 AI로 수정 · 🔄 다시 생성)까지 답에 묶여서, 그 답을 리롤하면 고친 게 사라졌음 → 한 번 풀어 둠
    if (!meta.editFix) { for (const a of meta.adjust ?? []) if (a?.an && a.set && /^(✏️|💬|🔄) /u.test(a.label ?? '')) { delete a.an; a.keep = true; } meta.editFix = true; }
}
const adjEvents = new Map();
export const RACE_SPAN = 20; // 👑 루트 비교가 보는 최근 메시지 수
export function compute(limit, opts = {}) {
    const c = ctx();
    const meta = getMeta();
    if (!meta?.base) return null;
    const chat = c.chat ?? [];
    adjEvents.clear(); // 편집 기록 알림은 이번 계산 것만 (예전엔 세션 내내 쌓였음)
    const slimmed = [];
    const s = freshState(meta.base);
    setAlias(s.data.rel?.alias); // 🔗 합친 이름 표 (v2.7.23)
    s.turn = meta.baseTurn ?? 0;
    const snaps = new Map();
    const n = Math.min(limit ?? chat.length, chat.length);
    const start = resolveStart(meta, chat);
    // 분기한 채팅의 뒷부분 편집은 채팅을 열 때 followBranch(safe.js)가 지운다 — 여기서 걸러 두기만 하면 채팅이 그 길이를 다시 넘을 때 되살아나서 거르지 않는다
    fixOldMeta(meta, chat);
    // 묶인 편집: 묶인 메시지가 지금 채팅에 그 스와이프로 있을 때만 · 자리는 그 메시지 바로 뒤
    moveContinued(meta, chat);
    const byKey = new Map(); chat.forEach((m, i) => { byKey.set(msgKey(m), i); rememberKey(m); });
    let legacy = null;
    const live = (a) => {
        if (!a.an) return true;
        const k = a.an.lastIndexOf('|'); let i = byKey.get(a.an.slice(0, k));
        if (i === undefined && !/:\d*$/.test(a.an.slice(0, k))) { i = (legacy ??= legacyKeys(chat)).get(a.an.slice(0, k)); if (i !== undefined) a.an = `${msgKey(chat[i])}${a.an.slice(k)}`; }
        if (i === undefined || String(chat[i].swipe_id ?? 0) !== a.an.slice(a.an.lastIndexOf('|') + 1)) return false;
        a.at = i + 1; return true;
    };
    for (const a of meta.adjust ?? []) a._off = !live(a);
    const adj = orderAdjust(meta.adjust);
    const seed = String(c.getCurrentChatId?.() ?? MODULE);
    let lastAI = -1;
    for (let i = n - 1; i >= start; i--) if (isStoryAI(chat[i])) { lastAI = i; break; }
    // 👑 루트 비교 (설정 relRace): 최근 RACE_SPAN개 메시지에서 인물별 호감 · 신뢰가 얼마나 움직였나 — 꺼져 있으면 null이라 아무것도 안 함
    const recent = !opts.bake && settings().relRace === true ? {} : null, recentFrom = n - RACE_SPAN;
    let ai = 0, fresh = null;
    markRomFrom(meta, chat);
    const romFrom = Number.isFinite(meta.romFrom) ? meta.romFrom : Infinity;
    const romRun = settings().romFatigue;
    const wipe = meta.wipe && Object.keys(meta.wipe).length ? meta.wipe : null;
    const runAdjust = (a) => {
        if (a._off) return; // 지운 · 바꾼 메시지 뒤의 행동 (그 스와이프로 돌아오면 다시)
        s.romActive = a.at >= romFrom;
        const info = { seed: `${seed}:adj:${a.t}`, labels: [], alerts: [], mods: meta.mods, meta, cut: 0 };
        if (a.set?.patch) { // v2.7.7: 연락 · 피드는 바뀐 부분만 (칸 통째 복사본이 쌓여 채팅 파일이 MB로 불던 것)
            if (DELTA_MODS.has(a.set.mod) && s.data[a.set.mod]) {
                try {
                    const lk = FEED_LISTS[a.set.mod], md = s.data[a.set.mod];
                    const before = lk && Array.isArray(md[lk]) ? md[lk].slice() : null;
                    applyDelta(md, a.set.patch);
                    if (before) md[lk] = keepFreshFeed(lk, before, md[lk], a, seed, chat);
                } catch (e) { ssWarn(LOG, 'delta', e); }
            }
        } else if (a.set) {
            // 옛 채팅 줄이기 (v2.7.10): 예전에 칸 통째로 적힌 연락 · 피드 기록을 「그때 상태와 달라진 부분」으로 바꿔 둔다 (이번 계산 결과는 그대로)
            if (opts.slim && !a.side && a.set.data && DELTA_MODS.has(a.set.mod) && isPlain(s.data[a.set.mod])) {
                try { const p = deltaOf(normalize(a.set.mod, clone(s.data[a.set.mod])), a.set.data); slimmed.push([a, p]); } catch (e) { ssWarn(LOG, 'slim', e); }
            }
            if (a.set.mod === 'core') s.core = clone(a.set.data);
            else if (MOD_IDS.includes(a.set.mod)) {
                const al = a.set.mod === 'rel' ? s.data.rel?.alias : null;
                s.data[a.set.mod] = clone(a.set.data);
                if (al && s.data.rel && !s.data.rel.alias) s.data.rel.alias = al; // 🔗 관계 칸을 통째로 저장해도 합친 이름 표는 안 풀림
                // 📦 덩어리를 만든 뒤 바로 앞 답을 다시 생성했으면, 새 답이 이 칸에 적은 변화는 덩어리 위에 다시 더한다 (안 그러면 새 답의 연락 · 기사가 덮여 사라짐)
                if (a.side && a.an0 && a.at >= 1 && a.at <= n) { const pm = chat[a.at - 1]; if (pm && isStoryAI(pm) && anchorOf(pm) !== a.an0) { const inf2 = { seed: `${seed}:${a.at - 1}`, labels: [], alerts: [], mods: meta.mods, meta, cut: 0, ai: true }; dropFromMsg(s, a.side, `${seed}:${a.at - 1}:`); for (const [k, v] of msgOps(pm)) if (opMod(s, k) === a.side) applyOp(s, k, v, inf2); } }
                if (a.set.mod === 'rel') for (const r of s.data.rel.user) { if (s.bonds && Object.hasOwn(s.bonds, norm(r.name))) r.bond = s.bonds[norm(r.name)]; if (s.nolove && Object.hasOwn(s.nolove, norm(r.name))) { if (s.nolove[norm(r.name)]) r.noLove = true; else delete r.noLove; } updateStage(s, r, info, true); }
                if (a.set.mod === 'calendar' && s.day0 === null) s.day0 = dayIndex(s.data.calendar);
            }
        }
        const had = a.ops?.length || (a.set && a.label) ? owned(s) : null; // 번역 · 영어 저장으로 바꾼 칸(이름 없는 기록)은 「버림」으로 안 셈
        for (const [k, v] of a.ops ?? []) applyOp(s, k, v, info);
        try { needsTick(s, info); } catch (e) { ssNote('needs', e); } // 🍞 욕구 게이지 (v2.9 · 없으면 아무것도 안 함)
        checkRules(s, info);
        if (had) trackGone(s, had, a.ops?.some(([k]) => k === '_sellused' || k === 'cash') ? 'sold' : 'discarded');
        if (a.label && !a.silent) s.dayBuf?.labels.push(a.label);
        adjEvents.set(a.t, info.alerts);
        if (a.at > lastAI && a.label && !a.silent) s.recent.push(a.label);
    };
    opts.onStep?.(start, s); // 📈 그래프의 첫 점 = 처음 상태
    for (let i = start; i < n; i++) {
        while (ai < adj.length && adj[ai].at <= i) runAdjust(adj[ai++]);
        const m = chat[i];
        if (!isStoryAI(m)) continue;
        s.turn++;
        let ops = msgOps(m);
        if (!ops.length) continue;
        if (wipe) ops = ops.filter(([k]) => { const md = opMod(s, k); return !(md && (wipe[md] ?? -1) > i); }); // 🧹 전체 삭제한 칸의 옛 변화는 빼기
        if (!ops.length) continue;
        s.romActive = i >= romFrom;
        const info = { seed: `${seed}:${i}`, labels: [], alerts: [], mods: meta.mods, roll: null, meta, cut: 0, ai: true, i };
        if (recent && i >= recentFrom) info.recent = recent;
        const before = i === lastAI && !opts.bake && settings().freshDot !== false ? freshSnap(s) : null; // 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3)
        for (const [k, v] of ops) applyOp(s, k, v, info);
        try { needsTick(s, info); } catch (e) { ssNote('needs', e); } // 🍞 욕구 게이지 (v2.9)
        if (romRun && s.romActive) { const used = info.romUsed ?? {}; const run = (s.romRun ??= {}); for (const k of new Set([...Object.keys(run), ...Object.keys(used)])) run[k] = used[k] > 0 ? (run[k] ?? 0) + 1 : 0; }
        checkRules(s, info);
        if (before) fresh = freshDiff(before, s, `${seed}:${i}:${m.swipe_id ?? 0}`);
        if (s.gone.length) trackGone(s, null); // AI가 다시 얻은 물건은 「없음」 목록에서 빼기
        s.dayBuf?.labels.push(...info.labels.slice(info.cut));
        snaps.set(i, { labels: info.labels, alerts: info.alerts, roll: info.roll, turn: s.turn, ...(info.miss ? { miss: info.miss } : {}) });
        opts.onStep?.(i, s); // 📈 변화 그래프 (v2.7.23)
        if (i === lastAI && info.roll) s.pendingRoll = info.roll;
    }
    const adjLimit = opts.bake ? n : Infinity;
    while (ai < adj.length && adj[ai].at <= adjLimit) runAdjust(adj[ai++]);
    for (const m of ['news', 'gossip', 'board', 'quest', 'sns']) if (s.data[m]) tidy(m, s.data[m]);
    try { birthdays(s); } catch (e) { ssWarn(LOG, 'bday', e); }
    const cal = s.data.calendar;
    if (cal?.autoWeather && !cal.weather && modOn('calendar', meta)) cal.weather = pickWeather(cal, `${seed}:w${dayIndex(cal)}`);
    for (const [a, p] of slimmed) a.set = { mod: a.set.mod, patch: p };
    setAlias(s.data.rel?.alias);
    opts.onStep?.(n, s);
    return { state: s, snaps, lastAI, rest: adj.slice(ai), fresh, slimmed: slimmed.length, ...(recent ? { recent } : {}) };
}
// 옛 채팅(v2.7.6 이하)에 쌓인 연락 · 피드 통째 기록을 한 번 줄인다 → 줄인 개수
export function slimLegacy(meta = getMeta()) {
    if (!meta?.base || meta.slim277) return 0;
    const fat = (meta.adjust ?? []).filter(a => !a.side && a.set?.data && DELTA_MODS.has(a.set.mod)).length;
    if (fat < 2) { meta.slim277 = true; return 0; }
    const r = compute(undefined, { slim: true });
    meta.slim277 = true;
    return r?.slimmed ?? 0;
}
// ───── 🗑 버리거나 판 물건 (v2.7.3) ─────
// 창고에서 버린 가구 · 판 물건은 상태창에선 사라져도, AI는 지난 이야기를 보고 「아직 있다」고 여겨 다시 쓰거나 decor로 되살렸다.
// 내가 직접 없앤 것(편집 기록)만 모아서, 「이제 없음」으로 한 줄 알려 준다 (최근 30턴 · 12개까지 · 다시 얻으면 빠짐)
function owned(s) {
    const m = new Map();
    const add = (n) => { const k = norm(n); if (k) m.set(k, String(n)); };
    for (const it of s.data.wallet?.items ?? []) add(it.name);
    for (const x of s.data.home?.storage ?? []) add(x);
    for (const r of s.data.home?.rooms ?? []) for (const x of r.decor ?? []) add(x);
    return m;
}
function trackGone(s, had, how = 'discarded') {
    const now = owned(s);
    if (had) for (const [k, n] of had) if (!now.has(k) && !s.gone.some(g => norm(g.name) === k)) s.gone.push({ name: n, how, turn: s.turn });
    if (s.gone.length) s.gone = s.gone.filter(g => !now.has(norm(g.name)) && s.turn - g.turn <= 30).slice(-12);
}
// 🕊 이야기에서 빠진 사람: 상태창 데이터는 남기고(되돌릴 수 있게) AI에게 가는 글에서만 빼고 한 줄로 알려 줘요
export const outLine = (s) => { const out = (s?.data?.rel?.user ?? []).filter(r => r.out); return out.length ? `Out of the story (${out.map(r => `${r.name} — ${r.out === 'dead' ? 'died' : 'left'}`).join(', ')}): they cannot appear, talk, send messages or act in scenes unless the story explicitly brings them back.` : ''; };
function withoutOut(r) {
    const rl = r?.state?.data?.rel;
    if (!rl?.user?.some(x => x.out)) return r;
    const out = new Set(rl.user.filter(x => x.out).map(x => norm(x.name)));
    const data = { ...r.state.data, rel: { ...rl, user: rl.user.filter(x => !x.out), pairs: (rl.pairs ?? []).filter(p => !out.has(norm(p.a)) && !out.has(norm(p.b))) } };
    if (data.contact?.contacts) data.contact = { ...data.contact, contacts: data.contact.contacts.filter(c => !out.has(norm(c.name))) };
    if (data.profile?.list) data.profile = { ...data.profile, list: data.profile.list.filter(p => !out.has(norm(p.name))) };
    return { ...r, state: { ...r.state, data } };
}
export const goneLine = (s) => (settings().goneInject === false || !s?.gone?.length ? '' : `No longer owned by {{user}} (used up, thrown away or sold — do not use, wear, place or mention them as still owned, and do not re-add them unless the story gets them back): ${s.gone.map(g => g.name).join(', ')}`);
// ───── 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3) ─────
// 마지막 AI 답의 변화를 적용하기 전 · 후를 칸마다 비교해서, 바뀐 칸(mod) · 줄(이름 있는 항목) · 값(key)을 모은다. 마지막 답 하나만 · 계산 1번에 1번.
const freshName = (x) => (x && typeof x === 'object' ? x.name ?? x.title ?? x.text ?? x.who ?? null : null);
function freshSnap(s) {
    const o = { core: JSON.stringify(s.core) };
    for (const [k, v] of Object.entries(s.data)) if (v) o[k] = JSON.stringify(v);
    return o;
}
const freshKeep = new Map(); // 같은 답을 다시 계산해도 「이미 본 탭」은 그대로 (갱신마다 점이 되살아나지 않게)
export function freshDiff(before, s, key) {
    const mods = new Set(), items = new Set();
    const after = freshSnap(s);
    for (const mod of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[mod] === after[mod]) continue;
        mods.add(mod);
        let a, b; try { a = before[mod] ? JSON.parse(before[mod]) : {}; b = mod === 'core' ? s.core : s.data[mod] ?? {}; } catch (err) { ssNote(`바뀐 곳 비교 실패 (${mod})`, err); continue; }
        for (const k of Object.keys({ ...a, ...b })) {
            const x = a?.[k], y = b?.[k];
            if (JSON.stringify(x) === JSON.stringify(y)) continue;
            items.add(`${mod}.${k}`);
            if (Array.isArray(y)) {
                const old = new Map((Array.isArray(x) ? x : []).map(e => [freshName(e) ?? JSON.stringify(e), JSON.stringify(e)]));
                for (const e of y) { const n = freshName(e) ?? JSON.stringify(e); if (old.get(n) !== JSON.stringify(e)) items.add(`${mod}.${k}:${norm(n)}`); }
            }
        }
    }
    if (!mods.size) return null;
    let seen = freshKeep.get(key);
    if (!seen) { const sv = getMeta()?.freshSeen; seen = new Set(sv?.key === key ? sv.mods : []); freshKeep.set(key, seen); if (freshKeep.size > 6) freshKeep.delete(freshKeep.keys().next().value); }
    return { key, mods, items, seen };
}
// 화면에서: 이 칸 · 이 값 · 이 이름의 줄이 방금 바뀌었나
export function isFresh(fr, mod, k, name) {
    if (!fr || settings().freshDot === false || !fr.mods.has(mod)) return false;
    if (!k) return true;
    return name === undefined ? fr.items.has(`${mod}.${k}`) : fr.items.has(`${mod}.${k}:${norm(name)}`);
}

// 직접 편집·구매·추가 지시 기록
export async function addAdjust(entry) {
    const meta = getMeta(true);
    meta.adjust ??= [];
    // 📦 따로 보관하는 칸만 건드리는 행동(읽음 표시 등)은 지금 상태에 바로 반영하고 덩어리만 바꾼다
    if (entry?.ops?.length && !entry.set && app.current?.state) {
        const s = app.current.state;
        const mods = [...new Set(entry.ops.map(([k]) => opMod(s, k)))];
        if (mods.every(m => m && sideOn(m) && s.data[m])) {
            const info = { seed: `side:${Date.now()}`, labels: [], alerts: [], mods: meta.mods, meta, cut: 0 };
            for (const [k, v] of entry.ops) applyOp(s, k, v, info);
            for (const m of mods) writeSide(meta, m, s.data[m]);
            await saveMeta();
            app.refreshNow?.();
            for (const t of info.alerts) app.notify ? app.notify(t) : toastr.info(esc(typeof t === 'string' ? t : t.text ?? ''), TITLE);
            return;
        }
    }
    // 순서 보장: 같은 밀리초에 두 번 눌러도 누른 순서대로 다시 계산되게 (전에는 난수라 순서가 뒤바뀔 수 있었음)
    let t = Date.now();
    for (const e of meta.adjust) if (e.t >= t) t = e.t + 0.001;
    const a = { at: ctx().chat?.length ?? 0, t, ...entry };
    // v2.7.21: 이야기 속 행동(구매 · 이동 · 판정 · 연락 …)은 바로 앞 메시지의 그 스와이프에 묶는다
    // → 그 메시지를 지우거나 · 몇 개 전으로 지우거나 · 다시 생성 · 다른 스와이프로 넘기면 같이 사라지고, 그 스와이프로 돌아오면 살아남
    if (!isMetaEdit(a)) { const last = ctx().chat?.at(-1); if (last) { stampUser(meta, last); a.an = anchorOf(last); } }
    for (const e of meta.adjust) if (e.at > a.at) e.at = a.at; // 메시지를 지운 뒤의 편집: 앞 편집이 이 편집보다 늦게 계산되지 않게 (v2.7.20)
    // 같은 칸을 통째로 덮는 기록이 이야기 진행 없이 또 오면, 앞 기록의 칸 데이터는 쓸모가 없다 (라벨만 남김) → 채팅 파일 비대 방지
    // (새 것 + 바로 앞 2개는 남겨서 '되돌리기'를 두 번까지 정확히 할 수 있게)
    // (바뀐 부분만 적은 기록(patch)은 서로 쌓여야 맞으니 지우지 않는다 — 작아서 괜찮음)
    if (a.set?.data) { const same = meta.adjust.filter(e => e.at === a.at && e.set?.mod === a.set.mod && e.set.data); for (const e of same.slice(0, -2)) delete e.set; }
    meta.adjust.push(a);
    if (meta.adjust.length > 80) squash(meta);
    await saveMeta();
    app.refreshNow?.();
    for (const t of adjEvents.get(a.t) ?? []) app.notify ? app.notify(t) : toastr.info(esc(typeof t === 'string' ? t : t.text ?? ''), TITLE);
}
// 🗑 쓰레기통 완전 삭제 — 찌꺼기 없이: 「버렸다」 편집 기록을 조용한 삭제로 바꿔 쓰고, 굳힌 기준점·하루 기록·칸 스냅샷에서도 지운다.
// 채팅 메시지는 건드리지 않고, AI에게 가는 「UI 행동」 줄에도 안 남는다. 세이브 슬롯(일부러 저장한 과거 시점)은 그대로.
export async function purgeTrash(names) {
    const meta = getMeta();
    if (!meta?.base || !names?.length) return 0;
    const said = (nm) => (l) => typeof l === 'string' && (l === `${nm}을(를) 버렸다` || l === `🗑 ${nm}`);
    let n = 0;
    for (const nm of names) {
        const key = norm(nm);
        // ① 아직 굳히지 않은 편집 기록: 가장 최근에 이 이름을 버린 기록 하나를 찾아 바꿔 쓴다
        const adj = (meta.adjust ?? []).slice().sort((a, b) => b.at - a.at || b.t - a.t);
        const hit = adj.find(a => (a.ops ?? []).some(([k, v]) => k === '_trash' && norm(splitBar(v)[0]) === key));
        if (hit) {
            hit.ops = hit.ops.map(([k, v]) => (k === '_trash' && norm(splitBar(v)[0]) === key ? ['_purge', splitBar(v)[0]] : [k, v]));
            if (hit.ops.every(([k]) => k === '_purge')) { delete hit.label; hit.silent = true; }
            n++;
        } else {
            // ② 이미 굳힌 기준점 안의 쓰레기통에서 하나 지우기
            const tr = meta.base.data?.home?.trash;
            const k = tr ? tr.map(t => norm(t.name)).lastIndexOf(key) : -1;
            if (k >= 0) { tr.splice(k, 1); n++; }
        }
        // ③ 칸을 통째로 저장한 기록(직접 편집·AI로 수정)에 남은 쓰레기통 사본에서도 빼기
        for (const a of meta.adjust ?? []) if (a.set?.mod === 'home' && Array.isArray(a.set.data?.trash)) a.set.data.trash = a.set.data.trash.filter(t => norm(t.name) !== key);
        // ④ 하루 정리 기록에 남은 「버렸다」 줄 지우기 (굳힌 것)
        for (const d of meta.base.days ?? []) if (Array.isArray(d.labels)) { const before = d.labels.length; d.labels = d.labels.filter(l => !said(nm)(l)); d.n = Math.max(0, (d.n ?? before) - (before - d.labels.length)); }
    }
    if (n) { await saveMeta(); app.refreshNow?.(); }
    return n;
}
// ───── 🧹 기록 · 칸 지우기 (v2.7.18) — 찌꺼기 없이 ─────
// 미트볼 전용 기록 키(_roll 같은 것)가 어느 칸 것인지
export const PRIV_MOD = {
    _qask: 'quest', _needmod: 'stats', _achtog: 'ach', _bond: 'rel', _love: 'rel', _nolove: 'rel', _leave: 'rel', _unbond: 'rel', _peekday: 'rel', _merge: 'rel',
    _draw: 'fate', _effect: 'fate', _fortune: 'fate', _birth: 'fate', _ftfee: 'fate', _ftdel: 'fate', _loan: 'wallet', _repay: 'wallet', _sellused: 'wallet', _tobag: 'wallet', _memo: 'memo', _questpay: 'quest',
    _read: 'contact', _nread: 'news', _roll: 'dice', _trash: 'home', _purge: 'home', _restore: 'home', _tostore: 'home', _unplace: 'home', _travel: 'map', _spot: 'map', _clock: 'calendar',
};
export const opMod = (s, k) => opInfo(s, k).mod ?? PRIV_MOD[k] ?? null;
// 편집 기록에서 조건에 맞는 변화만 빼기 (빈 기록은 통째로) → 뺀 개수
function stripAdjust(meta, s, drop) {
    let n = 0;
    meta.adjust = (meta.adjust ?? []).filter(a => {
        if (drop.entry?.(a)) { n++; return false; }
        if (Array.isArray(a.ops) && a.ops.length) {
            const keep = a.ops.filter(([k, v]) => !drop.op?.(k, v, a));
            if (keep.length !== a.ops.length) { n += a.ops.length - keep.length; a.ops = keep; }
        }
        if (!a.ops?.length && !a.set) return false; // 남은 게 없으면 기록 자체를 (라벨 · 알림 · AI에게 가는 「UI 행동」 줄까지) 지움
        return true;
    });
    return n;
}
// 칸 전체 삭제할 때 남겨 두는 「틀」 (날짜 · 화폐 · 단계표 · 연락 방식처럼 내용이 아니라 설정인 것)
const WIPE_KEEP = {
    calendar: ['y', 'm', 'd', 'time', 'era', 'months', 'week', 'times', 'autoWeather', 'noAuto', 'clock'], wallet: ['currency', 'fx', 'prices'],
    contact: ['mode', 'app', 'couriers', 'express'], rel: ['stages', 'affName', 'trustName'], dice: ['system', 'rules', 'quick'],
    music: ['taste'], fate: ['deck', 'drawChance', 'rules', 'feeTarot', 'feeOrb', 'feeShaman', 'feeGut'], news: ['name'], gossip: ['name'], board: ['name'], sns: ['name'], profile: ['mode'], home: ['name', 'desc'], map: ['name'],
};
export function wipedData(mod, cur) {
    const out = EMPTY[mod]();
    for (const k of WIPE_KEEP[mod] ?? []) if (cur && Object.hasOwn(cur, k)) out[k] = clone(cur[k]);
    return normalize(mod, out);
}
// 🧹 칸 하나 전체 삭제: 내용 · 이 칸의 편집 기록 · 지금까지 AI 답에 적힌 이 칸의 변화를 모두 없앤 것으로 (채팅 글은 그대로)
// 굳힌 기준점 · 하루 정리 · 플레이 기록 숫자에서도 뺀다. 세이브 슬롯(일부러 저장한 과거 시점)만 그대로.
export async function wipeModule(mod) {
    const meta = getMeta(); const s = app.current?.state;
    if (!meta?.base || !s || !MOD_IDS.includes(mod)) return false;
    const chat = ctx().chat ?? [];
    stripAdjust(meta, s, { entry: (a) => a.set?.mod === mod, op: (k) => opMod(s, k) === mod });
    meta.base.data[mod] = wipedData(mod, s.data[mod]);
    meta.wipe = { ...(meta.wipe ?? {}), [mod]: chat.length }; // 이 앞의 AI 답에 적힌 이 칸 변화는 계산에서 뺀다
    const T = meta.base.tally;
    if (T) {
        if (mod === 'dice') { T.rolls = 0; T.good = 0; T.crit = 0; T.fumble = 0; }
        if (mod === 'contact') T.got = 0;
        if (mod === 'quest') T.quests = 0;
        if (mod === 'fate') T.curses = 0;
        if (mod === 'wallet') { T.earn = 0; T.spend = 0; }
        if (mod === 'map') T.places = [];
    }
    if (mod === 'rel') for (const d of meta.base.days ?? []) d.aff = [];
    if (mod === 'wallet') { for (const d of meta.base.days ?? []) d.cash = 0; meta.base.gone = []; }
    if (mod === 'home') meta.base.gone = [];
    await saveMeta();
    app.refreshNow?.();
    return true;
}
// 🎲 주사위 기록 지우기: 하나(그 굴림) 또는 전부 (v2.7.18 · 예전엔 재미로 한 번 굴려도 지울 수 없었음)
const sameRoll = (a, b) => !!a && !!b && (a.t && b.t ? a.t === b.t : a.res === b.res && a.label === b.label && a.detail === b.detail);
export async function purgeRolls(one = null) {
    const meta = getMeta(); const s = app.current?.state;
    if (!meta) return 0;
    let n = 0, gone = false;
    const hit = (v) => { if (!one) return true; if (gone) return false; try { const r = JSON.parse(v); if (sameRoll(r, one)) { gone = true; return true; } } catch { /* */ } return false; };
    // 가장 최근 것부터 찾아야 같은 결과가 여럿일 때 최근 것이 지워진다
    meta.adjust = (meta.adjust ?? []).slice().reverse();
    n += stripAdjust(meta, s, { op: (k, v) => k === '_roll' && hit(v) });
    meta.adjust.reverse();
    const lg = meta.base?.data?.dice?.log;
    if (Array.isArray(lg) && (!one || !gone)) {
        if (!one) { n += lg.length; meta.base.data.dice.log = []; } else { const k = lg.map((r, i) => [r, i]).reverse().find(([r]) => sameRoll(r, one))?.[1]; if (k !== undefined) { lg.splice(k, 1); n++; } }
    }
    if (!one && meta.base?.tally) Object.assign(meta.base.tally, { rolls: 0, good: 0, crit: 0, fumble: 0 });
    await saveMeta();
    app.refreshNow?.();
    return n;
}
// 마지막 편집 되돌리기 (상태창에서 한 것만 · AI 답은 그대로)
export async function undoLast() {
    const meta = getMeta();
    // 완전 삭제로 바꿔 쓴 기록은 건너뛴다 (되돌리기로 지운 물건이 창고에 되살아나지 않게)
    const isPurge = (e) => e?.silent && (e.ops ?? []).length && e.ops.every(([k]) => k === '_purge');
    const idx = (meta?.adjust ?? []).findLastIndex(e => !isPurge(e) && !e._off && !e.side); // 📦 따로 보관 덩어리는 되돌리기 대상이 아님 // 지금 안 보이는(다른 스와이프의) 편집은 건너뜀
    if (idx < 0) return null;
    const a = meta.adjust.splice(idx, 1)[0];
    await saveMeta();
    app.refreshNow?.();
    return a;
}
// 편집 기록 하나만 골라 되돌리기 (v2.7.6 · 관리 탭 › 되돌리기 › 편집 기록) — 그 뒤의 기록은 그대로 다시 계산돼요
export async function undoAt(t) {
    const meta = getMeta();
    const i = (meta?.adjust ?? []).findIndex(e => e.t === t);
    if (i < 0) return null;
    const a = meta.adjust.splice(i, 1)[0];
    await saveMeta();
    app.refreshNow?.();
    return a;
}
// ───── 바뀐 부분만 기록 (v2.7.7) ─────
// 연락 · 뉴스 · 소문 · 게시판 · SNS는 버튼 한 번마다 칸 전체(모든 대화방)를 편집 기록에 통째로 복사했다 → 오래 쓰면 채팅 파일이 MB 단위.
// 이제 지금 상태와 비교해 바뀐 칸(대화방은 그 사람 것만)만 적는다. 계산할 땐 그 시점 상태 위에 덮어쓴다.
export const DELTA_MODS = new Set(['contact', 'news', 'gossip', 'board', 'sns']);
// ───── 📦 따로 보관 (v2.7.23) ─────
// 연락 · 뉴스 · 가십지 · 게시판 · SNS에서 「내가 상태창으로 한 것」은 기록장에 줄줄이 쌓지 않고, 칸마다 「지금 내용」 한 덩어리만 둔다.
//   → 연락을 아무리 해도 기록이 안 불어나고(전부 굳히기 · 파일 비대 없음), 「방금 한 일」로 AI에게 새지 않고, 채팅을 지우거나 다시 생성해도 그대로 남는다.
// 「채팅에 붙이기」(설정 bind○○)를 켠 칸만 예전처럼 기록장에 적는다 (되감기 · 「방금 한 일」 알림).
// 덩어리는 기록장 맨 앞의 한 줄(side: 칸 이름 · 칸 통째 · 묶지 않음)이라 계산 방식은 그대로다 — 그 뒤에 온 AI 답의 변화는 평소처럼 그 위에 더해진다.
const BIND_KEY = { contact: 'bindContact', news: 'bindNews', gossip: 'bindGossip', board: 'bindBoard', sns: 'bindSns' };
export const sideOn = (mod) => DELTA_MODS.has(mod) && settings()[BIND_KEY[mod]] !== true;
// 그 답(옛 스와이프)이 만들어 넣은 항목 빼기 — AI 답이 만든 연락 · 기사 · 글의 번호는 「채팅:메시지번호:…」로 시작한다
function dropFromMsg(s, mod, pre) {
    const d = s.data[mod]; if (!d) return;
    const keep = (x) => !String(x?.id ?? '').startsWith(pre);
    if (mod === 'contact') { for (const who of Object.keys(d.threads ?? {})) d.threads[who] = d.threads[who].filter(keep); return; }
    const lk = FEED_LISTS[mod];
    if (lk && Array.isArray(d[lk])) d[lk] = d[lk].filter(keep);
}
const onlyMod = (s, a, mod) => !!a.ops?.length && !!s && a.ops.every(([k]) => opMod(s, k) === mod);
function writeSide(meta, mod, data) {
    const chat = ctx().chat ?? [], s = app.current?.state;
    // 이 칸의 옛 기록은 새 덩어리가 통째로 덮으니 지운다 (다른 칸 변화가 섞인 줄은 그 부분만 남김)
    meta.adjust = (meta.adjust ?? []).filter(a => {
        if (a.side === mod) return false;
        if (a.set?.mod === mod) { if (!a.ops?.length || onlyMod(s, a, mod)) return false; delete a.set; return true; }
        return !(!a.set && onlyMod(s, a, mod));
    });
    let t = Date.now();
    for (const e of meta.adjust) if (e.t >= t) t = e.t + 0.001;
    const last = chat.at(-1);
    meta.adjust.unshift({ at: chat.length, t, set: { mod, data: normalize(mod, clone(data)) }, side: mod, keep: true, ...(last && !last.is_user ? { an0: anchorOf(last) } : {}) });
}
// 예전 방식으로 쌓인 기록을 덩어리 하나로 (채팅을 열 때 · 설정을 바꿀 때) → 바꾼 칸 수
export function sideSweep(meta = getMeta()) {
    const s = app.current?.state;
    if (!meta?.base || !s) return 0;
    let n = 0;
    for (const mod of DELTA_MODS) {
        if (!sideOn(mod) || !s.data[mod]) continue;
        if ((meta.adjust ?? []).some(a => a.side !== mod && (a.set?.mod === mod || (!a.set && onlyMod(s, a, mod))))) { writeSide(meta, mod, s.data[mod]); n++; }
    }
    return n;
}
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const same = (x, y) => x === y || JSON.stringify(x) === JSON.stringify(y);
// 목록은 「앞에서 d개 빼고 · 뒤에 몇 개 붙임」으로 적을 수 있으면 그렇게 (대화방에 한 줄 보내면 그 한 줄만)
function listDelta(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const A = a.map(x => JSON.stringify(x)), B = b.map(x => JSON.stringify(x));
    for (let d = 0; d <= A.length; d++) {
        const n = A.length - d;
        if (n > B.length) continue;
        let ok = true;
        for (let i = 0; i < n; i++) if (A[d + i] !== B[i]) { ok = false; break; }
        if (ok) return n || !A.length ? { $d: d, $p: b.slice(n) } : null;
    }
    return null;
}
const isList = (x) => isPlain(x) && Object.hasOwn(x, '$p') && Object.hasOwn(x, '$d');
function valDelta(a, b) { const l = listDelta(a, b); return l && JSON.stringify(l).length < JSON.stringify(b).length ? l : b; }
export function deltaOf(a, b) {
    const p = { top: {}, del: [], sub: {} };
    for (const k of Object.keys(b)) {
        if (same(a[k], b[k])) continue;
        if (isPlain(a[k]) && isPlain(b[k])) {
            const set = {}, del = [];
            for (const sk of Object.keys(b[k])) if (!same(a[k][sk], b[k][sk])) set[sk] = valDelta(a[k][sk], b[k][sk]);
            for (const sk of Object.keys(a[k])) if (!Object.hasOwn(b[k], sk)) del.push(sk);
            p.sub[k] = del.length ? { set, del } : { set };
        } else p.top[k] = valDelta(a[k], b[k]);
    }
    for (const k of Object.keys(a)) if (!Object.hasOwn(b, k)) p.del.push(k);
    return p;
}
const putVal = (cur, v) => (isList(v) ? (Array.isArray(cur) ? cur.slice(v.$d) : []).concat(clone(v.$p)) : clone(v));
export function applyDelta(d, p) {
    for (const [k, v] of Object.entries(p.top ?? {})) d[k] = putVal(d[k], v);
    for (const k of p.del ?? []) delete d[k];
    for (const [k, { set = {}, del = [] }] of Object.entries(p.sub ?? {})) {
        const o = isPlain(d[k]) ? d[k] : (d[k] = {});
        for (const [sk, sv] of Object.entries(set)) o[sk] = putVal(o[sk], sv);
        for (const sk of del) delete o[sk];
    }
    return d;
}
export function commit(mod, data, label, extra = {}) {
    if (sideOn(mod)) { // 📦 따로 보관: 기록을 쌓지 않고 덩어리만 바꾼다
        const meta = getMeta(true);
        const cur0 = app.current?.state?.data?.[mod];
        // 바뀐 게 없고 이미 덩어리가 있으면 아무것도 안 한다 (읽음 표시 등으로 매번 저장하지 않게)
        try { if (cur0 && (meta.adjust ?? []).some(a => a.side === mod) && JSON.stringify(normalize(mod, clone(cur0))) === JSON.stringify(normalize(mod, clone(data)))) return Promise.resolve(); } catch (e) { ssNote('따로 보관 비교 실패', e); }
        writeSide(meta, mod, data);
        return saveMeta().then(() => { app.refreshNow?.(); });
    }
    const nd = mod === 'core' ? NORM.core(data) : normalize(mod, data);
    const cur = DELTA_MODS.has(mod) ? app.current?.state?.data?.[mod] : null;
    if (isPlain(cur)) {
        try {
            const patch = deltaOf(normalize(mod, clone(cur)), nd);
            // 바뀐 게 없으면 기록하지 않는다 (v2.7.20 · 빈 기록이 쌓여 채팅 파일만 커지던 것)
            if (!Object.keys(patch.top).length && !patch.del.length && !Object.keys(patch.sub).length && !label && !Object.keys(extra).length) return;
            return addAdjust({ set: { mod, patch }, label, ...extra });
        } catch (e) { ssWarn(LOG, 'delta', e); }
    }
    return addAdjust({ set: { mod, data: nd }, label, ...extra });
}
// 최근 이만큼의 메시지는 굳히지 않는다 (지우기 · 다시 생성 · 스와이프로 되감기는 이 안에서) — 설정 rewindKeep (10~120 · 기본 40)
const squashKeep = () => clamp(parseInt(settings().rewindKeep, 10) || 40, 10, 120);
export function squash(meta, keep = squashKeep()) {
    const chat = ctx().chat ?? [];
    const start = resolveStart(meta, chat);
    let cut = Math.max(start, chat.length - keep);
    let r = compute(cut, { bake: true });
    if (!r) return;
    if (r.rest.length > 150) { cut = chat.length; r = compute(cut, { bake: true }); } // 최근 기록이 너무 많으면 전부 굳힘
    if (settings().autoSave && meta.base) {
        // 굳히기 전에 지금 기준점을 자동 세이브로 (분기·실수 대비, 최근 3개)
        meta.saves = arr(meta.saves).filter(x => !x.auto).concat(arr(meta.saves).filter(x => x.auto).slice(-1), [{ id: uid(), auto: true, name: '자동 세이브', t: Date.now(), at: meta.startAt ?? 0, key: meta.startKey ?? null, base: clone(meta.base), baseTurn: meta.baseTurn ?? 0, adjust: clone(meta.adjust ?? []), mods: { ...meta.mods }, difficulty: meta.difficulty }]);
    }
    // 굳힌 답의 칩 (v2.7.23): 굳히면 그 답들은 다시 계산하지 않아서 칩이 사라졌다 → 굳히는 순간의 칩 글을 답에 적어 두고 계속 보여 준다
    try { for (const [i, sn] of r.snaps) { const m = chat[i]; if (!m || !sn.labels?.length) continue; (((m.extra ??= {})[MODULE] ??= {}).chips ??= {})[m.swipe_id ?? 0] = sn.labels.slice(0, 14); syncSwipe(m); } } catch (e) { ssNote('굳힌 답 칩 적어 두기 실패', e); }
    meta.base = { core: r.state.core, data: r.state.data, tally: r.state.tally, days: r.state.days, day0: r.state.day0, gone: r.state.gone };
    meta.baseTurn = r.state.turn;
    meta.startAt = cut;
    meta.startKey = chat[cut - 1]?.send_date ?? null;
    meta.adjust = r.rest;
}
// 긴 채팅: 굳히지 않은 메시지가 너무 많으면 오래된 쪽을 굳혀서 매 턴 다시 계산하는 양을 줄인다 (v2.7)
// 최근 BAKE_KEEP개는 그대로 → 그 안의 스와이프·편집·삭제는 예전처럼 바로 반영된다
export const BAKE_KEEP = 120;
export function autoBake(meta = getMeta()) {
    const set = settings();
    if (!meta?.base || set.autoBake === false) return false;
    const chat = ctx().chat ?? [];
    const limit = clamp(parseInt(set.bakeAfter, 10) || 250, 200, 5000);
    if (chat.length - resolveStart(meta, chat) <= limit) return false;
    squash(meta, BAKE_KEEP);
    return true;
}

// ───── 편지 계산 ─────
export function dueLetters(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct) return [];
    const now = nowTick(s, meta);
    const out = [];
    for (const [who, th] of Object.entries(ct.threads)) for (const m of th) if (m.pending && (m.arrive ?? 0) <= now) out.push({ who, m });
    return out;
}
export function inTransit(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct || !letterMode(ct)) return [];
    const now = nowTick(s, meta);
    const out = [];
    for (const [who, th] of Object.entries(ct.threads)) for (const m of th) if ((m.arrive ?? -Infinity) > now) out.push({ who, m, left: m.arrive - now });
    return out;
}
export function unreadCount(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct || !modOn('contact', meta)) return 0;
    return Object.values(ct.unread ?? {}).reduce((a, b) => a + b, 0) + dueLetters(s, meta).length;
}

// ───── 프롬프트 주입 ─────
// aff · trust 키 설명 — 애정/우정 방식이면 뜻을 분명히 (친구에게 애정을 올리지 않게)
function relKeyHint() {
    const rl = app.current?.state?.data?.rel, A = relAxes(rl, viewTr());
    return A.love
        ? `aff (이름 ±N — ${A.aff}: romantic interest toward {{user}} — attraction, butterflies, flustered or tender moments, flirting, jealousy, physical closeness; record +1~+3 whenever such a moment happens, even small, and − when {{user}} hurts or disappoints them${noLoveNote(rl)}) · trust (이름 ±N — ${A.trust}: friendship, closeness, trust — record it too; one moment can raise both)`
        : `aff (이름 ±N — ${A.aff}: affection${noLoveNote(rl)}) · trust (이름 ±N — ${A.trust})`;
}
const noLoveNote = (rl) => { const n = (rl?.user ?? []).filter(x => x.noLove).map(x => x.name); return n.length ? ` · platonic only, never raise aff: ${n.slice(0, 8).join(', ')}` : ''; };
const relKeyShort = (rl) => { const A = relAxes(rl, viewTr()); return (A.love ? ` (aff = ${A.aff}: romantic interest, raise it on any romantic/flustered moment · trust = ${A.trust}${noLoveNote(rl)})` : noLoveNote(rl) ? ` (${noLoveNote(rl).slice(3)})` : ''); };
export function tagKeysFor(meta) {
    const K = [];
    const on = (id) => modOnRaw(id, meta); // 가린 칸도 변화 기록은 계속 (AI가 값은 못 보지만 ±N으로 적으면 반영)
    if (on('stats')) K.push('stat (게이지이름 ±N, e.g. 체력 -12 · 체력 max +10) · attr (능력치 ±1, only after real growth) · cond (+이름 | 효과 / -이름)');
    if (on('wallet')) K.push('cash (±N) · item (+이름 2 | 설명 / -이름 1)');
    if (on('shop')) K.push('stock (상점 | 상품 | 가격 | 설명 — when the story adds goods; 상점 | -상품 removes)');
    if (on('home')) K.push('decor (+가구 | 방 — when {{user}} gets/places furniture) · room (+새 공간 | 설명)');
    if (on('map')) K.push('loc (장소 — whenever {{user}} moves) · place (이름 | 설명 | 이어진곳 — newly discovered place)');
    if (on('rel')) {
        const pa = settings().pairAff === true ? ' · pairaff (A & B ±N — how close two characters OTHER than {{user}} are to each other, -100..100; +1~+3 after a real moment between them, − after they clash)' : '';
        K.push(playOf(meta).ensemble ? `pair (A & B = 관계 — how two characters relate; add or update when it truly changes)${pa}` : `${relKeyHint()} · rel (이름 = 관계 이름, when it truly changes) · pair (A & B = 관계)${pa}`);
    }
    if (on('calendar')) K.push(`days (+1 when days pass / 3월 14일 to jump) · ${calClock() ? 'period (the clock time now, 24-hour HH:MM like 14:30 — write it in every reply where time has passed, even a few minutes; add "days: +1" when it passes midnight)' : 'period (one of the time slots)'} · weather (only when the story changes it) · event (날짜 | 제목 | 설명 — a new appointment)`);
    if (on('quest')) K.push('quest (제목 | 새/수락/완료/실패 | 설명 — a new request appears, {{user}} accepts, or it ends; 제목 | 진행 내용 = progress)');
    if (on('news')) K.push('news (헤드라인 | 내용 — only for big public events)');
    if (on('gossip')) K.push('rumor (제목 | 내용 | 관련 인물 — when people start whispering about something)');
    if (on('board')) K.push('post (작성자 | 제목 | 내용 — rarely, a public notice/post appears)');
    if (on('ach')) K.push('ach (업적 이름 — only when its condition is truly met)');
    if (on('memo')) K.push('memo (a short note worth keeping: promise, clue, goal — rarely)');
    if (on('contact')) K.push('msg (이름 | 내용 — someone sends {{user}} a message/letter from afar; occasionally, not every turn)');
    if (on('profile')) K.push('npc (이름 | 한 줄 소개 — a new named character who will matter)');
    if (on('dice')) K.push('roll (판정 이름 | 난이도 — ask {{user}} to roll instead of deciding a risky outcome yourself)');
    if (on('fate')) K.push('curse (이름 | 효과1, 효과2 | 일수 | 풀리는 조건 — only when the story truly curses or blesses {{user}}; -이름 lifts it)');
    if ((on('rel') || on('profile')) && (settings().mindMode ?? 'off') !== 'off' && mindActive(app.current?.state?.turn ?? 0)) K.push('mind (이름 | 속마음 — hidden inner feeling, only this turn; NOT msg: msg is a real message sent to {{user}})');
    if (on('rel') && settings().jealousy) K.push('jealous (이름 ±N — someone gets jealous of {{user}} with another, or is reassured)');
    if (on('rel') && settings().romBond) K.push('confess (이름 — ONLY right after a real confession was made AND accepted in this reply; the user confirms it. Never for closeness or time spent together)');
    if (on('rel') && settings().romDrive) K.push('concern (이름 | 요즘 신경 쓰는 것 — when what they are preoccupied with changes or gets resolved; 이름 | 없음 clears) · taste (이름 | 끌리는 것 | 싫어하는 것 — fill once if blank)');
    if (on('rel') && settings().offscreen) K.push('life (이름 | 화면 밖에서 한 일 — only right after days pass, 1-2 people not in the scene, small believable things)');
    if (on('sns')) K.push('sns (작성자 | 글 | 사진 묘사 | #태그 — a character posts on social media; rarely, when it fits)');
    if (on('music')) K.push(`bgm (곡 제목 - 가수 | 분위기 — ONLY when the scene's mood clearly shifts; a REAL existing song that fits${musicTaste() ? `, taste: ${musicTaste()}` : ''}; never quote lyrics)`);
    if (on('custom')) K.push('custom (탭 | 항목 ±N  or  탭 | 항목 = 글 — the user\'s own tracked values below)');
    return keysI(K); // 화면만 번역이면 자리표시도 영어로 (v2.7.14: 예전엔 한 경로에서만 바꿔서 본편 주입 · 분석 호출에 한국어가 섞여 감)
}

const calClock = () => { try { return app.current?.state?.data?.calendar?.clock || ''; } catch { return ''; } }; // 🕐 시각으로 적는 달력인가
const musicTaste = () => { try { return app.current?.state?.data?.music?.taste || settings().musicTaste || ''; } catch { return settings().musicTaste || ''; } };

// ───── 칸별 보내는 때: always · kw(관련 말이 나올 때만) · n3 · n5 ─────
const KW = {
    shop: (d) => ['상점', '가게', '구매', '사러', '살까', '팔', '시장', '쇼핑', 'shop', ...(d.shop?.shops ?? []).flatMap(x => [x.name, x.place])],
    home: (d) => ['집', '방', '본거지', '숙소', '기숙사', '가구', d.home?.name, ...(d.home?.rooms ?? []).map(r => r.name)],
    news: () => ['뉴스', '소식', '신문', '방송', '기사', '보도', '관보'],
    gossip: () => ['소문', '가십', '스캔들', '루머', '수군'],
    board: () => ['게시판', '게시글', '커뮤', '글 올', '댓글'],
    ach: () => ['업적'],
    sns: (d) => ['sns', 'SNS', '인스타', '피드', '게시물', '올렸', '좋아요', '팔로', d.sns?.name],
    quest: (d) => ['의뢰', '퀘스트', '임무', '부탁', '목표', ...(d.quest?.list ?? []).filter(q => q.status !== 'done' && q.status !== 'failed').map(q => q.title)],
    custom: (d) => (d.custom?.tabs ?? []).flatMap(t => [t.name, ...t.fields.map(f => f.k)]),
    profile: (d) => (d.profile?.list ?? []).map(p => p.name),
    memo: (d) => (d.memo?.list ?? []).filter(m => m.inject).flatMap(m => String(m.text).split(/[\s,.!?·]+/).filter(w => w.length >= 2).slice(0, 4)),
};
export const FREQ_MODS = ['shop', 'home', 'news', 'gossip', 'board', 'ach', 'quest', 'sns', 'custom', 'memo'];
export function dueTester(set, s) {
    const plan = set.injEvery ?? {};
    if (!Object.keys(plan).length) return () => true;
    const n = clamp(parseInt(set.sceneTurns, 10) || 6, 1, 40);
    const text = (ctx().chat ?? []).slice(-n).map(m => stripStatus(m?.mes)).join('\n').toLowerCase();
    return (id) => {
        const v = plan[id] ?? 'always';
        if (v === 'always') return true;
        if (v === 'n3' || v === 'n5') return (s.turn % (v === 'n3' ? 3 : 5)) === 0;
        if (v === 'kw') return (KW[id]?.(s.data) ?? []).some(w => w && String(w).length >= 1 && text.includes(String(w).toLowerCase()));
        return true;
    };
}

// 짧은 인물 줄 (초압축 · 변화 위주 턴) — v2.7.19: 예전엔 💍 연인 확정 · 단계 넘지 않기가 빠지고 🚫♥ 뜻도 안 알려서,
// 4턴 중 3턴은 「우정만」 · 「연인」 · 「단계 잠금」이 AI에게 사실상 안 갔음 → 표시를 붙이고, 쓴 표시만 뜻을 한 줄로
function relShort(d, here, withLabel) {
    const set = settings(), AX = relAxes(d.rel, viewTr());
    const lock = set.stageLock && !set.romFacts && stagesOn();
    const used = new Set();
    const one = (x) => {
        const f = [];
        if (x.noLove) { f.push('🚫♥'); used.add('nl'); }
        if (set.romBond && x.bond) { f.push('💞'); used.add('bond'); }
        if (x.jealous >= 30) { f.push(`💢${x.jealous}`); used.add('j'); }
        return `${x.name} ${x.aff}/${x.trust}${withLabel && x.label ? `[${x.label}]` : ''}${stagesOn() ? `<${stageOf(d.rel, x).name}>` : ''}${f.join('')}`;
    };
    // v2.7.20: 「이름25/80」이 HP100/100 바로 아래라 「80 중 25」로 읽혔다 → 머리에 어느 숫자가 무엇인지, 사람은 · 로 나눔
    const line = `♥(name ${AX.aff}/${AX.trust}, each -100~100) ${here.map(one).join(' · ')}`;
    const key = [used.has('nl') && '🚫♥ = platonic only, never raise aff', used.has('bond') && '💞 = confirmed lovers', used.has('j') && '💢 = jealousy, show it subtly', lock && '<stage> = do not act beyond it yet'].filter(Boolean);
    return key.length ? `${line}\n(${key.join(' · ')})` : line;
}
// ───── 변화 위주로 보내기: N턴마다 전체, 그 사이엔 핵심 + 바뀐 것만 ─────
export function deltaPlan(r, set = settings()) {
    if (!set.deltaMode || !r) return null;
    const N = clamp(parseInt(set.deltaEvery, 10) || 4, 2, 20);
    const t = r.state.turn;
    const k = t % N;
    if (k === 0 || t <= 1) return null; // 이번 턴은 전체 · 첫 턴은 전체 (v2.7.20: 1턴째부터 「전에 보냈다」는 짧은 꼴이 나갔음 · 짧은 꼴도 이제 이름 맞출 것은 다 실음)
    if (getMeta()?.fullTurn === t) return null; // 가린 칸을 다시 켠 턴 → 한 번은 전체
    const last = r.snaps.get(r.lastAI);
    if (last?.labels.some(l => /^📍|^💞|^💔/.test(l))) return null; // 장소·관계 단계가 바뀐 직후엔 전체
    const changes = [];
    for (const sn of r.snaps.values()) if (sn.turn > t - k) changes.push(...sn.labels.filter(l => !l.startsWith('🎲')));
    return { changes, left: N - k };
}

// ───── 장면 필터: 최근 대화에 나온 인물만 자세히 ─────
export function sceneTester(set = settings(), s = null) {
    if (!set.sceneFilter) return () => true;
    const n = clamp(parseInt(set.sceneTurns, 10) || 6, 1, 40);
    const chat = ctx().chat ?? [];
    const text = chat.slice(-n).map(m => `${m?.name ?? ''}\n${stripStatus(m?.mes)}`).join('\n');
    const always = new Set(chatCharacters().map(ch => norm(ch.name)));
    // 일과상 지금 {{user}}와 같은 곳에 있는 사람도 장면에 넣는다
    if (s?.data.map?.here) for (const nm of peopleAt(s, s.data.map.here).now) always.add(norm(nm));
    return (name) => {
        const nm = String(name ?? '').trim();
        if (!nm) return false;
        if (always.has(norm(nm)) || text.includes(nm)) return true;
        const ko = trLook(nm); // 화면만 번역: 한국어 본편엔 번역된 이름으로 나옴 (「엘리자베스 그레이」 → 「엘리」만 불러도)
        if (ko && text.includes(ko)) return true;
        const parts = [...nm.split(/[\s·.]+/), ...(ko ? ko.split(/[\s·.]+/) : [])];
        return parts.some(part => part.length >= 2 && text.includes(part));
    };
}
const MOD_SHORT = { easy: '이지', normal: '보통', hard: '하드' };

// 연락 → 본편 반영: 반영 모드(끔·자동·고른 것만·요약)와 연락처별 예외를 따라 고른다
export const PIN_LINES = 20;
export function contactPicks(s, meta, set, inScene) {
    const ct = s.data.contact;
    if (!ct) return [];
    // 간단 모드 (v2.7.18): 기본은 본편에 안 보냄 · 「최근만」을 고르면 가장 최근 연락 한 사람의 마지막 두 줄만 짧게
    if (contactSimple()) {
        if (set.contactSimpleReflect !== 'recent') return [];
        const now0 = nowTick(s, meta);
        for (const who of ct.recent ?? Object.keys(ct.threads)) {
            if (findBy(ct.contacts, who)?.reflect === 'never') continue;
            const th = (ct.threads[who] ?? []).filter(m => !m.pending && (m.arrive ?? -Infinity) <= now0);
            if (th.length) return [{ who, msgs: th.slice(-2).map(m => ({ ...m, text: short(m.text, 60) })), summary: '', always: false, scene: inScene(who), r: 0 }];
        }
        return [];
    }
    const mode = set.contactReflect ?? (set.contactInject === false ? 'off' : 'auto');
    const now = nowTick(s, meta);
    const rank = (who) => { const k = (ct.recent ?? []).indexOf(who); return k < 0 ? 999 : k; };
    const out = [];
    for (const [who, th0] of Object.entries(ct.threads)) {
        const c = findBy(ct.contacts, who);
        const refl = c?.reflect || '';
        if (refl === 'never' || (mode === 'off' && refl !== 'always' && refl !== 'pinned')) continue;
        const th = th0.filter(m => !m.pending && (m.arrive ?? -Infinity) <= now);
        if (!th.length) continue;
        const how = refl === 'pinned' ? 'pinned' : refl === 'always' ? (mode === 'summary' ? 'summary' : 'auto') : mode;
        let msgs = [], summary = '';
        if (how === 'pinned') msgs = th.filter(m => m.pin).slice(-PIN_LINES); // 📌 고른 것만: 구간으로 고를 수 있어서 3줄 → 20줄까지 (v2.7.23)
        else if (how === 'summary') {
            const sm = ct.summaries?.[who];
            if (sm) { summary = sm.text; msgs = th.slice(sm.n).slice(-2); } else msgs = th.slice(-3);
            msgs = [...th.slice(0, sm?.n ?? 0).filter(m => m.pin).slice(-2), ...msgs];
        } else {
            const last = th.slice(-3);
            msgs = [...th.slice(0, -3).filter(m => m.pin).slice(-2), ...last];
        }
        if (!msgs.length && !summary) continue;
        out.push({ who, msgs, summary, always: refl === 'always', scene: inScene(who), r: rank(who) });
    }
    out.sort((a, b) => (b.always - a.always) || (b.scene - a.scene) || (a.r - b.r));
    return out.filter((x, i) => x.always || i < 3);
}
function stageOf(rl, r) { const st = rl.stages?.length ? rl.stages : DEFAULT_STAGES; return st[clamp(r.stage ?? 0, 0, st.length - 1)]; }
function customLines(s, ultra) {
    const tabs = (s.data.custom?.tabs ?? []).filter(t => t.inject && t.fields.length);
    return tabs.map(t => ultra
        ? `${t.icon}${t.name}:${t.fields.map(f => `${f.k}${f.type === 'text' ? `=${short(f.v, 30)}` : f.type === 'bar' ? `${fmtNum(f.v)}/${fmtNum(f.max)}` : fmtNum(f.v)}`).join(',')}`
        : `${t.icon} ${t.name}${t.note ? ` (${short(t.note, 80)})` : ''}: ${t.fields.map(f => `${f.k} ${f.type === 'text' ? short(f.v, 60) : f.type === 'bar' ? `${fmtNum(f.v)}/${fmtNum(f.max)}` : fmtNum(f.v)}`).join(' · ')}`);
}
function debtText(s, ultra) {
    const w = s.data.wallet;
    const open = (w?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late');
    if (!open.length) return '';
    const cal = s.data.calendar;
    const due = (l) => (l.due === null || !cal ? '' : (() => { const c = { ...cal, ...dateFromIndex(cal, l.due) }; return ultra ? `~${c.m}/${c.d}` : ` due ${dateStr(cal, c.y, c.m, c.d)}`; })());
    return ultra
        ? `빚:${open.map(l => `${l.lender}${fmtNum(l.owed)}${due(l)}${l.status === 'late' ? '!' : ''}`).join(',')}`
        : `Debts of {{user}}: ${open.map(l => `${l.lender} ${fmtNum(l.owed)} ${w.currency}${due(l)}${l.status === 'late' ? ' — OVERDUE' : ''}`).join(' · ')}`;
}
function fateText(s, ultra) {
    const f = s.data.fate; if (!f) return [];
    const L = [];
    if (f.curses.length) L.push(ultra
        ? f.curses.map(c => `${c.kind === 'bless' ? '✨' : '☠'}${c.name}${c.effects.length ? `(${c.effects.join(',')})` : ''}`).join(' ')
        : `Curses/blessings on {{user}} (real, the story must respect them): ${f.curses.map(c => `${c.name}${c.effects.length ? ` (${c.effects.join(', ')})` : ''}${c.cure ? ` — lifted by: ${c.cure}` : ''}`).join(' · ')}`);
    const now = s.data.calendar ? dayIndex(s.data.calendar) : s.turn;
    if (f.today && f.today.day === now) L.push(ultra ? `🃏${f.today.title}:${short(f.today.desc, 60)}` : `Event card today (it happens — weave it into the story): ${f.today.title}${f.today.desc ? ` — ${f.today.desc}` : ''}`);
    // 🔮 오늘 본 점괘 (점집 · v2.8.1): 본 날에만 한 줄 — 점을 안 봤으면 아무것도 안 붙는다
    if (f.omen?.text && f.omen.day === now) {
        const how = { tarot: 'tarot reading', orb: 'crystal-ball reading', shaman: "shaman's reading", gut: 'shamanic rite (gut)' }[f.omen.method] ?? 'fortune';
        L.push(ultra ? `🔮${f.omen.who}:${short(f.omen.text, 60)}` : `Fortune today — {{user}} paid for a ${how} about ${f.omen.who}: "${short(f.omen.text, 220)}" (an in-world prophecy, not a certainty: let the story echo, test or subvert it naturally; do not repeat it word for word)`);
    }
    return L;
}

// 초압축 모드: 기호·키워드만, 범례 1줄, 출력 규칙은 맨 끝 한 줄
// ───── 화면만 번역 (enview): 프롬프트에 들어가는 고정 낱말도 영어로 ─────
const SEASON_EN = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
function dateI(c) {
    if (!viewTr()) return dateStr(c);
    const mn = c.months[c.m - 1]?.name ?? '';
    const named = mn && !/^\d+\s*월$/.test(mn) && !/[가-힣]/.test(mn);
    return `${c.era ? `${c.era}, ` : ''}year ${c.y}, ${named ? `${mn} (month ${c.m})` : `month ${c.m}`}, day ${c.d}${weekday(c, c.y, c.m, c.d) ? ` (${weekday(c, c.y, c.m, c.d)})` : ''}`;
}
const seasonI = (c) => (viewTr() ? SEASON_EN : SEASON_NAME)[seasonOf(c)];
// 상태창에서 한 일 기록: 같은 줄 연속은 하나로, 화면만 번역이면 자주 나오는 것은 영어로
const MOD_EN = { profile: 'profile', stats: 'stats', dice: 'dice', wallet: 'wallet', shop: 'shop', home: 'home', rel: 'relationships', map: 'map', calendar: 'calendar', contact: 'contacts', quest: 'quests', news: 'news', gossip: 'gossip', board: 'board', ach: 'achievements', memo: 'notes', fate: 'fate', sns: 'SNS', music: 'music', custom: 'custom tab', core: 'world' };
function recentLabelEn(l) {
    const modEn = (name) => { const id = name === '세계' ? 'core' : Object.keys(MOD_EN).find(k => MOD[k]?.name === name); return id ? MOD_EN[id] : name; };
    let m = l.match(/^🔄\s*(.+?)\s*생성$/);
    if (m) return `🔄 regenerated the ${modEn(m[1])} panel`;
    m = l.match(/^💬\s*(.+?)\s*수정:/);
    if (m) return `💬 edited the ${modEn(m[1])} panel by instruction`;
    m = l.match(/^(.+?)의 답장:\s*([\s\S]*)$/);
    if (m) return `💬 reply from ${m[1]}: ${m[2]}`;
    m = l.match(/^✏️\s*(.+?)\s*직접 편집$/);
    if (m) { const id = Object.keys(MOD_EN).find(k => MOD[k]?.name === m[1]); return `✏️ edited the ${id ? MOD_EN[id] : m[1]} panel by hand`; }
    m = l.match(/^💍\s*(.+?)와\(과\) 고백이 오가 연인이 되었다/);
    if (m) return `💍 {{user}} and ${trBackName(m[1])} confessed and became lovers (confirmed by the user)`;
    m = l.match(/^💔\s*(.+?)와\(과\)는 연인이 아니다/);
    if (m) return `💔 {{user}} and ${trBackName(m[1])} are NOT lovers (the user cancelled it)`;
    return l;
}
const trBackName = (n) => trBack(n) ?? n; // 기록 당시 한국어 이름이었어도, 지금 영어로 저장된 이름으로
function recentI(s, n) {
    const out = [];
    for (const l of s.recent.slice(-n * 3)) { const x = viewTr() ? recentLabelEn(l) : l; if (out[out.length - 1] !== x) out.push(x); }
    return out.slice(-n).join(' / ');
}
// 출력 규칙: 화면만 번역이면 「값은 영어로」 (예전 문구 「Values in Korean」을 바꾸거나 덧붙임)
// v2.7.1: 한국어 상태창인데 롤플이 영어면 AI가 「place: Old Lighthouse」처럼 영어로 적어 지도·소지품 이름이 영어가 되던 것 →
// 이야기가 다른 언어여도 값은 상태창 언어로, 이미 있는 이름은 위에 적힌 그대로 (초압축·변화 위주 규칙엔 언어 줄이 아예 없었음)
const LANG_RULE = (lang) => `Values in ${lang} even if the story itself is written in another language: new place, item, person and quest names in ${lang}; existing names exactly as written above.`;
function outRule(text) {
    const lang = viewTr() ? 'English' : 'Korean';
    // 기본 문구의 뒷부분(「, names exactly as above.」)까지 같이 바꾼다 — 예전엔 그 조각이 남아 「…written above., names exactly as above.」가 매 턴 나갔음
    const OLD = /Values in (Korean|English)(?:, names exactly as above)?\.?/i;
    if (OLD.test(text)) return text.replace(OLD, LANG_RULE(lang));
    return `${text} ${LANG_RULE(lang)}`;
}
// 키 설명의 한국어 자리표시를 영어로 (화면만 번역일 때만 · 키 이름과 문법은 그대로)
const KEY_WORDS = [['3월 14일', '3/14'], ['이름 2', 'name 2'], ['이름 1', 'name 1'], ['곡 제목 - 가수', 'song title - artist'], ['탭 | 항목 = 글', 'tab | field = text'], ['진행 내용', 'progress'], ['게이지이름', 'gauge'], ['관계 이름', 'relation name'], ['새 공간', 'new space'], ['이어진곳', 'linked places'], ['업적 이름', 'achievement'], ['판정 이름', 'check'], ['풀리는 조건', 'cure'], ['요즘 신경 쓰는 것', 'current concern'], ['끌리는 것', 'likes'], ['싫어하는 것', 'dislikes'], ['화면 밖에서 한 일', 'what they did off-screen'], ['사진 묘사', 'photo description'], ['곡 제목', 'song title'], ['한 줄 소개', 'one-line intro'], ['새/수락/완료/실패', 'new/active/done/failed'], ['관련 인물', 'people involved'], ['헤드라인', 'headline'], ['#태그', '#tags'], ['3월 14일', '3/14'], ['관계', 'relation'], ['효과1', 'effect1'], ['효과2', 'effect2'], ['체력', 'HP'], ['능력치', 'attribute'], ['이름', 'name'], ['효과', 'effect'], ['설명', 'description'], ['상점', 'shop'], ['상품', 'goods'], ['가격', 'price'], ['가구', 'furniture'], ['방', 'room'], ['장소', 'place'], ['날짜', 'date'], ['제목', 'title'], ['내용', 'text'], ['난이도', 'DC'], ['일수', 'days'], ['작성자', 'author'], ['가수', 'artist'], ['분위기', 'mood'], ['탭', 'tab'], ['항목', 'field'], ['글', 'text'], ['없음', 'none']];
const keysI = (list) => (viewTr() ? list.map(k => KEY_WORDS.reduce((x, [ko, en]) => x.split(ko).join(en), k)) : list);
function buildUltra(r, opt = {}) {
    const s = r.state, d = s.data, meta = getMeta(), set = settings();
    const due = dueTester(set, s);
    const on = (id) => modOn(id, meta) && d[id] && (!FREQ_MODS.includes(id) || due(id));
    const inScene = sceneTester(set, s);
    const L = [P('inj.ultra')];
    const head = [MOD_SHORT[diffOf(meta)] ?? diffOf(meta)];
    const coreOn = !isHidden('core', meta);
    if (s.core.title && coreOn) head.push(`${s.core.title}${s.core.genre ? `(${s.core.genre})` : ''}`);
    L.push(head.join('|'));
    if (s.core.userRole && coreOn) L.push(`{{user}}=${short(s.core.userRole, 70)}`);
    if (s.core.rules && coreOn && set.injWorld) L.push(`규칙:${short(s.core.rules, 140)}`);
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d).map(e => e.title);
        const soon = []; const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(`${e.title}D-${k}`); }
        L.push(`📅${dateI(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}${ev.length ? `|${viewTr() ? 'today' : '오늘'}:${ev.join(',')}` : ''}${soon.length ? `|${soon.slice(0, 3).join(',')}` : ''}`);
    }
    if (on('map') && d.map.here) {
        const p = findBy(d.map.places, d.map.here);
        const ppl = modOn('profile', meta) ? peopleAt(s, d.map.here).now : [];
        L.push(`@${d.map.here}${p?.links?.length ? `>${p.links.slice(0, 5).join(',')}` : ''}${ppl.length ? `|👥${ppl.join(',')}` : ''}`);
    }
    if (on('stats')) {
        const st = d.stats, parts = [];
        if (st.bars.length) parts.push(st.bars.map(b => `${b.name}${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' '));
        if (st.attrs.length) parts.push(st.attrs.map(a => `${a.name}${a.val >= 0 ? '+' : ''}${a.val}`).join(' '));
        if (st.conds.length) parts.push(`⚠${st.conds.map(c => c.name).join(',')}`);
        if (parts.length) L.push(parts.join('|'));
    }
    if (on('wallet')) {
        const w = d.wallet;
        L.push(`$${fmtNum(w.cash)}${w.currency}${w.items.length ? `|${w.items.slice(0, 12).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(',')}` : ''}`);
        const dt = debtText(s, true); if (dt) L.push(dt);
    }
    if (on('fate')) L.push(...fateText(s, true));
    if (on('quest')) {
        const act = d.quest.list.filter(q => q.status === 'active');
        if (act.length) L.push(`Q:${act.slice(0, 5).map(q => `${q.title}${q.giver || q.deadline ? `(${[q.giver, q.deadline && `~${q.deadline}`].filter(Boolean).join('·')})` : ''}`).join(' / ')}`);
    }
    if (on('rel')) {
        const here = [], away = [];
        for (const x of d.rel.user) (inScene(x.name) ? here : away).push(x);
        if (here.length) L.push(relShort(d, here.slice(0, 10), true));
        if (away.length) L.push(`(장면 밖:${away.slice(0, 12).map(x => `${x.name}${x.aff}/${x.trust}`).join(' ')})`);
    }
    if (on('profile')) {
        const list = d.profile.list.filter(p => p.role !== 'user' && inScene(p.name)).slice(0, 6);
        if (list.length) L.push(list.map(p => `👤${p.name}:${short(p.summary, 60)}`).join(' / '));
    }
    if (on('contact')) {
        const ct = d.contact;
        if (letterMode(ct)) L.push('✉편지 세계(전화 없음): 도착 전엔 상대가 내용을 모름');
        else if (instantLetter(ct)) L.push('✉편지 세계(전화 없음 · 멀리 있는 사람은 편지로만)');
        const tr = inTransit(s, meta).filter(x => x.m.from === 'me');
        if (tr.length) L.push(`✉배송중:${tr.map(x => `${x.who}(${waitText(x.left, s, meta)})`).join(',')}`);
        for (const x of contactPicks(s, meta, set, inScene).slice(0, 2)) {
            L.push(`✉${x.who}:${x.summary ? `(${short(x.summary, 50)})` : ''}${x.msgs.slice(-2).map(m => `${m.from === 'me' ? '나›' : ''}${msgText(m, 40)}`).join('/')}`);
        }
    }
    if (on('memo')) {
        const ms = d.memo.list.filter(m => m.inject);
        const pins = ms.filter(m => m.pin).slice(-clamp(parseInt(set.pinCap, 10) || 8, 0, 30));
        const pick = [...pins, ...ms.filter(m => !m.pin).slice(-3)];
        if (pick.length) L.push(`※${pick.map(m => short(m.text, 60)).join(' / ')}`);
    }
    if (on('custom')) L.push(...customLines(s, true));
    if (on('sns') && d.sns.posts.length && due('sns')) L.push(`#${d.sns.posts.slice(-2).map(p => `${p.author}:${short(p.text || p.pic, 30)}`).join(' / ')}`);
    if (on('rel') && s.newDay && set.offscreen && lastDayChanged(r)) L.push('🌙날이 지남: 장면 밖 1~2명의 근황을 life 키로 (선택)');
    if (on('dice')) L.push('🎲[판정·…]=시스템 결과 그대로 서술 · 위험한 행동은 roll 키로 판정 요청');
    if (s.recent.length) L.push(`${viewTr() ? 'UI:' : 'UI행동:'}${recentI(s, 5)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ') + (modOnRaw('rel', meta) && d.rel ? relKeyShort(d.rel) : '');
        L.push(outRule(P('inj.ultra.output', { keys })));
    }
    return { main: L.filter(Boolean).join('\n'), people: '' };
}

// 마지막 AI 답(또는 그 뒤 편집)에서 날짜가 넘어갔나
function lastDayChanged(r) {
    const sn = r.snaps.get(r.lastAI);
    return !!sn?.labels.some(l => /^📅 \+/.test(l)) || r.state.recent.some(l => /하루|날짜|일 지났|📅/.test(l));
}
// 변화 위주: 핵심 + 지난 전체 이후 바뀐 것
function buildDelta(r, plan, opt = {}) {
    const s = r.state, d = s.data, meta = getMeta(), set = settings();
    const on = (id) => modOn(id, meta) && d[id];
    const inScene = sceneTester(set, s);
    const L = [P('inj.delta', { left: plan.left })];
    if (on('calendar')) { const c = d.calendar; L.push(`📅${dateI(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}`); }
    // v2.7.20: 주입문은 턴마다 새로 만들어져서 「몇 턴 전 전체」는 AI에게 남아 있지 않다 → 이름을 맞춰 써야 하는 것(장소 · 소지품 · 진행 퀘스트)은 짧게라도 늘 넣는다
    if (on('map') && d.map.here) { const p = findBy(d.map.places, d.map.here); L.push(`@${d.map.here}${p?.links?.length ? `>${p.links.slice(0, 6).join(',')}` : ''}`); }
    if (on('stats') && d.stats.bars.length) L.push(d.stats.bars.map(b => `${b.name}${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' ') + (d.stats.conds.length ? ` ⚠${d.stats.conds.map(c => c.name).join(',')}` : ''));
    if (on('wallet')) { const w = d.wallet; L.push(`$${fmtNum(w.cash)}${w.currency}${w.items.length ? `|${w.items.slice(0, 12).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(',')}` : ''}`); }
    if (on('quest')) { const act = d.quest.list.filter(q => q.status === 'active'); if (act.length) L.push(`Q:${act.slice(0, 4).map(q => { const nx = (q.steps ?? []).find(x => !x.done); return `${q.title}${nx ? ` → ${nx.text}` : ''}`; }).join(' / ')}`); }
    if (on('rel')) { const here = d.rel.user.filter(x => inScene(x.name)); if (here.length) L.push(relShort(d, here.slice(0, 8), false)); }
    if (on('fate')) L.push(...fateText(s, true));
    // 화면용 라벨(한국어 · 말줄임)은 영어 저장이면 AI에게 쓸모가 없어서 뺀다 — 바뀐 값은 위 줄에 이미 있다
    if (plan.changes.length && !viewTr()) L.push(`변화:${plan.changes.slice(-14).join(' / ')}`);
    if (s.recent.length) L.push(`${viewTr() ? 'UI:' : 'UI행동:'}${recentI(s, 5)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ') + (modOnRaw('rel', meta) && d.rel ? relKeyShort(d.rel) : '');
        L.push(outRule(P('inj.ultra.output', { keys })));
    }
    return { main: L.filter(Boolean).join('\n'), people: '' };
}

// 플레이 방식: 다인봇·풀사칭이면 머리에 한 줄, 풀사칭이면 {{user}} → 주인공
export function buildInjection(r, opt = {}) {
    const was = INJ.on; INJ.on = true; // 🙈 가린 칸은 이 안에서만 꺼진 것처럼
    try {
        const r2 = withoutParts(withoutOut(r));
        const inj = withGone(buildInjection1(r2, opt), r);
        if (r && !opt.noOutput) { try { inj.romance = swapUser(romanceBlock(r2)); } catch (e) { ssWarn(LOG, 'romance', e); } }
        if (r && !opt.noOutput) { try { const ml = mindLine(r2); if (ml && inj.main) inj.main += `\n${ml}`; } catch (e) { ssWarn(LOG, 'mind', e); } }
        return inj;
    } finally { INJ.on = was; }
}
// 설렘 한 스푼: 단계마다 할 수 있는 「설레는 한 순간」과 넘으면 안 되는 선 (친구인데 연인처럼 굴지 않게)
const sparkMemo = new Map(); // 「채팅:종류:확률:쉬는 턴」 → { upto, last, hits }
// 💭 속마음 (v2.7.21): 이번 턴에 장면 속 인물의 속마음을 <meatball>에 같이 적게 — 본편 AI가 쓰므로 추가 호출 0
export const MIND_FMT = {
    thought: 'their unspoken inner voice in FIRST person, like a thought bubble — 3 to 8 words, no narration, no name, no numbers (e.g. "…또 사고 쳤겠지" / "Idiot. Still glad he\'s okay.")',
    emoji: '1-3 emoji that show their true feeling right now (emoji only, no words)',
    kaomoji: 'one kaomoji that shows their true feeling right now, e.g. (｡•́︿•̀｡) (≧▽≦) (￣ヘ￣) (⁄ ⁄•⁄ω⁄•⁄ ⁄) — kaomoji only, no words',
};
export function mindActive(turn, set = settings()) {
    if (!MIND_FMT[set.mindMode]) return false;
    if (set.mindFreq === 'always') return true;
    if (set.mindFreq === 'tab') return false; // 탭에 들어올 때 따로 받는다 (mind.js) — 본편 AI에게는 시키지 않는다
    return sparkHit(`${ctx().getCurrentChatId?.() ?? MODULE}:mind`, clamp(num(set.mindPct, 35), 0, 100), 0, turn ?? 0);
}
function mindLine(r) {
    const set = settings(), s = r?.state, meta = getMeta();
    const relOk = !!s?.data?.rel && modOn('rel', meta), profOk = !!s?.data?.profile && modOn('profile', meta);
    if (!(relOk || profOk) || !(set.sync === 'tag' || set.sync === 'tagPlus') || !mindActive(s.turn, set)) return '';
    const inScene = sceneTester(set, s);
    const rel = relOk ? s.data.rel.user : [], who = rel.filter(x => !x.out && inScene(x.name)).map(x => x.name);
    if (profOk) for (const p of s.data.profile.list) if (p.role !== 'user' && !rel.some(r => r.name === p.name) && inScene(p.name)) who.push(p.name); // v2.9: 프로필에만 있는 인물도
    who.splice(4);
    if (!who.length) return '';
    return `This turn, inside <meatball>, add one line per character in the scene (${who.join(', ')}) with the key mind (not msg — msg is a real message): mind: Name | ${MIND_FMT[set.mindMode]}. It is hidden from {{user}} — do not reveal it in the story.`;
}
function sparkHit(key, p, cool, turn) {
    const mk = `${key}:${p}:${cool}`;
    let m = sparkMemo.get(mk);
    if (!m) { if (sparkMemo.size > 40) sparkMemo.clear(); m = { upto: -1, last: -Infinity, hits: new Set() }; sparkMemo.set(mk, m); }
    for (let t = m.upto + 1; t <= turn; t++) if (t - m.last > cool && seeded(`${key}:${t}`)() * 100 < p) { m.last = t; m.hits.add(t); }
    if (turn > m.upto) m.upto = turn;
    return m.hits.has(turn);
}
function sparkFor(x, k, Lv, lovers) {
    if (x.noLove || Lv < 0) return { moment: 'a loyal-friend gesture — remembering something small {{user}} said, a treat or small gift "because I saw it and thought of you", having {{user}}\'s back in front of others', limit: 'This is friendship only: no romantic or flirty undertone.' };
    if (lovers) return { moment: 'a spontaneous affectionate gesture, a small surprise plan or meaningful gift, or honestly saying what they love about {{user}}', limit: 'They are lovers, so warmth is welcome — still in their own voice and personality.' };
    const gap = Lv >= 0 ? Lv - k : 3; // 연인 단계까지 몇 단계 남았나
    if (k <= 0) return { moment: 'an unexpected small kindness, noticing something about {{user}} others missed, or quietly helping without being asked', limit: 'They barely know each other: no flirting, no claims of closeness.' };
    if (gap >= 4) return { moment: 'remembering a small detail {{user}} mentioned, a casual treat or small gift, stepping in to help, or a warm teasing line', limit: 'They are not close yet: keep it light and friendly, nothing romantic.' };
    if (gap === 3) return { moment: 'a small gift "I just happened to see it", remembering exactly what {{user}} likes, or a line that slips out a bit too sincerely ("I did it because it\'s you, obviously") that they don\'t explain', limit: 'They are friends: it can leave a moment of awkward silence, but there is no confession, no flirting on purpose and no couple behaviour.' };
    if (gap === 2) return { moment: 'a slightly too-honest line ("…because it\'s you, that\'s why"), worrying about {{user}} out loud, a small gift that shows they paid attention, or staying close a little longer than needed', limit: 'It may sound like more than friendship, but they do NOT confess, kiss or act as a couple — they can deflect, joke it off or get flustered.' };
    return { moment: 'an almost-confession that they stop halfway, a protective moment, a gift that clearly means something, or a brief touch they don\'t explain', limit: 'They are NOT lovers yet: no confession is made or accepted, no kiss, no possessive or controlling behaviour.' };
}
// ───── 로맨스 보정 주입 (v2.6 · 따로 주입 · 깊이 따로) ─────
function romanceBlock(r) {
    const set = settings(), s = r.state, d = s.data, meta = getMeta();
    const L = [];
    let tester = null;
    const inScene = (n) => (tester ??= sceneTester(set, s))(n); // 필요할 때 한 번만 만든다
    if (modOn('rel', meta) && d.rel && (set.romFacts || set.romDrive)) {
        const rl = d.rel, st = rl.stages?.length ? rl.stages : DEFAULT_STAGES, top = st.length - 1;
        for (const x of rl.user.filter(y => inScene(y.name)).slice(0, 8)) {
            const k = clamp(x.stage ?? 0, 0, top), g = st[k], nx = st[k + 1];
            // v2.7.21: 「보일 것」으로 끈 것은 빈칸을 채우는 문장(「…infer from the character」 같은)도 안 보낸다 — 예전엔 내용만 빠지고 더 긴 문장이 들어가 토큰이 그대로였음
            if (set.romFacts && stagesOn()) {
                const noUnlock = aiOff('rel', 'relShowUnlock');
                const allowed = g.unlock || ''; // 지금 단계의 모습만 (세계관마다 단계 설명이 「그 단계 전체 모습」이라, 앞 단계의 「차갑고 적대적」이 섞이면 안 됨)
                L.push(P('inj.rom.facts', {
                    who: x.name, stage: g.name,
                    reached: (() => {
                        const L = loveIndex(st);
                        if (set.romBond && x.bond) return 'They ARE lovers: a confession was made and accepted (confirmed by the user).';
                        if (L >= 0 && k >= L) return `They have reached 「${st[L].name}」.`;
                        if (set.romBond) return `They are NOT lovers${L >= 0 ? ` (「${st[L].name}」 not reached)` : ''} — no confession has been made and accepted.`;
                        return '';
                    })(),
                    allowed: noUnlock ? '' : allowed || 'only what people at this distance would do',
                    next: nx ? `「${nx.name}」${nx.unlock && !noUnlock ? ` (${nx.unlock})` : ''}` : 'nothing — they are at the top',
                }).replace(noUnlock ? /\s*What this stage looks like for [^:]*:\s*\./ : /$^/, ''));
            }
            if (set.romDrive && !aiOff('rel', 'relShowWants')) {
                const det = [x.likes && `drawn to: ${short(x.likes, 80)}`, x.dislikes && `put off by: ${short(x.dislikes, 80)}`, x.concern && `currently preoccupied with: ${short(x.concern, 100)}`].filter(Boolean).join('; ');
                L.push(P('inj.rom.drive', { who: x.name, details: det || 'not recorded yet — infer from the character and keep it consistent' }));
            }
        }
    }
    const nFacts = L.length; // 위까지가 관계 사실 · 욕구 (머리말은 이게 있을 때만)
    // v2.7.16: 미트볼은 상태창 — 수치 · 단계와 상관없는 연출 주입(의도 먼저 · 먼저 움직이기 · 내 주입문 · 사건 한 스푼)은 뺐어요
    if (set.romSpark) {
        const ck = `${ctx().getCurrentChatId?.() ?? MODULE}`, turn = s.turn ?? 0;
        // 턴마다 정말 p% 주사위 · 걸리면 그 뒤 cool턴은 쉼 (앞 40턴을 처음부터 다시 굴려 봐서 정함 → 스와이프 · 다시 계산해도 같음)
        // (v2.7.14: 예전엔 6~8턴 묶음에 한 번이라 100%여도 실제로는 12~17%였음)
        // v2.7.18: 예전엔 다시 굴려 보는 시작점이 50턴마다 바뀌어서, 49~50턴 근처에서 「쉬는 턴」이 깨지고 연달아 걸릴 수 있었음
        //          → 늘 0턴부터 굴린 결과를 채팅별로 기억해 두고 이어서 굴린다 (같은 턴은 언제 계산해도 같은 답)
        const hit = (tag, pct, cool) => sparkHit(`${ck}:${tag}`, clamp(num(pct, 12), 0, 100), cool, turn);
        if (set.romSpark && modOn('rel', meta) && d.rel && hit('spark', set.romSparkPct, 3)) {
            const rl = d.rel, st = rl.stages?.length ? rl.stages : DEFAULT_STAGES, top = st.length - 1, Lv = loveIndex(st);
            const cand = rl.user.filter(y => inScene(y.name) && !y.out && ((y.aff ?? 0) >= 5 || (y.trust ?? 0) >= 20));
            if (cand.length) {
                const rng = seeded(`${ck}:sparkwho:${turn}`);
                const w = cand.map(y => Math.max(1, (y.aff ?? 0) + 10)), tot = w.reduce((a, b) => a + b, 0);
                let pick = rng() * tot, x = cand[0];
                for (let i = 0; i < cand.length; i++) { pick -= w[i]; if (pick <= 0) { x = cand[i]; break; } }
                const k = clamp(x.stage ?? 0, 0, top), lovers = (set.romBond ? !!x.bond : true) && Lv >= 0 && k >= Lv;
                const { moment, limit } = sparkFor(x, k, Lv, lovers);
                L.push(P('inj.rom.spark', { who: x.name, stage: st[k]?.name ?? '', moment, limit }));
            }
        }
    }
    const hasFacts = nFacts > 0;
    const out = L.length ? [...(hasFacts ? [P('inj.rom.header')] : []), ...L] : []; // 장면에 사람이 없으면 「아래가 사실」 머리말은 빼기
    return out.join('\n');
}
function buildInjection1(r, opt = {}) {
    const inj = buildInjection0(r, opt);
    if (!inj.main && !inj.people) return inj;
    const p = playOf();
    if (p.mode === 'rp' && !p.cardIsWorld) return inj;
    const world = p.cardIsWorld ? ' "{{char}}" is the name of this world/bot, not a person.' : '';
    const line = p.mode === 'director' ? P(p.ensemble ? 'inj.play.ensemble' : heroIsUser(p) ? 'inj.play.director.self' : 'inj.play.director', { hero: p.hero || 'the main character' }) + world : p.mode === 'multi' ? P('inj.play.multi', { world }) : world.trim();
    const lines = swapUser(inj.main).split('\n');
    lines.splice(1, 0, line);
    return { main: lines.join('\n'), people: swapUser(inj.people) };
}
// 모든 주입 방식(전체 · 간결 · 초압축 · 변화 위주)에 「이제 없는 물건」 한 줄 (v2.7.3)
// 👁 끈 항목을 뺀 사본 (v2.7.21) — 주입 세 꼴 · 인물 · 로맨스가 모두 이 사본을 읽어서 한 곳에서 빠진다. 원래 상태는 그대로.
function withoutParts(r) {
    const d0 = r?.state?.data; if (!d0) return r;
    const off = (tab, key) => aiOff(tab, key);
    const any = Object.entries(AI_PARTS).some(([tab, keys]) => keys.some(k => off(tab, k)));
    if (!any) return r;
    const data = { ...d0 }, cp = (id) => (data[id] && data[id] === d0[id] ? (data[id] = clone(d0[id])) : data[id]);
    let core = r.state.core;
    if (off('home', 'hero') && core?.summary) core = { ...core, summary: '' };
    if (d0.profile && (off('profile', 'summary') || off('profile', 'where') || off('profile', 'fields'))) {
        for (const p of cp('profile').list) { if (off('profile', 'summary')) p.summary = ''; if (off('profile', 'where')) { p.home = ''; p.sched = ''; } if (off('profile', 'fields')) p.fields = []; }
    }
    if (d0.quest && ['meta', 'desc', 'steps', 'reward'].some(k => off('quest', k))) {
        for (const q of cp('quest').list) { if (off('quest', 'meta')) { q.giver = ''; q.deadline = ''; q.place = ''; delete q.due; } if (off('quest', 'desc')) q.desc = ''; if (off('quest', 'steps')) q.steps = []; if (off('quest', 'reward')) { q.reward = ''; q.items = []; q.cash = 0; } }
    }
    if (d0.map && off('map', 'place')) for (const p of cp('map').places) p.desc = '';
    if (d0.profile && off('map', 'ppl')) for (const p of cp('profile').list) p.sched = ''; // 「지금 여기 있는 사람」은 일과에서 나옴
    if (d0.contact && off('contact', 'sum')) cp('contact').summaries = {};
    if (d0.gossip && off('gossip', 'foot')) for (const x of cp('gossip').issues) x.about = [];
    if (d0.sns && ['pic', 'tags', 'replies'].some(k => off('sns', k))) for (const p of cp('sns').posts) { if (off('sns', 'pic')) p.pic = ''; if (off('sns', 'tags')) p.tags = ''; if (off('sns', 'replies')) p.replies = []; }
    if (d0.rel && AI_PARTS.rel.some(k => off('rel', k))) {
        const rl = cp('rel');
        if (off('rel', 'relShowUnlock')) rl.stages = (rl.stages ?? []).map(x => ({ ...x, unlock: '' }));
        if (off('rel', 'relShowMemo')) for (const x of rl.user) x.memo = '';
        if (off('rel', 'relShowWants')) for (const x of rl.user) { x.likes = ''; x.dislikes = ''; x.concern = ''; }
        if (off('rel', 'relShowLife')) rl.life = [];
        if (off('rel', 'relShowPairs')) rl.pairs = [];
    }
    return { ...r, state: { ...r.state, core, data } };
}
function withGone(inj, r) {
    const g = [goneLine(r?.state), outLine(r?.state)].filter(Boolean).join('\n');
    if (!g || !inj.main) return inj;
    const lines = inj.main.split('\n');
    lines.splice(Math.min(2, lines.length), 0, swapUser(g));
    return { ...inj, main: lines.join('\n') };
}
function buildInjection0(r, opt = {}) {
    if (!r) return { main: '', people: '' };
    const plan = opt.full ? null : deltaPlan(r);
    if (plan) return buildDelta(r, plan, opt);
    if (settings().injectMode === 'ultra') return buildUltra(r, opt);
    const s = r.state, d = s.data, meta = getMeta(), set = settings(), lite = set.injectMode === 'lite';
    const inScene = sceneTester(set, s);
    const due = dueTester(set, s);
    const on = (id) => modOn(id, meta) && d[id] && (!FREQ_MODS.includes(id) || due(id));
    const L = [];
    const PP = [];
    L.push(P('inj.header'));
    L.push(P(`diff.${diffOf(meta)}`));
    if ((s.core.title || s.core.summary) && !isHidden('core', meta)) {
        L.push(`World: ${s.core.title}${s.core.genre ? ` (${s.core.genre})` : ''}${s.core.canon ? ` · canon: ${s.core.canon}` : ''}${s.core.tone ? ` · tone: ${s.core.tone}` : ''}`);
        if (s.core.summary && !lite && set.injWorld) L.push(`Setting: ${short(s.core.summary, 600)}`); // 기본 끔 — 카드·로어북과 중복
        if (s.core.userRole) L.push(`{{user}}: ${s.core.userRole}`);
        if (s.core.rules && set.injWorld) L.push(`World rules: ${short(s.core.rules, lite ? 200 : 500)}`);
    }
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d);
        const soon = [];
        const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(viewTr() ? `${e.title} (in ${k}d)` : `${e.title}(${k}일 후)`); }
        L.push(`Date: ${dateI(c)} · ${c.time}${c.weather ? ` · weather: ${c.weather} (${seasonI(c)})` : ''}${ev.length ? ` · TODAY: ${ev.map(e => e.title + (e.desc ? ` — ${e.desc}` : '')).join('; ')}` : ''}${soon.length ? ` · coming: ${soon.slice(0, 4).join(', ')}` : ''}`);
    }
    if (on('map')) {
        const m = d.map, p = findBy(m.places, m.here);
        const ppl = modOn('profile', meta) ? peopleAt(s, m.here).now : [];
        if (m.here) L.push(`Location: ${m.here}${m.spot && p?.floors?.length ? ` (inside: ${m.spot})` : ''}${p?.floors?.length ? ` [inside it: ${p.floors.map(f => String(f).split(/[:：]/)[0].trim()).filter(Boolean).join(', ')} — when {{user}} moves within it write "loc: ${m.here} > floor/room"]` : ''}${p?.desc ? ` — ${short(p.desc, 120)}` : ''}${p?.links?.length ? ` · nearby: ${p.links.join(', ')}` : ''}${ppl.length ? ` · usually here now: ${ppl.join(', ')}` : ''}`);
    }
    if (on('stats')) {
        const st = d.stats;
        if (st.bars.length) L.push(`{{user}} gauges: ${st.bars.map(b => `${b.name} ${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' · ')}`);
        { const auto = st.bars.filter(b => b.decay).map(b => b.name); if (auto.length) L.push(`Needs that change on their own as story time passes (already calculated — do NOT write stat lines just because time passed; write them only for events such as eating, drinking, resting, washing, getting hurt): ${auto.join(', ')}`); }
        if (st.attrs.length) L.push(`{{user}} attributes: ${st.attrs.map(a => `${a.name} ${a.val >= 0 ? '+' : ''}${a.val}`).join(' · ')}`);
        if (st.conds.length) L.push(`Conditions: ${st.conds.map(c => c.name + (c.desc && !lite ? ` (${short(c.desc, 50)})` : '')).join(', ')}`);
    }
    if (on('wallet')) {
        const w = d.wallet;
        L.push(`Money: ${fmtNum(w.cash)} ${w.currency}${w.items.length ? ` · Items: ${w.items.slice(0, 20).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(', ')}` : ''}`);
        const dt = debtText(s, false); if (dt) L.push(dt);
        if (w.prices.length && !lite) L.push(`Typical prices: ${w.prices.slice(0, 8).map(p => `${p.name} ${fmtNum(p.price)}`).join(', ')} (${w.currency})`);
    }
    if (on('fate')) L.push(...fateText(s, false));
    if (on('home') && !lite) {
        const hm = d.home;
        if (hm.name) L.push(`Home: ${hm.name} — ${hm.rooms.map(r => `${r.name}${r.decor.length ? `[${r.decor.slice(0, 6).join(', ')}]` : ''}`).join(' / ')}`);
    }
    if (on('shop') && !lite) {
        const m = d.map;
        const here = d.shop.shops.filter(sh => !sh.place || !m || norm(sh.place) === norm(m.here) || norm(m.here).includes(norm(sh.place)));
        if (here.length) L.push(`Shops here: ${here.map(sh => `${sh.name}(${sh.items.slice(0, 6).map(i => `${i.name} ${fmtNum(i.price)}`).join(', ')})`).join(' · ')}`);
    }
    if (on('quest')) {
        const act = d.quest.list.filter(q => q.status === 'active');
        const open = d.quest.list.filter(q => q.status === 'open');
        if (act.length) L.push(`Active quests: ${act.slice(0, 5).map(q => `${q.title}${q.giver ? ` (from ${q.giver})` : ''}${q.deadline ? ` · due ${q.deadline}${Number.isFinite(q.due) && today(s) !== null ? ` (${q.due - today(s) <= 0 ? 'TODAY is the last day' : `${q.due - today(s)} day(s) left`})` : ''}` : ''}${!lite && q.steps.length ? ` · next: ${q.steps.find(x => !x.done)?.text ?? 'report back'}` : ''}`).join(' / ')}`);
        if (open.length && !lite) L.push(`Requests available (not accepted yet): ${open.slice(0, 4).map(q => q.title).join(', ')}`);
    }
    if (on('news') && d.news.items.length && !lite) L.push(`Recent news (${d.news.name || 'news'}): ${d.news.items.slice(-3).map(x => x.title).join(' / ')}`);
    if (on('gossip') && d.gossip.issues.length && !lite) L.push(`Rumors going around: ${d.gossip.issues.slice(-2).map(x => `${x.title}${x.about.length ? ` (about ${x.about.join(', ')})` : ''}`).join(' / ')}`);
    if (on('rel')) {
        const rl = d.rel;
        const ens = playOf(meta).ensemble, PA = set.pairAff === true; // 군상극: 「→ 유저」 줄은 빼고 인물끼리만 · PA: 인물끼리 호감 수치
        const here = ens ? [] : rl.user.filter(x => inScene(x.name)), away = ens ? [] : rl.user.filter(x => !inScene(x.name));
        const AX = relAxes(rl, viewTr()), W = viewTr() ? { aff: AX.aff, trust: AX.trust, stage: 'stage', jealous: 'jealousy' } : { aff: AX.aff, trust: AX.trust, stage: '단계', jealous: '질투' }; // 화면만 번역: 고정 낱말도 영어로
        for (const x of here.slice(0, 12)) { const g = stageOf(rl, x); PP.push(`${x.name}${x.label ? ` [${x.label}]` : ''} → {{user}}: ${W.aff} ${x.aff} · ${W.trust} ${x.trust} ${stagesOn() ? ` · ${W.stage} 「${g.name}」` : ''}${set.romBond && x.bond ? ' · 💞 lovers (confirmed)' : ''}${x.noLove ? ' · PLATONIC ONLY — no romantic feelings toward {{user}}; never raise aff' : ''}${!stagesOn() ? '' : g.unlock && !lite ? ` (unlocked: ${short(g.unlock, 60)}${set.stageLock && !set.romFacts ? " — don't act beyond this stage yet" : ''})` : set.stageLock && !set.romFacts ? ' (stay within this stage)' : ''}${x.jealous >= 30 ? ` · ${W.jealous} ${x.jealous}/100 (show it subtly when they meet)` : ''}${x.memo && !lite ? ` — ${short(x.memo, 90)}` : ''}`); }
        if (away.length) PP.push(`Not in this scene (${W.aff}/${W.trust}): ${away.slice(0, 15).map(x => `${x.name} ${x.aff}/${x.trust}`).join(', ')}`);
        const pairs = rl.pairs.filter(p => inScene(p.a) || inScene(p.b));
        if (pairs.length && (!lite || ens || PA)) PP.push(`${ens ? 'Between the characters' : 'Between others'}: ${pairs.slice(0, ens ? 20 : 10).map(p => `${p.a}↔${p.b}${p.label ? ` ${p.label}` : ''}${PA && Number.isFinite(p.aff) ? ` (${W.aff} ${p.aff}${stagesOn() ? ` · 「${pairStage(rl, p).name}」` : ''})` : ''}`).join(' · ')}`);
        const life = rl.life.filter(x => inScene(x.who)).slice(-2);
        if (life.length && !lite) PP.push(`Off-screen lately: ${life.map(x => `${x.who} — ${short(x.text, 70)}`).join(' / ')}`);
        // <meatball>에 쓰라는 줄이라 태그 방식일 때만 (사칭·별도 분석·끔에선 빼기)
        if (s.newDay && set.offscreen && !opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus') && lastDayChanged(r)) L.push(P('inj.life'));
    }
    if (on('custom')) L.push(...customLines(s, false));
    if (on('sns') && d.sns.posts.length && !lite) L.push(`Recent posts on ${d.sns.name || 'SNS'}: ${d.sns.posts.slice(-3).map(p => `${p.author}: ${short(p.text || `${viewTr() ? '[photo]' : '[사진]'} ${p.pic}`, 50)}`).join(' / ')}`);
    if (on('music') && d.music.now && !lite) L.push(`Current BGM: ${d.music.now.title}${d.music.now.artist ? ` - ${d.music.now.artist}` : ''} (change it with bgm only when the mood shifts)`);
    if (on('profile')) {
        const pf = d.profile;
        const list = (pf.mode === 'detailed' ? pf.list : pf.list.filter(p => p.role === 'npc')).filter(p => p.role === 'user' || inScene(p.name));
        for (const p of list.slice(0, pf.mode === 'detailed' ? 12 : 8)) {
            const f = pf.mode === 'detailed' && !lite ? ` | ${p.fields.slice(0, 10).map(x => `${x.k}: ${short(x.v, 80)}`).join(' / ')}` : '';
            PP.push(`Profile ${p.name}${p.role === 'user' ? ' ({{user}})' : ''}: ${short(p.summary, 160)}${f}`);
        }
    }
    if (on('ach')) {
        const a = d.ach.list, done = a.filter(x => x.done);
        if (a.length) L.push(`Achievements ${done.length}/${a.length}${done.length ? ` · recent: ${done.slice(-3).map(x => x.name).join(', ')}` : ''}`);
    }
    if (on('memo')) {
        const ms = d.memo.list.filter(m => m.inject);
        const pick = [...ms.filter(m => m.pin).slice(-clamp(parseInt(set.pinCap, 10) || 8, 0, 30)), ...ms.filter(m => !m.pin).slice(-6)];
        if (pick.length) L.push(`Notes: ${pick.map(m => `${m.by === 'user' ? '(user) ' : ''}${short(m.text, 120)}`).join(' / ')}`);
    }
    if (on('contact')) {
        const ct = d.contact;
        if (letterMode(ct)) L.push(P('inj.letter', { app: ct.app }));
        else if (instantLetter(ct)) L.push(P('inj.letter.simple', { app: ct.app })); // v2.7.18: 간단 모드여도 세계 규칙은 남김 (예전엔 같이 빠져서 멀리 있는 인물이 즉시 대답했음)
        const tr = inTransit(s, meta).filter(x => x.m.from === 'me');
        if (tr.length) L.push(`Letters on the way (NOT yet received — the recipients don't know their contents yet): ${tr.map(x => `to ${x.who} (${waitText(x.left, s, meta)} left)`).join(', ')}`);
        for (const x of contactPicks(s, meta, set, inScene)) {
            PP.push(`${ct.app} with ${x.who}${x.summary ? ` — so far: ${x.summary}` : ''}${x.msgs.length ? ` (latest): ${x.msgs.map(m => `${m.from === 'me' ? '{{user}}' : x.who}: ${msgText(m, 70)}`).join(' / ')}` : ''}`);
        }
    }
    if (on('dice')) {
        const dc = d.dice;
        if (dc.rules && !lite) L.push(`Dice rules: ${short(dc.rules, 300)}`);
        L.push(P('inj.dice'));
    }
    if (s.recent.length) L.push(`Since the last reply {{user}} did (via the status UI): ${recentI(s, 8)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        L.push(outRule(P('inj.output')));
        L.push(lite ? `Keys (key: value, ±N for numbers, +/-name for lists, name | detail): ${keysI(tagKeysFor(meta)).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ')}${modOnRaw('rel', meta) && s.data.rel ? relKeyShort(s.data.rel) : ''}` : `Keys: ${keysI(tagKeysFor(meta)).join(' · ')}`);
        if (!lite) L.push(viewTr() ? P('inj.example.en') : P('inj.example'));
    }
    return { main: L.filter(Boolean).join('\n'), people: PP.length ? `[STATUS SIM — PEOPLE (part of the state above)]\n${PP.join('\n')}\n${P('inj.people.absent')}` : '' };
}

export function setInjection(inj) {
    const c = ctx();
    const depth = clamp(parseInt(settings().injectDepth, 10) || 0, 0, 20);
    // 월드인포 스캔: 켜면 주입문 속 장소·인물 이름으로 로어북 항목이 켜진다 (편하지만 장면 밖 항목까지 켜져 토큰이 늘 수 있음)
    c.setExtensionPrompt(INJECT_KEY, inj?.main ?? '', PROMPT_IN_CHAT, depth, settings().injScan !== false, ROLE_SYSTEM);
    c.setExtensionPrompt(INJECT_KEY2, inj?.people ?? '', PROMPT_IN_CHAT, depth, false, ROLE_SYSTEM);
    const rd = clamp(parseInt(settings().romDepth, 10) || 0, 0, 20);
    c.setExtensionPrompt(INJECT_KEY3, inj?.romance ?? '', PROMPT_IN_CHAT, rd, false, ROLE_SYSTEM);
    // 🧭 이야기 장치 (v2.8): 켠 장치가 하나도 없으면 빈 글 → 아무 영향 없음
    let lab = ''; try { lab = inj ? (app.storyInject?.() ?? '') : ''; } catch (e) { ssNote('story inject', e); }
    try { const more = inj ? (app.extraInject?.() ?? '') : ''; if (more) lab = lab ? `${lab}\n\n${more}` : more; } catch (e) { ssNote('extra inject', e); } // 🧩 덧붙이는 기능 (addons.js · 켠 것이 없으면 빈 글)
    c.setExtensionPrompt(INJECT_KEY4, lab, PROMPT_IN_CHAT, depth, false, ROLE_SYSTEM);
}

// ───── 생성 재료 ─────
export function chatCharacters() {
    const c = ctx();
    if (c.groupId) {
        const g = c.groups?.find(x => x.id == c.groupId);
        return (g?.members ?? []).map(av => c.characters?.find(ch => ch.avatar === av)).filter(Boolean);
    }
    const ch = c.characters?.[c.characterId];
    return ch ? [ch] : [];
}
export async function loreNames() {
    const c = ctx();
    const names = new Set();
    for (const ch of chatCharacters()) { const w = ch?.data?.extensions?.world; if (w) names.add(w); }
    const cw = c.chatMetadata?.world_info; if (cw) names.add(cw);
    try {
        const wi = await import('/scripts/world-info.js');
        for (const n of wi.selected_world_info ?? []) names.add(n);
        for (const ch of chatCharacters()) {
            const fname = String(ch.avatar ?? '').replace(/\.[^.]+$/, '');
            for (const n of (wi.world_info?.charLore ?? []).find(x => x.name === fname)?.extraBooks ?? []) names.add(n);
        }
    } catch { /* optional */ }
    return [...names];
}
// 📚 생성 때 읽을 로어북 고르기 (이 채팅 · 메타 lorePick = { off: [뺀 것], add: [연결 안 된 것 중 더한 것] }) — 고른 적이 없으면 연결된 로어북 전부 (예전과 같음)
export async function loreChoice() {
    const linked = await loreNames(), p = getMeta()?.lorePick, off = new Set(Array.isArray(p?.off) ? p.off : []), add = (Array.isArray(p?.add) ? p.add : []).filter(n => !linked.includes(n));
    let all = []; try { all = [...((await import('/scripts/world-info.js')).world_names ?? [])]; } catch { /* 옛 실리 · 시험대: 목록 없이 */ }
    const others = [...new Set([...add, ...all])].filter(n => n && !linked.includes(n));
    return { linked, others, on: [...linked, ...add].filter(n => !off.has(n)) };
}
export const lorePicked = async () => (getMeta()?.lorePick ? (await loreChoice()).on : loreNames());
export function setLorePick(linked, on) {
    const off = linked.filter(n => !on.includes(n)), add = on.filter(n => !linked.includes(n)), cur = getMeta()?.lorePick;
    if (!off.length && !add.length) { if (cur) { delete getMeta().lorePick; saveMeta(); } return; }
    const meta = getMeta(true); if (!meta) return;
    meta.lorePick = { off, add }; saveMeta();
}
export async function loreText(limit) {
    const c = ctx();
    if (!c.loadWorldInfo || limit <= 0) return '';
    const items = [];
    for (const name of await lorePicked()) {
        try {
            const book = await c.loadWorldInfo(name);
            const entries = Object.values(book?.entries ?? {}).filter(e => !e.disable).sort((a, b) => (b.constant ? 1 : 0) - (a.constant ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0));
            for (const e of entries) {
                const head = String(e.comment || (Array.isArray(e.key) ? e.key.slice(0, 3).join(', ') : '')).trim();
                const body = String(e.content ?? '').replace(/\s+/g, ' ').trim();
                if (head || body) items.push({ head, body });
            }
        } catch (e) { ssWarn(LOG, 'lore', name, e); }
    }
    if (!items.length) return '';
    // 넘치면 뒤 항목을 통째로 버리지 않고, 모든 항목을 조금씩 줄인다 (뒤쪽 캐릭터가 사라지던 문제)
    const total = items.reduce((n, x) => n + x.head.length + x.body.length + 4, 0);
    let budget = Infinity;
    if (total > limit) {
        const sorted = items.map(x => x.body.length).sort((a, b) => a - b);
        let lo = 0, hi = sorted.at(-1) ?? 0; // 항목당 상한을 이분 탐색으로 맞춘다
        const fits = (cap) => items.reduce((n, x) => n + x.head.length + Math.min(x.body.length, cap) + 5, 0) <= limit;
        while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (fits(mid)) lo = mid; else hi = mid - 1; }
        budget = Math.max(120, lo);
    }
    let out = '';
    for (const x of items) {
        const piece = `• ${x.head}: ${x.body.length > budget ? `${x.body.slice(0, budget)}…` : x.body}\n`;
        if (out.length + piece.length > limit * 1.15) break;
        out += piece;
    }
    // 항목 이름 목록은 늘 전부 (내용이 잘려도 「이런 인물·장소가 있다」는 알게)
    const index = [...new Set(items.map(x => x.head).filter(Boolean))];
    const shown = out.split('\n').length - 1;
    return `${out}${shown < items.length ? `…(${items.length - shown}개 항목은 내용 생략)\n` : ''}[LOREBOOK INDEX — every entry title, ${index.length}] ${short(index.join(' · '), 4000)}`;
}
// 📖 채팅 읽기 (설정 genRead · 만들기/다시 생성의 재료에만 — 다른 AI 호출은 늘 short)
//   short = 최근 n개 · 앞 700자씩 (예전 그대로) · last = 마지막 메시지만 전체 · recent = 최근 n개를 길게(마지막은 전체) · all = 처음부터 끝까지
//   all은 최근 것부터 전체로 담다가 genReadCap 글자를 넘으면 오래된 것은 앞 300자만, 그것도 한도의 1.5배를 넘으면 그 앞은 뺀다
export const READ_MODES = { short: '최근 채팅 (앞 700자씩)', last: '+ 마지막 답 전체', recent: '최근 채팅 길게', all: '채팅 전체' };
const READ_FULL = 12000, READ_LONG = 2500, READ_HEAD = 300;
export function recentChat(n, mode = 'short') {
    const list = (ctx().chat ?? []).filter(m => !m.is_system);
    const line = (m, max) => `${m.name}: ${short(stripStatus(m.mes), max)}`;
    if (mode === 'all') {
        const cap = Math.max(4000, Number(settings().genReadCap) || 120000), out = [];
        let used = 0;
        for (let i = list.length - 1; i >= 0; i--) {
            const full = line(list[i], READ_FULL), t = used + full.length <= cap ? full : line(list[i], READ_HEAD);
            if (used + t.length > cap * 1.5) { out.push(`(… ${i + 1} earlier message${i ? 's' : ''} left out)`); break; }
            out.push(t); used += t.length;
        }
        return out.reverse().join('\n');
    }
    const pick = list.slice(-n);
    if (mode !== 'last' && mode !== 'recent') return pick.map(m => line(m, 700)).join('\n');
    return pick.map((m, i) => line(m, i === pick.length - 1 ? READ_FULL : mode === 'recent' ? READ_LONG : 700)).join('\n');
}
// 📎 하던 채팅에 붙이기: 이미 긴 채팅에서 상태창을 만들 때 — 최근 N개만으로는 앞에서 쌓인 돈 · 관계 · 물건을 모른다.
//   요약 확장의 요약(가장 최근 것) · 작가 노트 · 앞쪽 이야기를 띄엄띄엄 훑은 줄을 같이 준다. AI 호출 수는 그대로고 보내는 글만 늘어난다.
//   지난 답을 하나하나 다시 계산하지는 않는다 — setBase가 「지금」을 출발점(startAt)으로 잡고 그 뒤의 답부터 기록한다.
export const LONG_CHAT = 30; // 이만큼 쌓인 채팅이면 만들기 창이 「하던 이야기에 붙여요」를 보여 준다
export function storySoFar(maxLines = 24) {
    const c = ctx(), chat = (c.chat ?? []).filter(m => m && !m.is_system), out = { summary: '', note: '', sample: '', lines: 0 };
    try { for (let i = chat.length - 1; i >= 0; i--) { const mem = chat[i]?.extra?.memory; if (typeof mem === 'string' && mem.trim()) { out.summary = short(mem.trim(), 4000); break; } } } catch (e) { ssNote('요약 읽기', e); }
    try { const n = c.chatMetadata?.note_prompt; if (typeof n === 'string' && n.trim()) out.note = short(n.trim(), 1500); } catch (e) { ssNote('작가 노트 읽기', e); }
    try {
        const older = chat.slice(0, Math.max(0, chat.length - (Number(settings().recentForGen) || 0)));
        if (older.length) {
            const step = Math.max(1, Math.ceil(older.length / maxLines)), lines = [];
            for (let i = 0; i < older.length; i += step) { const t = short(String(stripStatus(older[i].mes ?? '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 220); if (t) lines.push(`#${i + 1} ${older[i].name}: ${t}`); }
            out.sample = lines.join('\n'); out.lines = lines.length;
        }
    } catch (e) { ssNote('앞 이야기 훑기', e); }
    return out;
}
// 📝 이 채팅의 작가 노트 (실리태번 Author's Note) — 없으면 ''
export const authorNote = () => String(ctx().chatMetadata?.note_prompt ?? '').trim();
export async function gatherSources(opt = {}) {
    const c = ctx(), set = settings();
    const parts = [];
    const persona = c.powerUserSettings?.persona_description ?? '';
    parts.push(`[THE REAL USER — plays the protagonist in roleplay, or only directs the story (see PLAY STYLE)] name: ${c.name1}${opt.persona !== false && persona ? `\npersona: ${short(persona, 2500)}` : ''}`);
    if (opt.card !== false) {
        for (const ch of chatCharacters()) {
            const f = [ch.description, ch.personality && `Personality: ${ch.personality}`, ch.scenario && `Scenario: ${ch.scenario}`].filter(Boolean).join('\n');
            if (f) parts.push(`[CHARACTER CARD: ${ch.name}]\n${short(f, 5000)}`);
        }
    }
    if (opt.lore !== false) { const lt = await loreText(set.loreChars); if (lt) parts.push(`[LOREBOOK]\n${lt}`); }
    const useNote = opt.note ?? set.genNote === true; // 📝 작가 노트를 재료로 (설정 genNote · 만들기 창에서 고름)
    if (useNote) { const an = authorNote(); if (an) parts.push(`[AUTHOR'S NOTE — the user's own standing note for this chat. Treat facts in it about the user's character, other people and the world as canon; ignore any directions about prose style or reply format]\n${short(an, 4000)}`); }
    const readMode = READ_MODES[set.genRead] ? set.genRead : 'short'; // 📖 채팅 읽는 방식
    if (opt.chat !== false && opt.long === true) { // 📎 하던 채팅에 붙이기 (만들기 창에서만 켠다)
        const sf = storySoFar();
        if (sf.summary) parts.push(`[STORY SUMMARY SO FAR]\n${sf.summary}`);
        if (sf.note && !useNote) parts.push(`[AUTHOR'S NOTE]\n${sf.note}`); // 위에서 이미 넣었으면 두 번 안 넣는다
        if (sf.sample && readMode !== 'all') parts.push(`[EARLIER STORY — sampled lines, oldest first]\n${sf.sample}`); // 채팅 전체를 읽으면 훑은 줄은 겹친다
    }
    if (opt.chat !== false) { const rc = recentChat(set.recentForGen, readMode); if (rc) parts.push(`${readMode === 'all' ? '[CHAT SO FAR — oldest first]' : '[RECENT CHAT]'}\n${rc}`); }
    if (opt.chat !== false && opt.long === true) parts.push('[ONGOING STORY] This status window is being attached to a story that is already in progress. Fill every value as it stands NOW, at the latest message — current date and time, location, money, belongings, gauges, relationship levels, people already met, quests already taken — not as it was when the story began. When sources disagree, trust the most recent one.');
    return parts.join('\n\n');
}
export { CONTACT_MODES };

// ───── 기준 상태 세우기 (새 상태창의 출발점) ─────
export async function setBase(base, mods, difficulty, play) {
    const meta = getMeta(true);
    const chat = ctx().chat ?? [];
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? normalize(id, base.data[id]) : null;
    meta.base = { core: NORM.core(base?.core ?? {}), data };
    meta.baseTurn = 0;
    meta.startAt = chat.length;
    meta.startKey = chat.at(-1)?.send_date ?? null;
    meta.qAsk = 0; // v2.9: 새로 만든 상태창은 처음부터 「퀘스트 완료 확인」을 쓴다
    meta.adjust = [];
    delete meta.wipe; // 🧹 칸 전체 삭제 표시도 새로 만들면 비움
    meta.off = false;
    meta.v = DATA_V;
    meta.origin = clone(meta.base); // 처음 만든 상태 (카드에 붙이기 · 2회차용)
    meta.chatId = ctx().getCurrentChatId?.() ?? null;
    delete meta.newV5;
    if (mods) meta.mods = { ...meta.mods, ...mods };
    if (difficulty && DIFFS[difficulty]) meta.difficulty = difficulty;
    if (play) meta.play = normPlay(play);
    app.playTemp = null;
    await saveMeta(true);
    app.refreshNow();
}
export async function startBlank() { await setBase({ core: EMPTY.core(), data: {} }); toastr.info('빈 상태창을 만들었어요. 각 칸에서 AI로 채우거나 직접 채우세요.', TITLE); }
