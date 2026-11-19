// ✏️ 홈 편집: 꾹 누르면(0.5초) 편집 모드 · 편집 중엔 위젯 · 앱을 끌어서 순서 바꾸기 · 앱은 아래 독(4개까지)으로도
//   순서는 설정(home.order · home.apps · home.dock)에만 저장 — 채팅 중엔 아무 일도 안 함
import { settings, saveSettings } from '../base/st.js';
import { homeCfg, homeEditing, setHomeEdit } from './home.js';

const HOLD = 500, SLOP = 8;
export function bindHomeEdit(root) {
    let hold = null, drag = null, eat = false;
    const eatNext = () => { eat = true; setTimeout(() => { eat = false; }, 350); }; // 꾹 누름 · 끌기 바로 뒤의 클릭 하나만
    const redraw = () => import('./frame.js').then(m => m.redraw());
    const itemOf = (t) => t.closest?.('.ml-body[data-tab="home"] .ml-wslot, .ml-body[data-tab="home"] .ml-app');
    root.addEventListener('pointerdown', (e) => {
        if (e.button > 0 || e.target.closest('.ml-wx, .ml-bs, input, a')) return;
        const it = itemOf(e.target); if (!it) return;
        if (!homeEditing()) {
            const x0 = e.clientX, y0 = e.clientY;
            hold = { x0, y0, t: setTimeout(() => { hold = null; eatNext(); setHomeEdit(true); navigator.vibrate?.(15); redraw(); }, HOLD) };
            return;
        }
        // 편집 중: 끌기 시작
        e.preventDefault();
        const r = it.getBoundingClientRect();
        drag = { it, kind: it.classList.contains('ml-app') ? 'app' : 'w', dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
        it.setPointerCapture?.(e.pointerId);
    });
    root.addEventListener('pointermove', (e) => {
        if (hold && Math.hypot(e.clientX - hold.x0, e.clientY - hold.y0) > SLOP) { clearTimeout(hold.t); hold = null; }
        if (!drag) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < SLOP) return;
        drag.moved = true; drag.it.classList.add('dragging');
        drag.it.style.transform = `translate(${e.clientX - drag.x0}px, ${e.clientY - drag.y0}px)`;
        drag.it.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        drag.it.style.pointerEvents = '';
        if (!under) return;
        const sel = drag.kind === 'app' ? '.ml-app' : '.ml-wslot', tgt = under.closest(sel);
        const zone = drag.kind === 'app' ? under.closest('.ml-apps, .ml-dock') : null;
        if (tgt && tgt !== drag.it && tgt.parentElement) {
            if (drag.kind === 'app' && tgt.parentElement.classList.contains('ml-dock') && !drag.it.parentElement.classList.contains('ml-dock') && tgt.parentElement.querySelectorAll('.ml-app').length >= 4) return;
            const rr = tgt.getBoundingClientRect(), after = drag.kind === 'app' ? e.clientX > rr.left + rr.width / 2 : e.clientY > rr.top + rr.height / 2;
            const x0 = drag.it.getBoundingClientRect();
            tgt.parentElement.insertBefore(drag.it, after ? tgt.nextSibling : tgt);
            const x1 = drag.it.getBoundingClientRect(); drag.x0 += x1.left - x0.left; drag.y0 += x1.top - x0.top; // 자리를 옮긴 만큼 손가락 기준 맞추기
            drag.it.style.transform = `translate(${e.clientX - drag.x0}px, ${e.clientY - drag.y0}px)`;
        } else if (zone && zone !== drag.it.parentElement && !zone.querySelector('.ml-app')) {
            zone.querySelector('small')?.remove(); zone.appendChild(drag.it);
        } else if (zone?.classList.contains('ml-dock') && zone !== drag.it.parentElement && zone.querySelectorAll('.ml-app').length < 4 && !tgt) {
            zone.appendChild(drag.it);
        }
    });
    const end = () => {
        if (hold) { clearTimeout(hold.t); hold = null; }
        if (!drag) return;
        const { it, moved } = drag; drag = null;
        it.classList.remove('dragging'); it.style.transform = '';
        if (!moved) return;
        eatNext();
        const H = homeCfg(), body = root.querySelector('.ml-body[data-tab="home"]');
        H.order = [...body.querySelectorAll('.ml-wslot')].map(x => x.dataset.w).concat(H.order.filter(id => !body.querySelector(`.ml-wslot[data-w="${id}"]`)));
        H.apps = [...body.querySelectorAll('.ml-apps .ml-app')].map(x => x.dataset.app);
        H.dock = [...body.querySelectorAll('.ml-dock .ml-app')].map(x => x.dataset.app).slice(0, 4);
        settings().home = H; saveSettings(); redraw();
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    // 꾹 누른 뒤 · 끈 뒤의 클릭은 먹는다 (앱이 열리지 않게)
    root.addEventListener('click', (e) => { if (eat) { eat = false; e.stopPropagation(); e.preventDefault(); } }, true);
    root.addEventListener('contextmenu', (e) => { if (itemOf(e.target)) e.preventDefault(); });
}
