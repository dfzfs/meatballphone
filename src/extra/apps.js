// 📲 밖에서 깐 앱(미트볼폰 앱 확장)이 폰에 들어오는 자리
//   앱 쪽은 이것만 하면 된다 (폰보다 먼저 켜져도 · 폰이 없어도 괜찮음):
//   (globalThis.MeatballPhoneApps ??= []).push({ id: 'contacts', name: '연락', icon: '📞', desc: '…', render(el, phone) { … } });
//   render(el, phone): el = 폰 안 앱 화면 칸 · phone = { close(), redraw(), toast(글) }
// 🛍 기타 앱 목록(apps.json): 우리가 코드를 확인한 앱만. 설치는 실리태번 확장 설치를 대신 눌러 준다.
import { ctx } from '../base/st.js';
import { faceOf } from '../base/util.js';

const EXT = new Map(); // 'x:<id>' → 앱
const ID = /^[a-z0-9][a-z0-9-]{1,31}$/;
let onChange = () => {};
export const setAppsChange = (fn) => { onChange = fn; };

export function addApp(def) {
    try {
        if (!def || typeof def !== 'object' || !ID.test(String(def.id ?? '')) || typeof def.render !== 'function') { console.warn('[미트볼폰] 앱 등록 거절: id(영문 소문자 · 숫자 · -)와 render(el, phone)가 필요해요', def?.id); return () => {}; }
        const key = `x:${def.id}`;
        EXT.set(key, {
            id: key, ext: true, appId: def.id,
            name: String(def.name || def.id).slice(0, 12), icon: faceOf(def.icon, '📦') || '📦',
            desc: String(def.desc ?? '').slice(0, 120), c: /^#[0-9a-f]{3,8}$/i.test(def.color ?? '') ? def.color : '#8d99ae',
            version: String(def.version ?? '').slice(0, 16), render: def.render,
        });
        onChange();
        return () => { if (EXT.get(key)?.render === def.render) { EXT.delete(key); onChange(); } };
    } catch (e) { console.warn('[미트볼폰] 앱 등록 실패', e); return () => {}; }
}
export const extApps = () => [...EXT.values()];
export const extOf = (key) => EXT.get(key) ?? null;
export const hasApp = (id) => EXT.has(`x:${id}`);

// 폰이 켜질 때 한 번: 먼저 와서 기다리던 앱들 받고, 이후로는 바로 받기
export function mountApps() {
    const q = globalThis.MeatballPhoneApps;
    globalThis.MeatballPhoneApps = Object.freeze({ push: (...defs) => { defs.forEach(addApp); return EXT.size; } });
    if (Array.isArray(q)) q.forEach(addApp);
}

// 앱 화면 그리기 — 앱 쪽 오류가 폰을 깨지 않게
export function renderExt(el, a, phone) {
    try { a.render(el, phone); }
    catch (e) { console.warn(`[미트볼폰] ${a.name} 앱 오류`, e); el.innerHTML = `<div class="ml-hint">⚠ ${a.name} 앱에서 오류가 났어요. 그 앱을 업데이트하거나 만든 사람에게 알려 주세요.</div>`; }
}

// ───── 🛍 기타 앱 목록 ─────
const LIST_URL = 'https://raw.githubusercontent.com/dfzfs/meatballphone/main/apps.json';
let list = null, loading = null;
const clean = (arr) => (Array.isArray(arr) ? arr : []).filter(x => ID.test(String(x?.id ?? '')) && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(String(x?.repo ?? '')))
    .map(x => ({ id: x.id, name: String(x.name || x.id).slice(0, 12), icon: faceOf(x.icon, '📦') || '📦', desc: String(x.desc ?? '').slice(0, 160), by: String(x.by ?? '').slice(0, 30), repo: x.repo }));
export const catalog = () => list;
// 저장소의 최신 목록 → 안 되면 확장에 같이 들어 있는 목록
export function loadCatalog() {
    if (list || loading) return loading;
    const get = (u) => fetch(u, { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject(r.status)));
    const timeout = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no('timeout'), 5000))]);
    loading = timeout(get(LIST_URL)).catch(() => get(new URL('../../apps.json', import.meta.url))).then(clean).catch(() => [])
        .then(x => { list = x; loading = null; onChange(); return x; });
    return loading;
}
const fresh = new Set(); // 이번에 설치해서 새로 고침을 기다리는 앱
export const waitsReload = (id) => fresh.has(id);
export async function installApp(id) {
    const it = (list ?? []).find(x => x.id === id); if (!it) throw new Error('목록에 없는 앱');
    const res = await fetch('/api/extensions/install', { method: 'POST', headers: ctx().getRequestHeaders?.() ?? { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: it.repo, global: false }) });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(res.status === 409 ? '이미 깔려 있어요 (실리태번 확장 목록에서 켜져 있는지 보세요)' : (t || `설치 실패 (${res.status})`)); }
    fresh.add(id); onChange();
}
