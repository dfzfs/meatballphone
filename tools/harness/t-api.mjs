// 선택지 확장이 쓰는 통로: state(attrs · date) · diceParts · preview(이름 먼저 · 배지 글) · 캐시 · 테마 CSS 변수 · 채팅이 바뀌면 다시 계산
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…\n<meatball>\nloc: 시장\nstatus: 감기 | 1d\n</meatball>')); await sleep(300);
    const r = await page.evaluate(() => { const M = globalThis.MeatballLite; const s = M.state(); return { attrs: s.attrs, date: s.date, parts: M.diceParts('힘'), p: M.preview('빵 하나 주세요') }; });
    console.log(JSON.stringify(r));
    check(r.attrs && '힘' in r.attrs && /월 .*일/.test(r.date), 'state: attrs · 날짜 글');
    check(r.parts.some(x => x.why === '감기'), 'diceParts: 상태 딱지 보정');
    check(/−3/.test(r.p?.text ?? ''), 'preview: 가게 값');
    await page.evaluate(() => { __ML__.getMeta().book.people[0].aka = ['레온']; __ML__.app.refresh(true); }); await page.evaluate(() => window.__addAI('…\n<meatball>\ngot: 사과\n</meatball>')); await sleep(300);
    const p = await page.evaluate(() => {
        const M = globalThis.MeatballLite;
        return {
            item: M.preview('사과를 꺼내 Leon에게 건넨다'),
            who: M.preview('레온에게 말을 건다'),
            place: M.preview('목욕탕으로 간다'),
            guess: M.preview('잠깐 눈을 붙인다'),
            none: M.preview('하늘을 본다'),
            keys: Object.keys(M.state()),
            api: Object.keys(M).sort().join(','),
        };
    });
    console.log(JSON.stringify(p));
    check(/Leon/.test(p.item?.text ?? '') && /🙂|🛡|Leon/.test(p.who?.text ?? ''), 'preview: 인물 이름 · 다른 이름으로 먼저 맞춤', JSON.stringify([p.item, p.who]));
    check(/📍목욕탕/.test(p.place?.text ?? '') && /\+/.test(p.guess?.text ?? '') && p.none === null, 'preview: 장소 · 낱말 짐작은 마지막 · 아무것도 없으면 null');
    check(p.api === 'diceParts,luck,mode,paused,pendingChoice,preview,ready,scene,state,version', '통로 이름 그대로', p.api);
    check(!p.keys.some(k => /coin|hag|asp/.test(k)), 'state에 지운 값 없음', p.keys.join(','));
    const sc = await page.evaluate(() => { __ML__.getMeta().book.people[0].want = '동맹의 무사 항해'; __ML__.app.refresh(true); return globalThis.MeatballLite.scene(); });
    check(sc && sc.goods.some(g => g.name === '빵' && g.price === 3) && Array.isArray(sc.people), 'scene: 지금 장소 물건 · 값', JSON.stringify(sc));
    await page.evaluate(() => window.__addAI('…\n<meatball>\nwith: Leon\n</meatball>')); await sleep(300);
    const sc2 = await page.evaluate(() => globalThis.MeatballLite.scene());
    check(sc2.people.some(p => p.name === 'Leon' && p.want === '동맹의 무사 항해'), 'scene: 장면 속 인물 · 원하는 것', JSON.stringify(sc2.people));
    const css = await page.evaluate(() => { const g = getComputedStyle(document.documentElement); return ['--ml-accent', '--ml-font', '--ml-size', '--ml-radius', '--ml-border', '--ml-shadow'].map(k => g.getPropertyValue(k).trim()); });
    check(css.every(Boolean), '테마 CSS 변수 6개 열림', JSON.stringify(css));
    const t = await page.evaluate(() => { const M = globalThis.MeatballLite; const a = performance.now(); for (let i = 0; i < 12; i++) M.preview(`선택지 ${i}`); return performance.now() - a; });
    check(t < 30, `preview 12번 ${t.toFixed(1)}ms (캐시)`);
    await page.evaluate(() => window.__addAI('…\n<meatball>\ncash: +10\n</meatball>')); await sleep(300);
    check(await page.evaluate(() => globalThis.MeatballLite.state().cash) === 60, '새 답이 오면 다시 계산');
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
