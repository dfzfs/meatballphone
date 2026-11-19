// 🧩 기타 앱: 등록 자리(MeatballPhoneApps) · 홈 아이콘 · 앱 화면 · 오류 막기 · 🛍 마켓 「기타 앱」 탭 · 목록 설치
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 420, height: 860 });
try {
    // 바깥 주소는 막고(목록은 확장 안 apps.json으로), 설치 요청은 가짜로 받기
    let installed = null;
    await page.route('https://raw.githubusercontent.com/**', r => r.abort());
    await page.route('**/api/extensions/install', async r => { installed = JSON.parse(r.request().postData() || '{}'); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"display_name":"x"}' }); });
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    // 폰보다 먼저 온 앱(줄 서 있던 것) + 폰이 켜진 뒤 온 앱
    await page.evaluate(async () => {
        const A = await import('/ext/src/extra/apps.js');
        globalThis.MeatballPhoneApps = [{ id: 'early', name: '먼저', icon: '🐣', desc: '먼저 줄 선 앱', render(el) { el.innerHTML = '<b class="t-early">먼저 왔어요</b>'; } }];
        A.mountApps();
        (globalThis.MeatballPhoneApps ??= []).push({ id: 'contacts', name: '연락', icon: '📞', color: '#34c759', version: '0.1.0', desc: '문자 · 전화',
            render(el, phone) { window.__renders = (window.__renders ?? 0) + 1; el.innerHTML = `<input class="t-in"><button class="t-close">닫기</button>`; el.querySelector('.t-close').onclick = () => phone.close(); } });
        globalThis.MeatballPhoneApps.push({ id: 'broken', name: '고장', icon: '💥', render() { throw new Error('boom'); } });
        globalThis.MeatballPhoneApps.push({ id: 'Bad ID!', name: 'x', render() {} });
        globalThis.MeatballPhoneApps.push({ id: 'norender', name: 'x' });
    });
    check(await page.evaluate(() => typeof globalThis.MeatballPhone.addApp === 'function'), '통로에 addApp 있음');
    const ppl = await page.evaluate(() => globalThis.MeatballPhone.people());
    check(Array.isArray(ppl) && ppl.length > 0 && ppl.every(p => p.name && p.face && typeof p.star === 'boolean' && typeof p.aff === 'number'), '통로 people(): 인물 · 얼굴 · ⭐ · 애정', JSON.stringify(ppl[0]));
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(300);
    const icons = await page.evaluate(() => [...document.querySelectorAll('.ml-app')].map(a => a.dataset.app));
    check(icons.includes('x:early') && icons.includes('x:contacts') && icons.includes('x:broken'), '홈에 기타 앱 아이콘 (먼저 온 앱 · 나중 온 앱)', icons.join(','));
    check(!icons.some(x => /bad|norender/i.test(x)), '잘못된 앱(이름 · render 없음)은 안 받음');
    // 앱 열기 → 앱이 그린 화면, 바뀜 알림이 와도 다시 안 그림
    await page.evaluate(() => document.querySelector('.ml-app[data-app="x:contacts"]').click()); await sleep(250);
    check(await page.evaluate(() => !!document.querySelector('.ml-ext .t-in') && /연락/.test(document.querySelector('.ml-top').textContent)), '앱 화면: 제목 · 앱이 그린 내용');
    await page.evaluate(() => { document.querySelector('.t-in').value = '안녕'; }); await page.evaluate(() => __ML__.app.refresh?.()); await sleep(300);
    check(await page.evaluate(() => document.querySelector('.t-in')?.value === '안녕' && window.__renders === 1), '폰이 바뀌어도 앱 화면은 그대로 (쓰던 글 안 날아감)');
    await page.evaluate(() => document.querySelector('.t-close').click()); await sleep(150);
    check(await page.evaluate(() => !document.getElementById('ml-full')), 'phone.close()로 폰 닫기');
    // 고장 난 앱 → 폰은 멀쩡
    await page.evaluate(() => __ML__.app.openSheet('x:broken')); await sleep(200);
    check(await page.evaluate(() => /오류가 났어요/.test(document.querySelector('.ml-ext')?.textContent ?? '')), '앱 오류는 앱 칸 안에서만 (안내 글)');
    // 🛍 마켓 → 기타 앱 탭
    await page.evaluate(() => __ML__.app.openSheet('market')); await sleep(200);
    check(await page.evaluate(() => document.querySelectorAll('.ml-mkt-tabs button').length === 2), '마켓에 탭 두 개 (기본 앱 · 기타 앱)');
    await page.evaluate(() => document.querySelector('.ml-mkt-tabs button[data-v="ext"]').click()); await sleep(800);
    const ext = await page.evaluate(() => ({ mine: [...document.querySelectorAll('[data-act="x-home"]')].map(b => b.dataset.v), get: [...document.querySelectorAll('[data-act="x-install"]')].map(b => b.dataset.v) }));
    check(ext.mine.includes('contacts') && ext.mine.includes('early'), '기타 앱 탭: 깔린 앱 목록', JSON.stringify(ext));
    check(ext.get.includes('choices'), '받을 수 있는 앱: 목록(apps.json)에서 · 선택지', JSON.stringify(ext));
    // 홈에서 숨기기
    await page.evaluate(() => document.querySelector('[data-act="x-home"][data-v="early"]').click()); await sleep(200);
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('.ml-app[data-app="x:early"]') && !!document.querySelector('.ml-app[data-app="x:contacts"]')), '🙈 홈에서 숨기기');
    // 설치
    await page.evaluate(() => __ML__.app.openSheet('market')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="x-install"][data-v="choices"]').click()); await sleep(500);
    check(installed?.url === 'https://github.com/dfzfs/meatballphone-choices' && installed.global === false, '설치: 실리태번 확장 설치에 저장소 주소 보냄', JSON.stringify(installed));
    check(await page.evaluate(() => !!document.querySelector('[data-act="x-reload"]')), '설치 뒤 「새로 고침」 버튼');
    // 실패: 실리태번의 영어 오류문 대신 쉬운 한국어
    await page.unroute('**/api/extensions/install');
    for (const [status, body] of [[500, 'Internal Server Error. Check the server logs for more details.'], [403, 'Forbidden: No permission to install global extensions.'], [400, 'Bad Request: A valid URL is required in the request body.']]) {
        await page.route('**/api/extensions/install', r => r.fulfill({ status, contentType: 'text/plain', body }));
        const msg = await page.evaluate(async () => { const A = await import('/ext/src/extra/apps.js'); try { await A.installApp('choices'); return 'ok'; } catch (e) { return e.message; } });
        check(/[가-힣]/.test(msg) && !/[A-Za-z]{4,}/.test(msg), `설치 실패 ${status}: 쉬운 한국어`, msg);
        await page.unroute('**/api/extensions/install');
    }
    check(!logs.some((l) => /error/i.test(l) && !/boom|ERR_FAILED|net::|status of (500|403|400)|앱 설치 실패/.test(l)), '오류 없음', logs.filter((l) => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
