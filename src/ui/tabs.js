// 전체화면 탭 — 입구 (화면 그리기는 tabs-views.js · 누르기는 tabs-acts.js · 함께 쓰는 도구는 tabs-shared.js)
//   🏎 누르기 코드는 처음 누를 때 받는다 · 고칠 때는 해당 파일만 보면 됨
export * from './tabs-shared.js';
export * from './tabs-views.js';
const ACTS = () => import('./tabs-acts.js');
export const onAct = async (...a) => (await ACTS()).onAct(...a);
export const hand = async (...a) => (await ACTS()).hand(...a);
export const askCardName = async (...a) => (await ACTS()).askCardName(...a);
