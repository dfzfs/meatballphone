// 💭 속마음 탭 (v2.9) — 프로필 탭 안의 둘째 칸. 관계 탭에 있던 속마음 줄 · 설정 막대를 여기로 옮겼고, 💗? 엿보기(하루 N번)는 없앴다.
//   · 뜨는 때 (설정 mindFreq): always(매 턴) · random(mindPct% 턴) — 본편 AI가 <meatball>에 같이 적는다 (추가 호출 0)
//                              tab(이 탭에 들어올 때) — 그 턴에 한 번만 AI 1회로 받아 온다 (meta.mindTab = 받은 턴)
//   · 눈치 (설정 peekCost · 선택): 켜면 새 속마음이 가려진 채로 오고, 눌러서 볼 때마다 그 사람의 눈치 +1 (story.js addSus · 공략 탭의 눈치와 같은 수치)
//     어디까지 봤는지는 meta.mindSeen[이름] = 턴. 끄면 전부 그냥 보인다 (core.js mindCovered)
//   · 속마음은 상태에 들어간다: ops.js opMind → rel.user[].mind(지금 것) · mindLog(지난 것 5개)
import { app, settings, getMeta, saveMeta, modOn, esc, stamp, TITLE, LOG, ssWarn, mindCovered } from './core.js';
import { addAdjust, sceneTester } from './engine.js';
import { fetchMinds } from './ai.js';
import { emptyBox, avatar, ai1, busyBtn } from './kit.js';
import { MIND_NAMES, MIND_FREQ, addAlbum } from './extra.js';
import { susOf, addSus } from './story.js';

let busy = false;
const people = (s) => (modOn('rel') ? s?.data?.rel?.user ?? [] : []).filter(r => !r.out);
const ago = (s, t) => { const n = (s.turn ?? 0) - (t ?? 0); return n <= 0 ? '방금' : `${n}턴 전`; };
// 누구 것을 받을까: 지금 장면에 있는 사람(최대 4) → 없으면 호감 높은 순 3
function targets(s) {
    const ps = people(s); if (!ps.length) return [];
    let inScene = () => false;
    try { inScene = sceneTester(settings(), s); } catch (e) { ssWarn(LOG, 'mind scene', e); }
    const here = ps.filter(r => inScene(r.name)).slice(0, 4);
    return (here.length ? here : [...ps].sort((a, b) => (b.aff + b.trust) - (a.aff + a.trust)).slice(0, 3)).map(r => r.name);
}

// 지금 속마음 받기 (AI 1회) — auto: 탭에 들어와서 저절로 부른 것 (실패해도 조용히 · 그 턴엔 다시 안 부름)
export async function mindFetch(auto = false) {
    const s = app.current?.state, meta = getMeta();
    if (busy || !s || !meta?.base || (settings().mindMode ?? 'off') === 'off') return false;
    const names = targets(s); if (!names.length) return false;
    busy = true; meta.mindTab = s.turn; saveMeta();
    app.rerenderPanels?.(true);
    try {
        const got = await fetchMinds(names, s);
        if (!got.length) { if (!auto) toastr.info('이번엔 받아 온 속마음이 없어요. 한 번 더 눌러 보세요.', TITLE); return false; }
        await addAdjust({ ops: got.map(x => ['mind', `${x.name} | ${x.text}`]), silent: true, label: `💭 속마음: ${got.map(x => x.name).join(' · ')}` });
        return true;
    } catch (e) {
        ssWarn(LOG, 'mind fetch', e);
        if (!auto) toastr.error(`속마음을 받지 못했어요: ${esc(e?.message ?? e)}`, TITLE);
        return false;
    } finally { busy = false; app.rerenderPanels?.(true); }
}
app.mindFetch = mindFetch;

export function mindView(s) {
    const set = settings(), meta = getMeta(), mode = set.mindMode ?? 'off', on = mode !== 'off', freq = MIND_FREQ[set.mindFreq] ? set.mindFreq : 'random', susOn = set.peekCost === true;
    const pct = Number(set.mindPct ?? 35);
    const freqLabel = { always: '항상', random: `랜덤 ${pct}%`, tab: '이 탭에 들어올 때' };
    const bar = `<div class="ss-mindbar ss-mindset"><span><i class="fa-solid fa-comment-dots"></i> 보는 방식</span>
            <div class="ss-seg wrap">${Object.entries(MIND_NAMES).map(([k, v]) => `<button class="${mode === k ? 'on' : ''}" data-act="mindset" data-arg="mode:${k}">${v}</button>`).join('')}</div>
            ${on ? `<span><i class="fa-solid fa-clock"></i> 뜨는 때</span><div class="ss-seg wrap">${Object.keys(MIND_FREQ).map(k => `<button class="${freq === k ? 'on' : ''}" data-act="mindset" data-arg="freq:${k}">${freqLabel[k]}</button>`).join('')}</div>
            <div class="ss-mind-sus"><button class="ss-pill ${susOn ? 'on' : ''}" data-act="mindset" data-arg="sus:toggle" aria-pressed="${susOn}">${susOn ? '<i class="fa-solid fa-check"></i> ' : ''}👁 볼 때마다 눈치가 올라요</button><small>켜면 속마음이 가려진 채로 오고, 눌러서 보면 그 사람의 눈치 +1 · 3부터 의심하기 시작해요</small></div>` : ''}
        </div>`;
    if (!on) return `${bar}${emptyBox('속마음이 꺼져 있어요', 'fa-comment-dots')}<p class="ss-hint">위에서 보는 방식을 고르면 인물들의 속마음이 여기에 떠요. 「항상」 · 「랜덤」은 본편 AI가 답과 함께 적어서 추가 호출이 없고, 「이 탭에 들어올 때」는 들어온 턴에 한 번만 AI 1회로 받아 와요.</p>`;
    const ps = people(s);
    if (!ps.length) return `${bar}${emptyBox(modOn('rel') ? '아직 만난 사람이 없어요' : '관계 칸을 켜면 인물들의 속마음이 떠요', 'fa-user-group')}`;
    // 「이 탭에 들어올 때」: 이번 턴에 아직 안 받았으면 한 번 받는다 (그리는 중에는 부르지 않고 다음 틈에)
    if (freq === 'tab' && !busy && meta && meta.mindTab !== s.turn && !meta.paused) setTimeout(() => { if ((settings().mindFreq ?? '') === 'tab') mindFetch(true); }, 0);
    const how = freq === 'tab' ? '이 탭에 들어오면 그 턴에 한 번 받아 와요 (AI 1회).' : freq === 'always' ? '본편 AI가 매 턴 답과 함께 적어요 (추가 호출 0).' : `본편 AI가 ${pct}%의 턴에 답과 함께 적어요 (추가 호출 0).`;
    const head = `<div class="ss-rombar"><span><i class="fa-solid fa-circle-info"></i> ${how}</span><button class="ss-btn sm" data-act="mindfetch" ${busy ? 'disabled' : ''} title="지금 장면에 있는 사람들의 속마음을 받아 와요 (AI 1회)"><i class="fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}"></i> ${busy ? '받는 중…' : `지금 받기 ${ai1}`}</button></div>`;
    const seen = (r) => Number(meta?.mindSeen?.[r.name] ?? -1);
    const card = (r) => {
        const cov = mindCovered(r, meta), sus = susOn ? susOf(r.name) : 0;
        const log = (r.mindLog ?? []).filter(x => x.turn !== r.mind?.turn && (!susOn || x.turn <= seen(r))).slice(-5).reverse();
        const now = !r.mind?.text ? '<p class="ss-dim">아직 속마음이 없어요.</p>'
            : cov ? `<button class="ss-btn ss-mind-cover" data-act="mindopen" data-arg="${esc(r.name)}"><i class="fa-solid fa-eye-slash"></i> 가려져 있어요 — 눌러서 보기 <small>눈치 +1</small></button>`
                : `<p class="ss-mind big"><i class="fa-solid fa-comment-dots"></i> ${esc(r.mind.text)}</p>`;
        return `<div class="ss-card ss-mindc"><div class="ss-relc-h">${avatar(r.name)}<div class="ss-ct-b"><b>${esc(r.name)}</b><small>${r.mind?.text ? ago(s, r.mind.turn) : '—'}${susOn ? ` · 눈치 ${sus}${sus >= 3 ? ' (의심하는 중)' : ''}` : ''}</small></div>
                ${r.mind?.text && !cov && set.albumOn !== false ? `<button class="ss-ib" data-act="mindstar" data-arg="${esc(r.name)}" title="앨범에 저장"><i class="fa-regular fa-star"></i></button>` : ''}</div>
            ${now}
            ${log.length ? `<details class="ss-more"><summary>지난 속마음 ${log.length}개</summary><ul class="ss-mind-log">${log.map(x => `<li><span>${esc(x.text)}</span><small>${ago(s, x.turn)}</small></li>`).join('')}</ul></details>` : ''}</div>`;
    };
    const order = [...ps].sort((a, b) => (b.mind?.turn ?? -1) - (a.mind?.turn ?? -1));
    return `${bar}${head}<div class="ss-stack">${order.map(card).join('')}</div>`;
}

export const MIND_ACTIONS = {
    ptab: (el, arg) => { el._ss.ui.ptab = arg === 'mind' ? 'mind' : 'sheet'; app.renderPanel(el); },
    mindfetch: async () => { await mindFetch(false); },
    mindopen: async (el, arg, btn, s) => {
        const r = people(s).find(x => x.name === arg), meta = getMeta(true);
        if (!r?.mind?.text) return;
        (meta.mindSeen ??= {})[r.name] = r.mind.turn;
        if (settings().peekCost === true) addSus(r.name, 1); // addSus가 저장까지 한다
        await saveMeta();
        app.refreshNow?.(); app.rerenderPanels?.(true);
    },
    mindstar: async (el, arg, btn, s) => {
        const r = people(s).find(x => x.name === arg); if (!r?.mind?.text) return;
        busyBtn(btn, true, '');
        try { await addAlbum({ kind: 'peek', who: r.name, text: r.mind.text, when: stamp(s), here: s.data.map?.here ?? '' }); btn.innerHTML = '<i class="fa-solid fa-star"></i>'; btn.disabled = true; }
        catch (e) { ssWarn(LOG, 'mind star', e); busyBtn(btn, false); }
    },
};
