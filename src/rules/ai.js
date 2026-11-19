// 미트볼이 부르는 AI (설정집 채우기 · 번역). 사건 고르기(B 모드)는 classify.js. 본편이 아니므로 설정집을 여기서만 본다.
import { ctx, settings, userName } from '../base/st.js';
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
export async function sources() {
    const c = ctx(), ch = c.characters?.[c.characterId] ?? {};
    const L = [`[CARD ${ch.name ?? ''}] ${ch.description ?? ''}\n${ch.personality ?? ''}\n${ch.scenario ?? ''}`, `[USER ${userName()}] ${c.powerUserSettings?.persona_description ?? ''}`];
    // 첫 메시지 · 최근 대화 (AU · 현재 상황이 여기에 적힌 경우가 많음)
    const chat = (c.chat ?? []).filter(m => !m.is_system);
    const first = chat[0]?.mes ?? ch.first_mes ?? '';
    if (first) L.push(`[FIRST MESSAGE] ${short(first, 1500)}`);
    const recent = chat.slice(Math.max(1, chat.length - 6));
    if (recent.length) L.push(`[RECENT CHAT]\n${recent.map(m => `${m.name}: ${short(String(m.mes ?? '').replace(/<meatball>[\s\S]*?<\/meatball>/g, ''), 400)}`).join('\n')}`);
    // 로어북: 채팅 · 캐릭터 · 캐릭터 추가 로어북 · 전체(global)로 켜 둔 것까지
    const books = new Set([c.chatMetadata?.world_info, ch.data?.extensions?.world].filter(Boolean));
    try {
        const wi = await import('/scripts/world-info.js');
        for (const n of wi.selected_world_info ?? []) books.add(n);
        const file = ch.avatar && String(ch.avatar).replace(/\.[^.]+$/, '');
        for (const x of wi.world_info?.charLore ?? []) if (x?.name === file) for (const n of x.extraBooks ?? []) books.add(n);
    } catch { /* 실리태번 밖(시험장) */ }
    const sig = {}, texts = {}, lore = [];
    for (const name of books) {
        try {
            const wb = await c.loadWorldInfo?.(name);
            for (const e of Object.values(wb?.entries ?? {})) {
                if (e.disable) continue;
                const k = `${name}:${e.uid}`; sig[k] = hash(String(e.content ?? '')); texts[k] = String(e.content ?? '');
                lore.push({ on: !!e.constant, t: `[LORE${e.constant ? ' ALWAYS' : ''} ${short((e.key ?? []).join(','), 40) || short(e.comment ?? '', 40)}] ${short(e.content, e.constant ? 2500 : 900)}` });
            }
        } catch { /* 로어북 없음 */ }
    }
    // 늘 켜진(세계관) 항목을 먼저
    lore.sort((x, y) => y.on - x.on); L.push(...lore.map(x => x.t));
    return { text: L.join('\n').slice(0, 22000), sig, texts, char: ch.name ?? '' };
}
const SCHEMA = `{"world":{"genre":"","currency":"골드","meal":10,"weather":["맑음","비"],"start":{"y":2026,"m":3,"d":1,"clock":480},"places":[{"name":"","kind":"home|shop|food|bath|work|street|school|other","line":"노선 `
    + `이름","near":["이어진 장소"],"floors":[],"goods":[{"name":"","price":3,"fx":{"hunger":20}}],"rest":{"energy":20},"note":""}]},
"me":{"name":"","traits":"","day":"3월 14일","needs":[{"key":"hunger","name":"허기","icon":"🍞","start":80,"rate":4}]},
"people":[{"name":"","aka":[],"face":"🙂","line":"성격 한 `
    + `줄","start":{"aff":10,"trust":10},"up":[{"act":"칭찬","d":3}],"down":[{"act":"거짓말","d":-5}],"signs":[{"at":60,"text":"눈을 `
    + `피함"}],"syn":[{"to":"","text":""}],"haunt":[],"routine":[{"at":"아침","place":""}],"likes":[],"hates":[],"day":"3월 14일 생일","want":"지금 원하는 `
    + `것","noLove":false}]}`;
export async function fillBook(only = null) {
    const src = await sources();
    const en = settings().saveLang === 'en';
    const sys = `You build a compact status-sheet rulebook for a roleplay. Output JSON only. ${en ? 'English values.' : 'Korean values.'} `
        + 'Keep every person and place NAME exactly as spelled in the source (never translate or transliterate names); put other spellings or readings (e.g. a Korean reading of an English name) in "aka". '
        + 'The SOURCE is the truth. It may be an AU or an original setting that changes canon (e.g. a modern-day AU of a known series): follow the source and the first message, '
        + 'and never bring in canon places, items, ships, powers or events that the source does not use. Places, goods, prices, currency and routines must fit THIS setting. '
        + 'If something is not in the source, make it fit the source\'s setting, not the original canon. '
        + 'Keep every line short. Prices must be consistent with '
        + '"meal" (one meal). 3-6 places that matter, 3-5 goods per shop/food place. needs: 3-5 (hunger/energy/hygiene/mood style; rate = drop per '
        + 'hour). Birthdays as 「M월 D일」 if known.';
    const ask2 = only ? `Rebuild ONLY these people: ${only.join(', ')}. Output {"people":[...]}` : 'Fill the whole rulebook.';
    const raw = await ask(`${ask2}\n${gloss()}\nSchema:\n${SCHEMA}\n\nSource:\n${src.text}`, sys);
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
