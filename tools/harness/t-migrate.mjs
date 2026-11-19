// 🧳 옛 미트볼(dev) 채팅 옮기기: 시작값(base + 그 앞 손 고침) · 판타지 달력 · 인물끼리 · 그 뒤 답의 변화 · 뒤쪽 손 고침
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => {
        const S = SillyTavern.getContext();
        S.chat.push({ is_user: true, mes: '안녕', send_date: 'd0' }, { is_user: false, mes: '첫 답', send_date: 'd1', swipe_id: 0, extra: { statussim: { bySwipe: { 0: [['cash', '+999']] } } } },
            { is_user: true, mes: '시장', send_date: 'd2' }, { is_user: false, mes: '둘째 답', send_date: 'd3', swipe_id: 0, extra: { statussim: { bySwipe: { 0: [['cash', '-20'], ['가방', '+사과'], ['인물호감', 'Leon | Mia | +5 | 화해']] } } } },
            { is_user: true, mes: '다음', send_date: 'd4' }, { is_user: false, mes: '셋째 답', send_date: 'd5', swipe_id: 0, extra: { statussim: { bySwipe: { 0: [['loc', '광장']] } } } });
        S.chatMetadata.statussim = { startAt: 2, startKey: 'd1', base: { core: { genre: '판타지' }, data: {
            stats: { bars: [{ name: '체력', cur: 70, max: 100 }, { name: '마나', cur: 30, max: 50 }], attrs: [{ name: '힘', val: 3 }, { name: '매력', val: -1 }], conds: [{ name: '감기' }] },
            wallet: { currency: '골드', cash: 100, items: [{ name: '포션', qty: 2 }] },
            rel: { user: [{ name: 'Leon', aff: 40, trust: 20 }, { name: 'Mia', aff: -10, trust: 5 }], pairs: [{ a: 'Leon', b: 'Mia', label: '라이벌', aff: -30, memo: '오랜 앙숙' }] },
            map: { here: '여관', places: [{ name: '여관' }, { name: '광장' }] },
            calendar: { y: 1024, m: 2, d: 15, time: '14:00', era: '왕국력', months: [{ name: '서리달', days: 30 }, { name: '불꽃달', days: 28 }, { name: '바람달', days: 31 }], week: ['해', '달', '불', '물', '나무'] } } },
            adjust: [{ at: 1, t: 1, set: { mod: 'wallet', data: { currency: '골드', cash: 150, items: [{ name: '포션', qty: 2 }] } } }, { at: 6, t: 2, set: { mod: 'wallet', data: { cash: 500, items: [] } } }] };
        window.__renderAll?.();
    });
    await sleep(200);
    await page.evaluate(() => document.querySelector('[data-ml="migrate"]').click()); await sleep(400);
    const r = await page.evaluate(() => {
        const { S } = __ML__.fold();
        const m = __ML__.getMeta();
        return {
            cash: S.cash,
            items: S.items.map((i) => `${i.name}${i.n}`),
            loc: S.loc,
            leon: S.rel.Leon?.aff,
            mia: S.rel.Mia?.aff,
            pair: S.pairs['Leon|Mia'],
            st: S.status.map((s) => s.name),
            attrs: S.attrs,
            cal: m.book.world.start,
            gauges: m.book.me.gauges.map((g) => g.name),
            g: S.gauges,
            mig: m.migrated,
        };
    });
    check(r.mig?.start === 2 && r.mig?.ops === 2, '시작 지점 #2 · 답 2개만 (앞 답 +999는 빠짐)', JSON.stringify(r.mig));
    check(r.cash === 500, '돈: 앞 손 고침 150 → -20 → 뒤 손 고침 500', String(r.cash));
    check(r.items.includes('포션2') && r.items.includes('사과1'), '소지품', r.items.join(','));
    check(r.loc === '광장', '장소', r.loc);
    check(r.leon === 40 && r.mia === 0, '관계 시작값 (음수는 0)', `${r.leon}/${r.mia}`);
    check(r.pair?.v === -25 && r.pair?.label === '라이벌', '인물끼리 시작값 + 이어진 변화', JSON.stringify(r.pair));
    check(r.st.includes('감기'), '상태 딱지', r.st.join(','));
    check(r.attrs['힘'] === 3 && r.attrs['매력'] === -1, '능력치', JSON.stringify(r.attrs));
    check(r.cal.cal?.months?.length === 3 && r.cal.cal.era === '왕국력' && r.cal.m === 2 && r.cal.d === 15 && r.cal.clock === 840, '달력 · 날짜 · 시각', JSON.stringify(r.cal));
    check(r.gauges.includes('마나'), '모르는 막대 → 게이지', r.gauges.join(','));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
