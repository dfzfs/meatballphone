// 🍞 생활 틀 (v2.9) — 심즈 · 좀보이드처럼 굴러가게 하는 묶음. 전부 「넣기」를 눌렀을 때만 상태에 들어간다 (안 누르면 예전과 똑같다)
//   ① 욕구 게이지 추천 세트: 시간이 지나면 저절로 줄고(decay) · 단계마다 상태가 붙고(stages) · 바닥이면 다른 게이지를 깎는다(zero) — 계산은 ops.js needsTick
//   ② 미트볼 상점: 지금 있는 게이지를 채워 주는 기본 품목 · 물약이 늘 있는 가게 (상점 칸에 진짜 가게로 들어간다 — 사서 「사용」하면 효과가 적용됨)
//   ③ 생활비 틀: 월세 · 관리비 · 통신비 · 구독료를 재산의 「정기 수입 · 지출」에 넣는다
//   ④ 👕 옷차림 · 장비 화면: addons.js(장비 착용)의 단추 — 재산 탭 아래. 효과 글의 「체온 -30%」는 그 욕구가 30% 덜 줄게 한다
// 값은 이 채팅의 물가(재산 › 물가 · 상점 가격의 아래쪽 4분의 1)를 한 단위로 삼아 맞춘다.
import { app, ctx, settings, saveSettings, getMeta, saveMeta, stamp, modOn, esc, short, fmtNum, norm, clone, findBy, EMPTY, TITLE, LOG, ssWarn, isSimple } from './core.js';
import { commit, addAdjust } from './engine.js';
import { parseStages, stageOf } from './ops.js';
import { kindOf, RISING, svg, needIcon, goodOf, clamp01, lvOf } from './needicons.js';
// 도트 인형 그림(doll.js)은 욕구 · 옷차림 탭을 켠 채팅에서 처음 그릴 때 불러온다 — 그 전에는 빈 자리만
let DL = null;
const loadDL = async () => (DL ??= await import('./doll.js'));
export { kindOf, needIcon } from './needicons.js';
import { sec, choosePopup } from './kit.js';
// addons.js는 켠 사람만 불러오는 파일이라(index.js loadAddons) 여기서도 쓸 때 불러온다 — 그 전에는 「켜기」 단추만 보인다
let AD = null;
const loadAD = async () => { if (!AD) { try { await app.loadAddons?.(true); } catch (e) { ssWarn(LOG, 'addons', e); } AD = await import('./addons.js'); } return AD; };

const EN = () => /^en/i.test(String(settings().ssGenLang || settings().genLang || ''));
const T = (ko, en) => (EN() ? en : ko);


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
export function withSet(stats, id) { const set = NEED_SETS.find(x => x.id === id); return set ? withBars(stats, set.bars) : null; }
export function withBars(stats, kinds) {
    const set = { bars: kinds };
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
export const isMeatShop = (x) => ['미트볼 상점', 'Meatball Mart'].some(n => norm(n) === norm(x?.name));
export function meatShop(s, opt = {}) {
    const bars = s.data.stats?.bars ?? [], u = priceUnit(s), items = [], seen = new Set();
    const add = (name, desc, effect, mul) => { if (seen.has(name)) return; seen.add(name); items.push({ name, price: nice(u * mul * (opt.mul ?? 1)), desc, effect, kind: 'item', stock: opt.stock ?? -1 }); };
    for (const b of bars) {
        const k = kindOf(b.name);
        for (const [kind, nm, ds, amt, mul] of GOODS) if (kind === k) add(T(...nm), T(...ds), `${b.name} ${amt > 0 ? '+' : '−'}${Math.abs(amt)}`, mul);
        if (b.decay > 0) for (const [kind, nm, ds, pct, mul] of WEARS) if (kind === k) add(T(...nm), T(...ds), `${b.name} ${pct}%`, mul);
    }
    return { name: MEAT_SHOP(), desc: T('기본 품목 · 물약은 다 있어요. 어디서든 들를 수 있어요.', 'Every basic and potion in stock. Reachable from anywhere.'), place: '', items };
}
export function withMeatShop(s, opt = {}) { const nd = clone(s.data.shop ?? EMPTY.shop()); nd.shops = [meatShop(s, opt), ...nd.shops.filter(x => !isMeatShop(x))]; return nd; }

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
            ${any ? `<button class="ss-btn ghost" data-act="lifefx" title="단계가 바뀔 때 딱지가 튀어나오고, 욕구가 바닥이면 화면 가장자리가 물들어요 (모든 채팅)"><i class="fa-solid fa-wand-sparkles"></i> 화면 연출 ${settings().lifeFx !== false ? '켬' : '끔'}</button>` : ''}
            ${any ? '<button class="ss-btn ghost" data-act="lifeoff" title="게이지는 그대로 두고, 저절로 줄기 · 단계 · 바닥 규칙만 떼요"><i class="fa-solid fa-ban"></i> 저절로 줄기 끄기</button>' : ''}
        </div>
        <p class="ss-hint">게이지마다 줄어드는 양 · 단계 · 바닥 규칙은 편집(✏️)에서 고칠 수 있어요.</p>`);
}

// ───── 화면: 재산 탭 아래 👕 옷차림 · 장비 ─────
export function gearSection(s) {
    if (!s?.data?.wallet) return '';
    if (settings().gearOn !== true) return sec('👕 옷차림 · 장비', `<p class="ss-hint">소지품을 칸마다 하나씩 입거나 들어요. 효과 글의 「힘 +2」는 주사위에 더해지고, 「체온 -30%」는 그 욕구가 30% 덜 줄어요. AI에게는 「지금 입은 것」 한 줄이 가요.</p><div class="ss-row-btns"><button class="ss-btn" data-act="gearon"><i class="fa-solid fa-shirt"></i> 옷차림 · 장비 켜기</button></div>`);
    if (!AD) { loadAD().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'gear load', e)); return sec('👕 옷차림 · 장비', '<p class="ss-hint">불러오는 중…</p>'); }
    const eq = AD.equipped(s), by = Object.fromEntries(eq.map(e => [e.slot, e]));
    return sec(`👕 옷차림 · 장비 <small>${eq.length}/${AD.gearSlots().length}</small>`, `${dollHTML(AD.gearSlots(), by, `<div class="ss-doll-stage">${dollNow(s, 'big')}</div>`)}
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
        const nd = withMeatShop(s, MODES[getMeta()?.mode]?.shop ?? {});
        if (!nd.shops[0].items.length) { toastr.info('채울 게이지가 아직 없어요. 욕구 탭에서 추천 세트를 먼저 넣어 보세요.', TITLE); return; }
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

// ───── 🎨 생활 판 (v2.9) — 글 대신 그림으로: 욕구 타일 · 기분 얼굴 · 상태 딱지 · 옷 입히는 인형 ─────
// 그림은 전부 여기서 직접 그린 선 그림(SVG · 글자색을 따라감)이라 파일도 내려받기도 없다. 생활 틀을 넣은 채팅의 수치 탭에서만 그려진다.
// 기분 얼굴 0(바닥)~4(최고)
const MOUTH = ['M8.5 16.500c1-2 6-2 7 0', 'M9 16c1-1 5-1 6 0', 'M9 15.500h6', 'M9 15c1 1.3 5 1.3 6 0', 'M8.5 14.500c1.2 2.6 5.8 2.6 7 0'];
const MOOD = [['한계예요', 'At the limit'], ['힘들어요', 'Struggling'], ['그럭저럭', 'Getting by'], ['괜찮아요', 'Doing fine'], ['아주 좋아요', 'Feeling great']];
const face = (lv) => svg(`<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01" stroke-width="2.6"/><path d="${MOUTH[lv]}"/>`, 'ss-ic ss-face');
const hasRules = (d) => d.bars.some(b => b.decay || b.stages || b.zero);
export const inNeedPanel = (b, d) => needsTabOn() && hasRules(d) && !!(kindOf(b.name) || b.decay || b.stages || b.zero); // 욕구 탭을 켰을 때만 수치 탭에서 빠진다
const reEsc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 이 물건의 효과가 이 게이지를 좋은 쪽으로 움직이나
function helps(b, effect) {
    const m = String(effect ?? '').match(new RegExp(`${reEsc(b.name)}\\s*([+\\-−])\\s*\\d+(?!\\s*%)`, 'i')); if (!m) return false;
    const up = m[1] === '+'; return RISING.has(kindOf(b.name)) || /\+\s*:/.test(b.stages ?? '') ? !up : up;
}
export function goodIcon(it) {
    if (!it?.effect) return '';
    const bars = app.current?.state?.data?.stats?.bars ?? [], b = bars.find(x => new RegExp(`${reEsc(x.name)}\\s*[+\\-−]`, 'i').test(it.effect));
    return b ? `<span class="ss-good-ic k-${kindOf(b.name) || 'other'}">${needIcon(b.name)}</span>` : '';
}
export function needPanel(s, d, ui = {}) {
    if (!hasRules(d)) return '';
    const bars = d.bars.filter(b => inNeedPanel(b, d)); if (!bars.length) return '';
    const lv = moodLv(d);
    const me = (s.data.profile?.list ?? []).find(p => p.role === 'user')?.name ?? '';
    const lets = (d.conds ?? []).filter(c => c.auto).map(c => { const b = d.bars.find(x => x.name === c.auto); return b ? `<span class="ss-mdl lv-${lvOf(goodOf(b))}" title="${esc(c.name)} — ${esc(c.desc)}">${needIcon(b.name)}<em>${esc(c.name)}</em></span>` : ''; }).join('');
    const tile = (b) => {
        const g = goodOf(b), pct = Math.round(clamp01(b.cur / Math.max(1, b.max)) * 100), st = stageOf(b), sp = Number(d.speed ?? 1) || 1, rate = Math.abs((b.decay ?? 0) * sp);
        const arrows = b.decay ? `<small class="ss-nd-tr ${b.decay > 0 ? 'dn' : 'up'}" title="하루 ${fx(Math.round(b.decay * sp))}">${(b.decay > 0 ? '▾' : '▴').repeat(rate >= 80 ? 3 : rate >= 40 ? 2 : 1)}</small>` : '';
        return `<button class="ss-nd lv-${lvOf(g)} ${ui.need === b.name ? 'on' : ''}" data-act="needopen" data-arg="${esc(b.name)}" aria-expanded="${ui.need === b.name}">
            <span class="ss-nd-ic">${needIcon(b.name)}</span>
            <span class="ss-nd-b"><b>${esc(b.name)}${arrows}</b><span class="ss-nd-t"><i style="width:${pct}%"></i></span><small>${st ? esc(st.name) : `${fmtNum(b.cur)}/${fmtNum(b.max)}`}</small></span></button>`;
    };
    const open = bars.find(b => b.name === ui.need);
    let det = '';
    if (open) {
        const items = (s.data.wallet?.items ?? []).filter(i => i.qty > 0 && helps(open, i.effect));
        const si = (s.data.shop?.shops ?? []).findIndex(isMeatShop), goods = si >= 0 && modOn('shop') ? s.data.shop.shops[si].items.map((it, j) => [it, j]).filter(([it]) => it.stock !== 0 && helps(open, it.effect)) : [];
        const cur = s.data.wallet?.currency ?? '';
        det = `<div class="ss-nd-det lv-${lvOf(goodOf(open))}"><div class="ss-nd-det-h"><span class="ss-nd-ic">${needIcon(open.name)}</span><div><b>${esc(open.name)} ${fmtNum(open.cur)}<small>/${fmtNum(open.max)}</small></b>${open.desc ? `<small>${esc(open.desc)}</small>` : ''}</div></div>
            ${needLine(open, d)}
            ${items.length ? `<div class="ss-nd-acts"><small>가진 것 쓰기</small>${items.map(i => `<button class="ss-btn sm pri" data-act="useitem" data-arg="${esc(i.name)}">${esc(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ''} <small>${esc(i.effect)}</small></button>`).join('')}</div>` : ''}
            ${goods.length ? `<div class="ss-nd-acts"><small>${esc(MEAT_SHOP())}에서 사기</small>${goods.map(([it, j]) => `<button class="ss-btn sm" data-act="buy" data-arg="${si}|${j}">${esc(it.name)} <small>${fmtNum(it.price)} ${esc(cur)} · ${esc(it.effect)}</small></button>`).join('')}</div>` : ''}
            ${!items.length && !goods.length ? `<p class="ss-hint">${si < 0 && modOn('shop') && !isSimple() ? '아래 「미트볼 상점 넣기」를 누르면 여기서 바로 살 수 있어요. ' : ''}이야기에서 채우면 AI가 적어 줘요.</p>` : ''}
            <div class="ss-gbtns"><button class="ss-ib t" data-act="bar" data-arg="${esc(open.name)}|-10">−10</button><button class="ss-ib t" data-act="bar" data-arg="${esc(open.name)}|-1">−1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(open.name)}|+1">+1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(open.name)}|+10">+10</button><small class="ss-dim">직접 고치기</small></div></div>`;
    }
    return `<section class="ss-life lv-${['low', 'low', 'mid', 'ok', 'ok'][lv]}">
        <div class="ss-life-head">${face(lv)}<div class="ss-life-who"><b>${esc(me || T('나', 'Me'))}</b><small>${esc(T(...MOOD[lv]))}</small></div>${lets ? `<div class="ss-mdls">${lets}</div>` : ''}</div>
        <div class="ss-nds">${bars.map(tile).join('')}</div>
        ${det}
    </section>`;
}
LIFE_ACTIONS.needopen = (el, arg) => { const ui = el._ss.ui; ui.need = ui.need === arg ? null : arg; app.renderPanel(el); };

// 옷 입히는 인형 (재산 탭 아래) — 가운데 사람 모양, 양옆에 칸
const DOLL = '<svg class="ss-doll-fig" viewBox="0 0 120 220" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="60" cy="30" r="17"/><path d="M40 62c4-8 36-8 40 0l8 50-13 3-3-24v40H48V91l-3 24-13-3z"/><path d="M48 131l-4 72h14l2-48 2 48h14l-4-72"/></svg>';
export function dollHTML(slots, by, fig = DOLL) {
    const half = Math.ceil(slots.length / 2), cell = (slot) => { const e = by[slot]; return `<button class="ss-slot ${e ? 'on' : ''}" data-act="gearpick" data-arg="${esc(slot)}"><small>${esc(slot)}</small><b>${e ? esc(e.name) : '＋'}</b>${e?.effect ? `<em>${esc(e.effect)}</em>` : ''}</button>`; };
    return `<div class="ss-doll"><div class="ss-doll-col">${slots.slice(0, half).map(cell).join('')}</div>${fig}<div class="ss-doll-col">${slots.slice(half).map(cell).join('')}</div></div>`;
}

// ───── ✨ 순간 연출 (v2.9 · 설정 lifeFx — 기본 켬 · 생활 틀을 넣은 채팅에서만) ─────
// ① 욕구 단계가 바뀌면 화면 위에 딱지가 톡 튀어나왔다 사라진다  ② 욕구가 낮으면 화면 가장자리가 주황, 바닥이면 빨갛게 물든다
// 화면을 다시 그릴 때마다(shell.js ensureUI) 불리지만 하는 일은 class 두 개와 비교 한 번뿐이다.
let fxPrev = null, fxChat = null;
function popMoodlet(bar, name, d) {
    const b = d.bars.find(x => x.name === bar); if (!b) return;
    let box = document.getElementById('ss-mdl-pops');
    if (!box) { box = document.createElement('div'); box.id = 'ss-mdl-pops'; box.className = 'ss-root ss-scope'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = `ss-mdl-pop lv-${lvOf(goodOf(b))}`;
    el.innerHTML = `<span class="ss-nd-ic">${needIcon(b.name)}</span><div><small>${esc(b.name)}</small><b>${esc(name)}</b></div>`;
    box.appendChild(el); setTimeout(() => el.remove(), 3400);
    while (box.children.length > 3) box.firstChild.remove();
}
export function lifeFx() {
    const body = document.body; if (!body) return;
    const s = app.current?.state, d = s?.data?.stats;
    let on = false; try { on = settings().lifeFx !== false && !!d && hasRules(d) && modOn('stats') && !getMeta()?.paused; } catch { on = false; }
    let worst = 1; const now = new Map();
    if (on) { for (const x of d.bars) if (x.decay || x.stages) worst = Math.min(worst, goodOf(x)); for (const c of d.conds ?? []) if (c.auto) now.set(c.auto, c.name); }
    let veil = document.getElementById('ss-need-veil');
    const lv = !on ? '' : worst <= 0.02 ? 'low' : worst <= 0.25 ? 'mid' : '';
    if (lv && !veil) { veil = document.createElement('div'); veil.id = 'ss-need-veil'; veil.setAttribute('aria-hidden', 'true'); body.appendChild(veil); }
    if (veil && veil.dataset.lv !== lv) veil.dataset.lv = lv;
    let chat = ''; try { chat = ctx().getCurrentChatId?.() ?? ''; } catch { chat = ''; }
    if (on && fxPrev && fxChat === chat) for (const [bar, name] of now) if (fxPrev.get(bar) !== name) popMoodlet(bar, name, d);
    fxPrev = on ? now : null; fxChat = chat;
}
app.lifeFx = lifeFx;
LIFE_ACTIONS.lifefx = (el) => { settings().lifeFx = settings().lifeFx === false; saveSettings(); lifeFx(); app.renderPanel(el); };

// ───── 🗂 탭 나누기 · 🎮 게임 모드 (v2.9) ─────
// 생활 기능은 탭으로 나뉘고, 탭마다 이 채팅에서 켜고 끈다 (meta.life = { needs, wear }). 게임 모드는 「무엇을 켤지」의 묶음일 뿐이다 (meta.mode).
//   🍞 욕구 탭(needs): 다마고치 화면 + 욕구 타일 + 추천 세트 · 속도   |   👕 옷차림 탭(wear): 도트 인형 · 캐릭터 만들기 · 옷 모양
//   미트볼 상점 넣기는 상점 탭 아래, 생활비 틀은 재산 탭 아래로 옮겼다. 수치 탭은 체력 · 능력치만 남는다 (욕구 탭을 켰을 때).
const lifeOf = () => getMeta()?.life ?? {};
export const needsTabOn = () => lifeOf().needs === true && modOn('stats');
export const wearTabOn = () => lifeOf().wear === true; // 🎨 꾸미기 탭 (v2.9): 내 인형의 옷 입히기만 재산 칸이 있어야 하고, 다른 인물 인형은 없어도 된다
export const MODES = {
    rp: { icon: '🍱', name: '롤플', desc: '상태만 계산해요 (욕구 · 꾸미기 탭 없음)' },
    life: { icon: '🏡', name: '생활', desc: '심즈 · 스타듀 · 동숲처럼 — 욕구 · 꾸미기 · 미트볼 상점 · 생활비', bars: ['hunger', 'energy', 'hygiene', 'fun', 'social'], speed: 1, bills: true, shop: {} },
    fusion: { icon: '🌀', name: '융합', desc: '생활 + 생존 조금 — 수분 · 체온까지', bars: ['hp', 'hunger', 'thirst', 'energy', 'hygiene', 'fun', 'social', 'warmth'], speed: 1, bills: true, shop: {} },
    apoc: { icon: '🧟', name: '아포칼립스', desc: '좀보이드처럼 — 욕구가 빠르게 줄고, 가게는 비싸고 물건이 적어요', bars: ['hp', 'thirst', 'hunger', 'energy', 'warmth', 'stress', 'boredom'], speed: 1.5, bills: false, shop: { mul: 3, stock: 2 } },
};
export async function applyMode(id) {
    const M = MODES[id], meta = getMeta(true); if (!M || !app.current?.state) return false;
    meta.mode = id; meta.life ??= {};
    if (!M.bars) { meta.life.needs = false; meta.life.wear = false; await saveMeta(); app.refreshNow?.(); return true; }
    meta.life.needs = true; meta.life.wear = true; meta.mods ??= {};
    for (const m of ['stats', 'wallet', 'shop']) meta.mods[m] = true;
    settings().gearOn = true; saveSettings();
    await saveMeta(); app.refreshNow?.();
    const nd = withBars(stOf(app.current.state), M.bars); if (M.speed === 1) delete nd.speed; else nd.speed = M.speed;
    await commit('stats', nd, `🎮 ${M.name} 모드: 욕구 게이지`);
    const shop = withMeatShop(app.current.state, M.shop);
    if (shop.shops[0].items.length) await commit('shop', shop, `🏪 ${MEAT_SHOP()}`);
    if (M.bills) { const w = withBills(app.current.state); if (w) await commit('wallet', w, '🧾 생활비 틀'); }
    try { await loadAD(); } catch (e) { ssWarn(LOG, 'mode addons', e); }
    app.refreshNow?.(); app.rerenderPanels?.(true);
    return true;
}
// 관리 › 쓸 기능 맨 위
export function lifeBox() {
    const meta = getMeta(), L = meta?.life ?? {}, mode = MODES[meta?.mode] ? meta.mode : (L.needs || L.wear ? '' : 'rp');
    return sec('🎮 게임 모드 · 생활 탭 <small>이 채팅만</small>', `
        <div class="ss-seg wrap stack">${Object.entries(MODES).map(([k, m]) => `<button class="${mode === k ? 'on' : ''}" data-act="lifemode" data-arg="${k}">${m.icon} ${m.name}<small>${m.desc}</small></button>`).join('')}</div>
        <div class="ss-pills"><small>탭 하나씩</small>
            <button class="ss-pill ${L.needs ? 'on' : ''}" data-act="lifetab" data-arg="needs" title="다마고치 화면 · 욕구 타일 · 추천 세트">${L.needs ? '<i class="fa-solid fa-check"></i> ' : ''}🍞 욕구 탭</button>
            <button class="ss-pill ${L.wear ? 'on' : ''}" data-act="lifetab" data-arg="wear" title="인물마다 도트 인형 만들기 · 옷 입히기 · 프로필 얼굴">${L.wear ? '<i class="fa-solid fa-check"></i> ' : ''}🎨 꾸미기 탭</button></div>
        <p class="ss-hint">모드는 「무엇을 켤지」의 묶음이에요. 고르면 필요한 탭 · 게이지 · 가게가 한 번에 들어가고(AI 0회), 그 뒤에 하나씩 켜고 끌 수 있어요. 롤플로 돌려도 넣어 둔 게이지 · 가게는 지워지지 않아요 — 욕구가 저절로 줄어드는 것까지 멈추려면 욕구 탭의 「저절로 줄기 끄기」.</p>`);
}
LIFE_ACTIONS.lifemode = async (el, arg) => {
    if (!MODES[arg]) return;
    await applyMode(arg);
    toastr.success(`${MODES[arg].icon} ${MODES[arg].name} 모드로 맞췄어요.`, TITLE);
    app.rerenderPanels?.(true);
};
LIFE_ACTIONS.lifetab = async (el, arg) => {
    if (!['needs', 'wear'].includes(arg)) return;
    const meta = getMeta(true); meta.life ??= {}; meta.life[arg] = !meta.life[arg];
    if (arg === 'wear' && meta.life.wear && settings().gearOn !== true) { settings().gearOn = true; saveSettings(); }
    await saveMeta(); if (arg === 'wear' && meta.life.wear) { try { await loadAD(); } catch (e) { ssWarn(LOG, 'wear addons', e); } }
    app.refreshNow?.(); app.rerenderPanels?.(true);
};

// 기분 0~4 (욕구 평균과 가장 나쁜 것을 섞어서 · 규칙이 없으면 3)
export function moodLv(d) {
    const needs = (d?.bars ?? []).filter(b => b.decay || b.stages); if (!needs.length) return 3;
    const avg = needs.reduce((a, b) => a + goodOf(b), 0) / needs.length, worst = Math.min(...needs.map(goodOf));
    return Math.max(0, Math.min(4, Math.round((avg * 0.6 + worst * 0.4) * 4)));
}
// 지금 모습의 도트 인형: 만든 얼굴(meta.doll) + 입은 것(장비 칸) + 표정(고른 것 · 없으면 기분) + 다친 곳(빨갛게)
// 직접 찍은 그림 (설정에 모아 둔 것) → 칸 그림. 한 번 푼 것은 기억해 둔다
const ARTS = new Map();
function artOf(id) { const a = id && settings().dollArt?.[id]; if (!a || !DL) return undefined; const k = `${id}:${a.rev ?? 0}`; let g = ARTS.get(k); if (!g) { g = DL.decodeArt(a); ARTS.set(k, g); if (ARTS.size > 60) ARTS.delete(ARTS.keys().next().value); } return { k, g }; }
const THUMBS = new Map();
function thumbOf(id) { const a = artOf(id); if (!a) return ''; let u = THUMBS.get(a.k); if (!u) { u = DL.artUrl(a.g); THUMBS.set(a.k, u); if (THUMBS.size > 60) THUMBS.delete(THUMBS.keys().next().value); } return u; }
function wearNow(s, D) {
    const wear = [];
    if (settings().gearOn === true && DL) {
        if (!AD) loadAD().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'doll load', e));
        else for (const e of AD.equipped(s)) { const kind = DL.slotKind(e.slot); if (wear.some(x => x.kind === kind)) continue; const lk = D.looks?.[norm(e.name)] ?? {}; wear.push({ kind, shape: DL.SHAPES[kind]?.[lk.shape] ? lk.shape : DL.guessShape(kind, e.name), color: lk.color || DL.guessColor(e.name, kind), accent: lk.accent || undefined, name: e.name, slot: e.slot }); }
    }
    // 직접 찍은 그림을 「쓰기」로 걸어 둔 칸: 입은 물건이 있으면 그 그림 대신, 없으면 그냥 입힌다
    if (DL) for (const kind of ['top', 'bottom', 'outer', 'shoes', 'acc', 'weapon']) { const art = artOf(D.art?.[kind]); if (!art) continue; const x = wear.find(w => w.kind === kind); if (x) x.art = art; else wear.push({ kind, shape: '', color: '#888888', art, name: '', slot: '' }); }
    return wear;
}
// 다친 곳: 상태 이상 이름에 부상 + 부위가 있으면 그 부위 · 체력이 4분의 1 아래면 몸통 · 직접 켠 것(meta.doll.hurt)
function hurtNow(s, D) {
    const d = s?.data?.stats, out = new Set(Array.isArray(D.hurt) ? D.hurt : []);
    if (d) { for (const x of DL.hurtParts((d.conds ?? []).map(c => `${c.name} ${c.desc ?? ''}`))) out.add(x); const hp = d.bars.find(b => kindOf(b.name) === 'hp'); if (hp && hp.cur / Math.max(1, hp.max) <= 0.25) out.add('torso'); }
    return [...out];
}
const lookOf = (D) => ({ skin: D.skin, hair: D.hair, hairColor: D.hairColor, eye: D.eye, face: D.face && D.face !== 'auto' ? D.face : undefined, shape: D.shape, eyes: D.eyes, body: D.body, line: D.line, hairArt: artOf(D.art?.hair), over: artOf(D.art?.over) });
// 🎨 인물마다 인형 (v2.9): 나 = meta.doll (소지품을 입힘) · 다른 인물 = meta.dolls[이름] (옷은 꾸미기에서 모양 · 색을 바로 골라 입힘 — D.outfit = { 종류: { shape, color, accent } })
//   D.asFace = true 이면 그 인형 얼굴을 그 인물의 공용 프로필(얼굴)로 — 관계 · 연락 · 프로필 · HUD … 얼굴이 나오는 곳 모두 (kit.js avatar → app.dollFace)
const userOf = (s) => (s?.data?.profile?.list ?? []).find(p => p.role === 'user')?.name ?? '';
export const OUTFIT_KINDS = ['top', 'bottom', 'outer', 'shoes', 'acc', 'weapon'];
// 지금 꾸미는 사람: 패널의 ui.dollWho — 나(또는 프로필에 없는 이름)면 '' 
export function whoOf(el, s = app.current?.state) {
    const w = String(el?._ss?.ui?.dollWho ?? '');
    return w && w !== userOf(s) && (s?.data?.profile?.list ?? []).some(p => p.name === w) ? w : '';
}
// 그 사람의 인형 자료 (make = 없으면 만든다)
function bagOf(meta, who, make = true) {
    if (!meta) return {};
    if (!who) return make ? (meta.doll ??= {}) : (meta.doll ?? {});
    if (!make) return meta.dolls?.[who] ?? {};
    return ((meta.dolls ??= {})[who] ??= {});
}
function outfitWear(D) {
    const out = [];
    for (const kind of OUTFIT_KINDS) {
        const o = D.outfit?.[kind], art = artOf(D.art?.[kind]);
        if (o && DL.SHAPES[kind]?.[o.shape]) out.push({ kind, shape: o.shape, color: o.color || DL.guessColor('', kind), accent: o.accent || undefined, name: '', slot: kind, art });
        else if (art) out.push({ kind, shape: '', color: '#888888', art, name: '', slot: '' });
    }
    return out;
}
const wearFor = (s, D, who) => (who ? outfitWear(D) : wearNow(s, D));
const moodFor = (s, who) => (who ? 3 : moodLv(s?.data?.stats));
// 그 사람 인형 한 장 (화면용 · 그림이 아직 안 불러졌으면 빈 자리)
export function dollFor(s, who, cls = '') {
    if (!who) return dollNow(s, cls);
    if (!DL) { loadDL().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'doll art', e)); return `<span class="ss-px-wait ${cls}"></span>`; }
    const D = bagOf(getMeta(), who, false);
    if (D.img) return `<span class="ss-px ss-px-own ${cls}"><img alt="" src="${esc(D.img)}"></span>`;
    return DL.dollSVG(lookOf(D), outfitWear(D), 3, cls, Array.isArray(D.hurt) ? D.hurt : []);
}
// 그 사람 인형 그림 주소 (프로필 그림 · 얼굴용) — 아직 안 불러졌으면 불러 두고 ''
function dollUrlOf(name, need) {
    const s = app.current?.state, meta = getMeta(); if (!s || !meta || !name) return '';
    const who = name === userOf(s) ? '' : name, D = bagOf(meta, who, false);
    if (need && !need(D, who)) return '';
    if (who && !meta.dolls?.[who]) return '';
    if (D.img) return D.img;
    if (!DL) { if (!app._dlWait) { app._dlWait = true; loadDL().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'doll art', e)).finally(() => { app._dlWait = false; }); } return ''; }
    const html = DL.dollSVG(lookOf(D), wearFor(s, D, who), moodFor(s, who), '', []);
    return html.match(/src="([^"]+)"/)?.[1] ?? '';
}
app.dollFace = (name) => dollUrlOf(name, (D) => D.asFace === true); // kit.js avatar
app.dollUrl = (name) => dollUrlOf(name ?? userOf(app.current?.state)); // hompy.js 프로필 그림 「도트 인형」
export function dollNow(s, cls = '') {
    if (!DL) { loadDL().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'doll art', e)); return `<span class="ss-px-wait ${cls}"></span>`; }
    const D = getMeta()?.doll ?? {};
    if (D.img) return `<span class="ss-px ss-px-own ${cls}"><img alt="" src="${esc(D.img)}"></span>`; // 내 그림을 통째로 올려 둔 채팅
    return DL.dollSVG(lookOf(D), wearNow(s, D), moodLv(s?.data?.stats), cls, hurtNow(s, D));
}
// 🥚 다마고치 화면 (욕구 탭 맨 위)
function tama(s, d) {
    const lv = moodLv(d), needs = d.bars.filter(b => b.decay || b.stages), urgent = [...needs].sort((a, b) => goodOf(a) - goodOf(b)).slice(0, 3);
    const me = (s.data.profile?.list ?? []).find(p => p.role === 'user')?.name ?? T('나', 'Me');
    return `<div class="ss-tama lv-${['low', 'low', 'mid', 'ok', 'ok'][lv]}">
        <div class="ss-tama-lcd">
            <div class="ss-tama-icons">${needs.slice(0, 7).map(b => `<span class="lv-${lvOf(goodOf(b))}" title="${esc(b.name)} ${fmtNum(b.cur)}/${fmtNum(b.max)}">${needIcon(b.name)}</span>`).join('') || `<small>${esc(T('아래에서 세트를 넣어 주세요', 'Add a set below'))}</small>`}</div>
            <div class="ss-tama-pet ${lv <= 1 ? 'sad' : ''}">${dollNow(s)}</div>
            <div class="ss-tama-txt"><b>${esc(me)}</b><span>${esc(T(...MOOD[lv]))}</span><small>${esc(stamp(s))}</small></div>
        </div>
        <div class="ss-tama-btns">${urgent.map(b => `<button class="ss-tama-btn lv-${lvOf(goodOf(b))}" data-act="needopen" data-arg="${esc(b.name)}" title="${esc(b.name)} — 채우는 법 보기">${needIcon(b.name)}</button>`).join('') || '<button class="ss-tama-btn" disabled></button><button class="ss-tama-btn" disabled></button><button class="ss-tama-btn" disabled></button>'}</div>
    </div>`;
}
export function needsTab(s, _d, ui = {}) {
    const d = s.data.stats ?? EMPTY.stats();
    return `${tama(s, d)}${needPanel(s, d, ui)}${lifeSection(s, d)}`;
}
// 👕 옷차림 탭: 인형 + 칸 · 입은 옷의 모양 · 색 · 캐릭터 만들기(피부 · 머리 · 눈 · 표정 · 다친 곳)
const sw = (act, key, val, cur, label = '') => `<button class="ss-sw ${cur === val ? 'on' : ''}" data-act="${act}" data-arg="${esc(key)}:${esc(val)}" style="--c:${esc(val)}" title="${esc(label || val)}" aria-label="${esc(label || val)}"></button>`;
export function wearTab(s, _d, ui = {}) {
    if (!DL) { loadDL().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'doll art', e)); return '<p class="ss-hint">불러오는 중…</p>'; }
    // 🎨 꾸미기 (v2.9): 맨 위에서 꾸밀 사람을 고른다 — 나는 소지품을 입히고, 다른 인물은 옷 모양 · 색을 바로 골라 입힌다
    const roster = s?.data?.profile?.list ?? [], me = userOf(s), who = (ui.dollWho && ui.dollWho !== me && roster.some(p => p.name === ui.dollWho)) ? ui.dollWho : '';
    const meta = getMeta(), D = bagOf(meta, who, false), hurt = Array.isArray(D.hurt) ? D.hurt : [];
    const whoBar = roster.length > 1 || !me ? `<div class="ss-dollwho">${[...(me ? [[me, '']] : [['나', '']]), ...roster.filter(p => p.name !== me).map(p => [p.name, p.name])].map(([n, v]) => `<button class="ss-dollwho-b ${v === who ? 'on' : ''}" data-act="dollwho" data-arg="${esc(v)}" title="${esc(n)} 꾸미기">${dollFor(s, v)}<small>${esc(short(n, 6))}${v && !meta?.dolls?.[v] ? ' <i class="fa-solid fa-plus"></i>' : ''}</small></button>`).join('')}</div>` : '';
    const faceRow = `<div class="ss-f wide"><span>공용 프로필 <small>이 인형 얼굴을 ${esc(who || me || '나')}의 얼굴로 — 프로필 · 관계 · 연락처럼 얼굴이 나오는 곳 모두 (이 채팅만)</small></span><div class="ss-pills"><button class="ss-pill ${D.asFace === true ? 'on' : ''}" data-act="dollface" data-arg="on">${D.asFace === true ? '<i class="fa-solid fa-check"></i> ' : ''}인형 얼굴 쓰기</button><button class="ss-pill ${D.asFace === true ? '' : 'on'}" data-act="dollface" data-arg="off">이모지 그대로</button></div></div>`;
    const any = (arg, cur) => `<label class="ss-sw ss-sw-any" style="--c:conic-gradient(#e2524a,#e8b93a,#5aa85a,#3aa3a3,#4a8fe2,#9a6ad6,#e26aa8,#e2524a)" title="아무 색이나 고르기"><input type="color" data-dollcolor="${esc(arg)}" value="${/^#[0-9a-f]{6}$/i.test(cur ?? '') ? cur : '#e2524a'}" aria-label="아무 색이나 고르기"></label>`;
    const sws = (key, list, cur) => `<div class="ss-sws">${[...list, ...(cur && !list.includes(cur) ? [cur] : [])].map(c => sw('dolllook', key, c, cur)).join('')}${any(`look:${key}`, cur)}</div>`;
    const opt = (key, map, cur) => `<div class="ss-pills">${Object.entries(map).map(([k, n]) => `<button class="ss-pill ${cur === k ? 'on' : ''}" data-act="dolllook" data-arg="${key}:${k}">${esc(n)}</button>`).join('')}</div>`;
    const make = sec(`🧸 ${who ? `${esc(who)} 만들기` : '캐릭터 만들기'}`, `
        <div class="ss-f wide"><span>피부</span>${sws('skin', DL.SKINS, D.skin ?? DL.SKINS[0])}</div>
        <div class="ss-f wide"><span>얼굴형</span>${opt('shape', DL.HEADS, D.shape ?? 'sq')}</div>
        <div class="ss-f wide"><span>눈 모양 <small>눈을 뜬 표정에서 보여요</small></span>${opt('eyes', DL.EYES, D.eyes ?? 'n')}</div>
        <div class="ss-f wide"><span>몸 길이</span>${opt('body', DL.BODIES, D.body ?? 'n')}</div>
        <div class="ss-f wide"><span>테두리</span>${opt('line', DL.LINES, D.line ?? 'n')}</div>
        <div class="ss-f wide"><span>머리 모양 <small>${Object.keys(DL.HAIRS).length}가지</small></span><button class="ss-btn sm" data-act="dollpick" data-arg="hair"><i class="fa-solid fa-scissors"></i> ${esc(DL.HAIRS[D.hair]?.n ?? DL.HAIRS.short.n)} — 바꾸기</button></div>
        <div class="ss-f wide"><span>머리 색</span>${sws('hairColor', DL.HAIR_COLORS, D.hairColor ?? DL.HAIR_COLORS[1])}</div>
        <div class="ss-f wide"><span>눈 색</span>${sws('eye', DL.EYE_COLORS, D.eye ?? DL.EYE_COLORS[0])}</div>
        <div class="ss-f wide"><span>표정 <small>${Object.keys(DL.FACES).length}가지</small></span><button class="ss-btn sm" data-act="dollpick" data-arg="face"><i class="fa-regular fa-face-smile"></i> ${esc(DL.FACES[D.face] ?? DL.FACES.auto)} — 바꾸기</button></div>
        <div class="ss-f wide"><span>다친 곳 <small>빨갛게 깜빡여요</small></span><div class="ss-pills">${Object.entries(DL.HURT_PARTS).map(([k, n]) => `<button class="ss-pill ${hurt.includes(k) ? 'on' : ''}" data-act="dollhurt" data-arg="${k}">${hurt.includes(k) ? '<i class="fa-solid fa-check"></i> ' : ''}${n}</button>`).join('')}</div></div>
        ${faceRow}
        <p class="ss-hint">${who ? '다른 인물의 다친 곳 · 표정은 여기서 고른 대로 보여요.' : '상태 이상에 「왼팔 부상」 · 「다리 골절」처럼 다친 곳이 적히면 그 부위가 저절로 빨개져요. 체력이 4분의 1 아래로 떨어져도요. 표정을 「기분 따라」로 두면 욕구 상태에 맞춰 바뀌어요.'}</p>`);
    const lib = settings().dollArt ?? {}, A = D.art ?? {};
    const mine = sec(`🖌 직접 그리기 · 내 그림 <small>${Object.keys(lib).length}개</small>`, `
        ${Object.keys(lib).length ? `<div class="ss-stack">${Object.entries(lib).map(([id, a]) => `<div class="ss-card ss-art"><img class="ss-art-th" alt="" src="${thumbOf(id)}"><div><b>${esc(a.n)} <small>${esc(DL.ART_KINDS[a.kind] ?? '')}</small></b>
            <div class="ss-row-btns"><button class="ss-btn sm ${A[a.kind] === id ? 'pri' : ''}" data-act="dollart" data-arg="use:${esc(id)}">${A[a.kind] === id ? '<i class="fa-solid fa-check"></i> 쓰는 중 — 빼기' : '쓰기'}</button><button class="ss-btn sm" data-act="dollart" data-arg="edit:${esc(id)}"><i class="fa-solid fa-pen"></i> 고치기</button><button class="ss-btn sm ghost" data-act="dollart" data-arg="del:${esc(id)}"><i class="fa-solid fa-trash"></i></button></div></div></div>`).join('')}</div>` : ''}
        <div class="ss-f wide"><span>새로 그리기 <small>칸 단위로 찍거나 그림 파일을 옮겨요</small></span><div class="ss-pills">${Object.entries(DL.ART_KINDS).map(([k, n]) => `<button class="ss-pill" data-act="dollart" data-arg="new:${k}"><i class="fa-solid fa-plus"></i> ${esc(n)}</button>`).join('')}</div></div>
        <div class="ss-f wide"><span>인형 통째로 내 그림으로 <small>이 채팅만</small></span><div class="ss-row-btns"><label class="ss-btn sm"><i class="fa-solid fa-image"></i> ${D.img ? '다른 그림으로' : '그림 올리기'}<input type="file" accept="image/*" data-dollimg hidden></label>${D.img ? '<button class="ss-btn sm ghost" data-act="dollimg" data-arg="off">도트 인형으로 돌아가기</button>' : ''}</div></div>
        <p class="ss-hint">직접 그린 것은 어느 채팅에서나 꺼내 쓸 수 있고, 편집 창의 「코드로 주고받기」로 다른 사람에게 줄 수 있어요. 직접 그린 칸에는 자동 명암 · 테두리가 안 붙어요. 통째로 올린 그림에는 옷 갈아입히기 · 표정 · 다친 곳 표시가 안 보여요. 몸 길이를 바꾸면 직접 그린 옷의 자리가 어긋날 수 있어요.</p>`);
    const stage = `<div class="ss-doll-stage">${dollFor(s, who, 'big')}</div>`;
    // 다른 인물: 옷 종류마다 입기 · 모양 · 색 · 포인트 색
    if (who) {
        const O = D.outfit ?? {}, def = !meta?.dolls?.[who];
        const rows = OUTFIT_KINDS.map(kind => {
            const o = O[kind], on = !!(o && DL.SHAPES[kind]?.[o.shape]), color = o?.color || DL.guessColor('', kind);
            return `<div class="ss-card ss-look"><b>${esc(DL.KIND_NAMES[kind])} ${on ? `<small>${esc(DL.shapeName(kind, o.shape))}</small>` : '<small>안 입음</small>'}</b>
                <div class="ss-row-btns"><button class="ss-btn sm ${on ? '' : 'pri'}" data-act="dollwear" data-arg="${kind}|${on ? 'off' : 'on'}">${on ? '벗기' : '<i class="fa-solid fa-shirt"></i> 입히기'}</button>${on ? `<button class="ss-btn sm" data-act="dollpick" data-arg="wear|${kind}"><i class="fa-solid fa-shapes"></i> 모양 바꾸기 <small>${Object.keys(DL.SHAPES[kind]).length}가지</small></button>` : ''}</div>
                ${on ? `<div class="ss-sws">${DL.COLORS.map(c => `<button class="ss-sw ${color === c ? 'on' : ''}" data-act="dollwear" data-arg="${kind}|color:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}${any(`wear:${kind}|color`, color)}</div>
                <div class="ss-f wide"><span>포인트 색 <small>줄무늬 · 단추 · 리본 같은 곳</small></span><div class="ss-sws">${DL.COLORS.slice(0, 10).map(c => `<button class="ss-sw sm ${o.accent === c ? 'on' : ''}" data-act="dollwear" data-arg="${kind}|accent:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}${any(`wear:${kind}|accent`, o.accent)}${o.accent ? `<button class="ss-pill" data-act="dollwear" data-arg="${kind}|accent:">기본으로</button>` : ''}</div></div>` : ''}</div>`;
        }).join('');
        return `${whoBar}<div class="ss-wear-top">${stage}</div>${def ? `<p class="ss-hint">${esc(who)}의 인형은 아직 기본 모습이에요. 아래에서 고르면 바로 만들어져요.</p>` : ''}
            ${sec(`👕 ${esc(who)}의 옷 <small>모양 · 색을 바로 골라 입혀요</small>`, `<div class="ss-stack">${rows}</div>`)}
            ${make}${mine}`;
    }
    if (!s?.data?.wallet) return `${whoBar}<div class="ss-wear-top">${stage}</div>${sec('👕 옷 입히기', '<p class="ss-hint">재산 칸을 켜면 내 소지품을 인형에 입힐 수 있어요.</p>')}${make}${mine}`;
    if (settings().gearOn !== true) return `${whoBar}<div class="ss-wear-top">${stage}</div>${sec('👕 옷 입히기', '<p class="ss-hint">소지품을 칸마다 하나씩 입히면 인형 위에 그 옷이 그려져요. AI에게는 「지금 입은 것」 한 줄이 가요.</p><div class="ss-row-btns"><button class="ss-btn pri" data-act="gearon"><i class="fa-solid fa-shirt"></i> 옷 입히기 켜기</button></div>')}${make}${mine}`;
    if (!AD) { loadAD().then(() => app.rerenderPanels?.(true)).catch(e => ssWarn(LOG, 'gear load', e)); return '<p class="ss-hint">불러오는 중…</p>'; }
    const eq = AD.equipped(s), by = Object.fromEntries(eq.map(e => [e.slot, e])), wear = wearNow(s, D);
    const looks = wear.filter(x => x.name).map(x => `<div class="ss-card ss-look"><b>${esc(x.name)} <small>${esc(x.slot)}</small></b>
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="dollpick" data-arg="shape|${esc(x.name)}"><i class="fa-solid fa-shapes"></i> ${esc(DL.shapeName(x.kind, x.shape))} — 모양 바꾸기 <small>${Object.keys(DL.SHAPES[x.kind]).length}가지</small></button></div>
            <div class="ss-sws">${DL.COLORS.map(c => `<button class="ss-sw ${x.color === c ? 'on' : ''}" data-act="dollitem" data-arg="${esc(x.name)}|color:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}${any(`item:${x.name}|color`, x.color)}</div>
            <div class="ss-f wide"><span>포인트 색 <small>줄무늬 · 단추 · 리본 같은 곳</small></span><div class="ss-sws">${DL.COLORS.slice(0, 10).map(c => `<button class="ss-sw sm ${x.accent === c ? 'on' : ''}" data-act="dollitem" data-arg="${esc(x.name)}|accent:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}${any(`item:${x.name}|accent`, x.accent)}${x.accent ? `<button class="ss-pill" data-act="dollitem" data-arg="${esc(x.name)}|accent:">기본으로</button>` : ''}</div></div>${x.art ? '<p class="ss-hint">지금은 직접 그린 그림이 대신 보여요.</p>' : ''}</div>`).join('');
    return `${whoBar}${sec(`👕 옷 입히기 <small>${eq.length}/${AD.gearSlots().length} · 칸을 눌러 소지품에서 골라요</small>`, dollHTML(AD.gearSlots(), by, stage))}
        ${looks ? sec('🎨 입은 옷의 모양 · 색 <small>이름을 보고 골라 둔 것 — 틀리면 바꿔요</small>', `<div class="ss-stack">${looks}</div>`) : ''}
        ${make}
        ${mine}
        <p class="ss-hint">효과는 그 물건의 「효과」 글에서 읽어요 (재산 편집에서 고쳐요): 「힘 +2」 = 주사위 보정 · 「체온 -30%」 = 그 욕구가 30% 덜 줄어듦. 물건이 소지품에서 없어지면 저절로 벗겨져요.</p>
        <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="gearoff">옷 입히기 끄기</button></div>`;
}
LIFE_ACTIONS.dolllook = async (el, arg) => { const i = String(arg).indexOf(':'), k = arg.slice(0, i), v = arg.slice(i + 1); if (!['skin', 'hair', 'hairColor', 'eye', 'face', 'shape', 'eyes', 'body', 'line'].includes(k)) return; const meta = getMeta(true); bagOf(meta, whoOf(el))[k] = v; await saveMeta(); app.rerenderPanels?.(true); };
LIFE_ACTIONS.dollitem = async (el, arg) => { const j = String(arg).lastIndexOf('|'), name = arg.slice(0, j), kv = arg.slice(j + 1), i = kv.indexOf(':'), k = kv.slice(0, i), v = kv.slice(i + 1); if (!['shape', 'color', 'accent'].includes(k)) return; const meta = getMeta(true); const L = ((meta.doll ??= {}).looks ??= {}); if (v) (L[norm(name)] ??= {})[k] = v; else delete L[norm(name)]?.[k]; await saveMeta(); app.rerenderPanels?.(true); };
LIFE_ACTIONS.dollhurt = async (el, arg) => { await loadDL(); if (!DL.HURT_PARTS[arg]) return; const meta = getMeta(true), D = bagOf(meta, whoOf(el)); const h = new Set(Array.isArray(D.hurt) ? D.hurt : []); if (h.has(arg)) h.delete(arg); else h.add(arg); D.hurt = [...h]; await saveMeta(); app.rerenderPanels?.(true); };
// 🎨 꾸밀 사람 고르기 · 공용 프로필 · 다른 인물의 옷 (v2.9)
LIFE_ACTIONS.dollwho = (el, arg) => { if (el?._ss?.ui) el._ss.ui.dollWho = arg || ''; app.renderPanel(el); };
LIFE_ACTIONS.dollgo = async (el, arg, btn, s) => { // 프로필 카드의 「🎨 꾸미기」 — 꾸미기 탭이 꺼져 있으면 켜고 그 사람으로
    const meta = getMeta(true); if (!meta) return;
    if (meta.life?.wear !== true) { (meta.life ??= {}).wear = true; await saveMeta(); app.refreshNow?.(); }
    el._ss.ui.dollWho = arg === userOf(s) ? '' : arg; el._ss.tab = 'wear'; app.renderPanel(el);
};
LIFE_ACTIONS.dollface = async (el, arg) => { const meta = getMeta(true); if (!meta) return; const D = bagOf(meta, whoOf(el)); if (arg === 'on') D.asFace = true; else delete D.asFace; await saveMeta(); app.rerenderPanels?.(true); };
LIFE_ACTIONS.dollwear = async (el, arg) => {
    await loadDL();
    const who = whoOf(el); if (!who) return;
    const j = String(arg).indexOf('|'), kind = arg.slice(0, j), rest = arg.slice(j + 1); if (!OUTFIT_KINDS.includes(kind)) return;
    const meta = getMeta(true), O = (bagOf(meta, who).outfit ??= {});
    if (rest === 'on') O[kind] = { ...(O[kind] ?? {}), shape: DL.SHAPES[kind]?.[O[kind]?.shape] ? O[kind].shape : DL.guessShape(kind, '') };
    else if (rest === 'off') delete O[kind];
    else { const i = rest.indexOf(':'), k = rest.slice(0, i), v = rest.slice(i + 1); if (!O[kind] || !['color', 'accent'].includes(k) || (v && !/^#[0-9a-f]{6}$/i.test(v))) return; if (v) O[kind][k] = v.toLowerCase(); else delete O[kind][k]; }
    await saveMeta(); app.rerenderPanels?.(true);
};
// 🎨 아무 색이나 고르기 · 🖼 그림 올리기: 진짜 입력칸(색 · 파일)을 눌러야 폰에서도 창이 확실히 뜬다 → 값이 바뀌면 여기서 받는다
async function anyColor(arg, v, who = '') {
    if (String(arg).startsWith('wear:')) { const [kind, k] = String(arg).slice(5).split('|'); return LIFE_ACTIONS.dollwear({ _ss: { ui: { dollWho: who } } }, `${kind}|${k}:${v}`); }
    const meta = getMeta(true), D = bagOf(meta, who), isLook = String(arg).startsWith('look:'), rest = String(arg).slice(5), j = rest.lastIndexOf('|');
    const key = isLook ? rest : rest.slice(j + 1), name = isLook ? '' : rest.slice(0, j);
    if (!/^#[0-9a-f]{6}$/i.test(v) || (isLook ? !['skin', 'hairColor', 'eye'].includes(key) : !['color', 'accent'].includes(key) || !name)) return;
    if (isLook) D[key] = v.toLowerCase(); else ((D.looks ??= {})[norm(name)] ??= {})[key] = v.toLowerCase();
    await saveMeta(); app.rerenderPanels?.(true);
}
function ownImage(f, who = '') {
    const im = new Image(), url = URL.createObjectURL(f);
    im.onload = async () => {
        const k = Math.min(1, 240 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
        const c = cv.getContext('2d'); c.imageSmoothingEnabled = k < 1; c.drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        let out = cv.toDataURL('image/png'); if (out.length > 160000) out = cv.toDataURL('image/webp', 0.85);
        bagOf(getMeta(true), who).img = out; await saveMeta(); app.rerenderPanels?.(true);
    };
    im.onerror = () => URL.revokeObjectURL(url);
    im.src = url;
}
if (typeof document !== 'undefined' && !app._dollInputs) {
    app._dollInputs = true;
    document.addEventListener('change', (e) => {
        const t = e.target; if (!t?.closest?.('.ss-scope')) return;
        const who = whoOf(t.closest('.ss-panel')); // 지금 꾸미는 사람
        if (t.dataset?.dollcolor) anyColor(t.dataset.dollcolor, t.value, who).catch(err => ssWarn(LOG, 'doll color', err));
        else if (t.matches?.('input[data-dollimg]')) { const f = t.files?.[0]; t.value = ''; if (f) ownImage(f, who); }
    }, true);
}
// 🖌 직접 그리기: 새로 · 고치기 · 쓰기/빼기 · 지우기
LIFE_ACTIONS.dollart = async (el, arg, btn, s) => {
    await loadDL();
    const i = String(arg).indexOf(':'), op = arg.slice(0, i), v = arg.slice(i + 1), meta = getMeta(true), who = whoOf(el), D = bagOf(meta, who), lib = (settings().dollArt ??= {});
    if (op === 'new' || op === 'edit') {
        const kind = op === 'new' ? v : lib[v]?.kind; if (!DL.ART_KINDS[kind]) return;
        // 밑에 까는 인형: 지금 그리는 칸만 뺀 모습
        const look = lookOf(D); if (kind === 'hair') { look.hairArt = undefined; } if (kind === 'over') look.over = undefined;
        const ghost = DL.dollSVG(look, wearFor(s, D, who).filter(w => w.kind !== kind), moodFor(s, who));
        const ED = await import('./dolledit.js'), id = await ED.editArt({ DL, id: op === 'edit' ? v : '', kind, ghost });
        if (!id) return;
        if (op === 'new') (D.art ??= {})[kind] = id;
    } else if (op === 'use') { const a = lib[v]; if (!a) return; const A = (D.art ??= {}); if (A[a.kind] === v) delete A[a.kind]; else A[a.kind] = v; }
    else if (op === 'del') { const a = lib[v]; if (!a) return; delete lib[v]; if (D.art?.[a.kind] === v) delete D.art[a.kind]; saveSettings(); }
    else return;
    await saveMeta(); app.rerenderPanels?.(true);
};
LIFE_ACTIONS.dollimg = async (el, arg) => { if (arg !== 'off') return; const meta = getMeta(true); delete bagOf(meta, whoOf(el)).img; await saveMeta(); app.rerenderPanels?.(true); };
// 머리 모양 · 표정 · 옷 모양 고르기: 미리보기 인형이 깔린 창 (누를 때만 그린다)
LIFE_ACTIONS.dollpick = async (el, arg, btn, s) => {
    await loadDL();
    const meta = getMeta(true), who = whoOf(el, s), D = bagOf(meta, who), look = lookOf(D), wear = wearFor(s, D, who), mood = moodFor(s, who);
    let title = '', cells = [], cur = '', save = null;
    // 머리 모양 미리보기는 모자에 가리지 않게 장신구를 빼고 보여 준다
    if (arg === 'hair') { title = '머리 모양'; cur = D.hair ?? 'short'; cells = Object.entries(DL.HAIRS).map(([id, h]) => [id, h.n, DL.dollSVG({ ...look, hair: id }, wear.filter(w => w.kind !== 'acc'), mood)]); save = (id) => { D.hair = id; }; }
    else if (arg === 'face') { title = '표정'; cur = D.face ?? 'auto'; cells = Object.entries(DL.FACES).map(([id, n]) => [id, n, DL.dollSVG({ ...look, face: id === 'auto' ? undefined : id }, wear, mood)]); save = (id) => { D.face = id; }; }
    else if (String(arg).startsWith('shape|')) {
        const name = arg.slice(6), x = wear.find(w => w.name === name); if (!x) return;
        title = `${name} — 모양`; cur = x.shape;
        cells = Object.entries(DL.SHAPES[x.kind]).map(([id, sh]) => [id, sh.n, DL.dollSVG(look, wear.map(w => (w === x ? { ...w, shape: id } : w)), mood)]);
        save = (id) => { ((D.looks ??= {})[norm(name)] ??= {}).shape = id; };
    } else if (String(arg).startsWith('wear|') && who) { // 다른 인물의 옷 모양
        const kind = arg.slice(5), x = wear.find(w => w.kind === kind && w.shape); if (!x || !DL.SHAPES[kind]) return;
        title = `${who} · ${DL.KIND_NAMES[kind]} — 모양`; cur = x.shape;
        cells = Object.entries(DL.SHAPES[kind]).map(([id, sh]) => [id, sh.n, DL.dollSVG(look, wear.map(w => (w === x ? { ...w, shape: id, art: undefined } : w)), mood)]);
        save = (id) => { ((D.outfit ??= {})[kind] ??= {}).shape = id; };
    } else return;
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-dollpick';
    box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-shapes"></i><div><b>${esc(title)}</b><small>${cells.length}가지 — 눌러서 골라요</small></div></div><div class="ss-pick">${cells.map(([id, n, svg1]) => `<button class="ss-pick-c ${id === cur ? 'on' : ''}" data-choice="${esc(id)}">${svg1}<small>${esc(n)}</small></button>`).join('')}</div>`;
    const pick = await choosePopup(box, '취소'); if (!pick || !save) return;
    save(pick); await saveMeta(); app.rerenderPanels?.(true);
};
// 상점 탭 아래 · 재산 탭 아래로 옮긴 단추
export function shopExtra(s) {
    if (isSimple()) return '';
    const has = (s.data.shop?.shops ?? []).some(isMeatShop);
    return `<div class="ss-row-btns ss-life-x"><button class="ss-btn sm ${has ? 'ghost' : ''}" data-act="lifeshop" title="지금 있는 게이지를 채워 주는 기본 품목 · 물약이 늘 있는 가게"><i class="fa-solid fa-store"></i> ${has ? '미트볼 상점 품목 다시 맞추기' : '미트볼 상점 넣기'}</button></div>`;
}
export function walletExtra(s) {
    const bills = (s.data.wallet?.regular ?? []).filter(r => r.amount < 0).slice(0, 6), EV = { day: '매일', week: '매주', month: '매달' };
    return sec('🧾 고지서 <small>정기 지출</small>', `${bills.length ? `<div class="ss-bills">${bills.map(r => `<span class="ss-bill"><b>${esc(r.name)}</b><em>−${fmtNum(Math.abs(r.amount))}</em><small>${EV[r.every] ?? ''}</small></span>`).join('')}</div>` : '<p class="ss-hint">아직 정기적으로 나가는 돈이 없어요.</p>'}
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="lifebills" title="월세 · 관리비 · 통신비 · 구독료를 정기 지출에 넣어요 (값은 편집에서 고쳐요)"><i class="fa-solid fa-file-invoice-dollar"></i> 생활비 틀 넣기</button></div>`);
}

// 👕 입고 있는 물건은 소지품 목록에서 빠진다 (money.js가 물어본다) — 같은 물건이 여러 개면 입은 만큼만
app.wornCount = (name) => { try { return settings().gearOn === true && AD ? AD.equipped(app.current?.state).filter(e => norm(e.name) === norm(name)).length : 0; } catch { return 0; } };
