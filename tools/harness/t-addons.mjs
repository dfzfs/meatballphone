// 🧩 덧붙이는 기능 (src/addons.js · relgraph.js · minihome.js의 일촌평 · TODAY): 전부 끄면 흔적 없음 · 하나씩 켜면 그것만 움직임 · 기능끼리 엮이는 곳 (장비 → 흥정/판정 · 날씨 → 흥정 · 선물 취향 → 방명록 · 약속 기한 → 우정)
import { open, makeStatus, check } from './lib.mjs';
const { page, logs, close } = await open();
const miss = []; page.on('response', (res) => { if (res.status() === 404) miss.push(res.url()); });
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'shop', 'rel', 'map', 'calendar', 'contact', 'memo', 'quest']);
    const r = await page.evaluate(async () => {
        const core = await import('/ext/src/core.js'); const eng = await import('/ext/src/engine.js'); const pr = await import('/ext/src/prompts.js');
        // ── 아무것도 안 켰으면 파일을 읽지도 않는다 (걸어 둔 app.이름도 · 프롬프트 목록도 없음) ──
        const app0 = window.__SS_TEST__.api.app, loaded = () => performance.getEntriesByType('resource').some(x => /src\/(addons|minihome)\.js/.test(x.name));
        const notLoaded = !loaded() && app0.extraInject === undefined && app0.gbNudge === undefined && app0.rollBonus === undefined && app0.loadAddons() === null && !pr.PROMPT_DEFS.some(d => /^(hompy|addon)\./.test(d.key));
        // 설정 창: 새 체크 칸은 전부 꺼진 채로 있고 · 하나를 켜면 그때 파일을 불러오고 · 맨 위 「켜 둔 선택 기능」 줄에 이름이 생긴다
        const box = (k) => document.querySelector(`#ss-settings input[data-s="${k}"]`), onLine = () => [...document.querySelectorAll('#ss-settings [data-s-on] [data-s-go]')].map(b => b.dataset.sGo);
        const setUI = ['ambientOn', 'ambientShop', 'giftTaste', 'promiseClock', 'mergeContact', 'trendMore'].every(k => box(k) && !box(k).checked) && !onLine().includes('giftTaste') && onLine().includes('guideOn');
        box('giftTaste').checked = true; box('giftTaste').dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 600));
        const setLoads = loaded() && typeof app0.giftAff === 'function' && onLine().includes('giftTaste') && core.settings().giftTaste === true;
        box('giftTaste').checked = false; box('giftTaste').dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200));
        const setBack = !onLine().includes('giftTaste') && core.settings().giftTaste === false;
        await app0.loadAddons(true);
        const add = await import('/ext/src/addons.js'); const mh = await import('/ext/src/minihome.js');
        const rg = await import('/ext/src/relgraph.js'); const story = await import('/ext/src/story.js'); const trend = await import('/ext/src/trend.js');
        const app = window.__SS_TEST__.api.app, wait = (ms) => new Promise(r => setTimeout(r, ms));
        const st = () => app.current.state, out = {}, set = core.settings(), meta = () => core.getMeta();
        const P4 = () => window.__prompts.statussim_story?.value ?? '';
        const inj = async () => { app.refreshNow?.(); await wait(150); return add.extraInjection(); };
        const put = async (mod, fn) => { const nd = core.clone(st().data[mod]); fn(nd); await eng.commit(mod, nd, ''); await wait(250); };
        let calls = 0; const ai0 = window.__ai; window.__ai = () => { calls++; return '한 줄 답'; };
        out.settingsUI = setUI; out.settingsLoadsOnTick = setLoads; out.settingsBack = setBack;
        out.notLoadedUntilNeeded = notLoaded && loaded() && typeof app.extraInject === 'function' && pr.PROMPT_DEFS.filter(d => /^(hompy|addon)\./.test(d.key)).length === 4;
        const KEYS = ['trendMore', 'mergeContact', 'gearOn', 'ambientOn', 'ambientShop', 'giftTaste', 'promiseClock', 'guestbook', 'guestbookAuto', 'ledgerPromise'];
        const allOff = () => { for (const k of KEYS) set[k] = false; };
        await window.__addUser('hi'); await window.__addAI('s\n<meatball>\naff: Mira +5\naff: Leon +30\ntrust: Leon +10\n</meatball>'); await wait(300);
        await put('stats', d => { d.attrs = [...d.attrs.filter(a => a.name !== '매력'), { name: '매력', val: 1, desc: '' }]; });
        await put('wallet', d => { d.items.push({ name: '은반지', qty: 1, desc: '', effect: '매력 +2, 가격 -10%' }, { name: '낡은 검', qty: 1, desc: '', effect: '힘 +1' }); });
        await put('rel', d => { const l = d.user.find(x => x.name === 'Leon'); l.likes = '은반지, 꽃'; l.dislikes = '술'; });
        // ── 전부 끔: 흔적 없음 ──
        allOff();
        const inj0 = P4();
        out.offInject = (await inj()) === '' && P4() === inj0;
        out.offMeta = !meta().gear && !meta().roomTell && !meta().ctLore && !meta().gbook;
        out.offHooks = app.gearBonus('매력') === 0 && app.rollBonus('매력') === 0 && app.giftAff(st(), 'Leon', '은반지') === undefined && app.haggleDC(st()) === 0 && app.shopClosed(st()) === false && app.ambient() === null && app.contactLore('Leon') === '';
        out.offEquip = add.equip('장신구', '은반지') === false && add.equipped().length === 0 && !meta().gear;
        const base = eng.skillRoll(st(), '매력', 12).mod;
        out.baseMod = base === 1;
        // ── ⚔ 장비만 켬 ──
        set.gearOn = true;
        out.gearEquip = add.equip('장신구', '은반지') === true && add.equip('무기', '없는 물건') === false && add.equipped().length === 1 && add.gearBonus('매력') === 2 && add.gearBonus('힘') === 0;
        out.gearParse = JSON.stringify(add.parseBonus('힘 +2, 가격 -10%')) === JSON.stringify([{ k: '힘', v: 2, pct: false }, { k: '가격', v: -10, pct: true }]);
        out.gearRolls = eng.skillRoll(st(), '매력', 12).mod === 3 && eng.questRoll(st(), { check: { attr: '매력', dc: 12 } }, undefined, app.rollBonus('매력')).mod === 3 && eng.questRoll(st(), { check: { attr: '매력', dc: 12 } }, 'seed').mod === 1; // 흥정 · 일하기 · 직접 굴린 퀘스트에만 — AI 답에서 자동으로 굴리는 쪽(씨앗)은 그대로
        const gi = await inj();
        out.gearInject = gi.includes('EQUIPPED') && gi.includes('은반지') && gi.includes('TASTE') && gi.includes('Leon likes') && !gi.includes('CONDITIONS') && P4().includes('EQUIPPED');
        out.gearOnlyGear = app.giftAff(st(), 'Leon', '은반지') === undefined && app.haggleDC(st()) === 0;
        add.equip('무기', '은반지'); out.gearOneSlot = add.equipped().length === 1 && add.equipped()[0].slot === '무기';
        await put('wallet', d => { d.items = d.items.filter(i => i.name !== '은반지'); });
        out.gearGone = add.equipped().length === 0 && add.gearBonus('매력') === 0 && eng.skillRoll(st(), '매력', 12).mod === 1;
        await put('wallet', d => { d.items.push({ name: '은반지', qty: 1, desc: '', effect: '매력 +2' }); });
        set.gearOn = false;
        out.gearOff = add.gearBonus('매력') === 0 && (await inj()) === '' && P4() === inj0;
        // ── 🌦 날씨/시간대만 켬 ──
        const fake = (weather, time) => add.ambientOf({ data: { calendar: { weather, time } } }).tags.join(',');
        out.ambWords = fake('눈부신 햇살', '낮') === '' && fake('가랑비', '낮') === 'rain' && fake('눈', '밤') === 'snow,night' && fake('맑음', '준비 시간') === '' && fake('폭풍우', '새벽') === 'storm,night';
        set.ambientOn = true;
        await put('calendar', d => { d.weather = '비'; d.autoWeather = false; d.time = '밤'; });
        const ai1 = await inj();
        out.ambInject = ai1.includes('CONDITIONS') && ai1.includes('rain') && ai1.includes('night') && !ai1.includes('EQUIPPED');
        out.ambHaggle = app.haggleDC(st()) === -2 && app.shopClosed(st()) === false; // 밤에 닫는 건 따로 켜야
        set.ambientShop = true; out.ambClosed = app.shopClosed(st()) === true;
        set.ambientOn = false; out.ambOff = app.shopClosed(st()) === false && app.haggleDC(st()) === 0 && (await inj()) === '';
        set.ambientShop = false;
        // ── 🎁 취향 ↔ 선물만 켬 ──
        set.giftTaste = true;
        out.gift = add.giftReaction('Leon', '은반지') === 'like' && add.giftReaction('Leon', '독한 술') === 'dislike' && add.giftReaction('Leon', '돌멩이') === '' && add.giftReaction('없는사람', '꽃') === '' && add.giftReaction('Leon', '꽃다발') === 'like' && add.giftReaction('Leon', '미술 도구') === '' && add.giftReaction('Leon', '맥주') === '';
        out.giftAff = app.giftAff(st(), 'Leon', '은반지') === 4 && app.giftAff(st(), 'Leon', '독한 술') === -1 && app.giftAff(st(), 'Leon', '돌멩이') === 2;
        out.giftNoNudgeWhenGbOff = !meta().gbook;
        // 방명록과 엮임: 취향에 맞는 선물 → 그 사람이 다음 방명록을 쓴다 · 되돌릴 때의 계산은 건드리지 않는다
        set.guestbook = true;
        app.giftAff(st(), 'Mira', '돌멩이'); out.nudgeNone = !meta().gbook?.nudge;
        app.giftAff(st(), 'Leon', '은반지', true); out.nudgeRefund = !meta().gbook?.nudge;
        app.giftAff(st(), 'Leon', '은반지');
        out.nudge = meta().gbook?.nudge?.who === 'Leon' && mh.gbPick(st(), () => 0.999) === 'Leon' && mh.gbPick(st(), () => 0) === 'Leon';
        let seen = ''; window.__ai = (p) => { calls++; seen = p; return '반지 고마워. 잘 낄게.'; };
        const g1 = await mh.gbWrite();
        out.nudgeUsed = g1?.who === 'Leon' && seen.includes('a gift Leon loves') && !meta().gbook.nudge;
        // 💬 일촌평 · 👣 TODAY · 🧱 담벼락
        window.__ai = () => { calls++; return '"내 사람"'; };
        const il = await mh.ilchonWrite('Leon');
        out.ilchon = il?.text === '내 사람' && il.stale === false && mh.ilchonList().some(x => x.who === 'Mira' && x.text === '') && mh.ilchonSet('Mira', '동네 친구') && mh.ilchonOf('Mira').text === '동네 친구';
        const tc = mh.todayCount();
        out.today = tc.today >= 1 && tc.total >= tc.today && Array.isArray(tc.who);
        out.wall = mh.wall().some(x => x.kind === 'guest' && x.who === 'Leon') && Array.isArray(mh.timelineExtra());
        set.giftTaste = false; out.giftOff = app.giftAff(st(), 'Leon', '은반지') === undefined;
        // ── 👥 단체방을 본편에 알리기 ──
        await put('contact', d => { d.rooms = { 셋이서: { members: ['Leon', 'Mira'], msgs: [{ id: 'a', from: 'me', text: '내일 등대에서 보자' }, { id: 'b', from: 'them', who: 'Leon', text: '좋아, 일찍 갈게' }] } }; });
        out.roomKept = !!st().data.contact.rooms?.['셋이서'];
        out.roomOff = add.roomTell('셋이서').mode === 'off' && (await inj()) === '';
        add.setRoomTell('셋이서', { mode: 'summary', summary: '내일 등대에서 만나기로 함' });
        const r1 = await inj(); out.roomSummary = r1.includes('GROUP CHAT') && r1.includes('내일 등대에서 만나기로 함') && !r1.includes('일찍 갈게');
        add.setRoomTell('셋이서', { mode: 'pick', ids: ['b'] });
        const r2 = await inj(); out.roomPick = r2.includes('Leon: 좋아, 일찍 갈게') && !r2.includes('내일 등대에서 보자') && !r2.includes('만나기로 함');
        window.__ai = () => { calls++; return '셋이 내일 등대에 가기로 했다.'; };
        out.roomAI = (await add.roomSummaryAI('셋이서')) === '셋이 내일 등대에 가기로 했다.' && add.roomTell('셋이서').mode === 'summary';
        add.setRoomTell('셋이서', { mode: 'off', summary: '', ids: [] });
        out.roomClear = !meta().roomTell?.['셋이서'] && (await inj()) === '';
        // ── 🔗 합칠 때 연락 대화도 ──
        await put('contact', d => { d.contacts = [...d.contacts.filter(c => !['Leo', 'Leon'].includes(c.name)), { name: 'Leo', handle: '@leo' }, { name: 'Leon' }]; d.threads.Leo = [{ id: 'm1', from: 'them', text: '레오야', at: 1 }]; d.threads.Leon = [{ id: 'm2', from: 'me', text: '안녕', at: 2 }]; d.unread = { ...(d.unread ?? {}), Leo: 1 }; });
        out.mergeAskOff = (await app.mergeContactAsk('Leo', 'Leon')) === false && st().data.contact.contacts.some(c => c.name === 'Leo'); // 설정을 안 켰으면 묻지도 않는다
        out.mergeNeed = add.contactMergeNeeded('Leo', 'Leon') && !add.contactMergeNeeded('없음', 'Leon') && !add.contactMergeNeeded('Leon', 'Leon');
        out.merge = (await add.mergeContactThreads('Leo', 'Leon')) === true; await wait(250);
        const ct = st().data.contact;
        out.merged = !ct.contacts.some(c => c.name === 'Leo') && ct.threads.Leon?.length === 2 && ct.threads.Leon[0].text === '레오야' && !ct.threads.Leo && ct.unread.Leon === 1 && ct.contacts.find(c => c.name === 'Leon').handle === '@leo';
        // ── 📚 연락처별 로어북 (읽어 둔 것을 답장 재료에) ──
        meta().ctLore = { Leon: [{ book: 'b', uid: 1, head: '등대', body: '등대지기는 Leon의 삼촌이다' }] };
        out.lore = app.contactLore('Leon').includes('등대지기는 Leon의 삼촌') && app.contactLore('Mira') === '' && add.contactLoreOf('constructor').length === 0 && Array.isArray(await add.loreEntries());
        delete meta().ctLore;
        // ── 🤝 약속 기한 ──
        set.ledgerPromise = true; set.promiseClock = true;
        const today = eng.today(st());
        story.storyData(true).promises = [{ id: 'p1', text: '등대에 같이 가기', to: 'Leon', due: '1일 안에', state: 'open', at: 0, day: today }, { id: 'p2', text: '언젠가 밥 사기', to: 'Mira', due: '기분 내킬 때', state: 'open', at: 0, day: today }];
        const dd = add.promiseDday(story.storyData().promises[0]);
        out.dday = dd?.left === 1 && add.promiseDday(story.storyData().promises[1]) === null;
        out.ddayInject = (await inj()).includes('PROMISE DEADLINES') && (await inj()).includes('due tomorrow');
        const trust0 = st().data.rel.user.find(x => x.name === 'Leon').trust;
        await window.__addUser('n'); await window.__addAI('s\n<meatball>\ndays: +2\n</meatball>'); await wait(1800);
        const p1 = story.storyData().promises.find(p => p.id === 'p1');
        out.ddayBroken = p1.state === 'broken' && st().data.rel.user.find(x => x.name === 'Leon').trust === trust0 - 4 && story.storyData().promises.find(p => p.id === 'p2').state === 'open';
        out.ddayNudge = meta().gbook?.nudge?.who === 'Leon'; // 약속을 어기면 그 사람이 방명록에 한마디
        set.promiseClock = false; set.ledgerPromise = false;
        // ── 📊 크기 · 🖼 카드 · 🕸 관계도 · 📈 그래프 ──
        const cs = add.chatSize(); out.size = cs.total > 0 && cs.total === cs.meta + cs.msgs && cs.top.length > 0 && cs.top[0][1] >= cs.top.at(-1)[1];
        const cv = add.cardCanvas(); out.card = cv instanceof HTMLCanvasElement && cv.width === 1440 && cv.toDataURL('image/png').startsWith('data:image/png') && !!add.cardData().name;
        const g = rg.relGraph();
        out.graph = g.nodes[0].me === true && g.nodes.some(n => n.name === 'Leon' && n.ilchon === '내 사람') && g.nodes.every(n => n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1) && g.edges.filter(e => e.kind === 'user').length === g.nodes.length - 1 && g.edges.find(e => e.b === 'leon').tone === 'good' && rg.relGraphOf('Leon').edges.every(e => e.a === 'leon' || e.b === 'leon') && rg.relGraph({ data: {} }).nodes.length === 0;
        const td0 = trend.trendData(); out.trendOff = Object.keys(td0.bars).length === 0 && td0.marks.length === 0 && !trend.trendHTML().includes('수치 · 내 탭');
        set.trendMore = true; const td = trend.trendData();
        out.trend = Array.isArray(td.marks) && typeof td.bars === 'object' && Object.values(td.bars).every(a => a.length === td.xs.length) && Object.values(td.aff).every(a => a.length === td.xs.length) && Object.keys(td.bars).length > 0 && trend.trendHTML().includes('수치 · 내 탭');
        // ── 다시 전부 끔 ──
        mh.gbClear(); allOff(); delete meta().gear;
        out.offAgain = (await inj()) === '' && add.gearBonus('매력') === 0 && app.giftAff(st(), 'Leon', '은반지') === undefined && (await mh.gbWrite('Leon')) === null;
        out._calls = calls;
        window.__ai = ai0;
        return out;
    });
    console.log(`  · 확장 AI 호출 ${r._calls}회 (방명록 1 · 일촌평 1 · 단체방 요약 1 이어야 함)`); check(r._calls === 3, 'addons: AI는 누를 때만 (3회)', String(r._calls)); delete r._calls;
    for (const [k, v] of Object.entries(r)) check(v === true, `addons ${k}`, v === true ? '' : JSON.stringify(v));
    // 시험대에는 실리의 world-info.js가 없어서 로어북 목록을 읽을 때 404가 한 번 난다 (그것 말고는 없어야 함)
    check(miss.every(u => /world-info\.js$/.test(u)), 'addons: 못 찾은 파일 없음', miss.join(' '));
    check(!logs.some(l => /error/i.test(l) && !/favicon|status of 404/.test(l)), 'addons: 콘솔 오류 없음', logs.filter(l => /error/i.test(l)).slice(0, 3).join(' | '));
} finally { await close(); }
