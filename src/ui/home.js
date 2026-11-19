// 🏠 홈: 위에 위젯(지금 · 이 장면 · 운세 · 욕구 · 주사위 · 달력 · 소식 · 같이 있는 사람) + 아래에 받은 앱 아이콘
// 🛍 마켓: 앱을 「받는」 느낌 — 실제로는 다 들어 있고 칸을 켜고 끈다 (지우면 홈 · 본편 주입에서 빠짐)
import { ctx, getMeta, saveMeta, settings, modOn } from '../base/st.js';
import { esc, signed, dateText, dateOf, DAY, slotName, hhmm, fmt, num } from '../base/util.js';
import { derived, needStage, relStage, worldEvent, priceMul, diceParts } from '../rules/engine.js';
import { personOf, placeOf } from '../rules/book.js';
import { moodTags, pickQuote, pickMusic } from '../rules/mood.js';
import { luckOf } from '../rules/luck.js';
import { level } from '../rules/inject.js';
import { upcoming, lastAI, turnCard, getDice } from './tabs.js';
import { btn } from './kit.js';

// 앱 목록 — mod가 있으면 받기 · 지우기 가능, sys는 늘 있음
export const APPS = [
    { id: 'now', icon: '❤️', name: '수치', mod: 'stats', desc: '욕구 · 게이지 · 능력치 · 상태 딱지', c: '#ff6b6b' },
    { id: 'dice', icon: '🎲', name: '주사위', mod: 'dice', desc: '판정 · 보정 내역 · 오늘 운세 주사위', c: '#7c5cff' },
    { id: 'bag', icon: '👜', name: '소지품', mod: 'wallet', desc: '돈 · 물건 · 착용 중 · 가게', c: '#f4a261' },
    { id: 'rel', icon: '💞', name: '관계', mod: 'rel', desc: '애정 · 우정 · 단계 · 기억 · 취향 도감', c: '#e0567f' },
    { id: 'map', icon: '🗺️', name: '지도', mod: 'map', desc: '노선도 · 인물 핀 · 건물 안 · 사진', c: '#2f9e7a' },
    { id: 'cal', icon: '📅', name: '달력', mod: 'calendar', desc: '날짜 · 시간 · 날씨 · 약속 · 기념일', c: '#3a8ee6' },
    { id: 'news', icon: '📰', name: '세계 소식', mod: 'news', desc: '화면 밖 생활 · 속셈 · 기념일 · 오늘 사건', c: '#6c7a89' },
    { id: 'music', icon: '🎵', name: '추천 음악', mod: 'music', desc: '장면 분위기에 맞는 곡', c: '#ff8fab' },
    { id: 'quote', icon: '📜', name: '한 구절', mod: 'quote', desc: '장면에 맞는 고전 · 사자성어 · 속담', c: '#b08968' },
    { id: 'rec', icon: '📒', name: '기록', mod: 'record', desc: '타임라인 · 책갈피 · 그때 상태 · 그래프', c: '#e9c46a' },
    { id: 'mind', icon: '💭', name: '속마음', mod: 'mind', desc: '인물 · 관전자 · 세포들의 속마음', c: '#a78bfa' },
    { id: 'custom', icon: '🧩', name: '내 탭', mod: 'custom', desc: '직접 만드는 칸 · 최면 어플 템플릿', c: '#43aa8b' },
    { id: 'book', icon: '📘', name: '설정집', sys: true, c: '#4361ee' },
    { id: 'gauge', icon: '🎚️', name: '영향력', sys: true, c: '#8d99ae' },
    { id: 'market', icon: '🛍️', name: '마켓', sys: true, c: '#ff9f1c' },
];
export const appOf = (id) => APPS.find(a => a.id === id);
export const installed = (a) => a.sys || modOn(a.mod);
const W = (title, body, open = '', extra = '') => `<section class="ml-w"${open ? ` data-act="open" data-v="${open}"` : ''}><h4>${title}${open ? '<i>›</i>' : ''}${extra}</h4>${body}</section>`;

// 🎲 d20 그림 (위젯 · 주사위 앱 공용)
export const d20 = (n = 20, cls = '') => `<svg class="ml-d20 ${cls}" viewBox="0 0 100 100" aria-hidden="true"><polygon class="f0" points="50,4 92,28 92,72 50,96 8,72 8,28"/><polygon class="f1" points="50,22 78,66 22,66"/><polyline class="ed" points="50,4 50,22 92,28 78,66 92,72 50,96 78,66 22,66 8,72 22,66 8,28 50,22 22,66"/><polyline class="ed" points="92,28 78,66"/><text x="50" y="56">${n}</text></svg>`;

export function home(r) {
    const { book, S } = r, meta = getMeta(), li = lastAI(), last = r.changes[li] ?? [];
    const pl = placeOf(book, S.loc), ev = worldEvent(Math.floor(S.t / DAY)), dz = derived(book, S);
    let h = `<div class="ml-hero"><div class="ml-hero-d"><small>${dateOf(book.world.start, S.t).m}월</small><b>${dateOf(book.world.start, S.t).d}</b><small>${dateOf(book.world.start, S.t).w}요일</small></div>
        <div class="ml-hero-b"><b>${slotName(S.t)} ${hhmm(S.t)}${S.weather ? ` · ${esc(S.weather)}` : ''}</b><span>📍 ${esc(S.loc || '어딘가')}${S.with.length ? ` · ${S.with.map(n => personOf(book, n)?.face || '🙂').join('')}` : ''}</span>${modOn('wallet') ? `<span>💰 ${fmt(S.cash)} ${esc(book.world.currency)}</span>` : ''}</div>
        ${ev ? `<span class="ml-pill ${ev.kind === 'good' ? 'good' : ev.kind === 'bad' ? 'bad' : 'love'}">🎪 ${esc(ev.name)}</span>` : ''}</div>`;
    const tags = [...S.status.map(s => `<span class="ml-chip ${s.kind === 'good' ? 'good' : s.kind === 'bad' ? 'bad' : ''}">${s.src === 'fate' ? '🔮 ' : ''}${esc(s.name)}${s.until ? ` · ${Math.max(1, Math.round((s.until - S.t) / 60))}h` : ''}</span>`), ...dz.filter(d => d.stage === '위험').map(d => `<span class="ml-chip bad">${d.icon} ${esc(d.name)} 위험</span>`)];
    if (tags.length) h += `<div class="ml-chips">${tags.join('')}</div>`;
    // 이 장면: 음악 · 구절 · 운세
    const tg = moodTags(r, last), L = [];
    if (modOn('music')) { const m = S.bgm ? { label: S.bgm, query: S.bgm } : pickMusic(tg, settings().musicTaste); L.push(`<div class="ml-scene tap" data-act="music" data-v="${esc(m.query)}"><i>🎵</i><span><b>${esc(m.label)}</b><small>지금 공기</small></span><em>▶</em></div>`); }
    if (modOn('quote')) { const q = pickQuote(tg, meta.recent?.quote ?? [], S.turn); if (q) L.push(`<div class="ml-scene tap" data-act="quote" data-v="${esc(`${q.text}\n\n${q.mean}\n— ${q.src}`)}"><i>📜</i><span><b>${esc(q.text)}</b><small>${esc(q.src)}</small></span><em>ⓘ</em></div>`); }
    const lk = luckOf(book, S, ctx().getCurrentChatId?.(), meta.luckRoll);
    L.push(lk.rolled ? `<div class="ml-scene luck"><i>🍀</i><span><b>${esc(lk.text)}</b><small>오늘 운세 · 🎲 ${lk.d}</small></span></div>` : `<div class="ml-scene luck tap" data-act="luckroll"><i>🎲</i><span><b>오늘 운세 굴리기</b><small>이야기 속 하루에 한 번 · 선택지에 🍀 · ⚠</small></span><em>굴리기</em></div>`);
    h += W('이 장면', `<div class="ml-scenes">${L.join('')}</div>`);
    // 욕구 미니
    if (modOn('stats')) h += W('수치', `<div class="ml-wneeds">${book.me.needs.map(n => { const v = Math.round(S.needs[n.key] ?? 0), st = needStage(v); return `<div class="${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><span>${n.icon} ${esc(n.name)}</span><span class="ml-bar ${st === '위험' ? 'bad' : st === '주의' ? 'mid' : ''}"><i style="width:${v}%"></i></span><b>${v}</b></div>`; }).join('')}${book.me.gauges.map(g => { const v = Math.round(S.gauges[g.key] ?? g.start); return `<div><span>${esc(g.name)}</span><span class="ml-bar"><i style="width:${v / g.max * 100}%;background:${g.color}"></i></span><b>${v}</b></div>`; }).join('')}</div>`, 'now');
    // 주사위 위젯
    if (modOn('dice')) {
        const ds = getDice(), attr = ds.attr || book.me.attrs[0]?.name || '', P = diceParts(book, S, attr), on = level('dice') >= 3 || level('stats') >= 3;
        const mod = P.filter(x => on || x.why === attr || x.why.endsWith('착용')).reduce((a, x) => a + x.n, 0), hist = meta.recent?.rolls?.[0];
        h += W('주사위', `<div class="ml-wdice"><button class="ml-dbtn" data-act="roll" data-v="${mod}" title="굴리기">${d20(hist?.d ?? 20, hist ? (hist.res.includes('성공') ? 'ok' : 'no') : '')}</button><div><b>${esc(attr || '판정')} ${signed(mod)} · 목표 ${ds.dc}</b><small>${hist ? esc(hist.text) : '주사위를 눌러 굴려요'}</small></div></div>`, 'dice');
    }
    // 같이 있는 사람
    if (modOn('rel') && S.with.length) h += W('같이 있는 사람', S.with.map(n => { const x = S.rel[n], p = personOf(book, n); if (!x) return ''; const st = relStage(book, x.aff); return `<div class="ml-wp tap" data-act="person" data-v="${esc(n)}"><span>${p?.face || '🙂'}</span><b>${esc(n)}</b><span class="ml-pill love">${esc(p?.noLove ? '친구' : st.name)}</span><span class="ml-bar love"><i style="width:${p?.noLove ? x.trust : x.aff}%"></i></span><em>${p?.noLove ? x.trust : x.aff}</em></div>`; }).join(''), 'rel');
    // 이번 답
    const tc = turnCard(r, li); if (tc) h += tc;
    // 달력: 이번 주 + 다가오는 것
    if (modOn('calendar')) {
        const day0 = Math.floor(S.t / DAY), up = upcoming(r);
        const marks = (k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY); const md = `${dt.m}/${dt.d}`; return up.filter(u => (u.t != null && Math.floor(u.t / DAY) === day0 + k) || u.md === md).length + (worldEvent(day0 + k) ? 1 : 0); };
        const week = Array.from({ length: 7 }, (_, k) => { const dt = dateOf(book.world.start, (day0 + k) * DAY), n = marks(k); return `<div class="${k === 0 ? 'today' : ''}"><small>${dt.w}</small><b>${dt.d}</b>${n ? '<i></i>' : ''}</div>`; }).join('');
        h += W('달력', `<div class="ml-week">${week}</div>${up.slice(0, 3).map(u => `<div class="ml-rl"><i>${u.icon}</i>${esc(u.text)} <span>${u.t != null ? (u.t - S.t <= DAY ? '하루 안' : dateText(book.world.start, u.t, false)) : esc(u.md)}</span></div>`).join('')}`, 'cal');
    }
    // 소식
    if (modOn('news')) { const N = [...(ev ? [{ icon: '🎪', text: ev.text }] : []), ...S.news.slice(0, 3)]; if (N.length) h += W('세계 소식', N.map(n => `<div class="ml-rl"><i>${n.icon}</i>${esc(n.text)}</div>`).join(''), 'news'); }
    // 앱
    h += `<div class="ml-apps">${APPS.filter(installed).map(a => `<button class="ml-app" data-act="open" data-v="${a.id}"><i style="--c:${a.c}">${a.icon}</i><span>${a.name}</span></button>`).join('')}</div>`;
    return h;
}
// 🛍 마켓
export function market() {
    const L = APPS.filter(a => !a.sys).map(a => { const on = installed(a); return `<div class="ml-mk"><i style="--c:${a.c}">${a.icon}</i><span><b>${a.name}</b><small>${esc(a.desc)}</small></span>${on ? `${btn('열기', 'open', a.id, 'xs')}<button class="ml-mini" data-act="uninstall" data-v="${a.id}" title="지우기">🗑</button>` : `<button class="ml-btn xs main ml-get" data-act="install" data-v="${a.id}">받기</button>`}</div>`; }).join('');
    return `<div class="ml-hint">앱을 받으면 홈에 생겨요. 지우면 홈과 본편 주입에서 빠져요 (기록은 그대로).</div><div class="ml-mks">${L}</div>`;
}
