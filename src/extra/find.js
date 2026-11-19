// 🔍 검색: 설정집 · 인물 · 소지품 · 장소 · 기록을 한 번에 (띄어 쓴 낱말은 모두 들어 있는 것만)
import { app, ctx } from '../base/st.js';
import { esc, norm } from '../base/util.js';
import { fold } from '../rules/engine.js';
import { sheet, row, card } from '../ui/kit.js';

export function findAll() {
    const el = sheet('🔍 검색', '<input class="text_pole ml-q" placeholder="이름 · 물건 · 장소 · 기록" autofocus><div class="ml-res"></div>');
    const q = el.querySelector('.ml-q'), out = el.querySelector('.ml-res');
    q.addEventListener('input', () => { out.innerHTML = results(q.value); });
    out.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (!a) return; el.remove(); if (a.dataset.act === 'jump') app.jump(Number(a.dataset.v)); else app.openSheet(a.dataset.v); });
}
function results(text) {
    const words = String(text).split(/\s+/).map(norm).filter(Boolean); if (!words.length) return '';
    const r = fold(); if (!r) return '';
    const hit = (...s) => { const h = norm(s.join(' ')); return words.every(w => h.includes(w)); };
    const L = [];
    for (const p of r.book.people) if (hit(p.name, p.line, ...p.aka, ...p.likes, ...p.hates, p.want)) L.push(row({ icon: p.face, title: esc(p.name), sub: esc(p.line), act: 'open', data: 'rel', more: true }));
    for (const it of r.S.items) if (hit(it.name)) L.push(row({ icon: '👜', title: esc(it.name), sub: `×${it.n}`, act: 'open', data: 'bag', more: true }));
    for (const p of r.book.world.places) if (hit(p.name, p.note, ...p.goods.map(g => g.name))) L.push(row({ icon: '📍', title: esc(p.name), act: 'open', data: 'map', more: true }));
    const chat = ctx().chat ?? [];
    for (let i = chat.length - 1; i >= 0 && L.length < 60; i--) for (const c of r.changes[i] ?? []) if (c.src !== 'time' && hit(c.label, c.why, String(c.to))) L.push(row({ icon: c.icon, title: esc(c.label), sub: `${esc(c.why)} · #${i}`, act: 'jump', data: i }));
    return L.length ? card('', L.join('')) : '<div class="ml-empty"><p>찾은 게 없어요.</p></div>';
}
