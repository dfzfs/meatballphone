// 📋 전체 복사: 비밀 값 0개 · 최근 N개만 · 파일 · 이야기 글 빼기 · 선택지가 없어도 / 있어도 · 버튼 세 곳
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    // 비밀 값을 일부러 심어 둠
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); const s = st.settings();
        s.apiKey = 'sk-SECRETSECRET1234567890'; s.proxyUrl = 'https://secret.example.com/v1'; s.password = 'hunter2'; s.authToken = 'tok-abc';
        st.getMeta().book.world.places[0].note = '메모 https://private.example.org/x 여기';
    });
    for (let k = 0; k < 15; k++) { await page.evaluate((k) => window.__addUser(`말 ${k}`), k); await page.evaluate((k) => window.__addAI(`이야기 글 ${k}\n<meatball>\ncash: +1\n</meatball>`), k); }
    await sleep(300);
    await page.evaluate(() => console.warn('[미트볼 라이트] 시험용 경고 하나'));
    const r = await page.evaluate(async () => {
        const R = await import('/ext/src/extra/report.js');
        const a = R.buildReport({ n: 5 }),
            b = R.buildReport({ n: 3, noText: true });
        return { a: a.text, msgs: a.data.messages.length, b: b.text, bmsg: b.data.messages.map((m) => 'text' in m), choices: a.data.choices };
    });
    check(!/SECRETSECRET|secret\.example|hunter2|tok-abc|private\.example/.test(r.a) && /\(숨김\)/.test(r.a), '복사본에 비밀 값 0개 (키 · 주소 · 비밀번호 · 토큰)');
    check(r.msgs === 10 && /#2\d user/.test(r.a) && !/#1 user/.test(r.a), '최근 N개만 (5쌍 = 10개)', String(r.msgs));
    check(r.bmsg.every(x => !x) && !/이야기 글 1[0-4]/.test(r.b) && /사건: tag: cash/.test(r.b), '「이야기 글 빼고」면 사건 · 칩만');
    check(r.choices === '없음' && /선택지 없음|## 선택지\n없음/.test(r.a), '선택지가 없어도 오류 없음 (「없음」)');
    check(/시험용 경고 하나/.test(r.a) && /## 🩺 자가 진단/.test(r.a) && /## 마지막 본편 주입/.test(r.a) && /===== 원본 JSON =====/.test(r.a), '로그 · 자가 진단 · 본편 주입 · 원본 JSON');
    // 파일로 받기
    const f = await page.evaluate(async () => {
        let got = null;
        const o = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            got = { name: this.download, href: this.href };
        };
        const R = await import('/ext/src/extra/report.js');
        R.saveReport({ n: 2 });
        HTMLAnchorElement.prototype.click = o;
        return got;
    });
    check(/^meatball-lite-report-\d{8}-\d{4}\.txt$/.test(f?.name ?? '') && /^blob:/.test(f?.href ?? ''), '파일이 만들어짐', JSON.stringify(f));
    // 선택지가 있으면 dump
    await page.evaluate(() => { globalThis.MeatballChoices = Object.freeze({ version: '0.6.0', dump: () => ({ settings: { on: true, apiKey: 'sk-SHOULDHIDE123456789' }, recent: [] }) }); });
    const c = await page.evaluate(async () => (await import('/ext/src/extra/report.js')).buildReport({ n: 1 }));
    check(c.data.versions.choices === '0.6.0' && c.data.choices?.settings?.on === true && !/SHOULDHIDE/.test(c.text), '선택지 dump도 담고 비밀은 가림');
    // 버튼 세 곳: 설정 · 자가 진단 · 전체화면 위쪽
    const b = await page.evaluate(async () => {
        const set = !!document.querySelector('[data-ml="report"]');
        __ML__.app.openSheet('home');
        await new Promise((r) => setTimeout(r, 200));
        const top = !!document.querySelector('#ml-full .ml-top [data-act="report"]');
        document.querySelector('[data-ml="doctor"]').click();
        await new Promise((r) => setTimeout(r, 300));
        const doc = !![...document.querySelectorAll('.ml-bs')].pop()?.querySelector('[data-act="report"]');
        return { set, top, doc };
    });
    check(b.set && b.top && b.doc, '「📋 전체 복사」 버튼: 설정 · 자가 진단 · 전체화면 위쪽', JSON.stringify(b));
    await page.evaluate(() => [...document.querySelectorAll('.ml-bs')].pop().querySelector('[data-act="report"]').click()); await sleep(300);
    check(await page.evaluate(() => !!document.querySelector('.ml-rp-n') && !!document.querySelector('[data-rp="copy"]') && !!document.querySelector('[data-rp="file"]')), '고르는 시트: 메시지 수 · 복사 · 파일');
    const errs = logs.filter(l => !/시험용 경고/.test(l));
    check(!errs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', errs.join('\n'));
} finally { await close(); }
