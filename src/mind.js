// 💭 속마음 탭 (v2.10) — 프로필 카드마다 붙어 있던 속마음을 따로 탭으로 뺐다 (사람 묶음 · 관계 옆). 여기서 다 정하고 다 본다.
//   · 누가 말할까 (설정 mindWho): cast = 장면 속 인물의 속마음 · watch = 관전자 (이야기 밖에서 이 채팅을 보는 사람들)
//       관전자 컨셉(mindcfg.js WATCH) 여러 개를 켜 두면 턴마다 1~2명이 랜덤으로 한마디 · 🧠 세포들은 고른 세포 중 1~2마리
//       「인물도 가끔 섞기」(mindCastMix)를 켜면 절반쯤의 턴에 인물 속마음도 같이 온다
//   · 어조 (mindTone · 직접 쓰기 mindToneCustom) · 보는 방식 (글 · 이모티콘 · 카모지 · 글 + 카모지) · 뜨는 때 (항상 · 랜덤 · 이 탭에 들어올 때)
//   · 뜰 때 연출 (mindPop): 새 한마디가 오면 HUD(없으면 미니바) 옆에 말풍선이 컨셉마다 다른 모양으로 톡 튀어나온다 — mindPop()
//   · 눈치 (peekCost): 켜면 인물 속마음이 가려진 채로 오고, 눌러서 볼 때마다 그 사람의 눈치 +1 (관전자 한마디는 안 가린다)
//   · 저장: 인물 = ops.js opMind → rel.user[] / profile.list[]의 mind · mindLog · 관전자 = ops.js opWatch → 상태의 watch[] (최근 30)
import { app, settings, saveSettings, getMeta, saveMeta, modOn, esc, stamp, TITLE, LOG, ssWarn, mindCovered, ctx } from './core.js';
import { addAdjust, sceneTester, mindPlan } from './engine.js';
import { fetchMinds, fetchWatch } from './ai.js';
import { emptyBox, avatar, ai1, busyBtn, sec, confirmPopup } from './kit.js';
import { MIND_FREQ, addAlbum } from './extra.js';
import { MIND_NAMES, WATCH, TONES, CELLS, CELL_FACES, NUM_DEF, SHORT_RULE, watchDefs, watchOn, watchMode, conceptOf, cellsOn, cellDefs, toneDefs, numOf, cellSvg, watchIcon } from './mindcfg.js';
import { F } from './feat.js'; // 눈치(story.js)는 ⚡ 엿보기 대가를 켜면 불러와 있다 (feat.js) — 아직이면 0으로 본다
const susOf = (n) => F.story?.susOf(n) ?? 0, addSus = (n, k) => F.story?.addSus(n, k);

let busy = false;
// 속마음이 뜨는 사람 = 관계에 있는 사람(빠진 사람 제외) + 프로필에만 있는 인물 (나 자신은 빼고)
export function people(s) {
    const rel = (modOn('rel') ? s?.data?.rel?.user ?? [] : []), out = rel.filter(r => !r.out);
    if (modOn('profile')) for (const p of s?.data?.profile?.list ?? []) if (p.role !== 'user' && !rel.some(r => r.name === p.name)) out.push(p);
    return out;
}
const ago = (s, t) => { const n = (s.turn ?? 0) - (t ?? 0); return n <= 0 ? '방금' : `${n}턴 전`; };
// 누구 것을 받을까: 지금 장면에 있는 사람(최대 4) → 없으면 호감 높은 순 3
function targets(s, max = 4) {
    const ps = people(s); if (!ps.length) return [];
    let inScene = () => false;
    try { inScene = sceneTester(settings(), s); } catch (e) { ssWarn(LOG, 'mind scene', e); }
    const here = ps.filter(r => inScene(r.name)).slice(0, max);
    return (here.length ? here : [...ps].sort((a, b) => ((b.aff ?? 0) + (b.trust ?? 0)) - ((a.aff ?? 0) + (a.trust ?? 0))).slice(0, Math.min(3, max))).map(r => r.name);
}
// 관전자 한마디 (최근 것부터) → 화면용 { who, text, turn, c(컨셉 id), d(컨셉 정보) }
export function watchFeed(s, n = 30) {
    const set = settings(), defs = watchDefs(set);
    return (s?.watch ?? []).slice(-n).reverse().map(x => { const c = conceptOf(set, x.who); return { ...x, c, d: defs[c] ?? defs.by ?? { icon: '👀', name: '관전자' } }; });
}

// 지금 받기 (AI 1~2회 — 인물 · 관전자를 따로) — auto: 탭에 들어와서 저절로 부른 것 (실패해도 조용히 · 그 턴엔 다시 안 부름)
export async function mindFetch(auto = false) {
    const s = app.current?.state, meta = getMeta(), set = settings();
    if (busy || !s || !meta?.base || (set.mindMode ?? 'off') === 'off') return false;
    const plan = mindPlan(s, set, true), names = plan.cast ? targets(s, watchMode(set) ? 2 : 4) : [];
    if (!names.length && !plan.watch.length) return false;
    busy = true; meta.mindTab = s.turn; saveMeta();
    app.rerenderPanels?.(true);
    try {
        const ops = [], who = [];
        if (names.length) { const got = await fetchMinds(names, s); for (const x of got) { ops.push(['mind', `${x.name} | ${x.text}`]); who.push(x.name); } }
        if (plan.watch.length) { const got = await fetchWatch(plan.watch, s); for (const x of got) { ops.push(['watch', `${x.who} | ${x.text}`]); who.push(x.who); } }
        if (!ops.length) { if (!auto) toastr.info('이번엔 받아 온 속마음이 없어요. 한 번 더 눌러 보세요.', TITLE); return false; }
        await addAdjust({ ops, silent: true, label: `💭 속마음: ${who.join(' · ')}` });
        return true;
    } catch (e) {
        ssWarn(LOG, 'mind fetch', e);
        if (!auto) toastr.error(`속마음을 받지 못했어요: ${esc(e?.message ?? e)}`, TITLE);
        return false;
    } finally { busy = false; app.rerenderPanels?.(true); }
}
app.mindFetch = mindFetch;

// ───── 💭 속마음 탭 ─────
const pill = (on, act, arg, label, title = '') => `<button class="ss-pill ${on ? 'on' : ''}" data-act="${act}" data-arg="${esc(arg)}" aria-pressed="${on}"${title ? ` title="${esc(title)}"` : ''}>${on ? '<i class="fa-solid fa-check"></i> ' : ''}${label}</button>`;
export function mindTab(s, ui = {}) {
    const set = settings(), meta = getMeta(), mode = MIND_NAMES[set.mindMode] ? set.mindMode : 'off', on = mode !== 'off';
    const freq = MIND_FREQ[set.mindFreq] ? set.mindFreq : 'random', pct = Number(set.mindPct ?? 35), watch = watchMode(set);
    const freqLabel = { always: '항상 (매 턴)', random: `랜덤 (${pct}%)`, tab: '이 탭에 들어올 때' };
    // 「이 탭에 들어올 때」: 이번 턴에 아직 안 받았으면 한 번 받는다 (그리는 중에는 부르지 않고 다음 틈에)
    if (on && freq === 'tab' && !busy && meta && meta.mindTab !== s.turn && !meta.paused && (watch || people(s).length)) setTimeout(() => { if ((settings().mindFreq ?? '') === 'tab') mindFetch(true); }, 0);
    const modeRow = `<div class="ss-f wide"><span>보는 방식</span><div class="ss-seg wrap">${Object.entries(MIND_NAMES).map(([k, v]) => `<button class="${mode === k ? 'on' : ''}" data-act="mindset" data-arg="mode:${k}">${v}</button>`).join('')}</div></div>`;
    if (!on) return `<div class="ss-mind-hero"><div class="ss-mind-hero-ic">💭</div><div><b>속마음 · 관전자</b><p>장면 속 인물의 속마음이나, 이야기 밖에서 이 채팅을 구경하는 관전자들(열성팬 · 안티 · 공동작가 · 세포들…)의 한마디를 짧게 보여 줘요. 본편 AI가 답과 같이 적어서 추가 호출 0.</p></div></div>
        ${sec('켜기', modeRow)}`;
    const defs = watchDefs(set), picked = new Set(watchOn(set)), cells = new Set(cellsOn(set)), N = numOf(set), hidN = ['w', 'c', 't'].reduce((a, k) => a + (set.mindHide?.[k]?.length ?? 0), 0);
    const cid = (id) => esc(String(id).replace(/[^a-z0-9]/gi, ''));
    const edBtn = (arg, what) => `<i class="ss-wt-ed fa-solid fa-pen" data-act="mindcfg" data-arg="${esc(arg)}" title="${esc(what)} 고치기 — 이름 · 아이콘 · AI에게 가는 설명 · 어조까지" role="button"></i>`;
    const wcard = ([id, d]) => `<button class="ss-wt c-${cid(id)} ${d.own ? 'c-own' : ''} ${picked.has(id) ? 'on' : ''}" ${d.color ? `style="--wt:${esc(d.color)}"` : ''} data-act="mindcfg" data-arg="w:${esc(id)}" aria-pressed="${picked.has(id)}"><span class="ss-wt-ic">${id === 'cells' ? cellSvg(Object.values(cellDefs(set))[0] ?? {}) : watchIcon(d)}</span><b>${esc(d.name)}${d.edited ? ' <small>· 고침</small>' : ''}</b><small>${esc(String(d.desc ?? '').replace('{{user}}', '나'))}</small>${id === 'cells' ? '' : edBtn(`wedit:${id}`, d.name)}</button>`;
    const whoSec = sec('🎭 누가 말할까', `
        <div class="ss-seg wrap ss-mind-who">${[['cast', '💭 장면 속 인물'], ['watch', '👀 관전자']].map(([k, n]) => `<button class="${(watch ? 'watch' : 'cast') === k ? 'on' : ''}" data-act="mindcfg" data-arg="who:${k}">${n}</button>`).join('')}</div>
        ${watch ? `<p class="ss-hint">켜 둔 컨셉 중에서 턴마다 1~${N.max}명이 랜덤으로 나와요. 프리셋은 시작점일 뿐 — ✏로 이름 · 아이콘 · AI에게 가는 설명 · 그 친구만의 어조 · 말풍선 색까지 다 고쳐요.</p>
        <div class="ss-wt-grid">${Object.entries(defs).filter(([, d]) => !d.cell).map(wcard).join('')}
            <button class="ss-wt add" data-act="mindcfg" data-arg="wnew"><span class="ss-wt-ic"><i class="fa-solid fa-plus"></i></span><b>관전자 만들기</b><small>이름 · 컨셉을 직접</small></button></div>
        ${picked.has('cells') ? `<div class="ss-cells"><div class="ss-cells-h"><b>🧠 어떤 세포가 살까요</b><small>켠 세포 중 1~2마리가 튀어나와요 · ${cells.size}마리 · ✏로 이름 · 색 · 표정 · 성격까지</small></div>
            <div class="ss-cells-g">${Object.entries(cellDefs(set)).map(([id, c]) => `<button class="ss-cell ${cells.has(id) ? 'on' : ''}" data-act="mindcfg" data-arg="cell:${esc(id)}" aria-pressed="${cells.has(id)}" title="${esc(c.desc)}"><span>${cellSvg(c)}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small>${edBtn(`cedit:${id}`, c.name)}</button>`).join('')}
            <button class="ss-cell add" data-act="mindcfg" data-arg="cnew"><span>${cellSvg({ color: '#e8e2d6', face: 'happy' })}</span><b>세포 만들기</b><small>성격 · 색 · 표정</small></button></div></div>` : ''}
        <div class="ss-f wide"><span>인물 속마음도 섞기 <small>장면에 인물이 있으면 ${N.cast}%의 턴에 같이 떠요</small></span><div class="ss-pills">${pill(set.mindCastMix !== false, 'mindcfg', 'mix', '랜덤으로 섞기')}${pill(set.mindCastMix === false, 'mindcfg', 'nomix', '관전자만')}</div></div>`
        : '<p class="ss-hint">지금 장면에 있는 인물(최대 4명)의 속마음이 와요. 「관전자」로 바꾸면 이야기 밖의 구경꾼들이 한마디씩 해요.</p>'}`);
    const tdefs = toneDefs(set), tone = tdefs[set.mindTone] ? set.mindTone : 'none';
    const toneSec = sec('🗣 어조', `<div class="ss-pills ss-tones">${Object.entries(tdefs).map(([k, t]) => `<span class="ss-tone-w"><button class="ss-pill ${tone === k ? 'on' : ''}" data-act="mindcfg" data-arg="tone:${esc(k)}" title="${esc(t.p || '')}">${esc(t.name)}${k === 'custom' && tone === 'custom' && set.mindToneCustom ? `<small> · ${esc(String(set.mindToneCustom).slice(0, 14))}</small>` : ''}</button>${k === 'none' ? '' : `<i class="ss-tone-ed fa-solid fa-pen" data-act="mindcfg" data-arg="tedit:${esc(k)}" role="button" title="${esc(t.name)} 고치기"></i>`}</span>`).join('')}<button class="ss-pill" data-act="mindcfg" data-arg="tnew"><i class="fa-solid fa-plus"></i> 어조 만들기</button></div>
        <div class="ss-f wide"><span>인물 속마음에도 <small>끄면 관전자에게만 — 인물은 원래 성격대로 · 관전자 · 세포마다 자기 어조를 따로 줄 수도 있어요 (✏)</small></span><div class="ss-pills">${pill(set.mindToneCast === true, 'mindcfg', 'tonecast', '인물에게도 걸기')}</div></div>
        <p class="ss-hint">길게 늘어놓는 독백은 막아 뒀어요 — 한숨에 끝나는 한마디만 (한글 ${N.len}자까지). 글자 수 · 규칙 글은 아래 「🔢 세부 숫자 · 규칙」에서.</p>`);
    const numSec = sec('🔢 세부 숫자 · 규칙', `<div class="ss-chips ss-mind-nums">${[`한 턴 최대 ${N.max}명`, `한 명 더 ${N.two}%`, `세포 두 마리 ${N.cellTwo}%`, `인물 섞기 ${N.cast}%`, `글자 ${N.len}자`, `말풍선 ${N.sec}초`, `위치 ${POS_NAME[N.pos]}`, `카모지 예시 ${N.kao}개`, `랜덤 ${Number(set.mindPct ?? 35)}%`, set.mindRule ? '짧게 규칙: 고침' : '짧게 규칙: 기본'].map(t => `<span class="ss-chip">${esc(t)}</span>`).join('')}</div>
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="mindcfg" data-arg="nums"><i class="fa-solid fa-sliders"></i> 고치기</button>${hidN ? `<button class="ss-btn sm ghost" data-act="mindcfg" data-arg="unhide">지운 기본 프리셋 ${hidN}개 되살리기</button>` : ''}<button class="ss-btn sm ghost" data-act="mindcfg" data-arg="resetall" title="고친 프리셋 · 숫자 · 규칙을 처음대로 (직접 만든 것은 남겨요)">전부 처음대로</button></div>`);
    const howSec = sec('⚙ 보는 방식 · 뜨는 때', `${modeRow}
        <div class="ss-f wide"><span>뜨는 때</span><div class="ss-seg wrap">${Object.keys(MIND_FREQ).map(k => `<button class="${freq === k ? 'on' : ''}" data-act="mindset" data-arg="freq:${k}">${freqLabel[k]}</button>`).join('')}</div></div>
        <div class="ss-f wide"><span>뜰 때 연출 <small>HUD · 미니바 옆에 말풍선이 톡</small></span><div class="ss-pills">${pill(set.mindPop !== false, 'mindcfg', 'pop', '켜기')}<button class="ss-pill" data-act="mindcfg" data-arg="poptest"><i class="fa-solid fa-play"></i> 미리 보기</button></div></div>
        ${!watch || set.mindCastMix !== false ? `<div class="ss-f wide"><span>👁 눈치 <small>인물 속마음이 가려진 채로 오고, 눌러 볼 때마다 그 사람 눈치 +1 · 3부터 의심</small></span><div class="ss-pills">${pill(set.peekCost === true, 'mindset', 'sus:toggle', '볼 때마다 눈치')}</div></div>` : ''}
        <p class="ss-hint">${freq === 'tab' ? '이 탭에 들어오면 그 턴에 한 번 받아 와요 (AI 1~2회).' : freq === 'always' ? '본편 AI가 매 턴 답과 함께 적어요 (추가 호출 0).' : `본편 AI가 ${pct}%의 턴에 답과 함께 적어요 (추가 호출 0).`}</p>`);
    // 지금 · 지난 것
    const feed = watchFeed(s, 20), ps = people(s);
    const getBar = `<div class="ss-rombar ss-mind-get"><span><i class="fa-solid fa-comment-dots"></i> ${watch ? '지금 장면에 한마디' : '인물들의 속마음'}</span><button class="ss-btn sm" data-act="mindfetch" ${busy ? 'disabled' : ''} title="지금 받아 와요 (AI 1~2회)"><i class="fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}"></i> ${busy ? '받는 중…' : `지금 받기 ${ai1}`}</button></div>`;
    const feedSec = watch || feed.length ? sec(`👀 관전석 <small>${feed.length}개</small>`, feed.length ? `<ul class="ss-wt-feed">${feed.map((x, i) => `<li class="c-${esc(x.c.replace(/[^a-z0-9]/gi, ''))} ${x.turn === s.turn ? 'now' : ''}" ${x.d?.color ? `style="--wt:${esc(x.d.color)}"` : ''}><span class="ss-wt-ic">${watchIcon(x.d)}</span><div><b>${esc(x.who)}</b><p>${esc(x.text)}</p></div><small>${ago(s, x.turn)}</small>${set.albumOn !== false ? `<button class="ss-ib" data-act="mindstar" data-arg="w:${i}" title="앨범에 저장"><i class="fa-regular fa-star"></i></button>` : ''}</li>`).join('')}</ul>` : '<p class="ss-dim">아직 한마디가 없어요. 다음 답부터 와요 — 아니면 「지금 받기」.</p>') : '';
    const castSec = ps.length ? sec(`💭 인물 속마음 <small>${ps.filter(r => r.mind?.text).length}/${ps.length}명</small>`, `<div class="ss-stack">${ps.map(r => mindCard(s, r)).join('')}</div>`) : (watch ? '' : sec('💭 인물 속마음', emptyBox('관계 · 프로필에 인물이 없어요', 'fa-user-group')));
    return `${getBar}${feedSec}${castSec}${whoSec}${toneSec}${howSec}${numSec}`;
}
// 인물 한 사람의 속마음 카드
function mindCard(s, r) {
    const set = settings(), meta = getMeta(), susOn = set.peekCost === true, sus = susOn ? susOf(r.name) : 0, cov = mindCovered(r, meta), seen = Number(meta?.mindSeen?.[r.name] ?? -1);
    const log = (r.mindLog ?? []).filter(x => x.turn !== r.mind?.turn && (!susOn || x.turn <= seen)).slice(-5).reverse();
    const now = !r.mind?.text ? '<p class="ss-dim">아직 속마음이 없어요.</p>'
        : cov ? `<button class="ss-btn ss-mind-cover" data-act="mindopen" data-arg="${esc(r.name)}"><i class="fa-solid fa-eye-slash"></i> 가려져 있어요 — 눌러서 보기 <small>눈치 +1</small></button>`
            : `<p class="ss-mind big">${esc(r.mind.text)}</p>`;
    return `<div class="ss-card ss-mindc ${r.mind?.turn === s.turn ? 'now' : ''}"><div class="ss-mindc-h">${avatar(r.name, 'sm')}<b>${esc(r.name)}</b><small>${r.mind?.text ? ago(s, r.mind.turn) : ''}${susOn ? `${r.mind?.text ? ' · ' : ''}눈치 ${sus}${sus >= 3 ? ' (의심하는 중)' : ''}` : ''}</small>
            ${r.mind?.text && !cov && set.albumOn !== false ? `<button class="ss-ib" data-act="mindstar" data-arg="${esc(r.name)}" title="앨범에 저장"><i class="fa-regular fa-star"></i></button>` : ''}</div>
        <div class="ss-mind-bubble">${now}</div>
        ${log.length ? `<details class="ss-more"><summary>지난 속마음 ${log.length}개</summary><ul class="ss-mind-log">${log.map(x => `<li><span>${esc(x.text)}</span><small>${ago(s, x.turn)}</small></li>`).join('')}</ul></details>` : ''}</div>`;
}

// ───── ✏ 고치기 창 — 기본 프리셋도 직접 만든 것도 같은 창 ─────
const POS_NAME = { hud: 'HUD 옆', tr: '오른쪽 위', tl: '왼쪽 위', br: '오른쪽 아래', bl: '왼쪽 아래' };
const KIND = { w: { name: '관전자', base: WATCH, own: 'mindWatchOwn', on: 'mindWatch' }, c: { name: '세포', base: CELLS, own: 'mindCellOwn', on: 'mindCells' }, t: { name: '어조', base: TONES, own: 'mindToneOwn', on: '' } };
const fld = (k, label, val, opt = {}) => {
    const v = esc(val ?? ''), ph = opt.ph ? ` placeholder="${esc(opt.ph)}"` : '';
    const inp = opt.type === 'area' ? `<textarea class="ss-in" data-f="${k}" rows="${opt.rows ?? 3}"${ph}>${v}</textarea>`
        : opt.type === 'select' ? `<select class="ss-in" data-f="${k}">${opt.opts.map(([ov, on]) => `<option value="${esc(ov)}" ${String(ov) === String(val ?? '') ? 'selected' : ''}>${esc(on)}</option>`).join('')}</select>`
            : opt.type === 'color' ? `<input class="ss-in" type="color" data-f="${k}" value="${/^#[0-9a-f]{6}$/i.test(val ?? '') ? v : '#ffd36e'}">`
                : `<input class="ss-in" type="${opt.type ?? 'text'}" data-f="${k}" value="${v}"${ph}${opt.min !== undefined ? ` min="${opt.min}" max="${opt.max}"` : ''}${opt.maxlength ? ` maxlength="${opt.maxlength}"` : ''}>`;
    return `<label class="ss-f wide"><span>${label}${opt.hint ? ` <small>${esc(opt.hint)}</small>` : ''}</span>${inp}</label>`;
};
async function formPopup(title, sub, body, extra = []) {
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-mind-form';
    let act = 'save';
    box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-pen"></i><div><b>${esc(title)}</b><small>${esc(sub)}</small></div></div>${body}${extra.length ? `<div class="ss-row-btns">${extra.map(([a, n]) => `<button type="button" class="ss-btn sm ghost" data-fa="${a}">${n}</button>`).join('')}</div>` : ''}`;
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-fa]'); if (!b) return; act = b.dataset.fa; box.closest('dialog')?.querySelector('.popup-button-ok')?.click(); });
    box.addEventListener('input', (e) => { if (!e.target.closest('[data-f="color"],[data-f="face"]')) return; const pv = box.querySelector('.ss-form-prev'); if (pv) pv.innerHTML = cellSvg({ color: box.querySelector('[data-f="color"]')?.value, face: box.querySelector('[data-f="face"]')?.value }); });
    if (!await confirmPopup(box, '저장', '취소')) return null;
    const val = {}; box.querySelectorAll('[data-f]').forEach(x => { val[x.dataset.f] = x.value; });
    return { act, val };
}
// kind: w 관전자 · c 세포 · t 어조 · id가 비면 새로 만들기 → 바꿨으면 true
async function editItem(kind, id) {
    const set = settings(), K = KIND[kind], isNew = !id;
    const defs = kind === 'w' ? watchDefs(set) : kind === 'c' ? cellDefs(set) : toneDefs(set);
    const d = isNew ? (kind === 'c' ? { color: '#9fd8e8', face: 'happy' } : kind === 'w' ? { icon: '🎭' } : {}) : defs[id];
    if (!d) return false;
    const builtin = !isNew && Object.hasOwn(K.base, id) && !d.own, tones = [['', '전체 어조 따름'], ...Object.entries(toneDefs(set)).filter(([t]) => t !== 'none').map(([t, x]) => [t, x.name])];
    let body = '';
    if (kind === 't') body = fld('name', '이름', d.name, { maxlength: 12 }) + fld('p', 'AI에게 주는 설명', id === 'custom' && !d.own ? (set.mindToneCustom || '') : d.p, { type: 'area', ph: '예: 문장 끝마다 「냥」을 붙이는 무심한 고양이 말투', hint: '이 글이 그대로 AI에게 가요 (한국어로 써도 돼요)' });
    else {
        body = (kind === 'c' ? `<div class="ss-form-prev">${cellSvg(d)}</div>` : '')
            + fld('name', '이름', d.name, { maxlength: 12, hint: '카드 · 말풍선에 보이는 이름' })
            + (kind === 'w' ? fld('nick', 'AI가 적을 이름', isNew ? '' : d.nick ?? '', { maxlength: 16, hint: '비워 두면 AI가 장면에 맞게 정해요 (주변인 · 시청자처럼)', ph: '예: 열성팬' }) : '')
            + (kind === 'c' ? fld('color', '몸 색', d.color, { type: 'color' }) + fld('face', '표정', d.face, { type: 'select', opts: Object.entries(CELL_FACES) }) : fld('icon', '아이콘', d.icon, { maxlength: 4, hint: '이모지 하나' }))
            + (kind === 'w' ? fld('color', '말풍선 색', d.color || '', { ph: '#e85a9a (비우면 기본)', maxlength: 7 }) : '')
            + fld('desc', '한 줄 소개', String(d.desc ?? '').replace('{{user}}', '나'), { maxlength: 60, hint: '카드에 보이는 설명' })
            + fld('p', 'AI에게 주는 설명', d.p, { type: 'area', rows: 4, ph: kind === 'c' ? '예: 뭐든 「그거 다 내 덕분」이라고 우기는 관종 세포' : '예: 내가 연애하는 걸 몰래 지켜보는 엄마. 잔소리 반 걱정 반', hint: '성격 · 말버릇 · 예시 한마디 — 이 글이 그대로 AI에게 가요' })
            + fld('tone', '이 친구만의 어조', d.tone ?? '', { type: 'select', opts: tones, hint: '전체 어조 대신 이것만 따로' });
    }
    const extra = [];
    if (builtin && d.edited) extra.push(['reset', '<i class="fa-solid fa-rotate-left"></i> 기본으로']);
    if (!isNew && !(kind === 't' && id === 'none')) extra.push(['del', `<i class="fa-solid fa-trash"></i> ${builtin ? '이 프리셋 지우기' : '지우기'}`]);
    const r = await formPopup(isNew ? `${K.name} 만들기` : `${d.name} 고치기`, builtin ? '기본 프리셋 — 고친 것만 덮어써요 · 언제든 「기본으로」' : isNew ? '전부 직접 정해요' : '직접 만든 것', body, extra);
    if (!r) return false;
    const clean = (x) => { const o = {}; for (const [f, val] of Object.entries(x)) { const t = String(val ?? '').trim(); if (f === 'color' && t && !/^#[0-9a-f]{6}$/i.test(t)) continue; o[f] = f === 'p' ? t.slice(0, 600) : f === 'icon' ? Array.from(t).slice(0, 2).join('') : t.slice(0, 80); } return o; };
    const E = () => { set.mindEdit = { ...(set.mindEdit ?? {}) }; set.mindEdit[kind] = { ...(set.mindEdit[kind] ?? {}) }; return set.mindEdit[kind]; };
    if (r.act === 'del') {
        if (builtin) { set.mindHide = { w: [], c: [], t: [], ...(set.mindHide ?? {}) }; set.mindHide[kind] = [...new Set([...(set.mindHide[kind] ?? []), id])]; delete E()[id]; }
        else set[K.own] = (set[K.own] ?? []).filter(x => x.id !== id);
        if (K.on && Array.isArray(set[K.on])) set[K.on] = set[K.on].filter(x => x !== id);
        if (kind === 't' && set.mindTone === id) set.mindTone = 'none';
        return true;
    }
    if (r.act === 'reset') { delete E()[id]; if (kind === 't' && id === 'custom') delete set.mindToneCustom; return true; }
    const val = clean(r.val);
    if (!val.name) { toastr.info('이름은 있어야 해요.', TITLE); return false; }
    if (kind === 't' && id === 'custom' && !d.own) { set.mindToneCustom = val.p; E().custom = { name: val.name }; return true; }
    if (builtin) { E()[id] = val; return true; }
    if (isNew) {
        const list = set[K.own] ?? []; if (list.length >= 16) { toastr.info(`직접 만든 ${K.name}는 16개까지예요.`, TITLE); return false; }
        const nid = `own_${Date.now().toString(36)}`;
        set[K.own] = [...list, { id: nid, ...val }];
        if (K.on) set[K.on] = [...new Set([...(kind === 'c' ? cellsOn(set) : Array.isArray(set[K.on]) ? set[K.on] : []), nid])];
        if (kind === 't') set.mindTone = nid;
        return true;
    }
    set[K.own] = (set[K.own] ?? []).map(x => (x.id === id ? { ...x, ...val } : x));
    return true;
}
async function editNums() {
    const set = settings(), N = numOf(set);
    const body = fld('max', '한 턴에 최대 몇 명', N.max, { type: 'number', min: 1, max: 4, hint: '관전자 (1~4)' })
        + fld('two', '한 명 더 나올 확률 %', N.two, { type: 'number', min: 0, max: 100 })
        + fld('cellTwo', '세포가 두 마리 나올 확률 %', N.cellTwo, { type: 'number', min: 0, max: 100 })
        + fld('cast', '관전자 모드에서 인물 속마음이 섞일 확률 %', N.cast, { type: 'number', min: 0, max: 100 })
        + fld('pct', '「랜덤」일 때 뜨는 턴 %', Number(set.mindPct ?? 35), { type: 'number', min: 0, max: 100 })
        + fld('len', '글자 수 (한글)', N.len, { type: 'number', min: 8, max: 80, hint: '넘으면 첫 문장만 · 영어는 두 배' })
        + fld('sec', '말풍선 머무는 시간 (초)', N.sec, { type: 'number', min: 2, max: 20 })
        + fld('pos', '말풍선 위치', N.pos, { type: 'select', opts: Object.entries(POS_NAME) })
        + fld('kao', '카모지 예시 개수', N.kao, { type: 'number', min: 0, max: 30, hint: '매 턴 AI에게 섞어 보여 줄 수 (0 = 안 보여 줌)' })
        + fld('rule', '짧게 규칙 (AI에게 가는 글)', set.mindRule ?? '', { type: 'area', rows: 5, ph: SHORT_RULE, hint: '비워 두면 기본 — 길이 · 말투 · 좋은 예 · 나쁜 예를 마음대로' });
    const r = await formPopup('세부 숫자 · 규칙', '모든 채팅에 걸려요', body, [['reset', '<i class="fa-solid fa-rotate-left"></i> 처음대로']]);
    if (!r) return false;
    if (r.act === 'reset') { delete set.mindNum; delete set.mindRule; return true; }
    const n = {}; for (const f of Object.keys(NUM_DEF)) if (f !== 'pos') { const x = Number(r.val[f]); if (Number.isFinite(x)) n[f] = x; }
    n.pos = r.val.pos; set.mindNum = n;
    const pct = Number(r.val.pct); if (Number.isFinite(pct)) set.mindPct = Math.max(0, Math.min(100, Math.round(pct)));
    set.mindRule = String(r.val.rule ?? '').trim().slice(0, 1000); if (!set.mindRule) delete set.mindRule;
    return true;
}
export const MIND_ACTIONS = {
    mindfetch: async () => { await mindFetch(false); },
    mindcfg: async (el, arg, btn, s) => {
        const set = settings(), a = String(arg), i = a.indexOf(':'), k = i < 0 ? a : a.slice(0, i), v = i < 0 ? '' : a.slice(i + 1);
        if (k === 'who' && ['cast', 'watch'].includes(v)) set.mindWho = v;
        else if (k === 'w') { const defs = watchDefs(set); if (!defs[v]) return; const cur = new Set(Array.isArray(set.mindWatch) ? set.mindWatch : ['fan']); if (cur.has(v)) cur.delete(v); else cur.add(v); set.mindWatch = [...cur].filter(x => defs[x]); }
        else if (k === 'cell') { const D = cellDefs(set); if (!D[v]) return; const cur = new Set(cellsOn(set)); if (cur.has(v)) { if (cur.size <= 1) { toastr.info('세포는 한 마리는 있어야 해요.', TITLE); return; } cur.delete(v); } else cur.add(v); set.mindCells = [...cur]; }
        else if (k === 'mix') set.mindCastMix = true;
        else if (k === 'nomix') set.mindCastMix = false;
        else if (k === 'tone') {
            const T = toneDefs(set); if (!T[v]) return;
            if (v === 'custom' && !T[v].own && !String(set.mindToneCustom ?? '').trim() && !await editItem('t', v)) return;
            set.mindTone = v;
        }
        else if (k === 'tonecast') set.mindToneCast = set.mindToneCast !== true;
        else if (k === 'pop') set.mindPop = set.mindPop === false;
        else if (k === 'poptest') { popDemo(); return; }
        else if (k === 'wedit' || k === 'cedit' || k === 'tedit') { if (!await editItem(k[0], v)) return; }
        else if (k === 'wnew' || k === 'cnew' || k === 'tnew') { if (!await editItem(k[0], '')) return; }
        else if (k === 'nums') { if (!await editNums()) return; }
        else if (k === 'unhide') set.mindHide = { w: [], c: [], t: [] };
        else if (k === 'resetall') { if (!await confirmPopup(Object.assign(document.createElement('div'), { innerHTML: '<p>고친 프리셋 · 세부 숫자 · 짧게 규칙을 처음대로 돌릴까요?<br><small>직접 만든 관전자 · 세포 · 어조는 남겨요.</small></p>' }), '처음대로', '취소')) return; delete set.mindEdit; delete set.mindHide; delete set.mindNum; delete set.mindRule; }
        else return;
        saveSettings(); app.refreshNow?.(); app.rerenderPanels?.(true); app.renderPanel(el);
    },
    mindopen: async (el, arg, btn, s) => {
        const r = people(s).find(x => x.name === arg), meta = getMeta(true);
        if (!r?.mind?.text) return;
        (meta.mindSeen ??= {})[r.name] = r.mind.turn;
        if (settings().peekCost === true) addSus(r.name, 1); // addSus가 저장까지 한다
        await saveMeta();
        app.refreshNow?.(); app.rerenderPanels?.(true);
    },
    mindstar: async (el, arg, btn, s) => {
        let who = '', text = '';
        if (String(arg).startsWith('w:')) { const x = watchFeed(s, 20)[Number(arg.slice(2))]; if (!x) return; who = x.who; text = x.text; }
        else { const r = people(s).find(x => x.name === arg); if (!r?.mind?.text) return; who = r.name; text = r.mind.text; }
        busyBtn(btn, true, '');
        try { await addAlbum({ kind: 'peek', who, text, when: stamp(s), here: s.data.map?.here ?? '' }); btn.innerHTML = '<i class="fa-solid fa-star"></i>'; btn.disabled = true; }
        catch (e) { ssWarn(LOG, 'mind star', e); busyBtn(btn, false); }
    },
};

// ───── ✨ 뜰 때 연출: 새 속마음 · 한마디가 오면 HUD(없으면 미니바 · 화면 오른쪽 위) 옆에 말풍선이 튀어나온다 ─────
// 화면을 다시 그릴 때마다(shell.js ensureUI) 불린다 — 하는 일은 지금 턴 것과 본 것 비교 한 번. 채팅을 처음 열 때 있던 것은 안 띄운다.
let popChat = null; const popSeen = new Set();
function freshItems(s) {
    const set = settings(), out = [];
    for (const r of people(s)) if (r.mind?.text && r.mind.turn === s.turn) out.push({ key: `m|${s.turn}|${r.name}|${r.mind.text}`, who: r.name, text: mindCovered(r) ? '· · · (눌러서 보기)' : r.mind.text, c: 'cast', icon: '' });
    for (const x of watchFeed(s, 6).reverse()) if (x.turn === s.turn) out.push({ key: `w|${s.turn}|${x.who}|${x.text}`, who: x.who, text: x.text, c: x.c, icon: x.d?.icon ?? '👀', cell: !!x.d?.cell });
    if (out.length > 6) out.length = 6;
    return out.map(x => ({ ...x, mode: set.mindMode }));
}
export function mindPop() {
    const s = app.current?.state; if (!s) return;
    let cid = ''; try { cid = ctx().getCurrentChatId?.() ?? ''; } catch { cid = ''; }
    const items = freshItems(s);
    if (cid !== popChat) { popChat = cid; popSeen.clear(); for (const x of items) popSeen.add(x.key); return; }
    const fresh = items.filter(x => !popSeen.has(x.key)); for (const x of fresh) popSeen.add(x.key);
    if (popSeen.size > 300) { const keep = [...popSeen].slice(-100); popSeen.clear(); for (const k of keep) popSeen.add(k); }
    const set = settings();
    if (!fresh.length || set.mindPop === false || (set.mindMode ?? 'off') === 'off' || getMeta()?.paused || document.body.classList.contains('ss-fullopen')) return;
    pingHost();
    fresh.forEach((x, k) => setTimeout(() => spawn(x), k * 700));
}
app.mindPop = mindPop;
function popDemo() {
    const set = settings(), defs = watchDefs(set), ids = watchMode(set) ? watchOn(set) : [];
    const demo = { fan: '헐 방금 그 눈빛 뭐야 (≧▽≦)', anti: '또 저러네 진짜 ㅋ', writer: '음… 다음 화에 터뜨려야지', by: '…저 둘 뭐 하는 거야', chat: 'ㅋㅋㅋㅋ 도른자', cells: '' };
    const list = ids.length ? ids.slice(0, 3).map(id => id === 'cells' ? (() => { const c = cellsOn(set)[0], CD = cellDefs(set); return { who: CD[c].name, text: c === 'jijeok' ? '「숨을 들이켰다」 또 나옴 ㅋ' : c === 'woo' ? '하아… 어차피 망했어' : c === 'yok' ? '아 씨 뭐야 이게' : '큭큭 잘한다 잘해~', c: `cell:${c}`, icon: '', cell: true }; })() : { who: defs[id].nick || defs[id].name, text: demo[id] ?? '오… 이건 좀 재밌네', c: id, icon: defs[id].icon })
        : [{ who: people(app.current?.state)[0]?.name ?? '레온', text: '…뭐하자는 건지 모르겠네', c: 'cast', icon: '' }];
    pingHost();
    list.forEach((x, k) => setTimeout(() => spawn({ ...x, key: `demo${k}` }), k * 700));
}
// 말풍선이 나올 곳: 보이는 HUD → 펼친 미니바 → 화면 오른쪽 위
function anchorBox() {
    for (const id of ['ss-hud', 'ss-side']) { const el = document.getElementById(id); if (!el) continue; const r = el.getBoundingClientRect(); if (r.width > 40 && r.height > 10 && r.bottom > 0 && r.top < innerHeight) return { el, r, id }; }
    return null;
}
function pingHost() { const a = anchorBox(); if (!a) return; a.el.classList.remove('ss-mind-ping'); void a.el.offsetWidth; a.el.classList.add('ss-mind-ping'); setTimeout(() => a.el.classList.remove('ss-mind-ping'), 1400); }
function popBox() {
    let box = document.getElementById('ss-mind-pops');
    if (!box) { box = document.createElement('div'); box.id = 'ss-mind-pops'; box.className = 'ss-root ss-scope'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); box.addEventListener('click', (e) => { const p = e.target.closest('.ss-mpop'); if (!p) return; p.remove(); app.openSheet?.('mind'); }); }
    const a = anchorBox();
    box.style.bottom = '';
    if (a?.id === 'ss-hud') { box.style.top = `${Math.max(8, Math.min(innerHeight - 160, a.r.bottom + 8))}px`; box.style.left = ''; box.style.right = `${Math.max(8, innerWidth - a.r.right + 8)}px`; box.dataset.at = 'hud'; }
    else if (a?.id === 'ss-side') { const leftSide = a.r.left < innerWidth / 2; box.style.top = `${Math.max(60, a.r.top + 40)}px`; box.style.left = leftSide ? `${a.r.right + 10}px` : ''; box.style.right = leftSide ? '' : `${innerWidth - a.r.left + 10}px`; box.dataset.at = 'side'; }
    else { box.style.top = '64px'; box.style.right = '12px'; box.style.left = ''; box.dataset.at = 'free'; }
    const pos = numOf(settings()).pos; // 🔢 위치를 골랐으면 그 모서리 (HUD 옆이 기본)
    if (pos !== 'hud') { const top = pos === 'tl' || pos === 'tr', left = pos === 'tl' || pos === 'bl'; Object.assign(box.style, { top: top ? '64px' : '', bottom: top ? '' : '90px', left: left ? '12px' : '', right: left ? '' : '12px' }); box.dataset.at = left ? 'side' : 'free'; }
    return box;
}
const CELL_CLS = (c) => String(c).replace(/[^a-z0-9]/gi, '');
function spawn(x) {
    if (typeof document === 'undefined') return;
    const box = popBox(), el = document.createElement('div');
    const cls = x.c === 'cast' ? 'c-cast' : x.cell ? `c-cell c-${CELL_CLS(x.c)}` : `c-${CELL_CLS(x.c)}`;
    el.className = `ss-mpop ${cls}`; el.setAttribute('role', 'status'); el.title = '눌러서 속마음 탭 열기';
    const D = watchDefs(settings())[x.c];
    const ico = x.c === 'cast' ? avatar(x.who, 'sm') : `<span class="ss-mpop-ic">${D ? watchIcon(D) : esc(x.icon || '👀')}</span>`;
    if (D?.color) el.style.setProperty('--wt', D.color);
    const tag = x.c === 'cast' ? '속마음' : x.cell ? '세포' : (D?.name ?? '관전자');
    el.innerHTML = `${ico}<div class="ss-mpop-b"><small><b>${esc(x.who)}</b>${tag !== x.who ? ` · ${esc(tag)}` : ''}</small><p class="ss-mpop-t"></p></div><span class="ss-mpop-fx" aria-hidden="true">${x.c === 'fan' ? '<i>♥</i><i>♥</i><i>✦</i><i>♥</i>' : x.c === 'anti' ? '<i>💢</i>' : x.c === 'writer' ? '<i>✒</i>' : x.cell ? '<i>✦</i><i>✦</i>' : ''}</span>`;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    const t = el.querySelector('.ss-mpop-t'), chars = Array.from(String(x.text)), reduce = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const type = () => { if (reduce) { t.textContent = x.text; return; } let n = 0; const step = Math.max(18, Math.min(55, 900 / Math.max(1, chars.length))); const tick = () => { if (!el.isConnected) return; t.textContent = chars.slice(0, ++n).join(''); if (n < chars.length) setTimeout(tick, step); else el.classList.add('done'); }; tick(); };
    if (x.c === 'cast' && !reduce) { t.innerHTML = '<span class="ss-mpop-dots"><i></i><i></i><i></i></span>'; setTimeout(type, 650); } else type();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, numOf(settings()).sec * 1000 + chars.length * 30);
}
