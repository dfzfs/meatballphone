// ✍ 애인이 몰래 손대기 — meddle을 넓힌다 (새 키 없음)
//   meddle: 이름 | 소지품 | 물건 | 한마디   → 내 소지품에 🎁 (from · note · secret)
//   meddle: 이름 | 돈 | +30 | 한마디        → 돈이 늘거나 줆 (한 번에 ±지금 돈의 20% 또는 식사 한 끼 값 중 큰 쪽까지)
//   meddle: 이름 | 달력 | 5/14 | 글         → 그날 칸에 ✍ 메모
//   meddle: 이름 | 되돌림 | 칸 | 물건·날짜   → 「되돌리기」 버튼이 손 고침으로 적는 반대 사건
// 기록은 S.sneak(사건으로만 · fold가 다시 계산) · 「열어 봄」은 채팅 메타(meta.sneakSeen · meta.sneakFound)
import { norm, short, safeKey, parseDelta, hash, dateOf, DAY } from '../base/util.js';
import { parts } from './tags.js';

const KIND = [
    ['item', /^(소지품|가방|물건|선물|item|items|bag|inventory|gift)$/],
    ['cash', /^(돈|지갑|용돈|money|cash|wallet)$/],
    ['cal', /^(달력|일정|메모|calendar|cal|note)$/],
    ['undo', /^(되돌림|되돌리기|undo)$/],
];
const kindOfSlot = (b, book) => {
    const n = norm(b);
    if (!n) return null;
    if (book?.world?.currency && n === norm(book.world.currency)) return 'cash';
    return KIND.find(([, re]) => re.test(n))?.[0] ?? null;
};
const MD = /(\d{1,2})\s*[월/.\-]\s*(\d{1,2})/;
export const sneakLimit = (book, S) => Math.max(Math.round(Math.abs(S.cash) * 0.2), Math.round(book?.world?.meal ?? 0), 1);

// 엔진에서: 다룬 줄이면 true (기분 · 낙서 같은 옛 모양은 false → 원래 코드로)
export function applySneak(book, S, x, v, i, ch) {
    const [a = '', b = '', c = '', d = ''] = parts(v);
    const kind = kindOfSlot(b, book);
    if (!kind) return false;
    const who = x.who(a) ?? safeKey(a);
    if (!who) return true;
    S.sneak ??= [];
    const add = (e) => { e.key = hash(`${e.kind}|${who}|${e.what}|${S.t}|${S.sneak.length}`); S.sneak.push({ ...e, who, t: S.t, undone: false }); if (S.sneak.length > 60) S.sneak.splice(0, S.sneak.length - 60); };
    if (kind === 'item') {
        const name = short(safeKey(c), 24);
        if (!name) return true;
        x.addItem(name, 1, `✍ ${who}`, 'meddle', i);
        const it = x.findItem(name);
        if (it) Object.assign(it, { from: who, note: short(d, 60), secret: true });
        add({ kind, what: it?.name ?? name, note: short(d, 60) });
        return true;
    }
    if (kind === 'cash') {
        const dd = parseDelta(c);
        if (!dd) return true;
        const lim = sneakLimit(book, S);
        let n = Math.max(-lim, Math.min(lim, dd.n));
        if (n < 0) n = Math.max(n, -S.cash); // 빚은 만들지 않는다
        n = Math.round(n);
        if (!n) return true;
        x.setCash(n, `✍ ${who}${d ? ` · ${short(d, 16)}` : ''}${n !== Math.round(dd.n) ? ' · 한도로 자름' : ''}`, 'meddle', true, i);
        add({ kind, what: `${n > 0 ? '+' : ''}${n}`, n, note: short(d, 60) });
        return true;
    }
    if (kind === 'cal') {
        const m = MD.exec(c);
        if (!m) return true;
        const md = `${Number(m[1])}/${Number(m[2])}`, text = short(d || '메모', 60);
        ch.push({ f: 'sneak.cal', label: '달력 메모', icon: '📅', from: '', to: md, why: `✍ ${who} · ${short(text, 16)}`, src: 'meddle', sure: true, i });
        add({ kind, what: md, md, note: text });
        return true;
    }
    // 되돌림: 그 인물이 그 칸에 남긴 것 중 아직 안 되돌린 마지막 것
    const k2 = kindOfSlot(c, book);
    const md = MD.exec(d), want = k2 === 'cal' && md ? `${Number(md[1])}/${Number(md[2])}` : k2 === 'cash' ? String(parseDelta(d)?.n ?? '') : d;
    const e = [...S.sneak].reverse().find((q) => !q.undone && q.who === who && q.kind === k2 && norm(k2 === 'cash' ? String(q.n) : q.what) === norm(want));
    if (!e) return true;
    e.undone = true;
    if (e.kind === 'item') { const it = x.findItem(e.what); if (it) x.addItem(it.name, -1, `✍ ${who} 되돌림`, 'hand', i); }
    if (e.kind === 'cash') x.setCash(-Math.min(e.n, e.n > 0 ? S.cash : e.n), `✍ ${who} 되돌림`, 'hand', true, i);
    if (e.kind === 'cal') ch.push({ f: 'sneak.cal', label: '달력 메모', icon: '📅', from: e.md, to: '지움', why: `✍ ${who} 되돌림`, src: 'hand', sure: true, i });
    return true;
}
// 되돌리기 버튼이 적을 줄
export const undoLine = (e) => `meddle: ${e.who} | 되돌림 | ${{ item: '소지품', cash: '돈', cal: '달력' }[e.kind]} | ${e.what}`;
export const liveSneaks = (S, kinds) => (S?.sneak ?? []).filter((e) => !e.undone && (!kinds || kinds.includes(e.kind)));
// 📅 그날 칸의 몰래 메모 (feat/calendar의 meta.cal.notes가 합쳐지기 전 자리)
export const sneakOnDay = (S, m, d) => liveSneaks(S, ['cal']).filter((e) => e.md === `${m}/${d}`).map((e) => ({ icon: '✍', text: `${e.who}: ${e.note}` }));

// ───── 열어 봄 · 배지 · 알아채기 ─────
const APP_KINDS = { bag: ['item', 'cash'], cal: ['cal'] };
export const unseen = (meta, S, app) => { const seen = new Set(meta?.sneakSeen ?? []); return liveSneaks(S, APP_KINDS[app]).filter((e) => !seen.has(e.key)); };
// 앱을 열면: 처음 본 것은 「본 것」 + 다음 답 1번에 알아채기 → 저장이 필요하면 true
export function markSneakSeen(meta, S, app, aiNo) {
    if (!APP_KINDS[app] || !meta) return false;
    const L = unseen(meta, S, app);
    if (!L.length) return false;
    meta.sneakSeen = [...(meta.sneakSeen ?? []), ...L.map((e) => e.key)].slice(-200);
    meta.sneakFound = [...(meta.sneakFound ?? []).filter((f) => f.at >= aiNo - 1), ...L.map((e) => ({ key: e.key, at: aiNo }))].slice(-30);
    return true;
}
export function sneakBadges(meta, S, b) {
    if (unseen(meta, S, 'bag').length) b.bag = '!';
    if (!b.cal && unseen(meta, S, 'cal').length) b.cal = '!';
}
// 본편: 처음 열어 본 뒤 첫 답 1번에만 한 줄 (그 답을 리롤해도 같은 답 번호라 그대로)
export function foundLines(meta, S, aiNo, user, currency = '') {
    const out = [];
    for (const f of meta?.sneakFound ?? []) {
        if (f.at !== aiNo) continue;
        const e = liveSneaks(S).find((q) => q.key === f.key);
        if (!e) continue;
        if (e.kind === 'item') out.push(`${user} just found the ${e.what} that ${e.who} secretly left in their bag${e.note ? ` (note: ${e.note})` : ''}.`);
        if (e.kind === 'cash') out.push(`${user} just noticed ${e.who} secretly ${e.n > 0 ? `slipped ${e.n} ${currency} into` : `took ${-e.n} ${currency} from`} their wallet${e.note ? ` (${e.note})` : ''}.`);
        if (e.kind === 'cal') out.push(`${user} just found the note ${e.who} secretly wrote on their calendar for ${e.md}: "${e.note}".`);
    }
    return out.slice(0, 3);
}
// 8번째 답 힌트의 예시: 소지품 · 돈 · 달력을 돌려 가며
export function sneakExample(n, S, book) {
    const k = Math.floor((S.turn ?? 0) / 8) % 3;
    if (k === 0) return `meddle: ${n} | 소지품 | 손편지 | 몰래 넣어 둠`;
    if (k === 1) return `meddle: ${n} | 돈 | +${sneakLimit(book, S)} | 맛있는 거 사 먹어`;
    const dt = dateOf(book.world.start, S.t + DAY * 3);
    return `meddle: ${n} | 달력 | ${dt.m}/${dt.d} | 이날 같이 가자`;
}
