// 🌐 상태창 번역 문지기 — 번역을 꺼 두면 번역 코드(tr.js)를 아예 안 받는다 (켜 두면 처음 쓸 때 받아서 그대로 넘김)
import { settings, app } from '../base/st.js';

export const TR_CATS = [
    ['trSent', 'sent', '문장', '세계 소식 · 속마음 · 기억 · 약속 · 성격 한 줄'],
    ['trPhrase', 'phrase', '단어 · 짧은 구절', '상태 · 날씨 · 행동 · 취향 · 분위기'],
    ['trPlace', 'place', '장소 이름', '지금 장소 · 가 본 곳 · 설정집 장소'],
    ['trName', 'name', '고유 명칭', '인물 · 물건 · 가게 상품 이름'],
    ['trUnit', 'unit', '숫자 · 단위', '돈 단위(Gold 같은)'],
];
const on = () => { const m = settings().trMode; return m === 'free' || m === 'ai'; };
let T = null, loading = null;
const load = () => (loading ??= import('./tr.js').then(m => { T = m; setTimeout(() => app.refresh?.(), 0); return m; }, () => { loading = null; return null; }));
export const trLoaded = () => !!T;
export function applyTr(root) { if (T) return T.applyTr(root); if (on()) load(); }
// 받는 중엔 'loading' → 다 받으면 서명이 바뀌어 화면이 한 번 다시 칠해짐
export const trSig = () => (T ? T.trSig() : on() ? 'loading' : 'off');
export const trBusy = () => (T ? T.trBusy() : false);
export function trScan(r) { if (T) return T.trScan(r); if (on()) load().then(m => m?.trScan(r)); }
