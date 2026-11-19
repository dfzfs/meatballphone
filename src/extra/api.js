// 🔌 다른 미트볼 확장(미트볼 선택지 등)이 읽는 통로 — 읽기만. 바꾸는 건 늘 본편 답의 사건 태그로.
import { getMeta, ready, VERSION } from '../base/st.js';
import { norm, signed, slotName } from '../base/util.js';
import { fold, priceMul, derived } from '../rules/engine.js';
import { placeOf } from '../rules/book.js';

// 선택지 글 → 대가 미리 보기 { text: '−3골드 · 허기 +20', ok: false면 흐리게, tags }
export function preview(label) {
    const r = ready() ? fold() : null; if (!r) return null;
    const { S, book } = r, t = norm(label), out = [], tags = [];
    let ok = true;
    const needName = (k) => book.me.needs.find(n => n.key === k)?.name ?? k;
    const here = placeOf(book, S.loc);
    for (const g of here?.goods ?? []) if (t.includes(norm(g.name))) {
        const price = Math.round(g.price * priceMul(S)); out.push(`−${price}${book.world.currency}`);
        for (const [k, v] of Object.entries(g.fx)) out.push(`${needName(k)} ${signed(v)}`);
        if (S.cash < price) { ok = false; out.push('돈 부족'); }
        if (Object.values(S.rel).some(x => x.seen.likes.some(l => norm(g.name).includes(norm(l))))) tags.push('🎁');
        break;
    }
    for (const pl of book.world.places) if (pl.name !== S.loc && t.includes(norm(pl.name))) {
        const who = book.people.filter(p => p.routine.some(x => x.place === pl.name && slotName(S.t).includes(x.at.slice(0, 1))) || p.haunt.includes(pl.name)).map(p => p.face);
        out.push(`📍${pl.name}${who.length ? ` ${who.join('')}` : ''}`); break;
    }
    if (/잠|자자|잔다|sleep/.test(label)) out.push(`${needName('energy')} +`);
    if (/먹|식사|eat/.test(label) && !out.length) out.push(`${needName('hunger')} +`);
    if (/씻|샤워|목욕/.test(label)) out.push(`${needName('hygiene')} +`);
    if (/(선물|gift)/.test(label)) tags.push('🎁');
    return out.length || tags.length ? { text: [...tags, ...out].join(' · '), ok } : null;
}
export function mount() {
    globalThis.MeatballLite = Object.freeze({
        version: VERSION,
        ready: () => ready(),
        // 지금 상태 요약 (복사본)
        state: () => { const r = ready() ? fold() : null; if (!r) return null; return structuredClone({ t: r.S.t, loc: r.S.loc, with: r.S.with, cash: r.S.cash, needs: r.S.needs, status: r.S.status, danger: derived(r.book, r.S), currency: r.book.world.currency }); },
        preview,
        paused: () => !!getMeta()?.paused,
    });
}
export function announce() { document.dispatchEvent(new CustomEvent('meatlite:update')); }
