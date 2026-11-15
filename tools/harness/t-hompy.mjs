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
            // 전체화면 단추 → 홈피
            const dlg = el.closest('dialog'); dlg.classList.add('ss-dlg'); dlg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:auto;';
            el.querySelector('[data-act="fullscreen"]').click(); await wait(400);
            out.fullIsHompy = !!el.querySelector('.ss-hompy .ss-hp-book') && el.querySelector('.ss-hompy').classList.contains('ss-hp-enter');
            out.parts = ['.ss-hp-url', '.ss-hp-left .ss-hp-photo img', '.ss-hp-right .ss-body', '.ss-hp-index .ss-groups', '.ss-hp-today'].filter(q => !el.querySelector(q)).join(' ') || true;
            await wait(600);
            out.imgsLoad = [...el.querySelectorAll('.ss-hompy img[src*="/img/meatcon/"]')].every(i => i.naturalWidth > 0);
            // 화면에 딱 맞음: 넓은 화면에선 수첩이 창 안에 다 들어오고 안쪽(오른쪽 쪽)만 스크롤
            { const bk = el.querySelector('.ss-hp-book').getBoundingClientRect(), root = el.querySelector('.ss-hompy').getBoundingClientRect();
              out.fitsWindow = innerWidth < 861 || (root.top === 0 && Math.round(root.height) === innerHeight && bk.bottom <= innerHeight && getComputedStyle(el.querySelector('.ss-hp-right')).overflowY === 'auto') || JSON.stringify([root.top, root.height, bk.bottom, innerHeight]); }
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
            out.closeButton = !!el.querySelector('.ss-hp-url [data-hp="close"]');
            // 🖼 홈의 큰 사진: 없으면 단추만 · 넣으면 보임 · 한마디 · 빼기 · 다른 탭엔 없음
            out.photoEmpty = !!el.querySelector('.ss-hp-right .ss-hp-addphoto [data-hp="photo"]') && !el.querySelector('.ss-hp-main');
            core.getMeta().hpPhoto = { src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', cap: '우리 집 <b>고양이</b>' }; shell.rerenderPanels(true); await wait(200);
            out.photoShown = !!el.querySelector('.ss-hp-main img') && el.querySelector('.ss-hp-main figcaption').textContent.includes('<b>고양이</b>') && !el.querySelector('.ss-hp-addphoto');
            el.querySelector('[data-hp="photodel"]').click(); await wait(300);
            out.photoRemoved = !core.getMeta().hpPhoto && !!el.querySelector('.ss-hp-addphoto');
            // 틀 안에서 묶음 · 탭 이동
            const g = [...el.querySelectorAll('.ss-hp-index .ss-groups > button')].find(b => !b.classList.contains('on')); g.click(); await wait(300);
            out.groupMoves = !!el.querySelector('.ss-hompy') && el.querySelector('.ss-hp-index .ss-groups > button.on')?.dataset.arg === g.dataset.arg;
            out.enterOnce = !el.querySelector('.ss-hompy').classList.contains('ss-hp-enter');
            el.querySelector('.ss-hp-links [data-arg="manage"]').click(); await wait(300);
            out.linkMoves = el._ss.tab === 'manage' && !!el.querySelector('.ss-hompy') && !el.querySelector('.ss-hp-addphoto');
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
