// 전체화면 탭 — 함께 쓰는 작은 도구 (돈 · 이번 답 카드 · 욕구 카드 …)
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, msgData, syncSwipe, msgKey, userName, bumpMeta, saveChatSoon } from '../base/st.js';
import { esc, fmt, fxText, signed, short, dateText, dateOf, DAY, periodName, num, norm, tokens, dayIndexOf, monthDays, monthName, weekName, faceOf, clockOf, inPeriod } from '../base/util.js';
import { row, card, chip, seg, bar, empty, btn, sheet, toast, putInput, form } from './kit.js';
import { fold, derived, needStage, relStage, nextStage, stagesOf, pairKey, diceParts, whereNow } from '../rules/engine.js';
import { luckOf } from '../rules/luck.js';
import { vis, handLines } from './tools.js';
import { layout, lineEdges, lineNodes, route, floorsOf } from './metro.js';
import { personOf, placeOf, bookTokens, personTokens, normBook, PLACE_KINDS, LIMIT, isStar } from '../rules/book.js';
import { musicView, quoteView, songLine, quoteLine, musicAct } from './music.js';
import { LEVELS, GAUGES, PRESETS, level, gaugeCfg, levelCost } from '../rules/inject.js';
import { fillBook } from '../rules/ai.js';
import { isEN } from '../rules/lang.js';
import { newsView, newsAct } from './newskinds.js';
import { calBar, calTabView, calCell, calDayExtra, calSettings, calAct } from './calplus.js';
import { ddaysOn } from '../rules/calplus.js';
import { isSecret, secretSub, sneakCard, sneakUndo } from './sneak.js';
import { sneakOnDay } from '../rules/sneak.js';
import { personThread, placeThread, dayThread, lived, ledgerCard, statusCard, diceLog, albumView, statsView, daysView, threadAct } from './threadui.js';
import { dayOfI, thread, itemKind, itemLife, needRhythm, relWeather, lastSeen, placeMood, todayRoute, weekTop, dayEmoji } from '../rules/thread.js';
// 전체화면 안의 탭들 — 목록 행 + 묶음 카드. 설명은 한 줄까지.
const d20Svg = (n, c) => `<svg class="ml-d20 big ${c}" viewBox="0 0 100 100">${n === 1 ? '<polyline class="crack" points="38,8 46,30 36,44 52,60 44,78 54,94"/>' : ''}<polygon `
    + `class="f0" points="50,4 92,28 92,72 50,96 8,72 8,28"/><polygon class="f1" points="50,22 78,66 22,66"/><polyline class="ed" points="50,4 50,22 `
    + `92,28 78,66 92,72 50,96 78,66 22,66 8,72 22,66 8,28 50,22 22,66"/><text x="50" y="56">${n}</text></svg>`;

const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
const money = (r, n) => `${fmt(n)} ${esc(r.book.world.currency)}`;
const fxOf = (r, n) => { const t = fxText(r.book.world, n); return t ? ` <span class="ml-fx">${esc(t)}</span>` : ''; };
// 👜 물건 단추는 하나만 (종류는 rules/thread.js itemKind)
function itemBtns(r, it, kind) {
    if (isSecret(it)) return '';
    if (it.worn) return btn('벗기', 'say', `${it.name}을(를) 벗는다.`, 'sm');
    if (kind === 'wear') return btn('입기', 'say', `${it.name}을(를) 입는다.`, 'sm');
    return btn(kind === 'food' ? '먹기' : '쓰기', 'say', `${it.name}을(를) ${kind === 'food' ? '먹는다' : '쓴다'}.`, 'sm');
}
// 🎁 누구와 있을 때 생긴 물건인지 (기록에서 · 저장 0)
function itemMemo(r, it) {
    const f = itemLife(r, it.name).first; if (!f || !/얻음|받음|선물|got/i.test(String(f.c.why ?? ''))) return null;
    const at = r.at?.[f.i]; if (!at?.with?.length) return null;
    const d = dateOf(r.book.world.start, at.t); return `🤝 ${at.with.slice(0, 2).map(esc).join(', ')}와 있을 때 · ${d.mn} ${d.d}일`;
}


// ───── 턴 요약 카드: 줄마다 이유 · 줄마다 되돌리기 ─────
export function changeRow(c, i, undo = true) {
    const val = typeof c.to === 'number' && typeof c.from === 'number' ? `${c.f === 'time' ? `+${Math.round((c.to - c.from) / 60 * 10) / 10}h` : signed(c.to - c.from)}` : esc(c.to);
    const src = c.src === 'hand' ? ' · ✋직접' : c.src === 'meddle' ? ' · ✍손댐' : c.src === 'fill' ? ' · 보충' : String(c.src ?? '').startsWith('app:') ? ` · 📲${c.src.slice(4)}` : '';
    return row({ icon: c.icon, title: esc(c.label), sub: `${esc(c.why || '')}${src}`, value: `<span class="${c.sure === false ? 'guess' : ''}">${val}</span>${undo && c.j !== undefined ? '' : ''}`
        + `${undo && c.i != null && c.src !== 'auto' && c.src !== 'time' ? `<button class="ml-mini" data-act="undo" data-v="${i}:${c.i}" title="되돌리기">↶</button>` : ''}`, faint: c.sure === false });
}
export function turnCard(r, i) {
    const ch = (r.changes[i] ?? []).filter(c => c.src !== 'time');
    const fl = r.flags[i] ?? [];
    if (!ch.length && !fl.length) return '';
    return card('이번 답에서 바뀐 것', fl.map(f => row({ icon: '⚠️', title: '확인 필요', sub: esc(f.text), value: btn('무시', 'flagok', `${i}:${f.i}`, 'xs') })).join('') + ch.map(c => changeRow(c, i)).join(''));
}

// ───── ❤️ 수치: 상태 딱지 · 욕구 · 게이지 · 능력치 · 이 장면 · 이번 답 (dev 수치 카드 기준 + 이유 · 다음 경계까지 · 회복 방법) ─────
const STAGE_COLOR = { 정상: 'good', 주의: 'mid', 위험: 'bad' };
function recoverOf(r, key) {
    const { book, S } = r, out = [];
    for (const it of S.items) if (num(it.fx?.[key]) > 0) out.push({ t: `👜 ${it.name} ${signed(it.fx[key])}`, say: `${it.name}을(를) 먹는다.` });
    const here = placeOf(book, S.loc);
    for (const g of here?.goods ?? []) if (num(g.fx?.[key]) > 0) out.push({ t: `🛒 ${g.name} ${signed(g.fx[key])} · ${g.price}${book.world.currency}`, say: `${g.name} 하나 주세요.`, poor: S.cash < g.price });
    if (num(here?.rest?.[key]) > 0) out.push({ t: `🛏 ${here.name}에서 쉬기 ${signed(here.rest[key])}`, say: '잠깐 쉰다.' });
    if (key === 'energy') out.push({ t: '😴 자기 · 시간당 +12', say: '잠을 잔다.' });
    if (key === 'hygiene') { const b = book.world.places.find(q => q.kind === 'bath' || q.kind === 'home'); if (b) out.push({ t: `🫧 ${b.name}에서 씻기 +60`, say: b.name === S.loc ? '씻는다.' : `${b.name}(으)로 가서 씻는다.` }); }
    if (key === 'hunger' && !out.length) { const f = book.world.places.find(q => q.kind === 'food'); if (f) out.push({ t: `🍜 ${f.name} · 식사 ≈${book.world.meal}${book.world.currency}`, say: `${f.name}(으)로 밥 먹으러 간다.` }); }
    return out.slice(0, 3);
}
function needCard(r, n, last) {
    const { S } = r, v = Math.round(S.needs[n.key] ?? 0), st = needStage(v), c = last.find(x => x.f === `need.${n.key}` && x.src !== 'time' && x.src !== 'hand' && !x.hand);
    const nextAt = st === '정상' ? 40 : st === '주의' ? 15 : 0, hrs = n.rate > 0 && v > nextAt ? (v - nextAt) / n.rate : null;
    const sym = derived(r.book, S).find(d => d.key === n.key);
    const rec = st !== '정상' || v < 60 ? recoverOf(r, n.key) : [];
    return `<div class="ml-gc ${STAGE_COLOR[st]}"><div class="ml-gc-h"><span>${n.icon}</span><b>${esc(n.name)}</b><span `
        + `class="ml-pill ${STAGE_COLOR[st] === 'good' ? 'good' : STAGE_COLOR[st] === 'bad' ? 'bad' : ''}">${st}`
        + `</span>${c ? `<span class="ml-why ${c.to < c.from ? 'neg' : 'pos'}">${signed(c.to - c.from)} · ${esc(c.why)}</span>` : ''}<em class="tap" `
        + `data-act="edit-val" data-v="need|${n.key}" title="고치기">${v}<small>/100</small></em></div>
        <div class="ml-gbar"><b style="width:${v}%"></b><i style="left:40%"></i><i style="left:15%"></i></div>
        <div class="ml-gc-f">${sym ? `<span>⚠ ${esc(sym.text)}${sym.stage === '위험' ? ` · 🎲${sym.dice}` : ''}</span>` : ''}`
        + `${hrs != null && hrs < 48 ? `<span class="dim">${st === '위험' ? '' : `${st === '정상' ? '주의' : '위험'}까지 약 ${hrs < 1 ? `${Math.round(hrs * 60)}분` : `${Math.round(hrs)}시간`}`}</span>` : ''}`
        + `<span class="dim">−${n.rate}/시간</span></div>
        ${rec.length ? `<div class="ml-gc-r">${rec.map(x => btn(esc(x.t), 'say', x.say, `xs${x.poor ? ' poor' : ''}`)).join('')}</div>` : ''}</div>`;
}
function gaugeCard(r, g, last) {
    const { S } = r, v = Math.round(S.gauges[g.key] ?? g.start), pct = Math.round(v / g.max * 100), c = last.find(x => x.f === `gauge.${g.key}`);
    return `<div class="ml-gc"><div class="ml-gc-h"><b>${esc(g.name)}</b>${c ? `<span class="ml-why ${c.to < c.from ? 'neg' : 'pos'}">${signed(c.to - c.from)} · ${esc(c.why)}</span>` : ''}<em class="tap" data-act="edit-val" data-v="gauge|${g.key}" title="고치기">${v}<small>/${g.max}</small></em></div>
        <div class="ml-gbar" style="--gc:${g.color}"><b style="width:${pct}%;background:var(--gc)"></b></div>
        <div class="ml-gc-f"><span class="ml-steps2">${[-10, -1, 1, 10].map(d => `<button class="ml-mini2" data-act="gstep" data-v="${esc(g.name)}:${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`).join('')}</span><span class="dim">${esc(g.desc)}</span></div></div>`;
}
export { d20Svg, lastAI, money, fxOf, itemBtns, itemMemo, STAGE_COLOR, recoverOf, needCard, gaugeCard };
