// 💾 백업 · 불러오기 · 카드에 붙이기 · 옛 미트볼 옮겨 오기
import { ctx, getMeta, saveMeta, msgData, syncSwipe, MODULE, OLD, DATA_V, TITLE, saveChatSoon } from '../base/st.js';
import { normBook, emptyBook } from '../rules/book.js';
import { clockOf } from '../base/util.js';
import { toast } from '../ui/kit.js';

// 옛 미트볼(폴더 이름 · manifest 이름)이 같이 켜져 있으면 미트볼폰은 쉰다
export function oldActive() {
    const loaded = [...document.querySelectorAll('script[src], link[href]')].some(e => /third-party\/(meatballstats|meatball-stats)\//i.test(e.src || e.href));
    return loaded && ctx().extensionSettings?.[OLD]?.enabled !== false;
}
export function backup() {
    const meta = getMeta(); if (!meta) return;
    const msgs = (ctx().chat ?? []).map((m, i) => (m.extra?.[MODULE] ? [i, m.extra[MODULE]] : null)).filter(Boolean);
    const blob = new Blob([JSON.stringify({ app: MODULE, v: DATA_V, meta, msgs })], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `meatlite-${Date.now()}.json` }); a.click();
}
export function restore() {
    return new Promise((res) => {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
        inp.onchange = async () => {
            try {
                const j = JSON.parse(await inp.files[0].text()); if (j.app !== MODULE) throw new Error('다른 파일');
                ctx().chatMetadata[MODULE] = j.meta;
                const chat = ctx().chat ?? []; for (const [i, x] of j.msgs ?? []) if (chat[i]) { chat[i].extra ??= {}; chat[i].extra[MODULE] = x; syncSwipe(chat[i]); }
                saveMeta(); saveChatSoon(); toast('불러왔어요', 'good');
            } catch (e) { toast(`못 불러왔어요: ${e.message}`, 'bad'); }
            res();
        };
        inp.click();
    });
}
// 카드에 설정집을 넣어 두면 그 카드로 연 새 채팅이 AI 없이 바로 시작
export async function toCard() {
    const meta = getMeta(), c = ctx(); if (!meta?.book || c.characterId == null) return;
    await c.writeExtensionField?.(c.characterId, MODULE, { book: meta.book, start: meta.start });
    toast('카드에 붙였어요', 'good');
}
export function fromCard() {
    const c = ctx(); if (getMeta()?.book) return;
    const x = c.characters?.[c.characterId]?.data?.extensions?.[MODULE]; if (!x?.book) return;
    const meta = getMeta(true); meta.book = normBook(x.book); meta.start = x.start ?? null; saveMeta();
}
// 옛 미트볼(dev) 채팅 옮기기 — 시작 지점 상태(base + 그 앞 편집)를 그대로 시작값으로, 그 뒤 답마다 변화(bySwipe)를 새 칸으로.
// 돌려주는 값: 무엇을 얼마나 옮겼는지 (설정 화면 보고용)
const GREG = (ms) => !ms?.length || (ms.length === 12 && ms.every((m, k) => new RegExp(`^${k + 1}\\s*월$`).test(String(m?.name ?? m))));
const nm = (t) => String(t ?? '').replace(/\s+/g, '').toLowerCase();
export function devSnapshot(old, chat) {
    let st = Math.min(old.startAt ?? 0, chat.length);
    if (old.startKey && chat[st - 1]?.send_date !== old.startKey) { const j = chat.findIndex(m => m.send_date === old.startKey); if (j >= 0) st = j + 1; }
    const data = structuredClone(old.base?.data ?? {}), later = [];
    for (const a of [...(old.adjust ?? [])].sort((x, y) => (x.at - y.at) || (x.t - y.t))) {
        if (!a?.set?.mod || !a.set.data || a._off) continue;
        if ((a.at ?? 0) <= st) data[a.set.mod] = structuredClone(a.set.data); else later.push(a);
    }
    return { startAt: st, data, core: old.base?.core ?? {}, later };
}
export function migrateOld() {
    const md = ctx().chatMetadata, old = md?.[OLD]; if (!old) return null;
    const chat = ctx().chat ?? [], meta = getMeta(true), rep = { ops: 0, start: 0, people: 0, items: 0, later: 0, skipped: 0 };
    const snap = devSnapshot(old, chat), D = snap.data;
    // 📘 설정집 (이미 있으면 그대로 두고 빈 칸만)
    const b = meta.book ? structuredClone(meta.book) : emptyBook();
    if (!meta.book) {
        b.world.genre = String(snap.core.genre ?? snap.core.world ?? '').slice(0, 30);
        b.src.from = 'old';
    }
    const prof = D.profile?.list ?? D.profile?.people ?? [];
    for (const p of [...(Array.isArray(prof) ? prof : []), ...(D.rel?.user ?? [])])
        if (p?.name && !b.people.some((x) => nm(x.name) === nm(p.name))) {
            b.people.push({
                name: p.name,
                line: p.summary ?? p.desc ?? p.personality ?? p.memo ?? '',
                face: p.face ?? '🙂',
                noLove: !!p.noLove,
                start: { aff: 10, trust: 10 },
            });
            rep.people++;
        }
    for (const pl of D.map?.places ?? []) if (pl?.name && !b.world.places.some(x => nm(x.name) === nm(pl.name))) b.world.places.push({ name: pl.name, kind: /집|home/i.test(pl.name) ? 'home' : 'other', note: pl.desc ?? '' });
    const W = D.wallet; if (W?.currency) b.world.currency = W.currency; else if (W?.currencies?.[0]?.name) b.world.currency = W.currencies[0].name;
    // 수치 막대 → 욕구(이름이 같으면) · 아니면 게이지로
    const needVal = {}, gaugeVal = {};
    for (const bar of D.stats?.bars ?? []) {
        if (!bar?.name) continue; const v = Number(bar.cur ?? bar.v ?? 0), mx = Number(bar.max ?? 100) || 100;
        const nd = b.me.needs.find(n => nm(n.name) === nm(bar.name) || nm(n.key) === nm(bar.name));
        if (nd) { needVal[nd.key] = Math.round(v / mx * 100); continue; }
        let g = b.me.gauges.find(x => nm(x.name) === nm(bar.name));
        if (!g && b.me.gauges.length < 6) { g = { key: bar.name, name: String(bar.name).slice(0, 8), max: mx, start: v }; b.me.gauges.push(g); }
        if (g) gaugeVal[g.key ?? g.name] = v;
    }
    const attrs = (D.stats?.attrs ?? []).filter(a => a?.name).slice(0, 6);
    if (attrs.length) b.me.attrs = attrs.map(a => ({ name: String(a.name).slice(0, 6), v: Math.max(-5, Math.min(10, Math.round(Number(a.val ?? a.v ?? 0)))) }));
    // 📅 달력: 날짜 · 시각 · (양력이 아니면) 달 이름 · 요일 · 연호
    const C = D.calendar;
    if (C) {
        const custom = !GREG(C.months);
        b.world.start = { ...b.world.start, y: Number(C.y) || b.world.start.y, m: Number(C.m) || 1, d: Number(C.d) || 1, clock: clockOf(C.time) ?? b.world.start.clock,
            cal: { months: custom ? C.months.map(m => ({ name: String(m?.name ?? m), days: Number(m?.days ?? 30) })) : null, week: Array.isArray(C.week) && C.week.join('') !== '일월화수목금토' ? C.week : null, era: C.era ?? '', style: /^\d/.test(String(C.time ?? '')) ? '24' : '' } };
        if (C.weather && !b.world.weather.includes(C.weather)) b.world.weather = [C.weather, ...b.world.weather];
    }
    meta.book = normBook(b);
    // ▶ 시작값 (이 답부터 이어서)
    const rel = {}; for (const r of D.rel?.user ?? []) if (r?.name && !r.out) rel[meta.book.people.find(p => nm(p.name) === nm(r.name))?.name ?? r.name] = { aff: Math.max(0, Math.min(100, Math.round(Number(r.aff ?? 0)))), trust: Math.max(0, Math.min(100, Math.round(Number(r.trust ?? 0)))) };
    const items = (W?.items ?? []).filter(it => it?.name).map(it => ({ name: it.name, n: Math.max(1, Number(it.qty ?? it.n ?? 1)), worn: !!it.worn })); rep.items = items.length;
    meta.start = { name: '옛 미트볼', cash: Number(W?.cash ?? 0), items, loc: D.map?.here ?? '', needs: needVal, gauges: gaugeVal, rel, weather: C?.weather ?? '',
        status: (D.stats?.conds ?? []).filter(c => c?.name).map(c => ({ name: String(c.name).slice(0, 12), note: c.desc ?? '' })),
        pairs: Object.fromEntries((D.rel?.pairs ?? []).filter(p => p?.a && p?.b).map(p => [[p.a, p.b].sort().join('|'), { v: Math.max(-100, Math.min(100, Math.round(Number(p.aff ?? 0)))), label: String(p.label ?? '').slice(0, 16), why: String(p.memo ?? '').slice(0, 30) }])) };
    meta.startAt = snap.startAt; rep.start = snap.startAt;
    // 💬 답마다 변화 → 새 칸 (시작 지점 뒤만 · 이미 옮긴 답은 건너뜀)
    for (let i = snap.startAt; i < chat.length; i++) {
        const m = chat[i]; const by = m.extra?.[OLD]?.bySwipe; if (!by || m.is_user) continue;
        const ops = by[m.swipe_id ?? 0]; if (!Array.isArray(ops)) continue;
        const sl = msgData(m, true); if (sl.ops) continue;
        sl.ops = ops.filter(x => Array.isArray(x)).map(([k, v]) => [String(k), String(v)]); sl.rev = (sl.rev ?? 0) + 1; syncSwipe(m); rep.ops++;
    }
    // ✏️ 시작 지점 뒤에 손으로 고친 것: 돈 · 수치 · 장소는 그 답의 손 고침으로, 나머지는 건너뜀(보고)
    for (const a of snap.later) {
        const m = chat[Math.min(chat.length, a.at) - 1]; if (!m) { rep.skipped++; continue; }
        const hand = [], d = a.set.data;
        if (a.set.mod === 'wallet' && d.cash != null) hand.push({ k: 'cash', v: String(Math.round(Number(d.cash))), why: '옛 미트볼 손 고침' });
        else if (a.set.mod === 'stats') for (const bar of d.bars ?? []) { const nd = meta.book.me.needs.find(n => nm(n.name) === nm(bar.name)); if (nd) hand.push({ k: nd.name, v: String(Math.round(Number(bar.cur) / (Number(bar.max) || 100) * 100)), why: '옛 미트볼 손 고침' }); }
        else if (a.set.mod === 'map' && d.here) hand.push({ k: 'loc', v: d.here, why: '옛 미트볼 손 고침' });
        if (!hand.length) { rep.skipped++; continue; }
        const sl = msgData(m, true); sl.hand = [...(sl.hand ?? []), ...hand]; sl.rev = (sl.rev ?? 0) + 1; syncSwipe(m); rep.later++;
    }
    meta.migrated = { at: Date.now(), ...rep };
    saveMeta(); saveChatSoon();
    console.info(`[${TITLE}] 옛 미트볼 옮김`, rep);
    return rep;
}
