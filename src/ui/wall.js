// 🖼 내 사진 배경화면은 설정 파일 밖(브라우저 저장소 · IndexedDB)에 — 설정을 하나만 바꿔도 사진(수백 KB)까지 통째로 저장되던 것
//   설정에는 「idb」 표시만 · 브라우저 저장소가 없으면 예전처럼 설정에
import { settings, saveSettings } from '../base/st.js';

const KEY = 'meatballphone-wall';
const lf = () => globalThis.SillyTavern?.libs?.localforage ?? null;
let url = null, loading = null;
// 그릴 때 쓸 주소 (아직 못 읽었으면 빈칸 → 읽으면 다시 그림)
export function wallSrc(L = settings().look) {
    const v = L.wallImg ?? '';
    if (v === 'idb') return url ?? '';
    return v;
}
// 처음 펼칠 때 한 번: 옛 설정 속 사진은 브라우저 저장소로 옮기고, 저장소에 있으면 읽어 둠
export function wallLoad() {
    return (loading ??= (async () => {
        const L = settings().look, db = lf(); if (!db) return url;
        try {
            if (String(L.wallImg ?? '').startsWith('data:')) { await db.setItem(KEY, L.wallImg); url = L.wallImg; L.wallImg = 'idb'; saveSettings(); }
            else if (L.wallImg === 'idb') url = (await db.getItem(KEY)) ?? '';
        } catch (e) { console.warn('[미트볼폰] 배경 사진 저장소', e); }
        return url;
    })());
}
export async function wallSave(data) {
    const L = settings().look, db = lf();
    if (db) { try { await db.setItem(KEY, data); url = data; L.wallImg = 'idb'; } catch { L.wallImg = data; } } else L.wallImg = data;
    L.wall = 'img'; saveSettings();
}
