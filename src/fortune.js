// 🔮 점집 (v2.8.1): 타로 · 수정구슬 · 무당(사주 · 신점) · 굿 — 어떤 인물이든, 복채를 내고
// 카드 · 오방기는 여기서 진짜로 뽑고(난수), AI는 그것을 풀이만 한다. 본 점괘는 기록(_fortune)에 통째로 남아 다시 볼 수 있다.
// 창을 새로 띄우지 않는다: 점괘 · 생년월일 · 복채 · 풀 저주 고르기는 모두 이 칸 안에서 (창 위에 창이 겹치면 실리에서 창이 꺼지던 것)
// 기다리는 동안 창을 닫아도 점괘는 끝까지 받아서 기록하고 알림으로 알려 준다
import { app, modOn, esc, short, findBy, norm, num, fmtNum, uid, dateStr, userName, TITLE, FORTUNE_PERSON_KEYS, fortunePerson } from './core.js';
import { addAdjust, chatCharacters, priceMul } from './engine.js';
import { sec, chip, seg, ai1 } from './kit.js';
import { fortuneRead, gutRite } from './ai.js';

export const FT_METHODS = { tarot: { name: '타로', icon: '🃏', mul: 1 }, orb: { name: '수정구슬', icon: '🔮', mul: 1.5 }, shaman: { name: '무당', icon: '🪭', mul: 3 } };
const TOPICS = ['종합', '오늘의 운세', '올해 운세', '애정', '재물', '건강', '진로 · 일', '인간관계'];
const SPREADS = { 1: { name: '1장', pos: ['오늘의 메시지'], mul: 0.5 }, 3: { name: '3장', pos: ['과거', '현재', '미래'], mul: 1 }, 5: { name: '5장', pos: ['지금의 상황', '가로막는 것', '숨은 영향', '조언', '결과'], mul: 1.6 } };
const MAJOR = ['바보', '마법사', '여사제', '여황제', '황제', '교황', '연인', '전차', '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음', '절제', '악마', '탑', '별', '달', '태양', '심판', '세계'];
const SUITS = ['완드', '컵', '소드', '펜타클'], RANKS = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '시종', '기사', '여왕', '왕'];
export const TAROT = [...MAJOR, ...SUITS.flatMap(su => RANKS.map(r => `${su} ${r}`))]; // 78장
const FLAGS = ['붉은 기 (재수 · 경사)', '흰 기 (천신 · 명복)', '노란 기 (조상)', '푸른 기 (우환 · 근심)', '검은 기 (액 · 죽음의 기운)'];
// 굿: 무엇이 실제로 바뀌는지는 여기서 정한다 (AI는 장면만 쓴다). 수치가 바뀌는 것은 내 상태창이라 {{user}}에게 할 때만.
export const GUTS = {
    ward: { name: '액막이굿', desc: '걸린 저주 하나를 풀어요. 저주가 없으면 7일짜리 액막이를 걸어 둬요.' },
    luck: { name: '재수굿', desc: '7일 동안 「재수굿의 가호」 — 가격 −10%.', bless: { name: '재수굿의 가호', desc: '굿으로 재수를 불러들였다.', effects: ['가격 -10%'], days: 7 } },
    love: { name: '인연굿', desc: '7일 동안 「인연굿의 가호」 — 호감 +20%.', bless: { name: '인연굿의 가호', desc: '굿으로 인연의 길을 틔웠다.', effects: ['호감 +20%'], days: 7 } },
    soul: { name: '진혼굿', desc: '넋을 달래요. 수치는 안 바뀌고 이야기에만 남아요.' },
    wish: { name: '소원굿', desc: '바라는 것을 적고 빌어요. 수치는 안 바뀌고 이야기에만 남아요.' },
};
const R = (n) => Math.floor(Math.random() * n);

// ───── 시간: 이야기 속 · 현실 ─────
export const storyNow = (s) => { const c = s.data.calendar && modOn('calendar') ? s.data.calendar : null; return c ? `${dateStr(c)} ${c.time}${c.weather ? ` · ${c.weather}` : ''}` : ''; };
export const realNow = () => new Date().toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

// ───── 누구든: 나 · 카드 인물 · 프로필 · 관계 · 연락처 · 전에 점 본 사람 ─────
export function fortunePeople(s) {
    const d = s.data, out = [], seen = new Set();
    const add = (n) => { n = String(n ?? '').trim(); const k = norm(n); if (n && !seen.has(k)) { seen.add(k); out.push(n); } };
    add(userName());
    for (const ch of chatCharacters()) add(ch?.name);
    for (const p of d.profile?.list ?? []) add(p.name);
    for (const r of d.rel?.user ?? []) add(r.name);
    for (const c of d.contact?.contacts ?? []) add(c.name);
    for (const b of d.fate?.births ?? []) add(b.name);
    return out;
}

// ───── 복채: 정해 둔 값 → 없으면 이 세계 물가(아는 가격의 가운데 값)에 맞춰 ─────
const nice = (n) => { if (n < 10) return Math.max(1, Math.round(n)); const p = 10 ** (Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
function baseFee(s) {
    const ps = [...(s.data.wallet?.prices ?? []).map(p => p.price), ...(s.data.shop?.shops ?? []).flatMap(sh => sh.items.map(i => i.price))].map(Number).filter(x => x > 0).sort((a, b) => a - b);
    return ps.length >= 3 ? ps[Math.floor(ps.length / 2)] : num(s.data.contact?.express?.fee, 0) || 100;
}
export function fortuneFees(s) {
    const f = s.data.fate ?? {}, w = s.data.wallet && modOn('wallet') ? s.data.wallet : null;
    if (!w) return { free: true, tarot: 0, orb: 0, shaman: 0, gut: 0 };
    const b = baseFee(s), mul = priceMul(s);
    const fee = (set, k) => Math.max(1, Math.round((set > 0 ? set : nice(b * k)) * mul));
    return { free: false, tarot: fee(f.feeTarot, 1), orb: fee(f.feeOrb, 1.5), shaman: fee(f.feeShaman, 3), gut: fee(f.feeGut, 30) };
}

// ───── 화면 ─────
const form = (ui) => (ui.ft ??= { who: '', name: '', method: 'tarot', spread: '3', topic: '종합', q: '', basis: 'story', gut: 'ward', wish: '' });
const whoOf = (F) => (F.name.trim() || F.who || userName());
function keepForm(el) {
    const F = form(el._ss.ui);
    const v = (c) => el.querySelector(c)?.value;
    if (v('.ss-ft-who') !== undefined) F.who = v('.ss-ft-who');
    if (v('.ss-ft-name') !== undefined) F.name = v('.ss-ft-name');
    if (v('.ss-ft-q') !== undefined) F.q = v('.ss-ft-q');
    if (v('.ss-ft-wish') !== undefined) F.wish = v('.ss-ft-wish');
    if (v('.ss-ft-lift') !== undefined) F.lift = v('.ss-ft-lift');
    return F;
}
const BIRTH_LABEL = { birth: '생년월일', hour: '태어난 시', age: '나이', zodiac: '띠', star: '별자리', element: '타고난 기운', place: '태어난 곳', nature: '기질' };
const personChips = (p) => [['birth', '🎂'], ['hour', '🕰'], ['age', '나이'], ['zodiac', '띠'], ['star', '별자리'], ['element', '기운'], ['place', '태어난 곳']].filter(([k]) => p?.[k]).map(([k, l]) => chip(`${l} ${esc(p[k])}`)).join('');

export function fortuneView(s, d, ui) {
    const F = form(ui), fees = fortuneFees(s), w = s.data.wallet && modOn('wallet') ? s.data.wallet : null;
    const cur = w ? ` ${esc(w.currency)}` : '';
    const people = fortunePeople(s);
    if (!F.who || !people.some(n => n === F.who)) F.who = people[0] ?? '';
    const who = whoOf(F), saved = findBy(d.births ?? [], who);
    const sn = storyNow(s);
    if (!sn) F.basis = 'real';
    const sp = SPREADS[F.spread] ?? SPREADS[3];
    const price = (m) => (fees.free ? 0 : m === 'tarot' ? Math.max(1, Math.round(fees.tarot * sp.mul)) : fees[m]);
    const tag = (n) => (fees.free ? '' : ` <small>${fmtNum(n)}${cur}</small>`);
    const reads = [...(d.readings ?? [])].reverse();
    const shown = ui.ftShow ? (d.readings ?? []).find(r => r.id === ui.ftShow) : null;
    const mine = norm(who) === norm(userName());
    const lifts = mine && F.gut === 'ward' ? (d.curses ?? []).filter(c => c.kind !== 'bless' && !c.auto) : [];
    const editBirth = ui.ftEdit === 'birth' ? `<div class="ss-card ss-ft-edit"><small>${esc(who)}의 타고난 것 — 비운 칸은 첫 점에서 점쟁이가 채워요 · 전부 비우면 기록을 없애요</small>
            <div class="ss-ft-row">${FORTUNE_PERSON_KEYS.map(k => `<label class="ss-f"><span>${BIRTH_LABEL[k]}</span>${k === 'nature' ? `<textarea class="ss-in" data-ftb="${k}" rows="2">${esc(saved?.[k] ?? '')}</textarea>` : `<input class="ss-in" type="text" maxlength="80" data-ftb="${k}" value="${esc(saved?.[k] ?? '')}">`}</label>`).join('')}</div>
            <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="ftbsave">저장</button><button class="ss-btn sm ghost" data-act="ftclose">취소</button></div></div>` : '';
    const editFee = ui.ftEdit === 'fee' ? `<div class="ss-card ss-ft-edit"><small>복채 (${esc(w?.currency ?? '')}) — 0이나 빈칸 = 이 세계 물가에 맞춰 자동</small>
            <div class="ss-ft-row">${[['feeTarot', '타로 (3장 기준)', fees.tarot], ['feeOrb', '수정구슬', fees.orb], ['feeShaman', '무당', fees.shaman], ['feeGut', '굿', fees.gut]].map(([k, l, now]) => `<label class="ss-f"><span>${l} <small>지금 ${fmtNum(now)}</small></span><input class="ss-in" type="number" min="0" data-ftf="${k}" value="${d[k] || ''}" placeholder="자동"></label>`).join('')}</div>
            <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="ftfsave">저장</button><button class="ss-btn sm ghost" data-act="ftclose">취소</button></div></div>` : '';
    return sec('🔮 점집 <small>타로 · 수정구슬 · 무당 · 굿</small>', `<div class="ss-ft">
        ${ui.ftBusy ? `<div class="ss-card ss-ft-busy"><i class="fa-solid fa-spinner fa-spin"></i> ${esc(ui.ftBusy)} <small class="ss-dim">창을 닫아도 끝까지 받아서 알려 드려요</small></div>` : ''}
        ${shown ? `<div class="ss-card ss-ft-pop">${readingHTML(shown)}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="ftclose"><i class="fa-solid fa-xmark"></i> 점괘 접기</button></div></div>` : ''}
        <div class="ss-ft-clock"><span title="이야기 속 지금">📅 이야기 속 <b>${esc(sn || '달력 칸이 없어요')}</b></span><span title="현실의 지금">🕰 현실 <b>${esc(realNow())}</b></span></div>
        <div class="ss-ft-row">
            <label class="ss-f"><span>누구의 운세를 볼까요</span><select class="ss-in ss-ft-who" data-chg="ftwho">${people.map(n => `<option value="${esc(n)}" ${n === F.who ? 'selected' : ''}>${esc(n)}${norm(n) === norm(userName()) ? ' (나)' : ''}</option>`).join('')}</select></label>
            <label class="ss-f"><span>목록에 없는 인물 (적으면 이 이름으로)</span><input class="ss-in ss-ft-name" type="text" maxlength="60" placeholder="예: 지나가던 상인, 죽은 스승" value="${esc(F.name)}"></label>
        </div>
        <div class="ss-card ss-ft-birth"><small>${esc(who)}의 타고난 것</small>
            ${saved ? `<div class="ss-chips">${personChips(saved) || chip('비어 있음')}</div>${saved.nature ? `<p class="ss-dim ss-pre">${esc(saved.nature)}</p>` : ''}` : '<p class="ss-hint">아직 몰라요. 첫 점을 볼 때 점쟁이가 생년월일 · 태어난 시 · 띠 · 별자리를 짚어 내고, 그 뒤로는 계속 같은 값을 써요.</p>'}
            ${editBirth || '<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="ftbirth"><i class="fa-solid fa-pen"></i> 생년월일 직접 적기 · 고치기</button></div>'}</div>
        <div class="ss-f"><span>점 보는 법</span>${seg(Object.entries(FT_METHODS).map(([k, m]) => [k, `${m.icon} ${m.name}${tag(price(k))}`]), F.method, 'ftm')}</div>
        ${F.method === 'tarot' ? `<div class="ss-f"><span>카드 수</span>${seg(Object.entries(SPREADS).map(([k, x]) => [k, `${x.name} <small>${esc(x.pos.join(' · '))}</small>`]), F.spread, 'fts')}</div>` : ''}
        <div class="ss-f"><span>무엇이 궁금한가요</span>${seg(TOPICS.map(t => [t, esc(t)]), F.topic, 'ftt')}</div>
        <label class="ss-f"><span>물어볼 것 (안 적어도 돼요)</span><input class="ss-in ss-ft-q" type="text" maxlength="200" placeholder="예: 이 사람과 계속 가도 될까요?" value="${esc(F.q)}"></label>
        <div class="ss-f"><span>언제를 「지금」으로 볼까요</span>${seg([['story', '📅 이야기 속 시간'], ['real', '🕰 현실 시간']], F.basis, 'ftb')}</div>
        <div class="ss-row-btns"><button class="ss-btn pri" data-act="ftread">${ai1} ${FT_METHODS[F.method].icon} ${esc(who)}의 점 보기${fees.free ? '' : ` — 복채 ${fmtNum(price(F.method))}${cur}`}</button>
            ${fees.free ? '' : '<button class="ss-btn sm ghost" data-act="ftfee"><i class="fa-solid fa-coins"></i> 복채 정하기</button>'}</div>
        ${editFee}
        <details class="ss-arc ss-ft-gut" ${ui.ftGutOpen ? 'open' : ''}><summary>🪘 굿 하기${fees.free ? '' : ` — ${fmtNum(fees.gut)}${cur}`}</summary>
            ${seg(Object.entries(GUTS).map(([k, g]) => [k, esc(g.name)]), F.gut, 'ftg')}
            <p class="ss-hint">${esc(GUTS[F.gut].desc)}${norm(who) === norm(userName()) ? '' : ` ${esc(who)}에게 하는 굿은 이야기에만 남아요 (수치는 내 것만 바뀌어요).`}</p>
            ${lifts.length > 1 ? `<label class="ss-f"><span>풀 저주</span><select class="ss-in ss-ft-lift">${lifts.map(c => `<option value="${esc(c.name)}" ${c.name === F.lift ? 'selected' : ''}>☠ ${esc(c.name)}</option>`).join('')}</select></label>` : ''}
            ${F.gut === 'wish' || F.gut === 'soul' ? `<label class="ss-f"><span>${F.gut === 'wish' ? '빌 소원' : '달랠 넋 · 사연 (안 적어도 돼요)'}</span><input class="ss-in ss-ft-wish" type="text" maxlength="200" value="${esc(F.wish)}"></label>` : ''}
            <div class="ss-row-btns"><button class="ss-btn" data-act="ftgut">${ai1} 🪘 ${esc(who)}에게 ${esc(GUTS[F.gut].name)}${fees.free ? '' : ` — ${fmtNum(fees.gut)}${cur}`}</button></div></details>
        ${reads.length ? `<details class="ss-arc"><summary>지난 점괘 · 굿 ${reads.length}개</summary><ul class="ss-ft-log">${reads.map(r => `<li><button class="ss-btn sm ghost" data-act="ftview" data-arg="${esc(r.id)}">${r.method === 'gut' ? '🪘' : FT_METHODS[r.method]?.icon ?? '🔮'} <b>${esc(r.who)}</b> · ${esc(r.topic || '')} <small>${esc(r.when)}</small></button></li>`).join('')}</ul></details>` : ''}
        <p class="ss-hint">${fees.free ? '재산 칸이 꺼져 있어서 복채 없이 봐요. ' : `가진 돈 ${fmtNum(w.cash)}${cur}. `}점 · 굿 한 번에 확장 AI를 1번 불러요. 오늘 본 점괘는 다음 답에서 AI도 알고 이야기에 은근히 엮어요.</p></div>`);
}

function readingHTML(r) {
    const gut = r.method === 'gut';
    const m = gut ? { icon: '🪘', name: '굿' } : FT_METHODS[r.method] ?? FT_METHODS.tarot;
    const pc = personChips(r.person);
    return `<div class="ss-wz-head"><i class="fa-solid fa-hat-wizard"></i><div><b>${m.icon} ${esc(r.who)} — ${esc(m.name)}${r.topic ? ` · ${esc(r.topic)}` : ''}</b><small>${r.basis === 'real' ? '🕰 현실 시간' : '📅 이야기 속 시간'} ${esc(r.when)}${r.fee ? ` · 복채 ${fmtNum(r.fee)}` : ''}</small></div></div>
        ${r.q ? `<p class="ss-dim">물은 것: ${esc(r.q)}</p>` : ''}
        ${pc || r.person?.nature ? `<div class="ss-card ss-ft-birth"><small>타고난 것</small><div class="ss-chips">${pc}</div>${r.person?.nature ? `<p class="ss-dim ss-pre">${esc(r.person.nature)}</p>` : ''}</div>` : ''}
        ${r.draw?.length ? `<div class="ss-chips ss-ft-draw">${r.draw.map(x => chip(esc(x), 'hi')).join('')}</div>` : ''}
        ${r.teller ? `<blockquote class="ss-pre">${esc(r.teller)}</blockquote>` : ''}
        ${r.rite ? `<p class="ss-pre">${esc(r.rite)}</p>` : ''}
        ${r.result ? `<div class="ss-card ss-ft-sum"><b>${esc(r.result)}</b></div>` : ''}
        ${r.summary ? `<div class="ss-card ss-ft-sum"><b>${esc(r.summary)}</b></div>` : ''}
        ${(r.sections ?? []).map(x => `<div class="ss-ft-sec">${x.title ? `<h5>${esc(x.title)}</h5>` : ''}<p class="ss-pre">${esc(x.text)}</p></div>`).join('')}
        ${r.omen ? `<p><b>👁 징조</b> ${esc(r.omen)}</p>` : ''}
        ${r.advice ? `<p><b>🧭 조언</b> ${esc(r.advice)}</p>` : ''}
        ${r.lucky ? `<p><b>🍀 행운</b> ${esc(r.lucky)}</p>` : ''}`;
}
// 결과를 이 칸 안에 펼친다. 기다리는 동안 창을 닫았으면 알림만 (기록에는 이미 들어 있다)
function showReading(el, r) {
    const ui = el._ss?.ui;
    if (ui) { ui.ftBusy = ''; ui.ftShow = r.id; ui.ftEdit = ''; }
    if (el.isConnected) { app.renderPanel(el); el.querySelector('.ss-ft-pop')?.scrollIntoView({ block: 'nearest' }); }
    else toastr.success(`${esc(r.who)}의 ${r.method === 'gut' ? esc(r.topic) : '점괘'}가 나왔어요. 운명 › 점집 › 지난 점괘에서 볼 수 있어요.`, TITLE);
}
function setBusy(el, text) { if (el._ss?.ui) el._ss.ui.ftBusy = text; if (el.isConnected) app.renderPanel(el); }
const canPay = (s, fee) => { if (!fee) return true; if (fee > (s.data.wallet?.cash ?? 0)) { toastr.warning(`돈이 모자라요. (${fmtNum(fee)} ${esc(s.data.wallet?.currency ?? '')} 필요)`, TITLE); return false; } return true; };
const stampOf = (s, F) => { const sn = storyNow(s), rn = realNow(); const basis = F.basis === 'real' || !sn ? 'real' : 'story'; return { sn, rn, basis, when: basis === 'real' ? rn : sn }; };
function drawFor(F) {
    if (F.method === 'tarot') {
        const sp = SPREADS[F.spread] ?? SPREADS[3], pool = [...TAROT];
        return sp.pos.map(pos => `${pos} — ${pool.splice(R(pool.length), 1)[0]} (${R(3) === 0 ? '역방향' : '정방향'})`);
    }
    return F.method === 'shaman' ? [`오방기 — ${FLAGS[R(FLAGS.length)]}`] : [];
}

export const FORTUNE_CHANGES = {
    ftwho: (el) => { keepForm(el); app.renderPanel(el); },
};
const pick = (k) => (el, arg) => { const F = keepForm(el); F[k] = arg; if (k === 'gut') el._ss.ui.ftGutOpen = true; app.renderPanel(el); };
export const FORTUNE_ACTIONS = {
    ftm: pick('method'), fts: pick('spread'), ftt: pick('topic'), ftb: pick('basis'), ftg: pick('gut'),
    ftread: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim();
        if (!who) { toastr.info('누구의 운세를 볼지 골라 주세요.', TITLE); return; }
        const fees = fortuneFees(s), sp = SPREADS[F.spread] ?? SPREADS[3];
        const fee = fees.free ? 0 : F.method === 'tarot' ? Math.max(1, Math.round(fees.tarot * sp.mul)) : fees[F.method];
        if (!canPay(s, fee)) return;
        const T = stampOf(s, F), draw = drawFor(F), saved = findBy(s.data.fate?.births ?? [], who) ?? null;
        if (el._ss.ui.ftBusy) return; // 한 번에 하나
        el._ss.ui.ftShow = '';
        setBusy(el, `${FT_METHODS[F.method].name}(으)로 ${who}의 점괘를 보는 중…`);
        let res;
        try { res = await fortuneRead({ who, method: F.method, topic: F.topic, q: F.q.trim(), basis: T.basis, storyNow: T.sn, realNow: T.rn, draw, saved }, s); }
        catch (e) { toastr.error(`점을 보지 못했어요 (복채는 안 나갔어요): ${esc(e.message)}`, TITLE); setBusy(el, ''); return; }
        el._ss.ui.ftBusy = '';
        const keep = Object.fromEntries(Object.entries(saved ?? {}).filter(([k, v]) => FORTUNE_PERSON_KEYS.includes(k) && v));
        const r = { id: uid(), who, method: F.method, topic: F.topic, q: F.q.trim(), when: T.when, basis: T.basis, fee, draw, ...res, person: fortunePerson({ ...(res.person ?? {}), ...keep }) };
        const cur = s.data.wallet?.currency ?? '';
        await addAdjust({ ops: [...(fee ? [['cash', `-${fee}`]] : []), ['_fortune', JSON.stringify(r)]], label: `🔮 점집 — ${FT_METHODS[F.method].name}(으)로 ${who}의 ${F.topic} 운을 봤다${fee ? ` (복채 ${fmtNum(fee)} ${cur})` : ''}: ${short(r.summary || r.omen, 90)}` });
        showReading(el, r);
    },
    ftview: (el, arg, btn, s) => { keepForm(el); const r = (s.data.fate?.readings ?? []).find(x => x.id === arg); if (r) showReading(el, r); },
    ftclose: (el) => { keepForm(el); el._ss.ui.ftShow = ''; el._ss.ui.ftEdit = ''; app.renderPanel(el); },
    ftbirth: (el) => { keepForm(el); el._ss.ui.ftEdit = 'birth'; el._ss.ui.ftShow = ''; app.renderPanel(el); },
    ftbsave: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim(); if (!who) return;
        const vals = Object.fromEntries([...el.querySelectorAll('[data-ftb]')].map(x => [x.dataset.ftb, x.value.trim()]));
        el._ss.ui.ftEdit = '';
        const had = findBy(s.data.fate?.births ?? [], who);
        if (!Object.values(vals).some(Boolean)) { if (had) await addAdjust({ ops: [['_birth', `-${who}`]], silent: true }); else app.renderPanel(el); return; }
        await addAdjust({ ops: [['_birth', JSON.stringify({ name: who, ...fortunePerson(vals) })]], silent: true });
    },
    ftfee: (el) => { keepForm(el); el._ss.ui.ftEdit = 'fee'; el._ss.ui.ftShow = ''; app.renderPanel(el); },
    ftfsave: async (el) => {
        keepForm(el);
        const g = (k) => Math.max(0, Math.round(num(el.querySelector(`[data-ftf="${k}"]`)?.value, 0)));
        el._ss.ui.ftEdit = '';
        await addAdjust({ ops: [['_ftfee', ['feeTarot', 'feeOrb', 'feeShaman', 'feeGut'].map(g).join(' | ')]], silent: true });
    },
    ftgut: async (el, arg, btn, s) => {
        const F = keepForm(el), who = whoOf(F).trim(); if (!who) return;
        el._ss.ui.ftGutOpen = true;
        const g = GUTS[F.gut] ?? GUTS.ward, mine = norm(who) === norm(userName());
        if (F.gut === 'wish' && !F.wish.trim()) { toastr.info('빌 소원을 적어 주세요.', TITLE); return; }
        const fees = fortuneFees(s), fee = fees.free ? 0 : fees.gut;
        if (!canPay(s, fee)) return;
        // 무엇이 바뀌는지 먼저 정한다
        let lift = '', bless = null, outcome = `The rite is performed for ${who}. Nothing is guaranteed — whether and how it works on ${who} is left to the story.`;
        if (mine && F.gut === 'ward') {
            const cs = (s.data.fate?.curses ?? []).filter(c => c.kind !== 'bless' && !c.auto);
            lift = (cs.find(c => c.name === F.lift) ?? cs[0])?.name ?? ''; // 여럿이면 굿 상자 안의 「풀 저주」에서 고른 것
            if (lift) outcome = `The curse "${lift}" on {{user}} is lifted by this rite. It is gone.`;
            else { bless = { name: '액막이', desc: '굿으로 액을 막아 두었다.', effects: [], days: 7 }; outcome = '{{user}} has no curse to lift, so a protective ward is laid on them for 7 days (blessing "액막이").'; }
        } else if (mine && g.bless) { bless = g.bless; outcome = `{{user}} receives the blessing "${g.bless.name}" for ${g.bless.days} days (${g.bless.effects.join(', ')}).`; }
        const T = stampOf(s, F);
        if (el._ss.ui.ftBusy) return;
        el._ss.ui.ftShow = '';
        setBusy(el, `${who}에게 ${g.name}을(를) 하는 중…`);
        let res;
        try { res = await gutRite({ who, rite: g.name, wish: F.wish.trim(), outcome, storyNow: T.sn }, s); }
        catch (e) { toastr.error(`굿을 하지 못했어요 (돈은 안 나갔어요): ${esc(e.message)}`, TITLE); setBusy(el, ''); return; }
        el._ss.ui.ftBusy = '';
        const r = { id: uid(), who, method: 'gut', topic: g.name, q: F.wish.trim(), when: T.when, basis: T.basis, fee, draw: [], rite: res.rite, result: res.result || (lift ? `「${lift}」이(가) 풀렸다` : bless ? `「${bless.name}」을(를) 받았다` : ''), omen: res.omen, lift, bless };
        const cur = s.data.wallet?.currency ?? '';
        await addAdjust({ ops: [...(fee ? [['cash', `-${fee}`]] : []), ['_fortune', JSON.stringify(r)]], label: `🪘 점집 — ${who}에게 ${g.name}을(를) 했다${fee ? ` (${fmtNum(fee)} ${cur})` : ''}${r.result ? `: ${short(r.result, 80)}` : ''}` });
        showReading(el, r);
    },
};
