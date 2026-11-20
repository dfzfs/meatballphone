// 🧵 실타래 화면 — 이미 있는 기록을 인물 · 장소 · 날짜 · 돈으로 묶어 「보여 주기만」 한다.
//   저장 0 · 본편 0 · AI 0. 앱을 열 때만 계산하고, 긴 목록은 잘라서 보인다.
//   (예외: 「📌 D-day로」 버튼은 사용자가 누를 때만 달력 D-day 한 줄을 저장)
import { getMeta, saveMeta, app } from '../base/st.js';
import { esc, fmt, fxText, signed, dateText, dateOf, DAY, short, uid } from '../base/util.js';
import { row, card, btn, sheet, toast } from './kit.js';
import { personOf } from '../rules/book.js';
import { thread, personLine, personFirsts, placeLife, dayInfo, dayTop, ledger, SPEND, itemLife, statusLife, stats, album } from '../rules/thread.js';
import { calOf } from '../rules/calplus.js';

const when = (r, i) => (r.at?.[i] ? dateText(r.book.world.start, r.at[i].t, false) : '');
const delta = (c) => (typeof c.to === 'number' && typeof c.from === 'number' ? (c.f === 'time' ? '' : signed(c.to - c.from)) : `→ ${esc(short(c.to, 20))}`);
// 변화 한 줄 (누르면 그 메시지로)
export const evRow = (r, e, withDate = true) => row({ icon: e.c.icon, title: `${esc(e.c.label)} <span class="ml-thv">${delta(e.c)}</span>`, sub: `${esc(short(e.c.why, 40))}${withDate ? ` · ${esc(when(r, e.i))}` : ''} · #${e.i}`, act: 'jump', data: e.i, faint: e.c.sure === false });
const face = (r, n) => personOf(r.book, n)?.face || r.S.rel[n]?.face || '🙂';
const money = (r, n) => `${fmt(n)} ${esc(r.book.world.currency)}`;
// D-day 버튼: 이미 같은 날 · 같은 이름이 있으면 「등록됨」
const ddBtn = (r, i, name) => {
    if (r.at?.[i] == null) return '';
    const day = Math.floor(r.at[i].t / DAY), has = (calOf()?.dday ?? []).some(d => d.day === day && d.name === name);
    return has ? '<span class="ml-pill">📌 등록됨</span>' : btn('📌 D-day로', 'th-dday', `${day}|${name}`, 'xs');
};

// ───── 👤 인물 시트에 붙는 칸: 「처음」 · 함께한 정도 · 같이 들은 곡 · 연표 ─────
export function personThread(r, name) {
    const F = personFirsts(r, name), L = [];
    const firsts = [];
    if (F.meet != null) firsts.push(row({ icon: '🤝', title: '처음 만남', sub: `${esc(when(r, F.meet))} · #${F.meet}`, value: ddBtn(r, F.meet, `${name} 처음 만난 날`), act: 'jump', data: F.meet }));
    if (F.stageUp) firsts.push(row({ icon: '💞', title: `처음 「${esc(F.stageUp.c.to)}」`, sub: `${esc(when(r, F.stageUp.i))} · #${F.stageUp.i}`, value: ddBtn(r, F.stageUp.i, `${name} ${short(F.stageUp.c.to, 10)}`), act: 'jump', data: F.stageUp.i }));
    if (F.gift) firsts.push(row({ icon: '🎁', title: '처음 준 선물', sub: `${esc(short(F.gift.c.why.replace(/^🎁\s*/, ''), 24))} · ${esc(when(r, F.gift.i))}`, act: 'jump', data: F.gift.i }));
    if (firsts.length) L.push(card('처음', firsts.join('')));
    const top = [...F.places.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (F.together || top.length) L.push(card('함께한 시간', row({ icon: '👥', title: `함께한 답 ${F.together}개`, sub: top.length ? `자주 같이 있던 곳: ${top.map(([p, n]) => `${esc(p)} ${n}`).join(' · ')}` : '' })));
    if (F.songs.length) L.push(card('같이 들은 곡', F.songs.map(s => row({ icon: '🎵', title: esc(s.title), sub: `${esc(s.artist || '')}${s.mood ? ` · ${esc(s.mood)}` : ''} · ${esc(when(r, s.m))}`, act: 'jump', data: s.m })).join('')));
    // 💭 이 사람의 속마음 · 📱 이 사람 소식 (이미 접어 둔 목록에서 이름만 골라냄)
    const minds = (r.S.mindLog ?? []).filter(e => e.who === name).slice(-6).reverse();
    if (minds.length) L.push(card('속마음 모음', minds.map(e => row({ icon: { mind: '💭', watch: '👀', cell: '🧠' }[e.k] ?? '💭', title: esc(short(e.text, 60)), sub: esc(dateText(r.book.world.start, e.t)), act: e.m != null ? 'jump' : '', data: e.m ?? '' })).join('')));
    const nw = (r.S.news ?? []).filter(n => n.who === name).slice(0, 5);
    const strip = (t) => { t = String(t ?? ''); return t.startsWith(`${name} — `) ? t.slice(name.length + 3) : t; };
    if (nw.length) L.push(card('이 사람 소식', nw.map(n => row({ icon: n.icon, title: esc(short(strip(n.text), 70)), sub: esc(dateText(r.book.world.start, n.t)) })).join('')));
    const line = personLine(r, name, 20);
    if (line.length) L.push(card('연표', line.map(e => evRow(r, e)).join(''), line.length >= 20 ? '최근 20개' : ''));
    return L.join('');
}

// ───── 📍 장소 카드에 붙는 칸 ─────
export function placeThread(r, place) {
    const P = placeLife(r, place), L = [];
    if (!P.visits && !P.ev.length) return '';
    const ppl = [...P.ppl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    L.push(`<div class="ml-rl"><i>👣</i>${P.visits ? `${P.visits}번 옴` : '아직 안 옴'}${P.first != null ? ` <span class="tap" data-act="jump" data-v="${P.first}">· 처음 ${esc(when(r, P.first))}</span>` : ''}</div>`);
    if (ppl.length) L.push(`<div class="ml-rl"><i>🤝</i>여기서 만난 사람: ${ppl.map(([n, k]) => `<span class="tap" data-act="person" data-v="${esc(n)}">${face(r, n)} ${esc(n)}</span> <small>${k}</small>`).join(' · ')}</div>`);
    if (P.ate.length) L.push(`<div class="ml-rl"><i>🧾</i>여기서 산 것: ${P.ate.map(esc).join(' · ')}</div>`);
    return `<h4 class="ml-h4">여기서 있었던 일</h4>${L.join('')}${P.ev.length ? `<div class="ml-card">${P.ev.map(e => evRow(r, e)).join('')}</div>` : ''}`;
}

// ───── 📅 그날 하루 (달력에서 날짜를 누르면) ─────
export function dayThread(r, day) {
    const D = dayInfo(r, day); if (!D || !D.ev.length) return '';
    const L = [];
    const ppl = [...D.ppl.keys()].slice(0, 6), places = [...D.places.keys()].slice(0, 5);
    const sum = [D.spend && `💸 ${money(r, D.spend)}`, D.earn && `💰 +${money(r, D.earn)}`, places.length && `📍 ${places.map(esc).join(' → ')}`].filter(Boolean);
    if (sum.length) L.push(`<div class="ml-rl"><i>📖</i>${sum.join(' <span>·</span> ')}</div>`);
    if (ppl.length) L.push(`<div class="ml-rl"><i>👥</i>${ppl.map(n => `<span class="tap" data-act="person" data-v="${esc(n)}">${face(r, n)} ${esc(n)}</span>`).join(' · ')}</div>`);
    L.push(dayTop(D, 5).map(e => evRow(r, e, false)).join(''));
    return `<h4 class="ml-h4">그날 있었던 일 <span class="tap" data-act="jump" data-v="${D.first}">#${D.first}~</span></h4>${L.join('')}`;
}
// 달력 칸에 「이야기가 있었던 날」 표시
export const lived = (r, day) => !!dayInfo(r, day)?.ev.length;

// ───── 👜 가계부 · 물건 이력 ─────
export function ledgerCard(r) {
    const G = ledger(r, 7); if (!G.spend && !G.earn) return '';
    const max = Math.max(1, ...G.recent.map(D => Math.max(D.spend, D.earn)));
    const ORDER = ['food', 'wear', 'gift', 'etc'];
    // 쓴 돈 막대는 종류별 색으로 쌓기 (식비 · 옷 · 선물 · 기타)
    const bars = G.recent.slice().reverse().map(D => { const d = dateOf(r.book.world.start, D.day * DAY), K = G.dayKind.get(D.day);
        const out = D.spend ? `<span class="out" style="height:${Math.max(4, Math.round(D.spend / max * 100))}%">${ORDER.filter(k => K?.get(k)).map(k => `<i style="flex:${K.get(k)};background:${SPEND[k][2]}"></i>`).join('')}</span>` : '<span class="out" style="height:0"></span>';
        return `<div class="ml-lg" title="${d.m}/${d.d}">${out}<span class="in" style="height:${D.earn ? Math.max(4, Math.round(D.earn / max * 100)) : 0}%"></span><small>${D.pre ? '' : d.d}</small></div>`; }).join('');
    // 📝 한 줄 결산
    const W = G.week, net = W.earn - W.spend, big = [...W.kind.entries()].sort((a, b) => b[1] - a[1])[0];
    const sum = `<div class="ml-lgsum">이번 주 <b class="${net < 0 ? 'neg' : 'pos'}">${net < 0 ? '−' : '+'}${money(r, Math.abs(net))}</b>${big && W.spend ? ` · 대부분 ${SPEND[big[0]][0]} ${SPEND[big[0]][1]}` : ''}</div>`;
    const legend = W.spend ? `<div class="ml-lgkey">${ORDER.filter(k => W.kind.get(k)).map(k => `<span><i style="background:${SPEND[k][2]}"></i>${SPEND[k][1]} ${fmt(W.kind.get(k))}</span>`).join('')}<span><i class="in"></i>들어옴 ${fmt(W.earn)}</span></div>` : '';
    const body = sum + `<div class="ml-ledger">${bars}</div>` + legend
        + row({ icon: '💸', title: '지금까지 쓴 돈', sub: esc(fxText(r.book.world, G.spend)), value: `<b class="neg">${money(r, G.spend)}</b>` })
        + row({ icon: '💰', title: '지금까지 들어온 돈', sub: esc(fxText(r.book.world, G.earn)), value: `<b class="pos">${money(r, G.earn)}</b>` })
        + (G.top.length ? row({ icon: '🏷', title: '제일 많이 쓴 곳', sub: G.top.map(([k, v]) => `${esc(short(k, 14))} ${fmt(v)}`).join(' · ') }) : '');
    return card('가계부', body, '최근 7일');
}
export function itemSheet(r, name) {
    const I = itemLife(r, name);
    const it = r.S.items.find(x => x.name === name);
    const head = it ? row({ icon: it.worn ? '👕' : '📦', title: esc(name), sub: `${it.n}개 가짐${it.worn ? ' · 착용 중' : ''}` }) : '';
    const first = I.first ? row({ icon: '✨', title: '처음 생김', sub: `${esc(I.first.c.why)} · ${esc(when(r, I.first.i))}`, act: 'jump', data: I.first.i }) : '';
    sheet(`👜 ${esc(name)}`, `<div class="ml-card">${head}${first}</div>${I.list.length ? card('이력', I.list.map(e => evRow(r, e)).join('')) : '<div class="ml-hint">기록이 없어요 (시작할 때부터 있던 물건)</div>'}`);
}

// ───── 🏷 딱지 이력 (수치 앱) ─────
export function statusCard(r) {
    const L = statusLife(r, 10); if (!L.length) return '';
    const dur = (s) => (s.t0 != null && s.t1 != null ? (s.t1 - s.t0 >= DAY ? `${Math.round((s.t1 - s.t0) / DAY)}일` : `${Math.max(1, Math.round((s.t1 - s.t0) / 60))}시간`) : '');
    return card('딱지 이력', L.map(s => row({ icon: s.icon, title: `${esc(s.name)}${s.to == null ? ' <span class="ml-pill bad">지금</span>' : ''}`, sub: `${esc(short(s.why, 24))}${dur(s) ? ` · ${dur(s)} 동안` : ''}`, act: 'jump', data: s.to ?? s.from })).join(''), '최근 10개');
}

// ───── 🎲 판정 일지 (이미 저장된 최근 굴림 목록에서) ─────
export function diceLog() {
    const H = getMeta()?.recent?.rolls ?? []; if (H.length < 3) return '';
    const ok = H.filter(x => String(x.res).includes('성공')).length, crit = H.filter(x => x.d === 20).length, fum = H.filter(x => x.d === 1).length;
    const by = new Map(); for (const x of H) { const a = /^\S+/.exec(String(x.text ?? ''))?.[0]; if (a) by.set(a, (by.get(a) ?? 0) + 1); }
    const fav = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    return card('판정 일지', row({ icon: '🎯', title: `성공 ${ok} / ${H.length}`, sub: `성공률 ${Math.round(ok / H.length * 100)}%${crit ? ` · 대성공 ${crit}` : ''}${fum ? ` · 대실패 ${fum}` : ''}${fav ? ` · 자주 쓴 판정 ${esc(fav[0])}` : ''}` }), `최근 ${H.length}번`);
}

// ───── 📒 기록 앱: 🎞 앨범 · 📊 통계 · 📖 하루씩 ─────
export function albumView(r) {
    const A = album(r, 40);
    if (!A.length) return '<div class="ml-hint">단계가 오르거나 새 사람을 만나는 등 큰 순간이 생기면 여기에 모여요.</div>';
    return `<div class="ml-album">${A.map(e => `<div class="ml-alb tap" data-act="jump" data-v="${e.i}"><i>${e.c.icon}</i><b>${esc(e.c.label)}</b><span>${delta(e.c)}</span><small>${esc(short(e.c.why, 30))}</small><em>${esc(when(r, e.i))}</em></div>`).join('')}</div>`;
}
export function statsView(r) {
    const s = stats(r);
    const tile = (ic, v, l) => `<div class="ml-stat"><i>${ic}</i><b>${v}</b><small>${l}</small></div>`;
    return `<div class="ml-stats">${[
        tile('💬', s.turns, '바뀐 답'), tile('📅', s.span, '흐른 날'), tile('👥', s.people, '만난 사람'), tile('📍', s.places, '가 본 곳'),
        tile('💸', fmt(s.spend), `쓴 ${esc(r.book.world.currency)}`), tile('🍽', s.tasted, '먹어 본 것'),
    ].join('')}</div>`
        + card('', [s.place && row({ icon: '🏠', title: '제일 오래 있던 곳', sub: `${esc(s.place[0])} · 답 ${s.place[1]}개` }),
            s.aff && s.aff[1] > 0 && row({ icon: '💗', title: '애정이 제일 많이 오른 사람', sub: `${face(r, s.aff[0])} ${esc(s.aff[0])} · ${signed(s.aff[1])}`, act: 'person', data: s.aff[0] }),
            r.S.tasted?.length && row({ icon: '🍽', title: '먹어 본 것', sub: r.S.tasted.slice(-12).map(esc).join(' · ') })].filter(Boolean).join(''));
}
export function daysView(r) {
    const list = [...thread(r).days.values()].filter(D => D.ev.length).sort((a, b) => b.day - a.day).slice(0, 30);
    if (!list.length) return '<div class="ml-hint">아직 하루치 기록이 없어요.</div>';
    return list.map(D => {
        const ppl = [...D.ppl.keys()].slice(0, 4).map(n => face(r, n)).join('');
        const sub = [D.spend && `💸 ${fmt(D.spend)}`, [...D.places.keys()].slice(0, 3).map(esc).join('→'), ppl].filter(Boolean).join(' · ');
        return `<details class="ml-dayc"><summary><b>${esc(dateText(r.book.world.start, D.day * DAY, false))}</b><small>${sub}</small><span class="ml-pill">${D.n}답</span></summary>`
            + `<div class="ml-card">${dayTop(D, 6).map(e => evRow(r, e, false)).join('')}</div></details>`;
    }).join('') + (thread(r).days.size > 30 ? '<div class="ml-hint">최근 30일만 보여요</div>' : '');
}

// ───── 🏠 홈 위젯: 오늘 한 줄 ─────
export function todayLine(r) {
    const day = Math.floor(r.S.t / DAY), D = dayInfo(r, day); if (!D?.ev.length) return '';
    const top = dayTop(D, 1)[0]; if (!top) return '';
    const n = D.ev.length;
    return `<div class="ml-rl tap" data-act="jump" data-v="${top.i}"><i>${top.c.icon}</i><b>${esc(top.c.label)}</b> ${delta(top.c)} <span>${esc(short(top.c.why, 24))}</span></div>`
        + `<div class="ml-rl dim"><i>📖</i>오늘 바뀐 것 ${n}개${D.spend ? ` · 💸 ${money(r, D.spend)}` : ''}${D.ppl.size ? ` · ${[...D.ppl.keys()].slice(0, 4).map(x => face(r, x)).join('')}` : ''}</div>`
        + agoLine(r, day);
}
// 🕰 일주일 · 한 달 · 1년 전 오늘 (이야기 속 날짜 · 그날 기록이 있을 때만 한 줄)
function agoLine(r, day) {
    for (const [k, label] of [[365, '1년 전 오늘'], [30, '한 달 전 오늘'], [7, '일주일 전 오늘']]) {
        const top = dayTop(dayInfo(r, day - k), 1)[0];
        if (top) return `<div class="ml-rl tap dim" data-act="jump" data-v="${top.i}"><i>🕰</i>${label} · ${esc(top.c.label)} ${delta(top.c)} <span>${esc(short(top.c.why, 20))}</span></div>`;
    }
    return '';
}

// ───── 누르기 ─────
export function threadAct(act, v, r) {
    if (act === 'th-dday') {
        const [d, ...nm] = String(v).split('|'), day = Number(d), name = nm.join('|').slice(0, 40), cal = calOf(); if (!cal || !Number.isFinite(day)) return false;
        if (!cal.dday.some(x => x.day === day && x.name === name)) cal.dday.push({ id: uid(), name, day, pin: !cal.dday.length });
        saveMeta(); toast(`📌 ${name} — D-day에 넣었어요`, 'good'); app.refresh?.();
        document.querySelector('.ml-bs')?.remove();
        return true;
    }
    if (act === 'th-item') { itemSheet(r, v); return true; }
    return false;
}
