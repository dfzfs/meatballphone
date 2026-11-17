// ◀ 뒤로 가기로 창 닫기 (v2.9): 미트볼 창 위의 작은 창(메뉴 → 추가 지시 입력)은 방문 기록을 건드리지 않는다
//   (메뉴가 닫히며 history.back 하는 동안 입력 창이 떠서 실리태번에서 창이 꺼지던 것) · 뒤로 가기는 맨 위 창부터 닫는다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact']);
    const st = () => page.evaluate(() => ({ open: [...document.querySelectorAll('dialog[open]')].length, input: !!document.querySelector('dialog[open] textarea.popup-input'), len: history.length, id: history.state?.ssDlg ?? null }));
    await page.evaluate(() => { window.__autoPopup = null; window.__SS_TEST__.api.app.openSheet('contact'); }); await sleep(600);
    const s0 = await st();
    check(s0.open === 1 && s0.id !== null, '상태창을 열면 방문 기록에 한 칸', JSON.stringify(s0));
    await page.evaluate(() => document.querySelector('dialog [data-act="cmenu"]')?.click()); await sleep(400);
    const s1 = await st();
    check(s1.open === 2 && s1.len === s0.len && s1.id === s0.id, '메뉴(작은 창)는 칸을 올리지 않음', JSON.stringify(s1));
    await page.evaluate(() => [...document.querySelectorAll('dialog [data-m="prompt"]')].at(-1)?.click()); await sleep(600);
    const s2 = await st();
    check(s2.open === 2 && s2.input && s2.len === s0.len && s2.id === s0.id, '메뉴 → 추가 지시: 상태창은 그대로 · 입력 창이 뜸 · 기록은 안 건드림', JSON.stringify(s2));
    await page.locator('textarea.popup-input').fill('반말로 짧게'); await sleep(200);
    check((await st()).open === 2, '입력해도 창이 안 꺼짐');
    await page.evaluate(() => history.back()); await sleep(500);
    const s3 = await st();
    check(s3.open === 1 && !s3.input, '뒤로 가기 한 번 = 맨 위 입력 창만 닫힘', JSON.stringify(s3));
    await page.evaluate(() => history.back()); await sleep(500);
    check((await st()).open === 0, '뒤로 가기 한 번 더 = 상태창 닫힘');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
