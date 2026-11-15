// 📒 미니홈피 화면 (v2.8): 전체화면일 때만 수첩 틀 · 끄면 예전 그대로 · 틀 안에서 탭 · 묶음이 그대로 동작 · 좁은 화면에서 안 넘침
import { open, makeStatus, check } from './lib.mjs';
for (const width of [1300, 390]) {
    const { page, logs, close } = await open({ width, height: 850 });
    try {
        await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo', 'contact']);
        const r = await page.evaluate(async () => {
            const core = await import('/ext/src/core.js'); const shell = await import('/ext/src/shell.js');
            const wait = (ms) => new Promise(r => setTimeout(r, ms)), out = {};
            await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\n</meatball>'); await wait(300);
            window.__autoPopup = null;
            // 보통 창: 틀 없음
            core.settings().sheetFull = false; shell.openSheet('home'); await wait(400);
            let el = [...shell.panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop'));
            out.normalNoFrame = !!el && !el.querySelector('.ss-hompy') && !!el.querySelector('.ss-groups');
            out.normalPanelSkinned = el.querySelector('.ss-root').classList.contains('ss-rt') && document.body.classList.contains('ss-retro');
            // 전체화면 단추 → 홈피
            const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
            el.querySelector('[data-act="fullscreen"]').click(); await wait(400);
            out.fullIsHompy = !!el.querySelector('.ss-hompy .ss-hp-book') && el.querySelector('.ss-hompy').classList.contains('ss-hp-enter');
            out.parts = ['.ss-hp-url', '.ss-hp-left .ss-hp-photo img', '.ss-hp-right .ss-body', '.ss-hp-index .ss-groups', '.ss-hp-today', '.ss-hp-top .ss-head [data-act="fullscreen"]'].filter(q => !el.querySelector(q)).join(' ') || true;
            await wait(600);
            out.imgsLoad = [...el.querySelectorAll('.ss-hompy img[src*="/img/meatcon/"]')].every(i => i.naturalWidth > 0);
            // 화면에 딱 맞음: 넓은 화면에선 수첩이 창 안에 다 들어오고 안쪽(오른쪽 쪽)만 스크롤
            { const bk = el.querySelector('.ss-hp-book').getBoundingClientRect(), root = el.querySelector('.ss-hompy').getBoundingClientRect();
              out.fitsWindow = innerWidth < 861 || (root.top === 0 && Math.round(root.height) === innerHeight && bk.bottom <= innerHeight && (() => { const b = el.querySelector('.ss-hp-right > .ss-body'); return !b.style.zoom; })()) || JSON.stringify([root.top, root.height, bk.bottom, innerHeight]); }
            // 프로필 그림: 기본은 기분 따라 · 고르면 그 그림 · 내 그림 · 고르기 창이 뜸
            const face = () => el.querySelector('.ss-hp-photo img').getAttribute('src');
            out.faceAuto = face().includes('/img/meatcon/');
            core.settings().hpFace = 'con:box'; shell.rerenderPanels(true); await wait(150); out.facePicked = face().endsWith('/img/meatcon/box.webp');
            core.settings().hpFaces = ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7']; core.settings().hpFace = 'my:0'; shell.rerenderPanels(true); await wait(150); out.faceMine = face().startsWith('data:image/gif');
            core.settings().hpFace = 'my:7'; shell.rerenderPanels(true); await wait(150); out.faceMissingFallsBack = face().includes('/img/meatcon/');
            el.querySelector('.ss-hp-photo').click(); await wait(400);
            { const pk = document.querySelector('.ss-hp-pick'); out.pickerOpens = !!pk && pk.querySelectorAll('.ss-hp-face').length >= 16 && !!pk.querySelector('[data-choice="upload"]') && !!pk.querySelector('[data-choice="del:0"]');
              pk?.querySelector('[data-choice="con:heart"]')?.click(); await wait(400); out.pickerSets = core.settings().hpFace === 'con:heart' && face().endsWith('/heart.webp'); }
            core.settings().hpFace = 'auto'; core.settings().hpFaces = []; shell.rerenderPanels(true); await wait(150);
            // 홈의 소식 줄: 왼쪽 쪽과 겹치는 칸은 숨김 · 도트 글꼴 (끄면 실리 글꼴)
            // 창들: 프로필 · 상태 · 가운데 · 꾸미기 단추 · 색 값
            out.windows = ['.ss-hp-win[data-win="profile"]', '.ss-hp-win[data-win="stats"]', '.ss-hp-win.main', '.ss-hp-marks [data-hp="deco"]'].filter(q => !el.querySelector(q)).join(' ') || true;
            core.settings().hpTheme = 2; core.settings().hpLayout = { off: ['stats'] }; shell.rerenderPanels(true); await wait(200);
            { const r = el.querySelector('.ss-hompy'); out.customize = r.style.getPropertyValue('--hp-h') === '215' && !el.querySelector('.ss-hp-win[data-win="stats"]'); }
            el.querySelector('[data-hp="deco"]').click(); await wait(400);
            { const pk = document.querySelector('.ss-hp-pick'); out.decoOpens = !!pk && pk.querySelectorAll('.ss-hp-sw').length === 9 && !!pk.querySelector('[data-choice="skin:dot"]') && !!pk.querySelector('[data-hpr="fs"]') && !!pk.querySelector('[data-hpc="hpInk"]') && !!pk.querySelector('[data-hpr="hue"]') && !!pk.querySelector('[data-choice="dark:dark"]') && !!pk.querySelector('[data-choice="setsave:1"]') && !!pk.querySelector('[data-choice="win:stats"]') && !!pk.querySelector('[data-choice="hudskin:1"]');
              pk?.querySelector('[data-choice="theme:0"]')?.click(); await wait(400); out.decoSets = core.settings().hpTheme === 0 && document.body.style.getPropertyValue('--hp-h') === '340' && document.body.classList.contains('ss-retro');
              document.querySelectorAll('dialog').forEach(d => { if (d.querySelector('.ss-hp-pick')) d.querySelector('.popup-button-ok')?.click(); }); await wait(300); }
            core.settings().hpLayout = {}; shell.rerenderPanels(true); await wait(200);
            // 창 하나하나 옮기기: 꾸미기 › 창 옮기기 → ▼(순서) · ⇄(반대쪽 줄) · ✕(숨김) · 가운데 창 위치
            if (innerWidth > 860) {
              const hpm = await import('/ext/src/hompy.js'); const keys = (sel) => [...el.querySelectorAll(`${sel} [data-win]`)].map(x => x.dataset.win).join();
              el.querySelector('[data-hp="deco"]').click(); await wait(300); document.querySelector('.ss-hp-pick [data-choice="edit:1"]').click(); await wait(400);
              const before = keys('.ss-hp-left');
              el.querySelector('.ss-hp-left [data-hp="mv"][data-arg="profile:down"]').click(); await wait(250);
              const swapped = keys('.ss-hp-left');
              el.querySelector('[data-hp="mv"][data-arg="stats:side"]').click(); await wait(250);
              const moved = !keys('.ss-hp-left').includes('stats') && keys('.ss-hp-rcol').startsWith('stats');
              el.querySelector('[data-hp="mv"][data-arg="stats:off"]').click(); await wait(250);
              out.moveWindows = (before.startsWith('profile,') && swapped.split(',')[1] === 'profile' && moved && !el.querySelector('[data-win="stats"]') && hpm.hpLayout().off.includes('stats')) || JSON.stringify([before, swapped, moved, hpm.hpLayout()]);
              el.querySelector('[data-hp="editdone"]').click(); await wait(200); out.editEnds = !el.querySelector('.ss-hp-wtools');
              core.settings().hpLayout = { main: 'r' }; shell.rerenderPanels(true); await wait(200);
              out.mainMoves = el.querySelector('.ss-hp-book').lastElementChild.classList.contains('main');
              core.settings().hpLayout = {}; shell.rerenderPanels(true); await wait(200);
            }
            { // 꾸미기: 직접 고른 색 · 어둡게 · 모서리 · 글꼴 · 움직임 끔 · 세트 코드 · 채팅에 묶은 세트
              const hpm = await import('/ext/src/hompy.js'), S0 = core.settings(), B = document.body;
              Object.assign(S0, { hpTheme: 'c', hpHue: 123, hpSat: 0.5, hpDark: 'dark', hpCorner: 2, hpGap: 0, hpFont: 'r', hpMotion: false }); hpm.applyRetro(); shell.rerenderPanels(true); await wait(200);
              const r = el.querySelector('.ss-hompy');
              out.customLook = (r.style.getPropertyValue('--hp-h') === '123' && B.classList.contains('ss-hp-dark') && B.classList.contains('ss-hp-r-2') && B.classList.contains('ss-hp-g-0') && B.classList.contains('ss-hp-f-r') && B.classList.contains('ss-hp-still') && getComputedStyle(r).getPropertyValue('--hp-paper').trim() !== '#fff') || [r.style.cssText, B.className].join(' | ');
              const code = hpm.toCode('테스트 <b>', { hpTheme: 'c', hpHue: 200, hpFace: 'my:0', evil: '<img onerror=1>', hpFont: 's' }), back = hpm.fromCode(code);
              out.setCode = (code.startsWith('MBH1:') && back?.data.hpHue === 200 && back.data.hpFont === 's' && !('evil' in back.data) && !('hpFace' in back.data) && hpm.fromCode('엉터리') === null) || JSON.stringify(back);
              Object.assign(S0, { hpTheme: 0, hpDark: 'light', hpCorner: 1, hpGap: 1, hpFont: 'g', hpMotion: true, hpSets: [{ name: '밤', data: { hpTheme: 2, hpDark: 'dark' } }] }); core.getMeta().hpSet = '밤'; hpm.applyRetro(); shell.rerenderPanels(true); await wait(200);
              out.boundSet = (el.querySelector('.ss-hompy').style.getPropertyValue('--hp-h') === '215' && B.classList.contains('ss-hp-dark') && S0.hpTheme === 0) || B.className;
              delete core.getMeta().hpSet; S0.hpSets = []; hpm.applyRetro(); shell.rerenderPanels(true); await wait(200);
              out.setUnbound = !B.classList.contains('ss-hp-dark') && el.querySelector('.ss-hompy').style.getPropertyValue('--hp-h') === '340';
              // 모양 두 가지: 처음엔 고르는 줄 → 도트를 고르면 도트 글꼴 · 무늬 · 주소창 / 깔끔이면 고딕 · 무늬 없음. 직접 고른 글씨 크기 · 글자색
              delete S0.hpSkin; hpm.applyRetro(); shell.rerenderPanels(true); await wait(200);
              const ask = !!el.querySelector('.ss-hp-choose') && el.querySelector('.ss-hompy').classList.contains('ss-hp-k-clean');
              el.querySelector('.ss-hp-choose [data-arg="dot"]').click(); await wait(400); await document.fonts.ready;
              { const r2 = el.querySelector('.ss-hompy'); out.skinDot = (ask && S0.hpSkin === 'dot' && !el.querySelector('.ss-hp-choose') && B.classList.contains('ss-skin-dot') && r2.classList.contains('ss-hp-p-grid') && getComputedStyle(r2).fontFamily.includes('MeatballDot') && getComputedStyle(el.querySelector('.ss-hp-hearts')).display !== 'none' && getComputedStyle(r2).backgroundImage !== 'none') || [ask, S0.hpSkin, B.className, getComputedStyle(r2).fontFamily].join(' | '); }
              Object.assign(S0, { hpSkin: 'clean', hpFsPx: 16, hpInk: '#112233' }); hpm.applyRetro(); shell.rerenderPanels(true); await wait(300);
              { const r3 = el.querySelector('.ss-hompy'), cs = getComputedStyle(r3); out.skinClean = (!B.classList.contains('ss-skin-dot') && !cs.fontFamily.includes('MeatballDot') && cs.backgroundImage === 'none' && getComputedStyle(el.querySelector('.ss-hp-hearts')).display === 'none' && r3.style.getPropertyValue('--hp-fs') === '16px' && cs.color === 'rgb(17, 34, 51)') || [B.className, cs.fontFamily, cs.color, r3.style.cssText].join(' | '); }
              Object.assign(S0, { hpFsPx: 0, hpInk: '' }); hpm.applyRetro(); shell.rerenderPanels(true); await wait(200);
              out.profileCard = !!el.querySelector('.ss-hp-badges') || innerWidth <= 640 && !el.querySelector('.ss-hompy.ss-hp-athome') ; }
            out.closeButton = !!el.querySelector('.ss-hp-url [data-hp="close"]');
            // 🖼 홈의 큰 사진: 없으면 단추만 · 넣으면 보임 · 한마디 · 빼기 · 다른 탭엔 없음
            out.photoEmpty = !!el.querySelector('.ss-hp-right .ss-hp-addphoto [data-hp="photo"]') && !el.querySelector('.ss-hp-main');
            core.getMeta().hpPhoto = { src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', cap: '우리 집 <b>고양이</b>' }; shell.rerenderPanels(true); await wait(200);
            out.photoShown = !!el.querySelector('.ss-hp-main img') && el.querySelector('.ss-hp-main figcaption').textContent.includes('<b>고양이</b>') && !el.querySelector('.ss-hp-addphoto');
            await wait(300); out.homePhotoBig = innerWidth < 861 || el.querySelector('.ss-hp-main').getBoundingClientRect().height >= 110;
            out.photoBeside = !!el.querySelector('.ss-hp-homewrap.has > .ss-hp-main') && !!el.querySelector('.ss-hp-homewrap > .ss-hp-homebody');
            el.querySelector('[data-hp="photopos"]').click(); await wait(300); out.photoFlips = core.getMeta().hpPhoto.pos === 'top' && !!el.querySelector('.ss-hp-homewrap.flip');
            el.querySelector('[data-hp="photodel"]').click(); await wait(300);
            out.photoRemoved = !core.getMeta().hpPhoto && !!el.querySelector('.ss-hp-addphoto');
            // 틀 안에서 묶음 · 탭 이동
            const g = [...el.querySelectorAll('.ss-hp-index .ss-groups > button')].find(b => !b.classList.contains('on')); g.click(); await wait(300);
            out.groupMoves = !!el.querySelector('.ss-hompy') && el.querySelector('.ss-hp-index .ss-groups > button.on')?.dataset.arg === g.dataset.arg;
            out.enterOnce = !el.querySelector('.ss-hompy').classList.contains('ss-hp-enter');
            el.querySelector('.ss-hp-top [data-act="tab"][data-arg="manage"]').click(); await wait(300);
            // 큰 탭은 그대로 한 줄 탭 · 자잘한 탭(추천 음악 · 추억 앨범 · 플레이 기록)은 「모음」 하나로
            if (innerWidth > 860) { const nav = el.querySelector('.ss-hp-right > .ss-tabs'); out.tabsOneLine = !nav || nav.getBoundingClientRect().height < 40; }
            out.linkMoves = el._ss.tab === 'manage' && !!el.querySelector('.ss-hompy') && !el.querySelector('.ss-hp-addphoto');
            // 「모음」: 홈 묶음의 자잘한 탭이 한 탭으로 · 창 제목을 누르면 그 칸만 · 돌아가기
            { const hpm = await import('/ext/src/hompy.js'); el.querySelector('.ss-hp-index .ss-groups > button').click(); await wait(300);
              const names = [...el.querySelectorAll('.ss-hp-right > .ss-tabs > button')].map(b => b.textContent.trim());
              const minorsOn = hpm.hpMinor().filter(k => !!window.__SS_TEST__).length === 3;
              const etc = [...el.querySelectorAll('.ss-hp-right > .ss-tabs > button')].find(b => b.textContent.includes('모음'));
              if (etc) { etc.click(); await wait(400); const subs = [...el.querySelectorAll('.ss-hp-win.sub')].map(x => x.dataset.sub);
                const shut = !el.querySelector('.ss-hp-all .ss-hp-wb'); el.querySelector('.ss-hp-win.sub > .ss-hp-wt').click(); await wait(300); const opened = shut && el.querySelectorAll('.ss-hp-all .ss-hp-wb').length === 1; el.querySelector('.ss-hp-win.sub.open [data-hp="solo"]').click(); await wait(300); const solo = opened && !el.querySelector('.ss-hp-all') && !!el.querySelector('.ss-hp-back');
                el.querySelector('.ss-hp-back').click(); await wait(300);
                out.collection = (minorsOn && subs.length >= 2 && !names.includes('플레이 기록') && solo && !!el.querySelector('.ss-hp-all')) || JSON.stringify([names, subs, solo]); }
              else out.collection = names.length <= 2 || JSON.stringify(names); }
            out.noOverflow = document.documentElement.scrollWidth <= innerWidth + 1 && el.querySelector('.ss-hompy').scrollWidth <= innerWidth + 1 || `${el.querySelector('.ss-hompy').scrollWidth} > ${innerWidth}`;
            // 설정에서 끄면 예전 전체화면
            core.settings().hompyFull = false; shell.rerenderPanels(true); await wait(300);
            out.settingOff = !el.querySelector('.ss-hompy') && !!el.querySelector('.ss-root > .ss-groups');
            core.settings().hompyFull = true; shell.rerenderPanels(true); await wait(300);
            // 전체화면 끄기 → 틀 없음
            el.querySelector('[data-act="fullscreen"]').click(); await wait(400);
            out.backToNormal = !el.querySelector('.ss-hompy') && core.settings().sheetFull === false;
            out.errors = (window.__errors ?? []).map(String).slice(-3);
            return out;
        });
        for (const [k, v] of Object.entries(r)) if (k !== 'errors') check(v === true, `hompy@${width}: ${k}`, JSON.stringify(v));
        check(!r.errors.length, `hompy@${width}: no errors`, JSON.stringify(r.errors));
        check(!logs.some(l => /pageerror|404/.test(l)), `hompy@${width}: no page errors`, logs.filter(l => /pageerror|404/.test(l)).slice(0, 3).join(' | '));
    } finally { await close(); }
}
