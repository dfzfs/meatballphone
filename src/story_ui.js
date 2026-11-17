// 🧭 이야기 장치의 화면 (v2.8) — 켠 장치의 칸을 그 장치가 속한 탭 아래에 붙인다
//   관계 탭: 눈치 · 흉터 · 기억 왜곡 · 손댄 흔적 · 취향 도감   |   메모 탭: 장부 2종   |   🗝 공략 탭(사람 묶음): 조언 · 비밀 게이지 · 눈치 지수
//   연락 탭(목록): 채팅 간 우편   |   운명 탭(운명 칸이 꺼져 있으면 관리 탭): 회차 · 유령 · 운명의 빚 · 긴장도 · 현실 시간
// (화면은 나중에 크게 손볼 예정 — 지금은 자리만 옮겨 둔 것)
import { app, ctx, settings, saveSettings, esc, short, TITLE, uid, relAxes, modOn, ssErr } from './core.js';
import { busyBtn, ai1, avatar, askInput, askConfirm, askDelete } from './kit.js';
import { DEVICES, storyOn, storyData, storySave, people, loopInfo, findScars, undoMeddle, AI, kept, ledgerScan, settlePromise, SECRET_LV, susOf, guideOf, secretsOf, openSecret } from './story.js';

const st = () => app.current?.state ?? null;
const L = () => storyData() ?? {};
const whoSel = () => { const ps = people(); return ps.length ? `<select class="ss-in ss-st-who">${ps.map(r => `<option>${esc(r.name)}</option>`).join('')}</select>` : '<small class="ss-hint">관계 칸에 사람이 있어야 해요</small>'; };
const aiBtn = (act, label) => `<button class="ss-btn sm" data-st="${act}">${ai1} ${label}</button>`;
const row = (body, btns = '') => `<div class="ss-st-row"><span>${body}</span>${btns ? `<i class="ss-st-btns">${btns}</i>` : ''}</div>`;
const del = (act, id) => `<button class="ss-ib" data-st="${act}" data-arg="${esc(id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button>`;
const none = (t) => `<p class="ss-hint">${t}</p>`;
const meter = (v, max, label) => `<div class="ss-st-meter"><b style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></b><span>${esc(label)}</span></div>`;
const ledgerBar = () => `<div class="ss-row-btns">${aiBtn('scan', '지금 정리')}<label class="ss-hint">자동 정리 <select class="ss-in" data-st-change="every">${[[0, '안 함'], [5, '답 5번마다'], [10, '답 10번마다']].map(([v, t]) => `<option value="${v}" ${Number(L().scanEvery || 0) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>`;
const results = (key, fmt) => people().map(r => { const x = kept(key, r.name).at(-1); return x ? `<div class="ss-st-card"><b>${avatar(r.name)} ${esc(r.name)}</b> <small>${esc(x.date ?? '')}</small>${fmt(x, r)}</div>` : ''; }).join('');
const pre = (t) => `<p class="ss-pre">${esc(t)}</p>`;

const BODY = {
    loop: () => { const i = loopInfo(); return row(`지금 <b>${i.total}회차</b> · 이 장면은 ${i.scene}번 되돌림${i.top.n ? ` · 가장 많이 되돌린 답은 #${i.top.i} (${i.top.n}번)` : ''}`) + none('같은 답을 2번 넘게 다시 받으면 그 장면에서 인물이 기시감을 느껴요.'); },
    ghost: () => (L().ghost ? row(`다음 답에 새어 나올 토막: <i>${esc(short(L().ghost, 120))}</i>`, '<button class="ss-btn sm ghost" data-st="ghostoff">막기</button>') : none('지금은 조용해요. 버린 스와이프가 있으면 답마다 12% 확률로 한 토막이 새어 나와요.')),
    debt: () => meter(L().debt ?? 0, 5, `빚 ${L().debt ?? 0} / 5${L().debtDue ? ' — 다음 답에서 갚아요' : ''}`) + ((L().debt ?? 0) ? '<div class="ss-row-btns"><button class="ss-btn sm ghost" data-st="debtclear">빚 탕감</button></div>' : ''),
    tension: () => meter(L().t ?? 0, 100, `긴장 ${L().t ?? 0} / 100${L().tFire ? ' — 다음 답에 사건' : L().calm > 0 ? ` — 쉬는 구간 ${L().calm}턴` : ''}`) + `<div class="ss-row-btns"><label class="ss-hint">차오르는 속도 <select class="ss-in" data-st-change="tstep">${[[4, '느리게 (25턴)'], [7, '보통 (15턴)'], [12, '빠르게 (8턴)']].map(([v, t]) => `<option value="${v}" ${Number(L().tStep || 7) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><button class="ss-btn sm ghost" data-st="tzero">0으로</button><button class="ss-btn sm ghost" data-st="tfire">지금 사건 부르기</button></div>`,
    realtime: () => none(L().seen ? `마지막으로 답을 받은 때: ${new Date(L().seen).toLocaleString()}. 여기서 하루쯤 지나고 돌아오면 인물이 알아채요.` : '켠 뒤 답을 한 번 받으면 시각을 재기 시작해요.'),
    know: () => ((L().facts ?? []).map(f => row(`${esc(f.text)} <small>— 아는 사람: ${esc(f.knows.join(', ') || '나만')}</small>`, `<button class="ss-ib" data-st="factwho" data-arg="${esc(f.id)}" title="아는 사람 고치기"><i class="fa-solid fa-user-pen"></i></button>${del('factdel', f.id)}`)).join('') || none('아직 적힌 사실이 없어요.'))
        + '<div class="ss-st-add"><input class="ss-in ss-st-t" placeholder="사실 (예: 내가 왕자라는 것)"><input class="ss-in ss-st-k" placeholder="아는 사람 (쉼표로)"><button class="ss-btn sm" data-st="factadd">추가</button></div>',
    promise: () => ((L().promises ?? []).map(p => row(`${p.state === 'kept' ? '✅ ' : p.state === 'broken' ? '💔 ' : ''}${esc(p.text)} <small>${p.to ? `— ${esc(p.to)}에게` : ''}${p.due ? ` · ${esc(p.due)}까지` : ''}</small>`, `${p.state === 'open' ? `<button class="ss-btn sm" data-st="prokeep" data-arg="${esc(p.id)}" title="우정 +2">지킴</button><button class="ss-btn sm danger" data-st="probreak" data-arg="${esc(p.id)}" title="우정 -4">어김</button>` : ''}${del('prodel', p.id)}`)).join('') || none('아직 적힌 약속이 없어요.'))
        + '<div class="ss-st-add"><input class="ss-in ss-st-t" placeholder="약속 (예: 내일 축제에 같이 가기)"><input class="ss-in ss-st-k" placeholder="누구에게"><button class="ss-btn sm" data-st="proadd">추가</button></div>',
    peek: () => { const e = Object.entries(L().sus ?? {}).filter(([, v]) => v > 0); return (e.map(([n, v]) => row(`${esc(n)} — 눈치 ${v}${v >= 3 ? ' <b>(의심하는 중)</b>' : ''}`)).join('') || none('아직 아무도 눈치채지 못했어요. 3이 되면 의심하기 시작해요.')) + (e.length ? '<div class="ss-row-btns"><button class="ss-btn sm ghost" data-st="susclear">눈치 지우기</button></div>' : ''); },
    scar: () => { const s = L().scars ?? findScars(); return s.map(x => row(`🩹 <b>${esc(x.name)}</b> — #${x.at} 답에서 ${esc(x.axis)} ${x.drop} 떨어짐`)).join('') || none('한 번에 10 넘게 깎인 적이 없어요.'); },
    memory: () => `<div class="ss-row-btns">${whoSel()}${aiBtn('memory', '이 사람의 기억 만들기')}</div>` + results('memory', (x, r) => `${pre(x.t)}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-st="memdel" data-arg="${esc(r.name)}">기억 지우기 (본편에서도 빠져요)</button></div>`),
    meddle: () => (L().meddle ?? []).slice().reverse().map(e => row(`<b>${esc(e.who)}</b> — ${e.kind === 'memo' ? `낙서: 「${esc(e.text)}」` : e.kind === 'nick' ? `자기 이름을 「${esc(e.text)}」(으)로 바꿈` : `${esc(e.text)}을(를) 차단함`} <small>${esc(e.date ?? '')}</small>`, `<button class="ss-btn sm" data-st="meddleundo" data-arg="${esc(e.id)}">${e.kind === 'memo' ? '지우기' : '되돌리기'}</button>`)).join('') || none('아직 아무도 손대지 않았어요. 질투 50 이상이거나 애정 75 이상인 인물이 답마다 10% 확률로 손대요.'),
    taste: () => { const ps = people(), got = ps.filter(r => r.likes || r.dislikes); return (ps.map(r => `<div class="ss-st-card"><b>${avatar(r.name)} ${esc(r.name)}</b><div class="ss-st-kv"><small>좋아하는 것</small><span>${r.likes ? esc(r.likes) : '???'}</span><small>싫어하는 것</small><span>${r.dislikes ? esc(r.dislikes) : '???'}</span></div></div>`).join('') || none('관계 칸에 사람이 있어야 해요.')) + (ps.length ? none(`${ps.length}명 중 ${got.length}명의 취향이 드러났어요.`) : ''); },
    mail: () => { const me = String(ctx().getCurrentChatId?.() ?? ''), all = settings().crossMailBox ?? [], inbox = all.filter(m => m.chat !== me), mine = all.filter(m => m.chat === me);
        return `<div class="ss-row-btns">${whoSel()}${aiBtn('mailsend', '다른 채팅으로 부치기')}</div>${mine.length ? none(`이 채팅에서 부친 편지 ${mine.length}통이 다른 채팅에서 보여요.`) : ''}`
        + (inbox.map(m => `<div class="ss-st-card"><b>${esc(m.who)}</b> <small>「${esc(m.world)}」에서</small>${pre(m.text)}<div class="ss-row-btns"><button class="ss-btn sm" data-st="maildrop" data-arg="${esc(m.id)}" title="다음 답에서 이 편지가 이야기 속에 나타나요">이 채팅에 떨어뜨리기</button>${del('maildel', m.id)}</div></div>`).join('') || none('다른 채팅에서 온 편지가 아직 없어요.')); },
};
// 탭마다 붙는 장치 (순서대로)
const HOME = { rel: ['peek', 'scar', 'memory', 'meddle', 'taste'], memo: ['know', 'promise'], contact: ['mail'], flow: ['loop', 'ghost', 'debt', 'tension', 'realtime'] };
const flowTab = () => (modOn('fate') && st()?.data?.fate ? 'fate' : 'manage');
// 이 탭 아래에 붙일 칸들 (켠 장치가 없으면 빈 글 → 화면이 예전과 똑같다)
// 🧩 부가 기능 탭: 켠 장치의 칸을 묶음별로 골라 그린다 (예전엔 관계 · 메모 · 연락 · 운명 탭 아래에 흩어져 붙었음)
export const STORY_HOME = HOME;
export const storyPick = (ids, ui = {}) => storySection('extra', ui, ids);
export function storySection(tab, ui = {}, all = false) {
    try {
        if (!st()) return '';
        if (tab === 'contact' && (ui.who || ui.rooms || ui.truth)) return ''; // 연락은 목록 화면에서만
        const ids = Array.isArray(all) ? all.filter(storyOn) : [...(HOME[tab] ?? []), ...(tab === flowTab() ? HOME.flow : [])].filter(storyOn);
        if (!ids.length) return '';
        const bar = tab === 'memo' || (Array.isArray(all) && all.some(id => ['know', 'promise'].includes(id) && storyOn(id))) ? ledgerBar() : '';
        return `<div class="ss-story" data-story="${esc(tab)}">${bar}${ids.map(id => { const f = DEVICES.find(x => x.id === id); let body; try { body = BODY[id]?.() ?? ''; } catch (e) { body = none(`그리지 못했어요: ${esc(e?.message ?? e)}`); }
            return `<details class="ss-st-f" data-f="${id}" ${ui.stOpen?.[id] === true ? 'open' : ''}><summary><b>${f.icon} ${esc(f.name)}</b> <small>${esc(f.cost)}</small></summary><div class="ss-st-b">${body}</div></details>`; }).join('')}</div>`;
    } catch (e) { ssErr(e); return ''; }
}

// ───── 🗝 공략 탭 (v2.8): 사람을 고르고 → ① 눈치 지수 ② 공략(오를 것 · 떨어질 것) ③ 비밀 게이지 ─────
const KIND = { item: ['fa-gift', '아이템'], act: ['fa-person-walking', '행동'], say: ['fa-comment-dots', '말'] };
const SUS_MAX = 10;
const susWord = (v) => (v >= 8 ? '거의 확신하고 있어요' : v >= 3 ? '의심하는 중' : v > 0 ? '아직은 모르는 눈치' : '전혀 모르고 있어요');
const advice = (list, cls, title, icon) => `<div class="ss-gd-col ${cls}"><h5><i class="fa-solid ${icon}"></i> ${title}</h5>${list.length ? `<ul>${list.map(x => `<li class="${KIND[x.k] ? '' : 'nok'}">${KIND[x.k] ? `<em class="ss-gd-k"><i class="fa-solid ${KIND[x.k][0]}"></i>${KIND[x.k][1]}</em>` : ''}<span>${esc(x.t)}</span></li>`).join('')}</ul>` : none('적힌 게 없어요.')}</div>`;
export function guideView(ui = {}) {
    try {
        const ps = people(); if (!st()) return '';
        if (!ps.length) return `<div class="ss-story ss-guide" data-story="guide">${none('관계 칸에 사람이 있어야 공략을 볼 수 있어요.')}</div>`;
        const who = ps.some(r => r.name === ui.gWho) ? ui.gWho : ps[0].name, w = esc(who), sus = susOf(who), g = guideOf(who), sec = secretsOf(who), tell = L().secTell !== false;
        const pick = ps.length > 1 ? `<div class="ss-pills ss-gd-who">${ps.map(r => `<button class="ss-pill ${r.name === who ? 'on' : ''}" data-st="gwho" data-arg="${esc(r.name)}">${avatar(r.name)} ${esc(r.name)}${susOf(r.name) >= 3 ? ' <i class="fa-solid fa-eye" title="의심하는 중"></i>' : ''}</button>`).join('')}</div>` : '';
        const susBox = `<section class="ss-card ss-gd-sec"><div class="ss-sec-h"><h4><i class="fa-solid fa-eye"></i> 눈치 지수</h4>${sus ? `<button class="ss-btn sm ghost" data-st="susone" data-arg="${w}" title="이 사람의 눈치를 0으로">지우기</button>` : ''}</div>
            ${meter(sus, SUS_MAX, `눈치 ${sus} — ${susWord(sus)}`)}${none('공략을 받거나 비밀을 깔 때마다 올라요. 3부터 이 사람이 의심하기 시작하고, 8을 넘으면 따져 물을 수 있어요 (본편에 한 줄).')}</section>`;
        const guideBox = `<section class="ss-card ss-gd-sec"><div class="ss-sec-h"><h4><i class="fa-solid fa-key"></i> ${w}의 공략</h4><button class="ss-btn sm" data-st="guide" data-arg="${w}" title="지금 상황에 맞춰 새로 받아요 (AI 1회 · 눈치 +1)">${ai1} ${g ? '다시 받기' : '공략 받기'} <small>눈치 +1</small></button></div>
            ${g ? `<div class="ss-gd-cols">${advice(g.up ?? [], 'up', '이러면 호감이 올라요', 'fa-arrow-trend-up')}${advice(g.down ?? [], 'down', '이러면 호감이 떨어져요', 'fa-arrow-trend-down')}</div>${g.note ? `<p class="ss-gd-note">${avatar(who)} <span>${esc(g.note)}</span></p>` : ''}<small class="ss-hint">${esc(g.date ?? '')} 기준 — 상황이 바뀌면 다시 받아요.</small>`
                : none(`${w}이(가) 직접 일러 줘요: 지금 상황에서 호감이 오를 것 세 가지 · 떨어질 것 세 가지 (아이템 · 행동 · 말).`)}</section>`;
        const nOpen = (sec ?? []).filter(x => x.open).length;
        const secBox = `<section class="ss-card ss-gd-sec"><div class="ss-sec-h"><h4><i class="fa-solid fa-lock"></i> 비밀 게이지${sec ? ` <small>${nOpen} / ${sec.length}</small>` : ''}</h4><button class="ss-btn sm ${sec ? 'ghost' : ''}" data-st="secgen" data-arg="${w}" title="이 사람의 비밀 네 단계를 만들어 가려 둬요 (AI 1회)">${ai1} ${sec ? '새로 만들기' : '비밀 만들기'}</button></div>
            ${sec ? `<div class="ss-gd-gauge">${SECRET_LV.map(([lv, name]) => { const x = sec.find(y => y.lv === lv); return `<i class="lv-${lv} ${x?.open ? 'open' : ''} ${x ? '' : 'none'}" title="${name}${x ? (x.open ? ' — 깠어요' : ' — 가려져 있어요') : ' — 없음'}"></i>`; }).join('')}</div>
                ${SECRET_LV.map(([lv, name, desc, cost]) => { const x = sec.find(y => y.lv === lv); if (!x) return ''; return `<div class="ss-gd-secret lv-${lv} ${x.open ? 'open' : ''}"><b><i class="ss-gd-dot"></i>${name}</b><small>${desc}</small>${x.open ? `<p>${esc(x.text)}</p>` : `<p class="hid">？？？</p><button class="ss-btn sm" data-st="secopen" data-arg="${w}|${lv}" title="비밀을 까 봐요 (AI 0회 · 눈치 +${cost})">까 보기 <small>눈치 +${cost}</small></button>`}</div>`; }).join('')}
                <div class="ss-row-btns"><label class="ss-tog" title="켜 두면 본편 AI도 이 비밀들을 알고 이야기를 맞춰요 (매 턴 몇 줄). 끄면 여기서만 보는 설정이에요."><input type="checkbox" class="ss-switch" data-st-change="sectell" ${tell ? 'checked' : ''}><span>본편 AI에게도 알리기</span></label><button class="ss-btn sm ghost" data-st="secdel" data-arg="${w}">이 사람의 비밀 지우기</button></div>`
                : none('초록(나만 모르는 것) → 노랑(몇 사람만) → 빨강(본인만) → 검정(죽어도 말 못 할 것). 만들면 가려진 채로 놓이고, 하나씩 깔 때마다 눈치가 올라요 — 무거운 비밀일수록 많이.')}</section>`;
        return `<div class="ss-story ss-guide" data-story="guide">${pick}${susBox}${guideBox}${secBox}</div>`;
    } catch (e) { ssErr(e); return ''; }
}

const lst = (k) => (storyData(true)[k] ??= []);
const drop = (k, id) => { const D = storyData(); if (D?.[k]) D[k] = D[k].filter(x => x.id !== id); };
async function act(a, arg, btn, sec) {
    const val = (c) => sec?.querySelector(c)?.value?.trim() ?? '', who = val('.ss-st-who');
    const ai = async (fn) => { busyBtn(btn, true); try { return await fn(); } finally { busyBtn(btn, false); } };
    switch (a) {
        case 'ghostoff': delete storyData().ghost; break;
        case 'debtclear': Object.assign(storyData(true), { debt: 0, debtDue: false }); break;
        case 'scan': { const n = await ai(ledgerScan); toastr.info(n ? `${n}개를 새로 적었어요.` : '새로 적을 게 없었어요.', TITLE); break; }
        case 'factadd': { const t = val('.ss-st-t'); if (!t) return; lst('facts').push({ id: uid(), text: t, knows: val('.ss-st-k').split(/[,，]/).map(x => x.trim()).filter(Boolean), at: ctx().chat?.length ?? 0 }); break; }
        case 'factwho': { const f = storyData()?.facts?.find(x => x.id === arg); if (!f) return; const v = await askInput('아는 사람 고치기', `「${esc(short(f.text, 40))}」을(를) 아는 사람을 쉼표로 적어요.`, f.knows.join(', ')); if (v === null) return; f.knows = v.split(/[,，]/).map(x => x.trim()).filter(Boolean); break; }
        case 'factdel': drop('facts', arg); break;
        case 'proadd': { const t = val('.ss-st-t'); if (!t) return; lst('promises').push({ id: uid(), text: t, to: val('.ss-st-k'), due: '', state: 'open', at: ctx().chat?.length ?? 0 }); break; }
        case 'prokeep': await settlePromise(arg, true); break;
        case 'probreak': await settlePromise(arg, false); break;
        case 'prodel': drop('promises', arg); break;
        case 'susclear': delete storyData().sus; break;
        case 'memory': if (!who) return; await ai(() => AI[a](who)); break;
        // 🗝 공략 탭
        case 'guide': if (!arg) return; await ai(() => AI.guide(arg)); return; // AI.guide가 저장까지 한다
        case 'secgen': { if (!arg) return; if (secretsOf(arg)?.some(x => x.open) && !(await askConfirm(`${esc(arg)}의 비밀을 새로 만들까요? 이미 깐 비밀도 사라져요. (AI 1회)`))) return; await ai(() => AI.secrets(arg)); return; }
        case 'secopen': { const i = arg.lastIndexOf('|'), n = arg.slice(0, i), lv = arg.slice(i + 1); if (!openSecret(n, lv)) return; break; }
        case 'secdel': { if (!(await askDelete('이 사람의 비밀을 지울까요? 이미 연 비밀도 같이 사라져요. 되돌릴 수 없어요.'))) return; const D = storyData(); if (D?.secrets) delete D.secrets[arg]; break; }
        case 'susone': { const D = storyData(); if (D?.sus) delete D.sus[arg]; break; }
        case 'memdel': { if (!(await askDelete('이 사람의 기억을 지울까요? 본편에서도 빠져요. 되돌릴 수 없어요.'))) return; const D = storyData(); if (D?.ai?.memory) delete D.ai.memory[arg]; break; }
        case 'meddleundo': await undoMeddle(arg); break;
        case 'tzero': Object.assign(storyData(true), { t: 0, tFire: false, calm: 0 }); break;
        case 'tfire': Object.assign(storyData(true), { t: 100, tFire: true }); break;
        case 'mailsend': if (!who) return; await ai(() => AI.mail(who)); toastr.success('부쳤어요. 다른 채팅의 연락 탭에서 보여요.', TITLE); break;
        case 'maildrop': { const m = (settings().crossMailBox ?? []).find(x => x.id === arg); if (m) { storyData(true).drop = { who: m.who, world: m.world, text: m.text }; toastr.info('다음 답에서 편지가 나타나요.', TITLE); } break; }
        case 'maildel': if (!(await askDelete('이 편지를 지울까요? 되돌릴 수 없어요.'))) return; settings().crossMailBox = (settings().crossMailBox ?? []).filter(x => x.id !== arg); saveSettings(); break;
        default: return;
    }
    storySave();
}
// 패널 안의 장치 단추 · 고르기 (패널마다 걸지 않고 문서에 한 번)
export function initStoryUI() {
    const panelOf = (t) => t.closest?.('.ss-story')?.closest('.ss-panel') ?? null;
    document.addEventListener('click', async (e) => {
        const b = e.target.closest?.('.ss-story [data-st]'); if (!b || b.disabled) return;
        e.preventDefault(); e.stopPropagation();
        const el = panelOf(b);
        if (b.dataset.st === 'gwho') { if (el?._ss) (el._ss.ui ??= {}).gWho = b.dataset.arg; if (el?.isConnected) app.renderPanel?.(el); return; }
        try { await act(b.dataset.st, b.dataset.arg ?? '', b, b.closest('.ss-st-f')); } catch (err) { ssErr(err); toastr.error(`실패: ${esc(err?.message ?? err)}`, TITLE); }
        if (el?.isConnected) app.renderPanel?.(el);
    }, true);
    document.addEventListener('change', (e) => {
        const t = e.target; if (!t.closest?.('.ss-story')) return;
        if (t.dataset.stChange === 'every') { storyData(true).scanEvery = Number(t.value) || 0; storySave(); }
        if (t.dataset.stChange === 'tstep') { storyData(true).tStep = Number(t.value) || 7; storySave(); }
        if (t.dataset.stChange === 'sectell') { storyData(true).secTell = !!t.checked; storySave(); }
    });
    // 접어 둔 칸은 다시 그려도 접힌 채로
    document.addEventListener('toggle', (e) => { const d = e.target; if (!d.classList?.contains('ss-st-f')) return; const el = d.closest('.ss-panel'); if (el?._ss) ((el._ss.ui ??= {}).stOpen ??= {})[d.dataset.f] = d.open; }, true);
}
