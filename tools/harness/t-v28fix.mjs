// 🧹 v2.8 다듬기: 홈에서 옆 창과 겹치는 타일 빼기(창을 숨기면 다시 보임) · 창 제목 기본은 한글 · 그림 용량 묶기
import { open, makeStatus, check } from './lib.mjs';
for (const width of [1300, 390]) {
    const { page, logs, close } = await open({ width, height: 850 });
    try {
        await page.route('**://cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64') })); // 콘팩 그림은 시험대에서 밖으로 나가지 않게 가짜 그림으로
        await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact']);
        const r = await page.evaluate(async () => {
            const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js'); const tiles = await import('/ext/src/tiles.js'); const hp = await import('/ext/src/hompy.js');
            const wait = (ms) => new Promise(r => setTimeout(r, ms)), out = {};
            await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\n</meatball>'); await wait(300); window.__autoPopup = null;
            core.settings().hpSkin = 'clean'; core.settings().sheetFull = false; shell.openSheet('home'); await wait(400);
            const el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop'));
            const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
            el.querySelector('[data-act="fullscreen"]').click(); await wait(500);
            const vis = (k) => { const t = el.querySelector(`.ss-hp-homebody .ss-home-grid > [data-w="${k}"]`); return !!t && getComputedStyle(t).display !== 'none'; };
            const has = (k) => !!el.querySelector(`.ss-hp-homebody .ss-home-grid > [data-w="${k}"]`);
            out.tilesExist = ['bars', 'date', 'loc', 'cash', 'rel'].every(has) || ['bars', 'date', 'loc', 'cash', 'rel'].filter(k => !has(k)).join();
            out.dupHidden = !['bars', 'date', 'loc', 'cash', 'rel'].some(vis) && !!el.querySelector('.ss-hp-win[data-win="stats"]') && !!el.querySelector('.ss-hp-win[data-win="friends"]');
            out.bare = el.querySelector('.ss-hompy').classList.contains('ss-hp-home-bare');
            // 상태 창을 숨기면 그 타일은 다시 보인다 (일촌 창은 그대로라 관계 타일은 계속 숨김)
            core.settings().hpLayout = { off: ['stats'] }; shell.rerenderPanels(true); await wait(250);
            out.backWhenOff = ['bars', 'date', 'loc', 'cash'].every(vis) && !vis('rel') && !el.querySelector('.ss-hompy').classList.contains('ss-hp-home-bare');
            core.settings().hpLayout = {}; shell.rerenderPanels(true); await wait(250);
            // 날씨는 상태 창으로 옮겨 감 (타일이 빠져도 정보가 안 사라짐)
            const cal = core.app.current?.data?.calendar; out.weatherKept = !cal?.weather || el.querySelector('.ss-hp-win[data-win="stats"]').textContent.includes(cal.weather);
            // 창 제목 기본은 한글 · 직접 적은 제목은 그대로
            const t = (k) => el.querySelector(`.ss-hp-win[data-win="${k}"] > .ss-hp-wt b`)?.textContent;
            out.koTitles = (t('profile') === '프로필' && t('stats') === '상태') || JSON.stringify([t('profile'), t('stats')]);
            // 처음엔 꼭 필요한 창만 (프로필 · 상태 · 일촌 · 퀘스트 · 연락) — 나머지는 「창 더하기」로
            out.fewWindows = !el.querySelector('.ss-hp-win[data-win="intro"]') && !el.querySelector('.ss-hp-win[data-win="music"]') && hp.hpLayout().off.includes('news');
            core.settings().hpLayout = { off: [] }; shell.rerenderPanels(true); await wait(250); out.allWindowsBack = !!el.querySelector('.ss-hp-win[data-win="intro"]'); core.settings().hpLayout = {}; shell.rerenderPanels(true); await wait(250);
            core.settings().hpTitles = { stats: 'STATUS' }; shell.rerenderPanels(true); await wait(200); out.ownTitle = t('stats') === 'STATUS'; delete core.settings().hpTitles; shell.rerenderPanels(true); await wait(200);
            // 그림 용량 묶기: 잡음 그림(잘 안 줄어드는 그림)도 정한 크기 아래로
            const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200; const g = cv.getContext('2d'), im = g.createImageData(1600, 1200); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = Math.random() * 255; im.data[i + 1] = Math.random() * 255; im.data[i + 2] = Math.random() * 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0);
            const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
            const free = await tiles.shrinkImage(blob, 1600, 0.8), capped = await tiles.shrinkImage(blob, 1600, 0.8, 380000);
            out.capWorks = (free.length > 380000 && capped.length <= 380000 && capped.startsWith('data:image/')) || JSON.stringify([free.length, capped.length]);
            out.noCapSame = (await tiles.shrinkImage(blob, 128, 0.85)).length === (await tiles.shrinkImage(blob, 128, 0.85, 0)).length;
            out.bytes = typeof hp.decoBytes() === 'number';
            // 🐱 프로필 그림은 처음엔 비어 있음 · 콘팩은 받겠다고 했을 때만 (기본 14개는 늘 있음)
            { const S = core.settings(), photo = () => el.querySelector('.ss-hp-photo'); out.faceEmptyFirst = S.hpFaceV === 2 && (S.hpFace ?? 'none') === 'none' && photo().classList.contains('empty') && !photo().querySelector('img');
              out.packOffFirst = S.conPack !== true && hp.PACK.length === 60 && hp.CONS.length === 14;
              photo().click(); await wait(400); let pk = document.querySelector('.ss-hp-pick'); out.packOffer = !!pk?.querySelector('[data-choice="packget"]') && !pk.querySelector('[data-choice^="pack:"]') && pk.querySelectorAll('[data-choice^="con:"]').length === 14;
              pk?.querySelector('[data-choice="packget"]')?.click(); await wait(600); pk = [...document.querySelectorAll('.ss-hp-pick')].pop(); out.packGot = S.conPack === true && pk?.querySelectorAll('[data-choice^="pack:"]').length === 60;
              pk?.querySelector('[data-choice="pack:23"]')?.click(); await wait(400); out.packPick = S.hpFace === 'pack:23' && /cdn\.jsdelivr\.net\/gh\/dfzfs\/meatballstats@[0-9a-f]{40}\/23\.webp$/.test(photo().querySelector('img')?.getAttribute('src') ?? '');
              S.conPack = false; shell.rerenderPanels(true); await wait(200); out.packOffHides = photo().classList.contains('empty'); S.hpFace = 'none'; shell.rerenderPanels(true); await wait(200);
              document.querySelectorAll('dialog[open]').forEach(d => { if (!d.classList.contains('ss-dlg')) d.close(); }); }
            // 🧭 기능 한눈에: 켠 기능은 값과 함께 · 끈 기능은 스위치로 켜짐
            { const fb = el.querySelector('.ss-hp-homebody .ss-fb'); out.board = !!fb && fb.querySelectorAll('.ss-fb-card').length >= 9 && !!fb.querySelector('.ss-fb-card[data-arg="wallet"] em')?.textContent.trim();
              core.getMeta(true).mods.quest = false; await core.saveMeta(); core.app.refreshNow(); await wait(350);
              const sw = el.querySelector('.ss-fb-card.off input[data-arg="quest"]'); out.boardOff = !!sw; if (sw) { sw.checked = true; sw.dispatchEvent(new Event('change', { bubbles: true })); await wait(450); }
              out.boardTurnsOn = core.getMeta().mods.quest === true && !!el.querySelector('.ss-fb-card[data-arg="quest"]:not(.off)');
              // 처음 안내 줄: 「알겠어요」로 닫으면 다시 안 뜸 · 창 제목 옆 「열기 ›」는 그 탭을 연다
              out.tipShown = !!el.querySelector('.ss-fb-tip'); el.querySelector('.ss-fb-tip [data-hp="tipoff"]')?.click(); await wait(350); out.tipGone = !el.querySelector('.ss-fb-tip') && core.settings().hpTip === false;
              if (innerWidth > 640) { el.querySelector('.ss-hp-win[data-win="friends"] .ss-hp-go')?.click(); await wait(350); out.goOpens = el._ss.tab === 'rel'; el.querySelector('.ss-groups > button').click(); await wait(350); }
              el.querySelector('.ss-fb-card[data-arg="wallet"]').click(); await wait(350); out.boardOpens = el._ss.tab === 'wallet';
              // 도구줄: 이름이 보이고 · 덜 쓰는 것은 「더보기」 안에
              const tools = el.querySelector('.ss-toolrow .ss-tools'); out.toolNames = !!tools && ['edit', 'instructtog', 'hidetog'].every(a => tools.querySelector(`:scope > [data-act="${a}"] span`)?.textContent.trim()) && ['regen', 'json', 'wipemod'].every(a => tools.querySelector(`.ss-tool-more .ss-tool-pop [data-act="${a}"]`));
              // 📱 홈의 앱 판: 꾸미기 모드에서 ◀ ▶ 로 순서를 바꾸면 완료 뒤에도 그대로 · 「모음」은 탭처럼 한 번에 하나만
              el.querySelector('.ss-groups > button').click(); await wait(350);
              { const ord = () => [...el.querySelectorAll('.ss-fb-grid:not(.off) [data-app]')].map(x => x.dataset.app); const o0 = ord(); el.querySelector('[data-hp="deco"]').click(); await wait(500);
                out.editCards = !!el.querySelector('.ss-fb-card.edit [data-hp="appmv"]') && !el.querySelector('.ss-fb-grid:not(.off) button.ss-fb-card'); el.querySelector(`[data-hp="appmv"][data-arg="${o0[0]}:1"]`)?.click(); await wait(350);
                document.querySelector('[data-hp="eddone"]').click(); await wait(450); const o1 = ord(); out.appOrder = (o1[0] === o0[1] && o1[1] === o0[0] && o1.length === o0.length && !!el.querySelector('.ss-fb-grid:not(.off) button.ss-fb-card')) || JSON.stringify([o0.slice(0, 3), o1.slice(0, 3)]); delete core.settings().hpApps; }
              { const tb = [...el.querySelectorAll('.ss-hp-right > .ss-tabs > button')]; if (tb[1]) { tb[1].click(); await wait(400); const subs = () => [...el.querySelectorAll('.ss-hp-all > .ss-hp-win.sub')], openN = () => subs().filter(x => x.classList.contains('open')).map(x => x.dataset.sub);
                  const a0 = openN(); subs()[1]?.querySelector('.ss-hp-wt').click(); await wait(400); const a1 = openN(); out.oneAtATime = (a0.length === 1 && a1.length === 1 && a0[0] !== a1[0] && el.querySelectorAll('.ss-hp-all .ss-hp-wb').length === 1) || JSON.stringify([a0, a1]); tb[0].click(); await wait(350); } }
              // 🐱 머리줄: 오른쪽 도우미 단추는 숨기고 · 왼쪽 고양이 옆 말풍선이 도우미 · 고양이를 누르면 반응(표정이 바뀌고 말풍선이 뜸)
              { const pet = el.querySelector('.ss-hp-buddy .ss-hp-pet'), say = el.querySelector('.ss-hp-buddy .ss-hp-say'), chip = el.querySelector('.ss-head-a .ss-helpchip');
                { const diff = el.querySelector('.ss-head-a .ss-chip'), cr = chip?.getBoundingClientRect(), dr = diff?.getBoundingClientRect(), pr = pet?.getBoundingClientRect(); // 도우미는 오른쪽 아이콘 줄 맨 앞 (난이도 칩 왼쪽 · 같은 높이 · 세로 가운데 맞춤) · 고양이는 왼쪽 그대로
                  out.helperRight = (!!pet && !say && !!chip && getComputedStyle(chip).display !== 'none' && pr.left < innerWidth / 2 && (innerWidth <= 640 || cr.left > pr.right) && (!dr || !dr.width || (cr.right <= dr.left + 1 && Math.abs(cr.height - dr.height) <= 1 && Math.abs((cr.top + cr.bottom) - (dr.top + dr.bottom)) <= 2))) || JSON.stringify([!!pet, !!say, cr, dr]); }
                const src0 = pet.getAttribute('src'); pet.click(); await wait(200); out.petReacts = pet.getAttribute('src') !== src0 && !!document.querySelector('.ss-mbubble') && /poke/.test(pet.className); await wait(1300); out.petBack = pet.getAttribute('src') === src0; }
              // 🏷 아이콘 단추: 화면 읽기용 이름은 전부 · 머리의 덜 쓰는 단추는 「더보기」 안
              out.ariaAll = [...el.querySelectorAll('button[title]')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length === 0;
              out.headMore = ['prompts', 'copydump'].every(a => el.querySelector(`.ss-head-more .ss-tool-pop [data-act="${a}"]`)) && !el.querySelector('.ss-head-a > [data-act="copydump"]');
              el.querySelector('[data-act="tab"][data-arg="rel"], .ss-groups > button:nth-child(4)').click(); await wait(400);
              out.relLabels = ['peek', 'talk', 'leave'].every(a => { const b = el.querySelector(`.ss-relc-h [data-act="${a}"]`); return !b || !!b.dataset.l; }) && !!el.querySelector('.ss-relc-h [data-l]');
              el.querySelector('.ss-groups > button').click(); await wait(350); }
            // 🖼 배경화면: 고르면 표시가 붙고 · 내 바탕 그림은 빠짐 · 다른 모양에선 안 걸림 · 꾸밈 세트 코드에 실림
            { const B = document.body, S = core.settings(); S.hpBgImg = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; hp._edit.start(); await wait(300); document.querySelector('.ss-hp-stabs [data-arg="tab:wall"]').click(); await wait(300);
              out.wallSheet = document.querySelectorAll('.ss-hp-sheet .ss-hp-wp').length >= 9; document.querySelector('.ss-hp-sheet [data-arg="wall:night"]').click(); await wait(350);
              out.wallOn = B.classList.contains('ss-hp-wall-night') && B.classList.contains('ss-hp-wall') && !S.hpBgImg && B.classList.contains('ss-hp-dark');
              hp._edit.end(true); await wait(250); out.wallKept = S.hpWall === 'night' && hp.fromCode(hp.toCode('t', S))?.data?.hpWall === 'night';
              S.hpSkin = 'dot'; hp.applyRetro(); out.wallOnlyCleanPhone = !B.classList.contains('ss-hp-wall'); S.hpSkin = 'clean'; S.hpWall = ''; S.hpDark = 'light'; hp.applyRetro(); out.wallOff = !B.classList.contains('ss-hp-wall'); }
            return out;
        });
        console.log(`v2.8 다듬기 (${width}px)`);
        for (const [k, v] of Object.entries(r)) check(v === true, k, v === true ? '' : String(v));
        check(logs.length === 0, 'no console errors', logs.join(' | '));
    } finally { await close(); }
}
