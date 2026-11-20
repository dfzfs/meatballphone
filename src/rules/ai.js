// 미트볼이 부르는 AI (설정집 채우기 · 번역). 사건 고르기(B 모드)는 classify.js. 본편이 아니므로 설정집을 여기서만 본다.
import { ctx, settings, userName, getMeta } from '../base/st.js';
import { normBook, emptyBook, REL_STAGES } from './book.js';
import { isEN } from './lang.js';
import { short, hash } from '../base/util.js';
import { gloss } from '../base/gloss.js';

export const stats = { calls: 0, ms: 0, last: 0 };
// 답 길이: 생각하는 모델(제미니 등)은 생각도 이 안에서 써서, 3000이면 설정집 JSON이 중간에 잘렸다(finish_reason: length) → 넉넉히
export const ASK_MAX = 8192;
export async function ask(prompt, system = '', maxTok = ASK_MAX) {
    const t0 = performance.now(); stats.calls++;
    try {
        const prof = settings().profile, c = ctx();
        if (prof && c.ConnectionManagerRequestService) {
            const r = await c.ConnectionManagerRequestService.sendRequest(prof, [{ role: 'system', content: system }, { role: 'user', content: prompt }], maxTok);
            return String(r?.content ?? r ?? '');
        }
        return String(await c.generateRaw({ prompt, systemPrompt: system, responseLength: maxTok }) ?? '');
    } finally { stats.last = performance.now() - t0; stats.ms += stats.last; }
}
export let lastCut = false; // 마지막 parseJSON이 끊긴 답을 살려 읽었는지
export function parseJSON(t) {
    lastCut = false;
    const s = String(t ?? ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0) return null;
    if (b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { try { return JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch { /* 아래에서 살리기 */ } } }
    const j = repairJSON(s.slice(a)); if (j) lastCut = true; return j;
}
// ✂ 답이 길이 제한에서 중간에 끊긴 JSON → 마지막으로 온전히 끝난 값까지만 남기고 괄호를 닫아 읽기
function repairJSON(s) {
    const st = [], cuts = []; let str = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
        if (ch === '"') str = true;
        else if (ch === '{' || ch === '[') st.push(ch === '{' ? '}' : ']');
        else if (ch === '}' || ch === ']') { st.pop(); if (!st.length) break; cuts.push([i + 1, st.join('')]); }
        else if (ch === ',') cuts.push([i, st.join('')]);
    }
    for (let k = cuts.length - 1, n = 0; k >= 0 && n < 400; k--, n++) {
        const [at, close] = cuts[k];
        try { return JSON.parse(s.slice(0, at).replace(/,\s*$/, '') + [...close].reverse().join('')); } catch { /* 더 앞에서 */ }
    }
    return null;
}
// 로어북 · 캐릭터 카드 읽기 (한 번만)
// ───── 📚 설정집이 읽을 곳 ─────
// 고를 수 있는 것: 카드 · 페르소나 · 첫 메시지 · 최근 대화 · 실리태번에 있는 모든 로어북. 고른 건 잘라 내지 않고 다 읽는다.
//   기본으로 켜지는 로어북: 이 채팅 · 이 캐릭터 · 캐릭터 추가 · 전체로 켜 둔 것. 고른 건 채팅마다 기억(meta.srcPick).
const HARD_MAX = 200000; // 안전선 (이보다 길면 뒤를 자름 · 고르는 화면에 경고)
async function wiMod() { try { return await import('/scripts/world-info.js'); } catch { return null; } }
async function linkedBooks() {
    const c = ctx(), ch = c.characters?.[c.characterId] ?? {}, wi = await wiMod();
    const on = new Set([c.chatMetadata?.world_info, ch.data?.extensions?.world].filter(Boolean));
    for (const n of wi?.selected_world_info ?? []) on.add(n);
    const file = ch.avatar && String(ch.avatar).replace(/\.[^.]+$/, '');
    for (const x of wi?.world_info?.charLore ?? []) if (x?.name === file) for (const n of x.extraBooks ?? []) on.add(n);
    const all = new Set([...(wi?.world_names ?? []), ...on]);
    return { on, all: [...all] };
}
const loreText = (e) => `[LORE${e.constant ? ' ALWAYS' : ''} ${(e.key ?? []).join(', ') || e.comment || ''}]\n${String(e.content ?? '')}`;
const chatPart = (kind) => {
    const c = ctx(), ch = c.characters?.[c.characterId] ?? {}, chat = (c.chat ?? []).filter(m => !m.is_system);
    // 👥 그룹 채팅: 멤버 카드를 모두 (characterId가 없음)
    const cards = c.groupId ? (c.groups ?? []).find(g => g.id === c.groupId)?.members?.map(av => c.characters?.find(x => x.avatar === av)).filter(Boolean) ?? [] : [ch];
    if (kind === 'card') return cards.map(x => `[CARD ${x.name ?? ''}]\n${[x.description, x.personality, x.scenario, x.mes_example].filter(Boolean).join('\n')}`).join('\n\n');
    if (kind === 'persona') return `[USER ${userName()}]\n${c.powerUserSettings?.persona_description ?? ''}`;
    if (kind === 'first') { const t = chat[0]?.mes ?? ch.first_mes ?? ''; return t ? `[FIRST MESSAGE]\n${t}` : ''; }
    if (kind === 'recent') { const r = chat.slice(Math.max(1, chat.length - 6)); return r.length ? `[RECENT CHAT]\n${r.map(m => `${m.name}: ${String(m.mes ?? '').replace(/<meatball>[\s\S]*?<\/meatball>/g, '')}`).join('\n')}` : ''; }
    return '';
};
// 고르는 화면용 목록: [{ id, label, size, on, linked, items: [{ id: 'wx:책:uid', title, size, on }] }] — 로어북 안 항목(월드 인포)도 하나씩 고름 · 뺀 항목은 'wx:' 로 기억
export async function sourceList() {
    const c = ctx(), meta = getMeta(), saved = meta?.srcPick ?? null, { on, all } = await linkedBooks(), out = [];
    for (const [id, label] of [['card', '🃏 캐릭터 카드'], ['persona', '🙋 내 페르소나'], ['first', '💬 첫 메시지'], ['recent', '🕰 최근 대화 6개']]) {
        const t = chatPart(id); out.push({ id, label, size: t.length, on: saved ? saved.includes(id) : !!t, linked: true });
    }
    const skip = new Set((saved ?? []).filter(x => x.startsWith('wx:')));
    for (const name of all) {
        let size = 0; const items = [];
        try {
            const wb = await c.loadWorldInfo?.(name);
            for (const e of Object.values(wb?.entries ?? {})) {
                if (e.disable) continue;
                const t = loreText(e), xid = `wx:${name}:${e.uid}`;
                items.push({ id: xid, uid: e.uid, title: e.comment || (e.key ?? []).join(', ') || `#${e.uid}`, keys: (e.key ?? []).join(', '), always: !!e.constant, size: t.length, on: !skip.has(xid), peek: String(e.content ?? '').slice(0, 120) });
                size += t.length;
            }
        } catch { /* 못 읽음 */ }
        const id = `wi:${name}`;
        out.push({ id, label: `📚 ${name}`, size, n: items.length, items, on: saved ? saved.includes(id) : on.has(name), linked: on.has(name) });
    }
    return out;
}
export async function sources(pick = getMeta()?.srcPick ?? null) {
    const c = ctx(), ch = c.characters?.[c.characterId] ?? {};
    const want = pick ? new Set(pick) : new Set([...['card', 'persona', 'first', 'recent'], ...[...(await linkedBooks()).on].map(n => `wi:${n}`)]);
    const L = [];
    for (const id of ['card', 'persona', 'first', 'recent']) if (want.has(id)) { const t = chatPart(id); if (t) L.push(t); }
    const sig = {}, texts = {}, lore = [];
    for (const id of want) {
        if (!id.startsWith('wi:')) continue;
        const name = id.slice(3);
        try {
            const wb = await c.loadWorldInfo?.(name);
            for (const e of Object.values(wb?.entries ?? {})) {
                if (e.disable || want.has(`wx:${name}:${e.uid}`)) continue; // 꺼 둔 항목 · 고르기에서 뺀 항목
                const k = `${name}:${e.uid}`; sig[k] = hash(String(e.content ?? '')); texts[k] = String(e.content ?? '');
                lore.push({ on: !!e.constant, t: loreText(e) });
            }
        } catch { /* 로어북 없음 */ }
    }
    lore.sort((x, y) => y.on - x.on); L.push(...lore.map(x => x.t)); // 늘 켜진(세계관) 항목 먼저
    const text = L.join('\n\n');
    return { text: text.slice(0, HARD_MAX), cut: text.length > HARD_MAX, sig, texts, char: ch.name ?? '' };
}
export const SRC_HARD_MAX = HARD_MAX;
const SCHEMA = `{"world":{"genre":"","summary":"세계관 요약 2~3문장 (시대 · 무대 · 지금 상황 · 큰 갈등)","rules":["이 세계에서 꼭 지켜지는 규칙 짧게 (마법 · 기술 · 신분 · 금기 등) 3~5개"],"currency":"","meal":10,"weather":["맑음","비"],"start":{"y":2026,"m":3,"d":1,"clock":480},"places":[{"name":"","kind":"home|shop|food|bath|work|street|school|other","line":"노선 `
    + `이름","near":["이어진 장소"],"floors":[],"goods":[{"name":"","price":3,"fx":{"hunger":20}}],"rest":{"energy":20},"note":""}]},
"me":{"name":"","traits":"","day":"3월 14일","needs":[{"key":"hunger","name":"허기","icon":"🍞","start":80,"rate":4}]},
"people":[{"name":"","aka":[],"face":"🙂","line":"성격 한 `
    + `줄","start":{"aff":10,"trust":10},"up":[{"act":"칭찬","d":3}],"down":[{"act":"거짓말","d":-5}],"signs":[{"at":60,"text":"눈을 `
    + `피함"}],"syn":[{"to":"","text":""}],"haunt":[],"routine":[{"at":"아침","place":""}],"likes":[],"hates":[],"day":"3월 14일 생일","want":"지금 원하는 `
    + `것","official":"-","noLove":false}]}`;
// 🌐 영어 이야기용 견본 (값을 한국어로 보여 주면 AI가 한국어로 따라 씀)
const SCHEMA_EN = `{"world":{"genre":"","summary":"2-3 sentence world summary (era · setting · current situation · main conflict)","rules":["3-5 short rules this world always keeps (magic · tech · class · taboos)"],"currency":"","meal":10,"weather":["Clear","Rain"],"start":{"y":2026,"m":3,"d":1,"clock":480},"places":[{"name":"","kind":"home|shop|food|bath|work|street|school|other","line":"line name","near":["connected place"],"floors":[],"goods":[{"name":"","price":3,"fx":{"hunger":20}}],"rest":{"energy":20},"note":""}]},
"me":{"name":"","traits":"","day":"March 14","needs":[{"key":"hunger","name":"Hunger","icon":"🍞","start":80,"rate":4}]},
"people":[{"name":"","aka":[],"face":"🙂","line":"one-line personality","start":{"aff":10,"trust":10},"up":[{"act":"praise","d":3}],"down":[{"act":"lying","d":-5}],"signs":[{"at":60,"text":"avoids eye contact"}],"syn":[{"to":"","text":""}],"haunt":[],"routine":[{"at":"morning","place":""}],"likes":[],"hates":[],"day":"March 14","want":"what they want right now","official":"-","noLove":false}]}`;
export async function fillBook(only = null, pick = undefined) {
    const src = await sources(pick), en = isEN();
    const sys = `You build a compact status-sheet rulebook for a roleplay. Output JSON only. ${en ? 'The story is in ENGLISH: write every value in English (this text is sent to the story AI; the player reads a translation).' : 'Korean values.'} `
        + 'Keep every person and place NAME exactly as spelled in the source (never translate or transliterate names); put other spellings or readings (e.g. a Korean reading of an English name) in "aka". '
        + 'The SOURCE is the truth. It may be an AU or an original setting that changes canon (e.g. a modern-day AU of a known series): follow the source and the first message, '
        + 'and never bring in canon places, items, ships, powers or events that the source does not use. Places, goods, prices, currency (name it as this setting would, e.g. 원, 달러, Gold) and routines must fit THIS setting. '
        + 'If something is not in the source, make it fit the source\'s setting, not the original canon. '
        + 'Keep every line short. Prices must be consistent with '
        + '"meal" (one meal). 3-6 places that matter, 3-5 goods per shop/food place. needs: 3-5 (hunger/energy/hygiene/mood style; rate = drop per '
        + 'hour). Birthdays as 「M월 D일」 if known. '
        + 'RELATIONSHIP START: "official" = the relationship with the user that the source states as a FACT right now (연인 · 부부 · 약혼 · 전 연인 · 짝사랑 · 친구 · 가족 · 동료 · "-"). '
        + 'Words like love, devotion, obsession, "meant for each other" or a romantic subtext do NOT make them 연인 — only an explicit, current dating/marriage/engagement does. '
        + 'start.aff (romantic love, 0-100) must match the OFFICIAL status: 80+ only when official is 연인 · 부부 · 약혼; otherwise at most 75 even if they clearly have feelings (put the depth into trust and the line instead). '
        + 'Write minified JSON (no indentation, no code fence) so it fits in one reply.';
    const ask2 = only ? `Rebuild ONLY these people: ${only.join(', ')}. Output {"people":[...]}` : 'Fill the whole rulebook.';
    const note = String(getMeta()?.srcNote ?? '').trim();
    const raw = await ask(`${ask2}\n${gloss()}${note ? `\nUSER'S EXTRA INSTRUCTIONS (follow these over the source when they conflict):\n${note}\n` : ''}\nSchema:\n${en ? SCHEMA_EN : SCHEMA}\n\nSource:\n${src.text}`, sys);
    const j = parseJSON(raw);
    if (!j) return { book: null, src };
    capLove(j); if (!only) j.lang = en ? 'en' : 'ko';
    if (lastCut) import('../ui/kit.js').then(k => k.toast('AI 답이 길이 제한에서 끊겨서 받은 데까지만 채웠어요 · 빠진 인물은 인물 편집의 ✨로 다시 채울 수 있어요', 'mid')).catch(() => {});
    return { book: j, src, cut: lastCut };
}
// 💞 공식 관계가 연인 · 부부 · 약혼이 아니면 시작 애정을 「연인」 단계 아래로 (사랑한다는 말이 많아도 사귀는 사이가 아니면 연인으로 시작하지 않게)
const LOVER = /연인|애인|부부|배우자|남편|아내|약혼|결혼|사귀|dating|lover|girlfriend|boyfriend|married|spouse|husband|wife|engaged|fianc/i;
const EX = /전\s*(연인|애인|남편|아내|배우자)|ex[- ]|former|헤어진|이혼|짝사랑|crush/i;
export function capLove(j) {
    for (const p of Array.isArray(j?.people) ? j.people : []) {
        const off = String(p?.official ?? ''); if (!p || typeof p !== 'object' || (LOVER.test(off) && !EX.test(off)) || !p.start || typeof p.start !== 'object') continue;
        const L = Array.isArray(p.stages) && p.stages.length >= 2 ? p.stages : REL_STAGES;
        const top = [...L].reverse().find(s => /연인|애인|lover/i.test(String(s?.name ?? ''))) ?? L[L.length - 1];
        const cap = Math.max(0, Number(top?.at ?? 80) - 5), a = Number(p.start.aff);
        if (Number.isFinite(a) && a > cap) p.start.aff = cap;
    }
    return j;
}
// AI 없이 바로 시작하는 틀 (입력 거의 없게)
export function templateBook() {
    const c = ctx(), en = isEN(), b = emptyBook(en ? 'en' : 'ko'), name = c.characters?.[c.characterId]?.name;
    b.me.name = userName();
    if (name) b.people.push({ name, aka: [], face: '🙂', line: '', start: { aff: 10, trust: 10 }, up: [], down: [], signs: [], syn: [], haunt: [], routine: [], likes: [], hates: [], day: '', want: '', noLove: false });
    b.world.places = en ? [
        { name: 'Home', kind: 'home', rest: { energy: 20 } },
        { name: 'Market', kind: 'shop', goods: [{ name: 'Bread', price: 3, fx: { hunger: 20 } }, { name: 'Water', price: 1, fx: { hunger: 5 } }, { name: 'Flowers', price: 5 }] },
        { name: 'Diner', kind: 'food', goods: [{ name: 'Set meal', price: 10, fx: { hunger: 40 } }] },
        { name: 'Bathhouse', kind: 'bath', goods: [{ name: 'Bath', price: 4, fx: { hygiene: 70 } }] },
    ] : [
        { name: '집', kind: 'home', rest: { energy: 20 } },
        {
            name: '시장',
            kind: 'shop',
            goods: [
                { name: '빵', price: 3, fx: { hunger: 20 } },
                { name: '물', price: 1, fx: { hunger: 5 } },
                { name: '꽃', price: 5 },
            ],
        },
        { name: '식당', kind: 'food', goods: [{ name: '정식', price: 10, fx: { hunger: 40 } }] },
        { name: '목욕탕', kind: 'bath', goods: [{ name: '입욕', price: 4, fx: { hygiene: 70 } }] },
    ];
    b.src.from = 'template';
    return normBook(b);
}
