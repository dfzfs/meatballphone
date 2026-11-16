// 🕸 관계도(인맥 지도) 자료 — 화면 없음 · AI 0회 · 저장 0
// 관계 칸(유저↔인물)과 「인물끼리」(pairs · 인물끼리 호감)를 점과 선으로 바꾼다. 그리는 쪽은 nodes의 x · y(0~1)와 edges의 w · tone만 쓰면 된다
import { app, norm, relAxes, DEFAULT_STAGES } from './core.js';

const st = () => app.current?.state ?? null;
// 선의 성격: 우호 good · 앙숙 bad · 그 사이 flat
const toneOf = (v) => (v >= 15 ? 'good' : v <= -15 ? 'bad' : 'flat');
// 선 굵기 0~1 (수치의 크기)
const weight = (v) => Math.min(1, Math.abs(Number(v) || 0) / 100);

// → { nodes: [{ id, name, me, aff, trust, stage, stageName, out, x, y }], edges: [{ a, b, kind: 'user'|'pair', aff, trust?, label, w, tone }], axes }
// max: 사람이 많을 때 호감의 크기가 큰 순으로 그만큼만 (유저는 늘 가운데)
export function relGraph(s = st(), { max = 12, withOut = false } = {}) {
    const rel = s?.data?.rel; if (!rel) return { nodes: [], edges: [], axes: null };
    const stages = rel.stages?.length ? rel.stages : DEFAULT_STAGES;
    const user = s.data.profile?.list?.find(p => p.role === 'user')?.name || '나';
    let people = (rel.user ?? []).filter(r => withOut || !r.out);
    people = [...people].sort((a, b) => Math.abs(b.aff) + Math.abs(b.trust) - (Math.abs(a.aff) + Math.abs(a.trust))).slice(0, Math.max(1, max));
    const ids = new Set(people.map(r => norm(r.name)));
    const nodes = [{ id: '@me', name: user, me: true, aff: null, trust: null, stage: -1, stageName: '', out: '', x: 0.5, y: 0.5 }];
    // 둥글게 놓기: 서로 선이 있는 사람끼리 붙어 앉도록, 짝이 많은 사람부터 이웃을 따라 순서를 잡는다
    const pairs = (rel.pairs ?? []).filter(p => ids.has(norm(p.a)) && ids.has(norm(p.b)) && norm(p.a) !== norm(p.b));
    const nb = new Map(people.map(r => [norm(r.name), []]));
    for (const p of pairs) { nb.get(norm(p.a)).push(norm(p.b)); nb.get(norm(p.b)).push(norm(p.a)); }
    const order = [], seen = new Set();
    const walk = (k) => { if (seen.has(k)) return; seen.add(k); order.push(k); for (const n of nb.get(k) ?? []) walk(n); };
    for (const r of [...people].sort((a, b) => (nb.get(norm(b.name))?.length ?? 0) - (nb.get(norm(a.name))?.length ?? 0))) walk(norm(r.name));
    order.forEach((k, i) => {
        const r = people.find(x => norm(x.name) === k), ang = (i / order.length) * Math.PI * 2 - Math.PI / 2;
        // 가까운 사람일수록 가운데에 가깝게 (반지름 0.28~0.44)
        const rad = 0.44 - 0.16 * Math.min(1, Math.max(0, r.aff) / 100);
        const stage = r.stage >= 0 ? stages[Math.min(r.stage, stages.length - 1)] : null;
        nodes.push({ id: k, name: r.name, me: false, aff: r.aff, trust: r.trust, stage: r.stage ?? -1, stageName: stage?.name ?? '', out: r.out ?? '', emoji: r.emoji ?? '', ilchon: (() => { try { return app.ilchon?.(r.name)?.text ?? ''; } catch { return ''; } })(), x: +(0.5 + rad * Math.cos(ang)).toFixed(4), y: +(0.5 + rad * Math.sin(ang)).toFixed(4) });
    });
    const edges = [];
    for (const r of people) edges.push({ a: '@me', b: norm(r.name), kind: 'user', aff: r.aff, trust: r.trust, label: r.label ?? '', jealous: (r.jealous ?? 0) >= 50, w: weight(Math.abs(r.aff) >= Math.abs(r.trust) ? r.aff : r.trust), tone: toneOf(Math.abs(r.aff) >= Math.abs(r.trust) ? r.aff : r.trust) });
    for (const p of pairs) { const has = Number.isFinite(p.aff); edges.push({ a: norm(p.a), b: norm(p.b), kind: 'pair', aff: has ? p.aff : null, label: p.label ?? '', w: has ? weight(p.aff) : 0.15, tone: has ? toneOf(p.aff) : 'flat' }); }
    return { nodes, edges, axes: relAxes(rel) };
}
// 한 사람을 눌렀을 때: 그 사람에게 이어진 선만
export function relGraphOf(name, s = st()) {
    const g = relGraph(s, { max: 99, withOut: true }), k = norm(name);
    const edges = g.edges.filter(e => e.a === k || e.b === k), keep = new Set(edges.flatMap(e => [e.a, e.b]));
    return { nodes: g.nodes.filter(n => keep.has(n.id)), edges, axes: g.axes };
}
