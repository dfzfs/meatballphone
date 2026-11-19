// 📰 세계 소식 종류: 옛 newsline · 네 종류 탭 · 켤 종류 → 적는 법 · 분류 목록 · 피드 카드 · 😌 눈 감기 · 스크린샷
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1440, height: 900 });
const rule = () => page.evaluate(async () => { const { ruleText } = await import('/ext/src/rules/inject.js'); return ruleText(__ML__.fold().book); });
const cls = () => page.evaluate(async () => { const c = await import('/ext/src/rules/classify.js'); const st = await import('/ext/src/base/st.js'); return { allow: [...c.ALLOW(st.nextAiNo())], prompt: c.buildPrompt(window.__st.chat.length - 1)?.user ?? '' }; });
const news = () => page.evaluate(() => __ML__.fold().S.news.map(n => ({ kind: n.kind, text: n.text, who: n.who, icon: n.icon })));
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); const m = st.getMeta(); m.mods.news = true; st.saveMeta(); st.settings().mode = 'A'; });
    const who = await page.evaluate(() => __ML__.fold().book.people[0]?.name ?? 'Leon');
    // 1. 옛 newsline: 글 → 뉴스
    await page.evaluate(() => window.__addUser('뉴스')); await page.evaluate(() => window.__addAI('…\n<meatball>\nnewsline: 항구에 큰 배가 들어왔다\n</meatball>')); await sleep(300);
    let N = await news();
    check(N[0]?.kind === 'world' && N[0].text === '항구에 큰 배가 들어왔다' && N[0].icon === '📰', '옛 newsline: 글 → 📰 뉴스', JSON.stringify(N[0]));
    // 2. 네 종류
    await page.evaluate(() => window.__addUser('소식')); await page.evaluate((w) => window.__addAI(`…\n<meatball>\nnewsline: 뉴스 | 왕이 세금을 내렸다\nnewsline: 소문 | 빵집 주인이 복권에 됐다더라\nfeed: ${w} | 오늘 하늘 진짜 예쁘다\nlife: ${w} | 밤새 검을 갈았다\n</meatball>`), who); await sleep(300);
    N = await news();
    const kinds = N.map(n => n.kind);
    check(['world', 'rumor', 'feed', 'life'].every(k => kinds.includes(k)) && N.find(n => n.kind === 'world' && /세금/.test(n.text)) && !N.some(n => /^뉴스|^소문/.test(n.text)), '네 종류가 각각 들어감 (종류 글자는 떼고)', JSON.stringify(N));
    await page.evaluate(() => __ML__.app.openSheet('news')); await sleep(200);
    const per = {};
    for (const t of ['all', 'world', 'rumor', 'feed', 'life']) {
        await page.evaluate((t) => document.querySelector(`[data-act="nk-tab"][data-v="${t}"]`).click(), t); await sleep(150);
        per[t] = await page.evaluate(() => document.querySelector('.ml-body').textContent);
    }
    check(/세금/.test(per.world) && !/복권/.test(per.world) && /복권/.test(per.rumor) && !/세금/.test(per.rumor) && /하늘/.test(per.feed) && /검을/.test(per.life) && !/하늘/.test(per.life)
        && ['세금', '복권', '하늘', '검을'].every(w => per.all.includes(w)), '탭마다 그 종류만 · 전체엔 다', JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.length]))));
    // 4. 피드 카드: 얼굴 · 이름
    await page.evaluate(() => document.querySelector('[data-act="nk-tab"][data-v="feed"]').click()); await sleep(150);
    const fc = await page.evaluate(() => { const c = document.querySelector('.ml-feed'); return c && { face: c.querySelector('.ml-face')?.textContent ?? '', name: c.querySelector('.ml-feed-h b')?.textContent ?? '', text: c.querySelector('p')?.textContent ?? '', re: c.querySelectorAll('.ml-feed-r span').length }; });
    check(fc && fc.face.trim() && fc.name === who && fc.text === '오늘 하늘 진짜 예쁘다' && fc.re >= 1, '피드 카드에 얼굴 · 이름 · 글 · 반응', JSON.stringify(fc));
    // 3. 켤 종류: 기본은 뉴스 · 화면 밖
    let rt = await rule(), c = await cls();
    check(/newsline: 뉴스/.test(rt) && !/newsline: 소문/.test(rt) && !/^feed:/m.test(rt) && /가끔/.test(rt), '기본: 적는 법엔 뉴스만 (가끔)', rt.split('\n').filter(l => /news|feed|life/.test(l)).join(' / '));
    check(c.allow.includes('newsline') && c.allow.includes('life') && !c.allow.includes('feed'), '기본: 분류 목록엔 뉴스 · 화면 밖', c.allow.join(','));
    // 설정 줄로 소문 · 피드 켜고 뉴스 끄기
    for (const k of ['rumor', 'feed', 'world']) { await page.evaluate((k) => document.querySelector(`[data-act="nk-on"][data-v="${k}"]`).click(), k); await sleep(120); }
    rt = await rule(); c = await cls();
    check(!/newsline: 뉴스/.test(rt) && /newsline: 소문/.test(rt) && /^feed: /m.test(rt), '켠 종류만 적는 법에 (뉴스 끔 · 소문 · 피드 켬)', rt.split('\n').filter(l => /news|feed|life/.test(l)).join(' / '));
    check(c.allow.includes('feed') && /newsline: 소문/.test(c.prompt) && !/newsline: 뉴스/.test(c.prompt), '분류 목록도 켠 종류만', c.prompt.split('\n').filter(l => /news|feed|life/.test(l)).join(' / '));
    // 끈 것까지 다 끄면 소식 줄이 하나도 없음
    for (const k of ['rumor', 'feed', 'life']) await page.evaluate((k) => document.querySelector(`[data-act="nk-on"][data-v="${k}"]`).click(), k), await sleep(120);
    rt = await rule(); c = await cls();
    check(!/newsline|^feed:|^life:/m.test(rt) && !['newsline', 'feed', 'life'].some(k => c.allow.includes(k)), '다 끄면 적는 법 · 분류 목록에서 다 빠짐');
    // 다시 다 켬 (눈 감기 시험용)
    for (const k of ['world', 'rumor', 'feed', 'life']) await page.evaluate((k) => document.querySelector(`[data-act="nk-on"][data-v="${k}"]`).click(), k), await sleep(120);
    // 5. 😌 소식 눈 감기 → 0
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('news', 'on'); });
    rt = await rule(); c = await cls();
    check(!/newsline|feed:|life:/.test(rt) && !['newsline', 'feed', 'life'].some(k => c.allow.includes(k)), '😌 소식 눈 감기: 적는 법 · 분류 목록 0');
    const before = (await news()).length;
    await page.evaluate(() => window.__addUser('또')); await page.evaluate((w) => window.__addAI(`…\n<meatball>\nnewsline: 소문 | 감긴 소문\nfeed: ${w} | 감긴 글\nloc: 광장\n</meatball>`), who); await sleep(300);
    const after = await page.evaluate(() => ({ n: __ML__.fold().S.news.length, loc: __ML__.fold().S.loc }));
    check(after.n === before && after.loc === '광장', '😌 감긴 답: 소식 0개 · 다른 앱은 그대로', JSON.stringify({ before, ...after }));
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.setEyes('news', ''); });
    // 본편 사실(facts)에는 소식이 안 감
    const facts = await page.evaluate(async () => { const { factText } = await import('/ext/src/rules/inject.js'); const f = factText(__ML__.fold()); return f.facts + f.hint; });
    check(!/하늘|복권|세금/.test(facts), '본편 주입엔 소식 글이 안 감');
    // ⏸ 멈춤: 주입 0
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.getMeta().paused = true; });
    await page.evaluate(() => window.__addAI('p\n<meatball>\nfeed: x | y\n</meatball>')); await sleep(200);
    check(!(await page.evaluate(() => window.__prompts.meatlite_rule?.value)), '⏸ 멈춤: 주입 0');
    await page.evaluate(async () => { const st = await import('/ext/src/base/st.js'); st.getMeta().paused = false; });
    // 홈 위젯: 최근 3개 · 종류 아이콘
    await page.evaluate(() => __ML__.app.openSheet('home')); await sleep(200);
    const hw = await page.evaluate(() => [...document.querySelectorAll('.ml-body .ml-rl i')].map(i => i.textContent).join(''));
    check(/[📰💬📱🌙]/u.test(hw), '홈 소식 위젯에 종류 아이콘', hw);
    // 스크린샷: 노트북 · 휴대폰 (전체 탭 · 피드 탭)
    await page.evaluate(() => __ML__.app.openSheet('news')); await sleep(150);
    await page.evaluate(() => document.querySelector('[data-act="nk-tab"][data-v="feed"]').click()); await sleep(200);
    await page.screenshot({ path: '/tmp/newskinds-1440.png' });
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(200);
    await page.evaluate(() => document.querySelector('[data-act="nk-tab"][data-v="all"]').click()); await sleep(200);
    const ov = await page.evaluate(() => { const b = document.querySelector('.ml-body'); return b.scrollWidth - b.clientWidth; });
    check(ov <= 2, `휴대폰 폭 가로 넘침 없음 (${ov}px)`);
    await page.screenshot({ path: '/tmp/newskinds-390.png' });
    check(!logs.length, '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
