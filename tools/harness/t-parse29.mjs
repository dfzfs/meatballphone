// 🧪 검수 (2.9): AI가 흔히 적는 모양인데 버려지거나 잘못 읽히던 줄 — 실제 답 경로로 넣어 본다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'contact', 'memo']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js');
        Object.assign(core.settings(), { mindMode: 'thought', mindFreq: 'always' }); core.saveSettings();
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms)), st = () => app.current.state;
        const say = async (body) => { await window.__addUser('u'); await window.__addAI(`s\n<meatball>\n${body}\n</meatball>`); await wait(200); };
        const bar = (n) => st().data.stats.bars.find(b => b.name === n);
        const cash = () => st().data.wallet.cash, cal = () => st().data.calendar;
        const eng0 = await import('/ext/src/engine.js');
        const missOf = () => { try { return app.pipDiag(app.current.lastAI)?.text ?? ''; } catch { return ''; } };
        const out = {};
        // 마크다운 줄
        let c0 = cash(); await say('- cash: +10\n**cash**: +5\n**cash:** +3\n1. cash: +2'); out.markdown = cash() - c0 === 20;
        c0 = cash(); await say('money: +$20'); out.dollar = cash() - c0 === 20;
        await say('cash: 500 → 90'); out.arrowCash = cash() === 90;
        await say('cash: 30 지출'); out.spendWord = cash() === 60;
        await say('cash: 15골드 획득'); out.earnWord = cash() === 75;
        await say('aff: Leon(+2)'); out.affParen = st().data.rel.user.find(x => x.name === 'Leon').aff === 2;
        // 게이지 · 능력치
        await say('stat: 체력 = 50'); out.statSetSpaced = bar('체력').cur === 50;
        await say('stat: 체력 85/100'); out.statFrac = bar('체력').cur === 85 && bar('체력').max === 100;
        await say('stat: 체력 -10%'); out.statPct = bar('체력').cur === 75;
        const a = st().data.stats.attrs[0], n0 = st().data.stats.attrs.length;
        await say(`attr: ${a.name} = 12`); out.attrSet = st().data.stats.attrs.find(x => x.name === a.name).val === 12 && st().data.stats.attrs.length === n0;
        // 시간 · 날씨 · 날짜
        const times = cal().times, d0 = cal().d;
        await say(`time: ${times[0]}`); await say('time: +1'); out.timeAdv = cal().time === times[1];
        await say(`time: ${times.at(-1)}`); await say('time: +1'); out.timeWrap = cal().time === times[0] && cal().d === d0 + 1;
        // 시각 달력: 못 읽는 시각은 ⚠ · noon = 12시
        await eng0.addAdjust({ ops: [['_clock', '24']], label: 'c' }); await wait(200);
        await say('time: 22:00'); await say('time: 25:00'); out.clockBad = cal().time === '22:00' && /25:00/.test(missOf());
        await say('time: noon'); out.clockNoon = cal().time === '12:00';
        await eng0.addAdjust({ ops: [['_clock', '']], label: 'c' }); await wait(200);
        await say('weather: 맑음 → 눈'); out.weatherArrow = cal().weather === '눈';
        await say('date: 14'); out.dateBareMiss = /date: 14/.test(missOf());
        // 따옴표 · 괄호
        await say('loc: 「항구」'); out.locQuote = st().data.map.here === '항구' && !st().data.map.places.some(p => /「/.test(p.name));
        await say('item: +빵 2'); await say('item: 빵 +3'); out.itemSignAfter = st().data.wallet.items.find(i => i.name === '빵')?.qty === 5;
        await say('item: -빵 9'); out.itemRmChip = !st().data.wallet.items.find(i => i.name === '빵') && /−빵×5/.test(JSON.stringify(app.current.snaps?.get?.(app.current.lastAI)?.labels ?? document.body.innerText));
        await say('item: +"마법 반지"'); out.itemQuote = !!st().data.wallet.items.find(i => i.name === '마법 반지');
        // 퀘스트
        await say('quest: 잃어버린 반지 | 새 | 반지 찾기'); await say('quest: 잃어버린 반지 완료');
        const q = st().data.quest.list.find(x => x.title === '잃어버린 반지'); out.questNoPipe = !!q && ['done', 'active'].includes(q.status) && q.status !== 'open';
        await say('quest: +새 의뢰'); out.questPlus = !!st().data.quest.list.find(x => x.title === '새 의뢰') && !st().data.quest.list.some(x => x.title.startsWith('+'));
        // 연락 · 속마음: 「이름: 글」
        await say('msg: Leon: 내일 보자'); out.msgColon = (st().data.contact.threads.Leon ?? []).some(m => m.text === '내일 보자');
        await say('msg: Leon'); out.msgNoTextMiss = /msg: Leon/.test(missOf());
        await say('mind: Leon: 설렌다'); out.mindColon = /설렌다/.test(st().data.rel.user.find(x => x.name === 'Leon')?.mind?.text ?? '');
        // 📌 고정 메모 최대 0 = 안 보냄 (예전엔 0이 8로 바뀌고 · slice(-0)이 전부를 돌려줬다)
        const eng = await import('/ext/src/engine.js');
        await eng.addAdjust({ ops: [['_memo', 'add|핀메모비밀']], label: 'm' }); await wait(200);
        const id = st().data.memo.list.find(m => m.text === '핀메모비밀').id;
        await eng.addAdjust({ ops: [['_memo', `tog|${id}|pin`]], label: 'p' }); await wait(200);
        const inj = () => { const i = eng.buildInjection(app.current); return `${i.main}\n${i.people ?? ''}`; };
        core.settings().deltaMode = false; // 짧은 꼴(변화 위주)엔 메모가 원래 안 들어가서 전체 꼴로 본다
        core.settings().pinCap = 8; core.saveSettings(); out.pinSent = /핀메모비밀/.test(inj());
        core.settings().pinCap = 0; core.saveSettings(); out.pinCapZero = !/핀메모비밀/.test(inj());
        return out;
    });
    for (const [k, v] of Object.entries(r)) check(v === true, k);
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
