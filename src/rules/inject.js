// 본편 주입: 이야기 영향력 게이지(0~4)를 따라 켜고 끈다
import { settings, getMeta, modOn, userName } from '../base/st.js';
import { clamp, dateText, short, tokens, DAY } from '../base/util.js';
import { derived, relStage, diceMod, worldEvent } from './engine.js';
import { personOf } from './book.js';

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
export function ruleText(book) {
    const meta = getMeta(), flash = settings().preset !== 'general';
    const K = ['loc: 장소', 'time: 14:30 | +2h', 'with: 이름, 이름'];
    if (modOn('stats')) K.push('ate: 음식', 'slept: 6h', 'washed: -', 'rest: 1h', 'worked: 4h | +30');
    if (modOn('wallet')) K.push('buy: 물건 | 가격', 'earn: 30 | 이유', 'got: 물건', 'used: 물건', 'wear: 옷');
    if (modOn('rel')) K.push('act: 이름 | 한 일', 'gift: 이름 | 물건', 'memory: 이름 | 큰 사건', 'jealous: 이름 | 이유', 'promise: 내용 | 3/14');
    if (modOn('calendar')) K.push('weather: 비');
    K.push('status: 감기 | 3d', 'npc: 이름 | 성격 한 줄', 'gone: 이름 | 사유');
    if (modOn('dice')) K.push('roll: 판정할 일');
    if (modOn('mind') && level('mind') > 0) {
        const who = meta?.mindWho ?? ['cast'];
        if (who.includes('cast')) K.push('mind: 이름 | 짧은 속마음 (장면 속 인물마다)');
        if (who.includes('watch')) K.push('watch: 관전자 | 한마디');
        if (who.includes('cell')) K.push(`cell: 세포 | ${userName()} 머릿속 반응`);
    }
    const head = `[STATUS LOG] After the reply, add a <meatball> block. Write EVENTS, not numbers — the extension computes the numbers. One "key: value" per line. Only lines for what happened this reply; skip the rest. Keys:\n${K.join('\n')}`;
    const ex = flash ? `\nExample:\n<meatball>\nloc: 빵집\nbuy: 크림빵 | 3\nate: 크림빵\nact: Leon | 칭찬\n</meatball>\nExample:\n<meatball>\ntime: +3h\nworked: 3h | +20\nmind: Leon | 또 늦네\n</meatball>` : '';
    return head + ex;
}
// 지금 사실 고정 · 경계 한 줄 · 연출 힌트 (게이지에 따라)
export function factText(r, lastChanges = []) {
    const { S, book } = r, L = [], H = [];
    const lv = (id) => (modOn(id) ? level(id) : 0);
    const crossNeed = new Set(lastChanges.filter(c => c.f.startsWith('need.')).map(c => c.f.slice(5)));
    // 수치 · 욕구
    const dz = derived(book, S);
    for (const d of dz) {
        const n = lv('stats'), crossed = crossNeed.has(d.key);
        if (n >= 2 || (n === 1 && crossed)) (n >= 2 && !crossed ? L : H).push(`${d.name} ${d.stage}: ${d.text}`);
    }
    if (lv('dice') >= 3) { const dm = diceMod(book, S); if (dm) L.push(`checks: ${dm} (condition)`); }
    // 돈
    if (lv('wallet') >= 2) L.push(`${userName()} money: ${S.cash} ${book.world.currency}${S.items.length ? ` · has: ${S.items.slice(0, 8).map(i => `${i.name}${i.n > 1 ? `×${i.n}` : ''}${i.worn ? '(worn)' : ''}`).join(', ')}` : ''}`);
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
            const st = relStage(book, r2.aff);
            L.push(`${name}: ${p?.noLove ? `friend ${r2.trust}` : `${st.name} (${st.act})`}${r2.mem[0] ? ` · remembers: ${r2.mem[0].text}` : ''}${r2.jealous ? ` · jealous: ${r2.jealous}` : ''}`);
            // 📘 설정집 예외: 장면에 나온 인물만 증상 한 줄
            const sign = p?.signs?.filter(s => r2.aff >= s.at).pop(); if (sign && settings().pinBook !== 'off') L.push(`${name} shows: ${sign.text}`);
        }
        if (lv('rel') >= 3) L.push(`${name}: no actions beyond 「${relStage(book, r2.aff).name}」 yet`);
    }
    if (lv('rel') >= 4 && S.turn % 6 === 3) H.push('add one small heart-flutter moment this reply (설렘 한 스푼)');
    // 바뀐 단계 · 딱지
    for (const c of lastChanges) if (c.cross && lv('rel') >= 1) H.push(`${c.label}: ${c.from} → ${c.to}`);
    for (const st of S.status) if (lv('stats') >= 2) L.push(`status: ${st.name}${st.until ? ` (${Math.max(1, Math.round((st.until - S.t) / 60))}h left)` : ''}`);
    // 약속 하루 전
    for (const p of S.promises) if (!p.done && p.due != null && p.due - S.t <= DAY && p.due >= S.t && lv('calendar') >= 1) H.push(`promise due soon: ${p.text}`);
    return { facts: L.length ? `[NOW — keep the story consistent with this]\n${L.join('\n')}` : '', hint: H.length ? `[HINT — show it naturally, don't state numbers]\n${H.join('\n')}` : '' };
}
export const injTokens = (o) => tokens(Object.values(o).join('\n'));
// 게이지 옆에 보일 예상 토큰 · 호출 수 (어림)
export const levelCost = (n) => [{ tok: 0, calls: 0 }, { tok: 15, calls: 0 }, { tok: 60, calls: 0 }, { tok: 90, calls: 0 }, { tok: 110, calls: 0 }][n];
export { short };
