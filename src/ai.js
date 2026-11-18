// 확장 AI가 하는 일 (모두 토큰이 드는 호출)
import { letterMode, instantLetter, contactSimple, app, ctx, settings, getMeta, MOD, NORM, normalize, ensureLove, LOVE_AXES, relAxes, fixLoveLadder, short, findBy, norm, dateStr, stamp, MODULE, LOG, DIFFS, diffOf, CONTACT_MODES, uid, msgText, fmtNum, playOf, normPlay, ssWarn, dayIndex, heroIsUser, userName } from './core.js';
import { P, aiGenerate, parseJSON, aiJSON } from './prompts.js';
// 긴 글은 앞 · 뒤를 반씩 (v2.9.1 · 예전엔 앞 4,000자만 읽어 답 끝의 사건 · 이동 · 시간을 놓쳤다 — 사건은 대개 답 끝에 있다)
const headTail = (t, n) => { const x = String(t ?? ''); if (x.length <= n) return x; const h = Math.floor(n / 2); return `${x.slice(0, h)}\n[…]\n${x.slice(-(n - h))}`; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
import { SCHEMA, modOn, parseNum } from './core.js';
import { compute, buildInjection, tagKeysFor, extractOps, stripStatus, recentChat, chatCharacters, setDrawer, MIND_FMT } from './engine.js';
import { finJSON, finText, finLines } from './translate.js';

const tasteLine = () => { const t = app.current?.state?.data?.music?.taste || settings().musicTaste; return t ? ` (the user likes: ${t})` : ''; };
// 플레이 방식 안내 (생성 때마다 한 줄)
export function playLine(p = playOf()) {
    const world = p.cardIsWorld ? P('gen.play.world') : '';
    const cast = p.cast.length ? ` — cast: ${p.cast.join(', ')}` : '';
    return P(p.ensemble ? 'gen.play.ensemble' : heroIsUser(p) ? 'gen.play.director.self' : `gen.play.${p.mode}`, { world, cast, hero: p.hero || 'the main character' });
}
const diffLine = () => `Difficulty: ${DIFFS[diffOf()].name} — ${P(`diff.${diffOf()}`)}`;
const contactModeLine = (mode) => (mode && mode !== 'auto' ? `Use mode "${mode}" (${CONTACT_MODES[mode]?.name}).` : 'Choose mode: phone for modern/sci-fi worlds with phones, instant for magic/radio/telepathy, letter for worlds without phones (letters take days).');

// v2.7.2 안전망: 생성 결과의 설명 글이 길면 문장 단위로 줄인다 (AI가 만든 결과만 · 내가 직접 쓴 글은 안 건드림)
const BRIEF_KEYS = new Set(['desc', 'summary', 'memo', 'unlock', 'note', 'likes', 'dislikes', 'concern', 'label']);
function brief(s, max) {
    if (typeof s !== 'string' || s.length <= max) return s;
    const parts = s.replace(/\s*\n+\s*/g, ' ').match(/[^.!?。]+[.!?。]+["'」』)]*\s*|[^.!?。]+$/g) ?? [s];
    let out = '';
    for (const p of parts) { if (out && (out + p).trim().length > max) break; out += p; }
    out = out.trim();
    return out.length > max * 1.3 ? short(out, max) : out; // 첫 문장부터 아주 길면 글자로 자름
}
export function trimGen(x, mod, depth = 0) {
    const k = settings().ssGenLang === 'ko' ? 1 : 1.8; // 영어는 같은 뜻이 더 길다
    if (Array.isArray(x)) return x.map(v => trimGen(v, mod, depth + 1));
    if (!x || typeof x !== 'object' || depth > 6) return x;
    const o = {};
    for (const [key, v] of Object.entries(x)) {
        // 대략 한 문장: 설명 70자 · 요약 80자 · 프로필 항목 60자 · 세계 요약 240자 (영어는 ×1.8)
        const lim = mod === 'core' && key === 'summary' ? 240 : key === 'label' ? 30 : key === 'summary' ? 80 : 70;
        if (typeof v === 'string' && BRIEF_KEYS.has(key)) o[key] = brief(v, Math.round(lim * k));
        else if (typeof v === 'string' && key === 'v' && mod === 'profile') o[key] = brief(v, Math.round(60 * k)); // 프로필 항목 값
        else o[key] = typeof v === 'object' ? trimGen(v, mod, depth + 1) : v;
    }
    return o;
}
export async function genModule(mod, { sources, core, instruction, profileMode, current, extra, contactMode, feature = 'gen', play, detectPlay }) {
    const L = [];
    if (sources) L.push(`=== SOURCES ===\n${sources}`);
    if (!detectPlay) L.push(`=== PLAY STYLE ===\n${playLine(play ? normPlay(play) : undefined)}`);
    if (core && mod !== 'core') L.push(`=== WORLD CORE (already decided) ===\n${JSON.stringify(core)}`);
    if (extra) L.push(extra);
    if (instruction) L.push(`=== USER'S DIRECTION (highest priority) ===\n${instruction}`);
    L.push(`=== TASK ===\nPanel: ${mod === 'core' ? 'world core' : MOD[mod].name} — ${P(`gen.${mod}`, { difficulty: diffLine(), contactMode: contactModeLine(contactMode), taste: tasteLine() })}${mod === 'profile' ? `\nMODE: ${profileMode ?? 'minimal'}` : ''}`);
    if (current) L.push(`=== CURRENT PANEL DATA ===\n${JSON.stringify(current)}`);
    L.push(`=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}${detectPlay ? `\nALSO add a key "play": ${PLAY_SHAPE} — decide how this setup is played (see sources).` : ''}`);
    const obj = await finJSON(trimGen(await aiJSON(feature, P('gen.system'), L.join('\n\n')), mod), core); // 줄인 다음 번역 (화면 번역 사전이 줄인 글과 맞게)
    if (mod === 'core') { const c = NORM.core(obj); if (detectPlay && obj.play) Object.defineProperty(c, 'play', { value: normPlay(obj.play), enumerable: false }); return c; }
    if (mod === 'profile') obj.mode = profileMode ?? current?.mode ?? app.current?.state?.data?.profile?.mode ?? 'minimal'; // 프로필 모드는 사용자가 고른 것만 — AI가 답에 「detailed」를 적어 와도 바꾸지 않는다 (기본 = 최소)
    if (mod === 'contact' && contactMode && contactMode !== 'auto') obj.mode = contactMode;
    const out = mod === 'core' ? NORM.core(obj) : normalize(mod, obj);
    if (mod === 'rel') { if (!out.affName) Object.assign(out, LOVE_AXES); fixLoveLadder(out); } // 새로 만드는 관계는 애정 · 우정 (v2.7)
    if (mod === 'wallet' && out.fx) out.fx = { unit: '', rate: 0 }; // 💱 현실 돈 환산은 내가 켜는 것 (AI가 「JPY 1」 같은 걸 넣어 금액마다 「≈ 45,000 JPY」가 붙었음 · v2.7.19)
    return mod === 'rel' ? ensureLove(out) : out; // 연인 단계는 늘 있게
}

// 묶음 생성: 관련 칸 여러 개를 한 번에 (재료를 한 번만 보내서 입력 토큰↓, 칸끼리 일관성↑)
// 빠지거나 깨진 칸은 결과에서 빠지고, 부르는 쪽이 그 칸만 따로 다시 받는다.
export const GEN_GROUPS = [
    ['profile', 'rel', 'contact'],
    ['wallet', 'shop', 'home'],
    ['map', 'calendar', 'quest'],
    ['stats', 'dice', 'custom'],
    ['ach', 'memo', 'fate'],
    ['news', 'gossip', 'board', 'sns'],
];
export async function genGroup(mods, { sources, core, instruction, profileMode, contactMode, feature = 'wizard', play }) {
    if (mods.length === 1) return { [mods[0]]: await genModule(mods[0], { sources, core, instruction, profileMode, contactMode, feature, play }) };
    const L = [];
    if (sources) L.push(`=== SOURCES ===\n${sources}`);
    L.push(`=== PLAY STYLE ===\n${playLine(play ? normPlay(play) : undefined)}`);
    L.push(`=== WORLD CORE (already decided) ===\n${JSON.stringify(core)}`);
    if (instruction) L.push(`=== USER'S DIRECTION (highest priority) ===\n${instruction}`);
    L.push(`=== TASK ===\n${P('gen.batch', { n: mods.length })}`);
    for (const mod of mods) {
        L.push(`--- PANEL "${mod}" (${MOD[mod].name}) ---\n${P(`gen.${mod}`, { difficulty: diffLine(), contactMode: contactModeLine(contactMode) })}${mod === 'profile' ? `\nMODE: ${profileMode ?? 'minimal'}` : ''}\nJSON shape: ${SCHEMA[mod]}`);
    }
    L.push(`=== OUTPUT ===\nONE JSON object with exactly these keys: {${mods.map(m => `"${m}": {…}`).join(', ')}}`);
    const max = Math.min(Math.max(Number(settings().aiMaxTokens) || 6000, 2500 * mods.length), mods.length > 4 ? 32000 : 24000); // 큰 묶음은 32K까지 (생각하는 모델은 생각에도 한도를 쓴다 · 32,768을 넘기면 거부하는 API가 있어 그 아래로)
    const raw = await aiJSON(feature, P('gen.system'), L.join('\n\n'), max);
    for (const m of mods) if (raw?.[m] && typeof raw[m] === 'object' && !Array.isArray(raw[m])) raw[m] = trimGen(raw[m], m); // 줄인 다음 번역
    const obj = await finJSON(raw, core);
    const out = {};
    for (const mod of mods) {
        const d = obj?.[mod];
        if (!d || typeof d !== 'object' || Array.isArray(d)) continue;
        if (mod === 'profile') d.mode = profileMode ?? 'minimal';
        if (mod === 'contact' && contactMode && contactMode !== 'auto') d.mode = contactMode;
        try { out[mod] = normalize(mod, d); if (mod === 'wallet' && out[mod].fx) out[mod].fx = { unit: '', rate: 0 }; if (mod === 'rel') { if (!out[mod].affName) Object.assign(out[mod], LOVE_AXES); fixLoveLadder(out[mod]); ensureLove(out[mod]); } } catch (e) { ssWarn(LOG, 'group normalize', mod, e); }
    }
    return out;
}

export async function instructModule(mod, instruction, state) {
    const curData = mod === 'core' ? state.core : state.data[mod];
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        `=== PLAY STYLE ===\n${playLine()}`,
        `=== RECENT STORY ===\n${recentChat(Math.min(settings().recentForGen, 14)) || '(none)'}`,
        `=== PANEL: ${mod === 'core' ? 'world core' : MOD[mod].name} — CURRENT DATA ===\n${JSON.stringify(curData)}`,
        `=== USER'S EDIT INSTRUCTION ===\n${instruction}`,
        `=== RULES ===\n${P('gen.instruct')}`,
        `=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}`,
    ];
    const obj = await finJSON((await aiJSON('instruct', P('gen.system'), L.join('\n\n'))));
    if (mod === 'profile' && obj && typeof obj === 'object') obj.mode = state?.data?.profile?.mode ?? 'minimal'; // 「AI로 수정」해도 프로필 모드는 사용자가 고른 그대로
    const out = mod === 'core' ? NORM.core(obj) : normalize(mod, obj);
    // 관계 수치 이름은 지시에 「애정·우정·호감·신뢰」가 없으면 그대로 둔다 (옛 채팅의 호감·신뢰 뜻이 몰래 바뀌지 않게)
    if (mod === 'rel' && curData && !/애정|우정|호감|신뢰|romance|friendship/i.test(instruction)) { out.affName = curData.affName ?? ''; out.trustName = curData.trustName ?? ''; }
    return out;
}

export async function analyzeMessage(idx) {
    const c = ctx();
    const m = c.chat?.[idx];
    if (!m || m.is_user) return;
    const r = compute(idx);
    if (!r) return;
    // 분석하는 동안 스와이프·다시 생성·편집되면 엉뚱한 답에 기록이 붙지 않게 (시작할 때의 답을 기억)
    const sid = m.swipe_id ?? 0, mes0 = m.mes;
    const pk = `${idx}:${sid}`;
    (app.pipState ??= new Map()).set(pk, 'running'); app.decorate?.(); // 🔍 칩 점검이 「분석 중」을 알 수 있게 (v2.7.3)
    const prevUser = [...c.chat.slice(0, idx)].reverse().find(x => x.is_user);
    const inj = buildInjection(r, { noOutput: true, full: true });
    const prompt = `${inj.main}\n${inj.people}\n\nKeys: ${tagKeysFor(getMeta()).join(' · ')}\n\n=== {{user}} ===\n${headTail(prevUser?.mes ?? '', 1500)}\n\n=== REPLY ===\n${headTail(stripStatus(m.mes), clamp(parseInt(settings().fixReadCap, 10) || 8000, 2000, 40000))}`;
    try {
        const out = await aiGenerate('analyze', P('ai.analyze'), prompt, 600);
        const o2 = String(out ?? '').replace(/<(\/?)status>/gi, '<$1meatball>'); // 분석 모델이 옛 <status>로 답해도 읽는다
        const ops = extractOps(/<meatball>/i.test(o2) ? o2 : `<meatball>\n${o2}\n</meatball>`);
        if (c.chat?.[idx] !== m || (m.swipe_id ?? 0) !== sid || m.mes !== mes0) { ssWarn(LOG, 'analyze: message changed, dropped'); return; }
        setDrawer(m, ops); // 스와이프 칸에도 같이 적는다 — 왼쪽으로 넘겼다 돌아오면 분석 결과가 사라져 AI를 또 부르던 것 (v2.7.10)
        Object.defineProperty(ops, 'analyzed', { value: true, enumerable: false }); // 같은 답을 다시 분석하지 않게 (이번 접속 동안)
        app.pipState.set(pk, ops.length ? 'done' : 'empty');
        await (c.saveChat?.() ?? c.saveChatDebounced?.());
        app.refreshNow?.();
        app.notifyLatest?.();
        return ops.length;
    } catch (e) { ssWarn(LOG, 'analyze failed', e); app.pipState.set(pk, `failed:${String(e?.message ?? e).slice(0, 120)}`); app.redecorate?.(); app.decorate?.(); return -1; }
}

// 그 인물에 대해 알고 있는 것
function aboutPerson(who, state) {
    const d = state.data;
    const lite = contactSimple(); // 연락 간단 모드: AI가 덜 기억해요 (최근 이야기 3줄 · 인물 소개 짧게) — 가볍고 빠르게
    const prof = d.profile ? findBy(d.profile.list, who) : null;
    const card = chatCharacters().find(ch => norm(ch.name) === norm(who));
    const rel = d.rel ? findBy(d.rel.user, who) : null;
    return [
        `World: ${state.core.title} — ${short(state.core.summary, 500)}`,
        d.calendar ? `Now: ${dateStr(d.calendar)} ${d.calendar.time}` : '',
        prof ? `About ${who}: ${short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, lite ? 400 : 3000)}` : card ? `About ${who}: ${short(card.description, lite ? 500 : 1500)}` : '',
        rel ? `Relationship with {{user}}: ${rel.label || '-'} · ${relAxes(state.data.rel).aff} ${rel.aff} · ${relAxes(state.data.rel).trust} ${rel.trust} · ${rel.memo}` : '',
        `Difficulty: ${DIFFS[diffOf()].name}`,
        `Recent story (for context):\n${recentChat(lite ? 3 : 8)}`,
        // ✍ 연락처마다 넣는 추가 지시 (v2.7.23): 이 사람이 연락에서 어떻게 굴지 — 답장 · 편지 · 선톡 · 최면 어플 모두에 붙는다
        (() => { const dir = d.contact ? findBy(d.contact.contacts, who)?.prompt : ''; return dir ? `=== USER'S DIRECTION for how ${who} behaves in these messages (highest priority) ===\n${dir}` : ''; })(),
        (() => { try { return app.contactLore?.(who) ?? ''; } catch { return ''; } })(), // 📚 연락처별 로어북 (addons.js · 고른 항목이 없으면 빈 글)
    ].filter(Boolean);
}
const threadN = (n) => (contactSimple() ? Math.min(n, 4) : n); // 간단 모드: 최근 4줄만 기억
const threadText = (ct, who, n = 14) => (ct.threads[who] ?? []).filter(m => !m.pending).slice(-threadN(n)).map(m => `${m.from === 'me' ? '{{user}}' : who}: ${msgText(m)}`).join('\n');
// 🧠 연락 속 인물의 기억 (v2.7.23): 답장할 때 그 사람과의 보관된 대화를 「정한 분량 안에서」 최근 것부터 거슬러 올라가며 전부 읽는다
//   (예전엔 최근 14줄 · 편지 8통뿐이라 오래 얘기해도 앞의 일을 몰랐음). 한 줄 요약이 있으면 맨 앞에 같이 준다. 간단 모드는 그대로 최근 4줄.
// 🚫 연락에서 「갈게 · 만나자」 하지 않기 (v2.7.23 · 설정 contactStayRemote · 기본 켬): 연락은 멀리서 주고받는 것 — 만남은 본편에서
const remoteRule = (who) => (settings().contactStayRemote !== false ? P('ai.remote', { who }) : '');
export const RECALL = { short: 0, mid: 6000, long: 20000, all: Infinity }; // 글자 수 (0 = 예전처럼 줄 수로)
export function threadMemory(ct, who, minLines = 14) {
    const all = (ct.threads[who] ?? []).filter(m => !m.pending);
    const fmt = (m) => `${m.from === 'me' ? '{{user}}' : who}: ${msgText(m)}`;
    if (contactSimple()) return all.slice(-4).map(fmt).join('\n');
    const budget = RECALL[settings().contactRecall] ?? RECALL.mid;
    let take = all.slice(-minLines);
    if (budget) {
        take = []; let used = 0;
        for (let i = all.length - 1; i >= 0; i--) { const line = fmt(all[i]); if (take.length >= minLines && used + line.length > budget) break; take.unshift(all[i]); used += line.length + 1; }
    }
    const sm = ct.summaries?.[who]?.text;
    return `${sm ? `(Summary of this relationship's conversation so far: ${sm})\n` : ''}${take.length < all.length ? '(…earlier messages omitted…)\n' : ''}${take.map(fmt).join('\n')}`;
}

// 연락 대화 한 줄 요약 (반영 모드 = 요약)
export async function summarizeThread(who, state) {
    const ct = state.data.contact;
    const out = await aiGenerate('csum', P('ai.csum', { who }), `Conversation (oldest first):\n${threadText(ct, who, 40)}`, 200);
    return finText(stripStatus(out).split(/\r?\n/).map(x => x.trim()).filter(Boolean)[0] ?? '');
}
// 물가 질문: "이 세계에서 ○○ 사려면 얼마?"
export async function askPrice(question, state) {
    const w = state.data.wallet;
    const L = [
        `World: ${state.core.title} (${state.core.genre}) — ${short(state.core.summary, 400)}`,
        `Currency: ${w.currency}${w.fx?.rate ? ` (1 ${w.currency} ≈ ${fmtNum(w.fx.rate)} ${w.fx.unit})` : ''}`,
        w.prices.length ? `Known prices: ${w.prices.map(p => `${p.name} ${fmtNum(p.price)}`).join(', ')}` : '',
        state.data.shop?.shops.length ? `Shop items: ${state.data.shop.shops.flatMap(sh => sh.items.slice(0, 6).map(i => `${i.name} ${fmtNum(i.price)}`)).slice(0, 20).join(', ')}` : '',
        `Question: ${question}`,
    ].filter(Boolean);
    const out = stripStatus(await aiGenerate('price', P('ai.price', { currency: w.currency }), L.join('\n'), 300));
    const m = out.match(/PRICE\s*[:：]\s*(.+?)\s*=\s*([\d.,]+)/i);
    return { text: await finText(out.replace(/PRICE\s*[:：].*$/im, '').trim()), item: m?.[1]?.trim() ?? '', price: m ? Number(m[2].replace(/,/g, '')) : 0 };
}
const nameRe = (who) => new RegExp(`^\\s*(?:[-*•]\\s*)?(?:${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*)?`);

// 메신저/즉시 통신 답장 → 말풍선 줄들
// 💸 상대가 보내는 돈 · 선물 (v2.7.19): 예전엔 답장에 「돈 보냈어」라고만 쓰고 실제론 아무것도 안 왔음
// → 정말 보낼 때만 맨 끝에 [SEND money: 3000] / [SEND gift: 이름] 한 줄 → 떼어 내서 말풍선 · 소지금 · 소지품에 반영 (contact.js)
const SEND_RE = /\[\s*SEND\s+(money|gift)\s*[:：]\s*([^\]\n]+)\]/gi;
function sendRule(state, who) {
    const w = state.data.wallet;
    if (!w || !modOn('wallet')) return '';
    return `\nIf ${who} actually sends {{user}} money or a gift together with this message (only when it truly fits: helping out, paying back, a present, {{user}} asked and ${who} agrees), add one last separate line exactly like [SEND money: 3000] (a plain number in ${w.currency}, a sensible amount for ${who}) or [SEND gift: item name]. Saying you sent something without that line means nothing arrives. Never send anything just because you can.`;
}
export function takeSends(t, out) {
    try { const f = app.socFeel?.(t); if (f) { t = f.text; if (f.feel && out) out.feel = f.feel; } } catch (e) { ssWarn(LOG, 'feel', e); }
    return String(t ?? '').replace(SEND_RE, (_, k, v) => {
        if (/money/i.test(k)) { const n = Math.round(Math.abs(parseNum(v)?.v ?? 0)); if (n > 0 && Number.isFinite(n)) out?.push({ kind: 'money', amount: Math.min(n, 1e9) }); }
        else { const name = v.trim().replace(/^["'「]|["'」]$/g, ''); if (name) out?.push({ kind: 'gift', name: short(name, 60) }); }
        return '';
    }).replace(/\n{3,}/g, '\n\n').trim();
}
// 💗 연락에서 호감 반영 (선택 · addons.js의 socialAff): 답 끝의 [FEEL ±N] 줄을 떼고 값은 sends.feel로 넘긴다 — 꺼져 있어도 줄은 떼어 낸다
// 🔕 상대가 연락을 꺼 두기 (v2.7.23): 답 끝의 「(OFFLINE: 이유 | N)」 줄을 떼어 info.away = { why, n }으로 돌려준다
const MSG_CAP = 1200, LETTER_CAP = 6000; // 문자 한 줄 · 편지 한 통 최대 글자 (모델이 고장 나 끝없이 쓴 답이 채팅 파일을 키우지 않게)
const OFFLINE_RE = /\(\s*OFFLINE\s*[:：]\s*([^|)\n]*?)\s*(?:\|\s*(\d+)\s*)?\)/i;
export async function phoneReply(who, state, sends = null, info = null) {
    const ct = state.data.contact;
    const awayOn = settings().contactAway !== false && !!info;
    const sys = P('ai.phone', { who, app: ct.app }) + remoteRule(who) + (awayOn ? P('ai.away', { who }) : '') + sendRule(state, who) + (app.socRule?.(who) ?? '');
    let raw = await aiGenerate('phone', sys, [...aboutPerson(who, state), `Conversation so far:\n${threadMemory(ct, who, 14)}`].join('\n\n'), 800);
    const off = OFFLINE_RE.exec(raw);
    if (off) { raw = raw.replace(OFFLINE_RE, ''); if (awayOn) info.away = { why: off[1].trim().slice(0, 40), n: Math.min(6, Math.max(1, Number(off[2]) || 2)) }; }
    const out = takeSends(raw, sends);
    return finLines(stripStatus(out).split(/\r?\n/).map(x => x.replace(nameRe(who), '').replace(/^["“](.*)["”]$/, '$1').trim().slice(0, MSG_CAP)).filter(Boolean).slice(0, 4)); // 한 줄 최대 길이 (검수: 고장 난 답이 2만 자 한 줄로 저장됐다)
}
// 편지 답장 → 본문 하나
// 🕵 최면 어플 (v2.7.23): 연락의 「다크 버전」 — 그 인물이 숨김없이 답한다. 이야기 밖 놀이라 상태를 바꾸지 않고 본편 AI에게도 안 간다
// (모델 · 프로필은 메신저 답장과 같은 칸을 쓴다)
export async function truthReply(who, state) {
    const ct = state.data.contact;
    const rel = state.data.rel ? findBy(state.data.rel.user, who) : null;
    const priv = rel ? [rel.mind?.text && `what ${who} is really feeling right now: ${rel.mind.text}`, rel.likes && `drawn to: ${rel.likes}`, rel.dislikes && `put off by: ${rel.dislikes}`, rel.concern && `on their mind lately: ${rel.concern}`, rel.jealous ? `jealousy ${rel.jealous}/100` : '', rel.bond ? 'they are confirmed lovers' : ''].filter(Boolean).join(' · ') : '';
    const body = [...aboutPerson(who, state), priv ? `PRIVATE (things ${who} keeps to themselves — they must come out when asked):\n${priv}` : '',
        `Their ordinary conversation so far (context only):\n${threadMemory(ct, who, 8) || '(none)'}`,
        `Hypnosis-app session so far:\n${threadMemory({ threads: ct.truth ?? {}, summaries: {} }, who, 14) || '(none)'}`].filter(Boolean).join('\n\n');
    const out = await aiGenerate('phone', P('ai.truth', { who, app: ct.app }), body, 900);
    return finLines(stripStatus(out).split(/\r?\n/).map(x => x.replace(nameRe(who), '').replace(/^["“](.*)["”]$/, '$1').trim().slice(0, MSG_CAP)).filter(Boolean).slice(0, 5));
}
// 👥 단체방 (v2.8): 방에 있는 인물들이 내 말에 · 서로에게 반응한다 → [{ who, text }]. 인물끼리 호감(pairs)이 있으면 같이 준다
// (모델 · 프로필은 메신저 답장과 같은 칸)
export async function groupReply(room, state) {
    const ct = state.data.contact, r = ct.rooms?.[room]; if (!r) return [];
    const members = r.members.slice(0, 6), d = state.data, lite = contactSimple();
    const has = (n) => members.some(m => norm(m) === norm(n));
    const who = (m) => (m.from === 'me' ? '{{user}}' : m.who || '?');
    const people = members.map(m => {
        const prof = d.profile ? findBy(d.profile.list, m) : null, card = chatCharacters().find(ch => norm(ch.name) === norm(m)), rel = d.rel ? findBy(d.rel.user, m) : null;
        const dir = findBy(ct.contacts, m)?.prompt;
        return [`## ${m}`, prof ? short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, lite ? 250 : 900) : card ? short(card.description, lite ? 250 : 700) : '',
            rel ? `→ {{user}}: ${rel.label || '-'} · ${relAxes(d.rel).aff} ${rel.aff} · ${relAxes(d.rel).trust} ${rel.trust}` : '', dir ? `USER'S DIRECTION for ${m} (highest priority): ${dir}` : ''].filter(Boolean).join('\n');
    });
    const pairs = (d.rel?.pairs ?? []).filter(p => has(p.a) && has(p.b)).map(p => `${p.a} & ${p.b}: ${[p.label, Number.isFinite(Number(p.aff)) ? `closeness ${p.aff} (-100..100)` : '', p.memo].filter(Boolean).join(' · ')}`);
    const body = [`World: ${state.core.title} — ${short(state.core.summary, 500)}`, d.calendar ? `Now: ${dateStr(d.calendar)} ${d.calendar.time}` : '',
        `MEMBERS\n${people.join('\n\n')}`, pairs.length ? `PAIRS (how the members feel about each other)\n${pairs.join('\n')}` : '',
        `Recent story (for context):\n${recentChat(lite ? 3 : 6)}`,
        `Room so far:\n${r.msgs.slice(-(lite ? 8 : 24)).map(m => `${who(m)}: ${msgText(m)}`).join('\n') || '(empty)'}`].filter(Boolean).join('\n\n');
    const out = stripStatus(await aiGenerate('phone', P('ai.group', { room, app: ct.app, members: members.join(', ') }), body, 1000));
    const got = [];
    for (const line of out.split(/\r?\n/)) {
        const m = line.replace(/^\s*(?:[-*•]\s*)?/, '').match(/^\**([^:：*]{1,40}?)\**\s*[:：]\s*(.+)$/); if (!m) continue;
        const name = members.find(x => norm(x) === norm(m[1])); if (!name) continue;
        const text = m[2].replace(/^["“](.*)["”]$/, '$1').trim().slice(0, MSG_CAP); if (text) got.push({ who: name, text });
    }
    const top = got.slice(0, 6), texts = await finLines(top.map(x => x.text));
    return texts.length === top.length ? top.map((x, i) => ({ who: x.who, text: texts[i] || x.text })) : top;
}
export async function letterReply(who, state, { courier, rush }, sends = null) {
    const ct = state.data.contact;
    const sys = P('ai.letter', { who, app: ct.app, courier: courier || ct.app, rush: rush ? `${who} paid extra for an express courier so it arrives fast — it may show a little in the letter (eagerness).` : '' }) + remoteRule(who) + sendRule(state, who) + (app.socRule?.(who) ?? '');
    // v2.7.18: 700 → 2400 (한국어 편지 · 생각하는 모델은 700으로 끝까지 못 써서 잘렸음)
    const out = await aiGenerate('letter', sys, [...aboutPerson(who, state), `Letters so far (oldest first):\n${threadMemory(ct, who, 8)}`].join('\n\n'), 2400);
    return finText(takeSends(stripStatus(out), sends).replace(/^```\w*\s*|```\s*$/g, '').trim().slice(0, LETTER_CAP));
}
// 선톡
export async function pingMessage(who, state, auto = false, sends = null) {
    const ct = state.data.contact;
    const letter = letterMode(ct) || instantLetter(ct);
    const sys = P('ai.ping', { who, app: ct.app, format: letter ? 'a short letter: greeting, a paragraph or two, sign-off' : '1-3 short chat bubbles, one per line' }) + remoteRule(who) + sendRule(state, who) + (app.socRule?.(who) ?? '');
    const out = await aiGenerate(auto ? 'autoping' : 'ping', sys, [...aboutPerson(who, state), `Earlier messages:\n${threadText(ct, who, 8) || '(none)'}`].join('\n\n'), letter ? 2000 : 600);
    const t = takeSends(stripStatus(out), sends);
    return letter ? [await finText(t)] : finLines(t.split(/\r?\n/).map(x => x.replace(nameRe(who), '').replace(/^["“](.*)["”]$/, '$1').trim()).filter(Boolean).slice(0, 4));
}

// 뉴스 · 가십 · 게시판 · 퀘스트: 새 항목만 받아 온다
async function freshItems(mod, feature, state, extra = '') {
    const cur = state.data[mod];
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        state.data.calendar ? `=== NOW ===\n${dateStr(state.data.calendar)} ${state.data.calendar.time}` : '',
        state.data.rel ? `=== RELATIONSHIPS ===\n${state.data.rel.user.map(r => `${r.name}: ${r.label} ${relAxes(state.data.rel).aff}${r.aff}`).join(' / ')}` : '',
        `=== RECENT STORY ===\n${recentChat(Math.min(settings().recentForGen, 16)) || '(none)'}`,
        `=== PLAY STYLE ===\n${playLine()}`,
        `=== EXISTING (don't repeat) ===\n${JSON.stringify(cur ?? {}).slice(0, 3000)}`,
        mod === 'quest' && state.data.stats?.attrs?.length ? `=== {{user}}'S ATTRIBUTES (use one of these exact names in check.attr, or leave it empty) ===\n${state.data.stats.attrs.map(a => a.name).join(', ')}\ncheck.dc: 8 easy · 12 normal · 15 hard · 18 very hard` : '',
        extra,
        `=== TASK ===\n${P(`gen.${mod}`, { difficulty: diffLine() })}\nReturn ONLY new entries.`,
        `=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}`,
    ].filter(Boolean);
    return finJSON((await aiJSON(feature, P('gen.system'), L.join('\n\n'))));
}
// 플레이 방식 알아보기 (카드 · 페르소나 · 첫 메시지 · 최근 채팅을 보고)
// 로맨스 보정 ⑤: 관계 인물들의 끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것을 한 번에 채운다
export async function fillWants(state) {
    const d = state.data;
    const people = (d.rel?.user ?? []).slice(0, 16);
    if (!people.length) return [];
    const L = [
        `World: ${state.core.title} — ${short(state.core.summary, 500)}`,
        ...people.map(r => { const prof = d.profile ? findBy(d.profile.list, r.name) : null; const card = chatCharacters().find(ch => norm(ch.name) === norm(r.name));
            return `- ${r.name}${r.label ? ` [${r.label}]` : ''}: ${prof ? short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, 500) : card ? short(card.description, 700) : short(r.memo, 200) || '(no profile)'}${r.likes || r.dislikes || r.concern ? ` | existing — likes: ${r.likes || '-'}; dislikes: ${r.dislikes || '-'}; concern: ${r.concern || '-'}` : ''}`; }),
        `Recent story (for context):\n${recentChat(8)}`,
    ];
    const o = await finJSON(await aiJSON('wants', P('ai.wants'), L.join('\n\n'), 1500));
    return Array.isArray(o?.list) ? o.list.filter(x => x?.name) : [];
}
export const PLAY_SHAPE = '{"mode":"rp|multi|director","cardIsWorld":false,"hero":"","ensemble":false,"cast":["이름"]}';
export async function detectPlay() {
    const c = ctx();
    const chars = chatCharacters();
    const L = [
        ...chars.map(ch => `[CARD NAME] ${ch.name}\n[CARD] ${short([ch.description, ch.personality, ch.scenario].filter(Boolean).join('\n'), 2500)}\n[FIRST MESSAGE] ${short(ch.first_mes, 800)}`),
        `[USER NAME] ${c.name1}\n[PERSONA] ${short(c.powerUserSettings?.persona_description ?? '', 600) || '(none)'}`,
        `[RECENT CHAT]\n${recentChat(10) || '(none)'}`,
    ];
    const o = await aiJSON('play', P('ai.play'), L.join('\n\n'), 400);
    return { ...normPlay(o), why: String(o.why ?? '') };
}
export async function newSns(state) {
    const o = normalize('sns', await freshItems('sns', 'sns', state));
    const date = stamp(state);
    return { name: o.name, posts: o.posts.map(x => ({ ...x, id: uid(), date, mine: false, liked: false })) };
}
export async function snsReactions(state, post) {
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        state.data.rel ? `=== PEOPLE ===\n${state.data.rel.user.map(r => `${r.name}: ${r.label} ${relAxes(state.data.rel).aff}${r.aff}`).join(' / ')}` : '',
        `=== RECENT STORY ===\n${recentChat(6) || '(none)'}`,
        `=== POST by ${post.mine ? '{{user}}' : post.author} on ${state.data.sns?.name || 'SNS'} ===\n${post.text}${post.pic ? `\n[사진: ${post.pic}]` : ''}${post.tags ? `\n${post.tags}` : ''}`,
    ].filter(Boolean);
    const o = await finJSON(await aiJSON('snsReply', P('ai.snsReply'), L.join('\n\n'), 700));
    return { likes: Math.max(0, Math.round(Number(o.likes) || 0)), replies: (Array.isArray(o.replies) ? o.replies : []).filter(r => r?.text).map(r => ({ id: uid(), author: String(r.author || '익명'), text: String(r.text), mine: false })).slice(0, 6) };
}
export async function musicPicks(state) {
    const L = [
        `World: ${state.core.title} (${state.core.genre}) — tone: ${state.core.tone}`,
        state.data.calendar ? `Now: ${dateStr(state.data.calendar)} ${state.data.calendar.time} ${state.data.calendar.weather ?? ''}` : '',
        state.data.map?.here ? `Place: ${state.data.map.here}` : '',
        state.data.music?.log?.length ? `Already recommended (don't repeat): ${state.data.music.log.slice(-10).map(x => x.title).join(', ')}` : '',
        `Recent scene:\n${recentChat(6) || '(none)'}`,
    ].filter(Boolean);
    const o = await aiJSON('music', P('ai.music', { taste: tasteLine() }), L.join('\n\n'), 500);
    return (Array.isArray(o.songs) ? o.songs : []).filter(x => x?.title).slice(0, 3).map(x => ({ title: String(x.title), artist: String(x.artist ?? ''), mood: String(x.mood ?? ''), why: String(x.why ?? '') }));
}
// 💭 속마음 받기 (v2.9 · mind.js): 여러 사람 것을 한 번에 — 「이름 | 속마음」 한 줄씩. 보는 방식(글 · 이모티콘 · 카모지)은 본편 AI에게 시킬 때와 같은 틀
export async function fetchMinds(names, state) {
    const fmt = MIND_FMT[settings().mindMode]; if (!fmt || !names?.length) return [];
    const about = names.map(n => aboutPerson(n, state).filter(Boolean).join('\n')).join('\n\n———\n\n');
    const out = stripStatus(await aiGenerate('peek', P('ai.minds', { who: names.join(', '), fmt }), about, 300));
    const got = [];
    for (const line of String(out).split('\n')) {
        const m = line.match(/^\s*(?:[-*•]\s*)?(?:mind\s*:\s*)?(.+?)\s*[|｜]\s*(.+?)\s*$/i); if (!m) continue;
        const name = names.find(n => norm(n) === norm(m[1].replace(/[*_`]/g, ''))); if (!name || got.some(x => x.name === name)) continue;
        got.push({ name, text: await finText(m[2]) });
    }
    return got;
}
// 🔮 점집 (v2.8.1) — 점괘 한 번 = 1호출. 뽑은 카드 · 오방기는 여기 오기 전에 이미 정해져 있다 (fortune.js)
// o: { who, method, topic, q, basis, storyNow, realNow, draw: ['과거 — 탑 (역방향)', …], saved: 명식 또는 null }
const FT_METHOD = { tarot: 'tarot cards', orb: 'crystal ball', shaman: "a shaman's (mudang) spirit reading with saju" };
// 점괘는 이야기와 별개 (v2.8.1 고침): 점쟁이는 처음 보는 손님으로 본다 — 지금 관계 · 최근 이야기 · 페르소나 · 카드 설명을 주지 않는다
// (예전엔 다 줘서 지금 상황에 맞춘 듣기 좋은 소리만 했음). 주는 것: 이름 · 생년월일(없으면 나이·생일 칸만) · 날짜 · 물은 것 · 뽑은 것
const BIRTH_KEY_RE = /나이|연령|생일|생년|출생|태어|띠|별자리|age|birth|born|zodiac/i;
function birthHints(who, state) {
    const prof = state.data.profile ? findBy(state.data.profile.list, who) : null;
    return (prof?.fields ?? []).filter(f => BIRTH_KEY_RE.test(f.k) && String(f.v ?? '').trim()).map(f => `${f.k}: ${short(f.v, 60)}`).slice(0, 4).join(' · ');
}
function fortuneBody(o, state) {
    const hints = o.saved ? '' : birthHints(o.who, state);
    return [
        `Customer: ${o.who} — a walk-in stranger. You know NOTHING about their life, relationships or circumstances, and you must not guess them from the name.`,
        hints ? `Facts for the birth data ONLY (use them to fix the birth data, never as story hints): ${hints}` : '',
        `World setting (only so the teller and calendar fit): ${short(state.core.title, 80)}${state.core.genre ? ` · ${short(state.core.genre, 40)}` : ''}`,
        `Story time now: ${o.storyNow || '(this story has no calendar)'}\nReal-world time now: ${o.realNow}\nREADING DATE = ${o.basis === 'real' ? 'the REAL-WORLD time' : 'the STORY time'} above — count ages, this year and this month from it.`,
        o.topic ? `Topic asked: ${o.topic}` : '',
        o.q ? `The customer's question: ${o.q}` : '',
        o.draw?.length ? `Drawn (fixed — interpret exactly these):\n${o.draw.map(x => `- ${x}`).join('\n')}` : '',
        o.luck?.length ? `FATE ROLLS — already decided by real dice before the reading. Deliver each verdict exactly and plainly in its section; never soften or flip it:\n${o.luck.map(x => `- ${x}`).join('\n')}` : '',
        o.hooks?.length ? `CONCRETE DETAILS — work every one of these into the reading as specific predictions (spread over different sections): ${o.hooks.join(' · ')}` : '',
    ].filter(Boolean).join('\n\n');
}
export async function fortuneRead(o, state) {
    const savedTxt = o.saved ? Object.entries(o.saved).filter(([k, v]) => k !== 'name' && v).map(([k, v]) => `${k}: ${v}`).join(' · ') : '';
    const birthRule = savedTxt
        ? `Already recorded for ${o.who} — copy it into "person" unchanged and fill in only the empty fields: ${savedTxt}`
        : `Nothing is recorded yet. Establish ${o.who}'s birth data now and return it in "person": use any birthday or age stated in the material; otherwise choose plausible values, and work out the birth year from the reading date and their age. Use the world's own calendar. It is saved and reused in every later reading, so make it definite (no "unknown").`;
    const sys = P('ai.fortune', { who: o.who, method: FT_METHOD[o.method] ?? o.method, methodRule: P(`ai.fortune.${o.method}`, { who: o.who }), birthRule });
    const r = await finJSON(await aiJSON('fortune', sys, fortuneBody(o, state), 4000));
    const S = (v) => (typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v));
    const sections = (Array.isArray(r.sections) ? r.sections : []).filter(x => x && S(x.text)).map(x => ({ title: S(x.title), text: S(x.text), ...(['spirit', 'vision'].includes(S(x.voice).toLowerCase()) ? { voice: S(x.voice).toLowerCase() } : {}) })).slice(0, 16);
    if (!sections.length && !S(r.summary)) throw new Error('점괘가 비어서 왔어요. 다시 해 주세요.');
    return { person: r.person && typeof r.person === 'object' ? r.person : null, teller: S(r.teller), summary: S(r.summary), sections, omen: S(r.omen), advice: S(r.advice), lucky: S(r.lucky) };
}
// 굿 한 번 = 1호출. 결과(무엇이 풀리고 걸리는지)는 이미 정해져서 온다 — AI는 장면만 쓴다
export async function gutRite(o, state) {
    const body = [
        ...aboutPerson(o.who, state),
        `Story time now: ${o.storyNow || '(no calendar)'}`,
        `Rite: ${o.rite}${o.wish ? ` — wish: ${o.wish}` : ''}`,
        `DECIDED OUTCOME: ${o.outcome}`,
    ].filter(Boolean).join('\n\n');
    const r = await finJSON(await aiJSON('gut', P('ai.gut', { who: o.who, rite: o.rite }), body, 1500));
    const S = (v) => (typeof v === 'string' ? v.trim() : '');
    if (!S(r.rite)) throw new Error('굿 장면이 비어서 왔어요. 다시 해 주세요.');
    return { rite: S(r.rite), spirit: S(r.spirit), result: S(r.result), omen: S(r.omen) };
}
export async function newNews(state) {
    const o = normalize('news', await freshItems('news', 'news', state));
    const date = stamp(state);
    return { name: o.name, items: o.items.map(x => ({ ...x, id: uid(), date, read: false })) };
}
export async function newGossip(state) {
    const o = normalize('gossip', await freshItems('gossip', 'gossip', state));
    const date = stamp(state);
    return { name: o.name, issues: o.issues.map(x => ({ ...x, id: uid(), date, read: false })) };
}
export async function newPosts(state) {
    const o = normalize('board', await freshItems('board', 'board', state));
    const date = stamp(state);
    return { name: o.name, posts: o.posts.map(x => ({ ...x, id: uid(), date, mine: false })) };
}
export async function newQuests(state) {
    const o = normalize('quest', await freshItems('quest', 'quest', state));
    return o.list.map(q => ({ ...q, id: uid(), status: 'open', paid: false, ...(state.data.calendar ? { since: dayIndex(state.data.calendar) } : {}) })); // 받은 날 — 「3일 안에」 기한 계산용
}
export async function boardReplies(state, post) {
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        `=== RECENT STORY ===\n${recentChat(8) || '(none)'}`,
        `=== BOARD: ${state.data.board?.name || ''} ===`,
        `=== POST by ${post.mine ? '{{user}}' : post.author} ===\n${post.title}\n${post.body}`,
        post.replies.length ? `=== EXISTING REPLIES ===\n${post.replies.map(r => `${r.mine ? '{{user}}' : r.author}: ${r.text}`).join('\n')}` : '',
    ].filter(Boolean);
    const o = await finJSON((await aiJSON('boardReply', P('ai.boardReply'), L.join('\n\n'), 700)));
    return (Array.isArray(o.replies) ? o.replies : []).filter(r => r?.text).map(r => ({ id: uid(), author: String(r.author || '익명'), text: String(r.text), mine: false })).slice(0, 5);
}
