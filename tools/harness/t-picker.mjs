// 🎛 기능 고르기 (관리 › 쓸 기능): 묶음 · 칸 카드의 토큰 어림 · 같이 켜면 좋은 칸 · 켠 칸 밑에만 딸린 옵션 · 꼭 필요한 칸 같이 켜기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate(() => window.__addUser('hi')); await page.evaluate(() => window.__addAI('a.\n<meatball>\ncash: +1\n</meatball>')); await sleep(200);
    await page.evaluate(async () => { const core = await import('/ext/src/core.js'); const S = core.settings(); S.mgTab = 'mods'; S.mgOpen = { 'mods-home': true, 'mods-me': true, 'mods-world': true, 'mods-people': true, 'mods-feed': true }; window.__SS_TEST__.api.app.openSheet('manage'); });
    await sleep(500);
    const Q = (fn, arg) => page.evaluate(fn, arg);
    const onMods = () => Q(async () => { const core = await import('/ext/src/core.js'); return core.MOD_IDS.filter(id => core.modOn(id)).sort().join(','); });
    check(await Q(() => { const el = document.querySelector('dialog .ss-mg[data-mg="mods"]'); return /켠 칸/.test(el.querySelector('.ss-pk-sum')?.textContent ?? '') && /토큰/.test(el.querySelector('.ss-pk-sum').textContent) && el.querySelectorAll('.ss-pk').length; }) === all.length, '칸마다 카드 하나 · 맨 위에 켠 칸 수와 토큰 어림');
    check(await Q(() => [...document.querySelectorAll('dialog .ss-pk .ss-pk-cost')].every(e => /토큰/.test(e.textContent)) && /\+\d+ 토큰/.test(document.querySelector('dialog .ss-pk[data-pk="rel"] .ss-pk-cost').textContent)), '칸마다 「안내 +N 토큰」');
    await Q(() => document.querySelector('dialog [data-act="pkset"][data-arg="rel"]').click()); await sleep(500);
    check(await onMods() === ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'sns', 'gossip', 'memo'].sort().join(','), '묶음 「관계 중심」 = 추천 6칸 + 연락 · SNS · 가십지 · 메모', await onMods());
    check(await Q(() => document.querySelector('dialog [data-act="pkset"][data-arg="rel"]').classList.contains('on')), '고른 묶음에 불');
    await Q(() => document.querySelector('dialog [data-act="modset"][data-arg="rec"]').click()); await sleep(500);
    check(await Q(() => { const c = document.querySelector('dialog .ss-pk[data-pk="contact"]'), r = document.querySelector('dialog .ss-pk[data-pk="rel"]'); return c.querySelector('.ss-pk-sub').hidden && !r.querySelector('.ss-pk-sub').hidden && !!c.querySelector('.ss-pk-sub [data-chg="setflag"][data-arg="groupChat"]') && !!r.querySelector('.ss-pk-sub [data-chg="setflag"][data-arg="pairAff"]'); }), '딸린 옵션은 켠 칸 밑에만 보임 (끈 칸은 숨김)');
    check(await Q(() => document.querySelectorAll('dialog .ss-mg[data-mg="mods"] [data-chg="setflag"]').length) >= 27 && await Q(() => { const ks = [...document.querySelectorAll('dialog .ss-mg[data-mg="mods"] [data-chg="setflag"]')].map(i => i.dataset.arg); return new Set(ks).size === ks.length; }), '부가 기능 스위치는 빠짐없이 · 겹치지 않게 한 번씩');
    // 같이 켜면: 꺼진 칸은 눌러서 켜는 단추
    check(await Q(() => !!document.querySelector('dialog .ss-pk[data-pk="rel"] .ss-pk-syn [data-act="pkon"][data-arg="contact"]') && !document.querySelector('dialog .ss-pk[data-pk="rel"] .ss-pk-syn [data-act="pkon"][data-arg="profile"]')), '「같이 켜면」: 꺼진 칸만 단추 (켠 칸은 ✔)');
    await Q(() => document.querySelector('dialog .ss-pk[data-pk="rel"] .ss-pk-syn [data-act="pkon"][data-arg="contact"]').click()); await sleep(500);
    check((await onMods()).split(',').includes('contact') && await Q(() => !document.querySelector('dialog .ss-pk[data-pk="contact"] .ss-pk-sub').hidden), '눌러서 켜면 그 칸의 딸린 옵션이 펼쳐짐');
    // 「같이 켜면」 문구: 운명 → 주사위(실제로 판정에 안 들어감) · SNS → 연락(「사람 묶음」이 아님)은 없다
    check(await Q(() => !document.querySelector('dialog .ss-pk[data-pk="fate"] .ss-pk-syn [data-arg="dice"]') && !document.querySelector('dialog .ss-pk[data-pk="sns"] .ss-pk-syn [data-arg="contact"]') && !/사람 묶음/.test(document.querySelector('dialog .ss-mg[data-mg="mods"]').textContent)), '「같이 켜면」에 틀린 이어짐이 없음');
    // 상점을 켜면 재산도
    await Q(async () => { const core = await import('/ext/src/core.js'); const m = core.getMeta(true); m.mods.wallet = false; m.mods.shop = false; await core.saveMeta(); const el = document.querySelector('dialog .ss-panel'); window.__SS_TEST__.api.app.renderPanel(el); }); await sleep(200);
    await Q(() => { const i = document.querySelector('dialog .ss-pk[data-pk="shop"] input[data-chg="mod"]'); i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(500);
    const afterShop = await onMods();
    check(['shop', 'wallet'].every(id => onModsHas(afterShop, id)), '상점을 켜면 꼭 필요한 재산도 같이 켜짐');
    // 달력 밑에 시간 적는 법 · 지도 밑에 보기 방식
    // 「가볍게 · 추천 6칸만」은 다른 묶음처럼 칸만 바꾼다 — 모든 채팅에 걸리는 선택 기능(새 지도 · 점집 …)은 그대로
    check(await Q(async () => { const S = (await import('/ext/src/core.js')).settings(); return S.mapMetro === true && S.fortuneTarot === true; }), '「가볍게」는 칸만 — 새 지도 · 점집 스위치는 그대로');
    // 딸린 옵션의 자리: 👕 옷차림 · 장비는 재산 밑 · 🕰 현실 시간 연동은 관계와 상관없어 「그 밖의 장치」 · 흥정 판정은 재산 · 상점 밑
    check(await Q(() => !!document.querySelector('dialog .ss-pk[data-pk="wallet"] [data-chg="setflag"][data-arg="gearOn"]') && !document.querySelector('dialog .ss-pk[data-pk="rel"] [data-arg="realGap"]') && !!document.querySelector('dialog .ss-mg[data-mg="mods"] [data-chg="setflag"][data-arg="realGap"]') && !document.querySelector('dialog .ss-pk[data-pk="stats"] [data-arg="extraJudge"]')), '옷차림은 재산 밑 · 현실 시간 연동은 그 밖의 장치 · 흥정 판정은 수치 밑에 없음');
    await Q(() => { const i = document.querySelector('dialog .ss-pk[data-pk="map"] input[data-chg="setflag"][data-arg="mapMetro"]'); i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(500);
    check(await Q(() => !!document.querySelector('dialog .ss-pk[data-pk="calendar"] .ss-pk-sub [data-act="clockstyle"][data-arg="24"]') && !!document.querySelector('dialog .ss-pk[data-pk="map"] .ss-pk-sub [data-act="mapmotion"][data-arg="off"]')), '달력 밑에 「시간 적는 법」 · 지도 밑에 「이동 모션」');
    await Q(() => document.querySelector('dialog .ss-pk[data-pk="calendar"] .ss-pk-sub [data-act="clockstyle"][data-arg="24"]').click()); await sleep(500);
    check(await Q(() => window.__SS_TEST__.api.app.current.state.data.calendar.clock) === '24', '여기서 고른 시간 적는 법이 달력에 반영');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 500));
} finally { await close(); }
function onModsHas(list, id) { return list.split(',').includes(id); }
