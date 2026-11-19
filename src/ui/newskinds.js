// 📰 세계 소식 앱 화면: 켤 종류 · 탭(전체 · 📰 · 💬 · 📱 · 🌙) · 📱 피드 카드 (AI 0회)
import { esc, dateText, DAY, faceOf } from '../base/util.js';
import { row, card, empty } from './kit.js';
import { worldEvent } from '../rules/engine.js';
import { personOf } from '../rules/book.js';
import { NEWS_KINDS, kindsOn, toggleKind, kindInfo, reactions } from '../rules/newskinds.js';

let tab = 'all';
export const newsTab = () => tab;

// 📱 피드 카드: 얼굴 · 이름 · 글 · 시각 · 반응
function feedCard(book, n) {
    const who = n.who || '', p = personOf(book, who), face = p?.face || faceOf(who, '🙂');
    const text = n.text.startsWith(`${who} — `) ? n.text.slice(who.length + 3) : n.text;
    return `<div class="ml-feed"><div class="ml-feed-h"><span class="ml-face">${face}</span><b>${esc(who)}</b>`
        + `<small>${dateText(book.world.start, n.t, false)}</small></div><p>${esc(text)}</p>`
        + `<div class="ml-feed-r">${reactions(text).map(x => `<span>${x.e} ${x.n}</span>`).join('')}</div></div>`;
}

export function newsView(r) {
    const { book, S } = r, on = kindsOn();
    // 켤 종류 (위쪽 설정 줄)
    let h = `<div class="ml-nk-set"><small>받을 소식</small>${NEWS_KINDS.map(k => `<button class="ml-btn xs${on[k.id] ? ' on' : ''}" data-act="nk-on" data-v="${k.id}" title="${esc(k.what)}">`
        + `${k.icon} ${k.name}</button>`).join('')}</div>`;
    // 탭
    const cnt = (id) => S.news.filter(n => n.kind === id).length;
    h += `<div class="ml-nk-tabs">${[['all', '전체', S.news.length], ...NEWS_KINDS.map(k => [k.id, k.icon, cnt(k.id)])].map(([id, l, c]) => `<button class="${tab === id ? 'on' : ''}" data-act="nk-tab" data-v="${id}" title="${esc(kindInfo(id)?.name ?? '전체')}">`
        + `${l}${c ? ` <small>${c}</small>` : ''}</button>`).join('')}</div>`;
    const list = S.news.filter(n => tab === 'all' || n.kind === tab).slice(0, 20);
    if (tab === 'feed') return h + (list.length ? `<div class="ml-feeds">${list.map(n => feedCard(book, n)).join('')}</div>` : empty('아직 올라온 글이 없어요.'));
    const L = [];
    const ev = tab === 'all' && worldEvent(Math.floor(S.t / DAY)); if (ev) L.push(row({ icon: ev.icon ?? '🎌', title: esc(ev.name), sub: '공휴일' }));
    for (const n of list) L.push(row({ icon: n.icon, title: esc(n.text), sub: `${kindInfo(n.kind)?.name ?? '소식'} · ${dateText(book.world.start, n.t, false)}` }));
    if (tab === 'all' || tab === 'life') for (const [n, x] of Object.entries(S.rel)) if (x.want && !x.gone) L.push(row({ icon: '🎯', title: `${esc(n)}의 속셈`, sub: esc(x.want), faint: true }));
    const hint = on.life && tab === 'life' ? '<div class="ml-hint">🌙 화면 밖 소식은 영향력 3(강하게)부터 본편에 적어 달라고 해요.</div>' : '';
    return h + (L.length ? card(tab === 'all' ? '세계 소식' : `${kindInfo(tab).icon} ${kindInfo(tab).name}`, L.join('')) : empty(tab === 'all' ? '조용한 하루예요.' : '아직 이 종류 소식이 없어요.')) + hint;
}
// 누르기 — 다시 그리면 true
export function newsAct(act, v) {
    if (act === 'nk-tab') { tab = v === 'all' || kindInfo(v) ? v : 'all'; return true; }
    if (act === 'nk-on') { toggleKind(v); return true; }
    return false;
}
