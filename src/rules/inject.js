// 본편 주입: 이야기 영향력 게이지(0~4)를 따라 켜고 끈다
import { settings, getMeta, modOn, userName, ctx, shut, shutKey, nextAiNo } from '../base/st.js';
// 😌 눈 감은 앱은 다음 답에 없는 셈 (켜져 있어도)
const onNow = (id) => modOn(id) && !shut(id);
import { clamp, dateText, dateTextEN, short, tokens, DAY } from '../base/util.js';
import { derived, relStage, fold } from './engine.js';
import { tasteOf, recentQuotes, customKey } from './classify.js';
import { personOf, BASIC_ACTS_EN } from './book.js';
import { isEN } from './lang.js';
import { ruleKeys as newsRuleKeys, kindsOn } from './newskinds.js';
import { calLines } from './calplus.js';
import { mode } from './classify.js';
import { sneakExample, foundLines } from './sneak.js';

export const LEVELS = [
    { n: 0, name: '기록만', what: '상태창에만 적어요. 본편에는 한 글자도 안 넣어요.' },
    { n: 1, name: '은근히', what: '경계를 넘을 때만 한 줄 힌트를 넣어요.' },
    { n: 2, name: '보통', what: '지금 사실 + 연출 힌트를 넣어요.' },
    { n: 3, name: '강하게', what: '결과를 지키게 해요 (단계 넘기 막기 · 주사위 보정 · 돈 없으면 못 삼).' },
    { n: 4, name: '주도', what: '미트볼이 사건을 먼저 만들어요 (설렘 · 화면 밖 생활 · 손댄다).' },
];
// 게이지가 걸리는 기능 (기본 오프셋: 한 구절은 0이 기본)
export const GAUGES = [
    { id: 'stats', name: '수치 · 욕구', off: 0 }, { id: 'wallet', name: '돈 · 소지품', off: 0 }, { id: 'rel', name: '관계 · 로맨스', off: 0 },
    { id: 'map', name: '장소 · 지도', off: 0 }, { id: 'calendar', name: '시간 · 날씨', off: 0 }, { id: 'dice', name: '주사위', off: 0 },
    { id: 'news', name: '세계 소식', off: 0 }, { id: 'mind', name: '속마음', off: 0 }, { id: 'quote', name: '한 구절', off: -2 },
];
export const PRESETS = {
    quiet: { name: '조용히', all: 1, by: { stats: -1, wallet: -1, dice: -1, quote: -1 } },
    balance: { name: '균형', all: 2, by: { quote: -2 } },
    game: { name: '게임처럼', all: 2, by: { stats: 1, wallet: 1, dice: 1, quote: -2 } },
    love: { name: '연애 위주', all: 1, by: { rel: 3, mind: 3, quote: -1 } },
};
export function gaugeCfg() { const meta = getMeta(); return meta?.influence ?? settings().influence; }
export function level(id) {
    const g = gaugeCfg(), def = GAUGES.find(x => x.id === id)?.off ?? 0;
    return clamp(Math.round(Number(g.all ?? 2) + Number(g.by?.[id] ?? def)), 0, 4);
}

// 본편 AI에게 줄 「적는 법」 — 모델별 프리셋. 숫자 대신 사건을 적게 한다.
// 💭 카모지 견본 — 답마다 돌려 가며 몇 개만 보여 줌 (같은 것만 반복하지 않게)
const KAO = ['(｡•̀ᴗ-)✧', '(￣ヘ￣)', '(｡>﹏<｡)', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '( ˘•ω•˘ )', '(╬ Ò﹏Ó)', '(っ˘ω˘ς )', '(・_・;)', '(*´▽`*)', '(ㆆ_ㆆ)', '(´；ω；`)', '(ง •̀_•́)ง', '(¬‿¬)', '( ・ั﹏・ั)', '٩(◕‿◕｡)۶', '(；￣Д￣)', '(￣▽￣)ノ', '(｀・ω・´)', '(⊙_⊙)', '(｡•́︿•̀｡)'];
export function ruleText(book) {
    if (isEN()) return ruleTextEN(book); // 🌐 영어 이야기: 본편 AI에게 가는 적는 법도 영어로
    const meta = getMeta(), flash = settings().preset !== 'general';
    const cs = book.world.start.cal ?? {}, tk = cs.style === '' ? '저녁 | +2h' : cs.style === '12' ? '오후 2:30 | +2h' : '14:30 | +2h';
    const K = ['loc: 장소 (옮기면 with도 같이)', `time: ${tk}`, 'with: 이름, 이름 (혼자면 없음)'];
    if (cs.months?.length) K.push(`date: ${cs.months[0].name} 3일 (달: ${cs.months.map(x => x.name).join('·')})`);
    if (onNow('stats')) K.push('ate: 음식', 'slept: 6h', 'washed: -', 'rest: 1h', 'worked: 4h | +30');
    if (onNow('wallet')) K.push('buy: 물건 | 가격', 'earn: 30 | 이유', 'got: 물건', 'used: 물건', 'sell: 물건 | 값', 'lost: 물건', 'wear: 옷', 'unwear: 옷');
    if (onNow('rel')) K.push('act: 이름 | 한 일 (맞는 게 없으면 「기쁘게 함」 · 「상처 줌」)', 'gift: 이름 | 물건', 'memory: 이름 | 큰 사건', 'jealous: 이름 | 이유', ...(level('rel') >= 3 ? ['pair: 이름 | 이름 | +3 | 이유'] : []), 'promise: 내용 | 3/14', 'promise: -지킨 약속');
    if (onNow('calendar')) K.push('weather: 비');
    K.push('status: 감기 | 3d', 'status: -나은 상태', 'npc: 이름 | 성격 한 줄', 'gone: 이름 | 사유');
    if (onNow('news')) K.push(...newsRuleKeys(level('news')));
    if (onNow('rel') && level('rel') >= 4) K.push('meddle: 이름 | 칸 | +5 | 장난 (칸: 기분 같은 수치 · 소지품 | 물건 · 돈 | +30 · 달력 | 5/14 | 글 — 몰래 주는 것만, 가져가지 않음)');
    if (onNow('dice')) K.push('roll: 판정할 일');
    if (onNow('custom')) { const ck = customKey(); if (ck.length) K.push(`custom: ${ck[0][1]} (${ck[0][2]})`); }
    // 🎵 📜 장면 분위기가 바뀌었을 때만 (dev처럼 본편이 고름)
    if (onNow('music')) K.push(`bgm: 곡 제목 - 가수 | 분위기 한 단어 | 왜 (장면 분위기가 바뀌었을 때만 · 실제로 있는 곡${tasteOf() ? ` · 취향: ${tasteOf()}` : ''})`);
    if (onNow('quote')) { const rq = recentQuotes(fold()?.S ?? {}); K.push(`quote: 구절 원문 | 출처 | 한국어 뜻(외국어일 때) | 왜 (분위기가 바뀌었을 때만 · 속담 · 명대사 · 책 · 시 · 유명인의 말 · 사자성어 · 노래 가사 금지 · 한두 문장${rq.length ? ` · 피할 것: ${rq.join(' / ')}` : ''})`); }
    if (onNow('mind') && level('mind') > 0) {
        const who = meta?.mindWho ?? ['cast'];
        const mm = meta?.mindMode ?? 'thought', form = { thought: '짧은 속마음 한 줄', emoji: '이모티콘 2~3개만 (글자 없이)', kaomoji: '카모지 하나 + 아주 짧은 말', mix: '짧은 속마음 + 끝에 카모지' }[mm] ?? '짧은 속마음 한 줄';
        if (who.includes('cast')) K.push(`mind: 이름 | ${form} (장면 속 인물마다 · 관계가 가까울수록 솔직하게, 낯설수록 경계하게)`);
        if (who.includes('watch')) K.push('watch: 관전자 | 한마디');
        if (who.includes('cell')) K.push(`cell: 세포 | ${userName()} 머릿속 반응`);
        if (meta?.mindTone) K.push(`(속마음 말투: ${meta.mindTone})`);
        if (mm === 'kaomoji' || mm === 'mix') { const turn = ctx().chat?.length ?? 0, P = KAO.slice((turn * 5) % KAO.length).concat(KAO).slice(0, 6); K.push(`(카모지는 매번 다르게 · 예: ${P.join(' ')})`); }
    }
    const head = `[STATUS LOG] After the reply, add a <meatball> block. Write EVENTS, not numbers — the extension computes the numbers. One "key: value" per line. Only lines for what happened this reply; skip the rest. Keys:\n${K.filter((k) => !/^[a-z]+:/i.test(k) || !shutKey(k.split(':')[0])).join('\n')}`;
    // 예시도 깔린 앱 줄만 (지운 앱 키를 보여 주면 AI가 따라 씀)
    const exOf = (lines) => { const L = lines.filter(l => !shutKey(l.split(':')[0])); return L.length ? `\nExample:\n<meatball>\n${L.join('\n')}\n</meatball>` : ''; };
    const ex = flash ? exOf(['loc: 빵집', 'buy: 크림빵 | 3', 'ate: 크림빵', 'act: Leon | 칭찬']) + exOf(['time: +3h', 'worked: 3h | +20', 'mind: Leon | 또 늦네']) : '';
    return head + ex;
}
// 🌐 영어 이야기용 적는 법 (위 한국어판과 같은 키 · 같은 순서)
function ruleTextEN(book) {
    const meta = getMeta(), flash = settings().preset !== 'general';
    const cs = book.world.start.cal ?? {}, tk = cs.style === '' ? 'evening | +2h' : cs.style === '12' ? '2:30 PM | +2h' : '14:30 | +2h';
    const K = ['loc: place (when you move, write with too)', `time: ${tk}`, 'with: name, name (none if alone)'];
    if (cs.months?.length) K.push(`date: ${cs.months[0].name} 3 (months: ${cs.months.map(x => x.name).join('·')})`);
    if (onNow('stats')) K.push('ate: food', 'slept: 6h', 'washed: -', 'rest: 1h', 'worked: 4h | +30');
    if (onNow('wallet')) K.push('buy: item | price', 'earn: 30 | reason', 'got: item', 'used: item', 'sell: item | price', 'lost: item', 'wear: clothes', 'unwear: clothes');
    if (onNow('rel')) K.push(`act: name | what they did to/for them (if nothing listed fits: "${BASIC_ACTS_EN.up.act}" or "${BASIC_ACTS_EN.down.act}")`, 'gift: name | item', 'memory: name | big event', 'jealous: name | reason', ...(level('rel') >= 3 ? ['pair: name | name | +3 | reason'] : []), 'promise: what | 3/14', 'promise: -kept promise');
    if (onNow('calendar')) K.push('weather: rain');
    K.push('status: cold | 3d', 'status: -recovered status', 'npc: name | one-line personality', 'gone: name | reason');
    if (onNow('news')) { const on = kindsOn(); if (on.world) K.push('newsline: news | one line of world news (now and then)'); if (on.rumor) K.push('newsline: rumor | a rumor going around (now and then)'); if (on.feed) K.push('feed: name | a short social media post by that person (now and then)'); if (on.life && level('news') >= 3) K.push('life: name | what they did off-screen (now and then)'); }
    if (onNow('rel') && level('rel') >= 4) K.push('meddle: name | slot | +5 | prank (slot: a stat like mood · bag | item · money | +30 · calendar | 5/14 | note — only things they secretly GIVE, never take)');
    if (onNow('dice')) K.push('roll: what to check');
    if (onNow('custom')) { const T = (meta?.custom ?? []).filter(t => t?.name && t.fields?.length); if (T.length) K.push(`custom: tab | field | new value (tabs: ${T.slice(0, 4).map(t => `${t.name}(${t.fields.slice(0, 6).map(f => f.name).join('·')})`).join(', ')})`); }
    if (onNow('music')) K.push(`bgm: song title - artist | mood in one word | why (only when the mood changes · a real song${tasteOf() ? ` · taste: ${tasteOf()}` : ''})`);
    if (onNow('quote')) { const rq = recentQuotes(fold()?.S ?? {}); K.push(`quote: original quote | source | Korean meaning (if not Korean) | why (only when the mood changes · proverb · film line · book · poem · famous saying · no song lyrics · one or two sentences${rq.length ? ` · avoid: ${rq.join(' / ')}` : ''})`); }
    if (onNow('mind') && level('mind') > 0) {
        const who = meta?.mindWho ?? ['cast'];
        const mm = meta?.mindMode ?? 'thought', form = { thought: 'one short inner thought', emoji: '2-3 emoji only (no words)', kaomoji: 'one kaomoji + a very short phrase', mix: 'short inner thought + a kaomoji at the end' }[mm] ?? 'one short inner thought';
        if (who.includes('cast')) K.push(`mind: name | ${form} (each character in the scene · franker the closer they are, guarded with strangers)`);
        if (who.includes('watch')) K.push('watch: onlooker | one remark');
        if (who.includes('cell')) K.push(`cell: brain cell | ${userName()}'s inner reaction`);
        if (meta?.mindTone) K.push(`(inner-thought tone: ${meta.mindTone})`);
        if (mm === 'kaomoji' || mm === 'mix') { const turn = ctx().chat?.length ?? 0, P = KAO.slice((turn * 5) % KAO.length).concat(KAO).slice(0, 6); K.push(`(vary the kaomoji · e.g. ${P.join(' ')})`); }
    }
    const head = `[STATUS LOG] After the reply, add a <meatball> block. Write EVENTS, not numbers — the extension computes the numbers. One "key: value" per line, in English. Only lines for what happened this reply; skip the rest. Keys:\n${K.filter((k) => !/^[a-z]+:/i.test(k) || !shutKey(k.split(':')[0])).join('\n')}`;
    const exOf = (lines) => { const L = lines.filter(l => !shutKey(l.split(':')[0])); return L.length ? `\nExample:\n<meatball>\n${L.join('\n')}\n</meatball>` : ''; };
    const ex = flash ? exOf(['loc: Bakery', 'buy: Cream bun | 3', 'ate: Cream bun', 'act: Leon | praise']) + exOf(['time: +3h', 'worked: 3h | +20', 'mind: Leon | late again']) : '';
    return head + ex;
}
// 지금 사실 고정 · 경계 한 줄 · 연출 힌트 (게이지에 따라)
// 본편에는 「결과값」만: 지금 사실(돈 · 장소 · 시간 · 같이 있는 사람) · 경계를 넘은 결과(증상) · 관계 단계 · 상태 이름 · 약속
// 중간값(숫자 · 보정 · 배수 · 운세 · 능력치)은 상태창 안에서만 쓴다
export function factText(r, lastChanges = []) {
    const { S, book } = r, L = [], H = [];
    const lv = (id) => (onNow(id) && !getMeta()?.hideAI?.[id] ? level(id) : 0); // 🙈 AI에게 숨긴 앱은 0
    const crossNeed = new Set(lastChanges.filter(c => c.f.startsWith('need.')).map(c => c.f.slice(5)));
    // 수치 · 욕구
    const dz = derived(book, S);
    for (const d of dz) {
        const n = lv('stats'), crossed = crossNeed.has(d.key);
        if (n >= 2 || (n === 1 && crossed)) (n >= 2 && !crossed ? L : H).push(`${d.name} ${d.stage}: ${d.text}`);
    }
    // 🎲 주사위 보정 · 운세 · 능력치 같은 중간값은 본편에 안 보낸다 (판정 결과는 입력창 문장으로 간다)
    // 내 상태가 나쁘면 장면 속 인물이 알아챔 (결과: 「알아채고 반응」 · 숫자 없음)
    if (lv('stats') >= 2 && S.with.length) { const bad = dz.filter(d => d.stage === '위험'); if (bad.length) L.push(`${S.with[0]} notices ${userName()}: ${bad.map(d => d.text).join(', ')} — reacts in character (worry or tease)`); }
    // 돈
    if (lv('wallet') >= 2) L.push(`${userName()} money: ${S.cash} ${book.world.currency}${S.items.length ? ` · has: ${S.items.slice(0, 8).map(i => `${i.name}${i.n > 1 ? `×${i.n}` : ''}${i.worn ? '(worn)' : ''}`).join(', ')}` : ''}`);
    if (lv('wallet') >= 3) L.push('cannot spend more money than this; items not listed are not owned');
    // 장소 · 시간
    if (lv('map') >= 2 && S.loc) L.push(`place: ${S.loc}${S.with.length ? ` · with: ${S.with.join(', ')}` : ''}`);
    if (lv('calendar') >= 2) { L.push(`now: ${(isEN() ? dateTextEN : dateText)(book.world.start, S.t)} · ${S.weather}`); }
    // 관계
    const scene = S.with.length ? S.with : [];
    for (const name of scene) {
        const r2 = S.rel[name], p = personOf(book, name); if (!r2) continue;
        if (r2.gone && lv('rel') >= 1) { L.push(`${name} has left the story (${r2.gone}) — must not appear`); continue; }
        if (lv('rel') >= 2) {
            const st = relStage(book, r2.aff, name);
            L.push(`${name}: ${p?.noLove ? 'friend' : `${st.name} (${st.act})`}${r2.mem[0] ? ` · remembers: ${r2.mem[0].text}` : ''}${r2.jealous ? ` · jealous: ${r2.jealous}` : ''}`);
            // 📘 설정집 예외: 장면에 나온 인물만 증상 한 줄
            const sign = p?.signs?.filter(s => r2.aff >= s.at).pop(); if (sign && settings().pinBook !== 'off') L.push(`${name} shows: ${sign.text}`);
        }
        if (lv('rel') >= 3 && !p?.noLove) L.push(`${name}: no actions beyond 「${relStage(book, r2.aff, name).name}」 yet`);
    }
    if (lv('rel') >= 2 && scene.length > 1)
        for (const [k, pr] of Object.entries(S.pairs ?? {})) {
            const [A, B] = k.split('|');
            if (scene.includes(A) && scene.includes(B) && (pr.label || pr.v))
                L.push(
                    `${A}↔${B}: ${pr.label || (pr.v >= 30 ? 'close' : pr.v <= -30 ? 'hostile' : pr.v > 0 ? 'friendly' : 'tense')}` +
                        `${lv('rel') >= 3 && pr.why ? ` (${pr.why})` : ''}`,
                );
        }
    if (lv('rel') >= 4 && S.turn % 6 === 3) H.push('add one small heart-flutter moment this reply');
    // 바뀐 단계 · 딱지
    for (const c of lastChanges) if (c.cross && lv('rel') >= 1) H.push(`${c.label}: ${c.from} → ${c.to}`);
    for (const st of S.status) if (lv('stats') >= 2) L.push(`status: ${st.name}`);
    // 🧩 내 탭 경계 문구 (넘은 턴에만)
    for (const c of lastChanges) if (c.say && lv('stats') >= 1) H.push(`${c.label}: ${c.say}`);
    // 📜 한 구절 — 영향력 1부터, 구절이 바뀐 턴에만 한 번
    if (lv('quote') >= 1) { const q = lastChanges.some(c => c.f === 'quote') && S.quote; if (q) H.push(`weave this line once, naturally (a character may say or recall it): 「${q.text}」 (${q.src})`); }
    // 🎯 속셈 → 화면 밖 사건 (4: 주도 · 여섯 턴에 한 번)
    if (lv('news') >= 4 && S.turn % 6 === 1) { const p = book.people.find(q => !S.with.includes(q.name) && !S.rel[q.name]?.gone && (S.rel[q.name]?.want || q.want)); if (p) H.push(`off-screen, ${p.name} acts on what they want (${S.rel[p.name]?.want || p.want}); record it as life: ${p.name} | …`); }
    // ✍ 손댄다 (관계 4 · 애정 60↑ 또는 질투 · 여덟 턴에 한 번)
    if (lv('rel') >= 4 && S.turn % 8 === 5) { const n = Object.keys(S.rel).find(k => !S.rel[k].gone && (S.rel[k].aff >= 60 || S.rel[k].jealous)); if (n) H.push(`${n} secretly meddles with ${userName()}'s things this turn (small and sweet, never stealing): add ${sneakExample(n, S, book)} (or another small prank)`); }
    if (lv('rel') >= 1) H.push(...foundLines(getMeta(), S, nextAiNo(), userName(), book.world.currency)); // ✍ 몰래 생긴 것을 처음 본 뒤 첫 답 1번
    // 📅 달력 더하기: D-day · 생리 주기 · 👀 메모 (결과 한 줄씩)
    { const cp = calLines(r, lv('calendar'), userName(), mode(), lv('rel')); L.push(...cp.facts); H.push(...cp.hint); }
    // 약속 하루 전
    for (const p of S.promises) if (!p.done && p.due != null && p.due - S.t <= DAY && p.due >= S.t && lv('calendar') >= 1) H.push(`promise due soon: ${p.text}`);
    // ⏰ 지난 약속 (3일 안) — 지켰으면 promise: -내용 으로 지우게
    for (const p of S.promises) if (!p.done && p.due != null && p.due < S.t && S.t - p.due <= DAY * 3 && lv('calendar') >= 2) H.push(`promise overdue (not kept yet): ${p.text}`);
    return { facts: L.length ? `[NOW — keep the story consistent with this]\n${L.join('\n')}` : '', hint: H.length ? `[HINT — show it naturally, don't state numbers]\n${H.join('\n')}` : '' };
}
export const injTokens = (o) => tokens(Object.values(o).join('\n'));
// 게이지 옆에 보일 예상 토큰 · 호출 수 (어림)
export const levelCost = (n) => [{ tok: 0, calls: 0 }, { tok: 15, calls: 0 }, { tok: 60, calls: 0 }, { tok: 90, calls: 0 }, { tok: 110, calls: 0 }][n];
export { short };
