// 🛡 간섭 차단 스위치 둘(guardData · guardLook) + 미트볼이 직접 하게 된 것(채팅 읽는 방식 · 작가 노트 · 숨긴 답 빼기 · 지우기 확인 · 뒤로 가기)
// 「끄면 예전 그대로」도 같이 본다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    // 진짜 실리처럼: 모듈에서 직접 받는 getContext (감싸지 않은 것). st-context.js는 없는 옛 실리인 척 → extensions.js로 넘어가는 길도 같이 본다
    await page.route('**/scripts/extensions.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const getContext = () => window.__pureCtx();' }));
    await page.evaluate(() => { const inner = window.SillyTavern.getContext; window.__pureCtx = inner; });
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'calendar', 'memo']);
    const cash0 = await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash);
    const set = (o) => page.evaluate(async (o) => { const core = await import('/ext/src/core.js'); Object.assign(core.settings(), o); core.saveSettings(); await window.__SS_TEST__.api.app.applyGuard(); }, o);
    const cash = () => page.evaluate(() => { window.__SS_TEST__.api.app.refreshNow(); return window.__SS_TEST__.api.app.current.state.data.wallet.cash; });

    console.log('— 기본값');
    const def = await page.evaluate(async () => { const s = (await import('/ext/src/core.js')).settings(); return [s.guardData, s.guardLook, s.genRead, s.genNote, s.hideSkip, s.askDelete, s.backClose]; });
    check(JSON.stringify(def) === JSON.stringify([false, false, 'short', false, false, true, true]), '차단 스위치 둘 · 새 읽기 방식 · 작가 노트 · 숨긴 답 빼기는 기본 끔', JSON.stringify(def));

    console.log('— 📖 채팅 읽는 방식 · 📝 작가 노트');
    const long = `START ${'가나다라마바사 '.repeat(400)} THE-END`;
    await page.evaluate(() => window.__addUser('first user line FIRST-MARK'));
    await page.evaluate((t) => window.__addAI(`${t}\n<meatball>\ncash: -10\n</meatball>`), long);
    for (let i = 0; i < 24; i++) await page.evaluate((i) => window.__addUser(`filler ${i}`), i);
    await page.evaluate((t) => window.__addAI(`${t}\n<meatball>\ncash: -5\n</meatball>`), long.replace('THE-END', 'LAST-END'));
    const src = (o = {}) => page.evaluate(async (o) => (await import('/ext/src/engine.js')).gatherSources(o), o);
    let s0 = await src();
    check(s0.includes('[RECENT CHAT]') && !s0.includes('LAST-END') && !s0.includes('FIRST-MARK'), 'short(기본): 최근 것만 · 메시지마다 앞부분만 (예전 그대로)');
    await set({ genRead: 'last' }); s0 = await src();
    check(s0.includes('LAST-END') && !s0.includes('THE-END') && !s0.includes('FIRST-MARK'), 'last: 마지막 답만 전체');
    await set({ genRead: 'all' }); s0 = await src();
    check(s0.includes('[CHAT SO FAR') && s0.includes('FIRST-MARK') && s0.includes('THE-END') && s0.includes('LAST-END'), 'all: 처음부터 끝까지');
    await set({ genRead: 'all', genReadCap: 4000 }); s0 = await src();
    check(s0.includes('LAST-END') && !s0.includes('THE-END') && s0.length < 12000, 'all + 상한: 최근 것은 전체 · 오래된 것은 앞부분만', String(s0.length));
    await set({ genRead: 'short', genReadCap: 120000 });
    await page.evaluate(() => { window.__st.chatMetadata.note_prompt = 'Me is a retired NOTE-KNIGHT.'; });
    check(!(await src()).includes('NOTE-KNIGHT'), '작가 노트: 끄면 안 읽음');
    await set({ genNote: true });
    check((await src()).includes('NOTE-KNIGHT') && !(await src({ note: false })).includes('NOTE-KNIGHT'), '작가 노트: 켜면 읽음 · 만들기 창에서 끄면 그 요청에서만 빠짐');
    await set({ genNote: false });

    console.log('— 🙈 숨긴 답 빼기');
    const base1 = await cash();
    check(base1 === cash0 - 15, '두 답의 변화가 더해져 있음', `${cash0} → ${base1}`);
    const last = await page.evaluate(() => window.__st.chat.length - 1);
    const hide = (on, viaClick) => page.evaluate(async ({ i, on, viaClick }) => {
        const m = window.__st.chat[i], el = document.querySelector(`#chat .mes[mesid="${i}"] .extraMesButtons`);
        el.innerHTML = '<div class="mes_button mes_hide"></div><div class="mes_button mes_unhide"></div>';
        if (viaClick) el.querySelector(on ? '.mes_hide' : '.mes_unhide').click(); // 사람이 눈 단추를 누름
        m.is_system = on; // 실리태번이 숨김 처리
        await new Promise(r => setTimeout(r, 700));
    }, { i: last, on, viaClick });
    await hide(true, true);
    check(await cash() === base1, 'hideSkip 끔: 숨겨도 계속 더함 (예전 그대로)');
    await hide(false, true);
    await set({ hideSkip: true });
    await hide(true, false);
    check(await cash() === base1, 'hideSkip 켬: 단추를 안 거치고 숨겨진 답(요약 확장 · /hide)은 계속 더함');
    await hide(false, false); await hide(true, true);
    check(await cash() === base1 + 5 && await page.evaluate((i) => window.__st.chat[i].extra.ss_skip === true, last), 'hideSkip 켬: 눈 단추로 숨긴 답은 빠짐', String(await cash()));
    await hide(false, true);
    check(await cash() === base1 && await page.evaluate((i) => window.__st.chat[i].extra.ss_skip === undefined, last), '다시 보이게 하면 돌아옴 · 표식도 지워짐');
    await set({ hideSkip: false });

    console.log('— 🛡 데이터 보호: 남이 적은 표식');
    await page.evaluate((i) => { const m = window.__st.chat[i]; m.is_system = true; m.extra.type = 'other-ext-hidden'; }, last);
    await page.evaluate(async () => { (await import('/ext/src/core.js')).rev.n++; });
    check(await cash() === base1 + 5, '끔: 남이 적은 extra.type 표식대로 그 답이 빠짐 (예전 그대로)');
    await set({ guardData: true });
    check(await cash() === base1, '켬: 그 표식을 무시하고 그대로 더함');
    await page.evaluate((i) => { window.__st.chat[i].extra.type = 'narrator'; }, last);
    await page.evaluate(async () => { (await import('/ext/src/core.js')).rev.n++; });
    check(await cash() === base1 + 5, '켬: 실리태번의 진짜 시스템 메시지 종류는 여전히 뺌');
    await page.evaluate((i) => { const m = window.__st.chat[i]; m.is_system = false; delete m.extra.type; }, last);
    await page.evaluate(async () => { (await import('/ext/src/core.js')).rev.n++; });
    await set({ guardData: false });

    console.log('— 🛡 데이터 보호: 프롬프트 끝에 덧붙은 덩어리');
    const pr = () => page.evaluate(async () => { const p = await import('/ext/src/prompts.js'); return [p.P('gen.system'), p.PROMPT_MAP['gen.system'].text]; });
    await page.evaluate(async () => { const p = await import('/ext/src/prompts.js'), core = await import('/ext/src/core.js'); (core.settings().prompts ??= {})['gen.system'] = `${p.PROMPT_MAP['gen.system'].text}\n\n=== THEME NOTE ===\nFOREIGN-LINE {{theme_macro}}\n=== END THEME NOTE [d:0123abcd] ===`; });
    let [got, defText] = await pr();
    check(got.includes('FOREIGN-LINE'), '끔: 저장된 글 그대로 보냄 (예전 그대로)');
    await set({ guardData: true }); [got, defText] = await pr();
    const same = await page.evaluate(async (d) => (await import('/ext/src/prompts.js')).P('gen.system') === d.replace(/\{outLang\}/g, 'Korean'), defText);
    check(!got.includes('FOREIGN-LINE') && same, '켬: 덧붙은 덩어리를 떼고 보냄 (기본 문구와 같아짐)');
    check(await page.evaluate(async () => (await import('/ext/src/core.js')).settings().prompts['gen.system'].includes('FOREIGN-LINE')), '저장된 글은 건드리지 않음 (프롬프트 창에서 직접 지울 수 있게)');
    await page.evaluate(async () => { const core = await import('/ext/src/core.js'); delete core.settings().prompts['gen.system']; });

    console.log('— 🛡 데이터 보호: 기준 자료 봉인');
    const poke = () => page.evaluate(() => { const m = window.__st.chatMetadata.statussim; m.base.data.wallet.cash += 777; m.base.data.rel.user.push({ name: 'Intruder', aff: 99, trust: 99 }); m.origin.data.wallet.cash += 777; });
    const relN = () => page.evaluate(() => window.__st.chatMetadata.statussim.base.data.rel.user.length);
    await set({ guardData: false });
    const rel0 = await relN(), c0 = await cash(), org0 = await page.evaluate(() => window.__st.chatMetadata.statussim.origin.data.wallet.cash);
    await poke();
    check(await cash() === c0 + 777 && await relN() === rel0 + 1, '끔: 밖에서 고친 자료가 그대로 반영됨 (예전 그대로)');
    await page.evaluate(() => { const m = window.__st.chatMetadata.statussim; m.base.data.wallet.cash -= 777; m.base.data.rel.user.pop(); m.origin.data.wallet.cash -= 777; });
    await cash();
    await set({ guardData: true });
    await page.evaluate(() => { window.__toasts.length = 0; });
    await poke();
    check(await cash() === c0 && await relN() === rel0, '켬: 밖에서 고친 기준 자료(돈 · 인물 추가)를 되돌림', `${await cash()} / ${await relN()}`);
    check(await page.evaluate(() => window.__st.chatMetadata.statussim.origin.data.wallet.cash) === org0, '처음 상태(origin)도 같이 되돌림');
    check(await page.evaluate(() => window.__toasts.some(t => /되돌렸어요/.test(t.msg))), '되돌렸다고 알림');
    // 미트볼이 직접 고친 것은 그대로
    await page.evaluate(async () => { const e = await import('/ext/src/engine.js'), s = window.__SS_TEST__.api.app.current.state; const nd = structuredClone(s.data.wallet); nd.cash += 321; await e.commit('wallet', nd, '시험'); });
    check(await cash() === c0 + 321, '켬: 미트볼 화면에서 고친 것은 되돌리지 않음', String(await cash()));
    check(await page.evaluate(() => (window.__SS_TEST__.api.app.guardHits ?? 0)) === 1, '되돌린 횟수 1 (헛짚지 않음)');

    console.log('— 🛡 데이터 보호: 감싼 getContext 건너뛰기');
    await page.evaluate(() => { const inner = window.SillyTavern.getContext; window.SillyTavern.getContext = () => { const c = inner(); return new Proxy(c, { get: (t, k) => (k === '__wrapped' ? true : k === 'generateRaw' ? async () => 'HIJACKED' : t[k]) }); }; });
    await sleep(20);
    const viaGuard = await page.evaluate(async () => { const core = await import('/ext/src/core.js'); core.ctxReset(); const c = core.ctx(); return [c.__wrapped === true, await c.generateRaw({ prompt: 'x' })]; });
    check(viaGuard[0] === false && viaGuard[1] !== 'HIJACKED', '켬: 실리태번 모듈에서 직접 받은 문맥을 씀 (감싸개를 안 거침)', JSON.stringify(viaGuard));
    await set({ guardData: false });
    const viaOld = await page.evaluate(async () => { const core = await import('/ext/src/core.js'); core.ctxReset(); return core.ctx().__wrapped === true; });
    check(viaOld === true, '끔: 예전처럼 전역 getContext (감싸개가 있으면 그대로 거침)');

    console.log('— 🛡 화면 보호');
    await page.evaluate(() => {
        const a = document.createElement('style'); a.id = 'foreign-dedicated';
        a.textContent = 'body.themed .ss-scope{--ss-bg:rgb(1,2,3)}body.themed .ss-scope .ss-btn{color:red}body.themed #ss-hud{font-family:serif}@media (max-width:9999px){body.themed .ss-root .ss-chip{color:blue}}body.themed #ss-settings .x{color:red}body.themed .other{color:red}';
        const b = document.createElement('style'); b.id = 'foreign-theme';
        b.textContent = 'body{margin:0}.mes{color:inherit}#chat{gap:1px}.menu_button{cursor:pointer}body.themed .ss-scope{outline:0}';
        document.head.append(a, b);
        document.body.classList.add('themed');
        const tab = document.createElement('div'); tab.className = 'theme-ext-tabs'; tab.textContent = 'tabs'; document.querySelector('#ss-settings .inline-drawer-content')?.prepend(tab);
        document.body.classList.add('show-settings');
    });
    const sheets = () => page.evaluate(() => ['foreign-dedicated', 'foreign-theme'].map(id => document.getElementById(id).sheet.disabled));
    check(JSON.stringify(await sheets()) === '[false,false]', '끔: 남의 시트를 건드리지 않음');
    await set({ guardLook: true }); await sleep(300);
    check(JSON.stringify(await sheets()) === '[true,false]', '켬: 미트볼 전용 맞춤 시트만 끔 · 테마 본체 시트는 그대로', JSON.stringify(await sheets()));
    check(await page.evaluate(() => document.body.classList.contains('ss-guard-look')), '켬: body 표식');
    check(await page.evaluate(() => { const t = document.querySelector('#ss-settings .theme-ext-tabs'); return !!t && getComputedStyle(t).display === 'none'; }), '켬: 설정 칸에 끼워진 남의 요소를 숨김');
    check(await page.evaluate(() => [...document.querySelectorAll('#ss-settings label.checkbox_label')].every(l => getComputedStyle(l).display !== 'none')), '우리 설정 줄은 하나도 안 숨김');
    check(await page.evaluate(() => [...document.styleSheets].filter(s => (s.ownerNode?.id ?? '').startsWith('ss-') || /\/ext\//.test(s.href ?? '')).every(s => !s.disabled)), '우리 시트는 그대로 켜져 있음');
    await page.evaluate(() => { const c = document.createElement('style'); c.id = 'foreign-late'; c.textContent = '.ss-scope a{color:red}.ss-scope b{color:red}#ss-hud i{color:red}'; document.head.append(c); }); await sleep(400);
    check(await page.evaluate(() => document.getElementById('foreign-late').sheet.disabled), '뒤늦게 붙은 맞춤 시트도 끔');
    await set({ guardLook: false }); await sleep(200);
    check(JSON.stringify(await sheets()) === '[false,false]' && await page.evaluate(() => !document.body.classList.contains('ss-guard-look') && !document.getElementById('foreign-late').sheet.disabled && getComputedStyle(document.querySelector('#ss-settings .theme-ext-tabs')).display !== 'none'), '끄면 전부 원래대로');
    await page.evaluate(() => { document.body.classList.remove('themed', 'show-settings'); document.querySelector('#ss-settings .theme-ext-tabs')?.remove(); for (const id of ['foreign-dedicated', 'foreign-theme', 'foreign-late']) document.getElementById(id).remove(); });

    console.log('— 🗑 지우기 확인');
    const ask = (trusted) => page.evaluate(async (trusted) => {
        const kit = await import('/ext/src/kit.js');
        if (!trusted) document.body.click();
        return !!(await kit.askDelete('지울까요?'));
    }, trusted);
    await page.evaluate(() => { window.__autoPopup = 'cancel'; });
    await page.mouse.click(5, 5);
    check(await ask(true) === false, '사람이 누른 뒤: 물어봄 (취소 → 안 지움)');
    check(await ask(false) === true, '스크립트가 대신 누른 뒤(누가 이미 물어보고 다시 눌러 준 경우): 또 묻지 않음');
    await page.mouse.click(5, 5);
    await set({ askDelete: false });
    check(await ask(true) === true, '설정을 끄면 예전처럼 바로');
    await set({ askDelete: true });
    await page.evaluate(() => { window.__autoPopup = 'ok'; });

    console.log('— ◀ 뒤로 가기로 창 닫기');
    // 진짜 실리처럼 만들 때 바로 dlg가 있는 팝업으로 바꿔 본다 (시험대 팝업은 show() 때 만들어서 뒤로 가기 길을 안 탄다)
    await page.evaluate(() => {
        const c = window.SillyTavern.getContext();
        window.__st2 = class {
            constructor(content) { this.dlg = document.createElement('dialog'); this.dlg.className = 'popup'; const b = document.createElement('div'); b.className = 'popup-content'; b.append(content); const ok = document.createElement('div'); ok.className = 'popup-button-ok'; ok.textContent = 'ok'; this.dlg.append(b, ok); this.ok = ok; }
            show() { document.body.append(this.dlg); this.dlg.show(); return new Promise(res => { this.ok.onclick = () => { this.dlg.close(); this.dlg.remove(); res(1); }; }); }
        };
        window.SillyTavern.getContext = () => new Proxy(c, { get: (t, k) => (k === 'Popup' ? window.__st2 : t[k]) });
        window.__ssBackAlways = true; // 뒤로 가기로 닫기는 폰 · 태블릿에서만 → 여기서는 폰처럼 (t-backclose에서 PC 쪽을 본다)
    });
    const openOne = () => page.evaluate(async () => { const core = await import('/ext/src/core.js'), kit = await import('/ext/src/kit.js'); core.ctxReset(); const el = document.createElement('div'); el.textContent = 'back-test'; window.__closed = false; kit.popup(el).then(() => { window.__closed = true; }); await new Promise(r => setTimeout(r, 50)); return [history.state?.ssDlg ?? 0, !!document.querySelector('dialog.ss-dlg[open]')]; });
    let o = await openOne();
    check(o[0] >= 1 && o[1], '창이 뜨면 방문 기록에 한 칸', JSON.stringify(o));
    await page.evaluate(() => history.back()); await sleep(200);
    check(await page.evaluate(() => window.__closed === true && !document.querySelector('dialog.ss-dlg[open]')), '뒤로 가기 → 창이 닫힘');
    o = await openOne();
    const len = await page.evaluate(() => history.length);
    await page.evaluate(() => document.querySelector('dialog.ss-dlg .popup-button-ok').click()); await sleep(200);
    check(await page.evaluate(() => window.__closed === true && (history.state?.ssDlg ?? 0) === 0), '단추로 닫으면 올려 둔 한 칸을 스스로 물림', String(len));
    // 다른 확장도 같은 창에 한 칸을 올린 경우: 뒤로 가기 한 번에 창이 닫히고 우리 칸도 남지 않는다
    o = await openOne();
    await page.evaluate(() => history.pushState({ ...(history.state ?? {}), other: 1 }, '')); // 남이 올린 칸
    await page.evaluate(() => history.back()); await sleep(300);
    check(await page.evaluate(() => window.__closed === true && !history.state?.other && (history.state?.ssDlg ?? 0) === 0), '남의 칸이 위에 있어도: 뒤로 가기 한 번에 닫히고 우리 칸도 같이 물림', JSON.stringify(await page.evaluate(() => history.state)));
    await set({ backClose: false });
    o = await openOne();
    check(o[0] === 0 && o[1], '설정을 끄면 기록을 올리지 않음 (예전 그대로)');
    await page.evaluate(() => document.querySelector('dialog.ss-dlg .popup-button-ok').click());

    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
