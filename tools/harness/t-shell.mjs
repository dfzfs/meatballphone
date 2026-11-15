// 옮긴 화면이 그대로 도는가: 확장 설정 서랍(settings_ui.js) · 눌렀을 때 불러오는 창(lazy.js → help · wizard · windows) · 슬래시 커맨드(commands.js)
// + 옛 설정(새 열쇠가 없는 저장본)으로 켜도 기본값이 채워지는가
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const core = await import('/ext/src/core.js');
        const out = {};
        const root = document.querySelector('#ss-settings');
        out.drawer = !!root && root.querySelectorAll('[data-s]').length > 40 && root.querySelectorAll('b.ss-set-h').length >= 5 && !!root.querySelector('.inline-drawer-header small');
        // 스위치 하나: 화면 → 설정
        const box = root.querySelector('input[type="checkbox"][data-s="freshDot"]'); const was = core.settings().freshDot !== false;
        box.checked = !was; box.dispatchEvent(new Event('change', { bubbles: true })); await wait(80);
        out.toggle = (core.settings().freshDot !== false) === !was;
        box.checked = was; box.dispatchEvent(new Event('change', { bubbles: true })); await wait(80);
        // 눌렀을 때 불러오는 창 넷 (설정 서랍 단추로)
        const loaded = () => performance.getEntriesByType('resource').map(e => e.name.split('/').pop());
        out.lazyBefore = !['help.js', 'windows.js', 'helpkb.js'].some(f => loaded().includes(f));
        const openBy = async (act, sel) => { root.querySelector(`[data-s-act="${act}"]`).click(); for (let i = 0; i < 40 && !document.querySelector(sel); i++) await wait(50); const ok = !!document.querySelector(sel); document.querySelectorAll('dialog').forEach(d => { d.close?.(); d.remove(); }); await wait(60); return ok; };
        out.help = await openBy('help', '.ss-help');
        out.prompts = await openBy('prompts', '.ss-pw');
        out.theme = await openBy('theme', '.ss-tw');
        out.wizard = await openBy('wizard', '.ss-wizard');
        out.sheet = await openBy('open', '.ss-panel, .ss-head');
        out.lazyAfter = ['help.js', 'windows.js', 'wizard.js'].every(f => loaded().includes(f));
        // 슬래시 커맨드
        const cmds = SillyTavern.getContext().SlashCommandParser.commands;
        out.cmds = ['ss', 'ss-make', 'ss-perf', 'ss-pip', 'ss-prompts', 'ss-help'].filter(n => !cmds.has(n)).join(',') || true;
        cmds.get('ss-prompts').callback(); for (let i = 0; i < 40 && !document.querySelector('.ss-pw'); i++) await wait(50);
        out.cmdOpens = !!document.querySelector('.ss-pw'); document.querySelectorAll('dialog').forEach(d => { d.close?.(); d.remove(); });
        // 옛 저장본: 새 열쇠를 지우면 기본값(꺼짐)으로 읽힌다
        const raw = window.__st.extensionSettings.statussim; delete raw.pairAff; delete raw.relRace;
        out.defaults = core.settings().pairAff !== true && core.settings().relRace !== true;
        out.version = core.VERSION === (await (await fetch('/ext/manifest.json')).json()).version;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k, String(v));
    const errs = logs.filter(l => !/404/.test(l)); // 만들기 창은 실리의 로어북 모듈을 찾는데 시험 페이지엔 없다
    check(!errs.length, 'no console errors', errs.join('\n'));
} finally { await close(); }
