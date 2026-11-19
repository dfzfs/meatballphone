// 🗑 이 채팅 기록 전부 지우기: 메타 · 메시지 칸 모두 없음 · 대화 글은 그대로 · 첫 화면으로
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('시장에 왔다.\n<meatball>\nloc: 시장\n</meatball>')); await sleep(400);
    await page.evaluate(() => { window.__autoPopup = 'ok'; document.querySelector('[data-ml="wipe"]').click(); }); await sleep(600);
    const r = await page.evaluate(async () => { const c = SillyTavern.getContext(); return { meta: !!c.chatMetadata.meatlite, extra: c.chat.some(m => m.extra?.meatlite || (m.swipe_info ?? []).some(s => s?.extra?.meatlite)), text: c.chat.at(-1).mes, first: /설정집 만들기/.test(document.getElementById('ml-hud')?.textContent ?? '') }; });
    check(!r.meta && !r.extra, '메타 · 메시지 칸에 미트볼폰 기록 0', JSON.stringify(r));
    check(r.text.includes('시장에 왔다') && !/<meatball>/.test(r.text), '대화 글은 그대로 (태그 흔적 없음)');
    check(r.first, '처음 화면(📘 설정집 만들기)으로');
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
