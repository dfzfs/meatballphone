// 🎮 게임 모드 · 🎨 인형 꾸미기 · 🖌 직접 그리기 — 화면에서 누르는 길을 끝까지 (v2.9)
import { open, makeStatus, check, sleep } from './lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { page, logs, close } = await open({ width: 420, height: 900, defaults: true });
const ev = (fn, a) => page.evaluate(fn, a);
const closeDialogs = async () => { for (let i = 0; i < 6; i++) { const n = await ev(() => { const d = [...document.querySelectorAll('dialog[open]')].at(-1); if (!d) return 0; (d.querySelector('.popup-button-ok') ?? d.querySelector('.popup-button-cancel'))?.click(); return 1; }); if (!n) break; await sleep(250); } };
const tab = (t) => ev((t) => { const a = window.__SS_TEST__.api.app; const p = document.querySelector('dialog .ss-panel'); p._ss.tab = t; p._ss.ui = {}; p._ss.mode = 'view'; a.renderPanel(p); }, t);
const act = (sel) => ev((sel) => { const b = document.querySelector(sel); if (!b) return false; b.click(); return true; }, sel);
const state = () => ev(async () => { const c = await import('/ext/src/core.js'); const s = window.__SS_TEST__.api.app.current?.state, m = c.getMeta(); return { mode: m?.mode, life: m?.life, doll: m?.doll, bars: (s?.data?.stats?.bars ?? []).map(b => [b.name, b.cur, b.decay ?? 0]), speed: s?.data?.stats?.speed, shops: (s?.data?.shop?.shops ?? []).map(x => [x.name, x.items.length, x.items[0]?.price]), bills: (s?.data?.wallet?.regular ?? []).filter(r => r.amount < 0).length, mods: c.MOD_IDS.filter(id => c.modOn(id)).join() }; });
try {
    // ── 1. 만들기 창에서 게임 모드를 골라 만든다 (생활 · 융합 · 아포칼립스) ──
    const made = {};
    for (const mode of ['fusion', 'apoc', 'life']) {
        await ev((m) => window.__changeChat(`mode-${m}`), mode); await sleep(300);
        await ev(async () => { const c = await import('/ext/src/core.js'); c.settings().genMode = 'tpl'; c.settings().themeAsked = true; c.saveSettings(); (await import('/ext/src/lazy.js')).openWizard(); }); await sleep(600);
        const has = await act(`dialog [data-w="start"] [data-v="${mode}"]`); await sleep(150);
        if (await ev(() => { const b = document.querySelector('dialog .ss-wz-more'); return !!b && b.offsetParent !== null; })) { await act('dialog .ss-wz-more'); await sleep(100); }
        await page.click('dialog .ss-w-go'); await sleep(600);
        await page.click('dialog .ss-w-apply button'); await sleep(1600);
        made[mode] = { has, ...(await state()) };
        await closeDialogs();
    }
    const nm = (m) => made[m].bars.map(b => `${b[0]}${b[2] ? `(${b[2]})` : ''}`).join(' ');
    check(made.life.has && made.life.mode === 'life' && made.life.life?.needs && made.life.life?.wear && made.life.bars.filter(b => b[2]).length >= 5 && made.life.shops.length >= 1 && made.life.bills >= 3, '만들기 창 › 생활: 욕구 게이지 5개+ · 미트볼 상점 · 생활비 · 욕구/옷차림 탭', JSON.stringify(made.life));
    check(made.fusion.mode === 'fusion' && made.fusion.bars.filter(b => b[2]).length >= 6 && ['수분', '체온'].every(n => made.fusion.bars.some(b => b[0] === n)) && made.fusion.bills >= 3, '만들기 창 › 융합: 수분 · 체온까지 · 생활비', nm('fusion'));
    check(made.apoc.mode === 'apoc' && made.apoc.speed === 1.5 && made.apoc.bills === 0 && made.apoc.shops.length >= 1, '만들기 창 › 아포칼립스: 속도 ×1.5 · 생활비 없음 · 상점 있음', JSON.stringify(made.apoc));
    const lifeP = made.life.shops[0]?.[2], apocP = made.apoc.shops[0]?.[2];
    check(lifeP > 0 && apocP >= lifeP * 2, `아포칼립스 상점이 더 비싸다 (${lifeP} → ${apocP})`);
    for (const m of ['life', 'fusion', 'apoc']) check(['stats', 'wallet', 'shop'].every(x => made[m].mods.split(',').includes(x)), `${m}: 수치 · 재산 · 상점 칸이 켜져 있다`, made[m].mods);

    // ── 2. 관리 탭에서 모드 바꾸기: 생활 → 롤플 (탭이 사라지고 게이지는 남는다) → 다시 생활 ──
    await ev(async () => { const L = await import('/ext/src/life.js'); await L.applyMode('rp'); }); await sleep(500);
    let st = await state();
    check(st.mode === 'rp' && !st.life?.needs && !st.life?.wear && st.bars.length >= 5, '롤플로 바꾸면 욕구 · 옷차림 탭만 꺼지고 게이지는 그대로', JSON.stringify(st.life));
    await ev(async () => { const L = await import('/ext/src/life.js'); await L.applyMode('life'); }); await sleep(900);
    const st2 = await state();
    check(st2.life?.needs && st2.bars.length === st.bars.length && st2.shops.length === st.shops.length && st2.bills === st.bills, '다시 생활: 게이지 · 상점 · 생활비가 두 번 들어가지 않는다', JSON.stringify([st.bars.length, st2.bars.length, st.shops.length, st2.shops.length, st.bills, st2.bills]));

    // ── 3. 옷차림 탭: 꾸미기 값 ──
    await ev(() => window.__addUser('hi')); await ev(() => window.__addAI('x\n<meatball>\ncash: +50000\nitem: +Blue Sweater 1| warm\nitem: +Straw Hat 1| worn hat\n</meatball>')); await sleep(500);
    await ev(async () => { const A = await import('/ext/src/addons.js'); A.equip('상의', 'Blue Sweater'); A.equip('장신구', 'Straw Hat'); }); await sleep(300);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('wear'); }); await sleep(700);
    await tab('wear'); await sleep(600); await tab('wear'); await sleep(300);
    const src = () => ev(() => document.querySelector('dialog .ss-doll-stage .ss-px img')?.src ?? '');
    await ev(async () => { const c = await import('/ext/src/core.js'); (c.getMeta(true).doll ??= {}).face = 'smile'; await c.saveMeta(); window.__SS_TEST__.api.app.rerenderPanels(true); }); await sleep(400);
    const s0 = await src(); const diffs = [];
    for (const arg of ['shape:round', 'shape:box', 'eyes:big', 'eyes:dot', 'body:short', 'body:tall', 'line:soft', 'line:hard', 'eye:#3a6fd6', 'skin:#bd8558']) {
        const before = await src(); await act(`dialog [data-act="dolllook"][data-arg="${arg}"]`); await sleep(350); const after = await src();
        if (!after || after === before) diffs.push(arg);
    }
    check(s0.startsWith('data:image/png') && !diffs.length, '얼굴형 · 눈 모양 · 몸 길이 · 테두리 · 눈/피부/머리 색: 누를 때마다 인형 그림이 바뀐다', diffs.join(','));
    // 아무 색: 기기의 색 고르는 창 (값을 넣고 change)
    const anyColor = async (arg, v) => { const ok = await ev(([arg, v]) => { const i = [...document.querySelectorAll('dialog input[type=color][data-dollcolor]')].find(n => n.dataset.dollcolor === arg); if (!i) return false; i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); return true; }, [arg, v]); await sleep(400); return ok; };
    let b4 = await src(); const okA = await anyColor('look:hairColor', '#12ab9c');
    st = await state();
    check(okA && st.doll.hairColor === '#12ab9c' && (await src()) !== b4, '아무 색: 머리 색을 목록에 없는 색으로', JSON.stringify(st.doll.hairColor));
    check(await ev(() => !!document.querySelector('dialog .ss-sw.on[data-arg="hairColor:#12ab9c"]')), '고른 색이 칸으로 보인다 (켜짐)');
    b4 = await src(); const okB = await anyColor('item:Blue Sweater|color', '#ff00aa'); const okC = await anyColor('item:Blue Sweater|accent', '#00ff66');
    st = await state();
    const lk = st.doll.looks?.['blue sweater'] ?? Object.values(st.doll.looks ?? {})[0];
    check(okB && okC && lk?.color === '#ff00aa' && lk?.accent === '#00ff66' && (await src()) !== b4, '아무 색: 옷 색 · 포인트 색', JSON.stringify(st.doll.looks));
    await act('dialog [data-act="dollitem"][data-arg="Blue Sweater|accent:"]'); await sleep(350);
    st = await state();
    check(!(st.doll.looks?.['blue sweater'] ?? Object.values(st.doll.looks ?? {})[0])?.accent, '포인트 색 「기본으로」');

    // ── 4. 직접 그리기 ──
    const openEd = async (arg) => { await act(`dialog [data-act="dollart"][data-arg="${arg}"]`); await sleep(900); await ev(() => { const d = [...document.querySelectorAll('dialog')].at(-1); d.style.cssText += ';max-width:420px;width:420px;margin:0;left:0;top:0;position:fixed'; }); await sleep(150); };
    const paintAt = async (pts) => { const cv = await page.$('.ss-de canvas'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox(); const at = (x, y) => [bb.x + (x + .5) / 32 * bb.width, bb.y + (y + .5) / 42 * bb.height]; await page.mouse.move(...at(...pts[0])); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(...at(...p)); await page.mouse.up(); await sleep(100); };
    const lib = () => ev(() => Object.entries(window.__st.extensionSettings.statussim.dollArt ?? {}).map(([id, a]) => ({ id, n: a.n, kind: a.kind, rev: a.rev, cells: a.px.match(/../g).filter(t => t !== '..').length, pal: a.pal.length })));
    await openEd('new:acc');
    check(await ev(() => !!document.querySelector('.ss-de canvas') && !!document.querySelector('.ss-de .ss-de-ghost img')), '편집 창: 칸 + 밑에 깔린 인형');
    await paintAt([[4, 3], [5, 3], [6, 3]]);                                   // 찍기 3칸
    await act('.ss-de [data-de="mirror"]'); await paintAt([[10, 1]]);          // 좌우 같이 → 2칸
    await act('.ss-de [data-de="mirror"]');
    await act('.ss-de [data-de="tool:erase"]'); await paintAt([[4, 3]]);       // 지우기 1칸
    await act('.ss-de [data-de="tool:pen"]'); await paintAt([[20, 20]]); await act('.ss-de [data-de="undo"]'); // 찍고 되돌리기
    await ev(() => { document.querySelector('.ss-de .ss-de-name input').value = '별 머리핀'; });
    await act('.ss-de [data-de="export"]'); const code = await ev(() => document.querySelector('.ss-de textarea').value);
    await act('.ss-de [data-choice="save"]'); await sleep(700);
    let L = await lib(); st = await state();
    check(L.length === 1 && L[0].n === '별 머리핀' && L[0].kind === 'acc' && L[0].cells === 4 && L[0].rev === 1, '찍기 · 좌우 같이 · 지우기 · 되돌리기 → 4칸이 저장된다', JSON.stringify(L));
    check(st.doll.art?.acc === L[0].id, '새로 그린 것은 바로 쓰는 중이 된다');
    await tab('wear'); await sleep(500);
    const withArt = await src();
    check(await ev(() => !!document.querySelector('dialog .ss-art .ss-art-th')?.src.startsWith('data:image/png') && /쓰는 중/.test(document.querySelector('dialog .ss-art')?.textContent ?? '')), '목록에 작은 그림 · 「쓰는 중」');
    await act(`dialog [data-act="dollart"][data-arg="use:${L[0].id}"]`); await sleep(500);
    const noArt = await src(); st = await state();
    check(!st.doll.art?.acc && noArt !== withArt, '「빼기」: 원래 장신구(밀짚모자) 그림으로 돌아온다');
    await act(`dialog [data-act="dollart"][data-arg="use:${L[0].id}"]`); await sleep(500);
    check((await src()) === withArt, '다시 「쓰기」');
    // 고치기: 채우기로 넓게 → rev 올라가고 그림이 바뀐다
    await openEd(`edit:${L[0].id}`);
    check(await ev(() => document.querySelector('.ss-de .ss-de-name input').value === '별 머리핀'), '고치기: 이름 · 그림이 그대로 열린다');
    await act('.ss-de [data-de="clear"]'); await act('.ss-de [data-de="color:#4a8fe2"]'); await paintAt([[2, 2], [8, 2]]);
    await act('.ss-de [data-choice="save"]'); await sleep(700);
    L = await lib();
    check(L.length === 1 && L[0].rev === 2 && L[0].cells === 7 && (await src()) !== withArt, '고친 뒤: 같은 그림이 바뀌고(새로 안 생김) 인형도 바로 바뀐다', JSON.stringify(L));
    // 닫기만 하면 저장 안 됨
    await openEd('new:over'); await paintAt([[3, 30], [6, 30]]); await ev(() => [...document.querySelectorAll('dialog[open]')].at(-1).querySelector('.popup-button-ok').click()); await sleep(400);
    check((await lib()).length === 1, '저장을 안 누르고 닫으면 안 생긴다');
    // 코드 불러오기 (다른 종류로) · 잘못된 코드
    await openEd('new:over');
    await ev(() => { document.querySelector('.ss-de textarea').value = '이건 코드가 아님'; }); await act('.ss-de [data-de="import"]');
    const badMsg = await ev(() => document.querySelector('.ss-de textarea').placeholder);
    await ev((code) => { document.querySelector('.ss-de textarea').value = code; }, code); await act('.ss-de [data-de="import"]'); await sleep(100);
    await act('.ss-de [data-choice="save"]'); await sleep(700);
    L = await lib();
    check(/읽지 못했/.test(badMsg) && L.length === 2 && L[1].kind === 'over' && L[1].cells === 4 && L[1].n === '별 머리핀', '코드 불러오기: 잘못된 코드는 알려 주고 · 맞는 코드는 그림이 들어온다', JSON.stringify(L));
    // 그림 파일 올려서 칸으로 옮기기
    const png = path.join(os.tmpdir(), 'ss-art-test.png');
    fs.writeFileSync(png, Buffer.from(await ev(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 84; const x = c.getContext('2d'); x.fillStyle = '#ff0000'; x.fillRect(16, 20, 32, 40); return c.toDataURL('image/png').split(',')[1]; }), 'base64'));
    await openEd('new:top');
    await (await page.$('.ss-de input[type=file]')).setInputFiles(png); await sleep(500);
    await act('.ss-de [data-choice="save"]'); await sleep(700);
    L = await lib();
    check(L.length === 3 && L[2].kind === 'top' && L[2].cells > 200 && L[2].pal <= 3, '그림 파일 → 칸으로 옮겨진다 (64×84 → 32×42)', JSON.stringify([L.length, L[2]]));
    // 지우기
    await tab('wear'); await sleep(400);
    await act(`dialog [data-act="dollart"][data-arg="del:${L[2].id}"]`); await sleep(500);
    st = await state();
    check((await lib()).length === 2 && !st.doll.art?.top, '지우면 목록에서 빠지고 · 쓰던 칸도 비워진다');
    // 다른 채팅에서도 목록에 보인다 (쓰는 중은 아님)
    await closeDialogs();
    await ev(() => window.__changeChat('other')); await sleep(500);
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'shop']);
    await ev(async () => { const L = await import('/ext/src/life.js'); await L.applyMode('life'); }); await sleep(900);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('wear'); }); await sleep(700); await tab('wear'); await sleep(600); await tab('wear'); await sleep(300);
    check(await ev(() => document.querySelectorAll('dialog .ss-art').length === 2 && !/쓰는 중/.test(document.querySelector('dialog .ss-body').textContent)), '다른 채팅: 그린 것 2개가 목록에 있고 쓰는 중은 아니다');

    // ── 5. 인형 통째로 내 그림 ──
    await (await page.$('dialog input[data-dollimg]')).setInputFiles(png); await sleep(700);
    st = await state();
    check(String(st.doll?.img ?? '').startsWith('data:image/') && await ev(() => !!document.querySelector('dialog .ss-doll-stage .ss-px-own img, dialog .ss-wear-top .ss-px-own img')), '그림 올리기: 인형 자리에 내 그림이 보인다');
    await tab('needs'); await sleep(500);
    check(await ev(() => !!document.querySelector('dialog .ss-tama .ss-px-own img')), '욕구 탭(다마고치 화면)에도 내 그림');
    await tab('wear'); await sleep(400);
    await act('dialog [data-act="dollimg"][data-arg="off"]'); await sleep(500);
    st = await state();
    check(!st.doll?.img && await ev(() => !document.querySelector('dialog .ss-px-own')), '「도트 인형으로 돌아가기」');

    // ── 6. 「보일 것」 스위치: 욕구 · 옷차림 탭에서도 켜고 끄기 ──
    const parts = {};
    for (const t of ['needs', 'wear']) {
        await tab(t); await sleep(400);
        parts[t] = await ev((t) => {
            const el = document.querySelector('dialog .ss-panel'), bar = el.querySelector('.ss-body > .ss-partbar'); if (!bar) return { bar: false };
            const hidden = (n) => n.offsetParent === null || getComputedStyle(n).display === 'none';
            const keys = [...bar.querySelectorAll('[data-act="partshow"]')].map(b => b.dataset.arg).filter(k => !k.startsWith('__'));
            const secs = () => [...el.querySelectorAll('.ss-body .ss-sec')].filter(n => !hidden(n)).length;
            const a = secs(); bar.querySelector('[data-arg="__none"]').click(); const b = secs();
            const off = (window.__st.extensionSettings.statussim.partsOff?.[t] ?? []).length;
            el.querySelector('.ss-partbar [data-arg="__all"]').click(); const c = secs();
            return { bar: true, keys: keys.length, a, b, c, off, left: !!window.__st.extensionSettings.statussim.partsOff?.[t] };
        }, t);
    }
    for (const t of ['needs', 'wear']) check(parts[t].bar && parts[t].keys > 0 && parts[t].off === parts[t].keys && parts[t].b < parts[t].a && parts[t].c === parts[t].a && !parts[t].left, `${t} 탭: 다 끄기 → 구역이 숨고 · 다 보기 → 돌아온다`, JSON.stringify(parts[t]));

    // ── 7. 입은 물건이 없어지면 저절로 벗겨진다 · 탭을 끄면 탭이 사라진다 ──
    await closeDialogs();
    await ev(() => window.__addUser('hi')); await ev(() => window.__addAI('x\n<meatball>\nitem: +Blue Sweater 1| warm\nitem: +Straw Hat 1| worn hat\n</meatball>')); await sleep(500);
    await ev(async () => { const A = await import('/ext/src/addons.js'); A.equip('상의', 'Blue Sweater'); A.equip('장신구', 'Straw Hat'); }); await sleep(300);
    await ev(() => window.__addUser('2')); await ev(() => window.__addAI('x\n<meatball>\nitem: -Straw Hat 1\n</meatball>')); await sleep(600);
    const worn = await ev(async () => { const A = await import('/ext/src/addons.js'); return A.equipped(window.__SS_TEST__.api.app.current.state).map(e => e.name).join(); });
    check(worn === 'Blue Sweater', '밀짚모자가 소지품에서 없어지면 저절로 벗겨진다', worn);
    await ev(() => { window.__SS_TEST__.api.app.openSheet('wear'); }); await sleep(700);
    const tabs1 = await ev(() => [...document.querySelectorAll('dialog .ss-tabs button')].map(b => b.textContent.trim()).join('|'));
    await ev(async () => { const L = await import('/ext/src/life.js'); await L.LIFE_ACTIONS.lifetab(document.querySelector('dialog .ss-panel'), 'wear'); }); await sleep(600); await tab('profile'); await sleep(300);
    const tabs2 = await ev(() => [...document.querySelectorAll('dialog .ss-tabs button')].map(b => b.textContent.trim()).join('|'));
    check(/옷차림/.test(tabs1) && !/옷차림/.test(tabs2) && /욕구/.test(tabs2), '옷차림 탭만 끄기: 탭이 사라지고 욕구 탭은 남는다', `${tabs1} → ${tabs2}`);
    await closeDialogs();

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
