// 🔍 검색: 설정집 · 인물 · 소지품 · 장소 · 상태 · 소식 · 속마음 · 약속 · 내 탭 · 용어집 · 기록 · 이야기 본문까지 한 번에
//   띄어 쓴 낱말은 모두 들어 있는 것만 · 조사(은/는/이/가/을/를/에서 …)는 떼고 찾음 · 찾은 말은 칠해서 보여 줌
import { app, ctx, getMeta, msgKey } from '../base/st.js';
import { esc, norm, dateText } from '../base/util.js';
import { fold } from '../rules/engine.js';
import { stripTags } from '../rules/tags.js';
import { glossList } from '../base/gloss.js';
import { sheet, row, card } from '../ui/kit.js';

const JOSA = /(에게서|한테서|으로서|으로써|에서는|이랑|에게|한테|께서|에서|으로|부터|까지|처럼|보다|이나|은|는|이|가|을|를|에|의|와|과|도|로|랑|만|께|야|아)$/;
export const stem = (w) => { const s = norm(w); if (s.length < 2) return s; const t = s.replace(JOSA, ''); return t.length ? t : s; };
const ESC_RE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 칠하기: 이미 esc된 글에서 낱말을 <mark>로
export function paint(html, words) {
    if (!words.length) return html;
    const re = new RegExp(`(${words.map(w => w.split('').map(ESC_RE).join('\\s*')).join('|')})`, 'gi');
    return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => tag ?? txt.replace(re, '<mark>$1</mark>'));
}
const GROUPS = [['all', '전체'], ['book', '설정집'], ['now', '지금'], ['rec', '기록'], ['story', '본문']];
let group = 'all', lastQ = '';
export function findAll() {
    const el = sheet('🔍 검색', `<input class="text_pole ml-q" placeholder="이름 · 물건 · 장소 · 속마음 · 기록 · 본문 (조사는 알아서 뗌)" autofocus value="${esc(lastQ)}"><div class="ml-seg ml-fg">${GROUPS.map(([k, l]) => `<button data-g="${k}" class="${k === group ? 'on' : ''}">${l}</button>`).join('')}</div><div class="ml-res"></div>`);
    const q = el.querySelector('.ml-q'), out = el.querySelector('.ml-res');
    let t = 0; const run = () => { lastQ = q.value; out.innerHTML = results(q.value); };
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
    el.querySelector('.ml-fg').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; group = b.dataset.g; el.querySelectorAll('.ml-fg button').forEach(x => x.classList.toggle('on', x === b)); run(); });
    out.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (!a) return; el.remove(); if (a.dataset.act === 'jump') app.jump(Number(a.dataset.v)); else app.openSheet(a.dataset.v); });
    if (lastQ) run();
}
export function results(text, only = group) {
    const words = String(text).split(/\s+/).map(stem).filter(Boolean); if (!words.length) return '';
    const r = fold(); if (!r) return '';
    const { book, S } = r, meta = getMeta();
    const hit = (...s) => { const h = norm(s.flat().filter(x => x != null).join(' ')); return words.every(w => h.includes(w)); };
    const P = (s) => paint(esc(String(s ?? '')), words);
    const G = { book: [], now: [], rec: [], story: [] };
    const R = (g, o) => G[g].push(row({ ...o, title: P(o.title), sub: o.sub != null ? P(o.sub) : undefined, more: true }));
    // 📘 설정집
    for (const p of book.people) if (hit(p.name, p.line, p.aka, p.likes, p.hates, p.want, p.day, p.haunt, p.signs?.map(s => s.text), p.routine?.map(x => `${x.at} ${x.place}`), p.syn?.map(s => `${s.to} ${s.text}`), p.stages?.map(s => s.name))) R('book', { icon: p.face, title: p.name, sub: [p.line, p.likes?.length && `좋아함 ${p.likes.join(', ')}`, p.want].filter(Boolean).join(' · '), act: 'open', data: 'rel' });
    for (const p of book.world.places) if (hit(p.name, p.note, p.line, p.goods.map(g => g.name))) R('book', { icon: '📍', title: p.name, sub: [p.note, p.goods.length && `파는 것 ${p.goods.map(g => g.name).join(', ')}`].filter(Boolean).join(' · '), act: 'open', data: 'map' });
    if (hit(book.world.genre, book.world.currency, book.world.weather, book.world.coins?.map(c => c.name))) R('book', { icon: '🌍', title: `세계 · ${book.world.genre || '장르 없음'}`, sub: `${book.world.currency} · ${book.world.weather.join('/')}`, act: 'open', data: 'book' });
    for (const g of glossList()) if (hit(g.from, g.to)) R('book', { icon: '🌐', title: `${g.from} → ${g.to}`, sub: '용어집', act: 'open', data: 'book' });
    // 🧍 지금 상태
    for (const it of S.items) if (hit(it.name, it.worn && '착용')) R('now', { icon: it.worn ? '👕' : '👜', title: it.name, sub: `×${it.n}${it.worn ? ' · 착용 중' : ''}`, act: 'open', data: 'bag' });
    for (const st of S.status) if (hit(st.name, st.note, '상태')) R('now', { icon: '🏷️', title: st.name, sub: st.note || '상태 딱지', act: 'open', data: 'now' });
    for (const [n, x] of Object.entries(S.rel)) for (const m of x.mem ?? []) if (hit(n, m.text)) R('now', { icon: '💬', title: `${n}의 기억`, sub: m.text, act: 'open', data: 'rel' });
    for (const [k, pr] of Object.entries(S.pairs ?? {})) if (hit(k.replace('|', ' '), pr.label, pr.why)) R('now', { icon: '🔗', title: k.replace('|', ' ↔ '), sub: [pr.label, pr.why].filter(Boolean).join(' · '), act: 'open', data: 'rel' });
    for (const p of S.promises ?? []) if (hit(p.text, '약속')) R('now', { icon: p.done ? '✅' : '📅', title: p.text, sub: p.due != null ? dateText(book.world.start, p.due, false) : '날짜 없음', act: 'open', data: 'cal' });
    for (const nw of S.news ?? []) if (hit(nw.text, nw.who)) R('now', { icon: nw.icon ?? '📰', title: nw.text, sub: '세계 소식', act: 'open', data: 'news' });
    for (const e of [...(S.mindLog ?? [])].reverse()) if (hit(e.who, e.text, '속마음')) R('now', { icon: '💭', title: `${e.who} · ${e.text}`, sub: dateText(book.world.start, e.t), act: 'jump', data: e.m });
    for (const [tn, fields] of Object.entries(S.custom ?? {})) for (const [fn, v] of Object.entries(fields ?? {})) if (hit(tn, fn, String(v))) R('now', { icon: '🧩', title: `${tn} · ${fn}`, sub: String(v), act: 'open', data: 'custom' });
    // 🗂 기록 (변화) · 책갈피
    const chat = ctx().chat ?? [];
    for (const mk of meta.marks ?? []) { const i = chat.findIndex(x => msgKey(x) === mk.key); if (i >= 0 && hit(mk.name, '책갈피')) R('rec', { icon: '⭐', title: mk.name, sub: `책갈피 · #${i}`, act: 'jump', data: i }); }
    for (let i = chat.length - 1; i >= 0 && G.rec.length < 50; i--) for (const c of r.changes[i] ?? []) if (c.src !== 'time' && hit(c.label, c.why, String(c.to), String(c.from))) R('rec', { icon: c.icon, title: c.label, sub: `${c.why ?? ''} · ${String(c.from ?? '')}→${String(c.to ?? '')} · #${i}`, act: 'jump', data: i });
    // 📖 이야기 본문 (태그 뺀 글 · 앞뒤 조금만)
    for (let i = chat.length - 1; i >= 0 && G.story.length < 30; i--) {
        const m = chat[i]; if (m.is_system) continue; const t = stripTags(m.mes ?? ''), h = norm(t); if (!words.every(w => h.includes(w))) continue;
        const k = t.toLowerCase().indexOf(String(text).split(/\s+/)[0].toLowerCase()), at = Math.max(0, (k < 0 ? 0 : k) - 30);
        R('story', { icon: m.is_user ? '🙋' : '📖', title: `#${i} ${m.is_user ? '나' : (m.name ?? '답')}`, sub: `${at ? '…' : ''}${t.slice(at, at + 90).replace(/\s+/g, ' ')}…`, act: 'jump', data: i });
    }
    const NAMES = { book: '📘 설정집', now: '🧍 지금', rec: '🗂 기록', story: '📖 본문' };
    const keys = only === 'all' ? Object.keys(G) : [only];
    const html = keys.filter(k => G[k].length).map(k => card(`${NAMES[k]} ${G[k].length}`, G[k].slice(0, only === 'all' ? 8 : 60).join('') + (only === 'all' && G[k].length > 8 ? `<div class="ml-row"><span class="ml-tx"><small>외 ${G[k].length - 8}개 · 위에서 「${NAMES[k].slice(2)}」를 누르면 다 보여요</small></span></div>` : ''))).join('');
    return html || '<div class="ml-empty"><p>찾은 게 없어요.</p></div>';
}
