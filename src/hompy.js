// 📒 미니홈피 화면 (v2.8): 상태창을 전체화면으로 열면 수첩 모양의 「홈피」로 보여 준다 (설정 hompyFull · 기본 켬)
// 안쪽(오른쪽 쪽)은 평소 상태창 그대로 — 틀만 씌운다: 주소창 · 수첩 표지 · 왼쪽 프로필 쪽 · 링 · 오른쪽 색인 탭
// 계산은 없음(화면만) · 그림은 img/meatcon/ 의 미트볼콘 (폴더 이름을 con으로 하면 윈도우에서 못 만든다 — 예약된 이름)
import { app, esc, short, fmtNum, modOn, relAxes, ctx, TITLE, dateShort, getMeta, saveMeta, ssErr } from './core.js';
import { avatar, askInput } from './kit.js';
import { shrinkImage } from './tiles.js';

export const conUrl = (n) => new URL(`../img/meatcon/${n}.webp`, import.meta.url).href;
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
    return `<figure class="ss-hp-main"><img src="${esc(p.src)}" alt=""><figcaption><button data-hp="cap" title="눌러서 한마디 고치기">${p.cap ? esc(p.cap) : '<i>한마디 적기…</i>'}</button>
        <span><button class="ss-ib" data-hp="photo" title="사진 바꾸기"><i class="fa-solid fa-image"></i></button><button class="ss-ib" data-hp="photodel" title="사진 빼기"><i class="fa-solid fa-trash-can"></i></button></span></figcaption></figure>`;
}
// 사진 단추 (패널마다 걸지 않고 문서에 한 번)
export function initHompy() {
    document.addEventListener('click', async (e) => {
        const b = e.target.closest?.('.ss-hompy [data-hp]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const el = b.closest('.ss-panel'), meta = getMeta(); if (!meta) return;
        const done = () => { saveMeta(); if (el?.isConnected) app.renderPanel?.(el); };
        try {
            if (b.dataset.hp === 'photodel') { delete meta.hpPhoto; return done(); }
            if (b.dataset.hp === 'cap') { const v = await askInput('사진 아래 한마디', '비워 두면 지워져요.', meta.hpPhoto?.cap ?? ''); if (v === null || !meta.hpPhoto) return; meta.hpPhoto.cap = short(v.trim(), 80); return done(); }
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = async () => { try { const f = inp.files?.[0]; if (!f) return; meta.hpPhoto = { src: await shrinkImage(f, 900, 0.82), cap: meta.hpPhoto?.cap ?? '' }; done(); } catch (err) { ssErr(err); toastr.error('사진을 넣지 못했어요. 다른 그림으로 해 보세요.', TITLE); } };
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
    return `<div class="${rootCls} ss-hompy ${enter ? 'ss-hp-enter' : ''}">
        <div class="ss-hp-url" aria-hidden="true"><i></i><i></i><i></i><span>https://meatball.home/<b>${esc(short(c.title || TITLE, 30))}</b></span><em></em></div>
        <div class="ss-hp-book">
            <div class="ss-hp-top"><span class="ss-hp-count">TURN <b>${s.turn ?? 0}</b> <i>|</i> TOTAL <b>${total}</b></span><b class="ss-hp-title">${esc(c.title || TITLE)}</b><span class="ss-hp-star" aria-hidden="true">★</span></div>
            <aside class="ss-hp-left">
                <div class="ss-hp-today"><small>TODAY IS…</small><b>${esc(feel)}</b></div>
                <div class="ss-hp-photo" data-act="help" title="미트볼 도우미"><img src="${conUrl(con)}" alt=""><i class="ss-hp-tape"></i></div>
                <p class="ss-hp-intro">${esc(short(c.summary, 110)) || '아직 소개 글이 없어요.'}</p>
                <div class="ss-hp-links"><button data-act="tab" data-arg="home">▸ HOME</button><button data-act="tab" data-arg="manage">▸ EDIT</button><button data-act="tab" data-arg="record">▸ HISTORY</button></div>
                ${mini.length ? `<dl class="ss-hp-mini">${mini.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
                ${bars.length ? `<div class="ss-hp-bars">${bars.map(b => `<div><span>${esc(b.name)}</span><i><b style="width:${b.max > 0 ? Math.max(0, Math.min(100, (b.cur / b.max) * 100)) : 0}%"></b></i><small>${fmtNum(b.cur)}</small></div>`).join('')}</div>` : ''}
                ${friends.length ? `<div class="ss-hp-friends"><h5>일촌</h5>${friends.map(r => `<button data-act="tab" data-arg="rel" title="관계 탭 열기">${avatar(r.name)}<span><b>${esc(r.name)}</b><small>${r.label ? `${esc(r.label)} · ` : ''}${esc(AX.aff)} ${r.aff}</small></span></button>`).join('')}</div>` : ''}
                <div class="ss-hp-deco" aria-hidden="true"><img src="${conUrl('box')}" alt=""><img src="${conUrl('roll')}" alt=""></div>
            </aside>
            <div class="ss-hp-rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <section class="ss-hp-right">${headHTML}${pauseHTML}${restHTML}${tab === 'home' ? photoHTML(meta) : ''}</section>
            <div class="ss-hp-index">${groupsHTML}</div>
        </div>
    </div>`;
}
