// 🧱 버티기: AI가 터무니없는 값을 적어도 멈추거나 계산이 끊기지 않는다 (큰 날짜 · 객체에 원래 있는 이름 · 깨진 기록)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate(() => window.__addUser('hi'));
    const ai = (body) => Promise.race([sleep(8000).then(() => 'HANG'), page.evaluate((b) => window.__addAI(`t.\n<meatball>\n${b}\n</meatball>`), body).then(() => 'ok')]);
    check(await ai('date: +999999999999999999999\ndate: -999999999999\ndate: +1e30') === 'ok', '터무니없이 큰 날짜 이동에도 화면이 안 멈춤');
    await sleep(200);
    check(await page.evaluate(() => { const c = window.__SS_TEST__.api.app.current.state.data.calendar; return Number.isFinite(c.y) && c.m >= 1 && c.m <= c.months.length && c.d >= 1 && c.d <= c.months[c.m - 1].days; }), '날짜가 달력 안에 있음');
    check(await page.evaluate(async () => {
        const { addDays, dayIndex } = await import('/ext/src/util.js'); const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((d, i) => ({ name: `${i + 1}월`, days: d }));
        for (const k of [1, -1, 59, 365, 366, -365, 800, -800, 12345, -12345]) { const cal = { months, y: 10, m: 3, d: 31 }; const b = dayIndex(cal); addDays(cal, k); if (dayIndex(cal) - b !== k || cal.d > months[cal.m - 1].days) return false; }
        return true;
    }), '날짜 더하기 · 빼기가 하루도 안 어긋남');
    await page.evaluate(() => window.__addUser('go'));
    check(await ai('msg: constructor | hi\nmsg: __proto__ | hi\nmsg: toString | hi\ncash: +7\naff: constructor +1\nitem: +__proto__\nnpc: hasOwnProperty | x') === 'ok', '객체에 원래 있는 이름(constructor · __proto__ …)');
    await sleep(300);
    const cash = await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash);
    await page.evaluate(() => window.__addUser('go')); await ai('cash: +5'); await sleep(300);
    check(await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash) === cash + 5, '그 뒤 답도 계속 계산됨 (한 줄이 잘못돼도 그 줄만 건너뜀)');
    check(await page.evaluate(() => Object.keys({}).length === 0 && !('hi' in Object.prototype)), 'Object.prototype이 더럽혀지지 않음');
    check(await page.evaluate(async () => (await import('/ext/src/core.js')).normalize('dice', { log: [null, 'x', 5, { cls: 'ok', res: '1', label: 'a', detail: '' }] }).log.length) === 1, '깨진 주사위 기록은 걸러 냄');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError|RangeError/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
