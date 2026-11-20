// 💗 연인 업데이트: ⭐ 인물과 고백이 이루어져 연인이 되면 마켓에 「관계 앱 업데이트」가 뜬다 → 받으면 하트 모드 · 헤어지거나 되돌리면 다운그레이드
//   보기만 바뀐다 (토큰 0 · 본편 · 수치 그대로). 채팅마다 meta.love = { 이름: true }
import { getMeta, saveMeta, app } from '../base/st.js';
import { esc, faceOf } from '../base/util.js';
import { relStage } from '../rules/engine.js';
import { personOf, isStar } from '../rules/book.js';
import { btn, toast } from './kit.js';

// 💍 고백이 이루어져 연인(Lv.2) · 부부(Lv.3)가 된 ⭐ 인물 (애정 꺼 둔 인물은 빼고)
export function loveReady(r) {
    const meta = getMeta();
    return Object.entries(r.S.rel ?? {}).filter(([n, x]) => !x.gone && isStar(meta, r.book, n) && !personOf(r.book, n)?.noLove && (x.lv ?? 1) >= 2).map(([n]) => n);
}
export const loveOn = (name) => !!getMeta()?.love?.[name];
export const loveAny = () => Object.values(getMeta()?.love ?? {}).some(Boolean);
// 마켓 맨 위 카드: 받을 업데이트 · 받은 업데이트(되돌리기) · 단계가 내려간 경우
export function loveCards(r) {
    const meta = getMeta(), ready = new Set(loveReady(r)), on = Object.keys(meta.love ?? {}).filter(n => meta.love[n]);
    const face = (n) => faceOf(personOf(r.book, n)?.face || r.S.rel[n]?.face, '🙂');
    const L = [];
    for (const n of ready) if (!on.includes(n)) L.push(`<div class="ml-mk ml-love-up"><i style="--c:#ff5c8a">💗</i><span><b>관계 앱 업데이트 · ${esc(n)}</b><small>${face(n)} ${esc(n)}와(과) ${r.S.rel[n]?.lv === 3 ? '부부' : '연인'}이 됐어요. 받으면 💗 연인 모드: 하트 아이콘 · 하트 뿜뿜 · 그 사람 얼굴에 하트.</small><small class="ml-to aux">🔒 보기만 바뀌어요 · 토큰 0 · 언제든 되돌리기</small></span><button class="ml-btn xs main ml-get" data-act="love-up" data-v="${esc(n)}">업데이트</button></div>`);
    for (const n of on) {
        const down = !ready.has(n), st = r.S.rel[n]?.ex || (r.S.rel[n] ? relStage(r.book, r.S.rel[n].aff, n, r.S.rel[n].lv)?.name : '');
        L.push(`<div class="ml-mk${down ? ' ml-love-down' : ' ml-love-on'}"><i style="--c:${down ? '#8d99ae' : '#ff5c8a'}">${down ? '💔' : '💗'}</i><span><b>💗 연인 모드 · ${esc(n)}</b><small>${down ? `지금 단계가 「${esc(st || '?')}」로 내려갔어요. 되돌릴까요?` : '받은 업데이트예요. 헤어지거나 그냥 원래대로 쓰고 싶으면 되돌려요.'}</small></span>${btn(down ? '되돌리기' : '되돌리기 (다운그레이드)', 'love-down', n, 'xs')}</div>`);
    }
    return L.length ? `<h4 class="ml-h4">⬆ 업데이트</h4><div class="ml-mks">${L.join('')}</div>` : '';
}
// 받을 업데이트가 있으면 마켓 아이콘에 배지 · 처음 닿았을 때 한 번 알림
export function loveBadge(r, b) {
    const meta = getMeta(), news = loveReady(r).filter(n => !meta.love?.[n]);
    if (news.length) b.market = '⬆';
    for (const n of news) if (!meta.loveTold?.[n]) { (meta.loveTold ??= {})[n] = true; saveMeta(); setTimeout(() => toast(`💗 관계 앱 업데이트가 있어요 · 🛍 마켓에서 받기 (${n})`, 'good'), 300); }
}
export function loveAct(act, v) {
    const meta = getMeta(); if (!meta || !v) return false;
    if (act === 'love-up') { (meta.love ??= {})[v] = true; saveMeta(); toast(`💗 업데이트 완료 · ${v}`, 'good'); setTimeout(burst, 50); }
    else if (act === 'love-down') { if (meta.love) delete meta.love[v]; saveMeta(); toast(`되돌렸어요 · ${v}`); }
    else return false;
    app.refresh?.(); return true;
}
// 하트 뿜뿜 (잠깐)
export function burst(host = document.getElementById('ml-full')) {
    if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'ml-burst';
    for (let k = 0; k < 14; k++) { const h = document.createElement('i'); h.textContent = ['💗', '💕', '💖', '❤️'][k % 4]; h.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 240)}px`); h.style.setProperty('--d', `${(Math.random() * 0.4).toFixed(2)}s`); box.append(h); }
    host.append(box); setTimeout(() => box.remove(), 1800);
}
// 홈 배경에 떠오르는 하트 (연인 모드일 때)
export const homeHearts = () => (loveAny() ? `<div class="ml-hearts" aria-hidden="true">${['💗', '💕', '💖', '💗', '💞'].map((h, k) => `<i style="--k:${k}">${h}</i>`).join('')}</div>` : '');
