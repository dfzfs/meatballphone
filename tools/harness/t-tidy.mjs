// 🧹 기능 정리: 쓸 것만 남기고 나머지는 숨김 — 모든 채팅에서 꺼지고 관리 창 · 설정 서랍 · 스타일 고르기에도 안 보임 · 지우지 않음 · 다시 꺼내면 돌아옴
//   · 업데이트로 받은 사람에게 한 번 저절로 (닫으면 아무것도 안 바뀜) · 새로 설치한 사람에겐 안 뜸
import { open, makeStatus, sleep, check } from './lib.mjs';
const sorted = (a) => [...a].sort().join(',');
const MINE = ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'memo'];
{
    const { page, logs, close } = await open();
    const Q = (fn, arg) => page.evaluate(fn, arg);
    try {
        await makeStatus(page, MINE);
        await Q(async () => { const core = await import('/ext/src/core.js'); Object.assign(core.settings(), { relRace: true, loopMode: false, fortuneTarot: true }); core.saveSettings(); });
        await Q(async () => { (await import('/ext/src/stylepick.js')).openTidy({ why: 'again' }); }); await sleep(400);
        const box = () => Q(() => !!document.querySelector('dialog[open] .ss-tidy'));
        check(await box(), '기능 정리 창이 열림');
        const st0 = await Q(() => { const on = (k) => document.querySelector(`dialog[open] .ss-tidy [data-td="${k}"]`)?.checked; return { quest: on('mods:quest'), shop: on('mods:shop'), sns: on('mods:sns'), relRace: on('flags:relRace'), loop: on('flags:loopMode'), guide: on('flags:guideOn'), tarot: on('flags:fortuneTarot') }; });
        check(st0.quest && !st0.shop && !st0.sns, '처음엔 지금 쓰는 칸만 골라져 있음 (퀘스트 ✓ · 상점 · SNS ✗)', JSON.stringify(st0));
        check(st0.relRace && st0.guide && !st0.loop, '부가 기능도 지금 켜 둔 것만 (루트 비교 · 공략 ✓ · 회귀자 ✗)', JSON.stringify(st0));
        check(await Q(() => /쓰는 중/.test(document.querySelector('dialog[open] .ss-tidy [data-td="mods:quest"]')?.closest('label')?.textContent ?? '')), '쓰는 것엔 「쓰는 중」 표시');
        // 언젠가 쓸 것: 상점은 남기고 · 쓰던 점집 타로는 빼기
        await Q(() => { for (const [k, v] of [['mods:shop', true], ['flags:fortuneTarot', false]]) { const i = document.querySelector(`dialog[open] .ss-tidy [data-td="${k}"]`); i.checked = v; i.dispatchEvent(new Event('change', { bubbles: true })); } });
        check(await Q(() => /남기고 \d+개 숨기기/.test(document.querySelector('dialog[open] .ss-tidy [data-choice="go"]')?.textContent ?? '')), '단추에 남기는 수 · 숨기는 수');
        await Q(() => document.querySelector('dialog[open] .ss-tidy [data-choice="go"]').click()); await sleep(800);
        const r = await Q(async () => { const core = await import('/ext/src/core.js'); const t = core.settings().tidy; const m = core.getMeta(true); m.mods.sns = true; await core.saveMeta(); return { mods: t?.mods ?? [], flags: t?.flags ?? [], tarot: core.settings().fortuneTarot, snsOn: core.modOn('sns'), questOn: core.modOn('quest'), shopHidden: t?.mods?.includes('shop') }; });
        check(r.mods.includes('sns') && r.mods.includes('news') && !r.shopHidden && !r.mods.includes('quest'), '고르지 않은 칸만 숨김 (남긴 상점은 안 숨김)', JSON.stringify(r.mods));
        check(r.flags.includes('fortuneTarot') && r.flags.includes('loopMode') && r.tarot === false, '뺀 부가 기능은 꺼지고 숨김', JSON.stringify(r));
        check(!r.snsOn && r.questOn, '숨긴 칸은 채팅에서 켜 둬도 꺼진 것과 같음');
        // 관리 › 쓸 기능 목록에서 안 보임 · 단추에 숨김 수
        await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().mgTab = 'mods'; core.settings().mgOpen = { 'mods-people': true, 'mods-feed': true, 'mods-world': true, 'mods-life': true, 'mods-play': true, 'ex-rest': true }; window.__SS_TEST__.api.app.openSheet('manage'); }); await sleep(500);
        const v = await Q(() => { const S = document.querySelector('dialog .ss-mg[data-mg="mods"]'); return { sns: !!S?.querySelector('[data-pk="sns"]'), quest: !!S?.querySelector('[data-pk="quest"]'), loop: !!S?.querySelector('[data-chg="setflag"][data-arg="loopMode"]'), relRace: !!S?.querySelector('[data-arg="relRace"]'), badge: S?.querySelector('[data-act="tidy"] em')?.textContent ?? '' }; });
        check(!v.sns && v.quest, '관리 › 쓸 기능: 숨긴 칸은 목록에 없음', JSON.stringify(v));
        check(!v.loop, '관리 › 쓸 기능: 숨긴 부가 기능도 없음', JSON.stringify(v));
        check(/숨김 \d+/.test(v.badge), '「🧹 기능 정리」 단추에 숨김 수', v.badge);
        check(await Q(() => { const i = document.querySelector('#ss-settings input[data-s="loopMode"]'); return !i || getComputedStyle(i.closest('label')).display === 'none'; }), '확장 설정 서랍의 체크 칸도 안 보임');
        // 스타일 고르기: 숨긴 칸 · 기능은 안 나오고 안 켜짐
        await Q(async () => { (await import('/ext/src/stylepick.js')).openStylePick({ why: 'again' }); }); await sleep(300);
        await Q(() => { document.querySelector('dialog[open] .ss-stylepick [data-sp-g="romance"]').click(); }); await sleep(100);
        await Q(() => { document.querySelector('dialog[open] .ss-stylepick [data-sp-f="regress"]').click(); }); await sleep(100);
        check(await Q(() => !document.querySelector('dialog[open] .ss-stylepick [data-sp-off="flag:loopMode"]') && !!document.querySelector('dialog[open] .ss-stylepick [data-sp-off="mod:quest"]')), '스타일 고르기에도 숨긴 기능은 안 나옴');
        await Q(() => document.querySelector('dialog[open] .ss-stylepick [data-choice="go"]').click()); await sleep(1200);
        check(await Q(async () => (await import('/ext/src/core.js')).settings().loopMode !== true), '스타일을 골라도 숨긴 기능은 안 켜짐');
        // 지우지 않음: 다시 꺼내면 그대로
        await Q(async () => { const core = await import('/ext/src/core.js'); const m = core.getMeta(true); m.mods.quest = false; m.mods.sns = true; await core.saveMeta(); });
        await Q(async () => { (await import('/ext/src/stylepick.js')).openTidy({ why: 'again' }); }); await sleep(400);
        check(await Q(() => !document.querySelector('dialog[open] .ss-tidy [data-td="mods:sns"]').checked && document.querySelector('dialog[open] .ss-tidy [data-td="mods:shop"]').checked), '다시 열면 지금 보이는 것 = 골라짐');
        await Q(() => { document.querySelector('dialog[open] .ss-tidy [data-td-quick="all"]').click(); }); await sleep(100);
        await Q(() => document.querySelector('dialog[open] .ss-tidy [data-choice="go"]').click()); await sleep(800);
        const back = await Q(async () => { const core = await import('/ext/src/core.js'); return { tidy: core.settings().tidy, sns: core.modOn('sns'), style: !!document.getElementById('ss-tidy-style') }; });
        check(back.tidy === null && back.sns && !back.style, '「전부 고르기」면 숨김이 전부 풀리고 칸이 돌아옴', JSON.stringify(back));
        const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
    } finally { await close(); }
}
// 업데이트로 받은 사람: 한 번 저절로 · 닫으면 아무것도 안 바뀜 · 다음에 다시 안 뜸
{
    const o = await open({ oldset: true, tidy: true });
    try {
        await sleep(5200);
        const a = await o.page.evaluate(async () => ({ open: !!document.querySelector('dialog[open] .ss-tidy'), asked: (await import('/ext/src/core.js')).settings().tidyAsked }));
        check(a.open && a.asked === true, '업데이트로 받은 사람: 기능 정리 창이 한 번 뜸', JSON.stringify(a));
        await o.page.evaluate(() => document.querySelector('dialog[open] .ss-tidy').closest('dialog').querySelector('.popup-button-ok').click()); await sleep(400);
        check(await o.page.evaluate(async () => (await import('/ext/src/core.js')).settings().tidy == null), '「그대로 둘게요」면 아무것도 안 숨김');
    } finally { await o.close(); }
}
// 새로 설치한 사람: 기능 정리는 안 뜸 (스타일로 고르기가 대신)
{
    const o = await open({ tidy: true });
    try {
        await sleep(5200);
        check(!(await o.page.evaluate(() => !!document.querySelector('dialog[open] .ss-tidy'))), '새로 설치한 사람에겐 기능 정리 창이 안 뜸');
    } finally { await o.close(); }
}
