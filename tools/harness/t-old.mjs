// 🧹 정리 뒤 옛 채팅: 지운 태그 줄(지운 앱들의 키)이 남아 있어도 오류 없이 건너뜀 · 옛 데이터 한 번 정리
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    // v0.25 모양의 채팅 데이터를 그대로 넣는다 (지운 칸 · 지운 특성 · 불러온 상태)
    await page.evaluate(() => {
        const C = SillyTavern.getContext(), old = ['ex', 'change'].join(''), wish = ['as', 'pire'].join(''), hag = ['hag', 'gle'].join('');
        C.chatMetadata.meatlite = { app: 'lite3', v: 2, mods: {}, marks: [], custom: [], recent: { quote: [], music: [] },
            book: { world: { genre: '판타지', currency: '골드', meal: 10, weather: ['맑음'], start: { y: 2026, m: 3, d: 1, clock: 480 }, places: [{ name: '시장', kind: 'shop', goods: [{ name: '빵', price: 4 }] }], coins: [{ name: '은화', rate: 0.1 }] },
                me: { name: '', traitIds: ['neat', 'erratic'], [wish]: 'luxury', needs: [], gauges: [], attrs: [] }, people: [{ name: 'Leon', traits: ['geek'], [wish]: 'rockstar' }] },
            saves: [{ name: 'x' }], autoSave: { why: 'y' }, mapStyle: { pos: { 시장: { x: 1, y: 2 } } },
            start: { full: { cash: 77, items: [{ name: '사과', n: 2 }], loc: '시장', rel: { Leon: { aff: 40, trust: 20 } } }, name: '옛 저장' }, startAt: 0 };
        C.chat.push({ is_user: true, mes: '시작', send_date: 'a' },
            { is_user: false, mes: `…\n<meatball>\ncash: +4 은화\n${old}: 은화 | +10\n${hag}: 시장 | -20 | 깎음\n${wish}: +1 | 승진\nbuy: 빵\n</meatball>`, send_date: 'b', swipe_id: 0, swipes: ['…'] });
        window.__renderAll?.();
    });
    await sleep(200);
    await page.evaluate(() => SillyTavern.getContext().eventSource.emit('chat_id_changed')); await sleep(300);
    const r = await page.evaluate(() => {
        const R = __ML__.fold(),
            m = __ML__.getMeta();
        return {
            cash: R.S.cash,
            items: R.S.items.map((i) => i.name + i.n),
            loc: R.S.loc,
            leon: R.S.rel.Leon?.aff,
            keys: Object.keys(m),
            book: JSON.stringify(m.book),
            me: m.book.me.traitIds, ptr: m.book.people.map(p => p.traits).filter(Boolean).length, mods: Object.keys(m.mods ?? {}),
            flags: Object.values(R.flags ?? {}).flat().length,
        };
    });
    check(!r.keys.includes('saves') && !r.keys.includes('autoSave') && !r.keys.includes('mapStyle'), '옛 칸 데이터 정리', r.keys.join(','));
    check(!/coins|은화|luxury|rockstar/.test(r.book), '설정집에서 지운 칸 정리', r.book.slice(0, 200));
    check(r.me === undefined && r.ptr === 0 && !r.mods.includes('traits'), '특성(v0.30에서 지움): 옛 채팅의 특성 데이터는 정리됨', JSON.stringify([r.me, r.ptr, r.mods]));
    check(r.cash === 77 + 4 - 4 && r.items.includes('사과2') && r.leon === 40, '불러온 상태는 보통 시작값으로 이어짐 · 은화는 기본 화폐로 합쳐짐', JSON.stringify(r));
    check(r.flags === 0, '지운 태그 줄은 조용히 건너뜀 (확인 필요 없음)');
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
