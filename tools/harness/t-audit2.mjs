// 점검 반영 (2026-11): AI가 형식을 조금 벗어나게 쓴 변화 줄을 조용히 놓치던 것
// 숫자 뒤 설명 · 게이지 다른 이름 · 한 줄에 섞어 쓴 키 · 안 닫힌 태그 뒤 대사 · 출력 규칙 문구
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const eng = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state;
        const leon = () => st().data.rel.user.find(x => x.name === 'Leon');
        const bar = (n) => st().data.stats.bars.find(b => b.name === n)?.cur;
        const bars = () => st().data.stats.bars.map(b => b.name).join(',');
        const say = async (body) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${body}\n</meatball>`); await wait(150); };
        const out = {}; const bars0 = bars();
        await say('aff: Leon +2 (he smiled)'); out.paren = leon().aff === 2;
        await say('aff: Leon +2 — smiled at her'); out.dash = leon().aff === 4;
        await say('aff: Leon +1 | 같이 웃음 (메모)'); out.memoKept = leon().aff === 5 && leon().memo === '같이 웃음 (메모)';
        await say('aff: Leon +2, trust: Leon +1'); out.mixed = leon().aff === 7 && leon().trust === 1;
        await say('stat: 체력 -12 (hit)'); out.statNote = bar('체력') === 88;
        await say('stat: HP -8'); out.alias = bar('체력') === 80;
        await say('stat: Health -5, Mana -10'); out.alias2 = bar('체력') === 75 && bar('마나') === 90;
        await say('hp: −5'); out.hpKey = bar('체력') === 70;
        await say('hp: -5'); out.hpKey2 = bar('체력') === 65;
        out.noNewBars = bars() === bars0;
        await say('stat: 오염도 -30'); out.newBarStill = bar('오염도') === 70; // 정말 새 게이지는 예전처럼 생김
        await say('stat: 체력 max +10'); out.maxStill = st().data.stats.bars.find(b => b.name === '체력').max === 110;
        // 숫자 뒤 설명 떼기 — 이름은 안 다침
        out.dn1 = eng.dropNote('R2 - D2 +3') === 'R2 - D2 +3';
        out.dn2 = eng.dropNote('체력(HP) -12') === '체력(HP) -12';
        out.dn3 = eng.dropNote('Leon +2 (a, b), Mira +3 (c)') === 'Leon +2, Mira +3';
        out.dn4 = eng.dropNote('Leon +2') === 'Leon +2';
        // 안 닫힌 <meatball> 뒤의 대사 줄은 본문에 남는다
        const t = 'story\n<meatball>\ncash: -5\n레온: "안녕"\n끝.';
        out.unclosedOps = JSON.stringify(eng.extractOps(t)) === '[["cash","-5"]]';
        out.unclosedKeep = eng.removeStatus(t).includes('레온: "안녕"');
        // 출력 규칙 문구가 깨지지 않는다
        const inj = eng.buildInjection(app.current, { full: true }).main;
        out.rule = !inj.includes('above., names') && /existing names exactly as written above\./.test(inj);
        // ⚠ 못 읽은 줄: 반영된 변화 옆에 못 읽은 줄 수가 남는다
        await say('aff: Leon +1\nfoo: bar\naff: +3');
        { const sn = app.current.snaps.get(app.current.lastAI); out.miss = sn.miss?.length === 2 && sn.labels.length === 1; }
        await new Promise(r => setTimeout(r, 200));
        out.missChip = !!document.querySelector(`#chat .mes[mesid="${app.current.lastAI}"] .ss-mchip.pip`);
        // 🔗 인물 합치기: 수치가 더해지고 · 카드가 하나가 되고 · 그 뒤 옛 이름으로 와도 남긴 사람에게
        await say('aff: 레온 +4\ntrust: 레온 +2');
        const a0 = leon().aff, t0 = leon().trust;
        out.dupMade = !!st().data.rel.user.find(x => x.name === '레온');
        await eng.addAdjust({ ops: [['_merge', '레온 => Leon']], label: 'merge' }); await wait(200);
        out.merged = !st().data.rel.user.find(x => x.name === '레온') && leon().aff === a0 + 4 && leon().trust === t0 + 2;
        await say('aff: 레온 +1'); out.aliasAfter = !st().data.rel.user.find(x => x.name === '레온') && leon().aff === a0 + 5;
        await eng.undoLast(); await wait(200); // 마지막 편집(합치기) 되돌리기 → 다시 둘
        out.mergeUndo = !!st().data.rel.user.find(x => x.name === '레온');
        // 📈 변화 그래프: 값이 모이고 그림이 나온다
        const tr = await import('/ext/src/trend.js');
        const td = tr.trendData();
        out.trendData = td.xs.length > 3 && Array.isArray(td.aff.Leon) && td.aff.Leon.length === td.xs.length && td.cash.length === td.xs.length;
        out.trendHtml = tr.trendHTML().includes('<polyline');
        out.version = (await import('/ext/src/core.js')).VERSION === '2.7.23';
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k);
    check(!logs.length, '콘솔 오류 없음', logs.slice(0, 3).join(' / '));
} finally { await close(); }
