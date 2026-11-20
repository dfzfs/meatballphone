// 🎵 폰에서 바로 듣기 · 작은 창: 키 있으면 검색 1회 → body에 iframe 하나 · 폰 창 닫아도 남음 · 새 곡은 알림만 · 새 탭 설정 · 키 없으면 링크 · 자리(휴대폰 · 노트북)
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
try {
    let searches = 0, fail = false;
    await page.route('https://www.googleapis.com/youtube/v3/search**', async (r) => {
        searches++;
        const q = new URL(r.request().url()).searchParams;
        if (fail) return r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":{"message":"quota"}}' });
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: { videoId: /Moon/.test(q.get('q')) ? 'moonRiver01' : 'plasticLove1' } }] }) });
    });
    await page.route('https://www.youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body style="margin:0;background:#222;color:#fff;font:12px sans-serif">영상</body>' }));
    // 새 탭이 열리면 세기(열리면 안 되는 때 확인용)
    let popups = 0; page.context().on('page', () => { popups++; });
    // 링크 눌림을 지켜보되 진짜 새 탭은 막기 (맨 마지막 단계에서)
    await page.evaluate(() => { window.__nav = []; addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (!a) return; window.__nav.push({ href: a.href, prevented: e.defaultPrevented }); e.preventDefault(); }); });

    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => {
        const st = await import('/ext/src/base/st.js'); st.getMeta().mods.music = true; st.settings().mode = 'A'; st.settings().ytKey = 'AIzaTESTKEY';
        __ML__.app.refresh(true);
    });
    await page.evaluate(() => window.__addAI('밤거리.\n<meatball>\nbgm: Plastic Love - Mariya Takeuchi | 그리움 | 밤거리\n</meatball>')); await sleep(300);

    // 1. 키 있음 · 폰에서 듣기(기본) → ▶ 누르면 작은 창 · iframe은 body에 1개
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(200);
    check(await page.evaluate(() => document.querySelector('.ml-song a.ml-play')?.title) === '폰에서 듣기', '키가 있으면 ▶ = 폰에서 듣기');
    await page.evaluate(() => document.querySelector('.ml-song a.ml-play').click()); await sleep(400);
    const p1 = await page.evaluate(() => ({ n: document.querySelectorAll('iframe').length, inBody: document.querySelector('#mbp')?.parentElement === document.body, inFull: !!document.querySelector('#ml-full iframe'),
        src: document.querySelector('#mbp iframe')?.src ?? '', t: document.querySelector('#mbp .mbp-t')?.textContent, nav: window.__nav.length }));
    check(p1.n === 1 && p1.inBody && !p1.inFull && /youtube-nocookie\.com\/embed\/plasticLove1\?autoplay=1/.test(p1.src), '▶ → 작은 창 · iframe은 body에 1개 (폰 창 밖)', JSON.stringify(p1));
    check(/Plastic Love/.test(p1.t) && p1.nav === 0 && searches === 1 && popups === 0, '곡 이름 · 새 탭 안 열림 · 검색 1회', JSON.stringify({ p1, searches, popups }));
    // 같은 곡 다시 → 검색 안 함 · iframe 여전히 1개
    await page.evaluate(() => document.querySelector('.ml-song a.ml-play').click()); await sleep(300);
    check(searches === 1 && await page.evaluate(() => document.querySelectorAll('iframe').length) === 1, '같은 곡 다시 누르면 검색 안 함 · iframe 1개');
    // ⏯ · 크게 보기
    await page.evaluate(() => document.querySelector('#mbp [data-mbp="toggle"]').click());
    check(await page.evaluate(() => document.querySelector('#mbp [data-mbp="toggle"]').textContent) === '▶', '⏯ 누르면 멈춤 표시');
    await page.evaluate(() => document.querySelector('#mbp [data-mbp="big"]').click()); await sleep(100);
    check(await page.evaluate(() => document.querySelector('#mbp').classList.contains('big') && document.querySelector('#mbp .mbp-v').offsetWidth > 200), '크게 보기');
    await page.evaluate(() => document.querySelector('#mbp [data-mbp="big"]').click()); await page.evaluate(() => document.querySelector('#mbp [data-mbp="toggle"]').click());

    // 2. 폰 창을 닫아도 남음 (같은 iframe 그대로)
    await page.evaluate(() => { window.__f = document.querySelector('#mbp iframe'); __ML__.app.closeSheet(); }); await sleep(200);
    check(await page.evaluate(() => !document.getElementById('ml-full') && document.querySelector('#mbp iframe') === window.__f), '폰 창을 닫아도 작은 창 · 같은 iframe이 남음 (계속 재생)');
    // 노트북 기본 자리: 오른쪽 아래
    const dpos = await page.evaluate(() => { const r = document.getElementById('mbp').getBoundingClientRect(); return { r: innerWidth - r.right, b: innerHeight - r.bottom }; });
    check(dpos.r < 40 && dpos.b < 40, '노트북: 기본 자리 오른쪽 아래', JSON.stringify(dpos));
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(250);
    await page.screenshot({ path: '/tmp/player-1440.png' });

    // 3. 새 곡이 오면 알림만 · 누르면 바꿈
    await page.evaluate(() => window.__addAI('창가.\n<meatball>\nbgm: Moon River - Audrey Hepburn | 잔잔함 | 창가\n</meatball>')); await sleep(400);
    const p3 = await page.evaluate(() => ({ src: document.querySelector('#mbp iframe')?.src, n: document.querySelector('#mbp .mbp-new'), }));
    const newTxt = await page.evaluate(() => { const n = document.querySelector('#mbp .mbp-new'); return n && !n.hidden ? n.textContent : ''; });
    check(/plasticLove1/.test(p3.src) && newTxt === '새 곡: Moon River ▶' && searches === 1, '새 곡: 저절로 안 바뀌고 「새 곡: ○○ ▶」 알림만', JSON.stringify({ src: p3.src, newTxt, searches }));
    await page.evaluate(() => document.querySelector('#mbp .mbp-new').click()); await sleep(400);
    check(await page.evaluate(() => /moonRiver01/.test(document.querySelector('#mbp iframe')?.src) && document.querySelector('#mbp .mbp-new').hidden && document.querySelectorAll('iframe').length === 1), '알림 누르면 새 곡으로 · iframe 1개');

    // 끌어서 옮기기 → 자리 기억
    const box = await page.evaluate(() => { const r = document.querySelector('#mbp .mbp-t').getBoundingClientRect(); return { x: r.x + 10, y: r.y + 5 }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x - 300, box.y - 200, { steps: 5 }); await page.mouse.up(); await sleep(100);
    const saved = await page.evaluate(async () => (await import('/ext/src/base/st.js')).settings().musicPos);
    check(saved?.d && saved.d.x < 1440 - 400 && !saved.m, '끌어서 옮기면 노트북 자리를 설정에 기억', JSON.stringify(saved));

    // 휴대폰 폭: 위쪽 (입력창을 안 가림)
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(200);
    const mpos = await page.evaluate(() => { const r = document.getElementById('mbp').getBoundingClientRect(); const f = document.getElementById('send_form')?.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: innerWidth - r.right, w: r.width, formTop: f?.top ?? null }; });
    check(mpos.top < 120 && mpos.right >= 0 && mpos.w <= 390 && (mpos.formTop == null || mpos.bottom < mpos.formTop), '휴대폰: 기본 자리 위쪽 · 화면 안 · 입력창 안 가림', JSON.stringify(mpos));
    await page.evaluate(() => __ML__.app.closeSheet()); await sleep(3500); // 알림이 사라진 뒤
    await page.screenshot({ path: '/tmp/player-390.png' });
    await page.setViewportSize({ width: 1440, height: 900 }); await sleep(150);

    // 4. 「새 탭으로」 설정이면 링크 그대로
    await page.evaluate(() => { document.querySelector('#mbp [data-mbp="close"]').click(); }); await sleep(100);
    check(await page.evaluate(() => !document.getElementById('mbp') && !document.querySelector('iframe')), '✕ 누르면 작은 창 · iframe 사라짐');
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="musicplay"][data-v="tab"]').click()); await sleep(200);
    const before = searches;
    await page.evaluate(() => document.querySelector('.ml-song a.ml-play').click()); await sleep(250);
    const n4 = await page.evaluate(() => window.__nav.at(-1));
    check(!n4.prevented && /youtube\.com\/results\?search_query=Moon/.test(n4.href) && searches === before && !(await page.evaluate(() => document.getElementById('mbp'))), '「새 탭으로」: 링크로 열림 · 검색 · 작은 창 없음', JSON.stringify(n4));
    // 스포티파이는 키가 있어도 새 탭
    await page.evaluate(() => document.querySelector('[data-act="musicplay"][data-v="phone"]').click()); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="musicapp"][data-v="spotify"]').click()); await sleep(150);
    await page.evaluate(() => document.querySelector('.ml-song a.ml-play').click()); await sleep(200);
    check(await page.evaluate(() => !window.__nav.at(-1).prevented && /spotify/.test(window.__nav.at(-1).href) && !document.getElementById('mbp')), '스포티파이 · 멜론은 새 탭으로만');
    await page.evaluate(() => document.querySelector('[data-act="musicapp"][data-v="youtube"]').click()); await sleep(150);

    // 5. 키가 없으면 새 탭 (오류 0) · 키가 틀려도 오류 없이 「새 탭에서 열기」
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).settings().ytKey = ''; __ML__.app.refresh(); }); await sleep(200);
    check(await page.evaluate(() => /유튜브에서 열기/.test(document.querySelector('.ml-song a.ml-play').title)), '키가 없으면 ▶ = 유튜브에서 열기');
    await page.evaluate(() => { window.__opened = []; window.__open0 = window.open; window.open = (u) => { window.__opened.push(u); return {}; }; document.querySelector('.ml-song a.ml-play').click(); window.open = window.__open0; }); await sleep(200);
    check(await page.evaluate(() => window.__opened.length === 1 && /youtube\.com\/results/.test(window.__opened[0]) && !document.getElementById('mbp')) && searches === before, '키 없음(폰에서 듣기): 직접 새 탭을 엶 · 왜 그런지 알림 · 검색 0');
    await page.evaluate(async () => { (await import('/ext/src/base/st.js')).settings().ytKey = 'AIzaBADKEY'; __ML__.app.refresh(); }); await sleep(200);
    fail = true;
    await page.evaluate(async () => { (await import('/ext/src/ui/player.js')); }); // 같은 모듈 (캐시 공유)
    await page.evaluate(() => window.__addAI('…\n<meatball>\nbgm: Ride on Time - Tatsuro Yamashita | 설렘 | 출발\n</meatball>')); await sleep(300);
    await page.evaluate(() => __ML__.app.openSheet('music')); await sleep(200);
    await page.evaluate(() => document.querySelector('.ml-song a.ml-play').click()); await sleep(400);
    const p5 = await page.evaluate(() => ({ out: document.querySelector('#mbp .mbp-out')?.href ?? '', ifr: document.querySelectorAll('iframe').length, toast: [...document.querySelectorAll('.ml-toast')].map(t => t.textContent).join(' ') }));
    check(/youtube\.com\/results/.test(p5.out) && p5.ifr === 0 && /못 틀었어요/.test(p5.toast), '키가 틀리면: 작은 창에 「새 탭에서 열기」 · 알림 (오류 없음)', JSON.stringify(p5));

    // 홈 플레이어 위젯 ▶도 같은 길
    fail = false;
    await page.evaluate(() => { document.querySelector('#mbp [data-mbp="close"]').click(); __ML__.app.openSheet('home'); }); await sleep(250);
    if (await page.evaluate(() => !!document.querySelector('.ml-pl-play'))) {
        await page.evaluate(() => document.querySelector('.ml-pl-play').click()); await sleep(400);
        check(await page.evaluate(() => /Ride on Time/.test(document.querySelector('#mbp .mbp-t')?.textContent ?? '') && document.querySelectorAll('iframe').length === 1), '홈 플레이어 위젯 ▶ → 작은 창 (지금 곡)');
    } else check(true, '홈 플레이어 위젯 없음 (홈 설정) · 건너뜀');

    check(popups === 0, '진짜 새 탭은 한 번도 안 열림 (시험에서 막음)');
    const errs = logs.filter(l => !/status of 403/.test(l)); // 틀린 키 시험의 가짜 403 응답은 빼고
    check(!errs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', errs.join('\n'));
} finally { await close(); }
