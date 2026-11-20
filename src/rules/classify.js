// 🧭 B 모드: 가벼운 모델(분류 모델)이 답을 읽고, 미트볼이 준 목록 안에서만 일어난 사건을 고른다.
//   본편은 소설만 쓰고, 숫자는 지금처럼 설정집 규칙으로 계산한다.
//   결과는 그 메시지 · 그 스와이프의 칸(msgData)에 src: 'cls'로 저장 → 다시 열기 · 다시 계산에는 다시 부르지 않음.
import { ctx, settings, getMeta, saveMeta, msgData, syncSwipe, bumpMeta, msgKey, app, TITLE, saveChatSoon, shut, shutKey, aiNoOf } from '../base/st.js';
import { short, hash, norm, tokens, safeKey, hhmm } from '../base/util.js';
import { readOps, kindOf, parts, stripTags, storyOnly } from './tags.js';
import { sendClean, clsRoute, connStats, routeText, CLS_PRESET } from './clsconn.js';
import { fold } from './engine.js';
import { personOf, normBook, BASIC_ACTS } from './book.js';
import { gloss } from '../base/gloss.js';
import { clsKeys } from './newskinds.js';
import { notedKey } from './calplus.js';

// ───── 모드 ─────
// B를 골라도 분류 연결이 없으면 A로 돌아간다 (설정 화면에 한 줄로 알림)
export const mode = () => (settings().mode !== 'A' && clsRoute() ? 'B' : 'A');
export const modeNote = () => (settings().mode !== 'A' && !settings().clsProfile ? '분류 모델 연결을 고르지 않아서 지금은 A(본편 태그)로 돌아요' : '');
// 실리태번 연결 프로필 목록 [{ id, name }]
export const profiles = () => (ctx().extensionSettings?.connectionManager?.profiles ?? []).map(p => ({ id: p.id, name: p.name ?? p.id }));

// ───── 고를 수 있는 목록 ─────
// 지금 파서가 읽는 키만 (쓰는 법과 함께)
const KEYS = [
    ['loc', '장소 이름', '장소를 옮겼을 때'], ['time', '+2h 또는 14:30', '시간이 흘렀을 때'], ['with', '이름, 이름', '장면에 같이 있는 사람이 바뀌었을 때'],
    ['ate', '음식', '먹었을 때'], ['slept', '7h', '잤을 때'], ['washed', '-', '씻었을 때'], ['rest', '1h', '쉬었을 때'], ['worked', '3h | +30', '일했을 때 (번 돈)'],
    ['buy', '물건 | 값', '샀을 때'], ['earn', '30 | 이유', '돈을 받았을 때'], ['got', '물건', '얻었을 때'], ['used', '물건', '썼을 때'], ['lost', '물건', '잃었을 때'],
    ['wear', '옷', '입었을 때'], ['gift', '이름 | 물건', '선물했을 때'], ['act', '이름 | 행동', '아래 목록의 행동을 그 사람에게 했을 때 (목록에 있는 행동만)'],
    ['memory', '이름 | 큰 사건', '그 사람이 오래 기억할 일'], ['jealous', '이름 | 이유', '질투했을 때'], ['pair', '이름 | 이름 | 라이벌', '두 인물 사이가 바뀌었을 때'],
    ['promise', '내용 | 3/14', '약속 · 마감이 생겼을 때'], ['weather', '비', '날씨가 바뀌었을 때'], ['status', '감기 | 3d', '아프거나 상태가 생겼을 때'],
    ['npc', '이름 | 성격 한 줄', '처음 나온 인물'], ['gone', '이름 | 사유', '이야기에서 빠진 인물'],
    ['sell', '물건 | 값', '팔았을 때'], ['unwear', '옷', '벗었을 때'], ['status', '-감기', '상태가 나았을 때 (앞에 -)'], ['promise', '-내용', '약속을 지켰거나 끝났을 때 (앞에 -)'],
    ['conflict', '내용', '답 글이 [STATE]와 분명히 부딪칠 때만 (예: 없는 돈을 씀)'],
];
const MEDDLE = [['meddle', '이름 | 소지품 | 물건 | 한마디 · 이름 | 돈 | +30 | 한마디 · 이름 | 달력 | 5/14 | 글', '인물이 몰래 내 가방에 물건을 넣거나 · 지갑에 돈을 넣거나 · 달력에 메모를 남겼을 때만 (가져간 것은 적지 않음)']];
const MIND = [['mind', '이름 | 짧은 속마음', '장면 속 인물의 속마음']];
const BGM = [['bgm', '곡 제목 - 가수 | 분위기 한 단어 | 왜 어울리는지', '장면 분위기가 바뀌었을 때만 · 실제로 있는 곡 · [NOW]의 취향 참고 · 안 바뀌었으면 쓰지 않음']];
const QUOTE = [['quote', '구절 원문 | 출처(작품 · 사람 · 나라) | 한국어 뜻(외국어일 때만) | 왜 어울리는지', '장면 분위기가 바뀌었을 때만 · 속담 · 영화/드라마 명대사 · 책/시 한 줄 · 유명인의 말 · 사자성어 · 노래 가사는 안 됨 · 한두 문장 · [NOW]의 최근 구절은 피함']];
// aiNo: 몇 번째 AI 답을 고르는지 — 😌 그 답에 눈 감은 앱의 키는 뺀다
const keyList = (aiNo) => { const M = getMeta()?.mods ?? {}; return [...KEYS, ...(M.rel ? MEDDLE : []), ...(M.mind ? MIND : []), ...(M.music ? BGM : []), ...(M.quote ? QUOTE : []), ...(M.news ? clsKeys() : []), ...(M.calendar ? notedKey(fold()) : []), ...(M.custom ? customKey() : [])].filter(([k]) => aiNo == null || !shutKey(k, aiNo)); };
// 🧩 내 탭: 만든 탭이 있을 때만 · 탭과 칸 이름을 알려 줌 (숫자 칸은 지금 값으로)
export function customKey() {
    const T = (getMeta()?.custom ?? []).filter(t => t?.name && t.fields?.length); if (!T.length) return [];
    const list = T.slice(0, 4).map(t => `${t.name}(${t.fields.slice(0, 6).map(f => `${f.name}${f.max ? ` 0~${f.max}` : ''}`).join('·')})`).join(', ');
    return [['custom', '탭 | 칸 | 새 값', `내 탭의 값이 바뀌었을 때만 · 탭: ${list}`]];
}
export const ALLOW = (aiNo) => new Set(keyList(aiNo).map(([k]) => kindOf(k)));

// 답 글에 이름(또는 별칭)이 나온 설정집 인물
export function namedIn(book, text) {
    const t = String(text ?? '');
    return (book?.people ?? []).filter(p => [p.name, ...(p.aka ?? [])].some(n => String(n ?? '').length >= 2 && t.includes(n))).map(p => p.name);
}
// 인물마다 오르는 · 내리는 행동 (장면에 있는 사람 + 답 글에 이름이 나온 사람 · 아무도 없으면 가까운 둘)
export function actionsOf(book, S, text = '') {
    const live = Object.keys(S.rel).filter(n => !S.rel[n].gone);
    let who = [...new Set([...S.with, ...namedIn(book, text)])];
    if (!who.length) who = live.sort((a, b) => S.rel[b].aff + S.rel[b].trust - S.rel[a].aff - S.rel[a].trust).slice(0, 2);
    // 설정집에 없는 인물(이야기 중 새로 나와 아직 규칙이 없는 사람)도 기본 행동으로 넣는다
    const seen = new Set();
    return who.map(n => personOf(book, n) ?? (S.rel[n] ? { name: n, up: [], down: [] } : null))
        .filter(p => p && !seen.has(p.name) && seen.add(p.name))
        .map(p => ({ name: p.name, up: [...p.up.map(a => a.act), BASIC_ACTS.up.act], down: [...p.down.map(a => a.act), BASIC_ACTS.down.act] }));
}
// 이 턴 고른 선택과 결과 (미트볼 선택지: 사용자 메시지 extra.mbc 또는 통로로 받은 것)
function choiceOf(u) {
    const m = ctx().chat?.[u]; if (!m?.is_user) return null;
    return m.extra?.mbc ?? getMeta()?.choices?.[msgKey(m)] ?? null;
}
export function choiceText(c) {
    if (!c) return '';
    const L = [`{{user}} chose: 「${short(c.shown ?? c.label ?? '', 80)}」${c.kind ? ` (${c.kind}${c.risk ? ` · ${c.risk}` : ''})` : ''}`];
    const k = c.check;
    if (k) L.push(`dice d20 ${k.roll}${k.mod ? ` ${k.mod > 0 ? '+' : '−'}${Math.abs(k.mod)}` : ''} vs DC ${k.dc} → ${k.crit ? 'CRITICAL SUCCESS' : k.fumble ? 'CRITICAL FAILURE' : k.ok ? 'SUCCESS' : 'FAILURE'}`);
    if (c.risk === 'price' || c.cost) L.push(`it had a cost${c.cost ? `: ${short(c.cost, 60)}` : ''}`);
    if (c.risk === 'trap' || c.trap) L.push('a trap could trigger');
    if (c.result) L.push(short(String(c.result), 120));
    return L.join(' · ');
}
// 앞 사용자 메시지 번호
const userBefore = (i) => { const chat = ctx().chat ?? []; for (let k = i - 1; k >= 0; k--) if (chat[k].is_user) return k; return -1; };
// 답 글의 지문 (같은 글이면 저장된 결과 그대로)
export function fingerprint(i) {
    const chat = ctx().chat ?? [], m = chat[i], u = userBefore(i);
    return hash(`${stripTags(m?.mes ?? '')}|${u >= 0 ? chat[u].mes : ''}|${JSON.stringify(choiceOf(u) ?? '')}`);
}

// 지금 곡 · 지금 구절 · 음악 취향 · 최근 구절 10개 (음악 · 구절 앱을 켰을 때만)
export const tasteOf = () => (getMeta()?.musicTaste || settings().musicTaste || '').trim();
export const recentQuotes = (S) => (S.quoteLog ?? []).slice(-10).map(q => short(q.text, 40));
function nowLine(S) {
    const M = getMeta()?.mods ?? {}, L = [];
    if (M.music) L.push(`song ${S.bgm ? `${S.bgm.title}${S.bgm.artist ? ` - ${S.bgm.artist}` : ''} (${S.bgm.mood || '-'})` : '-'}${tasteOf() ? ` · taste ${tasteOf()}` : ''}`);
    if (M.quote) L.push(`quote ${S.quote ? `「${short(S.quote.text, 40)}」` : '-'}${recentQuotes(S).length ? ` · recent quotes (avoid): ${recentQuotes(S).join(' / ')}` : ''}`);
    return L.length ? `[NOW] ${L.join(' · ')}` : '';
}
// 분류 모델에 보낼 글 (짧게)
export function buildPrompt(i) {
    const r = fold(); if (!r) return null;
    const chat = ctx().chat ?? [], m = chat[i], u = userBefore(i), { book } = r;
    const S = r.stateAt?.(i - 1) ?? r.S; // 이 답 바로 앞 상태
    const story = storyOnly(m.mes);
    const items = S.items.map(it => it.name).slice(0, 20).join(', ') || '-';
    const acts = actionsOf(book, S, story).map(a => `${a.name} — up: ${a.up.join(', ') || '-'} / down: ${a.down.join(', ') || '-'}`);
    const places = book.world.places.map(p => `${p.name}${p.goods.length ? `(${p.goods.map(g => g.name).join('·')})` : ''}`).join(', ');
    const keys = keyList(aiNoOf(i)).map(([k, v, when]) => `${k}: ${v}  — ${when}`).join('\n');
    const ch = choiceText(choiceOf(u));
    const ex = String(settings().clsExtra ?? '').trim(), system = ex ? `${SYSTEM}\nExtra instruction from the user (keep the output format): ${ex.slice(0, 600)}` : SYSTEM; // ✍ ⚙️ 설정 앱
    const user = [
        `[STATE] place ${S.loc || '-'} · time ${hhmm(S.t)} · with ${S.with.join(', ') || '-'} · money ${S.cash} ${book.world.currency} · items ${items}`,
        ch && `[CHOICE] ${ch} — pick events that match this result (cost, trap, success or failure).`,
        acts.length ? `[ACTIONS]\n${acts.join('\n')}` : '[ACTIONS] (none)',
        nowLine(S),
        `[PLACES] ${places || '-'}`,
        `[KEYS]\n${keys}`,
        gloss(),
        u >= 0 ? `[USER] ${short(storyOnly(chat[u].mes), 300)}` : '',
        `[REPLY]\n${short(story, 4000)}`,
    ].filter(Boolean).join('\n\n');
    return { system, user, tok: tokens(system) + tokens(user) };
}
// 분류 지시 (미트볼폰의 분류 지시만 · 사용자 프리셋 · 탈옥 없음)
const SYSTEM = 'You label what happened in ONE roleplay reply for a status tracker. Use ONLY the keys and actions listed. '
        + 'If the wording differs, map it to the closest listed action (e.g. "spoke sweetly" → the listed "칭찬"). '
        + 'Never invent an event that did not happen in the reply. No numbers except the formats shown. '
        + 'Almost every reply has something to record: '
        + '(1) for EACH listed person who talked with, touched, helped, teased, comforted or reacted to the player character in this reply, write ONE act line — '
        + 'pick the closest listed action, and if none fits use 기쁘게 함 (warm / friendly / pleasant moment) or 상처 줌 (cold / hurtful moment); '
        + '(2) if time clearly passed (a meal, a walk, a scene change, "later", "after a while"), write a time line (+30m, +1h …); '
        + '(3) any place change, food, purchase, item, sleep or wash that happened; '
        + 'whenever you write a loc line, also write a with line for who is there now (with: 없음 if the player character is alone). '
        + 'Only output an empty <meatball></meatball> when the reply is pure description with no interaction and no time passing. '
        + 'Output ONLY a <meatball> block, one "key: value" per line.';
// 분류 연결로 보냄 (「미트볼 분류용」 프리셋: 온도 0 · 답 1000토큰 · 생각 최소 · 스트리밍 끔)
export const clsStats = { calls: 0, tok: 0, lastTok: 0, fails: 0 };
async function send(system, user) {
    clsStats.calls++; clsStats.lastSent = { system, user }; clsStats.lastReply = null;
    try { clsStats.lastReply = await sendClean(system, user); }
    finally { clsStats.lastError = connStats.lastError; clsStats.lastMs = connStats.lastMs; clsStats.route = routeText(); }
    return clsStats.lastReply;
}

// 가벼운 AI 1회 (다른 곡 · 다른 구절 · 번역 등): 분류 연결로 → 그 연결이 막히면(권한 · 키 · 모델 없음) 만들기 연결로 한 번 더
let lightWarned = false;
export async function askLight(system, user) {
    if (clsRoute()) {
        try { return await send(system, user); }
        catch (e) {
            console.warn('[미트볼폰] 분류 연결 실패 → 만들기 연결로', e);
            if (!lightWarned) { lightWarned = true; (await import('../ui/kit.js')).toast(`분류 연결이 안 돼서(${String(e?.message ?? e).match(/\b(40[0-9]|429|5\d\d)\b/)?.[1] ?? '오류'}) 만들기 연결로 대신했어요 · 확장 설정 › AI › 분류 연결을 확인해 주세요`, 'bad'); }
        }
    }
    return (await import('./ai.js')).ask(user, system);
}
// 받은 줄 거르기: 목록 밖의 키 · 행동은 조용히 버림 · 비슷한 말은 목록 행동으로 맞춤
export function filterOps(raw, book, S, aiNo) {
    if (!/<meatball>/i.test(String(raw))) throw new Error('형식 오류');
    const allow = ALLOW(aiNo), out = [];
    for (const [k, v] of readOps(raw)) {
        const kind = kindOf(k); if (!allow.has(kind)) continue;
        if (kind === 'act') {
            // 설정집에 없는 인물(이야기 중 새로 나와 아직 규칙이 없는 사람)도 기본 행동은 받는다
            const [a = '', b = ''] = parts(v), p = personOf(book, a) ?? (S?.rel?.[a] ? { name: a, up: [], down: [] } : null); if (!p) continue;
            const list = [...p.up, ...p.down].map(x => x.act).concat(BASIC_ACTS.up.act, BASIC_ACTS.down.act), t = norm(b);
            const hit = list.find(x => norm(x) === t) ?? list.find(x => t.includes(norm(x)) || norm(x).includes(t));
            if (!hit || !t) continue;
            out.push(['act', `${p.name} | ${hit}`]); continue;
        }
        out.push([k, v]);
    }
    return out;
}

// ───── 줄 세우기: 메시지마다 마지막 것만 · 차례로 하나씩 ─────
const queue = [];
let busy = false;
const waiting = new Set(); // 지금 고르는 중인 메시지 번호 (칩 「…」)
export const isWaiting = (i) => waiting.has(i);
export function enqueue(i, force = false) {
    const k = queue.findIndex(q => q.i === i); if (k >= 0) queue.splice(k, 1); // 같은 메시지는 마지막 것만
    queue.push({ i, force, chat: ctx().getCurrentChatId?.(), m: ctx().chat?.[i] }); waiting.add(i); app.refresh?.();
    if (!busy) pump();
}
async function pump() {
    busy = true;
    try { while (queue.length) { const q = queue.shift(); try { const at = q.m ? (ctx().chat ?? []).indexOf(q.m) : q.i; /* 🗑 앞 메시지를 지우면 번호가 밀림 → 그 메시지를 다시 찾음 */ if (q.chat === ctx().getCurrentChatId?.() && at >= 0) await run(at, q.force); /* 🔀 채팅을 옮겼으면 그 채팅의 줄은 버림 (다른 채팅의 같은 번호 메시지를 고르지 않게) */ } catch (e) { console.warn(`[${TITLE}] 분류`, e); } waiting.delete(q.i); app.refresh?.(); } }
    finally { busy = false; }
}
export const idle = () => !busy && !queue.length;

// 한 메시지 고르기
async function run(i, force) {
    const chat = ctx().chat ?? [], m = chat[i], meta = getMeta();
    if (!m || m.is_user || m.is_system || !meta?.book) return;
    const sid = m.swipe_id ?? 0, fp = fingerprint(i), sl = msgData(m, true);
    if (sl.skip) return;
    if (!force && sl.src === 'cls' && sl.fp === fp && !sl.clsFail) return; // 이미 고른 같은 글
    // 같은 글이면 저장된 결과 (리롤로 같은 글이 나왔을 때 · 옛 스와이프로 돌아왔을 때)
    const cached = !force && meta.clsCache?.[fp];
    let ops = cached ?? null, tok = 0;
    if (!ops) {
        const P = buildPrompt(i); if (!P) return;
        tok = P.tok; clsStats.lastTok = tok; clsStats.tok += tok;
        const r = fold(), S = r.stateAt?.(i - 1) ?? r.S;
        for (let n = 0; n < 2 && !ops; n++) {
            try { ops = filterOps(await send(P.system, P.user), r.book, S, aiNoOf(i)); } catch (e) { if (n) { clsStats.fails++; console.info(`[${TITLE}] 분류 실패 (칩의 「다시」) · ${e.message}`); } }
        }
    }
    // 😌 그 답에 눈 감은 앱의 줄은 버림 (저장된 결과를 다시 쓸 때도)
    if (ops) ops = ops.filter(([k]) => !shutKey(k, aiNoOf(i)));
    // 그새 다른 스와이프로 넘어갔거나 글이 바뀌었으면 이 칸엔 안 씀 (결과는 지문으로 남겨 둠)
    if (ops) { meta.clsCache ??= {}; meta.clsCache[fp] = ops; const keys = Object.keys(meta.clsCache); if (keys.length > 300) delete meta.clsCache[keys[0]]; }
    if (getMeta() !== meta) return; // 기다리는 사이 채팅이 바뀜
    if (ctx().chat?.[i] !== m) { i = (ctx().chat ?? []).indexOf(m); if (i < 0) return; } // 🗑 앞 메시지가 지워져 번호가 밀림 → 그 메시지에 그대로
    if ((m.swipe_id ?? 0) !== sid || fingerprint(i) !== fp) { saveMeta(); return; }
    const s2 = msgData(m, true);
    if (ops) { s2.ops = ops; s2.src = 'cls'; s2.fp = fp; delete s2.clsFail; if (tok) s2.tok = tok; }
    else { s2.ops = s2.ops ?? []; s2.src = 'cls'; s2.clsFail = true; }
    s2.rev = (s2.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); saveMeta(); saveChatSoon();
    app.afterClassify?.(i);
}

// ───── 🔌 분류 연결 시험: 짧은 견본 답 하나를 분류해 봄 (설정집 · 채팅 없어도 됨) ─────
export const SAMPLE = '민지는 편의점에 들어가 삼각김밥을 하나 샀다. 1,500원을 내고 밖으로 나와 벤치에 앉아 먹었다. 도윤이 다가와 웃으며 칭찬했다. "오늘 좀 멋진데?"';
export async function testConnection() {
    const t0 = performance.now(), route = routeText();
    if (!clsRoute()) return { ok: false, ms: 0, route, error: '분류 모델 연결을 먼저 골라 주세요' };
    const user = `[STATE] place 거리 · time 12h · with 민지 · money 10000 원 · items -\n\n[ACTIONS]\n도윤 — up: 칭찬 / down: 거짓말\n\n[KEYS]\n`
        + `${KEYS.slice(0, 16).map(([k, v, w]) => `${k}: ${v}  — ${w}`).join('\n')}\n\n[REPLY]\n${SAMPLE}`;
    try {
        const reply = await send(SYSTEM, user), ms = Math.round(performance.now() - t0);
        const ok = /<meatball>/i.test(reply), ops = ok ? readOps(reply) : [];
        return { ok: ok && ops.length > 0, ms, route, reply, ops, error: ok ? (ops.length ? '' : '답은 왔지만 고른 사건이 0개예요') : '답에 <meatball> 블록이 없어요' };
    } catch (e) { return { ok: false, ms: Math.round(performance.now() - t0), route, error: e.message }; }
}
export const presetText = () => `${CLS_PRESET.name}: 온도 ${CLS_PRESET.temperature} · 답 ${CLS_PRESET.max_tokens}토큰 · 생각 ${connStats.thinkOff ? '설정 안 보냄(모델이 거절)' : CLS_PRESET.reasoning_effort} · 스트리밍 끔 · 사용자 프리셋 안 씀`;

// ───── 6-2 새 인물 규칙 채우기: npc로 처음 나온 인물은 그 인물당 한 번만 ─────
export async function fillPerson(name, why = '') {
    const meta = getMeta(); if (!meta?.book || personOf(meta.book, name)) return false;
    (meta.npcTried ??= {})[name] = 'try'; saveMeta();
    const sys = 'You write a tiny rule card for a new roleplay character. Output JSON only, Korean values: '
        + '{"line":"성격 한 줄","face":"이모지 하나","up":[{"act":"칭찬","d":3},{"act":"","d":2},{"act":"","d":4}],"down":[{"act":"거짓말","d":-5},{"act":"","d":-3},{"act":"","d":-4}],"start":{"aff":10,"trust":10}}. '
        + 'up = 3 actions that raise their affection, down = 3 that lower it. Short words.';
    const chat = ctx().chat ?? [], last = [...chat].reverse().find(m => !m.is_user && m.mes?.includes(name));
    try {
        const raw = await askLight(sys, `Character: ${name}${why ? ` — ${why}` : ''}\nScene:\n${short(stripTags(last?.mes ?? ''), 1500)}`);
        const j = JSON.parse(String(raw).slice(String(raw).indexOf('{'), String(raw).lastIndexOf('}') + 1));
        const m2 = getMeta(); if (personOf(m2.book, name)) return false; // 그새 직접 넣었으면 건드리지 않음
        const up = (j.up ?? []).filter(a => a?.act).slice(0, 3), down = (j.down ?? []).filter(a => a?.act).slice(0, 3);
        m2.book = normBook({ ...m2.book, people: [...m2.book.people, { name: safeKey(name), face: j.face, line: j.line, up, down, start: j.start, auto: 'npc' }] });
        m2.npcTried[name] = 'ok'; saveMeta(); app.refresh?.(true);
        return true;
    } catch (e) {
        console.warn(`[${TITLE}] 새 인물 규칙 채우기 실패`, e);
        getMeta().npcTried[name] = 'fail'; saveMeta(); app.refresh?.();
        return false;
    }
}
// 방금 계산에 처음 나온 인물(설정집에 없음) → 한 번만 채우기
export function newPeople() {
    const r = fold(), meta = getMeta(); if (!r || !meta) return [];
    return Object.entries(r.S.rel).filter(([n, x]) => x.extra && !x.gone && !personOf(r.book, n) && !meta.npcTried?.[n]).map(([n, x]) => [n, x.line ?? '']);
}
