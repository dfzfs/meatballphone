// 확장 설정의 단추를 하나씩 눌러 본다 — 눌렀을 때 오류(없는 파일 불러오기 등)가 나지 않는가 (v2.8 · 예전엔 모양만 봐서 단추 2개가 깨진 채 나갔음)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page);
    await page.evaluate(async () => { await window.__addUser('u'); await window.__addAI('Leon.\n<meatball>\ncash: -5\n</meatball>'); });
    const acts = await page.evaluate(() => [...new Set([...document.querySelectorAll('#ss-settings [data-s-act]')].map(b => b.dataset.sAct))]);
    check(acts.length > 20 && acts.includes('partsreset') && acts.includes('trprune'), `settings has ${acts.length} action buttons`);
    const bad = [];
    for (const a of acts) {
        const before = logs.length;
        await page.evaluate((a) => document.querySelector(`#ss-settings [data-s-act="${a}"]`)?.click(), a);
        await sleep(450);
        const fresh = logs.slice(before).filter(l => /pageerror|dynamically imported module/.test(l) && !/scripts\/extensions\/translate/.test(l)); // 시험대엔 실리 번역 확장이 없음
        if (fresh.length) bad.push(`${a}: ${fresh[0].slice(0, 160)}`);
        await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close?.()));
    }
    check(!bad.length, 'every settings button runs without an error', bad.join(' | '));
} finally { await close(); }
