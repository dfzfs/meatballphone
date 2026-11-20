// 전체화면 탭 — 앱 화면 그리기 (수치 · 주사위 · 소지품 · 관계 · 지도 · 달력 · 기록 · 속마음 · 내 탭 · 설정집 · 영향력)
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
import { d20Svg, lastAI, money, fxOf, itemBtns, itemMemo, changeRow, turnCard, STAGE_COLOR, recoverOf, needCard, gaugeCard } from './tabs-shared.js';
function now(r) {
    const { S, book } = r, li = lastAI(), last = r.changes[li] ?? [];
    const dz = derived(book, S);
    const tags = [...S.status.map(s => chip(`${s.src === 'fate' ? '🔮 ' : ''}${esc(s.name)}${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}${s.dice ? ` · 🎲${signed(s.dice)}` : ''}`, s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : 'mid')),
        ...dz.filter(d => d.stage === '위험').map(d => chip(`${d.icon} ${esc(d.name)} 위험 · 🎲${d.dice}`, 'bad'))];
    const V = (k) => vis('now', k);
    let h = !V('tags') ? '' : `<h4 class="ml-h4">상태 딱지</h4><div class="ml-chips">${tags.join('') || '<span class="ml-sub">없음</span>'}</div>`;
    const side = [];
    if (modOn('music')) side.push(songLine(S));
    if (modOn('quote')) side.push(quoteLine(S));
    { const l = luckOf(book, S, ctx().getCurrentChatId?.(), getMeta().luckRoll); side.push(`<div class="ml-scene luck"><i>🍀</i><span><b>${esc(l.text)}</b><small>오늘 운세 · 선택지에 🍀 · ⚠로 보여요</small></span></div>`); }
    if (side.length && V('scene')) h += `<h4 class="ml-h4">이 장면</h4><div class="ml-scenes">${side.join('')}</div>`;
    if (modOn('stats')) {
        if (V('needs')) h += `<h4 class="ml-h4">욕구 <span>달력 시간으로 줄어요</span></h4><div class="ml-gcs">${book.me.needs.map(n => needCard(r, n, last)).join('')}</div>`;
        if (book.me.gauges.length && V('gauges')) h += `<h4 class="ml-h4">게이지</h4><div class="ml-gcs">${book.me.gauges.map(g => gaugeCard(r, g, last)).join('')}</div>`;
        if (book.me.attrs.length && V('attrs'))
            h += `<h4 class="ml-h4">능력치 <span>주사위 보정</span></h4><div class="ml-attrs">${book.me.attrs
                .map((a) => {
                    const gear = S.items.filter((it) => it.worn && num(it.fx?.[a.name])).reduce((x, it) => x + num(it.fx[a.name]), 0);
                    return (
                        `<div class="ml-attr tap" data-act="rollattr" data-v="${esc(a.name)}"><small>${esc(a.name)}</small><b>${signed(S.attrs[a.name] ?? 0)}` +
                        `</b>${gear ? `<em>👕${signed(gear)}</em>` : ''}</div>`
                    );
                })
                .join('')}</div>`;
    }
    if (modOn('stats') && V('rhythm')) { // 🕰 리듬 · 회복 맛집 (지난 기록에서 · 보기만)
        const RH = needRhythm(r), L = book.me.needs.map(n => { const x = RH.get(n.key); if (!x?.low && !x?.spot) return '';
            return row({ icon: n.icon, title: esc(n.name), sub: [x.low && `보통 ${x.low[0]}에 바닥 (${x.low[1]}번)`, x.spot && `회복은 ${esc(x.spot[0])}에서 제일 많이 (+${Math.round(x.spot[1])})`].filter(Boolean).join(' · ') }); }).filter(Boolean);
        if (L.length) h += card('리듬 · 회복 맛집', L.join(''), '지난 기록에서');
    }
    if (V('turn')) h += turnCard(r, li);
    if (V('history')) h += statusCard(r); // 🧵 딱지 이력 (보기만)
    return h;
}
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
    const base = (x) => x.why === diceSel.attr || x.why.endsWith('착용');
    const mod = P.filter(x => on || base(x)).reduce((a, x) => a + x.n, 0);
    let ok = 1; for (let k = 2; k <= 19; k++) if (k + mod >= diceSel.dc) ok++;
    const req = S.rolls.slice(-3).reverse();
    let h = req.length ? `<h4 class="ml-h4">이야기에서 요청한 판정</h4>${req.map(q => `<div class="ml-rl tap" data-act="jump" data-v="${q.i}"><i>📣</i>${esc(q.what)}</div>`).join('')}` : '';
    h += `<h4 class="ml-h4">능력치</h4><div class="ml-chips">${attrs.map(a => `<button class="ml-btn xs${diceSel.attr === a ? ' on' : ''}" data-act="dset" data-v="attr:${esc(a)}">${esc(a)} ${signed(S.attrs[a] ?? 0)}</button>`).join('')}</div>`;
    h += `<h4 class="ml-h4">난이도</h4><div class="ml-chips">${DCS.map(([n, v]) => `<button class="ml-btn xs${diceSel.dc === v ? ' on' : ''}" data-act="dset" data-v="dc:${v}">${n} ${v}</button>`).join('')}</div>`;
    h += `<h4 class="ml-h4">보정 내역 ${on ? '' : '<span>상태 보정은 영향력 3부터 적용</span>'}</h4><div class="ml-rc">${P.length ? P.map(x => `<div class="ml-rl${on || base(x) ? '' : ' dim'}"><i>${x.fate ? '🔮' : x.n < 0 ? '⬇️' : '⬆️'}</i>${esc(x.why)} <b class="${x.n < 0 ? 'neg' : 'pos'}`
        + `">${signed(x.n)}</b></div>`).join('') : '<div class="ml-rl dim"><i>·</i>보정 없음</div>'}<div class="ml-rl"><i>🎯</i>d20 ${signed(mod)} ≥ ${diceSel.dc} <span>성공 확률 ${Math.round(ok / 20 * 100)}%</span></div></div>`;
    const last = getMeta().recent?.rolls?.[0];
    h = `<div class="ml-dhero"><button class="ml-dbtn `
        + `big${last && Date.now() - (last.at ?? 0) < 2500 ? (last.d === 20 ? ' burst' : last.d === 1 ? ' shake' : '') : ''}" data-act="roll" `
        + `data-v="${mod}`
        + `">${d20Svg(last?.d ?? 20, last ? `${last.res.includes('성공') ? 'ok' : 'no'}${last.d === 20 ? ' crit' : last.d === 1 ? ' fumble' : ''}` : '')}`
        + `${last?.d === 20 && Date.now() - (last.at ?? 0) < 2500 ? `<span class="ml-spark">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<i style="--a:${i * 45}deg">✦</i>`).join('')}</span>` : ''}`
        + `</button><div `
        + `class="ml-dres">${last ? `<b class="${last.res.includes('성공') ? 'pos' : 'neg'}">${esc(last.res)}</b><span>${last.d}${signed(last.tot - last.d)} = ${last.tot}</span>` : '<b>굴려 볼까요?</b><span>주사위를 눌러요</span>'}`
        + `</div><div class="ml-dodds"><span style="--p:${Math.round(ok / 20 * 100)}%"></span><b>${Math.round(ok / 20 * 100)}%</b><small>성공</small>`
        + `</div></div>` + h;
    h += `<h4 class="ml-h4">오늘 운세 `
        + `주사위</h4>${lk.rolled ? `<div class="ml-scene luck"><i>🍀</i><span><b>${esc(lk.text)}</b><small>🎲 ${lk.d} · 이야기 속 하루에 한 번</small></span></div>` : `<div class="ml-scene luck tap" data-act="luckroll"><i>🎲</i><span><b>오늘 운세 굴리기</b><small>선택지에 🍀 · ⚠로 반영돼요</small></span><em>굴리기</em></div>`}`;
    const hist = getMeta().recent?.rolls ?? [];
    if (hist.length) h += `<h4 class="ml-h4">최근 굴림</h4><div class="ml-dhist">${hist.map(x => `<span class="${x.res.includes('성공') ? 'ok' : 'no'}" title="${esc(x.text)}">${x.d ?? '?'}</span>`).join('')}</div>`;
    h += diceLog(); // 🧵 판정 일지 (보기만)
    return h;
}
// ───── 소지품 · 재산 (+ 상점 미니 선택지) ─────
function bag(r) {
    const { S, book } = r, place = placeOf(book, S.loc);
    const V = (k) => vis('bag', k);
    let h = !V('cash')
        ? ''
        : card(
              '재산',
              row({
                  icon: '💰',
                  title: '가진 돈',
                  sub: `${fxText(book.world, S.cash) ? `${esc(fxText(book.world, S.cash))} · ` : ''}식사 한 끼 ≈ ${money(r, book.world.meal)}${fxOf(r, book.world.meal)}`,
                  value: `<b class="ml-num">${money(r, S.cash)}</b>`,
                  act: 'edit-cash',
                  more: true,
              }) +
                  row({
                      icon: '💱',
                      title: '화폐 · 환율',
                      sub: book.world.fx?.rate > 0 ? `1 ${esc(book.world.currency)} = ${fmt(book.world.fx.rate)}원` : `${esc(book.world.currency)} · 1 ${esc(book.world.currency)}이 몇 원인지 적어 두기`,
                      act: 'edit-fx',
                      more: true,
                  }),
          );
    if (V('ledger')) h += ledgerCard(r); // 🧵 가계부 (보기만)
    if (V('items'))
        h += card(
            '소지품',
            S.items.length ? bagGroups(r) : row({ icon: '📦', title: '비어 있어요', faint: true }),
        );
    if (place?.goods.length && V('shop')) h += card(`${PLACE_KINDS[place.kind]} ${esc(place.name)} 가게`, place.goods.map(g => goodRow(r, g)).join(''));
    return h + sneakCard(r, 'bag');
}
// 👜 가방 칸: 👕 입은 것 · 🎁 받은 것 · 🍞 먹을 것 · 👗 옷 · 📦 잡동사니 (이름 · 효과 · 기록으로 나눔 · 저장 0)
const BAG_G = [['worn', '👕 입고 있는 것'], ['memo', '🎁 받은 것 · 추억'], ['food', '🍞 먹을 것'], ['wear', '👗 옷 · 꾸밈'], ['etc', '📦 잡동사니']];
function bagGroups(r) {
    const { S, book } = r, G = new Map();
    for (const it of S.items) {
        const kind = itemKind(book, it.name, it.fx), memo = isSecret(it) ? null : itemMemo(r, it);
        const g = it.worn ? 'worn' : isSecret(it) || memo ? 'memo' : kind;
        const fx = Object.entries(it.fx).map(([k, v]) => `${book.me.needs.find((n) => n.key === k)?.name ?? k} ${signed(v)}`).join(' · ');
        const sub = isSecret(it) ? secretSub(it) : [it.worn ? '착용 중' : '', memo ?? '', fx].filter(Boolean).join(' · ');
        (G.get(g) ?? G.set(g, []).get(g)).push(row({ act: 'th-item', data: it.name, icon: isSecret(it) ? '🎁' : it.worn ? '👕' : kind === 'food' ? '🍞' : kind === 'wear' ? '👗' : memo ? '🎁' : '📦', title: `${esc(it.name)}${it.n > 1 ? ` ×${it.n}` : ''}`, sub, value: itemBtns(r, it, kind) }));
    }
    const many = G.size > 1;
    return BAG_G.filter(([k]) => G.has(k)).map(([k, t]) => `${many ? `<div class="ml-bagh">${t} ${G.get(k).length}</div>` : ''}${G.get(k).join('')}`).join('');
}
function goodRow(r, g) {
    const price = g.price, poor = r.S.cash < price;
    const liked = Object.values(r.S.rel).some(x => x.seen.likes.some(l => g.name.includes(l)));
    const fx = Object.entries(g.fx).map(([k, v]) => `${r.book.me.needs.find(n => n.key === k)?.name ?? k} ${signed(v)}`).join(' · ');
    return row({ icon: liked ? '🎁' : '🛒', title: esc(g.name), sub: `−${money(r, price)}${fxOf(r, price)} · ${fx || '물건'}${poor ? ' · 돈 부족' : ''}`, value: poor ? '' : btn('사기', 'say', `${g.name} 하나 주세요.`), faint: poor });
}
// ───── 관계 ─────
function rel(r) {
    const names = Object.keys(r.S.rel);
    if (!names.length) return empty('아직 만난 사람이 없어요.');
    const here = new Set(r.S.with), on = names.filter(n => !r.S.rel[n].gone), off = names.filter(n => r.S.rel[n].gone);
    on.sort((a, b) => (here.has(b) - here.has(a)) || (r.S.rel[b].aff - r.S.rel[a].aff));
    const view = getMeta().relView ?? 'card', np = Object.keys(r.S.pairs ?? {}).length;
    const head = `<div class="ml-relbar">${seg('relv', [['card', '👥 카드'], ['route', '💞 루트 비교'], ['pair', `🔗 인물끼리${np ? ` ${np}` : ''}`]], view)}<span class="ml-sp"></span>${seg('hide', [['0', '숫자'], ['1', '숨기기']], getMeta().hideNums ? 1 : 0)}</div>`;
    if (view === 'route') return head + routeView(r, on);
    if (view === 'pair') return head + pairView(r, on);
    const meta = getMeta(), stars = on.filter(n => isStar(meta, r.book, n)), rest = on.filter(n => !isStar(meta, r.book, n));
    const lite = (n) => { const x = r.S.rel[n], p = personOf(r.book, n), st = relStage(r.book, x.aff, n), v = p?.noLove ? x.trust : x.aff;
        return `<div class="ml-wp tap" data-act="person" data-v="${esc(n)}"><span>${faceOf(p?.face || x.face, '🙂')}</span><b>${esc(n)}</b><span class="ml-pill love">${esc(p?.noLove ? '친구' : st.name)}</span>`
            + `${here.has(n) ? '<span class="ml-pill good">함께</span>' : ''}<span class="ml-bar love"><i style="width:${v}%"></i></span><em>${getMeta().hideNums ? '' : v}</em>`
            + `<button class="ml-star" data-act="star" data-v="${esc(n)}" title="주요 인물로">☆</button></div>`; };
    return head + `<div class="ml-sub">⭐ 주요 인물 ${stars.length}명 · 그 외 ${rest.length}명${here.size ? ` · 지금 ${here.size}명과 함께` : ''}</div>`
        + `<div class="ml-rcs">${stars.map(n => relCard(r, n)).join('') || '<div class="ml-sub dim">☆를 눌러 주요 인물을 정해요</div>'}</div>`
        + (rest.length ? `<h4 class="ml-h4">그 외 인물 <span>가볍게 · ☆를 누르면 주요 인물(자세히 · 규칙 채우기)</span></h4><div class="ml-card">${rest.map(lite).join('')}</div>` : '') + (off.length ? `<h4 class="ml-h4">이야기에서 빠진 사람</h4><div class="ml-rcs">${off.map(n => relCard(r, n)).join('')}</div>` : '');
}
// 💞 루트 비교: 애정 순 · 단계 진행 · 다음 단계까지 · 최근 흐름(최근 30답 애정 합) · 아는 취향
function routeView(r, on) {
    const { book, S } = r, hide = getMeta().hideNums, love = on.filter(n => !personOf(book, n)?.noLove);
    if (!love.length) return empty('애정을 켠 사람이 없어요.');
    const since = Math.max(0, r.changes.length - 30), trend = (n) => { let t = 0; for (let i = since; i < r.changes.length; i++) for (const c of r.changes[i] ?? []) if (c.f === `rel.${n}.aff`) t += c.to - c.from; return t; };
    const rows = love.map(n => { const x = S.rel[n], L = stagesOf(book, n), st = relStage(book, x.aff, n), k = L.indexOf(st), nx = nextStage(book, x.aff, n); return { n, x, L, st, k, nx, tr: trend(n), p: personOf(book, n) }; }).sort((a, b) => b.x.aff - a.x.aff);
    const top = rows[0];
    let h = `<div class="ml-sub">애정이 가장 높은 사람: <b>${esc(top.p?.face ?? '🙂')} ${esc(top.n)}</b> · 「${esc(top.st.name)}」</div><div class="ml-route">`;
    h += rows.map((q, i) => `<div class="ml-rt tap" data-act="person" data-v="${esc(q.n)}"><div class="ml-rt-h"><b>${i + 1}</b><span class="ml-face">${q.p?.face ?? '🙂'}</span>`
        + `<b>${esc(q.n)}</b><span class="ml-pill love">${esc(q.st.name)}</span>${S.with.includes(q.n) ? '<span class="ml-pill good">함께</span>' : ''}`
        + `<span class="ml-sp">`
        + `</span>${q.tr ? `<em class="${q.tr > 0 ? 'pos' : 'neg'}">${q.tr > 0 ? '▲' : '▼'}${hide ? '' : Math.abs(q.tr)}</em>` : '<em class="dim">—</em>'}</div>
        <div class="ml-rt-steps">${q.L.map((s2, j) => `<i class="${j < q.k ? 'done' : j === q.k ? 'on' : ''}" title="${esc(s2.name)}"></i>`).join('')}</div>
        <div class="ml-rt-f"><span>💗 ${hide ? '' : q.x.aff} · 🤝 ${hide ? '' : q.x.trust}</span>`
        + `<span>${q.nx ? `🔓 「${esc(q.nx.name)}」까지 ${hide ? '조금' : q.nx.at - q.x.aff}` : '🏁 마지막 단계'}</span><span>🎁 아는 취향 ${q.x.seen.likes.length}`
        + `</span>${q.x.jealous ? '<span>💢 질투</span>' : ''}</div></div>`).join('');
    return h + '</div><div class="ml-sub dim">▲▼ 최근 30답 애정 흐름 · 단계는 인물마다 다를 수 있어요</div>';
}
// 🔗 인물끼리: 이야기 속에서 생긴 사이 (pair 태그) + 설정집 「다른 사람과」
function pairView(r, on) {
    const { book, S } = r, hide = getMeta().hideNums, E = Object.entries(S.pairs ?? {});
    let h = '';
    if (!E.length) h += empty('아직 인물끼리의 사이가 없어요. 본편에서 둘 사이가 바뀌면 여기에 쌓여요.');
    else h += `<div class="ml-rcs">${E.sort((a, b) => Math.abs(b[1].v) - Math.abs(a[1].v)).map(([k, pr]) => { const [A, B] = k.split('|'), fa = personOf(book, A)?.face ?? '🙂', fb = personOf(book, B)?.face ?? '🙂', w = Math.abs(pr.v);
        return `<div class="ml-rc ml-pair"><div class="ml-rc-h"><span class="ml-face">${fa}</span><b>${esc(A)}</b><span class="ml-sub">↔</span><span `
            + `class="ml-face">${fb}</span><b>${esc(B)}</b>${pr.label ? `<span class="ml-pill mid">${esc(pr.label)}</span>` : ''}<span class="ml-sp">`
            + `</span>${btn('✏️', 'pair-edit', k, 'xs')}</div>
        <div class="ml-pbar"><div class="l"><span style="width:${pr.v < 0 ? w : 0}%"></span></div><i></i><div class="r"><span `
            + `style="width:${pr.v > 0 ? w : 0}%"></span></div></div><div class="ml-rl dim"><i>${pr.v >= 30 ? '😊' : pr.v <= -30 ? '😠' : '😐'}`
            + `</i>${hide ? '' : `${signed(pr.v)} · `}${esc(pr.why || '설정집')}</div></div>`; }).join('')}</div>`;
    return h + `<div class="ml-acts">${btn('＋ 사이 적기', 'pair-edit', '', 'xs')}</div>`;
}
// 사람 카드 하나 (dev 관계 카드 기준 + 이유 · 해금 · 기억 · 취향 · 루틴)
function lastRel(r, name) {
    for (let i = r.changes.length - 1, k = 0; i >= 0 && k < 300; i--, k++) { const c = (r.changes[i] ?? []).find(x => x.who === name && /^rel\./.test(x.f)); if (c) return { c, i }; }
    return null;
}
function meter(kind, label, v, ticks, hide, who = '') {
    return `<div class="ml-meter ${kind}${who ? ' tap' : ''}`
        + `"${who ? ` data-act="edit-val" data-v="${kind === 'love' ? 'aff' : 'trust'}|${esc(who)}" title="고치기"` : ''}><span>${label}</span><span `
        + `class="ml-track"><b style="width:${v}%"></b>${ticks.map(t => `<i style="left:${t}%"></i>`).join('')}</span><em>${hide ? '' : v}</em></div>`;
}
function relCard(r, name, inSheet = false) {
    const { book, S } = r, x = S.rel[name]; if (!x) return '';
    const p = personOf(book, name), st = relStage(book, x.aff, name), nx = nextStage(book, x.aff, name), hide = getMeta().hideNums;
    const ticks = stagesOf(book, name).map(s => s.at).filter(a => a > 0 && a < 100);
    const sign = p?.signs?.filter(s => x.aff >= s.at).pop()?.text;
    const last = lastRel(r, name);
    const nowAt = p?.routine?.find(q => inPeriod(q.at, periodName(S.t)))?.place ?? p?.haunt?.[0];
    const pills = [x.gone ? `<span class="ml-pill mid">🕊 ${esc(x.gone)}</span>` : `<span class="ml-pill love">${esc(p?.noLove ? '친구' : st.name)}</span>`,
        S.with.includes(name) && '<span class="ml-pill good">함께 있음</span>',
        x.jealous && `<span class="ml-pill bad">💢 질투</span>`,
        p?.noLove && '<span class="ml-pill mid">애정 꺼 둠</span>',
        !x.gone && (() => { const w = relWeather(r, name); return w ? `<span class="ml-pill" title="최근 변화 5개">${w[0]} ${w[1]}</span>` : ''; })(), // 🌦 관계 날씨
        !x.gone && !S.with.includes(name) && (() => { const d = lastSeen(r, name); return d != null && d >= 3 ? `<span class="ml-pill mid">${d}일째 못 봄</span>` : ''; })()].filter(Boolean).join('');
    const L = [], V = (k) => vis('rel', k);
    if (!x.gone) {
        if (V('meters') && !p?.noLove) L.push(meter('love', '애정', x.aff, ticks, hide, name));
        if (V('meters')) L.push(meter('trust', '우정', x.trust, [], hide, name));
        if (hide) L.push(`<div class="ml-rl"><i>👀</i>${esc(sign || '아직 속을 모르겠다')}</div>`);
        if (V('call') && !p?.noLove) L.push(`<div class="ml-rl"><i>🗣</i><b>${esc(st.call)}</b><span>· ${esc(st.act)}</span></div>`);
        if (V('next') && nx && !p?.noLove) L.push(`<div class="ml-rl"><i>🔓</i>다음 「${esc(nx.name)}」까지 ${hide ? '조금 더' : `애정 ${nx.at - x.aff}`} <span>→ ${esc(nx.call)} · ${esc(nx.act)}</span></div>`);
        if (V('last') && last) L.push(`<div class="ml-rl tap" data-act="jump" data-v="${last.i}"><i>${last.c.icon}</i>최근 ${hide ? '' : `<b class="${last.c.to < last.c.from ? 'neg' : 'pos'}">${signed(last.c.to - last.c.from)}</b>`} ${esc(last.c.why)} <span>#${last.i}</span></div>`);
        if (V('want') && x.want) L.push(`<div class="ml-rl"><i>🎯</i>${esc(x.want)}</div>`);
        if (x.jealous) L.push(`<div class="ml-rl"><i>💢</i>${esc(x.jealous)}</div>`);
        if (x.life) L.push(`<div class="ml-rl"><i>🌙</i>${esc(x.life)}</div>`);
        const mem = x.mem.filter(m => !x.jealous || !m.text.includes(x.jealous));
        if (V('mem') && mem[0]) L.push(`<div class="ml-rl"><i>💬</i>${esc(mem[0].text)}${mem.length > 1 ? ` <span>외 ${mem.length - 1}개</span>` : ''}</div>`);
        const tl = [...x.seen.likes.map(t => `<span class="ml-tag good">${esc(t)}</span>`), ...x.seen.hates.map(t => `<span class="ml-tag bad">${esc(t)}</span>`)];
        if (V('taste') && tl.length) L.push(`<div class="ml-rl"><i>🎁</i>${tl.join('')}</div>`);
        { // 🎁 선물 궁합: 그 사람이 좋아하는 게 내 가방에 있으면
            const likes = [...x.seen.likes, ...(p?.likes ?? [])].map(norm).filter(l => l.length >= 2);
            const fit = S.items.filter(it => !it.worn && likes.some(l => norm(it.name).includes(l) || l.includes(norm(it.name)))).slice(0, 2);
            if (V('taste') && fit.length && !x.gone) L.push(`<div class="ml-rl"><i>💝</i>가방에 ${esc(name)}이(가) 좋아할 것: ${fit.map(it => `<b>${esc(it.name)}</b>`).join(' · ')} ${btn('건네기', 'say', `${name}에게 ${fit[0].name}을(를) 건넨다.`, 'xs')}</div>`);
        }
        const day = p?.day || x.day, meta2 = [nowAt && `📍 ${esc(nowAt)}`, day && `🎂 ${esc(day)}`].filter(Boolean);
        if (V('place') && meta2.length) L.push(`<div class="ml-rl dim"><i></i>${meta2.join('<span>·</span>')}</div>`);
    }
    // 이야기 중에 처음 나온 인물: 설정집에 규칙이 없으면 (B는 저절로 한 번 · 실패했거나 A면) 버튼으로
    const tried = getMeta().npcTried?.[name], fillBtn = !p && !x.gone && tried !== 'try' ? btn(tried === 'fail' ? '⚠ 규칙 채우기' : '📋 규칙 채우기', 'npc-fill', name, 'xs') : '';
    const acts = x.gone ? btn('돌아옴', 'gone', name, 'xs') : `${fillBtn}${btn('🎁<span> 선물</span>', 'say', `${name}에게 선물을 건넨다.`, 'xs')}${inSheet ? '' : btn('더보기', 'person', name, 'xs')}`;
    return `<div class="ml-rc${x.gone ? ' gone' : ''}"><div class="ml-rc-h"><span class="ml-face${getMeta()?.love?.[name] ? ' ml-face-love' : ''}"${inSheet ? '' : ` data-act="person" data-v="${esc(name)}"`}`
        + `>${p?.face || x.face || '🙂'}</span><b${inSheet ? '' : ` class="tap" data-act="person" data-v="${esc(name)}"`}>${esc(name)}</b>${pills}`
        + `<span class="ml-sp"></span>${inSheet ? '' : `<button class="ml-star on" data-act="star" data-v="${esc(name)}" title="주요 인물에서 빼기">⭐</button>`}${acts}`
        + `</div>${(p?.line || x.line) && vis('rel', 'line') ? `<div class="ml-rc-line">${esc(p?.line || x.line)}</div>` : ''}${L.join('')}</div>`;
}
export function personSheet(r, name) {
    const { book, S } = r, x = S.rel[name], p = personOf(book, name); if (!x) return;
    const L = [];
    if (p?.noLove) L.push('<h4 class="ml-h4">관계 단계</h4><div class="ml-rl"><i>💔</i>애정 꺼 둠 · 「친구」로만 지내요 <span>우정만 쌓여요</span></div>');
    else L.push(`<h4 class="ml-h4">관계 단계</h4><div class="ml-steps">${p?.stages ? '<small class="ml-sub">이 사람만의 단계</small>' : ''}${stagesOf(book, name).map(s2 => `<div class="${relStage(book, x.aff, name).name === s2.name ? 'on' : x.aff >= s2.at ? 'done' : ''}"><b>${esc(s2.name)}</b><small>${s2.at}`
        + `~ · ${esc(s2.call)} · ${esc(s2.act)}</small></div>`).join('')}</div>`);
    const mine = Object.entries(S.pairs ?? {}).filter(([k]) => k.split('|').includes(name));
    if (mine.length) L.push(`<h4 class="ml-h4">다른 사람과</h4>${mine.map(([k, pr]) => { const o = k.split('|').find(z => z !== name); return `<div class="ml-rl"><i>${personOf(book, o)?.face ?? '🙂'}</i><b>${esc(o)}</b> ${pr.label ? `<span class="ml-tag">${esc(pr.label)}</span>` : ''}`
        + `<span>${getMeta().hideNums ? '' : signed(pr.v)} ${esc(pr.why)}</span></div>`; }).join('')}`);
    if (x.mem.length) L.push(`<h4 class="ml-h4">감정 기억</h4>${x.mem.map(m => `<div class="ml-rl"><i>💬</i>${esc(m.text)} <span>${dateText(book.world.start, m.t, false)}</span></div>`).join('')}`);
    if (p?.signs?.length) L.push(`<h4 class="ml-h4">티 나는 반응</h4>${p.signs.map(sg => `<div class="ml-rl${x.aff >= sg.at ? '' : ' dim'}"><i>${x.aff >= sg.at ? '👀' : '🔒'}</i>애정 ${sg.at}~ <span>${esc(sg.text)}</span></div>`).join('')}`);
    if (p?.up?.length || p?.down?.length) L.push(`<h4 class="ml-h4">오르는 일 · 내리는 일</h4><div class="ml-rl">`
        + `<i>⬆️</i>${p.up.map(a => `<span class="ml-tag good">${esc(a.act)}${a.d != null ? ` +${a.d}` : ''}</span>`).join('') || '<span>-</span>'}`
        + `</div><div class="ml-rl">`
        + `<i>⬇️</i>${p.down.map(a => `<span class="ml-tag bad">${esc(a.act)}${a.d != null ? ` ${a.d}` : ''}</span>`).join('') || '<span>-</span>'}`
        + `</div>`);
    if (p?.syn?.length) L.push(`<h4 class="ml-h4">다른 사람과</h4>${p.syn.map(sy => `<div class="ml-rl"><i>🔗</i>${esc(sy.to)} <span>${esc(sy.text)}</span></div>`).join('')}`);
    if (p?.routine?.length) L.push(`<h4 class="ml-h4">하루 루틴</h4>${p.routine.map(q => `<div class="ml-rl"><i>🕰</i>${esc(q.at)} <span>${esc(q.place)}</span></div>`).join('')}`);
    if (vis('rel', 'thread')) L.push(personThread(r, name)); // 🧵 처음 · 함께한 시간 · 같이 들은 곡 · 연표 (보기만)
    L.push(`<div class="ml-acts">${btn('📅 약속 잡기', 'say', `${name}에게 약속을 잡자고 한다.`, 'xs')}${btn('✏️ 설정집에서 고치기', 'bk-person', name, 'xs')}${btn('🔗 합치기', 'merge', name, 'xs')}${btn('🕊 빠짐', 'gone', name, 'xs')}</div>`);
    sheet(`${p?.face || '🙂'} ${esc(name)}`, `<div class="ml-rcs">${relCard(r, name, true)}</div>${L.join('')}`);
}
// ───── 지도: dev 노선도 · 인물 핀 · 건물 정면도 + 「지금 가면 누구를 만날지」 · 장소마다 회복 · 물가 · 사건 ─────
let mapSel = null;
export const setMapSel = (v) => { mapSel = v; };
function map(r) {
    const { book, S } = r, meta = getMeta(), hide = new Set(meta.mapHide ?? []);
    const places = book.world.places.filter(p => !hide.has(p.name) || p.name === S.loc);
    if (!book.world.places.length) return empty('설정집에 장소가 없어요.', '장소 넣기', 'tab-book');
    const sl = periodName(S.t);
    const at = new Map(); // 장소 → [{ e, name, why }]
    const pinOK = (n) => !meta.mapPins || meta.mapPins.includes(n);
    for (const p of book.people) { if (!pinOK(p.name)) continue; const w = whereNow(book, S, p); if (w?.place) { const k = placeOf(book, w.place)?.name ?? w.place; (at.get(k) ?? at.set(k, []).get(k)).push({ e: p.face, name: p.name, why: w.why }); } }
    const { pos, pairs, adj } = layout(places);
    const sel = placeOf(book, mapSel) ?? placeOf(book, S.loc) ?? places[0];
    const path = route(adj, placeOf(book, S.loc)?.name, sel.name), onPath = new Set(path.slice(1).map((n, i) => [path[i], n].sort().join('|')));
    for (const e of pairs) e.route = onPath.has(e.key);
    const net = lineEdges(pairs, pos);
    const T = vis('map', 'foot') ? thread(r) : null;
    // 🙂 장소 기분(좋은 일 · 나쁜 일이 많았던 곳) · 🔢 오늘 동선 순서 — 보기만
    const MO = T ? placeMood(r) : null, RT = T ? todayRoute(r) : [];
    const nodes = lineNodes(places, { pos, here: S.loc, sel: sel.name, net, pins: (p) => at.get(p.name) ?? [], visits: T ? (n) => T.visits.get(n) ?? 0 : null,
        mood: MO ? (n) => { const v = MO.get(n) ?? 0; return v >= 2 ? 'good' : v <= -2 ? 'bad' : ''; } : null, order: RT.length > 1 ? (n) => RT.lastIndexOf(n) + 1 : null });
    const [x0, y0, x1, y1] = nodes.ext, pad = 4;
    const svg = `<svg class="ml-map" viewBox="${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}" preserveAspectRatio="xMidYMid meet"><g class="edges">${net.svg}</g>${nodes.svg}</svg>`;
    const V = (k) => vis('map', k);
    const tools = `${btn('📍 핀 인물', 'map-pins', '', 'xs')}${hide.size ? btn(`👁 숨긴 장소 ${hide.size}곳`, 'map-unhide', '', 'xs') : ''}`;
    let h = `<div class="ml-maphead"><span>📍 지금 <b>${esc(S.loc || '어딘가')}</b> · ${sl}</span>${tools}</div>`;
    if (V('map')) h += `<div class="ml-mapwrap">${svg}</div>`;
    const who = [...at.entries()].flatMap(([pl, L]) => L.map(x => ({ ...x, pl })));
    if (who.length && V('pins')) h += `<div class="ml-pinrow">${who.map(x => `<span class="ml-pin tap" data-act="mapsel" data-v="${esc(x.pl)}" title="${esc(x.why)}">${x.e} ${esc(x.name)} <small>${esc(x.pl)}</small></span>`).join('')}</div>`;
    h += placeCard(r, sel, at.get(sel.name) ?? [], path);
    return h;
}
function placeCard(r, p, here2, path) {
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
    if (p.note) L.push(`<div class="ml-rl"><i>📝</i>${esc(p.note)}</div>`);
    const goods = p.goods
        .map((g) => {
            const price = g.price,
                poor = S.cash < price;
            const liked = Object.values(S.rel).some((x) => x.seen.likes.some((l) => g.name.includes(l)));
            return (
                `<div class="ml-good${poor ? ' poor' : ''}"><span>${liked ? '🎁 ' : ''}<b>${esc(g.name)}</b> <small>${esc(fxTxt(g.fx))}</small></span><em>${fmt(price)}` +
                 ` ${esc(book.world.currency)}${fxOf(r, price)}` +
                `</em>${isHere && !poor ? btn('사기', 'say', `${g.name} 하나 주세요.`, 'xs') : poor && isHere ? '<small class="neg">돈 부족</small>' : ''}</div>`
            );
        })
        .join('');
    const fl = floorsOf(p.floors);
    // 🛗 건물 안: 엘리베이터 버튼판처럼 좁게 (위층이 위) + 옆에 실제 사진
    const lift = fl.length
        ? `<div class="ml-lift">${[...fl]
              .reverse()
              .map((f) => {
                  const lv = /^(지하|b)/i.test(f.name)
                      ? `B${(/\d+/.exec(f.name) ?? [1])[0]}`
                      : /옥상|루프|roof/i.test(f.name)
                        ? 'R'
                        : (/\d+/.exec(f.name) ?? [''])[0] || f.name.slice(0, 2);
                  const on = isHere && norm(S.loc + ' ' + (S.spot ?? '')).includes(norm(f.name));
                  return `<div class="ml-fl${on ? ' on' : ''}"><b>${esc(lv)}</b><span>${f.rooms.map((x) => esc(x.name)).join(' · ') || esc(f.name)}</span></div>`;
              })
              .join('')}` + `</div>`
        : '';
    const photo = p.photo ? `<div class="ml-photo"><img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy"><button class="ml-mini" data-act="photo" data-v="${esc(p.name)}`
        + `" title="사진 바꾸기">📷</button></div>` : `<button class="ml-photo empty" data-act="photo" data-v="${esc(p.name)}">📷<small>사진 붙이기</small></button>`;
    const elev = `<div class="ml-bld${lift ? '' : ' nolift'}">${lift}${photo}</div>`;
    const acts = isHere
        ? [
              Object.keys(p.rest).length || p.kind === 'home'
                  ? btn(`🛏 쉬기 <small>${esc(fxTxt(p.rest) || '에너지+')}</small>`, 'say', '잠깐 쉰다.', 'xs')
                  : '',
              p.kind === 'bath' || p.kind === 'home' ? btn('🫧 씻기 <small>위생+60</small>', 'say', '씻는다.', 'xs') : '',
              p.kind === 'work' ? btn('💼 일하기 <small>에너지−6/시간</small>', 'say', '일을 시작한다.', 'xs') : '',
          ].join('')
        : btn(`🚶 ${esc(p.name)}(으)로 가기`, 'say', `${p.name}(으)로 간다.`, 'xs');
    return `<div class="ml-rc ml-place"><div class="ml-rc-h"><span class="ml-face">${PLACE_KINDS[p.kind]}</span><b>${esc(p.name)}`
        + `</b>${p.line ? `<span class="ml-pill">${esc(p.line)}</span>` : ''}${isHere ? '<span class="ml-pill good">지금 여기</span>' : ''}`
        + `</div>${L.join('')}${vis('map', 'life') ? placeThread(r, p.name) : ''}${goods && vis('map', 'goods') ? `<h4 class="ml-h4">물가</h4><div class="ml-goods">${goods}</div>` : ''}`
        + `${vis('map', 'building') ? `<h4 class="ml-h4">${fl.length ? '건물 안' : '사진'}</h4>${elev}` : ''}<div class="ml-acts">${acts}`
        + `${isHere ? '' : btn('🙈 지도에서 숨기기', 'map-hide', p.name, 'xs')}</div></div>`;
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
export const setCal = (k, v, n = 12) => { if (k === 'nav') { calView.m += v; if (calView.m < 1) { calView.m = n; calView.y--; } if (calView.m > n) { calView.m = 1; calView.y++; } calDay = null; } if (k === 'day') calDay = v; if (k === 'today') { calView = null; calDay = null; } };
const SEASON = (m) => (m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을');
function eventsOnDay(r, y, m, d) {
    const { book, S } = r, out = [], st = book.world.start;
    const day = dayIndexOf(st, y, m, d);
    for (const p of S.promises) if (p.due != null && Math.floor(p.due / DAY) === day) out.push({ icon: p.done ? '✅' : '🤝', text: p.text, i: p.i });
    for (const p of book.people) { const md = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || S.rel[p.name]?.day || ''); if (md && Number(md[1]) === m && Number(md[2]) === d) out.push({ icon: '🎂', text: `${p.name} · ${p.day}` }); }
    const me = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(book.me.day || ''); if (me && Number(me[1]) === m && Number(me[2]) === d) out.push({ icon: '🎉', text: '내 생일' });
    out.push(...ddaysOn(day));
    out.push(...sneakOnDay(S, m, d)); // ✍ 몰래 메모
    return { out, day };
}
function cal(r) {
    const cpv = calTabView(r); if (cpv) return cpv; // 📌 D-day · ✅ 할 일 탭
    const { book, S } = r, now = dateOf(book.world.start, S.t), today = Math.floor(S.t / DAY);
    calView ??= { y: now.y, m: now.m };
    const st0 = book.world.start, WK = st0.cal?.week?.length ? st0.cal.week : '일월화수목금토'.split(''), { y, m } = calView, days = monthDays(st0, y, m), first = Math.max(0, WK.indexOf(weekName(st0, dayIndexOf(st0, y, m, 1))));
    let h = calBar() + `<div class="ml-today"><div class="ml-hero-d"><small>${esc(now.mn)}</small><b>${now.d}</b><small>${now.w}요일</small></div><div class="ml-hero-b">`
        + `<small>오늘${st0.cal?.months ? '' : ` · ${SEASON(now.m)}`}</small><b>${dateText(book.world.start, S.t)}</b><span>🌦 ${esc(S.weather || '-')}`
        + ` ${btn('날씨', 'c-wx', '', 'xs')}</span></div></div>`;
    h += `<div class="ml-timebar">${btn(`⏭ ${periodName(S.t + 180) !== periodName(S.t) ? periodName(S.t + 180) : '다음 시간대'}`, 'c-time', 'next', 'xs')}${btn('+1시간', 'c-time', '+1h', 'xs')}${btn('☀️ 다음 날 아침', 'c-time', '+1d', 'xs')}${btn('🕰 시각 맞추기', 'c-time', 'set', 'xs')}</div>`;
    const cells = []; for (let k = 0; k < first; k++) cells.push('<div class="ml-cc x"></div>');
    for (let d = 1; d <= days; d++) { const { out, day } = eventsOnDay(r, y, m, d), cc = calCell(r, day); cells.push(`<button class="ml-cc${day === today ? ' today' : ''}${calDay === d ? ' sel' : ''}${day < today ? ' past' : ''}${day <= today && lived(r, day) ? ' lived' : ''}${cc.cls}" data-act="c-day" data-v="${d}">`
        + `<span>${d}</span>${out.length ? `<i>${out.slice(0, 3).map(() => '<b></b>').join('')}</i>` : ''}${day <= today ? (() => { const e = dayEmoji(r, day); return e ? `<em class="ml-ce">${e}</em>` : ''; })() : ''}${cc.mark}</button>`); } // 📅 그날 제일 큰 일 이모지
    h += `<div class="ml-calh">${btn('‹', 'c-nav', '-1', 'xs')}<b>${st0.cal?.era ? `${esc(st0.cal.era)} ` : ''}${y}년 ${esc(monthName(st0, m))}`
        + `</b>${btn('›', 'c-nav', '1', 'xs')}${y !== now.y || m !== now.m ? btn('오늘', 'c-today', '', 'xs') : ''}</div><div `
        + `class="ml-calg">${WK.map(w => `<div class="ml-cw">${esc(w)}</div>`).join('')}${cells.join('')}</div>`;
    if (calDay) {
        const { out, day } = eventsOnDay(r, y, m, calDay);
        h += `<div class="ml-rc ml-calday"><div class="ml-rc-h"><b>${esc(monthName(st0, m))} ${calDay}일</b><span class="ml-sp">`
            + `</span>${btn('✕', 'c-day', '', 'xs')}`
            + `</div>${out.map(e => `<div class="ml-rl${e.i != null ? ' tap' : ''}"${e.i != null ? ` data-act="jump" data-v="${e.i}"` : ''}><i>${e.icon}</i>${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>일정 없음</div>'}`
            + calDayExtra(r, day)
            + dayThread(r, day) // 🧵 그날 있었던 일 (보기만)
            + `<div class="ml-acts">${btn('＋ 이 날 일정', 'c-add', `${m}/${calDay}`, 'xs')}`
            + `${day > today ? btn('⏩ 이 날로 시간 이동', 'c-go', `${m}/${calDay}`, 'xs') : ''}</div></div>`;
    } else h += '<div class="ml-hint">날짜를 누르면 그날 일정을 보고 추가할 수 있어요.</div>';
    h += calSettings(r); // 🩸 생리 주기 · 👀 메모 보기
    const month = []; for (let d = 1; d <= days; d++) for (const e of eventsOnDay(r, y, m, d).out) month.push([d, e]);
    h += `<h4 class="ml-h4">이달 일정 <span>${month.length}</span></h4>${month.map(([d, e]) => `<div class="ml-rl tap" data-act="c-day" data-v="${d}"><i>${e.icon}</i><b>${d}일</b> ${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>이 달엔 일정이 없어요</div>'}`;
    const up = []; for (let k = 0; k <= 30; k++) { const dt = dateOf(book.world.start, (today + k) * DAY); for (const e of eventsOnDay(r, dt.y, dt.m, dt.d).out) up.push([k, e]); }
    h += `<h4 class="ml-h4">다가오는 일정 <span>30일</span></h4>${up.slice(0, 8).map(([k, e]) => `<div class="ml-rl"><i>${e.icon}</i><b class="${k === 0 ? 'neg' : ''}">${k === 0 ? '오늘' : `D-${k}`}</b> ${esc(e.text)}</div>`).join('') || '<div class="ml-rl dim"><i>·</i>30일 안에 일정이 없어요</div>'}`;
    return h + sneakCard(r, 'cal');
}
// ───── 세계 소식: 화면 밖 생활 · 속셈 · 기념일 · 하루 사건 (AI 0회) ─────
const news = (r) => newsView(r); // 종류 · 탭 · 피드: ui/newskinds.js
// ───── 기록 · 되돌아보기 (채팅 메시지에서 매번 만든다) ─────
const REC_F = [['all', '전체'], ['need', '수치'], ['cash', '돈'], ['item', '물건'], ['rel', '관계'], ['loc', '장소'], ['status', '딱지']];
let recF = 'all';
export const setRecFilter = (v) => { recF = v; };
let recView = 'line', recMore = 30; // 🏎 타임라인은 30줄부터 · 「더 보기」로 30줄씩 (긴 채팅에서 DOM이 수천 개 생기던 것)
export const setRecView = (v) => { recView = v; };
function rec(r) {
    const { book } = r, chat = ctx().chat ?? [], meta = getMeta();
    // 📒 보기: 타임라인 · 🎞 앨범 · 📖 하루씩 · 📊 통계 (모두 같은 기록을 다르게 묶은 것 · 저장 0)
    const views = `<div class="ml-tools">${seg('v:rec', [['line', '🕰 타임라인'], ['album', '🎞 앨범'], ['days', '📖 하루씩'], ['stats', '📊 통계']], recView)}</div>`;
    if (recView === 'album') return views + albumView(r);
    if (recView === 'days') return views + daysView(r);
    if (recView === 'stats') return views + statsView(r);
    const L = [];
    let lastDay = null;
    let cut = false;
    for (let i = chat.length - 1; i >= 0 && !(cut = L.length >= recMore); i--) for (const c of r.changes[i] ?? []) {
        if (c.src === 'time') continue;
        if (recF !== 'all' && !c.f.startsWith(recF) && !(recF === 'rel' && (c.f.startsWith('stage') || c.f.startsWith('npc') || c.f.startsWith('gone')))) continue;
        // 📖 날짜가 바뀌는 곳에 구분선 (챕터)
        const d = dayOfI(r, i);
        if (d != null && d !== lastDay) { L.push(`<div class="ml-chap">${esc(dateText(book.world.start, d * DAY, false))}</div>`); lastDay = d; }
        L.push(
            row({
                icon: c.icon,
                title: `${esc(c.label)} ${typeof c.to === 'number' && typeof c.from === 'number' ? signed(c.to - c.from) : `→ ${esc(c.to)}`}`,
                sub: `${esc(c.why)} · #${i}${c.src === 'hand' ? ' · ✋' : c.src === 'meddle' ? ' · ✍' : ''}`,
                act: 'jump',
                data: i,
                faint: c.sure === false,
            }),
        );
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
    return (
        views +
        `<div class="ml-tools">${seg('recf', RF, recF)}${btn('⭐ 마지막 답 책갈피', 'mark')}${btn('🕰 그때 상태 보기', 'past')}</div>` +
        card('책갈피', marks.map((m) => row({ icon: '⭐', title: esc(m.name), sub: `#${m.i}`, act: 'jump', data: m.i, more: true })).join('')) +
        (() => { const W = weekTop(r, 3); return W.length ? card('이번 주 하이라이트', W.map(e => row({ icon: e.c.icon, title: `${esc(e.c.label)} ${typeof e.c.to === 'number' && typeof e.c.from === 'number' ? signed(e.c.to - e.c.from) : `→ ${esc(e.c.to)}`}`, sub: `${esc(short(e.c.why, 30))} · ${esc(dateText(book.world.start, r.at?.[e.i]?.t ?? 0, false))}`, act: 'jump', data: e.i })).join(''), '최근 7일 · 큰 일 3개') : ''; })() +
        card('하이라이트', hi.join('')) +
        card('타임라인', (L.join('') || row({ title: '아직 기록이 없어요', faint: true })) + (cut ? `<div class="ml-acts">${btn('더 보기', 'rec-more', '', 'sm')}</div>` : ''))
    );
}
function graph(r, key) {
    const pts = []; r.needsAt.forEach((s, i) => { if (s?.[key] != null && (i === 0 || r.changes[i]?.length)) pts.push([i, s[key]]); });
    if (pts.length < 2) return '';
    const P = pts.slice(-40), x0 = P[0][0], x1 = P[P.length - 1][0] || 1;
    const X = (i) => ((i - x0) / Math.max(1, x1 - x0) * 100).toFixed(1), Y = (v) => (30 - v * 0.3).toFixed(1);
    return `<svg class="ml-graph" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${P.map(([i, v]) => `${X(i)},${Y(v)}`).join(' ')}`
        + `"/>${P.map(([i, v]) => { const ev = (r.changes[i] ?? []).find(c => c.f === `need.${key}` && c.src !== 'time'); // 📍 시간 말고 일이 있어 바뀐 점은 크게 · 이유를 띄움
            return `<circle class="tap${ev ? ' ev' : ''}" cx="${X(i)}" cy="${Y(v)}" r="${ev ? 3 : 2.2}" data-act="jump" data-v="${i}"><title>#${i} · ${Math.round(v)}${ev ? ` · ${esc(ev.why)} ${signed(ev.to - ev.from)}` : ''}</title></circle>`; }).join('')}`
        + `</svg>`;
}
// ───── 속마음 · 관전자 · 세포 (본편 답에 같이 적힌 것만) ─────
function mind(r) {
    const { S } = r, meta = getMeta(), who = meta.mindWho ?? ['cast'];
    const tools = `<div class="ml-tools">${[['cast', '장면 속 인물'], ['watch', '관전자'], ['cell', '세포들']].map(([k, l]) => `<button class="ml-btn sm${who.includes(k) ? ' on' : ''}" data-act="mindwho" data-v="${k}">${l}</button>`).join('')}</div>`;
    const mm = meta.mindMode ?? 'thought', IC = { mind: '💭', watch: '👀', cell: '🧠' };
    const opts = card('속마음 모드', `<div class="ml-row"><span class="ml-sub">모양</span>${seg('mindmode', [['thought', '💭 한 줄'], ['emoji', '😳 이모티콘'], ['kaomoji', '(｡•̀ᴗ-)✧ 카모지'], ['mix', '한 줄+카모지']], mm)}</div>`
        + row({ icon: '🗣', title: '말투', sub: esc(meta.mindTone || '정하지 않음 · 인물 성격대로'), act: 'mind-tone', more: true })
        + row({ icon: '🔔', title: '뜰 때 알림', sub: meta.mindPop === 'off' ? '끔' : '방금 답의 속마음을 위에 잠깐 띄움', value: btn(meta.mindPop === 'off' ? '켜기' : '끄기', 'mind-pop', '', 'xs') }));
    const sec = (t, o, ic) => card(t, Object.entries(o).map(([n, v]) => row({ icon: S.rel[n] ? personOf(r.book, n)?.face || '🙂' : ic, title: esc(n), sub: esc(v) })).join(''));
    const h = sec('지금 속마음', S.mind, '💭') + sec('관전자', S.watch, '👀') + sec('세포들', S.cell, '🧠');
    const log = (S.mindLog ?? []).slice(-14).reverse();
    // 💞 그 답에서 그 사람 애정 · 우정이 어떻게 됐나 (속마음 ↔ 관계)
    const then = (e) => { const c = e.m != null && (r.changes[e.m] ?? []).find(c => c.f === `rel.${e.who}.aff` || c.f === `rel.${e.who}.trust`); return c ? ` · <b class="${c.to < c.from ? 'neg' : 'pos'}">그때 ${c.f.endsWith('aff') ? '💗' : '🤝'}${signed(c.to - c.from)}</b>` : ''; };
    const hist = log.length ? card('지난 속마음', log.map(e => row({ icon: personOf(r.book, e.who)?.face ?? IC[e.k], title: esc(e.who), sub: `${esc(e.text)} · ${dateText(r.book.world.start, e.t)}${then(e)}`, act: 'jump', data: e.m, more: true })).join('')) : '';
    return tools + opts + (h || empty('다음 답부터 같이 적혀요.')) + hist;
}
// ───── 내 탭 ─────
function custom(r) {
    const tabs = getMeta().custom ?? [];
    let h = '';
    for (const [ti, t] of tabs.entries()) {
        h += card(
            `${esc(t.icon || '🧩')} ${esc(t.name)}`,
            t.fields
                .map((f) => {
                    const v = r.S.custom[t.name]?.[f.name] ?? f.start ?? '-';
                    const n = Number(v);
                    const st =
                        f.max && Number.isFinite(n) ? (n >= (f.stages?.[1] ?? 70) ? '높음' : n >= (f.stages?.[0] ?? 30) ? '보통' : '낮음') : '';
                    return row({
                        icon: '•',
                        title: esc(f.name),
                        sub: st,
                        value: f.max && Number.isFinite(n) ? `${bar((n / f.max) * 100)}<b class="ml-num">${n}</b>` : esc(v),
                    });
                })
                .join(''),
            `<a data-act="ctab-del" data-v="${ti}">지우기</a>`,
        );
    }
    return h + `<div class="ml-acts">${btn('＋ 새 탭', 'ctab-new')}</div><div class="ml-hint">AI는 「custom: 탭 | 칸 | 값」으로 적어요</div>`;
}
// ───── 📘 설정집 ─────
function book(r) {
    const b = r.book;
    let h = `<div class="ml-hint">본편에는 영향 없음 · 상태창을 만들고 계산할 때 긴 로어북 대신 이걸 봅니다</div>`;
    // 🌐 영어 이야기인데 설정집이 한국어면 → 한 번에 영어로 (AI 1회 · 이름은 그대로 · 화면은 번역으로 한국어)
    { const L = isEN() ? 'en' : 'ko', hasKo = /[\uAC00-\uD7A3]/.test(JSON.stringify({ ...b, people: b.people.map(({ name, aka, ...p }) => p), world: { ...b.world, places: b.world.places.map(({ name, photo, ...p }) => p) } }));
      if (L === 'en' && hasKo) h += card('', row({ icon: '🌐', title: '이야기는 영어인데 설정집이 한국어예요', sub: 'AI에게 한국어 값(허기 · 연인 · 행동 이름)이 섞여 가요 · 눌러서 영어로 바꾸기 (AI 1회 · 이름은 그대로)', act: 'bk-tolang', data: 'en', more: true })); }
    // 📐 숫자 규칙 판: 오르는 · 내리는 폭 · 줄어드는 속도를 고치면 그 메시지부터 새 규칙 (앞은 옛 규칙 그대로)
    const V = getMeta().ruleVers ?? [];
    h += `<div class="ml-hint">📐 숫자 규칙 ${V.length + 1}판${V.length ? ` · #${V[V.length - 1].until}부터 지금 규칙 (그 앞 메시지는 그때 규칙으로 계산)` : ''} · 성격 · 취향 · 루틴 · 시작 값은 판을 나누지 않아요</div>`;
    h += card(
        '세계',
        row({
            icon: '🌍',
            title: esc(b.world.genre || '장르 없음'),
            sub: `${esc(b.world.currency)} · 식사 ≈ ${b.world.meal} · ${b.world.weather.map(esc).join('/')}`,
            act: 'bk-world',
            more: true,
        }) +
            (b.world.summary ? row({ icon: '📖', title: '세계관 요약', sub: esc(b.world.summary), act: 'bk-world', more: true }) : row({ icon: '📖', title: '세계관 요약 없음', sub: '눌러서 적거나 🔄 다시 채우기', act: 'bk-world', faint: true })) +
            (b.world.rules?.length ? row({ icon: '📏', title: '이 세계 규칙', sub: b.world.rules.map(esc).join(' · '), act: 'bk-world', more: true }) : '') +
            row({
                icon: '📍',
                title: `장소 ${b.world.places.length}곳`,
                sub: b.world.places.map((p) => esc(p.name)).join(' · '),
                act: 'bk-places',
                more: true,
            }),
        `약 ${bookTokens(b)}토큰`,
    );
    h += card('나', row({ icon: '🧍', title: esc(b.me.name || userName()), sub: b.me.needs.map(n => `${n.icon}${esc(n.name)} −${n.rate}/h`).join(' · '), act: 'bk-me', more: true }));
    h += card('인물', b.people.map(p => row({ icon: p.face, title: esc(p.name), sub: esc(p.line || '성격 비어 있음'), value: `<small>${personTokens(b, p)}t</small>`, act: 'bk-person', data: p.name, more: true })).join('') || row({ title: '아직 없어요', faint: true }), `인물당 ${LIMIT.lines}줄까지`);
    h += `<div class="ml-acts">${btn('＋ 인물', 'bk-person', '')}${btn('🔄 로어북에서 다시 채우기', 'bk-refill')}${btn('✨ AI로 수정', 't-ai', 'book')}</div>`;
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
    let h = `<div class="ml-tools">${Object.entries(PRESETS).map(([k, p]) => btn(p.name, 'preset', k, 'sm')).join('')}${btn('🩺 자가 진단', 'doctor', '', 'sm')}</div>`;
    h += card('전체', slider('all', g.all ?? 2), `${seg('scope', [['chat', '이 채팅만'], ['all', '전체 기본값']], meta.influence ? 'chat' : 'all')}`);
    h += card('기능별 <span>이름을 누르면 단계별 동작</span>', GAUGES.map(x => slider(x.id, level(x.id), x.name)).join(''));
    // 지금 본편에 실제로 가는 글 (결과값만)
    const inj = app.lastInj?.() ?? {};
    const parts = [['rule', '적는 법 (규칙)', inj.rule], ['facts', '지금 사실', inj.facts], ['hint', '연출 힌트', inj.hint]].filter(([, , t]) => t);
    h += `<h4 class="ml-h4">지금 본편에 가는 글 <span>결과값만 · 이번 턴 ≈${parts.reduce((a, [, , t]) => a + tokens(t), 0)}토큰</span>`
        + `</h4>${parts.map(([k, n, t]) => `<details class="ml-inj"${k !== 'rule' ? ' open' : ''}><summary>${n} <small>≈${tokens(t)}토큰</small></summary><pre>${esc(t)}</pre></details>`).join('') || '<div class="ml-rl dim"><i>·</i>지금은 아무것도 안 가요 (일시정지 · 건너뛰기 · 0단계)</div>'}`;
    return h;
}
export function gaugeTable(id) {
    const x = GAUGES.find(q => q.id === id); if (!x) return;
    sheet(`🎚 ${esc(x.name)} 단계별 동작`, `<div class="ml-card">${LEVELS.map(l => row({ icon: `<b>${l.n}</b>`, title: l.name, sub: esc(GAUGE_DO[id]?.[l.n] ?? l.what), value: level(id) === l.n ? '<span class="ml-pill love">지금</span>' : '' })).join('')}`
        + `</div><div class="ml-hint">숫자 · 보정 같은 중간값은 어느 단계에서도 본편에 안 가요.</div>`);
}
const slider = (id, v, name = '전체') => { const c = levelCost(v); return `<div class="ml-gauge"><div class="ml-gauge-h"><b${id !== 'all' ? ` class="tap" data-act="g-table" data-v="${id}"` : ''}>${esc(name)}`
    + `${id !== 'all' ? ' ⓘ' : ''}</b><span class="ml-pill ${v >= 3 ? 'love' : ''}">${v} · ${LEVELS[v].name}</span><small>주입 ≈${c.tok}`
    + `토큰 · 추가 호출 ${c.calls}회</small></div><input type="range" class="ml-range" min="0" max="4" step="1" value="${v}" data-gauge="${id}">`
    + `<div class="ml-gauge-t">${LEVELS.map(l => `<span class="${l.n === v ? 'on' : ''}">${l.name}</span>`).join('')}</div></div>`; };

const music = (r) => musicView(r), quote = (r) => quoteView(r);
export const RENDER = { music, quote, now, dice, bag, rel, map, cal, news, rec, mind, custom, book, gauge };
export { now, DCS, diceSel, dice, bag, BAG_G, bagGroups, goodRow, rel, routeView, pairView, lastRel, meter, relCard, mapSel, map, placeCard, upcoming, calView, SEASON, eventsOnDay, cal, news, REC_F, recF, recView, rec, graph, mind, custom, book, GAUGE_DO, gauge, slider, music, calDay, recMore, quote };
export const getMapSel = () => mapSel;
export const moreRec = () => { recMore += 30; };
