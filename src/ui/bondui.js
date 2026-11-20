// 💍 고백 · 청혼 — 🔕 따로 알림은 안 띄움 · 폰 홈 맨 위 카드 · 관계 앱 인물 카드(· 📞 연락 앱 대화)에서 예 · 아니오
//   대답은 meta.answers에 → 다시 계산하면 그 메시지에서 연인(2) · 부부(3)가 됨 · 이루어지면 🐱 축하 알림 한 번
import { getMeta, saveMeta, app, ctx } from '../base/st.js';
import { esc } from '../base/util.js';
import { toast } from './kit.js';
import { hasApp, extOf } from '../extra/apps.js';

const what = (kind) => (kind === 'confess' ? '고백' : '청혼');
// 📞 연락 앱이 고백 · 청혼 메시지를 받을 수 있나 (그 앱이 asks: true 를 알려 줌)
export const viaContacts = () => hasApp('contacts') && extOf('x:contacts')?.asks === true;
export const askText = (kind) => (kind === 'confess' ? '있잖아… 나 너 좋아해. 우리 사귈래?' : '나랑… 결혼해 줄래?');

export function answer(key, name, kind, yes) {
    const meta = getMeta(); if (!meta || !key || !name) return;
    (meta.answers ??= {})[`${key}|${name}|${kind}`] = yes ? 'yes' : 'no';
    if (yes) meta.bondJust = name; // 바로 다음 계산에서 축하 알림
    saveMeta(); app.refresh?.(true);
    if (yes) toast(`${what(kind) === '고백' ? '💗' : '💍'} ${name}와(과) ${kind === 'confess' ? '연인' : '부부'}이 됐어요`, 'good');
    if (!yes) toast(`${name}의 ${what(kind)}을(를) 거절했어요`, 'mid');
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
    // 🔕 고백 · 청혼은 알림을 띄우지 않음 — 폰 홈 맨 위 카드 · 관계 앱 인물 카드에서 예 · 아니오
    r.changes.forEach((L, i) => (L ?? []).forEach(c => {
        if (!c?.lvUp) return; const k = `up|${c.who}|${c.lvUp}|${i}`; if (told[k]) return; told[k] = 1;
        if (i >= len - 3 || meta.bondJust === c.who) anniv(r, c.who, c.lvUp); // 📌 사귄 날 D-day만 (🔕 축하 알림은 안 띄움) · 옛 채팅의 지난 일은 건너뜀
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
