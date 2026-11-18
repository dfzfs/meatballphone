// 칸별 화면 · 대시보드 · 관리 (미니 위젯 · 타일 판은 tiles.js)
import {
    app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, MODS, MOD, MOD_IDS, DIFFS, diffOf, esc, short, clamp, norm, findBy,
    fmtNum, clone, splitBar, ssNote, parseNum, dateStr, dayIndex, eventsOn, nextTime, nextTimeWraps, CLOCK_STYLES, timeWords, upcoming, userName, TITLE, VERSION, EMPTY, CONTACT_MODES, stamp, weekday, viewTr, GLOBAL_OFF, tidyHidden,
} from './core.js';
import { tagKeysFor, buildInjection } from './engine.js';
import { autoOf, fillTodo, fillChosen, fillWorld, fillCalls, goMods } from './autostart.js';
import { addAdjust, commit, dueLetters, priceMul, peopleAt, hopsBetween, whereNow, seasonOf, SEASON_NAME, purgeTrash, undoAt, skillRoll, SOCIAL_RE } from './engine.js';
import { trString } from './translate.js';
import { walletView, fxText } from './money.js';
import { fateView } from './fate.js';
import { gauge, sec, emptyBox, chip, avatar, ai1, seg, insertInput, closeIfPopup, askInput, askConfirm, emojiOf } from './kit.js';
import { diceView } from './dice.js';
// 💌 연락 (contact.js) — ⚡ 연락 칸을 켠 채팅에서만 불러온다 (feat.js)
import { questView, newsView, gossipView, boardView } from './feeds.js';
import { snsView, musicView, customView, relView, achView, albumView, recordView, SNS_ACTIONS, MUSIC_ACTIONS, MUSIC_CHANGES, CUSTOM_ACTIONS, REL_ACTIONS, ACH_ACTIONS, ALBUM_ACTIONS } from './extra.js';
import { slotsHTML, cardPack, carryFor } from './safe.js';
import { presetHTML } from './extra.js';
import { detectPlay, instructModule } from './ai.js';
import { PLAY_MODES, normPlay, playOf, REC_MODS, isSimple } from './core.js';
import { mindBar, mindPeek, mindBlock, MIND_ACTIONS } from './mind.js'; // 💭 속마음: 프로필 탭에서 인물마다 프로필 밑에 (v2.9)
import { goodIcon, isMeatShop, shopExtra, walletExtra, lifeBox, needsTabOn, wearTabOn, lifeHidden } from './life_lite.js'; // 🍞 생활 틀의 늘 보이는 부분만 — 무거운 부분(life.js)은 ⚡ 켠 채팅에서만 F.life로 (feat.js)
import { DEVICES as STORY_DEVICES, KEY as STORY_KEY } from './story_meta.js'; // 목록만 (장치 동작 story.js는 ⚡ 켠 사람만)
import { busyBtn, confirmPopup, mascot } from './kit.js';
import { freshDot, usedPrice, placeIcon, miniWidgets, pathTo, tripInfo } from './tiles.js';
// 🏠 건물 층 · 집 안 구조 (iso.js) · 🚇 노선도 (metro.js) — ⚡ 새 지도를 켠 사람만 불러온다 (feat.js) → F.iso · F.metro
import { F, need, loadingHTML } from './feat.js';
export * from './tiles.js'; // 떼어 낸 것 — 다른 파일은 예전처럼 여기서 받아도 된다

const roleName = { user: '유저', main: '주요', npc: 'NPC' };

// ───── 홈(대시보드) ─────
function homeView(s, ui) {
    const c = s.core, d = s.data, meta = getMeta();
    const alerts = [];
    const auto = autoOf(meta); // 🧆 바로 시작으로 만든 틀: 고르고 채우러 가는 길을 맨 위에
    if (auto) alerts.push(`<div class="ss-callout" data-act="gomods"><i class="fa-solid fa-sliders"></i><div><b>지금은 틀만 있어요</b><span>이것저것 눌러 보고, 관리 › 쓸 기능에서 쓸 칸을 고르면 이 이야기에 맞게 채워 드려요 — 여기를 누르면 가요</span></div></div>`);
    const due = dueLetters(s);
    if (due.length) alerts.push(`<div class="ss-callout mail" data-act="tab" data-arg="contact"><i class="fa-solid fa-envelope-open-text"></i><div><b>도착한 편지 ${due.length}통</b><span>${due.map(x => esc(x.who)).join(', ')}</span></div></div>`);
    const un = Object.entries(d.contact?.unread ?? {}).filter(([, n]) => n);
    if (un.length && modOn('contact')) alerts.push(`<div class="ss-callout" data-act="tab" data-arg="contact"><i class="fa-solid fa-comment-dots"></i><div><b>새 연락</b><span>${un.map(([w, n]) => `${esc(w)} ${n}`).join(', ')}</span></div></div>`);
    if (s.pendingRoll && modOn('dice')) alerts.push(`<div class="ss-callout warn" data-act="tab" data-arg="dice"><i class="fa-solid fa-dice-d20"></i><div><b>판정 요청</b><span>${esc(s.pendingRoll.label)}</span></div></div>`);
    if (meta.paused) alerts.push(`<div class="ss-callout pause">${mascot('sleep', 'sm') || '<i class="fa-solid fa-pause"></i>'}<div><b>일시정지 중</b><span>AI에게 상태를 보내지 않아요</span></div><button class="ss-btn sm pri" data-act="pause">재개</button></div>`);
    const order = ['bars', 'date', 'loc', 'cash', 'music', 'fate', 'cond', 'custom', 'quest', 'rel', 'news'];
    if (!settings().helpCardOff && !isSimple(meta)) alerts.push(`<div class="ss-callout help"><i class="fa-solid fa-circle-question"></i><div><b>모르는 건 미트볼 도우미에게</b><span>「토큰 아끼려면?」 「칩이 안 떠요」처럼 물어보면 바로 답해요 · AI 0회</span></div><button class="ss-btn sm" data-act="help">물어보기</button><button class="ss-x" data-act="helpcardoff" title="닫기 (머리의 「도우미」 버튼은 그대로 있어요)">×</button></div>`);
    if (meta.newV5 && !isSimple(meta)) alerts.push(`<div class="ss-callout new"><i class="fa-solid fa-gift"></i><div><b>v2.5 새 기능</b><span>SNS · 추천 음악 · 내 탭이 생겼어요. 관리 → 쓸 기능에서 켤 수 있어요.</span></div><button class="ss-btn sm" data-act="tab" data-arg="manage">켜러 가기</button><button class="ss-x" data-act="newv5off" title="닫기">×</button></div>`);
    return `<div class="ss-home">
        <div class="ss-hero"><div class="ss-hero-t"><small>${esc(c.genre || '세계')}${c.canon ? ` · ${esc(c.canon)}` : ''}</small><b>${esc(c.title || '이름 없는 세계')}</b></div>
            ${c.userRole ? `<p><b>${esc(userName())}</b> — ${esc(c.userRole)}</p>` : ''}
            ${c.summary ? `<details class="ss-more" ${ui.worldOpen ? 'open' : ''}><summary>세계관 요약 <small class="ss-dim">${settings().injWorld ? '· 매 턴 AI에게 보냄' : '· 칸 만들 때만 참고 (매 턴 안 보냄)'}</small></summary><p class="ss-pre">${esc(c.summary)}</p>${c.rules ? `<p class="ss-pre ss-dim">${esc(c.rules)}</p>` : ''}${c.tone ? `<p class="ss-dim">톤: ${esc(c.tone)}</p>` : ''}</details>` : ''}
        </div>
        ${alerts.join('')}
        <div class="ss-home-grid">${miniWidgets(s, order)}</div>
    </div>`;
}

// 🎲 흥정 결과 (오늘 · 이 상점 · 이 물건) — 1 = 흥정 안 함
function haggleMul(s, i, j) { const day = s.data.calendar ? dayIndex(s.data.calendar) : s.turn; return getMeta()?.haggle?.[`${day}|${i}|${j}`] ?? 1; }
// ───── 칸별 화면 ─────
// 🗺 예전 지도 (2.8과 같음): 점과 선 · 구역 고르기 · 확대/축소 — 「새 지도」를 끈 사람이 보는 화면
function mapOld(s, d, ui) {
        const areas = [...new Set(d.places.map(p => p.area).filter(Boolean))];
        const shown = ui.mapArea ? d.places.filter(p => p.area === ui.mapArea) : d.places;
        const pos = layoutPlaces(d.places);
        const sel = findBy(d.places, ui.place ?? d.here);
        const shownSet = new Set(shown.map(p => p.name));
        const edges = []; const seen = new Set();
        for (const p of shown) for (const l of p.links) {
            const q = findBy(d.places, l); if (!q || !shownSet.has(q.name)) continue;
            const key = [p.name, q.name].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
            const a = pos.get(p.name), b = pos.get(q.name);
            edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${p.known && q.known ? '' : 'unk'}"/>`);
        }
        const people = modOn('profile') && s.data.profile;
        const nodes = shown.map(p => {
            const ic = p.known ? placeIcon(p) : '❔';
            const o = pos.get(p.name); const here = norm(p.name) === norm(d.here); const isSel = sel && sel.name === p.name;
            const n = people ? peopleAt(s, p.name).now.length : 0;
            return `<g class="node ${here ? 'here' : ''} ${isSel ? 'sel' : ''} ${p.known ? '' : 'unk'}" data-act="selplace" data-arg="${esc(p.name)}">
                ${here ? `<circle cx="${o.x}" cy="${o.y}" r="4.6" class="ring"/>` : ''}<circle cx="${o.x}" cy="${o.y}" r="${here ? 3.2 : 2.8}" class="dot"/><text class="ico" x="${o.x}" y="${o.y + 1.15}">${esc(ic)}</text>
                <text x="${o.x}" y="${o.y - 4.4}">${esc(p.known ? short(viewTr() ? trString(p.name) : p.name, 8) : '???')}</text>${n ? `<text class="ppl" x="${o.x + 2.6}" y="${o.y + 1.2}">👥${n}</text>` : ''}</g>`;
        }).join('');
        const vb = ui.mapVB ?? fitBox(shown.map(p => pos.get(p.name)));
        let card = '';
        if (sel) {
            const here = norm(sel.name) === norm(d.here);
            const pa = people ? peopleAt(s, sel.name) : { live: [], now: [] };
            const hops = here ? 0 : hopsBetween(d, d.here, sel.name);
            const cal = s.data.calendar && modOn('calendar');
            const cur = s.data.wallet?.currency ?? '';
            card = `<div class="ss-card ss-place"><div class="ss-place-h"><b>${esc(sel.known ? sel.name : '알 수 없는 곳')}</b>${sel.kind ? chip(esc(sel.kind)) : ''}${sel.area ? chip(esc(sel.area)) : ''}${here ? chip('현재 위치', 'hi') : ''}</div>
                <p class="ss-pre ss-dim">${esc(sel.known ? sel.desc : '아직 가 보지 않았다.')}</p>
                ${pa.now.length || pa.live.length ? `<div class="ss-ppl">${pa.now.length ? `<div><small>지금 여기${cal ? ` (${esc(s.data.calendar.time)})` : ''}</small>${pa.now.map(n => `<button class="ss-chip btn" data-act="talk" data-arg="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}${pa.live.length ? `<div><small>사는 사람</small>${pa.live.map(n => chip(esc(n))).join('')}</div>` : ''}</div>` : ''}
                ${sel.links.length ? `<div class="ss-chips">${sel.links.map(l => `<button class="ss-chip btn" data-act="selplace" data-arg="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
                ${!here ? `<p class="ss-hint">${hops}칸 거리${cal && hops ? ` · 시간대 ${hops}개가 흘러요` : ''}${sel.fare ? ` · 요금 ${fmtNum(sel.fare)} ${esc(cur)}` : ''}</p>
                <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="travel" data-arg="${esc(sel.name)}"><i class="fa-solid fa-person-walking"></i> 이동</button><button class="ss-btn sm ghost" data-act="goto" data-arg="${esc(sel.name)}">입력창에 쓰기</button><button class="ss-btn sm ghost" data-act="setloc" data-arg="${esc(sel.name)}">위치만 바꾸기</button></div>` : ''}</div>`;
        }
        return `<div class="ss-hint"><b>${esc(d.name || '지도')}</b> · 지금 <b>${esc(d.here || '-')}</b>${freshDot('map', 'here')}</div>
            ${areas.length ? `<div class="ss-seg wrap ss-areas">${[['', '전체'], ...areas.map(a => [a, a])].map(([v, t]) => `<button class="${(ui.mapArea ?? '') === v ? 'on' : ''}" data-act="maparea" data-arg="${esc(v)}">${esc(t)}</button>`).join('')}</div>` : ''}
            <div class="ss-mapwrap"><svg class="ss-map" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet"><g class="edges">${edges.join('')}</g>${nodes}</svg>
                <div class="ss-mapctl"><button class="ss-ib" data-act="mapzoom" data-arg="in" title="확대">＋</button><button class="ss-ib" data-act="mapzoom" data-arg="out" title="축소">－</button><button class="ss-ib" data-act="mapzoom" data-arg="here" title="현재 위치로"><i class="fa-solid fa-location-crosshairs"></i></button><button class="ss-ib" data-act="mapzoom" data-arg="fit" title="전체 보기"><i class="fa-solid fa-expand"></i></button></div></div>
            <p class="ss-hint">끌어서 옮기고, 두 손가락·휠·버튼으로 확대해요.</p>
            ${card}`;
    }
export const VIEW = {
    home: (s, d, ui) => homeView(s, ui),
    profile: (s, d, ui) => `${mindBar(s, ui)}<div class="ss-hint">프로필 모드: <b>${d.mode === 'detailed' ? '상세' : '최소'}</b> — ${d.mode === 'detailed' ? '이 시트가 AI에게 전달돼요' : '카드·로어북을 쓰고, 새 NPC만 전달돼요'}</div>
        <div class="ss-stack">${d.list.map((p, i) => `<details class="ss-prof" ${ui.open === i || d.list.length === 1 ? 'open' : ''}>
            <summary><button class="ss-ava-btn" data-act="relemoji" data-arg="${esc(p.name)}" title="얼굴 이모지 바꾸기">${avatar(p.name)}</button><div class="ss-ct-b"><b>${freshDot('profile', 'list', p.name)}${esc(p.name)} <span class="ss-role ${p.role}">${roleName[p.role]}</span></b><small>${esc(short(p.summary, 60))}</small>${mindPeek(s, p.name)}</div><i class="fa-solid fa-chevron-down ss-chev"></i></summary>
            <div class="ss-prof-b">${wearTabOn() && (p.role === 'user' || getMeta()?.dolls?.[p.name]) ? `<div class="ss-prof-doll">${(need('life')?.dollFor ?? (() => ''))(s, p.role === 'user' ? '' : p.name, 'big')}</div>` : ''}<p class="ss-pre">${esc(p.summary)}</p>
            ${p.home || p.sched ? `<p class="ss-dim ss-where">${p.home ? `🏠 ${esc(p.home)}` : ''}${p.sched ? ` · 🕐 ${esc(p.sched)}` : ''}${s.data.calendar && whereNow(p, s.data.calendar) ? ` · <b>지금: ${esc(whereNow(p, s.data.calendar))}</b>` : ''}</p>` : ''}
            ${p.fields.length ? `<dl class="ss-dl">${p.fields.map(f => `<dt>${esc(f.k)}</dt><dd class="ss-pre">${esc(f.v)}</dd>`).join('')}</dl>` : ''}
            <div class="ss-row-btns">${modOn('contact') && p.role !== 'user' ? `<button class="ss-btn sm ghost" data-act="talk" data-arg="${esc(p.name)}"><i class="fa-solid fa-envelope"></i> 연락하기</button>` : ''}<button class="ss-btn sm ghost" data-act="dollgo" data-arg="${esc(p.name)}" title="도트 인형 만들기 · 이 인형 얼굴을 ${esc(p.name)}의 공용 프로필로"><i class="fa-solid fa-palette"></i> 꾸미기</button></div>${mindBlock(s, p.name)}</div>
        </details>`).join('') || emptyBox('인물이 없어요', 'fa-id-card')}</div>`,
    stats: (s, d, ui) => `${sec('게이지', `<div class="ss-stack">${d.bars.filter(b => !(F.life?.inNeedPanel ?? (() => false))(b, d)).map(b => `<div class="ss-card ss-gcard">${gauge(b, false, freshDot('stats', 'bars', b.name))}
            <div class="ss-gbtns"><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-10">−10</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-1">−1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+1">+1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+10">+10</button>${b.desc ? `<small class="ss-dim">${esc(b.desc)}</small>` : ''}</div>${(F.life?.needLine ?? (() => ''))(b, d)}</div>`).join('') || (d.bars.length ? '<p class="ss-hint">욕구 게이지는 「욕구」 탭에 있어요.</p>' : emptyBox('게이지가 없어요'))}</div>`)}
        ${sec('능력치', `<div class="ss-attrs">${d.attrs.map(a => `<div class="ss-attr" title="${esc(a.desc)}"><span>${esc(a.name)}${freshDot('stats', 'attrs', a.name)}</span><b>${a.val >= 0 ? '+' : ''}${a.val}</b></div>`).join('') || emptyBox('능력치가 없어요')}</div>`)}
        ${sec('상태 이상 · 버프', `<div class="ss-chips">${d.conds.map(c => `<span class="ss-chip warn" title="${esc(c.desc)}">${freshDot('stats', 'conds', c.name)}${esc(c.name)}<button class="ss-x" data-act="uncond" data-arg="${esc(c.name)}">×</button></span>`).join('') || '<span class="ss-hint">없음</span>'}</div>`)}
        ${needsTabOn() || lifeHidden() ? '' : '<div class="ss-row-btns ss-life-x"><button class="ss-btn sm ghost" data-act="lifetab" data-arg="needs" title="심즈 · 좀보이드처럼 저절로 줄어드는 욕구 게이지 — 다마고치 화면이 있는 탭이 생겨요 (이 채팅만)">🍞 욕구 탭 켜기</button></div>'}`,
    needs: (s, d, ui) => need('life')?.needsTab(s, d, ui) ?? loadingHTML(), // ⚡ 생활 틀은 켠 채팅에서만 불러온다
    wear: (s, d, ui) => need('life')?.wearTab(s, d, ui) ?? loadingHTML(),
    dice: diceView,
    wallet: (s, d, ui) => `${walletView(s, d, ui)}${walletExtra(s)}${wearTabOn() || lifeHidden() ? '' : '<div class="ss-row-btns ss-life-x"><button class="ss-btn sm ghost" data-act="lifetab" data-arg="wear" title="인물마다 도트 인형 · 내 소지품 입히기 (이 채팅만)">🎨 꾸미기 탭 켜기</button></div>'}`,
    fate: fateView,
    shop: (s, d, ui) => {
        const w = s.data.wallet;
        const i0 = clamp(ui.shop ?? 0, 0, Math.max(0, d.shops.length - 1));
        const mul = priceMul(s), pr = (it, j) => Math.round(it.price * mul * (j === undefined ? 1 : haggleMul(s, i0, j)));
        const sh = d.shops[i0];
        return `${d.shops.length > 1 ? seg(d.shops.map((x, i) => [i, esc(x.name)]), i0, 'shoptab', 'class="ss-seg wrap"') : ''}
        ${sh ? `<div class="ss-shop-h ${isMeatShop(sh) ? 'meat' : ''}"><div><b>${esc(sh.name)}</b><small>${esc(sh.desc)}${sh.place ? ` · 📍 ${esc(sh.place)}` : ''}</small></div>${w ? `<span class="ss-chip"><i class="fa-solid fa-coins"></i> ${fmtNum(w.cash)} ${esc(w.currency)}${fxText(w, w.cash) ? ` <small class="ss-dim">${esc(fxText(w, w.cash))}</small>` : ''}</span>` : ''}</div>
        <div class="ss-goods ${isMeatShop(sh) ? 'shelf' : ''}">${sh.items.map((it, j) => `<div class="ss-good ${it.stock === 0 ? 'out' : ''}"><div class="ss-good-b"><b>${goodIcon(it)}${esc(it.name)}</b>${it.kind === 'deco' ? chip('가구') : ''}${it.stock === 0 ? chip('품절', 'neg') : it.stock > 0 ? `<small>재고 ${it.stock}</small>` : ''}<small>${esc(it.desc)}${it.effect ? ` <span class="ss-good-fx">✨ ${esc(it.effect)}</span>` : ''}</small></div>
            <div class="ss-good-a">${(() => { const hm = haggleMul(s, i0, j), p = pr(it, j); return `<b class="ss-price ${mul * hm > 1 ? 'up' : mul * hm < 1 ? 'down' : ''}">${hm !== 1 ? `<s class="ss-dim">${fmtNum(pr(it))}</s> ` : ''}${fmtNum(p)}${fxText(w, p) ? `<small class="ss-fx">${esc(fxText(w, p))}</small>` : ''}</b>${settings().extraJudge !== false && it.stock !== 0 ? `<button class="ss-btn sm ghost" data-act="haggle" data-arg="${i0}|${j}" title="🎲 흥정 — 매력 · 화술 같은 능력치로 d20 (하루에 물건마다 한 번 · AI 0회)" ${hm !== 1 || getMeta()?.haggle?.[`${s.data.calendar ? dayIndex(s.data.calendar) : s.turn}|${i0}|${j}`] ? 'disabled' : ''}>🎲</button>` : ''}<button class="ss-btn sm pri" data-act="buy" data-arg="${i0}|${j}" ${it.stock === 0 || (w && w.cash < p) ? 'disabled' : ''}>구매</button>`; })()}</div></div>`).join('') || emptyBox('상품이 없어요')}</div>` : emptyBox('상점이 없어요. ✨ AI로 수정에서 "○○ 상점 추가"라고 해 보세요.', 'fa-store')}`;
    },
    rel: relView,
    // 🚇 새 지도(노선도 · 건물 안 · 인물 핀 · 꾸미기)는 「새 지도」 스위치를 켰을 때만 (v2.9 · 기본 끔 — 끄면 2.8과 같은 예전 지도)
    map: (s, d, ui) => (settings().mapMetro === true && need('metro') && need('iso') ? VIEW.mapNew(s, d, ui) : mapOld(s, d, ui)), // ⚡ 새 지도 코드를 불러오는 동안엔 예전 지도
    mapNew: (s, d, ui) => {
        const areas = [...new Set(d.places.map(p => p.area).filter(Boolean))];
        // 🚇 노선도 (v2.9): 지도는 이 한 가지 보기 — 장소 = 역 · 길 = 노선. 🎨 꾸미기를 켜면 역 · 길을 눌러 고친다
        const edit = !!ui.mapEdit, edSel = edit ? String(ui.edSel ?? '') : '';
        const sel = findBy(d.places, ui.place ?? d.here);
        const M = mapModel(d, ui, edit ? '' : sel?.name);
        const { shown, pos, pairs, st } = M;
        const people = modOn('profile') && s.data.profile;
        // 📍 인물 핀 (v2.9): 고른 인물이 지금 있는 곳에 이모지로 — 나는 현재 위치 · 다른 사람은 프로필의 사는 곳 · 일과로 (이 채팅만 기억 · AI에게 안 감)
        const pinCfg = getMeta()?.mapPins ?? {};
        const roster = people ? (s.data.profile.list ?? []) : [];
        // 있는 곳: 나 = 현재 위치 + 건물 안(map.spot) · 다른 인물 = 일과의 「학교 > 2층 교실」처럼 「>」 뒤가 건물 안 (없으면 층 모름)
        const pinned = roster.filter(pf => Object.hasOwn(pinCfg, pf.name)).map(pf => {
            const user = pf.role === 'user', [pl, ...rest] = user ? [] : String(whereNow(pf, s.data.calendar) ?? '').split(/\s*[>›]\s*/);
            return { name: pf.name, e: pinEmoji(pinCfg, pf.name), user, at: user ? M.hereName : (findBy(d.places, pl)?.name ?? ''), sub: user ? String(d.spot ?? '') : rest.join(' ').trim() };
        });
        const pinsAt = (p) => pinned.filter(x => x.at && norm(x.at) === norm(p.name));
        const net = F.metro.lineEdges(pairs, pos, st, { edit, sel: edSel.startsWith('e:') ? edSel.slice(2) : '' }); // 길을 노선으로 묶은 것 (색 · 이름표 자리에 씀)
        const lineOut = F.metro.lineNodes(shown, { pos, here: d.here, sel: edit ? (edSel.startsWith('s:') ? findBy(d.places, edSel.slice(2)) : null) : sel, st, net, pins: pinsAt,
            label: (p) => (p.known ? (viewTr() ? trString(p.name) : p.name) : '???'), count: (p) => (people ? peopleAt(s, p.name).now.length : 0),
            ...(edit ? { act: 'mapedsel', arg: (p) => `s:${p.name}` } : {}) });
        const vb = ui.mapVB ?? (shown.length ? (() => { const e = lineOut.ext, w = e[2] - e[0] + 8, h = e[3] - e[1] + 8, side = Math.max(w, h, 40); return [e[0] - 4 - (side - w) / 2, e[1] - 4 - (side - h) / 2, side, side].map(v => Math.round(v * 10) / 10); })() : [-6, -8, 112, 114]);
        const inKind = !edit && ui.inside && sel && norm(ui.inside) === norm(sel.name) ? insideKind(s, sel) : '';
        const inside = !!inKind; // 🔍 건물 안으로 들어가 있는 중
        let card = '';
        if (sel && !edit) {
            const here = norm(sel.name) === norm(d.here);
            const pa = people ? peopleAt(s, sel.name) : { live: [], now: [] };
            const trip = here ? null : tripInfo(s, sel.name), hops = trip?.hops ?? 0;
            const nm = (n) => { const q = findBy(d.places, n); return q && !q.known ? '???' : (viewTr() ? trString(n) : n); };
            const cal = s.data.calendar && modOn('calendar');
            const cur = s.data.wallet?.currency ?? '';
            card = `<div class="ss-card ss-place"><div class="ss-place-h"><b>${esc(sel.known ? sel.name : '알 수 없는 곳')}</b>${sel.kind ? chip(esc(sel.kind)) : ''}${sel.area ? chip(esc(sel.area)) : ''}${here ? chip('현재 위치', 'hi') : ''}</div>
                <p class="ss-pre ss-dim">${esc(sel.known ? sel.desc : '아직 가 보지 않았다.')}</p>
                ${pa.now.length || pa.live.length ? `<div class="ss-ppl">${pa.now.length ? `<div><small>지금 여기${cal ? ` (${esc(s.data.calendar.time)})` : ''}</small>${pa.now.map(n => `<button class="ss-chip btn" data-act="talk" data-arg="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}${pa.live.length ? `<div><small>사는 사람</small>${pa.live.map(n => chip(esc(n))).join('')}</div>` : ''}</div>` : ''}
                ${insideKind(s, sel) && !inside ? `<div class="ss-row-btns"><button class="ss-btn sm" data-act="mapin" data-arg="${esc(sel.name)}"><i class="fa-solid fa-magnifying-glass-plus"></i> 건물 안 보기</button></div>` : ''}
                ${sel.known && isHomePlace(s, sel) ? `<div class="ss-row-btns"><button class="ss-btn sm" data-act="tab" data-arg="base"><i class="fa-solid fa-house-chimney-window"></i> 집 안 보기</button></div>` : ''}
                ${sel.links.length ? `<div class="ss-chips">${sel.links.map(l => `<button class="ss-chip btn" data-act="selplace" data-arg="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
                ${!here ? `<p class="ss-hint">${trip.path ? `${hops}칸 거리` : '길이 이어져 있지 않아요 · 한 칸으로 쳐요'}${cal && trip.arrive ? ` · 도착 <b>${esc(trip.arrive)}</b>` : ''}${sel.fare ? ` · 요금 ${fmtNum(sel.fare)} ${esc(cur)}${trip.poor ? ' <b class="neg">(모자라요)</b>' : ''}` : ''}${trip.path && trip.path.length > 2 ? `<br><i class="fa-solid fa-route"></i> ${trip.path.map(n => esc(short(nm(n), 12))).join(' → ')}` : ''}</p>
                <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="travel" data-arg="${esc(sel.name)}"><i class="fa-solid fa-person-walking"></i> 이동</button><button class="ss-btn sm ghost" data-act="goto" data-arg="${esc(sel.name)}">입력창에 쓰기</button><button class="ss-btn sm ghost" data-act="setloc" data-arg="${esc(sel.name)}">위치만 바꾸기</button></div>` : ''}</div>`;
        }
        const headHTML = `<div class="ss-maphead"><div class="ss-hint"><b>${esc(d.name || '지도')}</b> · 지금 <b>${esc(d.here || '-')}</b>${freshDot('map', 'here')}</div><button class="ss-btn sm ${edit ? 'pri' : ''} ss-mapeditbtn" data-act="mapedit" title="노선 색 · 굵기 · 역 모양 · 자리 · 길 잇기/끊기 · 보일 장소 고르기"><i class="fa-solid fa-palette"></i> ${edit ? '꾸미기 끝' : '꾸미기'}</button></div>${roster.length && !edit ? `<details class="ss-mappins" ${ui.pinOpen ? 'open' : ''}><summary data-act="mappinopen">📍 인물 표시${pinned.length ? ` · <span class="e">${pinned.map(x => esc(x.e)).join(' ')}</span>` : ' <small>— 고른 인물이 지금 있는 곳에 이모지로 떠요</small>'}</summary>
            <div class="ss-pinlist">${roster.map(pf => { const on = Object.hasOwn(pinCfg, pf.name), at = pinned.find(x => x.name === pf.name)?.at; return `<span class="ss-pinchip ${on ? 'on' : ''}"><button class="ss-chip btn ${on ? 'hi' : ''}" data-act="mappin" data-arg="${esc(pf.name)}" aria-pressed="${on}">${esc(pinEmoji(pinCfg, pf.name))} ${esc(pf.name)}${on && !at ? ' <small>위치 모름</small>' : ''}</button>${on ? `<button class="ss-chip btn" data-act="mappinemo" data-arg="${esc(pf.name)}" title="지도에 뜰 이모지 바꾸기"><i class="fa-solid fa-pen"></i></button>` : ''}</span>`; }).join('')}</div>
            <p class="ss-hint">누르면 켜고 꺼요 · ✏️로 지도에 뜰 이모지를 정해요. 나는 현재 위치에, 다른 인물은 프로필의 「사는 곳 · 일과」와 지금 시간에 맞는 곳에 떠요.</p></details>` : ''}`;
        if (inside) {
            const hereIn = norm(sel.name) === norm(d.here);
            // 🏢 정면도 (v2.9): 건물을 앞에서 자른 그림 — 모든 층 · 방이 한 장에 (본거지는 방 · 가구)
            const home = inKind === 'home';
            const fls = home ? F.iso.homeFloors(s.data.home) : F.iso.parseFloors(sel.floors);
            const spot = hereIn && !home ? norm(d.spot ?? '') : '';
            const spotFl = F.iso.spotFloor(fls, spot); // norm은 빈칸을 지우므로 「2층 교실」→「2층교실」 — 이름이 가장 길게 맞는 층 하나만 (「지하」와 「지하 2층」이 같이 있을 때)
            const spotOf = (f, r) => (r.whole ? f.name : `${f.name} ${r.name}`);
            const me = pinned.find(x => x.user)?.e ?? '';
            // 📍 표시해 둔 다른 인물: 그 층 · 방에 이모지로 (방까지 모르면 그 층 첫 칸 · 층도 모르면 위 줄에 「층 모름」)
            const inHere = pinned.filter(x => !x.user && x.at && norm(x.at) === norm(sel.name));
            const placed = new Map();
            for (const x of inHere) {
                const sub = norm(x.sub); if (!sub) continue;
                let f = F.iso.spotFloor(fls, sub), r = null;
                if (f) r = f.rooms.find(rm => norm(spotOf(f, rm)) === sub || sub.endsWith(norm(rm.name))) ?? f.rooms[0] ?? null;
                else for (const f2 of fls) { const r2 = f2.rooms.find(rm => norm(rm.name) === sub || sub.endsWith(norm(rm.name))); if (r2) { f = f2; r = r2; break; } } // 본거지: 「거실」처럼 방 이름만
                if (f) placed.set(x.name, { f, rn: r?.name ?? '' });
            }
            const pinsAt = (f, r) => inHere.filter(x => { const P = placed.get(x.name); return P && P.f === f && (r.whole || !P.rn || P.rn === r.name); });
            const lost = inHere.filter(x => !placed.has(x.name));
            const pic = F.metro.elevSVG(fls, home
                ? { home: true, act: 'selroom', pinsAt, on: (f, r) => !!ui.hroom && norm(ui.hroom) === norm(r.name), arg: (f, r) => r.name }
                : { act: hereIn ? 'spot' : '', me, pinsAt, at: (f) => f === spotFl, on: (f, r) => !!spot && (spot === norm(spotOf(f, r)) || (!f.rooms.length && f === spotFl)), arg: spotOf });
            return `${headHTML}
                <div class="ss-mapwrap inside"><div class="ss-inbar"><button class="ss-btn sm" data-act="mapout"><i class="fa-solid fa-arrow-left"></i> 지도로</button><b>${esc(placeIcon(sel))} ${esc(viewTr() ? trString(sel.name) : sel.name)}${spotFl ? ` · ${esc(d.spot)}` : ''}</b>${hereIn ? chip('현재 위치', 'hi') : ''}${lost.length ? `<span class="ss-inlost" title="일과에 「${esc(sel.name)} > 2층 교실」처럼 「>」 뒤에 건물 안을 적으면 그 층에 떠요">층 모름: ${lost.map(x => `${esc(x.e)} ${esc(x.name)}`).join(' · ')}</span>` : ''}</div><div class="ss-inpic">${pic}</div></div>
                <p class="ss-hint">${home ? '본거지의 방과 가구예요. 방 「고치기」에서 층(숫자)을 적으면 층별로 나뉘어요. 가구 옮기기 · 창고는 「집 안 보기」(본거지 탭)에서 해요.' : `${hereIn ? '방(층)을 누르면 「지금 여기」로 표시하고 AI에게도 알려요. 다시 누르면 지워요.' : '여기로 이동하면 방을 눌러 「지금 여기」를 표시할 수 있어요.'} 방은 장소 「고치기」 › 안쪽 · 층에 「2층: 교실/복도/화장실」처럼 적어요.`}</p>
                ${card}`;
        }
        return `${headHTML}
            ${areas.length ? `<div class="ss-seg wrap ss-areas">${[['', '전체'], ...areas.map(a => [a, a])].map(([v, t]) => `<button class="${(ui.mapArea ?? '') === v ? 'on' : ''}" data-act="maparea" data-arg="${esc(v)}">${esc(t)}</button>`).join('')}</div>` : ''}
            <div class="ss-mapwrap line${edit ? ' edit' : ''}"><svg class="ss-map line${edit ? ' edit' : ''}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet"><g class="edges">${net.svg}</g>${lineOut.svg}</svg>
                <div class="ss-mapctl"><button class="ss-ib" data-act="mapzoom" data-arg="in" title="확대">＋</button><button class="ss-ib" data-act="mapzoom" data-arg="out" title="축소">－</button><button class="ss-ib" data-act="mapzoom" data-arg="here" title="현재 위치로"><i class="fa-solid fa-location-crosshairs"></i></button><button class="ss-ib" data-act="mapzoom" data-arg="fit" title="전체 보기"><i class="fa-solid fa-expand"></i></button></div></div>
            <p class="ss-hint">${edit ? '역이나 길을 눌러 고르고, 역은 끌어서 옮겨요. 빈 곳을 끌면 지도가 움직여요.' : '끌어서 옮기고, 두 손가락·휠·버튼으로 확대해요. 장소 「고치기」에서 안쪽 · 층을 적어 두면, 그 건물을 눌렀을 때 모든 층이 보이는 정면도가 열려요.'}</p>
            ${edit ? mapEditPanel(d, ui, M, net) : card}`;
    },
    calendar: (s, d, ui) => {
        ui.cal ??= { y: d.y, m: d.m };
        const { y, m } = ui.cal;
        const month = d.months[m - 1] ?? d.months[0];
        const w = d.week.length || 7;
        const first = ((dayIndex(d, y, m, 1) % w) + w) % w;
        const cells = [];
        for (let i = 0; i < first; i++) cells.push('<div class="ss-cal-c x"></div>');
        for (let k = 1; k <= month.days; k++) {
            const ev = eventsOn(d, y, m, k);
            const today = y === d.y && m === d.m && k === d.d;
            // v2.7.18: 칸 안엔 점만 (예전엔 제목을 5글자로 잘라 넣어서 글자가 다 잘렸음) — 제목은 아래 「이달 일정」과 날짜를 누르면 전부
            cells.push(`<button class="ss-cal-c ${today ? 'today' : ''} ${ui.day === k ? 'sel' : ''} ${ev.length ? 'ev' : ''}" data-act="calday" data-arg="${k}" title="${esc(ev.map(e => e.title).join(' · '))}"><span>${k}</span>${ev.length ? `<i class="ss-cal-dots">${'<b></b>'.repeat(Math.min(3, ev.length))}</i>` : ''}</button>`);
        }
        const selDay = ui.day ?? null;
        const evs = selDay ? eventsOn(d, y, m, selDay) : [];
        const monthEv = [];
        for (let k = 1; k <= month.days; k++) for (const e of eventsOn(d, y, m, k)) monthEv.push([k, e]);
        const meta = getMeta();
        const lastA = (meta?.adjust ?? []).at(-1);
        const canUndo = !!lastA && Array.isArray(lastA.ops) && lastA.ops.length && lastA.ops.every(([k]) => ['date', 'time', 'weather'].includes(k)) && !lastA.set;
        const wd = weekday(d, d.y, d.m, d.d);
        return `<div class="ss-calx">
            <div class="ss-today2">
                <div class="ss-today2-d"><small>${esc(d.months[d.m - 1]?.name ?? '')}</small><b>${d.d}</b><small>${esc(wd)}</small></div>
                <div class="ss-today2-b"><small>오늘 · ${SEASON_NAME[seasonOf(d)]}${d.era ? ` · ${esc(d.era)}` : ''}</small><b>${esc(dateStr(d))}${freshDot('calendar')}</b>
                    <span class="ss-today2-t"><i class="fa-solid fa-clock"></i> ${esc(d.time)}${d.weather ? ` <i class="fa-solid fa-cloud-sun"></i> ${esc(d.weather)}` : ''} <button class="ss-ib sm" data-act="setweather" title="날씨 바꾸기"><i class="fa-solid fa-pen"></i></button></span></div>
            </div>
            <div class="ss-timebar">
                <button class="ss-btn sm" data-act="timenext" title="${d.clock ? '1시간 뒤로' : '다음 시간대로'}"><i class="fa-solid fa-forward-step"></i> ${esc(nextTime(d, viewTr()))}</button>
                ${d.clock ? '<button class="ss-btn sm" data-act="timeset" title="시각을 직접 적어요 (예: 14:30 · 오후 2시 반)"><i class="fa-solid fa-clock"></i> 시각 맞추기</button>' : ''}
                <button class="ss-btn sm" data-act="dayplus" title="하루 넘기기"><i class="fa-solid fa-sun"></i> +1일</button>
                <button class="ss-btn sm ghost" data-act="timeundo" ${canUndo ? '' : 'disabled'} title="${canUndo ? `방금 넘긴 시간을 되돌려요: ${esc(lastA.label || '')}` : '되돌릴 시간 넘기기가 없어요 (가장 최근 편집이 시간 넘기기일 때만)'}"><i class="fa-solid fa-rotate-left"></i> 되돌리기</button>
            </div>
            <div class="ss-clockrow" title="시간을 어떻게 적을지 — AI도 이 모양으로 적어요 (이 채팅만)"><small>시간 적는 법</small>${seg(CLOCK_STYLES.map(([v, name, ex]) => [v, `${name} <small>${ex}</small>`]), d.clock ?? '', 'clockstyle', 'class="ss-seg wrap"')}</div>
            <div class="ss-cal-head"><button class="ss-ib" data-act="calnav" data-arg="-1" title="이전 달"><i class="fa-solid fa-chevron-left"></i></button><b>${y}년 ${esc(month.name)}</b><button class="ss-ib" data-act="calnav" data-arg="1" title="다음 달"><i class="fa-solid fa-chevron-right"></i></button>${y !== d.y || m !== d.m ? '<button class="ss-btn sm ghost" data-act="calnav" data-arg="0">오늘로</button>' : ''}</div>
            <div class="ss-cal" style="grid-template-columns:repeat(${w},minmax(0,1fr))">${d.week.map(x => `<div class="ss-cal-w">${esc(x)}</div>`).join('')}${cells.join('')}</div>
            ${selDay ? `<div class="ss-card ss-calday"><div class="ss-sec-h"><h4>${esc(dateStr(d, y, m, selDay))}</h4><button class="ss-ib" data-act="calday" data-arg="" title="닫기"><i class="fa-solid fa-xmark"></i></button></div>
                ${evs.map(e => `<div class="ss-ev2"><i class="fa-solid fa-circle"></i><div><b>${esc(e.title)}</b>${e.desc || e.repeat === 'yearly' ? `<small>${esc(e.desc)}${e.repeat === 'yearly' ? `${e.desc ? ' · ' : ''}매년` : ''}</small>` : ''}</div>${e.auto ? '' : `<button class="ss-ib sm" data-act="delevent" data-arg="${esc(`${m}|${selDay}|${e.title}`)}" title="일정 지우기"><i class="fa-solid fa-trash-can"></i></button>`}</div>`).join('') || '<div class="ss-hint">일정 없음</div>'}
                <div class="ss-inline"><input class="ss-in ss-ev-title" placeholder="일정 제목 (예: 레온과 약속)"><label class="ss-tog"><input type="checkbox" class="ss-switch ss-ev-year"><span>매년</span></label><button class="ss-btn" data-act="addevent"><i class="fa-solid fa-plus"></i> 추가</button></div>
                ${!(y === d.y && m === d.m && selDay === d.d) ? `<button class="ss-btn sm ghost" data-act="jumpday"><i class="fa-solid fa-clock-rotate-left"></i> 이 날로 시간 이동</button>` : ''}</div>` : '<p class="ss-hint center">날짜를 누르면 그날 일정을 보고 추가할 수 있어요.</p>'}
            ${sec(`이달 일정 <small>${monthEv.length}</small>`, monthEv.map(([k, e]) => `<button class="ss-ev2 row" data-act="calday" data-arg="${k}"><em>${k}일</em><div><b>${esc(e.title)}</b>${e.desc ? `<small>${esc(e.desc)}</small>` : ''}</div></button>`).join('') || `${emptyBox('이 달엔 일정이 없어요', 'fa-calendar')}${d.events.length ? '' : '<button class="ss-btn sm ghost" data-act="calfill"><i class="fa-solid fa-calendar-plus"></i> 기본 일정 넣기 (매년 · AI 0회)</button>'}`)}
            ${sec('다가오는 일정 <small>30일</small>', upcoming(d).map(([k, e]) => `<div class="ss-ev2"><em class="${k === 0 ? 'now' : ''}">${k === 0 ? '오늘' : `D-${k}`}</em><div><b>${esc(e.title)}</b>${e.desc ? `<small>${esc(e.desc)}</small>` : ''}</div></div>`).join('') || emptyBox('30일 안에 일정이 없어요', 'fa-calendar'))}
        </div>`;
    },
    contact: (s, d, ui) => need('contact')?.contactView(s, d, ui) ?? loadingHTML(),
    sns: snsView,
    music: musicView,
    custom: customView,
    album: albumView,
    record: recordView,
    quest: questView,
    news: newsView,
    gossip: gossipView,
    board: boardView,
    ach: achView,
    memo: (s, d) => {
        const list = [...d.list.filter(m => m.pin), ...d.list.filter(m => !m.pin).reverse()];
        return `<div class="ss-inline top"><textarea class="ss-in ss-memo-in" rows="2" placeholder="메모 쓰기"></textarea><button class="ss-btn pri" data-act="memoadd">추가</button></div>
        <div class="ss-stack">${list.map(m => `<div class="ss-memo ${m.by} ${m.inject ? '' : 'off'}"><div class="ss-pre">${m.pin ? '<i class="fa-solid fa-thumbtack"></i> ' : ''}${esc(m.text)}</div>
            <div class="ss-memo-f"><small>${m.by === 'ai' ? 'AI' : '나'}</small>
            <label class="ss-tog sm"><input type="checkbox" class="ss-switch" data-chg="memotog" data-arg="${esc(m.id)}|inject" ${m.inject ? 'checked' : ''}><span>AI 반영</span></label>
            <button class="ss-ib" data-act="memotog" data-arg="${esc(m.id)}|pin" title="고정"><i class="fa-solid fa-thumbtack"></i></button>
            <button class="ss-ib" data-act="memodel" data-arg="${esc(m.id)}" title="삭제"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('') || emptyBox('메모가 없어요', 'fa-note-sticky')}</div>`;
    },
};
// 본거지 (탭 id 'home'은 대시보드와 겹치지 않게 'base'로 보여 준다)
VIEW.base = (s, d, ui = {}) => `<div class="ss-hero sm"><div class="ss-hero-t"><small>본거지</small><b>${esc(d.name || '본거지')}</b></div>${d.desc ? `<p class="ss-pre ss-dim">${esc(d.desc)}</p>` : ''}</div>
    ${d.rooms.length && settings().mapMetro === true && need('iso') ? `<div class="ss-homewrap">${F.iso.homeSVG(d, ui.hroom)}</div><p class="ss-hint">방을 누르면 아래에서 그 방이 표시돼요. 방 「고치기」에서 층(숫자)을 적으면 층별로 나뉘어요.</p>` : ''}
    <div class="ss-rooms">${d.rooms.map(r => `<div class="ss-room${ui.hroom && norm(ui.hroom) === norm(r.name) ? ' sel' : ''}"><b>${esc(r.name)}</b><small class="ss-pre">${esc(r.desc)}</small>
        <div class="ss-chips">${r.decor.map(x => `<span class="ss-chip">${esc(x)}<button class="ss-x" data-act="unplace" data-arg="${esc(x)}" title="창고로">↓</button></span>`).join('') || '<small class="ss-hint">비어 있음</small>'}</div></div>`).join('') || emptyBox('방·구역이 없어요', 'fa-house')}</div>
    ${sec(`창고 <small>${d.storage.length}</small>`, d.storage.length ? `<div class="ss-stack">${d.storage.map((x, i) => `<div class="ss-item"><div class="ss-item-b"><b>${esc(x)}</b></div><select class="ss-in sm" data-chg="place" data-arg="${i}"><option value="">배치할 곳…</option>${d.rooms.map(r => `<option>${esc(r.name)}</option>`).join('')}</select>
        <div class="ss-item-a">${s.data.wallet && modOn('wallet') ? `<button class="ss-ib" data-act="tobag" data-arg="${esc(x)}" title="소지품으로 옮기기">🎒</button>` : ''}${s.data.wallet && modOn('wallet') ? `<button class="ss-btn sm ghost" data-act="sellused" data-arg="${esc(x)}" title="중고장터에 팔기 (헐값)">♻ 팔기</button>` : ''}<button class="ss-ib" data-act="trashit" data-arg="${esc(x)}" title="쓰레기통에 버리기"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('')}</div>` : emptyBox('상점에서 가구를 사면 여기에 들어와요', 'fa-couch'))}
    ${d.trash?.length ? `<details class="ss-arc"><summary><i class="fa-solid fa-trash-can"></i> 쓰레기통 ${d.trash.length}개</summary><ul>${[...d.trash].reverse().map(t => `<li><b>${esc(t.name)}</b> <small>${esc(t.date)}</small> <button class="ss-btn sm ghost" data-act="restore" data-arg="${esc(t.name)}">되살리기</button> <button class="ss-btn sm ghost danger" data-act="purge" data-arg="${esc(t.name)}" title="완전 삭제 — 되살릴 수 없어요"><i class="fa-solid fa-xmark"></i> 완전 삭제</button></li>`).join('')}</ul><div class="ss-row-btns"><button class="ss-btn sm ghost danger" data-act="purgeall"><i class="fa-solid fa-broom"></i> 쓰레기통 비우기 (완전 삭제)</button></div></details>` : ''}`;

// 🚇 지도 = 노선도 (v2.9): 보일 장소 · 좌표 · 길 목록을 한곳에서 — 화면과 동작(꾸미기 · 이동 모션)이 같은 것을 본다
//   route = 가는 길을 굵게 할 장소 이름 ('' = 강조 없음). 숨긴 장소(meta.mapHide)는 빼되 지금 있는 곳은 늘 보인다
function mapModel(d, ui = {}, route = '') {
    const meta = getMeta(), st = meta?.mapStyle ?? {}, hide = new Set((meta?.mapHide ?? []).map(norm));
    const hereName = findBy(d.places, d.here)?.name ?? d.here ?? '';
    const inArea = ui.mapArea ? d.places.filter(p => p.area === ui.mapArea) : d.places;
    const shown = inArea.filter(p => !hide.has(norm(p.name)) || norm(p.name) === norm(hereName));
    const shownSet = new Set(shown.map(p => p.name));
    const pos = F.metro.linePos(layoutPlaces(d.places), st.pos);
    const path = route && norm(route) !== norm(d.here) ? pathTo(d, route) : null, onRoute = new Set();
    if (path) for (let i = 0; i + 1 < path.length; i++) onRoute.add(edgeKey(path[i], path[i + 1]));
    const pairs = [], seen = new Set();
    for (const p of shown) for (const l of p.links) {
        const q = findBy(d.places, l); if (!q || !shownSet.has(q.name) || q.name === p.name) continue;
        const key = edgeKey(p.name, q.name); if (seen.has(key)) continue; seen.add(key);
        pairs.push({ a: p.name, b: q.name, key, route: onRoute.has(key), unk: !(p.known && q.known) });
    }
    return { st, hide, hereName, shown, pos, pairs };
}
const edgeKey = (a, b) => [a, b].sort().join('|');
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v ?? '');
// 🎨 꾸미기 칸 (지도 아래): 아무것도 안 골랐을 때 = 보일 장소 · 이동 모션 · 처음으로 / 역 = 모양 · 색 · 자리 · 길 잇기 · 숨기기 / 길 = 색 · 굵기 · 꺾는 모양 · 끊기
function mapEditPanel(d, ui, M, net) {
    const sel = String(ui.edSel ?? ''), st = M.st;
    const sws = (prop, cur, list = F.metro.LINE_COLORS) => `<div class="ss-sws">${list.map(c => `<button class="ss-sw sm ${cur === c ? 'on' : ''}" data-act="mapsty" data-arg="${prop}:${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<label class="ss-sw sm ss-sw-any" style="--c:conic-gradient(#e2524a,#e8b93a,#5aa85a,#3aa3a3,#4a8fe2,#9a6ad6,#e26aa8,#e2524a)" title="아무 색이나 고르기"><input type="color" data-mapcolor="${prop}" value="${isHex(cur) ? cur : '#e5484d'}" aria-label="아무 색이나 고르기"></label>${cur ? `<button class="ss-pill" data-act="mapsty" data-arg="${prop}:">기본으로</button>` : ''}</div>`;
    const pills = (prop, map, cur) => `<div class="ss-pills">${Object.entries(map).map(([k, n]) => `<button class="ss-pill ${cur === k ? 'on' : ''}" data-act="mapsty" data-arg="${prop}:${k}">${esc(n)}</button>`).join('')}</div>`;
    if (sel.startsWith('s:')) {
        const p = findBy(d.places, sel.slice(2)); if (p) {
            const ss = st.s?.[p.name] ?? {}, linked = new Set(p.links.map(l => findBy(d.places, l)?.name).filter(Boolean)), moved = !!st.pos?.[p.name];
            return `<div class="ss-card ss-maped"><div class="ss-place-h"><b>${esc(placeIcon(p))} ${esc(p.name)}</b>${chip('역')}<button class="ss-btn sm ghost" data-act="mapedsel" data-arg="">고르기 풀기</button></div>
                <div class="ss-f wide"><span>모양</span>${pills('shape', F.metro.STN_SHAPES, F.metro.STN_SHAPES[ss.shape] ? ss.shape : 'circle')}</div>
                <div class="ss-f wide"><span>색 <small>안 고르면 지나는 노선의 색</small></span>${sws('c', ss.c)}</div>
                <div class="ss-f wide"><span>자리 <small>지도에서 끌어서 옮겨요</small></span><div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="mapposreset" data-arg="${esc(p.name)}" ${moved ? '' : 'disabled'}>자리 처음으로</button></div></div>
                <div class="ss-f wide"><span>길 잇기 · 끊기 <small>누르면 이 역과 이어지거나 끊겨요 — 이동 거리에도 반영돼요</small></span><div class="ss-pills">${d.places.filter(q => q.name !== p.name).map(q => `<button class="ss-pill ${linked.has(q.name) ? 'on' : ''}" data-act="maplink" data-arg="${esc(q.name)}">${linked.has(q.name) ? '<i class="fa-solid fa-link"></i> ' : ''}${esc(q.known ? q.name : '???')}</button>`).join('') || '<span class="ss-hint">다른 장소가 없어요.</span>'}</div></div>
                <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="maphide" data-arg="${esc(p.name)}"><i class="fa-solid fa-eye-slash"></i> 이 장소 지도에서 숨기기</button></div></div>`;
        }
    }
    if (sel.startsWith('e:')) {
        const e = M.pairs.find(x => x.key === sel.slice(2)); if (e) {
            const es = st.e?.[e.key] ?? {}, scope = ui.edScope === 'edge' ? 'edge' : 'line', n = [...net.lineOf.values()].filter(v => v === net.lineOf.get(e.key)).length;
            return `<div class="ss-card ss-maped"><div class="ss-place-h"><b>${esc(e.a)} ↔ ${esc(e.b)}</b>${chip('길')}<button class="ss-btn sm ghost" data-act="mapedsel" data-arg="">고르기 풀기</button></div>
                <div class="ss-f wide"><span>색 · 굵기를 바꿀 범위</span><div class="ss-pills"><button class="ss-pill ${scope === 'line' ? 'on' : ''}" data-act="mapscope" data-arg="line">이 노선 전체 <small>${n}칸</small></button><button class="ss-pill ${scope === 'edge' ? 'on' : ''}" data-act="mapscope" data-arg="edge">이 길만</button></div></div>
                <div class="ss-f wide"><span>색</span>${sws('c', es.c ?? net.colorOf.get(e.key))}</div>
                <div class="ss-f wide"><span>굵기</span>${pills('w', { thin: '가늘게', n: '보통', thick: '굵게' }, F.metro.EDGE_W[es.w] ? es.w : 'n')}</div>
                <div class="ss-f wide"><span>꺾는 모양 <small>이 길만</small></span>${pills('bend', F.metro.BENDS, F.metro.BENDS[es.bend] ? es.bend : 'auto')}</div>
                <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="mapcut" data-arg="${esc(e.key)}"><i class="fa-solid fa-link-slash"></i> 이 길 끊기</button></div></div>`;
        }
    }
    const hidden = d.places.filter(p => M.hide.has(norm(p.name)));
    const styled = Object.keys(st.e ?? {}).length + Object.keys(st.s ?? {}).length + Object.keys(st.pos ?? {}).length;
    return `<div class="ss-card ss-maped"><div class="ss-place-h"><b><i class="fa-solid fa-palette"></i> 지도 꾸미기</b></div>
        <p class="ss-hint">지도에서 <b>역</b>을 누르면 모양 · 색 · 길 잇기, <b>길</b>을 누르면 노선 색 · 굵기 · 꺾는 모양을 고쳐요. 역은 끌어서 옮길 수 있어요. 꾸민 것은 이 채팅의 화면에만 적용되고 AI에게는 안 가요 (길 잇기 · 끊기만 실제 지도에 반영).</p>
        <div class="ss-f wide"><span>보일 장소 <small>${d.places.length - hidden.length}/${d.places.length} · 누르면 숨기거나 다시 보여요 (지금 있는 곳은 늘 보여요)</small></span><div class="ss-pills">${d.places.map(p => `<button class="ss-pill ${M.hide.has(norm(p.name)) ? '' : 'on'}" data-act="maphide" data-arg="${esc(p.name)}">${M.hide.has(norm(p.name)) ? '' : '<i class="fa-solid fa-check"></i> '}${esc(p.known ? p.name : `??? (${p.name})`)}</button>`).join('')}</div></div>
        <div class="ss-f wide"><span>이동 모션 <small>「이동」을 누르면 노선을 따라 움직여요 · 모든 채팅 공통</small></span><div class="ss-pills"><button class="ss-pill ${settings().mapMotion !== false ? 'on' : ''}" data-act="mapmotion" data-arg="on">노선 따라 움직이기</button><button class="ss-pill ${settings().mapMotion === false ? 'on' : ''}" data-act="mapmotion" data-arg="off">바로 이동</button></div></div>
        <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="mapstyreset" ${styled ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> 꾸민 것 전부 처음으로</button></div>
        <p class="ss-hint">이름 · 이모지 · 인물 핀 · 사람 수 같은 표시는 맨 위 「보일 것」에서 켜고 꺼요.</p></div>`;
}
// 🚶 이동 모션: 지금 그려진 노선을 따라 말이 움직인다 (끝나면 풀림) — 길이 안 그려진 칸은 역에서 역으로 곧게
function runTrip(svg, names, emoji) {
    if (!svg || !names || names.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(false);
    const node = (n) => [...svg.querySelectorAll('g.node')].find(g => g.dataset.name === n), at = (n) => { const g = node(n); return g ? { x: Number(g.dataset.x), y: Number(g.dataset.y) } : null; };
    const NS = 'http://www.w3.org/2000/svg', segs = [];
    for (let i = 0; i + 1 < names.length; i++) {
        const a = at(names[i]), b = at(names[i + 1]);
        if (!a || !b) { if (a || b) continue; return Promise.resolve(false); }
        let path = [...svg.querySelectorAll('.edges path.ln[data-k]')].find(p => p.dataset.k === edgeKey(names[i], names[i + 1])), rev = false, tmp = false;
        if (path) { const p0 = path.getPointAtLength(0); rev = Math.hypot(p0.x - a.x, p0.y - a.y) > Math.hypot(p0.x - b.x, p0.y - b.y); }
        else { path = document.createElementNS(NS, 'path'); path.setAttribute('d', `M${a.x} ${a.y}L${b.x} ${b.y}`); tmp = true; }
        segs.push({ path, len: path.getTotalLength() || 0.01, rev, tmp });
    }
    if (!segs.length) return Promise.resolve(false);
    const total = segs.reduce((n, x) => n + x.len, 0), dur = clamp(380 * segs.length + 320, 650, 2800);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'mover');
    g.innerHTML = `<circle r="3.6"/><text y="1.3">${esc(emoji || '🚶')}</text>`;
    svg.appendChild(g);
    return new Promise((res) => {
        const t0 = performance.now();
        const step = (now) => {
            if (!svg.isConnected) return res(false);
            const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
            let left = e * total, sg = segs[segs.length - 1];
            for (const x of segs) { if (left <= x.len) { sg = x; break; } left -= x.len; }
            const pt = sg.path.getPointAtLength(sg.rev ? sg.len - Math.min(left, sg.len) : Math.min(left, sg.len));
            g.setAttribute('transform', `translate(${Math.round(pt.x * 100) / 100} ${Math.round(pt.y * 100) / 100})`);
            if (k < 1) requestAnimationFrame(step); else setTimeout(() => res(true), 120);
        };
        requestAnimationFrame(step);
    });
}
// 고른 역 · 길(ui.edSel)의 꾸밈 값 하나를 바꾼다 (빈 값 = 기본으로) — 길의 색 · 굵기는 범위(ui.edScope)가 「노선 전체」면 그 노선의 모든 길에
async function mapStyleSet(el, s, prop, val) {
    const ui = el._ss.ui, sel = String(ui.edSel ?? ''), meta = getMeta(true); if (!meta || !sel) return;
    const st = (meta.mapStyle ??= {});
    const put = (bag, key) => { const o = (bag[key] ??= {}); if (val) o[prop] = val; else delete o[prop]; if (!Object.keys(o).length) delete bag[key]; };
    if (sel.startsWith('s:')) {
        if (!(prop === 'shape' ? F.metro.STN_SHAPES[val] || !val : prop === 'c' && (isHex(val) || !val))) return;
        put((st.s ??= {}), sel.slice(2));
    } else if (sel.startsWith('e:')) {
        if (!(prop === 'c' ? isHex(val) || !val : prop === 'w' ? F.metro.EDGE_W[val] || !val : prop === 'bend' && (F.metro.BENDS[val] || !val))) return;
        const key = sel.slice(2), M = mapModel(s.data.map, ui), net = F.metro.lineEdges(M.pairs, M.pos, st);
        const keys = prop !== 'bend' && ui.edScope !== 'edge' ? M.pairs.filter(e => net.lineOf.get(e.key) === net.lineOf.get(key)).map(e => e.key) : [key];
        for (const k of keys.length ? keys : [key]) put((st.e ??= {}), k);
    } else return;
    await saveMeta(); app.renderPanel(el);
}
// 두 장소 사이의 길을 잇거나 끊는다 (on을 안 주면 뒤집기) — 실제 지도 자료라 이동 거리 · AI에게 가는 글에도 반영된다
function mapLinkSet(s, a, b, on) {
    const nd = clone(s.data.map), A = findBy(nd.places, a), B = findBy(nd.places, b); if (!A || !B || A === B) return undefined;
    const has = (P, Q) => P.links.some(l => norm(l) === norm(Q.name)), linked = has(A, B) || has(B, A), want = on ?? !linked;
    if (want === linked) return undefined;
    const drop = (P, Q) => { P.links = P.links.filter(l => norm(l) !== norm(Q.name)); };
    if (want) { if (!has(A, B)) A.links.push(B.name); if (!has(B, A)) B.links.push(A.name); } else { drop(A, B); drop(B, A); }
    return commit('map', nd, `🗺 ${A.name} ↔ ${B.name} 길 ${want ? '이음' : '끊음'}`);
}
// 📍 인물 핀에 뜰 이모지: 지도용으로 따로 정한 것 → 얼굴 이모지 → 이름 첫 글자
const pinEmoji = (cfg, name) => cfg?.[name] || emojiOf(name) || String(name).slice(0, 1);
const PIN_EMOJI = ['📍', '⭐', '❤️', '💙', '💚', '💛', '💜', '🖤', '🔥', '❄️', '🌙', '☀️', '🌸', '🍀', '👑', '🗡️', '🛡️', '🎩', '🐱', '🐶', '🦊', '🐰', '🐻', '🐧', '🐺', '🦁', '🐲', '👻', '🤖', '👤', '🚶', '💤'];
// 🔍 지도에서 눌러 「안으로」 들어갈 수 있는 곳인가 (v2.9): 안쪽 · 층을 적어 둔 건물 → 'floors' · 방이 있는 본거지(집) → 'home'
function insideKind(s, p) {
    if (!p?.known) return '';
    if (isHomePlace(s, p)) return 'home';
    return p.floors?.length ? 'floors' : '';
}
// 이 장소가 「내 본거지」인가 — 본거지 이름과 같은 곳 · 그런 곳이 지도에 없으면 「집 · 우리 집 · 자택 · 본거지 · home」처럼 딱 집인 이름만
// (예전엔 이름에 「집」만 들어가도 맞다고 봐서 빵집 · 술집 · 꽃집을 눌러도 내 집 방이 나왔다)
function isHomePlace(s, p) {
    const hm = modOn('home') ? s.data.home : null; if (!hm?.rooms?.length || !p) return false;
    if (hm.name && norm(p.name) === norm(hm.name)) return true;
    if (hm.name && s.data.map?.places?.some(q => norm(q.name) === norm(hm.name))) return false;
    return /^(우리|내|나의)?\s*집$|^(my\s+)?(home|house)$|^자택$|^본거지$/i.test(String(p.name ?? '').trim()) || /^(집|home|자택|본거지)$/i.test(String(p.kind ?? '').trim());
}
// 그 건물로 지도를 당겨 들어간 뒤(0.3초) 안쪽 그림으로 바꾼다 — 보던 지도 범위(mapVB)는 그대로 둬서 돌아오면 그 자리
function zoomInto(el, svg, name) {
    const ui = el._ss.ui, done = () => { ui.inside = name; app.renderPanel(el); };
    const node = [...svg.querySelectorAll('g.node')].find(g => g.dataset.arg === name);
    let bb = null; try { bb = node?.getBBox(); } catch { bb = null; }
    if (!bb || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return done();
    const from = svgBox(svg), side = Math.max(14, bb.width, bb.height) * 1.25, to = [bb.x + bb.width / 2 - side / 2, bb.y + bb.height / 2 - side / 2, side, side];
    const t0 = performance.now(), dur = 320;
    const step = (now) => {
        if (!svg.isConnected) return done();
        const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
        svg.setAttribute('viewBox', from.map((v, i) => Math.round((v + (to[i] - v) * e) * 100) / 100).join(' '));
        if (k < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
}
export function layoutPlaces(places) {
    const pos = new Map();
    const n = places.length;
    const free = (x, y) => [...pos.values()].every(q => Math.hypot(q.x - x, q.y - y) > 9);
    for (const p of places) if (Number.isFinite(p.x) && Number.isFinite(p.y)) pos.set(p.name, { x: p.x, y: p.y });
    places.forEach((p, i) => {
        if (pos.has(p.name)) return;
        const anchor = p.links.map(l => findBy(places, l)).find(q => q && pos.has(q.name)) ?? places.find(q => q.links.some(l => norm(l) === norm(p.name)) && pos.has(q.name));
        if (anchor) {
            const a0 = pos.get(anchor.name);
            for (let k = 0; k < 16; k++) {
                const ang = (k * 2.4) + i, r = 14 + (k >> 2) * 5;
                const x = clamp(a0.x + Math.cos(ang) * r, 2, 98), y = clamp(a0.y + Math.sin(ang) * r, 4, 98);
                if (free(x, y) || k === 15) { pos.set(p.name, { x, y }); return; }
            }
        }
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        pos.set(p.name, { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 });
    });
    return pos;
}
app.sellPrice = (s, name) => sellPrice(s, name);
// 지도 화면 범위 (viewBox): 보이는 장소들을 감싸는 상자
function fitBox(pts) {
    const P = pts.filter(Boolean);
    if (!P.length) return [-6, -8, 112, 114];
    const xs = P.map(p => p.x), ys = P.map(p => p.y);
    const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10, y0 = Math.min(...ys) - 12, y1 = Math.max(...ys) + 10;
    const w = Math.max(40, x1 - x0), h = Math.max(40, y1 - y0), side = Math.max(w, h);
    return [x0 - (side - w) / 2, y0 - (side - h) / 2, side, side].map(v => Math.round(v * 10) / 10);
}
function zoomBox(vb, f, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) {
    const w = clamp(vb[2] * f, 12, 240), h = clamp(vb[3] * f, 12, 240);
    return [cx - (cx - vb[0]) * (w / vb[2]), cy - (cy - vb[1]) * (h / vb[3]), w, h].map(v => Math.round(v * 10) / 10);
}
const svgBox = (svg) => svg.getAttribute('viewBox').split(/\s+/).map(Number);
const keepBox = (svg, vb) => { svg.setAttribute('viewBox', vb.join(' ')); const el = svg.closest('.ss-panel'); if (el?._ss) el._ss.ui.mapVB = vb; };
// 끌기 · 두 손가락 확대 · 휠: 다시 그리지 않고 viewBox만 바꾼다
let drag = null;
const R10 = (v) => Math.round(v * 10) / 10;
const pinchInfo = (d) => { const [a, b] = [...d.pts.values()]; return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
document.addEventListener('pointerdown', (e) => {
    const svg = e.target.closest?.('svg.ss-map'); if (!svg) return;
    if (drag && drag.svg !== svg) drag = null;
    // 🎨 꾸미기 중: 역을 잡으면 지도 대신 그 역이 움직인다
    const stn = !drag && svg.classList.contains('edit') ? e.target.closest?.('g.node') : null;
    if (stn) { drag = { svg, stn, id: e.pointerId, pts: new Map(), moved: false, sx: e.clientX, sy: e.clientY, x0: Number(stn.dataset.x), y0: Number(stn.dataset.y), dx: 0, dy: 0 }; return; }
    if (drag?.stn) return;
    drag ??= { svg, pts: new Map(), moved: false };
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // 손가락 수가 바뀔 때마다 기준을 새로 잡는다
    drag.vb = svgBox(svg); drag.start = new Map([...drag.pts].map(([k, v]) => [k, { ...v }]));
    if (drag.pts.size === 2) drag.pinch = pinchInfo(drag);
});
document.addEventListener('pointermove', (e) => {
    if (drag?.stn) {
        if (e.pointerId !== drag.id) return;
        const r = drag.svg.getBoundingClientRect(), vb = svgBox(drag.svg); if (!r.width || !r.height) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
        const k = Math.max(vb[2] / r.width, vb[3] / r.height); // 화면 1px = 지도 k칸 (가로세로 비율이 달라도 맞게)
        drag.moved = true; drag.dx = (e.clientX - drag.sx) * k; drag.dy = (e.clientY - drag.sy) * k;
        drag.stn.setAttribute('transform', `translate(${R10(drag.dx)} ${R10(drag.dy)})`); drag.stn.classList.add('drag');
        return;
    }
    if (!drag || !drag.pts.has(e.pointerId)) return;
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = drag.svg.getBoundingClientRect(); if (!r.width || !r.height) return;
    const vb = drag.vb;
    if (drag.pts.size >= 2 && drag.pinch) {
        const now = pinchInfo(drag), f = drag.pinch.dist / now.dist;
        const cx = vb[0] + ((drag.pinch.cx - r.left) / r.width) * vb[2], cy = vb[1] + ((drag.pinch.cy - r.top) / r.height) * vb[3];
        const z = zoomBox(vb, f, cx, cy);
        const dx = (now.cx - drag.pinch.cx) * (z[2] / r.width), dy = (now.cy - drag.pinch.cy) * (z[3] / r.height);
        drag.moved = true;
        keepBox(drag.svg, [z[0] - dx, z[1] - dy, z[2], z[3]].map(R10));
        return;
    }
    const st = drag.start.get(e.pointerId); if (!st) return;
    if (!drag.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 4) return;
    drag.moved = true;
    const dx = (e.clientX - st.x) * (vb[2] / r.width), dy = (e.clientY - st.y) * (vb[3] / r.height);
    keepBox(drag.svg, [vb[0] - dx, vb[1] - dy, vb[2], vb[3]].map(R10));
});
const endPtr = (e) => {
    if (!drag) return;
    if (drag.stn) {
        if (e.pointerId !== drag.id) return;
        const { svg, stn, moved, x0, y0, dx, dy } = drag; drag = null;
        if (!moved) return;
        svg._dragged = true; setTimeout(() => { svg._dragged = false; }, 50);
        const el = svg.closest('.ss-panel'), meta = getMeta(true), name = stn.dataset.name;
        if (e.type === 'pointercancel' || !el?._ss || !meta || !name) { stn.removeAttribute('transform'); return; }
        const snap = (v) => Math.round(v / F.metro.HALF) * F.metro.HALF; // 반 칸 격자에 맞춘다 (길이 가로 · 세로 · 45°로 떨어지게)
        ((meta.mapStyle ??= {}).pos ??= {})[name] = { x: snap(x0 + dx), y: snap(y0 + dy) };
        el._ss.ui.edSel = `s:${name}`;
        saveMeta(); app.renderPanel(el);
        return;
    }
    drag.pts.delete(e.pointerId);
    if (drag.pts.size) { drag.vb = svgBox(drag.svg); drag.start = new Map([...drag.pts].map(([k, v]) => [k, { ...v }])); drag.pinch = null; return; }
    if (drag.moved) { const svg = drag.svg; svg._dragged = true; setTimeout(() => { svg._dragged = false; }, 50); }
    drag = null;
};
document.addEventListener('pointerup', endPtr);
document.addEventListener('pointercancel', endPtr);
document.addEventListener('click', (e) => { const svg = e.target.closest?.('svg.ss-map'); if (svg?._dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
// 🎨 꾸미기의 「아무 색이나」: 진짜 색 입력칸을 눌러야 폰에서도 창이 뜬다 → 값이 바뀌면 여기서 받는다
document.addEventListener('change', (e) => { const t = e.target; if (!t?.dataset?.mapcolor) return; const el = t.closest('.ss-panel'); if (el?._ss && app.current?.state) mapStyleSet(el, app.current.state, t.dataset.mapcolor, String(t.value).toLowerCase()).catch(err => ssNote('지도 색', err)); }, true);
// 휠 확대: 문서 전체에 막는(passive:false) 휠 리스너를 걸면 브라우저가 채팅 스크롤마다 JS를 기다려 스크롤이 버벅인다 (v2.7.7)
// → 지도 위에 마우스가 처음 올라올 때 그 지도에만 건다
document.addEventListener('pointerover', (e) => {
    const svg = e.target.closest?.('svg.ss-map'); if (!svg || svg._ssWheel) return;
    svg._ssWheel = true;
    svg.addEventListener('wheel', mapWheel, { passive: false });
}, { passive: true });
function mapWheel(e) {
    const svg = e.currentTarget;
    e.preventDefault();
    const r = svg.getBoundingClientRect(), vb = svgBox(svg);
    const cx = vb[0] + ((e.clientX - r.left) / r.width) * vb[2], cy = vb[1] + ((e.clientY - r.top) / r.height) * vb[3];
    keepBox(svg, zoomBox(vb, e.deltaY > 0 ? 1.2 : 1 / 1.2, cx, cy));
}

export function sellPrice(s, name) {
    if (!modOn('shop') || !s.data.shop) return 0;
    for (const sh of s.data.shop.shops) { const it = findBy(sh.items, name); if (it && norm(it.name) === norm(name)) return Math.floor(it.price / 2); }
    return 0;
}

// ───── 관리 ─────
// 🏪 상점 탭 아래에 「미트볼 상점 넣기」 (v2.9)
{ const shopView = VIEW.shop; VIEW.shop = (s, d, ui) => `${shopView(s, d, ui)}${shopExtra(s)}`; }
export const GROUPS = [
    { id: 'home', name: '홈', icon: 'fa-house', tabs: ['home', 'music', 'album', 'record'] },
    { id: 'me', name: '나', icon: 'fa-user', tabs: ['profile', 'needs', 'wear', 'stats', 'dice', 'wallet', 'fate', 'ach', 'memo', 'custom'] },
    { id: 'world', name: '세계', icon: 'fa-earth-asia', tabs: ['map', 'calendar', 'shop', 'base'] },
    { id: 'people', name: '사람', icon: 'fa-user-group', tabs: ['rel', 'contact', 'guest'] }, // guest = 📝 방명록 (파도타기 + 방명록을 켰을 때만 보임 · minihome_ui.js)
    { id: 'feed', name: '소식', icon: 'fa-bullhorn', tabs: ['quest', 'news', 'gossip', 'board', 'sns'] },
    { id: 'manage', name: '관리', icon: 'fa-sliders', tabs: ['manage'] },
    { id: 'extra', name: '부가 기능', icon: 'fa-puzzle-piece', tabs: ['extra'] }, // 🧩 관리 옆의 묶음 — 켠 부가 기능의 화면 (칸이 아니라 쓸 기능 목록에는 안 나온다)
];
// 칸(데이터)이 아닌 탭 — 늘 켜져 있고 편집 도구가 없다
export const PSEUDO = new Set(['home', 'manage', 'album', 'record', 'guide', 'extra', 'guest', 'needs', 'wear']); // needs · wear = 🍞 욕구 · 👕 옷차림 (v2.9 · 이 채팅에서 켠 것만 — life.js)
const PSEUDO_INFO = { home: { name: '홈', icon: 'fa-house' }, manage: { name: '관리', icon: 'fa-sliders' }, album: { name: '추억 앨범', icon: 'fa-star' }, record: { name: '플레이 기록', icon: 'fa-chart-simple' }, guide: { name: '공략', icon: 'fa-key' }, extra: { name: '부가 기능', icon: 'fa-puzzle-piece' }, guest: { name: '방명록', icon: 'fa-pen-to-square' }, needs: { name: '욕구', icon: 'fa-bowl-food' }, wear: { name: '꾸미기', icon: 'fa-palette' } };
export const TAB_MOD = (tab) => (tab === 'base' ? 'home' : tab === 'home' ? 'core' : tab);
export const TAB_INFO = (tab) => (PSEUDO_INFO[tab] ?? (tab === 'base' ? MOD.home : MOD[tab]) ?? { name: tab, icon: 'fa-circle' });

// 🗂 관리 탭 안의 탭: 맨 위 줄에서 고른 것 하나만 보인다 (고른 탭은 설정 mgTab에 기억). 다른 탭의 단추도 숨기기만 해서 그대로 있다
const MG_TABS = [['play', 'fa-gamepad', '플레이'], ['mods', 'fa-puzzle-piece', '쓸 기능'], ['save', 'fa-floppy-disk', '저장'], ['tools', 'fa-sliders', '도구'], ['all', 'fa-gear', '전체 설정'], ['fix', 'fa-stethoscope', '문제 해결'], ['danger', 'fa-triangle-exclamation', '초기화']];
const mgCur = () => { const v = settings().mgTab; return MG_TABS.some(t => t[0] === v) ? v : 'play'; };
const mgStrip = () => { const cur = mgCur(); return `<div class="ss-seg wrap ss-mg-tabs" role="tablist">${MG_TABS.map(([id, icon, name]) => `<button class="${cur === id ? 'on' : ''}" data-act="mgtab" data-arg="${id}" role="tab" aria-selected="${cur === id}"><i class="fa-solid ${icon}"></i> ${name}</button>`).join('')}</div>`; };
const mg = (id, icon, name, sum, inner, cls = '') => `<section class="ss-sec ss-mg ${cls}" data-mg="${id}"${mgCur() === id ? '' : ' hidden'}>${inner}</section>`;
// 접는 머리줄 (실험실 탭 · 「쓸 기능」의 묶음): 처음엔 전부 접혀 있고, 편 것은 설정 mgOpen에 기억
const MG_DEF = {};
const mgIsOpen = (id) => (settings().mgOpen ?? MG_DEF)[id] === true;
const fold = (id, icon, name, sum, inner) => { const o = mgIsOpen(id); return `<section class="ss-sec ss-fold ${o ? 'open' : ''}" data-fold="${id}"><button type="button" class="ss-mg-h" data-act="mgfold" data-arg="${id}" aria-expanded="${o}">${icon ? `<i class="fa-solid ${icon}"></i>` : ''}<b>${name}</b><small>${sum}</small><i class="fa-solid fa-chevron-down ss-mg-chev"></i></button><div class="ss-mg-b"${o ? '' : ' hidden'}>${inner}</div></section>`; };
// 「쓸 기능」 머리줄의 한 번에 고르기 — 처음 만들 때(만들기 창)와 같은 세 단추. 끈 칸의 내용은 지워지지 않는다
const FLAGSET_BTNS = '<button class="ss-btn sm ghost" data-act="flagset" data-arg="rec" title="처음 값으로 — 공략만 켜요">처음 값</button><button class="ss-btn sm ghost" data-act="flagset" data-arg="all" title="선택 기능을 전부 켜요 — 켠 만큼 토큰을 써요">전부</button><button class="ss-btn sm ghost" data-act="flagset" data-arg="none">전부 끄기</button>';
const s0Empty = (id) => { try { return !app.current?.state?.data?.[id]; } catch { return false; } };
let clearedAdj = null; // 방금 「싹 지운」 편집 기록 (이 채팅 · 새로 고침 전까지만 되살릴 수 있다)
const chatKey = () => { try { const c = ctx(); return `${c.groupId ?? ''}|${c.getCurrentChatId?.() ?? ''}`; } catch { return ''; } };
// 🧩 선택 기능 스위치 (관리 탭 › 설정 · 도구): 확장 설정의 같은 체크 칸과 한 값을 쓴다 (모든 채팅 공통)
//   [설정 키, 아이콘(fa- 또는 그림 글자), 이름, 설명, 기본이 켬인가]
export const ADDON_FLAGS = [
    ['guideOn', 'fa-key', '공략', '인물이 일러 주는 조언 · 비밀 게이지 · 눈치 지수 (부가 기능 탭에 묶음이 생겨요) · 누를 때만 AI 1회', true],
    ['groupChat', 'fa-users', '단체방', '연락에 인물 여럿이 있는 방 · 말을 걸 때 AI 1회'],
    ['relRace', 'fa-crown', '루트 비교', '관계 탭 맨 위에 인물별 진행도를 나란히 · 토큰 0'],
    ['pairAff', 'fa-heart-circle-plus', '인물끼리 호감', '인물 둘 사이도 수치로 쌓여요 · 매 턴 한 줄'],
    ['hpWave', 'fa-water', '파도타기 · 일촌평', '전체화면 미니홈피의 일촌 창에서 이름을 누르면 그 사람의 홈피가 열려요 · 이름 밑에 일촌평 · 토큰 0'],
    ['guestbook', 'fa-pen-to-square', '방명록 · 일촌평 받기', '파도타기 화면에서 인물이 한 줄씩 남겨요 · 「받기」를 누를 때 AI 1회'],
    ['guestbookAuto', 'fa-clock', '방명록 자동', '이야기 속 하루가 지날 때 한 줄 (방명록을 켰을 때 · 하루 1회 · AI 1회)'],
    ['socialAff', 'fa-heart-pulse', '연락 · 방명록에서 호감 반영', '연락 답장 · 방명록 답글에 따라 호감 −2~+2, 방명록을 남기면 우정 +1 · 그 말풍선/글을 지우면 되돌아가요 · 답장마다 토큰 한 줄'],
    ['ambientOn', 'fa-cloud-sun-rain', '날씨 · 시간대 효과', '비 · 눈 · 밤을 AI에게 한 줄 알려요 · 궂은 날엔 흥정 난이도 −2 · 매 턴 0~1줄'],
    ['ambientShop', 'fa-store-slash', '밤에는 가게 닫기', '날씨 · 시간대 효과를 켰을 때만 · 토큰 0'],
    ['giftTaste', 'fa-gift', '취향에 맞는 선물', '좋아하는 것이면 호감 2배 · 싫어하는 것이면 −1 · 토큰 0'],
    ['promiseClock', 'fa-hourglass-half', '약속 기한', '약속 장부의 기한이 지나면 자동으로 어김 · 토큰 0~1줄'],
    ['gearOn', 'fa-shirt', '옷차림 · 장비', '소지품을 칸마다 입거나 들어요 (재산 탭 아래) · 효과의 「힘 +2」는 판정에, 「체온 -30%」는 욕구에 · AI에게 「지금 입은 것」 한 줄'],
    ['mergeContact', 'fa-link', '합칠 때 연락도 옮기기', '인물을 합칠 때 연락 대화도 옮길지 물어봐요 · 토큰 0'],
    ['trendMore', 'fa-chart-line', '그래프에 수치 더하기', '변화 그래프에 게이지 · 내 탭 숫자 그래프 · 토큰 0'],
    // 🔮 점집 (v2.9 · 운명 칸 밑): 점쟁이마다 따로 — 하나라도 켜면 운명 탭 맨 아래에 점집이 생겨요
    ['fortuneTarot', '🃏', '점집: 타로', '타로 언니 세라 · 78장에서 직접 골라 뒤집기 · 점 한 번에 AI 1회 · 복채'],
    ['fortuneOrb', '🔮', '점집: 수정구슬', '마담 엘레오노라 · 구슬에 비친 장면 · 점 한 번에 AI 1회 · 복채'],
    ['fortuneShaman', '🪭', '점집: 무당 · 굿', '박보살 할매 · 사주 · 신점 · 오방기, 굿으로 저주 풀기 · 소원 · 넋 달래기 · 한 번에 AI 1회 · 복채'],
    // 🚇 새 지도 (v2.9 · 지도 칸 밑): 끄면 2.8과 같은 예전 지도
    ['mapMetro', 'fa-train-subway', '새 지도', '노선도 지도 · 이동 모션 · 인물 이모지 핀 · 건물 정면도/층별 평면도 · 본거지 집 안 그림 · 지도 꾸미기 — 화면만 · 토큰 0'],
];
// 🧭 이야기 장치 14개도 같은 모양으로 (story.js의 목록 그대로)
export const STORY_FLAGS = STORY_DEVICES.map(d => [STORY_KEY[d.id], d.icon, d.name, `${d.desc} · ${d.cost}`]);
const FLAG_KEYS = new Set([...ADDON_FLAGS, ...STORY_FLAGS].map(x => x[0]));
const FLAG_BY = Object.fromEntries([...ADDON_FLAGS, ...STORY_FLAGS].map(f => [f[0], f]));
// 부가 기능 스위치를 한 번에 (확장 설정 창의 같은 체크 칸도 맞춘다): 'all' 전부 켬 · 'none' 전부 끔 · 'rec' 처음 값
// 👕 옷차림 · 장비를 켜고 끄면 입은 옷의 욕구 보정도 맞춘다 (생활 탭의 켜기 · 끄기 단추와 같게 — life.js gearon/gearoff)
async function gearSync() { try { await app.loadAddons?.(true); await (await import('./addons.js')).syncNeedMods(); } catch { /* 장비 자료가 없으면 할 일 없음 */ } }
function setFlags(how) { const st = settings(), gear0 = st.gearOn === true; for (const k of FLAG_KEYS) { const v = how === 'all' ? true : how === 'rec' ? !!FLAG_BY[k][4] : false; st[k] = v; const box = document.querySelector(`#ss-settings input[data-s="${k}"]`); if (box) box.checked = v; } saveSettings(); if (gear0 !== (st.gearOn === true)) gearSync(); try { app.storyChanged?.(); } catch { /* 화면 표시일 뿐 */ } }
export const flagOn = (st, [k, , , , defOn]) => (defOn ? st[k] !== false : st[k] === true);
const flagList = (st, list) => `<div class="ss-mods">${list.filter(f => !tidyHidden('flags', f[0])).map(f => { const [k, icon, name, desc] = f, o = flagOn(st, f); return `<label class="ss-mod ${o ? 'on' : ''}"><input type="checkbox" class="ss-switch" data-chg="setflag" data-arg="${k}" ${o ? 'checked' : ''}>${icon.startsWith('fa-') ? `<i class="fa-solid ${icon}"></i>` : `<i class="ss-emo">${icon}</i>`}<span><b>${esc(name)}</b><small>${esc(desc)}</small></span></label>`; }).join('')}</div>`;
// 🧩 부가 기능 탭 (관리 옆): 켠 선택 기능의 「화면」만 묶음별로 모은다 — 켜고 끄기는 관리 › 쓸 기능 › 부가 기능. 묶음은 전부 접힌 채로 시작
export function extraHTML(s, ui = {}, part = {}) {
    const st = settings(), wave = st.hpWave === true;
    const groups = [
        ['guide', 'fa-key', '공략', '인물이 일러 주는 조언 · 비밀 · 눈치', part.guide],
        ['people', 'fa-user-group', '사람 · 관계', '엿보기 · 흉터 · 기억 왜곡 · 손댄 흔적 · 취향 도감', part.rel],
        ['social', 'fa-comments', '연락 · 미니홈피', '채팅 간 우편 · 방명록', `${part.contact ?? ''}${wave ? `<div class="ss-row-btns"><button class="ss-btn" data-act="hpwall"><i class="fa-solid fa-pen-to-square"></i> 방명록 열기</button></div><p class="ss-hint">파도타기는 전체화면 미니홈피의 일촌 창에서 이름을 눌러요.</p>` : ''}`],
        ['flow', 'fa-compass', '이야기 흐름', '회차 · 유령 · 운명의 빚 · 긴장도 · 현실 시간', part.flow],
        ['ledger', 'fa-book', '장부 · 약속', '누가 뭘 아는지 · 약속 장부', part.memo],
    ].filter(g => g[4]);
    return groups.length ? `<p class="ss-hint">켜 둔 부가 기능의 화면이 여기 모여요. 켜고 끄는 건 <b>관리 › 쓸 기능 › 부가 기능</b>에서 해요.</p>${groups.map(([id, icon, name, sum, inner]) => fold(`xt-${id}`, icon, name, sum, inner)).join('')}`
        : `<p class="ss-hint">켜 둔 부가 기능이 없어요. <b>관리 › 쓸 기능 › 부가 기능</b>에서 골라 켜면 여기에 화면이 생겨요.</p><div class="ss-row-btns"><button class="ss-btn" data-act="tab" data-arg="manage"><i class="fa-solid fa-sliders"></i> 관리로 가기</button></div>`;
}
// ───── 🎛 기능 고르기 (관리 › 쓸 기능) ─────
// 고르는 곳은 여기 하나: ① 묶음으로 한 번에 ② 칸 하나씩 — 칸마다 「AI 안내가 몇 토큰 느는지」 · 「같이 켜면 좋은 칸」 · (켰을 때만) 그 칸에 딸린 옵션
// 딸린 옵션 = 부가 기능 스위치(모든 채팅 공통 · 확장 설정의 같은 칸과 한 값). 딸린 칸이 없는 것만 맨 아래 「그 밖의 장치」에 남는다
const PK_PARENT = {
    profile: ['peekCost'],
    stats: ['trendMore', 'glitchView'],
    rel: ['guideOn', 'relRace', 'pairAff', 'giftTaste', 'tasteBook', 'relScar', 'memoryDrift', 'meddleOn'],
    contact: ['groupChat', 'socialAff', 'mergeContact', 'crossMail'],
    wallet: ['gearOn'],
    calendar: ['ambientOn', 'ambientShop'],
    map: ['mapMetro'],
    fate: ['fortuneTarot', 'fortuneOrb', 'fortuneShaman'],
    memo: ['ledgerKnow', 'ledgerPromise', 'promiseClock'],
};
const PK_CHILD = new Set(Object.values(PK_PARENT).flat());
// 묶음: 추천 6칸에 무엇을 더하나 (부가 기능 스위치는 건드리지 않는다)
const PK_SETS = [
    ['rel', 'fa-heart', '관계 중심', ['contact', 'sns', 'gossip', 'memo'], '연락 · SNS · 가십지 · 메모'],
    ['game', 'fa-dice-d20', '모험 · 게임', ['dice', 'shop', 'quest', 'fate', 'ach', 'home'], '주사위 · 상점 · 퀘스트 · 운명 · 업적 · 본거지'],
    ['world', 'fa-earth-asia', '세상 소식', ['news', 'gossip', 'board', 'sns'], '뉴스 · 가십지 · 게시판 · SNS'],
];
// 같이 켜면 좋은 칸 — [칸, 왜] (서로 실제로 이어지는 것만)
const PK_SYN = {
    profile: [['rel', '인물마다 관계 · 속마음이 프로필에 붙어요']],
    stats: [['dice', '능력치가 판정에 보정으로 붙어요'], ['shop', '음식 · 물약을 사서 게이지를 채워요'], ['calendar', '욕구 게이지를 넣으면 시간이 흐를 때 줄어요']],
    dice: [['stats', '능력치 보정'], ['quest', '퀘스트 완료 판정'], ['wallet', '흥정 · 일하기 판정']],
    wallet: [['shop', '사고팔기'], ['map', '이동 요금'], ['quest', '보상'], ['dice', '흥정 · 일하기 판정']],
    shop: [['wallet', '돈이 있어야 사요 (꼭 필요)'], ['stats', '산 물건을 써서 게이지를 채워요'], ['home', '가구를 사면 본거지 창고로 가요'], ['calendar', '날씨 · 시간대 효과를 켜면 밤에 가게가 닫혀요']],
    home: [['shop', '가구를 사면 창고로 와요'], ['wallet', '가구를 사고팔 돈'], ['map', '새 지도를 켜면 지도에서 집 안 보기']],
    rel: [['profile', '속마음이 프로필 밑에 떠요'], ['contact', '연락으로 선물을 보내면 호감이 올라요 (답장마다 반영은 「연락 · 방명록에서 호감 반영」을 켜야)'], ['calendar', '기념일 · 약속']],
    map: [['calendar', '이동하면 시간이 흘러요'], ['wallet', '이동 요금'], ['home', '새 지도를 켜면 집 안 보기']],
    calendar: [['map', '이동하면 시간이 흘러요'], ['contact', '편지가 며칠 걸려 와요'], ['quest', '기한'], ['stats', '욕구 게이지를 넣으면 시간이 흐를 때 줄어요']],
    contact: [['rel', '선물을 보내면 호감이 올라요 (답장마다 반영은 「연락 · 방명록에서 호감 반영」을 켜야)'], ['calendar', '편지가 며칠 걸려 와요']],
    quest: [['calendar', '기한'], ['wallet', '보상'], ['dice', '완료 판정'], ['ach', '업적']],
    news: [['gossip', '세상 소식 묶음'], ['board', '세상 소식 묶음']],
    gossip: [['rel', '인물들의 소문'], ['news', '세상 소식 묶음']],
    board: [['news', '세상 소식 묶음'], ['gossip', '세상 소식 묶음']],
    ach: [['quest', '퀘스트 완료가 업적 조건으로 좋아요 (달성은 AI가 판단)']],
    memo: [['rel', '약속 장부(딸린 옵션)를 켜면 지킨 약속에 우정이 올라요']],
    fate: [['wallet', '저주가 물가 · 대출에 걸려요'], ['calendar', '며칠 가는 저주 · 매일 효과']],
    sns: [['rel', '인물들의 글'], ['news', '세상 소식 묶음']],
};
// 토큰 어림: 영문 · 숫자 4글자 = 1 · 한글 1.6글자 = 1 (정확한 값이 아니라 「많다 · 적다」를 보는 용도)
const pkTok = (t) => { let a = 0, k = 0; for (const ch of String(t ?? '')) { if (ch.charCodeAt(0) < 128) a++; else k++; } return Math.round(a / 4 + k / 1.6); };
function pkCosts(meta) { // 칸마다: 켰을 때 AI에게 가는 「적는 법 안내」가 몇 토큰 느나
    const out = {}, mods = { ...(meta?.mods ?? {}) };
    for (const id of MOD_IDS) { try { out[id] = Math.max(0, pkTok(tagKeysFor({ ...meta, mods: { ...mods, [id]: true } })) - pkTok(tagKeysFor({ ...meta, mods: { ...mods, [id]: false } }))); } catch { out[id] = null; } }
    return out;
}
function pkTotal() { try { const r = app.current; if (!r || getMeta()?.paused) return null; const inj = buildInjection(r); return pkTok(inj.main) + pkTok(inj.people) + pkTok(inj.romance); } catch { return null; } }
// 칸마다의 세부 설정 — 확장 설정 서랍(#ss-settings)의 같은 칸을 그대로 비춘다: 이름 · 고르는 값은 서랍에서 읽고, 바꾸면 서랍의 칸을 바꾼 것과 똑같이 처리된다 (값은 하나 · 모든 채팅 공통)
const PK_DETAIL = {
    wallet: ['extraJudge'],
    shop: ['extraJudge'],
    rel: ['jealousy', 'stageLock', 'offscreen', 'romBond', 'romCap', 'romCapAff', 'romCapTrust', 'romFatigue', 'romFacts', 'romDrive', 'romDepth', 'romSpark', 'romSparkPct'],
    contact: ['contactReflect', 'contactSimple', 'contactSimpleReflect', 'autoPing', 'autoPingEvery', 'rushChance', 'contactRecall', 'contactStayRemote', 'contactAway', 'profContact'],
    calendar: ['daySummary'],
    quest: ['questAsk', 'questJudge', 'questJudgeAI', 'questExpire'],
    memo: ['pinCap'],
    music: ['musicTaste', 'musicApp', 'musicToast'],
    news: ['profFeeds'],
    gossip: ['profFeeds'],
    board: ['profFeeds'],
    sns: ['profFeeds'],
};
// 칸에 딸리지 않은 공통 설정 (맨 아래 접힌 묶음 둘)
const PK_COMMON = [
    ['send', 'AI에게 보내는 방식', ['injectMode', 'sceneFilter', 'sceneTurns', 'deltaMode', 'deltaEvery', 'injectDepth', 'injWorld', 'injScan', 'goneInject', 'oocDetect', 'skipQuiet']],
    ['look', '화면 · 알림 · 기록', ['msgCard', 'chipOutside', 'freshDot', 'toastMode', 'toastPos', 'toastSec', 'featureTips', 'actionTips', 'albumOn', 'recordOn', 'autoStart']],
    ['make', '만들기 재료 · 숨긴 답 · 지우기 · 뒤로 가기', ['genRead', 'genReadCap', 'genNote', 'hideSkip', 'askDelete', 'backClose']],
    ['guard', '다른 확장과 같이 쓰기 (간섭 차단)', ['guardData', 'guardLook']],
];
const pkDrawer = (k) => document.querySelector(`#ss-settings [data-s="${k}"]`);
function pkOpt(k) {
    const inp = pkDrawer(k); if (!inp) return '';
    const lab = inp.closest('label'); let text = k;
    if (lab) { const c = lab.cloneNode(true); c.querySelectorAll('input, select, textarea').forEach(x => x.remove()); text = c.textContent.replace(/^[\s　└]+/, '').replace(/\s+/g, ' ').trim() || k; }
    if (inp.type === 'checkbox') return `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="setopt" data-arg="${k}" ${inp.checked ? 'checked' : ''}><span>${esc(text)}</span></label>`;
    if (inp.tagName === 'SELECT') return `<label class="ss-f wide"><span>${esc(text)}</span><select class="ss-in" data-chg="setopt" data-arg="${k}">${[...inp.options].map(o => `<option value="${esc(o.value)}" ${o.value === inp.value ? 'selected' : ''}>${esc(o.textContent)}</option>`).join('')}</select></label>`;
    return `<label class="ss-f wide"><span>${esc(text)}</span><input class="ss-in" data-chg="setopt" data-arg="${k}" type="${inp.type === 'number' ? 'number' : 'text'}" ${inp.min ? `min="${esc(inp.min)}"` : ''} ${inp.max ? `max="${esc(inp.max)}"` : ''} value="${esc(inp.value)}" placeholder="${esc(inp.placeholder ?? '')}"></label>`;
}
const pkOpts = (keys) => keys.map(pkOpt).filter(Boolean);
function pkSub(id, s, st) { // 켠 칸 밑의 딸린 옵션
    const parts = [];
    if (id === 'profile') { // 💭 속마음 (v2.9 · 기본 끔): 프로필 탭의 속마음 막대와 같은 단추 · 같은 값
        const mm = { off: '끔', thought: '속마음', emoji: '이모티콘', kaomoji: '카모지' }, mf = { always: '매 턴', random: `가끔 (${st.mindPct ?? 35}%)`, tab: '볼 때만 (AI 1회)' };
        const cur = mm[st.mindMode] ? st.mindMode : 'off', fq = mf[st.mindFreq] ? st.mindFreq : 'random';
        parts.push(`<div class="ss-pk-opt"><small>💭 속마음 · 모든 채팅에 걸려요</small><div class="ss-seg wrap">${Object.entries(mm).map(([k, v]) => `<button class="${cur === k ? 'on' : ''}" data-act="mindset" data-arg="mode:${k}">${v}</button>`).join('')}</div>${cur !== 'off' ? `<small>뜨는 때</small><div class="ss-seg wrap">${Object.entries(mf).map(([k, v]) => `<button class="${fq === k ? 'on' : ''}" data-act="mindset" data-arg="freq:${k}">${v}</button>`).join('')}</div>` : ''}</div>`);
    }
    if (id === 'calendar' && s.data.calendar) parts.push(`<div class="ss-pk-opt"><small>시간 적는 법</small>${seg(CLOCK_STYLES.map(([v, name, ex]) => [v, `${name} <small>${ex}</small>`]), s.data.calendar.clock ?? '', 'clockstyle', 'class="ss-seg wrap"')}</div>`);
    const flags = (PK_PARENT[id] ?? []).map(k => FLAG_BY[k]).filter(Boolean);
    if (flags.length) parts.push(`<div class="ss-pk-opt"><small>딸린 옵션 · 모든 채팅에 걸려요</small>${flagList(st, flags)}</div>`);
    if (id === 'map' && st.mapMetro === true) parts.push(`<div class="ss-pk-opt"><small>이동 모션</small>${seg([['on', '노선 따라 움직이기'], ['off', '바로 이동']], st.mapMotion === false ? 'off' : 'on', 'mapmotion', 'class="ss-seg wrap"')}</div>`); // 새 지도 스위치 밑에 (딸린 설정이라)
    const det = pkOpts(PK_DETAIL[id] ?? []);
    if (det.length) parts.push(`<details class="ss-pk-more"><summary>세부 설정 ${det.length}개 <small>모든 채팅에 걸려요 · 확장 설정의 같은 칸과 한 값</small></summary><div class="ss-pk-det">${det.join('')}</div></details>`);
    return parts.join('');
}
function pickerHTML(s, meta, st, ui = {}) {
    const live = mgCur() === 'mods'; // 다른 탭을 보고 있을 땐 세지 않는다 (숨겨진 채 그려지므로)
    const cost = live ? pkCosts(meta) : {}, total = live ? pkTotal() : null;
    const isOn = (m) => meta.mods?.[m.id] !== false && !(GLOBAL_OFF[m.id] && st[GLOBAL_OFF[m.id]] === false);
    const onIds = MODS.filter(isOn).map(m => m.id), recOnly = onIds.length === REC_MODS.length && REC_MODS.every(id => onIds.includes(id));
    const setOn = (add) => { const want = new Set([...REC_MODS, ...add]); return onIds.length === want.size && onIds.every(id => want.has(id)); };
    const tplSet = new Set(autoOf(meta)?.tpl ?? []);
    const card = (m) => {
        const gOff = GLOBAL_OFF[m.id] && st[GLOBAL_OFF[m.id]] === false, on = isOn(m), c = cost[m.id];
        const syn = (PK_SYN[m.id] ?? []).filter(([o]) => MOD[o]);
        return `<div class="ss-pk ${on ? 'on' : ''}" data-pk="${m.id}">
            <label class="ss-mod ${on ? 'on' : ''}"><input type="checkbox" class="ss-switch" data-chg="mod" data-arg="${m.id}" ${on ? 'checked' : ''} ${gOff ? 'disabled' : ''}>
            <i class="fa-solid ${m.icon}"></i><span><b>${m.name}</b><small>${gOff ? '모든 채팅에서 꺼 둠 — 확장 설정 › 기능 켜고 끄기' : m.desc}</small></span>${gOff ? '' : `${!s.data[m.id] ? '<em>비어 있음</em>' : tplSet.has(m.id) ? '<em title="기본 틀만 들어 있어요 — 「고른 대로 채우기」를 누르면 이 이야기에 맞게 채워요">틀만</em>' : ''}${Number.isFinite(c) ? `<em class="ss-pk-cost" title="켜면 AI에게 가는 「적는 법 안내」가 이만큼 늘어요 (어림 · 그 칸의 내용은 따로)">${c ? `+${c} 토큰` : '토큰 0'}</em>` : ''}`}</label>
            ${syn.length ? `<div class="ss-pk-syn"><small>같이 켜면</small>${syn.map(([o, why]) => { const oo = isOn(MOD[o]); return oo ? `<span class="ss-chip" title="${esc(why)}"><i class="fa-solid fa-check"></i> ${MOD[o].name}</span>` : `<button type="button" class="ss-chip btn" data-act="pkon" data-arg="${o}" title="${esc(why)} — 눌러서 켜기"><i class="fa-solid fa-plus"></i> ${MOD[o].name}</button>`; }).join('')}</div>` : ''}
            <div class="ss-pk-sub"${on ? '' : ' hidden'}>${pkSub(m.id, s, st)}</div></div>`;
    };
    const groups = GROUPS.filter(g => g.id !== 'manage').map(g => ({ ...g, tabs: g.tabs.filter(t => !PSEUDO.has(t) && MOD[TAB_MOD(t)] && !tidyHidden('mods', TAB_MOD(t))) })).filter(g => g.tabs.length); // 🧹 숨긴 칸은 목록에서 뺀다
    const rest = [...ADDON_FLAGS, ...STORY_FLAGS].filter(f => !PK_CHILD.has(f[0]) && !tidyHidden('flags', f[0]));
    const tdy = settings().tidy, nHid = (tdy?.mods?.length ?? 0) + (tdy?.flags?.length ?? 0) + (tdy?.extra?.length ?? 0);
    const oRest = mgIsOpen('ex-rest'), nRest = rest.filter(f => flagOn(st, f)).length;
    const auto = autoOf(meta), todo = live ? fillTodo(s, meta) : [], needWorld = !!auto && !auto.world;
    const fillBox = auto || todo.length ? `<div class="ss-pk-fill">
            <div><b>${auto ? '🧆 지금은 틀만 있어요' : '🧆 비어 있는 칸이 있어요'}</b><small>${auto ? '아래에서 쓸 칸을 고른 뒤 누르면, 켜 둔 칸만 이 이야기(카드 · 로어북 · 지금까지의 채팅)에 맞게 채워요.' : '켜 둔 칸 중 비어 있는 칸을 이 이야기에 맞게 채워요.'}${todo.length ? ` 채울 칸: ${todo.map(id => MOD[id].name).join(' · ')}` : ''}</small></div>
            <div class="ss-row-btns">${needWorld ? `<button class="ss-btn sm" data-act="fillworld" title="카드 · 로어북 · 이야기를 읽고 세계 핵심(제목 · 장르 · 줄거리 · 규칙)만 맞춰요">${ai1} 세계관만 맞추기</button>` : ''}${ui.fillAsk ? `<span class="ss-pk-ask">AI ${fillCalls(todo, needWorld)}회 · 틀의 내용은 새로 채운 것으로 바뀌어요</span><button class="ss-btn pri" data-act="fillgo"><i class="fa-solid fa-check"></i> 진행</button><button class="ss-btn ghost" data-act="fillno">취소</button>` : `<button class="ss-btn pri" data-act="fillchosen">${ai1} 고른 대로 채우기</button>`}</div></div>` : '';
    const common = PK_COMMON.map(([id, name, keys]) => { const list = live ? pkOpts(keys) : []; if (!list.length) return ''; const o = mgIsOpen(`cm-${id}`); return `<div class="ss-modgrp ss-fold ${o ? 'open' : ''}"><button type="button" class="ss-mg-h" data-act="mgfold" data-arg="cm-${id}" aria-expanded="${o}"><b>${name}</b><small>세부 설정 ${list.length}개 · 모든 채팅에 걸려요</small><i class="fa-solid fa-chevron-down ss-mg-chev"></i></button><div class="ss-mg-b"${o ? '' : ' hidden'}><div class="ss-pk-det">${list.join('')}</div></div></div>`; }).join('');
    return `${sec('🎛 기능 고르기 <small>이 채팅만 · 끈 칸은 내용은 남고 AI에게만 안 보내요</small>', `${fillBox}
            <div class="ss-pk-sum"><span><i class="fa-solid fa-gauge-high"></i> 켠 칸 <b>${onIds.length}</b>개</span>${total !== null ? `<span>지금 매 턴 AI에게 가는 글 <b>약 ${fmtNum(total)} 토큰</b></span>` : ''}</div>
            <div class="ss-sp-row"><button type="button" class="ss-btn ss-sp-open" data-act="stylepick"><i class="fa-solid fa-palette"></i> <span><b>🎨 스타일로 고르기</b><small>연애 · 로판 · 학원 · 모험 · 생활 … 고르면 칸 · 플레이 방식 · 부가 기능이 한 번에${meta?.style && meta.style !== 'light' ? ' · 지금: 고른 스타일 있음' : ''}</small></span></button>
            <button type="button" class="ss-btn ss-sp-open" data-act="tidy"><i class="fa-solid fa-broom"></i> <span><b>🧹 기능 정리${nHid ? ` <em>숨김 ${nHid}</em>` : ''}</b><small>${nHid ? '숨긴 기능을 다시 꺼내거나 더 숨겨요' : '쓸 것만 남기고 나머지는 관리 창에서도 숨겨요 · 지우지 않아요'}</small></span></button></div>
            <div class="ss-seg wrap stack ss-pk-sets">
                <button class="${recOnly ? 'on' : ''}" data-act="modset" data-arg="rec" title="꼭 필요한 6칸(프로필 · 수치 · 재산 · 관계 · 지도 · 달력)만 켜요"><i class="fa-solid fa-feather"></i> 가볍게<small>추천 6칸만</small></button>
                ${PK_SETS.map(([id, icon, name, add, hint]) => `<button class="${setOn(add) ? 'on' : ''}" data-act="pkset" data-arg="${id}"><i class="fa-solid ${icon}"></i> ${name}<small>6칸 + ${hint}</small></button>`).join('')}
            </div>
            <p class="ss-hint">묶음을 누르면 칸만 바뀌어요 (딸린 옵션은 그대로). 나중에 켠 칸은 그때부터 적히고, 끈 칸은 다시 켜면 내용이 그대로 돌아와요.</p>
            ${groups.map(g => { const o = mgIsOpen(`mods-${g.id}`), ms = g.tabs.map(t => MOD[TAB_MOD(t)]), nOn = ms.filter(isOn).length; return `<div class="ss-modgrp ss-fold ${o ? 'open' : ''}"><button type="button" class="ss-mg-h" data-act="mgfold" data-arg="mods-${g.id}" aria-expanded="${o}"><b>${g.name}</b><small>${nOn}/${ms.length} 켬 · ${ms.map(m => m.name).join(' · ')}</small><i class="fa-solid fa-chevron-down ss-mg-chev"></i></button><div class="ss-mg-b"${o ? '' : ' hidden'}><div class="ss-pklist">${ms.map(card).join('')}</div></div></div>`; }).join('')}
            <div class="ss-modgrp ss-fold ${oRest ? 'open' : ''}"><button type="button" class="ss-mg-h" data-act="mgfold" data-arg="ex-rest" aria-expanded="${oRest}"><b>그 밖의 장치</b><small>${nRest}/${rest.length} 켬 · 칸에 딸리지 않은 선택 기능 · 모든 채팅에 걸려요</small><i class="fa-solid fa-chevron-down ss-mg-chev"></i></button><div class="ss-mg-b"${oRest ? '' : ' hidden'}>${flagList(st, rest)}<p class="ss-hint">켠 장치의 화면은 「부가 기능」 탭에 모여요.</p><div class="ss-row-btns"><small>딸린 옵션 · 장치를 한 번에</small>${FLAGSET_BTNS}</div></div></div>
            ${common}`,
        `<button class="ss-btn sm ghost" data-act="modset" data-arg="all" title="칸을 전부 켜요 (딸린 옵션은 그대로)">칸 전부</button><button class="ss-btn sm ghost" data-act="modset" data-arg="none" title="칸과 딸린 옵션을 전부 꺼요 — 딸린 옵션은 모든 채팅에서 꺼져요 · 칸의 내용은 남아요">전부 끄기</button>`)}`;
}
export function manageHTML(s, ui = {}, extra = '') {
    const meta = getMeta();
    const st = settings();
    const p0 = playOf(meta), nOn = MOD_IDS.filter(id => modOn(id)).length;
    // 🗂 여섯 묶음 (「언제 여나」로): 머리줄을 누르면 접고 펴요 (설정 mgOpen에 기억). 접어도 안의 단추는 숨기기만 해서 그대로 있어요
    return `${mgStrip()}
        ${mg('play', 'fa-gamepad', '지금 플레이', `${meta.paused ? '⏸ 일시정지 중 · ' : ''}${esc(DIFFS[diffOf()].name)} · ${esc(PLAY_MODES[p0.mode].name)}`, `
        ${sec('일시정지', `<div class="ss-row-btns"><button class="ss-btn ${meta.paused ? 'pri' : ''}" data-act="pause"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i> ${meta.paused ? '재개하기' : '일시정지'}</button><button class="ss-btn ghost" data-act="skiponce" ${meta.skipOnce ? 'disabled' : ''}><i class="fa-solid fa-forward"></i> ${meta.skipOnce ? '다음 1번 건너뜀 예약됨' : '다음 1번만 건너뛰기'}</button></div>
            <p class="ss-hint">퀵리플라이·OOC·잡담할 때 눌러 두면 AI에게 상태창을 보내지 않고 &lt;meatball&gt;도 요구하지 않아요. ${st.oocDetect ? 'OOC 자동 감지 켜짐 · ' : ''}${st.skipQuiet ? '조용한 생성(/gen 등) 자동 제외 켜짐' : ''}</p>`)}
        ${sec('🍙 심플 모드', `<div class="ss-row-btns"><button class="ss-btn" data-act="tosimple"><i class="fa-solid fa-minimize"></i> 심플 모드로 바꾸기</button></div>
            <p class="ss-hint">탭 없이 타일 판 하나만 써요 — 꼭 필요한 칸만 보이고, 팁 · 추천 · 알림 창이 안 떠요. 지금 켜 둔 다른 칸은 숨기기만 하고 내용은 그대로 둬요 (언제든 다시 넓힐 수 있어요 · 이 채팅만).</p>`)}
        ${sec('난이도', `${seg(Object.entries(DIFFS).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), diffOf(), 'diff')}<p class="ss-hint">${esc(DIFFS[diffOf()].desc)}</p>`)}
        ${(() => { const p = playOf(meta); return sec('<i class="fa-solid fa-masks-theater"></i> 플레이 방식', `${seg(Object.entries(PLAY_MODES).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), p.mode, 'playmode', 'class="ss-seg wrap"')}
            <p class="ss-hint">${esc(PLAY_MODES[p.mode].desc)}</p>
            ${p.mode === 'director' && !p.ensemble ? `<label class="ss-f wide"><span>주인공 (상태창의 「나」 — 돈·수치·관계를 이 사람 기준으로)</span><input class="ss-in" data-chg="playhero" value="${esc(p.hero)}" placeholder="예: 서이현"></label>` : ''}
            ${p.mode === 'director' ? `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="playensemble" ${p.ensemble ? 'checked' : ''}><span>주인공 없음 — 군상극 (여러 인물을 고르게 · 인물끼리의 관계만 추적)</span></label>${p.ensemble ? `<p class="ss-hint">수치 · 재산 · 본거지처럼 주인 한 명이 필요한 칸은 「쓸 기능」에서 꺼 두는 걸 권해요. 관계 탭 › 보일 것 › 「💞 인물끼리 호감」을 켜면 인물 사이도 수치로 쌓여요${st.pairAff === true ? ' (켜져 있어요)' : ''}.</p>` : ''}` : ''}
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="playworld" ${p.cardIsWorld ? 'checked' : ''}><span>카드 이름이 캐릭터가 아니라 세계관·봇 이름이에요</span></label>
            ${p.cast.length ? `<p class="ss-hint">등장인물: ${p.cast.map(esc).join(', ')}</p>` : ''}
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="playauto">${ai1} 자동으로 알아보고 맞추기</button></div>`); })()}
        ${modOn('profile') ? sec('AI가 인물을 무엇으로 알게 할까요 <small>프로필 모드</small>', `${seg([['minimal', '카드 · 로어북대로 (최소)'], ['detailed', '이 상태창 프로필대로 (상세)']], s.data.profile?.mode ?? 'minimal', 'pmode', 'class="ss-seg wrap"')}<p class="ss-hint">${(s.data.profile?.mode ?? 'minimal') === 'detailed' ? '<b>상세</b>: 프로필 탭에 적힌 외모 · 성격 · 말투까지 AI에게 보내요. 캐릭터 카드가 부실하거나 프로필을 직접 다듬었을 때 좋아요 (토큰이 더 들어요).' : '<b>최소</b>: 인물 설명은 캐릭터 카드 · 로어북에 맡기고, 프로필은 한 줄 소개만 보내요. 카드가 이미 자세하면 이쪽이 가볍고 겹치지 않아요.'}</p>`) : ''}`)}
        ${mg('mods', 'fa-puzzle-piece', '쓸 기능', `${nOn}칸 켬`, `
        ${lifeBox()}
        ${pickerHTML(s, meta, st, ui)}`)}
        ${mg('save', 'fa-floppy-disk', '저장 · 되돌리기', `세이브 ${meta.saves?.length ?? 0} · ${meta.lastBackup ? `백업 ${new Date(meta.lastBackup).toLocaleDateString('ko-KR')}` : '백업 없음'}`, `
        ${sec('되돌리기', `<div class="ss-row-btns"><button class="ss-btn" data-act="undo" ${meta.adjust?.length ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> 마지막 편집 되돌리기</button><button class="ss-btn ghost" data-act="undoall" ${meta.adjust?.length ? '' : 'disabled'} title="편집 기록을 한 번에 전부 지워요 — 직접 한 편집이 모두 없던 일이 돼요"><i class="fa-solid fa-trash-can"></i> 편집 기록 싹 지우기</button>${clearedAdj && clearedAdj.key === chatKey() ? `<button class="ss-btn pri" data-act="undoallback"><i class="fa-solid fa-clock-rotate-left"></i> 방금 지운 기록 되살리기 (${clearedAdj.list.length}개)</button>` : ''}</div><p class="ss-hint">${meta.adjust?.length ? `마지막: ${esc(meta.adjust.at(-1).label || '(이름 없는 편집)')}` : '되돌릴 편집이 없어요.'} · 상태창에서 직접 한 편집·구매·연락만 되돌려요 (AI 답의 변화는 ✏️ 칩으로).</p><details class="ss-more ss-undolist" ${ui?.undoOpen ? 'open' : ''}><summary>편집 기록 — 골라서 지우기 <small>(최근 ${Math.min(40, (meta.adjust ?? []).length)}개 · 버튼 하나 누른 것까지 모두)</small></summary>${(meta.adjust ?? []).slice(-40).reverse().map(a => `<div class="ss-undo-row"><span>${esc(short(adjName(a), 60))}${a.silent || !a.label ? ' <small class="ss-dim">(조용한 기록)</small>' : ''}</span><small class="ss-dim">${a.at}번 뒤</small><button class="ss-btn sm ghost" data-act="undoat" data-arg="${a.t}" title="이 기록 하나만 지우기 — 그 편집이 없던 일이 돼요"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') || '<p class="ss-hint">지울 기록이 없어요.</p>'}<p class="ss-hint">지우면 그 편집이 <b>없던 일</b>이 돼요 (상태 · 알림 · AI에게 가는 「방금 한 일」 줄까지 · 찌꺼기 없이). 그 뒤의 기록은 그대로 다시 계산돼요. AI 답에서 바뀐 건 여기 없어요 — 그 답 밑 칩의 ✏️로 고쳐요. 칸 하나를 통째로 비우려면 그 탭 위의 🧹.</p></details>`)}
        ${sec('<i class="fa-solid fa-floppy-disk"></i> 세이브', slotsHTML(meta))}
        ${sec('<i class="fa-solid fa-shield-heart"></i> 백업 · 카드', `<div class="ss-grid-btns">
            <button class="ss-btn" data-act="fullbackup"><i class="fa-solid fa-box-archive"></i> 전체 백업 (파일)</button>
            <button class="ss-btn" data-act="filerestore"><i class="fa-solid fa-box-open"></i> 백업 · 파일 불러오기</button>
            <button class="ss-btn" data-act="cardattach"><i class="fa-solid fa-id-card-clip"></i> ${cardPack() ? '카드에 다시 붙이기' : '카드에 상태창 붙이기'}</button>
            ${cardPack() ? '<button class="ss-btn ghost" data-act="carddetach"><i class="fa-solid fa-link-slash"></i> 카드에서 떼기</button>' : ''}
            <button class="ss-btn" data-act="export"><i class="fa-solid fa-file-export"></i> 템플릿 내보내기</button>
        </div><p class="ss-hint">전체 백업 = 기록·세이브·앨범까지 이 채팅의 상태창 전부${meta.lastBackup ? ` (마지막 백업 ${new Date(meta.lastBackup).toLocaleDateString('ko-KR')})` : ''} · 템플릿 = 지금 상태만 (다른 채팅·다른 사람용) · 카드에 붙이면 그 카드로 새 채팅을 열 때 바로 불러올 수 있어요${cardPack() ? ' — <b>지금 이 카드에 붙어 있어요 ✔</b>' : ''}.</p>`)}
        ${sec('<i class="fa-solid fa-clapperboard"></i> 2회차', `<div class="ss-row-btns"><button class="ss-btn" data-act="carryprep"><i class="fa-solid fa-forward"></i> 2회차 준비</button>${carryFor() ? '<span class="ss-chip hi">준비됨 — 새 채팅에서 시작</span>' : ''}</div><p class="ss-hint">업적·엔딩·소지품 일부를 이어받아 같은 캐릭터 새 채팅에서 다시 시작해요.${meta.round > 1 ? ` 지금 ${meta.round}회차.` : ''}</p>`)}`)}
        ${mg('tools', 'fa-sliders', '설정 · 도구', '모델 맞춤 · 프롬프트 · 꾸미기 · 번역', `
        ${sec('<i class="fa-solid fa-robot"></i> 모델 맞춤 설정 <small>한 번에 바꾸기</small>', `${presetHTML()}<p class="ss-hint">세부 설정은 위 <b>⚙ 전체 설정</b>에서 바꿀 수 있어요 (확장 설정 서랍과 같은 칸 · 같은 값).</p><div class="ss-row-btns"><button class="ss-btn sm" data-act="mgtab" data-arg="all"><i class="fa-solid fa-gear"></i> 전체 설정 열기</button></div>`)}
        ${sec('도구', `<div class="ss-grid-btns">
            <button class="ss-btn" data-act="fillempty">${ai1} 비어 있는 칸 채우기</button>
            <button class="ss-btn" data-act="prompts"><i class="fa-solid fa-scroll"></i> 프롬프트 · 토큰</button>
            <button class="ss-btn" data-act="themewin"><i class="fa-solid fa-palette"></i> 꾸미기</button>
            <button class="ss-btn" data-act="cardpng" title="지금 상태(이름 · 날짜 · 게이지 · 관계 상위 4명 · 장비)를 그림 한 장(PNG)으로 내려받아요 · AI 0회"><i class="fa-solid fa-image"></i> 상태 카드 그림</button>
            <button class="ss-btn" data-act="trsheet"><i class="fa-solid fa-language"></i> 상태창 전체 번역</button>
            <button class="ss-btn" data-act="trclear" title="이 채팅의 번역을 모두 지워요 — 번역이 마음에 안 들 때 통째로 다시 받으려고 (📌 내가 고친 건 남김 · 저장된 상태는 그대로)"><i class="fa-solid fa-trash-can"></i> 번역 전체 삭제</button>
        </div>`)}`)}
        ${mg('all', 'fa-gear', '전체 설정', '확장 설정 서랍의 모든 칸', `<div class="ss-set-host" data-set-host><p class="ss-hint">설정을 불러오는 중…</p></div>`)}
        ${mg('fix', 'fa-stethoscope', '문제 해결', '자가 진단 · 칩 점검 · 오류 보고', `
        ${sec('<i class="fa-solid fa-stethoscope"></i> 문제 해결', `<div class="ss-row-btns"><button class="ss-btn" data-act="diagnose"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button><button class="ss-btn" data-act="pipcheck"><i class="fa-solid fa-magnifying-glass"></i> 마지막 답 칩 점검</button><button class="ss-btn" data-act="copydump"><i class="fa-solid fa-clipboard"></i> 지금 상태 복사</button><button class="ss-btn" data-act="perf"><i class="fa-solid fa-gauge-simple-high"></i> 부하 재기</button><button class="ss-btn" data-act="chatsize" title="미트볼이 이 채팅 파일에 쓰고 있는 양 · 큰 칸부터"><i class="fa-solid fa-weight-hanging"></i> 이 채팅 크기</button></div><p class="ss-hint">창이 안 뜨거나 숫자가 이상할 때 눌러 주세요. 망가진 기록을 찾아 고쳐요 (AI 호출 없음).</p>`)}`)}
        ${mg('danger', 'fa-triangle-exclamation', '다시 만들기 · 끄기 · 삭제', '되돌리기 어려운 것', `<div class="ss-grid-btns">
            <button class="ss-btn" data-act="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 처음부터 다시 만들기</button>
            <button class="ss-btn" data-act="chatoff"><i class="fa-solid fa-power-off"></i> 이 채팅에서 끄기</button>
            <button class="ss-btn danger" data-act="reset"><i class="fa-solid fa-trash-can"></i> 이 채팅 상태창 삭제</button>
        </div>`, 'danger')}
        <div class="ss-hint">기록 ${meta.adjust?.length ?? 0}개 · 기준 메시지 #${meta.startAt} · 세이브 ${meta.saves?.length ?? 0} · 앨범 ${meta.album?.length ?? 0} · v${VERSION}</div>`;
}

// 편집 기록 이름: 라벨이 없는 조용한 기록(주사위 · 좋아요 · 읽음 같은 것)도 무엇인지 알 수 있게 (v2.7.18)
const OP_NAME = { _merge: '🔗 인물 합치기', _roll: '🎲 주사위 굴림', _read: '💬 읽음 표시', _nread: '📰 기사 읽음', _peekday: '💗 속마음 엿보기 (예전)', _fortune: '🔮 점집', _birth: '🔮 생년월일 고침', _ftfee: '🔮 복채 정함', _ftdel: '🗑 점괘 지움', _memo: '📝 메모', _achtog: '🏆 업적', _travel: '🗺 이동', _spot: '🏢 층 이동', _trash: '🗑 버림', _purge: '🗑 완전 삭제', _restore: '↩ 되살림', _tostore: '📦 보관', _tobag: '🎒 꺼냄', _unplace: '🪑 치움', _sellused: '💸 중고 판매', _loan: '🏦 대출', _repay: '🏦 상환', _questpay: '📜 보상', _draw: '🃏 카드', _effect: '✨ 효과', _bond: '💍 연인 확정', _unbond: '💔 확정 취소', _nolove: '💗 애정 끔', _love: '💗 애정 켬', _leave: '🕊 빠짐' };
function adjName(a) {
    if (a.label) return a.label;
    if (a.set) return `${MOD[a.set.mod]?.name ?? a.set.mod} 칸 바뀜`;
    const ks = [...new Set((a.ops ?? []).map(([k]) => OP_NAME[k] ?? k))];
    if (a.ops?.[0]?.[0] === '_roll') { try { const r = JSON.parse(a.ops[0][1]); return `🎲 ${r.label} — ${r.res}`; } catch { /* */ } }
    return ks.join(' · ') || '(이름 없는 편집)';
}

// ───── 동작 (칸 공통) ─────
export const VIEW_ACTIONS = {
    bar: (el, arg) => { const [n, v] = splitBar(arg); return addAdjust({ ops: [['stat', `${n} ${v}`]], label: `${n} ${v}` }); },
    uncond: (el, arg) => addAdjust({ ops: [['cond', `-${arg}`]], label: `상태 해제: ${arg}` }),
    cashedit: async (el, arg, btn, s) => {
        const v = await askInput(TITLE, `소지금 (${esc(s.data.wallet.currency)}) — "+500", "-200" 또는 숫자`, String(s.data.wallet.cash));
        if (v === null) return; const p = parseNum(v); if (!p) return;
        return addAdjust({ ops: [['cash', p.mode === 'add' ? String(v) : `=${p.v}`]], label: `소지금 ${p.mode === 'add' ? v : `→ ${p.v}`}` });
    },
    use: (el, arg) => { insertInput(`(${arg}을(를) 사용한다)`); closeIfPopup(el); },
    dec: (el, arg) => addAdjust({ ops: [['item', `-${arg} 1|`]], label: `${arg} 1개 버림` }),
    sell: (el, arg, btn, s) => { const p = sellPrice(s, arg); return addAdjust({ ops: [['item', `-${arg} 1|`], ['cash', `+${p}`]], label: `${arg} 판매 +${p} ${s.data.wallet.currency}` }); },
    shoptab: (el, arg) => { el._ss.ui.shop = Number(arg); app.renderPanel(el); },
    undoat: async (el, arg) => {
        const t = Number(arg); const a = getMeta()?.adjust?.find(e => e.t === t); if (!a) return;
        if (!(await askConfirm(`「${esc(adjName(a))}」 기록을 지울까요? 이 편집이 없던 일이 돼요. 그 뒤의 편집은 그대로예요.`))) return;
        el._ss.ui.undoOpen = true;
        await undoAt(t); toastr.success('지웠어요.', TITLE);
    },
    // 🖼 상태 카드 그림 · 📊 이 채팅 크기 (addons.js — 쓸 때 불러온다)
    cardpng: async () => {
        try { await app.loadAddons?.(true); } catch { /* 아래 import가 다시 시도 */ }
        const AD = await import('./addons.js'), css = getComputedStyle(document.querySelector('.ss-root') ?? document.body), v = (k, d) => css.getPropertyValue(k).trim() || d;
        if (!AD.cardDownload({ bg: v('--ss-bg', '#ffffff'), fg: v('--ss-ink', '#1f2430'), sub: v('--ss-dim', '#6b7280'), accent: v('--ss-acc', '#e2557b') })) toastr.info('그릴 상태가 없어요.', TITLE);
    },
    chatsize: async () => {
        try { await app.loadAddons?.(true); } catch { /* 아래 import가 다시 시도 */ }
        const z = (await import('./addons.js')).chatSize(), kb = (n) => `${(n / 1024).toFixed(n < 10240 ? 1 : 0)}KB`;
        const NAME = { adjust: '편집 기록', base: '기준 상태', saves: '세이브', album: '앨범', story: '이야기 장치', gbook: '방명록', notes: '메모', tr: '번역', extra: '덧붙인 자료' };
        const box = document.createElement('div'); box.className = 'ss-root ss-scope';
        box.innerHTML = `<h3><i class="fa-solid fa-weight-hanging"></i> 이 채팅에 미트볼이 쓰는 양: ${kb(z.total)}</h3><p class="ss-hint">채팅 설정(메타) ${kb(z.meta)} · 메시지마다 붙은 칩 · 변화 ${kb(z.msgs)}. 큰 칸부터:</p>
            <ul>${z.top.map(([k, n]) => `<li><b>${esc(NAME[k] ?? k)}</b> — ${kb(n)}</li>`).join('')}</ul><p class="ss-hint">세이브 · 앨범이 크면 관리에서 지울 수 있어요. 오래된 기록은 「기록 정리」로 굳혀져요.</p>`;
        await app.popup(box);
    },
    haggle: async (el, arg, btn, s) => { // 🎲 흥정 (v2.7.6): 매력 · 화술 같은 능력치로 d20 — 하루에 물건마다 한 번
        const [i, j] = arg.split('|').map(Number);
        const sh = s.data.shop.shops[i], it = sh?.items[j]; if (!it) return;
        const meta = getMeta(true), day = s.data.calendar ? dayIndex(s.data.calendar) : s.turn, key = `${day}|${i}|${j}`;
        if (meta.haggle?.[key]) { toastr.info('오늘은 이 물건을 이미 흥정했어요.', TITLE); return; }
        if (app.shopClosed?.(s)) { toastr.info('지금은 가게가 닫았어요. 날이 밝으면 다시 와요.', TITLE); return; } // 🌦 밤엔 가게 닫음 (addons.js · 설정 ambientShop)
        const r = skillRoll(s, SOCIAL_RE, 12 + (app.haggleDC?.(s) ?? 0)); // 🌦 궂은 날은 손님이 없어 흥정이 쉬움 (addons.js · 끄면 0)
        const mul = { crit: 0.7, ok: 0.85, fail: 1, fumble: 1.1 }[r.cls];
        meta.haggle = Object.fromEntries(Object.entries(meta.haggle ?? {}).filter(([k]) => k.startsWith(`${day}|`)));
        meta.haggle[key] = mul;
        await saveMeta(); app.refreshNow?.(); app.renderPanel(el);
        const msg = { crit: '🌟 대성공 — 30% 깎았어요!', ok: '✅ 성공 — 15% 깎았어요.', fail: '😅 실패 — 값은 그대로예요.', fumble: '💥 대실패 — 기분이 상해서 10% 올랐어요…' }[r.cls];
        toastr[r.cls === 'fumble' ? 'warning' : 'info'](`${esc(it.name)}: ${msg}<br><small>${esc(r.attr ? `${r.attr} · ` : '')}${esc(r.detail)}</small>`, TITLE, { escapeHtml: false });
    },
    buy: async (el, arg, btn, s) => {
        const [i, j] = arg.split('|').map(Number);
        const sh = s.data.shop.shops[i], it = sh?.items[j]; if (!it) return;
        const w = s.data.wallet;
        if (app.shopClosed?.(s)) { toastr.info('지금은 가게가 닫았어요. 날이 밝으면 다시 와요.', TITLE); return; }
        const price = Math.round(it.price * priceMul(s) * haggleMul(s, i, j));
        if (w && w.cash < price) { toastr.warning('돈이 모자라요.', TITLE); return; }
        const ops = [['cash', `-${price}`]];
        if (it.kind === 'deco' && modOn('home')) ops.push(['decor', `+${it.name}`]); else ops.push(['item', `+${it.name} 1|${it.desc ? ` ${it.desc}` : ''}${it.effect ? `|${it.effect}` : ''}`]);
        if (it.stock > 0) ops.push(['stock', `${sh.name} | ${it.name} -1`]); // 재고도 같은 기록에 — 구매를 지우면 재고도 돌아온다 (검수: 따로 적어 재고만 줄어 있었다)
        await addAdjust({ ops, label: `${sh.name}에서 ${it.name} 구매 (−${fmtNum(price)} ${w?.currency ?? ''})` });
        toastr.success(`${esc(it.name)} 구매!`, TITLE);
    },
    unplace: (el, arg) => addAdjust({ ops: [['_unplace', arg]], label: `${arg}을(를) 창고로` }),
    trashit: async (el, arg) => { if (!(await askConfirm(`「${esc(arg)}」을(를) 쓰레기통에 버릴까요? (되살릴 수 있어요)`))) return; return addAdjust({ ops: [['_trash', arg]], label: `${arg}을(를) 버렸다` }); },
    purge: async (el, arg) => {
        if (!(await askConfirm(`「${esc(arg)}」을(를) 완전히 지울까요? 되살릴 수 없어요.<br><small>쓰레기통·하루 기록에서도 사라지고, AI에게도 알리지 않아요.</small>`))) return;
        if (await purgeTrash([arg])) toastr.info(`「${esc(arg)}」을(를) 완전히 지웠어요.`, TITLE);
    },
    purgeall: async () => {
        const tr = app.current?.state?.data?.home?.trash ?? [];
        if (!tr.length || !(await askConfirm(`쓰레기통 ${tr.length}개를 모두 완전히 지울까요? 되살릴 수 없어요.`))) return;
        const n = await purgeTrash(tr.map(t => t.name));
        toastr.info(`${n}개를 완전히 지웠어요.`, TITLE);
    },
    tobag: (el, arg) => addAdjust({ ops: [['_tobag', arg]], label: `${arg}을(를) 창고에서 꺼내 챙겼다` }),
    restore: (el, arg) => addAdjust({ ops: [['_restore', arg]], label: `${arg}을(를) 쓰레기통에서 꺼냈다` }),
    sellused: async (el, arg, btn, s) => {
        const cur = s.data.wallet?.currency ?? '';
        const { base, price, how } = usedPrice(s, arg);
        if (!(await askConfirm(`「${esc(arg)}」을(를) 중고장터에 <b>${fmtNum(price)} ${esc(cur)}</b>에 팔까요?<br><small>${esc(how)}${base ? ` · 새것 ${fmtNum(base)}` : ''} — 헐값이에요 😭</small>`))) return;
        return addAdjust({ ops: [['_sellused', `${arg}|${price}`]], label: `${arg}을(를) 중고로 팔았다 +${fmtNum(price)} ${cur}` });
    },
    setweather: async (el, arg, btn, s) => {
        const v = await askInput(TITLE, '오늘 날씨 (예: 🌧 비, ❄️ 눈, ☀️ 맑음)', s.data.calendar?.weather ?? '');
        if (v === null) return;
        return addAdjust({ ops: [['weather', v.trim() || '☀️ 맑음']], label: `날씨 → ${v.trim()}` });
    },
    // 🔍 입체 지도에서 층 · 방이 있는 건물을 누르면 그 건물로 확대해 들어간다 (그 밖엔 고르기만)
    selplace: (el, arg, btn, s) => {
        const ui = el._ss.ui; ui.place = arg; ui.inside = null; ui.floor = null;
        const svg = btn?.closest?.('svg.ss-map.line'), p = svg ? findBy(s?.data.map?.places, arg) : null;
        if (svg && p && insideKind(s, p)) return zoomInto(el, svg, p.name);
        app.renderPanel(el);
    },
    mapin: (el, arg, btn, s) => { const ui = el._ss.ui, svg = el.querySelector('svg.ss-map.line'); ui.place = arg; if (svg) return zoomInto(el, svg, arg); ui.inside = arg; app.renderPanel(el); },
    mapout: (el) => { el._ss.ui.inside = null; el._ss.ui.floor = null; app.renderPanel(el); },
    mapfloor: (el, arg) => { el._ss.ui.floor = arg; app.renderPanel(el); },
    // 📍 인물 핀 (v2.9): 지도에 띄울 인물 고르기 · 이모지 정하기 — 이 채팅의 메타(mapPins)에만 적는다 (AI에게 안 감)
    mappinopen: (el) => { el._ss.ui.pinOpen = !el._ss.ui.pinOpen; app.renderPanel(el); },
    mappin: async (el, arg) => {
        const meta = getMeta(true); if (!meta) return;
        const pins = { ...(meta.mapPins ?? {}) };
        if (Object.hasOwn(pins, arg)) delete pins[arg]; else pins[arg] = '';
        meta.mapPins = pins; el._ss.ui.pinOpen = true;
        await saveMeta(); app.renderPanel(el);
    },
    mappinemo: async (el, arg) => {
        const meta = getMeta(true); if (!meta || !Object.hasOwn(meta.mapPins ?? {}, arg)) return;
        const box = document.createElement('div');
        box.innerHTML = `<p class="ss-hint">${esc(arg)}의 위치에 뜰 이모지를 고르거나 직접 넣어요. 비워 두면 얼굴 이모지를 써요.</p><div class="ss-emopick">${PIN_EMOJI.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (!b) return; box.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b)); const inp = box.closest('dialog, .popup')?.querySelector('.popup-input, textarea, input'); if (inp) inp.value = b.dataset.e; });
        const v = await ctx().Popup.show.input(TITLE, box, meta.mapPins[arg] ?? '', { rows: 1 });
        if (v === null || v === false || v === undefined) return;
        meta.mapPins = { ...meta.mapPins, [arg]: String(v).trim().slice(0, 8) }; el._ss.ui.pinOpen = true;
        await saveMeta(); app.renderPanel(el);
    },
    // 🎨 지도 꾸미기 (v2.9): 노선 색 · 굵기 · 꺾는 모양 · 역 모양 · 색 · 자리 = 이 채팅의 메타(mapStyle · 화면만) / 길 잇기 · 끊기 = 실제 지도(map.places[].links) / 보일 장소 = 메타 mapHide
    mapedit: (el) => { const ui = el._ss.ui; ui.mapEdit = !ui.mapEdit; ui.edSel = ''; ui.inside = null; app.renderPanel(el); },
    mapedsel: (el, arg) => { const ui = el._ss.ui; ui.edSel = ui.edSel === arg ? '' : arg; app.renderPanel(el); },
    mapscope: (el, arg) => { el._ss.ui.edScope = arg === 'edge' ? 'edge' : 'line'; app.renderPanel(el); },
    mapsty: (el, arg, btn, s) => mapStyleSet(el, s, String(arg).slice(0, String(arg).indexOf(':')), String(arg).slice(String(arg).indexOf(':') + 1)),
    mapposreset: async (el, arg) => { const meta = getMeta(true), st = meta?.mapStyle; if (!st?.pos?.[arg]) return; delete st.pos[arg]; el._ss.ui.mapVB = null; await saveMeta(); app.renderPanel(el); },
    mapstyreset: async (el) => { const meta = getMeta(true); if (!meta?.mapStyle) return; if (!(await askConfirm('노선 색 · 굵기 · 꺾는 모양 · 역 모양 · 색 · 옮긴 자리를 전부 처음으로 돌릴까요?<br><small>이은 길 · 끊은 길 · 숨긴 장소는 그대로예요.</small>'))) return; delete meta.mapStyle; el._ss.ui.edSel = ''; el._ss.ui.mapVB = null; await saveMeta(); app.renderPanel(el); },
    maphide: async (el, arg) => {
        const meta = getMeta(true); if (!meta) return;
        const cur = new Set(meta.mapHide ?? []); if (cur.has(arg)) cur.delete(arg); else cur.add(arg);
        if (cur.size) meta.mapHide = [...cur]; else delete meta.mapHide;
        const ui = el._ss.ui; if (ui.edSel === `s:${arg}`) ui.edSel = ''; ui.mapVB = null;
        await saveMeta(); app.renderPanel(el);
    },
    maplink: (el, arg, btn, s) => { const a = String(el._ss.ui.edSel ?? ''); return a.startsWith('s:') ? mapLinkSet(s, a.slice(2), arg) : undefined; },
    mapcut: (el, arg, btn, s) => { const e = mapModel(s.data.map, el._ss.ui).pairs.find(x => x.key === arg); if (!e) return; el._ss.ui.edSel = ''; return mapLinkSet(s, e.a, e.b, false); },
    mapmotion: (el, arg) => { settings().mapMotion = arg !== 'off'; saveSettings(); app.renderPanel(el); },
    // 🏢 건물 안에서 층 옮기기 (지금 그 건물에 있을 때만 · 같은 층을 다시 누르면 지움)
    spot: (el, arg, btn, s) => { const mp = s.data.map; if (!mp) return; const off = norm(mp.spot ?? '') === norm(arg); return addAdjust({ ops: [['_spot', off ? '' : arg]], label: off ? `${mp.here} — 층 표시 지움` : `${mp.here} · ${arg}(으)로 갔다` }); },
    selroom: (el, arg) => { el._ss.ui.hroom = el._ss.ui.hroom === arg ? null : arg; app.renderPanel(el); },
    maparea: (el, arg) => { el._ss.ui.mapArea = arg || null; el._ss.ui.mapVB = null; el._ss.ui.inside = null; app.renderPanel(el); },
    mapzoom: (el, arg, btn, s) => {
        const ui = el._ss.ui, svg = el.querySelector('svg.ss-map'); if (!svg) return;
        const vb = svgBox(svg);
        if (arg === 'fit') ui.mapVB = null;
        else if (arg === 'here') { const p = (settings().mapMetro === true ? mapModel(s.data.map, ui).pos : layoutPlaces(s.data.map.places)).get(findBy(s.data.map.places, s.data.map.here)?.name); ui.mapVB = p ? [p.x - 25, p.y - 25, 50, 50] : null; ui.place = s.data.map.here; }
        else ui.mapVB = zoomBox(vb, arg === 'in' ? 1 / 1.4 : 1.4);
        app.renderPanel(el);
    },
    modset: async (el, arg) => { // 쓸 기능 한 번에: 추천만 · 전부 · 전부 끄기
        const meta = getMeta(true); meta.mods ??= {};
        for (const id of MOD_IDS) meta.mods[id] = arg === 'rec' ? REC_MODS.includes(id) : arg === 'all';
        // 🧩 부가 기능 스위치는 「전부 끄기」만 같이 끈다 (모든 채팅). 「가볍게 · 추천 6칸만」은 다른 묶음처럼 칸만 바꾼다 — 예전엔 처음 값으로 돌려서 다른 채팅의 새 지도 · 점집까지 꺼졌다
        //   (부가 기능을 처음 값으로 돌리는 건 「그 밖의 장치」의 「처음 값」 단추)
        if (arg === 'none') setFlags('none');
        await saveMeta(); app.refreshNow(); app.rerenderPanels?.(true); app.renderPanel(el);
        toastr.info(arg === 'rec' ? '추천 6칸만 켰어요 (부가 기능은 그대로). 끈 칸의 내용은 그대로 남아 있어요.' : arg === 'all' ? '칸을 전부 켰어요. 부가 기능은 그대로 뒀어요 — 아래 「부가 기능」에서 골라 켜요.' : '칸과 부가 기능을 전부 껐어요. 내용은 그대로 남아 있어요.', TITLE);
    },
    gomods: (el) => { // 🧆 홈의 「틀만 있어요」 → 관리 › 쓸 기능 (이 창 안에서 탭만 바꾼다 — 예전엔 창을 하나 더 띄워서 창이 두 겹이 됐다)
        settings().mgTab = 'mods'; saveSettings();
        const st = el._ss; if (!st) return goMods();
        st.tab = 'manage'; st.group = null; st.mode = 'view'; st.ui = {}; app.renderPanel(el);
    },
    // 🧆 고른 대로 채우기 — 확인은 창을 따로 띄우지 않고 이 상자 안에서 (한 번 누르면 「AI N회 — 진행 · 취소」로 바뀐다). 창을 닫아도 채우기는 끝까지 가고 알림으로 알려 준다
    fillchosen: (el) => { el._ss.ui.fillAsk = true; app.renderPanel(el); },
    fillno: (el) => { el._ss.ui.fillAsk = false; app.renderPanel(el); },
    fillgo: async (el, arg, btn) => { el._ss.ui.fillAsk = false; await fillChosen(btn, { asked: true }); if (el.isConnected) app.renderPanel(el); },
    fillworld: async (el, arg, btn) => { if (await fillWorld(btn)) toastr.success('세계관을 이 이야기에 맞췄어요.', TITLE); app.refreshNow(); app.renderPanel(el); },
    pkset: async (el, arg) => { // 🎛 묶음: 추천 6칸 + 그 묶음의 칸 (부가 기능 스위치는 그대로)
        const set = PK_SETS.find(x => x[0] === arg); if (!set) return;
        const meta = getMeta(true), want = new Set([...REC_MODS, ...set[3]]); meta.mods ??= {};
        for (const id of MOD_IDS) meta.mods[id] = want.has(id);
        await saveMeta(); app.refreshNow(); app.rerenderPanels?.(true); app.renderPanel(el);
        toastr.info(`「${set[2]}」 묶음으로 맞췄어요 — 추천 6칸 + ${set[4]}. 끈 칸의 내용은 그대로 남아 있어요.`, TITLE);
    },
    pkon: async (el, arg) => { // 🎛 「같이 켜면」의 칸을 눌러 켜기
        if (!MOD[arg]) return; const meta = getMeta(true), need = MOD[arg].needs; meta.mods ??= {}; meta.mods[arg] = true; if (need) meta.mods[need] = true;
        await saveMeta(); app.refreshNow(); app.rerenderPanels?.(true); app.renderPanel(el);
        toastr.info(`「${MOD[arg].name}」 칸을 켰어요${s0Empty(arg) ? ' — 아직 비어 있어요. 그 탭에서 만들거나, 이야기가 흐르면 채워져요' : ''}.`, TITLE);
    },
    flagset: async (el, arg) => { // 🧩 부가 기능 스위치 한 번에: 처음 값(공략만) · 전부 · 전부 끄기
        if (arg === 'all' && !(await askConfirm('부가 기능을 전부 켤까요? 켠 기능마다 AI에게 가는 글이 몇 줄씩 늘어요 (토큰 ↑). 모든 채팅에 걸려요.'))) return;
        setFlags(arg); if (arg === 'all') await app.loadAddons?.(true);
        app.refreshNow(); app.rerenderPanels?.(true); app.renderPanel(el);
        toastr.info(arg === 'rec' ? '부가 기능을 처음 값으로 돌렸어요 (공략만 켬).' : arg === 'all' ? '부가 기능을 전부 켰어요.' : '부가 기능을 전부 껐어요.', TITLE);
    },
    undoall: async (el) => { // 편집 기록 싹 지우기
        const meta = getMeta(), n = meta?.adjust?.length ?? 0; if (!n) return;
        if (!(await askConfirm(`편집 기록 ${n}개를 전부 지울까요? 상태창에서 직접 한 편집 · 구매 · 이동 · 연락이 모두 없던 일이 돼요. AI 답에서 바뀐 것은 그대로예요. (이 창을 새로 고치기 전까지는 「방금 지운 기록 되살리기」로 돌릴 수 있어요)`))) return;
        clearedAdj = { key: chatKey(), list: meta.adjust }; meta.adjust = [];
        el._ss.ui.undoOpen = true; await saveMeta(); app.refreshNow(); app.renderPanel(el); toastr.success(`편집 기록 ${n}개를 지웠어요.`, TITLE);
    },
    undoallback: async (el) => {
        if (!clearedAdj || clearedAdj.key !== chatKey()) { clearedAdj = null; app.renderPanel(el); return; }
        const meta = getMeta(true); meta.adjust = [...clearedAdj.list, ...(meta.adjust ?? [])]; clearedAdj = null;
        await saveMeta(); app.refreshNow(); app.renderPanel(el); toastr.success('지운 기록을 되살렸어요.', TITLE);
    },
    mgtab: (el, arg) => { if (!MG_TABS.some(t => t[0] === arg)) return; settings().mgTab = arg; saveSettings(); app.renderPanel(el); }, // 🗂 관리 탭 안의 탭 고르기
    mgfold: (el, arg) => { const set = settings(), cur = { ...(set.mgOpen ?? MG_DEF) }; cur[arg] = !cur[arg]; set.mgOpen = cur; saveSettings(); app.renderPanel(el); }, // 🗂 관리 탭 묶음 접고 펴기
    travel: async (el, arg, btn, s) => {
        const p = findBy(s.data.map.places, arg); if (!p) return;
        const w = s.data.wallet, ui = el._ss.ui;
        if (p.fare && w && w.cash < p.fare) { toastr.warning('요금이 모자라요.', TITLE); return; }
        if (ui.moving) return; // 움직이는 중에 또 누른 것
        ui.place = p.name;
        // 🚶 이동 모션 (v2.9 · 설정 mapMotion · 기본 켬): 지도 탭에서 누르면 노선을 따라 움직인 뒤 도착 — 건물 안을 보던 중이면 지도로 나와서
        if (settings().mapMotion !== false && el._ss.tab === 'map' && norm(p.name) !== norm(s.data.map.here)) {
            if (ui.inside || ui.mapEdit) { ui.inside = null; ui.mapEdit = false; app.renderPanel(el); }
            const svg = el.querySelector('svg.ss-map.line');
            if (svg) { ui.moving = true; try { const me = (s.data.profile?.list ?? []).find(x => x.role === 'user')?.name; await runTrip(svg, pathTo(s.data.map, p.name) ?? [findBy(s.data.map.places, s.data.map.here)?.name, p.name], me ? pinEmoji(getMeta()?.mapPins, me) : '🚶'); } catch (e) { ssNote('이동 모션', e); } finally { ui.moving = false; } }
        }
        return addAdjust({ ops: [['_travel', p.name]], label: `${p.name}(으)로 이동했다${p.fare ? ` (−${fmtNum(p.fare)} ${w?.currency ?? ''})` : ''}` });
    },
    goto: (el, arg) => { insertInput(`(${arg}(으)로 이동한다)`); closeIfPopup(el); },
    setloc: (el, arg) => addAdjust({ ops: [['loc', arg]], label: `위치 → ${arg}` }),
    calnav: (el, arg, btn, s) => {
        const c = s.data.calendar, ui = el._ss.ui; ui.cal ??= { y: c.y, m: c.m };
        if (Number(arg) === 0) { ui.cal = { y: c.y, m: c.m }; ui.day = null; app.renderPanel(el); return; }
        ui.cal.m += Number(arg); if (ui.cal.m < 1) { ui.cal.m = c.months.length; ui.cal.y--; } if (ui.cal.m > c.months.length) { ui.cal.m = 1; ui.cal.y++; }
        ui.day = null; app.renderPanel(el);
    },
    calday: (el, arg) => { el._ss.ui.day = arg ? Number(arg) : null; app.renderPanel(el); },
    // ↶ 방금 넘긴 시간 · 날짜 되돌리기 (v2.7.18) — 가장 최근 편집이 시간 넘기기일 때만
    timeundo: async () => {
        const a = (getMeta()?.adjust ?? []).at(-1);
        if (!a || a.set || !a.ops?.length || !a.ops.every(([k]) => ['date', 'time', 'weather'].includes(k))) { toastr.info('되돌릴 시간 넘기기가 없어요.', TITLE); return; }
        await undoAt(a.t); toastr.success(`되돌렸어요: ${esc(a.label || '시간')}`, TITLE);
    },
    delevent: async (el, arg, btn, s) => {
        const [m, d, ...t] = String(arg).split('|'); const title = t.join('|');
        const nd = clone(s.data.calendar); const k = nd.events.findIndex(e => e.m === Number(m) && e.d === Number(d) && e.title === title); if (k < 0) return;
        nd.events.splice(k, 1);
        await commit('calendar', nd, '');
    },
    dayplus: () => addAdjust({ ops: [['date', '+1']], label: '하루가 지났다' }),
    timenext: (el, arg, btn, s) => { const c = s.data.calendar, t = nextTime(c, viewTr()), wrap = !!c.clock && nextTimeWraps(c); return addAdjust({ ops: [...(wrap ? [['date', '+1']] : []), ['time', t]], label: `시간 → ${t}` }); }, // 🕐 시각 달력은 자정을 넘기면 날짜도 넘어간다 (시간대 달력은 예전 그대로)
    timeset: async (el, arg, btn, s) => { const v = await askInput('시각 맞추기', '지금 몇 시인가요? (예: 14:30 · 오후 2시 반 · 저녁)', s.data.calendar.time); if (v === null || !String(v).trim()) return; return addAdjust({ ops: [['time', String(v).trim()]], label: `시간 → ${String(v).trim()}` }); },
    clockstyle: (el, arg, btn, s) => { if ((s.data.calendar.clock ?? '') === arg) return; const nm = CLOCK_STYLES.find(x => x[0] === arg)?.[1] ?? '시간대'; return addAdjust({ ops: [['_clock', arg]], label: `시간 적는 법 → ${nm}` }); },
    jumpday: (el) => { const ui = el._ss.ui; return addAdjust({ ops: [['date', `${ui.cal.y}년 ${ui.cal.m}월 ${ui.day}일`]], label: `날짜 → ${ui.cal.m}/${ui.day}` }); },
    addevent: async (el, arg, btn, s) => {
        const ui = el._ss.ui; const title = el.querySelector('.ss-ev-title').value.trim(); if (!title) return;
        const yearly = el.querySelector('.ss-ev-year').checked;
        const nd = clone(s.data.calendar);
        nd.events.push({ y: yearly ? null : ui.cal.y, m: ui.cal.m, d: ui.day, title, desc: '', repeat: yearly ? 'yearly' : 'once' });
        await commit('calendar', nd, `일정 추가: ${title}`);
    },
    // 빈 달력에 장르 기본 일정 넣기 (v2.7.19 · AI 0회) — 이미 있는 일정은 그대로, 같은 날 같은 제목은 안 겹치게
    calfill: async (el, arg, btn, s) => {
        const nd = clone(s.data.calendar);
        const { skeleton } = await import('./skeleton.js');
        const ev = (skeleton('calendar', s.core?.genre ?? '')?.events ?? []).filter(e => nd.months?.[e.m - 1] && e.d <= nd.months[e.m - 1].days && !nd.events.some(x => x.m === e.m && x.d === e.d && x.title === e.title));
        if (!ev.length) return toastr.info('넣을 기본 일정이 없어요.', TITLE);
        nd.events.push(...ev);
        await commit('calendar', nd, `📅 기본 일정 ${ev.length}개 넣기`);
        toastr.success(`매년 돌아오는 기본 일정 ${ev.length}개를 넣었어요. 날짜를 눌러 지울 수 있어요.`, TITLE);
    },
    achtog: async (el, arg, btn, s) => {
        const a = findBy(s.data.ach.list, arg);
        if (!a || !(await askConfirm(a.done ? `「${esc(a.name)}」 달성을 취소할까요?` : `「${esc(a.name)}」을(를) 달성 처리할까요?`))) return;
        return addAdjust({ ops: [['_achtog', a.name]], label: a.done ? '' : `🏆 업적 달성: ${a.name}` });
    },
    memoadd: (el) => { const t = el.querySelector('.ss-memo-in').value.trim(); if (t) return addAdjust({ ops: [['_memo', `add|${t.replace(/\|/g, '/')}`]], silent: true }); },
    memodel: (el, arg) => addAdjust({ ops: [['_memo', `del|${arg}`]], silent: true }),
    memotog: (el, arg) => addAdjust({ ops: [['_memo', `tog|${arg}`]], silent: true }),
    undo: async () => app.undoLast?.(),
    copydump: () => app.copyDump?.(),
    diff: async (el, arg) => { const meta = getMeta(true); meta.difficulty = arg; await saveMeta(); app.refreshNow(); toastr.info(`난이도: ${DIFFS[arg].name}`, TITLE); },
    pmode: async (el, arg, btn, s) => { const nd = clone(s.data.profile ?? EMPTY.profile()); nd.mode = arg; await commit('profile', nd, ''); },
    playmode: async (el, arg) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), mode: arg }); await saveMeta(); app.refreshNow(); },
    playauto: async (el, arg, btn, s) => {
        busyBtn(btn, true, '알아보는 중…');
        let r;
        try { r = await detectPlay(); } catch (e) { busyBtn(btn, false); toastr.error(`알아보지 못했어요: ${esc(e.message)}`, TITLE); return; }
        busyBtn(btn, false);
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope';
        box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-masks-theater"></i><div><b>이렇게 노는 것 같아요</b><small>${esc(r.why)}</small></div></div>
            <div class="ss-card"><b>${esc(PLAY_MODES[r.mode].name)}</b> — ${esc(PLAY_MODES[r.mode].desc)}${r.mode === 'director' && r.hero ? `<br>주인공: <b>${esc(r.hero)}</b>` : ''}${r.ensemble ? '<br>주인공 없음 (군상극)' : ''}${r.cardIsWorld ? '<br>카드 이름 = 세계관·봇 이름' : ''}${r.cast.length ? `<br><small class="ss-dim">등장인물: ${r.cast.map(esc).join(', ')}</small>` : ''}</div>
            <label class="ss-tog"><input type="checkbox" class="ss-switch ss-refit" ${s && (s.data.rel || s.data.profile) ? 'checked' : ''}><span>관계 · 프로필도 이 방식에 맞게 고치기 (AI ${['rel', 'profile'].filter(m => s?.data[m]).length}회 · 바뀌는 내용은 바로 적용)</span></label>`;
        if (!(await confirmPopup(box, '적용', '취소'))) return;
        const meta = getMeta(true);
        meta.play = normPlay(r);
        await saveMeta(); app.refreshNow();
        toastr.success(`플레이 방식: ${PLAY_MODES[r.mode].name}`, TITLE);
        if (!box.querySelector('.ss-refit')?.checked) return;
        const ins = r.ensemble ? `플레이 방식이 풀사칭 · 군상극이에요. 유저는 이 세계에 없고 주인공도 없어요. 프로필에서 role "user"인 사람과 디렉터(유저) 자신은 빼고, 관계의 "user" 목록은 비우고, 인물끼리의 관계를 pairs(a, b, label, memo, aff)로 적어 주세요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요.' : ''}`
            : r.mode === 'director' ? `플레이 방식이 풀사칭(유저는 디렉터)이에요. 유저는 이 세계에 없어요. 주인공은 ${r.hero || '주요 인물'}이에요. 프로필에서 role "user"는 주인공으로, 관계의 "user" 목록은 주인공과 다른 인물의 관계로 바꾸고, 디렉터(유저) 자신은 빼 주세요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`
            : r.mode === 'multi' ? `다인봇이에요. 등장인물(${r.cast.join(', ') || '카드·로어북에 나오는 사람들'})마다 따로 프로필·관계를 만들어 주세요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`
                : `1:1 롤플이에요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`;
        for (const m of ['rel', 'profile']) {
            if (!app.current?.state.data[m]) continue;
            try { const after = await instructModule(m, ins, app.current.state); await commit(m, after, `🎭 ${MOD[m].name}: 플레이 방식에 맞춤`); }
            catch (e) { toastr.error(`${MOD[m].name} 맞추기 실패: ${esc(e.message)}`, TITLE); }
        }
        toastr.success('관계 · 프로필도 맞췄어요. 마음에 안 들면 관리 › 되돌리기.', TITLE);
    },
    helpcardoff: () => { settings().helpCardOff = true; saveSettings(); app.rerenderPanels?.(true); },
    newv5off: async () => { const meta = getMeta(); if (meta) { delete meta.newV5; await saveMeta(); app.refreshNow(); } },
    ...SNS_ACTIONS, ...MUSIC_ACTIONS, ...CUSTOM_ACTIONS, ...REL_ACTIONS, ...ACH_ACTIONS, ...ALBUM_ACTIONS, ...MIND_ACTIONS, 
};
export const VIEW_CHANGES = {
    place: (el, t, s) => { if (!t.value) return; const nm = s.data.home.storage[Number(t.dataset.arg)]; return addAdjust({ ops: [['decor', `+${nm} | ${t.value}`]], label: `${t.value}에 ${nm} 배치` }); },
    setflag: (el, t) => { // 🧩 부가 기능 스위치 — 확장 설정 창의 같은 체크 칸도 같이 맞춘다
        const k = t.dataset.arg; if (!FLAG_KEYS.has(k)) return;
        settings()[k] = t.checked; saveSettings();
        const box = document.querySelector(`#ss-settings input[data-s="${k}"]`); if (box) { box.checked = t.checked; }
        if (t.checked) app.loadAddons?.(true);
        if (k === 'gearOn') gearSync();
        try { app.storyChanged?.(); } catch { /* 화면 표시일 뿐 */ }
        app.refreshNow(); app.rerenderPanels?.(true);
    },
    setopt: (el, t) => { // 🎛 세부 설정 — 확장 설정 서랍의 같은 칸을 바꾼 것과 똑같이 (그쪽 처리기가 저장 · 뒷일을 한다)
        const inp = pkDrawer(t.dataset.arg); if (!inp) return;
        if (inp.type === 'checkbox') inp.checked = t.checked; else inp.value = t.value;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        app.refreshNow();
    },
    mod: async (el, t) => { // 칸 켜고 끄기 — 꼭 필요한 칸(상점 → 재산)은 같이 켠다 · 켜면 딸린 옵션이 펼쳐지게 다시 그린다
        const meta = getMeta(true), id = t.dataset.arg, need = MOD[id]?.needs; meta.mods ??= {}; meta.mods[id] = t.checked;
        if (t.checked && need && meta.mods[need] === false) { meta.mods[need] = true; toastr.info(`${MOD[id].name}에 꼭 필요한 「${MOD[need].name}」 칸도 같이 켰어요.`, TITLE); }
        await saveMeta(); app.refreshNow(); app.renderPanel(el);
    },
    memotog: (el, t) => addAdjust({ ops: [['_memo', `tog|${t.dataset.arg}`]], silent: true }),
    ...MUSIC_CHANGES,
    playhero: async (el, t) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), hero: t.value }); await saveMeta(); app.refreshNow(); },
    playensemble: async (el, t) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), ensemble: t.checked }); if (app.current?.state) meta.fullTurn = app.current.state.turn; await saveMeta(); app.refreshNow(); },
    playworld: async (el, t) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), cardIsWorld: t.checked }); await saveMeta(); app.refreshNow(); },
};
export { MODS, MOD_IDS, ctx, stamp, CONTACT_MODES };
