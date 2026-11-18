// v2.9.1 블루레몬 제보 원작 버그: 이름 포함 판정 · 「->」 장소 · 쉼표 인물 줄 · 번역 꺾쇠 · 영어 저장 = 글만 바꾸는 기록 · 중간 메시지 지우기 · 날짜 도장
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ bind: true });
const S = (f, a) => page.evaluate(f, a);
const ai = async (body, user = 'go') => { await S((u) => window.__addUser(u), user); await S((b) => window.__addAI(`ok.\n<meatball>\n${b}\n</meatball>`), body); await sleep(150); };
const st = () => S(() => { window.__SS_TEST__.api.refreshNow(); return JSON.parse(JSON.stringify(window.__SS_TEST__.api.app.current.state)); });
try {
    await S(() => { const c = SillyTavern.getContext(); window.__SS_TEST__.emit = (n, ...a) => c.eventSource.emit(n, ...a); });
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'home', 'memo']);
    // ⑦ 이름 포함
    const nw = await S(async () => { const { nameWithin, findBy } = await import('/ext/src/core.js'); return [nameWithin('유나', '유나린'), nameWithin('레온', '레온 하트'), nameWithin('Ann', 'Anna'), nameWithin('레온', '레온이'), findBy([{ name: '유나린' }], '유나')?.name ?? null]; });
    check(JSON.stringify(nw) === '[false,true,false,true,null]', '이름: 낱말 경계로만 같은 사람 (유나 ≠ 유나린 · 레온 = 레온 하트 · 레온이)', JSON.stringify(nw));
    // ④ 「->」 장소 · 「사무실 - 5층 라운지」
    await ai('loc: 집 -> 편의점');
    let s = await st();
    check(s.data.map.here === '편의점' && !s.data.map.places.some(p => /->/.test(p.name)), '「loc: 집 -> 편의점」 = 편의점', s.data.map.here);
    await ai('loc: 사무실');
    await ai('loc: 사무실 - 5층 라운지');
    s = await st();
    check(s.data.map.here === '사무실' && s.data.map.spot === '5층 라운지', '「사무실 - 5층 라운지」 = 사무실 안 5층 라운지', `${s.data.map.here} / ${s.data.map.spot}`);
    // ⑤ 쉼표로 여럿
    await ai('npc: +미나 | 빵집 주인, +도윤 | 경비원, -하람');
    s = await st();
    const names = s.data.profile.list.map(p => p.name);
    check(names.includes('미나') && names.includes('도윤') && !names.includes('하람'), '「npc: +A | …, +B | …, -C」 → A · B만', JSON.stringify(names));
    // ③ 번역 꺾쇠
    const ck = await S(async () => { const { cleanKo } = await import('/ext/src/translate.js'); return [cleanKo('New Year / April Fools', '새해「 / 」만우절'), cleanKo('"Moon" Inn', '「달」 여관'), cleanKo('Plain', '평범「」')]; });
    check(ck[0] === '새해 / 만우절' && ck[1] === '「달」 여관' && ck[2] === '평범', '번역 꺾쇠 바로잡기', JSON.stringify(ck));
    // ① 날짜 도장은 한국어여도 「한국어로 저장된 칸」이 아님
    const dk = await S(async () => { const { hasHangul } = await import('/ext/src/translate.js'); return [hasHangul({ life: [{ who: 'Leon', text: 'went out', date: '101년 4월 4일 (금)' }] }), hasHangul({ memo: '안녕' })]; });
    check(dk[0] === false && dk[1] === true, '날짜 도장(date)은 한국어 칸으로 안 셈', JSON.stringify(dk));
    // ① ② 영어 저장 = 글만 바꾸는 기록 → 앞 답을 지우면 숫자가 빠짐
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const r = structuredClone(app.current.state.data.rel); r.user = [{ name: 'Leon', aff: 10, trust: 0, label: '친구', memo: '빵을 좋아함' }]; await commit('rel', r, 'Leon'); });
    await ai('time: +1'); // 칸 저장이 이 턴의 내 메시지로 옮겨 묶인다 → 아래에서 지우는 턴과 따로
    const affAt = await S(() => window.__st.chat.length);
    await ai('aff: Leon +5');
    s = await st(); const aff0 = s.data.rel.user.find(u => u.name === 'Leon').aff;
    const tx = await S(async () => { const { textMap } = await import('/ext/src/translate.js'); const { addAdjust } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const cur = app.current.state.data.rel; const out = structuredClone(cur); out.user[0].memo = 'Likes bread'; out.user[0].label = 'Friend'; out.user[0].aff = 999; const m = textMap(cur, out); await addAdjust({ set: { mod: 'rel', patch: { tx: m } } }); return m; });
    check(!Object.values(tx).includes(999) && Object.keys(tx).length === 2, 'textMap: 글만 (숫자 빼고)', JSON.stringify(tx));
    s = await st(); let L = s.data.rel.user.find(u => u.name === 'Leon');
    check(L.memo === 'Likes bread' && L.label === 'Friend' && L.aff === aff0, '글만 바뀌고 숫자는 그대로', JSON.stringify(L));
    // ② 영어 저장 기록 앞의 답 하나를 지움 → +5가 빠짐 (예전엔 통째 저장에 굳어 안 빠졌음)
    await ai('cash: +1');
    await S(async (i) => { const st = window.__st; st.chat.splice(i, 2); window.__renderAll(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); }, affAt);
    await sleep(300);
    //console.log(JSON.stringify(await S(async () => { const m = (await import('/ext/src/core.js')).getMeta(); return { adj: m.adjust.map(a => ({ at: a.at, an: !!a.an, l: a.label, k: a.set?.mod, tx: !!a.set?.patch?.tx, ops: a.ops })), chat: window.__st.chat.map(m => (m.is_user ? 'U:' : 'A:') + m.mes.slice(-25).replace(/\n/g, ' ')) }; })));
    s = await st(); L = s.data.rel.user.find(u => u.name === 'Leon');
    check(L.aff === aff0 - 5 && L.memo === 'Likes bread', '앞 답을 지우면 그 답의 호감이 빠지고, 영어 글은 남음', JSON.stringify(L));
    // 중간 지우기: 묶이지 않은 칸 저장(이름 없는 저장) 앞의 답을 지우면, 저장 뒤의 답(+7)이 저장 앞으로 들어가 덮이던 것
    await ai('cash: +3');
    const t1 = await S(() => window.__st.chat.length - 2);
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const w = structuredClone(app.current.state.data.wallet); await commit('wallet', w, ''); });
    const cashA = (await st()).data.wallet.cash;
    await ai('cash: +7');
    await S(async (i) => { const st = window.__st; st.chat.splice(i, 2); window.__renderAll(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); }, t1);
    await sleep(300);
    s = await st();
    check(s.data.wallet.cash === cashA + 7, '중간 답을 지워도 그 뒤 답(+7)은 저장에 안 덮임', `${cashA} → ${s.data.wallet.cash}`);
    // 📒 변화 장부
    await ai('aff: Leon +2, Mina +1');
    const lg = await S(async () => (await import('/ext/src/engine.js')).changeLedger());
    check(/aff \(romance\) total change: .*Leon/.test(lg) && /money total change/.test(lg), '변화 장부: 답마다 남긴 애정 · 돈 합', lg.slice(0, 200));
    // 👥 관계에만 있는 사람 → 프로필 더하기
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const r = structuredClone(app.current.state.data.rel); r.user.push({ name: '세라', aff: 0, trust: 5, label: '대장', memo: '경비대장' }); await commit('rel', r, '세라'); });
    const ro = await S(async () => (await import('/ext/src/views.js')).relOnly(window.__SS_TEST__.api.app.current.state).map(r => r.name));
    check(ro.includes('세라'), '관계에만 있는 사람 찾기', JSON.stringify(ro));
    await S(async () => { const { REL_ACTIONS } = await import('/ext/src/extra.js'); await REL_ACTIONS.profadd(); });
    s = await st();
    check(s.data.profile.list.some(p => p.name === '세라' && /대장/.test(p.summary)), '프로필 더하기 (AI 0 · 이름표 · 메모로)', JSON.stringify(s.data.profile.list.map(p => p.name)));
    // 🔗 합칠 후보: 직함 줄 ↔ 이름 줄
    const mh = await S(async () => { const { mergeHint } = await import('/ext/src/extra.js'); const st = window.__SS_TEST__.api.app.current.state; return [mergeHint({ name: '대장' }, { name: '세라', label: '대장' }, st), mergeHint({ name: '레온' }, { name: '레온 하트' }, st), mergeHint({ name: '미나' }, { name: '도윤' }, st)]; });
    check(!!mh[0] && !!mh[1] && !mh[2], '합칠 후보 (직함 · 이름 겹침)', JSON.stringify(mh));
    // 🏢 층 읽기
    const fl = await S(async () => { const { floorTag } = await import('/ext/src/iso.js'); return ['7F 라운지', '지하 1층', '기온 75F', 'Room 3'].map(floorTag); });
    check(JSON.stringify(fl) === '["7F","B1","",""]', '층 읽기 (화씨 온도는 빼기)', JSON.stringify(fl));
    // ✨ 화면: 두 열 목록 · ✕ 닫기 · 선 아이콘
    const ui = await S(async () => {
        const core = await import('/ext/src/core.js'); const kit = await import('/ext/src/kit.js');
        window.__autoPopup = null; const pr = kit.popup(Object.assign(document.createElement('div'), { innerHTML: '<p>hi</p>' })); await new Promise(r => setTimeout(r, 100));
        const dlg = [...document.querySelectorAll('dialog')].at(-1); const x = !!dlg?.querySelector('.ss-popx'); dlg?.querySelector('.ss-popx')?.click(); await Promise.race([pr, new Promise(r => setTimeout(r, 500))]); window.__autoPopup = 'ok';
        core.settings().iconStyle = 'line'; window.__SS_TEST__.api.rerenderPanels?.(true); await new Promise(r => setTimeout(r, 200));
        const li = document.querySelectorAll('.ss-root i.ss-li').length; core.settings().iconStyle = 'emoji';
        return { x, li };
    });
    check(ui.x, '「닫기」뿐인 창은 오른쪽 위 ✕', JSON.stringify(ui));
    const errs = logs.filter(l => /pageerror|TypeError|ReferenceError/.test(l)); check(!errs.length, 'no console errors', errs.slice(0, 3).join('\n').slice(0, 600));
} finally { await close(); }
