// 💍 고백 · 청혼 알림 — 📞 연락 앱이 받을 수 있으면 연락으로 · 없으면 🐱 수상한 고양이 알림(예 · 아니오)
//   대답은 meta.answers에 → 다시 계산하면 그 메시지에서 연인(2) · 부부(3)가 됨 · 이루어지면 🐱 축하 알림 한 번
import { getMeta, saveMeta, app, ctx } from '../base/st.js';
import { esc } from '../base/util.js';
import { toast, layerHost } from './kit.js';
import { mascot } from './mascot.js';
import { hasApp, extOf } from '../extra/apps.js';

const CAT = '🐱 수상한 고양이';
const what = (kind) => (kind === 'confess' ? '고백' : '청혼');
// 📞 연락 앱이 고백 · 청혼 메시지를 받을 수 있나 (그 앱이 asks: true 를 알려 줌)
export const viaContacts = () => hasApp('contacts') && extOf('x:contacts')?.asks === true;
export const askText = (kind) => (kind === 'confess' ? '있잖아… 나 너 좋아해. 우리 사귈래?' : '나랑… 결혼해 줄래?');

export function answer(key, name, kind, yes) {
    const meta = getMeta(); if (!meta || !key || !name) return;
    (meta.answers ??= {})[`${key}|${name}|${kind}`] = yes ? 'yes' : 'no';
    if (yes) meta.bondJust = name; // 바로 다음 계산에서 축하 알림
    saveMeta(); document.querySelectorAll(`.ml-cat[data-who="${CSS.escape(name)}"]`).forEach(x => x.remove());
    app.refresh?.(true);
    if (!yes) toast(`${name}의 ${what(kind)}을(를) 거절했어요`, 'mid');
}
// 떠 있는 🐱 알림 (폰을 닫아 둬도 보임)
function pop(name, html, onClick, ms = 0) {
    document.querySelectorAll(`.ml-cat[data-who="${CSS.escape(name)}"]`).forEach(x => x.remove());
    const el = document.createElement('div'); el.className = 'ml-cat ml-scope'; el.dataset.who = name;
    el.innerHTML = `<div class="ml-cat-h">${mascot('xs')}<b>${CAT}</b><button class="ml-cat-x" data-cat="x" title="닫기">✕</button></div>${html}`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; if (b.dataset.cat === 'x') { el.remove(); return; } onClick?.(b.dataset.cat); el.remove(); });
    (document.getElementById('ml-full') ?? layerHost()).appendChild(el);
    if (ms) setTimeout(() => el.remove(), ms);
}
function popAsk(name, a) {
    pop(name, `<p><b>${esc(name)}</b>이(가) ${what(a.kind)}했어요!<br><small>「${esc(askText(a.kind))}」</small></p><div class="ml-cat-b"><button class="ml-btn good" data-cat="yes">예</button><button class="ml-btn" data-cat="no">아니오</button></div>`,
        (v) => answer(a.key, name, a.kind, v === 'yes'));
}
function congrats(name, lv) {
    pop(name, `<p class="ml-cat-yay">${lv === 3 ? '💍' : '💗'} 축하해요!<br>이제 <b>${esc(name)}</b>와(과) <b>${lv === 3 ? '부부' : '연인'}</b>이에요</p><small>${lv === 3 ? '부부 애정이 0부터 새로 쌓여요' : '연인 애정(Lv.2)이 0부터 새로 쌓여요 · 🛍 마켓에 관계 앱 업데이트'}</small>`, null, 7000);
    if (document.getElementById('ml-full')) import('./love.js').then(m => m.burst()).catch(() => {});
}
// 📌 사귄 날 · 결혼한 날을 달력 D-day에 (D+n으로 셈 · 달력 앱에서 지우거나 홈에 걸 수 있음)
function anniv(r, name, lv) {
    import('../rules/calplus.js').then(({ calOf, dayNow }) => {
        const cal = calOf(); if (!cal) return; const day = dayNow(r.S), nm = `${lv === 3 ? '💍' : '💗'} ${name}와(과) ${lv === 3 ? '결혼한 날' : '사귄 날'}`;
        if (cal.dday.some(d => d.name === nm && d.day === day)) return;
        cal.dday.push({ id: Math.random().toString(36).slice(2, 9), name: nm.slice(0, 40), day, pin: !cal.dday.some(d => d.pin) }); saveMeta();
    }).catch(() => {});
}
// 계산할 때마다: 새 고백 · 청혼 → 알림 한 번 · 막 이루어진 레벨 업 → 축하 한 번
export function bondNotify(r) {
    const meta = getMeta(); if (!meta || !r) return;
    const told = (meta.bondTold ??= {}), n0 = Object.keys(told).length, len = ctx().chat?.length ?? 0;
    for (const [n, a] of Object.entries(r.S.asks ?? {})) {
        const k = `ask|${a.key}|${n}|${a.kind}`; if (told[k]) continue; told[k] = 1;
        if (viaContacts()) toast(`📞 연락 · ${n}에게서 메시지가 왔어요`, 'good'); else popAsk(n, a);
    }
    r.changes.forEach((L, i) => (L ?? []).forEach(c => {
        if (!c?.lvUp) return; const k = `up|${c.who}|${c.lvUp}|${i}`; if (told[k]) return; told[k] = 1;
        if (i >= len - 3 || meta.bondJust === c.who) { congrats(c.who, c.lvUp); anniv(r, c.who, c.lvUp); } // 옛 채팅을 처음 열 때 지난 일로 알림이 쏟아지지 않게
    }));
    if (meta.bondJust) delete meta.bondJust;
    if (Object.keys(told).length !== n0) saveMeta();
}
// 폰 홈 맨 위: 대답 기다리는 고백 · 청혼 (연락으로 보냈으면 연락에서 답해도 되고 여기서도 됨)
export function askCards(r) {
    const A = Object.entries(r.S.asks ?? {}); if (!A.length) return '';
    return A.map(([n, a]) => `<div class="ml-mk ml-love-up"><i style="--c:#ff5c8a">💌</i><span><b>${esc(n)}의 ${what(a.kind)}</b><small>「${esc(askText(a.kind))}」 ${viaContacts() ? '· 📞 연락에서도 답할 수 있어요' : ''}</small></span>`
        + `<span class="ml-acts"><button class="ml-btn xs good" data-act="bond-ans" data-v="${esc(a.key)}|${esc(n)}|${a.kind}|yes">예</button><button class="ml-btn xs" data-act="bond-ans" data-v="${esc(a.key)}|${esc(n)}|${a.kind}|no">아니오</button></span></div>`).join('');
}
