// 미트볼이 부르는 AI (설정집 채우기 · 번역). 사건 고르기(B 모드)는 classify.js. 본편이 아니므로 설정집을 여기서만 본다.
import { ctx, settings, userName, getMeta } from '../base/st.js';
import { normBook, emptyBook } from './book.js';
import { short, hash } from '../base/util.js';
import { gloss } from '../base/gloss.js';

export const stats = { calls: 0, ms: 0, last: 0 };
export async function ask(prompt, system = '') {
    const t0 = performance.now(); stats.calls++;
    try {
        const prof = settings().profile, c = ctx();
        if (prof && c.ConnectionManagerRequestService) {
            const r = await c.ConnectionManagerRequestService.sendRequest(prof, [{ role: 'system', content: system }, { role: 'user', content: prompt }], 3000);
            return String(r?.content ?? r ?? '');
        }
        return String(await c.generateRaw({ prompt, systemPrompt: system }) ?? '');
    } finally { stats.last = performance.now() - t0; stats.ms += stats.last; }
}
export function parseJSON(t) {
    const s = String(t ?? ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(s.slice(a, b + 1)); } catch { try { return JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch { return null; } }
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
const SCHEMA = `{"world":{"genre":"","currency":"","meal":10,"weather":["맑음","비"],"start":{"y":2026,"m":3,"d":1,"clock":480},"places":[{"name":"","kind":"home|shop|food|bath|work|street|school|other","line":"노선 `
    + `이름","near":["이어진 장소"],"floors":[],"goods":[{"name":"","price":3,"fx":{"hunger":20}}],"rest":{"energy":20},"note":""}]},
"me":{"name":"","traits":"","day":"3월 14일","needs":[{"key":"hunger","name":"허기","icon":"🍞","start":80,"rate":4}]},
"people":[{"name":"","aka":[],"face":"🙂","line":"성격 한 `
    + `줄","start":{"aff":10,"trust":10},"up":[{"act":"칭찬","d":3}],"down":[{"act":"거짓말","d":-5}],"signs":[{"at":60,"text":"눈을 `
    + `피함"}],"syn":[{"to":"","text":""}],"haunt":[],"routine":[{"at":"아침","place":""}],"likes":[],"hates":[],"day":"3월 14일 생일","want":"지금 원하는 `
    + `것","noLove":false}]}`;
export async function fillBook(only = null, pick = undefined) {
    const src = await sources(pick);
    const en = settings().saveLang === 'en';
    const sys = `You build a compact status-sheet rulebook for a roleplay. Output JSON only. ${en ? 'English values.' : 'Korean values.'} `
        + 'Keep every person and place NAME exactly as spelled in the source (never translate or transliterate names); put other spellings or readings (e.g. a Korean reading of an English name) in "aka". '
        + 'The SOURCE is the truth. It may be an AU or an original setting that changes canon (e.g. a modern-day AU of a known series): follow the source and the first message, '
        + 'and never bring in canon places, items, ships, powers or events that the source does not use. Places, goods, prices, currency (name it as this setting would, e.g. 원, 달러, Gold) and routines must fit THIS setting. '
        + 'If something is not in the source, make it fit the source\'s setting, not the original canon. '
        + 'Keep every line short. Prices must be consistent with '
        + '"meal" (one meal). 3-6 places that matter, 3-5 goods per shop/food place. needs: 3-5 (hunger/energy/hygiene/mood style; rate = drop per '
        + 'hour). Birthdays as 「M월 D일」 if known.';
    const ask2 = only ? `Rebuild ONLY these people: ${only.join(', ')}. Output {"people":[...]}` : 'Fill the whole rulebook.';
    const note = String(getMeta()?.srcNote ?? '').trim();
    const raw = await ask(`${ask2}\n${gloss()}${note ? `\nUSER'S EXTRA INSTRUCTIONS (follow these over the source when they conflict):\n${note}\n` : ''}\nSchema:\n${SCHEMA}\n\nSource:\n${src.text}`, sys);
    const j = parseJSON(raw);
    if (!j) return { book: null, src };
    return { book: j, src };
}
// AI 없이 바로 시작하는 틀 (입력 거의 없게)
export function templateBook() {
    const c = ctx(), b = emptyBook(), name = c.characters?.[c.characterId]?.name;
    b.me.name = userName();
    if (name) b.people.push({ name, aka: [], face: '🙂', line: '', start: { aff: 10, trust: 10 }, up: [], down: [], signs: [], syn: [], haunt: [], routine: [], likes: [], hates: [], day: '', want: '', noLove: false });
    b.world.places = [
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
