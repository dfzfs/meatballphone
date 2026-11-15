// 📒 미니홈피 화면 (v2.8): 상태창을 전체화면으로 열면 수첩 모양의 「홈피」로 보여 준다 (설정 hompyFull · 기본 켬)
// 안쪽(오른쪽 쪽)은 평소 상태창 그대로 — 틀만 씌운다: 주소창 · 수첩 표지 · 왼쪽 프로필 쪽 · 링 · 오른쪽 색인 탭
// 계산은 없음(화면만) · 그림은 img/meatcon/ 의 미트볼콘 (폴더 이름을 con으로 하면 윈도우에서 못 만든다 — 예약된 이름)
import { app, esc, short, fmtNum, modOn, relAxes, ctx, TITLE, dateShort, getMeta, saveMeta, ssErr, settings, saveSettings } from './core.js';
import { avatar, askInput, choosePopup } from './kit.js';
import { shrinkImage } from './tiles.js';

export const conUrl = (n) => new URL(`../img/meatcon/${n}.webp`, import.meta.url).href;
export const CONS = ['hi', 'proud', 'heart', 'pray', 'focus', 'groom', 'blank', 'roll', 'box', 'blanket', 'tongue', 'sulk', 'sad', 'gasp'];
// 프로필 그림: 설정 hpFace — 'auto'(기분 따라 · 기본) · 'con:이름'(기본 이모티콘) · 'my:번호'(내가 올린 그림 · settings().hpFaces · 최대 12장 · 모든 채팅 공통)
function faceSrc(autoCon) {
    const f = String(settings().hpFace ?? 'auto');
    if (f.startsWith('con:') && CONS.includes(f.slice(4))) return conUrl(f.slice(4));
    if (f.startsWith('my:')) { const src = settings().hpFaces?.[Number(f.slice(3))]; if (src) return src; }
    return conUrl(autoCon);
}
async function pickFace(redraw) {
    const set = settings(), cur = String(set.hpFace ?? 'auto'), mine = set.hpFaces ?? [];
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-hp-pick';
    const cell = (v, inner, title = '') => `<button class="ss-hp-face ${cur === v ? 'on' : ''}" data-choice="${v}" title="${esc(title)}">${inner}</button>`;
    box.innerHTML = `<h3>프로필 그림 고르기</h3><p class="ss-hint">「기분 따라」는 지금 상태에 맞춰 알아서 바뀌어요. 내 그림은 12장까지 올릴 수 있고 모든 채팅에서 같이 써요.</p>
        <div class="ss-hp-faces">${cell('auto', '<span>기분<br>따라</span>', '상태에 따라 자동')}${CONS.map(n => cell(`con:${n}`, `<img src="${conUrl(n)}" alt="">`)).join('')}</div>
        <h4>내 그림</h4><div class="ss-hp-faces">${mine.map((src, i) => `<span class="ss-hp-mine">${cell(`my:${i}`, `<img src="${esc(src)}" alt="">`)}<button class="ss-ib" data-choice="del:${i}" title="이 그림 지우기"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}${mine.length < 12 ? cell('upload', '<span><i class="fa-solid fa-plus"></i><br>올리기</span>', '내 그림 올리기') : ''}</div>`;
    const pick = await choosePopup(box, '닫기'); if (!pick) return;
    if (pick.startsWith('del:')) { const i = Number(pick.slice(4)); set.hpFaces = mine.filter((_, k) => k !== i); const c = cur.startsWith('my:') ? Number(cur.slice(3)) : -1; set.hpFace = c === i ? 'auto' : c > i ? `my:${c - 1}` : cur; saveSettings(); redraw(); return pickFace(redraw); }
    if (pick === 'upload') {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; set.hpFaces = [...(set.hpFaces ?? []), await shrinkImage(f, 320, 0.85)].slice(0, 12); set.hpFace = `my:${set.hpFaces.length - 1}`; saveSettings(); redraw(); } catch (err) { ssErr(err); toastr.error('그림을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
        inp.click(); return;
    }
    set.hpFace = pick; saveSettings(); redraw();
}
// 오늘의 기분: 지금 상태로 정한다 (토큰 0)
function mood(s, meta, nNew) {
    if (meta.paused) return ['blanket', '쉬는 중'];
    const bars = s.data.stats?.bars ?? [], hp = bars.find(b => /체력|hp|health|생명/i.test(b.name)) ?? bars[0];
    if (hp && hp.max > 0 && hp.cur / hp.max < 0.3) return ['sad', '기운 없음'];
    if (nNew) return ['gasp', '새 소식!'];
    const top = (s.data.rel?.user ?? []).filter(r => !r.out).sort((a, b) => b.aff - a.aff)[0];
    if (top && top.aff >= 60) return ['heart', '두근두근'];
    if (s.data.wallet && modOn('wallet', meta) && s.data.wallet.cash <= 0) return ['sulk', '빈털터리'];
    if (top && top.aff < 0) return ['tongue', '될 대로 돼라'];
    return ['hi', '좋은 하루'];
}
// 🖼 홈 쪽 아래의 큰 사진 (선택 · 이 채팅에만 · meta.hpPhoto = { src, cap }) — 안 넣으면 얇은 단추 한 줄만
function photoHTML(meta) {
    const p = meta.hpPhoto;
    if (!p?.src) return '<div class="ss-hp-addphoto"><button class="ss-btn sm ghost" data-hp="photo"><i class="fa-solid fa-image"></i> 여기에 큰 사진 넣기</button></div>';
    const top = p.pos !== 'bottom';
    return `<figure class="ss-hp-main ${top ? 'top' : ''}"><img src="${esc(p.src)}" alt=""><figcaption><button data-hp="cap" title="눌러서 한마디 고치기">${p.cap ? esc(p.cap) : '<i>한마디 적기…</i>'}</button>
        <span><button class="ss-ib" data-hp="photopos" title="${top ? '사진을 홈 맨 아래로' : '사진을 홈 맨 위로'}"><i class="fa-solid ${top ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></button><button class="ss-ib" data-hp="photo" title="사진 바꾸기"><i class="fa-solid fa-image"></i></button><button class="ss-ib" data-hp="photodel" title="사진 빼기"><i class="fa-solid fa-trash-can"></i></button></span></figcaption></figure>`;
}
// 📐 한 화면에 다 보이게 (넓은 화면): 홈 쪽은 스크롤 없이 — 사진이 남는 높이를 차지하고, 본문이 넘치면 본문을 줄여(zoom) 맞춘다.
//   왼쪽 프로필 쪽도 넘치면 줄인다. 다른 탭은 내용이 길어서 오른쪽 쪽 안에서 스크롤. 좁은 화면(폰)은 그냥 아래로 스크롤.
const MINZ = 0.45;
function shrinkToFit(box, room, nat) {
    box.style.zoom = '';
    if (room <= 0 || nat() <= room + 1) return true;
    let z = Math.max(MINZ, room / nat());
    for (let k = 0; k < 4; k++) { // 줄이면 폭이 넓어져 줄바꿈이 달라지므로 몇 번 다시 잰다
        box.style.zoom = String(z);
        const h = nat() * z; // zoom을 준 뒤의 scrollHeight는 줄이기 전 단위
        if (Math.abs(h - room) <= 2 || z <= MINZ && h > room) break;
        z = Math.min(1, Math.max(MINZ, z * room / h));
    }
    box.style.zoom = String(z);
    return nat() * z <= room + 2;
}
export function fitHompy(el, tries = 0) {
    const root = el?.querySelector?.('.ss-hompy'); if (!root) return;
    const left = root.querySelector('.ss-hp-left'), lin = root.querySelector('.ss-hp-left-in'), right = root.querySelector('.ss-hp-right'), body = right?.querySelector(':scope > .ss-body');
    if (lin) lin.style.zoom = ''; if (body) body.style.zoom = ''; right?.classList.remove('ss-hp-over');
    if (matchMedia('(max-width: 860px)').matches) return;
    if (!right || right.clientHeight < 60) { if (tries < 8) setTimeout(() => fitHompy(el, tries + 1), 80); return; } // 창이 아직 안 떴음
    const pad = (x) => { const cs = getComputedStyle(x); return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); };
    if (left && lin) shrinkToFit(lin, left.clientHeight - pad(left), () => lin.scrollHeight);
    if (!right.classList.contains('ss-hp-fit') || !body) return;
    const fig = right.querySelector(':scope > .ss-hp-main');
    let used = 0; for (const ch of right.children) { if (ch === body || ch === fig || getComputedStyle(ch).position === 'absolute') continue; const cs = getComputedStyle(ch); used += ch.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); }
    const room = right.clientHeight - pad(right) - used - 16;
    const forBody = fig ? room - Math.max(150, room * 0.52) : room;
    if (!shrinkToFit(body, forBody, () => body.scrollHeight)) right.classList.add('ss-hp-over'); // 그래도 안 들어가면 그때만 스크롤
}
// 사진 단추 (패널마다 걸지 않고 문서에 한 번)
export function initHompy() {
    let rt = null; const refit = () => { clearTimeout(rt); rt = setTimeout(() => document.querySelectorAll('.ss-hompy').forEach(r => fitHompy(r.closest('.ss-panel'))), 120); };
    window.addEventListener('resize', refit);
    document.addEventListener('load', (e) => { if (e.target?.tagName === 'IMG' && e.target.closest?.('.ss-hompy')) refit(); }, true);
    document.addEventListener('click', async (e) => {
        const b = e.target.closest?.('.ss-hompy [data-hp]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const el = b.closest('.ss-panel');
        if (b.dataset.hp === 'close') { el?.closest('dialog')?.querySelector('.popup-button-ok')?.click(); return; }
        if (b.dataset.hp === 'face') { try { await pickFace(() => { if (el?.isConnected) app.renderPanel?.(el); }); } catch (err) { ssErr(err); } return; }
        const meta = getMeta(); if (!meta) return;
        const done = () => { saveMeta(); if (el?.isConnected) app.renderPanel?.(el); };
        try {
            if (b.dataset.hp === 'photodel') { delete meta.hpPhoto; return done(); }
            if (b.dataset.hp === 'photopos') { if (meta.hpPhoto) meta.hpPhoto.pos = meta.hpPhoto.pos === 'bottom' ? 'top' : 'bottom'; return done(); }
            if (b.dataset.hp === 'cap') { const v = await askInput('사진 아래 한마디', '비워 두면 지워져요.', meta.hpPhoto?.cap ?? ''); if (v === null || !meta.hpPhoto) return; meta.hpPhoto.cap = short(v.trim(), 80); return done(); }
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; meta.hpPhoto = { src: await shrinkImage(f, 900, 0.82), cap: meta.hpPhoto?.cap ?? '', pos: meta.hpPhoto?.pos ?? 'top' }; done(); } catch (err) { ssErr(err); toastr.error('사진을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
            inp.click();
        } catch (err) { ssErr(err); }
    }, true);
}
export function hompyHTML({ rootCls, headHTML, pauseHTML, groupsHTML, restHTML, s, meta, nNew, enter, tab }) {
    const c = s.core, d = s.data, [con, feel] = mood(s, meta, nNew);
    const total = (ctx().chat ?? []).filter(m => !m.is_system).length;
    const cal = d.calendar && modOn('calendar', meta) ? d.calendar : null, here = modOn('map', meta) ? d.map?.here : '';
    const w = d.wallet && modOn('wallet', meta) ? d.wallet : null;
    const bars = modOn('stats', meta) ? (d.stats?.bars ?? []).slice(0, 3) : [];
    const rel = d.rel && modOn('rel', meta) ? d.rel : null;
    const friends = rel ? rel.user.filter(r => !r.out).sort((a, b) => b.aff + b.trust - a.aff - a.trust).slice(0, 3) : [];
    const AX = rel ? relAxes(rel) : null;
    const mini = [cal ? ['날짜', `${dateShort(cal)} ${cal.time}`] : null, here ? ['장소', here] : null, w ? ['재산', `${fmtNum(w.cash)} ${w.currency ?? ''}`] : null].filter(Boolean);
    const photo = tab === 'home' ? photoHTML(meta) : '', photoTop = !!photo && !!meta.hpPhoto?.src && meta.hpPhoto.pos !== 'bottom';
    return `<div class="${rootCls} ss-hompy ${enter ? 'ss-hp-enter' : ''}">
        <div class="ss-hp-url"><i></i><i></i><i></i><span>https://meatball.home/<b>${esc(short(c.title || TITLE, 30))}</b></span><button class="ss-hp-x" data-hp="close" aria-hidden="false" title="닫기"><i class="fa-solid fa-xmark"></i></button><em></em></div>
        <div class="ss-hp-book">
            <div class="ss-hp-top"><span class="ss-hp-count">TURN <b>${s.turn ?? 0}</b> <i>|</i> TOTAL <b>${total}</b></span><b class="ss-hp-title">${esc(c.title || TITLE)}</b>${headHTML}</div>
            <aside class="ss-hp-left"><div class="ss-hp-left-in">
                <div class="ss-hp-today"><small>TODAY IS…</small><b>${esc(feel)}</b></div>
                <div class="ss-hp-photo" data-hp="face" role="button" title="눌러서 프로필 그림 바꾸기"><img src="${esc(faceSrc(con))}" alt=""><i class="ss-hp-tape"></i></div>
                <p class="ss-hp-intro">${esc(short(c.summary, 110)) || '아직 소개 글이 없어요.'}</p>
                <div class="ss-hp-links"><button data-act="tab" data-arg="home">▸ HOME</button><button data-act="tab" data-arg="manage">▸ EDIT</button><button data-act="tab" data-arg="record">▸ HISTORY</button></div>
                ${mini.length ? `<dl class="ss-hp-mini">${mini.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
                ${bars.length ? `<div class="ss-hp-bars">${bars.map(b => `<div><span>${esc(b.name)}</span><i><b style="width:${b.max > 0 ? Math.max(0, Math.min(100, (b.cur / b.max) * 100)) : 0}%"></b></i><small>${fmtNum(b.cur)}</small></div>`).join('')}</div>` : ''}
                ${friends.length ? `<div class="ss-hp-friends"><h5>일촌</h5>${friends.map(r => `<button data-act="tab" data-arg="rel" title="관계 탭 열기">${avatar(r.name)}<span><b>${esc(r.name)}</b><small>${r.label ? `${esc(r.label)} · ` : ''}${esc(AX.aff)} ${r.aff}</small></span></button>`).join('')}</div>` : ''}
                <div class="ss-hp-deco" aria-hidden="true"><img src="${conUrl('box')}" alt=""><img src="${conUrl('roll')}" alt=""></div>
            </div></aside>
            <div class="ss-hp-rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <section class="ss-hp-right ${tab === 'home' ? 'ss-hp-fit' : ''}">${pauseHTML}${photoTop ? restHTML.replace('<main class="ss-body"', () => `${photo}<main class="ss-body"`) : restHTML + photo}</section>
            <div class="ss-hp-index">${groupsHTML}</div>
        </div>
    </div>`;
}
