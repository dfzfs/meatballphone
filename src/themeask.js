// 🎨 모양 고르기 창 (한 번만 · 눌렀을 때 불러옴): 상태창을 처음 만들었을 때와, 2.8로 올라온 뒤 처음 켰을 때
//   「예전 그대로 · 깔끔 · 도트 · 폰」 — 고른 대로 전체화면 미니홈피(hompyFull) · 모양(hpSkin) · HUD/보통 상태창도 같은 모양(hpSkinHud)을 맞춘다.
//   화면만 바뀌고 계산 · AI에게 가는 글 · 토큰은 그대로. 「예전 그대로」나 닫기를 고르면 아무것도 안 바뀐다. 다시 고르려면 꾸미기 › 모양
import { app, settings, saveSettings, TITLE, ssNote } from './core.js';
import { choosePopup } from './kit.js';
import { SKINS, applyRetro } from './hompy.js';

const DESC = { clean: '흰 카드 · 옅은 선 — 블로그처럼 단정하게', dot: '도트 글꼴 · 색 띠 창 — 옛 미니홈피 느낌', phone: '파스텔 · 아주 둥근 카드 — 폰 앱처럼' };
const SKIN_DEF = { phone: ['g', 'light'], clean: ['g', 'light'], dot: ['g', 'light'] }; // hompy.js의 것과 같은 값 (모양을 고르면 따라오는 글꼴 · 밝기)
export const themeAsked = () => settings().themeAsked === true;

// → 고른 것('keep' | 'clean' | 'dot' | 'phone') 또는 null(그냥 닫음). why: 'made'(처음 만듦) · 'update'(업데이트 뒤) · 'again'(다시 고르기)
export async function askTheme(why = 'made') {
    const s = settings();
    if (why !== 'again' && themeAsked()) return null;
    s.themeAsked = true; saveSettings(); // 창을 띄운 순간 「물어봤음」으로 — 닫아도 다시 안 뜬다
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-themeask';
    const cur = s.hompyFull === true ? (SKINS[s.hpSkin] ? s.hpSkin : 'clean') : 'keep';
    box.innerHTML = `<h3>🎨 상태창 모양을 골라 볼까요?</h3>
        <p class="ss-hint">${why === 'update' ? '2.8부터 전체화면 상태창을 「미니홈피」 모양으로 볼 수 있어요. ' : ''}화면만 바뀌어요 — 숫자 · 기록 · AI에게 가는 글 · 토큰은 그대로예요. 언제든 <b>꾸미기 › 모양</b>에서 다시 골라요.</p>
        <div class="ss-ta-grid">
            <button type="button" class="ss-ta-card ${cur === 'keep' ? 'on' : ''}" data-choice="keep"><span class="ss-ta-old"><i></i><i></i><i></i></span><b>예전 그대로</b><small>지금 보던 화면을 그대로 써요</small></button>
            ${Object.entries(SKINS).map(([k, n]) => `<button type="button" class="ss-ta-card ${cur === k ? 'on' : ''}" data-choice="${k}"><span class="ss-hp-pv ${k}"><i></i><i></i><i></i></span><b>${n}</b><small>${DESC[k] ?? ''}</small></button>`).join('')}
        </div>
        <label class="ss-tog"><input type="checkbox" class="ss-switch" data-ta-hud ${s.hpSkinHud === true || cur === 'keep' ? 'checked' : ''}><span>HUD · 보통 상태창도 같은 모양으로 (끄면 전체화면만 바뀌어요)</span></label>`;
    let hud = box.querySelector('[data-ta-hud]').checked;
    box.addEventListener('change', (e) => { if (e.target.matches?.('[data-ta-hud]')) hud = e.target.checked; });
    const pick = await choosePopup(box, '나중에 고를게요');
    if (!pick || pick === 'keep') return pick || null;
    if (!SKINS[pick]) return null;
    try {
        Object.assign(s, { hompyFull: true, hpSkin: pick, hpFsPx: 0, hpFontPick: false, hpFont: SKIN_DEF[pick][0], hpDark: SKIN_DEF[pick][1], hpSkinHud: hud });
        saveSettings(); applyRetro(); app.redecorate?.(); app.rerenderPanels?.(true); app.renderHud?.();
        toastr.success(`「${SKINS[pick]}」 모양으로 바꿨어요. 상태창의 전체화면 단추를 누르면 미니홈피가 열려요.`, TITLE, { timeOut: 7000 });
    } catch (e) { ssNote('theme ask', e); }
    return pick;
}
app.askTheme = askTheme;
