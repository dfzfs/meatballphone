// 📸 v0.26 확인용: 홈 · 수치 · 지도 · 관계 — PC · 휴대폰
import { open, sleep } from './lib.mjs';
for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'ph']]) {
    const { page, close } = await open({ width: w, height: h });
    try {
        await page.evaluate(() => document.querySelector('[data-ml="create-tpl"]').click()); await sleep(300);
        await page.evaluate(() => { const m = __ML__.getMeta(); m.book.me.traitIds = ['romantic', 'glutton', 'brave']; m.book.people[0].traits = ['romantic']; m.book.people[0].want = '동맹의 무사 항해'; __ML__.app.refresh(true); });
        await page.evaluate(() => window.__addUser('시장 가자'));
        await page.evaluate(() => window.__addAI('…\n<meatball>\nnpc: Mia | 꽃집 주인\nloc: 시장\nwith: Leon, Mia\nact: Leon | 칭찬\ngot: 꽃\nworked: 3h | +40\nstatus: 감기 | 1d\npair: Leon | Mia | 라이벌\n</meatball>'));
        await page.evaluate(() => window.__addAI('…\n<meatball>\nbuy: 빵\ntime: +2h\nmind: Leon | 또 늦네\n</meatball>')); await sleep(400);
        for (const a of ['home', 'now', 'map', 'rel']) { await page.evaluate((a) => __ML__.app.openSheet(a), a); await sleep(300); await page.screenshot({ path: `/tmp/v26-${a}-${tag}.png` }); }
    } finally { await close(); }
}
