// 🎨 스타일로 고르기 (눌렀을 때 · 처음 설치한 사람은 관리 탭에 처음 들어갈 때 한 번 저절로) — lazy.js로 불러온다
//   ① 어떤 이야기? (장르 카드) → ② 그중 어떤 맛? (세부 묶음) → 칸 · 플레이 방식 · 게임 모드 · 부가 기능 · 모양을 한 번에 (AI 0회)
//   · 고른 뒤에도 묶음 안의 항목을 하나씩 빼고 시작할 수 있다 · 「다 해 봤어요」는 관리 › 쓸 기능(전체 목록)으로
//   · 칸(mods)은 이 채팅만 · 부가 기능은 모든 채팅 공통이라 **켜기만** 한다 (다른 채팅에서 쓰던 것을 끄지 않는다 — 만들기 창 빠른 세트와 같은 약속)
//   · 상태창이 아직 없으면 바로 시작(autostart.js)으로 틀을 먼저 만든다 → 채우기는 예전처럼 「고른 대로 채우기」를 눌렀을 때만 AI
//   · 설정 stylePick: '' (예전부터 쓰던 사람 · 안 띄움) · 'ask' (새로 설치 · 관리 탭에 처음 들어갈 때 한 번 · shell.js) · 'done' (띄웠음)
import { app, settings, saveSettings, getMeta, saveMeta, MOD, MODS, MOD_IDS, REC_MODS, normPlay, playOf, esc, TITLE, LOG, ssWarn, ssErr, tidyHidden, applyTidyStyle } from './core.js';
import { choosePopup } from './kit.js';
import { ADDON_FLAGS, STORY_FLAGS, flagOn } from './views.js';

// 부가 기능 이름 (모든 채팅 공통 스위치) — 고르는 화면에 보일 이름만. 켜고 끄는 값은 설정 키 그대로
const FLAG_NAME = {
    mindMode: '💭 속마음', romSpark: '✨ 설렘 한 스푼', romFacts: '💗 로맨스 보정: 관계를 사실로', romDrive: '💗 로맨스 보정: 끌림 · 싫음',
    relRace: '👑 루트 비교', pairAff: '💞 인물끼리 호감', guideOn: '🗝 공략 · 눈치 · 비밀', peekCost: '👁 엿보기엔 대가', groupChat: '👥 단체방',
    relScar: '🩹 관계의 흉터', meddleOn: '✍ 인물이 내 상태창에 손댐', memoryDrift: '🕳 기억 왜곡', loopMode: '🔁 회귀자 모드', swipeGhost: '👻 버린 스와이프의 유령',
    ledgerKnow: '🧠 누가 뭘 아는지', ledgerPromise: '🤝 약속 장부', promiseClock: '⌛ 약속 기한', tensionOn: '🎬 긴장도 감독', fateDebt: '🎲 운명의 빚',
    giftTaste: '🎁 취향에 맞는 선물', socialAff: '💌 연락에서 호감 반영', hpWave: '🌊 파도타기 · 일촌평', guestbook: '📝 방명록', hompyFull: '📒 미니홈피 화면',
    gearOn: '⚔ 옷차림 · 장비', fortuneTarot: '🃏 점집: 타로', fortuneOrb: '🔮 점집: 수정구슬', fortuneShaman: '🪭 점집: 무당', offscreen: '🌙 화면 밖 생활', ambientOn: '🌦 날씨 · 시간대 효과',
};
// 켜면 addons.js를 다시 읽어야 하는 것 (views.js ADDON_FLAGS와 같은 무리)
const ADDON_KEYS = new Set(['groupChat', 'relRace', 'pairAff', 'hpWave', 'guestbook', 'socialAff', 'ambientOn', 'giftTaste', 'promiseClock', 'gearOn', 'fortuneTarot', 'fortuneOrb', 'fortuneShaman']);
const START_NAME = { basic: '🍱 롤플', simple: '🍙 심플', life: '🏡 생활', fusion: '🌀 융합', apoc: '🧟 아포칼립스' };
const SKIN_NAME = { clean: '깔끔', dot: '도트', phone: '폰' };
const PLAY_NAME = (p) => p.ensemble ? '군상극 (주인공 없음)' : ({ rp: '1:1 롤플', multi: '다인', director: '풀사칭' }[p.mode] ?? '롤플');

// 장르 → 맛. 맛 하나 = { 칸, 플레이 방식, 시작 방식(게임 모드), 부가 기능, 어울리는 모양 }
//   칸에 needs(상점 → 재산)가 있으면 고를 때 같이 켠다
export const STYLES = [
    { id: 'romance', icon: '💕', name: '연애 · 공략', desc: '관계 · 감정선이 중심', flavors: [
        { id: 'sweet', icon: '🍯', name: '달달 1:1', desc: '한 사람과 천천히 · 설레는 순간이 가끔 저절로', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'memo'], set: { mindMode: 'thought', romSpark: true, giftTaste: true }, skin: 'phone' },
        { id: 'routes', icon: '👑', name: '다인 공략', desc: '누구와 이어질지 모름 · 루트 비교 · 질투 · 공략', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'memo', 'gossip', 'sns'], set: { relRace: true, pairAff: true, guideOn: true, peekCost: true, groupChat: true, mindMode: 'thought' }, skin: 'phone' },
        { id: 'obsess', icon: '🖤', name: '집착 · 피폐', desc: '흉터가 남는 관계 · 인물이 내 상태창에 손을 댐', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'contact', 'memo'], set: { mindMode: 'thought', relScar: true, meddleOn: true, romFacts: true, romDrive: true }, skin: 'clean' },
        { id: 'regress', icon: '🔁', name: '회귀 · 빙의', desc: '되돌릴수록 기시감 · 기억이 어긋남 · 누가 뭘 아는지', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'map', 'memo', 'quest'], set: { loopMode: true, swipeGhost: true, memoryDrift: true, ledgerKnow: true, mindMode: 'thought' }, skin: 'clean' },
    ] },
    { id: 'rofan', icon: '🏰', name: '로판 · 궁중', desc: '귀족 · 황실 · 사교계', flavors: [
        { id: 'rofan', icon: '💍', name: '로판 연애', desc: '사교계 소문 · 여러 후보 · 선물과 편지', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'wallet', 'gossip', 'memo'], set: { relRace: true, giftTaste: true, mindMode: 'thought' }, skin: 'clean' },
        { id: 'court', icon: '🗡', name: '궁중 암투', desc: '비밀 · 약속 · 누가 뭘 아는지 · 긴장이 쌓임', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'map', 'news', 'gossip', 'memo'], set: { ledgerKnow: true, ledgerPromise: true, promiseClock: true, guideOn: true, peekCost: true, tensionOn: true }, skin: 'clean' },
    ] },
    { id: 'modern', icon: '🏙', name: '현대 일상', desc: '학교 · 회사 · 연예계', flavors: [
        { id: 'school', icon: '🎓', name: '학원물', desc: '단체방 · 학교 게시판 · 업적', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'board', 'ach', 'memo'], set: { groupChat: true, socialAff: true }, skin: 'phone' },
        { id: 'idol', icon: '🎤', name: '연예계 · 아이돌', desc: 'SNS · 가십 · 기사 · 정산', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'contact', 'wallet', 'sns', 'gossip', 'news'], set: { socialAff: true }, skin: 'phone' },
        { id: 'office', icon: '💼', name: '오피스', desc: '월급 · 일정 · 지켜야 할 약속', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'contact', 'wallet', 'memo', 'quest'], set: { ledgerPromise: true, promiseClock: true }, skin: 'clean' },
        { id: 'cyworld', icon: '📒', name: '싸이월드 감성', desc: '미니홈피 · 파도타기 · 방명록 · BGM', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'contact', 'music', 'memo'], set: { hompyFull: true, hpWave: true, guestbook: true, socialAff: true }, skin: 'dot' },
    ] },
    { id: 'adventure', icon: '⚔', name: '모험 · 판타지', desc: '전투 · 의뢰 · 성장', flavors: [
        { id: 'rpg', icon: '🗺', name: '정통 RPG', desc: '능력치 · 판정 · 상점 · 퀘스트 · 장비', play: { mode: 'rp' }, mods: ['profile', 'stats', 'dice', 'wallet', 'shop', 'map', 'calendar', 'quest', 'ach'], set: { gearOn: true }, skin: 'dot' },
        { id: 'fate', icon: '🔮', name: '운명 · 저주', desc: '저주 · 축복 · 이벤트 카드 · 점집', play: { mode: 'rp' }, mods: ['profile', 'stats', 'dice', 'wallet', 'map', 'calendar', 'quest', 'fate'], set: { fortuneTarot: true, fortuneOrb: true, fateDebt: true }, skin: 'dot' },
        { id: 'murim', icon: '🏯', name: '무협', desc: '내공 · 판정 · 강호의 소문', play: { mode: 'rp' }, mods: ['profile', 'stats', 'dice', 'rel', 'map', 'calendar', 'quest', 'gossip'], set: { fortuneShaman: true }, skin: 'clean' },
    ] },
    { id: 'life', icon: '🏡', name: '생활 · 시뮬', desc: '심즈 · 스타듀 · 좀보이드', flavors: [
        { id: 'heal', icon: '🌱', name: '힐링 생활', desc: '욕구 게이지 · 집 꾸미기 · 도트 인형 옷 입히기', start: 'life', play: { mode: 'rp' }, mods: ['profile', 'stats', 'wallet', 'shop', 'home', 'rel', 'calendar'], set: {}, skin: 'dot' },
        { id: 'debt', icon: '💸', name: '빚 갚기', desc: '생활비 · 대출 · 전당포 · 일하기 판정', start: 'life', play: { mode: 'rp' }, mods: ['profile', 'stats', 'dice', 'wallet', 'shop', 'home', 'calendar', 'quest'], set: {}, skin: 'dot' },
        { id: 'survive', icon: '🌀', name: '생존 조금', desc: '생활 + 수분 · 체온까지', start: 'fusion', play: { mode: 'rp' }, mods: ['profile', 'stats', 'wallet', 'shop', 'map', 'calendar'], set: { ambientOn: true }, skin: 'dot' },
        { id: 'apoc', icon: '🧟', name: '아포칼립스', desc: '욕구가 빨리 줄고 가게는 비싸고 물건이 적어요', start: 'apoc', play: { mode: 'rp' }, mods: ['profile', 'stats', 'wallet', 'shop', 'map', 'calendar'], set: {}, skin: 'dot' },
    ] },
    { id: 'director', icon: '🎬', name: '내가 감독', desc: '주인공도 AI가 써요', flavors: [
        { id: 'director', icon: '🎭', name: '풀사칭', desc: '나는 디렉터 · 인물끼리 호감 · 루트 비교', play: { mode: 'director' }, mods: ['profile', 'stats', 'rel', 'calendar', 'map', 'memo', 'gossip'], set: { pairAff: true, relRace: true }, skin: 'clean' },
        { id: 'ensemble', icon: '👥', name: '군상극', desc: '주인공 없음 · 인물끼리의 관계 · 화면 밖 생활', play: { mode: 'director', ensemble: true }, mods: ['profile', 'rel', 'calendar', 'map', 'memo', 'gossip', 'news'], set: { pairAff: true, relRace: true, offscreen: true, tensionOn: true }, skin: 'clean' },
    ] },
];
export const flavorOf = (id) => { for (const g of STYLES) { const f = g.flavors.find(x => x.id === id); if (f) return f; } return null; };
// 칸 + 꼭 같이 있어야 하는 칸 (상점 → 재산) · 생활 모드는 수치 · 재산 · 상점이 꼭 있다 (life.js applyMode와 같음)
const withNeeds = (ids, start) => { const s = new Set(ids.filter(id => MOD[id])); if (['life', 'fusion', 'apoc'].includes(start)) for (const m of ['stats', 'wallet', 'shop']) s.add(m); for (const id of [...s]) if (MOD[id].needs) s.add(MOD[id].needs); return MOD_IDS.filter(id => s.has(id)); };
const flagIsOn = (k, st = settings()) => (k === 'mindMode' ? !!st.mindMode && st.mindMode !== 'off' : k === 'guideOn' || k === 'offscreen' ? st[k] !== false : st[k] === true);

// ───── 화면 ─────
function genreHTML() {
    return `<h3>🐱 어떻게 놀고 싶어요?</h3>
        <p class="ss-hint">고르면 이 이야기에 맞는 칸과 기능이 한 번에 켜져요 (AI 0회). 나중에 <b>관리 › 쓸 기능</b>에서 언제든 바꿀 수 있어요.</p>
        <div class="ss-sp-grid">${STYLES.filter(g => !(g.id === 'life' && tidyHidden('extra', 'life'))).map(g => `<button type="button" class="ss-sp-card" data-sp-g="${g.id}"><span class="ss-sp-ico">${g.icon}</span><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></button>`).join('')}</div>
        <div class="ss-sp-alt">
            <button type="button" class="ss-btn" data-choice="light"><span>🍙</span> 그냥 가볍게<small>꼭 필요한 6칸 · 심플 화면</small></button>
            <button type="button" class="ss-btn ghost" data-choice="manual"><span>🛠</span> 다 해 봤어요, 직접 고를래요<small>전체 기능 목록으로</small></button>
            <button type="button" class="ss-btn ghost" data-choice="tidy"><span>🧹</span> 기능 정리<small>쓸 것만 남기고 나머지는 숨기기</small></button>
        </div>`;
}
function flavorHTML(g, f, pick, why) {
    const mods = withNeeds(f.mods, f.start).filter(id => !tidyHidden('mods', id)), flags = Object.keys(f.set).filter(k => !tidyHidden('flags', k)); // 🧹 숨긴 것은 안 보이고 안 켠다
    const row = (kind, k, name, note = '') => `<label class="ss-sp-item ${pick.off.has(`${kind}:${k}`) ? '' : 'on'}"><input type="checkbox" class="ss-switch" data-sp-off="${kind}:${k}" ${pick.off.has(`${kind}:${k}`) ? '' : 'checked'}><span>${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</span></label>`;
    const already = flags.filter(k => flagIsOn(k));
    return `<div class="ss-sp-top"><button type="button" class="ss-btn sm ghost" data-sp-back><i class="fa-solid fa-chevron-left"></i> 다른 장르</button><b>${g.icon} ${esc(g.name)}</b></div>
        <div class="ss-sp-grid flav">${g.flavors.map(x => `<button type="button" class="ss-sp-card ${x.id === f.id ? 'on' : ''}" data-sp-f="${x.id}"><span class="ss-sp-ico">${x.icon}</span><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></button>`).join('')}</div>
        <div class="ss-sp-detail">
            <div class="ss-sp-line"><span>플레이</span><b>${esc(PLAY_NAME(f.play))}</b><span>화면</span><b>${START_NAME[f.start ?? 'basic']}</b></div>
            <h4>켜는 칸 <small>이 채팅만 · 빼고 싶은 건 끄세요</small></h4>
            <div class="ss-sp-items">${mods.map(id => row('mod', id, MOD[id].name)).join('')}</div>
            ${flags.length ? `<h4>같이 켜는 기능 <small>모든 채팅에 걸려요 · 켜기만 하고 다른 건 끄지 않아요</small></h4>
            <div class="ss-sp-items">${flags.map(k => row('flag', k, FLAG_NAME[k] ?? k, already.includes(k) ? '이미 켜져 있음' : '')).join('')}</div>` : ''}
            ${f.skin ? `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-sp-look ${pick.look ? 'checked' : ''}><span>모양도 어울리게 — <b>${SKIN_NAME[f.skin]}</b>${why === 'again' ? ' (지금 모양이 바뀌어요)' : ''}</span></label>` : ''}
        </div>
        <div class="ss-sp-go"><button type="button" class="ss-btn pri big" data-choice="go"><i class="fa-solid fa-check"></i> 「${esc(f.name)}」로 시작</button></div>`;
}

// → 고른 맛 id · 'light' · 'manual' · null(닫음). why: 'first'(처음 설치 · 저절로) · 'again'(단추)
export async function openStylePick({ why = 'again' } = {}) {
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-stylepick';
    const pick = { g: null, f: null, off: new Set(), look: why === 'first' || settings().themeAsked !== true };
    const cur = getMeta()?.style;
    const draw = () => {
        const g = STYLES.find(x => x.id === pick.g), f = g?.flavors.find(x => x.id === pick.f);
        box.innerHTML = g && f ? flavorHTML(g, f, pick, why) : genreHTML();
        if (!g && cur) box.querySelector(`[data-sp-g="${STYLES.find(x => x.flavors.some(y => y.id === cur))?.id}"]`)?.classList.add('was');
    };
    box.addEventListener('click', (e) => {
        const gb = e.target.closest('[data-sp-g]'); if (gb) { const g = STYLES.find(x => x.id === gb.dataset.spG); pick.g = g.id; pick.f = g.flavors.find(x => x.id === cur)?.id ?? g.flavors[0].id; pick.off.clear(); draw(); return; }
        const fb = e.target.closest('[data-sp-f]'); if (fb) { pick.f = fb.dataset.spF; pick.off.clear(); draw(); return; }
        if (e.target.closest('[data-sp-back]')) { pick.g = pick.f = null; pick.off.clear(); draw(); }
    });
    box.addEventListener('change', (e) => {
        const t = e.target; if (t.matches?.('[data-sp-off]')) { if (t.checked) pick.off.delete(t.dataset.spOff); else pick.off.add(t.dataset.spOff); t.closest('.ss-sp-item')?.classList.toggle('on', t.checked); }
        else if (t.matches?.('[data-sp-look]')) pick.look = t.checked;
    });
    draw();
    const choice = await choosePopup(box, why === 'first' ? '나중에 고를게요' : '닫기');
    if (choice === 'go') { const f = flavorOf(pick.f); if (!f) return null; await applyStyle(f, { off: pick.off, look: pick.look }); return f.id; }
    if (choice === 'light') { await applyLight(); return 'light'; }
    if (choice === 'tidy') return (await openTidy({ why: 'again' })) ? 'tidy' : null;
    if (choice === 'manual') { await ensureBase(); try { (await import('./autostart.js')).goMods(); } catch (e) { ssWarn(LOG, 'style manual', e); } return 'manual'; }
    if (why === 'first' && settings().quiet !== true) toastr.info('나중에 <b>관리 › 쓸 기능</b>의 「🎨 스타일로 고르기」에서 언제든 골라요.', TITLE, { timeOut: 6000, escapeHtml: false });
    return null;
}
app.openStylePick = openStylePick;

// 상태창이 없으면 틀부터 (AI 0회 · 바로 시작과 같은 틀)
async function ensureBase() {
    if (getMeta()?.base) return true;
    const ok = await (await import('./autostart.js')).autoStart({ force: true, quiet: true });
    return ok || !!getMeta()?.base;
}
// 맛 적용 (AI 0회). off = 빼고 시작할 항목 Set('mod:rel' · 'flag:relRace') · look = 모양도 맞출지
export async function applyStyle(f, { off = new Set(), look = false } = {}) {
    try {
        if (!(await ensureBase())) { toastr.warning('상태창을 만들지 못했어요 — 채팅을 연 뒤에 다시 눌러 주세요.', TITLE); return false; }
        const start = f.start ?? 'basic', want = new Set(withNeeds(f.mods.filter(id => !off.has(`mod:${id}`)), start).filter(id => !tidyHidden('mods', id)));
        // ① 칸 · 플레이 방식 (이 채팅만)
        const meta = getMeta(true); meta.mods ??= {};
        for (const id of MOD_IDS) meta.mods[id] = want.has(id);
        meta.play = normPlay({ ...playOf(meta), ...f.play, ensemble: f.play.ensemble === true });
        meta.style = f.id;
        await saveMeta();
        // ② 부가 기능 (모든 채팅 · 켜기만) — 확장 설정 서랍의 같은 칸도 맞춘다
        const st = settings(), gear0 = st.gearOn === true; let addons = false, story = false;
        for (const [k, v] of Object.entries(f.set)) {
            if (off.has(`flag:${k}`) || tidyHidden('flags', k) || flagIsOn(k, st)) continue;
            st[k] = v; if (ADDON_KEYS.has(k)) addons = true; else if (k !== 'mindMode' && k !== 'hompyFull') story = true;
            const box = document.querySelector(`#ss-settings [data-s="${k}"]`); if (box) { if (box.type === 'checkbox') box.checked = !!v; else box.value = String(v); }
        }
        // ③ 모양 (고른 경우만) — 🎨 모양 고르기 창과 같은 값 · 그 창은 다시 안 띄운다
        if (look && f.skin) Object.assign(st, { hompyFull: true, hpSkin: f.skin, hpFsPx: 0, hpFontPick: false, hpFont: 'g', hpDark: 'light', hpSkinHud: true });
        st.themeAsked = true;
        saveSettings();
        if (addons) { try { await app.loadAddons?.(true); if (gear0 !== (st.gearOn === true)) await (await import('./addons.js')).syncNeedMods?.(); } catch (e) { ssWarn(LOG, 'style addons', e); } }
        if (story) { try { app.storyChanged?.(); } catch { /* 화면 표시일 뿐 */ } }
        // ④ 시작 방식: 심플 · 생활 모드 (생활 모드는 욕구 게이지 · 미트볼 상점 · 생활비를 넣는다 · AI 0회)
        try { await (await import('./simple.js')).startSimple(start === 'simple'); } catch (e) { ssWarn(LOG, 'style simple', e); }
        const meta2 = getMeta();
        if (['life', 'fusion', 'apoc'].includes(start)) { try { await (await import('./life.js')).applyMode(start); } catch (e) { ssWarn(LOG, 'style life', e); } }
        else if (['life', 'fusion', 'apoc'].includes(meta2?.mode)) { try { await (await import('./life.js')).applyMode('rp'); } catch (e) { ssWarn(LOG, 'style rp', e); } }
        if (look && f.skin) { try { (await import('./hompy.js')).applyRetro?.(); app.redecorate?.(); app.renderHud?.(); } catch (e) { ssWarn(LOG, 'style look', e); } }
        app.refreshNow?.(); app.rerenderPanels?.(true);
        toastr.success(`「${esc(f.name)}」로 맞췄어요 (AI 0회). 이야기에 맞게 채우려면 <b>관리 › 쓸 기능</b>의 「고른 대로 채우기」를 눌러요.`, TITLE, { timeOut: 8000, escapeHtml: false });
        return true;
    } catch (e) { ssErr(LOG, 'style apply', e); return false; }
}
// 🍙 그냥 가볍게: 추천 6칸 + 심플 화면 (부가 기능은 그대로)
async function applyLight() {
    try {
        if (!(await ensureBase())) return false;
        const meta = getMeta(true); meta.mods ??= {}; for (const id of MOD_IDS) meta.mods[id] = REC_MODS.includes(id); meta.style = 'light'; await saveMeta();
        await (await import('./simple.js')).startSimple(true);
        app.refreshNow?.(); app.rerenderPanels?.(true);
        toastr.success('꼭 필요한 6칸 · 심플 화면으로 시작해요 (AI 0회).', TITLE);
        return true;
    } catch (e) { ssErr(LOG, 'style light', e); return false; }
}

// ───── 🧹 기능 정리 — 쓸 것만 남기기 ─────
//   지금 쓰는 것 + 언젠가 쓸 것 같은 것만 고르면, 나머지는 **숨긴다** (설정 tidy · 모든 채팅):
//   · 숨긴 칸 = 모든 채팅에서 꺼진 것과 같음 (core.js modOnRaw) · 관리 › 쓸 기능 목록 · 💡 추천 · 🎨 스타일 고르기에도 안 나옴
//   · 숨긴 부가 기능 = 꺼 두고, 관리 창 · 확장 설정 서랍의 체크 칸도 안 보임 (core.js applyTidyStyle)
//   · **지우지 않는다** — 칸의 내용 · 기록은 그대로. 다시 고르면 그 자리로 돌아온다 (관리 › 쓸 기능 맨 위 「🧹 기능 정리」)
//   업데이트로 받은 사람에게 한 번 저절로 (index.js · 설정 tidyAsked) · 필수 아님 — 「그대로 둘게요」면 아무것도 안 바뀐다
const FLAGS = () => [...ADDON_FLAGS, ...STORY_FLAGS];
// 칸도 부가 기능도 아닌 큰 묶음 — 숨기면 그 묶음의 상자 · 단추 · 탭이 전부 안 보인다 (tidy.extra)
const EXTRAS = [['life', '🍞 생활 틀', '게임 모드 · 욕구/꾸미기 탭 · 미트볼 상점 · 고지서']];
const flagLabel = (f) => `${f[1] && !String(f[1]).startsWith('fa-') ? `${f[1]} ` : ''}${f[2]}`;
export function tidyUsed() { // 지금 쓰는 것: 이 채팅에서 켜 둔 칸 · 내용이 있는 칸 · 켜 둔 부가 기능
    const meta = getMeta(), s = app.current?.state, st = settings();
    const mods = new Set(meta?.base ? MOD_IDS.filter(id => (meta.mods?.[id] !== false) || !!s?.data?.[id]) : []);
    const flags = new Set(FLAGS().filter(f => flagOn(st, f)).map(f => f[0]));
    const extra = new Set();
    if (meta?.life?.needs || meta?.life?.wear || ['life', 'fusion', 'apoc'].includes(meta?.mode) || (meta?.dolls && Object.keys(meta.dolls).length)) extra.add('life');
    return { mods, flags, extra, chat: !!meta?.base };
}
export async function openTidy({ why = 'again' } = {}) {
    const st = settings(), t = st.tidy, used = tidyUsed();
    // 처음: 지금 쓰는 것만 골라 둔다 (채팅이 안 열려 있으면 칸은 전부) · 다시 열 때: 지금 보이는 것 = 고름
    const keep = { mods: new Set(MOD_IDS.filter(id => t ? !tidyHidden('mods', id) : (!used.chat || used.mods.has(id)))), flags: new Set(FLAGS().map(f => f[0]).filter(k => t ? !tidyHidden('flags', k) : used.flags.has(k))), extra: new Set(EXTRAS.map(x => x[0]).filter(k => t ? !tidyHidden('extra', k) : used.extra.has(k))) };
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-stylepick ss-tidy';
    const chip = (kind, k, name, isUsed) => `<label class="ss-sp-item ${keep[kind].has(k) ? 'on' : ''}"><input type="checkbox" class="ss-switch" data-td="${kind}:${k}" ${keep[kind].has(k) ? 'checked' : ''}><span>${esc(name)}${isUsed ? '<small>쓰는 중</small>' : ''}</span></label>`;
    const count = () => { const hid = MOD_IDS.length - keep.mods.size + FLAGS().length - keep.flags.size + EXTRAS.length - keep.extra.size; return { keepN: keep.mods.size + keep.flags.size + keep.extra.size, hid }; };
    const draw = () => {
        const { keepN, hid } = count();
        box.innerHTML = `<h3>🧹 기능 정리 — 쓸 것만 남기기</h3>
            <p class="ss-hint">${why === 'update' ? '기능이 많이 늘었어요. ' : ''}<b>지금 쓰는 것</b>과 <b>언젠가 쓸 것 같은 것</b>만 골라 두세요. 고르지 않은 건 모든 채팅에서 꺼지고 <b>관리 창 · 추천에도 안 보여요</b>.<br>
            <b>지우는 게 아니라 숨기는 거예요</b> — 칸 내용 · 기록은 그대로고, <b>관리 › 쓸 기능 › 🧹 기능 정리</b>에서 언제든 다시 꺼내요. 안 해도 괜찮아요.</p>
            <div class="ss-row-btns ss-td-quick"><button type="button" class="ss-btn sm" data-td-quick="used">지금 쓰는 것만</button><button type="button" class="ss-btn sm ghost" data-td-quick="all">전부 고르기</button></div>
            <div class="ss-sp-detail">
                <h4>칸 <small>상태창의 탭 · HUD 칸</small></h4>
                <div class="ss-sp-items">${MODS.map(m => chip('mods', m.id, m.name, used.mods.has(m.id) && used.chat)).join('')}</div>
                <h4>화면 · 모드 <small>묶음째로</small></h4>
                <div class="ss-sp-items">${EXTRAS.map(([k, n, d]) => chip('extra', k, `${n} — ${d}`, used.extra.has(k))).join('')}</div>
                <h4>부가 기능 <small>선택 기능 · 이야기 장치</small></h4>
                <div class="ss-sp-items">${FLAGS().map(f => chip('flags', f[0], flagLabel(f), used.flags.has(f[0]))).join('')}</div>
            </div>
            <div class="ss-sp-go"><button type="button" class="ss-btn pri big" data-choice="go" ${keep.mods.size ? '' : 'disabled'}><i class="fa-solid fa-check"></i> ${keepN}개 남기고 ${hid}개 숨기기</button></div>
            ${keep.mods.size ? '' : '<p class="ss-hint" style="text-align:center">칸을 하나는 남겨 주세요.</p>'}`;
    };
    box.addEventListener('click', (e) => {
        const q = e.target.closest('[data-td-quick]'); if (!q) return;
        if (q.dataset.tdQuick === 'all') { keep.mods = new Set(MOD_IDS); keep.flags = new Set(FLAGS().map(f => f[0])); keep.extra = new Set(EXTRAS.map(x => x[0])); }
        else { keep.mods = new Set(MOD_IDS.filter(id => !used.chat || used.mods.has(id))); keep.flags = new Set(used.flags); keep.extra = new Set(used.extra); }
        draw();
    });
    box.addEventListener('change', (e) => {
        const i = e.target; if (!i.matches?.('[data-td]')) return;
        const [kind, k] = i.dataset.td.split(':'); if (i.checked) keep[kind].add(k); else keep[kind].delete(k);
        draw();
    });
    draw();
    const choice = await choosePopup(box, '그대로 둘게요');
    if (choice !== 'go' || !keep.mods.size) { if (why === 'update' && settings().quiet !== true) toastr.info('나중에 <b>관리 › 쓸 기능</b>의 「🧹 기능 정리」에서 언제든 정리해요.', TITLE, { timeOut: 6000 }); return false; }
    return applyTidy(keep);
}
// keep = { mods: Set, flags: Set } — 이 밖의 것은 숨긴다 (지우지 않음)
export async function applyTidy(keep) {
    try {
        const st = settings(), gear0 = st.gearOn === true;
        const mods = MOD_IDS.filter(id => !keep.mods.has(id)), flags = FLAGS().map(f => f[0]).filter(k => !keep.flags.has(k)), extra = EXTRAS.map(x => x[0]).filter(k => !keep.extra?.has(k));
        st.tidy = mods.length || flags.length || extra.length ? { mods, flags, extra } : null;
        for (const k of flags) { if (st[k] === true || (k === 'guideOn' && st[k] !== false)) { st[k] = false; const b = document.querySelector(`#ss-settings input[data-s="${k}"]`); if (b) b.checked = false; } }
        saveSettings(); applyTidyStyle();
        if (gear0 !== (st.gearOn === true)) { try { await app.loadAddons?.(true); await (await import('./addons.js')).syncNeedMods?.(); } catch (e) { ssWarn(LOG, 'tidy gear', e); } }
        try { app.storyChanged?.(); } catch { /* 화면 표시일 뿐 */ }
        app.refreshNow?.(); app.rerenderPanels?.(true); app.renderHud?.();
        toastr.success(st.tidy ? `${mods.length + flags.length + extra.length}개를 숨겼어요 (지우지 않았어요). 다시 꺼내려면 <b>관리 › 쓸 기능 › 🧹 기능 정리</b>.` : '숨긴 기능을 전부 다시 꺼냈어요.', TITLE, { timeOut: 8000 });
        return true;
    } catch (e) { ssErr(LOG, 'tidy apply', e); return false; }
}
app.openTidy = openTidy;
