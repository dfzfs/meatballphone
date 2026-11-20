// ✏️ 「지금 값」 한 번에 고치기 — 앱의 ✏️ 편집을 누르면 먼저 뜨는 창 (dev 탭 편집처럼 한 화면에서)
//   바뀐 칸만 사건 줄로 마지막 답에 붙인다(✋ 직접 · 기록 · 되돌리기 · 리롤을 그대로 따라감). 규칙(설정집)은 아래 「📘 규칙 고치기」로 따로.
import { getMeta } from '../base/st.js';
import { esc, num } from '../base/util.js';
import { form, toast } from './kit.js';
import { fold, relStage, stagesOf } from '../rules/engine.js';
import { personOf } from '../rules/book.js';

const sg = (d) => (d > 0 ? `+${d}` : `${d}`);
const rulesBtn = (appId, label) => `<div class="ml-acts"><button type="button" class="ml-btn sm" data-act="t-rules" data-v="${appId}">📘 ${label}</button></div>`
    + '<div class="ml-hint">여기서 고친 「지금 값」은 마지막 답에 ✋ 직접으로 붙어요 · 기록에서 되돌릴 수 있어요.</div>';
const WHY = { k: 'why', label: '이유 (기록에 남음)', ph: '직접 고침', chips: ['계산이 틀림', '이야기와 안 맞음', '되돌림'] };

// 고친 값 → 사건 줄 (handLines에 넘김) · 바뀐 게 없으면 null
export async function quickEdit(appId, handLines) {
    const r = fold(), meta = getMeta(); if (!r || !meta?.book) return false;
    const { S, book: b } = r;
    if (appId === 'now' || appId === 'dice') {
        const F = [
            ...b.me.needs.map((n, j) => ({ k: `n${j}`, label: `${n.icon} ${esc(n.name)} (0~100)`, type: 'number', v: Math.round(S.needs[n.key] ?? 0) })),
            ...b.me.gauges.map((g, j) => ({ k: `g${j}`, label: `❤️ ${esc(g.name)} (0~${g.max})`, type: 'number', v: Math.round(S.gauges[g.key] ?? g.start) })),
            ...b.me.attrs.map((a, j) => ({ k: `a${j}`, label: `💪 ${esc(a.name)} (−5~10)`, type: 'number', v: S.attrs[a.name] ?? 0 })),
            { k: 'st', label: '🏷 상태 딱지 (쉼표 · 지우면 풀림 · 새로 적으면 붙음)', v: S.status.map(x => x.name).join(', '), ph: '감기, 기분 좋음' },
            WHY,
        ];
        const fv = await form('✏️ 수치 · 지금 값', F, { extra: rulesBtn(appId, '규칙 고치기 (이름 · 아이콘 · 줄어드는 속도 · 시작 값)') }); if (!fv) return false;
        const L = [];
        b.me.needs.forEach((n, j) => { const d = Math.round(num(fv[`n${j}`], S.needs[n.key]) - (S.needs[n.key] ?? 0)); if (d) L.push(`${n.name}: ${sg(d)}`); });
        b.me.gauges.forEach((g, j) => { const d = Math.round(num(fv[`g${j}`], S.gauges[g.key]) - (S.gauges[g.key] ?? g.start)); if (d) L.push(`${g.name}: ${sg(d)}`); });
        b.me.attrs.forEach((a, j) => { const d = Math.round(num(fv[`a${j}`], S.attrs[a.name]) - (S.attrs[a.name] ?? 0)); if (d) L.push(`attr: ${a.name} ${sg(d)}`); });
        const want = String(fv.st ?? '').split(/[,，、]/).map(x => x.trim()).filter(Boolean), have = S.status.map(x => x.name);
        for (const h of have) if (!want.includes(h)) L.push(`status: -${h}`);
        for (const w of want) if (!have.includes(w)) L.push(`status: ${w}`);
        return done(L, fv.why, handLines);
    }
    if (appId === 'bag') {
        const F = [
            { k: 'cash', label: `💰 가진 돈 (${esc(b.world.currency)})`, type: 'number', v: S.cash },
            ...S.items.map((it, i) => ({ k: `i${i}`, label: `${it.worn ? '👕' : '📦'} ${esc(it.name)} 개수 (0이면 없앰)`, type: 'number', v: it.n })),
            { k: 'add', label: '＋ 새로 넣을 물건 (쉼표 · 「이름 ×2」)', ph: '우산, 사과 ×3' },
            WHY,
        ];
        const fv = await form('✏️ 소지품 · 지금 값', F, { extra: rulesBtn('bag', '물건 하나씩 고치기 (효과 · 착용 · 새 물건)') }); if (!fv) return false;
        const L = [];
        const c = num(fv.cash, S.cash); if (c !== S.cash) L.push(`cash: ${sg(Math.round((c - S.cash) * 100) / 100)}`);
        S.items.forEach((it, i) => { const n = Math.max(0, Math.round(num(fv[`i${i}`], it.n))), d = n - it.n; if (d > 0) L.push(`got: ${it.name} | ${d}`); if (d < 0) L.push(`item: -${it.name} | ${-d}`); });
        for (const part of String(fv.add ?? '').split(/[,，、]/)) { const m = /^\s*(.+?)\s*(?:[x×*]\s*(\d+))?\s*$/i.exec(part); if (m && m[1].trim()) L.push(`got: ${m[1].trim()} | ${Math.max(1, num(m[2], 1))}`); }
        return done(L, fv.why, handLines);
    }
    if (appId === 'rel') {
        const names = Object.keys(S.rel).filter(n => !S.rel[n].gone);
        if (!names.length) { toast('아직 만난 사람이 없어요'); return false; }
        const F = [];
        names.forEach((n, j) => {
            const x = S.rel[n], p = personOf(b, n), st = relStage(b, x.aff, n, x.lv);
            if (!p?.noLove) F.push({ k: `ra${j}`, label: `${p?.face || x.face || '🙂'} ${esc(n)} · 💗 애정 (지금 「${esc(st.name)}」)`, type: 'number', v: x.aff,
                chips: stagesOf(b, n, x.lv).map(s2 => `${s2.at}`).slice(0, 6), hint: stagesOf(b, n, x.lv).map(s2 => `${s2.name} ${s2.at}~`).join(' · ') });
            F.push({ k: `rt${j}`, label: `${p?.face || x.face || '🙂'} ${esc(n)} · 🤝 우정`, type: 'number', v: x.trust });
        });
        F.push(WHY);
        const fv = await form('✏️ 관계 · 지금 값', F, { extra: rulesBtn('rel', '인물 규칙 고치기 (성격 · 오르는/내리는 행동 · 시작 값 · 단계)') }); if (!fv) return false;
        const L = [];
        names.forEach((n, j) => {
            const x = S.rel[n];
            const da = fv[`ra${j}`] == null ? 0 : Math.round(Math.max(0, Math.min(100, num(fv[`ra${j}`], x.aff))) - x.aff); if (da) L.push(`aff: ${n} ${sg(da)}`);
            const dt = Math.round(Math.max(0, Math.min(100, num(fv[`rt${j}`], x.trust))) - x.trust); if (dt) L.push(`trust: ${n} ${sg(dt)}`);
        });
        return done(L, fv.why, handLines);
    }
    if (appId === 'map') {
        const places = b.world.places.map(p => p.name);
        const F = [
            { k: 'loc', label: '📍 지금 장소', type: 'pick', v: S.loc, opts: [...new Set([...(S.loc ? [S.loc] : []), ...places])].map(p => [p, esc(p)]) },
            { k: 'with', label: '👥 같이 있는 사람 (쉼표 · 비우면 혼자)', v: S.with.join(', '), chips: Object.keys(S.rel).filter(n => !S.rel[n].gone).slice(0, 8) },
            WHY,
        ];
        const fv = await form('✏️ 지도 · 지금', F, { extra: rulesBtn('map', '장소 규칙 고치기 (이어진 곳 · 가게 · 층)') }); if (!fv) return false;
        const L = [];
        if (fv.loc && fv.loc !== S.loc) L.push(`loc: ${fv.loc}`);
        const w = String(fv.with ?? '').split(/[,，、]/).map(x => x.trim()).filter(Boolean);
        if (w.join('|') !== S.with.join('|')) L.push(`with: ${w.length ? w.join(', ') : '없음'}`);
        return done(L, fv.why, handLines);
    }
    return null; // 이 앱은 따로 (달력 · 소식 · 음악 …)
}
function done(L, why, handLines) {
    if (!L.length) { toast('바뀐 게 없어요'); return true; }
    handLines(L, why || '직접 고침');
    toast(`✋ ${L.length}개 고쳤어요 · 기록에서 되돌릴 수 있어요`, 'good');
    return true;
}
