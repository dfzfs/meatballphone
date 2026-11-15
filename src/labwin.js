// 🧪 실험실 창 (v2.8) — 눌렀을 때 불러온다 (lazy.js). 장치 켜고 끄기 · 장치마다의 화면과 단추
import { app, ctx, settings, saveSettings, esc, fmtNum, short, TITLE, isActive, ready, nowTick, tickUnit, waitText, mascotUrl, stamp, uid, relAxes, ssErr } from './core.js';
import { popup, busyBtn, ai1, avatar, askInput } from './kit.js';
import { LAB, labOn, labSet, labData, labSave, people, loopInfo, findScars, forecast, maskOf, addSus, drawFortune, today, market, trade, pet, undoMeddle, AI, kept, ledgerScan, settlePromise } from './lab.js';

const st = () => app.current?.state ?? null;
const live = () => { try { return isActive() && ready() && !!st(); } catch { return false; } };
const L = () => labData() ?? {};
const ui = { seen: new Set(), open: new Set() }; // 창을 연 동안만: 엿본 사람 · 연 캡슐
const whoSel = (cls = 'ss-lab-who') => { const ps = people(); return ps.length ? `<select class="ss-in ${cls}">${ps.map(r => `<option>${esc(r.name)}</option>`).join('')}</select>` : '<small class="ss-hint">관계 칸에 사람이 있어야 해요</small>'; };
const aiBtn = (act, label) => `<button class="ss-btn sm" data-lab="${act}">${ai1} ${label}</button>`;
const row = (body, btns = '') => `<div class="ss-lab-row"><span>${body}</span>${btns ? `<i class="ss-lab-btns">${btns}</i>` : ''}</div>`;
const del = (act, id) => `<button class="ss-ib" data-lab="${act}" data-arg="${esc(id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button>`;
const none = (t) => `<p class="ss-hint">${t}</p>`;
const meter = (v, max, label) => `<div class="ss-lab-meter"><b style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></b><span>${esc(label)}</span></div>`;
const ledgerBar = () => `<div class="ss-row-btns">${aiBtn('scan', '지금 정리')}<label class="ss-hint">자동 정리 <select class="ss-in ss-lab-every" data-lab-change="every">${[[0, '안 함'], [5, '답 5번마다'], [10, '답 10번마다']].map(([v, t]) => `<option value="${v}" ${Number(L().scanEvery || 0) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>`;
const results = (key, fmt) => people().map(r => { const x = kept(key, r.name).at(-1); return x ? `<div class="ss-lab-card"><b>${avatar(r.name)} ${esc(r.name)}</b> <small>${esc(x.date ?? '')}</small>${fmt(x, r)}</div>` : ''; }).join('');
const pre = (t) => `<p class="ss-pre">${esc(t)}</p>`;

const BODY = {
    loop: () => { const i = loopInfo(); return row(`지금 <b>${i.total}회차</b> · 이 장면은 ${i.scene}번 되돌림${i.top.n ? ` · 가장 많이 되돌린 답은 #${i.top.i} (${i.top.n}번)` : ''}`) + none('같은 답을 2번 넘게 다시 받으면 그 장면에서 인물이 기시감을 느껴요.'); },
    ghost: () => (L().ghost ? row(`다음 답에 새어 나올 토막: <i>${esc(short(L().ghost, 120))}</i>`, '<button class="ss-btn sm ghost" data-lab="ghostoff">막기</button>') : none('지금은 조용해요. 버린 스와이프가 있으면 답마다 12% 확률로 한 토막이 새어 나와요.')),
    debt: () => meter(L().debt ?? 0, 5, `빚 ${L().debt ?? 0} / 5${L().debtDue ? ' — 다음 답에서 갚아요' : ''}`) + ((L().debt ?? 0) ? '<div class="ss-row-btns"><button class="ss-btn sm ghost" data-lab="debtclear">빚 탕감</button></div>' : ''),
    know: () => ledgerBar() + ((L().facts ?? []).map(f => row(`${esc(f.text)} <small>— 아는 사람: ${esc(f.knows.join(', ') || '나만')}</small>`, `<button class="ss-ib" data-lab="factwho" data-arg="${esc(f.id)}" title="아는 사람 고치기"><i class="fa-solid fa-user-pen"></i></button>${del('factdel', f.id)}`)).join('') || none('아직 적힌 사실이 없어요.'))
        + '<div class="ss-lab-add"><input class="ss-in ss-lab-t" placeholder="사실 (예: 내가 왕자라는 것)"><input class="ss-in ss-lab-k" placeholder="아는 사람 (쉼표로)"><button class="ss-btn sm" data-lab="factadd">추가</button></div>',
    promise: () => ledgerBar() + ((L().promises ?? []).map(p => row(`${p.state === 'kept' ? '✅ ' : p.state === 'broken' ? '💔 ' : ''}${esc(p.text)} <small>${p.to ? `— ${esc(p.to)}에게` : ''}${p.due ? ` · ${esc(p.due)}까지` : ''}</small>`, `${p.state === 'open' ? `<button class="ss-btn sm" data-lab="prokeep" data-arg="${esc(p.id)}" title="우정 +2">지킴</button><button class="ss-btn sm danger" data-lab="probreak" data-arg="${esc(p.id)}" title="우정 -4">어김</button>` : ''}${del('prodel', p.id)}`)).join('') || none('아직 적힌 약속이 없어요.'))
        + '<div class="ss-lab-add"><input class="ss-in ss-lab-t" placeholder="약속 (예: 내일 축제에 같이 가기)"><input class="ss-in ss-lab-k" placeholder="누구에게"><button class="ss-btn sm" data-lab="proadd">추가</button></div>',
    hook: () => ledgerBar() + ((L().hooks ?? []).map(h => row(`${h.done ? '✅ ' : ''}${esc(h.text)}`, `${h.done ? '' : `<button class="ss-btn sm" data-lab="hookdone" data-arg="${esc(h.id)}">회수됨</button>`}${del('hookdel', h.id)}`)).join('') || none('아직 적힌 떡밥이 없어요.'))
        + '<div class="ss-lab-add"><input class="ss-in ss-lab-t" placeholder="떡밥 (예: 지하실의 잠긴 문)"><button class="ss-btn sm" data-lab="hookadd">추가</button></div>',
    mask: () => { const AX = st()?.data?.rel ? relAxes(st().data.rel).aff : '애정'; return people().map(r => { const m = maskOf(r), seen = ui.seen.has(r.name); return row(`${avatar(r.name)} <b>${esc(r.name)}</b> — 겉 ${esc(AX)} ${r.aff} · 진짜 ${seen ? `<b>${m.real}</b> <small>(${m.hide ? '마음을 숨기는 중' : '겉으로만 다정한 중'})</small>` : '<b>???</b>'}`, seen ? '' : `<button class="ss-btn sm" data-lab="maskpeek" data-arg="${esc(r.name)}">엿보기</button>`); }).join('') || none('관계 칸에 사람이 있어야 해요.'); },
    peek: () => { const e = Object.entries(L().sus ?? {}).filter(([, v]) => v > 0); return (e.map(([n, v]) => row(`${esc(n)} — 눈치 ${v}${v >= 3 ? ' <b>(의심하는 중)</b>' : ''}`)).join('') || none('아직 아무도 눈치채지 못했어요. 3이 되면 의심하기 시작해요.')) + (e.length ? '<div class="ss-row-btns"><button class="ss-btn sm ghost" data-lab="susclear">눈치 지우기</button></div>' : ''); },
    scar: () => { const s = findScars(); return s.map(x => row(`🩹 <b>${esc(x.name)}</b> — #${x.at} 답에서 ${esc(x.axis)} ${x.drop} 떨어짐`)).join('') || none('한 번에 10 넘게 깎인 적이 없어요.'); },
    mirror: () => `<div class="ss-row-btns">${whoSel()}${aiBtn('mirror', '역상태창 보기')}</div>` + results('mirror', (x) => `<div class="ss-lab-kv">${[['저장한 이름', x.j.nick], ['첫인상', x.j.first], ['지금 생각', x.j.now], ['오해', x.j.wrong], ['나에 대한 신뢰', `${x.j.trust} / 100`], ['좋은 점', x.j.like], ['거슬리는 점', x.j.annoy]].filter(y => y[1] !== '' && y[1] !== undefined).map(([k, v]) => `<small>${k}</small><span>${esc(v)}</span>`).join('')}</div>`),
    memory: () => `<div class="ss-row-btns">${whoSel()}${aiBtn('memory', '이 사람의 기억 만들기')}</div>` + results('memory', (x, r) => `${pre(x.t)}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-lab="memdel" data-arg="${esc(r.name)}">기억 지우기 (본편에서도 빠져요)</button></div>`),
    meddle: () => (L().meddle ?? []).slice().reverse().map(e => row(`<b>${esc(e.who)}</b> — ${e.kind === 'memo' ? `낙서: 「${esc(e.text)}」` : e.kind === 'nick' ? `자기 이름을 「${esc(e.text)}」(으)로 바꿈` : `${esc(e.text)}을(를) 차단함`} <small>${esc(e.date ?? '')}</small>`, `<button class="ss-btn sm" data-lab="meddleundo" data-arg="${esc(e.id)}">${e.kind === 'memo' ? '지우기' : '되돌리기'}</button>`)).join('') || none('아직 아무도 손대지 않았어요. 질투 50 이상이거나 애정 75 이상인 인물이 답마다 10% 확률로 손대요.'),
    glitch: () => none(`정신력 · 이성 · 멘탈 게이지가 30% 아래면 화면이 떨리고, 12% 아래면 크게 깨져요. 취기 게이지가 60%를 넘으면 흔들려요. 지금: ${document.body.classList.contains('ss-glitch-hard') ? '크게 깨짐' : document.body.classList.contains('ss-glitch') ? '떨림' : document.body.classList.contains('ss-drunk') ? '흔들림' : '멀쩡함'}`),
    phone: () => `<div class="ss-row-btns">${whoSel()}${aiBtn('phone', '몰래 보기')}</div>` + results('phone', (x) => `<div class="ss-lab-kv">${[['나를 저장한 이름', x.j.saved], ['최근 검색', x.j.search.join(' · ')], ['메모', x.j.memo], ['보내려다 지운 말', x.j.unsent]].filter(y => y[1]).map(([k, v]) => `<small>${k}</small><span>${esc(v)}</span>`).join('')}</div>${x.caught ? '<small class="ss-hint">⚠ 이때 들켰어요</small>' : ''}`),
    council: () => `<div class="ss-row-btns">${aiBtn('council', '회의록 받기')}</div>` + kept('council', '_').slice().reverse().map(x => `<div class="ss-lab-card"><small>${esc(x.date ?? '')}</small>${pre(x.t)}</div>`).join(''),
    tension: () => meter(L().t ?? 0, 100, `긴장 ${L().t ?? 0} / 100${L().tFire ? ' — 다음 답에 사건' : L().calm > 0 ? ` — 쉬는 구간 ${L().calm}턴` : ''}`) + `<div class="ss-row-btns"><label class="ss-hint">차오르는 속도 <select class="ss-in" data-lab-change="tstep">${[[4, '느리게 (25턴)'], [7, '보통 (15턴)'], [12, '빠르게 (8턴)']].map(([v, t]) => `<option value="${v}" ${Number(L().tStep || 7) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><button class="ss-btn sm ghost" data-lab="tzero">0으로</button><button class="ss-btn sm ghost" data-lab="tfire">지금 사건 부르기</button></div>`,
    forecast: () => forecast().map(f => row(`${f.icon} <b>${esc(f.name)}</b> — ${esc(f.text)} <small>(최근 ${f.sa >= 0 ? '+' : ''}${f.sa} / ${f.s2 >= 0 ? '+' : ''}${f.s2})</small>`)).join('') || none('관계 칸에 사람이 있어야 해요.'),
    realtime: () => none(L().seen ? `마지막으로 답을 받은 때: ${new Date(L().seen).toLocaleString()}. 여기서 하루쯤 지나고 돌아오면 인물이 알아채요.` : '켠 뒤 답을 한 번 받으면 시각을 재기 시작해요.'),
    capsule: () => { const now = live() ? nowTick(st()) : 0, unit = live() ? tickUnit(st()) : '턴';
        return `<div class="ss-lab-add"><textarea class="ss-in ss-lab-t" rows="2" placeholder="미래의 나에게 남길 글"></textarea><input class="ss-in ss-lab-n" type="number" min="1" value="7" title="몇 ${unit} 뒤에 열릴지"><small>${unit} 뒤</small><button class="ss-btn sm" data-lab="capadd">묻기</button></div>
        <div class="ss-row-btns">${whoSel()}${aiBtn('capfrom', '이 사람에게 캡슐 받기 (위 숫자만큼 뒤에 열림)')}</div>`
        + (L().capsules ?? []).map(c => { const due = now >= c.open, open = ui.open.has(c.id); return `<div class="ss-lab-card"><b>${c.from === 'me' ? '내가 묻은 캡슐' : `${esc(c.from)}의 캡슐`}</b> <small>${esc(c.date ?? '')}</small> ${due ? (open ? pre(c.text) : `<button class="ss-btn sm pri" data-lab="capopen" data-arg="${esc(c.id)}">열기</button>`) : `<small>🔒 ${esc(waitText(c.open - now, st()))} 뒤에 열려요</small>`} ${del('capdel', c.id)}</div>`; }).join(''); },
    mail: () => { const me = String(ctx().getCurrentChatId?.() ?? ''), all = settings().labMail ?? [], inbox = all.filter(m => m.chat !== me), mine = all.filter(m => m.chat === me);
        return `<div class="ss-row-btns">${whoSel()}${aiBtn('mailsend', '다른 채팅으로 부치기')}</div>${mine.length ? none(`이 채팅에서 부친 편지 ${mine.length}통이 다른 채팅에서 보여요.`) : ''}`
        + (inbox.map(m => `<div class="ss-lab-card"><b>${esc(m.who)}</b> <small>「${esc(m.world)}」에서</small>${pre(m.text)}<div class="ss-row-btns"><button class="ss-btn sm" data-lab="maildrop" data-arg="${esc(m.id)}" title="다음 답에서 이 편지가 이야기 속에 나타나요">이 채팅에 떨어뜨리기</button>${del('maildel', m.id)}</div></div>`).join('') || none('다른 채팅에서 온 편지가 아직 없어요.')); },
    diary: () => `<div class="ss-row-btns">${whoSel()}${aiBtn('diary', '오늘 일기 받기')}</div>` + people().flatMap(r => kept('diary', r.name).slice(-3).reverse().map(x => `<div class="ss-lab-card"><b>${avatar(r.name)} ${esc(r.name)}</b> <small>${esc(x.date ?? '')}</small>${pre(x.t)}</div>`)).join(''),
    dream: () => `<div class="ss-row-btns">${aiBtn('dream', '오늘 밤 꿈 꾸기')}</div>` + kept('dream', '_').slice(-5).reverse().map(x => `<div class="ss-lab-card"><small>${esc(x.date ?? '')}</small>${pre(x.t)}</div>`).join(''),
    taste: () => { const ps = people(), got = ps.filter(r => r.likes || r.dislikes); return (ps.map(r => `<div class="ss-lab-card"><b>${avatar(r.name)} ${esc(r.name)}</b><div class="ss-lab-kv"><small>좋아하는 것</small><span>${r.likes ? esc(r.likes) : '???'}</span><small>싫어하는 것</small><span>${r.dislikes ? esc(r.dislikes) : '???'}</span></div></div>`).join('') || none('관계 칸에 사람이 있어야 해요.')) + (ps.length ? none(`${ps.length}명 중 ${got.length}명의 취향이 드러났어요. 이야기에서 취향이 나오면 관계 칸에 적히고 여기 모여요.`) : ''); },
    fortune: () => (L().fortune?.day === today() ? row(`🔮 <b>${esc(L().fortune.tone)}</b> — ${esc(L().fortune.text)}`) : '<div class="ss-row-btns"><button class="ss-btn sm pri" data-lab="fortune">오늘의 운세 뽑기</button></div>'),
    market: () => { const m = market(), cur = st()?.data?.wallet?.currency ?? ''; if (!st()?.data?.wallet) return none('재산 칸이 있어야 해요.'); if (!m) return '<div class="ss-row-btns"><button class="ss-btn sm pri" data-lab="mktopen">시장 열기</button></div>';
        return m.items.map(it => { const prev = it.h.at(-2) ?? it.p, ch = prev ? Math.round(((it.p - prev) / prev) * 100) : 0, own = m.own[it.n] ?? 0; return row(`<b>${esc(it.n)}</b> ${fmtNum(it.p)} ${esc(cur)} <small>${ch > 0 ? `▲ ${ch}%` : ch < 0 ? `▼ ${-ch}%` : '–'}</small>${own ? ` · 보유 ${own}` : ''}`, `<button class="ss-btn sm" data-lab="buy" data-arg="${esc(it.n)}|1">사기</button><button class="ss-btn sm" data-lab="buy" data-arg="${esc(it.n)}|10">×10</button>${own ? `<button class="ss-btn sm ghost" data-lab="buy" data-arg="${esc(it.n)}|-1">팔기</button><button class="ss-btn sm ghost" data-lab="buy" data-arg="${esc(it.n)}|-${own}">전부</button>` : ''}`); }).join('') + none(`값은 ${st()?.data?.calendar ? '날이 바뀔 때' : '답 5번마다'} 출렁여요.`); },
    recap: () => '<div class="ss-row-btns"><button class="ss-btn sm pri" data-lab="recap"><i class="fa-solid fa-image"></i> 결산 카드 저장</button></div>',
    pet: () => { const p = pet(); return `<div class="ss-lab-pet"><img src="${mascotUrl(p.lv >= 6 ? 'party' : p.lv >= 2 ? 'happy' : 'idle')}" alt=""><div><b>Lv.${p.lv} ${esc(p.title)}</b> ${p.gear.join(' ')}${meter(p.xp, p.next, `${p.xp} / ${p.next}`)}</div></div>`; },
};

function html() {
    const groups = [...new Set(LAB.map(f => f.g))], on = LAB.filter(f => labOn(f.id)).length;
    return `<h3>🧪 실험실 — 이야기 장치</h3><p class="ss-hint">전부 선택 기능이에요. 끈 장치는 AI에게 아무것도 보내지 않고 계산도 하지 않아요. 지금 ${on}개 켬.${live() ? '' : ' <b>상태창이 있는 채팅에서 열어야 장치의 화면이 보여요.</b>'}</p>
        ${groups.map(g => `<h4 class="ss-lab-g">${esc(g)}</h4>${LAB.filter(f => f.g === g).map(f => { const o = labOn(f.id); let body = ''; if (o && (live() || f.id === 'pet')) { try { body = BODY[f.id]?.() ?? ''; } catch (e) { body = none(`화면을 그리지 못했어요: ${esc(e?.message ?? e)}`); } }
            return `<div class="ss-lab-f ${o ? 'on' : ''}" data-f="${f.id}"><label class="ss-tog"><input type="checkbox" class="ss-switch" data-lab-toggle="${f.id}" ${o ? 'checked' : ''}><span><b>${f.icon} ${esc(f.name)}</b> <small>${esc(f.cost)}</small></span></label><p class="ss-hint">${esc(f.desc)}</p>${body ? `<div class="ss-lab-b">${body}</div>` : ''}</div>`; }).join('')}`).join('')}`;
}

const lst = (k) => (labData(true)[k] ??= []);
const drop = (k, id) => { const D = labData(); if (D?.[k]) D[k] = D[k].filter(x => x.id !== id); };
async function act(a, arg, btn, sec) {
    const val = (c) => sec?.querySelector(c)?.value?.trim() ?? '', who = val('.ss-lab-who');
    const ai = async (fn) => { busyBtn(btn, true); try { return await fn(); } finally { busyBtn(btn, false); } };
    switch (a) {
        case 'ghostoff': delete labData().ghost; break;
        case 'debtclear': Object.assign(labData(true), { debt: 0, debtDue: false }); break;
        case 'scan': { const n = await ai(ledgerScan); toastr.info(n ? `${n}개를 새로 적었어요.` : '새로 적을 게 없었어요.', TITLE); break; }
        case 'factadd': { const t = val('.ss-lab-t'); if (!t) return; lst('facts').push({ id: uid(), text: t, knows: val('.ss-lab-k').split(/[,，]/).map(x => x.trim()).filter(Boolean), at: ctx().chat?.length ?? 0 }); break; }
        case 'factwho': { const f = labData()?.facts?.find(x => x.id === arg); if (!f) return; const v = await askInput('아는 사람 고치기', `「${short(f.text, 40)}」을(를) 아는 사람을 쉼표로 적어요.`, f.knows.join(', ')); if (v === null) return; f.knows = v.split(/[,，]/).map(x => x.trim()).filter(Boolean); break; }
        case 'factdel': drop('facts', arg); break;
        case 'proadd': { const t = val('.ss-lab-t'); if (!t) return; lst('promises').push({ id: uid(), text: t, to: val('.ss-lab-k'), due: '', state: 'open', at: ctx().chat?.length ?? 0 }); break; }
        case 'prokeep': await settlePromise(arg, true); break;
        case 'probreak': await settlePromise(arg, false); break;
        case 'prodel': drop('promises', arg); break;
        case 'hookadd': { const t = val('.ss-lab-t'); if (!t) return; lst('hooks').push({ id: uid(), text: t, at: ctx().chat?.length ?? 0 }); break; }
        case 'hookdone': { const h = labData()?.hooks?.find(x => x.id === arg); if (h) h.done = true; break; }
        case 'hookdel': drop('hooks', arg); break;
        case 'maskpeek': ui.seen.add(arg); addSus(arg, 1); break;
        case 'susclear': delete labData().sus; break;
        case 'mirror': case 'memory': case 'diary': if (!who) return; await ai(() => AI[a](who)); break;
        case 'memdel': { const D = labData(); if (D?.ai?.memory) delete D.ai.memory[arg]; break; }
        case 'phone': { if (!who) return; const caught = await ai(() => AI.phone(who)); if (caught) toastr.warning(`${esc(who)}에게 들켰어요! 다음 답에서 반응해요.`, TITLE); break; }
        case 'council': case 'dream': await ai(() => AI[a]()); break;
        case 'meddleundo': await undoMeddle(arg); break;
        case 'tzero': Object.assign(labData(true), { t: 0, tFire: false, calm: 0 }); break;
        case 'tfire': Object.assign(labData(true), { t: 100, tFire: true }); break;
        case 'capadd': { const t = val('.ss-lab-t'), n = Math.max(1, Math.round(Number(val('.ss-lab-n')) || 7)); if (!t) return; const now = nowTick(st()); lst('capsules').push({ id: uid(), from: 'me', text: t, at: now, open: now + n, date: stamp(st()) }); break; }
        case 'capfrom': { if (!who) return; const n = Math.max(1, Math.round(Number(val('.ss-lab-n')) || 7)); await ai(() => AI.capsule(who, n)); break; }
        case 'capopen': ui.open.add(arg); break;
        case 'capdel': drop('capsules', arg); break;
        case 'mailsend': if (!who) return; await ai(() => AI.mail(who)); toastr.success('부쳤어요. 다른 채팅의 실험실 › 채팅 간 우편에서 보여요.', TITLE); break;
        case 'maildrop': { const m = (settings().labMail ?? []).find(x => x.id === arg); if (m) { labData(true).drop = { who: m.who, world: m.world, text: m.text }; toastr.info('다음 답에서 편지가 나타나요.', TITLE); } break; }
        case 'maildel': settings().labMail = (settings().labMail ?? []).filter(x => x.id !== arg); saveSettings(); break;
        case 'fortune': drawFortune(); break;
        case 'mktopen': market(true); break;
        case 'buy': { const [n, q] = arg.split('|'); const err = await trade(n, Number(q)); if (err) toastr.info(err, TITLE); break; }
        case 'recap': saveRecap(); return;
        default: return;
    }
    labSave();
}
// 🎬 결산 카드: 그림 한 장으로 (토큰 0)
function saveRecap() {
    const s = st(); if (!s) return;
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 500; const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 900, 500); bg.addColorStop(0, '#2b2140'); bg.addColorStop(1, '#7a3b5d'); g.fillStyle = bg; g.fillRect(0, 0, 900, 500);
    g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.fillText(short(s.core?.title || '이야기', 30), 48, 76);
    g.font = '18px sans-serif'; g.globalAlpha = 0.75; g.fillText(`미트볼 상태창 · 플레이 결산 · ${stamp(s) || new Date().toLocaleDateString()}`, 48, 108); g.globalAlpha = 1;
    const ps = people().slice().sort((a, b) => b.aff - a.aff), top = ps[0], sc = findScars()[0], T = s.tally ?? {}, cur = s.data.wallet?.currency ?? '';
    const lines = [['주고받은 메시지', `${(ctx().chat ?? []).filter(m => !m.is_system).length}개`], ['회차 (다시 받은 횟수)', `${loopInfo().total}번`], top ? ['가장 가까운 사람', `${top.name} (${relAxes(s.data.rel).aff} ${top.aff})`] : null, sc ? ['가장 아팠던 순간', `${sc.name} · ${sc.axis} -${sc.drop}`] : null,
        s.data.wallet ? ['번 돈 / 쓴 돈', `${fmtNum(T.earn ?? 0)} / ${fmtNum(T.spend ?? 0)} ${cur}`] : null, ['만난 사람', `${ps.length}명`]].filter(Boolean);
    lines.forEach(([k, v], i) => { const y = 170 + i * 52; g.font = '18px sans-serif'; g.globalAlpha = 0.7; g.fillText(k, 48, y); g.globalAlpha = 1; g.font = 'bold 26px sans-serif'; g.fillText(short(String(v), 38), 300, y + 2); });
    const a = document.createElement('a'); a.download = 'meatball-recap.png'; a.href = cv.toDataURL('image/png'); a.click();
    toastr.success('결산 카드를 저장했어요.', TITLE);
}

export function openLab() {
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-lab';
    const draw = () => { try { box.innerHTML = html(); } catch (e) { ssErr(e); box.innerHTML = `<p class="ss-hint">실험실을 그리지 못했어요: ${esc(e?.message ?? e)}</p>`; } };
    draw();
    box.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.labToggle) { labSet(t.dataset.labToggle, t.checked); draw(); return; }
        if (t.dataset.labChange === 'every') { labData(true).scanEvery = Number(t.value) || 0; labSave(); }
        if (t.dataset.labChange === 'tstep') { labData(true).tStep = Number(t.value) || 7; labSave(); }
    });
    box.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-lab]'); if (!b || b.disabled) return;
        try { await act(b.dataset.lab, b.dataset.arg ?? '', b, b.closest('.ss-lab-f')); } catch (err) { ssErr(err); toastr.error(`실패: ${esc(err?.message ?? err)}`, TITLE); }
        if (box.isConnected) draw();
    });
    return popup(box, { large: true });
}
