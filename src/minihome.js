// 📒 미니홈피 자료 (화면 없음): 📔 다이어리 · 📜 연표 · 🌊 파도타기 · 📝 방명록
// 여기는 「무엇을 보여 줄지」만 만든다 — 창 · 스타일은 hompy.js 쪽에서 이 함수들을 불러 그린다.
//  · 다이어리 · 연표 · 파도타기: 이미 계산된 상태(app.current.state)를 읽기만 한다 → AI 0회 · 저장 0 · 다시 계산 0
//  · 방명록: 선택 기능(설정 guestbook · 기본 끔). 끄면 저장 · 호출 · 이벤트 처리가 모두 0. 글은 본편 AI에게 가지 않는다
//    자료는 meta.gbook (없으면 만들지 않는다) — 연락처럼 「따로 보관」이라 채팅을 지우거나 다시 생성해도 남는다
import { app, ctx, settings, getMeta, saveMeta, norm, short, findBy, uid, stamp, dateStr, isActive, ready, relAxes, nowTick, ssNote, DEFAULT_STAGES, playOf } from './core.js';
import { stripStatus, recentChat, chatCharacters, whereNow, addAdjust } from './engine.js';
import { aiGenerate, P, mainBusy, PROMPT_DEFS, PROMPT_MAP } from './prompts.js';

// 이 파일이 쓰는 프롬프트는 여기서 등록한다 — 파일을 안 불러오면 「프롬프트 · 토큰」 창의 목록도 원래 그대로
for (const d of [
    { key: 'hompy.guest', group: 'call', label: '📝 방명록 (인물이 남기는 한 줄)', when: '방명록 › 「받기」 · 자동 방명록 (1번 = 1호출)', text: 'You are {who}. {who} drops by {{user}}\'s personal page and leaves ONE short guestbook note — the kind of thing {who} would actually write given their personality, the current relationship and what just happened (a tease, a thank-you, a complaint, a reminder, a shy hello…). In {who}\'s own voice and in {outLang}: one or two short sentences on a single line, always a finished thought (never stop mid-sentence). No narration, no name prefix, no quotation marks, no emoji unless {who} would use them.' },
    { key: 'hompy.reply', group: 'call', label: '📝 방명록 답글 (내가 남긴 글에 인물이 답)', when: '파도타기 › 내가 남긴 방명록 › 「답글 받기」 (1번 = 1호출)', text: 'You are {who}. {{user}} left a note on {who}\'s personal guestbook: «{note}». Write {who}\'s short reply under it — in {who}\'s own voice, fitting the relationship right now. In {outLang}: one or two short sentences on a single line, always a finished thought (never stop mid-sentence). No narration, no name prefix, no quotation marks.' },
    { key: 'hompy.ilchon', group: 'call', label: '💬 일촌평 (인물이 붙이는 한마디)', when: '일촌 › 「일촌평 받기」 (1번 = 1호출)', text: 'You are {who}. Write the short tagline {who} would put next to {{user}}\'s name on a friends list — how {who} sees {{user}} right now, given the relationship stage and recent events. In {who}\'s voice and in {outLang}, a single phrase of at most 20 characters. No quotation marks, no name prefix, no explanation.' },
]) if (!PROMPT_MAP[d.key]) { PROMPT_DEFS.push(d); PROMPT_MAP[d.key] = d; }

const st = () => app.current?.state ?? null;
const live = () => { try { return isActive() && ready() && !!st(); } catch { return false; } };
const chat = () => ctx().chat ?? [];
const cut = (t, n) => short(String(t ?? '').replace(/\s+/g, ' ').trim(), n);
// AI가 준 짧은 글 다듬기: 줄이 나뉘어 와도 이어 붙이고(첫 줄만 집으면 중간에서 끊겼다) 따옴표 · 이름 머리말을 뗀다
const oneLine = (raw, who, n) => cut(stripStatus(String(raw ?? '')).split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 4).join(' ').replace(new RegExp(`^${String(who ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*`), '').replace(/^["“「『]+|["”」』]+$/g, ''), n);
const stagesOf = (rel) => (rel?.stages?.length ? rel.stages : DEFAULT_STAGES);
// 「나」의 이름들 (페르소나 · 프로필의 유저 · 플레이 방식의 주인공) — 내가 내 홈피에 방명록을 남기거나 내 홈피로 파도타기하지 않게 뺀다
export function selfNames(s = st()) {
    const out = new Set();
    try { const c = ctx(); for (const n of [c.name1, ...(s?.data?.profile?.list ?? []).filter(p => p.role === 'user').map(p => p.name), playOf(getMeta())?.hero]) if (n) out.add(norm(n)); } catch (e) { ssNote('minihome self', e); }
    return out;
}

// ───── 📔 다이어리 ─────
// 기록 줄(칩 글)의 머리 글자로 종류를 가른다 — ops.js가 붙이는 그림 글자와 맞춘 표
const KIND = [
    ['love', /^(💞|💔|💌|♥|🚫♥)/u], ['trust', /^🤝/u], ['jealous', /^💢/u], ['quest', /^(📜|⌛)/u], ['ach', /^🏆/u],
    ['fate', /^(☠|✨|🃏|해제:)/u], ['money', /^(💰|💸|♻|🏪)/u], ['place', /^(📍|🗺)/u], ['home', /^🏠/u],
    ['contact', /^(💬|✉)/u], ['news', /^(📰|🍷|📋|#️⃣)/u], ['person', /^👤/u], ['roll', /^🎲/u],
];
export const labelKind = (l) => KIND.find(([, re]) => re.test(String(l)))?.[0] ?? 'etc';
// 연표에 올릴 만큼 큰 일인가: 단계 변화 · 고백 · 퀘스트 끝/실패 · 업적 · 저주/축복 · 새 장소 · 새 인물 · 빚 청산
const BIG = [/^(💞|💔|💌) /u, /^🏆/u, /^(☠|✨) /u, /^🗺/u, /^👤/u, /^💸/u, /^⌛/u];
const QUEST_END = /^📜 .*(완료|실패|포기|done|failed|complete)/iu;
export const isMilestone = (l) => { l = String(l); return BIG.some(re => re.test(l)) || QUEST_END.test(l); };

// 하루의 기분: 호감 합 · 돈으로만 본다 (좋음 good · 나쁨 bad · 바쁨 busy · 조용 calm)
function moodOf(e) {
    const a = e.aff.reduce((n, [, v]) => n + v, 0), score = a + Math.sign(e.cash);
    return score > 0 ? 'good' : score < 0 ? 'bad' : e.n >= 6 ? 'busy' : 'calm';
}
function entry(d, today = false) {
    const labels = (d.labels ?? []).map(String), aff = (d.aff ?? []).filter(x => Array.isArray(x) && x[1]);
    const e = { date: String(d.date ?? ''), today, cash: Number(d.cash) || 0, cur: String(d.cur ?? ''), aff, labels, n: Number(d.n) || labels.length, kinds: {}, big: labels.filter(isMilestone) };
    for (const l of labels) { const k = labelKind(l); e.kinds[k] = (e.kinds[k] ?? 0) + 1; }
    e.mood = moodOf(e);
    return e;
}
// 오늘(아직 안 끝난 하루): 하루 버퍼에서 지금까지를 같은 모양으로
function todayEntry(s) {
    const b = s.dayBuf; if (!b) return null;
    const cashNow = s.data.wallet?.cash ?? null, aff = [];
    for (const r of s.data.rel?.user ?? []) { const was = b.aff?.[norm(r.name)]; if (was !== undefined && was !== r.aff) aff.push([r.name, r.aff - was]); }
    const labels = (b.labels ?? []).filter(l => !/^📅|^🕐/u.test(l));
    const cash = cashNow !== null && b.cash !== null && b.cash !== undefined ? cashNow - b.cash : 0;
    if (!labels.length && !aff.length && !cash) return null;
    return entry({ date: stamp(s) || `${s.turn}턴`, cash, cur: s.data.wallet?.currency ?? '', aff: aff.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 5), labels: labels.slice(-30), n: labels.length }, true);
}
// 다이어리 쪽 목록 (새 날이 앞) → [{ date, today, cash, cur, aff: [[이름, ±N]], labels, n, kinds: { 종류: 개수 }, big: [큰 일], mood }]
// 지난 하루는 계산이 날짜가 넘어갈 때 이미 접어 둔 것(state.days · 최근 30일)이라 여기서 다시 더하지 않는다
export function diaryEntries(s = st(), { limit = 30, withToday = true } = {}) {
    if (!s) return [];
    const out = [...(s.days ?? [])].map(d => entry(d)).reverse();
    if (withToday) { try { const t = todayEntry(s); if (t) out.unshift(t); } catch (e) { ssNote('minihome today', e); } }
    return out.slice(0, Math.max(0, limit));
}
// 📜 연표: 다이어리에서 큰 일만 뽑아 옛날부터 → [{ date, label, kind }]
export function timeline(s = st(), { limit = 60 } = {}) {
    const out = [];
    for (const e of diaryEntries(s, { limit: 31 }).reverse()) for (const l of e.big) out.push({ date: e.date, label: l, kind: labelKind(l) });
    return out.slice(-Math.max(0, limit));
}

// ───── 🌊 파도타기 ─────
// 찾아갈 수 있는 사람들: 관계 칸 + 프로필 칸의 인물 (유저 빼고 · 이름으로 합침)
export function visitable(s = st()) {
    if (!s) return [];
    const seen = new Set(selfNames(s)), out = [];
    const add = (name, extra) => { const k = norm(name); if (!k || seen.has(k)) return; seen.add(k); out.push({ name: String(name), ...extra }); };
    for (const r of s.data.rel?.user ?? []) add(r.name, { aff: r.aff, out: r.out ?? '' });
    for (const p of s.data.profile?.list ?? []) if (p.role !== 'user') add(p.name, { aff: null, out: '' });
    return out;
}
// 한 사람의 홈피에 놓을 것을 한데 모은다 (읽기만 · 없는 칸은 null/빈 목록). 🔒 비밀 · 🗝 공략은 넣지 않는다 (볼 때 대가가 있는 것이라)
export function personPage(name, s = st()) {
    if (!s || !name) return null;
    const d = s.data, same = (x) => norm(x) === norm(name);
    const prof = d.profile ? findBy(d.profile.list, name) : null, r = d.rel ? findBy(d.rel.user, name) : null;
    if ((!prof || prof.role === 'user') && !r) return null;
    const who = r?.name ?? prof.name, stages = stagesOf(d.rel), AX = d.rel ? relAxes(d.rel) : null;
    const stage = r && r.stage >= 0 ? stages[Math.min(r.stage, stages.length - 1)] ?? null : null;
    const ct = d.contact, c = ct ? findBy(ct.contacts, who) : null, thread = ct && c ? (ct.threads?.[c.name] ?? []) : [];
    const lastMsg = [...thread].reverse().find(m => m.text && !m.pending) ?? null;
    return {
        name: who,
        emoji: r?.emoji ?? '',
        profile: prof ? { role: prof.role ?? '', summary: prof.summary ?? '', fields: (prof.fields ?? []).map(f => ({ k: f.k, v: f.v })), home: prof.home ?? '', sched: prof.sched ?? '' } : null,
        where: prof ? (whereNow(prof, d.calendar) || '') : '',
        rel: r ? { label: r.label, aff: r.aff, trust: r.trust, stage: r.stage, stageName: stage?.name ?? '', jealous: r.jealous, met: r.met, memo: r.memo, bond: !!r.bond, noLove: !!r.noLove, out: r.out ?? '' } : null,
        axes: AX,
        mind: r?.mind?.text ? { text: r.mind.text, turn: r.mind.turn } : null,
        taste: r ? { likes: r.likes ?? '', dislikes: r.dislikes ?? '', concern: r.concern ?? '' } : null,
        life: (d.rel?.life ?? []).filter(x => same(x.who)).slice(-5).reverse(),
        pairs: (d.rel?.pairs ?? []).filter(p => same(p.a) || same(p.b)).map(p => ({ with: same(p.a) ? p.b : p.a, label: p.label, memo: p.memo, aff: p.aff ?? null })),
        sns: (d.sns?.posts ?? []).filter(p => same(p.author)).slice(-5).reverse().map(p => ({ id: p.id, text: p.text, pic: p.pic, tags: p.tags, likes: p.likes, date: p.date })),
        contact: c ? { handle: c.handle, status: c.status, blocked: !!c.blocked, away: c.away ?? null, unread: Number(ct.unread?.[c.name]) || 0, count: thread.length, last: lastMsg ? { from: lastMsg.from, text: cut(lastMsg.text, 80), date: lastMsg.date } : null } : null,
        // 최근 며칠 동안 이 사람과의 호감이 움직인 날 (다이어리와 같은 자료)
        recent: diaryEntries(s, { limit: 31 }).map(e => { const hit = e.aff.find(([n]) => same(n)); return hit ? { date: e.date, today: e.today, delta: hit[1] } : null; }).filter(Boolean).slice(0, 7),
        guestbook: gbList().filter(g => same(g.who)).slice(0, 5),
    };
}

// ───── 📝 방명록 ─────
const GB_MAX = 60;          // 보관할 글 수 (넘으면 오래된 것부터 빠짐)
const GB_GAP_MS = 3 * 60000; // 자동으로 받을 때의 실제 시간 간격 (날짜를 빠르게 넘겨도 연달아 부르지 않게)
export const gbOn = () => settings().guestbook === true;
const gbAuto = () => gbOn() && settings().guestbookAuto === true;
export function gbData(create = false) { const m = getMeta(); if (!m) return null; if (create) m.gbook ??= { list: [] }; return m.gbook ?? null; }
const gbSave = () => { saveMeta(); app.refreshNow?.(); };
// 새 글이 앞 → [{ id, who, text, date, at, reply?, auto? }]
export function gbList() { const G = gbData(); return Array.isArray(G?.list) ? [...G.list].reverse() : []; }
export const gbUnread = () => Number(gbData()?.unread) || 0;
export function gbSeen() { const G = gbData(); if (G?.unread) { G.unread = 0; saveMeta(); } }
// 글을 남길 만한 사람: 이야기에서 빠진 사람 · 차단한 연락처는 빼고, 호감 0 이상
function gbWriters(s) {
    const blocked = new Set((s.data.contact?.contacts ?? []).filter(c => c.blocked).map(c => norm(c.name)));
    const me = selfNames(s);
    return (s.data.rel?.user ?? []).filter(r => !r.out && r.aff >= 0 && !blocked.has(norm(r.name)) && !me.has(norm(r.name)));
}
// 누가 쓸지: 호감이 높을수록 자주 · 바로 앞에 쓴 사람은 한 번 쉰다. rnd는 시험에서 바꿔 끼운다
export function gbPick(s = st(), rnd = Math.random) {
    if (!s) return '';
    const nudge = gbData()?.nudge?.who; if (nudge && gbWriters(s).some(r => norm(r.name) === norm(nudge))) return gbWriters(s).find(r => norm(r.name) === norm(nudge)).name; // 방금 일이 있었던 사람이 먼저
    const last = gbData()?.list?.at(-1)?.who;
    let pool = gbWriters(s); if (pool.length > 1 && last) pool = pool.filter(r => norm(r.name) !== norm(last));
    if (!pool.length) return '';
    const w = pool.map(r => 10 + r.aff), sum = w.reduce((a, b) => a + b, 0);
    let x = rnd() * sum;
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x < 0) return pool[i].name; }
    return pool.at(-1).name;
}
function gbAbout(who, s) {
    const d = s.data, prof = d.profile ? findBy(d.profile.list, who) : null, card = chatCharacters().find(ch => norm(ch.name) === norm(who)), r = d.rel ? findBy(d.rel.user, who) : null;
    const stage = r && r.stage >= 0 ? stagesOf(d.rel)[Math.min(r.stage, stagesOf(d.rel).length - 1)]?.name : '';
    const mine = (gbData()?.list ?? []).filter(g => norm(g.who) === norm(who)).slice(-3);
    return [`World: ${s.core.title} — ${short(s.core.summary, 300)}`, d.calendar ? `Now: ${dateStr(d.calendar)} ${d.calendar.time}` : '',
        prof ? `About ${who}: ${short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, 900)}` : card ? `About ${who}: ${short(card.description, 700)}` : '',
        r ? `Relationship with {{user}}: ${r.label || '-'}${stage ? ` · stage ${stage}` : ''} · ${relAxes(d.rel).aff} ${r.aff} · ${relAxes(d.rel).trust} ${r.trust}${r.jealous >= 50 ? ` · jealous ${r.jealous}/100` : ''}` : '',
        mine.length ? `${who}'s earlier guestbook notes (do not repeat):\n${mine.map(g => `- ${g.text}${g.reply ? ` (→ {{user}} replied: ${g.reply})` : ''}`).join('\n')}` : '',
        // 📔 다이어리와 엮기: 오늘 있었던 큰 일 · 방금 생긴 일(선물 · 약속)을 알고 쓴다
        (() => { try { const t = todayEntry(s), mine = t?.aff.find(([n]) => norm(n) === norm(who)); const bits = [...(t?.big ?? []).slice(0, 3), mine ? `${who}'s feelings toward {{user}} moved ${mine[1] > 0 ? '+' : ''}${mine[1]} today` : '']; const nd = gbData()?.nudge; if (nd && norm(nd.who) === norm(who)) bits.push(nd.why); return bits.filter(Boolean).length ? `Today:\n${bits.filter(Boolean).map(x => `- ${x}`).join('\n')}` : ''; } catch { return ''; } })(),
        `Recent story:\n${recentChat(4)}`].filter(Boolean).join('\n\n');
}
// 다른 기능이 「이 사람에게 방금 일이 있었다」고 알려 둔다 (선물 취향 · 약속 어김 — addons.js). 다음 방명록 한 번에 쓰이고 지워진다. 방명록이 꺼져 있으면 아무것도 안 한다
app.gbNudge = (who, why) => { try { if (!gbOn() || !who) return; const G = gbData(true); if (!G) return; G.nudge = { who: String(who), why: cut(why, 160) }; saveMeta(); } catch (e) { ssNote('guestbook nudge', e); } };
// 방명록 한 줄 받기 (확장 AI 1회). who를 비우면 gbPick이 고른다 → 넣은 글 (못 넣으면 null)
// 채팅이 바뀌면 aiGenerate가 결과를 버리고 오류를 던진다 (다른 채팅에 섞이지 않음)
export async function gbWrite(who = '', { auto = false } = {}) {
    if (!gbOn() || !live()) return null;
    const s = st(); who = who ? (findBy(s.data.rel?.user ?? [], who)?.name ?? '') : gbPick(s);
    if (!who || selfNames(s).has(norm(who))) return null; // 나 자신은 쓰지 않는다
    const raw = await aiGenerate(auto ? 'autoping' : 'ping', P('hompy.guest', { who }), gbAbout(who, s), 800);
    const text = oneLine(raw, who, 300);
    if (!text) throw new Error('빈 답이 왔어요');
    const G = gbData(true); if (!G) return null;
    const e = { id: uid(), who, text, date: stamp(st()), at: chat().length, ...(auto ? { auto: true } : {}) };
    G.list = [...(Array.isArray(G.list) ? G.list : []), e].slice(-GB_MAX);
    G.unread = (Number(G.unread) || 0) + 1;
    if (G.nudge && norm(G.nudge.who) === norm(who)) delete G.nudge;
    gbSave();
    return e;
}
// 내 답글 (AI 0회 — 다음에 그 사람이 쓸 때 참고로 간다) · 지우기 · 비우기
// 🤝 관계와 엮기: 글마다 처음 답글을 달 때 한 번, 그 사람의 우정이 +1 (다이어리 · TODAY에도 그날 일로 잡힌다)
export function gbReply(id, text) {
    const e = gbData()?.list?.find(x => x.id === id); if (!e) return false;
    const t = cut(text, 200); if (t) e.reply = t; else delete e.reply;
    const r = t && !e.thanked ? findBy(st()?.data?.rel?.user ?? [], e.who) : null;
    if (r && !r.out) { e.thanked = true; addAdjust({ ops: [['trust', `${r.name} +1`]], label: `📝 ${r.name}의 방명록에 답글` }).catch(err => ssNote('guestbook reply', err)); }
    gbSave(); return true;
}
export function gbDelete(id) { const G = gbData(); if (!G?.list?.some(x => x.id === id)) return false; G.list = G.list.filter(x => x.id !== id); gbSave(); return true; }
export function gbClear() { const m = getMeta(); if (!m?.gbook) return false; delete m.gbook; gbSave(); return true; }

// 자동: 이야기 속 날짜가 넘어갔을 때 하루에 한 줄까지 (설정 guestbookAuto · 기본 끔). 달력이 없으면 20턴을 하루로 친다
const gbDay = (s) => (s.data.calendar ? Math.floor(nowTick(s)) : Math.floor((s.turn ?? 0) / 20));
let gbTimer = null, gbBusy = false;
export async function gbTick() {
    if (!gbAuto() || !live() || gbBusy) return null;
    const s = st(), day = gbDay(s), G = gbData(true); if (!G) return null;
    if (G.day === undefined || G.day === null) { G.day = day; saveMeta(); return null; } // 켠 날은 세기만 한다 (켜자마자 부르지 않게)
    if (day <= G.day) { if (day < G.day) { G.day = day; saveMeta(); } return null; }      // 되감아서 날짜가 뒤로 갔으면 거기서 다시 센다
    G.day = day; saveMeta();                                                              // 실패해도 같은 날 또 부르지 않게 먼저 적는다
    if (Date.now() - (Number(G.realAt) || 0) < GB_GAP_MS || mainBusy() || !gbWriters(s).length) return null;
    G.realAt = Date.now(); gbBusy = true;
    try { return await gbWrite('', { auto: true }); } finally { gbBusy = false; }
}
function onReply(id, type) {
    if (type === 'impersonate' || type === 'quiet' || !gbAuto()) return;
    clearTimeout(gbTimer);
    gbTimer = setTimeout(() => gbTick().catch(e => ssNote('guestbook', e)), 600); // 상태가 새 답을 반영한 뒤에
}
let inited = false;
export function initMinihome() {
    if (inited) return; inited = true;
    const { eventSource, event_types: E } = ctx();
    if (E?.MESSAGE_RECEIVED) eventSource.on(E.MESSAGE_RECEIVED, (...a) => { try { onReply(...a); } catch (e) { ssNote('guestbook reply', e); } });
}
// 🌐 화면 번역(영어로 저장 · 화면만 한국어): 방명록 · 일촌평 글도 번역할 글에 들어가게 — translate.js가 모으는 app.storyTexts 뒤에 덧붙인다
app.gbTexts = () => { const out = []; try { for (const g of gbData()?.list ?? []) { if (g.text) out.push(g.text); if (g.reply) out.push(g.reply); } for (const x of Object.values(gbData()?.ilchon ?? {})) if (x?.text) out.push(x.text); for (const x of gbData()?.sent ?? []) if (x.reply) out.push(x.reply); } catch (e) { ssNote('guestbook texts', e); } return out; };
{ const prevTexts = app.storyTexts; app.storyTexts = () => { let a = []; try { a = prevTexts?.() ?? []; } catch (e) { ssNote('story texts', e); } return [...a, ...app.gbTexts()]; }; }

// ───── 💬 일촌평 ─────
// 인물마다 한 줄 (그 사람이 나를 어떻게 부르는지). 받은 때의 관계 단계를 같이 적어 두고, 단계가 바뀌면 stale=true 로 알려 준다 (자동으로 다시 부르지 않는다)
// 방명록과 같은 설정(guestbook)을 쓴다 · 받기 = AI 1회
const own = (o, k) => (o && typeof o === 'object' && Object.hasOwn(o, k) ? o[k] : undefined);
export function ilchonOf(name, s = st()) {
    const e = own(gbData()?.ilchon, name); if (!e?.text) return null;
    const r = s?.data?.rel ? findBy(s.data.rel.user, name) : null;
    return { who: name, text: e.text, date: e.date ?? '', stage: e.stage ?? -1, stale: !!r && (r.stage ?? -1) !== (e.stage ?? -1) };
}
app.ilchon = (name) => (gbOn() ? ilchonOf(name) : null); // 🕸 관계도가 점 옆에 붙일 때 쓴다 (relgraph.js)
export function ilchonList(s = st()) { return (s?.data?.rel?.user ?? []).filter(r => !r.out).map(r => ilchonOf(r.name, s) ?? { who: r.name, text: '', date: '', stage: -1, stale: false }); }
export async function ilchonWrite(who) {
    if (!gbOn() || !live()) return null;
    const s = st(), r = findBy(s.data.rel?.user ?? [], who); if (!r || selfNames(s).has(norm(r.name))) return null;
    const raw = await aiGenerate('ping', P('hompy.ilchon', { who: r.name }), gbAbout(r.name, s), 600);
    const text = oneLine(raw, r.name, 60);
    if (!text) throw new Error('빈 답이 왔어요');
    const G = gbData(true); if (!G) return null;
    (G.ilchon ??= {})[r.name] = { text, date: stamp(st()), stage: r.stage ?? -1 };
    gbSave();
    return ilchonOf(r.name);
}
export function ilchonSet(who, text) { const G = gbData(true); if (!G || !who) return false; const t = cut(text, 40); const r = findBy(st()?.data?.rel?.user ?? [], who); if (t) (G.ilchon ??= {})[who] = { text: t, date: stamp(st()), stage: r?.stage ?? -1, mine: true }; else if (G.ilchon) delete G.ilchon[who]; gbSave(); return true; }

// ───── 👣 TODAY ─────
// 오늘 · 지금까지 「다녀간 사람」 수 (토큰 0 · 저장 0): 그날 호감이 움직였거나 방명록을 남긴 사람을 센다
export function todayCount(s = st()) {
    if (!s) return { today: 0, total: 0, who: [] };
    const all = diaryEntries(s, { limit: 31 }), now = stamp(s), gb = gbData()?.list ?? [];
    const names = (e) => new Set([...e.aff.map(([n]) => norm(n)), ...gb.filter(g => g.date && g.date === e.date).map(g => norm(g.who))]);
    const t = all.find(e => e.today), who = t ? [...names(t)] : [...new Set(gb.filter(g => now && g.date === now).map(g => norm(g.who)))];
    const total = all.reduce((n, e) => n + names(e).size, 0) + gb.filter(g => !all.some(e => e.date === g.date)).length;
    return { today: who.length, total, who };
}

// ───── 🧱 담벼락: 방명록 + 「상태창에 손댄다」의 낙서를 한 줄로 (새 것이 앞) ─────
export function wall() {
    const out = gbList().map(g => ({ kind: 'guest', id: g.id, who: g.who, text: g.text, date: g.date, reply: g.reply ?? '', at: g.at ?? 0 }));
    for (const e of getMeta()?.story?.meddle ?? []) if (e?.kind === 'memo' && e.text) out.push({ kind: 'scribble', id: e.id, who: e.who, text: e.text, date: e.date ?? '', reply: '', at: -1 });
    return out;
}

// ───── 📜 연표 보강: 앨범에 담은 장면 · 흉터 (날짜가 없는 것은 date가 빈 글) ─────
export function timelineExtra() {
    const m = getMeta(), out = [];
    for (const a of m?.album ?? []) out.push({ kind: 'album', date: String(a.date ?? ''), label: cut(a.note || a.title || a.text || '', 60), id: a.id, t: a.t ?? 0 });
    for (const x of m?.story?.scars ?? []) out.push({ kind: 'scar', date: '', label: `🩹 ${x.name}: ${x.axis} −${x.drop}`, at: x.at });
    return out;
}

// ───── ✍ 내가 남기는 것: 그 사람 홈피의 방명록 · 내가 붙이는 일촌평 ─────
// 본편 AI에게는 가지 않는다 (이야기 밖 놀이). 자료는 meta.gbook.sent · meta.gbook.myIlchon
// 내가 남긴 글 (새 것이 앞) → [{ id, to, text, date, reply? }]
export function myNotes(to = '') { const a = Array.isArray(gbData()?.sent) ? [...gbData().sent].reverse() : []; return to ? a.filter(x => norm(x.to) === norm(to)) : a; }
export function sendNote(to, text) {
    if (!gbOn() || !live()) return null;
    const r = findBy(st().data.rel?.user ?? [], to), t = cut(text, 200); if (!r || !t || selfNames().has(norm(r.name))) return null;
    const G = gbData(true); if (!G) return null;
    const e = { id: uid(), to: r.name, text: t, date: stamp(st()), at: chat().length };
    G.sent = [...(Array.isArray(G.sent) ? G.sent : []), e].slice(-GB_MAX);
    gbSave(); try { app.socNote?.(e); } catch (err) { ssNote('guestbook soc', err); }
    return e;
}
// 그 글에 인물이 답글 (AI 1회)
export async function noteReplyAI(id) {
    if (!gbOn() || !live()) return null;
    const e = gbData()?.sent?.find(x => x.id === id); if (!e) return null;
    const raw = await aiGenerate('ping', P('hompy.reply', { who: e.to, note: e.text }), gbAbout(e.to, st()), 800);
    const got = app.socFeel ? app.socFeel(raw) : { text: raw, feel: 0 };
    const text = oneLine(got.text, e.to, 300);
    if (!text) throw new Error('빈 답이 왔어요');
    const cur = gbData()?.sent?.find(x => x.id === id); if (!cur) return null;
    cur.reply = text; gbSave();
    try { if (got.feel) app.socApply?.(cur.to, got.feel, `gb:${cur.id}`, '방명록'); } catch (err) { ssNote('guestbook feel', err); }
    return cur;
}
export function deleteMyNote(id) { const G = gbData(); if (!G?.sent?.some(x => x.id === id)) return false; G.sent = G.sent.filter(x => x.id !== id); gbSave(); try { app.socSweep?.(); } catch (err) { ssNote('guestbook sweep', err); } return true; }
export const myIlchonOf = (name) => { const x = own(gbData()?.myIlchon, name); return typeof x === 'string' ? x : ''; };
export function setMyIlchon(name, text) { const G = gbData(true); if (!G || !name) return false; const t = cut(text, 40); if (t) (G.myIlchon ??= {})[name] = t; else if (G.myIlchon) delete G.myIlchon[name]; gbSave(); return true; }
