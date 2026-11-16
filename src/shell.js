// 틀: 상태창 패널 · HUD · 사이드(미니) · 떠 있는 버튼 (만들기는 wizard.js · 프롬프트/꾸미기 창은 windows.js)
import {
    app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, isActive, ready, MOD, MOD_IDS, EMPTY, DIFFS, diffOf,
    esc, short, clone, clamp, h, dateShort, userName, TITLE, LOG, VERSION, MODULE, relFromProfiles, ssErr, isHidden,
} from './core.js';
import { commit, wipeModule, gatherSources, unreadCount, dueLetters } from './engine.js';
import { genModule, instructModule } from './ai.js';
import { popup, confirmPopup, askConfirm, busyBtn, editorHTML, bindEditor, diffHTML, ai1, gauge, applyTheme, mascot } from './kit.js';
import { applyParts, PARTS_ACTIONS } from './parts.js';
import { VIEW, VIEW_ACTIONS, VIEW_CHANGES, GROUPS, TAB_MOD, TAB_INFO, PSEUDO, manageHTML, extraHTML, freshDot, tileBoard, tileAct, bindTileDrag, fitTiles, BOARD_BG } from './views.js';
import { fullBackup, restoreFile, saveSlot, loadSlot, deleteSlot, attachToCard, detachFromCard, loadFromCard, cardPack, prepareCarry, startCarry, carryFor, diagnose } from './safe.js';
import { applyPreset } from './extra.js';
import { unreadNotes } from './notify.js';
import { DICE_ACTIONS, DICE_CHANGES } from './dice.js';
import { CONTACT_ACTIONS , CONTACT_CHANGES } from './contact.js';
import { FEED_ACTIONS, FEED_CHANGES } from './feeds.js';
import { MONEY_ACTIONS } from './money.js';
import { FATE_ACTIONS } from './fate.js';
import { EDIT, viewTr, letterMode, GLOBAL_OFF } from './core.js';
import { translateSheet, missingTr } from './translate.js';
import { hintAfterAction } from './tips.js';
import { storyPick, STORY_HOME, guideView } from './story_ui.js';
import { hompyHTML, mountHompy, fitHompy, photoHTML, hpLayout, hpMinor , isDecoMode } from './hompy.js';
import { setNoShort } from './util.js';
import { openPromptWindow, openThemeWindow, openWizard } from './lazy.js';
import { setBase, startBlank } from './engine.js';
export { setBase, startBlank, openWizard, openPromptWindow, openThemeWindow }; // 다른 파일은 예전처럼 여기서 받아도 된다 (창은 눌렀을 때 불러옴 — lazy.js)

export const panels = new Set();
app.popup = popup;
app.confirmPopup = confirmPopup;
app.userName = userName;

const INSTRUCT_HINT = {
    core: '예: 세계관을 좀 더 어둡게, 마법이 금지된 설정 추가',
    profile: '예: 새로 나온 NPC 「한서진」 프로필 추가 / 레온 말투를 더 자세히',
    stats: '예: 마나 게이지 추가, 힘을 +3으로', dice: '예: 크툴루식 d100 정신력 판정으로 바꿔줘',
    wallet: '예: 지금까지 이야기에서 받은 물건들 반영해줘', shop: '예: 항구에 암시장이 열렸어. 상점 추가하고 무기점에 신상품',
    home: '예: 2층 다락방 추가, 거실을 아늑하게', rel: '예: 지금까지 채팅 보고 관계 수치 다시 맞춰줘', map: '예: 북쪽 설산 지역 장소 4곳 추가, 항구와 연결',
    calendar: '예: 다음 달에 왕국 축제 일정 추가', contact: '예: 편지 방식으로 바꾸고 올빼미·갈매기 배달 추가', quest: '예: 길드에서 받을 만한 토벌 의뢰 2개 추가',
    news: '예: 왕궁 연회 소식 기사로', gossip: '예: 레온과 내가 같이 있는 걸 본 사람들 소문', board: '예: 익명 게시판 말투로 바꿔줘',
    ach: '예: 지금 스토리에 맞는 업적 5개 더 / 레온 루트 엔딩 추가', memo: '예: 지금까지 나온 단서 정리해서 메모로',
    sns: '예: 레온이 나랑 찍은 사진 올린 게시물 추가', music: '예: 지금 장면에 어울리는 잔잔한 OST로', custom: '예: 「명성」 탭 만들어서 마을·길드 명성 0~100 게이지로',
    fate: '예: 이 세계관에 맞는 이벤트 카드 5장 더',
};

// ───── 탭 ─────
// v2.7.3: 앨범 · 플레이 기록은 확장 설정에서 모든 채팅에 끌 수 있어요
const PSEUDO_ON = { album: 'albumOn', record: 'recordOn', guide: 'guideOn', guest: () => settings().hpWave === true && settings().guestbook === true }; // 글 = 그 설정이 꺼져 있지 않을 때 · 함수 = 참일 때만
VIEW.guide = (s, d, ui) => guideView(ui); // 🗝 공략 탭 (story_ui.js)
VIEW.guest = () => app.hpGuestTab?.() ?? '<p class="ss-hint">방명록을 불러오는 중이에요.</p>'; // 📝 방명록 탭 (사람 묶음 · minihome_ui.js)
// 🧩 부가 기능 탭 (관리 옆): 켠 선택 기능의 화면을 묶음별로 모은다 — 공략 · 사람/관계 · 장부 · 이야기 흐름 · 연락 (켜고 끄기는 관리 › 쓸 기능 › 부가 기능)
VIEW.extra = (s, d, ui) => extraHTML(s, ui, { guide: settings().guideOn !== false ? guideView(ui) : '', rel: storyPick(STORY_HOME.rel, ui), memo: storyPick(STORY_HOME.memo, ui), flow: storyPick(STORY_HOME.flow, ui), contact: storyPick(STORY_HOME.contact, ui) });
function groupTabs(g, meta) {
    return g.tabs.filter(t => (PSEUDO.has(t) ? (typeof PSEUDO_ON[t] === 'function' ? PSEUDO_ON[t]() : !PSEUDO_ON[t] || settings()[PSEUDO_ON[t]] !== false) : modOn(TAB_MOD(t), meta)));
}
// 즐겨찾기 그룹 (★) — 있으면 맨 앞
function allGroups() {
    const fav = (settings().favTabs ?? []).filter(t => GROUPS.some(g => g.tabs.includes(t)));
    return fav.length ? [{ id: 'fav', name: '즐겨찾기', icon: 'fa-star', tabs: fav }, ...GROUPS] : GROUPS;
}
function groupsOn(meta) { return allGroups().filter(g => groupTabs(g, meta).length); }
function groupOf(tab, pref) { const all = allGroups(); return (pref && all.find(g => g.id === pref && g.tabs.includes(tab))) || GROUPS.find(g => g.tabs.includes(tab)) || all[0]; }
function badgeFor(tab, s, meta) {
    if (tab === 'contact') { const n = unreadCount(s, meta); return n ? `<i class="ss-badge">${n}</i>` : ''; }
    if (tab === 'dice' && s.pendingRoll) return '<i class="ss-badge">!</i>';
    if (tab === 'news') { const n = s.data.news?.items.filter(x => !x.read).length; return n ? '<i class="ss-dot"></i>' : ''; }
    if (freshTab(tab)) return '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>';
    return '';
}
// 🔴 방금 AI 답에서 바뀐 탭 (v2.7.3) — 그 탭을 한 번 열면 탭 점은 꺼지고, 칸 안의 줄 점은 다음 답까지 남아요
function freshTab(tab) {
    const f = app.current?.fresh;
    if (!f || settings().freshDot === false) return false;
    const mod = TAB_MOD(tab);
    return !!(f.mods.has(mod) && !f.seen.has(mod));
}
function groupBadge(g, s, meta) {
    const b = groupTabs(g, meta).map(t => badgeFor(t, s, meta)).filter(Boolean);
    if (!b.length) return '';
    return b.some(x => !x.includes('ss-fresh')) ? '<i class="ss-dot"></i>' : '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>'; // 🔴 새 변화만 있으면 작은 빨간 점
}

// ───── 패널 ─────
// 🏷 아이콘만 있는 단추 (v2.8 · 애플 HIG: 뜻이 분명하지 않은 아이콘엔 이름): 화면 읽기용 이름(aria-label)은 전부, 눈에 보이는 이름은 헷갈리기 쉬운 것에
const IB_LABEL = { peek: '속마음', talk: '연락', leave: (b) => (b.classList.contains('on') ? '다시 등장' : '퇴장'), nolove: '애정 끄기', love: '애정 켜기', relmerge: '합치기', memotog: (b) => (b.classList.contains('on') ? '고정됨' : '고정'), tostore: '창고로', dec: '버리기', ctext: '고치기', setweather: '날씨', cmenu: '더보기', trashit: '버리기' };
function labelIcons(el) {
    for (const b of el.querySelectorAll('button[title]:not([aria-label]), [role="button"][title]:not([aria-label]), summary[title]:not([aria-label])')) {
        if (b.textContent.trim()) continue;
        const t = b.getAttribute('title'); b.setAttribute('aria-label', t.split(/ — | \(| · /)[0].replace(/^[^0-9A-Za-z가-힣]+/, '').trim() || t);
        const l = b.classList.contains('ss-ib') && !b.closest('.ss-head') ? IB_LABEL[b.dataset.act] : null; if (l) b.dataset.l = typeof l === 'function' ? l(b) : l;
    }
}
// 🧭 기능 한눈에 (v2.8 · 미니홈피 홈): 켠 기능은 지금 값과 함께, 끈 기능은 한 줄 설명 + 켜기 — 뭐가 있는지 · 뭘 하는지 한 화면에서 보이게
const FB_VAL = {
    profile: (d) => `${d.list?.length ?? 0}명`, stats: (d) => (d.bars?.[0] ? `${d.bars[0].name} ${d.bars[0].cur}/${d.bars[0].max}` : ''), dice: (d) => d.system || '',
    wallet: (d) => `${Number(d.cash ?? 0).toLocaleString()} ${d.currency ?? ''}`, fate: (d) => (d.curses?.length ? `걸린 것 ${d.curses.length}` : `카드 ${d.deck?.length ?? 0}장`),
    ach: (d) => `${d.list.filter(a => a.done).length} / ${d.list.length}`, memo: (d) => `${d.list.length}개`, custom: (d) => (d.tabs?.[0] ? `${d.tabs[0].name}${d.tabs.length > 1 ? ` 외 ${d.tabs.length - 1}` : ''}` : ''),
    map: (d) => d.here || `${d.places?.length ?? 0}곳`, calendar: (d) => `${d.m}/${d.d} ${d.time ?? ''}`, shop: (d) => `가게 ${d.shops?.length ?? 0}곳`, home: (d) => d.name || '',
    rel: (d) => `${d.user?.length ?? 0}명`, contact: (d) => { const n = Object.values(d.unread ?? {}).reduce((a, b) => a + (Number(b) || 0), 0); return n ? `새 연락 ${n}` : d.app || ''; },
    quest: (d) => `진행 ${d.list.filter(q => q.status === 'active').length}`, news: (d) => `${d.items.length}건`, gossip: (d) => `${d.issues.length}건`, board: (d) => `글 ${d.posts.length}`, sns: (d) => `글 ${d.posts.length}`, music: (d) => d.now?.title || '',
};
function featureBoard(s, meta) {
    if (settings().hpBoard === false) return '';
    const st = settings(), groups = GROUPS.filter(g => g.id !== 'manage').map(g => ({ g, tabs: g.tabs.filter(t => !PSEUDO.has(t) && MOD[TAB_MOD(t)]) })).filter(x => x.tabs.length).sort((a, b) => (a.g.id === 'home') - (b.g.id === 'home')); // 「그 밖에」(홈 묶음의 기능)는 맨 뒤
    const deco = isDecoMode();
    const card = (t) => {
        const m = MOD[TAB_MOD(t)], gOff = GLOBAL_OFF[m.id] && st[GLOBAL_OFF[m.id]] === false, on = meta.mods?.[m.id] !== false && !gOff, d = s.data[m.id];
        let val = ''; try { val = on && d ? String(FB_VAL[m.id]?.(d) ?? '') : ''; } catch { val = ''; }
        const inner = `<i class="fa-solid ${m.icon}"></i><b>${esc(m.name)}</b><em>${val ? esc(val) : d ? '열기' : '비어 있음'}</em>`;
        // 꾸미기 모드: 누르면 열리는 대신 ◀ ▶ 로 순서를 바꾼다
        if (on && deco) return `<div class="ss-fb-card edit" data-app="${t}">${inner}<span class="ss-fb-mv"><button data-hp="appmv" data-arg="${t}:-1" title="앞으로">◀</button><button data-hp="appmv" data-arg="${t}:1" title="뒤로">▶</button></span></div>`;
        if (on) return `<button class="ss-fb-card" data-app="${t}" data-act="tab" data-arg="${t}" title="${esc(m.name)} — ${esc(m.desc ?? '')}">${inner}</button>`;
        return `<label class="ss-fb-card off" title="${gOff ? '확장 설정에서 모든 채팅에 꺼 둔 기능이에요' : '켜면 이 채팅에서 쓸 수 있어요'}"><i class="fa-solid ${m.icon}"></i><b>${esc(m.name)}</b><input type="checkbox" class="ss-switch" data-chg="mod" data-arg="${m.id}" ${gOff ? 'disabled' : ''}><small>${esc(m.desc ?? '')}</small></label>`;
    };
    const isOn = (t) => { const m = MOD[TAB_MOD(t)]; return meta.mods?.[m.id] !== false && !(GLOBAL_OFF[m.id] && st[GLOBAL_OFF[m.id]] === false); };
    const saved = Array.isArray(st.hpApps) ? st.hpApps : [], rank = (t) => { const i = saved.indexOf(t); return i < 0 ? 1e3 : i; }; // 직접 정한 순서 (꾸미기 모드의 ◀ ▶) — 새로 켠 기능은 뒤에
    const all = groups.flatMap(x => x.tabs), onTabs = all.filter(isOn).map((t, i) => [t, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]), offTabs = all.filter(t => !isOn(t));
    // 켠 기능만 큰 카드로 (이름 + 지금 값) — 꺼 둔 기능은 아래 접는 줄에 설명과 스위치로
    const tip = deco ? `<div class="ss-fb-tip"><i class="fa-solid fa-arrows-left-right"></i><span><b>◀ ▶ 로 앱 순서를 바꿔요.</b> 사진은 사진 아래 ↑ ↓ 단추로 앱들 위 · 아래로 옮겨요.</span></div>` : st.hpTip !== false ? `<div class="ss-fb-tip"><i class="fa-solid fa-lightbulb"></i><span><b>카드를 누르면 그 기능이 열려요.</b> 위(폰은 아래) 메뉴로도 옮겨 다녀요 · 모양은 「꾸미기」에서 · 모르는 건 「도우미」에게</span><button data-hp="tipoff" title="안내 닫기">알겠어요</button></div>` : '';
    return `<section class="ss-fb">${tip}${meta.hpPhoto?.src && onTabs.length > 6 ? `<div class="ss-fb-grid top">${onTabs.slice(0, 6).map(card).join('')}</div><div class="ss-fb-grid rest ${(onTabs.length - 6) % 2 && onTabs.length > 7 ? 'odd' : ''}" style="--fbc:${Math.max(1, Math.ceil((onTabs.length - 6) / 2))}">${onTabs.slice(6).map(card).join('')}</div>` : `<div class="ss-fb-grid ${meta.hpPhoto?.src ? 'top' : ''}">${onTabs.map(card).join('')}</div>`}
        ${offTabs.length ? `<details class="ss-fb-more" ${st.hpBoardOpen ? 'open' : ''}><summary><i class="fa-solid fa-plus"></i> 더 써 볼 기능 ${offTabs.length}개</summary><div class="ss-fb-grid off">${offTabs.map(card).join('')}</div></details>` : ''}</section>`;
}
let softRender = false; // 한꺼번에 다시 그릴 때(rerenderPanels)만 켜진다
export function renderPanel(el, soft = false) {
    // 🪟 같은 모양(스킨)을 켰으면 화면의 글을 「…」로 줄이지 않고 줄을 바꿔 다 보여 준다
    setNoShort(document.body.classList.contains('ss-retro') || settings().hompyFull !== false && !!el?._ss?.full);
    softRender = soft === true;
    try { return renderPanel0(el); } finally { setNoShort(false); softRender = false; }
}
function renderPanel0(el) {
    const st = el._ss ??= { tab: 'home', mode: 'view', work: null, ui: {} };
    const inSide = el.classList.contains('ss-panel-side');
    const isFloat = el.classList.contains('ss-panel-float'); // 💬 옆에 띄운 연락 창: 틀(머리 · 메뉴 · 탭 · 도구) 없이 연락 내용만
    if (!isActive()) { el.innerHTML = `<div class="ss-root ss-scope"><div class="ss-empty"><i class="fa-solid fa-power-off"></i><b>이 채팅에서는 상태창이 꺼져 있어요</b><p>확장 설정에서 「이 채팅에서 켜기」를 누르세요.</p></div></div>`; bindPanel(el); return; }
    if (!ready() || !app.current) {
        const pack = cardPack(), cr = carryFor();
        el.innerHTML = `<div class="ss-root ss-scope"><div class="ss-empty">
            ${mascot('idle', 'lg', 'bob') || '<i class="fa-solid fa-wand-magic-sparkles"></i>'}<b>아직 이 채팅의 상태창이 없어요</b>
            ${pack ? `<button class="ss-btn pri big" data-act="cardload"><i class="fa-solid fa-id-card-clip"></i> 카드에 든 상태창 불러오기</button><small class="ss-hint">${esc(pack.title || '상태창')} · AI 호출 없이 바로 시작</small>` : ''}
            ${cr ? `<button class="ss-btn pri big" data-act="carrystart"><i class="fa-solid fa-clapperboard"></i> ${cr.round}회차로 시작</button><small class="ss-hint">${esc(cr.title || '')} — 지난 회차에서 이어받기</small>` : ''}
            <p>장르만 고르면 돼요. 수치·달력 같은 기본 칸은 바로 채우고, 인물·지도 같은 세계관 칸은 AI가 카드·로어북을 읽고 채워요. AI 없이 「기본 틀만」으로 바로 시작할 수도 있어요. 어떤 카드든, 카드가 없어도 돼요.</p>
            <button class="ss-btn ${pack || cr ? '' : 'pri big'}" data-act="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 상태창 만들기</button>
            <button class="ss-btn ghost" data-act="blank"><i class="fa-regular fa-file"></i> 빈 상태창으로 시작</button>
            <button class="ss-btn ghost" data-act="filerestore"><i class="fa-solid fa-box-open"></i> 백업 · 파일에서 불러오기</button>
        </div></div>`;
        bindPanel(el);
        return;
    }
    const s = app.current.state;
    const meta = getMeta();
    const gs = groupsOn(meta);
    let g = groupOf(st.tab, st.group);
    if (!gs.some(x => x.id === g.id) || !groupTabs(g, meta).includes(st.tab)) { g = gs[0]; st.tab = groupTabs(g, meta)[0]; }
    g = gs.find(x => x.id === g.id) ?? g;
    st.group = g.id;
    const tab = st.tab;
    const mod = TAB_MOD(tab);
    const fresh0 = app.current?.fresh;
    if (fresh0 && fresh0.mods.has(mod) && !fresh0.seen.has(mod)) { // 🔴 이 탭을 열었으니 탭 점은 끔 (칸 안의 줄 점은 다음 답까지)
        fresh0.seen.add(mod);
        const m0 = getMeta(); if (m0) { m0.freshSeen = { key: fresh0.key, mods: [...fresh0.seen] }; try { ctx().saveMetadataDebounced?.(); } catch { /* 저장 못 해도 이번 접속엔 기억 */ } } // 새로고침해도 본 탭은 꺼진 채로 (v2.7.5 · 상태 계산엔 영향 없어서 rev는 안 올림)
    }
    const pseudo = PSEUDO.has(tab) && tab !== 'home';
    const data = pseudo ? {} : mod === 'core' ? s.core : s.data[mod];
    const editable = !pseudo;
    let body;
    if (tab === 'manage') body = manageHTML(s, st.ui);
    else if (pseudo) body = VIEW[tab](s, null, st.ui);
    else if (st.mode === 'edit') body = `<div class="ss-editor">${editorHTML(st.work, EDIT[mod])}</div>
        <div class="ss-editbar"><button class="ss-btn pri" data-act="save"><i class="fa-solid fa-floppy-disk"></i> 저장</button><button class="ss-btn" data-act="cancel">취소</button></div>`;
    else if (st.mode === 'json') body = `<textarea class="ss-in ss-json" rows="18" spellcheck="false">${esc(JSON.stringify(data ?? {}, null, 2))}</textarea>
        <div class="ss-editbar"><button class="ss-btn pri" data-act="savejson"><i class="fa-solid fa-floppy-disk"></i> 저장</button><button class="ss-btn" data-act="cancel">취소</button></div>`;
    else if (!data) body = `<div class="ss-empty"><i class="fa-solid ${TAB_INFO(tab).icon}"></i><b>「${esc(TAB_INFO(tab).name)}」 칸이 비어 있어요</b>
        <button class="ss-btn pri" data-act="gen">${ai1} AI로 채우기</button><button class="ss-btn ghost" data-act="genblank"><i class="fa-regular fa-file"></i> 빈 칸으로 시작</button></div>`;
    else body = VIEW[tab](s, data, st.ui); // 🧭 이야기 장치의 칸은 🧪 실험실 탭에 모았다 (예전엔 탭마다 아래에 붙었음)

    const info = TAB_INFO(tab);
    const isFav = (settings().favTabs ?? []).includes(tab);
    const favBtn = tab !== 'home' ? `<button class="ss-tool ${isFav ? 'on' : ''}" data-act="favtog" title="${isFav ? '즐겨찾기에서 빼기' : '즐겨찾기 (★ 그룹에 모아 보기)'}"><i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i><span class="opt">즐겨찾기</span></button>` : '';
    // 🙈 가리기: 이 칸을 AI에게 안 보냄 (이 채팅 · 직접 다시 켤 때까지)
    const hmod = tab === 'home' ? 'core' : MOD[mod] ? mod : null;
    const hidden = !!(hmod && isHidden(hmod, meta));
    const hideBtn = hmod && st.mode !== 'edit' && st.mode !== 'json' ? `<button class="ss-tool ${hidden ? 'on' : ''}" data-act="hidetog" title="${hidden ? 'AI에게 다시 보내기' : '가리기 — AI에게 이 칸을 안 보내요 (다시 켤 때까지)'}"><i class="fa-solid ${hidden ? 'fa-eye-slash' : 'fa-eye'}"></i><span>${hidden ? 'AI에게 숨김' : 'AI에게 숨기기'}</span></button>` : '';
    const floatBtn = tab === 'contact' && !isFloat ? `<button class="ss-tool ${settings().ctFloat ? 'on' : ''}" data-act="ctfloat" title="연락을 작은 창으로 옆에 띄워요 — 다른 탭을 보면서 연락할 수 있어요"><i class="fa-solid fa-up-right-from-square"></i><span>${settings().ctFloat ? '옆 창 채팅 끄기' : '옆 창에서 채팅'}</span></button>` : '';
    const tools = editable && data && st.mode !== 'edit' && st.mode !== 'json' ? `<div class="ss-tools">${floatBtn}${favBtn}${hideBtn}
            <button class="ss-tool ${st.ui.instructOpen ? 'on' : ''}" data-act="instructtog" title="AI에게 이 칸을 고치라고 지시 (AI 1회)"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI로 수정</span></button>
            <button class="ss-tool" data-act="edit" title="직접 편집"><i class="fa-solid fa-pen"></i><span>편집</span></button>
            <details class="ss-tool-more"><summary class="ss-tool" title="더보기 — 다시 생성 · JSON 편집 · 전부 지우기"><i class="fa-solid fa-ellipsis"></i><span>더보기</span></summary><div class="ss-tool-pop">
            <button class="ss-tool" data-act="regen" title="이 칸만 다시 생성 (AI 1회)"><i class="fa-solid fa-rotate"></i><span>다시 생성 <small>AI 1회</small></span></button>
            <button class="ss-tool" data-act="json" title="JSON 편집"><i class="fa-solid fa-code"></i><span>JSON 편집</span></button>
            ${mod !== 'core' ? `<button class="ss-tool danger" data-act="wipemod" title="이 칸 전체 삭제 — 내용과 기록을 찌꺼기 없이 (되돌릴 수 없음)"><i class="fa-solid fa-broom"></i><span>전부 지우기</span></button>` : ''}</div></details></div>` : (favBtn || hideBtn) && (pseudo || !data) ? `<div class="ss-tools">${favBtn}${hideBtn}</div>` : '';
    const instruct = st.ui.instructOpen && editable && data ? `<div class="ss-instruct"><textarea class="ss-in" rows="2" placeholder="${esc(INSTRUCT_HINT[mod] ?? '예: 스토리에 맞게 ○○를 추가하고 △△는 바꿔줘')}">${esc(st.ui.instructText ?? '')}</textarea>
        <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="instruct">${ai1} 보내기</button><small class="ss-hint">바뀌는 내용을 먼저 보여 드려요.</small></div></div>` : '';
    const c = s.core, cal = s.data.calendar, here = s.data.map?.here;
    const sub2 = [cal && modOn('calendar', meta) ? `${dateShort(cal)} ${cal.time}` : '', here && modOn('map', meta) ? `📍 ${here}` : ''].filter(Boolean).join(' · ');
    const d0 = DIFFS[diffOf(meta)];
    const nNew = unreadNotes(meta);
    // 조각으로 만들어 두고 → 평소엔 그대로 이어 붙이고, 전체화면(미니홈피)일 땐 수첩 틀 안에 넣는다 (hompy.js)
    const dlg0 = el.closest('dialog'), isFull = dlg0 ? dlg0.classList.contains('ss-full') : !!st.full; // 창이 뜨기 전(첫 그리기)엔 여는 쪽이 적어 둔 값으로
    const hp = !inSide && !isFloat && isFull && settings().hompyFull !== false;
    // 📒 미니홈피: 한 묶음의 칸들을 탭으로 나누지 않고 작은 창으로 한 화면에 (창 제목을 누르면 그 칸만 크게 — 편집 · AI로 수정은 거기서)
    const gTabs = groupTabs(g, meta), minorSet = hpMinor(), minors = hp ? gTabs.filter(t => minorSet.includes(t)) : [];
    const pack = minors.length >= 2, navTabs = pack ? gTabs.filter(t => !minors.includes(t)) : gTabs; // 「모음」으로 합쳐진 탭은 탭 줄에서 빠진다
    const merged = pack && st.mode === 'view' && minors.includes(tab) && st.hpSolo !== tab;
    if (merged) {
        const one = (t) => { const m = TAB_MOD(t), ps = PSEUDO.has(t) && t !== 'home', dt = ps ? {} : m === 'core' ? s.core : s.data[m]; try { return ps ? VIEW[t](s, null, st.ui) : !dt ? '<p class="ss-hint">비어 있어요 — 제목을 눌러 채워요.</p>' : VIEW[t](s, dt, st.ui) + storySection(t, st.ui); } catch (e) { ssErr(LOG, 'merged', t, e); return '<p class="ss-hint">이 칸을 그리지 못했어요 — 제목을 눌러 열어 보세요.</p>'; } };
        if (!st.hpOpen?.length || !minors.includes(st.hpOpen[0])) st.hpOpen = minors.length ? [minors[0]] : [];
        const open = st.hpOpen; // 「모음」: 탭처럼 한 번에 하나만 — 처음엔 첫 칸, 다른 제목을 누르면 그 칸으로 바뀐다 (예전엔 누른 칸이 아래로 계속 쌓였음)
        body = `<div class="ss-hp-all">${minors.map(t => `<section class="ss-hp-win sub ${open.includes(t) ? 'open' : 'shut'}" data-sub="${t}"><div class="ss-hp-wt" data-hp="fold" data-arg="${t}" role="button" title="${open.includes(t) ? '접기' : '눌러서 펼치기'}"><b><i class="fa-solid ${TAB_INFO(t).icon}"></i> ${esc(TAB_INFO(t).name)}</b>${open.includes(t) ? `<button class="ss-ib sm" data-hp="solo" data-arg="${t}" title="이 칸만 크게 열기 — 편집 · AI로 수정 · 다시 생성"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>` : '<i class="fa-solid fa-chevron-down"></i>'}</div>${open.includes(t) ? `<div class="ss-hp-wb">${one(t)}</div>` : ''}</section>`).join('')}</div>`;
    } else if (hp && tab === 'home' && st.mode === 'view' && data && !hpLayout().off.includes('photo')) {
        // 홈: 큰 사진 옆에 홈 칸들 (사진이 없으면 「사진 넣기」 한 줄만)
        body = `<div class="ss-hp-homewrap ${meta.hpPhoto?.src ? 'has' : ''} ${meta.hpPhoto?.pos === 'top' ? 'flip' : ''}">${photoHTML(meta)}<div class="ss-hp-homebody">${body}${featureBoard(s, meta)}</div></div>`;
    }
    const rootCls = `ss-root ss-scope ${document.body.classList.contains('ss-retro') ? 'ss-rt' : ''} ${inSide ? 'in-side' : ''} ${meta.paused ? 'paused' : ''} ${settings().bottomNav && !hp ? 'navbottom' : ''}`;
    const headHTML = `<header class="ss-head">
            ${settings().mascotBuddy !== false ? `<span class="ss-head-cat" data-act="help" title="궁금한 게 있으면 저를 눌러요 🐾 (미트볼 도우미)">${mascot(meta.paused ? 'sleep' : nNew ? 'surprise' : 'idle', 'head', 'bob')}</span>` : ''}
            <div class="ss-head-t"><b>${esc(c.title || TITLE)}</b>${sub2 ? `<small>${esc(sub2)}</small>` : ''}</div>
            <div class="ss-head-a">
                <button class="ss-chip btn diff-${diffOf(meta)}" data-act="tab" data-arg="manage" title="난이도"><i class="fa-solid ${d0.icon}"></i> ${d0.name}</button>
                <button class="ss-ib" data-act="inbox" title="알림함"><i class="fa-${nNew ? 'solid' : 'regular'} fa-bell"></i>${nNew ? `<i class="ss-badge">${nNew > 99 ? '99+' : nNew}</i>` : ''}</button>
                <button class="ss-ib" data-act="search" title="검색"><i class="fa-solid fa-magnifying-glass"></i></button>
                <button class="ss-ib ${meta.paused ? 'on' : ''}" data-act="pause" title="${meta.paused ? '재개' : '일시정지 (AI에게 상태를 보내지 않음)'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
                ${viewTr() ? (() => { const nTr = missingTr().length; return `<button class="ss-ib" data-act="trfix" title="🌐 번역 — ${nTr ? `아직 영어로 남은 글 ${nTr}개 번역하기 · ` : ''}이상하게 번역된 이름·낱말 고치기"><i class="fa-solid fa-language"></i>${nTr ? `<i class="ss-badge">${nTr > 99 ? '99+' : nTr}</i>` : ''}</button>`; })() : ''}
                <button class="ss-helpchip" data-act="help" title="미트볼 도우미 — 모르는 기능을 물어보면 바로 답해요 (AI 0회)"><i class="fa-solid fa-circle-question"></i><span>도우미</span></button>
                <button class="ss-ib" data-act="fullscreen" title="${!inSide && settings().sheetFull ? '전체화면 끄기' : '전체화면'}"><i class="fa-solid ${!inSide && settings().sheetFull ? 'fa-compress' : 'fa-expand'}"></i></button>
                ${inSide ? `<button class="ss-ib" data-act="sidemini" title="작게"><i class="fa-solid fa-down-left-and-up-right-to-center"></i></button>` : ''}
                <details class="ss-tool-more ss-head-more"><summary class="ss-ib" title="더보기 — 프롬프트 · 토큰 · 지금 상태 복사"><i class="fa-solid fa-ellipsis"></i></summary><div class="ss-tool-pop">
                    <button class="ss-tool" data-act="prompts" title="프롬프트 · 토큰"><i class="fa-solid fa-scroll"></i><span>프롬프트 · 토큰</span></button>
                    <button class="ss-tool" data-act="copydump" title="📋 지금 상태 복사 — 최근 메시지 원문 · 상태 전체 · 편집 기록 · 주입문을 한 번에 (고쳐 달라고 붙여 넣는 용 · AI 0회)"><i class="fa-solid fa-clipboard"></i><span>지금 상태 복사 <small>AI 0회</small></span></button></div></details>
            </div>
        </header>`;
    const pauseHTML = `${meta.paused ? `<div class="ss-pausebar">${mascot('sleep', 'xs') || '<i class="fa-solid fa-pause"></i>'} 일시정지 중 — AI에게 상태를 보내지 않아요<button class="ss-btn sm" data-act="pause">재개</button></div>` : ''}`;
    const groupsHTML = `<nav class="ss-groups">${gs.map(x => `<button class="${x === g ? 'on' : ''}" data-act="group" data-arg="${x.id}"><i class="fa-solid ${x.icon}"></i><span>${x.name}</span>${x === g ? '' : groupBadge(x, s, meta)}</button>`).join('')}</nav>`;
    const restHTML = `${gTabs.length > 1 ? `<nav class="ss-tabs">${navTabs.map(t => `<button class="${t === tab ? 'on' : ''}" data-act="tab" data-arg="${t}"><i class="fa-solid ${TAB_INFO(t).icon}"></i>${esc(TAB_INFO(t).name)}${isHidden(t === 'home' ? 'core' : TAB_MOD(t), meta) ? '<i class="fa-solid fa-eye-slash ss-hid" title="가림 — AI에게 안 보냄"></i>' : ''}${badgeFor(t, s, meta)}</button>`).join('')}${pack ? `<button class="${minors.includes(tab) ? 'on' : ''}" data-act="tab" data-arg="${minors[0]}" title="${esc(minors.map(t => TAB_INFO(t).name).join(' · '))}"><i class="fa-solid fa-layer-group"></i>모음${minors.map(t => badgeFor(t, s, meta)).join('')}</button>` : ''}</nav>` : ''}
        ${hidden ? `<div class="ss-hidebar"><i class="fa-solid fa-eye-slash"></i><span>가린 칸 — AI에게 이 칸을 안 보내는 중이에요. 화면·직접 편집·변화 기록은 그대로예요.</span><button class="ss-btn sm" data-act="hidetog">다시 보내기</button></div>` : ''}
        ${tools || instruct ? `<div class="ss-toolrow"><div class="ss-toolrow-t"><i class="fa-solid ${info.icon}"></i>${esc(info.name)}</div>${tools}</div>${instruct}` : ''}
        ${pack && minors.includes(tab) && !merged ? `<button class="ss-btn sm ss-hp-back" data-hp="all"><i class="fa-solid fa-layer-group"></i> 모음으로</button>` : ''}
        <main class="ss-body ${merged ? 'ss-hp-merged' : ''}" data-tab="${tab}">${body}</main>`;
    const enter = hp && !st.hpShown; st.hpShown = hp;
    const html = hp ? hompyHTML({ rootCls, headHTML, pauseHTML, groupsHTML, restHTML, s, meta, nNew, enter, homeGroup: tab === 'home' && st.mode === 'view' && !!data })
        : `<div class="${rootCls}">${headHTML}${pauseHTML}${groupsHTML}${restHTML}</div>`;
    // ⚡ 옆 창 미니 채팅: 한꺼번에 다시 그릴 때 내용이 그대로면 건드리지 않는다 — 턴마다 대화창을 새로 붙이고 맨 아래로 내리느라 화면 배치를 한 번 더 계산했다 (재 보니 창 셋 중 가장 컸음). 단추를 눌러 그릴 때는 늘 새로.
    if (isFloat) { const key = `${app.trEpoch?.() ?? ''}|${html}`; if (softRender && el._ssKey === key && el.firstElementChild) return; el._ssKey = key; }
    // ⚡ 관리 탭: 화면 밖의 묶음은 브라우저가 계산을 건너뛴다 (css/routes.css의 content-visibility) — 스위치 · 단추가 가장 많은 탭이라 그릴 때마다 전부 계산하던 것이 가장 무거웠다.
    //   건너뛴 묶음은 높이를 어림값으로 잡으므로, 다시 그릴 때 스크롤 자리가 튀지 않게 지난번 실제 높이를 넘겨 준다.
    const SEC_Q = '.ss-body[data-tab="manage"] > .ss-sec'; let secH = null;
    if (tab === 'manage') { try { secH = [...el.querySelectorAll(SEC_Q)].map(n => n.offsetHeight); } catch { secH = null; } }
    if (!(hp && mountHompy(el, html))) el.innerHTML = html; // ⚡ 미니홈피는 바뀐 창만 갈아 끼운다 (hompy.js)
    if (secH?.length) { const ns = el.querySelectorAll(SEC_Q); if (ns.length === secH.length) ns.forEach((n, i) => { if (secH[i] > 0) n.style.containIntrinsicSize = `auto ${secH[i]}px`; }); }
    if (!merged && st.mode !== 'edit' && st.mode !== 'json' && tab !== 'manage' && tab !== 'extra' && tab !== 'guest' && (pseudo || data)) applyParts(el, tab); // 👁 보일 것 (v2.7.19)
    labelIcons(el);
    if (!isFloat) queueMicrotask(placeCtFloat); else compactFloat(el);
    if (hp) fitHompy(el); // 📐 미니홈피: 홈 쪽 · 프로필 쪽을 한 화면에 맞춘다
    if (st.mode === 'edit' && el.querySelector('.ss-editor')) bindEditor(el.querySelector('.ss-editor'), st.work, EDIT[mod], () => { // 편집 틀이 안 그려진 탭(편집 중에 탭이 바뀐 경우 등)에서는 묶지 않는다
        const box = el.querySelector('.ss-editor'); const all0 = [...box.querySelectorAll('details')]; const open = all0.filter(d => d.open).map(d => all0.indexOf(d));
        box.innerHTML = editorHTML(st.work, EDIT[mod]);
        const all = [...box.querySelectorAll('details')]; open.forEach(i => all[i]?.setAttribute('open', ''));
    });
    el.querySelector('.ss-instruct textarea')?.addEventListener('input', (e) => { st.ui.instructText = e.target.value; });
    el.querySelector('.ss-cin')?.addEventListener('input', (e) => { st.ui.draft = e.target.value; });
    const th = el.querySelector('.ss-thread, .ss-letter-list'); if (th) th.scrollTop = th.scrollHeight;
    bindPanel(el);
}
app.renderPanel = renderPanel;

const ACTIONS = { ...PARTS_ACTIONS, ...VIEW_ACTIONS, ...DICE_ACTIONS, ...CONTACT_ACTIONS, ...FEED_ACTIONS, ...MONEY_ACTIONS, ...FATE_ACTIONS };
const CHANGES = { ...VIEW_CHANGES, ...DICE_CHANGES, ...FEED_CHANGES, ...CONTACT_CHANGES };

async function onPanelAction(el, act, arg, btn) {
    const st = el._ss;
    const s = app.current?.state;
    const tab = st.tab;
    const mod = TAB_MOD(tab);
    const mname = TAB_INFO(tab)?.name;
    const rr = () => renderPanel(el);
    switch (act) {
        case 'wizard': return openWizard();
        case 'blank': return startBlank();
        case 'group': { const g = allGroups().find(x => x.id === arg); if (!g) return; st.group = g.id; st.tab = groupTabs(g, getMeta())[0]; st.mode = 'view'; st.ui = {}; return rr(); }
        case 'favtog': { const set = settings(); const f = new Set(set.favTabs ?? []); if (f.has(tab)) f.delete(tab); else f.add(tab); set.favTabs = [...f]; saveSettings(); if (!f.has(tab) && st.group === 'fav') st.group = null; return rerenderPanels(true); }
        case 'hidetog': {
            const hm = tab === 'home' ? 'core' : TAB_MOD(tab);
            const m = getMeta(true), h = { ...(m.hide ?? {}) };
            const now = !h[hm];
            if (now) h[hm] = true; else { delete h[hm]; if (s) m.fullTurn = s.turn; } // 다시 켠 턴엔 변화 위주라도 전체를 한 번
            m.hide = h;
            await saveMeta();
            app.refreshNow?.();
            toastr.info(now ? `「${mname}」을(를) 가렸어요. 다시 켤 때까지 AI에게 안 보내요 (화면·기록은 그대로).` : `「${mname}」을(를) 다시 AI에게 보내요.`, TITLE);
            return rerenderPanels(true);
        }
        case 'trfix': return app.openTrFix?.(null, mod); // 지금 연 탭의 글부터 (v2.7.19)
        case 'copydump': return app.copyDump?.();
        case 'inbox': return app.openInbox?.();
        case 'search': return app.openSearch?.();
        case 'help': return app.openHelp?.();
        case 'ctfloat': settings().ctFloat = !settings().ctFloat; saveSettings(); placeCtFloat(); return rerenderPanels(true);
        case 'cardload': return loadFromCard(setBase, false);
        case 'carrystart': return startCarry(setBase);
        case 'filerestore': return restoreFile(setBase);
        case 'tab': st.tab = arg; st.mode = 'view'; st.ui = {}; if (el.classList.contains('ss-panel-side') && settings().sideState !== 'full') { settings().sideState = 'full'; saveSettings(); ensureUI(); } return rr();
        case 'instructtog': st.ui.instructOpen = !st.ui.instructOpen; return rr();
        case 'edit': st.work = clone((mod === 'core' ? s.core : s.data[mod]) ?? EMPTY[mod]()); st.mode = 'edit'; return rr();
        case 'json': st.mode = 'json'; return rr();
        case 'wipemod': {
            if (mod === 'core' || !s?.data?.[mod]) return;
            if (!(await askConfirm(`<b>「${esc(mname)}」 칸을 전체 삭제할까요?</b><br><small>내용 · 이 칸의 편집 기록 · 지금까지 AI 답에 적힌 이 칸의 변화(칩)까지 모두 없앤 것으로 해요. 하루 정리 · 플레이 기록 숫자에서도 빠져요.<br>날짜 · 화폐 · 관계 단계표 · 연락 방식 같은 <b>틀</b>은 남겨요. 채팅 글과 세이브 슬롯은 그대로예요.<br><b>되돌릴 수 없어요</b> — 걱정되면 먼저 관리 탭 › 세이브.</small>`))) return;
            await wipeModule(mod); st.ui = {};
            toastr.success(`「${esc(mname)}」 칸을 비웠어요.`, TITLE);
            return rr();
        }
        case 'cancel': st.mode = 'view'; return rr();
        case 'save': st.mode = 'view'; await commit(mod, st.work, `✏️ ${mname} 직접 편집`, { keep: true }); return;
        case 'savejson': {
            try { const obj = JSON.parse(el.querySelector('.ss-json').value); st.mode = 'view'; await commit(mod, obj, `✏️ ${mname} 직접 편집`, { keep: true }); }
            catch (e) { toastr.error(`JSON 형식이 올바르지 않아요: ${esc(e.message)}`, TITLE); }
            return;
        }
        case 'genblank': return commit(mod, EMPTY[mod](), '', { keep: true });
        case 'gen': case 'regen': {
            if (act === 'regen' && !(await askConfirm(`「${mname}」 칸을 처음부터 다시 만들까요? (AI 1회 · 지금 내용은 바뀝니다. 부분 수정은 「AI로 수정」)`))) return;
            busyBtn(btn, true);
            try {
                const sources = await gatherSources({});
                const data = await genModule(mod, { sources, core: s.core, profileMode: s.data.profile?.mode, instruction: st.ui.instructText, contactMode: s.data.contact?.mode });
                if (mod === 'rel' && s.data.profile) relFromProfiles(data, s.data.profile); // 다시 생성해도 프로필의 사람은 빠지지 않게
                await commit(mod, data, `🔄 ${mname} 생성`, { keep: true });
                toastr.success('채웠어요.', TITLE);
            } catch (e) { ssErr(LOG, e); toastr.error(`생성 실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
            return;
        }
        case 'instruct': {
            const text = (st.ui.instructText ?? '').trim();
            if (!text) { toastr.info('지시를 적어 주세요.', TITLE); return; }
            busyBtn(btn, true, 'AI가 고치는 중…');
            try {
                const before = mod === 'core' ? s.core : s.data[mod];
                const after = await instructModule(mod, text, s);
                busyBtn(btn, false);
                const box = h(`<div class="ss-root ss-scope ss-preview"><h3>바뀌는 내용 — ${esc(mname)}</h3><p class="ss-hint">지시: ${esc(text)}</p>${diffHTML(before, after)}</div>`);
                if (await confirmPopup(box)) { st.ui.instructText = ''; st.ui.instructOpen = false; await commit(mod, after, `💬 ${mname} 수정: ${short(text, 40)}`, { keep: true }); toastr.success('적용했어요.', TITLE); }
            } catch (e) { ssErr(LOG, e); toastr.error(`수정 실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
            return;
        }
        case 'pause': return togglePause();
        case 'skiponce': { const m = getMeta(true); m.skipOnce = true; await saveMeta(); app.refreshNow(); toastr.info('다음 생성 1번은 상태창 없이 보내요.', TITLE); return; }
        case 'prompts': return openPromptWindow();
        case 'themewin': return openThemeWindow();
        case 'trsheet': return translateSheet(btn);
        case 'sidemini': settings().sideState = 'mini'; saveSettings(); return ensureUI();
        case 'fullscreen': {
            const dlg = el.closest('dialog');
            if (!dlg) { // 사이드(펼친 미니바)에서 누르면 전체화면 창으로 — 펼쳐 둔 사이드는 미니로 접는다 (예전엔 전체화면 아래에 그대로 남아 같은 화면을 두 군데서 그렸다)
                const tab0 = el._ss?.tab;
                if (el.classList.contains('ss-panel-side') && settings().sideState === 'full') { settings().sideState = 'mini'; saveSettings(); ensureUI(); }
                return openSheet(tab0, { full: true });
            }
            const on = !dlg.classList.contains('ss-full');
            dlg.classList.toggle('ss-full', on); syncFullOpen();
            settings().sheetFull = on; saveSettings();
            return renderPanel(el);
        }
        default: { const fn = ACTIONS[act] ?? MANAGE_ACTIONS[act] ?? app.extraActions?.[act]; if (fn) return fn(el, arg, btn, s); } // app.extraActions: 켰을 때만 불러오는 화면의 단추 (minihome_ui.js)
    }
}
function bindPanel(el) {
    if (el._ssBound) return;
    el._ssBound = true;
    // 👆 꾹 누르면 꾸미기 (v2.8, 폰 홈 화면처럼): 전체화면에서 창 · 앱 칸 · 빈 바탕을 0.55초 누르고 있으면 꾸미기 모드로 — 글 입력칸 · 미니 채팅 · 이미 꾸미기 중일 때는 아님
    {
        let timer = null, sx = 0, sy = 0, eat = false;
        const stop = () => { clearTimeout(timer); timer = null; };
        el.addEventListener('pointerdown', (e) => {
            stop(); eat = false;
            if (e.button > 0 || settings().hpLongPress === false) return;
            const hp = e.target.closest?.('.ss-hompy'); if (!hp || !el.contains(hp) || hp.classList.contains('ss-hp-edit')) return;
            if (e.target.closest('input, textarea, select, [contenteditable], .ss-ctfloat, .ss-thread, .ss-hp-sheet, a[href]')) return;
            if (!e.target.closest('.ss-hp-win, .ss-fb-card, .ss-hp-cols, .ss-hp-top')) return;
            sx = e.clientX; sy = e.clientY;
            timer = setTimeout(() => { timer = null; const b = el.querySelector('.ss-hompy:not(.ss-hp-edit) [data-hp="deco"]'); if (!b) return; eat = true; setTimeout(() => { eat = false; }, 900); try { navigator.vibrate?.(12); } catch { /* 없으면 그만 */ } getSelection?.()?.removeAllRanges?.(); b.click(); }, 550);
        });
        el.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 9) stop(); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, stop));
        el.addEventListener('scroll', stop, true);
        el.addEventListener('click', (e) => { if (eat) { eat = false; e.stopPropagation(); e.preventDefault(); } }, true); // 손을 뗄 때의 클릭이 칸을 열지 않게
        el.addEventListener('contextmenu', (e) => { if (eat) e.preventDefault(); });
    }
    el.addEventListener('click', (e) => {
        const pr = e.target.closest('[data-preset-ss]');
        if (pr && el.contains(pr)) { e.preventDefault(); applyPreset(pr.dataset.presetSs); return; }
        if (e.target.closest('a[href]')) return; // 추천 곡 ▶ 링크는 그대로 열리게
        const b = e.target.closest('[data-act]');
        if (!b || !el.contains(b)) return;
        if (b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'button')) return;
        if (b.closest('.ss-ct-row') && e.target.closest('[data-act="cmenu"]') && b.dataset.act !== 'cmenu') return;
        e.preventDefault(); e.stopPropagation();
        const act = b.dataset.act;
        onPanelAction(el, act, b.dataset.arg, b).then(() => { if (!['tab', 'group', 'cancel', 'help', 'inbox', 'search', 'fullscreen', 'sidemini', 'copydump'].includes(act)) hintAfterAction(el._ss?.tab); }).catch(err => { ssErr(LOG, err); toastr.error(esc(err.message), TITLE); });
    });
    el.addEventListener('change', (e) => { const t = e.target; if (t.dataset.chg) CHANGES[t.dataset.chg]?.(el, t, app.current?.state); });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('ss-cin') && !letterMode(app.current?.state.data.contact) && !e.isComposing) { e.preventDefault(); el.querySelector('[data-act="csend"]')?.click(); }
    });
}
export function rerenderPanels(force = false) {
    for (const el of [...panels]) {
        if (!el.isConnected) { panels.delete(el); continue; }
        // 접혀 있는 사이드 펼침 패널은 안 보이니 그리지 않고, 펼칠 때 그린다 (갱신마다 숨은 화면을 그리던 것)
        if (el.classList.contains('ss-panel-side') && (settings().sideState !== 'full' || fullOpen())) { el._ssStale = true; if (fullOpen()) fullStale = true; continue; }
        if (force && el._ss?.mode === 'view') { renderPanel(el, el.classList.contains('ss-panel-float')); continue; }
        if (el._ss?.hold) continue;
        if (el._ss?.mode && el._ss.mode !== 'view') continue;
        if (el.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') continue;
        renderPanel(el, el.classList.contains('ss-panel-float'));
    }
}
export async function openSheet(tab, opt = {}) {
    const el = document.createElement('div');
    el.className = 'ss-panel ss-panel-pop';
    el._ss = { tab: tab ?? 'home', mode: 'view', work: null, ui: {} };
    const full = opt.full ?? settings().sheetFull;
    if (opt.full) settings().sheetFull = true;
    el._ss.full = !!full;
    panels.add(el);
    renderPanel(el);
    setTimeout(syncFullOpen, 0); setTimeout(syncFullOpen, 250); // 창이 뜬 뒤 (전체화면이면 미니바를 가린다)
    try { await popup(el, { large: true, full }); } finally { panels.delete(el); setTimeout(syncFullOpen, 0); setTimeout(syncFullOpen, 300); }
}
// 전체화면 상태창이 떠 있는 동안에는 미니바(사이드)를 숨긴다 — 전체화면 위로 미니바가 남아 보였다. 닫으면 다시 보인다 (설정은 안 건드림)
let fullStale = false; // 전체화면 동안 건너뛴 그리기가 있었나
const fullOpen = () => document.body.classList.contains('ss-fullopen');
// 전체화면이 열려 있는 동안: 미니바 · HUD · 떠 있는 버튼을 가리고(css/hud.css) 그리기도 건너뛴다. 끄거나 닫으면 밀린 것을 한 번 그린다. 설정(showHud · showSide · sideState)은 안 건드린다.
export function syncFullOpen() {
    try {
        const was = fullOpen(), on = [...document.querySelectorAll('dialog[open] .ss-panel-pop')].some(p => p.closest('dialog').classList.contains('ss-full'));
        if (was !== on) document.body.classList.toggle('ss-fullopen', on);
        if (was && !on && fullStale) { fullStale = false; renderHud(); app.ensureUI?.(); }
    } catch (e) { ssErr(LOG, 'fullopen', e); }
}
app.openSheet = (tab) => {
    const el = [...panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop') && p.closest('dialog[open]') && p._ss?.mode === 'view' && !p._ss.rollOnly);
    if (!el) return openSheet(tab);
    if (tab && el._ss.tab !== tab) { Object.assign(el._ss, { tab, group: null, mode: 'view', ui: {} }); renderPanel(el); }
};
app.rerenderPanels = rerenderPanels;
app.newSheet = openSheet; // 열린 시트를 다시 쓰지 않고 그대로 열기 (wizard.js)

async function togglePause() {
    const m = getMeta(true);
    m.paused = !m.paused;
    await saveMeta();
    app.refreshNow();
    toastr.info(m.paused ? '일시정지 — AI에게 상태창을 보내지 않아요. (OOC·퀵리플라이용)' : '다시 켰어요.', TITLE);
}
app.togglePause = togglePause;

// ───── 관리 동작 ─────
const MANAGE_ACTIONS = {
    fullbackup: () => fullBackup(),
    slotsave: () => saveSlot(),
    slotload: (el, arg) => loadSlot(arg),
    slotdel: (el, arg) => deleteSlot(arg),
    cardattach: () => attachToCard(),
    carddetach: () => detachFromCard(),
    carryprep: () => prepareCarry(),
    diagnose: () => diagnose(),
    pipcheck: async () => { const { openPip } = await import('./pip.js'); return openPip(); },
    perf: () => app.measureLoad?.(),
    export: () => {
        const meta = getMeta();
        const blob = new Blob([JSON.stringify({ statussim: VERSION, base: { core: app.current.state.core, data: app.current.state.data }, mods: meta.mods, difficulty: meta.difficulty }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `statussim_${(app.current.state.core.title || 'world').replace(/[\\/:*?"<>|]/g, '_')}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    import: () => restoreFile(setBase),
    chatoff: async () => { const meta = getMeta(true); meta.off = true; await saveMeta(); app.refreshNow(); toastr.info('이 채팅에서 상태창을 껐어요. 확장 설정의 「이 채팅에서 켜기」로 다시 켜요.', TITLE); },
    reset: async () => { if (!(await askConfirm('이 채팅의 상태창 데이터를 모두 지울까요? 되돌릴 수 없어요.'))) return; delete ctx().chatMetadata[MODULE]; await saveMeta(true); app.refreshNow(); },
    fillempty: async (el, arg, btn, s) => {
        const meta = getMeta();
        const todo = MOD_IDS.filter(id => modOn(id, meta) && !s.data[id]);
        if (!todo.length) { toastr.info('비어 있는 칸이 없어요.', TITLE); return; }
        if (!(await askConfirm(`비어 있는 ${todo.length}칸을 채워요 (AI ${todo.length}회).`))) return;
        busyBtn(btn, true, `0/${todo.length}`);
        const sources = await gatherSources({});
        let k = 0;
        for (const id of todo) {
            try { await commit(id, await genModule(id, { sources, core: app.current.state.core, profileMode: app.current.state.data.profile?.mode ?? 'minimal' }), '', { keep: true }); }
            catch (e) { toastr.error(`${MOD[id].name} 실패: ${esc(e.message)}`, TITLE); }
            busyBtn(btn, false); busyBtn(btn, true, `${++k}/${todo.length}`);
        }
        busyBtn(btn, false);
    },
};

// ───── HUD (채팅 위 상태 바) ─────
function hudHTML() {
    const meta = getMeta();
    if (!app.current) return `<div class="ss-hud-row"><button class="ss-hud-t" data-hud="make"><b><i class="fa-solid fa-gauge-high"></i> ${TITLE}</b><small>이 채팅에 상태창 만들기</small></button></div>`;
    const s = app.current.state, d = s.data;
    const cal = modOn('calendar', meta) && d.calendar, here = modOn('map', meta) && d.map?.here;
    const un = unreadCount(s, meta);
    const bars = modOn('stats', meta) && d.stats?.bars.length ? d.stats.bars.slice(0, 4) : [];
    const alerts = [];
    const due = dueLetters(s, meta);
    if (due.length) alerts.push(`<button data-hud="tab:contact">📬 편지 도착 — ${due.map(x => esc(x.who)).join(', ')}</button>`);
    if (s.pendingRoll && modOn('dice', meta)) alerts.push(`<button data-hud="roll">🎲 판정 요청 — ${esc(s.pendingRoll.label)}</button>`);
    const d0 = DIFFS[diffOf(meta)];
    // v2.7.21: 한 줄 — 여는 아이콘 · 타일 판 · 단추들 (제목은 아이콘에 마우스를 올리면)
    const acts = `${modOn('dice', meta) && d.dice ? `<span class="ss-t ic" role="button" data-hud="roll" title="주사위"><i class="fa-solid fa-dice-d20"></i></span>` : ''}${(() => { const n = unreadNotes(meta); return `<span class="ss-t ic" role="button" data-hud="inbox" title="알림함"><i class="fa-${n ? 'solid' : 'regular'} fa-bell"></i>${n ? `<b class="al">${n > 99 ? '99+' : n}</b>` : ''}</span>`; })()}<span class="ss-t ic${meta.paused ? ' on' : ''}" role="button" data-hud="pause" title="${meta.paused ? '재개' : '일시정지'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></span><span class="ss-t ic${app.tileEdit ? ' on' : ''}" role="button" data-hud="edit" title="칸 편집 (순서 · 크기 · 넣고 빼기)"><i class="fa-solid fa-pen"></i></span>`;
    if (settings().hudTiles !== false) return `${tileBoard(s, 'hud', acts, `<span class="ss-t ic open" role="button" data-hud="open" title="${esc(s.core.title || TITLE)} — 상태창 열기"><i class="fa-solid fa-gauge-high"></i></span>`)}
        ${meta.paused ? `<div class="ss-hud-pause"><i class="fa-solid fa-pause"></i> 일시정지 중 · AI에게 상태를 보내지 않아요</div>` : ''}
        ${alerts.length ? `<div class="ss-hud-alert">${alerts.join('')}</div>` : ''}`;
    return `<div class="ss-hud-row">
        <button class="ss-hud-t" data-hud="open"><b>${esc(s.core.title || TITLE)}</b><small hidden>${[cal ? `${esc(dateShort(cal))} ${esc(cal.time)}${freshDot('calendar')}` : '', here ? `📍 ${esc(here)}${freshDot('map', 'here')}` : ''].filter(Boolean).join(' · ') || '상태창 열기'}</small></button>
        <div class="ss-hud-a">
            ${modOn('dice', meta) && d.dice ? `<button class="ss-ib" data-hud="roll" title="주사위"><i class="fa-solid fa-dice-d20"></i></button>` : ''}
            ${modOn('contact', meta) && d.contact ? `<button class="ss-ib" data-hud="tab:contact" title="연락"><i class="fa-solid ${d.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment'}"></i>${un ? `<i class="ss-badge">${un}</i>` : ''}</button>` : ''}
            ${(() => { const n = unreadNotes(meta); return `<button class="ss-ib" data-hud="inbox" title="알림함"><i class="fa-${n ? 'solid' : 'regular'} fa-bell"></i>${n ? `<i class="ss-badge">${n > 99 ? '99+' : n}</i>` : ''}</button>`; })()}
            <button class="ss-ib ${meta.paused ? 'on' : ''}" data-hud="pause" title="${meta.paused ? '재개' : '일시정지 — OOC·퀵리플라이 때'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
            ${bars.length ? `<button class="ss-ib" data-hud="fold" title="게이지 접기/펼치기"><i class="fa-solid fa-chevron-${settings().hudOpen ? 'up' : 'down'}"></i></button>` : ''}
        </div></div>
        ${meta.paused ? `<div class="ss-hud-pause"><i class="fa-solid fa-pause"></i> 일시정지 중 · AI에게 상태를 보내지 않아요</div>` : ''}
        ${tileBoard(s, 'hud')}
        ${alerts.length ? `<div class="ss-hud-alert">${alerts.join('')}</div>` : ''}`;
}
function onHud(e) {
    const b = e.target.closest('[data-hud]'); if (!b) return;
    const a = b.dataset.hud;
    if (a === 'make') return openWizard();
    if (a === 'open') return openSheet();
    if (a === 'roll') return openRoll(app.current?.state.pendingRoll?.label ?? '', app.current?.state.pendingRoll?.dc ?? 0);
    if (a === 'pause') return togglePause();
    if (a === 'inbox') return app.openInbox?.();
    if (a === 'fold') { settings().hudOpen = !settings().hudOpen; saveSettings(); return renderHud(); }
    if (a.startsWith('tab:')) return openSheet(a.slice(4));
    if (a.startsWith('go:')) { app.hudExp = null; renderHud(); return openSheet(a.slice(3)); }
    if (a.startsWith('exp:')) { const k = a.slice(4); app.hudExp = app.hudExp === k ? null : k; return renderHud(); }
    if (tileAct(a, rerenderTiles, 'hud')) return;
}
app.renderHud = () => renderHud();
export function renderHud() {
    const set = settings();
    let hud = document.getElementById('ss-hud');
    const show = set.enabled && set.showHud && isActive();
    document.body.classList.toggle('ss-nohud', !show);
    if (!show) { hud?.remove(); return; }
    if (fullOpen() && hud) { fullStale = true; return; } // ⚡ 전체화면이 덮고 있는 동안은 안 그린다 — 끄거나 닫을 때 한 번 그린다 (syncFullOpen)
    const sheld = document.getElementById('sheld');
    const anchor = set.hudPos === 'bottom' ? document.getElementById('form_sheld') : document.getElementById('chat');
    if (!sheld || !anchor) return;
    if (!hud) { hud = document.createElement('div'); hud.id = 'ss-hud'; hud.className = 'ss-hud ss-scope'; hud.addEventListener('click', onHud); }
    if (hud.nextElementSibling !== anchor) anchor.parentElement.insertBefore(hud, anchor);
    hud.classList.toggle('paused', !!getMeta()?.paused);
    hud.classList.toggle('bottom', set.hudPos === 'bottom');
    if (setHTML(hud, hudHTML())) fitSoon(hud);
    paintHost(hud, 'hud');
    bindTileDrag(hud, rerenderTiles); watchFit(hud);
}
// 글자 맞추기는 다음 화면 그리기 때 (그린 직후 바로 재면 긴 채팅 전체를 한 번 더 배치하게 됨)
const fitQ = new Set(); let fitRaf = 0;
function fitSoon(el) { if (!el) return; fitQ.add(el); if (fitRaf) return; fitRaf = requestAnimationFrame(() => { fitRaf = 0; const l = [...fitQ]; fitQ.clear(); for (const x of l) if (x.isConnected) fitTiles(x); }); }
// 판의 배경 · 테두리를 바깥 틀(HUD · 사이드 미니창)에 칠함 — 흰 틀이 남지 않게 (v2.7.21)
// 배경 · 테두리를 안 골랐으면 테마 색 그대로 · 테두리는 아주 얇게
function paintHost(el, attr) {
    if (!el) return;
    const set = settings(), bs = set.boardStyle ?? {}, img = set.tileDeco?.[`${attr}Bg`];
    el.classList.toggle('ss-own-bg', !!img); // 직접 올린 배경 그림이 있으면 🪟 스킨이 바탕을 덮지 않는다
    const pre = img ? null : BOARD_BG[set.boardPreset ?? 'daisy']; // 올린 그림이 없으면 기본 무늬 (v2.7.21)
    el.classList.add('ss-tbhost');
    const v = { '--h-bg': bs.bg || pre?.bg || '', '--h-bd': bs.bd || pre?.bd || '', '--h-img': img ? `url("${img}")` : pre?.img || '', '--h-size': img ? 'cover' : pre?.size || '', '--h-pos': img ? 'center' : pre?.pos || '', '--h-rep': img ? 'no-repeat' : '' };
    for (const [k, x] of Object.entries(v)) { if (x) { if (el.style.getPropertyValue(k) !== x) el.style.setProperty(k, x); } else if (el.style.getPropertyValue(k)) el.style.removeProperty(k); }
    el.classList.toggle('has-img', !!img || !!pre?.img);
}
// 판 폭이 바뀌면(창 크기 · 사이드 열고 닫기) 글자 크기를 다시 맞춤
function watchFit(el) { if (!el || el._ssFit || typeof ResizeObserver === 'undefined') return; let w = 0; el._ssFit = new ResizeObserver(([e]) => { const nw = Math.round(e.contentRect.width); if (nw && nw !== w) { w = nw; fitTiles(el); } }); el._ssFit.observe(el); }
// 타일 판이 바뀌면 HUD · 사이드 둘 다
function rerenderTiles() { renderHud(); const body = document.querySelector('#ss-side .ss-mini-body'); if (body && setHTML(body, sideMiniHTML())) fitSoon(body); paintHost(document.querySelector('#ss-side .ss-side-mini'), 'side'); }
// 같은 내용이면 다시 그리지 않기 (갱신마다 HUD·사이드를 새로 그리면 그 아래 채팅까지 다시 배치됨)
function setHTML(el, html) { if (!el || el._ssHtml === html) return false; el.innerHTML = html; el._ssHtml = html; return true; }

// ───── 사이드 패널 (닫힘 · 미니 · 펼침) ─────
function sideMiniHTML() {
    if (!app.current) return `<div class="ss-mini-empty"><button class="ss-btn pri sm" data-side="make"><i class="fa-solid fa-wand-magic-sparkles"></i> 만들기</button></div>`;
    const s = app.current.state;
    const keys = settings().sideMini ?? [];
    const w = tileBoard(s, 'side'); // v2.7.21: HUD와 같은 타일 판
    return `<div class="ss-mini-head"><b>${esc(short(s.core.title || TITLE, 16))}</b>${getMeta()?.paused ? '<i class="fa-solid fa-pause ss-hl"></i>' : ''}<span class="ss-t ic${app.tileEdit ? ' on' : ''}" role="button" data-side="edit" title="칸 편집"><i class="fa-solid fa-pen"></i></span></div>${w || '<small class="ss-hint">표시할 항목을 꾸미기에서 고르세요</small>'}`;
}
function onSide(e) {
    const b = e.target.closest('[data-side]'); if (!b) return;
    const a = b.dataset.side, set = settings();
    if (a === 'make') return openWizard();
    if (a.startsWith('go:')) { app.sideExp = null; return openSheet(a.slice(3)); }
    if (a.startsWith('exp:')) { const k = a.slice(4); app.sideExp = app.sideExp === k ? null : k; const body = document.querySelector('#ss-side .ss-mini-body'); if (body && setHTML(body, sideMiniHTML())) fitSoon(body); return; }
    if (tileAct(a, rerenderTiles, 'side')) return;
    const mobile = window.innerWidth <= 700 && !document.body.classList.contains('ss-nohud');
    if (a === 'cycle') set.sideState = mobile ? (set.sideState === 'full' ? 'mini' : 'full') : set.sideState === 'closed' ? 'mini' : set.sideState === 'mini' ? 'full' : 'closed';
    if (a === 'full') set.sideState = 'full';
    if (a === 'close') set.sideState = 'closed';
    if (a === 'mini') set.sideState = 'mini';
    if (a === 'mindfreq' && ['always', 'random'].includes(b.dataset.v)) set.mindFreq = b.dataset.v; // 💭 속마음 빈도 (v2.7.21)
    if (a === 'mindmode' && ['off', 'thought', 'emoji', 'kaomoji'].includes(b.dataset.v)) set.mindMode = b.dataset.v;
    if (a === 'mindfreq' || a === 'mindmode') { saveSettings(); app.refreshNow?.(); app.rerenderPanels?.(true); const body = document.querySelector('#ss-side .ss-mini-body'); if (body) setHTML(body, sideMiniHTML()); return; }
    saveSettings(); ensureUI();
}
// 💬 연락을 옆에 띄우기 (v2.8): 작은 창 하나에 연락 탭만 — 전체화면에서 다른 탭을 보면서도 연락할 수 있다.
//   전체화면 창(<dialog>)은 화면 맨 위 층이라, 그 안에 붙여야 위에 보인다 → 열려 있는 상태창 dialog가 있으면 그 안에, 없으면 body에.
//   머리를 끌어서 옮길 수 있고(자리는 기억), 폰에서는 아래에 붙는 반쯤 높이의 창.
let ctFloat = null;
// 미니 채팅의 입력줄: 첨부(사진 · 음성 · 위치 · 선물 · 송금)와 「답장 받기」를 ＋ 하나로 모은다 — 입력칸 왼쪽의 ＋를 누르면 위로 펼쳐짐
function compactFloat(el) {
    try {
        const inn = el.querySelector('.ss-phone-in'), att = el.querySelector('.ss-phone-att'), opt = el.querySelector('.ss-phone-opt');
        if (!inn || (!att && !opt) || inn.querySelector('.ss-ctf-more')) return;
        const d = document.createElement('details'); d.className = 'ss-ctf-more'; d.open = !!el._ss?.ui?.moreOpen;
        d.innerHTML = '<summary title="첨부 · 답장 설정"><i class="fa-solid fa-plus"></i></summary><div class="ss-ctf-pop"></div>';
        const pop = d.querySelector('.ss-ctf-pop'); if (att) pop.appendChild(att); if (opt) pop.appendChild(opt);
        d.addEventListener('toggle', () => { if (el._ss?.ui) el._ss.ui.moreOpen = d.open; });
        inn.insertBefore(d, inn.firstChild);
        const th = el.querySelector('.ss-thread'); if (th && !el._ss?.ui?.editId) th.scrollTop = th.scrollHeight;
    } catch (e) { ssErr(LOG, 'ctfloat', e); }
}
export function placeCtFloat() {
    try {
        const on = settings().enabled && settings().ctFloat === true && isActive() && ready() && !!app.current && modOn('contact') && !!app.current.state.data.contact;
        if (!on) { if (ctFloat) { panels.delete(ctFloat.querySelector('.ss-panel')); ctFloat.remove(); ctFloat = null; } return; }
        // 전체화면(미니홈피)에 「연락」 작은 창이 있으면 팝업이 아니라 그 창 안에 붙는다 (옆 칸의 창 하나가 미니 채팅창) — 없으면 떠 있는 창으로
        const dock = document.querySelector('dialog[open] .ss-hompy:not(.ss-hp-edit) .ss-hp-win[data-win="contact"]');
        const host = dock ?? [...document.querySelectorAll('dialog[open]')].filter(d => d.querySelector('.ss-panel-pop')).pop() ?? null;
        // 상태창을 닫으면 미니 채팅도 같이 들어간다 — 예전엔 붙을 곳이 없으면 실리 화면 위에 떠서, 나갔다 들어오면 채팅 위에 창이 남아 있었다. (쓰던 글 · 보던 방은 그대로 두고 화면에서만 뗀다)
        if (!host) { if (ctFloat?.isConnected) { panels.delete(ctFloat.querySelector('.ss-panel')); ctFloat.remove(); } return; }
        if (!ctFloat) {
            ctFloat = h(`<div id="ss-ctfloat" class="ss-ctfloat ss-scope"><div class="ss-ctf-head" title="끌어서 옮기기"><i class="fa-solid fa-comment-dots"></i><b>미니 채팅</b><button class="ss-ib" data-ctf="close" title="띄운 창 닫기"><i class="fa-solid fa-xmark"></i></button></div><div class="ss-panel ss-panel-float"></div></div>`);
            const pnl = ctFloat.querySelector('.ss-panel'); pnl._ss = { tab: 'contact', mode: 'view', work: null, ui: {} }; panels.add(pnl); bindPanel(pnl);
            pnl.addEventListener('input', (e) => { if (e.target.classList?.contains('ss-cin') && pnl._ss.ui) pnl._ss.ui.draft = e.target.value; }); // 쓰던 글은 다시 그려져도 남게
            ctFloat.querySelector('[data-ctf="close"]').addEventListener('click', (e) => { e.stopPropagation(); settings().ctFloat = false; saveSettings(); placeCtFloat(); rerenderPanels(true); });
            // 끌어서 옮기기
            const head = ctFloat.querySelector('.ss-ctf-head'); let drag = null;
            head.addEventListener('pointerdown', (e) => { if (e.target.closest('button') || ctFloat.classList.contains('docked') || matchMedia('(max-width: 640px)').matches) return; const r = ctFloat.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; head.setPointerCapture?.(e.pointerId); e.preventDefault(); });
            head.addEventListener('pointermove', (e) => { if (!drag) return; const w = ctFloat.offsetWidth, hh = ctFloat.offsetHeight, x = Math.max(4, Math.min(innerWidth - w - 4, e.clientX - drag.dx)), y = Math.max(4, Math.min(innerHeight - Math.min(hh, 60) - 4, e.clientY - drag.dy)); ctFloat.style.left = `${x}px`; ctFloat.style.top = `${y}px`; ctFloat.style.right = 'auto'; ctFloat.style.bottom = 'auto'; });
            const drop = () => { if (!drag) return; drag = null; const r = ctFloat.getBoundingClientRect(); settings().ctFloatPos = { x: Math.round(r.left), y: Math.round(r.top) }; saveSettings(); };
            head.addEventListener('pointerup', drop); head.addEventListener('pointercancel', drop);
        }
        const moved = ctFloat.parentElement !== host;
        if (moved) host.appendChild(ctFloat);
        {   // 전체화면이 다시 그려질 때 이 창은 잠깐 떼어졌다 다시 붙는다 → 그 사이 갱신 목록에서 빠져 지운 메시지가 그대로 보이던 것: 다시 올리고, 붙을 때마다 새로 그린다 (쓰던 글은 지킴)
            const p0 = ctFloat.querySelector('.ss-panel'); panels.add(p0);
            if (moved && p0.firstElementChild) { const sc = p0.querySelector('.ss-thread'), atEnd = !sc || sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 30, top = sc?.scrollTop ?? 0; renderPanel(p0); const s2 = p0.querySelector('.ss-thread'); if (s2) s2.scrollTop = atEnd ? s2.scrollHeight : top; }
            // 옆 칸이 한 화면에 맞추느라 줄어(zoom) 있어도 채팅은 제 크기로 — 그 칸은 넘치면 스크롤
            const col = dock?.closest('.ss-hp-col'), z = col ? parseFloat(col.firstElementChild?.style.zoom) || 1 : 1;
            // 높이: 그 칸의 남은 자리를 바닥까지 꽉 채운다 (입력칸이 늘 화면 안 바닥에) — 남은 자리가 너무 적으면 최소 높이로 두고 칸이 스크롤
            // 재기 전에 숨김(꾸미기 중) · 붙음 표시부터: 숨긴 채로 재면 위치가 0으로 읽혀 높이가 끝까지 늘어났고(꾸민 뒤 미니 채팅이 길어지던 것), 붙음 표시가 늦으면 그 창의 원래 내용 높이까지 넣어 쟀다(처음 한 번 짧게 나오던 것)
            const hide0 = !!document.querySelector('dialog[open] .ss-hompy.ss-hp-edit'); ctFloat.style.display = hide0 ? 'none' : ''; ctFloat.classList.toggle('docked', !!dock);
            if (col && !hide0) {
                ctFloat.style.setProperty('--ctf-h', '260px');
                // 그 칸에서 이 창 아래에 놓인 다른 창들의 자리는 남긴다 (예전엔 칸 바닥까지 다 차지해 아래 창들을 밀어냈다)
                let below = 0; for (let n = dock.nextElementSibling; n; n = n.nextElementSibling) below += n.getBoundingClientRect().height + 12;
                const room = col.getBoundingClientRect().bottom - ctFloat.getBoundingClientRect().top - 16 - below;
                ctFloat.style.setProperty('--ctf-h', `${Math.round(Math.max(260, Math.min(640, room / z)))}px`);
            } else if (!col) ctFloat.style.removeProperty('--ctf-h');
            if (col) col.classList.add('ss-hp-over'); ctFloat.style.zoom = dock && z < 1 ? String(Math.round(100 / z) / 100) : '';
        }
        ctFloat.style.display = document.querySelector('dialog[open] .ss-hompy.ss-hp-edit') ? 'none' : ''; // 꾸미기 중에는 숨김 (팝업으로 튀어나와 화면을 가리던 것)
        ctFloat.classList.toggle('docked', !!dock); if (dock) { ctFloat.style.left = ctFloat.style.top = ctFloat.style.right = ctFloat.style.bottom = ''; }
        const pos = settings().ctFloatPos; if (!dock && pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) && !matchMedia('(max-width: 640px)').matches) { ctFloat.style.left = `${Math.max(4, Math.min(innerWidth - 120, pos.x))}px`; ctFloat.style.top = `${Math.max(4, Math.min(innerHeight - 80, pos.y))}px`; ctFloat.style.right = 'auto'; ctFloat.style.bottom = 'auto'; }
        const pnl = ctFloat.querySelector('.ss-panel'); if (pnl._ss.tab !== 'contact') { pnl._ss.tab = 'contact'; pnl._ss.mode = 'view'; }
        if (!pnl.firstElementChild) {
            renderPanel(pnl);
            // 미니 채팅창: 목록이 아니라 바로 대화 + 입력칸부터 (상대가 있으면 맨 위 상대의 방을 연다 — ‹ 로 목록에 갈 수 있음)
            if (!pnl._ss.ui?.who) pnl.querySelector('[data-act="copen"]')?.click();
            requestAnimationFrame(() => { const t = pnl.querySelector('.ss-cin'); if (t) { const r = t.getBoundingClientRect(), p = pnl.getBoundingClientRect(); pnl.scrollTop += r.bottom - p.bottom + 12; } });
        }
    } catch (e) { ssErr(LOG, 'ctfloat', e); }
}
export function ensureUI() {
    placeCtFloat();
    const set = settings();
    applyTheme();
    renderHud();
    // 떠 있는 버튼
    let fb = document.getElementById('ss-float');
    const showFloat = set.enabled && set.showFloat;
    if (showFloat && !fb) {
        fb = h('<button id="ss-float" class="ss-float ss-scope" title="상태창"><i class="fa-solid fa-gauge-high"></i><i class="ss-badge ss-hide"></i></button>');
        document.body.appendChild(fb);
        makeDraggable(fb);
        fb.addEventListener('click', () => { if (!fb._dragged) openSheet(); });
    }
    if (!showFloat && fb) { fb.remove(); fb = null; }
    if (fb) {
        if (set.floatPos) { fb.style.right = `${set.floatPos.x}px`; fb.style.top = `calc(100dvh - ${set.floatPos.y + 48}px)`; }
        const n = app.current ? unreadCount(app.current.state) + (app.current.state.pendingRoll ? 1 : 0) : 0;
        const b = fb.querySelector('.ss-badge'); b.textContent = n || ''; b.classList.toggle('ss-hide', !n);
        fb.classList.toggle('ss-hide', !isActive());
    }
    // 사이드
    let side = document.getElementById('ss-side');
    const showSide = set.enabled && set.showSide && isActive();
    if (showSide && !side) {
        side = h(`<aside id="ss-side" class="ss-side ss-scope">
            <button class="ss-side-handle" data-side="cycle" title="상태창 (누를 때마다: 닫힘 → 미니 → 펼침)"><i class="fa-solid fa-gauge-high"></i><i class="ss-badge ss-hide"></i></button>
            <div class="ss-side-mini"><div class="ss-mini-body"></div><div class="ss-mini-foot"><button class="ss-ib lbl" data-side="full" title="펼치기 — 상태창 전체를 옆에 열어요"><i class="fa-solid fa-up-right-and-down-left-from-center"></i><span>펼치기</span></button><button class="ss-ib lbl" data-side="close" title="숨기기 — 옆 손잡이를 누르면 다시 나와요"><i class="fa-solid fa-xmark"></i><span>숨기기</span></button></div></div>
            <div class="ss-side-full"><div class="ss-panel ss-panel-side"></div><button class="ss-side-x" data-side="close" title="닫기"><i class="fa-solid fa-xmark"></i></button></div>
        </aside>`);
        document.body.appendChild(side);
        side.addEventListener('click', onSide);
        bindTileDrag(side.querySelector('.ss-mini-body'), () => rerenderTiles()); watchFit(side.querySelector('.ss-mini-body'));
        side.querySelector('.ss-mini-body').addEventListener('click', (e) => { // 미니 위젯을 누르면 펼침
            if (!e.target.closest('.ss-mini-w')) return;
            settings().sideState = 'full'; saveSettings(); ensureUI();
        });
        const pnl = side.querySelector('.ss-panel');
        pnl._ss = { tab: 'home', mode: 'view', work: null, ui: {} };
        panels.add(pnl);
    }
    if (!showSide && side) { panels.delete(side.querySelector('.ss-panel')); side.remove(); side = null; }
    // body 클래스는 바뀔 때만 건드린다 (지웠다 다시 붙이면 매 갱신마다 페이지 전체 스타일을 다시 계산 → 긴 채팅 렉의 주범)
    const want = side && set.sideState !== 'closed' ? `ss-body-${set.sideState}` : '';
    for (const c of ['ss-body-full', 'ss-body-mini']) document.body.classList.toggle(c, c === want);
    if (side) {
        if (side.dataset.state !== set.sideState) side.dataset.state = set.sideState;
        const w = `${clamp(Number(set.sideWidth) || 400, 300, 640)}px`;
        if (side.style.getPropertyValue('--ss-side-w') !== w) side.style.setProperty('--ss-side-w', w);
        if (fullOpen()) fullStale = true; // ⚡ 전체화면 동안은 미니바 안쪽을 안 그린다
        else { if (setHTML(side.querySelector('.ss-mini-body'), sideMiniHTML())) fitSoon(side.querySelector('.ss-mini-body'));
        paintHost(side.querySelector('.ss-side-mini'), 'side'); }
        const n = app.current ? unreadCount(app.current.state) : 0;
        const b = side.querySelector('.ss-side-handle .ss-badge'); b.textContent = n || ''; b.classList.toggle('ss-hide', !n);
        if (set.sideState === 'full' && !fullOpen()) { const pnl = side.querySelector('.ss-panel'); if (!pnl.innerHTML || !pnl._ssShown || pnl._ssStale) { pnl._ssShown = true; pnl._ssStale = false; renderPanel(pnl); } }
    }
}
app.ensureUI = ensureUI;
function makeDraggable(btn) {
    let sx, sy, ox, oy, moving = false;
    btn.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; moving = false; btn._dragged = false; const r = btn.getBoundingClientRect(); ox = window.innerWidth - r.right; oy = window.innerHeight - r.bottom; btn.setPointerCapture(e.pointerId); });
    btn.addEventListener('pointermove', (e) => {
        if (sx === undefined || !btn.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moving && Math.hypot(dx, dy) < 6) return;
        moving = true; btn._dragged = true;
        btn.style.right = `${clamp(ox - dx, 0, window.innerWidth - 50)}px`; btn._y = clamp(oy - dy, 0, window.innerHeight - 50); btn.style.top = `calc(100dvh - ${btn._y + 48}px)`;
    });
    btn.addEventListener('pointerup', (e) => {
        if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
        sx = undefined;
        if (moving) { settings().floatPos = { x: parseInt(btn.style.right, 10), y: btn._y ?? 120 }; saveSettings(); setTimeout(() => { btn._dragged = false; }, 50); }
    });
}

export async function openRoll(label, dc) {
    if (!ready() || !app.current) return;
    if (!modOn('dice') || !app.current.state.data.dice) { toastr.warning('주사위 기능이 꺼져 있거나 비어 있어요.', TITLE); return; }
    const el = document.createElement('div');
    el.className = 'ss-panel ss-panel-pop';
    el._ss = { tab: 'dice', mode: 'view', work: null, ui: {}, rollOnly: true };
    if (label) {
        const attrs = app.current.state.data.stats?.attrs ?? [];
        const q = app.current.state.data.dice.quick.find(x => x.name === label);
        const guess = q ? attrs.find(a => a.name === q.attr) : attrs.find(a => label.includes(a.name) || a.name.includes(label));
        el._ss.ui.dice = { label, attr: guess?.name ?? '', dc: dc || (app.current.state.data.dice.system === 'd100' ? 55 : 12), extra: 0 };
    }
    panels.add(el);
    renderPanel(el);
    await popup(el);
    panels.delete(el);
}
