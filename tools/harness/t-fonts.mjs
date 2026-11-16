// ⚡ 글꼴 목록 줄이기 (trimFonts): 이 기기에 있는 글꼴만 남긴 목록이 한가할 때 만들어져 걸리고 · 기기에 기억되고 · 끝은 늘 기본 글꼴이고 · 상태창이 실제로 그 목록을 쓴다
import { open, makeStatus, check, sleep } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page);
    await sleep(3200); // 한가할 때 도는 것(최대 2.5초 뒤)을 기다린다
    const r = await page.evaluate(async () => {
        const hp = await import('/ext/src/hompy.js'); const shell = await import('/ext/src/shell.js'); const out = {};
        const css = document.getElementById('ss-hp-fonts')?.textContent ?? '';
        const stacks = Object.fromEntries([...css.matchAll(/ss-hp-f-(\w)\.ss-hp-f-\w\{--hp-font:([^}]*)\}/g)].map(m => [m[1], m[2]]));
        out.written = Object.keys(stacks).sort().join('') === 'gmrs' || css;
        out.endsGeneric = Object.values(stacks).every(v => /(^|, )(sans-serif|serif|monospace)$/.test(v)) || JSON.stringify(stacks);
        out.shorter = Object.values(stacks).every(v => v.split(',').length <= 11) && stacks.g.split(',').length <= 9;
        out.saved = !!JSON.parse(localStorage.getItem('ss_hp_fontstacks_v1') || 'null')?.stacks?.g;
        out.again = JSON.stringify(hp.trimFonts(true)) === JSON.stringify(stacks) || 'changed on re-run';
        window.__autoPopup = null; shell.openSheet('home'); await new Promise(r => setTimeout(r, 400));
        const root = document.querySelector('dialog .ss-root'); const used = getComputedStyle(root).fontFamily.replace(/"/g, "'");
        out.used = used === stacks.g || `${used} ≠ ${stacks.g}`;
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, `fonts: ${k}`, typeof v === 'string' ? v : '');
    check(!logs.some(l => /pageerror|TypeError/.test(l)), 'fonts: 오류 없음', logs.slice(0, 2).join(' | '));
} finally { await close(); }
