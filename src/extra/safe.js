// 💾 백업 · 불러오기 · 카드에 붙이기 · 옛 미트볼 옮겨 오기
import { ctx, getMeta, saveMeta, slot, syncSwipe, MODULE, OLD, DATA_V, TITLE } from '../base/st.js';
import { normBook, emptyBook } from '../rules/book.js';
import { toast } from '../ui/kit.js';

// 옛 미트볼(폴더 이름 · manifest 이름)이 같이 켜져 있으면 라이트는 쉰다
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
                saveMeta(); ctx().saveChatDebounced?.(); toast('불러왔어요', 'good');
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
// 옛 미트볼 채팅: 프로필 · 세계관 요약 → 설정집, 답마다 변화(bySwipe) → 새 칸
export function migrateOld() {
    const md = ctx().chatMetadata, old = md?.[OLD]; if (!old) return 0;
    const meta = getMeta(true);
    if (!meta.book) {
        const b = emptyBook(), base = old.base ?? {}, data = base.data ?? {};
        b.world.genre = String(base.core?.genre ?? base.core?.world ?? '').slice(0, 30);
        const prof = data.profile?.people ?? data.profile?.list ?? data.profile?.npcs ?? [];
        const rel = data.rel?.user ?? data.rel?.people ?? [];
        for (const p of [...(Array.isArray(prof) ? prof : []), ...(Array.isArray(rel) ? rel : [])]) if (p?.name && !b.people.some(x => x.name === p.name)) b.people.push({ name: p.name, line: p.summary ?? p.desc ?? p.personality ?? '', face: p.face ?? '🙂', start: { aff: p.aff ?? 10, trust: p.trust ?? 10 } });
        for (const pl of data.map?.places ?? []) if (pl?.name) b.world.places.push({ name: pl.name, kind: /집|home/i.test(pl.name) ? 'home' : 'other' });
        if (data.wallet?.currencies?.[0]?.name) b.world.currency = data.wallet.currencies[0].name;
        b.src.from = 'old';
        meta.book = normBook(b);
    }
    let n = 0;
    for (const m of ctx().chat ?? []) {
        const by = m.extra?.[OLD]?.bySwipe; if (!by || m.is_user) continue;
        const ops = by[m.swipe_id ?? 0]; if (!Array.isArray(ops)) continue;
        const sl = slot(m, true); if (sl.ops) continue;
        sl.ops = ops.filter(x => Array.isArray(x)).map(([k, v]) => [String(k), String(v)]); sl.rev = (sl.rev ?? 0) + 1; syncSwipe(m); n++;
    }
    saveMeta(); ctx().saveChatDebounced?.();
    console.info(`[${TITLE}] 옛 미트볼에서 ${n}개 옮김`);
    return n;
}
