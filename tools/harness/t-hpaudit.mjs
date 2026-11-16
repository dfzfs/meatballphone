// 📒 미니홈피 검수 (v2.8): 모양 5가지 × 기기 5가지(PC · 아이폰 · 갤럭시 · 아이패드 · 갤럭시 탭)에서 — 화면이 안 넘치고, 손가락으로 메뉴 · 탭 · 꾸미기가 눌리고,
//   꾸미기 하나하나(포인트 색 · 밝기 · 글자/바탕/카드 색 · 글씨 크기 · 글꼴 · 모서리 · 여백 · 부분별 꾸밈 · 창 제목 · 메뉴 이름 · 내가 만든 창 · 프로필 내용 · 자유 배치)가 실제 화면 값으로 먹는지
import { chromium } from './pw.mjs';
import { serve } from './server.mjs';
import { makeStatus, sleep, check } from './lib.mjs';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DEVICES = [
    ['pc', { viewport: { width: 1280, height: 720 } }],
    ['iphone', { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, userAgent: IOS }],
    ['galaxy', { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, userAgent: AND }],
    ['ipad', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: IOS.replace('iPhone', 'iPad') }],
    ['galaxytab', { viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: AND.replace('Mobile ', '') }],
];
const only = process.env.DEV;
const srv = await serve(0); const port = srv.address().port;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
try {
    for (const [dev, opt] of DEVICES) {
        if (only && only !== dev) continue;
        const cx = await browser.newContext(opt); const page = await cx.newPage(); const logs = [];
        page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); }); page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e}`));
        await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction(() => window.__ready === true);
        await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact', 'news', 'dice', 'home']);
        const touch = !!opt.hasTouch, phone = opt.viewport.width <= 640, tap = (sel) => (touch ? page.tap(sel) : page.click(sel));
        // 전체화면 미니홈피 열기
        await page.evaluate(async () => {
            const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const hp = await import('/ext/src/hompy.js'); const wait = (ms) => new Promise(r => setTimeout(r, ms));
            await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\n</meatball>'); await wait(300);
            Object.assign(core.settings(), { hpSkin: 'clean' }); hp.applyRetro(); hp._decoMode(true);
            window.__autoPopup = null; shell.openSheet('home', { full: true }); await wait(400);
            const d = document.querySelector('dialog'); d.classList.add('ss-dlg', 'ss-full', 'ss-scope'); d.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
            window.__hp = { core, shell, hp, wait, S: core.settings(), el: () => [...shell.panels].find(p => p.isConnected && p.querySelector('.ss-hompy')), re: async () => { hp.applyRetro(); shell.rerenderPanels(true); await wait(160); } };
        });
        await sleep(300);
        for (const skin of ['clean', 'dot', 'phone']) {
            const tag = `${dev}/${skin}`;
            // ── 틀: 넘침 없음 · 메뉴와 탭이 화면 안 · 손가락으로 눌림
            const base = await page.evaluate(async (skin) => {
                const { S, re, el, hp } = window.__hp; for (const k of ['hpParts', 'hpTitles', 'hpGroupNames', 'hpUserWins', 'hpFree', 'hpProf', 'hpCounts']) delete S[k];
                Object.assign(S, { hpSkin: skin, hpDark: skin === 'term' ? 'dark' : 'light', hpTheme: 0, hpFont: 'g', hpCorner: 1, hpGap: 1, hpFsPx: 0, hpInk: '', hpBg: '', hpPaper: '', hpFreeOn: false, hpMotion: false }); await re();
                const root = el().querySelector('.ss-hompy'), vw = document.documentElement.clientWidth, vh = innerHeight, rect = (q) => root.querySelector(q)?.getBoundingClientRect();
                const nav = rect('.ss-groups'), over = [...root.querySelectorAll('.ss-hp-win, .ss-hp-url, .ss-hp-marks')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1); }).length;
                const btns = [...root.querySelectorAll('.ss-groups > button')].map(b => b.getBoundingClientRect());
                return { cls: root.classList.contains(`ss-hp-k-${skin}`) && document.body.classList.contains(`ss-skin-${skin}`), noHScroll: root.scrollWidth <= vw + 1 && document.documentElement.scrollWidth <= vw + 1, over, navIn: !!nav && nav.left >= -1 && nav.right <= vw + 1 && nav.bottom <= vh + 1,
                    tapSize: Math.min(...btns.map(b => Math.min(b.width, b.height))), navBottom: nav ? nav.top > vh * 0.6 : false, title: (rect('.ss-hp-addr b')?.right ?? 0) <= vw + 1, pet: !!root.querySelector('.ss-hp-pet'), emptyFace: !root.querySelector('.ss-hp-photo img'),
                    paper: getComputedStyle(root).getPropertyValue('--hp-paper').trim(), font: getComputedStyle(root).fontFamily.slice(0, 20) };
            }, skin);
            check(base.cls && base.noHScroll && base.over === 0, `${tag}: 모양 적용 · 가로 넘침 없음`, JSON.stringify(base));
            check(base.navIn && base.title, `${tag}: 메뉴 · 제목이 화면 안`, JSON.stringify(base));
            if (touch) check(base.tapSize >= 36, `${tag}: 메뉴 단추가 손가락 크기 (${Math.round(base.tapSize)}px)`);
            if (phone) check(base.navBottom, `${tag}: 폰은 메뉴가 아래 탭 줄`);
            check(base.pet && base.emptyFace, `${tag}: 프로필은 빈 칸 · 미트볼은 제목 옆`);
            // 손가락(또는 마우스)으로 메뉴 → 탭 → 홈으로
            await tap('.ss-hompy .ss-groups > button[data-arg="people"]'); await sleep(250);
            const g1 = await page.evaluate(() => { const r = window.__hp.el(); return { tab: r._ss.tab, cols: !!r.querySelector('.ss-hp-col') && getComputedStyle(r.querySelector('.ss-hp-col')).display !== 'none', body: r.querySelector('.ss-hp-right > .ss-body')?.getBoundingClientRect().top }; });
            check(g1.tab === 'rel', `${tag}: 메뉴를 누르면 묶음이 바뀜 (${g1.tab})`);
            if (phone) check(!g1.cols && g1.body < opt.viewport.height * 0.5, `${tag}: 폰에서 홈이 아니면 내용부터`, JSON.stringify(g1));
            await tap('.ss-hompy .ss-tabs > button[data-arg="contact"]'); await sleep(250);
            check(await page.evaluate(() => window.__hp.el()._ss.tab) === 'contact', `${tag}: 탭이 눌림`);
            await tap('.ss-hompy .ss-groups > button[data-arg="home"]'); await sleep(250);
            // 꾸미기 모드가 손가락으로 열리고 · 아래 판이 화면 안 · 눌러서 골라지고 · 완료로 닫힘 (아이폰 · 갤럭시의 홈 화면 편집처럼)
            await tap(phone ? '.ss-hompy .ss-hp-deco-m' : '.ss-hompy .ss-hp-marks [data-hp="deco"]'); await sleep(450);
            const dk = await page.evaluate(() => { const p = document.querySelector('.ss-hp-sheet'), bar = document.querySelector('.ss-hp-edbar'); if (!p || !bar) return null; const r = p.getBoundingClientRect(), b = bar.getBoundingClientRect(), tabs = [...p.querySelectorAll('.ss-hp-stabs button')].map(x => x.getBoundingClientRect());
                return { in: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top > b.bottom, h: r.height / innerHeight, tabs: tabs.length, tapH: Math.min(...tabs.map(x => x.height)), done: (() => { const d = bar.querySelector('[data-hp="eddone"]').getBoundingClientRect(); return d.right <= innerWidth + 1 && d.top >= 0; })() }; });
            check(!!dk && dk.in && dk.done && dk.tabs >= 7 && dk.h < 0.55, `${tag}: 꾸미기 모드가 열림 · 아래 판과 완료 단추가 화면 안`, JSON.stringify(dk));
            if (touch && dk) check(dk.tapH >= 30, `${tag}: 아래 판 단추가 손가락 크기 (${Math.round(dk.tapH)}px)`);
            if (dk) { await tap('.ss-hp-sheet [data-arg="tab:color"]'); await sleep(250); await tap('.ss-hp-sheet [data-arg="theme:2"]'); await sleep(350);
                check(await page.evaluate(() => window.__hp.S.hpTheme === 2 && document.body.style.getPropertyValue('--hp-h') === '215'), `${tag}: 아래 판에서 색을 누르면 바로 바뀜`);
                await tap('.ss-hp-edbar [data-hp="eddone"]'); await sleep(300);
                check(await page.evaluate(() => !document.querySelector('.ss-hp-sheet') && !window.__hp.hp._edit.on()), `${tag}: 완료를 누르면 닫힘`); }
            // ── 꾸미기 하나하나가 화면 값으로 먹는지
            const r = await page.evaluate(async (skin) => {
                const { S, re, el } = window.__hp, out = {}, root = () => el().querySelector('.ss-hompy'), cs = (q) => getComputedStyle(q ? root().querySelector(q) : root()), wide = innerWidth > 640;
                const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
                const accEl = '.ss-hp-today i', acc = () => cs().getPropertyValue('--hp-acc').trim();
                // 포인트 색
                S.hpTheme = 0; await re(); const a0 = acc(); S.hpTheme = 'c'; S.hpHue = 140; S.hpSat = 1; await re(); out.accent = (acc() !== a0 && root().style.getPropertyValue('--hp-h') === '140') || [a0, acc()].join('|');
                // 밝기
                S.hpDark = 'light'; await re(); const l1 = lum(cs().backgroundColor); S.hpDark = 'dark'; await re(); const l2 = lum(cs().backgroundColor), ink2 = lum(cs().color);
                out.dark = (skin === 'term' ? l2 < 0.2 : l1 > 0.6 && l2 < 0.3) && ink2 > 0.6 || [l1, l2, ink2].map(x => x.toFixed(2)).join('|'); S.hpDark = skin === 'term' ? 'dark' : 'light';
                // 글자 · 바탕 · 카드 색
                Object.assign(S, { hpInk: '#102030', hpBg: '#fff0f0', hpPaper: '#f0fff0' }); await re();
                out.colors = (cs().color === 'rgb(16, 32, 48)' && cs().backgroundColor === 'rgb(255, 240, 240)' && cs().getPropertyValue('--hp-paper').trim() === '#f0fff0') || [cs().color, cs().backgroundColor, cs().getPropertyValue('--hp-paper')].join('|');
                Object.assign(S, { hpInk: '', hpBg: '', hpPaper: '' });
                // 글씨 크기
                S.hpFsPx = 0; S.hpFs = 's'; await re(); const f1 = parseFloat(cs().fontSize); S.hpFs = 'l'; await re(); const f2 = parseFloat(cs().fontSize); S.hpFsPx = 21; await re(); const f3 = parseFloat(cs().fontSize);
                out.fontSize = (f2 > f1 && f3 > f2) || [f1, f2, f3].join('|'); S.hpFsPx = 0; S.hpFs = 'm';
                // 글꼴 (도트 모양은 도트 글꼴 고정)
                S.hpFont = 'g'; await re(); const ff1 = cs().fontFamily; S.hpFont = 's'; await re(); const ff2 = cs().fontFamily; out.font = (skin === 'dot' ? /MeatballDot/.test(ff2) : ff1 !== ff2 && /Serif|Myeongjo|Batang/i.test(ff2)) || [ff1.slice(0, 30), ff2.slice(0, 30)].join('|'); S.hpFont = 'g';
                // 모서리 · 여백
                const rad = () => (skin === 'term' ? getComputedStyle(document.body).getPropertyValue('--hp-c').trim() : getComputedStyle(document.body).getPropertyValue('--hp-r').trim());
                S.hpCorner = 0; await re(); const c0 = rad(); S.hpCorner = 2; await re(); const c2 = rad(); out.corner = (c0 !== c2 && parseFloat(c2) > parseFloat(c0)) || [c0, c2].join('|'); S.hpCorner = 1;
                const gap = () => parseFloat(getComputedStyle(root().querySelector('.ss-hp-book')).rowGap || getComputedStyle(root().querySelector('.ss-hp-book')).gap) || parseFloat(getComputedStyle(root().querySelector('.ss-hp-wb')).paddingBottom);
                S.hpGap = 0; await re(); const g0 = gap(); S.hpGap = 2; await re(); const g2 = gap(); out.gap = g2 > g0 || [g0, g2].join('|'); S.hpGap = 1;
                // 부분별 꾸밈 · 창 제목 · 메뉴 이름 · 내가 만든 창 · 프로필 내용
                Object.assign(S, { hpParts: { win: { bg: '#fafad2', r: 9, bw: 3, bd: '#123456' }, wt: { ink: '#0000ff', fs: 1.3 }, nav: { ink: '#008000' }, head: { bg: '#ffe4e1' }, card: { bg: '#e0ffff' }, btn: { bg: '#ffdab9' } },
                    hpTitles: { profile: '내 소개', stats: '컨디션' }, hpGroupNames: { people: '인연들' }, hpUserWins: [{ id: 'u1', type: 'note', title: '적어 둔 것', text: '우유 사기' }, { id: 'u2', type: 'stat', title: '체력 크게', stat: window.__SS_TEST__.api.app.current.state.data.stats.bars[0].name }], hpProf: { badges: false, mood: false }, hpCounts: { bars: 3 } }); await re();
                const w = root().querySelector('.ss-hp-win[data-win="profile"]'), wcs = getComputedStyle(w), wt = getComputedStyle(w.querySelector('.ss-hp-wt b'));
                out.partWin = (wcs.backgroundColor === 'rgb(250, 250, 210)' && wcs.borderTopLeftRadius === '9px' && wcs.borderTopWidth === '3px' && wcs.borderTopColor === 'rgb(18, 52, 86)') || [wcs.backgroundColor, wcs.borderTopLeftRadius, wcs.borderTopWidth, wcs.borderTopColor].join('|');
                out.partTitle = wt.color === 'rgb(0, 0, 255)' || wt.color;
                out.partHead = cs('.ss-hp-url').backgroundColor === 'rgb(255, 228, 225)' && cs('.ss-groups > button:not(.on)').color === 'rgb(0, 128, 0)' || [cs('.ss-hp-url').backgroundColor, cs('.ss-groups > button:not(.on)').color].join('|');
                out.titles = (w.querySelector('.ss-hp-wt b').textContent === '내 소개' && root().querySelector('.ss-groups > button[data-arg="people"] span').textContent === '인연들') || w.querySelector('.ss-hp-wt b').textContent;
                const u1 = root().querySelector('.ss-hp-win[data-win="u1"]'), u2 = root().querySelector('.ss-hp-win[data-win="u2"]');
                out.userWins = (!!u1 && u1.textContent.includes('우유 사기') && !!u2?.querySelector('.ss-hp-big b')) || [!!u1, !!u2].join('|');
                out.profileOpts = (!w.querySelector('.ss-hp-badges') && !w.querySelector('.ss-hp-today') && !!w.querySelector('.ss-hp-name') && root().querySelectorAll('.ss-hp-win[data-win="stats"] .ss-hp-bars > div').length <= 3) || 'prof';
                for (const k of ['hpParts', 'hpTitles', 'hpGroupNames', 'hpUserWins', 'hpProf', 'hpCounts']) delete S[k]; await re();
                // 창 숨기기 · 가운데 창 위치
                S.hpLayout = { off: ['intro'], main: 'l' }; await re(); out.layout = (!root().querySelector('.ss-hp-win[data-win="intro"]') && (!wide || root().querySelector('.ss-hp-book').firstElementChild.classList.contains('main'))) || 'layout'; S.hpLayout = {};
                // 자유 배치 (폰은 한 줄 그대로)
                S.hpFreeOn = true; S.hpFree = { wide: { profile: { x: 40, y: 10, w: 30, h: 40 } }, tab: { profile: { x: 40, y: 10, w: 30, h: 40 } } }; await re();
                const fb = root().querySelector('.ss-hp-book.free'), fp = root().querySelector('.ss-hp-win[data-win="profile"]');
                if (wide) { const br = fb.getBoundingClientRect(), pr = fp.getBoundingClientRect(); out.free = (!!fb && Math.abs((pr.left - br.left) / br.width - 0.4) < 0.03 && Math.abs(pr.width / br.width - 0.3) < 0.03) || [((pr.left - br.left) / br.width).toFixed(2), (pr.width / br.width).toFixed(2)].join('|'); }
                else out.free = !fb || 'free on phone';
                S.hpFreeOn = false; S.hpFree = {}; await re();
                out.quiet = !(window.__errors ?? []).length || (window.__errors ?? []).map(String).slice(-2).join(' | ');
                return out;
            }, skin);
            for (const [k, v] of Object.entries(r)) check(v === true, `${tag}: ${k}`, JSON.stringify(v));
        }
        // 태블릿 · PC: 손가락(마우스)으로 창을 끌어 옮기면 저장됨
        if (!phone) {
            await page.evaluate(async () => { const { S, re } = window.__hp; Object.assign(S, { hpSkin: 'phone', hpFreeOn: true, hpFree: {} }); await re(); });
            await tap('.ss-hompy .ss-hp-marks [data-hp="deco"]'); await sleep(500);
            const box = await page.evaluate(() => { const r = window.__hp.el().querySelector('.ss-hp-book.free.ss-hp-editing .ss-hp-win[data-win="profile"] .ss-hp-wt').getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; });
            if (touch) { const c = await cx.newCDPSession(page), pt = (x, y) => [{ x, y, id: 1 }];
                await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(box.x, box.y) }); for (let i = 1; i <= 6; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(box.x + i * 20, box.y + i * 12) }); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            } else { await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 72, { steps: 6 }); await page.mouse.up(); }
            await sleep(250);
            const saved = await page.evaluate(() => window.__hp.S.hpFree?.[innerWidth > 1100 ? 'wide' : 'tab']?.profile);
            check(!!saved && saved.x > 3 && saved.y > 2, `${dev}: 창 제목을 ${touch ? '손가락으로' : '마우스로'} 끌면 자리가 저장됨`, JSON.stringify(saved));
            await page.evaluate(async () => { const { S, re } = window.__hp; window.__hp.hp._edit.end(true); Object.assign(S, { hpFreeOn: false, hpFree: {} }); await re(); });
        }
        check(!logs.some(l => /pageerror|404/.test(l)), `${dev}: 페이지 오류 없음`, logs.filter(l => /pageerror|404/.test(l)).slice(0, 3).join(' | '));
        await cx.close();
    }
} finally { await browser.close(); srv.close(); }
