// 전체화면 안의 탭들 — 목록 행 + 묶음 카드. 설명은 한 줄까지.
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, slot, syncSwipe, msgKey, userName, bumpMeta } from '../base/st.js';
import { esc, fmt, signed, short, dateText, dateOf, DAY, slotName, num, norm, tokens } from '../base/util.js';
import { row, card, chip, seg, bar, empty, btn, sheet, toast, putInput, form } from './kit.js';
import { fold, derived, needStage, relStage, nextStage, diceParts, worldEvent, priceMul, whereNow, matchOf, myTraits } from '../rules/engine.js';
import { traitOf } from '../../data/traits.js';
import { luckOf } from '../rules/luck.js';
import { QUOTES } from '../../data/quotes.js';
import { vis, handLines } from './tools.js';
const QN = QUOTES.length;
const d20Svg = (n, c) => `<svg class="ml-d20 big ${c}" viewBox="0 0 100 100">${n === 1 ? '<polyline class="crack" points="38,8 46,30 36,44 52,60 44,78 54,94"/>' : ''}<polygon class="f0" points="50,4 92,28 92,72 50,96 8,72 8,28"/><polygon class="f1" points="50,22 78,66 22,66"/><polyline class="ed" points="50,4 50,22 92,28 78,66 92,72 50,96 78,66 22,66 8,72 22,66 8,28 50,22 22,66"/><text x="50" y="56">${n}</text></svg>`;
import { layout, lineEdges, lineNodes, route, floorsOf } from './metro.js';
import { personOf, placeOf, bookTokens, personTokens, normBook, PLACE_KINDS, LIMIT } from '../rules/book.js';
import { moodTags, pickQuote, pickMusic } from '../rules/mood.js';
import { LEVELS, GAUGES, PRESETS, level, gaugeCfg, levelCost } from '../rules/inject.js';
import { fillBook } from '../rules/ai.js';

const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
const money = (r, n) => `${fmt(n)} ${esc(r.book.world.currency)}`;


// ───── 턴 요약 카드: 줄마다 이유 · 줄마다 되돌리기 ─────
export function changeRow(c, i, undo = true) {
    const val = typeof c.to === 'number' && typeof c.from === 'number' ? `${c.f === 'time' ? `+${Math.round((c.to - c.from) / 60 * 10) / 10}h` : signed(c.to - c.from)}` : esc(c.to);
    const src = c.src === 'hand' ? ' · ✋직접' : c.src === 'meddle' ? ' · ✍손댐' : c.src === 'fill' ? ' · 보충' : '';
    return row({ icon: c.icon, title: esc(c.label), sub: `${esc(c.why || '')}${src}`, value: `<span class="${c.sure === false ? 'guess' : ''}">${val}</span>${undo && c.j !== undefined ? '' : ''}${undo && c.i != null && c.src !== 'auto' && c.src !== 'time' ? `<button class="ml-mini" data-act="undo" data-v="${i}:${c.i}" title="되돌리기">↶</button>` : ''}`, faint: c.sure === false });
}
export function turnCard(r, i) {
    const ch = (r.changes[i] ?? []).filter(c => c.src !== 'time');
    const fl = r.flags[i] ?? [];
    if (!ch.length && !fl.length) return '';
    return card('이번 답에서 바뀐 것', fl.map(f => row({ icon: '⚠️', title: '확인 필요', sub: esc(f.text), value: `${f.fix ? btn('상태 고치기', 'flagfix', `${f.fix}`, 'xs') : ''}${btn('무시', 'flagok', `${i}:${f.i}`, 'xs')}` })).join('') + ch.map(c => changeRow(c, i)).join(''));
}

// ───── ❤️ 수치: 상태 딱지 · 욕구 · 게이지 · 능력치 · 이 장면 · 이번 답 (dev 수치 카드 기준 + 이유 · 다음 경계까지 · 회복 방법) ─────
const STAGE_COLOR = { 정상: 'good', 주의: 'mid', 위험: 'bad' };
function recoverOf(r, key) {
    const { book, S } = r, out = [];
    for (const it of S.items) if (num(it.fx?.[key]) > 0) out.push({ t: `👜 ${it.name} ${signed(it.fx[key])}`, say: `${it.name}을(를) 먹는다.` });
    const here = placeOf(book, S.loc), mul = priceMul(S);
    for (const g of here?.goods ?? []) if (num(g.fx?.[key]) > 0) out.push({ t: `🛒 ${g.name} ${signed(g.fx[key])} · ${Math.round(g.price * mul)}${book.world.currency}`, say: `${g.name} 하나 주세요.`, poor: S.cash < Math.round(g.price * mul) });
    if (num(here?.rest?.[key]) > 0) out.push({ t: `🛏 ${here.name}에서 쉬기 ${signed(here.rest[key])}`, say: '잠깐 쉰다.' });
    if (key === 'energy') out.push({ t: '😴 자기 · 시간당 +12', say: '잠을 잔다.' });
    if (key === 'hygiene') { const b = book.world.places.find(q => q.kind === 'bath' || q.kind === 'home'); if (b) out.push({ t: `🫧 ${b.name}에서 씻기 +60`, say: b.name === S.loc ? '씻는다.' : `${b.name}(으)로 가서 씻는다.` }); }
    if (key === 'hunger' && !out.length) { const f = book.world.places.find(q => q.kind === 'food'); if (f) out.push({ t: `🍜 ${f.name} · 식사 ≈${book.world.meal}${book.world.currency}`, say: `${f.name}(으)로 밥 먹으러 간다.` }); }
    return out.slice(0, 3);
}
function needCard(r, n, last) {
    const { S } = r, v = Math.round(S.needs[n.key] ?? 0), st = needStage(v), c = last.find(x => x.f === `need.${n.key}` && x.src !== 'time');
    const nextAt = st === '정상' ? 40 : st === '주의' ? 15 : 0, hrs = n.rate > 0 && v > nextAt ? (v - nextAt) / n.rate : null;
    const sym = derived(r.book, S).find(d => d.key === n.key);
    const rec = st !== '정상' || v < 60 ? recoverOf(r, n.key) : [];
    return `<div class="ml-gc ${STAGE_COLOR[st]}"><div class="ml-gc-h"><span>${n.icon}</span><b>${esc(n.name)}</b><span class="ml-pill ${STAGE_COLOR[st] === 'good' ? 'good' : STAGE_COLOR[st] === 'bad' ? 'bad' : ''}">${st}</span>${c ? `<span class="ml-why ${c.to < c.from ? 'neg' : 'pos'}">${signed(c.to - c.from)} · ${esc(c.why)}</span>` : ''}<em class="tap" data-act="edit-val" data-v="need|${n.key}" title="고치기">${v}<small>/100</small></em></div>
        <div class="ml-gbar"><b style="width:${v}%"></b><i style="left:40%"></i><i style="left:15%"></i></div>
        <div class="ml-gc-f">${sym ? `<span>⚠ ${esc(sym.text)}${sym.stage === '위험' ? ` · 🎲${sym.dice}` : ''}</span>` : ''}${hrs != null && hrs < 48 ? `<span class="dim">${st === '위험' ? '' : `${st === '정상' ? '주의' : '위험'}까지 약 ${hrs < 1 ? `${Math.round(hrs * 60)}분` : `${Math.round(hrs)}시간`}`}</span>` : ''}<span class="dim">−${n.rate}/시간</span></div>
        ${rec.length ? `<div class="ml-gc-r">${rec.map(x => btn(esc(x.t), 'say', x.say, `xs${x.poor ? ' poor' : ''}`)).join('')}</div>` : ''}</div>`;
}
function gaugeCard(r, g, last) {
    const { S } = r, v = Math.round(S.gauges[g.key] ?? g.start), pct = Math.round(v / g.max * 100), c = last.find(x => x.f === `gauge.${g.key}`);
    return `<div class="ml-gc"><div class="ml-gc-h"><b>${esc(g.name)}</b>${c ? `<span class="ml-why ${c.to < c.from ? 'neg' : 'pos'}">${signed(c.to - c.from)} · ${esc(c.why)}</span>` : ''}<em class="tap" data-act="edit-val" data-v="gauge|${g.key}" title="고치기">${v}<small>/${g.max}</small></em></div>
        <div class="ml-gbar" style="--gc:${g.color}"><b style="width:${pct}%;background:var(--gc)"></b></div>
        <div class="ml-gc-f"><span class="ml-steps2">${[-10, -1, 1, 10].map(d => `<button class="ml-mini2" data-act="gstep" data-v="${esc(g.name)}:${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`).join('')}</span><span class="dim">${esc(g.desc)}</span></div></div>`;
}
function now(r) {
    const { S, book } = r, meta = getMeta(), li = lastAI(), last = r.changes[li] ?? [];
    const dz = derived(book, S);
    const tags = [...S.status.map(s => chip(`${s.src === 'fate' ? '🔮 ' : ''}${esc(s.name)}${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}${s.dice ? ` · 🎲${signed(s.dice)}` : ''}`, s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : 'mid')),
        ...dz.filter(d => d.stage === '위험').map(d => chip(`${d.icon} ${esc(d.name)} 위험 · 🎲${d.dice}`, 'bad'))];
    const V = (k) => vis('now', k);
    let h = !V('tags') ? '' : `<h4 class="ml-h4">상태 딱지</h4><div class="ml-chips">${tags.join('') || '<span class="ml-sub">없음</span>'}</div>`;
    const tg = moodTags(r, last), side = [];
    if (modOn('music')) { const m = S.bgm ? { label: S.bgm, query: S.bgm, why: '답에 나온 곡' } : pickMusic(tg, settings().musicTaste); side.push(`<div class="ml-scene tap" data-act="music" data-v="${esc(m.query)}"><i>🎵</i><span><b>${esc(m.label)}</b><small>${esc(tg.map(t => MOOD_KO[t] ?? t).slice(0, 3).join(' · '))}</small></span><em>▶</em></div>`); }
    if (modOn('quote')) { const q = pickQuote(tg, meta.recent?.quote ?? [], S.turn); if (q) side.push(`<div class="ml-scene tap" data-act="quote" data-v="${esc(`${q.text}\n\n${q.mean}\n— ${q.src}`)}"><i>📜</i><span><b>${esc(q.text)}</b><small>${esc(q.src)}</small></span><em>ⓘ</em></div>`); }
    { const l = luckOf(book, S, ctx().getCurrentChatId?.()); side.push(`<div class="ml-scene luck"><i>🍀</i><span><b>${esc(l.text)}</b><small>오늘 운세 · 선택지에 🍀 · ⚠로 보여요</small></span></div>`); }
    if (side.length && V('scene')) h += `<h4 class="ml-h4">이 장면</h4><div class="ml-scenes">${side.join('')}</div>`;
    if (modOn('stats')) {
        if (V('needs')) h += `<h4 class="ml-h4">욕구 <span>달력 시간으로 줄어요</span></h4><div class="ml-gcs">${book.me.needs.map(n => needCard(r, n, last)).join('')}</div>`;
        if (book.me.gauges.length && V('gauges')) h += `<h4 class="ml-h4">게이지</h4><div class="ml-gcs">${book.me.gauges.map(g => gaugeCard(r, g, last)).join('')}</div>`;
        if (book.me.attrs.length && V('attrs')) h += `<h4 class="ml-h4">능력치 <span>주사위 보정</span></h4><div class="ml-attrs">${book.me.attrs.map(a => { const gear = S.items.filter(it => it.worn && num(it.fx?.[a.name])).reduce((x, it) => x + num(it.fx[a.name]), 0); return `<div class="ml-attr tap" data-act="rollattr" data-v="${esc(a.name)}"><small>${esc(a.name)}</small><b>${signed(S.attrs[a.name] ?? 0)}</b>${gear ? `<em>👕${signed(gear)}</em>` : ''}</div>`; }).join('')}</div>`;
    }
    if (V('turn')) h += turnCard(r, li);
    if (S.with.length && modOn('rel') && V('with')) h += `<h4 class="ml-h4">같이 있는 사람</h4><div class="ml-rcs">${S.with.map(n => relCard(r, n)).join('')}</div>`;
    return h;
}
const MOOD_KO = { love: '설렘', sad: '울적', tired: '나른함', hungry: '허기', rain: '비', conflict: '갈등', jealous: '질투', festive: '들뜸', friend: '함께', hope: '희망', money: '빠듯함', bad: '불운', good: '행운', calm: '잔잔함' };
// ───── 🎲 주사위: 능력치 + 보정 내역 → d20 · 결과는 입력창에 (이야기에 남게) ─────
const DCS = [['쉬움', 8], ['보통', 12], ['어려움', 15], ['매우 어려움', 18], ['극한', 22]];
let diceSel = { attr: '', dc: 12 };
export const getDice = () => diceSel;
export const setDice = (k, v) => { diceSel[k] = v; };
function dice(r) {
    const { book, S } = r, attrs = book.me.attrs.map(a => a.name);
    if (!diceSel.attr && attrs.length) diceSel.attr = attrs[0];
    const lk = luckOf(book, S, ctx().getCurrentChatId?.(), getMeta().luckRoll);
    const P = diceParts(book, S, diceSel.attr, lk), on = level('dice') >= 3 || level('stats') >= 3;
    const base = (x) => x.why === diceSel.attr || x.why.endsWith('착용') || x.why.startsWith('🧬');
    const mod = P.filter(x => on || base(x)).reduce((a, x) => a + x.n, 0);
    let ok = 1; for (let k = 2; k <= 19; k++) if (k + mod >= diceSel.dc) ok++;
    const req = S.rolls.slice(-3).reverse();
    let h = req.length ? `<h4 class="ml-h4">이야기에서 요청한 판정</h4>${req.map(q => `<div class="ml-rl tap" data-act="jump" data-v="${q.i}"><i>📣</i>${esc(q.what)}</div>`).join('')}` : '';
    h += `<h4 class="ml-h4">능력치</h4><div class="ml-chips">${attrs.map(a => `<button class="ml-btn xs${diceSel.attr === a ? ' on' : ''}" data-act="dset" data-v="attr:${esc(a)}">${esc(a)} ${signed(S.attrs[a] ?? 0)}</button>`).join('')}</div>`;
    h += `<h4 class="ml-h4">난이도</h4><div class="ml-chips">${DCS.map(([n, v]) => `<button class="ml-btn xs${diceSel.dc === v ? ' on' : ''}" data-act="dset" data-v="dc:${v}">${n} ${v}</button>`).join('')}</div>`;
    h += `<h4 class="ml-h4">보정 내역 ${on ? '' : '<span>상태 보정은 영향력 3부터 적용</span>'}</h4><div class="ml-rc">${P.length ? P.map(x => `<div class="ml-rl${on || base(x) ? '' : ' dim'}"><i>${x.fate ? '🔮' : x.n < 0 ? '⬇️' : '⬆️'}</i>${esc(x.why)} <b class="${x.n < 0 ? 'neg' : 'pos'}">${signed(x.n)}</b></div>`).join('') : '<div class="ml-rl dim"><i>·</i>보정 없음</div>'}<div class="ml-rl"><i>🎯</i>d20 ${signed(mod)} ≥ ${diceSel.dc} <span>성공 확률 ${Math.round(ok / 20 * 100)}%</span></div></div>`;
    const last = getMeta().recent?.rolls?.[0];
    h = `<div class="ml-dhero"><button class="ml-dbtn big${last && Date.now() - (last.at ?? 0) < 2500 ? (last.d === 20 ? ' burst' : last.d === 1 ? ' shake' : '') : ''}" data-act="roll" data-v="${mod}">${d20Svg(last?.d ?? 20, last ? `${last.res.includes('성공') ? 'ok' : 'no'}${last.d === 20 ? ' crit' : last.d === 1 ? ' fumble' : ''}` : '')}${last?.d === 20 && Date.now() - (last.at ?? 0) < 2500 ? `<span class="ml-spark">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<i style="--a:${i * 45}deg">✦</i>`).join('')}</span>` : ''}</button><div class="ml-dres">${last ? `<b class="${last.res.includes('성공') ? 'pos' : 'neg'}">${esc(last.res)}</b><span>${last.d}${signed(last.tot - last.d)} = ${last.tot}</span>` : '<b>굴려 볼까요?</b><span>주사위를 눌러요</span>'}</div><div class="ml-dodds"><span style="--p:${Math.round(ok / 20 * 100)}%"></span><b>${Math.round(ok / 20 * 100)}%</b><small>성공</small></div></div>` + h;
    h += `<h4 class="ml-h4">오늘 운세 주사위</h4>${lk.rolled ? `<div class="ml-scene luck"><i>🍀</i><span><b>${esc(lk.text)}</b><small>🎲 ${lk.d} · 이야기 속 하루에 한 번</small></span></div>` : `<div class="ml-scene luck tap" data-act="luckroll"><i>🎲</i><span><b>오늘 운세 굴리기</b><small>선택지에 🍀 · ⚠로 반영돼요</small></span><em>굴리기</em></div>`}`;
    const hist = getMeta().recent?.rolls ?? [];
    if (hist.length) h += `<h4 class="ml-h4">최근 굴림</h4><div class="ml-dhist">${hist.map(x => `<span class="${x.res.includes('성공') ? 'ok' : 'no'}" title="${esc(x.text)}">${x.d ?? '?'}</span>`).join('')}</div>`;
    return h;
}
// ───── 소지품 · 재산 (+ 상점 미니 선택지) ─────
function bag(r) {
    const { S, book } = r, place = placeOf(book, S.loc), mul = priceMul(S);
    const V = (k) => vis('bag', k);
    let h = !V('cash') ? '' : card('재산', row({ icon: '💰', title: '가진 돈', sub: `식사 한 끼 ≈ ${money(r, book.world.meal)}`, value: `<b class="ml-num">${money(r, S.cash)}</b>`, act: 'edit-cash', more: true }) + row({ icon: '💬', title: '물가 물어보기', sub: '이 세계에서 얼마쯤 할까? (AI 0회 · 설정집 물가 기준)', act: 'askprice', more: true }));
    if (V('items')) h += card('소지품', S.items.length ? S.items.map(it => row({ icon: it.worn ? '👕' : '📦', title: `${esc(it.name)}${it.n > 1 ? ` ×${it.n}` : ''}`, sub: it.worn ? '착용 중' : Object.entries(it.fx).map(([k, v]) => `${book.me.needs.find(n => n.key === k)?.name ?? k} ${signed(v)}`).join(' · '), value: choiceBtns([[Object.keys(it.fx).length ? `먹기` : '쓰기', `${it.name}을(를) 먹는다`], [it.worn ? '벗기' : '입기', `${it.name}을(를) ${it.worn ? '벗는다' : '입는다'}`]]) })).join('') : row({ icon: '📦', title: '비어 있어요', faint: true }));
    if (place?.goods.length && V('shop')) h += card(`${PLACE_KINDS[place.kind]} ${esc(place.name)} 가게`, place.goods.map(g => goodRow(r, g, mul)).join(''), mul !== 1 ? `오늘 값 ×${mul}` : '');
    return h;
}
function goodRow(r, g, mul) {
    const price = Math.round(g.price * mul), poor = r.S.cash < price;
    const liked = Object.values(r.S.rel).some(x => x.seen.likes.some(l => g.name.includes(l)));
    const fx = Object.entries(g.fx).map(([k, v]) => `${r.book.me.needs.find(n => n.key === k)?.name ?? k} ${signed(v)}`).join(' · ');
    return row({ icon: liked ? '🎁' : '🛒', title: esc(g.name), sub: `−${price} · ${fx || '물건'}${poor ? ' · 돈 부족' : ''}`, value: poor ? '' : btn('사기', 'say', `${g.name} 하나 주세요.`), faint: poor });
}
const choiceBtns = (L) => L.map(([t, say]) => btn(t, 'say', say, 'sm')).join('');
// ───── 관계 ─────
function rel(r) {
    const names = Object.keys(r.S.rel);
    if (!names.length) return empty('아직 만난 사람이 없어요.');
    const here = new Set(r.S.with), on = names.filter(n => !r.S.rel[n].gone), off = names.filter(n => r.S.rel[n].gone);
    on.sort((a, b) => (here.has(b) - here.has(a)) || (r.S.rel[b].aff - r.S.rel[a].aff));
    const head = `<div class="ml-relbar"><span class="ml-sub">${on.length}명${here.size ? ` · 지금 ${here.size}명과 함께` : ''}</span>${seg('hide', [['0', '숫자'], ['1', '숨기기']], getMeta().hideNums ? 1 : 0)}</div>`;
    return head + `<div class="ml-rcs">${on.map(n => relCard(r, n)).join('')}</div>` + (off.length ? `<h4 class="ml-h4">이야기에서 빠진 사람</h4><div class="ml-rcs">${off.map(n => relCard(r, n)).join('')}</div>` : '');
}
// 사람 카드 하나 (dev 관계 카드 기준 + 이유 · 해금 · 기억 · 취향 · 루틴)
function lastRel(r, name) {
    for (let i = r.changes.length - 1, k = 0; i >= 0 && k < 300; i--, k++) { const c = (r.changes[i] ?? []).find(x => x.who === name && /^rel\./.test(x.f)); if (c) return { c, i }; }
    return null;
}
function meter(kind, label, v, ticks, hide, who = '') {
    return `<div class="ml-meter ${kind}${who ? ' tap' : ''}"${who ? ` data-act="edit-val" data-v="${kind === 'love' ? 'aff' : 'trust'}|${esc(who)}" title="고치기"` : ''}><span>${label}</span><span class="ml-track"><b style="width:${v}%"></b>${ticks.map(t => `<i style="left:${t}%"></i>`).join('')}</span><em>${hide ? '' : v}</em></div>`;
}
function relCard(r, name, inSheet = false) {
    const { book, S } = r, x = S.rel[name]; if (!x) return '';
    const p = personOf(book, name), st = relStage(book, x.aff), nx = nextStage(book, x.aff), hide = getMeta().hideNums;
    const ticks = book.stages.map(s => s.at).filter(a => a > 0 && a < 100);
    const sign = p?.signs?.filter(s => x.aff >= s.at).pop()?.text;
    const last = lastRel(r, name);
    const nowAt = p?.routine?.find(q => slotName(S.t).includes(String(q.at).slice(0, 1)))?.place ?? p?.haunt?.[0];
    const pills = [x.gone ? `<span class="ml-pill mid">🕊 ${esc(x.gone)}</span>` : `<span class="ml-pill love">${esc(p?.noLove ? '친구' : st.name)}</span>`,
        S.with.includes(name) && '<span class="ml-pill good">함께 있음</span>',
        x.jealous && `<span class="ml-pill bad">💢 질투</span>`,
        p?.noLove && '<span class="ml-pill mid">애정 꺼 둠</span>'].filter(Boolean).join('');
    const L = [], V = (k) => vis('rel', k);
    if (!x.gone) {
        if (V('meters') && !p?.noLove) L.push(meter('love', '애정', x.aff, ticks, hide, name));
        if (V('meters')) L.push(meter('trust', '우정', x.trust, [], hide, name));
        if (hide) L.push(`<div class="ml-rl"><i>👀</i>${esc(sign || '아직 속을 모르겠다')}</div>`);
        if (V('call')) L.push(`<div class="ml-rl"><i>🗣</i><b>${esc(st.call)}</b><span>· ${esc(st.act)}</span></div>`);
        if (V('next') && nx && !p?.noLove) L.push(`<div class="ml-rl"><i>🔓</i>다음 「${esc(nx.name)}」까지 ${hide ? '조금 더' : `애정 ${nx.at - x.aff}`} <span>→ ${esc(nx.call)} · ${esc(nx.act)}</span></div>`);
        if (V('last') && last) L.push(`<div class="ml-rl tap" data-act="jump" data-v="${last.i}"><i>${last.c.icon}</i>최근 ${hide ? '' : `<b class="${last.c.to < last.c.from ? 'neg' : 'pos'}">${signed(last.c.to - last.c.from)}</b>`} ${esc(last.c.why)} <span>#${last.i}</span></div>`);
        if (V('match')) { const m = matchOf(book, name); const tr = (p?.traits ?? []).map(id => traitOf(id)).filter(Boolean); if (m.sign || tr.length) L.push(`<div class="ml-rl"><i>${m.sign?.icon ?? '🧬'}</i>${m.sign ? `${m.sign.name}` : ''}${tr.length ? ` <span>${tr.map(t => `${t.icon}${t.name}`).join(' · ')}</span>` : ''}${m.mul !== 1 ? ` <b class="${m.mul > 1 ? 'pos' : 'neg'}">궁합 ×${m.mul}</b>` : ''}</div>`); }
        if (V('want') && x.want) L.push(`<div class="ml-rl"><i>🎯</i>${esc(x.want)}</div>`);
        if (x.jealous) L.push(`<div class="ml-rl"><i>💢</i>${esc(x.jealous)}</div>`);
        if (x.life) L.push(`<div class="ml-rl"><i>🌙</i>${esc(x.life)}</div>`);
        const mem = x.mem.filter(m => !x.jealous || !m.text.includes(x.jealous));
        if (V('mem') && mem[0]) L.push(`<div class="ml-rl"><i>💬</i>${esc(mem[0].text)}${mem.length > 1 ? ` <span>외 ${mem.length - 1}개</span>` : ''}</div>`);
        const tl = [...x.seen.likes.map(t => `<span class="ml-tag good">${esc(t)}</span>`), ...x.seen.hates.map(t => `<span class="ml-tag bad">${esc(t)}</span>`)];
        if (V('taste') && tl.length) L.push(`<div class="ml-rl"><i>🎁</i>${tl.join('')}</div>`);
        const day = p?.day || x.day, meta2 = [nowAt && `📍 ${esc(nowAt)}`, day && `🎂 ${esc(day)}`].filter(Boolean);
        if (V('place') && meta2.length) L.push(`<div class="ml-rl dim"><i></i>${meta2.join('<span>·</span>')}</div>`);
    }
    const acts = x.gone ? btn('돌아옴', 'gone', name, 'xs') : `${btn('🎁<span> 선물</span>', 'say', `${name}에게 선물을 건넨다.`, 'xs')}${inSheet ? '' : btn('더보기', 'person', name, 'xs')}`;
    return `<div class="ml-rc${x.gone ? ' gone' : ''}"><div class="ml-rc-h"><span class="ml-face"${inSheet ? '' : ` data-act="person" data-v="${esc(name)}"`}>${p?.face || x.face || '🙂'}</span><b${inSheet ? '' : ` class="tap" data-act="person" data-v="${esc(name)}"`}>${esc(name)}</b>${pills}<span class="ml-sp"></span>${acts}</div>${(p?.line || x.line) && vis('rel', 'line') ? `<div class="ml-rc-line">${esc(p?.line || x.line)}</div>` : ''}${L.join('')}</div>`;
}
export function personSheet(r, name) {
    const { book, S } = r, x = S.rel[name], p = personOf(book, name); if (!x) return;
    const L = [];
    L.push(`<h4 class="ml-h4">관계 단계</h4><div class="ml-steps">${book.stages.map(s2 => `<div class="${relStage(book, x.aff).name === s2.name ? 'on' : x.aff >= s2.at ? 'done' : ''}"><b>${esc(s2.name)}</b><small>${s2.at}~ · ${esc(s2.call)} · ${esc(s2.act)}</small></div>`).join('')}</div>`);
    if (x.mem.length) L.push(`<h4 class="ml-h4">감정 기억</h4>${x.mem.map(m => `<div class="ml-rl"><i>💬</i>${esc(m.text)} <span>${dateText(book.world.start, m.t, false)}</span></div>`).join('')}`);
    if (p?.signs?.length) L.push(`<h4 class="ml-h4">티 나는 반응</h4>${p.signs.map(sg => `<div class="ml-rl${x.aff >= sg.at ? '' : ' dim'}"><i>${x.aff >= sg.at ? '👀' : '🔒'}</i>애정 ${sg.at}~ <span>${esc(sg.text)}</span></div>`).join('')}`);
    if (p?.up?.length || p?.down?.length) L.push(`<h4 class="ml-h4">오르는 일 · 내리는 일</h4><div class="ml-rl"><i>⬆️</i>${p.up.map(a => `<span class="ml-tag good">${esc(a.act)}${a.d != null ? ` +${a.d}` : ''}</span>`).join('') || '<span>-</span>'}</div><div class="ml-rl"><i>⬇️</i>${p.down.map(a => `<span class="ml-tag bad">${esc(a.act)}${a.d != null ? ` ${a.d}` : ''}</span>`).join('') || '<span>-</span>'}</div>`);
    if (p?.syn?.length) L.push(`<h4 class="ml-h4">다른 사람과</h4>${p.syn.map(sy => `<div class="ml-rl"><i>🔗</i>${esc(sy.to)} <span>${esc(sy.text)}</span></div>`).join('')}`);
    if (p?.routine?.length) L.push(`<h4 class="ml-h4">하루 루틴</h4>${p.routine.map(q => `<div class="ml-rl"><i>🕰</i>${esc(q.at)} <span>${esc(q.place)}</span></div>`).join('')}`);
    L.push(`<div class="ml-acts">${btn('📅 약속 잡기', 'say', `${name}에게 약속을 잡자고 한다.`, 'xs')}${btn('✏️ 설정집에서 고치기', 'bk-person', name, 'xs')}${btn('🔗 합치기', 'merge', name, 'xs')}${btn('🕊 빠짐', 'gone', name, 'xs')}</div>`);
    sheet(`${p?.face || '🙂'} ${esc(name)}`, `<div class="ml-rcs">${relCard(r, name, true)}</div>${L.join('')}`);
}
// ───── 지도: dev 노선도 · 인물 핀 · 건물 정면도 + 「지금 가면 누구를 만날지」 · 장소마다 회복 · 물가 · 사건 ─────
let mapSel = null;
export const setMapSel = (v) => { mapSel = v; };
function map(r) {
    const { book, S } = r, places = book.world.places;
    if (!places.length) return empty('설정집에 장소가 없어요.', '장소 넣기', 'tab-book');
    const sl = slotName(S.t), ev = worldEvent(Math.floor(S.t / DAY)), mul = priceMul(S);
    const at = new Map(); // 장소 → [{ e, name, why }]
    for (const p of book.people) { const w = whereNow(book, S, p); if (w?.place) { const k = placeOf(book, w.place)?.name ?? w.place; (at.get(k) ?? at.set(k, []).get(k)).push({ e: p.face, name: p.name, why: w.why }); } }
    const { pos, pairs, adj } = layout(places);
    const sel = placeOf(book, mapSel) ?? placeOf(book, S.loc) ?? places[0];
    const path = route(adj, placeOf(book, S.loc)?.name, sel.name), onPath = new Set(path.slice(1).map((n, i) => [path[i], n].sort().join('|')));
    for (const e of pairs) e.route = onPath.has(e.key);
    const net = lineEdges(pairs, pos);
    const nodes = lineNodes(places, { pos, here: S.loc, sel: sel.name, net, pins: (p) => at.get(p.name) ?? [] });
    const [x0, y0, x1, y1] = nodes.ext, pad = 4;
    const svg = `<svg class="ml-map" viewBox="${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}" preserveAspectRatio="xMidYMid meet"><g class="edges">${net.svg}</g>${nodes.svg}</svg>`;
    const V = (k) => vis('map', k);
    let h = `<div class="ml-maphead"><span>📍 지금 <b>${esc(S.loc || '어딘가')}</b> · ${sl}</span>${ev ? `<span class="ml-pill ${ev.kind === 'good' ? 'good' : ev.kind === 'bad' ? 'bad' : 'love'}">🎪 ${esc(ev.name)}</span>` : ''}</div>${V('map') ? `<div class="ml-mapwrap">${svg}</div>` : ''}`;
    const who = [...at.entries()].flatMap(([pl, L]) => L.map(x => ({ ...x, pl })));
    if (who.length && V('pins')) h += `<div class="ml-pinrow">${who.map(x => `<span class="ml-pin tap" data-act="mapsel" data-v="${esc(x.pl)}" title="${esc(x.why)}">${x.e} ${esc(x.name)} <small>${esc(x.pl)}</small></span>`).join('')}</div>`;
    h += placeCard(r, sel, at.get(sel.name) ?? [], path, ev, mul);
    return h;
}
function placeCard(r, p, here2, path, ev, mul) {
    const { book, S } = r, isHere = p.name === S.loc, L = [];
    const nm = (k) => book.me.needs.find(n => n.key === k)?.name ?? k;
    const fxTxt = (fx) => Object.entries(fx ?? {}).map(([k, v]) => `${nm(k)} ${signed(v)}`).join(' · ');
    if (!isHere && path.length > 1) L.push(`<div class="ml-rl"><i>🚶</i>${path.map(esc).join(' → ')} <span>${path.length - 1}정거장</span></div>`);
    L.push(`<div class="ml-rl"><i>👥</i>${here2.length ? here2.map(x => `${x.e} <b>${esc(x.name)}</b> <span>${esc(x.why)}</span>`).join(' · ') : '<span>지금은 아무도 없을 것 같아요</span>'}</div>`);
    // 다른 시간대에 오는 사람 (루틴)
    const later = book.people.filter(q => q.routine.some(t => t.place === p.name) && !here2.some(x => x.name === q.name)).map(q => `${q.face}${esc(q.name)} <span>${q.routine.filter(t => t.place === p.name).map(t => esc(t.at)).join('/')}</span>`);
    if (later.length) L.push(`<div class="ml-rl"><i>🕰</i>${later.join(' · ')}</div>`);
    if (Object.keys(p.rest).length || p.kind === 'home') L.push(`<div class="ml-rl"><i>🛏</i>쉬면 <b>${esc(fxTxt(p.rest) || '에너지 +10/시간')}</b></div>`);
    if (p.kind === 'bath') L.push(`<div class="ml-rl"><i>🫧</i>씻으면 <b>위생 +60</b></div>`);
    if (ev && (ev.price !== 1 && p.goods.length || (ev.name === '축제' && p.kind === 'street'))) L.push(`<div class="ml-rl"><i>🎪</i>${esc(ev.text)}</div>`);
    if (p.note) L.push(`<div class="ml-rl"><i>📝</i>${esc(p.note)}</div>`);
    const goods = p.goods.map(g => { const price = Math.round(g.price * mul), poor = S.cash < price; const liked = Object.values(S.rel).some(x => x.seen.likes.some(l => g.name.includes(l))); return `<div class="ml-good${poor ? ' poor' : ''}"><span>${liked ? '🎁 ' : ''}<b>${esc(g.name)}</b> <small>${esc(fxTxt(g.fx))}</small></span><em>${price}${mul !== 1 ? `<s>${g.price}</s>` : ''} ${esc(book.world.currency)}</em>${isHere && !poor ? btn('사기', 'say', `${g.name} 하나 주세요.`, 'xs') : poor && isHere ? '<small class="neg">돈 부족</small>' : ''}</div>`; }).join('');
    const fl = floorsOf(p.floors);
    // 🛗 건물 안: 엘리베이터 버튼판처럼 좁게 (위층이 위) + 옆에 실제 사진
    const lift = fl.length ? `<div class="ml-lift">${[...fl].reverse().map(f => { const lv = /^(지하|b)/i.test(f.name) ? `B${(/\d+/.exec(f.name) ?? [1])[0]}` : /옥상|루프|roof/i.test(f.name) ? 'R' : (/\d+/.exec(f.name) ?? [''])[0] || f.name.slice(0, 2); const on = isHere && norm(S.loc + ' ' + (S.spot ?? '')).includes(norm(f.name)); return `<div class="ml-fl${on ? ' on' : ''}"><b>${esc(lv)}</b><span>${f.rooms.map(x => esc(x.name)).join(' · ') || esc(f.name)}</span></div>`; }).join('')}</div>` : '';
    const photo = p.photo ? `<div class="ml-photo"><img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy"><button class="ml-mini" data-act="photo" data-v="${esc(p.name)}" title="사진 바꾸기">📷</button></div>` : `<button class="ml-photo empty" data-act="photo" data-v="${esc(p.name)}">📷<small>사진 붙이기</small></button>`;
    const elev = `<div class="ml-bld${lift ? '' : ' nolift'}">${lift}${photo}</div>`;
    const acts = isHere ? [Object.keys(p.rest).length || p.kind === 'home' ? btn(`🛏 쉬기 <small>${esc(fxTxt(p.rest) || '에너지+')}</small>`, 'say', '잠깐 쉰다.', 'xs') : '', p.kind === 'bath' || p.kind === 'home' ? btn('🫧 씻기 <small>위생+60</small>', 'say', '씻는다.', 'xs') : '', p.kind === 'work' ? btn('💼 일하기 <small>에너지−6/시간</small>', 'say', '일을 시작한다.', 'xs') : ''].join('') : btn(`🚶 ${esc(p.name)}(으)로 가기`, 'say', `${p.name}(으)로 간다.`, 'xs');
    return `<div class="ml-rc ml-place"><div class="ml-rc-h"><span class="ml-face">${PLACE_KINDS[p.kind]}</span><b>${esc(p.name)}</b>${p.line ? `<span class="ml-pill">${esc(p.line)}</span>` : ''}${isHere ? '<span class="ml-pill good">지금 여기</span>' : ''}</div>${L.join('')}${goods && vis('map', 'goods') ? `<h4 class="ml-h4">물가</h4><div class="ml-goods">${goods}</div>` : ''}${vis('map', 'building') ? `<h4 class="ml-h4">${fl.length ? '건물 안' : '사진'}</h4>${elev}` : ''}<div class="ml-acts">${acts}</div></div>`;
}
// ───── 달력 · 시간 · 날씨 ─────
function upcoming(r) {
    const { book, S } = r, out = [];
    for (const p of S.promises.filter(q => !q.done)) out.push({ t: p.due, icon: '🤝', text: p.text });
    for (const [n, x] of Object.entries(S.rel)) { const d = personOf(book, n)?.day || x.day; if (d) { const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(d); if (m) out.push({ icon: '🎂', text: `${n} · ${d}`, t: null, md: `${m[1]}/${m[2]}` }); } }
    return out;
}
// ───── 📅 달력 (dev 월 화면 기준): 오늘 · 시간 넘기기 · 날씨 · 월 달력(점) · 날짜 누르면 그날 일정 · 일정 추가 · 이 날로 이동 ─────
let calView = null, calDay = null;
export const setCal = (k, v) => { if (k === 'nav') { calView.m += v; if (calView.m < 1) { calView.m = 12; calView.y--; } if (calView.m > 12) { calView.m = 1; calView.y++; } calDay = null; } if (k === 'day') calDay = v; if (k === 'today') { calView = null; calDay = null; } };
const SEASON = (m) => (m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을');
function eventsOnDay(r, y, m, d) {
    const { book, S } = r, out = [], st = book.world.start;
    const day = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(st.y, st.m - 1, st.d)) / 86400000);
    for (const p of S.promises) if (p.due != null && Math.floor(p.due / DAY) === day) out.push({ icon: p.done ? '✅' : '🤝', text: p.text, i: p.i });
    for (const p of book.people) { const md = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || S.rel[p.name]?.day || ''); if (md && Number(md[1]) === m && Number(md[2]) === d) out.push({ icon: '🎂', text: `${p.name} · ${p.day}` }); }
    const me = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(book.me.day || ''); if (me && Number(me[1]) === m && Number(me[2]) === d) out.push({ icon: '🎉', text: '내 생일' });
    if (day >= 0) { const ev = worldEvent(day); if (ev) out.push({ icon: '🎪', text: ev.text }); }
    return { out, day };
}
function cal(r) {
    const { book, S } = r, now = dateOf(book.world.start, S.t), today = Math.floor(S.t / DAY);
    calView ??= { y: now.y, m: now.m };
    const { y, m } = calView, days = new Date(Date.UTC(y, m, 0)).getUTCDate(), first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    let h = `<div class="ml-today"><div class="ml-hero-d"><small>${now.m}월</small><b>${now.d}</b><small>${now.w}요일</small></div><div class="ml-hero-b"><small>오늘 · ${SEASON(now.m)}</small><b>${dateText(book.world.start, S.t)}</b><span>🌦 ${esc(S.weather || '-')} ${btn('날씨', 'c-wx', '', 'xs')}</span></div></div>`;
    h += `<div class="ml-timebar">${btn(`⏭ ${slotName(S.t + 180) !== slotName(S.t) ? slotName(S.t + 180) : '다음 시간대'}`, 'c-time', 'next', 'xs')}${btn('+1시간', 'c-time', '+1h', 'xs')}${btn('☀️ 다음 날 아침', 'c-time', '+1d', 'xs')}${btn('🕰 시각 맞추기', 'c-time', 'set', 'xs')}</div>`;
    const cells = []; for (let k = 0; k < first; k++) cells.push('<div class="ml-cc x"></div>');
    for (let d = 1; d <= days; d++) { const { out, day } = eventsOnDay(r, y, m, d); cells.push(`<button class="ml-cc${day === today ? ' today' : ''}${calDay === d ? ' sel' : ''}${day < today ? ' past' : ''}" data-act="c-day" data-v="${d}"><span>${d}</span>${out.length ? `<i>${out.slice(0, 3).map(() => '<b></b>').join('')}</i>` : ''}</button>`); }
    h += `<div class="ml-calh">${btn('‹', 'c-nav', '-1', 'xs')}<b>${y}년 ${m}월</b>${btn('›', 'c-nav', '1', 'xs')}${y !== now.y || m !== now.m ? btn('오늘', 'c-today', '', 'xs') : ''}</div><div class="ml-calg">${'일월화수목금토'.split('').map(w => `<div class="ml-cw">${w}</div>`).join('')}${cells.join('')}</div>`;
    if (calDay) {
        const { out, day } = eventsOnDay(r, y, m, calDay);
        h += `<div class="ml-rc ml-calday"><div class="ml-rc-h"><b>${m}월 ${calDay}일</b><span class="ml-sp"></span>${btn('✕', 'c-day', '', 'xs')}</div>${out.map(e => `<div class="ml-rl${e.i != null ? ' tap' : ''}"${e.i != null ? ` data-act="jump" data-v="${e.i}"` : ''}><i>${e.icon}</i>${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>일정 없음</div>'}<div class="ml-acts">${btn('＋ 이 날 일정', 'c-add', `${m}/${calDay}`, 'xs')}${day > today ? btn('⏩ 이 날로 시간 이동', 'c-go', `${m}/${calDay}`, 'xs') : ''}</div></div>`;
    } else h += '<div class="ml-hint">날짜를 누르면 그날 일정을 보고 추가할 수 있어요.</div>';
    const month = []; for (let d = 1; d <= days; d++) for (const e of eventsOnDay(r, y, m, d).out) month.push([d, e]);
    h += `<h4 class="ml-h4">이달 일정 <span>${month.length}</span></h4>${month.map(([d, e]) => `<div class="ml-rl tap" data-act="c-day" data-v="${d}"><i>${e.icon}</i><b>${d}일</b> ${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>이 달엔 일정이 없어요</div>'}`;
    const up = []; for (let k = 0; k <= 30; k++) { const dt = dateOf(book.world.start, (today + k) * DAY); for (const e of eventsOnDay(r, dt.y, dt.m, dt.d).out) up.push([k, e]); }
    h += `<h4 class="ml-h4">다가오는 일정 <span>30일</span></h4>${up.slice(0, 8).map(([k, e]) => `<div class="ml-rl"><i>${e.icon}</i><b class="${k === 0 ? 'neg' : ''}">${k === 0 ? '오늘' : `D-${k}`}</b> ${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>30일 안에 일정이 없어요</div>'}`;
    return h;
}
// ───── 세계 소식: 화면 밖 생활 · 속셈 · 기념일 · 하루 사건 (AI 0회) ─────
function news(r) {
    const { book, S } = r, L = [];
    const ev = worldEvent(Math.floor(S.t / DAY)); if (ev) L.push(row({ icon: '🎪', title: esc(ev.name), sub: esc(ev.text) }));
    for (const n of S.news.slice(0, 20)) L.push(row({ icon: n.icon, title: esc(n.text), sub: dateText(book.world.start, n.t, false) }));
    for (const [n, x] of Object.entries(S.rel)) if (x.want && !x.gone) L.push(row({ icon: '🎯', title: `${esc(n)}의 속셈`, sub: esc(x.want), faint: true }));
    return L.length ? card('세계 소식', L.join('')) : empty('조용한 하루예요.');
}
// ───── 기록 · 되돌아보기 (채팅 메시지에서 매번 만든다) ─────
const REC_F = [['all', '전체'], ['need', '수치'], ['cash', '돈'], ['item', '물건'], ['rel', '관계'], ['loc', '장소'], ['status', '딱지']];
let recF = 'all';
export const setRecFilter = (v) => { recF = v; };
function rec(r) {
    const { book } = r, chat = ctx().chat ?? [], meta = getMeta();
    const L = [];
    for (let i = chat.length - 1; i >= 0 && L.length < 120; i--) for (const c of r.changes[i] ?? []) {
        if (c.src === 'time') continue;
        if (recF !== 'all' && !c.f.startsWith(recF) && !(recF === 'rel' && (c.f.startsWith('stage') || c.f.startsWith('npc') || c.f.startsWith('gone')))) continue;
        L.push(row({ icon: c.icon, title: `${esc(c.label)} ${typeof c.to === 'number' && typeof c.from === 'number' ? signed(c.to - c.from) : `→ ${esc(c.to)}`}`, sub: `${esc(c.why)} · #${i}${c.src === 'hand' ? ' · ✋' : c.src === 'meddle' ? ' · ✍' : ''}`, act: 'jump', data: i, faint: c.sure === false }));
    }
    // 하이라이트: 수치마다 최저 · 최고 · 가장 크게 변한 날
    const hi = [];
    for (const n of book.me.needs) {
        let lo = null, top = null, big = null;
        r.needsAt.forEach((s, i) => { const v = s?.[n.key]; if (v == null) return; if (!lo || v < lo.v) lo = { v, i }; if (!top || v > top.v) top = { v, i }; });
        (r.changes ?? []).forEach((ch, i) => { const d = (ch ?? []).filter(c => c.f === `need.${n.key}` && c.src !== 'time').reduce((a, c) => a + c.to - c.from, 0); if (d && (!big || Math.abs(d) > Math.abs(big.d))) big = { d, i }; });
        if (lo) hi.push(row({ icon: n.icon, title: esc(n.name), sub: `최저 ${Math.round(lo.v)} (#${lo.i}) · 최고 ${Math.round(top.v)} (#${top.i})${big ? ` · 가장 크게 ${signed(big.d)} (#${big.i})` : ''}`, value: graph(r, n.key) }));
    }
    const marks = (meta.marks ?? []).map(m => ({ ...m, i: chat.findIndex(x => msgKey(x) === m.key) })).filter(m => m.i >= 0);
    const RF = REC_F.filter(([k]) => ({ need: 'stats', cash: 'wallet', item: 'wallet', rel: 'rel', loc: 'map', status: 'stats' }[k] ?? null) == null || modOn({ need: 'stats', cash: 'wallet', item: 'wallet', rel: 'rel', loc: 'map', status: 'stats' }[k]));
    const SV = meta.saves ?? [];
    const saves = `<h4 class="ml-h4">💾 세이브 <span>5칸 · 채팅 글은 그대로 · 불러오면 그 상태로 이어서</span></h4><div class="ml-saves">${[0, 1, 2, 3, 4].map(k => { const x = SV[k]; return x ? `<div class="ml-save"><b>${esc(x.name)}</b><small>${esc(x.when)} · #${x.i}</small><span>${btn('불러오기', 'sv-load', k, 'xs')}${btn('덮어쓰기', 'sv-save', k, 'xs')}<button class="ml-mini" data-act="sv-del" data-v="${k}">🗑</button></span></div>` : `<button class="ml-save empty" data-act="sv-save" data-v="${k}">＋ ${k + 1}번 칸에 저장</button>`; }).join('')}${meta.autoSave ? `<div class="ml-save auto"><b>⏮ 자동 세이브</b><small>${esc(meta.autoSave.why)} · ${esc(meta.autoSave.when)}</small><span>${btn('되돌리기', 'sv-load', 'auto', 'xs')}</span></div>` : ''}</div>`;
    return saves + `<div class="ml-tools">${seg('recf', RF, recF)}${btn('⭐ 마지막 답 책갈피', 'mark')}${btn('🕰 그때 상태 보기', 'past')}</div>` + card('책갈피', marks.map(m => row({ icon: '⭐', title: esc(m.name), sub: `#${m.i}`, act: 'jump', data: m.i, more: true })).join('')) + card('하이라이트', hi.join('')) + card('타임라인', L.join('') || row({ title: '아직 기록이 없어요', faint: true }));
}
function graph(r, key) {
    const pts = []; r.needsAt.forEach((s, i) => { if (s?.[key] != null && (i === 0 || r.changes[i]?.length)) pts.push([i, s[key]]); });
    if (pts.length < 2) return '';
    const P = pts.slice(-40), x0 = P[0][0], x1 = P[P.length - 1][0] || 1;
    const X = (i) => ((i - x0) / Math.max(1, x1 - x0) * 100).toFixed(1), Y = (v) => (30 - v * 0.3).toFixed(1);
    return `<svg class="ml-graph" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${P.map(([i, v]) => `${X(i)},${Y(v)}`).join(' ')}"/>${P.map(([i, v]) => `<circle class="tap" cx="${X(i)}" cy="${Y(v)}" r="2.2" data-act="jump" data-v="${i}"><title>#${i} · ${Math.round(v)}</title></circle>`).join('')}</svg>`;
}
// ───── 속마음 · 관전자 · 세포 (본편 답에 같이 적힌 것만) ─────
function mind(r) {
    const { S } = r, meta = getMeta(), who = meta.mindWho ?? ['cast'];
    const tools = `<div class="ml-tools">${[['cast', '장면 속 인물'], ['watch', '관전자'], ['cell', '세포들']].map(([k, l]) => `<button class="ml-btn sm${who.includes(k) ? ' on' : ''}" data-act="mindwho" data-v="${k}">${l}</button>`).join('')}</div>`;
    const sec = (t, o, ic) => card(t, Object.entries(o).map(([n, v]) => row({ icon: S.rel[n] ? personOf(r.book, n)?.face || '🙂' : ic, title: esc(n), sub: esc(v) })).join(''));
    const h = sec('속마음', S.mind, '💭') + sec('관전자', S.watch, '👀') + sec('세포들', S.cell, '🧠');
    return tools + (h || empty('다음 답부터 같이 적혀요.'));
}
// ───── 내 탭 (+ 최면 어플 템플릿) ─────
const TEMPLATES = { hypno: { name: '최면 어플', icon: '🌀', fields: [{ name: '최면 깊이', max: 100, stages: [30, 70] }, { name: '대상', max: 0 }, { name: '명령', max: 0 }] } };
function custom(r) {
    const tabs = getMeta().custom ?? [];
    let h = '';
    for (const [ti, t] of tabs.entries()) {
        h += card(`${esc(t.icon || '🧩')} ${esc(t.name)}`, t.fields.map(f => { const v = r.S.custom[t.name]?.[f.name] ?? f.start ?? '-'; const n = Number(v); const st = f.max && Number.isFinite(n) ? (n >= (f.stages?.[1] ?? 70) ? '높음' : n >= (f.stages?.[0] ?? 30) ? '보통' : '낮음') : ''; return row({ icon: '•', title: esc(f.name), sub: st, value: f.max && Number.isFinite(n) ? `${bar(n / f.max * 100)}<b class="ml-num">${n}</b>` : esc(v) }); }).join(''), `<a data-act="ctab-del" data-v="${ti}">지우기</a>`);
    }
    return h + `<div class="ml-acts">${btn('＋ 새 탭', 'ctab-new')}${btn('🌀 최면 어플 템플릿', 'ctab-tpl', 'hypno')}</div><div class="ml-hint">AI는 「custom: 탭 | 칸 | 값」으로 적어요</div>`;
}
// ───── 📘 설정집 ─────
function book(r) {
    const b = r.book;
    let h = `<div class="ml-hint">본편에는 영향 없음 · 상태창을 만들고 계산할 때 긴 로어북 대신 이걸 봅니다</div>`;
    h += card('세계', row({ icon: '🌍', title: esc(b.world.genre || '장르 없음'), sub: `${esc(b.world.currency)} · 식사 ≈ ${b.world.meal} · ${b.world.weather.map(esc).join('/')}`, act: 'bk-world', more: true }) + row({ icon: '📍', title: `장소 ${b.world.places.length}곳`, sub: b.world.places.map(p => esc(p.name)).join(' · '), act: 'bk-places', more: true }), `약 ${bookTokens(b)}토큰`);
    h += card('나', row({ icon: '🧍', title: esc(b.me.name || userName()), sub: b.me.needs.map(n => `${n.icon}${esc(n.name)} −${n.rate}/h`).join(' · '), act: 'bk-me', more: true }));
    h += card('인물', b.people.map(p => row({ icon: p.face, title: esc(p.name), sub: esc(p.line || '성격 비어 있음'), value: `<small>${personTokens(b, p)}t</small>`, act: 'bk-person', data: p.name, more: true })).join('') || row({ title: '아직 없어요', faint: true }), `인물당 ${LIMIT.lines}줄까지`);
    h += `<div class="ml-acts">${btn('＋ 인물', 'bk-person', '')}${btn('🔄 로어북에서 다시 채우기', 'bk-refill')}</div>`;
    return h;
}
// ───── 🎚 영향력 게이지 ─────
const GAUGE_DO = {
    stats: ['상태창에만', '경계를 넘은 턴에 증상 한 줄', '위험 · 주의 증상 + 상태 딱지 이름', '+ 위험이면 주사위 보정이 실제로 적용', '+ 설렘처럼 사건을 먼저 만들게 함'],
    wallet: ['상태창에만', '(없음)', '가진 돈 · 물건 · 착용 중', '+ 「돈보다 많이 못 씀 · 없는 물건 못 씀」', '+ 가게 · 물가 사건'],
    rel: ['상태창에만', '빠진 사람 · 단계가 바뀐 순간', '장면 인물의 단계 · 기억 · 질투 · 티 나는 반응', '+ 「이 단계를 넘는 행동 금지」', '+ 가끔 설렘 한 스푼'],
    map: ['상태창에만', '(없음)', '지금 장소 · 같이 있는 사람', '(2와 같음)', '(2와 같음)'],
    calendar: ['상태창에만', '하루 안 남은 약속', '날짜 · 시간 · 날씨 · 오늘 사건', '(2와 같음)', '(2와 같음)'],
    dice: ['보정 없이 굴림', '(0과 같음)', '(0과 같음)', '상태 보정(욕구 위험 · 딱지 · 운세)이 굴림에 적용', '(3과 같음)'],
    news: ['상태창에만', '(없음)', '(없음)', '(없음)', '(없음)'],
    mind: ['속마음 안 받음', '속마음을 답에 같이 적게 함', '(1과 같음)', '(1과 같음)', '(1과 같음)'],
    quote: ['상태창에만', '본편에 한 번 녹이기', '(1과 같음)', '(1과 같음)', '(1과 같음)'],
};
function gauge() {
    const g = gaugeCfg(), meta = getMeta();
    let h = `<div class="ml-tools">${Object.entries(PRESETS).map(([k, p]) => btn(p.name, 'preset', k, 'sm')).join('')}</div>`;
    h += card('전체', slider('all', g.all ?? 2), `${seg('scope', [['chat', '이 채팅만'], ['all', '전체 기본값']], meta.influence ? 'chat' : 'all')}`);
    h += card('기능별 <span>이름을 누르면 단계별 동작</span>', GAUGES.map(x => slider(x.id, level(x.id), x.name)).join(''));
    // 지금 본편에 실제로 가는 글 (결과값만)
    const P = window.__prompts ?? null, inj = app.lastInj?.() ?? {};
    const parts = [['rule', '적는 법 (규칙)', inj.rule], ['facts', '지금 사실', inj.facts], ['hint', '연출 힌트', inj.hint]].filter(([, , t]) => t);
    h += `<h4 class="ml-h4">지금 본편에 가는 글 <span>결과값만 · 이번 턴 ≈${parts.reduce((a, [, , t]) => a + tokens(t), 0)}토큰</span></h4>${parts.map(([k, n, t]) => `<details class="ml-inj"${k !== 'rule' ? ' open' : ''}><summary>${n} <small>≈${tokens(t)}토큰</small></summary><pre>${esc(t)}</pre></details>`).join('') || '<div class="ml-rl dim"><i>·</i>지금은 아무것도 안 가요 (일시정지 · 건너뛰기 · 0단계)</div>'}`;
    return h;
}
export function gaugeTable(id) {
    const x = GAUGES.find(q => q.id === id); if (!x) return;
    sheet(`🎚 ${esc(x.name)} 단계별 동작`, `<div class="ml-card">${LEVELS.map(l => row({ icon: `<b>${l.n}</b>`, title: l.name, sub: esc(GAUGE_DO[id]?.[l.n] ?? l.what), value: level(id) === l.n ? '<span class="ml-pill love">지금</span>' : '' })).join('')}</div><div class="ml-hint">숫자 · 보정 같은 중간값은 어느 단계에서도 본편에 안 가요.</div>`);
}
const slider = (id, v, name = '전체') => { const c = levelCost(v); return `<div class="ml-gauge"><div class="ml-gauge-h"><b${id !== 'all' ? ` class="tap" data-act="g-table" data-v="${id}"` : ''}>${esc(name)}${id !== 'all' ? ' ⓘ' : ''}</b><span class="ml-pill ${v >= 3 ? 'love' : ''}">${v} · ${LEVELS[v].name}</span><small>주입 ≈${c.tok}토큰 · 추가 호출 ${c.calls}회</small></div><input type="range" class="ml-range" min="0" max="4" step="1" value="${v}" data-gauge="${id}"><div class="ml-gauge-t">${LEVELS.map(l => `<span class="${l.n === v ? 'on' : ''}">${l.name}</span>`).join('')}</div></div>`; };

export { upcoming, lastAI, relCard };
function music(r) {
    const { S } = r, last = r.changes[lastAI()] ?? [], tg = moodTags(r, last), m = pickMusic(tg, settings().musicTaste);
    const why = tg.map(t => MOOD_KO[t] ?? t);
    let h = `<div class="ml-scene tap" data-act="music" data-v="${esc(S.bgm || m.query)}"><i>🎵</i><span><b>${esc(S.bgm || m.label)}</b><small>${S.bgm ? '이번 답에 나온 곡' : '지금 장면에 맞춰 고름'}</small></span><em>▶</em></div>`;
    h += `<h4 class="ml-h4">왜 이 곡</h4><div class="ml-chips">${why.map(w => `<span class="ml-chip">${esc(w)}</span>`).join('')}</div>`;
    h += `<h4 class="ml-h4">다른 분위기</h4>${['love', 'calm', 'tired', 'rain', 'festive', 'conflict'].filter(t => !tg.includes(t)).slice(0, 4).map(t => { const x = pickMusic([t], settings().musicTaste); return `<div class="ml-rl tap" data-act="music" data-v="${esc(x.query)}"><i>🎧</i>${esc(x.label)} <span>${esc(MOOD_KO[t])}</span></div>`; }).join('')}`;
    h += `<h4 class="ml-h4">어디서 틀까</h4><div class="ml-picks">${[['youtube', 'YouTube'], ['spotify', 'Spotify']].map(([k, n]) => `<button class="ml-btn xs${settings().musicApp === k ? ' on' : ''}" data-act="musicapp" data-v="${k}">${n}</button>`).join('')}</div>`;
    return h;
}
function quote(r) {
    const { S } = r, meta = getMeta(), tg = moodTags(r, r.changes[lastAI()] ?? []), q = pickQuote(tg, meta.recent?.quote ?? [], S.turn);
    return `<div class="ml-qcard"><b>${esc(q.text)}</b><p>${esc(q.mean)}</p><small>— ${esc(q.src)}</small></div><div class="ml-hint">AI가 고르지 않아요. 확인된 구절 ${QN}개 중에서 지금 분위기(${tg.map(t => MOOD_KO[t] ?? t).join(' · ')})로 골라요. 영향력을 올리면 대사나 내레이션에 한 번 녹아들어요.</div>`;
}
export const RENDER = { music, quote, now, dice, bag, rel, map, cal, news, rec, mind, custom, book, gauge };

// ───── 누르기 ─────
export async function onAct(act, v, el) {
    const meta = getMeta(), r = fold();
    switch (act) {
        case 'say': putInput(v); app.closeSheet?.(); return;
        case 'music': window.open(settings().musicApp === 'spotify' ? `https://open.spotify.com/search/${encodeURIComponent(v)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(v)}`, '_blank'); return;
        case 'quote': { sheet('한 구절', `<p class="ml-quote">${esc(v).replace(/\n/g, '<br>')}</p>`); const t = el?.querySelector('b')?.textContent; if (t) { meta.recent.quote = [t, ...(meta.recent.quote ?? [])].slice(0, 8); saveMeta(); } return; }
        case 'person': personSheet(r, v); return;
        case 'mapsel': setMapSel(v); app.refresh?.(); return;
        case 'photo': { const url = await pickPhoto(); if (url == null) return; const pl = placeOf(meta.book, v); if (!pl) return; pl.photo = url; saveMeta(); app.refresh?.(true); toast(url ? '사진을 붙였어요' : '사진을 뺐어요'); return; }
        case 'packget': {
            const m = await import('./mascot.js'); el?.classList.add('loading'); if (el) el.textContent = '';
            const ok = await m.packDownload((i, n) => { if (el) el.style.setProperty('--pct', `${Math.round(i / n * 360)}deg`); });
            settings().conPack = ok > 0; saveSettings(); toast(ok ? `🐱 미트볼콘 ${ok}개 받았어요` : '받지 못했어요. 인터넷 연결을 확인해 주세요', ok ? 'good' : 'bad'); app.refresh?.(); return;
        }
        case 'packoff': settings().conPack = false; if (String(settings().mascotPick).startsWith('pack:')) settings().mascotPick = 'idle'; saveSettings(); app.refresh?.(); return;
        case 'catpick': settings().mascotPick = v; saveSettings(); (await import('./mascot.js')).playMascotSound(); app.refresh?.(); return;
        case 'catsound': settings().mascotSound = v; saveSettings(); (await import('./mascot.js')).playMascotSound(); app.refresh?.(); return;
        case 'musicapp': settings().musicApp = v; saveSettings(); app.refresh?.(); return;
        case 'install': case 'uninstall': {
            const a = (await import('./home.js')).appOf(v); if (!a?.mod) return;
            if (act === 'install') { el?.classList.add('loading'); el && (el.textContent = ''); await new Promise(res => setTimeout(res, 700)); }
            meta.mods[a.mod] = act === 'install'; saveMeta(); app.refresh?.(); toast(act === 'install' ? `${a.icon} ${a.name} 받았어요` : `${a.name} 지웠어요`); return;
        }
        case 'luckroll': {
            const T = myTraits(meta.book), r1 = 1 + Math.floor(Math.random() * 20), r2 = 1 + Math.floor(Math.random() * 20);
            const d = T.some(t => t.luck === 'best') ? Math.max(r1, r2) : T.some(t => t.luck === 'worst') ? Math.min(r1, r2) : r1;
            meta.luckRoll = { day: Math.floor(r.S.t / DAY), d, two: T.some(t => t.luck) ? [r1, r2] : null }; saveMeta();
            toast(`🎲 ${d}${d === 20 ? ' · 대길!' : d === 1 ? ' · 대흉…' : ''}`, d >= 11 ? 'good' : 'bad'); app.refresh?.(); return;
        }
        case 'g-table': return gaugeTable(v);
        case 'c-nav': setCal('nav', Number(v)); app.refresh?.(); return;
        case 'c-today': setCal('today'); app.refresh?.(); return;
        case 'c-day': setCal('day', v ? Number(v) : null); app.refresh?.(); return;
        case 'c-time': {
            if (v === 'set') { const fv = await form('🕰 시각 맞추기', [{ k: 't', label: '시각', ph: '14:30 · 오후 2시', chips: ['07:00', '12:00', '18:00', '22:00'] }]); if (!fv?.t.trim()) return; return hand(`time: ${fv.t.trim()}`, '직접 시간 맞춤'); }
            if (v === '+1d') { // 다음 날 아침 8시까지 — 그 사이 밤잠(최대 8시간)은 자는 것으로
                const cur = r.S.t % DAY, m = (DAY - cur) + 480, sleep = Math.min(480, m), awake = m - sleep;
                return handLines([...(awake > 0 ? [`pass: ${awake}분`] : []), `slept: ${sleep}분`], '다음 날 아침으로');
            }
            return hand(v === 'next' ? `time: ${slotName(r.S.t + 180)}` : 'time: +1h', '직접 시간 넘김');
        }
        case 'c-wx': { const fv = await form('🌦 날씨', [{ k: 'w', label: '날씨', type: 'pick', v: r.S.weather, opts: [...new Set([...meta.book.world.weather, '맑음', '흐림', '비', '눈', '안개'])].map(w => [w, w]) }]); if (!fv?.w || fv.w === r.S.weather) return; return hand(`weather: ${fv.w}`, '직접 바꿈'); }
        case 'c-add': { const fv = await form(`📅 ${v} 일정`, [{ k: 't', label: '일정', ph: 'Leon과 저녁 식사', chips: ['약속', '시험', '마감', '생일 파티'] }]); if (!fv?.t.trim()) return; return hand(`promise: ${fv.t.trim()} | ${v}`, '일정 추가'); }
        case 'c-go': return hand(`date: ${v}`, '이 날로 이동');
        case 'askprice': {
            const fv = await form('💬 물가 물어보기', [{ k: 'q', label: '무엇?', ph: '빵 · 여관 하룻밤 · 칼 · 마차', chips: ['커피', '하룻밤 숙박', '옷 한 벌', '무기', '꽃다발'] }], { ok: '어림하기' }); if (!fv?.q.trim()) return;
            const q = fv.q.trim(), b = meta.book, meal = b.world.meal, cur = b.world.currency;
            const known = b.world.places.flatMap(p => p.goods.filter(g => norm(g.name).includes(norm(q)) || norm(q).includes(norm(g.name))).map(g => `${p.name} ${g.name} ${g.price}${cur}`));
            const RATIO = [[/커피|음료|차|물|우유|주스/, 0.3, '음료'], [/빵|간식|과자|사탕|떡/, 0.4, '간식'], [/식사|밥|정식|요리|도시락/, 1, '한 끼'], [/술|맥주|와인/, 0.6, '술 한 잔'], [/숙박|하룻밤|방|여관|호텔/, 4, '하룻밤'], [/옷|신발|모자|외투/, 3, '옷'], [/꽃/, 0.5, '꽃'], [/책/, 1.5, '책'], [/칼|검|활|무기|창|도끼/, 8, '무기'], [/갑옷|방패/, 12, '방어구'], [/약|포션|물약/, 2, '약'], [/마차|기차|버스|택시|배/, 1, '탈것 한 번'], [/말|탈것|차$/, 60, '탈것 사기'], [/집|땅/, 2000, '집']];
            const hit = RATIO.find(([re]) => re.test(q));
            sheet(`💬 ${esc(q)}`, `<div class="ml-card">${known.length ? known.map(k => row({ icon: '🛒', title: esc(k), sub: '설정집에 있는 값' })).join('') : ''}${row({ icon: '🧮', title: hit ? `약 ${Math.max(1, Math.round(meal * hit[1]))}${esc(cur)}` : `약 ${meal}~${meal * 3}${esc(cur)}`, sub: hit ? `${hit[2]} · 식사 한 끼(${meal}) × ${hit[1]}` : '비슷한 게 없어서 식사 1~3끼로 어림' })}</div><div class="ml-hint">계산만 해요. 실제 값은 이야기에서 정해져요.</div>`);
            return;
        }
        case 'look-set': { const [k, x] = v.split('|'); settings().look[k] = x; saveSettings(); app.applyLook?.(); app.refresh?.(); return; }
        case 'look-reset': settings().look = { ...(await import('../base/st.js')).DEFAULTS.look }; saveSettings(); app.applyLook?.(); app.refresh?.(); return;
        case 'dset': { const [k, x] = v.split(':'); setDice(k, k === 'dc' ? Number(x) : x); app.refresh?.(); return; }
        case 'rollattr': setDice('attr', v); app.openSheet?.('dice'); return;
        case 'roll': {
            const mod = Number(v), d = 1 + Math.floor(Math.random() * 20), tot = d + mod;
            const T = myTraits(meta.book), fum = Math.max(1, ...T.map(t => t.fumble ?? 1)), calm = T.some(t => t.noFumble);
            const res = d === 20 ? '대성공' : d <= fum && !calm ? '대실패' : tot >= diceSel.dc ? '성공' : '실패';
            const text = `(🎲 ${diceSel.attr} 판정: d20 ${d}${mod ? ` ${signed(mod)}` : ''} = ${tot} vs ${diceSel.dc} → ${res})`;
            document.querySelectorAll('.ml-d20').forEach(x => x.classList.add('spin')); await new Promise(res => setTimeout(res, 650));
            meta.recent.rolls = [{ text, res, d, tot, at: Date.now() }, ...(meta.recent.rolls ?? [])].slice(0, 5); saveMeta();
            toast(`${res}! ${d}${mod ? signed(mod) : ''} = ${tot}`, res.includes('성공') ? 'good' : 'bad'); putInput(text); app.refresh?.(); return;
        }
        case 'edit-val': {
            const [kind, key] = v.split('|'); let cur = 0, label = key, line = '';
            if (kind === 'need') { const n = meta.book.me.needs.find(x => x.key === key); cur = Math.round(r.S.needs[key]); label = `${n.icon} ${n.name}`; line = n.name; }
            if (kind === 'gauge') { const g = meta.book.me.gauges.find(x => x.key === key); cur = r.S.gauges[key]; label = g.name; line = g.name; }
            if (kind === 'aff' || kind === 'trust') { cur = r.S.rel[key]?.[kind]; label = `${key} ${kind === 'aff' ? '애정' : '우정'}`; }
            const fv = await form(`✏️ ${esc(label)} 고치기`, [{ k: 'n', label: '값', type: 'number', v: cur, chips: ['0', '50', '100'] }, { k: 'why', label: '이유', ph: '직접 고침', chips: ['계산이 틀림', '이야기와 안 맞음', '되돌림'] }]);
            if (!fv || fv.n === '') return; const d = num(fv.n) - num(cur); if (!d) return;
            hand(kind === 'aff' || kind === 'trust' ? `${kind}: ${key} ${d > 0 ? '+' : ''}${d}` : `${line}: ${d > 0 ? '+' : ''}${d}`, fv.why || '직접 고침'); return;
        }
        case 'gstep': { const [g, d] = v.split(':'); hand(`${g}: ${Number(d) > 0 ? '+' : ''}${d}`, '직접'); return; }
        case 'jump': app.jump?.(Number(v)); return;
        case 'tab-book': app.openSheet?.('book'); return;
        case 'undo': { const [i, j] = v.split(':').map(Number); const m = ctx().chat[i], sl = slot(m, true); if (!sl.ops && j < 1000) sl.ops = (await import('../rules/tags.js')).readOps(m.mes); sl.undo = [...new Set([...(sl.undo ?? []), j])]; sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); ctx().saveChatDebounced?.(); app.refresh?.(); toast('되돌렸어요'); return; }
        case 'flagfix': hand(v, '어긋남 고침'); return;
        case 'flagok': { const [i] = v.split(':').map(Number); const m = ctx().chat[i], sl = slot(m, true); sl.flagOk = true; sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); ctx().saveChatDebounced?.(); app.refresh?.(); return; }
        case 'sv-save': {
            const k = Number(v), i = (ctx().chat ?? []).length;
            const fv = await form(`💾 ${k + 1}번 칸`, [{ k: 'name', label: '이름', v: meta.saves?.[k]?.name ?? '', ph: '고백 직전', chips: ['고백 직전', '큰 싸움 전', '여행 출발', '시험 전날'] }]); if (!fv) return;
            (meta.saves ??= [])[k] = { name: short(fv.name || `세이브 ${k + 1}`, 24), when: dateText(r.book.world.start, r.S.t), i, full: structuredClone(r.S), book: structuredClone(meta.book) };
            saveMeta(); app.refresh?.(); toast('💾 저장했어요', 'good'); return;
        }
        case 'sv-load': {
            const x = v === 'auto' ? meta.autoSave : meta.saves?.[Number(v)]; if (!x) return;
            if (v !== 'auto') meta.autoSave = { why: '불러오기 전', when: dateText(r.book.world.start, r.S.t), full: structuredClone(r.S), book: structuredClone(meta.book), startAt: meta.startAt ?? 0, start: structuredClone(meta.start ?? null) };
            if (v === 'auto' && x.start !== undefined) { meta.start = x.start; meta.startAt = x.startAt; }
            else { meta.start = { full: structuredClone(x.full), name: x.name }; meta.startAt = (ctx().chat ?? []).length; }
            meta.book = structuredClone(x.book); saveMeta(); app.refresh?.(true); toast(`💾 「${x.name ?? '자동 세이브'}」 상태로 이어서 해요`, 'good'); return;
        }
        case 'sv-del': meta.saves[Number(v)] = null; saveMeta(); app.refresh?.(); return;
        case 'mark': { const i = lastAI(); if (i < 0) return; const fv = await form('⭐ 책갈피', [{ k: 'name', label: '이름', v: '', ph: short(ctx().chat[i].mes, 20), chips: ['고백 직전', '첫 만남', '큰 싸움', '중요한 선택'] }]); const name = fv?.name?.trim() || (fv ? short(ctx().chat[i].mes, 20) : ''); if (!name) return; meta.marks = [...(meta.marks ?? []).filter(m => m.key !== msgKey(ctx().chat[i])), { key: msgKey(ctx().chat[i]), name: short(name, 30) }]; saveMeta(); app.refresh?.(); return; }
        case 'past': { const ais = (ctx().chat ?? []).map((m, k) => [k, m]).filter(([, m]) => !m.is_user && !m.is_system).slice(-12).reverse(); const fv = await form('🕰 그때 상태 보기', [{ k: 'i', label: '어느 답의 시점?', type: 'pick', v: ais[0]?.[0], opts: ais.map(([k, m]) => [k, `#${k} ${esc(short(m.mes, 14))}`]) }], { ok: '보기' }); if (!fv) return; const i = Number(fv.i); if (!(i >= 0)) return; app.openPast?.(i); return; }
        case 'mindwho': { const w = new Set(meta.mindWho ?? ['cast']); w.has(v) ? w.delete(v) : w.add(v); meta.mindWho = [...w]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-tpl': { const t = structuredClone(TEMPLATES[v]); meta.custom = [...(meta.custom ?? []), t]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-new': { const fv = await form('🧩 새 탭', [{ k: 'name', label: '탭 이름', ph: '예: 마력 수련' }, { k: 'icon', label: '아이콘', v: '🧩', chips: ['🧩', '🌀', '⚔️', '📚', '💼', '🔮'] }, { k: 'f', label: '칸 (쉼표로)', v: '점수/100, 메모', hint: '숫자 칸은 이름 뒤에 /최대값' }]); if (!fv?.name) return; const name = fv.name, f = fv.f; meta.custom = [...(meta.custom ?? []), { name: short(name, 12), icon: '🧩', fields: String(f ?? '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [n, mx] = x.split('/'); return { name: short(n, 12), max: num(mx, 0), stages: [30, 70] }; }) }]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-del': meta.custom.splice(Number(v), 1); saveMeta(); app.refresh?.(); return;
        case 'merge': { const fv = await form(`🔗 ${esc(v)} 합치기`, [{ k: 'into', label: '같은 사람', type: 'pick', opts: meta.book.people.filter(p => p.name !== v).map(p => [p.name, `${p.face} ${esc(p.name)}`]) }], { ok: '합치기' }); const into = fv?.into; if (!into || !personOf(meta.book, into)) return; const p = personOf(meta.book, into); p.aka = [...new Set([...p.aka, v])]; meta.book.people = meta.book.people.filter(x => x.name !== v); saveMeta(); app.refresh?.(true); toast(`${v} → ${into}로 합쳤어요`); return; }
        case 'gone': hand(`gone: ${v} | ${r.S.rel[v]?.gone ? '' : '직접 뺌'}`, '직접'); return;
        case 'edit-cash': { const fv = await form('💰 가진 돈 고치기', [{ k: 'n', label: `${esc(meta.book.world.currency)}`, type: 'number', v: r.S.cash }, { k: 'why', label: '이유', v: '', ph: '직접 고침', chips: ['계산이 틀림', '이야기에서 받음', '이야기에서 씀'] }]); if (!fv || fv.n === '') return; hand(`cash: ${num(fv.n)}`, fv.why || '직접 고침'); return; }
        case 'bk-refill': {
            // 바뀐 로어북 항목만 보고, 거기 나오는 인물만 다시 채운다 (안 바뀐 인물 · 직접 고친 인물은 그대로)
            meta.autoSave = { why: '다시 채우기 전', when: dateText(r.book.world.start, r.S.t), full: structuredClone(r.S), book: structuredClone(meta.book), startAt: meta.startAt ?? 0, start: structuredClone(meta.start ?? null) };
            const { sources } = await import('../rules/ai.js'); const src = await sources(), old = meta.book.src?.sig ?? {};
            const changed = Object.keys(src.sig).filter(k => old[k] !== src.sig[k]);
            if (Object.keys(old).length && !changed.length) { toast('로어북이 바뀌지 않았어요'); return; }
            const names = Object.keys(old).length ? meta.book.people.filter(p => changed.some(k => [p.name, ...p.aka].some(n => n && src.texts[k]?.includes(n)))).map(p => p.name) : null;
            toast(names?.length ? `바뀐 인물 ${names.length}명을 다시 채우는 중…` : '로어북을 읽는 중…');
            const { book } = await fillBook(names?.length ? names : null); if (!book) { toast('채우지 못했어요', 'bad'); return; }
            const nb = normBook({ ...meta.book, ...book, world: book.world ?? meta.book.world, me: book.me ?? meta.book.me });
            let up = 0, add = 0;
            for (const p of nb.people) { const i = meta.book.people.findIndex(x => x.name === p.name); if (i >= 0) { if (!names || names.includes(p.name)) { meta.book.people[i] = { ...p, face: meta.book.people[i].face || p.face }; up++; } } else { meta.book.people.push(p); add++; } }
            if (!names && nb.world.places.length) meta.book.world = { ...nb.world, places: nb.world.places.map(p => ({ ...p, photo: placeOf(meta.book, p.name)?.photo ?? '' })) };
            meta.book.src.sig = src.sig; saveMeta(); app.refresh?.(true); toast(`인물 ${up}명 갱신 · ${add}명 추가`, 'good'); return;
        }
        case 'bk-person': case 'bk-me': case 'bk-world': case 'bk-places': return editBook(act, v);
        case 'preset': { const p = PRESETS[v]; const tgt = meta.influence ? meta.influence : settings().influence; tgt.all = p.all; tgt.by = { ...p.by }; meta.influence ? saveMeta() : saveSettings(); app.refresh?.(); toast(`${p.name}`); return; }
    }
}
// 손으로 고친 값 → 마지막 답에 이유와 함께 (기록 · 타임라인에 ✋로 보임)
export function hand(line, why) {
    const i = lastAI(); if (i < 0) { toast('답이 하나라도 있어야 고칠 수 있어요', 'bad'); return; }
    const m = ctx().chat[i], sl = slot(m, true), k = line.slice(0, line.indexOf(':')), v = line.slice(line.indexOf(':') + 1).trim();
    sl.hand = [...(sl.hand ?? []), { k, v, why }]; sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); ctx().saveChatDebounced?.(); app.refresh?.();
}
async function editBook(act, v) {
    const meta = getMeta(), b = meta.book;
    if (act === 'bk-me') return (await import('./tools.js')).editApp('now');
    if (act === 'bk-places') return (await import('./tools.js')).editApp('map');
    const L = (a) => (a ?? []).join(', '), P = (t) => String(t ?? '').split(/[,、]/).map(x => x.trim()).filter(Boolean);
    if (act === 'bk-world') {
        const w = b.world, fv = await form('🌍 세계', [{ k: 'genre', label: '장르', v: w.genre, chips: ['현대', '판타지', '학원', '무협', 'SF', '아포칼립스'] }, { k: 'cur', label: '화폐 단위', v: w.currency, chips: ['원', '골드', '달러', '엔', '냥'] }, { k: 'meal', label: '식사 한 끼 값 (물가 기준)', type: 'number', v: w.meal }, { k: 'wx', label: '날씨 (쉼표로)', v: L(w.weather) }, { k: 'start', label: '이야기 시작 날짜', v: `${w.start.y}-${w.start.m}-${w.start.d}`, ph: '2026-3-1' }]);
        if (!fv) return;
        const [y, m, d] = String(fv.start).split(/[-./]/).map(Number);
        meta.book = normBook({ ...b, world: { ...w, genre: fv.genre, currency: fv.cur, meal: num(fv.meal, w.meal), weather: P(fv.wx), start: { ...w.start, y: y || w.start.y, m: m || w.start.m, d: d || w.start.d } } });
        meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true); return;
    }
    // 👤 인물 — 설정집 칸 그대로 (성격 · 시작값 · 오르는/내리는 행동 · 증상 · 시너지 · 장소 · 루틴 · 취향 · 기념일 · 속셈)
    const p = v ? personOf(b, v) : null;
    const acts = (a) => (a ?? []).map(x => `${x.act}${x.d != null ? ` ${x.d > 0 ? '+' : ''}${x.d}` : ''}`).join(', ');
    const fv = await form(p ? `${p.face} ${esc(p.name)}` : '＋ 인물', [
        { k: 'name', label: '이름', v: p?.name ?? '' }, { k: 'face', label: '얼굴 이모지', v: p?.face ?? '🙂', chips: ['🙂', '😎', '🥰', '😤', '🦊', '🐺', '🛡️', '🌸'] },
        { k: 'aka', label: '다른 이름 · 영어 이름 (쉼표로)', v: L(p?.aka) }, { k: 'line', label: '성격 한 줄', v: p?.line ?? '' },
        { k: 'aff', label: '애정 시작값', type: 'number', v: p?.start.aff ?? 10 }, { k: 'trust', label: '우정 시작값', type: 'number', v: p?.start.trust ?? 10 },
        { k: 'up', label: '오르는 행동 (「칭찬 +3」 쉼표로)', v: acts(p?.up) }, { k: 'down', label: '내리는 행동', v: acts(p?.down) },
        { k: 'signs', label: '티 나는 반응 (「40: 눈을 피함」 쉼표로)', v: (p?.signs ?? []).map(x => `${x.at}: ${x.text}`).join(', ') },
        { k: 'syn', label: '다른 사람과 (「Mia: 라이벌」 쉼표로)', v: (p?.syn ?? []).map(x => `${x.to}: ${x.text}`).join(', ') },
        { k: 'haunt', label: '주로 있는 곳', v: L(p?.haunt), chips: b.world.places.map(x => x.name).slice(0, 6) },
        { k: 'routine', label: '하루 루틴 (「아침 길드, 낮 시장」)', v: (p?.routine ?? []).map(x => `${x.at} ${x.place}`).join(', ') },
        { k: 'likes', label: '좋아하는 것', v: L(p?.likes) }, { k: 'hates', label: '싫어하는 것', v: L(p?.hates) },
        { k: 'day', label: '기념일 · 생일', v: p?.day ?? '', ph: '10월 6일 생일' }, { k: 'want', label: '지금 원하는 것 (속셈)', v: p?.want ?? '' },
        { k: 'love', label: '애정', type: 'pick', v: p?.noLove ? 'off' : 'on', opts: [['on', '💗 켜기'], ['off', '💔 우정만']] },
        ...(p ? [{ k: 'del', label: '이 인물', type: 'pick', v: '', opts: [['', '남기기'], ['del', '설정집에서 빼기']] }] : []),
    ]);
    if (!fv?.name.trim()) return;
    if (fv.del) { b.people = b.people.filter(x => x.name !== v); meta.book = normBook(b); saveMeta(); app.refresh?.(true); return; }
    const pairs = (t) => P(t).map(x => { const i = x.search(/[:：]/); return i < 0 ? null : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }).filter(Boolean);
    const np = { name: fv.name.trim(), face: fv.face, aka: P(fv.aka), line: fv.line, start: { aff: num(fv.aff, 10), trust: num(fv.trust, 10) }, up: P(fv.up), down: P(fv.down), signs: pairs(fv.signs).map(([a, t]) => ({ at: num(a, 40), text: t })), syn: pairs(fv.syn).map(([to, t]) => ({ to, text: t })), haunt: P(fv.haunt), routine: P(fv.routine).map(x => { const [at, ...pl] = x.split(/\s+/); return { at, place: pl.join(' ') }; }), likes: P(fv.likes), hates: P(fv.hates), day: fv.day, want: fv.want, noLove: fv.love === 'off' };
    const list = p ? b.people.map(x => (x.name === v ? np : x)) : [...b.people, np];
    meta.book = normBook({ ...b, people: list }); meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true);
}

// 📷 장소 사진: 파일(크기를 줄여 이 채팅에 저장 · 약 30KB) 또는 주소 · 빈칸이면 빼기
async function pickPhoto() {
    const fv = await form('📷 장소 사진', [{ k: 'url', label: '이미지 주소', ph: 'https://…' }, { k: 'how', label: '또는', type: 'pick', v: 'url', opts: [['url', '주소 쓰기'], ['file', '파일 고르기'], ['del', '사진 빼기']] }], { ok: '확인' });
    if (!fv) return null;
    if (fv.how === 'del') return '';
    if (fv.how === 'url') return /^https?:\/\//.test(fv.url.trim()) ? fv.url.trim() : null;
    return new Promise((res) => {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
        inp.onchange = () => {
            const f = inp.files?.[0]; if (!f) return res(null);
            const img = new Image(); img.onload = () => { const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.78)); };
            img.onerror = () => res(null); img.src = URL.createObjectURL(f);
        };
        inp.click();
    });
}
