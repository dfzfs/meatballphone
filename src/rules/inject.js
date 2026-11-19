// 본편 주입: 이야기 영향력 게이지(0~4)를 따라 켜고 끈다
import { settings, getMeta, modOn, userName, ctx } from '../base/st.js';
import { clamp, dateText, short, tokens, DAY } from '../base/util.js';
import { derived, relStage, worldEvent, haggleNow } from './engine.js';
import { moodTags, pickQuote } from './mood.js';
import { personOf } from './book.js';
import { aspireOf, aspireSteps, personSteps, lvOf } from '../../data/traits.js';

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
    const meta = getMeta(), flash = settings().preset !== 'general';
    const cs = book.world.start.cal ?? {}, tk = cs.style === '' ? '저녁 | +2h' : cs.style === '12' ? '오후 2:30 | +2h' : '14:30 | +2h';
    const K = ['loc: 장소', `time: ${tk}`, 'with: 이름, 이름'];
    if (cs.months?.length) K.push(`date: ${cs.months[0].name} 3일 (달: ${cs.months.map(x => x.name).join('·')})`);
    if (modOn('stats')) K.push('ate: 음식', 'slept: 6h', 'washed: -', 'rest: 1h', 'worked: 4h | +30');
    if (modOn('wallet') && book.world.coins?.length) K.push(`cash: +3 ${book.world.coins[0].name}`);
    if (modOn('wallet')) K.push('buy: 물건 | 가격', 'earn: 30 | 이유', 'got: 물건', 'used: 물건', 'wear: 옷');
    if (modOn('rel')) K.push('act: 이름 | 한 일', 'gift: 이름 | 물건', 'memory: 이름 | 큰 사건', 'jealous: 이름 | 이유', ...(level('rel') >= 3 ? ['pair: 이름 | 이름 | +3 | 이유'] : []), 'promise: 내용 | 3/14');
    if (modOn('calendar')) K.push('weather: 비');
    K.push('status: 감기 | 3d', 'npc: 이름 | 성격 한 줄', 'gone: 이름 | 사유');
    if (modOn('news') && level('news') >= 3) K.push('life: 이름 | 화면 밖에서 한 일 (가끔)');
    if (modOn('rel') && level('rel') >= 4) K.push('meddle: 이름 | 칸 | +5 | 장난');
    if (modOn('dice')) K.push('roll: 판정할 일');
    if (modOn('traits') && (book?.me?.aspire || book?.people?.some(p => p.aspire))) K.push('aspire: 이름 | +1 | 이유 (only when someone clearly moves toward their lifetime wish: promotion, mastery, big milestone)');
    if (modOn('mind') && level('mind') > 0) {
        const who = meta?.mindWho ?? ['cast'];
        const mm = meta?.mindMode ?? 'thought', form = { thought: '짧은 속마음 한 줄', emoji: '이모티콘 2~3개만 (글자 없이)', kaomoji: '카모지 하나 + 아주 짧은 말', mix: '짧은 속마음 + 끝에 카모지' }[mm] ?? '짧은 속마음 한 줄';
        if (who.includes('cast')) K.push(`mind: 이름 | ${form} (장면 속 인물마다 · 관계가 가까울수록 솔직하게, 낯설수록 경계하게)`);
        if (who.includes('watch')) K.push('watch: 관전자 | 한마디');
        if (who.includes('cell')) K.push(`cell: 세포 | ${userName()} 머릿속 반응`);
        if (meta?.mindTone) K.push(`(속마음 말투: ${meta.mindTone})`);
        if (mm === 'kaomoji' || mm === 'mix') { const turn = ctx().chat?.length ?? 0, P = KAO.slice((turn * 5) % KAO.length).concat(KAO).slice(0, 6); K.push(`(카모지는 매번 다르게 · 예: ${P.join(' ')})`); }
    }
    const head = `[STATUS LOG] After the reply, add a <meatball> block. Write EVENTS, not numbers — the extension computes the numbers. One "key: value" per line. Only lines for what happened this reply; skip the rest. Keys:\n${K.join('\n')}`;
    const ex = flash ? `\nExample:\n<meatball>\nloc: 빵집\nbuy: 크림빵 | 3\nate: 크림빵\nact: Leon | 칭찬\n</meatball>\nExample:\n<meatball>\ntime: +3h\nworked: 3h | +20\nmind: Leon | 또 늦네\n</meatball>` : '';
    return head + ex;
}
// 지금 사실 고정 · 경계 한 줄 · 연출 힌트 (게이지에 따라)
// 본편에는 「결과값」만: 지금 사실(돈 · 장소 · 시간 · 같이 있는 사람) · 경계를 넘은 결과(증상) · 관계 단계 · 상태 이름 · 약속
// 중간값(숫자 · 보정 · 배수 · 특성 · 별자리 · 운세 · 능력치)은 상태창 안에서만 쓴다
export function factText(r, lastChanges = []) {
    const { S, book } = r, L = [], H = [];
    const lv = (id) => (modOn(id) && !getMeta()?.hideAI?.[id] ? level(id) : 0); // 🙈 AI에게 숨긴 앱은 0
    const crossNeed = new Set(lastChanges.filter(c => c.f.startsWith('need.')).map(c => c.f.slice(5)));
    // 수치 · 욕구
    const dz = derived(book, S);
    for (const d of dz) {
        const n = lv('stats'), crossed = crossNeed.has(d.key);
        if (n >= 2 || (n === 1 && crossed)) (n >= 2 && !crossed ? L : H).push(`${d.name} ${d.stage}: ${d.text}`);
    }
    // 🎲 주사위 보정 · 특성 · 별자리 · 운세 · 능력치 같은 중간값은 본편에 안 보낸다 (판정 결과는 입력창 문장으로 간다)
    // 내 상태가 나쁘면 장면 속 인물이 알아챔 (결과: 「알아채고 반응」 · 숫자 없음)
    if (lv('stats') >= 2 && S.with.length) { const bad = dz.filter(d => d.stage === '위험'); if (bad.length) L.push(`${S.with[0]} notices ${userName()}: ${bad.map(d => d.text).join(', ')} — reacts in character (worry or tease)`); }
    // 돈
    if (lv('wallet') >= 2) L.push(`${userName()} money: ${S.cash} ${book.world.currency}${Object.entries(S.coins ?? {}).filter(([, n]) => n).map(([k, n]) => ` · ${n} ${k}`).join('')}${haggleNow(S) ? ` · haggled here today: ${haggleNow(S).pct > 0 ? '+' : ''}${haggleNow(S).pct}% (${haggleNow(S).why})` : ''}${S.items.length ? ` · has: ${S.items.slice(0, 8).map(i => `${i.name}${i.n > 1 ? `×${i.n}` : ''}${i.worn ? '(worn)' : ''}`).join(', ')}` : ''}`);
    if (lv('wallet') >= 3) L.push('cannot spend more money than this; items not listed are not owned');
    // 장소 · 시간
    if (lv('map') >= 2 && S.loc) L.push(`place: ${S.loc}${S.with.length ? ` · with: ${S.with.join(', ')}` : ''}`);
    if (lv('calendar') >= 2) { L.push(`now: ${dateText(book.world.start, S.t)} · ${S.weather}`); const ev = worldEvent(Math.floor(S.t / DAY)); if (ev) L.push(`today: ${ev.text}`); }
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
        if (lv('rel') >= 3) L.push(`${name}: no actions beyond 「${relStage(book, r2.aff, name).name}」 yet`);
    }
    if (lv('rel') >= 2 && scene.length > 1) for (const [k, pr] of Object.entries(S.pairs ?? {})) { const [A, B] = k.split('|'); if (scene.includes(A) && scene.includes(B) && (pr.label || pr.v)) L.push(`${A}↔${B}: ${pr.label || (pr.v >= 30 ? 'close' : pr.v <= -30 ? 'hostile' : pr.v > 0 ? 'friendly' : 'tense')}${lv('rel') >= 3 && pr.why ? ` (${pr.why})` : ''}`); }
    if (lv('rel') >= 4 && S.turn % 6 === 3) H.push('add one small heart-flutter moment this reply (설렘 한 스푼)');
    // ⭐ 평생 소원 — 목표 문장과 단계만 (숫자 계산은 상태창 안에서)
    if (modOn('traits') && level('rel') >= 2) {
        const G = [], mine = aspireOf(book.me.aspire, book);
        if (mine) { const st = aspireSteps(mine, book), k = st.filter(v => (mine.val(S, book) ?? 0) >= v).length; G.push(`${userName()}: ${mine.en} (stage ${k}/${st.length})`); }
        for (const p of book.people) { const a = aspireOf(p.aspire); if (!a || S.rel[p.name]?.gone) continue; const st = personSteps(a), k = st.filter(v => lvOf(S, p.name) >= v).length; if (S.with.includes(p.name) || G.length < 4) G.push(`${p.name}: ${a.en} (stage ${k}/${st.length})`); }
        if (G.length) L.push(`lifetime wishes (let them drive choices now and then):\n${G.slice(0, 5).join('\n')}`);
    }
    // 바뀐 단계 · 딱지
    for (const c of lastChanges) if (c.cross && lv('rel') >= 1) H.push(`${c.label}: ${c.from} → ${c.to}`);
    for (const st of S.status) if (lv('stats') >= 2) L.push(`status: ${st.name}`);
    // 🧩 내 탭 경계 문구 (넘은 턴에만)
    for (const c of lastChanges) if (c.say && lv('stats') >= 1) H.push(`${c.label}: ${c.say}`);
    // 📜 한 구절 — 영향력 1부터, 구절이 바뀐 턴에만 한 번
    if (lv('quote') >= 1) { const q = pickQuote(moodTags(r, lastChanges), getMeta()?.recent?.quote ?? [], S.turn); if (q && getMeta()?.quoteSent !== q.text) H.push(`weave this line once, naturally (a character may say or recall it): 「${q.text}」 (${q.src})`); }
    // 🎯 속셈 → 화면 밖 사건 (4: 주도 · 여섯 턴에 한 번)
    if (lv('news') >= 4 && S.turn % 6 === 1) { const p = book.people.find(q => !S.with.includes(q.name) && !S.rel[q.name]?.gone && (S.rel[q.name]?.want || q.want)); if (p) H.push(`off-screen, ${p.name} acts on what they want (${S.rel[p.name]?.want || p.want}); record it as life: ${p.name} | …`); }
    // ✍ 손댄다 (관계 4 · 애정 60↑ 또는 질투 · 여덟 턴에 한 번)
    if (lv('rel') >= 4 && S.turn % 8 === 5) { const n = Object.keys(S.rel).find(k => !S.rel[k].gone && (S.rel[k].aff >= 60 || S.rel[k].jealous)); if (n) H.push(`${n} secretly meddles with ${userName()}'s status window this turn: add meddle: ${n} | 기분 | +5 | 낙서 (or another small prank)`); }
    // 약속 하루 전
    for (const p of S.promises) if (!p.done && p.due != null && p.due - S.t <= DAY && p.due >= S.t && lv('calendar') >= 1) H.push(`promise due soon: ${p.text}`);
    return { facts: L.length ? `[NOW — keep the story consistent with this]\n${L.join('\n')}` : '', hint: H.length ? `[HINT — show it naturally, don't state numbers]\n${H.join('\n')}` : '' };
}
export const injTokens = (o) => tokens(Object.values(o).join('\n'));
// 게이지 옆에 보일 예상 토큰 · 호출 수 (어림)
export const levelCost = (n) => [{ tok: 0, calls: 0 }, { tok: 15, calls: 0 }, { tok: 60, calls: 0 }, { tok: 90, calls: 0 }, { tok: 110, calls: 0 }][n];
export { short };
