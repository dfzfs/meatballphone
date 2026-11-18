// ⚡ 켠 기능만 불러오기 (feat.js): 연락 · 미니홈피 · 점집 · 새 지도 코드는 끈 동안 안 읽고, 켜는 순간 불러와서 그 화면이 그대로 뜬다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ defaults: true }); // defaults: 미니홈피 · 점집 · 새 지도가 꺼진 처음 값 그대로
const Q = (fn, arg) => page.evaluate(fn, arg);
const loaded = () => Q(() => performance.getEntriesByType('resource').map(e => new URL(e.name).pathname).filter(p => p.startsWith('/ext/src/')).map(p => p.slice(9)));
const LAZY = ['contact.js', 'hompy.js', 'fortune.js', 'metro.js', 'iso.js'];
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'fate']);
    await sleep(800);
    const l0 = await loaded();
    check(LAZY.every(f => !l0.includes(f)), '끈 기능의 코드는 안 읽음 (연락 · 미니홈피 · 점집 · 새 지도)', l0.filter(f => LAZY.includes(f)).join(','));
    check(l0.includes('feat.js') && l0.includes('views.js'), '평소 화면 코드는 그대로 읽음');
    // 💌 연락 칸을 켜면 → 불러오고 연락 탭이 바로 그려짐 · 단추도 동작
    await Q(async () => { const core = await import('/ext/src/core.js'); const m = core.getMeta(true); m.mods.contact = true; await core.saveMeta(); window.__SS_TEST__.api.refreshNow(); }); await sleep(600);
    check((await loaded()).includes('contact.js'), '연락 칸을 켜면 연락 코드를 불러옴');
    await Q(() => { window.__SS_TEST__.api.app.openSheet('contact'); }); await sleep(600);
    check(await Q(() => !!document.querySelector('dialog .ss-panel') && !document.querySelector('dialog .ss-panel .ss-feat-loading')), '연락 탭: 「불러오는 중」이 아니라 연락 화면');
    check(await Q(async () => { const sh = await import('/ext/src/feat.js'); return !!sh.F.contact?.CONTACT_ACTIONS; }), '연락 모듈이 등록됨 (단추 동작이 붙음)');
    // 🔮 점집을 켜면
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().fortuneTarot = true; core.saveSettings(); window.__SS_TEST__.api.refreshNow(); }); await sleep(600);
    check((await loaded()).includes('fortune.js'), '점집을 켜면 점집 코드를 불러옴');
    await Q(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__SS_TEST__.api.app.openSheet('fate'); }); await sleep(600);
    check(await Q(() => !!document.querySelector('dialog[open] .ss-panel .ss-ft')), '운명 탭에 점집이 보임');
    // 🚇 새 지도를 켜면
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().mapMetro = true; core.saveSettings(); window.__SS_TEST__.api.refreshNow(); }); await sleep(600);
    const l2 = await loaded();
    check(l2.includes('metro.js') && l2.includes('iso.js'), '새 지도를 켜면 노선도 · 건물 코드를 불러옴');
    await Q(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__SS_TEST__.api.app.openSheet('map'); }); await sleep(700);
    check(await Q(() => !!document.querySelector('dialog[open] .ss-panel svg')), '지도 탭이 그려짐');
    // 📒 미니홈피 화면을 켜면
    await Q(async () => { const core = await import('/ext/src/core.js'); core.settings().hompyFull = true; core.saveSettings(); window.__SS_TEST__.api.refreshNow(); }); await sleep(600);
    check((await loaded()).includes('hompy.js'), '미니홈피를 켜면 미니홈피 코드를 불러옴');
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
// 채팅을 열 때: 연락을 켜 둔 채팅이면 연락만 불러옴 (미니홈피는 그대로 안 읽음)
{
    const o = await open({ defaults: true });
    try {
        await makeStatus(o.page, ['profile', 'rel', 'contact']);
        await o.page.evaluate(async () => { await window.__SS_TEST__.api.onChatChanged(); }); await sleep(500);
        const r = await o.page.evaluate(async () => (await import('/ext/src/feat.js')).featInfo());
        check(r.loaded.includes('contact') && !r.loaded.includes('hompy'), '연락을 켜 둔 채팅: 연락만 불러옴', JSON.stringify(r));
    } finally { await o.close(); }
}
