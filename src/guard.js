// 🛡 간섭 차단 — 화면 쪽 (설정 guardLook · 기본 끔)
//   다른 확장 · 테마가 미트볼 화면(.ss-… · #ss-…)을 통째로 다시 칠하는 것을 막는다. 꺼져 있으면 아무것도 안 한다 (감시자도 안 건다).
//   데이터 · 동작 쪽(guardData)은 여기가 아니라 제자리에 있다: core.js(ctx — 감싼 getContext 건너뛰기 · sealMeta/checkSeal — 자료 봉인) ·
//   engine.js(isStoryAI — 남이 적은 extra.type 표식 무시) · prompts.js(P — 문구 끝에 덧붙은 덩어리 떼기)
//
//   하는 일 (전부 되돌릴 수 있다 — 끄면 그 자리에서 푼다):
//   ① 「미트볼 전용 맞춤 시트」 끄기: 우리 것이 아닌 스타일시트 가운데 규칙의 절반 이상이 미트볼 선택자를 겨누는 것 → sheet.disabled
//      (테마 본체 시트는 미트볼 규칙이 거의 없어서 안 걸린다 → 실리태번의 나머지 화면은 테마 그대로)
//   ② body.ss-guard-look → css/guard.css 가 미트볼 화면 안에 끼워진 남의 요소를 숨기고, kit.js applyTheme 이 색 변수를 더 센 선택자로 다시 적는다
//   못 막는 것: 남의 스크립트가 우리 요소를 직접 옮기거나 다시 그리는 것 (스타일이 아니라서) — 그건 그 확장의 설정에서 꺼야 한다
import { settings, ssNote } from './core.js';

const ROOT = (() => { try { return new URL('..', import.meta.url).href; } catch { return ''; } })();
const HIT = /[.#]ss-[a-z]/;
const seen = new WeakMap(); // 시트 → { n: 규칙 수, own: 미트볼 전용인가, kids: @import 한 시트 }
const off = new Set();      // 우리가 꺼 둔 시트
let headObs = null, timer = null, active = false;

const mine = (s) => (!!ROOT && !!s.href && s.href.startsWith(ROOT)) || /^ss-/.test(s.ownerNode?.id ?? '');
function look(sheet) {
    let rules; try { rules = sheet.cssRules; } catch { return null; } // 다른 출처 · 아직 받는 중
    const had = seen.get(sheet); if (had && had.n === rules.length) return had;
    const sels = [], kids = [];
    const walk = (list, depth) => { for (const r of list) { if (r.styleSheet) kids.push(r.styleSheet); else if (typeof r.selectorText === 'string') sels.push(r.selectorText); else if (r.cssRules && depth < 4 && r.type !== 7) walk(r.cssRules, depth + 1); } }; // 7 = @keyframes
    walk(rules, 0);
    const hits = sels.reduce((a, t) => a + (HIT.test(t) ? 1 : 0), 0);
    const v = { n: rules.length, own: sels.length >= 3 && hits / sels.length >= 0.5, kids };
    seen.set(sheet, v);
    return v;
}
// → 지금 꺼 둔 시트 수
export function scanSheets() {
    if (!active) return 0;
    const visit = (s, depth) => {
        if (!s || mine(s) || depth > 3) return;
        const v = look(s); if (!v) return;
        if (v.own) { if (!s.disabled) s.disabled = true; off.add(s); return; }
        for (const k of v.kids) visit(k, depth + 1);
    };
    try { for (const s of document.styleSheets) visit(s, 0); } catch (e) { ssNote('맞춤 시트 훑기', e); }
    return off.size;
}
const later = () => { clearTimeout(timer); timer = setTimeout(scanSheets, 120); };

// 설정에 맞춰 켜고 끈다 — 시작할 때 · 설정을 바꿀 때 불린다 (여러 번 불러도 같다)
export function applyGuardLook() {
    const want = settings().guardLook === true, b = document.body;
    if (!b || want === active) { if (want) later(); return; }
    active = want;
    b.classList.toggle('ss-guard-look', want);
    if (want) {
        scanSheets();
        try {
            headObs = new MutationObserver(later); headObs.observe(document.head, { childList: true }); // 맞춤 시트가 뒤늦게 붙거나 다시 붙을 때
            document.head.addEventListener('load', later, true); // <link>가 다 받아졌을 때 (받는 중엔 규칙을 못 읽는다)
        } catch (e) { ssNote('화면 보호 감시', e); }
        setTimeout(later, 1500);
    } else {
        headObs?.disconnect(); headObs = null; clearTimeout(timer);
        try { document.head.removeEventListener('load', later, true); } catch { /* 건 적 없음 */ }
        for (const s of off) { try { s.disabled = false; } catch { /* 이미 떼어진 시트 */ } }
        off.clear();
    }
}
export const guardLookInfo = () => ({ on: active, sheets: off.size });
