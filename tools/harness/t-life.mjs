// 🍞 생활 틀 (v2.9): 욕구 게이지(저절로 줄기 · 단계 · 바닥) · 속도 · 미트볼 상점(효과 있는 물건) · 생활비 틀 · 👕 옷차림 보정 · 퀘스트 완료 확인
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const ev = (fn, arg) => page.evaluate(fn, arg);
const say = async (tag) => { await ev(() => window.__addUser('go')); await ev((t) => window.__addAI(`ok\n<meatball>\n${t}\n</meatball>`), tag); await sleep(300); };
const panel = (tab) => ev((tab) => { const a = window.__SS_TEST__.api.app; const el = document.querySelector('dialog .ss-panel'); el._ss.tab = tab; el._ss.mode = 'view'; el._ss.ui = {}; a.renderPanel(el); }, tab);
const bar = (kind) => ev(async (kind) => { const L = await import('/ext/src/life.js'); const st = window.__SS_TEST__.api.app.current.state.data.stats; const b = st.bars.find(x => L.kindOf(x.name) === kind); return b ? { ...b } : null; }, kind);
const stats = () => ev(() => JSON.parse(JSON.stringify(window.__SS_TEST__.api.app.current.state.data.stats)));
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'shop']);
    await say('cash: +1');
    const before = await stats();
    check(!before.tick && !before.bars.some(b => b.decay), '세트를 넣기 전: 욕구 규칙이 하나도 없다 (예전 그대로)');
    await ev(() => { window.__SS_TEST__.api.app.openSheet('stats'); }); await sleep(400);
    check(await ev(() => !document.querySelector('dialog [data-act="lifeset"]') && !!document.querySelector('dialog [data-act="lifetab"][data-arg="needs"]') && ![...document.querySelectorAll('dialog .ss-tabs button')].some(b => /욕구|옷차림/.test(b.textContent))), '처음엔 욕구 · 옷차림 탭이 없다 — 수치 탭에 「욕구 탭 켜기」만');
    await page.click('dialog [data-act="lifetab"][data-arg="needs"]'); await sleep(400);
    check(await ev(() => [...document.querySelectorAll('dialog .ss-tabs button')].some(b => /욕구/.test(b.textContent))), '켜면 「욕구」 탭이 생긴다 (이 채팅만)');
    await panel('needs'); await sleep(600); await panel('needs'); // 도트 인형 그림은 처음 그릴 때 불러온다
    check(await ev(() => document.querySelectorAll('dialog [data-act="lifeset"]').length === 4 && !!document.querySelector('dialog .ss-tama .ss-px img')), '욕구 탭: 다마고치 화면(도트 인형) · 추천 세트 4개');
    const dl = await ev(async () => { const D = await import('/ext/src/doll.js'); let bad = 0; for (const [kind, o] of Object.entries(D.SHAPES)) for (const id of Object.keys(o)) { try { if (!/data:image\/png/.test(D.dollSVG({}, [{ kind, shape: id, color: '#4a8fe2' }], 3))) bad++; } catch { bad++; } } for (const id of Object.keys(D.HAIRS)) { try { D.dollSVG({ hair: id }, [], 3); } catch { bad++; } } for (const id of Object.keys(D.FACES)) { try { D.dollSVG({ face: id }, [], 3); } catch { bad++; } }
        return { hairs: Object.keys(D.HAIRS).length, faces: Object.keys(D.FACES).length, kinds: Object.fromEntries(Object.entries(D.SHAPES).map(([k, o]) => [k, Object.keys(o).length])), bad, size: `${D.W}x${D.H}`, diff: D.dollSVG({}, [{ kind: 'top', shape: 'hoodie', color: '#4a8fe2' }], 3) !== D.dollSVG({}, [{ kind: 'top', shape: 'shirt', color: '#4a8fe2' }], 3), hurt: D.hurtParts(['왼팔 부상', 'Broken leg', '배고픔']).sort().join(), red: /ss-px-hurt/.test(D.dollSVG({}, [], 3, '', ['arms'])) && !/ss-px-hurt/.test(D.dollSVG({}, [], 3)) }; });
    check(dl.bad === 0 && dl.size === '32x42' && dl.diff && dl.hairs >= 20 && dl.faces >= 12 && Object.values(dl.kinds).every(n => n >= 18), '도트 인형(32×42): 머리 20+ · 표정 12+ · 옷 종류마다 18+ · 전부 그려지고 모양마다 그림이 다름', JSON.stringify(dl));
    check(dl.hurt === 'arms,legs' && dl.red, '「왼팔 부상」 · 「Broken leg」 → 팔 · 다리가 빨갛게 (배고픔은 아님)', JSON.stringify(dl));
    await page.click('dialog [data-act="lifeset"][data-arg="sims"]'); await sleep(500);
    const h0 = await bar('hunger'), hp0 = await bar('hp');
    check(h0 && h0.decay === 90 && h0.cur === 100 && /:/.test(h0.stages) && /-12$/.test(h0.zero ?? '') && !!(await bar('hygiene')) && !!(await bar('fun')), '심즈풍 세트: 허기 · 에너지 · 위생 · 재미 · 사교가 규칙과 함께 들어감', JSON.stringify(h0));
    check(hp0 && hp0.cur === before.bars.find(b => b.name === hp0.name).cur && !hp0.decay, '이미 있던 체력은 값 그대로');

    // 시간이 지나면 저절로 줄고 · 단계 상태가 붙고 · 칩이 뜬다
    await say('days: +1');
    const h1 = await bar('hunger'), s1 = await stats();
    check(h1.cur === 10, '하루가 지나면 허기 100 → 10 (하루 −90)', String(h1.cur));
    check(!!h1.stg && s1.conds.some(c => c.auto === h1.name && c.name === h1.stg), '단계가 바뀌면 상태에 한 줄 (그 게이지가 만든 것)', JSON.stringify(s1.conds));
    check((s1.nlog ?? []).some(x => x.b === h1.name && x.n === -90 && x.why === 'time'), '왜 줄었는지 기록 (시간 경과)');
    await panel('needs');
    const pn = await ev(() => { const L = document.querySelector('dialog .ss-life'); return L ? { tiles: L.querySelectorAll('.ss-nd').length, svg: L.querySelectorAll('.ss-nd svg').length, face: !!L.querySelector('.ss-face'), lets: L.querySelectorAll('.ss-mdl').length, low: L.querySelectorAll('.ss-nd.lv-low').length } : null; });
    check(pn && pn.tiles >= 5 && pn.svg === pn.tiles && pn.face && pn.lets >= 1 && pn.low >= 1, '생활 판: 욕구마다 그림 타일 · 기분 얼굴 · 상태 딱지 · 낮은 것은 빨강', JSON.stringify(pn));
    await ev((n) => { [...document.querySelectorAll('dialog .ss-nd')].find(b => b.dataset.arg === n).click(); }, h1.name); await sleep(250);
    check(await ev(() => /하루 −90/.test(document.querySelector('dialog .ss-nd-det .ss-need')?.textContent ?? '') && document.querySelectorAll('dialog .ss-nd-det [data-act="bar"]').length === 4), '타일을 누르면 자세히: 「하루 −90」 · 단계 · 직접 고치기');
    check(/Needs that change on their own[^\n]*:/.test(await ev(async () => { const E = await import('/ext/src/engine.js'); const st = window.__st.extensionSettings.statussim; const was = st.deltaMode; st.deltaMode = false; window.__SS_TEST__.api.refreshNow(); const out = E.buildInjection(window.__SS_TEST__.api.app.current).main; st.deltaMode = was; window.__SS_TEST__.api.refreshNow(); return out; })), 'AI에게: 시간이 지났다는 이유만으로 stat을 적지 말라는 한 줄 (전체 주입문)');
    // 바닥이면 체력이 깎인다
    await say('days: +1');
    const h2 = await bar('hunger'), hp2 = await bar('hp');
    check(h2.cur === 0 && hp2.cur === hp0.cur - 15, '바닥난 뒤의 시간만큼 체력이 깎인다 (허기 0.89일 × 12 + 에너지 0.75일 × 6 = 15)', `${h2.cur} / ${hp2.cur}`);
    // AI가 먹었다고 적으면 차고, 단계가 풀린다
    await say(`stat: ${h2.name} +80`);
    const h3 = await bar('hunger'), s3 = await stats();
    check(h3.cur === 80 && !h3.stg && !s3.conds.some(c => c.auto === h3.name), '먹으면 차고 단계 상태가 사라짐', JSON.stringify({ cur: h3.cur, stg: h3.stg }));
    // 속도
    await panel('needs'); await page.click('dialog [data-act="lifespeed"][data-arg="0.5"]'); await sleep(400);
    await say('days: +1');
    check((await bar('hunger')).cur === 35, '속도 ×0.5: 하루 −45 (80 → 35)', String((await bar('hunger')).cur));

    // 미트볼 상점: 효과가 붙은 물건 → 사서 사용
    await panel('shop'); await page.click('dialog [data-act="lifeshop"]'); await sleep(500);
    const shop = await ev(() => JSON.parse(JSON.stringify(window.__SS_TEST__.api.app.current.state.data.shop.shops[0])));
    const hn = (await bar('hunger')).name, food = shop.items.find(i => i.effect === `${hn} +25`);
    check(/미트볼|Meatball/.test(shop.name) && !!food && shop.items.length >= 6 && shop.items.every(i => i.price > 0 && i.effect), '미트볼 상점: 지금 게이지에 맞는 품목 · 값 · 효과', JSON.stringify(shop.items.map(i => i.effect)));
    await ev(async (t) => { const E = await import('/ext/src/engine.js'); await E.addAdjust({ ops: [['cash', '+100000']], silent: true, label: '' }); }, 0);
    await panel('needs'); await ev((n) => { [...document.querySelectorAll('dialog .ss-nd')].find(b => b.dataset.arg === n).click(); }, hn); await sleep(250);
    check(await ev(() => document.querySelectorAll('dialog .ss-nd-det [data-act="buy"]').length >= 1), '허기 타일을 열면 미트볼 상점 물건을 바로 살 수 있다');
    await panel('shop'); await sleep(200);
    const j = shop.items.indexOf(food);
    await ev((j) => { document.querySelector(`dialog [data-act="buy"][data-arg="0|${j}"]`)?.click(); }, j); await sleep(600);
    const it = await ev((n) => window.__SS_TEST__.api.app.current.state.data.wallet.items.find(i => i.name === n) ?? null, food.name);
    check(it && it.effect === food.effect, '산 물건에 효과가 붙어 온다', JSON.stringify(it));
    const hb = (await bar('hunger')).cur;
    await ev(async (n) => { const M = await import('/ext/src/money.js'); await M.MONEY_ACTIONS.useitem(document.querySelector('dialog .ss-panel'), n, null, window.__SS_TEST__.api.app.current.state); }, food.name); await sleep(400);
    check((await bar('hunger')).cur === hb + 25, '「사용」하면 허기 +25', `${hb} → ${(await bar('hunger')).cur}`);

    // 생활비 틀
    await panel('wallet'); await page.click('dialog [data-act="lifebills"]'); await sleep(500);
    const reg = await ev(() => window.__SS_TEST__.api.app.current.state.data.wallet.regular);
    check(reg.length >= 4 && reg.filter(r => r.amount < 0).length >= 4 && reg.some(r => r.every === 'month') && reg.some(r => r.every === 'week'), '생활비 틀: 월세 · 관리비 · 통신비 · 구독료가 정기 지출에', JSON.stringify(reg));

    // 👕 옷차림: 「허기 -50%」를 입으면 덜 준다
    await panel('wallet'); await page.click('dialog [data-act="lifetab"][data-arg="wear"]'); await sleep(900); await panel('wear'); await sleep(300);
    check(await ev(() => [...document.querySelectorAll('dialog .ss-tabs button')].some(b => /꾸미기/.test(b.textContent)) && !!document.querySelector('dialog .ss-px') && window.__st.extensionSettings.statussim.gearOn === true), '옷차림 탭을 켜면 탭이 생기고 옷 입히기도 같이 켜진다');
    check(await ev(() => document.querySelectorAll('dialog .ss-doll .ss-slot').length === 6 && !!document.querySelector('dialog .ss-doll .ss-px img')), '도트 인형 양옆에 칸 6개 (무기 · 겉옷 · 상의 · 하의 · 신발 · 장신구)');
    await ev(async (hn) => { const E = await import('/ext/src/engine.js'); await E.addAdjust({ ops: [['item', `+Lucky Apron 1| test | ${hn} -50%`], ['stat', `${hn} =100`]], silent: true, label: '' }); const A = await import('/ext/src/addons.js'); A.equip('상의', 'Lucky Apron'); await A.syncNeedMods(); }, hn); await sleep(400);
    check(Object.values((await stats()).mods ?? {})[0] === -50, '갈아입으면 욕구 보정이 상태에 적힌다', JSON.stringify((await stats()).mods));
    await panel('wallet');
    check(await ev(() => ![...document.querySelectorAll('dialog .ss-item-b b')].some(b => /Lucky Apron/.test(b.textContent))), '입은 물건은 소지품 목록에서 빠진다');
    const px = await ev(async () => { const L = await import('/ext/src/life.js'); const s = window.__SS_TEST__.api.app.current.state; const on = L.dollNow(s); const A = await import('/ext/src/addons.js'); A.unequip('상의'); const off = L.dollNow(s); A.equip('상의', 'Lucky Apron'); return on !== off; });
    check(px, '입으면 도트 인형의 그림이 달라진다');
    await panel('needs'); await page.click('dialog [data-act="lifespeed"][data-arg="1"]'); await sleep(400);
    await say('days: +1');
    check((await bar('hunger')).cur === 55, '입은 동안 허기가 절반만 준다 (100 → 55)', String((await bar('hunger')).cur));

    // 퀘스트: 단계가 남았는데 AI가 완료라고 적으면 확인 대기
    await ev(async () => { const E = await import('/ext/src/engine.js'); const s = window.__SS_TEST__.api.app.current.state; const nd = JSON.parse(JSON.stringify(s.data.quest)); nd.list = [{ id: 'qa', title: 'Parcel Run', giver: '', desc: '', place: '', deadline: '', reward: '', cash: 500, items: [], status: 'active', steps: [{ text: 'Pick it up', done: false }, { text: 'Bring it back', done: false }], paid: false }, { id: 'qb', title: 'No Steps', giver: '', desc: '', place: '', deadline: '', reward: '', cash: 70, items: [], status: 'active', steps: [], paid: false }]; await E.commit('quest', nd, ''); }); await sleep(300);
    const cash0 = await ev(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash);
    await say('quest: Parcel Run | done\nquest: No Steps | done');
    const q1 = await ev(() => { const d = window.__SS_TEST__.api.app.current.state.data; return { a: d.quest.list.find(q => q.id === 'qa'), b: d.quest.list.find(q => q.id === 'qb') ?? (d.quest.archive ?? []).find(q => q.id === 'qb'), cash: d.wallet.cash }; });
    check(q1.a.status === 'active' && q1.a.ask === true && !q1.a.paid && q1.cash === cash0 + 70, '단계가 남은 퀘스트: 완료되지 않고 확인 대기 · 보상 없음 (단계 없는 퀘스트는 예전대로 완료)', JSON.stringify({ a: q1.a.status, ask: q1.a.ask, cash: q1.cash - cash0 }));
    await panel('quest'); await sleep(200);
    check(await ev(() => !!document.querySelector('dialog .ss-qask [data-act="qasknot"]')), '퀘스트 카드에 「AI가 완료라고 적었어요」 · 「아직 아니에요」');
    await page.click('dialog .ss-qask [data-act="qasknot"]'); await sleep(400);
    check(await ev(() => { const q = window.__SS_TEST__.api.app.current.state.data.quest.list.find(q => q.id === 'qa'); return q.status === 'active' && !q.ask; }), '「아직 아니에요」 → 진행 중 그대로');
    // 옛 채팅(시작점이 안 적힌 것)은 예전처럼 바로 완료
    const old = await ev(async () => { const c = await import('/ext/src/core.js'); const m = c.getMeta(); const was = m.qAsk; delete m.qAsk; window.__SS_TEST__.api.refreshNow(); const q = window.__SS_TEST__.api.app.current.state.data.quest; const done = [...q.list, ...(q.archive ?? [])].find(x => x.id === 'qa')?.status; m.qAsk = was; window.__SS_TEST__.api.refreshNow(); return done; });
    check(old === 'done', '시작점이 없는 옛 채팅의 지난 답은 결과가 안 바뀐다 (바로 완료)', String(old));

    // 저절로 줄기 끄기
    await panel('needs'); await page.click('dialog [data-act="lifeoff"]'); await sleep(400);
    const off = await stats();
    check(!off.bars.some(b => b.decay || b.stages || b.zero) && !off.conds.some(c => c.auto) && off.bars.length === (await stats()).bars.length, '「저절로 줄기 끄기」: 규칙만 떼고 게이지는 남김');
    // 프로필 얼굴 단추
    await panel('profile');
    check(await ev(() => !!document.querySelector('dialog .ss-prof summary [data-act="relemoji"]')), '프로필 카드의 얼굴을 누르면 이모지를 바꿀 수 있다');

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
