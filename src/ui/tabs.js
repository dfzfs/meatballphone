// 전체화면 안의 탭들 — 목록 행 + 묶음 카드. 설명은 한 줄까지.
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, MODS, slot, syncSwipe, msgKey, userName } from '../base/st.js';
import { esc, fmt, signed, short, dateText, DAY, slotName, clamp, num } from '../base/util.js';
import { row, card, chip, seg, bar, empty, btn, sheet, toast, putInput } from './kit.js';
import { fold, derived, needStage, relStage, nextStage, diceMod, worldEvent, priceMul } from '../rules/engine.js';
import { personOf, placeOf, bookTokens, personTokens, normBook, PLACE_KINDS, LIMIT } from '../rules/book.js';
import { moodTags, pickQuote, pickMusic } from '../rules/mood.js';
import { LEVELS, GAUGES, PRESETS, level, gaugeCfg, levelCost } from '../rules/inject.js';
import { fillBook } from '../rules/ai.js';

const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
const stageKind = (st) => (st === '위험' ? 'bad' : st === '주의' ? 'mid' : 'good');
const money = (r, n) => `${fmt(n)} ${esc(r.book.world.currency)}`;

export const TABS = [
    { id: 'now', icon: '✨', name: '지금' }, { id: 'bag', icon: '👜', name: '소지품', mod: 'wallet' }, { id: 'rel', icon: '💞', name: '관계', mod: 'rel' },
    { id: 'map', icon: '🗺️', name: '지도', mod: 'map' }, { id: 'cal', icon: '📅', name: '달력', mod: 'calendar' }, { id: 'news', icon: '📰', name: '소식', mod: 'news' },
    { id: 'rec', icon: '📒', name: '기록', mod: 'record' }, { id: 'mind', icon: '💭', name: '속마음', mod: 'mind' }, { id: 'custom', icon: '🧩', name: '내 탭', mod: 'custom' },
    { id: 'book', icon: '📘', name: '설정집' }, { id: 'gauge', icon: '🎚️', name: '영향력' },
];

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
    return card('이번 답에서 바뀐 것', fl.map(f => row({ icon: '⚠️', title: '확인 필요', sub: esc(f.text), value: btn('무시', 'flagok', `${i}:${f.i}`) })).join('') + ch.map(c => changeRow(c, i)).join(''));
}

// ───── 지금 ─────
function now(r) {
    const { S, book } = r, meta = getMeta(), li = lastAI(), last = r.changes[li] ?? [];
    const dz = derived(book, S);
    const tags = [...S.status.map(s => chip(`${s.src === 'fate' ? '🔮' : ''}${esc(s.name)}${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}${s.dice ? ` · 🎲${signed(s.dice)}` : ''}`, s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : 'mid')),
        ...dz.filter(d => d.stage === '위험').map(d => chip(`${d.icon} ${esc(d.name)} 위험 · 🎲${d.dice}`, 'bad'))];
    let h = tags.length ? `<div class="ml-chips">${tags.join('')}</div>` : '';
    if (modOn('stats')) h += card('수치', book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); const c = last.find(x => x.f === `need.${n.key}` && x.src !== 'time'); return row({ icon: n.icon, title: esc(n.name), sub: `${st}${c ? ` · ${signed(c.to - c.from)} ${esc(c.why)}` : ''}`, value: `${bar(v, stageKind(st))}<b class="ml-num">${v}</b>` }); }).join(''));
    const tg = moodTags(r, last);
    const side = [];
    if (modOn('music')) { const m = S.bgm ? { label: S.bgm, query: S.bgm, why: '답에 나온 곡' } : pickMusic(tg, settings().musicTaste); side.push(row({ icon: '🎵', title: esc(m.label), sub: `지금 공기 · ${esc(m.why)}`, act: 'music', data: m.query, more: true })); }
    if (modOn('quote')) { const q = pickQuote(tg, meta.recent?.quote ?? [], S.turn); if (q) side.push(row({ icon: '📜', title: esc(q.text), sub: `${esc(q.src)}`, act: 'quote', data: `${q.mean}\n— ${q.src}`, more: true })); }
    if (side.length) h += card('이 장면', side.join(''));
    h += turnCard(r, li);
    if (S.with.length && modOn('rel')) h += `<h4 class="ml-h4">같이 있는 사람</h4><div class="ml-rcs">${S.with.map(n => relCard(r, n)).join('')}</div>`;
    return h || empty('아직 바뀐 게 없어요.');
}
// ───── 소지품 · 재산 (+ 상점 미니 선택지) ─────
function bag(r) {
    const { S, book } = r, place = placeOf(book, S.loc), mul = priceMul(S);
    let h = card('재산', row({ icon: '💰', title: '가진 돈', sub: `식사 한 끼 ≈ ${money(r, book.world.meal)}`, value: `<b class="ml-num">${money(r, S.cash)}</b>`, act: 'edit-cash', more: true }));
    h += card('소지품', S.items.length ? S.items.map(it => row({ icon: it.worn ? '👕' : '📦', title: `${esc(it.name)}${it.n > 1 ? ` ×${it.n}` : ''}`, sub: it.worn ? '착용 중' : Object.entries(it.fx).map(([k, v]) => `${book.me.needs.find(n => n.key === k)?.name ?? k} ${signed(v)}`).join(' · '), value: choiceBtns([[Object.keys(it.fx).length ? `먹기` : '쓰기', `${it.name}을(를) 먹는다`], [it.worn ? '벗기' : '입기', `${it.name}을(를) ${it.worn ? '벗는다' : '입는다'}`]]) })).join('') : row({ icon: '📦', title: '비어 있어요', faint: true }));
    if (place?.goods.length) h += card(`${PLACE_KINDS[place.kind]} ${esc(place.name)} 가게`, place.goods.map(g => goodRow(r, g, mul)).join(''), mul !== 1 ? `오늘 값 ×${mul}` : '');
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
function meter(kind, label, v, ticks, hide) {
    return `<div class="ml-meter ${kind}"><span>${label}</span><span class="ml-track"><b style="width:${v}%"></b>${ticks.map(t => `<i style="left:${t}%"></i>`).join('')}</span><em>${hide ? '' : v}</em></div>`;
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
    const L = [];
    if (!x.gone) {
        if (!p?.noLove) L.push(meter('love', '애정', x.aff, ticks, hide));
        L.push(meter('trust', '우정', x.trust, [], hide));
        if (hide) L.push(`<div class="ml-rl"><i>👀</i>${esc(sign || '아직 속을 모르겠다')}</div>`);
        L.push(`<div class="ml-rl"><i>🗣</i><b>${esc(st.call)}</b><span>· ${esc(st.act)}</span></div>`);
        if (nx && !p?.noLove) L.push(`<div class="ml-rl"><i>🔓</i>다음 「${esc(nx.name)}」까지 ${hide ? '조금 더' : `애정 ${nx.at - x.aff}`} <span>→ ${esc(nx.call)} · ${esc(nx.act)}</span></div>`);
        if (last) L.push(`<div class="ml-rl tap" data-act="jump" data-v="${last.i}"><i>${last.c.icon}</i>최근 ${hide ? '' : `<b class="${last.c.to < last.c.from ? 'neg' : 'pos'}">${signed(last.c.to - last.c.from)}</b>`} ${esc(last.c.why)} <span>#${last.i}</span></div>`);
        if (x.want) L.push(`<div class="ml-rl"><i>🎯</i>${esc(x.want)}</div>`);
        if (x.jealous) L.push(`<div class="ml-rl"><i>💢</i>${esc(x.jealous)}</div>`);
        if (x.life) L.push(`<div class="ml-rl"><i>🌙</i>${esc(x.life)}</div>`);
        const mem = x.mem.filter(m => !x.jealous || !m.text.includes(x.jealous));
        if (mem[0]) L.push(`<div class="ml-rl"><i>💬</i>${esc(mem[0].text)}${mem.length > 1 ? ` <span>외 ${mem.length - 1}개</span>` : ''}</div>`);
        const tl = [...x.seen.likes.map(t => `<span class="ml-tag good">${esc(t)}</span>`), ...x.seen.hates.map(t => `<span class="ml-tag bad">${esc(t)}</span>`)];
        if (tl.length) L.push(`<div class="ml-rl"><i>🎁</i>${tl.join('')}</div>`);
        const day = p?.day || x.day, meta2 = [nowAt && `📍 ${esc(nowAt)}`, day && `🎂 ${esc(day)}`].filter(Boolean);
        if (meta2.length) L.push(`<div class="ml-rl dim"><i></i>${meta2.join('<span>·</span>')}</div>`);
    }
    const acts = x.gone ? btn('돌아옴', 'gone', name, 'xs') : `${btn('🎁<span> 선물</span>', 'say', `${name}에게 선물을 건넨다.`, 'xs')}${inSheet ? '' : btn('더보기', 'person', name, 'xs')}`;
    return `<div class="ml-rc${x.gone ? ' gone' : ''}"><div class="ml-rc-h"><span class="ml-face"${inSheet ? '' : ` data-act="person" data-v="${esc(name)}"`}>${p?.face || x.face || '🙂'}</span><b${inSheet ? '' : ` class="tap" data-act="person" data-v="${esc(name)}"`}>${esc(name)}</b>${pills}<span class="ml-sp"></span>${acts}</div>${p?.line || x.line ? `<div class="ml-rc-line">${esc(p?.line || x.line)}</div>` : ''}${L.join('')}</div>`;
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
// ───── 지도: 노선도 · 인물 핀 · 「지금 가면 누구를 만날지」 ─────
function map(r) {
    const { book, S } = r, slot0 = slotName(S.t);
    const meet = (pl) => book.people.filter(p => !S.rel[p.name]?.gone && (p.routine.some(x => x.place === pl.name && slot0.includes(x.at.slice(0, 1))) || (!p.routine.length && p.haunt.includes(pl.name))));
    const lines = {}; for (const pl of book.world.places) (lines[pl.line || '기본 노선'] ??= []).push(pl);
    if (!book.world.places.length) return empty('설정집에 장소가 없어요.', '장소 넣기', 'tab-book');
    let h = `<div class="ml-hint">지금은 ${slot0} · 장소를 누르면 가는 말이 입력창에 들어가요</div>`;
    for (const [ln, pls] of Object.entries(lines)) {
        h += card(esc(ln), `<div class="ml-line">${pls.map(pl => { const here = pl.name === S.loc, who = meet(pl); return `<div class="ml-stop${here ? ' here' : ''}" data-act="${here ? '' : 'say'}" data-v="${esc(pl.name)}(으)로 간다."><i>${PLACE_KINDS[pl.kind]}</i><b>${esc(pl.name)}</b>${who.length ? `<span class="ml-pins">${who.map(p => `<em title="${esc(p.name)}">${p.face}</em>`).join('')}</span>` : ''}${pl.floors.length ? `<small>${pl.floors.length}층</small>` : ''}</div>`; }).join('')}</div>`);
    }
    const here = placeOf(book, S.loc);
    if (here) {
        const acts = [];
        if (Object.keys(here.rest).length || here.kind === 'home') acts.push(['쉬기', '잠깐 쉰다.']);
        if (here.kind === 'bath' || here.kind === 'home') acts.push(['씻기', '씻는다.']);
        if (here.kind === 'work') acts.push(['일하기', '일을 시작한다.']);
        h += card(`📍 ${esc(here.name)}에서`, row({ icon: PLACE_KINDS[here.kind], title: esc(here.name), sub: esc(here.note || ''), value: choiceBtns(acts) }) + (here.floors.length ? row({ icon: '🏢', title: '건물 안', sub: here.floors.map(esc).join(' › ') }) : '') + here.goods.map(g => goodRow(r, g, priceMul(S))).join(''));
    }
    return h;
}
// ───── 달력 · 시간 · 날씨 ─────
function upcoming(r) {
    const { book, S } = r, out = [];
    for (const p of S.promises.filter(q => !q.done)) out.push({ t: p.due, icon: '🤝', text: p.text });
    for (const [n, x] of Object.entries(S.rel)) { const d = personOf(book, n)?.day || x.day; if (d) { const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(d); if (m) out.push({ icon: '🎂', text: `${n} · ${d}`, t: null, md: `${m[1]}/${m[2]}` }); } }
    return out;
}
function cal(r) {
    const { book, S } = r, ev = worldEvent(Math.floor(S.t / DAY));
    let h = card('지금', row({ icon: '🕰️', title: dateText(book.world.start, S.t), value: '' }) + row({ icon: '🌦️', title: esc(S.weather || '-'), sub: /비|눈/.test(S.weather) ? '밖에 있으면 위생 · 기분이 더 빨리 줄어요' : '' }) + (ev ? row({ icon: '🎪', title: esc(ev.name), sub: esc(ev.text) }) : ''));
    const up = upcoming(r);
    h += card('다가오는 것', up.length ? up.map(u => row({ icon: u.icon, title: esc(u.text), value: u.t != null ? (u.t - S.t <= DAY ? chip('하루 안', 'bad') : dateText(book.world.start, u.t, false)) : esc(u.md) })).join('') : row({ title: '없어요', faint: true }));
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
        r.states.forEach((s, i) => { const v = s?.needs?.[n.key]; if (v == null) return; if (!lo || v < lo.v) lo = { v, i }; if (!top || v > top.v) top = { v, i }; });
        (r.changes ?? []).forEach((ch, i) => { const d = (ch ?? []).filter(c => c.f === `need.${n.key}` && c.src !== 'time').reduce((a, c) => a + c.to - c.from, 0); if (d && (!big || Math.abs(d) > Math.abs(big.d))) big = { d, i }; });
        if (lo) hi.push(row({ icon: n.icon, title: esc(n.name), sub: `최저 ${Math.round(lo.v)} · 최고 ${Math.round(top.v)}${big ? ` · 가장 크게 ${signed(big.d)} (#${big.i})` : ''}`, value: graph(r, n.key), act: 'jump', data: lo.i }));
    }
    const marks = (meta.marks ?? []).map(m => ({ ...m, i: chat.findIndex(x => msgKey(x) === m.key) })).filter(m => m.i >= 0);
    return `<div class="ml-tools">${seg('recf', REC_F, recF)}${btn('⭐ 마지막 답 책갈피', 'mark')}${btn('🕰 그때 상태 보기', 'past')}</div>` + card('책갈피', marks.map(m => row({ icon: '⭐', title: esc(m.name), sub: `#${m.i}`, act: 'jump', data: m.i, more: true })).join('')) + card('하이라이트', hi.join('')) + card('타임라인', L.join('') || row({ title: '아직 기록이 없어요', faint: true }));
}
function graph(r, key) {
    const pts = []; r.states.forEach((s, i) => { if (s?.needs?.[key] != null && (i === 0 || r.changes[i]?.length)) pts.push([i, s.needs[key]]); });
    if (pts.length < 2) return '';
    const P = pts.slice(-40), x0 = P[0][0], x1 = P[P.length - 1][0] || 1;
    return `<svg class="ml-graph" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${P.map(([i, v]) => `${((i - x0) / Math.max(1, x1 - x0) * 100).toFixed(1)},${(30 - v * 0.3).toFixed(1)}`).join(' ')}"/></svg>`;
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
function gauge() {
    const g = gaugeCfg(), meta = getMeta();
    let h = `<div class="ml-tools">${Object.entries(PRESETS).map(([k, p]) => btn(p.name, 'preset', k, 'sm')).join('')}</div>`;
    h += card('전체', slider('all', g.all ?? 2), `${seg('scope', [['chat', '이 채팅만'], ['all', '전체 기본값']], meta.influence ? 'chat' : 'all')}`);
    h += card('기능별', GAUGES.map(x => slider(x.id, level(x.id), x.name)).join(''));
    h += card('단계', LEVELS.map(l => row({ icon: `<b>${l.n}</b>`, title: l.name, sub: l.what })).join(''));
    return h;
}
const slider = (id, v, name = '전체') => { const c = levelCost(v); return `<div class="ml-gauge"><div class="ml-gauge-h"><b>${esc(name)}</b><span class="ml-pill ${v >= 3 ? 'love' : ''}">${v} · ${LEVELS[v].name}</span><small>주입 ≈${c.tok}토큰 · 추가 호출 ${c.calls}회</small></div><input type="range" class="ml-range" min="0" max="4" step="1" value="${v}" data-gauge="${id}"><div class="ml-gauge-t">${LEVELS.map(l => `<span class="${l.n === v ? 'on' : ''}">${l.name}</span>`).join('')}</div></div>`; };

export const RENDER = { now, bag, rel, map, cal, news, rec, mind, custom, book, gauge };

// ───── 누르기 ─────
export async function onAct(act, v, el) {
    const meta = getMeta(), r = fold();
    switch (act) {
        case 'say': putInput(v); app.closeSheet?.(); return;
        case 'music': window.open(settings().musicApp === 'spotify' ? `https://open.spotify.com/search/${encodeURIComponent(v)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(v)}`, '_blank'); return;
        case 'quote': { sheet('한 구절', `<p class="ml-quote">${esc(v).replace(/\n/g, '<br>')}</p>`); const t = el?.querySelector('b')?.textContent; if (t) { meta.recent.quote = [t, ...(meta.recent.quote ?? [])].slice(0, 8); saveMeta(); } return; }
        case 'person': personSheet(r, v); return;
        case 'jump': app.jump?.(Number(v)); return;
        case 'tab-book': app.openSheet?.('book'); return;
        case 'undo': { const [i, j] = v.split(':').map(Number); const m = ctx().chat[i], sl = slot(m, true); if (!sl.ops && j < 1000) sl.ops = (await import('../rules/tags.js')).readOps(m.mes); sl.undo = [...new Set([...(sl.undo ?? []), j])]; sl.rev = (sl.rev ?? 0) + 1; syncSwipe(m); ctx().saveChatDebounced?.(); app.refresh?.(); toast('되돌렸어요'); return; }
        case 'flagok': { const [i] = v.split(':').map(Number); const m = ctx().chat[i], sl = slot(m, true); sl.flagOk = true; sl.rev = (sl.rev ?? 0) + 1; ctx().saveChatDebounced?.(); app.refresh?.(); return; }
        case 'mark': { const i = lastAI(); if (i < 0) return; const name = await ctx().Popup.show.input('책갈피 이름', '', short(ctx().chat[i].mes, 20)); if (!name) return; meta.marks = [...(meta.marks ?? []).filter(m => m.key !== msgKey(ctx().chat[i])), { key: msgKey(ctx().chat[i]), name: short(name, 30) }]; saveMeta(); app.refresh?.(); return; }
        case 'past': { const n = await ctx().Popup.show.input('그때 상태 보기', '메시지 번호', String(lastAI())); const i = Number(n); const s = r.states[i]; if (!s) return; app.openPast?.(i); return; }
        case 'mindwho': { const w = new Set(meta.mindWho ?? ['cast']); w.has(v) ? w.delete(v) : w.add(v); meta.mindWho = [...w]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-tpl': { const t = structuredClone(TEMPLATES[v]); meta.custom = [...(meta.custom ?? []), t]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-new': { const name = await ctx().Popup.show.input('새 탭 이름', '', ''); if (!name) return; const f = await ctx().Popup.show.input('칸 이름 (쉼표로)', '숫자 칸은 이름 뒤에 /100', '점수/100, 메모'); meta.custom = [...(meta.custom ?? []), { name: short(name, 12), icon: '🧩', fields: String(f ?? '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [n, mx] = x.split('/'); return { name: short(n, 12), max: num(mx, 0), stages: [30, 70] }; }) }]; saveMeta(); app.refresh?.(); return; }
        case 'ctab-del': meta.custom.splice(Number(v), 1); saveMeta(); app.refresh?.(); return;
        case 'merge': { const into = await ctx().Popup.show.input(`${v} 합치기`, '같은 사람인 이름', ''); if (!into || !personOf(meta.book, into)) return; const p = personOf(meta.book, into); p.aka = [...new Set([...p.aka, v])]; meta.book.people = meta.book.people.filter(x => x.name !== v); saveMeta(); app.refresh?.(true); toast(`${v} → ${into}로 합쳤어요`); return; }
        case 'gone': hand(`gone: ${v} | ${r.S.rel[v]?.gone ? '' : '직접 뺌'}`, '직접'); return;
        case 'edit-cash': { const n = await ctx().Popup.show.input('가진 돈 고치기', '숫자 · 이유는 다음 칸에', String(r.S.cash)); if (n == null) return; const why = await ctx().Popup.show.input('이유', '', '직접 고침'); hand(`cash: ${num(n)}`, why || '직접 고침'); return; }
        case 'bk-refill': { toast('로어북을 읽는 중…'); const { book } = await fillBook(); if (!book) { toast('채우지 못했어요', 'bad'); return; } const nb = normBook(book); const keep = new Set(meta.book.people.map(p => p.name)); for (const p of nb.people) { const i = meta.book.people.findIndex(x => x.name === p.name); if (i >= 0) meta.book.people[i] = p; else meta.book.people.push(p); } meta.book.world = nb.world.places.length ? nb.world : meta.book.world; saveMeta(); app.refresh?.(true); toast(`인물 ${nb.people.length}명 갱신 (이전 ${keep.size}명)`, 'good'); return; }
        case 'bk-person': case 'bk-me': case 'bk-world': case 'bk-places': return editBook(act, v);
        case 'preset': { const p = PRESETS[v]; const tgt = meta.influence ? meta.influence : settings().influence; tgt.all = p.all; tgt.by = { ...p.by }; meta.influence ? saveMeta() : saveSettings(); app.refresh?.(); toast(`${p.name}`); return; }
    }
}
// 손으로 고친 값 → 마지막 답에 이유와 함께 (기록 · 타임라인에 ✋로 보임)
export function hand(line, why) {
    const i = lastAI(); if (i < 0) { toast('답이 하나라도 있어야 고칠 수 있어요', 'bad'); return; }
    const m = ctx().chat[i], sl = slot(m, true), k = line.slice(0, line.indexOf(':')), v = line.slice(line.indexOf(':') + 1).trim();
    sl.hand = [...(sl.hand ?? []), { k, v, why }]; sl.rev = (sl.rev ?? 0) + 1; syncSwipe(m); ctx().saveChatDebounced?.(); app.refresh?.();
}
function editBook(act, v) {
    const meta = getMeta(), b = meta.book;
    const part = act === 'bk-person' ? (personOf(b, v) ?? { name: '', line: '', face: '🙂', start: { aff: 10, trust: 10 }, up: [], down: [], likes: [], hates: [], haunt: [], routine: [], signs: [], syn: [], day: '', want: '' }) : act === 'bk-me' ? b.me : act === 'bk-world' ? { ...b.world, places: undefined } : b.world.places;
    sheet('📘 고치기', `<textarea class="ml-json">${esc(JSON.stringify(part, null, 1))}</textarea><div class="ml-hint">칸 이름은 그대로 두고 값만 고쳐요</div>`, {
        onOk: (el) => {
            let j; try { j = JSON.parse(el.querySelector('.ml-json').value); } catch { toast('모양이 깨졌어요', 'bad'); return false; }
            if (act === 'bk-person') { const nb = normBook({ ...b, people: [j] }); const p = nb.people[0]; if (!p) return false; const i = b.people.findIndex(x => x.name === v); if (i >= 0) b.people[i] = p; else b.people.push(p); }
            else if (act === 'bk-me') meta.book = normBook({ ...b, me: j });
            else if (act === 'bk-world') meta.book = normBook({ ...b, world: { ...j, places: b.world.places } });
            else meta.book = normBook({ ...b, world: { ...b.world, places: j } });
            meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true);
        },
    });
}
