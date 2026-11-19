// 켜짐 → 바로 시작 → 사건 태그 한 턴 → 숫자 · 칩 · 주입 · 전체화면 탭 전부 · 오류 없음
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart());
    await sleep(300);
    await page.evaluate(() => window.__addUser('빵집 가자'));
    await page.evaluate(() => window.__addAI('Leon이 웃었다.\n<meatball>\nloc: 시장\nbuy: 빵 | 3\nate: 빵\nact: Leon | 칭찬\ngift: Leon | 꽃\ntime: +3h\nstatus: 감기 | 1d\nbuy: 금괴 | 9999\nmind: Leon | 귀엽네\n</meatball>'));
    await sleep(400);
    const r = await page.evaluate(() => {
        const r = __ML__.fold();
        const m = window.__st.chat.at(-1);
        return {
            cash: r.S.cash,
            loc: r.S.loc,
            hunger: r.S.needs.hunger,
            aff: r.S.rel.Leon?.aff,
            st: r.S.status.map((s) => s.name),
            flags: r.flags.at(-1).length,
            mes: m.mes,
            chips: document.querySelectorAll('.ml-msg .ml-chip').length,
            inj: Object.keys(window.__prompts).filter((k) => window.__prompts[k].value).length,
            hud: !!document.getElementById('ml-hud'),
            mini: !!document.getElementById('ml-mini'),
        };
    });
    console.log(JSON.stringify(r));
    check(r.cash === 47, '돈: 50 − 빵 3 = 47 (금괴는 막힘)');
    check(r.flags === 1, '돈 부족 → 확인 필요 1개');
    check(r.loc === '시장', '장소');
    check(r.aff > 10, '애정 오름');
    check(r.st.includes('감기'), '상태 딱지');
    check(!r.mes.includes('<meatball>'), '본문에서 태그 떼어 냄');
    check(r.chips > 0 && r.hud && r.mini, '칩 · HUD · 미니바');
    check(r.inj >= 2, '주입 (규칙 + 사실)');
    // 스와이프 되돌리기: 줄 하나 되돌리기
    const tabs = await page.evaluate(async () => {
        const { APPS } = await import('/ext/src/ui/home.js');
        const out = [];
        for (const a of APPS) {
            __ML__.app.openSheet(a.id);
            await new Promise((r) => setTimeout(r, 30));
            const b = document.querySelector('.ml-body');
            out.push(`${a.id}:${b?.dataset.tab === a.id || b?.dataset.tab === 'home' ? b.textContent.length : 'X'}`);
        }
        return out;
    });
    console.log(tabs.join(' '));
    check(tabs.every(t => !t.endsWith(':X') && !t.endsWith(':0')), '앱 전부 열림');
    await page.screenshot({ path: '/tmp/ml-now.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(100);
    await page.screenshot({ path: '/tmp/ml-now-phone.png' });
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n') + await page.evaluate(() => window.__errors.join('\n')));
} finally { await close(); }
