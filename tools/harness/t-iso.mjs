// 🧊 입체 지도 · 건물 안(층 도면) · 본거지 집 안 그림 — 세 보기 방식 · 안으로 들어가기 · 「지금 여기」 · 빵집은 내 집이 아님
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'map', 'calendar', 'home', 'wallet']);
    await page.evaluate(() => window.__addUser('hi'));
    await page.evaluate(() => window.__addAI('ok'));
    await sleep(200);
    await page.evaluate(async () => {
        const { addAdjust } = await import('/ext/src/engine.js');
        const st = window.__SS_TEST__.api.app.current.state;
        const map = structuredClone(st.data.map);
        map.places = [
            { name: '학교', kind: '학교', x: 20, y: 20, links: ['빵집', '공항'], known: true, floors: ['지하: 창고', '1층: 교무실/복도/급식실', '2층: 교실/복도/화장실', '옥상'] },
            { name: '빵집', kind: '가게', x: 60, y: 30, links: ['학교'], known: true },
            { name: '공항', kind: 'airport', x: 80, y: 70, links: ['학교'], known: true },
            { name: '우리 집', kind: '', x: 40, y: 80, links: ['학교'], known: true },
        ];
        map.here = '학교';
        const home = structuredClone(st.data.home);
        home.name = '우리 집'; home.rooms = [{ name: '거실', desc: '', decor: ['소파', '책장'] }, { name: '침실', desc: '', decor: ['침대'], floor: 2 }];
        await addAdjust({ set: { mod: 'map', data: map }, label: 'map' });
        await addAdjust({ set: { mod: 'home', data: home }, label: 'home' });
        window.__SS_TEST__.api.app.openSheet('map');
    });
    await sleep(300);
    const render = (tab, ui) => page.evaluate(([tab, ui]) => {
        const el = document.querySelector('dialog .ss-panel'); el._ss.tab = tab; el._ss.mode = 'view'; if (ui) el._ss.ui = ui;
        try { window.__SS_TEST__.api.app.renderPanel(el); } catch (e) { return String(e.stack || e).slice(0, 300); }
        return '';
    }, [tab, ui]);
    for (const m of ['iso', 'flat', 'list']) check(!(await render('map', { mapMode: m })), `지도 ${m} 보기가 그려짐`);
    check(!(await render('base', {})) && await page.evaluate(() => !!document.querySelector('dialog .ss-panel svg.ss-homeiso .rm')), '본거지 탭: 집 안 그림이 그려짐 (homeSVG)');
    // 종류 짐작: 영어 낱말은 낱말 경계로
    const kinds = await page.evaluate(async () => { const { isoKind } = await import('/ext/src/iso.js'); return ['Airport', 'Research Lab', 'Public Library', 'Harbor', '강당', '한강', '지하철역', '빵집'].map(n => isoKind({ name: n })); });
    check(kinds.join() === 'box,big,big,harbor,box,water,big,inn', `장소 모양 짐작 (${kinds})`);
    // 빵집은 내 집이 아님 · 학교는 층 · 우리 집은 본거지
    const inBtn = async (name) => { await render('map', { mapMode: 'iso', place: name }); return page.evaluate(() => !!document.querySelector('dialog .ss-panel [data-act="mapin"]')); };
    check(!(await inBtn('빵집')), '빵집엔 「건물 안 보기」가 없음 (내 집 방이 안 나옴)');
    check(await inBtn('우리 집'), '우리 집엔 「건물 안 보기」');
    check(await inBtn('학교'), '학교(층 있음)엔 「건물 안 보기」');
    // 안으로 → 2층 → 교실을 눌러 「지금 여기」
    await render('map', { mapMode: 'iso', place: '학교', inside: '학교', floor: '2층' });
    check(await page.evaluate(() => document.querySelectorAll('dialog .ss-panel svg.ss-plan .rm').length) === 3, '2층 도면에 방 셋');
    await page.evaluate(() => document.querySelector('dialog .ss-panel svg.ss-plan .rm[data-arg="2층 교실"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(400);
    check(await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.map.spot) === '2층 교실', '방을 누르면 spot = 「2층 교실」');
    await render('map', { mapMode: 'iso', place: '학교', inside: '학교' });
    check(await page.evaluate(() => { const el = document.querySelector('dialog .ss-panel'); return el.querySelector('.ss-floorseg button.on')?.textContent.trim().startsWith('2층') && !!el.querySelector('.ss-floorseg button.on .fa-location-dot') && !!el.querySelector('svg.ss-plan .rm.on'); }), '다시 들어오면 지금 있는 층(2층)이 열리고 📍 · 방에 불');
    await render('map', { mapMode: 'flat', place: '학교' });
    check(await page.evaluate(() => /2층/.test(document.querySelector('dialog .ss-panel svg.ss-floors .fl.on')?.textContent ?? '')), '평면 보기에서도 2층에 불');
    const inj = () => page.evaluate(async () => { const x = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current, { full: true }); return [x.main, x.people].join('\n'); });
    check((await inj()).includes('Location: 학교 (inside: 2층 교실)'), 'AI에게 (inside: 2층 교실)');
    // 「현재 위치로」: 입체 지도에선 입체 좌표로
    await render('map', { mapMode: 'iso' });
    await page.evaluate(() => document.querySelector('dialog .ss-panel [data-act="mapzoom"][data-arg="here"]').click()); await sleep(200);
    check(await page.evaluate(async () => {
        const { isoPt } = await import('/ext/src/iso.js'); const { layoutPlaces } = await import('/ext/src/views.js');
        const el = document.querySelector('dialog .ss-panel'), vb = el.querySelector('svg.ss-map').getAttribute('viewBox').split(/\s+/).map(Number);
        const p = isoPt(layoutPlaces(window.__SS_TEST__.api.app.current.state.data.map.places).get('학교'));
        return Math.abs(vb[0] + vb[2] / 2 - p.x) < 1 && Math.abs(vb[1] + vb[3] / 2 - p.y) < 1;
    }), '입체 지도 「현재 위치로」가 그 건물을 가운데로');
    // 다른 곳으로 가면 spot 지움
    await page.evaluate(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['loc', '빵집']], label: 'go' }); });
    check(await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.map.spot) === undefined && !(await inj()).includes('inside:'), '다른 곳으로 가면 「건물 안 어디」가 지워짐');
    // 방을 새로 넣으면 층이 비어 있음 (0 = 지하로 들어가던 것)
    check(await page.evaluate(async () => { const { EDIT } = await import('/ext/src/core.js'); const f = EDIT.home.find(x => x.k === 'rooms').fields.find(x => x.k === 'floor'); return f.blank === true; }), '방 층 칸은 비워 둘 수 있는 숫자');
    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
