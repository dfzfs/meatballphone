// 😌 「다음 1번」을 감은 뒤 지금 마지막 답을 🔄 다시 분류 · 스와이프하면 그 답에도 감김 (새 답이 오면 그 답까지만)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(() => window.__addUser('가자')); await page.evaluate(() => window.__addAI('…')); await sleep(300);
    const r = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.getMeta().mods.music = true; st.setEyes('music', 'once');
        const last = SillyTavern.getContext().chat.length - 1, cur = st.aiNoOf(last);
        const a = { curShut: st.shut('music', cur), nextShut: st.shut('music', cur + 1) };
        SillyTavern.getContext().chat.push({ name: 'Me', is_user: true, mes: 'x', extra: {} }, { name: 'Leon', is_user: false, mes: 'y', extra: {} });
        a.afterNew_old = st.shut('music', cur); a.afterNew_new = st.shut('music', cur + 1);
        return a;
    });
    check(r.curShut && r.nextShut, '감은 직후: 지금 답(다시 분류 · 스와이프)과 다음 답 모두 감김', JSON.stringify(r));
    check(!r.afterNew_old && r.afterNew_new, '새 답이 오면: 그 새 답만 감기고 옛 답은 풀림', JSON.stringify(r));
    check(!logs.some((l) => /error/i.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
