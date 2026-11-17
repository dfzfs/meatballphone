// 🍞 생활 틀 (v2.9) — 심즈 · 좀보이드처럼 굴러가게 하는 묶음. 전부 「넣기」를 눌렀을 때만 상태에 들어간다 (안 누르면 예전과 똑같다)
//   ① 욕구 게이지 추천 세트: 시간이 지나면 저절로 줄고(decay) · 단계마다 상태가 붙고(stages) · 바닥이면 다른 게이지를 깎는다(zero) — 계산은 ops.js needsTick
//   ② 미트볼 상점: 지금 있는 게이지를 채워 주는 기본 품목 · 물약이 늘 있는 가게 (상점 칸에 진짜 가게로 들어간다 — 사서 「사용」하면 효과가 적용됨)
//   ③ 생활비 틀: 월세 · 관리비 · 통신비 · 구독료를 재산의 「정기 수입 · 지출」에 넣는다
//   ④ 👕 옷차림 · 장비 화면: addons.js(장비 착용)의 단추 — 재산 탭 아래. 효과 글의 「체온 -30%」는 그 욕구가 30% 덜 줄게 한다
// 값은 이 채팅의 물가(재산 › 물가 · 상점 가격의 아래쪽 4분의 1)를 한 단위로 삼아 맞춘다.
import { app, settings, saveSettings, modOn, esc, fmtNum, norm, clone, findBy, EMPTY, TITLE, LOG, ssWarn, isSimple } from './core.js';
import { commit, addAdjust } from './engine.js';
import { parseStages, stageOf } from './ops.js';
import { sec, choosePopup } from './kit.js';
// addons.js는 켠 사람만 불러오는 파일이라(index.js loadAddons) 여기서도 쓸 때 불러온다 — 그 전에는 「켜기」 단추만 보인다
let AD = null;
const loadAD = async () => { if (!AD) { try { await app.loadAddons?.(true); } catch (e) { ssWarn(LOG, 'addons', e); } AD = await import('./addons.js'); } return AD; };

const EN = () => /^en/i.test(String(settings().ssGenLang || settings().genLang || ''));
const T = (ko, en) => (EN() ? en : ko);

// 게이지 이름 → 무슨 욕구인지 (이미 있는 게이지에 얹을 때 · 상점 품목을 고를 때)
const KIND = [
    ['hunger', /허기|배고|포만|hunger|satiety/i], ['thirst', /갈증|수분|thirst|hydrat/i], ['fatigue', /피로|fatigue/i], ['energy', /에너지|기력|수면|졸음|energy|sleep/i],
    ['hygiene', /위생|청결|hygiene/i], ['boredom', /지루|boredom/i], ['fun', /재미|즐거|\bfun\b/i], ['social', /사교|외로|social|lonel/i], ['stress', /스트레스|stress/i],
    ['sanity', /정신|이성|멘탈|sanity|mental/i], ['fear', /공포|두려|fear|panic/i], ['warmth', /체온|온기|warmth|temperature/i], ['mp', /마나|마력|\bmp\b|mana/i], ['stamina', /스태미나|지구력|stamina/i], ['hp', /체력|생명|\bhp\b|health/i],
];
export const kindOf = (name) => KIND.find(([, re]) => re.test(String(name)))?.[0] ?? '';
const RISING = new Set(['fatigue', 'boredom', 'stress', 'fear']); // 높을수록 나쁜 것 (0에서 시작)

// decay = 하루에 줄어드는 양 (음수 = 저절로 참 · 오름)
const BAR = {
    hp: { ko: '체력', en: 'HP', color: '#e2524a', decay: 0, desc: ['0이 되면 쓰러져요', 'Collapse at 0'] },
    mp: { ko: '마나', en: 'MP', color: '#4a8fe2', decay: -40, desc: ['쉬면 저절로 차요', 'Refills with rest'] },
    stamina: { ko: '스태미나', en: 'Stamina', color: '#4a8fe2', decay: -70, desc: ['쉬면 저절로 차요', 'Refills with rest'] },
    hunger: { ko: '허기', en: 'Hunger', color: '#e8a13a', decay: 90, st: ['50:출출함, 25:배고픔, 0:굶주림', '50:Peckish, 25:Hungry, 0:Starving'], zero: 12, desc: ['100 = 배부름 · 먹어야 차요', '100 = full · eat to refill'] },
    thirst: { ko: '수분', en: 'Hydration', color: '#4aa3e2', decay: 110, st: ['50:목마름, 20:탈수 직전, 0:탈수', '50:Thirsty, 20:Parched, 0:Dehydrated'], zero: 20, desc: ['100 = 충분 · 마셔야 차요', '100 = hydrated · drink to refill'] },
    energy: { ko: '에너지', en: 'Energy', color: '#7a6ad6', decay: 80, st: ['40:피곤함, 15:녹초, 0:쓰러지기 직전', '40:Tired, 15:Exhausted, 0:About to drop'], zero: 6, desc: ['자거나 쉬어야 차요', 'Sleep or rest to refill'] },
    hygiene: { ko: '위생', en: 'Hygiene', color: '#46b8a6', decay: 55, st: ['40:꾀죄죄함, 15:악취', '40:Grubby, 15:Reeking'], desc: ['씻어야 차요 · 낮으면 첫인상에 불리', 'Wash to refill · low hurts first impressions'] },
    fun: { ko: '재미', en: 'Fun', color: '#e26aa8', decay: 50, st: ['35:심심함, 10:우울함', '35:Bored, 10:Miserable'], desc: ['놀아야 차요', 'Play to refill'] },
    social: { ko: '사교', en: 'Social', color: '#e2784a', decay: 35, st: ['35:외로움, 10:고립감', '35:Lonely, 10:Isolated'], desc: ['사람을 만나야 차요', 'See people to refill'] },
    stress: { ko: '스트레스', en: 'Stress', color: '#9a6ad6', decay: -12, st: ['60+:예민함, 85+:한계', '60+:On edge, 85+:Breaking point'], desc: ['가만히 있어도 조금씩 쌓여요', 'Builds slowly on its own'] },
    boredom: { ko: '지루함', en: 'Boredom', color: '#b0a08a', decay: -25, st: ['60+:지루함, 85+:좀이 쑤심', '60+:Bored, 85+:Stir-crazy'], desc: ['할 일이 없으면 쌓여요', 'Builds when idle'] },
    warmth: { ko: '체온', en: 'Warmth', color: '#e2524a', decay: 0, st: ['40:으슬으슬, 20:동상 위험, 0:저체온', '40:Chilly, 20:Frostbite risk, 0:Hypothermic'], zero: 15, desc: ['추위 · 비에 깎여요 (옷으로 막아요)', 'Drops in cold and rain (clothes help)'] },
    sanity: { ko: '정신력', en: 'Sanity', color: '#5a7bd6', decay: 10, st: ['50:불안, 25:무너지는 중, 0:붕괴', '50:Uneasy, 25:Unraveling, 0:Broken'], desc: ['무서운 것을 볼수록 깎여요', 'Drops with every horror'] },
    fear: { ko: '공포', en: 'Fear', color: '#6a6a7a', decay: 40, st: ['50+:겁에 질림, 80+:공황', '50+:Shaken, 80+:Panicking'], desc: ['시간이 지나면 가라앉아요', 'Settles with time'] },
};
export const NEED_SETS = [
    { id: 'sims', icon: '🏠', name: ['일상 (심즈풍)', 'Everyday (Sims-like)'], bars: ['hunger', 'energy', 'hygiene', 'fun', 'social'] },
    { id: 'zomboid', icon: '🧟', name: ['생존 (좀보이드풍)', 'Survival (Zomboid-like)'], bars: ['hp', 'thirst', 'hunger', 'energy', 'warmth', 'stress', 'boredom'] },
    { id: 'horror', icon: '🕯', name: ['호러', 'Horror'], bars: ['hp', 'sanity', 'fear', 'energy'] },
    { id: 'fantasy', icon: '⚔', name: ['판타지', 'Fantasy'], bars: ['hp', 'mp', 'stamina', 'hunger'] },
];
export const SPEEDS = [[0.5, '느긋'], [1, '보통'], [1.5, '빠듯'], [2, '혹독']];

// 추천 세트를 지금 수치에 얹는다 — 같은 뜻의 게이지가 이미 있으면 그 게이지에 규칙만 붙이고(지금 값은 그대로), 없으면 새로 만든다
export function withSet(stats, id) {
    const set = NEED_SETS.find(x => x.id === id); if (!set) return null;
    const nd = clone(stats ?? EMPTY.stats());
    const hpName = () => nd.bars.find(b => kindOf(b.name) === 'hp')?.name ?? '';
    for (const k of set.bars) {
        const def = BAR[k]; let b = nd.bars.find(x => kindOf(x.name) === k);
        if (!b) { b = { name: T(def.ko, def.en), cur: RISING.has(k) ? 0 : 100, max: 100, color: def.color, desc: T(...def.desc) }; nd.bars.push(b); }
        if (def.decay && !b.decay) b.decay = def.decay;
        if (def.st && !b.stages) b.stages = T(...def.st);
    }
    for (const k of set.bars) { const def = BAR[k], b = nd.bars.find(x => kindOf(x.name) === k); if (def.zero && b && !b.zero && hpName() && hpName() !== b.name) b.zero = `${hpName()} -${def.zero}`; }
    return nd;
}
export function withoutNeeds(stats) {
    const nd = clone(stats ?? EMPTY.stats());
    for (const b of nd.bars) for (const k of ['decay', 'stages', 'zero', 'rem', 'zrem', 'stg']) delete b[k];
    nd.conds = nd.conds.filter(c => !c.auto); delete nd.tick; delete nd.days; delete nd.nlog; delete nd.speed;
    return nd;
}

// 이 채팅의 물가 한 단위 (간식 하나 값쯤)
export function priceUnit(s) {
    const ps = [...(s.data.wallet?.prices ?? []).map(p => p.price), ...(s.data.shop?.shops ?? []).filter(x => !isMeatShop(x)).flatMap(x => x.items.map(i => i.price))].filter(n => n > 0).sort((a, b) => a - b);
    return ps.length ? ps[Math.floor(ps.length / 4)] : Math.max(1, (s.data.wallet?.cash ?? 100) / 40);
}
const nice = (n) => { if (n < 10) return Math.max(1, Math.round(n)); const p = 10 ** (Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };

// 미트볼 상점: [욕구, 이름, 설명, 채우는 양, 값(단위 배수)]
const GOODS = [
    ['hunger', ['삼각김밥', 'Rice Ball'], ['간단히 때우는 한 끼', 'A quick bite'], 25, 0.5], ['hunger', ['든든한 도시락', 'Hearty Lunchbox'], ['배부르게 먹는 한 끼', 'A proper meal'], 60, 1.2],
    ['thirst', ['생수', 'Bottled Water'], ['목을 축여요', 'Quenches thirst'], 45, 0.3],
    ['energy', ['캔커피', 'Canned Coffee'], ['잠깐 버티게 해 줘요', 'Keeps you going a while'], 20, 0.5], ['energy', ['에너지 드링크', 'Energy Drink'], ['한나절은 버텨요', 'Good for half a day'], 40, 1],
    ['fatigue', ['에너지 드링크', 'Energy Drink'], ['피로를 눌러 줘요', 'Pushes fatigue back'], -35, 1],
    ['hygiene', ['비누 · 샴푸 세트', 'Soap & Shampoo Kit'], ['씻고 나면 개운해요', 'Fresh and clean'], 65, 0.8],
    ['fun', ['만화책', 'Comic Book'], ['한두 시간은 순식간', 'An hour or two flies by'], 35, 1], ['fun', ['휴대용 게임기 대여', 'Handheld Game Rental'], ['하루가 즐거워요', 'A whole day of fun'], 70, 2.5],
    ['boredom', ['퍼즐 잡지', 'Puzzle Magazine'], ['지루함을 달래요', 'Kills the boredom'], -40, 0.8],
    ['social', ['수다 간식 세트', 'Snack Box to Share'], ['누군가와 나눠 먹어요', 'Share it with someone'], 30, 1],
    ['stress', ['허브티', 'Herbal Tea'], ['마음이 가라앉아요', 'Calms the nerves'], -25, 0.7],
    ['sanity', ['안정제', 'Calming Pills'], ['떨리는 손이 멎어요', 'Steadies shaking hands'], 30, 2],
    ['fear', ['작은 부적', 'Small Charm'], ['쥐고 있으면 덜 무서워요', 'Less scary with it in hand'], -30, 1.5],
    ['warmth', ['핫팩', 'Heat Pack'], ['몸이 녹아요', 'Warms you up'], 35, 0.6],
    ['stamina', ['이온 음료', 'Sports Drink'], ['숨이 돌아와요', 'Catch your breath'], 35, 0.7],
    ['mp', ['마나 물약', 'Mana Potion'], ['푸른 약 한 병', 'A vial of blue'], 35, 2.5],
    ['hp', ['회복 물약', 'Healing Potion'], ['상처가 아물어요', 'Closes wounds'], 30, 2.5], ['hp', ['구급상자', 'First Aid Kit'], ['제대로 치료해요', 'Proper treatment'], 65, 5],
];
// 입는 것: [욕구, 이름, 설명, 덜 줄게 하는 %, 값]
const WEARS = [['warmth', ['두꺼운 외투', 'Heavy Coat'], ['입고 있으면 체온이 덜 떨어져요', 'Worn: warmth drops slower'], -40, 6], ['energy', ['편한 운동화', 'Comfy Sneakers'], ['신고 있으면 덜 지쳐요', 'Worn: tire slower'], -15, 5], ['hygiene', ['방수 우비', 'Rain Poncho'], ['입고 있으면 덜 더러워져요', 'Worn: stay clean longer'], -20, 3]];
export const MEAT_SHOP = () => T('미트볼 상점', 'Meatball Mart');
const isMeatShop = (x) => ['미트볼 상점', 'Meatball Mart'].some(n => norm(n) === norm(x?.name));
export function meatShop(s) {
    const bars = s.data.stats?.bars ?? [], u = priceUnit(s), items = [], seen = new Set();
    const add = (name, desc, effect, mul) => { if (seen.has(name)) return; seen.add(name); items.push({ name, price: nice(u * mul), desc, effect, kind: 'item', stock: -1 }); };
    for (const b of bars) {
        const k = kindOf(b.name);
        for (const [kind, nm, ds, amt, mul] of GOODS) if (kind === k) add(T(...nm), T(...ds), `${b.name} ${amt > 0 ? '+' : '−'}${Math.abs(amt)}`, mul);
        if (b.decay > 0) for (const [kind, nm, ds, pct, mul] of WEARS) if (kind === k) add(T(...nm), T(...ds), `${b.name} ${pct}%`, mul);
    }
    return { name: MEAT_SHOP(), desc: T('기본 품목 · 물약은 다 있어요. 어디서든 들를 수 있어요.', 'Every basic and potion in stock. Reachable from anywhere.'), place: '', items };
}
export function withMeatShop(s) { const nd = clone(s.data.shop ?? EMPTY.shop()); nd.shops = [meatShop(s), ...nd.shops.filter(x => !isMeatShop(x))]; return nd; }

// 생활비 틀: [이름, 얼마마다, 값(단위 배수)]
const BILLS = [[['월세', 'Rent'], 'month', 60], [['관리비 · 공과금', 'Utilities'], 'month', 14], [['통신비', 'Phone Bill'], 'month', 6], [['구독료', 'Subscriptions'], 'week', 2]];
export function withBills(s) {
    const nd = clone(s.data.wallet ?? EMPTY.wallet()), u = priceUnit(s); nd.regular ??= []; let n = 0;
    for (const [nm, every, mul] of BILLS) { const name = T(...nm); if (!findBy(nd.regular, name)) { nd.regular.push({ name, amount: -nice(u * mul), every, next: null }); n++; } }
    return n ? nd : null;
}

// ───── 화면: 수치 탭 ─────
const fx = (n) => (n > 0 ? `−${fmtNum(n)}` : `+${fmtNum(-n)}`);
export function needLine(b, d) {
    if (!b.decay && !b.stages && !b.zero) return '';
    const sp = Number(d?.speed ?? 1) || 1, mod = Number(d?.mods?.[norm(b.name)] ?? 0), rate = b.decay ? Math.round(b.decay * sp * Math.max(0, 1 + mod / 100)) : 0, st = stageOf(b);
    const last = [...(d?.nlog ?? [])].reverse().find(x => x.b === b.name);
    const why = last ? (last.why === 'time' ? '시간이 지나서' : last.why.startsWith('zero:') ? `${last.why.slice(5)}이(가) 바닥이라` : '') : '';
    return `<div class="ss-need">${rate ? `<span title="하루 기준 · 달력의 시간대가 넘어갈 때마다 그만큼"><i class="fa-solid fa-hourglass-half"></i> 하루 ${fx(rate)}${mod ? ` <small>(옷 ${mod > 0 ? '+' : ''}${mod}%)</small>` : ''}</span>` : ''}${st ? `<span class="warn"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(st.name)}</span>` : ''}${b.zero ? `<span title="이 게이지가 0이면 하루마다"><i class="fa-solid fa-skull"></i> 바닥이면 ${esc(b.zero)}/일</span>` : ''}${why ? `<small class="ss-dim">최근: ${esc(why)} ${last.n > 0 ? '+' : '−'}${fmtNum(Math.abs(last.n))}</small>` : ''}${b.stages ? `<small class="ss-dim">단계 ${esc(parseStages(b.stages).map(x => `${x.at}${x.up ? '↑' : '↓'} ${x.name}`).join(' · '))}</small>` : ''}</div>`;
}
export function lifeSection(s, d) {
    const any = d.bars.some(b => b.decay || b.stages || b.zero), sp = Number(d.speed ?? 1) || 1, simple = isSimple();
    const shopOn = modOn('shop'), hasShop = (s.data.shop?.shops ?? []).some(isMeatShop), walletOn = modOn('wallet') && !!s.data.wallet;
    return sec('🍞 생활 틀 <small>심즈 · 좀보이드처럼 — 넣기를 눌렀을 때만 들어가요 · AI 0회</small>', `
        <p class="ss-hint">욕구 게이지는 시간이 지나면 <b>저절로</b> 줄어요 (달력의 날짜 · 시간대 기준 · 달력이 없으면 6턴 = 하루). 단계가 바뀌면 상태가 붙고, 바닥이면 체력이 깎여요. 채우려면 먹고 · 자고 · 씻어야 해요 — AI가 장면에서 적거나, 산 물건을 「사용」하면 돼요.</p>
        <div class="ss-life-sets">${NEED_SETS.map(x => `<button class="ss-btn" data-act="lifeset" data-arg="${x.id}" title="${esc(x.bars.map(k => T(BAR[k].ko, BAR[k].en)).join(' · '))}">${x.icon} ${esc(T(...x.name))}<small>${esc(x.bars.map(k => T(BAR[k].ko, BAR[k].en)).join(' · '))}</small></button>`).join('')}</div>
        ${any ? `<div class="ss-f wide"><span>줄어드는 속도</span><div class="ss-seg wrap">${SPEEDS.map(([v, n]) => `<button class="${sp === v ? 'on' : ''}" data-act="lifespeed" data-arg="${v}">${n} ×${v}</button>`).join('')}</div></div>` : ''}
        <div class="ss-row-btns">
            <button class="ss-btn" data-act="lifeshop" ${shopOn && !simple ? '' : 'disabled'} title="지금 있는 게이지를 채워 주는 기본 품목 · 물약이 늘 있는 가게를 상점 칸에 넣어요"><i class="fa-solid fa-store"></i> ${hasShop ? '미트볼 상점 품목 다시 맞추기' : '미트볼 상점 넣기'}</button>
            <button class="ss-btn" data-act="lifebills" ${walletOn ? '' : 'disabled'} title="월세 · 관리비 · 통신비 · 구독료를 정기 지출에 넣어요 (값은 재산 탭 편집에서 고쳐요)"><i class="fa-solid fa-file-invoice-dollar"></i> 생활비 틀 넣기</button>
            ${any ? '<button class="ss-btn ghost" data-act="lifeoff" title="게이지는 그대로 두고, 저절로 줄기 · 단계 · 바닥 규칙만 떼요"><i class="fa-solid fa-ban"></i> 저절로 줄기 끄기</button>' : ''}
        </div>
        ${shopOn && !simple ? '' : `<p class="ss-hint">미트볼 상점은 ${simple ? '기본 모드에서' : '상점 칸을 켜면 (관리 › 쓸 기능)'} 쓸 수 있어요.</p>`}
        <p class="ss-hint">게이지마다 줄어드는 양 · 단계 · 바닥 규칙은 편집(✏️)에서 고칠 수 있어요.</p>`);
}

// ───── 화면: 재산 탭 아래 👕 옷차림 · 장비 ─────
export function gearSection(s) {
    if (!s?.data?.wallet) return '';
    if (settings().gearOn !== true) return sec('👕 옷차림 · 장비', `<p class="ss-hint">소지품을 칸마다 하나씩 입거나 들어요. 효과 글의 「힘 +2」는 주사위에 더해지고, 「체온 -30%」는 그 욕구가 30% 덜 줄어요. AI에게는 「지금 입은 것」 한 줄이 가요.</p><div class="ss-row-btns"><button class="ss-btn" data-act="gearon"><i class="fa-solid fa-shirt"></i> 옷차림 · 장비 켜기</button></div>`);
    if (!AD) { loadAD().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'gear load', e)); return sec('👕 옷차림 · 장비', '<p class="ss-hint">불러오는 중…</p>'); }
    const eq = AD.equipped(s), by = Object.fromEntries(eq.map(e => [e.slot, e]));
    return sec(`👕 옷차림 · 장비 <small>${eq.length}/${AD.gearSlots().length}</small>`, `<div class="ss-stack">${AD.gearSlots().map(slot => { const e = by[slot]; return `<div class="ss-item ss-gear"><div class="ss-item-b"><b>${esc(slot)}</b><small>${e ? `${esc(e.name)}${e.effect ? ` · ${esc(e.effect)}` : ''}` : '비어 있음'}</small></div><div class="ss-item-a"><button class="ss-btn sm" data-act="gearpick" data-arg="${esc(slot)}">${e ? '바꾸기' : '입기'}</button></div></div>`; }).join('')}</div>
        <p class="ss-hint">효과는 그 물건의 「효과」 글에서 읽어요 (재산 편집에서 고쳐요): 「힘 +2」 = 주사위 보정 · 「체온 -30%」 = 그 욕구가 30% 덜 줄어듦. 물건이 소지품에서 없어지면 저절로 벗겨져요.</p>
        <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="gearoff">옷차림 · 장비 끄기</button></div>`);
}

const stOf = (s) => s?.data?.stats ?? EMPTY.stats();
export const LIFE_ACTIONS = {
    lifeset: async (el, arg, btn, s) => {
        const set = NEED_SETS.find(x => x.id === arg), nd = withSet(stOf(s), arg); if (!nd || !set) return;
        await commit('stats', nd, `🍞 생활 틀: ${T(...set.name)}`);
        toastr.success(`${T(...set.name)} 세트를 넣었어요. 이제 시간이 지나면 저절로 줄어요.`, TITLE);
    },
    lifespeed: async (el, arg, btn, s) => { const v = Number(arg); if (!SPEEDS.some(x => x[0] === v)) return; const nd = clone(stOf(s)); if (v === 1) delete nd.speed; else nd.speed = v; await commit('stats', nd, `🍞 욕구 속도 ×${v}`); },
    lifeoff: async (el, arg, btn, s) => { await commit('stats', withoutNeeds(stOf(s)), '🍞 저절로 줄기 끔'); },
    lifeshop: async (el, arg, btn, s) => {
        if (!modOn('shop') || isSimple()) return;
        const nd = withMeatShop(s);
        if (!nd.shops[0].items.length) { toastr.info('채울 게이지가 아직 없어요. 위에서 추천 세트를 먼저 넣어 보세요.', TITLE); return; }
        await commit('shop', nd, `🏪 ${MEAT_SHOP()} (${nd.shops[0].items.length}개 품목)`);
        toastr.success(`${MEAT_SHOP()}을(를) 상점 칸에 넣었어요 — 품목 ${nd.shops[0].items.length}개.`, TITLE);
    },
    lifebills: async (el, arg, btn, s) => {
        const nd = withBills(s); if (!nd) { toastr.info('생활비 항목이 이미 다 있어요.', TITLE); return; }
        await commit('wallet', nd, '🧾 생활비 틀 (월세 · 관리비 · 통신비 · 구독료)');
        toastr.success('정기 지출에 생활비를 넣었어요. 값은 재산 탭 편집에서 고칠 수 있어요.', TITLE);
    },
    gearon: async (el) => { settings().gearOn = true; saveSettings(); await loadAD(); app.refreshNow?.(); app.renderPanel(el); },
    gearoff: async (el) => { settings().gearOn = false; saveSettings(); try { await (await loadAD()).syncNeedMods(); } catch (e) { ssWarn(LOG, 'gear sync', e); } app.refreshNow?.(); app.renderPanel(el); },
    gearpick: async (el, arg, btn, s) => {
        await loadAD();
        const items = (s.data.wallet?.items ?? []).filter(i => i.qty > 0), cur = AD.equipped(s).find(e => e.slot === arg);
        const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-gearpick';
        box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-shirt"></i><div><b>${esc(arg)}</b><small>소지품에서 골라요 — 한 물건은 한 칸에만</small></div></div>
            <div class="ss-stack">${items.map((i, k) => `<button class="ss-btn ${cur && norm(cur.name) === norm(i.name) ? 'pri' : ''}" data-choice="i${k}">${esc(i.name)}${i.effect ? `<small> · ${esc(i.effect)}</small>` : ''}</button>`).join('') || '<p class="ss-hint">소지품이 없어요.</p>'}</div>
            ${cur ? '<div class="ss-row-btns"><button class="ss-btn ghost" data-choice="off"><i class="fa-solid fa-xmark"></i> 벗기</button></div>' : ''}`;
        const pick = await choosePopup(box, '취소'); if (!pick) return;
        if (pick === 'off') AD.unequip(arg); else { const it = items[Number(pick.slice(1))]; if (it) AD.equip(arg, it.name); }
        try { await AD.syncNeedMods(); } catch (e) { ssWarn(LOG, 'gear sync', e); }
        app.refreshNow?.(); app.rerenderPanels?.(true);
    },
    qasknot: async (el, arg) => { await addAdjust({ ops: [['_qask', arg]], silent: true, label: '' }); },
};
