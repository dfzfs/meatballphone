// 🎛 v2.9 새 화면은 기본 끔: 점집(타로 · 수정구슬 · 무당) · 새 지도 — 끈 채로는 2.8과 같은 화면, 관리 › 쓸 기능의 칸 밑에서 하나씩 켠다
//   + v2.9 설정이 전부 쓸 기능에 있는지 (속마음 · 만들기 재료 · 숨긴 답 · 지우기 확인 · 뒤로 가기 · 간섭 차단 · 생활 연출)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ defaults: true });
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'fate']);
    const Q = (fn, arg) => page.evaluate(fn, arg);
    const S = () => Q(async () => { const c = await import('/ext/src/core.js'); const s = c.settings(); return { t: s.fortuneTarot, o: s.fortuneOrb, sh: s.fortuneShaman, m: s.mapMetro }; });
    const openTab = async (tab) => { await Q(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await Q((t) => { window.__SS_TEST__.api.app.openSheet(t); }, tab); await sleep(500); };
    const P = 'dialog[open] .ss-panel';
    check(JSON.stringify(await S()) === JSON.stringify({ t: false, o: false, sh: false, m: false }), '점집 셋 · 새 지도는 기본 끔', JSON.stringify(await S()));

    // 끈 채로: 예전 지도 · 점집 없음 · 본거지 집 안 그림 없음
    await openTab('map');
    check(await Q((p) => !!document.querySelector(`${p} svg.ss-map`) && !document.querySelector(`${p} svg.ss-map.line`) && !!document.querySelector(`${p} svg.ss-map .node`), P), '새 지도를 끄면 예전 지도 (점과 선 · 노선도 아님)');
    await Q((p) => document.querySelector(`${p} [data-act="mapzoom"][data-arg="here"]`)?.click(), P); await sleep(300);
    check(await Q((p) => !!document.querySelector(`${p} svg.ss-map`), P), '예전 지도에서 「현재 위치로」도 동작');
    await openTab('fate');
    check(await Q((p) => !!document.querySelector(`${p}`) && !document.querySelector(`${p} .ss-ft`), P), '점쟁이를 하나도 안 켜면 운명 탭에 점집이 없음');

    // 관리 › 쓸 기능: 칸 밑에 스위치가 다 있다
    await Q(async () => { const c = await import('/ext/src/core.js'); c.settings().mgTab = 'mods'; });
    await openTab('manage');
    const has = (sel) => Q((x) => !!document.querySelector(x), `${P} [data-mg="mods"] ${sel}`);
    check(await has('[data-pk="fate"] input[data-chg="setflag"][data-arg="fortuneTarot"]') && await has('[data-pk="fate"] input[data-arg="fortuneOrb"]') && await has('[data-pk="fate"] input[data-arg="fortuneShaman"]'), '쓸 기능 › 운명 칸 밑에 점집 셋 (타로 · 수정구슬 · 무당 · 굿) 따로');
    check(await has('[data-pk="map"] input[data-chg="setflag"][data-arg="mapMetro"]'), '쓸 기능 › 지도 칸 밑에 「새 지도」');
    check(!(await has('[data-pk="map"] [data-act="mapmotion"]')), '새 지도를 끈 동안엔 「이동 모션」을 안 보임 (예전 지도엔 없는 것)');
    check(await has('[data-pk="profile"] [data-act="mindset"][data-arg="mode:thought"]'), '쓸 기능 › 프로필 칸 밑에 💭 속마음');
    for (const k of ['autoStart', 'genRead', 'genReadCap', 'genNote', 'hideSkip', 'askDelete', 'backClose', 'guardData', 'guardLook']) check(await has(`[data-chg="setopt"][data-arg="${k}"]`), `쓸 기능 맨 아래 공통 설정에 ${k}`);
    check(await has('[data-act="lifemode"][data-arg="life"]') && await has('[data-act="lifetab"][data-arg="wear"]'), '쓸 기능 맨 위에 게임 모드 · 욕구/꾸미기 탭');

    // 하나씩 켜기: 타로만 → 점집에 타로만 · 굿 없음
    const flip = (k) => Q(({ p, k }) => { const i = document.querySelector(`${p} input[data-chg="setflag"][data-arg="${k}"]`); i.checked = !i.checked; i.dispatchEvent(new Event('change', { bubbles: true })); }, { p: P, k });
    await flip('fortuneTarot'); await sleep(300);
    check(await Q(async () => (await import('/ext/src/core.js')).settings().fortuneTarot === true && !!document.querySelector('#ss-settings [data-s="fortuneTarot"]')?.checked), '쓸 기능에서 켜면 설정 · 확장 설정 서랍의 같은 칸도 켜짐');
    await openTab('fate');
    const ft = () => Q((p) => ({ on: !!document.querySelector(`${p} .ss-ft`), m: [...document.querySelectorAll(`${p} [data-act="ftm"]`)].map(b => b.dataset.arg).join(','), gut: !!document.querySelector(`${p} .ss-ft-gut`) }), P);
    let f = await ft();
    check(f.on && (f.m === 'tarot' || f.m === '') && !f.gut, '타로만 켜면 점집에 타로만 · 굿 없음', JSON.stringify(f));
    // 무당까지 → 굿이 생김
    await Q(async () => { const c = await import('/ext/src/core.js'); c.settings().fortuneShaman = true; c.saveSettings(); });
    await openTab('fate'); f = await ft();
    check(f.on && /shaman/.test(f.m) && !/orb/.test(f.m) && f.gut, '무당을 켜면 무당 · 굿이 생기고 수정구슬은 여전히 없음', JSON.stringify(f));
    // 꺼 둔 점쟁이로는 점을 못 봄 (화면을 거치지 않고 눌러도)
    await Q(async () => { const c = await import('/ext/src/core.js'); c.settings().fortuneTarot = false; c.settings().fortuneShaman = false; c.saveSettings(); });
    await openTab('fate');
    check(!(await ft()).on, '다시 다 끄면 점집이 사라짐 (지난 점괘 기록은 남음)');

    // 새 지도 켜기 → 노선도
    await Q(async () => { const c = await import('/ext/src/core.js'); c.settings().mgTab = 'mods'; }); await openTab('manage');
    await flip('mapMetro'); await sleep(300);
    check(await has('[data-pk="map"] [data-act="mapmotion"]'), '새 지도를 켜면 지도 칸 밑에 「이동 모션」');
    await openTab('map');
    check(await Q((p) => !!document.querySelector(`${p} svg.ss-map.line`), P), '새 지도를 켜면 노선도');

    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
