// 🏠 홈: 위에 위젯(지금 · 이 장면 · 운세 · 욕구 · 주사위 · 달력 · 소식 · 같이 있는 사람) + 아래에 받은 앱 아이콘
// 🛍 마켓: 앱을 「받는」 느낌 — 실제로는 다 들어 있고 칸을 켜고 끈다 (지우면 홈 · 본편 주입에서 빠짐)
import { ctx, getMeta, saveMeta, settings, modOn } from '../base/st.js';
import { esc, signed, dateText, dateOf, DAY, periodName, clockText, fmt, num, faceOf, inPeriod } from '../base/util.js';
import { derived, needStage, relStage, diceParts, whereNow } from '../rules/engine.js';
import { personOf, placeOf, PLACE_KINDS, isStar } from '../rules/book.js';
import { lastSeen } from '../rules/thread.js';
import { quoteLine, songLink } from './music.js';
import { luckOf } from '../rules/luck.js';
import { level } from '../rules/inject.js';
import { upcoming, lastAI, turnCard, getDice } from './tabs.js';
import { btn } from './kit.js';
import { calPin } from './calplus.js';
import { sneakBadges, markSneakSeen } from '../rules/sneak.js';
import { nextAiNo } from '../base/st.js';
import { mascot, MASCOTS, MEATCON, mascotUrl, MASCOT_SOUNDS, PACK, packOn } from './mascot.js';
import { extApps, extOf, catalog, loadCatalog, hasApp, waitsReload } from '../extra/apps.js';
import { loveCards, loveBadge, loveAny, homeHearts } from './love.js';
import { todayLine } from './threadui.js';
import { wallSrc } from './wall.js';

// 앱 목록 — mod가 있으면 받기 · 지우기 가능, sys는 늘 있음
export const APPS = [
    { id: 'now', to: 'main', main: '증상 · 상태 딱지 이름', icon: '❤️', name: '수치', mod: 'stats', desc: '욕구 · 게이지 · 능력치 · 상태 딱지', c: '#ff6b6b' },
    { id: 'dice', to: 'main', main: '판정 결과 문장', icon: '🎲', name: '주사위', mod: 'dice', desc: '판정 · 보정 내역 · 오늘 운세 주사위', c: '#7c5cff' },
    { id: 'bag', to: 'main', main: '가진 돈 · 물건 · 착용 중', icon: '👜', name: '소지품', mod: 'wallet', desc: '돈 · 물건 · 착용 중 · 가게', c: '#f4a261' },
    { id: 'rel', to: 'main', main: '관계 단계 · 감정 기억 · 질투', icon: '💞', name: '관계', mod: 'rel', desc: '애정 · 우정 · 단계 · 기억 · 취향 도감', c: '#e0567f' },
    { id: 'map', to: 'main', main: '지금 장소 · 같이 있는 사람', icon: '🗺️', name: '지도', mod: 'map', desc: '노선도 · 인물 핀 · 건물 안 · 사진', c: '#2f9e7a' },
    { id: 'cal', to: 'main', main: '날짜 · 시간 · 날씨 · 약속', icon: '📅', name: '달력', mod: 'calendar', desc: '날짜 · 시간 · 날씨 · 약속 · 기념일', c: '#3a8ee6' },
    { id: 'news', to: 'aux', main: '', icon: '📰', name: '세계 소식', mod: 'news', desc: '화면 밖 생활 · 속셈 · 기념일 · 오늘 사건', c: '#6c7a89' },
    { id: 'music', to: 'aux', main: '', icon: '🎵', name: '추천 음악', mod: 'music', desc: 'AI가 장면을 보고 고른 실제 곡 하나 · 다른 곡 · 지난 곡', c: '#ff8fab' },
    { id: 'quote', to: 'main', main: '한 구절 (영향력을 올렸을 때만)', icon: '📜', name: '한 구절', mod: 'quote', desc: 'AI가 고른 속담 · 명대사 · 책 · 시 · 명언 · 사자성어', c: '#b08968' },
    { id: 'rec', to: 'aux', main: '', icon: '📒', name: '기록', mod: 'record', desc: '타임라인 · 책갈피 · 그때 상태 · 그래프', c: '#e9c46a' },
    { id: 'mind', to: 'main', main: '속마음을 적어 달라는 지시', icon: '💭', name: '속마음', mod: 'mind', desc: '인물 · 관전자 · 세포들의 속마음', c: '#a78bfa' },
    { id: 'custom', to: 'aux', main: '', icon: '🧩', name: '내 탭', mod: 'custom', desc: '직접 만드는 칸', c: '#43aa8b' },
    { id: 'book', icon: '📘', name: '설정집', sys: true, c: '#4361ee' },
    { id: 'gauge', icon: '🎚️', name: '영향력', sys: true, c: '#8d99ae' },
    { id: 'cat', icon: '😺', name: '마스코트', sys: true, c: '#f2a7b5' },
    { id: 'look', icon: '🎨', name: '꾸미기', sys: true, c: '#a0c4ff' },
    { id: 'market', icon: '🛍️', name: '마켓', sys: true, c: '#ff9f1c' },
    { id: 'set', icon: '⚙️', name: '설정', sys: true, c: '#6c757d' }, // 칩 점검 · 진단 · 프롬프트 · 모델 · 부하 · 복사
];
export const appOf = (id) => (String(id).startsWith('x:') ? extOf(id) : APPS.find(a => a.id === id));
export const installed = (a) => a.sys || a.ext || modOn(a.mod);
const Wx = (title, body, open = '', extra = '') => `<section class="ml-w"${open ? ` data-act="open" data-v="${open}"` : ''}><h4>${title}${open ? '<i>›</i>' : ''}${extra}</h4>${body}</section>`;

// 🎲 d20 그림 (위젯 · 주사위 앱 공용)
export const d20 = (n = 20, cls = '') => `<svg class="ml-d20 ${cls}" viewBox="0 0 100 100" `
    + `aria-hidden="true">${n === 1 ? '<polyline class="crack" points="38,8 46,30 36,44 52,60 44,78 54,94"/>' : ''}<polygon class="f0" points="50,4 `
    + `92,28 92,72 50,96 8,72 8,28"/><polygon class="f1" points="50,22 78,66 22,66"/><polyline class="ed" points="50,4 50,22 92,28 78,66 92,72 50,96 `
    + `78,66 22,66 8,72 22,66 8,28 50,22 22,66"/><polyline class="ed" points="92,28 78,66"/><text x="50" y="56">${n}</text></svg>`;

export function home(r) {
    const { book, S } = r, meta = getMeta(), li = lastAI();
    const dz = derived(book, S);
    const P = {}; // 위젯 id → html (순서 · 숨기기는 holder가 정함)
    const put = (title, body, open = '', extra = '', part = '') => { P[part] = Wx(title, body, open, extra); return ''; };
    const dt0 = dateOf(book.world.start, S.t), clk = book.world.start.cal?.style === '' ? periodName(S.t) : clockText(book.world.start, S.t);
    P.hero = `<div class="ml-hero ml-clock"><b class="ml-clock-t">${esc(clk)}</b><span class="ml-clock-d">${esc(dt0.mn)} ${dt0.d}일 ${dt0.w}요일 · ${esc(periodName(S.t))}`
        + `${S.weather ? ` · ${esc(S.weather)}` : ''}</span><span class="ml-clock-s">📍 ${esc(S.loc || '어딘가')}`
        + `${S.with.length ? ` · ${S.with.map(n => faceOf(personOf(book, n)?.face, '🙂')).join('')}` : ''}`
        + `${modOn('wallet') ? ` · 💰 ${fmt(S.cash)} ${esc(book.world.currency)}` : ''}</span>`
        + '</div>';
    const tags = [...S.status.map(s => `<span class="ml-chip ${s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : ''}">${s.src === 'fate' ? '🔮 ' : ''}${esc(s.name)}`
        + `${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}</span>`), ...dz.filter(d => d.stage === '위험').map(d => `<span class="ml-chip bad">${d.icon} ${esc(d.name)} 위험</span>`)];
    if (tags.length) P.tags = `<div class="ml-chips">${tags.join('')}</div>`;
    // 이 장면: 음악 · 구절 · 운세
    const L = [];
    if (modOn('quote')) L.push(quoteLine(S));
    const lk = luckOf(book, S, ctx().getCurrentChatId?.(), meta.luckRoll);
    L.push(lk.rolled ? `<div class="ml-scene luck"><i>🍀</i><span><b>${esc(lk.text)}</b><small>오늘 운세 · 🎲 ${lk.d}</small></span></div>` : `<div class="ml-scene luck tap" data-act="luckroll"><i>🎲</i><span><b>오늘 운세 굴리기</b><small>이야기 속 하루에 한 번 · 선택지에 🍀 · ⚠</small></span><em>굴리기</em></div>`);
    put('이 장면', `<div class="ml-scenes">${L.join('')}</div>`, '', '', 'scene');
    // ⏳ 곧 일어날 일
    { const L = soon(r); if (L.length) put('곧 일어날 일', L.map(x => `<div class="ml-rl"><i>${x.icon}</i>${esc(x.text)} <span>${esc(x.when)}</span></div>`).join(''), '', '', 'soon'); }
    // 🎵 지금 곡 (플레이어 모양)
    if (modOn('music')) P.music = musicWidget(S);
    // 욕구 미니
    if (modOn('stats')) put('수치', `<div class="ml-wneeds">${book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); return `<div class="${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><span>${n.icon} ${esc(n.name)}</span><span `
        + `class="ml-bar ${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><i style="width:${v}%"></i></span><b>${v}</b></div>`; }).join('')}`
        + `${book.me.gauges.map(g => { const v = Math.round(S.gauges[g.key] ?? g.start); return `<div><span>${esc(g.name)}</span><span class="ml-bar"><i style="width:${v / g.max * 100}%;background:${g.color}"></i></span><b>${v}</b></div>`; }).join('')}`
        + `</div>`, 'now', '', 'stats');
    // 주사위 위젯
    if (modOn('dice')) {
        const ds = getDice(), attr = ds.attr || book.me.attrs[0]?.name || '', P = diceParts(book, S, attr, luckOf(book, S, ctx().getCurrentChatId?.(), meta.luckRoll)), on = level('dice') >= 3 || level('stats') >= 3;
        const mod = P.filter(x => on || x.why === attr || x.why.endsWith('착용')).reduce((a, x) => a + x.n, 0), hist = meta.recent?.rolls?.[0];
        put('주사위', `<div class="ml-wdice"><button class="ml-dbtn" data-act="roll" data-v="${mod}`
            + `" title="굴리기">${d20(hist?.d ?? 20, hist ? `${hist.res.includes('성공') ? 'ok' : 'no'}${hist.d === 20 ? ' crit' : hist.d === 1 ? ' fumble' : ''}` : '')}`
            + `</button><div><b>${esc(attr || '판정')} ${signed(mod)} · 목표 ${ds.dc}</b><small>${hist ? esc(hist.text) : '주사위를 눌러 굴려요'}</small></div>`
            + `</div>`, 'dice', '', 'dice');
    }
    // 같이 있는 사람
    if (modOn('rel') && S.with.length)
        put(
            '같이 있는 사람',
            S.with
                .map((n) => {
                    const x = S.rel[n],
                        p = personOf(book, n);
                    if (!x) return '';
                    const st = relStage(book, x.aff, n);
                    return (
                        `<div class="ml-wp tap" data-act="person" data-v="${esc(n)}"><span>${p?.face || '🙂'}</span><b>${esc(n)}</b><span class="ml-pill ` +
                        `love">${esc(p?.noLove ? '친구' : st.name)}</span><span class="ml-bar love"><i style="width:${p?.noLove ? x.trust : x.aff}%"></i></span>` +
                        `<em>${p?.noLove ? x.trust : x.aff}</em></div>`
                    );
                })
                .join(''),
            'rel',
            '',
            'with',
        );
    // 이번 답
    const tc = turnCard(r, li); if (tc) P.turn = tc;
    // 📖 오늘 한 줄 (이야기 속 오늘 바뀐 것 중 가장 큰 것 · 보기만)
    { const t = todayLine(r); if (t) put('오늘', t, 'rec', '', 'today'); }
    // 달력: 이번 주 + 다가오는 것
    if (modOn('calendar')) {
        const day0 = Math.floor(S.t / DAY), up = upcoming(r);
        const marks = (k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY); const md = `${dt.m}/${dt.d}`; return up.filter(u => (u.t != null && Math.floor(u.t / DAY) === day0 + k) || u.md === md).length ; };
        const week = Array.from({ length: 7 }, (_, k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY), n = marks(k); return `<div class="${k === 0 ? 'today' : ''}"><small>${dt.w}</small><b>${dt.d}</b>${n ? '<i></i>' : ''}</div>`; }).join('');
        put('달력', `${calPin(r)}<div class="ml-week">${week}</div>${up.slice(0, 3).map(u => `<div class="ml-rl"><i>${u.icon}</i>${esc(u.text)} <span>${u.t != null ? (u.t - S.t <= DAY ? '하루 안' : dateText(book.world.start, u.t, false)) : esc(u.md)}</span></div>`).join('')}`, 'cal', '', 'cal');
    }
    // 소식
    if (modOn('news')) { const N = S.news.slice(0, 3); if (N.length) put('세계 소식', N.map(n => `<div class="ml-rl"><i>${n.icon}</i>${esc(n.text)}</div>`).join(''), 'news', '', 'news'); }
    return homeHearts() + holder(r, P);
}


// ───── 🏠 홈 꾸리기: 위젯 순서 · 숨기기 · 앱 순서 · 독 (✏️ 편집 모드 · 꾹 누르기) ─────
export const W_NAMES = { hero: '🕰 시계 · 오늘', tags: '🏷 상태 딱지', music: '🎵 지금 곡', scene: '📜 이 장면 · 운세', soon: '⏳ 곧 일어날 일', stats: '❤️ 수치',
    dice: '🎲 주사위', with: '👥 같이 있는 사람', turn: '🔁 이번 답', cal: '📅 달력', news: '📰 세계 소식', today: '📖 오늘 한 줄' };
const DEF_W = Object.keys(W_NAMES), DEF_DOCK = ['now', 'rel', 'map', 'cal'];
export function homeCfg() {
    const s = settings(); s.home ??= {}; const H = s.home;
    if (!Array.isArray(H.order)) H.order = [...DEF_W];
    for (const id of DEF_W) if (!H.order.includes(id)) H.order.push(id);
    if (!Array.isArray(H.hidden)) H.hidden = [...(s.partsOff?.home ?? [])].filter(id => W_NAMES[id]); // 예전 「보일 것」을 옮겨 옴
    if (!Array.isArray(H.apps)) H.apps = [];
    if (!Array.isArray(H.dock)) H.dock = [...DEF_DOCK];
    if (!Array.isArray(H.extOff)) H.extOff = []; // 홈에서 숨긴 기타 앱
    return H;
}
let editing = false;
export const homeEditing = () => editing;
export const setHomeEdit = (v) => { editing = !!v; };
const appIcon = (a, bd) => { const lv = a.id === 'rel' && loveAny(); return `<button class="ml-app${lv ? ' love' : ''}" data-act="open" data-v="${a.id}" data-app="${a.id}"><i style="--c:${lv ? '#ff5c8a' : a.c}">${lv ? '💗' : a.icon}`
    + `${bd[a.id] ? `<em class="ml-badge${bd[a.id] === '!' ? ' warn' : ''}">${bd[a.id]}</em>` : ''}</i><span>${a.name}</span></button>`; };
function holder(r, P) {
    const H = homeCfg(), bd = badges(r);
    let h = editing ? '<div class="ml-editbar"><span><b>✏️ 홈 편집</b><small>끌어서 순서 · 아래 독으로 옮기기 · ✕ 숨기기 · ＋ 다시 보이기</small></span>'
        + '<button class="ml-btn xs main" data-act="home-done">완료</button></div>' : '';
    for (const id of H.order) {
        if (!W_NAMES[id]) continue;
        const off = H.hidden.includes(id), body = P[id];
        if (!editing && (off || !body)) continue;
        h += `<div class="ml-wslot${off ? ' off' : ''}" data-w="${id}">${editing ? `<button class="ml-wx" data-act="w-toggle" data-v="${id}" title="${off ? '다시 보이기' : '숨기기'}">${off ? '＋' : '✕'}</button>` : ''}`
            + `${body || `<section class="ml-w ghost"><h4>${W_NAMES[id]}</h4><small>지금은 보일 내용이 없어요</small></section>`}</div>`;
    }
    const all = [...APPS.filter(installed), ...extApps().filter(a => !H.extOff.includes(a.appId))];
    const rank = (a) => { const k = H.apps.indexOf(a.id); return k < 0 ? 999 + (a.ext ? APPS.length : APPS.indexOf(a)) : k; };
    const dock = H.dock.map(appOf).filter(a => a && installed(a) && !(a.ext && H.extOff.includes(a.appId))).slice(0, 4), inDock = new Set(dock.map(a => a.id));
    h += `<div class="ml-apps" data-zone="apps">${all.filter(a => !inDock.has(a.id)).sort((a, b) => rank(a) - rank(b)).map(a => appIcon(a, bd)).join('')}</div>`;
    if (dock.length || editing) h += `<div class="ml-dock" data-zone="dock">${dock.map(a => appIcon(a, bd)).join('') || '<small>앱을 여기로 끌어 오세요 (4개까지)</small>'}</div>`;
    return h;
}
// 🎵 지금 곡 위젯 (플레이어 모양)
function musicWidget(S) {
    const b = S.bgm;
    if (!b) return `<section class="ml-w ml-player" data-act="open" data-v="music"><div class="ml-pl-h"><i>🎵</i><span><b>아직 고른 곡이 없어요</b><small>장면 분위기가 바뀌면 골라요</small></span></div></section>`;
    return `<section class="ml-w ml-player"><div class="ml-pl-h tap" data-act="open" data-v="music"><i>🎵</i><span><b>${esc(b.title)}</b><small>${esc(b.artist || '')}${b.mood ? ` · ${esc(b.mood)}` : ''}</small></span></div>`
        + `<div class="ml-pl-bar"><i></i></div><div class="ml-pl-c"><span>⏮</span><a class="ml-pl-play" href="${esc(songLink(b))}" target="_blank" rel="noopener" title="듣기">▶</a><span>⏭</span></div></section>`;
}
// 🛍 마켓
// ───── 첫 화면: 설정집이 없는 채팅 → 설정집 카드 하나만 ─────
export function firstView() {
    return `<div class="ml-first"><div class="ml-mk big"><i style="--c:#4361ee">📘</i><span><b>설정집</b><small>이 이야기의 세계 · 장소 · 물가 · 인물 · 욕구 규칙을 한 곳에 적어요. `
        + `상태창은 이걸 보고 계산하고, 본편에는 결과만 가요.</small></span></div>`
        + `<div class="ml-acts">${btn('📘 로어북 · 카드로 채우기 <small>(AI 1회)</small>', 'mk-ai', '', 'main')}${btn('✏️ 직접 쓰기', 'mk-self', '')}</div>`
        + '<div class="ml-hint">설정집을 만들면 쓸 앱을 고르는 화면이 떠요. 그 전에는 본편에 아무것도 넣지 않고, AI도 부르지 않아요.</div></div>';
}
// 장르에 맞는 추천 (미리 체크만 · 「시작」을 눌러야 깔림)
export function recommend(book) {
    const g = String(book?.world?.genre ?? ''), on = new Set(['stats', 'wallet', 'rel', 'map', 'calendar', 'dice', 'record']);
    if (/연애|로맨스|학원|romance/i.test(g)) ['mind', 'music', 'quote'].forEach(x => on.add(x));
    if (/판타지|무협|SF|아포칼립스|fantasy/i.test(g)) on.add('news');
    if (/현대|일상|modern/i.test(g)) on.add('music');
    return on;
}
// ───── 설정집을 만든 뒤 한 번: 쓸 앱 고르기 ─────
export function setupView(r) {
    const rec = recommend(r.book), apps = APPS.filter(a => !a.sys);
    const row = (a) => `<label class="ml-mk ml-pick"><input type="checkbox" class="ml-setup-cb" data-mod="${a.mod}" ${rec.has(a.mod) ? 'checked' : ''}>`
        + `<i style="--c:${a.c}">${a.icon}</i><span><b>${a.name}</b><small>${esc(a.desc)}</small>`
        + `${a.to === 'main' ? `<small class="ml-to main">📤 본편: ${esc(a.main)}</small>` : '<small class="ml-to aux">🔒 상태창 안에서만</small>'}</span></label>`;
    const st = r.book.world.start, hh = Math.floor((st.clock ?? 480) / 60), mm = String((st.clock ?? 480) % 60).padStart(2, '0');
    const startRow = `<div class="ml-scene tap" data-act="bk-start"><i>📅</i><span><b>이야기 시작: ${st.cal?.era ? `${esc(st.cal.era)} ` : ''}${st.y}년 ${st.m}월 ${st.d}일 ${hh}:${mm}</b><small>누르면 시작 날짜 · 시각을 바꿔요</small></span><em>›</em></div>`;
    return startRow + `<div class="ml-hint">🛍️ 쓸 앱을 고르세요. ${esc(r.book.world.genre || '이 이야기')}에 맞는 것을 미리 체크해 뒀어요. 「시작」을 눌러야 깔리고, 나중에 마켓에서 더하거나 뺄 수 있어요.</div>`
        + `<h4 class="ml-h4">📤 본편 반영</h4><div class="ml-mks">${apps.filter(a => a.to === 'main').map(row).join('')}</div>`
        + `<h4 class="ml-h4">🔒 보조</h4><div class="ml-mks">${apps.filter(a => a.to !== 'main').map(row).join('')}</div>`
        + `<div class="ml-acts">${btn('▶ 시작', 'setup-start', '', 'main')}</div>`;
}
// 🛍 마켓 탭: 기본 앱 · 기타 앱(밖에서 만든 미트볼폰 앱)
let mktTab = 'base';
export const setMktTab = (v) => { mktTab = v === 'ext' ? 'ext' : 'base'; };
export function market(r) {
    const tabs = `<div class="ml-seg ml-mkt-tabs" data-seg="mkt">${[['base', '📱 기본 앱'], ['ext', `🧩 기타 앱${extApps().length ? ` ${extApps().length}` : ''}`]].map(([v, l]) => `<button class="${mktTab === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return (r ? loveCards(r) : '') + tabs + (mktTab === 'ext' ? marketExt() : marketBase());
}
function marketExt() {
    const H = homeCfg(), mine = extApps();
    if (!catalog()) loadCatalog();
    const row = (a) => { const off = H.extOff.includes(a.appId); return `<div class="ml-mk"><i style="--c:${a.c}">${a.icon}</i><span><b>${esc(a.name)}</b>`
        + `<small>${esc(a.desc || '밖에서 깐 앱')}</small><small class="ml-to aux">🧩 ${a.version ? `v${esc(a.version)} · ` : ''}깔려 있음</small></span>`
        + `${btn('열기', 'open', a.id, 'xs')}<button class="ml-mini" data-act="x-home" data-v="${esc(a.appId)}" title="${off ? '홈에 보이기' : '홈에서 숨기기'}">${off ? '👁‍🗨' : '🙈'}</button></div>`; };
    const cat = (catalog() ?? []).filter(x => !hasApp(x.id));
    const crow = (x) => `<div class="ml-mk"><i style="--c:#8d99ae">${x.icon}</i><span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small>`
        + `<small class="ml-to aux">${x.by ? `만든 사람 ${esc(x.by)} · ` : ''}<a href="${esc(x.repo)}" target="_blank" rel="noopener">저장소</a></small></span>`
        + `${waitsReload(x.id) ? '<button class="ml-btn xs main" data-act="x-reload">새로 고침</button>' : `<button class="ml-btn xs main ml-get" data-act="x-install" data-v="${esc(x.id)}">설치</button>`}</div>`;
    return `<div class="ml-hint">미트볼폰에 맞게 만든 앱이에요. 깔면 홈에 아이콘이 생겨요. 지우기는 실리태번 › 확장 관리에서 해요.</div>`
        + `<h4 class="ml-h4">🧩 깔린 앱</h4><div class="ml-mks">${mine.length ? mine.map(row).join('') : '<small class="ml-empty">아직 깔린 기타 앱이 없어요</small>'}</div>`
        + `<h4 class="ml-h4">✅ 받을 수 있는 앱 <span>미트볼폰에서 코드를 확인한 앱만 올라와요</span></h4><div class="ml-mks">`
        + `${!catalog() ? '<small class="ml-empty">목록 불러오는 중…</small>' : cat.length ? cat.map(crow).join('') : '<small class="ml-empty">새로 받을 앱이 없어요</small>'}</div>`;
}
function marketBase() {
    const row = (a) => { const on = installed(a); return `<div class="ml-mk"><i style="--c:${a.c}">${a.icon}</i><span><b>${a.name}</b><small>${esc(a.desc)}`
        + `</small>${a.to === 'main' ? `<small class="ml-to main">📤 본편: ${esc(a.main)}</small>` : '<small class="ml-to aux">🔒 상태창 안에서만</small>'}`
        + `</span>${on ? `${btn('열기', 'open', a.id, 'xs')}<button class="ml-mini" data-act="uninstall" data-v="${a.id}" title="지우기">🗑</button>` : `<button class="ml-btn xs main ml-get" data-act="install" data-v="${a.id}">받기</button>`}`
        + `</div>`; };
    const apps = APPS.filter(a => !a.sys);
    return `<div class="ml-hint">앱을 받으면 홈에 생겨요. 지우면 홈과 본편 주입에서 빠져요 (기록은 그대로).</div>
        <h4 class="ml-h4">📤 본편 반영 <span>결과값만 본편에 가요 · 숫자 · 보정 같은 중간값은 안 가요</span></h4><div `
        + `class="ml-mks">${apps.filter(a => a.to === 'main').map(row).join('')}</div>
        <h4 class="ml-h4">🔒 보조 <span>상태창 안에서만 · 본편 토큰 0</span></h4><div class="ml-mks">${apps.filter(a => a.to !== 'main').map(row).join('')}</div>
        <h4 class="ml-h4">🎨 꾸미기</h4><div class="ml-mks"><div class="ml-mk"><i style="--c:#f2a7b5"><img src="${mascotUrl('con:heart')}" alt="" `
        + `style="width:40px;height:40px"></i><span><b>미트볼콘 팩</b><small>마스코트 모습 ${PACK.length}개 더 · 약 4.6MB · 인터넷에서 받아요</small><small class="ml-to `
        + `aux">🔒 상태창 안에서만</small>`
        + `</span>${packOn() ? `${btn('고르기', 'open', 'cat', 'xs')}<button class="ml-mini" data-act="packoff" title="지우기">🗑</button>` : '<button class="ml-btn xs main ml-get" data-act="packget">받기</button>'}`
        + `</div></div>`;
}

// 😺 마스코트 고르기: 표정 7개 + 미트볼콘 14개 중 평소 모습 · 소리 · 크기
const FACE_KO = { idle: '평소', happy: '웃음', think: '생각', surprise: '놀람', sad: '울먹', sleep: '잠', party: '파티', hi: '안녕', heart: '하트', proud: '뿌듯', focus: '집중', groom: '그루밍', tongue: '메롱', roll: '뒹굴', blanket: '담요', box: '상자', pray: '부탁', gasp: '헉', sulk: '삐침', blank: '멍' };
export function cat() {
    const s = settings(), cur = s.mascotPick || 'idle';
    const cell = (id) => `<button class="ml-cat${cur === id ? ' on' : ''}" data-act="catpick" data-v="${id}"><img src="${mascotUrl(id)}" alt="" draggable="false"><small>${FACE_KO[id.replace('con:', '')] ?? id}</small></button>`;
    return `<div class="ml-catbig">${mascot('lg')}<small>눌러 보세요 · 빠르게 다섯 번 누르면 파티 · 너무 누르면 울어요</small></div>
        <h4 class="ml-h4">표정</h4><div class="ml-cats">${MASCOTS.map(cell).join('')}</div>
        <h4 class="ml-h4">미트볼콘</h4><div class="ml-cats">${MEATCON.map(n => cell(`con:${n}`)).join('')}</div>
        ${packOn() ? `<h4 class="ml-h4">미트볼콘 팩 <span>${PACK.length}개</span></h4><div class="ml-cats">${PACK.map(([id, n]) => `<button class="ml-cat${cur === `pack:${id}` ? ' on' : ''}" data-act="catpick" data-v="pack:${id}"><img src="${mascotUrl(`pack:${id}`)}" alt="" `
            + `loading="lazy" draggable="false"><small>${esc(n)}</small></button>`).join('')}</div>` : `<div class="ml-scene tap" data-act="open" data-v="market"><i>🛍️</i><span><b>미트볼콘 팩 ${PACK.length}개 더 받기</b><small>마켓에서 받을 수 있어요</small></span>`
            + `<em>›</em></div>`}
        <h4 class="ml-h4">소리</h4><div class="ml-picks">${MASCOT_SOUNDS.map(([v, n]) => `<button class="ml-btn xs${(s.mascotSound || 'meow') === v ? ' on' : ''}" data-act="catsound" data-v="${v}">${n}</button>`).join('')}</div>
        <div class="ml-hint">위험할 땐 울먹, 밤엔 자는 얼굴로 저절로 바뀌어요 (평소 모습이 「평소」일 때).</div>`;
}

// ⏳ 곧 일어날 일 (미리 보기 · 시간순)
function soon(r) {
    const { book, S } = r, out = [], H = (m) => (m < 60 ? `${Math.max(1, Math.round(m))}분 뒤` : m < 1440 ? `${Math.round(m / 60)}시간 뒤` : `${Math.round(m / 1440)}일 뒤`);
    if (modOn('stats'))
        for (const n of book.me.needs) {
            const v = S.needs[n.key] ?? 0,
                st = needStage(v),
                next = st === '정상' ? 40 : st === '주의' ? 15 : null;
            if (next != null && n.rate > 0) {
                const m = ((v - next) / n.rate) * 60;
                if (m < 360) out.push({ m, icon: n.icon, text: `${n.name} ${st === '정상' ? '주의' : '위험'}`, when: H(m) });
            }
        }
    // 👀 눈치 알림: 낮아진 욕구 + 가방 · 여기 가게에 채울 것이 있으면 한 줄로 (앱 여러 개를 엮어서 · 보기만)
    if (modOn('stats')) for (const n of book.me.needs) {
        const v = S.needs[n.key] ?? 0; if (needStage(v) === '정상') continue;
        const it = modOn('wallet') && S.items.find(x => !x.worn && num(x.fx?.[n.key]) > 0);
        const g = !it && modOn('wallet') && placeOf(book, S.loc)?.goods.filter(x => num(x.fx?.[n.key]) > 0 && x.price <= S.cash).sort((a, b) => num(b.fx[n.key]) - num(a.fx[n.key]))[0];
        if (it || g) { out.push({ m: -1, icon: '👀', text: it ? `${n.name} 낮음 · 가방에 ${it.name} (${n.name} +${num(it.fx[n.key])})` : `${n.name} 낮음 · 여기서 ${g.name} ${fmt(g.price)} ${book.world.currency}`, when: '지금' }); break; }
    }
    // 🕰 오래 못 본 주요 인물 (7일 넘게)
    if (modOn('rel')) { const meta = getMeta(); let best = null; for (const [nm, x] of Object.entries(S.rel)) { if (x.gone || S.with.includes(nm) || !isStar(meta, book, nm)) continue; const d = lastSeen(r, nm); if (d != null && d >= 7 && (!best || d > best.d)) best = { nm, d }; }
        if (best) out.push({ m: DAY * 2, icon: personOf(book, best.nm)?.face || '🙂', text: `${best.nm} · ${best.d}일째 못 봄`, when: '연락해 볼까요' }); }
    for (const st of S.status) if (st.until != null && st.until - S.t < 720) out.push({ m: st.until - S.t, icon: st.src === 'fate' ? '🔮' : '🏷️', text: `${st.name} 풀림`, when: H(st.until - S.t) });
    if (modOn('calendar')) {
        for (const p of S.promises) if (!p.done && p.due != null && p.due >= S.t && p.due - S.t <= DAY) out.push({ m: p.due - S.t, icon: '🤝', text: p.text, when: H(p.due - S.t) });
        const day0 = Math.floor(S.t / DAY);
        for (const p of book.people) {
            const m = /(\d{1,2})\s*[월/.]\s*(\d{1,2})/.exec(p.day || S.rel[p.name]?.day || '');
            if (!m) continue;
            for (let k = 0; k <= 3; k++) {
                const dt = dateOf(book.world.start, (day0 + k) * DAY);
                if (dt.m === Number(m[1]) && dt.d === Number(m[2]))
                    out.push({ m: k * DAY, icon: '🎂', text: `${p.name} ${p.day}`, when: k ? `${k}일 뒤` : '오늘' });
            }
        }
    }
    if (modOn('map')) {
        const nextPeriod = periodName(S.t + 180);
        if (nextPeriod !== periodName(S.t))
            for (const p of book.people)
                if (!S.with.includes(p.name) && p.routine.some((q) => q.place === S.loc && inPeriod(q.at, nextPeriod)))
                    out.push({ m: 180, icon: p.face, text: `${p.name}이(가) 여기로 옴`, when: nextPeriod });
    }
    return out.sort((a, b) => a.m - b.m).slice(0, 5);
}
// 🔴 앱 배지: 위험 수 · 새 소식 · 하루 안 약속 · 질투 · 요청된 판정 (앱을 열면 「본 것」으로)
export function badges(r) {
    const { book, S } = r, seen = getMeta().seen ?? {}, b = {};
    const danger = derived(book, S).filter(d => d.stage === '위험').length; if (danger) b.now = '!';
    const nw = Math.min(S.news.length, (S.newsN ?? S.news.length) - (seen.news ?? 0)); if (nw > 0) b.news = nw;
    const due = S.promises.filter(p => !p.done && p.due != null && p.due >= S.t && p.due - S.t <= DAY).length; if (due) b.cal = due;
    const jl = Object.values(S.rel).filter(x => x.jealous && !x.gone).length; if (jl) b.rel = jl;
    const rq = Math.min(S.rolls.length, (S.rollN ?? S.rolls.length) - (seen.dice ?? 0)); if (rq > 0) b.dice = rq;
    const ch = r.changes.length - (seen.rec ?? 0); if (ch > 0 && seen.rec != null) b.rec = '•';
    sneakBadges(getMeta(), S, b); // ✍ 몰래 생긴 것 (처음 열어 볼 때까지)
    loveBadge(r, b); // 💗 연인 업데이트
    return b;
}
export function markSeen(appId, r) {
    const meta = getMeta(), seen = (meta.seen ??= {});
    const v = { news: r.S.newsN ?? r.S.news.length, dice: r.S.rollN ?? r.S.rolls.length, rec: r.changes.length }[appId];
    if (v != null && seen[appId] !== v) { seen[appId] = v; saveMeta(); }
    if (markSneakSeen(meta, r.S, appId, nextAiNo())) saveMeta(); // ✍ 처음 열어 봄 → 다음 답 1번에 알아채기
}

// 🎨 꾸미기 — 직접 고르기 하나 (색 · 글꼴 · 글자 크기 · 모서리 · 테두리 · 그림자) · 바로 보임
const SWATCH = ['#e07a5f', '#e0567f', '#7c5cff', '#3a8ee6', '#2f9e7a', '#f4a261', '#6c7a89', '#222222'];
const FONTS = [['', '실리태번 글꼴'], ['Galmuri11', '갈무리 (도트)'], ['system-ui', '시스템'], ['serif', '명조']];
// 🖼 배경화면 (CSS로만 만든 그라데이션 · 확장에 그림 파일 없음) + 내 사진
export const WALLS = [
    ['', '없음', 'var(--bg)'],
    ['cream', '크림', 'linear-gradient(165deg,#fff6ea 0%,#fde4dc 55%,#eef0e4 100%)'],
    ['peach', '복숭아', 'linear-gradient(170deg,#ffe0cc 0%,#ffbfa8 45%,#f2a6a6 100%)'],
    ['lilac', '라벤더 노을', 'linear-gradient(180deg,#d8c4e6 0%,#f6c6d9 55%,#c9dcf5 100%)'],
    ['sky', '하늘', 'linear-gradient(180deg,#b9dcff 0%,#d9eef7 50%,#fff8ec 100%)'],
    ['mint', '민트', 'linear-gradient(160deg,#e3f5e6 0%,#c4e8cf 50%,#fbf8e8 100%)'],
    ['night', '밤', 'linear-gradient(180deg,#25253f 0%,#4b4e6d 55%,#9a8c98 100%)'],
];
export const wallCss = (L) => (L.wall === 'img' && wallSrc(L) ? `url("${wallSrc(L)}") center/cover no-repeat` : WALLS.find(w => w[0] === L.wall)?.[2] ?? '');
export function look() {
    const L = settings().look;
    const sl = (k, n, min, max, step) => `<div class="ml-gauge"><div class="ml-gauge-h"><b>${n}</b><span class="ml-pill">${L[k]}</span></div><input type="range" class="ml-range" min="${min}" max="${max}" step="${step}" value="${L[k]}" data-look="${k}"></div>`;
    return `<h4 class="ml-h4">강조색</h4><div class="ml-swatch">${SWATCH.map(c => `<button style="--c:${c}" class="${L.accent === c ? 'on' : ''}" data-act="look-set" data-v="accent|${c}"></button>`).join('')}<input type="color" data-look="accent" value="${L.accent}"></div>
        <h4 class="ml-h4">글꼴</h4><div class="ml-picks">${FONTS.map(([v, n]) => `<button class="ml-btn xs${L.font === v ? ' on' : ''}" data-act="look-set" data-v="font|${v}" style="font-family:${v || 'inherit'}">${n}</button>`).join('')}</div>
        <div class="ml-card">${sl('size', '글자 크기', 0.85, 1.3, 0.05)}${sl('radius', '모서리', 0, 24, 2)}${sl('border', '테두리 두께', 0, 3, 1)}${sl('shadow', '그림자', 0, 3, 1)}</div>
        <h4 class="ml-h4">🖼 배경화면 <span>홈 화면 · 위젯은 유리처럼 비쳐요</span></h4>
        <div class="ml-walls">${WALLS.map(([id, n, bg]) => `<button class="ml-wall${(L.wall ?? '') === id ? ' on' : ''}" data-act="look-set" data-v="wall|${id}" style="background:${bg}"><span>${n}</span></button>`).join('')}`
        + `<label class="ml-wall up${L.wall === 'img' ? ' on' : ''}"${wallSrc(L) ? ` style="background:url('${wallSrc(L)}') center/cover"` : ''}><span>🖼 내 사진</span><input type="file" accept="image/*" data-wallfile hidden></label></div>
        <div class="ml-card"><div class="ml-gauge"><div class="ml-gauge-h"><b>배경 어둡게</b><span class="ml-pill">${L.wallDim ?? 0}%</span></div><input type="range" class="ml-range" min="0" max="60" step="5" value="${L.wallDim ?? 0}" data-look="wallDim"></div></div>
        <h4 class="ml-h4">창 자리 <span>노트북 · PC만 · 휴대폰은 늘 꽉 차요</span></h4><div class="ml-picks">${[['left', '◧ 왼쪽'], ['right', '◨ 오른쪽']].map(([v, n]) => `<button class="ml-btn xs${(L.side ?? 'left') === v ? ' on' : ''}" data-act="look-set" data-v="side|${v}">${n}</button>`).join('')}</div>
        <h4 class="ml-h4">앱 아이콘</h4><div class="ml-picks">${[['color', '컬러'], ['tone', '배경 톤에 맞춤']].map(([v, n]) => `<button class="ml-btn xs${(L.icons ?? 'color') === v ? ' on' : ''}" data-act="look-set" data-v="icons|${v}">${n}</button>`).join('')}</div>
        <div class="ml-acts">${btn('기본으로', 'look-reset', '', 'xs')}${btn('✏️ 홈 편집', 'home-edit', '', 'xs')}</div>`;
}
