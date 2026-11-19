// 🏠 홈: 위에 위젯(지금 · 이 장면 · 운세 · 욕구 · 주사위 · 달력 · 소식 · 같이 있는 사람) + 아래에 받은 앱 아이콘
// 🛍 마켓: 앱을 「받는」 느낌 — 실제로는 다 들어 있고 칸을 켜고 끈다 (지우면 홈 · 본편 주입에서 빠짐)
import { ctx, getMeta, saveMeta, settings, modOn } from '../base/st.js';
import { esc, signed, dateText, dateOf, DAY, slotName, hhmm, fmt, num } from '../base/util.js';
import { derived, needStage, relStage, worldEvent, priceMul, diceParts, whereNow } from '../rules/engine.js';
import { personOf, placeOf, PLACE_KINDS } from '../rules/book.js';
import { moodTags, pickQuote, pickMusic } from '../rules/mood.js';
import { luckOf } from '../rules/luck.js';
import { level } from '../rules/inject.js';
import { upcoming, lastAI, turnCard, getDice } from './tabs.js';
import { btn } from './kit.js';
import { mascot, MASCOTS, MEATCON, mascotUrl, playMascotSound, MASCOT_SOUNDS, PACK, packOn } from './mascot.js';
import { vis } from './tools.js';

// 앱 목록 — mod가 있으면 받기 · 지우기 가능, sys는 늘 있음
export const APPS = [
    { id: 'now', to: 'main', main: '증상 · 상태 딱지 이름', icon: '❤️', name: '수치', mod: 'stats', desc: '욕구 · 게이지 · 능력치 · 상태 딱지', c: '#ff6b6b' },
    { id: 'dice', to: 'main', main: '판정 결과 문장', icon: '🎲', name: '주사위', mod: 'dice', desc: '판정 · 보정 내역 · 오늘 운세 주사위', c: '#7c5cff' },
    { id: 'bag', to: 'main', main: '가진 돈 · 물건 · 착용 중', icon: '👜', name: '소지품', mod: 'wallet', desc: '돈 · 물건 · 착용 중 · 가게', c: '#f4a261' },
    { id: 'rel', to: 'main', main: '관계 단계 · 감정 기억 · 질투', icon: '💞', name: '관계', mod: 'rel', desc: '애정 · 우정 · 단계 · 기억 · 취향 도감', c: '#e0567f' },
    { id: 'map', to: 'main', main: '지금 장소 · 같이 있는 사람', icon: '🗺️', name: '지도', mod: 'map', desc: '노선도 · 인물 핀 · 건물 안 · 사진', c: '#2f9e7a' },
    { id: 'cal', to: 'main', main: '날짜 · 시간 · 날씨 · 약속', icon: '📅', name: '달력', mod: 'calendar', desc: '날짜 · 시간 · 날씨 · 약속 · 기념일', c: '#3a8ee6' },
    { id: 'news', to: 'aux', main: '', icon: '📰', name: '세계 소식', mod: 'news', desc: '화면 밖 생활 · 속셈 · 기념일 · 오늘 사건', c: '#6c7a89' },
    { id: 'music', to: 'aux', main: '', icon: '🎵', name: '추천 음악', mod: 'music', desc: '장면 분위기에 맞는 곡', c: '#ff8fab' },
    { id: 'quote', to: 'main', main: '한 구절 (영향력을 올렸을 때만)', icon: '📜', name: '한 구절', mod: 'quote', desc: '장면에 맞는 고전 · 사자성어 · 속담', c: '#b08968' },
    { id: 'rec', to: 'aux', main: '', icon: '📒', name: '기록', mod: 'record', desc: '타임라인 · 책갈피 · 그때 상태 · 그래프', c: '#e9c46a' },
    { id: 'mind', to: 'main', main: '속마음을 적어 달라는 지시', icon: '💭', name: '속마음', mod: 'mind', desc: '인물 · 관전자 · 세포들의 속마음', c: '#a78bfa' },
    { id: 'custom', to: 'aux', main: '', icon: '🧩', name: '내 탭', mod: 'custom', desc: '직접 만드는 칸 · 최면 어플 템플릿', c: '#43aa8b' },
    { id: 'book', icon: '📘', name: '설정집', sys: true, c: '#4361ee' },
    { id: 'gauge', icon: '🎚️', name: '영향력', sys: true, c: '#8d99ae' },
    { id: 'cat', icon: '😺', name: '마스코트', sys: true, c: '#f2a7b5' },
    { id: 'market', icon: '🛍️', name: '마켓', sys: true, c: '#ff9f1c' },
];
export const appOf = (id) => APPS.find(a => a.id === id);
export const installed = (a) => a.sys || modOn(a.mod);
const W = (title, body, open = '', extra = '', part = '') => (part && !vis('home', part) ? '' : Wx(title, body, open, extra));
const Wx = (title, body, open = '', extra = '') => `<section class="ml-w"${open ? ` data-act="open" data-v="${open}"` : ''}><h4>${title}${open ? '<i>›</i>' : ''}${extra}</h4>${body}</section>`;

// 🎲 d20 그림 (위젯 · 주사위 앱 공용)
export const d20 = (n = 20, cls = '') => `<svg class="ml-d20 ${cls}" viewBox="0 0 100 100" aria-hidden="true">${n === 1 ? '<polyline class="crack" points="38,8 46,30 36,44 52,60 44,78 54,94"/>' : ''}<polygon class="f0" points="50,4 92,28 92,72 50,96 8,72 8,28"/><polygon class="f1" points="50,22 78,66 22,66"/><polyline class="ed" points="50,4 50,22 92,28 78,66 92,72 50,96 78,66 22,66 8,72 22,66 8,28 50,22 22,66"/><polyline class="ed" points="92,28 78,66"/><text x="50" y="56">${n}</text></svg>`;

export function home(r) {
    const { book, S } = r, meta = getMeta(), li = lastAI(), last = r.changes[li] ?? [];
    const pl = placeOf(book, S.loc), ev = worldEvent(Math.floor(S.t / DAY)), dz = derived(book, S);
    let h = `<div class="ml-hero"><div class="ml-hero-d"><small>${dateOf(book.world.start, S.t).m}월</small><b>${dateOf(book.world.start, S.t).d}</b><small>${dateOf(book.world.start, S.t).w}요일</small></div>
        <div class="ml-hero-b"><b>${slotName(S.t)} ${hhmm(S.t)}${S.weather ? ` · ${esc(S.weather)}` : ''}</b><span>📍 ${esc(S.loc || '어딘가')}${S.with.length ? ` · ${S.with.map(n => personOf(book, n)?.face || '🙂').join('')}` : ''}</span>${modOn('wallet') ? `<span>💰 ${fmt(S.cash)} ${esc(book.world.currency)}</span>` : ''}</div>
        ${ev ? `<span class="ml-pill ${ev.kind === 'good' ? 'good' : ev.kind === 'bad' ? 'bad' : 'love'}">🎪 ${esc(ev.name)}</span>` : ''}</div>`;
    const tags = [...S.status.map(s => `<span class="ml-chip ${s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : ''}">${s.src === 'fate' ? '🔮 ' : ''}${esc(s.name)}${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}</span>`), ...dz.filter(d => d.stage === '위험').map(d => `<span class="ml-chip bad">${d.icon} ${esc(d.name)} 위험</span>`)];
    if (!vis('home', 'hero')) h = '';
    if (tags.length && vis('home', 'tags')) h += `<div class="ml-chips">${tags.join('')}</div>`;
    // 이 장면: 음악 · 구절 · 운세
    const tg = moodTags(r, last), L = [];
    if (modOn('music')) { const m = S.bgm ? { label: S.bgm, query: S.bgm } : pickMusic(tg, settings().musicTaste); L.push(`<div class="ml-scene tap" data-act="music" data-v="${esc(m.query)}"><i>🎵</i><span><b>${esc(m.label)}</b><small>지금 공기</small></span><em>▶</em></div>`); }
    if (modOn('quote')) { const q = pickQuote(tg, meta.recent?.quote ?? [], S.turn); if (q) L.push(`<div class="ml-scene tap" data-act="quote" data-v="${esc(`${q.text}\n\n${q.mean}\n— ${q.src}`)}"><i>📜</i><span><b>${esc(q.text)}</b><small>${esc(q.src)}</small></span><em>ⓘ</em></div>`); }
    const lk = luckOf(book, S, ctx().getCurrentChatId?.(), meta.luckRoll);
    L.push(lk.rolled ? `<div class="ml-scene luck"><i>🍀</i><span><b>${esc(lk.text)}</b><small>오늘 운세 · 🎲 ${lk.d}</small></span></div>` : `<div class="ml-scene luck tap" data-act="luckroll"><i>🎲</i><span><b>오늘 운세 굴리기</b><small>이야기 속 하루에 한 번 · 선택지에 🍀 · ⚠</small></span><em>굴리기</em></div>`);
    h += W('이 장면', `<div class="ml-scenes">${L.join('')}</div>`, '', '', 'scene');
    // ✋ 지금 할 수 있는 일 · ⏳ 곧 일어날 일
    { const L = doable(r); if (L.length) h += W('지금 할 수 있는 일', `<div class="ml-doable">${L.map(x => `<button class="ml-do${x.poor ? ' poor' : ''}" data-act="say" data-v="${esc(x.say)}"${x.poor ? ' disabled' : ''}><i>${x.icon}</i><span><b>${esc(x.title)}</b><small>${esc(x.cost)}</small></span></button>`).join('')}</div>`, '', '', 'doable'); }
    { const L = soon(r); if (L.length) h += W('곧 일어날 일', L.map(x => `<div class="ml-rl"><i>${x.icon}</i>${esc(x.text)} <span>${esc(x.when)}</span></div>`).join(''), '', '', 'soon'); }
    // 욕구 미니
    if (modOn('stats')) h += W('수치', `<div class="ml-wneeds">${book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); return `<div class="${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><span>${n.icon} ${esc(n.name)}</span><span class="ml-bar ${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><i style="width:${v}%"></i></span><b>${v}</b></div>`; }).join('')}${book.me.gauges.map(g => { const v = Math.round(S.gauges[g.key] ?? g.start); return `<div><span>${esc(g.name)}</span><span class="ml-bar"><i style="width:${v / g.max * 100}%;background:${g.color}"></i></span><b>${v}</b></div>`; }).join('')}</div>`, 'now', '', 'stats');
    // 주사위 위젯
    if (modOn('dice')) {
        const ds = getDice(), attr = ds.attr || book.me.attrs[0]?.name || '', P = diceParts(book, S, attr), on = level('dice') >= 3 || level('stats') >= 3;
        const mod = P.filter(x => on || x.why === attr || x.why.endsWith('착용')).reduce((a, x) => a + x.n, 0), hist = meta.recent?.rolls?.[0];
        h += W('주사위', `<div class="ml-wdice"><button class="ml-dbtn" data-act="roll" data-v="${mod}" title="굴리기">${d20(hist?.d ?? 20, hist ? `${hist.res.includes('성공') ? 'ok' : 'no'}${hist.d === 20 ? ' crit' : hist.d === 1 ? ' fumble' : ''}` : '')}</button><div><b>${esc(attr || '판정')} ${signed(mod)} · 목표 ${ds.dc}</b><small>${hist ? esc(hist.text) : '주사위를 눌러 굴려요'}</small></div></div>`, 'dice', '', 'dice');
    }
    // 같이 있는 사람
    if (modOn('rel') && S.with.length) h += W('같이 있는 사람', S.with.map(n => { const x = S.rel[n], p = personOf(book, n); if (!x) return ''; const st = relStage(book, x.aff); return `<div class="ml-wp tap" data-act="person" data-v="${esc(n)}"><span>${p?.face || '🙂'}</span><b>${esc(n)}</b><span class="ml-pill love">${esc(p?.noLove ? '친구' : st.name)}</span><span class="ml-bar love"><i style="width:${p?.noLove ? x.trust : x.aff}%"></i></span><em>${p?.noLove ? x.trust : x.aff}</em></div>`; }).join(''), 'rel', '', 'with');
    // 이번 답
    const tc = turnCard(r, li); if (tc && vis('home', 'turn')) h += tc;
    // 달력: 이번 주 + 다가오는 것
    if (modOn('calendar')) {
        const day0 = Math.floor(S.t / DAY), up = upcoming(r);
        const marks = (k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY); const md = `${dt.m}/${dt.d}`; return up.filter(u => (u.t != null && Math.floor(u.t / DAY) === day0 + k) || u.md === md).length + (worldEvent(day0 + k) ? 1 : 0); };
        const week = Array.from({ length: 7 }, (_, k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY), n = marks(k); return `<div class="${k === 0 ? 'today' : ''}"><small>${dt.w}</small><b>${dt.d}</b>${n ? '<i></i>' : ''}</div>`; }).join('');
        h += W('달력', `<div class="ml-week">${week}</div>${up.slice(0, 3).map(u => `<div class="ml-rl"><i>${u.icon}</i>${esc(u.text)} <span>${u.t != null ? (u.t - S.t <= DAY ? '하루 안' : dateText(book.world.start, u.t, false)) : esc(u.md)}</span></div>`).join('')}`, 'cal', '', 'cal');
    }
    // 소식
    if (modOn('news')) { const N = [...(ev ? [{ icon: '🎪', text: ev.text }] : []), ...S.news.slice(0, 3)]; if (N.length) h += W('세계 소식', N.map(n => `<div class="ml-rl"><i>${n.icon}</i>${esc(n.text)}</div>`).join(''), 'news', '', 'news'); }
    // 앱
    const bd = badges(r);
    h += `<div class="ml-apps">${APPS.filter(installed).map(a => `<button class="ml-app" data-act="open" data-v="${a.id}"><i style="--c:${a.c}">${a.icon}${bd[a.id] ? `<em class="ml-badge${bd[a.id] === '!' ? ' warn' : ''}">${bd[a.id]}</em>` : ''}</i><span>${a.name}</span></button>`).join('')}</div>`;
    return h;
}
// 🛍 마켓
export function market() {
    const row = (a) => { const on = installed(a); return `<div class="ml-mk"><i style="--c:${a.c}">${a.icon}</i><span><b>${a.name}</b><small>${esc(a.desc)}</small>${a.to === 'main' ? `<small class="ml-to main">📤 본편: ${esc(a.main)}</small>` : '<small class="ml-to aux">🔒 상태창 안에서만</small>'}</span>${on ? `${btn('열기', 'open', a.id, 'xs')}<button class="ml-mini" data-act="uninstall" data-v="${a.id}" title="지우기">🗑</button>` : `<button class="ml-btn xs main ml-get" data-act="install" data-v="${a.id}">받기</button>`}</div>`; };
    const apps = APPS.filter(a => !a.sys);
    return `<div class="ml-hint">앱을 받으면 홈에 생겨요. 지우면 홈과 본편 주입에서 빠져요 (기록은 그대로).</div>
        <h4 class="ml-h4">📤 본편 반영 <span>결과값만 본편에 가요 · 숫자 · 보정 같은 중간값은 안 가요</span></h4><div class="ml-mks">${apps.filter(a => a.to === 'main').map(row).join('')}</div>
        <h4 class="ml-h4">🔒 보조 <span>상태창 안에서만 · 본편 토큰 0</span></h4><div class="ml-mks">${apps.filter(a => a.to !== 'main').map(row).join('')}</div>
        <h4 class="ml-h4">🎨 꾸미기</h4><div class="ml-mks"><div class="ml-mk"><i style="--c:#f2a7b5"><img src="${mascotUrl('con:heart')}" alt="" style="width:40px;height:40px"></i><span><b>미트볼콘 팩</b><small>마스코트 모습 ${PACK.length}개 더 · 약 4.6MB · 인터넷에서 받아요</small><small class="ml-to aux">🔒 상태창 안에서만</small></span>${packOn() ? `${btn('고르기', 'open', 'cat', 'xs')}<button class="ml-mini" data-act="packoff" title="지우기">🗑</button>` : '<button class="ml-btn xs main ml-get" data-act="packget">받기</button>'}</div></div>`;
}

// 😺 마스코트 고르기: 표정 7개 + 미트볼콘 14개 중 평소 모습 · 소리 · 크기
const FACE_KO = { idle: '평소', happy: '웃음', think: '생각', surprise: '놀람', sad: '울먹', sleep: '잠', party: '파티', hi: '안녕', heart: '하트', proud: '뿌듯', focus: '집중', groom: '그루밍', tongue: '메롱', roll: '뒹굴', blanket: '담요', box: '상자', pray: '부탁', gasp: '헉', sulk: '삐침', blank: '멍' };
export function cat() {
    const s = settings(), cur = s.mascotPick || 'idle';
    const cell = (id) => `<button class="ml-cat${cur === id ? ' on' : ''}" data-act="catpick" data-v="${id}"><img src="${mascotUrl(id)}" alt="" draggable="false"><small>${FACE_KO[id.replace('con:', '')] ?? id}</small></button>`;
    return `<div class="ml-catbig">${mascot('lg')}<small>눌러 보세요 · 빠르게 다섯 번 누르면 파티 · 너무 누르면 울어요</small></div>
        <h4 class="ml-h4">표정</h4><div class="ml-cats">${MASCOTS.map(cell).join('')}</div>
        <h4 class="ml-h4">미트볼콘</h4><div class="ml-cats">${MEATCON.map(n => cell(`con:${n}`)).join('')}</div>
        ${packOn() ? `<h4 class="ml-h4">미트볼콘 팩 <span>${PACK.length}개</span></h4><div class="ml-cats">${PACK.map(([id, n]) => `<button class="ml-cat${cur === `pack:${id}` ? ' on' : ''}" data-act="catpick" data-v="pack:${id}"><img src="${mascotUrl(`pack:${id}`)}" alt="" loading="lazy" draggable="false"><small>${esc(n)}</small></button>`).join('')}</div>` : `<div class="ml-scene tap" data-act="open" data-v="market"><i>🛍️</i><span><b>미트볼콘 팩 ${PACK.length}개 더 받기</b><small>마켓에서 받을 수 있어요</small></span><em>›</em></div>`}
        <h4 class="ml-h4">소리</h4><div class="ml-picks">${MASCOT_SOUNDS.map(([v, n]) => `<button class="ml-btn xs${(s.mascotSound || 'meow') === v ? ' on' : ''}" data-act="catsound" data-v="${v}">${n}</button>`).join('')}</div>
        <div class="ml-hint">위험할 땐 울먹, 밤엔 자는 얼굴로 저절로 바뀌어요 (평소 모습이 「평소」일 때).</div>`;
}

// ✋ 지금 할 수 있는 일 (미니 선택지 · 대가 미리 보기 · 영향력 0인 기능은 안 띄움)
function doable(r) {
    const { book, S } = r, out = [], here = placeOf(book, S.loc), mul = priceMul(S), nm = (k) => book.me.needs.find(n => n.key === k)?.name ?? k;
    const fxT = (fx) => Object.entries(fx ?? {}).map(([k, v]) => `${nm(k)} ${signed(v)}`).join(' · ');
    const low = [...book.me.needs].sort((a, b) => (S.needs[a.key] ?? 0) - (S.needs[b.key] ?? 0))[0];
    if (modOn('wallet') && level('wallet') > 0 && here?.goods.length) {
        const g = [...here.goods].sort((a, b) => num(b.fx?.[low?.key]) - num(a.fx?.[low?.key]) || a.price - b.price)[0], price = Math.round(g.price * mul);
        out.push({ icon: '🛒', title: `${g.name} 사기`, cost: `−${price}${book.world.currency}${Object.keys(g.fx).length ? ` · ${fxT(g.fx)}` : ''}`, say: `${g.name} 하나 주세요.`, poor: S.cash < price });
    }
    if (modOn('stats') && level('stats') > 0 && here) {
        if (Object.keys(here.rest).length || here.kind === 'home') out.push({ icon: '🛏', title: '쉬기', cost: fxT(here.rest) || '에너지 +10/시간', say: '잠깐 쉰다.' });
        if (here.kind === 'bath') out.push({ icon: '🫧', title: '씻기', cost: '위생 +60', say: '씻는다.' });
        if (here.kind === 'work') out.push({ icon: '💼', title: '일하기', cost: '에너지 −6/시간 · 돈 +', say: '일을 시작한다.' });
    }
    for (const it of S.items) if (modOn('stats') && Object.keys(it.fx).some(k => k === low?.key) && (S.needs[low.key] ?? 100) < 60) { out.push({ icon: '🍞', title: `${it.name} 먹기`, cost: fxT(it.fx), say: `${it.name}을(를) 먹는다.` }); break; }
    if (modOn('rel') && level('rel') > 0) for (const n of S.with) { const x = S.rel[n]; const it = S.items.find(i => x?.seen.likes.some(l => i.name.includes(l))); if (it) { out.push({ icon: '🎁', title: `${n}에게 ${it.name}`, cost: '취향 저격 · 애정 +', say: `${n}에게 ${it.name}을(를) 건넨다.` }); break; } }
    if (modOn('map') && level('map') > 0) for (const p of book.people) { const w = whereNow(book, S, p); if (w?.place && w.place !== S.loc && !S.with.includes(p.name)) { const pl = placeOf(book, w.place); out.push({ icon: PLACE_KINDS[pl?.kind] ?? '📍', title: `${w.place} 가기`, cost: `${p.face} ${p.name} 있음`, say: `${w.place}(으)로 간다.` }); break; } }
    return out.slice(0, 4);
}
// ⏳ 곧 일어날 일 (미리 보기 · 시간순)
function soon(r) {
    const { book, S } = r, out = [], H = (m) => (m < 60 ? `${Math.max(1, Math.round(m))}분 뒤` : m < 1440 ? `${Math.round(m / 60)}시간 뒤` : `${Math.round(m / 1440)}일 뒤`);
    if (modOn('stats')) for (const n of book.me.needs) { const v = S.needs[n.key] ?? 0, st = needStage(v), next = st === '정상' ? 40 : st === '주의' ? 15 : null; if (next != null && n.rate > 0) { const m = (v - next) / n.rate * 60; if (m < 360) out.push({ m, icon: n.icon, text: `${n.name} ${st === '정상' ? '주의' : '위험'}`, when: H(m) }); } }
    for (const st of S.status) if (st.until != null && st.until - S.t < 720) out.push({ m: st.until - S.t, icon: st.src === 'fate' ? '🔮' : '🏷️', text: `${st.name} 풀림`, when: H(st.until - S.t) });
    if (modOn('calendar')) {
        for (const p of S.promises) if (!p.done && p.due != null && p.due >= S.t && p.due - S.t <= DAY) out.push({ m: p.due - S.t, icon: '🤝', text: p.text, when: H(p.due - S.t) });
        const day0 = Math.floor(S.t / DAY);
        for (const p of book.people) { const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || S.rel[p.name]?.day || ''); if (!m) continue; for (let k = 0; k <= 3; k++) { const dt = dateOf(book.world.start, (day0 + k) * DAY); if (dt.m === Number(m[1]) && dt.d === Number(m[2])) out.push({ m: k * DAY, icon: '🎂', text: `${p.name} ${p.day}`, when: k ? `${k}일 뒤` : '오늘' }); } }
        const ev = worldEvent(day0 + 1); if (ev) out.push({ m: DAY - (S.t % DAY), icon: '🎪', text: `내일 ${ev.name}`, when: '내일' });
    }
    if (modOn('map')) { const nextSlot = slotName(S.t + 180); if (nextSlot !== slotName(S.t)) for (const p of book.people) if (!S.with.includes(p.name) && p.routine.some(q => q.place === S.loc && nextSlot.includes(String(q.at).slice(0, 1)))) out.push({ m: 180, icon: p.face, text: `${p.name}이(가) 여기로 옴`, when: nextSlot }); }
    return out.sort((a, b) => a.m - b.m).slice(0, 5);
}
// 🔴 앱 배지: 위험 수 · 새 소식 · 하루 안 약속 · 질투 · 요청된 판정 (앱을 열면 「본 것」으로)
export function badges(r) {
    const { book, S } = r, seen = getMeta().seen ?? {}, b = {};
    const danger = derived(book, S).filter(d => d.stage === '위험').length; if (danger) b.now = '!';
    const nw = S.news.length - (seen.news ?? 0); if (nw > 0) b.news = nw;
    const due = S.promises.filter(p => !p.done && p.due != null && p.due >= S.t && p.due - S.t <= DAY).length; if (due) b.cal = due;
    const jl = Object.values(S.rel).filter(x => x.jealous && !x.gone).length; if (jl) b.rel = jl;
    const rq = S.rolls.length - (seen.dice ?? 0); if (rq > 0) b.dice = rq;
    const ch = r.changes.length - (seen.rec ?? 0); if (ch > 0 && seen.rec != null) b.rec = '•';
    return b;
}
export function markSeen(appId, r) {
    const meta = getMeta(), seen = (meta.seen ??= {});
    const v = { news: r.S.news.length, dice: r.S.rolls.length, rec: r.changes.length }[appId];
    if (v != null && seen[appId] !== v) { seen[appId] = v; saveMeta(); }
}
