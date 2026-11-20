// 💾 바꾸고 바로 새로고침: 평소 고친 것은 바로 저장 넘김 · 나갈 때(pagehide) 밀린 저장을 바로
import { open, sleep, check } from './lib.mjs';
const { page, close, logs } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { await window.__addUser('안녕'); await window.__addAI('…\n<meatball>\nloc: 시장\n</meatball>'); });
    await sleep(3200); // 답 받은 직후의 1초 기다림이 끝나게
    // 1) 평소 고친 것: 300ms 안에 실리태번 저장으로 넘어감
    const quick = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js');
        window.__saves = []; st.getMeta().marks.push({ t: 1 }); st.saveMeta();
        await new Promise(r => setTimeout(r, 300));
        return window.__saves.map(s => s.fn);
    });
    check(quick.includes('saveChat'), '평소 고친 것은 300ms 안에 저장으로 넘김', JSON.stringify(quick));
    // 2) 고치자마자 나감(pagehide): 기다리지 않고 바로 저장
    const out = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js');
        window.__saves = []; st.getMeta().marks.push({ t: 2 }); st.saveMeta();
        dispatchEvent(new Event('pagehide'));
        return window.__saves.map(s => s.fn);
    });
    check(out.includes('saveChat'), '나갈 때 밀린 채팅 저장을 바로 함', JSON.stringify(out));
    // 3) 답을 받는 중이면 나가도 겹쳐 저장하지 않음
    const gen = await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'), E = SillyTavern.getContext().event_types;
        await SillyTavern.getContext().eventSource.emit(E.GENERATION_STARTED, 'normal', {}, false);
        window.__saves = []; st.saveMeta(); dispatchEvent(new Event('pagehide'));
        const r = window.__saves.map(s => s.fn); st.genEnded(); return r;
    });
    check(!gen.length, '답을 받는 중엔 나가도 저장 안 겹침', JSON.stringify(gen));
    check(!logs.some(l => /pageerror/.test(l)), '페이지 오류 없음', logs.join('\n'));
} finally { await close(); }
