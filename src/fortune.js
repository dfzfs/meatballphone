// 🔮 점집 (v2.8.1): 타로 · 수정구슬 · 무당(사주 · 신점) · 굿 — 어떤 인물이든, 복채를 내고
// 카드 · 오방기는 여기서 진짜로 뽑고(난수), AI는 그것을 풀이만 한다. 본 점괘는 기록(_fortune)에 통째로 남아 다시 볼 수 있다.
// 창을 새로 띄우지 않는다: 점괘 · 생년월일 · 복채 · 풀 저주 고르기는 모두 이 칸 안에서 (창 위에 창이 겹치면 실리에서 창이 꺼지던 것)
// 기다리는 동안 창을 닫아도 점괘는 끝까지 받아서 기록하고 알림으로 알려 준다
import { app, modOn, settings, esc, short, findBy, norm, num, fmtNum, uid, dateStr, userName, TITLE, FORTUNE_PERSON_KEYS, fortunePerson } from './core.js';
import { addAdjust, chatCharacters, priceMul } from './engine.js';
import { sec, chip, seg, ai1 } from './kit.js';
import { fortuneRead, gutRite } from './ai.js';

// 점쟁이 셋 — 이름 · 성격은 프롬프트(ai.fortune.*)에도 같이 적혀 있다
export const FT_METHODS = {
    tarot: { name: '타로', icon: '🃏', mul: 1, teller: '타로 언니 세라', bio: '동네 카페 구석 부스의 수다쟁이. 카드 한 장 넘길 때마다 호들갑이고, 남의 연애사엔 눈이 반짝, 반전이면 박수부터 쳐요.' },
    orb: { name: '수정구슬', icon: '🔮', mul: 1.5, teller: '마담 엘레오노라', bio: '향 연기 자욱한 천막의 신비주의 마담. 어디 건지 모를 외국 억양인데, 구슬에 이상한 게 비치면 당황해서 사투리가 튀어나와요 (본명 김순자).' },
    shaman: { name: '무당', icon: '🪭', mul: 3, teller: '박보살 할매', bio: '신당 30년 지킨 욕쟁이 할매. 복채 타박에 굿 영업이 특기인데, 투덜대다 갑자기 신이 내려요 (빨간 글씨).' },
};
const TOPICS = ['종합', '오늘의 운세', '올해 운세', '애정', '재물', '건강', '진로 · 일', '인간관계'];
const SPREADS = { 1: { name: '1장', pos: ['오늘의 메시지'], mul: 0.5 }, 3: { name: '3장', pos: ['과거', '현재', '미래'], mul: 1 }, 5: { name: '5장', pos: ['지금의 상황', '가로막는 것', '숨은 영향', '조언', '결과'], mul: 1.6 } };
const MAJOR = ['바보', '마법사', '여사제', '여황제', '황제', '교황', '연인', '전차', '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음', '절제', '악마', '탑', '별', '달', '태양', '심판', '세계'];
const SUITS = ['완드', '컵', '소드', '펜타클'], RANKS = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '시종', '기사', '여왕', '왕'];
export const TAROT = [...MAJOR, ...SUITS.flatMap(su => RANKS.map(r => `${su} ${r}`))]; // 78장
const FLAGS = ['붉은 기 (재수 · 경사)', '흰 기 (천신 · 명복)', '노란 기 (조상)', '푸른 기 (우환 · 근심)', '검은 기 (액 · 죽음의 기운)'];
const FLAG_COLOR = { 붉은: '#d8323a', 흰: '#f4f1ea', 노란: '#e6b422', 푸른: '#2f6fd6', 검은: '#1c1c1c' };
// ───── 🃏 카드 그림 (그림 파일 없이 글자 · 이모지로) ─────
const MAJOR_EMO = ['🤹', '🪄', '🌙', '👑', '🏛️', '⛪', '💞', '🐎', '🦁', '🏮', '🎡', '⚖️', '🙃', '💀', '🏺', '😈', '🗼', '⭐', '🌕', '☀️', '📯', '🌍'];
const SUIT_EMO = { 완드: '🔥', 컵: '🍷', 소드: '⚔️', 펜타클: '🪙' };
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
function cardArt(name) {
    const mi = MAJOR.indexOf(name);
    if (mi >= 0) return { emo: MAJOR_EMO[mi], top: ROMAN[mi], major: true };
    const [su, rk] = name.split(' ');
    return { emo: SUIT_EMO[su] ?? '✦', top: rk === '에이스' ? 'A' : /^\d+$/.test(rk) ? rk : rk?.slice(0, 1) ?? '', major: false };
}
// 「과거 — 탑 (역방향)」 → 자리 · 카드 · 역방향
const parseDraw = (x) => { const m = String(x).match(/^(.*?)\s+—\s+(.*?)\s+\((정방향|역방향)\)$/); return m ? { pos: m[1], name: m[2], rev: m[3] === '역방향' } : null; };
export function cardHTML(name, rev, pos = '', cls = '') {
    const a = cardArt(name);
    return `<div class="ss-tc up ${a.major ? 'major' : ''} ${rev ? 'rev' : ''} ${cls}"><div class="ss-tc-in"><div class="ss-tc-face"><span class="ss-tc-top">${esc(a.top)}</span><span class="ss-tc-emo">${a.emo}</span><b class="ss-tc-name">${esc(name)}</b></div><div class="ss-tc-back"></div></div>${pos ? `<small class="ss-tc-pos">${esc(pos)}${rev ? ' · 역' : ''}</small>` : ''}</div>`;
}
// 엎어 둔 카드 (뒷면만)
const backHTML = (label = '', cls = '') => `<div class="ss-tc down ${cls}"><div class="ss-tc-in"><div class="ss-tc-back"></div></div>${label ? `<small class="ss-tc-pos">${esc(label)}</small>` : ''}</div>`;
// 🔮 수정구슬: 보라 방석 위의 구슬 — 평소엔 무지개빛으로 일렁이고, 점을 보는 중 · 결과에선 분홍 은하로 소용돌이친다
const SPARKS = [[22, 30, 0], [68, 22, 1.2], [78, 58, 2.1], [35, 70, 0.6], [55, 45, 1.7], [15, 55, 2.6], [60, 80, 0.3], [45, 18, 2.3]];
const orbHTML = (texts = [], big = false, busy = false) => {
    const v = texts.filter(Boolean).slice(0, 4);
    const galaxy = big || busy;
    return `<div class="ss-orb-wrap ${big ? 'big' : ''}"><div class="ss-orb ${galaxy ? 'galaxy' : 'idle'} ${busy ? 'busy' : ''}">
        <div class="ss-orb-mist"></div><div class="ss-orb-glitter"></div>
        ${SPARKS.map(([x, y, d]) => `<i class="ss-orb-spark" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join('')}
        ${v.map((x, i) => `<div class="ss-orb-v n${v.length}" style="animation-delay:${i * 6}s"><span>${esc(x)}</span></div>`).join('')}
        <div class="ss-orb-shine"></div></div><div class="ss-orb-cushion"><i></i><i></i></div></div>`;
};
// 굿: 무엇이 실제로 바뀌는지는 여기서 정한다 (AI는 장면만 쓴다). 수치가 바뀌는 것은 내 상태창이라 {{user}}에게 할 때만.
export const GUTS = {
    ward: { name: '액막이굿', desc: '걸린 저주 하나를 풀어요. 저주가 없으면 7일짜리 액막이를 걸어 둬요.' },
    luck: { name: '재수굿', desc: '7일 동안 「재수굿의 가호」 — 가격 −10%.', bless: { name: '재수굿의 가호', desc: '굿으로 재수를 불러들였다.', effects: ['가격 -10%'], days: 7 } },
    love: { name: '인연굿', desc: '7일 동안 「인연굿의 가호」 — 호감 +20%.', bless: { name: '인연굿의 가호', desc: '굿으로 인연의 길을 틔웠다.', effects: ['호감 +20%'], days: 7 } },
    soul: { name: '진혼굿', desc: '넋을 달래요. 수치는 안 바뀌고 이야기에만 남아요.' },
    wish: { name: '소원굿', desc: '바라는 것을 적고 빌어요. 수치는 안 바뀌고 이야기에만 남아요.' },
};
const R = (n) => Math.floor(Math.random() * n);
const pickOne = (a) => a[R(a.length)];
// 🎲 운세표: 좋고 나쁨은 AI가 아니라 주사위가 먼저 정한다 (AI에게 맡기면 늘 듣기 좋은 소리만 했음)
export const LUCK_AREAS = [['총운', 'overall'], ['애정', 'love'], ['재물', 'money'], ['건강', 'health'], ['일 · 진로', 'work'], ['사람', 'people']];
const VERDICTS = [['대길', 'GREAT FORTUNE', 10], ['길', 'GOOD', 20], ['평', 'FLAT / MIXED', 22], ['흉', 'BAD', 32], ['대흉', 'DISASTROUS', 16]];
const VERDICT_EN = Object.fromEntries(VERDICTS.map(([k, en]) => [k, en]));
const TOPIC_AREA = { 애정: '애정', 재물: '재물', 건강: '건강', '진로 · 일': '일 · 진로', 인간관계: '사람' };
function rollVerdict() { let x = R(100); for (const [k, , w] of VERDICTS) { if (x < w) return k; x -= w; } return '평'; }
function rollLuck() {
    const luck = LUCK_AREAS.map(([a]) => ({ a, v: rollVerdict() }));
    if (!luck.some(l => l.v === '흉' || l.v === '대흉')) pickOne(luck).v = R(3) ? '흉' : '대흉'; // 나쁜 곳이 하나는 꼭 있다
    return luck;
}
// 점괘에 꼭 들어갈 구체적인 것들 (뻔한 소리 막기)
const HOOK_PERSON = ['a left-handed man', 'an older woman who wears glasses', 'someone from your past who reappears', 'a family member', 'a stranger met while traveling', 'a person who smells of tobacco', 'a coworker or rival', 'someone born in winter', 'a young person who talks too much', 'a person in a uniform'];
const HOOK_EVENT = ['a lost object', 'a request to borrow money', 'a move or a change of place', 'a small accident or injury', 'an unexpected message late at night', 'a loud quarrel', 'a test or evaluation', 'a secret coming out', 'a broken promise', 'a sudden expense', 'a door that will not open', 'an invitation you should refuse'];
const HOOK_OBJECT = ['a red umbrella', 'a cracked mirror', 'an old key', 'a letter', 'a black cat', 'shoes', 'a ring', 'a knife', 'running water', 'a stopped clock', 'a white flower', 'a bridge'];
const HOOK_DIR = ['east', 'west', 'south', 'north', 'northeast', 'northwest', 'southeast', 'southwest'];
const rollHooks = () => [`within ${1 + R(12)} weeks`, `the ${pickOne(HOOK_DIR)}`, pickOne(HOOK_PERSON), pickOne(HOOK_EVENT), pickOne(HOOK_OBJECT), `the number ${1 + R(9)}`];
export const luckLines = (luck, topic) => luck.map(l => `${LUCK_AREAS.find(x => x[0] === l.a)?.[1] ?? l.a}: ${VERDICT_EN[l.v] ?? l.v}${TOPIC_AREA[topic] === l.a ? '  ← the asked topic' : ''}`);
const VCLS = { 대길: 'g2', 길: 'g1', 평: 'g0', 흉: 'b1', 대흉: 'b2' };
const luckHTML = (luck) => (luck?.length ? `<div class="ss-ft-luck">${luck.map(l => `<span class="ss-ft-stamp ${VCLS[l.v] ?? ''}"><small>${esc(l.a)}</small><b>${esc(l.v)}</b></span>`).join('')}</div>` : '');

// ───── 시간: 이야기 속 · 현실 ─────
export const storyNow = (s) => { const c = s.data.calendar && modOn('calendar') ? s.data.calendar : null; return c ? `${dateStr(c)} ${c.time}${c.weather ? ` · ${c.weather}` : ''}` : ''; };
export const realNow = () => new Date().toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

// ───── 누구든: 나 · 카드 인물 · 프로필 · 관계 · 연락처 · 전에 점 본 사람 ─────
export function fortunePeople(s) {
    const d = s.data, out = [], seen = new Set();
    const add = (n) => { n = String(n ?? '').trim(); const k = norm(n); if (n && !seen.has(k)) { seen.add(k); out.push(n); } };
    add(userName());
    for (const ch of chatCharacters()) add(ch?.name);
    for (const p of d.profile?.list ?? []) add(p.name);
    for (const r of d.rel?.user ?? []) add(r.name);
    for (const c of d.contact?.contacts ?? []) add(c.name);
    for (const b of d.fate?.births ?? []) add(b.name);
    return out;
}

// ───── 복채: 정해 둔 값 → 없으면 이 세계 물가(아는 가격의 가운데 값)에 맞춰 ─────
const nice = (n) => { if (n < 10) return Math.max(1, Math.round(n)); const p = 10 ** (Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
function baseFee(s) {
    const ps = [...(s.data.wallet?.prices ?? []).map(p => p.price), ...(s.data.shop?.shops ?? []).flatMap(sh => sh.items.map(i => i.price))].map(Number).filter(x => x > 0).sort((a, b) => a - b);
    return ps.length >= 3 ? ps[Math.floor(ps.length / 2)] : num(s.data.contact?.express?.fee, 0) || 100;
}
export function fortuneFees(s) {
    const f = s.data.fate ?? {}, w = s.data.wallet && modOn('wallet') ? s.data.wallet : null;
    if (!w) return { free: true, tarot: 0, orb: 0, shaman: 0, gut: 0 };
    const b = baseFee(s), mul = priceMul(s);
    const fee = (set, k) => Math.max(1, Math.round((set > 0 ? set : nice(b * k)) * mul));
    return { free: false, tarot: fee(f.feeTarot, 1), orb: fee(f.feeOrb, 1.5), shaman: fee(f.feeShaman, 3), gut: fee(f.feeGut, 30) };
}

// ───── 화면 ─────
// 🃏 펼쳐 둔 카드 12장 (뒷면) — 눌러서 고른다. 다 안 고르고 점을 보면 나머지는 세라가 뽑는다
function deckOf(ui) {
    if (!ui.ftDeck) { const pool = [...TAROT]; ui.ftDeck = Array.from({ length: TAROT.length }, () => ({ name: pool.splice(R(pool.length), 1)[0], rev: R(3) === 0 })); ui.ftPicked = []; }
    return ui.ftDeck;
}
function fanHTML(ui, sp) {
    const deck = deckOf(ui), picked = ui.ftPicked ?? [], n = sp.pos.length, full = picked.length >= n;
    const ROW = 26;
    const rows = [0, 1, 2].map(r => deck.slice(r * ROW, r * ROW + ROW).map((c, j) => {
        const i = r * ROW + j;
        return picked.includes(i) ? `<span class="ss-tc-gap" style="--j:${j}"></span>` : `<button class="ss-tc back" data-act="ftpick" data-arg="${i}" ${full ? 'disabled' : ''} style="--j:${j}" title="이 카드 뽑기"><div class="ss-tc-in"><div class="ss-tc-back"></div></div></button>`;
    }).join(''));
    return `<div class="ss-ft-stage tarot"><div class="ss-ft-fan">${rows.map(x => `<div class="ss-ft-fanrow">${x}</div>`).join('')}</div>
        <div class="ss-ft-spread pick">${sp.pos.map((pos, k) => (picked[k] !== undefined ? cardHTML(deck[picked[k]].name, deck[picked[k]].rev, pos, ui.ftJust === picked[k] ? 'just' : '') : `<div class="ss-tc empty"><div class="ss-tc-in"></div><small class="ss-tc-pos">${esc(pos)}</small></div>`)).join('')}</div>
        <div class="ss-row-btns"><small class="ss-dim">78장 중에서 ${full ? '다 골랐어요. 이 카드로 점을 볼게요!' : `마음 가는 카드를 ${n - picked.length}장 더 골라요 — 안 고르고 보면 세라가 대신 뽑아요`}</small><button class="ss-btn sm ghost" data-act="ftshuffle"><i class="fa-solid fa-shuffle"></i> 다시 섞기</button></div></div>`;
}
// 🎛 점쟁이마다 켜고 끄기 (v2.9 · 모든 채팅 공통 · 기본 끔): 관리 › 쓸 기능 › 운명 칸 밑 · 확장 설정의 같은 칸과 한 값. 굿은 무당을 켰을 때만
export const FT_KEYS = { tarot: 'fortuneTarot', orb: 'fortuneOrb', shaman: 'fortuneShaman' };
export const ftOn = (m) => settings()[FT_KEYS[m]] === true;
export const ftMethods = () => Object.keys(FT_METHODS).filter(ftOn);
const form = (ui) => (ui.ft ??= { who: '', name: '', method: 'tarot', spread: '3', topic: '종합', q: '', basis: 'story', gut: 'ward', wish: '' });
const whoOf = (F) => (F.name.trim() || F.who || userName());
function keepForm(el) {
    const F = form(el._ss.ui);
    el._ss.ui.ftJust = -1; // 막 뒤집은 카드 표시는 한 번만 (다른 단추를 눌러 다시 그릴 땐 또 뒤집지 않게)
    const v = (c) => el.querySelector(c)?.value;
    if (v('.ss-ft-who') !== undefined) F.who = v('.ss-ft-who');
    if (v('.ss-ft-name') !== undefined) F.name = v('.ss-ft-name');
    if (v('.ss-ft-q') !== undefined) F.q = v('.ss-ft-q');
    if (v('.ss-ft-wish') !== undefined) F.wish = v('.ss-ft-wish');
    if (v('.ss-ft-lift') !== undefined) F.lift = v('.ss-ft-lift');
    return F;
}
const BIRTH_LABEL = { birth: '생년월일', hour: '태어난 시', age: '나이', zodiac: '띠', star: '별자리', element: '타고난 기운', place: '태어난 곳', nature: '기질' };
const personChips = (p) => [['birth', '🎂'], ['hour', '🕰'], ['age', '나이'], ['zodiac', '띠'], ['star', '별자리'], ['element', '기운'], ['place', '태어난 곳']].filter(([k]) => p?.[k]).map(([k, l]) => chip(`${l} ${esc(p[k])}`)).join('');

export function fortuneView(s, d, ui) {
    const ms = ftMethods(); if (!ms.length) return ''; // 점쟁이를 하나도 안 켰으면 점집이 없다
    const F = form(ui), fees = fortuneFees(s), w = s.data.wallet && modOn('wallet') ? s.data.wallet : null;
    const cur = w ? ` ${esc(w.currency)}` : '';
    const people = fortunePeople(s);
    if (!F.who || !people.some(n => n === F.who)) F.who = people[0] ?? '';
    const who = whoOf(F), saved = findBy(d.births ?? [], who);
    const sn = storyNow(s);
    if (!sn) F.basis = 'real';
    if (!ms.includes(F.method)) F.method = ms[0];
    const shamanOn = ms.includes('shaman');
    const sp = SPREADS[F.spread] ?? SPREADS[3];
    const price = (m) => (fees.free ? 0 : m === 'tarot' ? Math.max(1, Math.round(fees.tarot * sp.mul)) : fees[m]);
    const tag = (n) => (fees.free ? '' : ` <small>${fmtNum(n)}${cur}</small>`);
    const reads = [...(d.readings ?? [])].reverse();
    const shown = ui.ftShow ? (d.readings ?? []).find(r => r.id === ui.ftShow) : null;
    const mine = norm(who) === norm(userName());
    const lifts = mine && F.gut === 'ward' ? (d.curses ?? []).filter(c => c.kind !== 'bless' && !c.auto) : [];
    const editBirth = ui.ftEdit === 'birth' ? `<div class="ss-card ss-ft-edit"><small>${esc(who)}의 타고난 것 — 비운 칸은 첫 점에서 점쟁이가 채워요 · 전부 비우면 기록을 없애요</small>
            <div class="ss-ft-row">${FORTUNE_PERSON_KEYS.map(k => `<label class="ss-f"><span>${BIRTH_LABEL[k]}</span>${k === 'nature' ? `<textarea class="ss-in" data-ftb="${k}" rows="2">${esc(saved?.[k] ?? '')}</textarea>` : `<input class="ss-in" type="text" maxlength="80" data-ftb="${k}" value="${esc(saved?.[k] ?? '')}">`}</label>`).join('')}</div>
            <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="ftbsave">저장</button><button class="ss-btn sm ghost" data-act="ftclose">취소</button></div></div>` : '';
    const editFee = ui.ftEdit === 'fee' ? `<div class="ss-card ss-ft-edit"><small>복채 (${esc(w?.currency ?? '')}) — 0이나 빈칸 = 이 세계 물가에 맞춰 자동</small>
            <div class="ss-ft-row">${[['feeTarot', '타로 (3장 기준)', fees.tarot, 'tarot'], ['feeOrb', '수정구슬', fees.orb, 'orb'], ['feeShaman', '무당', fees.shaman, 'shaman'], ['feeGut', '굿', fees.gut, 'shaman']].filter(x => ms.includes(x[3])).map(([k, l, now]) => `<label class="ss-f"><span>${l} <small>지금 ${fmtNum(now)}</small></span><input class="ss-in" type="number" min="0" data-ftf="${k}" value="${d[k] || ''}" placeholder="자동"></label>`).join('')}</div>
            <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="ftfsave">저장</button><button class="ss-btn sm ghost" data-act="ftclose">취소</button></div></div>` : '';
    return sec(`🔮 점집 <small>${ms.map(m => FT_METHODS[m].name).concat(shamanOn ? ['굿'] : []).join(' · ')}</small>`, `<div class="ss-ft">
        ${ui.ftBusy ? `<div class="ss-card ss-ft-busy ${esc(ui.ftBusyKind ?? '')}">${ui.ftBusyKind === 'orb' ? orbHTML(['…', '무언가 비친다', '…'], true, true) : ui.ftBusyKind === 'tarot' && ui.ftBusyDraw?.length ? `<div class="ss-ft-spread">${ui.ftBusyDraw.map(parseDraw).filter(Boolean).map(c => cardHTML(c.name, c.rev, c.pos, 'wait')).join('')}</div>` : ui.ftBusyKind === 'shaman' || ui.ftBusyKind === 'gut' ? '<div class="ss-ft-bells">🔔🪭🔔</div>' : ''}<div><i class="fa-solid fa-spinner fa-spin"></i> ${esc(ui.ftBusy)} <small class="ss-dim">창을 닫아도 끝까지 받아서 알려 드려요</small></div></div>` : ''}
        ${shown ? `<div class="ss-card ss-ft-pop">${readingHTML(shown)}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="ftclose"><i class="fa-solid fa-xmark"></i> 점괘 접기</button></div></div>` : ''}
        <div class="ss-ft-clock"><span title="이야기 속 지금">📅 이야기 속 <b>${esc(sn || '달력 칸이 없어요')}</b></span><span title="현실의 지금">🕰 현실 <b>${esc(realNow())}</b></span></div>
        <div class="ss-ft-row">
            <label class="ss-f"><span>누구의 운세를 볼까요</span><select class="ss-in ss-ft-who" data-chg="ftwho">${people.map(n => `<option value="${esc(n)}" ${n === F.who ? 'selected' : ''}>${esc(n)}${norm(n) === norm(userName()) ? ' (나)' : ''}</option>`).join('')}</select></label>
            <label class="ss-f"><span>목록에 없는 인물 (적으면 이 이름으로)</span><input class="ss-in ss-ft-name" type="text" maxlength="60" placeholder="예: 지나가던 상인, 죽은 스승" value="${esc(F.name)}"></label>
        </div>
        <div class="ss-card ss-ft-birth"><small>${esc(who)}의 타고난 것</small>
            ${saved ? `<div class="ss-chips">${personChips(saved) || chip('비어 있음')}</div>${saved.nature ? `<p class="ss-dim ss-pre">${esc(saved.nature)}</p>` : ''}` : '<p class="ss-hint">아직 몰라요. 첫 점을 볼 때 점쟁이가 생년월일 · 태어난 시 · 띠 · 별자리를 짚어 내고, 그 뒤로는 계속 같은 값을 써요.</p>'}
            ${editBirth || `<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="ftbirth"><i class="fa-solid fa-pen"></i> 생년월일 직접 적기 · 고치기</button>${saved ? '<button class="ss-btn sm ghost danger" data-act="ftbdel"><i class="fa-solid fa-trash"></i> 생년월일 지우기</button>' : ''}</div>`}</div>
        <div class="ss-f"><span>점 보는 법</span>${seg(ms.map(k => [k, `${FT_METHODS[k].icon} ${FT_METHODS[k].name}${tag(price(k))}`]), F.method, 'ftm')}</div>
        <p class="ss-ft-teller">${FT_METHODS[F.method].icon} <b>${esc(FT_METHODS[F.method].teller)}</b> — ${esc(FT_METHODS[F.method].bio)}</p>
        ${F.method === 'tarot' ? `<div class="ss-f"><span>카드 수</span>${seg(Object.entries(SPREADS).map(([k, x]) => [k, `${x.name} <small>${esc(x.pos.join(' · '))}</small>`]), F.spread, 'fts')}</div>${ui.ftBusy ? '' : fanHTML(ui, sp)}` : ''}
        ${F.method === 'orb' && !ui.ftBusy && !shown ? `<div class="ss-ft-stage orb">${orbHTML()}<small class="ss-dim">구슬이 손님을 기다려요…</small></div>` : ''}
        <div class="ss-f"><span>무엇이 궁금한가요</span>${seg(TOPICS.map(t => [t, esc(t)]), F.topic, 'ftt')}</div>
        <label class="ss-f"><span>물어볼 것 (안 적어도 돼요)</span><input class="ss-in ss-ft-q" type="text" maxlength="200" placeholder="예: 이 사람과 계속 가도 될까요?" value="${esc(F.q)}"></label>
        <div class="ss-f"><span>언제를 「지금」으로 볼까요</span>${seg([['story', '📅 이야기 속 시간'], ['real', '🕰 현실 시간']], F.basis, 'ftb')}</div>
        <div class="ss-row-btns"><button class="ss-btn pri" data-act="ftread">${ai1} ${FT_METHODS[F.method].icon} ${esc(who)}의 점 보기${fees.free ? '' : ` — 복채 ${fmtNum(price(F.method))}${cur}`}</button>
            ${fees.free ? '' : '<button class="ss-btn sm ghost" data-act="ftfee"><i class="fa-solid fa-coins"></i> 복채 정하기</button>'}</div>
        ${editFee}
        ${shamanOn ? `<details class="ss-arc ss-ft-gut" ${ui.ftGutOpen ? 'open' : ''}><summary>🪘 굿 하기${fees.free ? '' : ` — ${fmtNum(fees.gut)}${cur}`}</summary>
            ${seg(Object.entries(GUTS).map(([k, g]) => [k, esc(g.name)]), F.gut, 'ftg')}
            <p class="ss-hint">${esc(GUTS[F.gut].desc)}${norm(who) === norm(userName()) ? '' : ` ${esc(who)}에게 하는 굿은 이야기에만 남아요 (수치는 내 것만 바뀌어요).`}</p>
            ${lifts.length > 1 ? `<label class="ss-f"><span>풀 저주</span><select class="ss-in ss-ft-lift">${lifts.map(c => `<option value="${esc(c.name)}" ${c.name === F.lift ? 'selected' : ''}>☠ ${esc(c.name)}</option>`).join('')}</select></label>` : ''}
            ${F.gut === 'wish' || F.gut === 'soul' ? `<label class="ss-f"><span>${F.gut === 'wish' ? '빌 소원' : '달랠 넋 · 사연 (안 적어도 돼요)'}</span><input class="ss-in ss-ft-wish" type="text" maxlength="200" value="${esc(F.wish)}"></label>` : ''}
            <div class="ss-row-btns"><button class="ss-btn" data-act="ftgut">${ai1} 🪘 ${esc(who)}에게 ${esc(GUTS[F.gut].name)}${fees.free ? '' : ` — ${fmtNum(fees.gut)}${cur}`}</button></div></details>` : ''}
        ${reads.length ? `<details class="ss-arc" ${ui.ftLogOpen ? 'open' : ''}><summary>지난 점괘 · 굿 ${reads.length}개</summary><ul class="ss-ft-log">${reads.map(r => `<li><button class="ss-btn sm ghost" data-act="ftview" data-arg="${esc(r.id)}">${r.method === 'gut' ? '🪘' : FT_METHODS[r.method]?.icon ?? '🔮'} <b>${esc(r.who)}</b> · ${esc(r.topic || '')} <small>${esc(r.when)}</small></button><button class="ss-btn sm ghost danger" data-act="ftdel" data-arg="${esc(r.id)}" title="이 점괘 지우기"><i class="fa-solid fa-trash"></i></button></li>`).join('')}</ul>
            <div class="ss-row-btns">${ui.ftDelAll ? `<span class="ss-dim">점괘 · 굿 기록과 생년월일을 전부 지울까요? (낸 돈 · 굿 효과는 그대로)</span><button class="ss-btn sm danger" data-act="ftdelall" data-arg="yes">전부 지우기</button><button class="ss-btn sm ghost" data-act="ftdelall" data-arg="no">취소</button>` : '<button class="ss-btn sm ghost danger" data-act="ftdelall"><i class="fa-solid fa-broom"></i> 점집 기록 전부 지우기</button>'}</div></details>` : ''}
        <p class="ss-hint">${fees.free ? '재산 칸이 꺼져 있어서 복채 없이 봐요. ' : `가진 돈 ${fmtNum(w.cash)}${cur}. `}점 · 굿 한 번에 확장 AI를 1번 불러요. 오늘 본 점괘는 다음 답에서 AI도 알고 이야기에 은근히 엮어요.</p></div>`);
}

function readingHTML(r) {
    const gut = r.method === 'gut';
    const m = gut ? { icon: '🪘', name: '굿' } : FT_METHODS[r.method] ?? FT_METHODS.tarot;
    const pc = personChips(r.person);
    return `<div class="ss-wz-head"><i class="fa-solid fa-hat-wizard"></i><div><b>${m.icon} ${esc(r.who)} — ${esc(m.name)}${r.topic ? ` · ${esc(r.topic)}` : ''}</b><small>${r.basis === 'real' ? '🕰 현실 시간' : '📅 이야기 속 시간'} ${esc(r.when)}${r.fee ? ` · 복채 ${fmtNum(r.fee)}` : ''}</small></div></div>
        ${r.q ? `<p class="ss-dim">물은 것: ${esc(r.q)}</p>` : ''}
        ${pc || r.person?.nature ? `<div class="ss-card ss-ft-birth"><small>타고난 것</small><div class="ss-chips">${pc}</div>${r.person?.nature ? `<p class="ss-dim ss-pre">${esc(r.person.nature)}</p>` : ''}</div>` : ''}
        ${r.method === 'tarot' && r.draw?.length ? `<div class="ss-ft-spread">${r.draw.map(parseDraw).filter(Boolean).map(c => cardHTML(c.name, c.rev, c.pos)).join('')}</div>` : ''}
        ${r.method === 'shaman' && r.draw?.length ? `<div class="ss-ft-flags">${r.draw.map(x => { const nm = String(x).replace(/^오방기 — /, ''); const col = FLAG_COLOR[nm.split(' ')[0]] ?? '#888'; return `<span class="ss-ft-flag"><i style="--c:${col}"></i>${esc(nm)}</span>`; }).join('')}</div>` : ''}
        ${r.method === 'orb' ? `<div class="ss-ft-stage orb">${orbHTML((r.sections ?? []).filter(x => x.voice === 'vision').map(x => x.text).concat((r.sections ?? []).some(x => x.voice === 'vision') ? [] : [r.summary]), true)}</div>` : ''}
        ${luckHTML(r.luck)}
        ${r.teller ? `<blockquote class="ss-pre">${esc(r.teller)}</blockquote>` : ''}
        ${r.rite ? `<p class="ss-pre">${esc(r.rite)}</p>` : ''}
        ${r.spirit ? `<p class="ss-pre ss-ft-spirit">${esc(r.spirit)}</p>` : ''}
        ${r.result ? `<div class="ss-card ss-ft-sum"><b>${esc(r.result)}</b></div>` : ''}
        ${r.summary ? `<div class="ss-card ss-ft-sum"><b>${esc(r.summary)}</b></div>` : ''}
        ${(r.sections ?? []).map(x => `<div class="ss-ft-sec ${x.voice ? `v-${x.voice}` : ''}">${x.title ? `<h5>${esc(x.title)}</h5>` : ''}<p class="ss-pre ${x.voice === 'spirit' ? 'ss-ft-spirit' : x.voice === 'vision' ? 'ss-ft-vision' : ''}">${esc(x.text)}</p></div>`).join('')}
        ${r.omen ? `<p><b>👁 징조</b> ${esc(r.omen)}</p>` : ''}
        ${r.advice ? `<p><b>🧭 조언</b> ${esc(r.advice)}</p>` : ''}
        ${r.lucky ? `<p><b>🍀 행운</b> ${esc(r.lucky)}</p>` : ''}`;
}
// 결과를 이 칸 안에 펼친다. 기다리는 동안 창을 닫았으면 알림만 (기록에는 이미 들어 있다)
function showReading(el, r) {
    const ui = el._ss?.ui;
    if (ui) { ui.ftBusy = ''; ui.ftShow = r.id; ui.ftEdit = ''; }
    if (el.isConnected) { app.renderPanel(el); el.querySelector('.ss-ft-pop')?.scrollIntoView({ block: 'nearest' }); }
    else toastr.success(`${esc(r.who)}의 ${r.method === 'gut' ? esc(r.topic) : '점괘'}가 나왔어요. 운명 › 점집 › 지난 점괘에서 볼 수 있어요.`, TITLE);
}
function setBusy(el, text, kind = '', draw = null) { const ui = el._ss?.ui; if (ui) { ui.ftBusy = text; ui.ftBusyKind = kind; ui.ftBusyDraw = draw; } if (el.isConnected) app.renderPanel(el); }
const canPay = (s, fee) => { if (!fee) return true; if (fee > (s.data.wallet?.cash ?? 0)) { toastr.warning(`돈이 모자라요. (${fmtNum(fee)} ${esc(s.data.wallet?.currency ?? '')} 필요)`, TITLE); return false; } return true; };
const stampOf = (s, F) => { const sn = storyNow(s), rn = realNow(); const basis = F.basis === 'real' || !sn ? 'real' : 'story'; return { sn, rn, basis, when: basis === 'real' ? rn : sn }; };
function drawFor(F, ui) {
    if (F.method === 'tarot') {
        const sp = SPREADS[F.spread] ?? SPREADS[3], deck = deckOf(ui), picked = [...(ui.ftPicked ?? [])];
        const rest = deck.map((_, i) => i).filter(i => !picked.includes(i));
        while (picked.length < sp.pos.length) picked.push(rest.splice(R(rest.length), 1)[0]); // 덜 고른 만큼은 세라가 뽑는다
        return sp.pos.map((pos, k) => `${pos} — ${deck[picked[k]].name} (${deck[picked[k]].rev ? '역방향' : '정방향'})`);
    }
    return F.method === 'shaman' ? [`오방기 — ${FLAGS[R(FLAGS.length)]}`] : [];
}

export const FORTUNE_CHANGES = {
    ftwho: (el) => { keepForm(el); app.renderPanel(el); },
};
const pick = (k) => (el, arg) => { const F = keepForm(el); F[k] = arg; if (k === 'gut') el._ss.ui.ftGutOpen = true; app.renderPanel(el); };
export const FORTUNE_ACTIONS = {
    ftm: pick('method'),
    fts: (el, arg) => { const F = keepForm(el); F.spread = arg; el._ss.ui.ftDeck = null; app.renderPanel(el); },
    ftpick: (el, arg) => {
        keepForm(el); const ui = el._ss.ui, sp = SPREADS[form(ui).spread] ?? SPREADS[3], i = Number(arg);
        deckOf(ui);
        if (ui.ftPicked.includes(i) || ui.ftPicked.length >= sp.pos.length) return;
        ui.ftPicked.push(i); ui.ftJust = i;
        app.renderPanel(el);
    },
    ftshuffle: (el) => { keepForm(el); el._ss.ui.ftDeck = null; app.renderPanel(el); },
    ftt: pick('topic'), ftb: pick('basis'), ftg: pick('gut'),
    ftread: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim();
        if (!ftOn(F.method)) return; // 꺼 둔 점쟁이
        if (!who) { toastr.info('누구의 운세를 볼지 골라 주세요.', TITLE); return; }
        const fees = fortuneFees(s), sp = SPREADS[F.spread] ?? SPREADS[3];
        const fee = fees.free ? 0 : F.method === 'tarot' ? Math.max(1, Math.round(fees.tarot * sp.mul)) : fees[F.method];
        if (!canPay(s, fee)) return;
        const luck = rollLuck(), hooks = rollHooks();
        const T = stampOf(s, F), draw = drawFor(F, el._ss.ui), saved = findBy(s.data.fate?.births ?? [], who) ?? null;
        if (el._ss.ui.ftBusy) return; // 한 번에 하나
        el._ss.ui.ftShow = '';
        setBusy(el, `${FT_METHODS[F.method].teller}이(가) ${who}의 점괘를 보는 중…`, F.method, draw);
        el._ss.ui.ftDeck = null; // 다음 점은 새로 섞은 카드로
        let res;
        try { res = await fortuneRead({ who, method: F.method, topic: F.topic, q: F.q.trim(), basis: T.basis, storyNow: T.sn, realNow: T.rn, draw, saved, luck: luckLines(luck, F.topic), hooks }, s); }
        catch (e) { toastr.error(`점을 보지 못했어요 (복채는 안 나갔어요): ${esc(e.message)}`, TITLE); setBusy(el, ''); return; }
        el._ss.ui.ftBusy = '';
        const keep = Object.fromEntries(Object.entries(saved ?? {}).filter(([k, v]) => FORTUNE_PERSON_KEYS.includes(k) && v));
        const r = { id: uid(), who, method: F.method, topic: F.topic, q: F.q.trim(), when: T.when, basis: T.basis, fee, draw, luck, ...res, person: fortunePerson({ ...(res.person ?? {}), ...keep }) };
        const cur = s.data.wallet?.currency ?? '';
        await addAdjust({ ops: [...(fee ? [['cash', `-${fee}`]] : []), ['_fortune', JSON.stringify(r)]], label: `🔮 점집 — ${FT_METHODS[F.method].name}(으)로 ${who}의 ${F.topic} 운을 봤다${fee ? ` (복채 ${fmtNum(fee)} ${cur})` : ''}: ${short(r.summary || r.omen, 90)}` });
        showReading(el, r);
    },
    ftview: (el, arg, btn, s) => { keepForm(el); el._ss.ui.ftLogOpen = true; const r = (s.data.fate?.readings ?? []).find(x => x.id === arg); if (r) showReading(el, r); },
    // 🗑 지우기: 점괘 하나 · 전부(점괘 + 생년월일) · 이 인물의 생년월일 — 새 창 없이
    ftdel: async (el, arg) => { keepForm(el); el._ss.ui.ftLogOpen = true; if (el._ss.ui.ftShow === arg) el._ss.ui.ftShow = ''; await addAdjust({ ops: [['_ftdel', arg]], silent: true }); },
    ftdelall: async (el, arg) => {
        keepForm(el); const ui = el._ss.ui; ui.ftLogOpen = true;
        if (arg !== 'yes') { ui.ftDelAll = !arg; app.renderPanel(el); return; }
        ui.ftDelAll = false; ui.ftShow = '';
        await addAdjust({ ops: [['_ftdel', '*']], silent: true });
    },
    ftbdel: async (el) => { const F = keepForm(el), who = whoOf(F).trim(); if (who) await addAdjust({ ops: [['_birth', `-${who}`]], silent: true }); },
    ftclose: (el) => { keepForm(el); el._ss.ui.ftShow = ''; el._ss.ui.ftEdit = ''; app.renderPanel(el); },
    ftbirth: (el) => { keepForm(el); el._ss.ui.ftEdit = 'birth'; el._ss.ui.ftShow = ''; app.renderPanel(el); },
    ftbsave: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim(); if (!who) return;
        const vals = Object.fromEntries([...el.querySelectorAll('[data-ftb]')].map(x => [x.dataset.ftb, x.value.trim()]));
        el._ss.ui.ftEdit = '';
        const had = findBy(s.data.fate?.births ?? [], who);
        if (!Object.values(vals).some(Boolean)) { if (had) await addAdjust({ ops: [['_birth', `-${who}`]], silent: true }); else app.renderPanel(el); return; }
        await addAdjust({ ops: [['_birth', JSON.stringify({ name: who, ...fortunePerson(vals) })]], silent: true });
    },
    ftfee: (el) => { keepForm(el); el._ss.ui.ftEdit = 'fee'; el._ss.ui.ftShow = ''; app.renderPanel(el); },
    ftfsave: async (el) => {
        keepForm(el);
        const g = (k) => Math.max(0, Math.round(num(el.querySelector(`[data-ftf="${k}"]`)?.value, 0)));
        el._ss.ui.ftEdit = '';
        await addAdjust({ ops: [['_ftfee', ['feeTarot', 'feeOrb', 'feeShaman', 'feeGut'].map(g).join(' | ')]], silent: true });
    },
    ftgut: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim(); if (!who) return;
        if (!ftOn('shaman')) return; // 굿은 무당을 켰을 때만
        el._ss.ui.ftGutOpen = true;
        const g = GUTS[F.gut] ?? GUTS.ward, mine = norm(who) === norm(userName());
        if (F.gut === 'wish' && !F.wish.trim()) { toastr.info('빌 소원을 적어 주세요.', TITLE); return; }
        const fees = fortuneFees(s), fee = fees.free ? 0 : fees.gut;
        if (!canPay(s, fee)) return;
        // 무엇이 바뀌는지 먼저 정한다
        let lift = '', bless = null, outcome = `The rite is performed for ${who}. Nothing is guaranteed — whether and how it works on ${who} is left to the story.`;
        if (mine && F.gut === 'ward') {
            const cs = (s.data.fate?.curses ?? []).filter(c => c.kind !== 'bless' && !c.auto);
            lift = (cs.find(c => c.name === F.lift) ?? cs[0])?.name ?? ''; // 여럿이면 굿 상자 안의 「풀 저주」에서 고른 것
            if (lift) outcome = `The curse "${lift}" on {{user}} is lifted by this rite. It is gone.`;
            else { bless = { name: '액막이', desc: '굿으로 액을 막아 두었다.', effects: [], days: 7 }; outcome = '{{user}} has no curse to lift, so a protective ward is laid on them for 7 days (blessing "액막이").'; }
        } else if (mine && g.bless) { bless = g.bless; outcome = `{{user}} receives the blessing "${g.bless.name}" for ${g.bless.days} days (${g.bless.effects.join(', ')}).`; }
        const T = stampOf(s, F);
        if (el._ss.ui.ftBusy) return;
        el._ss.ui.ftShow = '';
        setBusy(el, `박보살 할매가 ${who}에게 ${g.name}을(를) 하는 중…`, 'gut');
        let res;
        try { res = await gutRite({ who, rite: g.name, wish: F.wish.trim(), outcome, storyNow: T.sn }, s); }
        catch (e) { toastr.error(`굿을 하지 못했어요 (돈은 안 나갔어요): ${esc(e.message)}`, TITLE); setBusy(el, ''); return; }
        el._ss.ui.ftBusy = '';
        const r = { id: uid(), who, method: 'gut', topic: g.name, q: F.wish.trim(), when: T.when, basis: T.basis, fee, draw: [], rite: res.rite, spirit: res.spirit, result: res.result || (lift ? `「${lift}」이(가) 풀렸다` : bless ? `「${bless.name}」을(를) 받았다` : ''), omen: res.omen, lift, bless };
        const cur = s.data.wallet?.currency ?? '';
        await addAdjust({ ops: [...(fee ? [['cash', `-${fee}`]] : []), ['_fortune', JSON.stringify(r)]], label: `🪘 점집 — ${who}에게 ${g.name}을(를) 했다${fee ? ` (${fmtNum(fee)} ${cur})` : ''}${r.result ? `: ${short(r.result, 80)}` : ''}` });
        showReading(el, r);
    },
};
