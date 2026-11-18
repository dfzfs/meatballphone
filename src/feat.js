// ⚡ 켠 기능만 불러오기 — 꺼 두거나 🧹 숨긴 기능의 코드는 시작할 때 읽지 않는다
//   예전엔 연락 · 미니홈피 · 점집 · 새 지도 · 생활 틀 코드를 쓰든 안 쓰든 처음에 전부 읽었다 (약 26만 자)
//   · F.이름 = 불러온 모듈 (아직이면 undefined) — 그리는 쪽은 need('이름')?.함수() ?? 대신 보일 것
//   · loadWanted(): 지금 켜진 기능을 불러온다 — 시작할 때 · 채팅을 바꿀 때 기다리고, 다시 계산할 때(refreshNow)마다 안 기다리고 부른다
//     → 기능을 켜는 순간 불러오고, 다 불러오면 상태창 · HUD를 다시 그린다
//   · 불러온 모듈이 단추 동작(…_ACTIONS)을 갖고 있으면 shell.js가 app.featLoaded에서 받아 붙인다
import { app, settings, getMeta, modOn, ssWarn, LOG } from './core.js';
import { KEY as STORY_KEY } from './story_meta.js';

export const F = {};
const LOAD = {
    contact: () => import('./contact.js'),   // 💌 연락 (칸)
    hompy: () => import('./hompy.js'),       // 📒 미니홈피 화면 · 미니홈피 모양
    fortune: () => import('./fortune.js'),   // 🔮 점집 (운명 칸 밑)
    metro: () => import('./metro.js'),       // 🚇 새 지도 (노선도)
    iso: () => import('./iso.js'),           // 🏠 건물 층 · 집 안 그림 (새 지도와 같이)
    story: () => import('./story.js'),       // 🧭 이야기 장치 — 회귀자 · 유령 · 장부 · 눈치 … (목록은 story_meta.js)
    storyui: () => import('./story_ui.js'),  // 🧭 이야기 장치 화면 · 🗝 공략 탭
    life: () => import('./life.js'),         // 🍞 생활 틀 — 욕구 · 도트 인형 · 옷 입히기 · 게임 모드 (늘 보이는 단추는 life_lite.js)
};
// 단추를 눌렀는데 동작이 아직 없으면 불러와 볼 기능 (shell.js) — 늘 보이는 화면에 그 기능의 단추가 있는 것만
export const LAZY_ACTS = ['life', 'contact', 'fortune'];
const st = () => settings();
// 이야기 장치를 하나라도 켰나 (🗝 공략은 기본 켬 — 🧹 기능 정리로 숨기거나 끄면 안 읽는다)
const storyAny = () => { const s = st(); return s.guideOn !== false || Object.values(STORY_KEY).some(k => s[k] === true); };
// 지금 이 기능이 필요한가 — 켜져 있거나, 이 채팅에 그 기능의 자료가 남아 있으면 (정리 · 옛 기록 줄이기가 돌아야 하니까)
const WANT = {
    contact: () => { try { return modOn('contact') || !!app.current?.state?.data?.contact || !!getMeta()?.base?.data?.contact; } catch { return false; } },
    hompy: () => st().hompyFull !== false || st().hpSkinHud === true,
    fortune: () => st().fortuneTarot === true || st().fortuneOrb === true || st().fortuneShaman === true,
    metro: () => st().mapMetro === true,
    iso: () => st().mapMetro === true,
    story: () => storyAny(),
    storyui: () => storyAny(),
    // 생활: 욕구 · 꾸미기 탭을 켰거나 · 생활 모드거나 · 옷차림을 켰거나 · 인형이 있거나 · 저절로 줄어드는 게이지가 있으면
    life: () => {
        const m = getMeta(); if (!m) return st().gearOn === true;
        if (m.life?.needs || m.life?.wear || ['life', 'fusion', 'apoc'].includes(m.mode) || st().gearOn === true) return true;
        if (m.dolls && Object.keys(m.dolls).length) return true;
        const bars = app.current?.state?.data?.stats?.bars ?? m.base?.data?.stats?.bars ?? [];
        return bars.some(b => b?.decay || b?.stages || b?.zero);
    },
};
export const wanted = (name) => { try { return !!WANT[name]?.(); } catch { return false; } };
const pending = {};
export function load(name) {
    if (F[name]) return Promise.resolve(F[name]);
    if (!LOAD[name]) return Promise.reject(new Error(`모르는 기능: ${name}`));
    return (pending[name] ??= LOAD[name]().then((m) => {
        F[name] = m;
        try { app.featLoaded?.(name, m); } catch (e) { ssWarn(LOG, 'feat hook', name, e); }
        return m;
    }).catch((e) => { delete pending[name]; ssWarn(LOG, 'feat load', name, e); throw e; }));
}
// 그리는 중에: 불러와 있으면 모듈, 아니면 불러오기를 걸어 두고 null (다 불러오면 다시 그린다)
let redraw = null;
export function need(name) {
    if (F[name]) return F[name];
    load(name).then(() => { clearTimeout(redraw); redraw = setTimeout(() => { try { app.rerenderPanels?.(true); app.renderHud?.(); } catch (e) { ssWarn(LOG, 'feat redraw', e); } }, 0); }).catch(() => { /* 위에서 적음 */ });
    return null;
}
// 지금 켜진 기능을 전부 불러온다 (이미 불러온 건 그대로)
export async function loadWanted() {
    const names = Object.keys(LOAD).filter(n => !F[n] && wanted(n));
    if (!names.length) return [];
    const got = await Promise.allSettled(names.map(load));
    if (got.some(r => r.status === 'fulfilled')) { try { app.rerenderPanels?.(true); app.renderHud?.(); } catch (e) { ssWarn(LOG, 'feat redraw', e); } }
    return names;
}
// 불러오는 동안 잠깐 보일 칸
export const loadingHTML = () => '<div class="ss-hint ss-feat-loading"><i class="fa-solid fa-spinner fa-spin"></i> 불러오는 중…</div>';
export const featInfo = () => ({ loaded: Object.keys(F), all: Object.keys(LOAD) });
app.featInfo = featInfo;
