// 🧭 이야기 장치 (v2.8) — 선택 기능 묶음(전부 기본 끔): 끄면 주입 · 계산 · 저장이 모두 0
// 켰는지는 settings()[KEY[id]] === true 로만 본다. 채팅마다의 자료는 meta.story (없으면 만들지 않는다)
// 화면은 story_ui.js — 관계 · 메모 · 연락 · 운명(없으면 관리) 탭 아래에 붙는다
import { esc, app, ctx, settings, saveSettings, getMeta, saveMeta, norm, short, findBy, uid, clamp, nowTick, stamp, dateStr, TITLE, isActive, ready, relAxes, ssNote, clone, randInt } from './core.js';
import { stripStatus, recentChat, chatCharacters, addAdjust, commit } from './engine.js';
import { aiGenerate, aiJSON, P } from './prompts.js';
import { trendData } from './trend.js';

// ───── 장치 목록 (창의 순서 · 설명) ─────
export const DEVICES = [
    { id: 'loop', g: '되감기', icon: '🔁', name: '회귀자 모드', cost: '토큰 0~1줄', desc: '다시 생성 · 지운 횟수를 「회차」로 세요. 같은 장면을 여러 번 되돌리면 인물이 희미한 기시감을 느껴요.' },
    { id: 'ghost', g: '되감기', icon: '👻', name: '버린 스와이프의 유령', cost: '가끔 100토큰쯤', desc: '버려진 스와이프에서 있었던 일이 가끔 꿈 · 환청 · 말실수로 새어 나와요.' },
    { id: 'debt', g: '되감기', icon: '🎲', name: '운명의 빚', cost: '토큰 0~1줄', desc: '다시 생성할 때마다 빚이 1 쌓이고, 5가 되면 다음 답에서 작은 불운으로 갚아요.' },
    { id: 'know', g: '장부', icon: '🧠', name: '누가 뭘 아는지', cost: '매 턴 몇 줄', desc: '사실마다 「아는 사람」을 적어 두고, 모르는 인물이 아는 척하지 않게 AI에게 알려요.' },
    { id: 'promise', g: '장부', icon: '🤝', name: '약속 장부', cost: '매 턴 몇 줄', desc: '내가 한 약속 · 거짓말을 적어 둬요. 지키면 우정이 오르고 어기면 깎여요.' },
    { id: 'peek', g: '숨은 수치', icon: '👁', name: '속마음을 볼 때마다 눈치', cost: '토큰 0~1줄', desc: '프로필 › 속마음에서 속마음이 가려진 채로 와요. 눌러서 볼 때마다 「눈치」가 쌓여 인물이 의심하기 시작해요. (공략 탭의 눈치와 같은 수치)' },
    { id: 'scar', g: '숨은 수치', icon: '🩹', name: '관계의 흉터', cost: '매 턴 1~3줄', desc: '호감이 한 번에 크게 깎였던 일은 흉터로 남아, 비슷한 상황에서 더 예민하게 굴어요.' },
    { id: 'memory', g: '숨은 수치', icon: '🕳', name: '기억 왜곡', cost: 'AI 1회 + 매 턴 몇 줄', desc: '인물이 지난 일을 자기 식으로(유리하게 · 흐릿하게) 기억해요. 본편에서도 그 기억대로 말해요.' },
    { id: 'meddle', g: '침범', icon: '✍', name: '인물이 내 상태창에 손댄다', cost: '토큰 0~1줄', desc: '질투나 애정이 높은 인물이 가끔 낙서를 남기거나 · 자기 이름을 바꿔 놓거나 · 다른 사람을 차단해 놔요 (되돌릴 수 있어요).' },
    { id: 'glitch', g: '침범', icon: '🌫', name: '믿을 수 없는 상태창', cost: '토큰 0', desc: '정신력 · 이성이 낮거나 취하면 상태창 화면이 흔들리고 깨져 보여요 (계산은 그대로).' },
    { id: 'tension', g: '이야기', icon: '🎬', name: '긴장도 감독', cost: '토큰 0~1줄', desc: '평화가 길어지면 긴장이 차올라 사건을 부르고, 사건 뒤엔 쉬는 구간을 줘요.' },
    { id: 'realtime', g: '이야기', icon: '🕰', name: '현실 시간 연동', cost: '토큰 0~1줄', desc: '실제로 하루 넘게 안 오면 인물이 「어디 갔었어」로 반응해요.' },
    { id: 'mail', g: '이야기', icon: '📻', name: '채팅 간 우편', cost: '누를 때 AI 1회', desc: '이 채팅의 인물이 다른 채팅으로 편지를 부쳐요. 다른 채팅에서 온 편지는 여기 떨어뜨릴 수 있어요.' },
    { id: 'taste', g: '소소한 것', icon: '🎁', name: '취향 도감', cost: '토큰 0', desc: '인물별로 드러난 좋아하는 것 · 싫어하는 것을 모아 봐요.' },
];
// 장치 → 설정 키 (core.js의 기본값은 전부 false · 확장 설정의 「이야기 흐름」 「장부」 「관계」 「연락」에서 켠다)
export const KEY = { loop: 'loopMode', ghost: 'swipeGhost', debt: 'fateDebt', tension: 'tensionOn', realtime: 'realGap', glitch: 'glitchView', know: 'ledgerKnow', promise: 'ledgerPromise', peek: 'peekCost', scar: 'relScar', memory: 'memoryDrift', meddle: 'meddleOn', taste: 'tasteBook', mail: 'crossMail' };
export const storyOn = (id) => settings()[KEY[id]] === true;
const anyOn = () => { const set = settings(); return Object.values(KEY).some(k => set[k] === true); };
// 이 채팅의 이야기 장치 자료 (create = 없으면 만든다)
export function storyData(create = false) { const m = getMeta(); if (!m) return null; if (create) m.story ??= {}; return m.story ?? null; }
export const storySave = () => { saveMeta(); app.refreshNow?.(); };
const st = () => app.current?.state ?? null;
const live = () => { try { return isActive() && ready() && !!st(); } catch { return false; } };
export const people = () => (st()?.data?.rel?.user ?? []).filter(r => !r.out);
const chat = () => ctx().chat ?? [];
const chatId = () => { try { return String(ctx().getCurrentChatId?.() ?? ''); } catch { return ''; } };
const hash = (t) => { let h = 2166136261; for (const c of String(t)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const cut = (t, n) => short(String(t ?? '').replace(/\s+/g, ' ').trim(), n);
// 이름을 열쇠로 쓰는 그릇에서 읽기: 이름이 「constructor」 「toString」이면 물려받은 함수가 읽혀 화면이 죽었다 → 제 것만 읽는다
const own = (o, k) => (o && typeof o === 'object' && Object.hasOwn(o, k) ? o[k] : undefined);

// ───── 🔁 회차 ─────
export function loopInfo() {
    const c = chat(); let total = storyData()?.loopDel ?? 0, top = { n: 0, i: -1 };
    c.forEach((m, i) => { if (m.is_user || m.is_system) return; const n = Math.max(0, (m.swipes?.length ?? 1) - 1); total += n; if (n > top.n) top = { n, i }; });
    let last = c.length - 1; while (last >= 0 && (c[last].is_user || c[last].is_system)) last--;
    return { total, top, scene: last >= 0 ? Math.max(0, (c[last].swipes?.length ?? 1) - 1) : 0 };
}
// ───── 👻 버린 스와이프 한 토막 ─────
function pickGhost() {
    const c = chat(), pool = [];
    for (let i = Math.max(0, c.length - 40); i < c.length - 1; i++) {
        const m = c[i]; if (m.is_user || m.is_system || (m.swipes?.length ?? 0) < 2) continue;
        m.swipes.forEach((t, k) => { if (k !== m.swipe_id && typeof t === 'string' && t.trim().length > 80) pool.push(t); });
    }
    if (!pool.length) return null;
    const t = stripStatus(pool[randInt(0, pool.length - 1)]).replace(/\s+/g, ' ').trim();
    const a = Math.max(0, Math.floor(t.length / 3) - 20);
    return t.slice(a, a + 260);
}
// ───── 🩹 흉터: 한 번에 크게 깎인 곳 ─────
export function findScars() {
    let d; try { d = trendData(); } catch (e) { ssNote('story scar', e); return []; }
    const AX = st()?.data?.rel ? relAxes(st().data.rel) : { aff: '애정', trust: '우정' }, out = [];
    for (const [axis, o] of [['aff', d.aff], ['trust', d.trust]]) for (const name of Object.keys(o)) {
        let best = null; const a = o[name];
        for (let i = 1; i < a.length; i++) { if (a[i] === null || a[i - 1] === null) continue; const drop = a[i - 1] - a[i]; if (drop >= 10 && (!best || drop > best.drop)) best = { name, axis: AX[axis], drop, at: d.xs[i] }; }
        if (best) out.push(best);
    }
    return out.sort((x, y) => y.drop - x.drop).slice(0, 5);
}
// 🗝 공략 탭 (v2.8 · 설정 guideOn · 기본 켬): 인물이 직접 일러 주는 조언 + 비밀 게이지. 볼 때마다 「눈치」가 오른다 (토큰은 누를 때만)
export const guideOn = () => settings().guideOn !== false;
// 비밀 네 단계: [열쇠, 색 이름, 뜻, 깔 때 오르는 눈치, AI에게 가는 이름]
export const SECRET_LV = [['g', '초록', '나만 모르는 비밀 — 주변 사람들은 알 수도 있어요', 1, 'green'], ['y', '노랑', '몇 사람만 아는 비밀', 2, 'yellow'], ['r', '빨강', '본인만 아는 비밀', 3, 'red'], ['k', '검정', '말하느니 죽음을 택할 비밀', 5, 'black']];
export const susOf = (name) => Number(own(storyData()?.sus, name)) || 0;
export const guideOf = (who) => { const g = own(storyData()?.guide, who); return g && typeof g === 'object' ? g : null; };
export const secretsOf = (who) => { const x = own(storyData()?.secrets, who); return Array.isArray(x) && x.length ? x : null; };
export function openSecret(who, lv) { const x = secretsOf(who)?.find(y => y.lv === lv); if (!x || x.open) return false; x.open = true; addSus(who, SECRET_LV.find(y => y[0] === lv)?.[3] ?? 1); return true; }
// 👁 엿봤다 (extra.js의 속마음 엿보기 · 공략 · 비밀 까 보기)
export function addSus(name, n = 1) { if (!(storyOn('peek') || guideOn()) || !name) return; const L = storyData(true); if (!L) return; (L.sus ??= {})[name] = (Number(own(L.sus, name)) || 0) + n; saveMeta(); }
app.storyPeek = addSus;

// ───── 🌫 화면 깨짐 ─────
export function applyGlitch() {
    const b = document.body; if (!b) return;
    let low = 1, drunk = 0;
    if (storyOn('glitch') && live()) for (const x of st().data.stats?.bars ?? []) {
        const r = x.max > 0 ? x.cur / x.max : 1;
        if (/정신|이성|멘탈|sanity|\bsan\b|mental/i.test(x.name)) low = Math.min(low, r);
        if (/취기|취함|만취|drunk|intox/i.test(x.name)) drunk = Math.max(drunk, r);
    }
    b.classList.toggle('ss-glitch', low < 0.3); b.classList.toggle('ss-glitch-hard', low < 0.12); b.classList.toggle('ss-drunk', drunk > 0.6);
}

// ───── ✍ 손대기 ─────
const SCRIBBLES = ['다른 사람 말고 나만 봐. — {n}', '오늘 누구 만났어? — {n}', '{n} 다녀감 ♥', '이거 보면 연락해. 바로. — {n}', '잊지 마. 넌 내 사람이야. — {n}', '왜 답이 늦어? — {n}'];
async function rollMeddle(L) {
    L.meddleNow = null;
    const cand = people().filter(r => r.jealous >= 50 || r.aff >= 75); if (!cand.length || Math.random() > 0.1) return;
    const r = cand[randInt(0, cand.length - 1)], kinds = ['memo', 'nick'];
    const ct = st().data.contact, rival = people().filter(x => x.name !== r.name && x.aff >= 30).sort((a, b) => b.aff - a.aff)[0];
    if (r.jealous >= 70 && rival && ct && findBy(ct.contacts, rival.name) && !findBy(ct.contacts, rival.name).blocked) kinds.push('block');
    const kind = kinds[randInt(0, kinds.length - 1)], e = { id: uid(), who: r.name, kind, date: stamp(st()) };
    if (kind === 'memo') e.text = SCRIBBLES[randInt(0, SCRIBBLES.length - 1)].replace('{n}', r.name);
    if (kind === 'nick') { e.text = `♥ ${r.name} ♥`; (L.nick ??= {})[r.name] = e.text; }
    if (kind === 'block') { const nd = clone(ct); findBy(nd.contacts, rival.name).blocked = true; await commit('contact', nd, ''); e.text = rival.name; }
    L.meddle = [...(L.meddle ?? []), e].slice(-20); L.meddleNow = e;
    toastr.warning(kind === 'memo' ? `${esc(r.name)}이(가) 상태창에 낙서를 남겼어요: 「${esc(e.text)}」` : kind === 'nick' ? `${esc(r.name)}이(가) 자기 이름을 「${esc(e.text)}」(으)로 바꿔 놨어요.` : `${esc(r.name)}이(가) ${esc(e.text)}의 연락처를 차단해 놨어요.`, TITLE, { timeOut: 9000 });
}
export async function undoMeddle(id) {
    const L = storyData(); const e = L?.meddle?.find(x => x.id === id); if (!e) return;
    if (e.kind === 'nick' && L.nick) delete L.nick[e.who];
    if (e.kind === 'block') { const ct = st()?.data?.contact; if (ct && findBy(ct.contacts, e.text)) { const nd = clone(ct); findBy(nd.contacts, e.text).blocked = false; await commit('contact', nd, ''); } }
    L.meddle = L.meddle.filter(x => x.id !== id); storySave();
}

// ───── 확장 AI를 부르는 것들 ─────
function about(who) {
    const d = st().data, prof = d.profile ? findBy(d.profile.list, who) : null, card = chatCharacters().find(ch => norm(ch.name) === norm(who)), rel = d.rel ? findBy(d.rel.user, who) : null;
    return [`World: ${st().core.title} — ${short(st().core.summary, 400)}`, d.calendar ? `Now: ${dateStr(d.calendar)} ${d.calendar.time}` : '',
        prof ? `About ${who}: ${short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, 1500)}` : card ? `About ${who}: ${short(card.description, 1200)}` : '',
        rel ? `Relationship with {{user}}: ${rel.label || '-'} · ${relAxes(d.rel).aff} ${rel.aff} · ${relAxes(d.rel).trust} ${rel.trust} · ${rel.memo}` : '',
        `Recent story:\n${recentChat(8)}`].filter(Boolean).join('\n\n');
}
const text = async (sys, body, max = 700) => stripStatus(await aiGenerate('peek', sys, body, max)).trim();
const keep = (L, key, who, v, n = 8) => { const box = (L.ai ??= {})[key] ??= {}; const old = own(box, who); box[who] = [...(Array.isArray(old) ? old : []), { ...v, date: stamp(st()) }].slice(-n); };
export const kept = (key, who) => { const x = own(own(storyData()?.ai, key), who); return Array.isArray(x) ? x : []; };
export const AI = {
    // 🗝 공략: 지금 상황에서 호감이 오를 것 3 · 떨어질 것 3 (아이템 · 행동 · 말) — 그 인물이 직접 쓴 말투로. 받을 때마다 눈치 +1
    guide: async (who) => {
        const j = await aiJSON('peek', P('story.guide', { who }), about(who), 800);
        // 모델마다 모양이 조금씩 다르다: 한 겹 더 싸서 주거나 · 글만 늘어놓거나 · 종류를 한국어/대문자로 적는 것까지 받는다
        const src = Array.isArray(j?.up) || Array.isArray(j?.down) ? j : (Object.values(j ?? {}).find(v => v && typeof v === 'object' && (Array.isArray(v.up) || Array.isArray(v.down))) ?? j ?? {});
        const kindOf = (k) => { const t = String(k ?? '').trim().toLowerCase(); return /^(item|gift|thing|object)s?$|아이템|물건|선물/.test(t) ? 'item' : /^(say|line|speech|word|talk|dialogue)s?$|말|대사|대화/.test(t) ? 'say' : 'act'; };
        const pick = (a) => (Array.isArray(a) ? a : []).map(x => (typeof x === 'string' ? { k: '', t: cut(x, 160) } : { k: kindOf(x?.kind ?? x?.type), t: cut(typeof x?.text === 'string' || typeof x?.text === 'number' ? x.text : x?.advice ?? x?.content ?? '', 160) })).filter(x => x.t).slice(0, 3);
        const up = pick(src.up), down = pick(src.down); if (!up.length && !down.length) throw new Error('빈 답이 왔어요');
        const L = storyData(true); (L.guide ??= {})[who] = { up, down, note: cut(typeof src.note === 'string' ? src.note : '', 140), date: stamp(st()), at: chat().length }; addSus(who, 1); storySave();
    },
    // 🔒 비밀 네 단계 만들기 (가려 둔 채로 저장 — 깔 때마다 눈치가 오른다)
    secrets: async (who) => {
        const j = await aiJSON('peek', P('story.secrets', { who }), about(who), 800);
        // 한 겹 더 싼 답 · 배열 · 한국어 열쇠 · {text} 꼴까지 받는다
        const KO = { green: '초록', yellow: '노랑', red: '빨강', black: '검정' }, has = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(KO).some(k => own(o, k) !== undefined || own(o, KO[k]) !== undefined);
        const src = has(j) ? j : (Object.values(j ?? {}).find(v => has(v) || (Array.isArray(v) && v.length >= 2)) ?? j ?? {});
        const val = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : v && typeof v === 'object' ? (Object.values(v).find(x => typeof x === 'string') ?? '') : '');
        const list = SECRET_LV.map(([lv, , , , key], i) => ({ lv, text: cut(val(Array.isArray(src) ? src[i] : own(src, key) ?? own(src, KO[key])), 220), open: false })).filter(x => x.text);
        if (list.length < 2) throw new Error('비밀을 만들지 못했어요');
        const L = storyData(true); (L.secrets ??= {})[who] = list; storySave();
    },
    // 🕳 기억 왜곡
    memory: async (who) => { const t = await text(P('story.memory', { who }), about(who), 600); const L = storyData(true); keep(L, 'memory', who, { t: cut(t, 700) }, 1); storySave(); },
    // 📻 다른 채팅으로 편지
    mail: async (who) => { const t = await text(P('story.mail', { who }), about(who), 500); const box = settings().crossMailBox ??= []; box.push({ id: uid(), chat: chatId(), who, world: cut(st().core.title, 60), text: cut(t, 700), at: Date.now() }); settings().crossMailBox = box.slice(-30); saveSettings(); },
};
// 🧠🤝 장부 정리 (켠 장부만 · AI 1회)
export async function ledgerScan() {
    if (!live()) return 0;
    const want = ['know', 'promise'].filter(storyOn); if (!want.length) return 0;
    const L = storyData(true), have = [...(L.facts ?? []).map(x => x.text), ...(L.promises ?? []).map(x => x.text)];
    const sys = P('story.ledger', { parts: [want.includes('know') ? '"facts":[{"text":"…","knows":["Name"]}] — secrets or notable events where it matters WHO knows: list only the characters who witnessed it or were told ({{user}} counts as "{{user}}")' : '', want.includes('promise') ? '"promises":[{"text":"…","to":"Name","due":"when, or empty"}] — commitments or lies {{user}} made to someone' : ''].filter(Boolean).join('; ') });
    const j = await aiJSON('analyze', sys, [`People: ${people().map(r => r.name).join(', ') || '-'}`, `Already listed (do not repeat):\n${have.map(x => `- ${x}`).join('\n') || '(none)'}`, `Recent story:\n${recentChat(14)}`].join('\n\n'), 900);
    const fresh = (x) => { const t = cut(x?.text, 120); return t && !have.some(h => norm(h) === norm(t)) ? t : ''; };
    let n = 0; const at = chat().length;
    if (want.includes('know')) for (const f of (Array.isArray(j.facts) ? j.facts : []).slice(0, 4)) { const t = fresh(f); if (t) { (L.facts ??= []).push({ id: uid(), text: t, knows: (Array.isArray(f.knows) ? f.knows : []).map(x => cut(x, 30)).filter(Boolean).slice(0, 8), at }); n++; } }
    if (want.includes('promise')) for (const f of (Array.isArray(j.promises) ? j.promises : []).slice(0, 4)) { const t = fresh(f); if (t) { (L.promises ??= []).push({ id: uid(), text: t, to: cut(f.to, 30), due: cut(f.due, 40), state: 'open', at }); n++; } }
    for (const k of ['facts', 'promises']) if (L[k]?.length > 40) L[k] = L[k].slice(-40);
    L.since = 0; storySave(); return n;
}
// 약속 지킴 · 어김 → 우정
export async function settlePromise(id, kept) {
    const L = storyData(); const p = L?.promises?.find(x => x.id === id); if (!p || p.state !== 'open') return;
    p.state = kept ? 'kept' : 'broken';
    const r = p.to ? findBy(people(), p.to) : null;
    if (r) await addAdjust({ ops: [['trust', `${r.name} ${kept ? '+2' : '-4'}`]], label: `🤝 ${r.name}와(과)의 약속 ${kept ? '지킴' : '어김'}: ${short(p.text, 40)}` });
    storySave();
}

// ───── AI에게 가는 글 (켠 장치만 · 하나도 없으면 빈 글) ─────
export function storyInjection() {
    const g = guideOn();
    if ((!anyOn() && !g) || !live()) return '';
    const L = storyData() ?? {}, out = [], ps = people();
    if (storyOn('loop')) { const n = loopInfo().scene; if (n >= 2) out.push(`DÉJÀ VU: {{user}} has already lived this exact moment ${n} times and rewound it. No character can know that, but one of them may feel a faint déjà vu — a pause, a half-remembered line, "have we done this before?" — once, subtly. Do not explain it.`); }
    if (storyOn('ghost') && L.ghost) out.push(`ECHO OF A DISCARDED TIMELINE: in a version of events that never happened, this took place: «${L.ghost}». It may leak into this reply once as something unreal — a dream fragment, a stray image, a slip of the tongue that the speaker cannot explain. Never treat it as fact.`);
    if (storyOn('debt') && L.debtDue) out.push('FATE COLLECTS: {{user}} has been bending fate too often. In this reply something small but unlucky happens to {{user}} — bad timing, a mishap, a minor loss. Proportionate, never catastrophic, and woven into the scene.');
    if (storyOn('know') && L.facts?.length) out.push(`KNOWLEDGE LEDGER — who knows what. A character NOT listed for a fact does not know it and must not act, hint or react as if they do, until they learn it in the story:\n${L.facts.slice(-10).map(f => `- ${f.text} — known to: ${f.knows.join(', ') || 'no one but {{user}}'}`).join('\n')}`);
    if (storyOn('promise')) { const open = (L.promises ?? []).filter(p => p.state === 'open').slice(-6); if (open.length) out.push(`PROMISES {{user}} made (the other person remembers; keeping them builds trust, breaking them or being caught lying costs it):\n${open.map(p => `- ${p.to ? `to ${p.to}: ` : ''}${p.text}${p.due ? ` (by ${p.due})` : ''}`).join('\n')}`); }
    if (storyOn('peek') || g) { const sus = Object.entries(L.sus ?? {}).filter(([n, v]) => v >= 3 && findBy(ps, n)), hot = sus.filter(([, v]) => v >= 8).map(([n]) => n);
        if (sus.length) out.push(`SUSPICION: ${sus.map(([n]) => n).join(', ')} ${sus.length > 1 ? 'have' : 'has'} begun to feel that {{user}} somehow knows their private thoughts — a little guarded, may test {{user}} or ask about it.${hot.length ? ` ${hot.join(', ')} ${hot.length > 1 ? 'are' : 'is'} now almost sure of it: wary, hurt or angry, and may confront {{user}} directly.` : ''}`); }
    // 🔒 비밀 (공략 탭에서 만든 것만 · 「본편에도 알리기」를 끄면 안 감)
    if (g && L.secTell !== false) { const tell = ps.map(r => [r.name, L.secrets?.[r.name] ?? []]).filter(x => x[1].length).slice(0, 3);
        if (tell.length) out.push(`SECRETS (canon facts about these characters. "found out" = {{user}} has learned it, in a way the character does not know about. "hidden" = {{user}} does not know: the character guards it and never reveals it unprompted — the heavier the tier, the harder they guard it; "black" they would rather die than confess):\n${tell.map(([n, list]) => `- ${n}: ${list.map(x => `[${SECRET_LV.find(y => y[0] === x.lv)?.[4] ?? x.lv}, ${x.open ? 'found out' : 'hidden'}] ${cut(x.text, 130)}`).join(' / ')}`).join('\n')}`); }
    if (storyOn('scar') && L.scars?.length) out.push(`SCARS (old hurts that never fully healed — in a similar situation the person reacts more sharply and forgives more slowly, even if things are good now):\n${L.scars.map(x => `- ${x.name}: ${x.axis} once fell by ${x.drop} at a single moment`).join('\n')}`);
    if (storyOn('memory')) { const ms = ps.map(r => [r.name, kept('memory', r.name).at(-1)?.t]).filter(x => x[1]).slice(0, 3); if (ms.length) out.push(`HOW THEY REMEMBER IT (each person's own version — it may differ from what really happened, and they believe it):\n${ms.map(([n, t]) => `- ${n}: ${cut(t, 300)}`).join('\n')}`); }
    if (storyOn('meddle') && L.meddleNow) { const e = L.meddleNow; out.push(`MEDDLING: ${e.who} secretly ${e.kind === 'memo' ? `left a note in {{user}}'s things: «${e.text}»` : e.kind === 'nick' ? `changed their own name in {{user}}'s contacts to «${e.text}»` : `blocked ${e.text} on {{user}}'s phone`}. {{user}} may have noticed. ${e.who} can be confronted about it and reacts in character.`); }
    if (storyOn('tension')) { if (L.tFire) out.push('PACING: it has been calm for a long while. Introduce a real complication in this reply — an interruption, bad news, a rival, a discovery — something that fits the scene and demands a reaction.'); else if (L.calm > 0) out.push('PACING: a big moment just passed. Keep this reply a breather — quieter, room for the characters to react and talk.'); }
    if (storyOn('realtime') && L.seen) { const days = (Date.now() - L.seen) / 864e5; if (days >= 0.85) out.push(`ABSENCE: {{user}} has been gone for about ${days < 1.5 ? 'a day' : `${Math.round(days)} days`}. A character who would notice may remark on it once ("where have you been?"), in a way that fits the story.`); }
    if (storyOn('mail') && L.drop) out.push(`A LETTER FROM ANOTHER WORLD has turned up near {{user}} — from «${L.drop.who}» of «${L.drop.world}»: «${cut(L.drop.text, 400)}». Someone finds it or it is simply there; nobody knows how it arrived.`);
    return out.length ? `[STORY DEVICES — extra direction from the status extension. Follow quietly; never mention these notes]\n${out.join('\n')}` : '';
}
app.storyInject = storyInjection;
// 🌐 화면 번역(영어로 저장 · 화면만 한국어)이 이야기 장치 · 공략의 글도 번역하도록: 화면에 나오는 글을 모아 준다 (예전엔 상태창 칸의 글만 모아서 이쪽은 영어로 남았음)
app.storyTexts = () => {
    const out = [], add = (t) => { if (typeof t === 'string' && t.trim()) out.push(t); };
    try {
        const L = storyData(); if (!L) return out;
        for (const f of L.facts ?? []) add(f.text);
        for (const p of L.promises ?? []) { add(p.text); add(p.due); }
        for (const list of Object.values(L.ai?.memory ?? {})) for (const x of list ?? []) add(x.t);
        for (const gd of Object.values(L.guide ?? {})) { for (const x of [...(gd.up ?? []), ...(gd.down ?? [])]) add(x.t); add(gd.note); }
        for (const list of Object.values(L.secrets ?? {})) for (const x of list ?? []) if (x.open) add(x.text);
        add(L.ghost); for (const e of L.meddle ?? []) if (e.kind === 'memo') add(e.text);
        const me = chatId(); for (const m of settings().crossMailBox ?? []) if (m.chat !== me) { add(m.text); add(m.world); }
    } catch (e) { ssNote('story texts', e); }
    return out;
};
app.storyChanged = () => applyGlitch(); // 확장 설정에서 장치를 켜고 끌 때

// ───── 이벤트: AI 답을 받은 뒤 한 번 ─────
// (실리가 「답 받음」을 알릴 때는 아직 상태가 새 답을 반영하기 전이라, 조금 뒤에 — 상태를 새로 계산한 다음 — 돈다)
let replyTimer = null;
function onReply(id, type) {
    if (type === 'impersonate' || type === 'quiet' || !anyOn()) return;
    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => afterReply().catch(e => ssNote('story reply', e)), 150);
}
async function afterReply() {
    if (!anyOn()) return;
    try { app.refreshNow?.(); } catch (e) { ssNote('story refresh', e); }
    if (!live()) return;
    const L = storyData(true); if (!L) return;
    L.seen = Date.now();
    if (storyOn('ghost')) L.ghost = Math.random() < 0.12 ? pickGhost() : null; else delete L.ghost;
    if (storyOn('debt')) { if (L.debtDue) L.debt = Math.max(0, (L.debt ?? 0) - 5); L.debtDue = (L.debt ?? 0) >= 5; }
    if (storyOn('tension')) { if (L.tFire) { L.t = 15; L.calm = 3; L.tFire = false; } else { L.calm = Math.max(0, (L.calm ?? 0) - 1); L.t = Math.min(100, (L.t ?? 0) + (L.tStep ?? 7)); if (L.t >= 100) L.tFire = true; } }
    if (storyOn('scar')) L.scars = findScars();
    if (L.drop) delete L.drop;
    try { if (storyOn('meddle')) await rollMeddle(L); else delete L.meddleNow; } catch (e) { ssNote('story meddle', e); }
    applyGlitch();
    const every = Number(L.scanEvery) || 0; L.since = (L.since ?? 0) + 1;
    saveMeta();
    try { app.refreshNow?.(); } catch (e) { ssNote('story refresh', e); } // 방금 정한 것(유령 · 빚 · 긴장 …)이 다음 답의 안내에 실리게
    if (every > 0 && L.since >= every && ['know', 'promise'].some(storyOn)) ledgerScan().catch(e => ssNote('story scan', e));
}
export function initStory() {
    const { eventSource, event_types: E } = ctx();
    const on = (name, fn) => { if (E[name]) eventSource.on(E[name], (...a) => { try { const r = fn(...a); r?.catch?.(e => ssNote(`story ${name}`, e)); } catch (e) { ssNote(`story ${name}`, e); } }); };
    on('MESSAGE_RECEIVED', onReply);
    on('MESSAGE_DELETED', () => { if (storyOn('loop') && live()) { const L = storyData(true); L.loopDel = (L.loopDel ?? 0) + 1; saveMeta(); } });
    on('GENERATION_STARTED', (type, _o, dry) => { if (dry || !storyOn('debt') || !live() || (type !== 'swipe' && type !== 'regenerate')) return; const L = storyData(true); L.debt = (L.debt ?? 0) + 1; saveMeta(); });
    on('CHAT_CHANGED', () => setTimeout(applyGlitch, 800));
    setTimeout(applyGlitch, 1500);
}
