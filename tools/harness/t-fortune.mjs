// 🔮 점집 (v2.8.1): 타로 · 수정구슬 · 무당 · 굿 — 복채 · 생년월일 기억 · 기록 · AI에게 가는 줄 · 실패하면 돈이 안 나감
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const st = () => page.evaluate(() => { const d = window.__SS_TEST__.api.app.current.state.data; return { cash: d.wallet.cash, f: d.fate }; });
const inj = () => page.evaluate(() => Object.values(window.__prompts).map(p => p.value).join('\n'));
const READ = { person: { birth: '제국력 302년 3월 14일', hour: '새벽 (인시)', age: '24', zodiac: '호랑이띠', star: '물고기자리', element: '木', place: '북부 항구', nature: '겉은 차갑고 속은 무르다.' }, teller: '어디 보자…', summary: '큰 물을 건너면 길이 열린다', sections: [{ title: '총운', text: '올해는 움직이는 해다.' }, { title: '장군님', text: '네 놈 뒤에 물귀신이 붙었다.', voice: 'spirit' }, { title: '애정', text: '가까운 사람을 다시 봐라.' }], omen: '붉은 옷을 입은 사람이 소식을 가져온다', advice: '서두르지 마라', lucky: '붉은색 · 7 · 남쪽' };
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'calendar', 'fate']);
    await page.evaluate(() => window.__addUser('hello'));
    await page.evaluate(() => window.__addAI('Leon nods.\n<meatball>\ncash: 5000\n</meatball>'));
    await sleep(250);
    const inj0 = await inj();
    check(!/Fortune today/.test(inj0), '점을 안 봤으면 AI에게 가는 글에 점괘 줄이 없다');
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('fate'); });
    await sleep(300);
    check(!!(await page.$('dialog .ss-ft')), '운명 탭에 점집이 보인다');
    check(/이야기 속/.test(await page.$eval('dialog .ss-ft-clock', e => e.textContent)) && /현실/.test(await page.$eval('dialog .ss-ft-clock', e => e.textContent)), '이야기 속 시간 · 현실 시간이 같이 보인다');
    const names = await page.$$eval('dialog .ss-ft-who option', os => os.map(o => o.value));
    console.log('   people:', names.join(', '));
    check(names.includes('Me') && names.includes('Leon'), '나와 카드 인물을 고를 수 있다');

    // ① AI가 실패하면 돈이 안 나간다
    const c0 = (await st()).cash;
    await page.evaluate(() => { window.__ai = () => { throw new Error('boom'); }; });
    await page.click('dialog [data-act="ftread"]'); await sleep(500);
    check((await st()).cash === c0 && !(await st()).f.readings.length, 'AI 실패 → 복채 안 나감 · 기록 없음');

    // ② 타로 3장: Leon
    let sys = '', body = '';
    await page.evaluate((READ) => { window.__ai = (p, s) => { window.__last = { p, s }; return JSON.stringify(READ); }; }, READ);
    await page.selectOption('dialog .ss-ft-who', 'Leon'); await sleep(250);
    await page.fill('dialog .ss-ft-q', '이 사람을 믿어도 될까?');
    await page.click('dialog [data-act="ftread"]'); await sleep(700);
    ({ p: body, s: sys } = await page.evaluate(() => window.__last));
    let s1 = await st();
    const r1 = s1.f.readings.at(-1);
    check(s1.cash < c0, `복채가 나갔다 (${c0} → ${s1.cash})`);
    check(r1?.who === 'Leon' && r1.method === 'tarot' && r1.draw.length === 3 && r1.fee === c0 - s1.cash, '타로 3장 점괘가 기록됐다 (복채 = 줄어든 돈)');
    check(r1.draw.every(x => body.includes(x)), '뽑은 카드 3장이 그대로 AI에게 갔다');
    check((await page.$$('dialog')).length === 1 && !!(await page.$('dialog .ss-ft .ss-ft-pop')), '점괘가 새 창 없이 같은 창 안에 펼쳐진다');
    check(await page.$eval('dialog .ss-ft-pop .ss-ft-spirit', e => e.textContent.includes('물귀신') && getComputedStyle(e).color === 'rgb(224, 40, 46)').catch(() => false), '빙의한 말은 빨간 글씨');
    check(/STORY time/.test(body) && /Real-world time now/.test(body) && body.includes('이 사람을 믿어도 될까?'), '이야기 속 시간 기준 · 질문이 AI에게 갔다');
    check(!/Recent story|Relationship with/.test(body) && /walk-in stranger/.test(body) && /OBJECTIVE READING/.test(sys), '점괘엔 이야기 · 관계를 안 보낸다 (처음 보는 손님)');
    check(/TAROT/.test(sys) && /Nothing is recorded yet/.test(sys), '타로 규칙 · 「생년월일을 정해라」가 갔다');
    check(s1.f.births.find(b => b.name === 'Leon')?.birth === READ.person.birth, 'Leon의 생년월일이 기억됐다');
    check(/Fortune today/.test(await inj()) && (await inj()).includes(READ.omen), '오늘 본 점괘가 AI에게 가는 글에 한 줄 붙었다');

    // ③ 무당 · 현실 시간 · 목록에 없는 인물 — 기억한 생년월일은 그대로
    await page.click('dialog [data-act="ftm"][data-arg="shaman"]'); await sleep(200);
    await page.click('dialog [data-act="ftb"][data-arg="real"]'); await sleep(200);
    await page.click('dialog [data-act="ftread"]'); await sleep(700);
    ({ p: body, s: sys } = await page.evaluate(() => window.__last));
    check(/Already recorded for Leon/.test(sys) && sys.includes(READ.person.birth) && /SHAMAN/.test(sys), '두 번째부터는 기억한 생년월일을 그대로 쓰라고 간다 · 무당 규칙');
    check(/오방기/.test(body) && /REAL-WORLD time/.test(body), '오방기 · 현실 시간 기준');
    const s2 = await st();
    check(s1.cash - s2.cash > r1.fee, `무당이 타로보다 비싸다 (${s1.cash - s2.cash} > ${r1.fee})`);
    check(s2.f.readings.at(-1).basis === 'real', '현실 시간으로 기록');
    await page.fill('dialog .ss-ft-name', '지나가던 상인'); await page.click('dialog [data-act="ftm"][data-arg="orb"]'); await sleep(200);
    await page.click('dialog [data-act="ftread"]'); await sleep(700);
    check((await st()).f.readings.at(-1).who === '지나가던 상인' && (await st()).f.readings.at(-1).method === 'orb', '목록에 없는 인물도 수정구슬로 볼 수 있다');
    await page.fill('dialog .ss-ft-name', ''); await page.selectOption('dialog .ss-ft-who', 'Me'); await sleep(250);

    // ④ 굿: 저주를 푼다 · 돈이 나간다
    await page.evaluate(() => window.__addUser('go'));
    await page.evaluate(() => window.__addAI('A black cat hisses.\n<meatball>\ncash: +900000\ncurse: 흑묘의 저주 | 가격 +20% | 7 | 고양이에게 사과하기\n</meatball>'));
    await sleep(300);
    let s3 = await st();
    check(s3.f.curses.some(c => c.name === '흑묘의 저주'), '저주가 걸렸다');
    await page.evaluate(() => { window.__ai = (p, s) => { window.__last = { p, s }; return JSON.stringify({ rite: '징 소리가 울린다.', result: '저주가 풀렸다', omen: '검은 고양이가 등을 돌린다' }); }; });
    await page.click('dialog .ss-ft-gut summary'); await sleep(150);
    await page.click('dialog [data-act="ftgut"]'); await sleep(700);
    ({ p: body } = await page.evaluate(() => window.__last));
    const s4 = await st();
    check(/흑묘의 저주/.test(body) && /is lifted/.test(body), '무엇이 풀리는지 정해서 AI에게 갔다');
    check(!s4.f.curses.some(c => c.name === '흑묘의 저주') && s4.cash < s3.cash, `액막이굿 → 저주 풀림 · 돈 나감 (${s3.cash} → ${s4.cash})`);
    check(s4.f.readings.at(-1).method === 'gut', '굿이 기록됐다');
    // 재수굿 → 가호
    await page.click('dialog [data-act="ftg"][data-arg="luck"]'); await sleep(200);
    await page.click('dialog [data-act="ftgut"]'); await sleep(700);
    check((await st()).f.curses.some(c => c.name === '재수굿의 가호' && c.kind === 'bless'), '재수굿 → 가호(축복)가 걸렸다');
    // 돈이 모자라면 못 한다
    await page.evaluate(() => window.__addUser('x'));
    await page.evaluate(() => window.__addAI('Robbed.\n<meatball>\ncash: 0\n</meatball>'));
    await sleep(300);
    const n = (await st()).f.readings.length;
    await page.click('dialog [data-act="ftread"]'); await sleep(400);
    check((await st()).f.readings.length === n, '돈이 모자라면 점을 못 본다');
    // 생년월일 · 복채도 같은 창 안에서 고친다
    await page.click('dialog [data-act="ftbirth"]'); await sleep(200);
    await page.fill('dialog [data-ftb="birth"]', '1999년 1월 1일'); await page.click('dialog [data-act="ftbsave"]'); await sleep(300);
    check((await page.$$('dialog')).length === 1 && (await st()).f.births.find(b => b.name === 'Me')?.birth === '1999년 1월 1일', '생년월일을 창 안에서 고쳤다 (새 창 없음)');
    await page.click('dialog [data-act="ftfee"]'); await sleep(200);
    await page.fill('dialog [data-ftf="feeTarot"]', '7'); await page.click('dialog [data-act="ftfsave"]'); await sleep(300);
    check((await page.$$('dialog')).length === 1 && (await st()).f.feeTarot === 7, '복채를 창 안에서 정했다 (새 창 없음)');
    // 지난 점괘 다시 보기
    await page.evaluate(() => { window.__autoPopup = null; });
    await page.click('dialog .ss-ft details:has(.ss-ft-log) summary'); await sleep(150);
    await page.click('dialog [data-act="ftview"]'); await sleep(300);
    check(!!(await page.$('dialog .ss-ft-pop')), '지난 점괘를 다시 열 수 있다');
    // 지우기: 하나 · 전부
    const before = (await st()).f.readings.length;
    const id0 = (await st()).f.readings[0].id;
    await page.click(`dialog [data-act="ftdel"][data-arg="${id0}"]`); await sleep(300);
    check((await st()).f.readings.length === before - 1 && !(await st()).f.readings.some(r => r.id === id0), '점괘 하나 지우기');
    await page.click('dialog [data-act="ftdelall"]'); await sleep(200);
    await page.click('dialog [data-act="ftdelall"][data-arg="yes"]'); await sleep(300);
    const z = (await st()).f;
    check(!z.readings.length && !z.births.length && !z.omen && (await page.$$('dialog')).length === 1, '점집 기록 전부 지우기 (새 창 없음)');
    check(!/Fortune today/.test(await inj()), '지우면 AI에게 가던 점괘 줄도 사라진다');
    await page.screenshot({ path: '/tmp/fortune-pop.png' });
    check(!logs.length, 'no console errors', logs.join(' | '));
} finally { console.log(logs.join('\n')); await close(); }
