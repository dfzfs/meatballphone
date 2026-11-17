// 규칙 · 변화량 처리 — <meatball> 한 줄(키=값)을 상태에 반영 (engine.js에서 떼어 냄)
import { setAlias } from './core.js';
import { letterMode, ctx, settings, EMPTY, DIFFS, GLOBAL_OFF, clamp, num, norm, findBy, parseNum, splitBar, signed, fmtNum, short, dayIndex, addDays, dateStr, eventsOn, parseDate, nowTick, wholeTick, useDays, stamp, viewTr, diffOf, loveIndex, touchContact, THREAD_MAX, dateShort, DEFAULT_STAGES, relAxes, romanceStart, ssNote, parseClock, toClockStyle, fmtClock, nextTime, nextTimeWraps } from './core.js';
import { enStr } from './skeleton_en.js';

export const KEYMAP = {
    stat: 'stat', '수치': 'stat', '게이지': 'stat', gauge: 'stat', hp: 'stat',
    attr: 'attr', '능력치': 'attr', '능력': 'attr',
    cond: 'cond', '상태': 'cond', '상태이상': 'cond', buff: 'cond', '버프': 'cond', condition: 'cond', conditions: 'cond', status: 'cond', debuff: 'cond', '디버프': 'cond',
    cash: 'cash', money: 'cash', '돈': 'cash', '재산': 'cash', '소지금': 'cash', gold: 'cash',
    item: 'item', items: 'item', '아이템': 'item', '소지품': 'item', inventory: 'item', inv: 'item', bag: 'item', '가방': 'item', '인벤토리': 'item',
    stock: 'stock', '상품': 'stock', '입고': 'stock',
    decor: 'decor', '가구': 'decor', '장식': 'decor',
    room: 'room', '방': 'room',
    loc: 'loc', '위치': 'loc', '장소': 'loc', location: 'loc',
    place: 'place', '발견장소': 'place', '새장소': 'place',
    aff: 'aff', affection: 'aff', love: 'aff', romance: 'aff', '호감': 'aff', '호감도': 'aff', '애정': 'aff', '애정도': 'aff', trust: 'trust', friendship: 'trust', '신뢰': 'trust', '신뢰도': 'trust', '우정': 'trust', '우정도': 'trust',
    rel: 'rel', '관계': 'rel', pair: 'pair', '인물관계': 'pair', pairaff: 'pairaff', '인물호감': 'pairaff',
    date: 'date', '날짜': 'date', day: 'date', '일': 'date', time: 'time', '시간': 'time', '시간대': 'time',
    days: 'date', '날짜이동': 'date', period: 'time', slot: 'time',
    event: 'event', '일정': 'event',
    ach: 'ach', '업적': 'ach', achievement: 'ach',
    memo: 'memo', '메모': 'memo', note: 'memo',
    msg: 'msg', '연락': 'msg', '문자': 'msg', message: 'msg', '메시지': 'msg', letter: 'msg', '편지': 'msg',
    npc: 'npc', '인물': 'npc', '새인물': 'npc',
    roll: 'roll', '판정': 'roll', '판정요청': 'roll',
    quest: 'quest', quests: 'quest', mission: 'quest', '퀘스트': 'quest', '의뢰': 'quest', '임무': 'quest',
    news: 'news', '뉴스': 'news', '소식': 'news',
    rumor: 'rumor', gossip: 'rumor', '소문': 'rumor', '가십': 'rumor',
    post: 'post', '게시글': 'post', '게시판': 'post',
    curse: 'curse', '저주': 'curse', blessing: 'curse', '축복': 'curse',
    weather: 'weather', '날씨': 'weather',
    bgm: 'bgm', music: 'bgm', song: 'bgm', '음악': 'bgm', '노래': 'bgm', '추천곡': 'bgm', 'ost': 'bgm',
    sns: 'sns', feed: 'sns', '피드': 'sns', '인스타': 'sns', 'sns글': 'sns',
    custom: 'custom', tab: 'custom', '내탭': 'custom', '탭': 'custom',
    life: 'life', offscreen: 'life', '근황': 'life', '화면밖': 'life',
    jealous: 'jealous', jealousy: 'jealous', '질투': 'jealous',
    mind: 'mind', '속마음': 'mind', thought: 'mind', feel: 'mind',
    confess: 'confess', '고백': 'confess', concern: 'concern', '신경': 'concern', '고민': 'concern', taste: 'taste', '취향': 'taste',
    alert: '_alert', '알림': '_alert',
};
export const KEY_MOD = {
    stat: 'stats', attr: 'stats', cond: 'stats', cash: 'wallet', item: 'wallet', stock: 'shop', decor: 'home', room: 'home', loc: 'map', place: 'map',
    aff: 'rel', trust: 'rel', rel: 'rel', pair: 'rel', pairaff: 'rel', date: 'calendar', time: 'calendar', event: 'calendar', ach: 'ach', memo: 'memo', msg: 'contact',
    npc: 'profile', roll: 'dice', quest: 'quest', news: 'news', rumor: 'gossip', post: 'board', curse: 'fate', weather: 'calendar',
    bgm: 'music', sns: 'sns', custom: 'custom', life: 'rel', mind: 'rel', jealous: 'rel', confess: 'rel', concern: 'rel', taste: 'rel',
};
function ensure(s, mod) {
    if (!s.data[mod]) s.data[mod] = EMPTY[mod]();
    return s.data[mod];
}
const QSTATUS = { open: 'open', new: 'open', '새': 'open', '등록': 'open', '공고': 'open', active: 'active', accept: 'active', accepted: 'active', 'in progress': 'active', '수락': 'active', '진행': 'active', '진행중': 'active', '시작': 'active', done: 'done', complete: 'done', completed: 'done', finished: 'done', '완료': 'done', '성공': 'done', '달성': 'done', failed: 'failed', fail: 'failed', '실패': 'failed', '포기': 'failed' };
const QNAME = { open: '새 의뢰', active: '진행', done: '완료', failed: '실패' };

// ───── 운명 · 돈: 효과 계산 ─────
// 문자열 시드 → 0~1 난수 (같은 채팅·같은 날이면 늘 같은 결과 — 다시 계산해도 바뀌지 않게)
export function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
        const t = (h ^= h >>> 16) >>> 0;
        return t / 4294967296;
    };
}
export const effSum = (s, re) => {
    let n = 0;
    for (const c of s?.data?.fate?.curses ?? []) for (const e of c.effects) { const m = e.match(re); if (m) n += parseFloat(m[1].replace('−', '-')); }
    return n;
};
export const affMul = (s) => Math.max(0, 1 + effSum(s, /(?:호감|애정|aff(?:ection)?)\s*(?:상승|획득|gains?)?\s*([+\-−]?\d+(?:\.\d+)?)\s*%/i) / 100);
export const LOAN_KIND = {
    bank: { name: '은행', rate: 10, days: 30, icon: 'fa-building-columns' },
    shark: { name: '사채', rate: 30, days: 7, icon: 'fa-skull-crossbones' },
    pawn: { name: '전당포', rate: 10, days: 14, icon: 'fa-ring' },
};
export const CREDIT_CURSE = { name: '신용불량', kind: 'curse', desc: '빚을 제때 갚지 못했다', effects: ['가격 +30%', '대출 불가'], days: null, cure: '연체된 빚을 모두 갚기', auto: 'debt' };
export const today = (s) => (s.data.calendar ? dayIndex(s.data.calendar) : null);
const PERIOD = (s, every) => (every === 'day' ? 1 : every === 'week' ? Math.max(1, s.data.calendar?.week?.length || 7) : 30);
// "체력 -5" · "돈 +10" · "cash: +200" · 여러 개는 ; 또는 줄바꿈
// 쉼표 뒤에 숫자가 아닌 글이 오면 다른 항목 (「1,000」은 안 나눔)
const MULTI_RE = /\s*,\s*(?=[^\d\s,])/;
// 점검 반영: AI가 숫자 뒤에 이유를 붙이면(「Leon +2 (he smiled)」 · 「체력 -12 — 맞음」) 줄이 통째로 버려졌다 → 숫자 뒤의 괄호 · 줄표 설명은 떼고 읽는다
// 「| 메모」 뒤는 안 건드리고, 이름 안의 괄호(「체력(HP) -12」)나 이름 끝 숫자(「R2 - D2 +3」)도 그대로
const NOTE_KEYS = new Set(['stat', 'attr', 'aff', 'trust', 'jealous', 'pairaff']);
// (lookbehind 정규식은 쓰지 않는다 — 옛 사파리에서 정규식 자체가 오류라 확장이 통째로 안 켜짐 → 숫자를 묶어서 되살린다)
const NUM_TOK = '((?:^|[\\s+\\-−=])\\d[\\d.,]*)';
const NOTE_PAREN = new RegExp(`${NUM_TOK}\\s*[(（\\[][^()（）\\[\\]]*[)）\\]]`, 'g');
const NOTE_DASH = new RegExp(`${NUM_TOK}\\s*(?:[—–]|\\s-\\s)\\s*[^\\d\\s,][^,]*`, 'g');
export function dropNote(val) {
    const cut = val.indexOf('|');
    const head = cut < 0 ? val : val.slice(0, cut), tail = cut < 0 ? '' : val.slice(cut);
    const h = head.replace(NOTE_PAREN, '$1').replace(NOTE_DASH, '$1').trimEnd();
    return h === head.trimEnd() || !/\d$/.test(h) ? val : (tail ? `${h} ${tail}` : h);
}
// 「aff: Leon +2, trust: Leon +1」처럼 한 줄에 다른 키를 섞어 쓰면 그 키로 보낸다 (예전엔 우정 +1이 애정에 더해졌음)
function applyPart(s, key, part, info) {
    const kv = part.match(/^([^:：]{1,24}?)\s*[:：]\s*(.+)$/);
    if (kv && KEYMAP[kv[1].trim().toLowerCase()]) applyOp(s, kv[1].trim(), kv[2], info);
    else applyOp(s, key, part, info);
}
// 게이지 이름을 다른 말로 쓰면(「HP」 「Health」 ↔ 「체력」) 새 게이지를 만들지 않고 이미 있는 같은 뜻의 게이지에 반영한다
const BAR_ALIAS = [
    ['hp', 'health', 'life', 'vitality', '체력', '생명', '생명력', '건강'],
    ['mp', 'mana', 'magic', '마나', '마력', '내공', '기'],
    ['stamina', 'energy', 'sp', '기력', '스태미나', '에너지', '활력'],
    ['stress', '스트레스'],
    ['fatigue', 'tiredness', 'exhaustion', '피로', '피로도'],
    ['hunger', '허기', '배고픔', '공복'],
    ['sanity', 'mental', 'willpower', '정신력', '멘탈', '이성'],
];
function aliasBar(bars, name) {
    const n = norm(name);
    const g = BAR_ALIAS.find(a => a.includes(n));
    return g ? (bars ?? []).find(b => g.includes(norm(b.name))) ?? null : null;
}
export function applyLines(s, text, info) {
    for (const raw0 of String(text ?? '').split(/\s*[;\n]\s*/)) {
        let line0 = raw0.trim();
        if (!line0) continue;
        // 마크다운으로 적은 줄 (검수): 「- cash: +10」 「* item: …」 「1. loc: …」 「**cash**: +10」 「**cash:** +10」 → 키 줄로 (예전엔 ⚠ 못 읽은 줄)
        { const md = line0.replace(/^(?:[-*•·]\s+|\d{1,2}[.)]\s+)/, '').replace(/^(\*\*|__)([^*_:：]{1,24}?)\1\s*([:：])/, '$2$3').replace(/^(\*\*|__)([^*_:：]{1,24}?)([:：])\1/, '$2$3');
          if (md !== line0 && /^[^:：]{1,24}[:：]\s*\S/.test(md)) line0 = md; }
        const kv = line0.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/);
        if (kv) { applyOp(s, kv[1].trim(), kv[2], info); continue; }
        // 키 없이 「Stamina +30, Stress -5」 → 하나씩 (v2.7.19 · 아이템 · 일거리 효과)
        for (const line of line0.split(MULTI_RE)) applyBare(s, line.trim(), info);
    }
}
function applyBare(s, line, info) {
    line = dropNote(line); // 「Health -5 (fall)」 (검수: 예전엔 키 없는 줄에 이유가 붙으면 버려졌다)
    const nv = line.match(/^(.+?)\s+([=+\-−]?\d[\d.,]*)$/);
    if (!nv) return;
    const nm = nv[1].trim();
    // 게이지·능력치 이름이 먼저 (예: 'HP'는 키 별칭이기도 해서)
    if (findBy(s.data.stats?.bars ?? [], nm) || (s.data.stats && aliasBar(s.data.stats.bars, nm))) applyOp(s, 'stat', `${nm} ${nv[2]}`, info); // HP · Health → 체력 (stat: 줄과 같은 별명)
    else if (findBy(s.data.stats?.attrs ?? [], nm)) applyOp(s, 'attr', `${nm} ${nv[2]}`, info);
    else applyOp(s, nm, nv[2], info);
}
function addCurse(s, c, info) {
    const f = ensure(s, 'fate');
    const ex = findBy(f.curses, c.name);
    if (ex) { ex.since = today(s); return; }
    f.curses.push({ name: c.name, kind: c.kind ?? 'curse', desc: c.desc ?? '', effects: [...(c.effects ?? [])], days: c.days ?? null, since: today(s), cure: c.cure ?? '', auto: c.auto ?? '' });
    if (s.tally && c.kind !== 'bless') s.tally.curses++;
    info.labels.push(`${c.kind === 'bless' ? '✨' : '☠'} ${c.name}`);
    info.alerts.push(`${c.kind === 'bless' ? '축복' : '저주'} — ${c.name}${c.effects?.length ? ` (${c.effects.join(', ')})` : ''}`);
}
function liftDebtCurse(s, info) {
    const w = s.data.wallet, f = s.data.fate;
    if (!f || w?.loans.some(l => l.status === 'late')) return;
    const k = f.curses.findIndex(c => c.auto === 'debt');
    if (k >= 0) { info.labels.push(`해제: ${f.curses[k].name}`); f.curses.splice(k, 1); }
}
function drawCard(s, card, info) {
    if (!card) return;
    const f = ensure(s, 'fate');
    const day = today(s);
    f.today = { title: card.title, desc: card.desc, day: day ?? s.turn };
    f.log.push({ title: card.title, kind: card.kind, date: stamp(s) });
    if (f.log.length > 30) f.log.shift();
    info.labels.push(`🃏 ${card.title}`);
    info.alerts.push(`이벤트 카드 — ${card.title}${card.desc ? `: ${short(card.desc, 50)}` : ''}`);
    applyLines(s, card.effect, info);
}
// 하루가 지날 때마다: 정기 수입·지출 · 빚 연체 · 저주의 매일 효과와 기간 · 이벤트 카드
function dayTick(s, info, from, to) {
    const end = Math.min(to, from + 60);
    closeDay(s, info, from);
    s.newDay = true;
    for (const r of s.data.rel?.user ?? []) if (r.jealous) r.jealous = Math.max(0, r.jealous - 8 * Math.min(end - from, 12));
    for (let day = from + 1; day <= end; day++) {
        const w = s.data.wallet, f = s.data.fate;
        const cal = s.data.calendar;
        if (cal?.autoWeather && day === end) cal.weather = pickWeather(cal, `${info.seed}:w${day}`);
        if (w && info.mods?.wallet !== false) {
            for (const r of w.regular) {
                const per = PERIOD(s, r.every);
                if (r.next === null) r.next = from + per;
                let guard = 0;
                while (r.next <= day && guard++ < 400) {
                    applyOp(s, 'cash', `${r.amount >= 0 ? '+' : '-'}${Math.abs(r.amount)}`, info);
                    r.next += per;
                }
            }
            for (const l of w.loans) {
                if (l.status !== 'open' || l.due === null || day <= l.due) continue;
                if (l.kind === 'pawn') { l.status = 'lost'; info.alerts.push(`전당포 기한이 지나 ${l.item || '맡긴 물건'}을(를) 잃었다`); continue; }
                l.status = 'late';
                info.alerts.push(`${LOAN_KIND[l.kind].name} 빚 ${fmtNum(l.owed)} ${w.currency} 연체!`);
                if (info.mods?.fate !== false) addCurse(s, CREDIT_CURSE, info);
            }
        }
        if (f && info.mods?.fate !== false) {
            for (const c of [...f.curses]) {
                if (c.days && c.since === null) c.since = from; // 처음부터 있던(만들 때 생긴) 저주도 기간이 흐르게
                for (const e of c.effects) { const m = e.match(/^(?:매일|daily|every\s*day)\s*[:：]?\s*(.+)$/i); if (m) applyLines(s, m[1], info); }
                if (c.days && c.since !== null && day >= c.since + c.days) {
                    f.curses.splice(f.curses.indexOf(c), 1);
                    info.labels.push(`해제: ${c.name}`); info.alerts.push(`${c.name}이(가) 풀렸다`);
                }
            }
            if (f.deck.length && f.drawChance > 0) {
                const r = seeded(`${info.seed}:day${day}`);
                if (r() * 100 < f.drawChance) drawCard(s, f.deck[Math.floor(r() * f.deck.length)], info);
            }
        }
    }
}
// ───── 날씨 · 계절 ─────
const WEATHER = {
    spring: [['☀️ 맑음', 5], ['⛅ 구름', 3], ['🌧 비', 2], ['🌫 안개', 1], ['🌸 꽃바람', 1]],
    summer: [['☀️ 맑음', 4], ['🔥 무더위', 3], ['🌧 비', 3], ['⛈ 소나기', 2], ['🌀 폭풍', 1]],
    autumn: [['☀️ 맑음', 5], ['⛅ 구름', 3], ['🍂 쌀쌀함', 2], ['🌧 비', 2], ['🌫 안개', 1]],
    winter: [['☀️ 맑음', 3], ['☁️ 흐림', 3], ['❄️ 눈', 3], ['🥶 한파', 2], ['🌨 눈보라', 1]],
};
export function seasonOf(cal) {
    const k = Math.floor(((cal.m - 1) / Math.max(1, cal.months.length)) * 12); // 0~11, 달 이름이 달라도 1년을 12로 나눠 본다
    return k >= 2 && k <= 4 ? 'spring' : k >= 5 && k <= 7 ? 'summer' : k >= 8 && k <= 10 ? 'autumn' : 'winter';
}
export function pickWeather(cal, seed) {
    const table = WEATHER[seasonOf(cal)];
    const total = table.reduce((a, [, w]) => a + w, 0);
    let x = seeded(seed)() * total;
    for (const [n, w] of table) { if ((x -= w) < 0) return viewTr() ? enStr(n) : n; } // 영어 저장이면 영어 날씨 (화면은 한국어로)
    return table[0][0];
}
// 지도에서 몇 칸 떨어졌나 (이어진 곳 따라 BFS)
export function hopsBetween(map, from, to) {
    if (!map || norm(from) === norm(to)) return 0;
    const key = (n) => norm(n);
    const adj = new Map();
    for (const p of map.places) for (const l of p.links) {
        (adj.get(key(p.name)) ?? adj.set(key(p.name), new Set()).get(key(p.name))).add(key(l));
        (adj.get(key(l)) ?? adj.set(key(l), new Set()).get(key(l))).add(key(p.name));
    }
    const seen = new Set([key(from)]); let q = [key(from)], d = 0;
    while (q.length && d < 30) {
        d++; const nq = [];
        for (const x of q) for (const y of adj.get(x) ?? []) { if (y === key(to)) return d; if (!seen.has(y)) { seen.add(y); nq.push(y); } }
        q = nq;
    }
    return 1; // 길이 없으면 한 칸으로 친다
}
// ───── 관계 단계: 호감·신뢰가 문턱을 넘으면 해금 (내려갈 땐 10 여유) ─────
export function stageIndex(stages, aff, trust) {
    let k = 0;
    stages.forEach((st, i) => { if (aff >= st.at && trust >= st.trust) k = i; });
    return k;
}
// ───── 로맨스 보정 (v2.6) — 설정에서 켠 뒤의 메시지에만 적용 (meta.romFrom) ─────
const romLive = (s) => s.romActive === true;
// 맨 위 단계(보통 「연인」)는 숫자만으론 못 감 — 「연인 확정」(r.bond)이 있어야. 확정이면 숫자와 상관없이 맨 위.
// 💞 연인 단계(loveIndex)만 막는다. 연인 단계가 없는 세계관(우정·신뢰 단계뿐)이면 단계는 숫자대로 — 연인 확정은 따로 표시만.
function bondCap(s, st, want, r) {
    if (!settings().romBond || !romLive(s)) return want;
    const L = loveIndex(st);
    if (L < 1) return want;
    if (r.bond) return Math.max(want, L);
    if (want < L || (r.stage ?? -1) >= L) return want; // 켜기 전에 이미 연인 단계였던 사람은 그대로
    return L - 1;
}
// AI 답 1번에 오를 수 있는 호감·신뢰 상한 + 연달아 오르면 점점 덜 오르게
function romGain(s, info, name, key, gain) {
    const set = settings();
    if (!set.romCap && !set.romFatigue) return gain;
    const k = `${key}:${norm(name)}`;
    let g = gain;
    if (set.romFatigue) { const run = s.romRun?.[k] ?? 0; if (run >= 2) g = Math.max(1, Math.round(g * (run >= 3 ? 0.34 : 0.6))); }
    const used = (info.romUsed ??= {})[k] ?? 0;
    const cap = set.romCap ? Math.max(1, Math.round(num(key === 'aff' ? set.romCapAff : set.romCapTrust, 5))) : Infinity;
    g = Math.max(0, Math.min(g, cap - used));
    info.romUsed[k] = used + g;
    if (g < gain) info.labels.push(`⚖️ ${name} ${relAxes(s.data.rel)[key === 'aff' ? 'aff' : 'trust']} +${gain}→+${g}`);
    return g;
}
// 💗 애정 꺼 둔 사람의 단계: 애정/우정 방식이면 애정 없이(=-100) 닿는 우정 단계까지, 옛 방식이면 연애 단계 바로 앞까지
export function noLoveStage(rl, st, r, raw) {
    const rs = romanceStart(rl);
    const k = relAxes(rl).love ? stageIndex(st, -100, r.trust) : raw;
    return rs > 0 ? Math.min(k, rs - 1) : k;
}
export function updateStage(s, r, info, silent = false) {
    const rl = s.data.rel; if (!rl) return;
    if (!stagesOn()) silent = true; // 단계 기능을 껐으면 단계 칩 · 알림 · 기념일 없이 숫자만
    const st = rl.stages?.length ? rl.stages : DEFAULT_STAGES;
    let raw = stageIndex(st, r.aff, r.trust);
    if (r.noLove) raw = noLoveStage(rl, st, r, raw); // 💗 애정 꺼 둠: 연애 단계 앞까지만
    const want = bondCap(s, st, raw, r);
    if (want < raw) {
        if (!r.bondReady) {
            r.bondReady = true;
            if (!silent) { info.labels.push(`💌 ${r.name}: 「${st[raw].name}」 조건 충족 · 고백 전`); info.alerts.push(`💌 ${r.name} — 「${st[raw].name}」 단계 조건은 채웠어요. 고백이 오가면 관계 탭에서 「연인 확정」을 눌러 주세요.`); }
        }
    } else r.bondReady = false;
    if (r.stage < 0 || r.stage >= st.length) { r.stage = want; return; }
    if (want > r.stage) {
        r.stage = want;
        if (silent) return;
        const g = st[want];
        info.labels.push(`💞 ${r.name}: ${g.name}`);
        info.alerts.push({ kind: 'stage', who: r.name, name: g.name, text: g.unlock });
        anniversary(s, r, want, st);
    } else if (want < r.stage) {
        const cur = st[r.stage];
        if (r.aff < cur.at - 10 || r.trust < cur.trust - 10) {
            r.stage = want;
            if (!silent) { info.labels.push(`💔 ${r.name}: ${st[want].name}`); info.alerts.push(`💔 ${r.name}와(과)의 사이가 「${st[want].name}」(으)로 멀어졌다`); }
        }
    }
}
// 기념일 자동: 친구가 되면 「처음 만난 날」, 맨 위 단계가 되면 그날 + 100일
function anniversary(s, r, k, st) {
    const cal = s.data.calendar; if (!cal || info0(s)) return;
    const add = (e) => { if (!cal.events.some(x => norm(x.title) === norm(e.title))) cal.events.push(e); };
    if (k >= 2 && r.met) { const dt = parseDate(cal, r.met); if (dt) add({ y: null, m: dt.m, d: dt.d, title: viewTr() ? `The day {{user}} first met ${r.name}` : `${r.name}와 처음 만난 날`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'yearly' }); }
    if (k === st.length - 1) {
        add({ y: null, m: cal.m, d: cal.d, title: viewTr() ? `The day {{user}} and ${r.name} became ${st[k].name}` : `${r.name}와 ${st[k].name}이 된 날`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'yearly' });
        const t = { ...cal }; addDays(t, 99);
        add({ y: t.y, m: t.m, d: t.d, title: viewTr() ? `100 days with ${r.name}` : `${r.name}와 100일`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'once' });
    }
}
const info0 = (s) => s.data.calendar?.noAuto === true;
// 질투: 누군가와 가까워지면, 호감이 높은 다른 사람의 질투가 오른다 (날이 지나면 식음)
function jealousyFrom(s, gainer, amount, info) {
    if (!settings().jealousy || amount <= 0) return;
    const g = findBy(s.data.rel?.user ?? [], gainer);
    if (!g || g.aff < 20) return; // 꽤 가까워진 사람에게만
    for (const y of s.data.rel?.user ?? []) {
        if (norm(y.name) === norm(gainer) || y.aff < 50 || y.noLove) continue; // 애정 꺼 둔 사람은 질투도 안 함
        const b = y.jealous;
        y.jealous = clamp(b + Math.ceil(amount), 0, 100);
        if (b < 50 && y.jealous >= 50) info.alerts.push(`💢 ${y.name}의 질투가 쌓이고 있다`);
    }
}
// 하루 정리: 날짜가 넘어갈 때 그날 있었던 일을 한 장으로
function closeDay(s, info, dayIdx) {
    const b = s.dayBuf; if (!b) return;
    const cal = s.data.calendar;
    const cashNow = s.data.wallet?.cash ?? null;
    const aff = [];
    for (const r of s.data.rel?.user ?? []) { const was = b.aff[norm(r.name)]; if (was !== undefined && was !== r.aff) aff.push([r.name, r.aff - was]); }
    const labels = [...b.labels, ...info.labels.slice(info.cut ?? 0)].filter(l => !/^📅|^🕐/.test(l));
    info.cut = info.labels.length;
    if (labels.length || aff.length || (cashNow !== null && b.cash !== null && cashNow !== b.cash)) {
        const dd = cal ? dateFromIndex(cal, dayIdx) : null;
        const day = { date: dd ? dateStr(cal, dd.y, dd.m, dd.d) : `${s.turn}턴`, cash: cashNow !== null && b.cash !== null ? cashNow - b.cash : 0, cur: s.data.wallet?.currency ?? '', aff: aff.sort((a, c) => Math.abs(c[1]) - Math.abs(a[1])).slice(0, 5), labels: labels.slice(-30), n: labels.length };
        (s.days ??= []).push(day);
        if (s.days.length > 30) s.days.shift();
        if (settings().daySummary) info.alerts.push({ kind: 'day', day });
    }
    s.dayBuf = startDay(s);
}
export function startDay(s) {
    return { cash: s.data.wallet?.cash ?? null, aff: Object.fromEntries((s.data.rel?.user ?? []).map(r => [norm(r.name), r.aff])), labels: [] };
}

// AI가 이름 자리에 이상한 걸 쓰면(「+3」, 「체력 max」, 태그, 유저 자신) 유령 인물이 생기지 않게 (v2.7)
function personName(s, raw) {
    const nm = String(raw ?? '').replace(/<[^>]*>|\*\*|__|`/g, '').replace(/^[\s+\-−=]+|[\s:：]+$/g, '').trim();
    if (!nm || nm.length > 30 || !/\p{L}/u.test(nm) || /[|,%=<>{}]|^\d/.test(nm) || /^(nan|null|undefined|none|없음)$/i.test(nm)) return '';
    const n = norm(nm);
    if (/^(max|최대|user|유저|나|me|you|\{\{user\}\}|\{\{char\}\})$/i.test(nm)) return '';
    try { if (n === norm(ctx().name1)) return ''; } catch { /* 이름 모름 */ }
    for (const g of [...(s.data.stats?.bars ?? []), ...(s.data.stats?.attrs ?? [])]) { const k = norm(g.name); if (k && (n === k || n.startsWith(k))) return ''; }
    return nm;
}
// AI가 부호를 빼먹은 숫자 (「cash: 120」 「aff: 레온 35」): 예전엔 그 값으로 「바꿈」 → 돈·호감이 통째로 날아갈 수 있었음 (v2.7)
// 지금 값과 가까우면 「새 합계」로 보고 바꾸고, 아니면 빼먹은 「+」로 보고 더한다. 직접 편집·버튼(=)은 그대로.
function bareFix(p, cur, info) {
    if (!p || p.mode !== 'bare' || !info?.ai) return p;
    const c = Number(cur) || 0;
    return c !== 0 && Math.abs(p.v - c) <= Math.abs(p.v) * 0.3 ? { mode: 'set', v: p.v } : { mode: 'add', v: p.v };
}
// ⚠ 못 읽은 줄 (v2.7.23): AI 답의 변화 줄인데 키를 모르거나 값 모양이 달라 넘어간 것 — 칩 옆에 ⚠로 알려 준다
const miss = (info, k, v, unknownKey = false) => { if (!info?.ai) return; const t = `${k}: ${v}`; (info.miss ??= []).push(t); if (unknownKey) (info.missKey ??= []).push(t); }; // missKey = 모르는 키 (mood 같은 꾸밈 키일 수 있음)
// 🔗 인물 합치기 (v2.7.23): 「레온 => Leon」 — 레온의 수치를 Leon에 더하고 레온을 지운 뒤, 앞으로 「레온」으로 오는 변화는 Leon에게 간다
function opXMerge(s, val, info) {
    const [a0, b0] = String(val).split('=>').map(x => x.trim());
    if (!a0 || !b0 || norm(a0) === norm(b0)) return;
    const rl = ensure(s, 'rel');
    const exact = (n) => rl.user.find(r => norm(r.name) === norm(n));
    const to = exact(b0); if (!to) return;
    const from = exact(a0);
    if (from) {
        to.aff = clamp(Math.round((to.aff || 0) + (from.aff || 0)), -100, 100);
        to.trust = clamp(Math.round((to.trust || 0) + (from.trust || 0)), -100, 100);
        to.jealous = Math.max(to.jealous || 0, from.jealous || 0);
        for (const k of ['label', 'memo', 'met', 'likes', 'dislikes', 'concern']) if (!to[k] && from[k]) to[k] = from[k];
        if (from.bond) { to.bond = true; (s.bonds ??= {})[norm(to.name)] = true; }
        rl.user = rl.user.filter(r => r !== from);
        const fn = norm(from.name);
        for (const p of rl.pairs ?? []) { if (norm(p.a) === fn) p.a = to.name; if (norm(p.b) === fn) p.b = to.name; }
        const pk = (p) => [norm(p.a), norm(p.b)].sort().join('\u0000');
        rl.pairs = (rl.pairs ?? []).filter((p, i, all) => norm(p.a) !== norm(p.b) && all.findIndex(q => pk(q) === pk(p)) === i);
        for (const x of rl.life ?? []) if (norm(x.who) === fn) x.who = to.name;
    }
    const al = (rl.alias ??= {});
    al[norm(a0)] = to.name;
    for (const k of Object.keys(al)) if (norm(al[k]) === norm(a0)) al[k] = to.name; // 예전에 a0로 합친 이름들도 따라감
    delete al[norm(to.name)];
    setAlias(al);
    to.stage = -1; updateStage(s, to, info, true);
}
export function applyOp(s, rawKey, rawVal, info) {
    setAlias(s.data?.rel?.alias);
    let key = KEYMAP[String(rawKey).trim().toLowerCase()] ?? (String(rawKey).startsWith('_') ? String(rawKey) : null);
    let val = String(rawVal ?? '').trim();
    if (!key && /^(relationship|relation|관계도)$/i.test(String(rawKey).trim())) key = /[+\-−]\s*\d/.test(val) ? 'aff' : 'rel'; // 「relationship: Leon +2」 = 애정 · 「relationship: Leon = 친구」 = 관계 이름 (검수)
    if (!key) {
        const nm = String(rawKey).trim();
        if (s.data.stats && (findBy(s.data.stats.bars, nm) || aliasBar(s.data.stats.bars, nm))) { key = 'stat'; val = `${nm} ${val}`; } // 「health: -5」 → 체력 (검수: 별명 키를 못 읽었다)
        else if (s.data.stats && findBy(s.data.stats.attrs, nm)) { key = 'attr'; val = `${nm} ${val}`; }
        else if (s.data.wallet && norm(nm) === norm(s.data.wallet.currency)) key = 'cash';
        else return miss(info, nm, val, true);
    }
    const mod = KEY_MOD[key];
    if (mod && info.mods && info.mods[mod] === false) return;
    if (mod && GLOBAL_OFF[mod] && settings()[GLOBAL_OFF[mod]] === false) return; // 모든 채팅에서 끈 칸 (v2.7.3)
    if (!val && !key.startsWith('_')) return;
    if (NOTE_KEYS.has(key)) val = dropNote(val.replace(/\(\s*([=+\-−]\s*\d[\d.,]*)\s*\)\s*$/, ' $1')); // 「Leon(+2)」 → 「Leon +2」 (검수)
    const L = (t) => info.labels.push(t);
    const T = (s.tally ??= { earn: 0, spend: 0, places: [], rolls: 0, good: 0, crit: 0, fumble: 0, sent: 0, got: 0, quests: 0, curses: 0 });
    // 한 줄이 잘못돼도 그 줄만 건너뛴다 — 예전엔 여기서 오류가 나면 그 채팅의 상태창 계산 전체가 멈췄다 (그 답이 남아 있는 한 계속)
    if (Object.hasOwn(OPS, key)) { try { OPS[key](s, val, info, L, T, key, rawKey); } catch (e) { ssNote(`op ${key}`, e); } }
}
// ───── 변화량 처리기: 예전엔 applyOp 한 함수의 switch 안에 다 들어 있었음 → 종류마다 함수 하나
// 모두 (s 상태, val 값, info 이번 메시지 정보, L 칩 글 남기기, T 집계, key 정리한 키, rawKey 원래 키)를 받고, 돌려주는 값은 쓰지 않는다
// 새 종류: KEYMAP · KEY_MOD에 키를 넣고 → 여기 함수를 쓰고 → 맨 아래 OPS 표에 올린다
function opXAlert(s, val, info, L, T, key, rawKey) { if (val) info.alerts.push(val); return; }
function opBgm(s, val, info, L, T, key, rawKey) {
    const mu = ensure(s, 'music');
    const [head, mood, why] = splitBar(val);
    const hm = head.match(/^(.+?)\s+(?:-|–|—|by|\/)\s+(.+)$/i);
    const title = (hm ? hm[1] : head).replace(/^["“'「『]|["”'」』]$/g, '').trim();
    const artist = hm ? hm[2].replace(/^["“'「『]|["”'」』]$/g, '').trim() : '';
    if (!title || norm(title) === norm(mu.now?.title) || /^(없음|none|-)$/i.test(title)) return;
    // 가벼운 모델이 매 턴 곡을 바꾸지 않게: 본편 답에서는 3턴에 한 번까지 (버튼으로 고른 건 바로)
    const fromAI = !String(info.seed).includes(':adj:');
    if (fromAI && mu.turn !== undefined && s.turn - mu.turn < 3) return;
    if (fromAI) mu.turn = s.turn;
    mu.now = { title, artist, mood: mood ?? '', why: why ?? '', date: stamp(s) };
    mu.log.push(mu.now);
    if (mu.log.length > 30) mu.log.shift();
    L(`♪ ${short(title, 16)}`);
    info.alerts.push({ kind: 'music', title, artist, text: mood ?? '' });
    return;
}
function opSns(s, val, info, L, T, key, rawKey) {
    const sn = ensure(s, 'sns');
    const [author, text, pic, tags] = splitBar(val);
    if (!author || !(text || pic)) return;
    if (!String(info.seed).includes(':adj:')) { if (sn.turn !== undefined && s.turn - sn.turn < 2) return; sn.turn = s.turn; } // 본편 답에서는 2턴에 한 번까지
    sn.posts.push({ id: `${info.seed}:s${sn.posts.length}`, author, text: text ?? '', pic: pic ?? '', tags: tags ?? '', likes: Math.floor(seeded(`${info.seed}:sl${sn.posts.length}`)() * 60) + 3, date: stamp(s), mine: false, liked: false, replies: [] });
    L(`#️⃣ ${author}`);
    if (findBy(s.data.rel?.user ?? [], author)) info.alerts.push({ kind: 'sns', who: author, text: text || pic });
    return;
}
function opCustom(s, val, info, L, T, key, rawKey) {
    const cu = ensure(s, 'custom');
    let [tn, rest] = splitBar(val);
    if (rest === undefined) { rest = tn; tn = ''; }
    const m = rest.match(/^\s*\+?\s*(.+?)\s*(?:=\s*(.+)|([+\-−]\s*[\d.,]+))\s*$/);
    if (!m) return;
    const fname = m[1].trim();
    let tab = tn ? findBy(cu.tabs, tn) : cu.tabs.find(t => findBy(t.fields, fname, 'k'));
    if (!tab) { if (!tn) return; tab = { name: tn.trim(), icon: '📌', note: '', inject: true, fields: [] }; cu.tabs.push(tab); }
    let f = findBy(tab.fields, fname, 'k');
    const isNum = m[3] !== undefined || /^[+\-−]?[\d.,]+$/.test(String(m[2] ?? '').trim());
    if (!f) { f = { k: fname, type: isNum ? 'num' : 'text', v: isNum ? 0 : '', max: 100, desc: '' }; tab.fields.push(f); }
    if (f.type === 'text') { const v = String(m[2] ?? m[3] ?? '').trim(); if (v !== f.v) { f.v = v; L(`${tab.icon} ${f.k}: ${short(v, 14)}`); } return; }
    const p = parseNum(m[3] !== undefined ? m[3].replace(/\s+/g, '') : `=${m[2]}`);
    if (!p) return;
    const b = f.v;
    f.v = p.mode === 'add' ? b + p.v : p.v;
    if (f.type === 'bar') f.v = clamp(f.v, 0, f.max);
    if (f.v !== b) L(`${tab.icon} ${f.k} ${signed(f.v - b)}`);
    return;
}
function opLife(s, val, info, L, T, key, rawKey) {
    if (!settings().offscreen) return;
    const rl = ensure(s, 'rel');
    const [who, text] = splitBar(val);
    if (!who || !text) return;
    rl.life.push({ who, text, date: stamp(s) });
    if (rl.life.length > 20) rl.life.shift();
    L(`🌙 ${who}`);
    info.alerts.push({ kind: 'life', who, text });
    return;
}
function opMind(s, val, info, L, T, key, rawKey) { // 💭 속마음 · 이모티콘 · 카모지 (이름 | 내용) — 마지막 것만 둠
    val = nameSplit(s, val);
    const [nm, ...rest] = splitBar(val); const text = rest.join(' | ').trim();
    // v2.9: 관계에 없는 인물도 프로필에 있으면 거기에 적는다 (나 자신은 빼고)
    let r = s.data.rel ? findBy(s.data.rel.user, nm) : null;
    if (!r) { const p = findBy(s.data.profile?.list ?? [], nm); if (p && p.role !== 'user') r = p; }
    if (!r || !text) return;
    const t = cleanMind(text); if (!t) return;
    r.mind = { text: t, turn: s.turn };
    // v2.9: 지난 것도 5개까지 남긴다 (프로필 › 속마음 탭의 기록) — 같은 턴에 다시 오면 바꿔 적는다
    const log = (r.mindLog ?? []).filter(x => x.turn !== s.turn); log.push({ text: t, turn: s.turn }); r.mindLog = log.slice(-5);
    return;
}
function opJealous(s, val, info, L, T, key, rawKey) {
    const rl = ensure(s, 'rel');
    const m = val.match(/^(.+?)\s*([=+\-−]\s*[\d.]+)\s*$/); if (!m) return;
    const r = findBy(rl.user, m[1]); if (!r) return;
    const p = parseNum(m[2].replace(/\s+/g, '')); if (!p) return;
    const b = r.jealous; r.jealous = clamp(Math.round(p.mode === 'add' ? b + p.v : p.v), 0, 100);
    if (r.jealous !== b) L(`💢 ${r.name} ${signed(r.jealous - b)}`);
    return;
}
function opConfess(s, val, info, L, T, key, rawKey) { // 로맨스 보정: AI는 「고백이 오갔다」고 알리기만, 확정은 유저가
    if (!settings().romBond) return;
    const rl = ensure(s, 'rel');
    const [nm] = splitBar(val);
    const r = findBy(rl.user, nm.replace(/^[+]\s*/, ''));
    if (!r || r.bond || r.noLove) return;
    if (r.bondAsk && s.turn - (r.bondAskAt ?? 0) < 10) return; // 「아직」을 고른 뒤 10턴 안엔 다시 안 물어봄
    r.bondAsk = true; r.bondAskAt = s.turn;
    L(`💌 ${r.name}: 고백?`);
    info.alerts.push({ kind: 'confess', who: r.name }); // index.js가 「연인으로 확정할까요?」 창을 띄운다
    return;
}
function opXNolove(s, val, info, L, T, key, rawKey) { // 💗 애정 꺼 두기 / 다시 켜기 (관계 탭 버튼)
    const rl = ensure(s, 'rel');
    const r = findBy(rl.user, val); if (!r) return;
    if (key === '_nolove') r.noLove = true; else delete r.noLove;
    (s.nolove ??= {})[norm(r.name)] = !!r.noLove; // 관계 칸을 통째로 저장해도 유지
    r.stage = -1; updateStage(s, r, info, true);
    return;
}
function opXBond(s, val, info, L, T, key, rawKey) {
    const rl = ensure(s, 'rel');
    const r = findBy(rl.user, val); if (!r) return;
    r.bond = key === '_bond'; r.bondAsk = false;
    (s.bonds ??= {})[norm(r.name)] = r.bond; // 연인 확정은 따로 기억 → 나중에 관계 칸을 통째로 저장해도 안 풀림
    if (r.bond) updateStage(s, r, info);
    else { r.stage = -1; updateStage(s, r, info, true); }
    return;
}
function opConcern(s, val, info, L, T, key, rawKey) {
    if (!settings().romDrive) return;
    const rl = ensure(s, 'rel');
    const [nm, a, b] = splitBar(val);
    const r = findBy(rl.user, nm); if (!r) return;
    if (key === 'concern') { const v = String(a ?? '').trim(); if (v === r.concern) return; r.concern = /^(없음|none|-)$/i.test(v) ? '' : v; L(`💭 ${r.name}`); }
    else { if (a) r.likes = a; if (b) r.dislikes = b; }
    return;
}
// v2.9 퀘스트 확인 대기: 본편 AI의 답이고(info.ai) · 설정이 켜져 있고 · 이 기능이 생긴 뒤의 답이고(meta.qAsk 번째 메시지부터 — 옛 답의 결과는 안 바꾼다) · 안 끝난 단계가 있을 때
function questHold(q, info) {
    if (!info?.ai || settings().questAsk === false) return false;
    const from = info.meta?.qAsk; if (!Number.isFinite(from) || !(info.i >= from)) return false;
    return q.steps.length > 0 && q.steps.some(x => !x.done);
}
function opXQask(s, val) { const q = (s.data.quest?.list ?? []).find(x => x.id === val || norm(x.title) === norm(val)); if (q) delete q.ask; return; } // 「아직 아니에요」
function opXNeedmod(s, val) { const st = s.data.stats; if (!st) return; let o = {}; try { o = JSON.parse(val || '{}') ?? {}; } catch { o = {}; } if (o && typeof o === 'object' && Object.keys(o).length) st.mods = o; else delete st.mods; return; } // 👕 입은 것의 욕구 보정 (addons.js가 갈아입을 때 적는다)
function opXPeekday(s, val, info, L, T, key, rawKey) { s.peek = { day: today(s) ?? s.turn, n: ((s.peek?.day === (today(s) ?? s.turn)) ? s.peek.n : 0) + 1 }; return; }
function opCurse(s, val, info, L, T, key, rawKey) {
    const [n0, eff, days, cure, kind] = splitBar(val);
    const nm = n0.replace(/^[+\-−]\s*/, '').trim();
    if (!nm) return;
    const f = ensure(s, 'fate');
    if (/^[-−]/.test(n0) || /^(해제|없음|풀림)$/.test(eff ?? '')) {
        const ex = findBy(f.curses, nm);
        if (ex) { f.curses.splice(f.curses.indexOf(ex), 1); L(`해제: ${ex.name}`); }
        return;
    }
    addCurse(s, { name: nm, kind: /축복|bless/i.test(`${kind ?? ''}${rawKey}`) ? 'bless' : 'curse', effects: String(eff ?? '').split(/\s*[,，]\s*/).filter(Boolean), days: parseInt(days, 10) > 0 ? parseInt(days, 10) : null, cure: cure ?? '' }, info);
    return;
}
function opXEffect(s, val, info, L, T, key, rawKey) { applyLines(s, val, info); return; }
function opWeather(s, val, info, L, T, key, rawKey) { const cal = ensure(s, 'calendar'); val = String(val).split(/\s*(?:→|->|=>|⇒|➡)\s*/).pop().trim(); if (!val) return; if (val !== cal.weather) { cal.weather = val; L(`날씨: ${val}`); } return; }
// 🕐 시간 적는 법 바꾸기 (달력 탭) — '' 시간대 · '24' · '12' · 'both'. 지금 적힌 시간도 그 모양으로 옮긴다
function opXClock(s, val, info, L) {
    const cal = s.data.calendar; if (!cal) return;
    const st = ['24', '12', 'both'].includes(String(val)) ? String(val) : '';
    if (st) cal.clock = st; else delete cal.clock;
    const t = toClockStyle(cal.time, st, cal.times, viewTr());
    if (t !== cal.time) { cal.time = t; L(`🕐 ${t}`); }
}
function opXSpot(s, val) { const mp = s.data.map; if (!mp) return; if (String(val ?? '').trim()) mp.spot = String(val).trim(); else delete mp.spot; return; } // 🏢 건물 안 어디 (층 · 방) — 지도 탭에서 층을 눌렀을 때
function opXTravel(s, val, info, L, T, key, rawKey) {
    // 지도에서 이동: 위치 + 칸 수만큼 시간대가 흐름(하루를 넘기면 날짜도) + 요금
    const mp = s.data.map; if (!mp) return;
    const p = findBy(mp.places, val); if (!p) return;
    if (norm(p.name) === norm(mp.here)) return; // 이미 여기
    const hops = hopsBetween(mp, mp.here, p.name);
    applyOp(s, 'loc', p.name, info);
    const cal = s.data.calendar;
    if (cal && hops > 0 && info.mods?.calendar !== false) {
        if (cal.clock) { // 🕐 시각 달력: 한 칸에 1시간
            const t = (parseClock(cal.time) ?? 0) + Math.min(hops, 240) * 60, days = Math.floor(t / 1440);
            if (days) applyOp(s, 'date', `+${days}`, info);
            applyOp(s, 'time', fmtClock(t, cal.clock, cal.times, viewTr()), info);
            if (p.fare && s.data.wallet) applyOp(s, 'cash', `-${p.fare}`, info);
            return;
        }
        let i = Math.max(0, cal.times.indexOf(cal.time)), days = 0;
        for (let k = 0; k < hops; k++) { i++; if (i >= cal.times.length) { i = 0; days++; } }
        if (days) applyOp(s, 'date', `+${days}`, info);
        applyOp(s, 'time', cal.times[i], info);
    }
    if (p.fare && s.data.wallet) applyOp(s, 'cash', `-${p.fare}`, info);
    return;
}
function opXTrash(s, val, info, L, T, key, rawKey) {
    const hm = s.data.home; if (!hm) return;
    const [nm, price] = splitBar(val);
    const k = hm.storage.findIndex(x => norm(x) === norm(nm)); if (k < 0) return;
    const item = hm.storage.splice(k, 1)[0];
    if (key === '_trash') { hm.trash.push({ name: item, date: stamp(s) }); if (hm.trash.length > 20) hm.trash.shift(); L(`🗑 ${item}`); }
    else { const p = Math.max(0, Math.round(num(price, 0))); if (p) applyOp(s, 'cash', `+${p}`, info); L(`♻ ${item} 중고 판매`); }
    return;
}
function opXPurge(s, val, info, L, T, key, rawKey) { // 🗑 완전 삭제: 「버렸다」 기록을 바꿔 쓴 것 — 창고에서 조용히 빼기만 (쓰레기통·기록·라벨 없음)
    const hm = s.data.home; if (!hm) return;
    const k = hm.storage.findIndex(x => norm(x) === norm(val));
    if (k >= 0) hm.storage.splice(k, 1);
    return;
}
function opXRestore(s, val, info, L, T, key, rawKey) {
    const hm = s.data.home; if (!hm) return;
    const k = hm.trash.findIndex(x => norm(x.name) === norm(val)); if (k < 0) return;
    hm.storage.push(hm.trash.splice(k, 1)[0].name); L(`↩ ${val}`);
    return;
}
function opXDraw(s, val, info, L, T, key, rawKey) {
    // 뽑은 카드 자체를 기록에 담는다 (나중에 덱을 고쳐도 지난 결과가 바뀌지 않게). 옛 기록(번호)도 읽는다.
    let card = null;
    try { card = val.startsWith('{') ? JSON.parse(val) : s.data.fate?.deck[Number(val)]; } catch (err) { ssNote('운명 카드 값이 깨짐', err); }
    if (card?.title) drawCard(s, card, info);
    return;
}
// 🔮 점집 (v2.8.1): 본 점괘를 통째로 기록에 담는다 (다시 계산해도 같은 점괘) · 그 인물의 생년월일(명식)을 기억 · 오늘의 점괘 한 줄은 AI에게도 감
const FT_NAME = { tarot: '타로', orb: '수정구슬', shaman: '무당', gut: '굿' };
function keepBirth(f, who, person) {
    if (!person || !Object.values(person).some(Boolean)) return;
    f.births ??= [];
    const ex = findBy(f.births, who);
    if (ex) { for (const [k, v] of Object.entries(person)) if (v && !ex[k]) ex[k] = v; } // 이미 적힌 것은 안 바꾼다 (내가 고친 생년월일이 이김)
    else f.births.push({ name: who, ...person });
}
function opXFortune(s, val, info, L, T, key, rawKey) {
    let r = null;
    try { r = JSON.parse(val); } catch (err) { ssNote('점괘 값이 깨짐', err); }
    if (!r?.who || !r.method) return;
    const f = ensure(s, 'fate');
    f.readings ??= [];
    f.readings.push({ ...r, id: r.id || `${info.seed}:ft${f.readings.length}` });
    if (f.readings.length > 12) f.readings.shift();
    keepBirth(f, r.who, r.person);
    const gist = r.omen || r.summary || r.result || '';
    if (gist) f.omen = { id: f.readings.at(-1).id, who: r.who, method: r.method, text: gist, day: today(s) ?? s.turn };
    // 굿: 저주 풀기 · 가호(축복) 걸기는 여기서 실제로 일어난다
    if (r.method === 'gut') {
        if (r.lift) { const ex = findBy(f.curses, r.lift); if (ex) { f.curses.splice(f.curses.indexOf(ex), 1); L(`해제: ${ex.name}`); } }
        if (r.bless?.name) { // AI가 효과를 글 하나로 · 날수를 「3일」로 줘도 (검수: 글자마다 효과 하나로 쪼개졌다)
            const eff = (Array.isArray(r.bless.effects) ? r.bless.effects : String(r.bless.effects ?? '').split(/\s*[,，\n]\s*/)).map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 6);
            const days = parseInt(r.bless.days, 10);
            addCurse(s, { name: String(r.bless.name).slice(0, 40), kind: 'bless', desc: String(r.bless.desc ?? ''), effects: eff, days: Number.isFinite(days) && days > 0 ? days : null, cure: '' }, info);
        }
    }
    L(`🔮 ${FT_NAME[r.method] ?? '점'}: ${r.who}${r.topic ? ` · ${r.topic}` : ''}`);
    return;
}
// 🗑 점괘 지우기: id 하나 · * = 점괘 전부 + 생년월일 전부 (낸 돈 · 굿으로 풀린 저주 · 받은 가호는 그대로)
function opXFtdel(s, val, info, L, T, key, rawKey) {
    const f = s.data.fate; if (!f) return;
    if (val === '*') { f.readings = []; f.births = []; f.omen = null; return; }
    f.readings = (f.readings ?? []).filter(r => r.id !== val);
    if (f.omen?.id === val) f.omen = null;
    return;
}
// 생년월일 직접 고치기 (이름 | JSON) · 지우기 (-이름)
function opXBirth(s, val, info, L, T, key, rawKey) {
    const f = ensure(s, 'fate');
    f.births ??= [];
    if (/^[-−]/.test(val)) { const ex = findBy(f.births, val.replace(/^[-−]\s*/, '')); if (ex) f.births.splice(f.births.indexOf(ex), 1); return; }
    let b = null;
    try { b = JSON.parse(val); } catch (err) { ssNote('생년월일 값이 깨짐', err); }
    if (!b?.name) return;
    const ex = findBy(f.births, b.name);
    if (ex) Object.assign(ex, b); else f.births.push(b);
    return;
}
// 복채 정하기: 타로 | 수정구슬 | 무당 | 굿 (0 = 자동)
function opXFee(s, val, info, L, T, key, rawKey) {
    const f = ensure(s, 'fate');
    const [a, b, c, d] = splitBar(val).map(x => Math.max(0, Math.round(num(x, 0))));
    f.feeTarot = a || 0; f.feeOrb = b || 0; f.feeShaman = c || 0; f.feeGut = d || 0;
    return;
}
function opXLoan(s, val, info, L, T, key, rawKey) {
    const w = ensure(s, 'wallet');
    const [kind0, amt0, item] = splitBar(val);
    const kind = LOAN_KIND[kind0] ? kind0 : 'bank';
    const amount = Math.max(0, Math.round(num(amt0, 0)));
    if (!amount) return;
    const K = LOAN_KIND[kind];
    const t = today(s);
    if (kind === 'pawn' && item) { const ex = findBy(w.items, item); if (!ex) return; ex.qty -= 1; if (ex.qty <= 0) w.items.splice(w.items.indexOf(ex), 1); }
    w.loans.push({ id: `${info.seed}:loan${w.loans.length}`, kind, lender: K.name, principal: amount, owed: Math.round(amount * (1 + K.rate / 100)), due: t === null ? null : t + K.days, item: item ?? '', status: 'open' });
    w.cash += amount;
    L(`💰 ${K.name} +${fmtNum(amount)}`);
    return;
}
function opXRepay(s, val, info, L, T, key, rawKey) {
    const w = s.data.wallet; if (!w) return;
    const l = w.loans.find(x => x.id === val && (x.status === 'open' || x.status === 'late'));
    if (!l || w.cash < l.owed) return;
    w.cash -= l.owed; l.status = 'paid';
    if (l.kind === 'pawn' && l.item) { const ex = findBy(w.items, l.item); if (ex) ex.qty++; else w.items.push({ name: l.item, qty: 1, desc: '', effect: '' }); }
    L(`💸 ${l.lender} 빚 청산 −${fmtNum(l.owed)}`);
    liftDebtCurse(s, info);
    return;
}
// 「스태미나 +10 | 난로 옆에서 쉼」처럼 숫자 뒤에 「| 이유」를 붙이면 줄이 통째로 버려졌다 (칩 점검 「일부 줄을 못 읽었어요」)
// stat · attr에는 「|」 뒤에 들어갈 칸이 없으니, 「|」 앞이 숫자로 끝나면 뒤는 이유로 보고 뗀다 (쉼표가 든 이유도 여러 개로 쪼개지지 않게 먼저)
// 숫자 모양 다듬기 (검수): 「120 → 90」 = 90으로 · 「= 50」(= 뒤 띄어쓰기)도 정하기
//   예전엔 「체력 = 50」이 +50으로, 「힘 = 12」는 「힘 =」이라는 능력치가 생겼다
const ARROW_RE = /^(.*?)[=+\-−]?\s*[\d.,]+\s*(?:→|->|=>|⇒|➡)\s*([\d.,]+)\s*$/;
// 이름을 감싼 따옴표 · 괄호 떼기 (검수): 「loc: 「항구」」 「item: +"마법 반지"」 — 예전엔 따옴표째 새 장소 · 물건이 생겼다
const unquote = (t) => { const x = String(t ?? '').trim(); const m = x.match(/^(["“”'‘’「『《〈【\[])(.+)(["“”'‘’」』》〉】\]])$/); return m ? m[2].trim() : x; };
// 「Leon: 안녕」 「Leon - 안녕」처럼 「|」 대신 쌍점 · 줄표로 이름과 글을 나눈 줄 (검수) — 아는 사람 이름일 때만 「이름 | 글」로 (예전엔 조용히 버려졌다)
function nameSplit(s, val, any = false) { // any: 모르는 이름도 나눈다 (msg는 늘 「이름 | 글」이라)
    if (String(val).includes('|')) return val;
    const m = String(val).match(/^([^:：\-—–]{1,24}?)\s*(?:[:：]|\s[-—–]\s)\s*(.+)$/); if (!m) return val;
    const nm = m[1].trim(), known = [s.data.contact?.contacts, s.data.rel?.user, s.data.profile?.list].some(list => findBy(list ?? [], nm));
    return known || any ? `${nm} | ${m[2].trim()}` : val;
}
function numShape(val) {
    let v = String(val).replace(/([=+\-−])\s+(?=\d)/g, '$1'); // 「= 50」 「+ 5」
    const a = v.match(ARROW_RE); if (a) v = `${a[1]}=${a[2]}`;
    return v;
}
const dropPipeNote = (val) => { const i = val.indexOf('|'); return i > 0 && /\d\s*$/.test(val.slice(0, i)) ? val.slice(0, i).trim() : val; };
function opStat(s, val, info, L, T, key, rawKey) {
    val = dropPipeNote(val);
    // v2.7.19: 「Stamina +30, Stress -5」처럼 쉼표로 여러 개 — 예전엔 통째로 「Stamina +30, Stress」 게이지 -5로 읽어서 Stamina가 깎였음
    if (MULTI_RE.test(val)) { for (const part of val.split(MULTI_RE)) if (part.trim()) applyPart(s, 'stat', part.trim(), info); return; }
    val = numShape(val);
    // 「체력 85/100」 = 85로 (부호가 있으면 「+5/100」 = +5 · 뒤는 최대라 안 씀) · 「체력 -12%」 = 최대의 12% (예전엔 둘 다 그냥 넘어갔다)
    const frac = val.match(/^(.+?)\s+([=+\-−]?)([\d.,]+)\s*\/\s*[\d.,]+\s*$/); if (frac) val = `${frac[1]} ${frac[2] || '='}${frac[3]}`;
    const pct = val.match(/^(.+?)\s+([+\-−])\s*([\d.]+)\s*%$/);
    const st = ensure(s, 'stats');
    if (pct) { const b0 = findBy(st.bars, pct[1]) ?? aliasBar(st.bars, pct[1]); if (!b0) return miss(info, key, val); val = `${b0.name} ${pct[2]}${Math.max(1, Math.round(b0.max * parseFloat(pct[3]) / 100))}`; }
    // 「hp: −5」처럼 키가 곧 게이지 이름이고 값이 숫자뿐이면 그 이름으로 읽는다 (예전엔 「−」라는 게이지가 생겼음)
    if (/^[=+\-−]?\s*[\d.,]+$/.test(val) && !['stat', '수치', '게이지', 'gauge'].includes(norm(rawKey))) val = `${String(rawKey).trim()} ${val}`;
    const m = val.match(/^(.+?)\s*(max|최대)?\s*([=+\-−][\d.,]+|\d[\d.,]*)\s*$/i);
    if (!m) return miss(info, key, val);
    let bar = findBy(st.bars, m[1]) ?? aliasBar(st.bars, m[1]);
    if (!bar && !/\p{L}/u.test(m[1])) return miss(info, key, val); // 글자가 없는 이름(「−」 「+」)으로는 게이지를 만들지 않는다
    if (!bar) { bar = { name: m[1].trim(), cur: 100, max: 100, color: '', desc: '' }; st.bars.push(bar); }
    let p = parseNum(m[3]);
    if (!p) return;
    if (!m[2]) p = bareFix(p, bar.cur, info);
    if (m[2]) { const b = bar.max; bar.max = Math.max(1, p.mode === 'add' ? bar.max + p.v : p.v); bar.cur = Math.min(bar.cur, bar.max); L(`${bar.name} 최대 ${signed(bar.max - b)}`); return; }
    const before = bar.cur;
    bar.cur = clamp(p.mode === 'add' ? bar.cur + p.v : p.v, 0, bar.max);
    if (bar.cur !== before) L(`${bar.name} ${signed(bar.cur - before)}`);
    if (before > 0 && bar.cur <= 0) info.alerts.push(`${bar.name}이(가) 0이 되었다`);
    return;
}
function opAttr(s, val, info, L, T, key, rawKey) {
    val = dropPipeNote(val);
    if (MULTI_RE.test(val)) { for (const part of val.split(MULTI_RE)) if (part.trim()) applyPart(s, 'attr', part.trim(), info); return; }
    val = numShape(val);
    const st = ensure(s, 'stats');
    const m = val.match(/^(.+?)\s*([=+\-−][\d.]+|\d[\d.]*)\s*$/);
    if (!m) return miss(info, key, val);
    let a = findBy(st.attrs, m[1]);
    if (!a) { a = { name: m[1].trim(), val: 0, desc: '' }; st.attrs.push(a); }
    const p = bareFix(parseNum(m[2]), a.val, info); if (!p) return;
    const b = a.val; a.val = Math.round(p.mode === 'add' ? a.val + p.v : p.v);
    if (a.val !== b) L(`${a.name} ${signed(a.val - b)}`);
    return;
}
function opCond(s, val, info, L, T, key, rawKey) {
    // 「+Poisoned, +Tired」 → 하나씩 (v2.7.19 · 예전엔 「Poisoned, +Tired」 상태 하나가 생겼음)
    if (!val.includes('|') && /,\s*[+\-−]/.test(val)) { for (const part of val.split(/\s*,\s*(?=[+\-−])/)) if (part.trim()) applyOp(s, 'cond', part.trim(), info); return; }
    const st = ensure(s, 'stats');
    const [n0, desc] = splitBar(val);
    const rm = /^[-−]/.test(n0);
    const name = n0.replace(/^[+\-−]\s*/, '');
    if (!name) return;
    const ex = findBy(st.conds, name);
    if (rm || /^(해제|없음)$/.test(desc ?? '')) { if (ex) { st.conds.splice(st.conds.indexOf(ex), 1); L(`해제: ${ex.name}`); } return; }
    if (ex) { if (desc) ex.desc = desc; return; }
    st.conds.push({ name, desc: desc ?? '' }); L(`상태: ${name}`);
    return;
}
function opCash(s, val, info, L, T, key, rawKey) {
    const w = ensure(s, 'wallet');
    val = numShape(val);
    // 「3,000원 지출」 「spent 30」처럼 부호 없이 쓰는 말이 붙으면 그 뜻대로 (검수: 예전엔 지출이 +3,000으로 들어갔다)
    if (!/^\s*[=+\-−]/.test(val)) { const m = val.match(/[\d.,]+\s*(?:만|천|억|k)?/i); if (m) { if (/(지출|사용|소비|잃|뺏|빼앗|내[줬주]|지불|낸|냈|떨어뜨|spent|spend|lost|paid|pay|cost)/i.test(val)) val = `-${m[0]}`; else if (/(획득|수입|벌|받|얻|주웠|earn|gain|got|receiv|found)/i.test(val)) val = `+${m[0]}`; } }
    const p = bareFix(parseNum(val), w.cash, info); if (!p) return /\d/.test(val) ? miss(info, rawKey, val) : undefined; // 숫자는 있는데 못 읽음 = ⚠
    if (!Number.isFinite(p.v) || Math.abs(p.v) > 1e15) return miss(info, rawKey, val); // 터무니없이 큰 숫자(AI 실수)는 반영하지 않고 ⚠ 못 읽은 줄로 (v2.8)
    const b = w.cash; w.cash = Math.max(0, p.mode === 'add' ? w.cash + p.v : p.v);
    if (w.cash > b) T.earn += w.cash - b; else T.spend += b - w.cash;
    if (w.cash !== b) L(`${w.currency} ${signed(w.cash - b)}`);
    return;
}
function opItem(s, val, info, L, T, key, rawKey) {
    const w = ensure(s, 'wallet');
    const parts = val.includes('|') ? [val] : val.split(/\s*[,，/]\s*/);
    for (const part of parts) {
        let [head, desc, eff] = splitBar(part); // v2.9: 셋째 칸 = 효과 (상점에서 산 물건)
        { const t = String(head ?? '').match(/^([^+\-−].*?)\s+([+\-−])\s*(\d{1,3})\s*(?:개|장|병|권|통)?$/); if (t) head = `${t[2]}${t[1]} ${t[3]}`; } // 「사과 +2」 = 「+사과 2」 (검수: 예전엔 1개만)
        // 수량은 띄어 쓰거나 x를 붙인 1~3자리 숫자만 (「AK-47」 「S24」처럼 이름 끝 숫자를 수량으로 읽지 않게)
        const m = head.match(/^([+\-−]?)\s*(.+?)(?:(?:\s+[x×*]?|\s*[x×*])\s*(\d{1,3})\s*(?:개|장|병|권|통)?)?$/);
        if (!m) continue;
        const rm = m[1] === '-' || m[1] === '−';
        const name = unquote(m[2]); const q = Math.max(1, parseInt(m[3] || '1', 10));
        if (!name) continue;
        const ex = findBy(w.items, name);
        if (rm) {
            if (!ex) continue;
            const got = Math.min(q, ex.qty); // 칩엔 실제로 뺀 만큼 (검수: 2개뿐인데 「×5」로 보였다)
            ex.qty -= q; if (ex.qty <= 0) w.items.splice(w.items.indexOf(ex), 1);
            L(`−${ex.name}${got > 1 ? `×${got}` : ''}`);
        } else {
            if (ex) { ex.qty += q; if (desc) ex.desc = desc; if (eff && !ex.effect) ex.effect = eff; } else w.items.push({ name, qty: q, desc: desc ?? '', ...(eff ? { effect: eff } : {}) });
            L(`+${name}${q > 1 ? `×${q}` : ''}`);
        }
    }
    return;
}
function opStock(s, val, info, L, T, key, rawKey) {
    const sh = ensure(s, 'shop');
    const [sn, iname, price, desc] = splitBar(val);
    if (!sn || !iname) return;
    let shop = findBy(sh.shops, sn);
    if (!shop) { shop = { name: sn, desc: '', place: '', items: [] }; sh.shops.push(shop); }
    const rm = /^[-−]/.test(iname); const nm = iname.replace(/^[+\-−]\s*/, '');
    const ex = findBy(shop.items, nm);
    if (rm) { if (ex) { shop.items.splice(shop.items.indexOf(ex), 1); L(`🏪 ${shop.name} −${ex.name}`); } return; }
    const pr = parseNum(price)?.v;
    if (ex) { if (pr !== undefined) ex.price = Math.abs(pr); if (desc) ex.desc = desc; }
    else shop.items.push({ name: nm, price: Math.abs(pr ?? 0), desc: desc ?? '', kind: /가구|장식|deco/i.test(desc ?? '') ? 'deco' : 'item', stock: -1 });
    L(`🏪 ${shop.name}: ${nm}`);
    return;
}
function opDecor(s, val, info, L, T, key, rawKey) {
    const hm = ensure(s, 'home');
    const [n0, roomName] = splitBar(val);
    const rm = /^[-−]/.test(n0); const nm = n0.replace(/^[+\-−]\s*/, '');
    if (!nm) return;
    if (rm) {
        for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(nm)); if (k >= 0) { r.decor.splice(k, 1); break; } }
        const k = hm.storage.findIndex(x => norm(x) === norm(nm)); if (k >= 0) hm.storage.splice(k, 1);
        L(`🏠 −${nm}`); return;
    }
    const room = roomName ? findBy(hm.rooms, roomName) : null;
    const si = hm.storage.findIndex(x => norm(x) === norm(nm));
    if (room) {
        if (si >= 0) hm.storage.splice(si, 1);
        else for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(nm)); if (k >= 0) { r.decor.splice(k, 1); break; } }
        room.decor.push(nm); L(`🏠 ${room.name}에 ${nm}`);
    } else { hm.storage.push(nm); L(`🏠 창고 +${nm}`); }
    return;
}
function opXTostore(s, val, info, L, T, key, rawKey) { // 🎒 소지품 → 📦 창고 (1개)
    if (!s.data.wallet || !s.data.home) return;
    const it = s.data.wallet.items.find(x => norm(x.name) === norm(val)); if (!it) return;
    applyOp(s, 'item', `-${it.name} 1|`, info);
    s.data.home.storage.push(it.name);
    return;
}
function opXTobag(s, val, info, L, T, key, rawKey) { // 📦 창고 → 🎒 소지품 (1개)
    if (!s.data.wallet || !s.data.home) return;
    const hm = s.data.home, k = hm.storage.findIndex(x => norm(x) === norm(val)); if (k < 0) return;
    const nm = hm.storage.splice(k, 1)[0];
    applyOp(s, 'item', `+${nm} 1|`, info);
    return;
}
function opXUnplace(s, val, info, L, T, key, rawKey) {
    const hm = ensure(s, 'home');
    for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(val)); if (k >= 0) { r.decor.splice(k, 1); hm.storage.push(val); return; } }
    return;
}
function opRoom(s, val, info, L, T, key, rawKey) {
    const hm = ensure(s, 'home');
    const [n0, desc] = splitBar(val);
    const nm = n0.replace(/^[+]\s*/, '');
    const ex = findBy(hm.rooms, nm);
    if (ex) { if (desc) ex.desc = desc; } else { hm.rooms.push({ name: nm, desc: desc ?? '', decor: [] }); L(`🏠 새 공간: ${nm}`); }
    return;
}
function opLoc(s, val, info, L, T, key, rawKey) {
    const mp = ensure(s, 'map');
    let [nm, desc] = splitBar(val), inner = '';
    nm = unquote(nm);
    if (!nm) return;
    // 🏢 「loc: 학교 > 옥상」 — 건물 안에서 층 · 방을 옮김 (이름이 글자 그대로 「학교 > 옥상」인 장소가 따로 없을 때만 나눈다 · 예전엔 뒤쪽을 그냥 버렸다)
    if (!mp.places.some(q => norm(q.name) === norm(nm))) { const m = nm.match(/^(.+?)\s*[>›»]\s*(.+)$/); if (m) { nm = m[1].trim(); inner = m[2].trim().slice(0, 40); } }
    let p = findBy(mp.places, nm);
    if (!p) {
        const from = findBy(mp.places, mp.here);
        p = { name: nm, desc: desc ?? '', kind: '', x: NaN, y: NaN, links: from ? [from.name] : [], known: true };
        if (from && !from.links.some(l => norm(l) === norm(nm))) from.links.push(nm);
        mp.places.push(p);
    }
    p.known = true;
    if (!T.places.some(x => norm(x) === norm(p.name))) T.places.push(p.name);
    if (norm(mp.here) !== norm(p.name)) { mp.here = p.name; delete mp.spot; L(`📍 ${p.name}`); } // 다른 곳으로 가면 「건물 안 어디」는 지운다
    if (inner) {
        if (norm(mp.spot ?? '') !== norm(inner)) { mp.spot = inner; L(`🏢 ${inner}`); }
        // 처음 듣는 층이면 그 건물의 안쪽 · 층에 적어 둔다 (지도에서 건물 안을 볼 수 있게 · 12곳까지)
        const fls = (p.floors ??= []), head = (f) => norm(String(f).split(/[:：]/)[0]);
        if (!fls.some(f => head(f) && norm(inner).startsWith(head(f))) && fls.length < 12) fls.push(inner);
    }
    return;
}
function opPlace(s, val, info, L, T, key, rawKey) {
    const mp = ensure(s, 'map');
    const [nm0, desc, links] = splitBar(val), nm = unquote(nm0);
    if (!nm) return;
    let p = findBy(mp.places, nm);
    const lk = String(links ?? '').split(/\s*[,，]\s*/).filter(Boolean);
    if (!p) { p = { name: nm, desc: desc ?? '', kind: '', x: NaN, y: NaN, links: lk, known: true }; mp.places.push(p); L(`🗺️ 새 장소: ${nm}`); }
    else { if (desc) p.desc = desc; if (!p.known) L(`🗺️ 발견: ${p.name}`); p.known = true; for (const l of lk) if (!p.links.some(x => norm(x) === norm(l))) p.links.push(l); }
    for (const l of lk) { const q = findBy(mp.places, l); if (q && !q.links.some(x => norm(x) === norm(p.name))) q.links.push(p.name); }
    return;
}
function opAff(s, val, info, L, T, key, rawKey) {
    // 「Leon +2, Mira +3」 → 한 명씩 (v2.7.19 · 예전엔 둘 다 안 올랐음) — 「| 메모」 뒤의 쉼표는 안 나눔
    { const head = val.split('|')[0]; if (MULTI_RE.test(head) && /\d/.test(head.split(MULTI_RE)[0])) { const parts = head.split(MULTI_RE); const tail = val.slice(head.length); parts.forEach((p0, i) => p0.trim() && applyPart(s, key, p0.trim() + (i === parts.length - 1 ? tail : ''), info)); return; } }
    const rl = ensure(s, 'rel');
    const m = val.match(/^(.+?)\s*([=+\-−]\s*[\d.]+|\d[\d.]*)\s*(?:\|\s*(.*))?$/);
    if (!m) return miss(info, key, val);
    const nm = personName(s, m[1]);
    if (!nm) return miss(info, key, val);
    let r = findBy(rl.user, nm);
    if (!r) { r = { name: nm, label: '', aff: 0, trust: 0, memo: '', stage: -1, jealous: 0, met: s.data.calendar ? dateShort(s.data.calendar) : '' }; rl.user.push(r); }
    const p = bareFix(parseNum(m[2].replace(/\s+/g, '')), r[key], info); if (!p) return;
    if (key === 'aff' && p.mode === 'add' && p.v > 0) p.v = p.v * affMul(s); // 저주·축복의 호감 % 효과
    const b = r[key];
    let nv = clamp(Math.round(p.mode === 'add' ? b + p.v : p.v), -100, 100);
    if (nv > b && info.ai && romLive(s)) nv = b + romGain(s, info, r.name, key, nv - b); // 로맨스 보정: 상한
    if (key === 'aff' && r.noLove && nv > b) { if (info.ai) L(`🚫♥ ${r.name} (애정 꺼 둠)`); nv = b; } // 💗 애정 꺼 둔 사람: 안 오름 (내려가는 건 그대로)
    r[key] = nv;
    if (info.recent && nv !== b) { const rc = (info.recent[r.name] ??= { aff: 0, trust: 0 }); rc[key] += nv - b; } // 👑 루트 비교: 최근 변화 (설정 relRace를 켰을 때만 info.recent가 있음)
    if (m[3]) r.memo = m[3];
    if (r[key] !== b) L(`${key === 'aff' ? '♥' : '🤝'} ${r.name} ${signed(r[key] - b)}`);
    if (key === 'aff' && r[key] > b) jealousyFrom(s, r.name, r[key] - b, info);
    updateStage(s, r, info);
    return;
}
function opRel(s, val, info, L, T, key, rawKey) {
    const rl = ensure(s, 'rel');
    let nm, label, memo;
    if (val.includes('=')) { [nm, label] = val.split('=').map(x => x.trim()); [label, memo] = splitBar(label); }
    else [nm, label, memo] = splitBar(val);
    nm = personName(s, nm);
    if (!nm) return;
    let r = findBy(rl.user, nm);
    if (!r) { r = { name: nm, label: '', aff: 0, trust: 0, memo: '', stage: -1, jealous: 0, met: s.data.calendar ? dateShort(s.data.calendar) : '' }; rl.user.push(r); updateStage(s, r, info, true); }
    if (label && label !== r.label) { r.label = label; L(`💞 ${r.name} = ${label}`); }
    if (memo) r.memo = memo;
    return;
}
function opPair(s, val, info, L, T, key, rawKey) {
    const rl = ensure(s, 'rel');
    const m = val.match(/^(.+?)\s*(?:&|와|과|,|↔|-)\s*(.+?)\s*[=|]\s*(.+)$/);
    if (!m) return;
    const [label, memo] = splitBar(m[3]);
    const ex = rl.pairs.find(p => (norm(p.a) === norm(m[1]) && norm(p.b) === norm(m[2])) || (norm(p.a) === norm(m[2]) && norm(p.b) === norm(m[1])));
    if (ex) { ex.label = label; if (memo) ex.memo = memo; } else rl.pairs.push({ a: m[1].trim(), b: m[2].trim(), label, memo: memo ?? '' });
    L(`💞 ${m[1].trim()}↔${m[2].trim()}: ${label}`);
    return;
}
// 💞 인물끼리 호감 (선택 · 설정 pairAff): 「A & B +3」 「A & B = 40」 「A & B -5 | 메모」
// 꺼져 있으면 AI가 적어 와도 아무 일도 안 한다 (저장된 수치는 그대로 남고, 화면 · 주입문에서만 빠짐)
export const PAIR_STEP = 15; // AI가 한 번에 올리고 내릴 수 있는 폭
export const pairFind = (rl, a, b) => (rl?.pairs ?? []).find(p => (norm(p.a) === norm(a) && norm(p.b) === norm(b)) || (norm(p.a) === norm(b) && norm(p.b) === norm(a)));
export const pairStage = (rl, p) => { const st = rl?.stages?.length ? rl.stages : DEFAULT_STAGES; const v = p.aff ?? 0; return st[clamp(stageIndex(st, v, v), 0, st.length - 1)]; }; // 축이 하나라 같은 값을 호감 · 신뢰 두 문턱에 다 댄다 (신뢰를 100으로 두면 우정 단계가 처음부터 끝까지 열렸음)
function opPairaff(s, val, info, L, T, key, rawKey) {
    if (settings().pairAff !== true) return;
    const m = val.match(/^(.+?)\s*(?:&|와|과|,|↔)\s*(.+?)\s*([=+\-−]\s*\d+(?:\.\d+)?)\s*(?:\|\s*(.*))?$/);
    if (!m) return;
    const a = m[1].replace(/\*\*|__|`/g, '').trim(), b = m[2].replace(/\*\*|__|`/g, '').trim();
    if (!a || !b || a.length > 30 || b.length > 30 || norm(a) === norm(b)) return;
    const pn = parseNum(m[3].replace(/\s+/g, '')); if (!pn) return;
    const rl = ensure(s, 'rel');
    let pr = pairFind(rl, a, b);
    if (!pr) { pr = { a, b, label: '', memo: '' }; rl.pairs.push(pr); }
    const was = pr.aff ?? 0;
    let d = pn.mode === 'add' ? pn.v : pn.v - was;
    if (info.ai) d = clamp(d, -PAIR_STEP, PAIR_STEP);
    pr.aff = clamp(Math.round(was + d), -100, 100);
    if (m[4]) pr.memo = m[4];
    if (pr.aff !== was) L(`💞 ${pr.a}↔${pr.b} ${signed(pr.aff - was)}`);
}
function opDate(s, val, info, L, T, key, rawKey) {
    const cal = ensure(s, 'calendar');
    // 「days: 2」처럼 부호 없이 와도 「며칠 지남」으로 (예전엔 그달 2일로 날아갔음)
    const daysKey = /^(days|날짜이동)$/i.test(String(rawKey).trim());
    const p = /^[+\-−]\s*\d/.test(val) ? parseNum(val.replace(/일.*$/, '')) : daysKey && /^\d{1,3}\s*(일|days?)?$/i.test(val) ? parseNum(`+${parseInt(val, 10)}`) : null;
    const before = dayIndex(cal);
    if (p) addDays(cal, p.v);
    else {
        const dt = parseDate(cal, val); if (!dt) return miss(info, rawKey, val); // 「date: 14」처럼 못 읽으면 ⚠ (예전엔 조용히 넘어감)
        cal.y = dt.y ?? cal.y;
        if (dt.y === null && (dt.m < cal.m || (dt.m === cal.m && dt.d < cal.d))) cal.y++;
        cal.m = clamp(dt.m, 1, cal.months.length); cal.d = clamp(dt.d, 1, cal.months[cal.m - 1].days);
    }
    const diff = dayIndex(cal) - before;
    if (diff > 0) dayTick(s, info, before, dayIndex(cal));
    if (diff) {
        L(`📅 ${diff > 0 ? `+${diff}일` : `${diff}일`}`);
        const ev = eventsOn(cal, cal.y, cal.m, cal.d);
        if (ev.length) info.alerts.push(`오늘의 일정: ${ev.map(e => e.title).join(', ')}`);
    }
    return;
}
function opTime(s, val, info, L, T, key, rawKey) {
    const cal = ensure(s, 'calendar');
    // 🕐 시각으로 적는 달력: AI가 「오후 2시 반」 「14:30」 「저녁」 어느 쪽으로 적어도 고른 모양 하나로 맞춘다 (시간대 달력은 예전 그대로 — 적힌 글 그대로)
    // 「time: +1」 「period: +2」 = 시간대(시각 달력이면 시간)를 그만큼 넘김 · 자정을 넘기면 날짜도 (검수: 예전엔 시간 칸에 「+1」이 글자 그대로 적혔다)
    const adv = String(val).match(/^\+\s*(\d{1,2})\s*(?:시간|칸|slots?|hours?|h)?$/i);
    if (adv) { let n = Math.min(24, parseInt(adv[1], 10)), wraps = 0; const t0 = cal.time; while (n-- > 0) { if (nextTimeWraps(cal)) wraps++; cal.time = nextTime(cal, viewTr()); } if (wraps) applyOp(s, 'date', `+${wraps}`, info); if (cal.time !== t0) L(`🕐 ${cal.time}`); return; }
    if (cal.clock) { val = toClockStyle(val, cal.clock, cal.times, viewTr()); if (parseClock(val) === null) return miss(info, rawKey, val); } // 「25:00」처럼 못 읽는 시각은 ⚠ (검수: 글자 그대로 적혔다)
    if (val !== cal.time) { cal.time = val; L(`🕐 ${val}`); }
    return;
}
function opEvent(s, val, info, L, T, key, rawKey) {
    const cal = ensure(s, 'calendar');
    const [when, title, desc] = splitBar(val);
    const dt = parseDate(cal, when);
    if (!dt || !title) return;
    const rm = /^[-−]/.test(title); const tt = title.replace(/^[+\-−]\s*/, '');
    const k = cal.events.findIndex(e => norm(e.title) === norm(tt));
    if (rm) { if (k >= 0) cal.events.splice(k, 1); return; }
    const e = { y: dt.y ?? (dt.m < cal.m || (dt.m === cal.m && dt.d < cal.d) ? cal.y + 1 : cal.y), m: dt.m, d: dt.d, title: tt, desc: desc ?? '', repeat: 'once' };
    if (k >= 0) cal.events[k] = { ...cal.events[k], ...e }; else cal.events.push(e);
    L(`📅 일정: ${tt}`);
    return;
}
function opAch(s, val, info, L, T, key, rawKey) {
    const ac = ensure(s, 'ach');
    const [nm, desc] = splitBar(val);
    const rm = /^[-−]/.test(nm); const n = nm.replace(/^[+\-−]\s*/, '');
    let a = findBy(ac.list, n);
    if (rm) { if (a) a.done = false; return; }
    if (!a) { a = { name: n, desc: desc ?? '', done: false, hidden: false, at: '' }; ac.list.push(a); }
    if (!a.done) {
        a.done = true; a.at = stamp(s);
        L(`🏆 ${a.name}`); info.alerts.push(`업적 달성 — ${a.name}`);
    }
    return;
}
function opMemo(s, val, info, L, T, key, rawKey) {
    const mm = ensure(s, 'memo');
    mm.list.push({ id: `${info.seed}:${mm.list.length}`, text: val, by: 'ai', inject: true, pin: false });
    if (mm.list.length > 40) { const k = mm.list.findIndex(x => x.by === 'ai' && !x.pin); if (k >= 0) mm.list.splice(k, 1); }
    L('📝 메모');
    return;
}
function opMsg(s, val, info, L, T, key, rawKey) {
    val = nameSplit(s, val, true);
    const [nm, ...rest] = splitBar(val);
    const text = rest.join(' | ');
    if (!nm || !text) return miss(info, rawKey, val); // 「msg: Leon」처럼 글이 없으면 ⚠
    // v2.7.21: 속마음(이모티콘 · 카모지)을 msg 키로 적은 답 — 글자 없이 그림 · 기호뿐이고 관계에 있는 사람이면 속마음으로 (연락 대화방에 「(￣ヘ￣)」가 쌓이지 않게)
    const mm = settings().mindMode;
    if ((mm === 'emoji' || mm === 'kaomoji') && !/[A-Za-z0-9가-힣]/.test(text) && findBy(s.data.rel?.user ?? [], nm)) { applyOp(s, 'mind', val, info); return; }
    const ct = ensure(s, 'contact');
    const who = findBy(ct.contacts, nm)?.name ?? nm.trim();
    if (who in Object.prototype) return; // 「constructor」 · 「toString」 · 「__proto__」 같은 이름은 대화방 열쇠로 못 쓴다 (객체에 원래 있는 이름)
    if (!findBy(ct.contacts, who)) ct.contacts.push({ name: who, handle: '', status: '', courier: '' });
    const t = wholeTick(s, info.meta);
    const letter = letterMode(ct);
    const cour = letter ? (findBy(ct.couriers, findBy(ct.contacts, who)?.courier)?.name ?? ct.couriers[0]?.name ?? '') : '';
    (ct.threads[who] ??= []).push({ id: `${info.seed}:m${ct.threads[who].length}`, from: 'them', text, date: stamp(s), at: t, arrive: t, courier: cour, express: false, rush: false, pending: false, fee: 0, edited: false, ping: true });
    if (ct.threads[who].length > THREAD_MAX) ct.threads[who] = ct.threads[who].slice(-THREAD_MAX);
    ct.unread[who] = (ct.unread[who] ?? 0) + 1;
    touchContact(ct, who);
    T.got++;
    L(`${letter ? '✉️ 편지' : '💬'} ${who}`);
    info.alerts.push({ kind: 'msg', who, text, letter });
    return;
}
function opXRead(s, val, info, L, T, key, rawKey) {
    const ct = s.data.contact; if (ct) delete ct.unread[val];
    return;
}
function opXNread(s, val, info, L, T, key, rawKey) { // 📰 기사 읽음 (v2.7.19): 예전엔 기사 하나 열 때마다 뉴스 목록 전체(1KB+)를 편집 기록에 복사했음
    const it = s.data.news?.items?.find(x => x.id === val); if (it) it.read = true;
    return;
}
function opNpc(s, val, info, L, T, key, rawKey) {
    const pf = ensure(s, 'profile');
    const [nm0, summary] = splitBar(val);
    const nm = personName(s, nm0);
    if (!nm) return;
    const ex = findBy(pf.list, nm);
    if (ex) { if (summary && !ex.summary) ex.summary = summary; return; }
    pf.list.push({ name: nm.trim(), role: 'npc', summary: summary ?? '', fields: [] });
    L(`👤 ${nm.trim()}`);
    return;
}
function opRoll(s, val, info, L, T, key, rawKey) {
    const [label, dc] = splitBar(val);
    info.roll = { label: label.trim(), dc: num(parseNum(dc)?.v, 0) };
    L(`🎲 판정 요청: ${label.trim()}`);
    return;
}
function opXRoll(s, val, info, L, T, key, rawKey) {
    const dc = ensure(s, 'dice');
    try { const r = JSON.parse(val); dc.log.push(r); T.rolls++; if (r.cls === 'ok' || r.cls === 'crit') T.good++; if (r.cls === 'crit') T.crit++; if (r.cls === 'fumble') T.fumble++; } catch (err) { ssNote('판정 기록 값이 깨짐', err); }
    if (dc.log.length > 30) dc.log = dc.log.slice(-30);
    return;
}
function opQuest(s, val, info, L, T, key, rawKey) {
    const qs = ensure(s, 'quest');
    // 검수: 「잃어버린 반지 완료」처럼 「|」 없이 상태를 붙인 줄 (있는 퀘스트일 때만) · 「+새 의뢰」의 + 떼기 · 「「제목」」 괄호 떼기
    if (!val.includes('|')) { const m = val.match(/^(.+?)\s*[-—:：]?\s*(완료|성공|실패|수락|포기|done|completed?|failed|accepted)$/i); if (m && findBy(qs.list, unquote(m[1]), 'title')) val = `${unquote(m[1])} | ${m[2]}`; }
    let [title, st0, desc] = splitBar(val);
    title = unquote(String(title ?? '').replace(/^\+\s*/, ''));
    if (!title) return;
    const st = QSTATUS[norm(st0)] ?? (st0 ? null : 'open');
    let q = findBy(qs.list, title, 'title');
    // v2.7.3: 내가 지운 퀘스트 · 끝난(완료·실패·포기) 퀘스트 · 보관함으로 간 퀘스트는 AI가 다시 살리지 못해요
    //   (예전: 포기한 퀘스트를 AI가 「진행」이라고 다시 적으면 진행 중으로 돌아오고, 지운 퀘스트는 「받을 수 있음」으로 되살아났어요)
    if (info.ai) {
        const key = norm(title);
        if ((qs.gone ?? []).some(g => norm(g) === key)) return;
        if (q && (q.status === 'done' || q.status === 'failed')) return;
        if (!q && (qs.archive ?? []).some(a => norm(a.title) === key)) return;
    }
    if (!q) {
        if (info.ai && !st) { // 처음 보는 퀘스트의 「진행 내용」만 온 것 → 진행 중인 퀘스트로 (예전엔 진행 글이 설명이 된 「받을 수 있음」이 생겼어요)
            q = { id: `${info.seed}:q${qs.list.length}`, title: title.trim(), giver: '', desc: '', place: '', deadline: '', reward: '', cash: 0, items: [], status: 'active', steps: [{ text: st0, done: true }], paid: false, since: today(s) ?? undefined };
            qs.list.push(q); L(`📜 ${QNAME.active}: ${q.title}`);
            return;
        }
        q = { id: `${info.seed}:q${qs.list.length}`, title: title.trim(), giver: '', desc: desc ?? (st ? '' : st0 ?? ''), place: '', deadline: '', reward: '', cash: 0, items: [], status: st ?? 'open', steps: [], paid: false };
        if (today(s) !== null) q.since = today(s);
        qs.list.push(q);
        L(`📜 ${QNAME[q.status]}: ${q.title}`);
        if (q.status === 'open' || q.status === 'active') info.alerts.push(`퀘스트 — ${q.title}`);
    } else if (st === 'done' && q.status !== 'done' && questHold(q, info)) {
        // v2.9: 단계가 남았는데 AI가 「완료」라고 적었다 → 끝내지 않고 확인을 기다린다 (보상 · 판정도 그때)
        if (!q.ask) { q.ask = true; if (q.status === 'open') q.status = 'active'; L(`📜 ${q.title}: 완료? (확인 필요)`); info.alerts.push(`퀘스트 — ${q.title}: AI가 완료라고 적었지만 단계가 남아 있어요. 퀘스트 탭에서 확인해 주세요`); }
        return;
    } else if (st && st !== q.status) {
        q.status = st; delete q.ask; L(`📜 ${q.title}: ${QNAME[st]}`);
    } else if (!st && st0) {
        if (q.steps.some(x => norm(x.text) === norm(st0) && x.done)) return; // 같은 진행을 매 턴 다시 적어도 한 번만
        // v2.7.5: AI가 적는 「진행 내용」은 이미 한 일 → 해 둔 단계로. 할 일 목록에 같은(비슷한) 단계가 있으면 그걸 체크해요
        const k = norm(st0);
        const todo = q.steps.find(x => !x.done && (norm(x.text) === k || (k.length >= 4 && (norm(x.text).includes(k) || k.includes(norm(x.text))))));
        if (todo) { todo.done = true; L(`📜 ${q.title}: ✔ ${short(todo.text, 20)}`); }
        else { q.steps.push({ text: st0, done: true }); L(`📜 ${q.title}: ${short(st0, 20)}`); }
        if (q.status === 'open') q.status = 'active'; // 받지도 않은 의뢰를 진행했다면 수락한 것
    }
    if (desc && st) q.desc ||= desc;
    if (q.status === 'done' && !q.paid) {
        // 본편 AI가 끝낸 퀘스트도 보상 판정 (설정 · 같은 답은 늘 같은 결과가 나오게 답마다 정해진 주사위)
        if (info.ai && settings().questJudgeAI) { const r = questRoll(s, q, `${info.seed}:${q.title}`); q.judge = r.cls; L(`🎲 ${q.title}: ${JUDGE_NAME[r.cls]}`); if (r.cls === 'fumble') { q.status = 'failed'; return; } payQuest(s, q, info, JUDGE_MUL[r.cls]); }
        else payQuest(s, q, info);
    }
    return;
}
function opXLeave(s, val, info, L, T, key, rawKey) { // 🕊 이야기에서 빠진 사람 (관계 카드 단추 · v2.7.5): 이름|dead · left · back
    const rl = s.data.rel; if (!rl) return;
    const [nm, how] = splitBar(val);
    const r = findBy(rl.user, nm); if (!r) return;
    if (how === 'back') delete r.out; else r.out = how === 'dead' ? 'dead' : 'left';
    return;
}
function opXQuestpay(s, val, info, L, T, key, rawKey) { // id · id|판정(crit·ok·fail·fumble)
    const [id, cls] = splitBar(val);
    const q = s.data.quest?.list.find(x => x.id === id);
    if (!q) return;
    if (cls && JUDGE_MUL[cls] !== undefined) {
        q.judge = cls;
        if (cls === 'fumble') { q.status = 'failed'; return; } // 대실패: 보상 없이 실패
        q.status = 'done'; if (!q.paid) payQuest(s, q, info, JUDGE_MUL[cls]);
    } else { q.status = 'done'; if (!q.paid) payQuest(s, q, info); }
    return;
}
function opNews(s, val, info, L, T, key, rawKey) {
    const nw = ensure(s, 'news');
    const [title, body, tag] = splitBar(val);
    if (!title) return;
    nw.items.push({ id: `${info.seed}:n${nw.items.length}`, title, body: body ?? '', tag: tag ?? '', date: stamp(s), read: false });
    L(`📰 ${short(title, 18)}`);
    return;
}
function opRumor(s, val, info, L, T, key, rawKey) {
    const gs = ensure(s, 'gossip');
    const [title, body, about] = splitBar(val);
    if (!title) return;
    gs.issues.push({ id: `${info.seed}:g${gs.issues.length}`, title, body: body ?? '', about: String(about ?? '').split(/\s*[,，]\s*/).filter(Boolean), heat: 2, date: stamp(s), read: false });
    L(`🍷 소문: ${short(title, 16)}`);
    return;
}
function opPost(s, val, info, L, T, key, rawKey) {
    const bd = ensure(s, 'board');
    const [author, title, body] = splitBar(val);
    if (!title) return;
    bd.posts.push({ id: `${info.seed}:p${bd.posts.length}`, author: author || '익명', title, body: body ?? '', date: stamp(s), mine: false, tag: '', replies: [] });
    L(`📋 ${short(title, 18)}`);
    return;
}
function opXMemo(s, val, info, L, T, key, rawKey) {
    const mm = ensure(s, 'memo');
    const [op, a, b] = splitBar(val);
    if (op === 'add') mm.list.push({ id: `${info.seed}`, text: a, by: 'user', inject: true, pin: false });
    const it = mm.list.find(x => x.id === a);
    if (op === 'del' && it) mm.list.splice(mm.list.indexOf(it), 1);
    if (op === 'tog' && it && (b === 'inject' || b === 'pin')) it[b] = !it[b];
    return;
}
function opXAchtog(s, val, info, L, T, key, rawKey) {
    const ac = ensure(s, 'ach');
    const a = findBy(ac.list, val);
    if (a) { a.done = !a.done; a.at = a.done ? stamp(s) : ''; }
    return;
}
// 키 → 처리기
const OPS = {
    '_alert': opXAlert,
    'bgm': opBgm,
    'sns': opSns,
    'custom': opCustom,
    'life': opLife,
    'mind': opMind,
    'jealous': opJealous,
    'confess': opConfess,
    '_nolove': opXNolove,
    '_love': opXNolove,
    '_bond': opXBond,
    '_unbond': opXBond,
    '_merge': opXMerge,
    'concern': opConcern,
    'taste': opConcern,
    '_peekday': opXPeekday,
    '_qask': opXQask,
    '_needmod': opXNeedmod,
    'curse': opCurse,
    '_effect': opXEffect,
    'weather': opWeather,
    '_travel': opXTravel,
    '_spot': opXSpot,
    '_clock': opXClock,
    '_trash': opXTrash,
    '_sellused': opXTrash,
    '_purge': opXPurge,
    '_restore': opXRestore,
    '_draw': opXDraw,
    '_fortune': opXFortune,
    '_birth': opXBirth,
    '_ftfee': opXFee,
    '_ftdel': opXFtdel,
    '_loan': opXLoan,
    '_repay': opXRepay,
    'stat': opStat,
    'attr': opAttr,
    'cond': opCond,
    'cash': opCash,
    'item': opItem,
    'stock': opStock,
    'decor': opDecor,
    '_tostore': opXTostore,
    '_tobag': opXTobag,
    '_unplace': opXUnplace,
    'room': opRoom,
    'loc': opLoc,
    'place': opPlace,
    'aff': opAff,
    'trust': opAff,
    'rel': opRel,
    'pair': opPair,
    'pairaff': opPairaff,
    'date': opDate,
    'time': opTime,
    'event': opEvent,
    'ach': opAch,
    'memo': opMemo,
    'msg': opMsg,
    '_read': opXRead,
    '_nread': opXNread,
    'npc': opNpc,
    'roll': opRoll,
    '_roll': opXRoll,
    'quest': opQuest,
    '_leave': opXLeave,
    '_questpay': opXQuestpay,
    'news': opNews,
    'rumor': opRumor,
    'post': opPost,
    '_memo': opXMemo,
    '_achtog': opXAchtog,
};
// 🎲 퀘스트 완료 판정 (v2.7.3): 대성공 1.5배 · 성공 그대로 · 실패 돈 절반(아이템 없음) · 대실패 보상 없이 실패
export const JUDGE_MUL = { crit: 1.5, ok: 1, fail: 0.5, fumble: 0 };
export const JUDGE_NAME = { crit: '대성공', ok: '성공', fail: '아쉬운 완료', fumble: '대실패' };
const seedNum = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export function questRoll(s, q, seed, bonus = 0) { // bonus: 직접 굴릴 때만 붙는 보정 (착용 장비 — AI 답에서 자동으로 굴리는 쪽은 지난 계산이 바뀌지 않게 0)
    const attrs = s.data.stats?.attrs ?? [];
    const a = q.check?.attr ? findBy(attrs, q.check.attr) : null;
    const dc = num(q.check?.dc, 12) + (DIFFS[diffOf()]?.dc ?? 0);
    const roll = seed === undefined ? Math.floor(Math.random() * 20) + 1 : Math.floor(seedNum(seed) * 20) + 1;
    const mod = (a?.val ?? 0) + (Number(bonus) || 0);
    const cls = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : roll + mod >= dc ? 'ok' : 'fail';
    return { roll, mod, dc, cls, attr: a ? a.name : '', detail: `d20 ${roll}${mod ? `${mod > 0 ? '+' : ''}${mod}=${roll + mod}` : ''} vs ${dc}` };
}
function payQuest(s, q, info, mul = 1) {
    q.paid = true;
    if (s.tally) s.tally.quests++;
    const cash = Math.round((q.cash || 0) * mul);
    if (cash && s.data.wallet) applyOp(s, 'cash', `+${cash}`, info);
    if (mul >= 1) for (const it of q.items) if (s.data.wallet) applyOp(s, 'item', `+${it}`, info);
    info.alerts.push(`퀘스트 완료 — ${q.title}${q.judge ? ` · 🎲 ${JUDGE_NAME[q.judge] ?? ''}` : ''}${q.reward ? ` (${q.reward})` : ''}`);
}
export const stagesOn = () => settings().relStagesOn !== false; // 관계 단계 기능 (v2.7.18 · 끄면 숫자만 — 단계 이름 · 해금 · 알림이 화면과 AI 글에서 모두 빠져요)
export function dateFromIndex(cal, idx) {
    const yd = cal.months.reduce((a, m) => a + m.days, 0) || 365;
    let y = Math.floor(idx / yd) + 1, r = idx - (y - 1) * yd, m = 1;
    for (const mo of cal.months) { if (r < mo.days) break; r -= mo.days; m++; }
    return { y, m: Math.min(m, cal.months.length), d: r + 1 };
}
// 속마음 글 다듬기: 수치 괄호((20/85 💕/🤝) 같은 것) · 따옴표 · 이름 머리를 떼고, 첫 문장만 · 짧게 (한글 22자 · 그 밖 48자)
export function cleanMind(t) {
    let x = String(t ?? '').replace(/\([^()]*\d+\s*\/\s*\d+[^()]*\)/g, '').replace(/[-+]?\d+\s*\/\s*\d+/g, '').replace(/^\s*["'“”‘’「『]+|["'“”‘’」』]+\s*$/g, '').replace(/\s+/g, ' ').trim();
    const max = /[가-힣]/.test(x) ? 22 : 48;
    if (x.length > max) { const m = x.match(/^.+?[.!?。…~]+(?=\s|$)/); if (m && m[0].length >= 4) x = m[0]; } // 길 때만 첫 문장
    return x.length > max ? `${x.slice(0, max - 1).trim()}…` : x;
}

// ───── 🍞 욕구 게이지 (v2.9): 시간이 지나면 저절로 줄고 · 단계마다 상태가 붙고 · 바닥이면 다른 게이지를 깎는다 ─────
// 게이지에 decay · stages · zero 가운데 하나라도 있어야 움직인다 (없으면 아무것도 안 함 — 예전 채팅은 그대로).
// 시간: 달력이 있으면 날짜 + 시간대(하루의 몇 분의 몇), 없으면 한 턴 = 하루의 1/6. 답마다(그리고 내가 한 행동마다) 지난 만큼만 계산한다.
const NEED_TURN = 1 / 6, NEED_MAX_DT = 14;
export function parseStages(text) {
    const out = [];
    for (const part of String(text ?? '').split(/[,，\n]+/)) { const m = part.match(/^\s*(\d{1,3})\s*(\+?)\s*[:：]\s*(.+?)\s*$/); if (m) out.push({ at: clamp(Number(m[1]), 0, 100), up: m[2] === '+', name: m[3] }); }
    return out;
}
// 지금 단계: 「이하」는 가장 낮은 문턱, 「이상(+)」은 가장 높은 문턱이 이긴다
export function stageOf(b) {
    const pct = (b.cur / Math.max(1, b.max)) * 100; let hit = null;
    for (const x of parseStages(b.stages)) { if (x.up ? pct >= x.at : pct <= x.at) { if (!hit || (x.up ? x.at > hit.at : x.at < hit.at)) hit = x; } }
    return hit;
}
function needMove(b, amount, key) {
    const x = (b[key] ?? 0) + amount, n = x < 0 ? Math.ceil(x) : Math.floor(x);
    const r = Math.round((x - n) * 1e4) / 1e4; if (r) b[key] = r; else delete b[key];
    if (!n) return 0;
    const old = b.cur; b.cur = clamp(b.cur + n, 0, b.max); return b.cur - old;
}
export function needsTick(s, info) {
    const st = s.data.stats; if (!st?.bars?.some(b => b.decay || b.stages || b.zero)) return;
    const days = useDays(s, info?.meta), now = days ? nowTick(s, info?.meta) : (s.turn ?? 0) * NEED_TURN;
    let dt = 0;
    if (typeof st.tick !== 'number' || !!st.days !== days) { st.tick = now; st.days = days; }
    else { dt = now - st.tick; st.tick = now; if (dt < 0) dt = 0; dt = Math.min(dt, NEED_MAX_DT); }
    const log = (b, n, why) => { if (!n) return; (st.nlog ??= []).push({ b: b.name, n, why, t: s.turn ?? 0 }); if (st.nlog.length > 6) st.nlog.splice(0, st.nlog.length - 6); };
    const sp = Number(st.speed) > 0 ? Number(st.speed) : 1;
    if (dt > 0) {
        const zt = new Map(); // 이번 사이에 바닥(0)이었던 시간 — 도중에 바닥난 게이지는 바닥난 뒤의 시간만 센다
        for (const b of st.bars) {
            const pre = b.cur;
            if (b.decay) { const mod = Number(st.mods?.[norm(b.name)] ?? 0), rate = b.decay * sp * Math.max(0, 1 + mod / 100); log(b, needMove(b, -rate * dt, 'rem'), 'time'); if (b.cur <= 0) zt.set(b, rate > 0 && pre > 0 ? Math.max(0, dt - pre / rate) : dt); }
            else if (b.cur <= 0) zt.set(b, dt);
        }
        for (const b of st.bars) {
            if (!b.zero || b.cur > 0 || !(zt.get(b) > 0)) continue;
            const m = String(b.zero).match(/^\s*(.+?)\s*([+\-−])\s*(\d+(?:\.\d+)?)\s*$/); if (!m) continue;
            const t = findBy(st.bars, m[1]) ?? aliasBar(st.bars, m[1]); if (!t || t === b) continue;
            const got = needMove(t, (m[2] === '+' ? 1 : -1) * Number(m[3]) * zt.get(b), 'zrem'); if (got) (st.nlog ??= []).push({ b: t.name, n: got, why: `zero:${b.name}`, t: s.turn ?? 0 });
        }
        if (st.nlog?.length > 6) st.nlog.splice(0, st.nlog.length - 6);
    }
    // 단계 → 상태(conds)에 한 줄: 그 게이지가 만든 것(auto)만 갈아 끼운다
    for (const b of st.bars) {
        if (!b.stages && !b.stg) continue;
        const cur = stageOf(b)?.name ?? '';
        if (cur === (b.stg ?? '')) continue;
        st.conds = (st.conds ?? []).filter(c => c.auto !== b.name);
        if (cur) { if (!findBy(st.conds, cur)) st.conds.push({ name: cur, desc: `${b.name} ${fmtNum(b.cur)}/${fmtNum(b.max)}`, auto: b.name }); info?.labels?.push(`${b.name}: ${cur}`); info?.alerts?.push(`${b.name} — ${cur}`); b.stg = cur; }
        else { info?.labels?.push(`${b.name}: 괜찮아짐`); delete b.stg; }
    }
}
