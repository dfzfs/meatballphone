// 🧩 덧붙이는 기능들 (화면 없음 — 계산 · 저장 · AI에게 가는 줄만. 단추와 칸은 화면 작업 때 이 함수들을 불러 붙인다)
//   ⚔ 장비 착용 (gearOn) · 🌦 날씨/시간대 효과 (ambientOn) · 👥 단체방을 본편에 알리기 (방마다) · 🔗 합칠 때 연락 대화도 합치기
//   🤝 약속 기한 D-day (promiseClock) · 📚 연락처별 로어북 · 🎁 취향 ↔ 선물 (giftTaste) · 📊 이 채팅 크기 · 🖼 상태 카드 그림
// 설정은 전부 기본 끔이고 === true 로만 본다. 끄면 주입 · 계산 · 저장이 모두 0 (app.extraInject는 빈 글)
// 채팅마다의 자료: meta.gear · meta.roomTell · meta.ctLore (없으면 만들지 않는다)
import { app, ctx, settings, getMeta, saveMeta, norm, short, findBy, clone, clamp, stamp, isActive, ready, ssNote, TITLE, MODULE, fmtNum } from './core.js';
import { commit, questDue, today, affMul, loreNames } from './engine.js';
import { aiGenerate, P, PROMPT_DEFS, PROMPT_MAP } from './prompts.js';
import { askConfirm } from './kit.js';
import { storyData, storyOn, settlePromise } from './story.js';


// 이 파일이 쓰는 프롬프트는 여기서 등록한다 — 파일을 안 불러오면 「프롬프트 · 토큰」 창의 목록도 원래 그대로
for (const d of [
    { key: 'addon.room', group: 'call', label: '👥 단체방 한 줄 요약 (본편에 알릴 때)', when: '단체방 › 「요약만 본편에」 › AI로 만들기 (1번 = 1호출)', text: 'Summarize this group chat in {outLang} in 1-2 sentences for a story narrator: who said what that matters, any plan, promise or conflict. Facts only, no commentary.' },
]) if (!PROMPT_MAP[d.key]) { PROMPT_DEFS.push(d); PROMPT_MAP[d.key] = d; }
const st = () => app.current?.state ?? null;
const live = () => { try { return isActive() && ready() && !!st(); } catch { return false; } };
const on = (k) => settings()[k] === true;
const cut = (t, n) => short(String(t ?? '').replace(/\s+/g, ' ').trim(), n);
const own = (o, k) => (o && typeof o === 'object' && Object.hasOwn(o, k) ? o[k] : undefined);
const save = () => { saveMeta(); app.refreshNow?.(); };

// ───── ⚔ 장비 착용 ─────
// 소지품(wallet.items) 가운데 착용한 것을 칸(slot)마다 하나씩 적어 둔다. 물건이 소지품에서 없어지면 착용도 저절로 풀린 것으로 본다
// 보정은 그 물건의 「효과」 글에서 읽는다: 「힘 +2, 매력 +1」 → 능력치 이름이 같은 판정(주사위)에 더해짐. 지난 계산은 건드리지 않는다 (굴릴 때만 더함)
export const GEAR_SLOTS = ['무기', '옷', '장신구'];
export const gearOn = () => on('gearOn');
export function gearData(create = false) { const m = getMeta(); if (!m) return null; if (create) m.gear ??= { on: {} }; return m.gear ?? null; }
export const gearSlots = () => { const g = gearData(); return Array.isArray(g?.slots) && g.slots.length ? g.slots : GEAR_SLOTS; };
// 「힘 +2, 가격 -10%」 → [{ k: '힘', v: 2, pct: false }, { k: '가격', v: -10, pct: true }]
export function parseBonus(text) {
    const out = [];
    for (const m of String(text ?? '').matchAll(/([^\s,，·;:+\-−\d%][^,，·;:+\-−\d%]*?)\s*([+\-−])\s*(\d+(?:\.\d+)?)\s*(%?)/g)) out.push({ k: m[1].trim(), v: (m[2] === '+' ? 1 : -1) * Number(m[3]), pct: m[4] === '%' });
    return out;
}
// 지금 착용 중 → [{ slot, name, effect, desc, bonus }]
export function equipped(s = st()) {
    if (!gearOn() || !s) return [];
    const g = gearData(), items = s.data.wallet?.items ?? [], out = [];
    for (const slot of gearSlots()) {
        const it = own(g?.on, slot) ? items.find(i => norm(i.name) === norm(g.on[slot]) && i.qty > 0) : null;
        if (it) out.push({ slot, name: it.name, effect: it.effect ?? '', desc: it.desc ?? '', bonus: parseBonus(it.effect) });
    }
    return out;
}
export function equip(slot, item) {
    const s = st(); if (!gearOn() || !s || !slot) return false;
    const it = (s.data.wallet?.items ?? []).find(i => norm(i.name) === norm(item) && i.qty > 0); if (!it) return false;
    const g = gearData(true); g.on ??= {};
    for (const k of Object.keys(g.on)) if (norm(g.on[k]) === norm(it.name)) delete g.on[k]; // 한 물건은 한 칸에만
    g.on[slot] = it.name; save(); return true;
}
export function unequip(slot) { const g = gearData(); if (!g?.on || !own(g.on, slot)) return false; delete g.on[slot]; save(); return true; }
export function setGearSlots(list) { const g = gearData(true); if (!g) return false; const a = [...new Set((Array.isArray(list) ? list : []).map(x => cut(x, 12)).filter(Boolean))].slice(0, 8); if (a.length) g.slots = a; else delete g.slots; save(); return true; }
// 판정에 더할 값: 능력치 이름이 같은 보정의 합 (% 보정은 여기 안 들어감)
export function gearBonus(attr) {
    if (!attr || !gearOn()) return 0;
    let n = 0; try { for (const e of equipped()) for (const b of e.bonus) if (!b.pct && norm(b.k) === norm(attr)) n += b.v; } catch (e) { ssNote('gear bonus', e); }
    return clamp(Math.round(n), -20, 20);
}
app.gearBonus = gearBonus;
app.rollBonus = gearBonus; // 흥정 · 일하기 · 퀘스트 완료 판정(engine.js skillRoll · ops.js questRoll)도 같은 보정을 받는다

// ───── 🌦 날씨 · 시간대 효과 ─────
// 달력의 날씨 · 시간대 글에서 꼬리표를 읽는다 (낱말마다 본다 — 「눈부신 햇살」의 눈 · 「준비」의 비에 걸리지 않게 「눈」 「비」는 낱말 끝에서만). 지금은 「AI에게 알리는 줄」과 화면용 자료만 — 이동 시간 · 요금 같은 계산은 건드리지 않는다
const WX = [['storm', /폭풍|태풍|뇌우|번개|천둥|storm|thunder|typhoon|hurricane/i], ['snow', /눈$|눈보라|폭설|진눈깨비|snow|blizzard/i], ['rain', /비$|소나기|장마|폭우|rain|shower|drizzle/i], ['fog', /안개|fog|mist/i], ['heat', /폭염|무더위|찜통|heat ?wave|scorch/i], ['cold', /한파|혹한|freez|bitter cold/i]];
const NIGHT = /밤|심야|한밤|새벽|night|midnight|dawn/i;
const WX_KO = { storm: '폭풍 — 바깥 이동이 위험해요', snow: '눈 — 이동이 느려져요', rain: '비 — 이동이 느려지고 우산이 필요해요', fog: '안개 — 멀리 안 보여요', heat: '폭염 — 바깥에서 쉽게 지쳐요', cold: '한파 — 바깥에서 쉽게 지쳐요', night: '밤 — 대부분의 가게가 닫아요' };
const WX_EN = { storm: 'a storm: outdoor travel is dangerous and slow', snow: 'snow: travel on foot is slower, people stay in', rain: 'rain: travel is slower, people carry umbrellas or get wet', fog: 'fog: visibility is poor', heat: 'a heat wave: being outside is tiring', cold: 'bitter cold: being outside is tiring', night: 'night: most ordinary shops and offices are closed, streets are quieter' };
export const ambientOn = () => on('ambientOn');
// → { weather, time, tags: ['rain', 'night'…], notes: [화면용 한 줄…], slow: 이동이 느린가, shopClosed: 가게가 닫았나 }
export function ambientOf(s = st()) {
    const cal = s?.data?.calendar; if (!cal) return { weather: '', time: '', tags: [], notes: [], slow: false, shopClosed: false };
    const w = String(cal.weather ?? ''), t = String(cal.time ?? ''), words = w.split(/[\s,，·/()]+/).filter(Boolean), tags = WX.filter(([, re]) => words.some(x => re.test(x))).map(([k]) => k).slice(0, 2);
    if (NIGHT.test(t)) tags.push('night');
    return { weather: w, time: t, tags, notes: tags.map(k => WX_KO[k]), slow: tags.some(k => ['storm', 'snow', 'rain'].includes(k)), shopClosed: tags.includes('night') };
}
export const shopClosedNow = (s = st()) => ambientOn() && ambientOf(s).shopClosed;
app.ambient = () => (ambientOn() && live() ? ambientOf() : null);
// 🎲 흥정과 엮기: 궂은 날(비 · 눈 · 폭풍)은 손님이 없어 주인이 값을 잘 깎아 준다 → 흥정 난이도 −2 · 밤에는 가게가 닫는다 (ambientShop을 켰을 때만)
app.haggleDC = (s) => (ambientOn() && ambientOf(s).slow ? -2 : 0);
app.shopClosed = (s) => on('ambientShop') && shopClosedNow(s);

// ───── 👥 단체방을 본편에 알리기 ─────
// 방마다 고른다: off(기본 · 안 감) · summary(한 줄 요약만) · pick(고른 말풍선만 · 20줄까지). 자료는 meta.roomTell[방 이름]
const ROOM_MODES = ['off', 'summary', 'pick'];
export function roomTell(room) { const e = own(getMeta()?.roomTell, room); return { mode: ROOM_MODES.includes(e?.mode) ? e.mode : 'off', summary: String(e?.summary ?? ''), ids: Array.isArray(e?.ids) ? e.ids : [] }; }
export function setRoomTell(room, patch = {}) {
    const m = getMeta(); if (!m || !room) return false;
    const cur = roomTell(room), next = { ...cur, ...patch };
    next.mode = ROOM_MODES.includes(next.mode) ? next.mode : 'off'; next.summary = cut(next.summary, 400); next.ids = [...new Set(next.ids)].slice(-20);
    if (next.mode === 'off' && !next.summary && !next.ids.length) { if (m.roomTell) delete m.roomTell[room]; } else (m.roomTell ??= {})[room] = next;
    save(); return true;
}
const roomLines = (r, ids = null, n = 30) => (r?.msgs ?? []).filter(x => x.text && (!ids || ids.includes(x.id))).slice(-n).map(x => `${x.from === 'me' ? '{{user}}' : x.who || '?'}: ${cut(x.text, 200)}`);
// 한 줄 요약을 AI로 (1회) → 저장하고 mode를 summary로
export async function roomSummaryAI(room) {
    const r = st()?.data?.contact?.rooms?.[room]; if (!live() || !r?.msgs?.length) return '';
    const t = cut(await aiGenerate('ping', P('addon.room'), `Group chat «${room}» (${r.members.join(', ')}):\n${roomLines(r).join('\n')}`, 250), 400);
    if (t) setRoomTell(room, { summary: t, mode: 'summary' });
    return t;
}
function roomInject(s) {
    const rooms = s.data.contact?.rooms, tell = getMeta()?.roomTell; if (!rooms || !tell) return [];
    const out = [];
    for (const [name, r] of Object.entries(rooms)) {
        const t = roomTell(name);
        if (t.mode === 'summary' && t.summary) out.push(`GROUP CHAT «${name}» (${r.members.join(', ')} + {{user}}) — what happened there: ${t.summary}`);
        if (t.mode === 'pick' && t.ids.length) { const ls = roomLines(r, t.ids, 20); if (ls.length) out.push(`GROUP CHAT «${name}» (${r.members.join(', ')} + {{user}}) — lines {{user}} wants the story to know:\n${ls.join('\n')}`); }
    }
    return out.slice(0, 3);
}

// ───── 🔗 인물을 합칠 때 연락 대화도 합치기 ─────
export function contactMergeNeeded(from, to, s = st()) { const ct = s?.data?.contact; return !!ct && !!findBy(ct.contacts, from) && norm(from) !== norm(to); }
export async function mergeContactThreads(from, to) {
    const s = st(); if (!contactMergeNeeded(from, to, s)) return false;
    const nd = clone(s.data.contact), a = findBy(nd.contacts, from), b = findBy(nd.contacts, to);
    const byTime = (x, y) => (Number.isFinite(x.at) && Number.isFinite(y.at) ? x.at - y.at : 0);
    const target = b?.name ?? to;
    for (const box of ['threads', 'truth']) {
        const src = nd[box]?.[a.name]; if (!src) continue;
        nd[box][target] = [...(nd[box][target] ?? []), ...src].sort(byTime); if (a.name !== target) delete nd[box][a.name];
    }
    if (nd.unread) { const u = (Number(nd.unread[a.name]) || 0) + (b ? Number(nd.unread[b.name]) || 0 : 0); if (a.name !== target) delete nd.unread[a.name]; if (u) nd.unread[target] = u; }
    if (b) { for (const k of ['handle', 'status', 'courier', 'prompt']) if (!b[k] && a[k]) b[k] = a[k]; nd.contacts = nd.contacts.filter(c => c !== a); } else a.name = to;
    for (const r of Object.values(nd.rooms ?? {})) { r.members = [...new Set(r.members.map(m => (norm(m) === norm(from) ? target : m)))]; for (const x of r.msgs ?? []) if (norm(x.who) === norm(from)) x.who = target; }
    await commit('contact', nd, `🔗 연락: ${from} → ${target} 합침`);
    const m = getMeta(); for (const k of ['ctLore']) if (m?.[k] && own(m[k], from)) { m[k][target] ??= m[k][from]; delete m[k][from]; saveMeta(); }
    return true;
}
// 합치기 뒤에 부른다 (extra.js · commands.js): 연락처가 따로 있으면 한 번 물어보고 합친다
app.mergeContactAsk = async (from, to) => {
    try { if (on('mergeContact') && contactMergeNeeded(from, to) && await askConfirm(`「${from}」의 연락 대화도 「${to}」(으)로 옮길까요? (연락처 · 대화 · 안 읽은 수가 합쳐져요)`)) return await mergeContactThreads(from, to); } catch (e) { ssNote('merge contact', e); }
    return false;
};

// ───── 🤝 약속 기한 (D-day) ─────
// 약속 장부의 기한 글(「3일 안에」 「3월 14일까지」)을 퀘스트 기한과 같은 방식으로 달력 날짜로 읽는다. 달력이 없거나 못 읽는 글이면 null
export const promiseClockOn = () => on('promiseClock') && storyOn('promise');
export function promiseDday(p, s = st()) {
    if (!p?.due || !s?.data?.calendar) return null;
    const now = today(s); if (now === null) return null;
    let idx = null; try { idx = questDue(s, { deadline: p.due, since: Number.isFinite(p.day) ? p.day : now }); } catch { idx = null; }
    return Number.isFinite(idx) ? { idx, left: idx - now } : null;
}
// 답을 받은 뒤: 처음 본 약속에 「적은 날」을 붙이고, 기한이 지난 약속은 어김으로 (우정 −4 · 약속 장부와 같은 처리)
async function promiseTick() {
    if (!promiseClockOn() || !live()) return 0;
    const L = storyData(), s = st(), now = today(s); if (!L?.promises?.length || now === null) return 0;
    let n = 0, dirty = false;
    for (const p of L.promises) {
        if (p.state !== 'open' || !p.due) continue;
        if (!Number.isFinite(p.day)) { p.day = now; dirty = true; continue; }
        const d = promiseDday(p, s);
        if (d && d.left < 0) { await settlePromise(p.id, false); n++; if (p.to) app.gbNudge?.(p.to, `{{user}} broke a promise to ${p.to}: ${cut(p.text, 60)}`); toastr.warning(`약속 기한이 지났어요: ${cut(p.text, 40)}`, TITLE, { timeOut: 7000 }); }
    }
    if (dirty) saveMeta();
    return n;
}

// ───── 📚 연락처별 로어북 ─────
// 연락 속 인물이 답할 때 같이 읽을 로어북 항목을 연락처마다 골라 둔다. 고를 때 내용을 떠서 저장하므로(항목 6개 · 각 1200자까지) 답장 때는 읽기만 한다
export async function loreEntries() {
    const c = ctx(), out = []; if (!c.loadWorldInfo) return out;
    for (const book of await loreNames()) {
        try { for (const e of Object.values((await c.loadWorldInfo(book))?.entries ?? {})) { if (e.disable) continue; const head = String(e.comment || (Array.isArray(e.key) ? e.key.slice(0, 3).join(', ') : '')).trim(), body = String(e.content ?? '').replace(/\s+/g, ' ').trim(); if (head || body) out.push({ book, uid: e.uid, head, len: body.length }); } }
        catch (e) { ssNote('lore list', e); }
    }
    return out;
}
export async function setContactLore(name, picks = []) {
    const m = getMeta(), c = ctx(); if (!m || !name) return false;
    const got = [], books = new Map();
    for (const p of (Array.isArray(picks) ? picks : []).slice(0, 6)) {
        try {
            if (!books.has(p.book)) books.set(p.book, await c.loadWorldInfo(p.book));
            const e = Object.values(books.get(p.book)?.entries ?? {}).find(x => String(x.uid) === String(p.uid)); if (!e) continue;
            got.push({ book: p.book, uid: e.uid, head: cut(e.comment || (Array.isArray(e.key) ? e.key.slice(0, 3).join(', ') : ''), 60), body: cut(e.content, 1200) });
        } catch (e) { ssNote('lore pick', e); }
    }
    if (got.length) (m.ctLore ??= {})[name] = got; else if (m.ctLore) delete m.ctLore[name];
    saveMeta(); return got.length;
}
export const contactLoreOf = (name) => { const x = own(getMeta()?.ctLore, name); return Array.isArray(x) ? x : []; };
// 저장해 둔 내용을 원본에서 다시 떠 온다 (로어북을 고친 뒤)
export const refreshContactLore = (name) => setContactLore(name, contactLoreOf(name).map(x => ({ book: x.book, uid: x.uid })));
// ai.js의 aboutPerson이 부른다 → 답장 재료에 붙는 글 (없으면 빈 글)
app.contactLore = (who) => { const ls = contactLoreOf(who); return ls.length ? `Lore ${who} knows (from the world's lorebook):\n${ls.map(x => `- ${x.head ? `${x.head}: ` : ''}${x.body}`).join('\n')}` : ''; };

// ───── 🎁 취향 ↔ 선물 ─────
// 선물 이름이 그 사람의 「좋아하는 것 / 싫어하는 것」 글에 걸리면 호감 폭이 달라진다: 좋아함 ×2 · 싫어함 −1 · 그 밖 그대로
export const giftTasteOn = () => on('giftTaste');
// 한 글자 취향(술 · 꽃 · 차)은 선물 이름의 낱말이 그 글자이거나 그 글자로 시작할 때만 (「미술 도구」의 술 · 「기차표」의 차에 걸리지 않게)
const hits = (list, item) => { const it = norm(item), words = String(item ?? '').split(/\s+/).map(norm).filter(Boolean); if (!it) return false; return String(list ?? '').split(/[,，·/、;\n]+/).map(norm).filter(Boolean).some(x => (x.length >= 2 ? (it.includes(x) || (it.length >= 2 && x.includes(it))) : words.some(w => w === x || w.startsWith(x)))); };
export function giftReaction(who, item, s = st()) { const r = s?.data?.rel ? findBy(s.data.rel.user, who) : null; if (!r) return ''; return hits(r.dislikes, item) ? 'dislike' : hits(r.likes, item) ? 'like' : ''; }
// contact.js가 부른다 → 오를 호감 (끄면 undefined → 예전 계산 그대로)
// refund = 되돌릴 때의 계산 (그때는 방명록을 건드리지 않는다)
app.giftAff = (s, who, item, refund = false) => {
    if (!giftTasteOn()) return undefined;
    try { const k = giftReaction(who, item, s);
        // 📝 방명록과 엮기: 취향에 맞는(안 맞는) 선물을 받은 사람이 다음 방명록을 남기고 싶어 한다 (방명록이 꺼져 있으면 아무 일도 없음)
        if (!refund && k) app.gbNudge?.(who, k === 'like' ? `{{user}} just gave ${who} a gift ${who} loves: ${cut(item, 40)}` : `{{user}} just gave ${who} a gift ${who} dislikes: ${cut(item, 40)}`);
        return k === 'dislike' ? -1 : Math.max(1, Math.round((k === 'like' ? 4 : 2) * affMul(s))); } catch (e) { ssNote('gift taste', e); return undefined; }
};

// ───── 📊 이 채팅 크기 ─────
// 미트볼이 이 채팅 파일에 쓰고 있는 양 (글자 수 ≈ 바이트). 큰 칸부터 → { total, meta, msgs, top: [[칸, 크기]…] }
export function chatSize() {
    const m = getMeta(), len = (v) => { try { return JSON.stringify(v ?? null).length; } catch { return 0; } };
    const top = Object.entries(m ?? {}).map(([k, v]) => [k, len(v)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    let msgs = 0; for (const x of ctx().chat ?? []) { if (x?.extra?.[MODULE]) msgs += len(x.extra[MODULE]); for (const i of x?.swipe_info ?? []) if (i?.extra?.[MODULE]) msgs += len(i.extra[MODULE]); }
    const meta = len(m);
    return { total: meta + msgs, meta, msgs, top };
}

// ───── 🖼 상태 카드 그림 ─────
// 지금 상태를 한 장으로 (캔버스에 직접 그린다 — 화면 캡처가 아니라서 꾸민 모양은 안 따라간다. 색은 opts로 넘긴다)
export function cardData(s = st()) {
    if (!s) return null;
    const d = s.data, user = d.profile?.list?.find(p => p.role === 'user');
    return { title: s.core?.title ?? '', name: user?.name ?? '', date: stamp(s), time: d.calendar?.time ?? '', place: d.map?.here ?? '', cash: d.wallet ? `${fmtNum(d.wallet.cash)} ${d.wallet.currency}` : '',
        bars: (d.stats?.bars ?? []).slice(0, 4).map(b => ({ name: b.name, cur: b.cur, max: b.max, color: b.color || '' })),
        people: [...(d.rel?.user ?? [])].filter(r => !r.out).sort((a, b) => b.aff - a.aff).slice(0, 4).map(r => ({ name: r.name, aff: r.aff, trust: r.trust })), gear: equipped(s).map(e => `${e.slot}: ${e.name}`) };
}
export function cardCanvas({ width = 720, bg = '#ffffff', fg = '#1f2430', sub = '#6b7280', accent = '#e2557b', font = 'sans-serif' } = {}) {
    const c = cardData(); if (!c) return null;
    const rows = 2 + c.bars.length + (c.people.length ? c.people.length + 1 : 0) + (c.gear.length ? 1 : 0), H = 120 + rows * 34, cv = document.createElement('canvas'), k = 2;
    cv.width = width * k; cv.height = H * k; const g = cv.getContext('2d'); g.scale(k, k);
    g.fillStyle = bg; g.fillRect(0, 0, width, H); g.fillStyle = accent; g.fillRect(0, 0, width, 6);
    const text = (t, x, y, size, color, bold = false, align = 'left') => { g.font = `${bold ? '700 ' : ''}${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(String(t), x, y, width - 48); };
    text(c.name || c.title, 24, 48, 26, fg, true); text(c.title && c.name ? c.title : '', 24, 72, 14, sub);
    text([c.date, c.time, c.place].filter(Boolean).join(' · '), width - 24, 48, 14, sub, false, 'right'); text(c.cash, width - 24, 72, 16, fg, true, 'right');
    let y = 110;
    for (const b of c.bars) { const r = b.max > 0 ? clamp(b.cur / b.max, 0, 1) : 0; text(b.name, 24, y, 14, fg); text(`${b.cur}/${b.max}`, width - 24, y, 13, sub, false, 'right'); g.fillStyle = '#00000014'; g.fillRect(24, y + 8, width - 48, 8); g.fillStyle = b.color || accent; g.fillRect(24, y + 8, (width - 48) * r, 8); y += 34; }
    if (c.people.length) { y += 6; text('♥', 24, y, 14, accent, true); y += 28; for (const p of c.people) { text(p.name, 24, y, 15, fg); text(`♥ ${p.aff}  🤝 ${p.trust}`, width - 24, y, 14, sub, false, 'right'); y += 34; } }
    if (c.gear.length) text(c.gear.join(' · '), 24, y, 13, sub);
    return cv;
}
export function cardDownload(opts = {}) { const cv = cardCanvas(opts); if (!cv) return false; const a = document.createElement('a'); a.download = `${(cardData()?.name || 'meatball').replace(/[\\/:*?"<>|]/g, '_')}-status.png`; a.href = cv.toDataURL('image/png'); a.click(); return true; }

// ───── AI에게 가는 줄 (켠 것만 · 하나도 없으면 빈 글) ─────
export function extraInjection() {
    if (!live()) return '';
    const s = st(), out = [];
    try { const eq = equipped(s); if (eq.length) out.push(`EQUIPPED by {{user}} right now (worn or wielded — treat as present in the scene; anything not listed is carried, not worn): ${eq.map(e => `${e.slot}: ${e.name}${e.effect ? ` (${cut(e.effect, 40)})` : ''}`).join(' · ')}`); } catch (e) { ssNote('inject gear', e); }
    // 🎁 취향 도감과 엮기: 지금 걸친 물건이 누군가의 취향에 걸리면 그 사람이 알아본다
    try { const eq = equipped(s); if (eq.length) { const seen = []; for (const r of (s.data.rel?.user ?? []).filter(x => !x.out && (x.likes || x.dislikes))) for (const e of eq) { const k = giftReaction(r.name, e.name, s); if (k) seen.push(`${r.name} ${k === 'like' ? 'likes' : 'dislikes'} the ${e.name} {{user}} is wearing`); } if (seen.length) out.push(`TASTE: ${seen.slice(0, 3).join('; ')} — if they are present they may notice and react, once.`); } } catch (e) { ssNote('inject taste', e); }
    try { if (ambientOn()) { const a = ambientOf(s); if (a.tags.length) out.push(`CONDITIONS: it is ${a.tags.map(k => WX_EN[k]).join('; ')}. Let this shape the scene where it naturally would.`); } } catch (e) { ssNote('inject ambient', e); }
    try { out.push(...roomInject(s)); } catch (e) { ssNote('inject room', e); }
    try { if (promiseClockOn()) { const due = (storyData()?.promises ?? []).filter(p => p.state === 'open').map(p => [p, promiseDday(p, s)]).filter(x => x[1] && x[1].left <= 1); if (due.length) out.push(`PROMISE DEADLINES: ${due.map(([p, d]) => `${p.to ? `to ${p.to}: ` : ''}${cut(p.text, 80)} — ${d.left <= 0 ? 'due TODAY' : 'due tomorrow'}`).join(' | ')}. The other person may bring it up.`); } } catch (e) { ssNote('inject promise', e); }
    return out.length ? `[STATUS ADD-ONS — extra facts from the status extension. Follow quietly; never mention these notes]\n${out.join('\n')}` : '';
}
app.extraInject = extraInjection;

let tickTimer = null, inited = false;
export function initAddons() {
    if (inited) return; inited = true;
    const { eventSource, event_types: E } = ctx();
    if (E?.MESSAGE_RECEIVED) eventSource.on(E.MESSAGE_RECEIVED, (id, type) => {
        if (type === 'impersonate' || type === 'quiet' || !promiseClockOn()) return;
        clearTimeout(tickTimer); tickTimer = setTimeout(() => promiseTick().catch(e => ssNote('promise clock', e)), 700);
    });
}
