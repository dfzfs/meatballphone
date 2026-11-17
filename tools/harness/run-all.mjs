// 모든 시나리오를 차례로 (node tools/harness/run-all.mjs)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let bad = 0;
for (const t of ['t-smoke', 't-guard', 't-simple', 't-iso', 't-metro', 't-dress', 't-hard', 't-clock', 't-picker', 't-autostart', 't-mind', 't-life', 't-life2', 't-quest', 't-pip', 't-misc', 't-tr', 't-v275', 't-v276', 't-v277', 't-v2710', 't-xss', 't-v2712', 't-v2713', 't-v2716', 't-v2718', 't-v2719', 't-v2720', 't-v2721', 't-real', 't-help', 't-mobile', 't-tiles', 't-audit', 't-recheck', 't-fuzz2', 't-swdel', 't-setbtn', 't-crop', 't-editkeep', 't-bartr', 't-routes', 't-slot', 't-shell', 't-audit2', 't-side', 't-ctfloat', 't-letter', 't-truth', 't-group', 't-story', 't-guide', 't-setact', 't-lorepick', 't-trclear', 't-hompy', 't-patch', 't-fonts', 't-lite', 't-manage', 't-hpaudit', 't-v28fix', 't-minihome', 't-addons', 't-manage2', 't-wave', 't-soc', 't-themeask', 't-fortune', 't-v29off', 't-backclose', 't-parse29', 't-json', 't-badmeta', 't-lifecycle', 't-trash', 't-pipempty']) {
    const r = spawnSync(process.execPath, [path.join(here, `${t}.mjs`)], { encoding: 'utf8', timeout: t === 't-hpaudit' ? 480000 : t === 't-patch' ? 360000 : 240000 });
    const out = `${r.stdout}${r.stderr}`;
    const fails = out.split('\n').filter(l => l.includes('✘') || /Error/.test(l));
    console.log(`${fails.length || r.status ? '✘' : '✔'} ${t}${fails.length ? `\n  ${fails.join('\n  ')}` : ''}`);
    if (fails.length || r.status) bad++;
}
process.exit(bad ? 1 : 0);
