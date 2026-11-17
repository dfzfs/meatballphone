// 🚇 노선도 지도 · 📍 인물 핀 · 🏢 건물 정면도 — 기본 보기 · 노선 색 · 누르면 정면도 · 핀 켜고 끄기 · 이모지 · AI에게 안 감
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
            { name: '본부', kind: '본부', x: 10, y: 40, links: ['병원', '시장'], known: true, floors: ['지하: 무기고/감옥', '1층: 로비/식당/회의실', '2층: 작전실/통신실', '옥상'] },
            { name: '병원', kind: '병원', x: 34, y: 40, links: ['본부', '시장', '산길'], known: true, floors: ['1층 식당', '2층 병원'] },
            { name: '시장', kind: '거리', x: 40, y: 56, links: ['본부', '병원', '산길'], known: true },
            { name: '산길', kind: '산', x: 62, y: 40, links: ['병원', '시장', '오두막'], known: true },
            { name: '오두막', kind: '집', x: 88, y: 30, links: ['산길'], known: true },
            { name: '항구', kind: '항구', x: 40, y: 80, links: ['시장'], known: false },
        ];
        map.here = '병원';
        const prof = structuredClone(st.data.profile);
        prof.list = [{ ...prof.list[0], name: '나', role: 'user' }, { ...prof.list[0], name: '로우', role: 'main', home: '오두막', sched: '', emoji: '🐯' }, { ...prof.list[0], name: '사보', role: 'npc', home: '본부', sched: '' }, { ...prof.list[0], name: '떠돌이', role: 'npc', home: '', sched: '' }];
        await addAdjust({ set: { mod: 'map', data: map }, label: 'map' });
        await addAdjust({ set: { mod: 'profile', data: prof }, label: 'p' });
        window.__SS_TEST__.api.app.openSheet('map');
    });
    await sleep(300);
    const render = (ui) => page.evaluate((ui) => {
        const el = document.querySelector('dialog .ss-panel'); el._ss.tab = 'map'; el._ss.mode = 'view'; if (ui) el._ss.ui = ui;
        try { window.__SS_TEST__.api.app.renderPanel(el); } catch (e) { return String(e.stack || e).slice(0, 300); }
        return '';
    }, ui);
    const q = (fn, arg) => page.evaluate(fn, arg);
    const click = async (sel) => { await q((sel) => document.querySelector(`dialog .ss-panel ${sel}`).dispatchEvent(new MouseEvent('click', { bubbles: true })), sel); await sleep(450); };
    const inj0 = await q(async () => { const x = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current, { full: true }); return [x.main, x.people, x.romance].join('\n'); });

    // 🚇 처음엔 노선도
    check(!(await render({ mapMode: 'iso' })) && await q(() => !!document.querySelector('dialog .ss-panel svg.ss-map.line') && !document.querySelector('dialog .ss-panel .ss-mapmode')), '예전에 입체를 골라 뒀어도 노선도 하나');
    check(await q(() => document.querySelectorAll('dialog .ss-panel svg.ss-map.line g.ln-n').length) === 6, '역 여섯');
    check(await q(() => document.querySelectorAll('dialog .ss-panel svg.ss-map.line .edges path.ln:not(.route)').length) === 7, '길 일곱 줄');
    check(await q(() => new Set([...document.querySelectorAll('dialog .ss-panel svg.ss-map.line .edges path.ln:not(.route)')].map(p => p.style.getPropertyValue('--c'))).size) >= 2, '노선이 둘 이상의 색으로 나뉨');
    check(await q(() => document.querySelectorAll('dialog .ss-panel svg.ss-map.line .edges path.ln.unk').length) === 1, '안 가 본 곳으로 가는 길은 점선');
    check(await q(() => [...document.querySelectorAll('dialog .ss-panel svg.ss-map.line .edges path.ln')].every(p => !/NaN|undefined/.test(p.getAttribute('d')))), '길 좌표에 NaN 없음');
    check(await q(() => document.querySelector('dialog .ss-panel svg.ss-map.line g.ln-n.here')?.dataset.arg) === '병원', '지금 있는 역에 표시');
    check(await q(() => document.querySelectorAll('dialog .ss-panel svg.ss-map.line g.ln-n.xfer').length) >= 1, '노선이 만나는 곳은 환승역 모양');
    check(await q(async () => { const { linePos } = await import('/ext/src/metro.js'); const m = linePos(new Map([['a', { x: 10, y: 10 }], ['b', { x: 11, y: 11 }], ['c', { x: 12, y: 9 }]])); return new Set([...m.values()].map(o => `${o.x},${o.y}`)).size; }) === 3, '가까운 장소들도 격자에서 겹치지 않음');
    // 가는 길
    await render({ place: '오두막' });
    check(await q(() => document.querySelectorAll('dialog .ss-panel svg.ss-map.line .edges path.ln.route').length) === 2, '고른 곳까지 가는 길(두 칸)이 강조됨');
    // 「현재 위치로」
    await render({});
    await click('[data-act="mapzoom"][data-arg="here"]');
    check(await q(async () => {
        const { linePos } = await import('/ext/src/metro.js'); const { layoutPlaces } = await import('/ext/src/views.js');
        const vb = document.querySelector('dialog .ss-panel svg.ss-map').getAttribute('viewBox').split(/\s+/).map(Number);
        const p = linePos(layoutPlaces(window.__SS_TEST__.api.app.current.state.data.map.places)).get('병원');
        return Math.abs(vb[0] + vb[2] / 2 - p.x) < 1 && Math.abs(vb[1] + vb[3] / 2 - p.y) < 1;
    }), '노선도 「현재 위치로」가 그 역을 가운데로');

    // 📍 인물 핀
    await render({});
    check(await q(() => !document.querySelector('dialog .ss-panel svg.ss-map .pins') && document.querySelectorAll('dialog .ss-panel .ss-mappins [data-act="mappin"]').length === 4), '처음엔 핀 없음 · 고를 인물 넷');
    for (const n of ['나', '로우', '사보', '떠돌이']) await click(`.ss-mappins [data-act="mappin"][data-arg="${n}"]`);
    const pinsOn = () => q(() => Object.fromEntries([...document.querySelectorAll('dialog .ss-panel svg.ss-map g.node')].filter(g => g.querySelector('.pins')).map(g => [g.dataset.arg, [...g.querySelectorAll('.pins text.pe')].map(t => t.textContent).join('')])));
    let pins = await pinsOn();
    check(Object.keys(pins).sort().join() === '병원,본부,오두막' && pins['오두막'] === '🐯', `나는 현재 위치 · 로우는 사는 곳(얼굴 이모지) · 사보는 본부에 (${JSON.stringify(pins)})`);
    check(await q(() => /위치 모름/.test(document.querySelector('dialog .ss-panel .ss-mappins [data-act="mappin"][data-arg="떠돌이"]').textContent)), '있는 곳을 모르는 인물은 「위치 모름」');
    check(await q(() => document.querySelector('dialog .ss-panel .ss-mappins').open), '고르는 동안 칸이 열려 있음');
    check(await q(async () => { const { getMeta } = await import('/ext/src/core.js'); return Object.keys(getMeta().mapPins).sort().join(); }) === '나,떠돌이,로우,사보', '고른 인물은 이 채팅 메타에');
    // 이모지 정하기 (✏️ → 고르는 창 · 시험대의 창은 적힌 값 그대로 「확인」을 누른다)
    await click('.ss-mappins [data-act="mappinemo"][data-arg="사보"]');
    check(await q(async () => { const { getMeta } = await import('/ext/src/core.js'); return getMeta().mapPins['사보']; }) === '', '✏️ 창을 그대로 닫으면 얼굴 이모지 그대로');
    await q(async () => { const { getMeta } = await import('/ext/src/core.js'); getMeta().mapPins['사보'] = '⭐'; }); await render({});
    pins = await pinsOn(); check(pins['본부'] === '⭐', '따로 정한 이모지가 지도에 뜸');
    await render({});
    await click('.ss-mappins [data-act="mappin"][data-arg="로우"]');
    check(!('오두막' in (await pinsOn())), '다시 누르면 핀이 꺼짐');
    const inj1 = await q(async () => { const x = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current, { full: true }); return [x.main, x.people, x.romance].join('\n'); });
    check(inj0 === inj1, '핀을 켜도 AI에게 가는 글은 글자 하나 안 바뀜');

    // 🎨 꾸미기: 역 모양 · 색 · 길 색(노선 전체) · 굵기 · 꺾는 모양 · 길 잇기/끊기 · 숨기기 · 역 끌어 옮기기 — 화면만 바뀌고 AI 글은 그대로 (길 잇기만 실제 지도에)
    await render({});
    await click('[data-act="mapedit"]');
    check(await q(() => !!document.querySelector('dialog .ss-panel svg.ss-map.line.edit') && !!document.querySelector('dialog .ss-panel .ss-maped')), '꾸미기 켜면 편집 칸');
    await click('svg.ss-map.line g.ln-n[data-name="시장"] .stn');
    check(await q(() => /시장/.test(document.querySelector('dialog .ss-panel .ss-maped b')?.textContent ?? '')), '역을 누르면 그 역 고침 칸');
    await click('.ss-maped [data-act="mapsty"][data-arg="shape:diamond"]');
    await click('.ss-maped [data-act="mapsty"][data-arg="c:#8b5bd6"]');
    check(await q(() => { const g = document.querySelector('dialog .ss-panel svg.ss-map g.ln-n[data-name="시장"]'); return g?.querySelector('polygon.stn') && g.style.getPropertyValue('--c') === '#8b5bd6'; }), '역 모양 → 마름모 · 색 바뀜');
    await q(() => { document.querySelector('dialog .ss-panel').querySelector('svg.ss-map .edges path.hit[data-arg="e:병원|산길"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await sleep(400);
    const lineN = await q(() => document.querySelector('dialog .ss-panel .ss-maped [data-act="mapscope"][data-arg="line"] small')?.textContent);
    await click('.ss-maped [data-act="mapsty"][data-arg="c:#16a3a8"]');
    await click('.ss-maped [data-act="mapsty"][data-arg="w:thick"]');
    check(await q(() => [...document.querySelectorAll('dialog .ss-panel svg.ss-map .edges path.ln[data-k]')].filter(p => p.style.getPropertyValue('--c') === '#16a3a8' && p.style.getPropertyValue('--w') === '2.8').length) === parseInt(lineN), `길 색 · 굵기가 노선 전체(${lineN})에`);
    await click('.ss-maped [data-act="mapsty"][data-arg="bend:curve"]');
    check(await q(() => /Q/.test(document.querySelector('dialog .ss-panel svg.ss-map .edges path.ln[data-k="병원|산길"]').getAttribute('d'))), '꺾는 모양 → 곡선');
    await click('.ss-maped [data-act="mapcut"]');
    check(await q(() => !window.__SS_TEST__.api.app.current.state.data.map.places.find(p => p.name === '병원').links.includes('산길')), '길 끊기 → 실제 지도에서 끊김');
    await click('svg.ss-map.line g.ln-n[data-name="병원"] .stn');
    await click('.ss-maped [data-act="maplink"][data-arg="산길"]');
    check(await q(() => { const P = window.__SS_TEST__.api.app.current.state.data.map.places; return P.find(p => p.name === '병원').links.includes('산길') && P.find(p => p.name === '산길').links.includes('병원'); }), '길 잇기 → 양쪽에 이어짐');
    const injL = await q(async () => { const x = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current, { full: true }); return [x.main, x.people, x.romance].join('\n'); });
    // 역 끌어 옮기기 (오두막)
    const mv = await q(() => { const g = document.querySelector('dialog .ss-panel svg.ss-map g.ln-n[data-name="오두막"] .stn'), r = g.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(mv.x, mv.y); await page.mouse.down(); await page.mouse.move(mv.x + 40, mv.y + 60, { steps: 6 }); await page.mouse.up(); await sleep(400);
    check(await q(async () => { const { getMeta } = await import('/ext/src/core.js'); const p = getMeta().mapStyle?.pos?.['오두막']; return !!p && p.x % 6 === 0 && p.y % 6 === 0; }), '역을 끌면 반 칸 격자에 맞춰 자리가 저장됨');
    await click('[data-act="mapedsel"][data-arg=""]');
    await click('.ss-maped [data-act="maphide"][data-arg="항구"]');
    check(await q(() => !document.querySelector('dialog .ss-panel svg.ss-map g.ln-n[data-name="항구"]')), '보일 장소에서 끄면 지도에서 숨김');
    await click('.ss-maped [data-act="maphide"][data-arg="병원"]');
    check(await q(() => !!document.querySelector('dialog .ss-panel svg.ss-map g.ln-n[data-name="병원"]')), '지금 있는 곳은 숨겨도 보임');
    await click('.ss-maped [data-act="maphide"][data-arg="병원"]');
    const inj2 = await q(async () => { const x = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current, { full: true }); return [x.main, x.people, x.romance].join('\n'); });
    check(inj2 === injL, '역 옮기기 · 숨기기는 AI에게 가는 글을 안 바꿈');
    await click('[data-act="mapedit"]');
    // 🚶 이동 모션: 노선을 따라 말이 움직이고, 끝나면 도착
    await render({ place: '오두막' });
    await q(() => { document.querySelector('dialog .ss-panel [data-act="travel"][data-arg="오두막"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await sleep(300);
    check(await q(() => !!document.querySelector('dialog .ss-panel svg.ss-map .mover') && window.__SS_TEST__.api.app.current.state.data.map.here === '병원'), '움직이는 동안 말이 보이고 아직 도착 전');
    await sleep(3200);
    check(await q(() => window.__SS_TEST__.api.app.current.state.data.map.here === '오두막' && !document.querySelector('dialog .ss-panel svg.ss-map .mover')), '다 움직이면 도착');
    await q(async () => { const core = await import('/ext/src/core.js'); core.settings().mapMotion = false; const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['loc', '병원']], label: 'back' }); });
    await render({ place: '산길' });
    await click('[data-act="travel"][data-arg="산길"]');
    check(await q(() => window.__SS_TEST__.api.app.current.state.data.map.here === '산길'), '「바로 이동」이면 곧장 도착');
    await q(async () => { const core = await import('/ext/src/core.js'); core.settings().mapMotion = true; const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['loc', '병원']], label: 'back' }); });

    // 🏢 건물을 누르면 정면도 — 모든 층이 한 장에
    await render({});
    await click('svg.ss-map.line g.ln-n[data-name="본부"] .stn');
    await sleep(300);
    check(await q(() => { const el = document.querySelector('dialog .ss-panel'); return !!el.querySelector('svg.ss-elev') && !el.querySelector('.ss-floorseg') && el.querySelectorAll('svg.ss-elev .lv').length === 4 && el.querySelectorAll('svg.ss-elev .rm').length === 8; }), '층 있는 역을 누르면 정면도 · 층 넷 · 방 여덟 (층 고르는 단추 없음)');
    check(await q(() => [...document.querySelectorAll('dialog .ss-panel svg.ss-elev .lv')].map(g => g.querySelector('text').textContent).join()) === '옥상,2층,1층,지하', '위층이 위 · 지하가 맨 아래');
    check(await q(() => !!document.querySelector('dialog .ss-panel svg.ss-elev .earth') && !!document.querySelector('dialog .ss-panel svg.ss-elev .rm.deck')), '지하는 땅 밑 · 옥상은 난간');
    check(await q(() => !document.querySelector('dialog .ss-panel svg.ss-elev .rm.can')), '그 건물에 없으면 방을 눌러도 안 바뀜');
    await click('[data-act="mapout"]');
    check(await q(() => !!document.querySelector('dialog .ss-panel svg.ss-map.line')), '「지도로」로 돌아옴');
    // 방 없이 「2층 병원」처럼 적은 층: 층 이름표 + 칸 안 글
    await render({ place: '병원', inside: '병원' });
    check(await q(() => { const el = document.querySelector('dialog .ss-panel'); return [...el.querySelectorAll('svg.ss-elev .lv text')].map(t => t.textContent).join() === '2층,1층' && [...el.querySelectorAll('svg.ss-elev .rm .nm')].map(t => t.textContent).join() === '병원,식당'; }), '「2층 병원」 → 이름표 2층 · 칸 병원');
    await click('svg.ss-elev .rm[data-arg="2층 병원"]');
    check(await q(() => window.__SS_TEST__.api.app.current.state.data.map.spot) === '2층 병원', '층을 누르면 spot = 「2층 병원」');
    await render({ place: '병원', inside: '병원' });
    check(await q(() => { const el = document.querySelector('dialog .ss-panel'); return el.querySelector('svg.ss-elev .lv.on text')?.textContent === '2층' && /지금 여기/.test(el.querySelector('svg.ss-elev .rm.on .here')?.textContent ?? ''); }), '지금 있는 층에 불 · 「지금 여기」');
    // 방이 많은 층 (일곱 넘으면 두 줄) · 층 하나짜리
    check(await q(async () => { const { elevSVG } = await import('/ext/src/metro.js'); const d = document.createElement('div'); d.innerHTML = elevSVG([{ name: '1층', rooms: 'abcdefghi'.split('').map(n => ({ name: n })) }]) + elevSVG([]); return d.querySelectorAll('.rm').length === 9 && !d.querySelector('.shaft') && !/NaN|undefined/.test(d.innerHTML); }), '방 아홉 · 층 하나 · 빈 목록도 안 깨짐');
    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
