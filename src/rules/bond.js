// 💍 고백 · 청혼 · 이별 — 본편 지시 · 분류 키 · 힌트 (보기만 · 계산은 engine)
import { personOf } from './book.js';
import { DAY } from '../base/util.js';

// 지금 누가: 고백할 때(레벨 1 · 애정 100) · 청혼할 때(레벨 2 · 애정 100) · 연인 · 부부 · 대답 기다림
export function bondNow(book, S) {
    const live = Object.entries(S?.rel ?? {}).filter(([n, r]) => !r.gone && !personOf(book, n)?.noLove);
    const rest = (r) => r.turned != null && S.t - r.turned < DAY; // 💤 거절당한 뒤 하루는 쉼
    return {
        confess: live.filter(([n, r]) => (r.lv ?? 1) === 1 && r.aff >= 100 && !S.asks?.[n] && !rest(r)).map(([n]) => n),
        propose: live.filter(([n, r]) => r.lv === 2 && r.aff >= 100 && !S.asks?.[n] && !rest(r)).map(([n]) => n),
        couple: live.filter(([, r]) => r.lv >= 2).map(([n]) => n),
        waiting: Object.entries(S?.asks ?? {}).map(([n, a]) => ({ name: n, ...a })),
    };
}
// 본편 · 분류 모델이 적을 줄 (해당하는 사람이 있을 때만 · 토큰 아낌)
export function bondKeys(book, S, en) {
    const B = bondNow(book, S), K = [];
    if (B.confess.length) K.push(en ? ['confess', 'name (| yes if accepted in the story · | no if turned down)', `a confession happened (only ${B.confess.join(', ')} can)`] : ['confess', '이름 (이야기에서 받아들였으면 | yes · 거절했으면 | no)', `고백했을 때 (${B.confess.join(', ')}만)`]);
    if (B.propose.length) K.push(en ? ['propose', 'name (| yes · | no)', `a marriage proposal happened (only ${B.propose.join(', ')} can)`] : ['propose', '이름 (| yes · | no)', `청혼했을 때 (${B.propose.join(', ')}만)`]);
    if (B.couple.length) K.push(en ? ['breakup', 'name | reason', `they broke up or divorced (${B.couple.join(', ')})`] : ['breakup', '이름 | 이유', `헤어지거나 이혼했을 때 (${B.couple.join(', ')})`]);
    return K;
}
// 본편 힌트 (영어 · 숫자 없이)
export function bondHints(book, S, user) {
    const B = bondNow(book, S), H = [];
    for (const n of B.confess) if (S.with?.includes(n)) H.push(`${n} is head over heels for ${user}. When the moment feels right, ${n} confesses their feelings (or accepts if ${user} confesses first) — then write \`confess: ${n}\`. Do not decide ${user}'s answer.`);
    for (const n of B.propose) if (S.with?.includes(n)) H.push(`${n} wants to spend their life with ${user}. When the moment feels right, ${n} proposes — then write \`propose: ${n}\`. Do not decide ${user}'s answer.`);
    for (const w of B.waiting) H.push(`${w.name} ${w.kind === 'confess' ? 'confessed' : 'proposed'} and is waiting for ${user}'s answer — do not decide it.`);
    return H;
}
