// 📈 변화 그래프 (v2.7.23): 애정 · 우정 · 돈이 답마다 어떻게 변해 왔는지 — 기록을 한 번 다시 더하며 값을 모은다 (AI 0회 · 저장하는 것 없음)
import { app, getMeta, esc, fmtNum, TITLE, ready, isActive } from './core.js';
import { compute } from './engine.js';
import { relAxes } from './core.js';
import { popup } from './kit.js';

const COLORS = ['#e2557b', '#2f62e9', '#17855a', '#d98a1f', '#8a56d6', '#1aa3b8', '#b0553a', '#6b7280'];
const MAX_LINES = 8;

// 답마다의 값 모으기 → { xs: [메시지 번호…], cash: [..], aff: { 이름: [..] }, trust: { 이름: [..] } }
export function trendData() {
    const xs = [], cash = [], aff = Object.create(null), trust = Object.create(null); // 이름이 constructor · toString 이어도 안전하게
    let last = '', tail = -1;
    const step = (i, s) => {
        const rel = s.data.rel?.user ?? [];
        const c = Number.isFinite(Number(s.data.wallet?.cash)) ? Number(s.data.wallet.cash) : null;
        const sig = `${c}|${rel.map(r => `${r.name}:${r.aff}:${r.trust}`).join(',')}`;
        tail = i;
        if (sig === last && xs.length) return; // 안 바뀐 답은 점을 늘리지 않는다 (끝 점은 아래에서 한 번)
        last = sig;
        const k = xs.length;
        xs.push(i); cash.push(c);
        for (const r of rel) {
            (aff[r.name] ??= new Array(k).fill(null)).push(r.aff);
            (trust[r.name] ??= new Array(k).fill(null)).push(r.trust);
        }
        // 이번 점에 없는 사람(합쳐졌거나 지워짐)은 빈칸
        for (const o of [aff, trust]) for (const n of Object.keys(o)) if (o[n].length < xs.length) o[n].push(null);
    };
    // 계산을 한 번 더 돌린다 (지금 화면의 상태 app.current는 건드리지 않는다)
    compute(undefined, { onStep: step });
    // 마지막으로 바뀐 뒤에도 이야기가 이어졌으면 선을 지금까지 늘인다
    if (xs.length && tail > xs[xs.length - 1]) { xs.push(tail); cash.push(cash[cash.length - 1]); for (const o of [aff, trust]) for (const n of Object.keys(o)) o[n].push(o[n][o[n].length - 1]); }
    return { xs, cash, aff, trust };
}

function chart(title, xs, series, { min = null, max = null, unit = '' } = {}) {
    const W = 640, H = 220, L = 46, R = 12, T = 12, B = 24;
    const vals = series.flatMap(s => s.data).filter(v => v !== null && Number.isFinite(v));
    if (!vals.length || xs.length < 2) return `<div class="ss-trend-box"><b>${esc(title)}</b><p class="ss-hint">아직 그릴 만큼 기록이 없어요.</p></div>`;
    let lo = min ?? Math.min(...vals), hi = max ?? Math.max(...vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08; if (min === null) lo -= pad; if (max === null) hi += pad;
    const x0 = xs[0], x1 = xs[xs.length - 1] === x0 ? x0 + 1 : xs[xs.length - 1];
    const X = (i) => L + ((xs[i] - x0) / (x1 - x0)) * (W - L - R);
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const grid = [0, 0.25, 0.5, 0.75, 1].map(p => { const v = lo + (hi - lo) * p, y = Y(v); return `<line x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity=".12"/><text x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="currentColor" fill-opacity=".65">${esc(fmtNum(Math.round(v)))}</text>`; }).join('');
    const zero = lo < 0 && hi > 0 ? `<line x1="${L}" x2="${W - R}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>` : '';
    const lines = series.map((s) => {
        // 빈칸(null)에서 선을 끊는다
        const segs = []; let cur = [];
        s.data.forEach((v, i) => { if (v === null || !Number.isFinite(v)) { if (cur.length) segs.push(cur); cur = []; } else cur.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`); });
        if (cur.length) segs.push(cur);
        return segs.map(p => (p.length === 1 ? `<circle cx="${p[0].split(',')[0]}" cy="${p[0].split(',')[1]}" r="2.5" fill="${s.color}"/>` : `<polyline points="${p.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`)).join('');
    }).join('');
    const legend = series.length > 1 || series[0].name ? `<div class="ss-trend-legend">${series.map(s => { const lastV = [...s.data].reverse().find(v => v !== null); return `<span><i style="background:${s.color}"></i>${esc(s.name)}${lastV !== undefined ? ` <small>${esc(fmtNum(lastV))}${esc(unit)}</small>` : ''}</span>`; }).join('')}</div>` : '';
    return `<div class="ss-trend-box"><b>${esc(title)}</b>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} 그래프" preserveAspectRatio="xMidYMid meet">${grid}${zero}${lines}
        <text x="${L}" y="${H - 6}" font-size="11" fill="currentColor" fill-opacity=".65">#${x0}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="11" fill="currentColor" fill-opacity=".65">#${x1} (지금)</text></svg>${legend}</div>`;
}

export function trendHTML() {
    const d = trendData();
    const st = app.current?.state, meta = getMeta();
    const AX = st?.data?.rel ? relAxes(st.data.rel) : { aff: '애정', trust: '우정' };
    // 사람이 많으면 지금 수치가 큰 순으로 MAX_LINES명까지
    const pick = (o) => Object.keys(o)
        .filter(n => o[n].some(v => v !== null))
        .sort((a, b) => Math.abs([...o[b]].reverse().find(v => v !== null) ?? 0) - Math.abs([...o[a]].reverse().find(v => v !== null) ?? 0))
        .slice(0, MAX_LINES)
        .map((n, k) => ({ name: n, color: COLORS[k % COLORS.length], data: o[n] }));
    const parts = [];
    if (st?.data?.rel) {
        parts.push(chart(`💗 ${AX.aff}`, d.xs, pick(d.aff), { min: null, max: null }));
        parts.push(chart(`🤝 ${AX.trust}`, d.xs, pick(d.trust)));
    }
    if (st?.data?.wallet) parts.push(chart(`💰 ${st.data.wallet.currency || '돈'}`, d.xs, [{ name: '', color: COLORS[3], data: d.cash }]));
    const baked = meta?.startAt > 0 ? `<p class="ss-hint">오래된 기록은 한 줄로 합쳐 둬서(이월), ${meta.startAt}번 메시지 뒤부터 보여요.</p>` : '';
    return `<h3>📈 변화 그래프</h3><p class="ss-hint">가로는 메시지 번호예요. 값이 바뀐 답에서만 선이 꺾여요. AI 0회 · 토큰 0.</p>${parts.join('') || '<p class="ss-hint">관계나 재산 칸이 켜져 있어야 그릴 수 있어요.</p>'}${baked}`;
}

export function openTrend() {
    if (!isActive() || !ready() || !app.current) { toastr.info('상태창이 있는 채팅에서 열어 주세요.', TITLE); return; }
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-trend';
    try { box.innerHTML = trendHTML(); } catch (e) { box.innerHTML = `<p class="ss-hint">그래프를 그리지 못했어요: ${esc(e?.message ?? e)}</p>`; }
    return popup(box, { large: true });
}
