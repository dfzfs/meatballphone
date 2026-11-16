// 🌊 파도타기 · 💬 일촌평 · 📝 방명록의 화면 (선택 기능 · minihome.js와 같이, 켰을 때만 불러온다)
//   · 설정 hpWave: 전체화면 미니홈피의 「일촌」 창에서 이름을 누르면 그 사람의 홈피(파도타기)가 열리고, 이름 밑에 일촌평이 보인다 (토큰 0)
//   · 설정 guestbook: 파도타기 화면에서 일촌평 · 방명록을 받는다 (받을 때 AI 1회) · 일촌 창 아래에 「방명록」 단추
// hompy.js · shell.js에는 `app.hpFriend?.()` · `app.hpFriendFoot?.()` · `app.extraActions?.[act]` 세 줄만 걸려 있다 (이 파일이 없으면 예전 그대로)
import { app, settings, esc, TITLE, ssNote } from './core.js';
import { popup, avatar, ai1, sec, askInput } from './kit.js';
import { scheduleFill, translateView } from './translate.js';
import { WINS } from './hompy.js';
import { personPage, visitable, ilchonOf, ilchonWrite, ilchonSet, gbOn, gbWrite, gbReply, gbDelete, gbSeen, gbUnread, gbList, wall, todayCount, myNotes, sendNote, noteReplyAI, deleteMyNote, myIlchonOf, setMyIlchon } from './minihome.js';

export const waveOn = () => settings().hpWave === true;
const signed = (n) => `${n > 0 ? '+' : ''}${n}`;
const kv = (k, v) => (v ? `<div class="ss-wv-kv"><small>${esc(k)}</small><span>${esc(v)}</span></div>` : '');
const note = (g, mine = false) => `<div class="ss-wv-note" data-id="${esc(g.id)}"><div><b>${esc(g.who)}</b> <small>${esc(g.date ?? '')}${g.kind === 'scribble' ? ' · 낙서' : ''}</small></div><p>${esc(g.text)}</p>${g.reply ? `<p class="re">↳ ${esc(g.reply)}</p>` : ''}${g.kind === 'scribble' ? '' : `<div class="ss-row-btns"><button class="ss-btn sm ghost" data-wv="reply:${esc(g.id)}">${g.reply ? '답글 고치기' : '답글'}</button><button class="ss-btn sm ghost" data-wv="del:${esc(g.id)}"><i class="fa-solid fa-trash-can"></i></button></div>`}</div>`;

// 일촌 창의 한 줄에 붙일 것 (hompy.js) — 꺼져 있으면 null → 예전 그대로
app.hpFriend = (name) => { if (!waveOn()) return null; let line = ''; try { line = ilchonOf(name)?.text ?? ''; } catch (e) { ssNote('wave line', e); } return { line }; };
// 싸이월드처럼: 👣 TODAY · TOTAL은 프로필 창에, 💬 일촌평과 📝 방명록은 저마다의 창으로 (꺼져 있거나 받은 게 없으면 빈 글 → 창이 안 생긴다)
app.hpToday = () => { if (!waveOn()) return ''; try { const tc = todayCount(); return `<p class="ss-hp-tdy"><b>TODAY</b> ${tc.today} <i>·</i> <b>TOTAL</b> ${tc.total}</p>`; } catch (e) { ssNote('wave today', e); return ''; } };
WINS.ilchon ??= '일촌평'; WINS.guest ??= '방명록';
app.hpWins = {
    ...(app.hpWins ?? {}),
    ilchon: () => { if (!waveOn()) return ''; try { const il = (app.current?.state?.data?.rel?.user ?? []).filter(r => !r.out).sort((a, b) => b.aff - a.aff).map(r => ilchonOf(r.name)).filter(x => x?.text).slice(0, 6); return il.length ? `<ul class="ss-hp-ilchons">${il.map(x => `<li><button data-act="hpwave" data-arg="${esc(x.who)}" title="${esc(x.who)}의 홈피로"><span>「${esc(x.text)}」</span><em>${esc(x.who)}</em></button></li>`).join('')}</ul>` : ''; } catch (e) { ssNote('wave ilchon win', e); return ''; } },
    guest: () => { if (!waveOn() || !gbOn()) return ''; try { const ls = gbList().slice(0, 3), u = gbUnread(); return `${ls.map(g => `<button class="ss-hp-gbline" data-act="hpwall" title="방명록 열기"><b>${esc(g.who)}</b> ${esc(g.text)}</button>`).join('') || '<p class="ss-hp-note">아직 아무도 다녀가지 않았어요.</p>'}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="hpwall"><i class="fa-solid fa-pen-to-square"></i> 방명록 열기${u ? ` <b class="ss-wv-new">새 글 ${u}</b>` : ''}</button></div>`; } catch (e) { ssNote('wave guest win', e); return ''; } },
};
app.hpFriendFoot = () => ''; // (방명록은 이제 제 창이 있다)

function pageHTML(name) {
    const p = personPage(name); if (!p) return `<p class="ss-hint">이 사람의 홈피를 찾지 못했어요.</p>`;
    const il = ilchonOf(p.name), r = p.rel, AX = p.axes ?? { aff: '애정', trust: '우정' }, others = visitable().filter(v => v.name !== p.name).slice(0, 12);
    return `<div class="ss-wv-head">${avatar(p.name)}<div><h3>${esc(p.name)}${p.emoji ? ` ${esc(p.emoji)}` : ''}</h3><p class="ss-wv-il"><small>${esc(p.name)} → 나</small> ${il?.text ? `「${esc(il.text)}」${il.stale ? ' <small>(사이가 달라졌어요 — 새로 받아 볼까요?)</small>' : ''}` : '<small>아직 없어요</small>'}</p><p class="ss-wv-il mine"><small>나 → ${esc(p.name)}</small> ${myIlchonOf(p.name) ? `「${esc(myIlchonOf(p.name))}」` : '<small>아직 없어요</small>'}</p></div></div>
        <div class="ss-row-btns">${gbOn() ? `<button class="ss-btn sm" data-wv="ilchon" title="${esc(p.name)}이(가) 나에게 붙이는 한마디를 받아요">${ai1} 일촌평 받기</button><button class="ss-btn sm" data-wv="guest" title="${esc(p.name)}이(가) 내 홈피에 와서 한 줄 남겨요">${ai1} ${esc(p.name)}에게 방명록 받기</button>` : ''}<button class="ss-btn sm ghost" data-wv="iledit" title="${esc(p.name)}이(가) 나에게 붙인 한마디를 내가 직접 적어요">받은 일촌평 고치기</button><button class="ss-btn sm" data-wv="myil"><i class="fa-solid fa-pen"></i> 내가 일촌평 붙이기</button></div>
        ${gbOn() ? '' : '<p class="ss-hint">일촌평 · 방명록을 AI로 받으려면 관리 › 쓸 기능 › 부가 기능에서 「방명록 · 일촌평 받기」를 켜요.</p>'}
        ${r ? sec('사이', `<div class="ss-wv-grid">${kv('관계', r.label)}${kv('단계', r.stageName)}${kv(AX.aff, r.noLove ? '꺼 둠' : String(r.aff))}${kv(AX.trust, String(r.trust))}${kv('처음 만난 날', r.met)}${r.jealous >= 30 ? kv('질투', `${r.jealous}/100`) : ''}${kv('지금 있는 곳', p.where)}</div>${r.memo ? `<p class="ss-hint">${esc(r.memo)}</p>` : ''}${p.recent.length ? `<p class="ss-hint">최근: ${p.recent.map(x => `${esc(x.today ? '오늘' : x.date)} ${signed(x.delta)}`).join(' · ')}</p>` : ''}`) : ''}
        ${p.profile?.summary || p.profile?.fields?.length ? sec('소개', `${p.profile.summary ? `<p>${esc(p.profile.summary)}</p>` : ''}<div class="ss-wv-grid">${(p.profile.fields ?? []).slice(0, 8).map(f => kv(f.k, f.v)).join('')}</div>`) : ''}
        ${p.mind || p.taste?.likes || p.taste?.dislikes || p.taste?.concern ? sec('속마음 · 취향', `<div class="ss-wv-grid">${kv('속마음', p.mind?.text)}${kv('좋아하는 것', p.taste?.likes)}${kv('싫어하는 것', p.taste?.dislikes)}${kv('요즘 신경 쓰는 것', p.taste?.concern)}</div>`) : ''}
        ${p.life.length ? sec('요즘', p.life.map(x => `<p>${x.date ? `<small>${esc(x.date)}</small> ` : ''}${esc(x.text)}</p>`).join('')) : ''}
        ${p.sns.length ? sec('SNS', p.sns.map(x => `<p>${esc(x.text)}${x.tags ? ` <small>${esc(x.tags)}</small>` : ''}</p>`).join('')) : ''}
        ${p.contact?.last ? sec('마지막 연락', `<p><small>${p.contact.last.from === 'me' ? '나' : esc(p.name)}:</small> ${esc(p.contact.last.text)}</p>`) : ''}
        ${p.pairs.length ? sec('인맥', `<div class="ss-row-btns">${p.pairs.map(x => `<button class="ss-btn sm ghost" data-wv="go:${esc(x.with)}">${esc(x.with)}${x.label ? ` · ${esc(x.label)}` : ''}${Number.isFinite(x.aff) ? ` ${signed(x.aff)}` : ''}</button>`).join('')}</div>`) : ''}
        ${p.guestbook.length ? sec(`${esc(p.name)}이(가) 내 홈피에 남긴 글`, p.guestbook.map(g => note(g)).join('')) : ''}
        ${gbOn() ? sec(`${esc(p.name)}의 방명록 <small>내가 남긴 글 · 본편에는 안 가요</small>`, `<div class="ss-row-btns"><button class="ss-btn sm pri" data-wv="mynote"><i class="fa-solid fa-pen-to-square"></i> 방명록 남기기</button></div>${myNotes(p.name).map(n => `<div class="ss-wv-note mine" data-id="${esc(n.id)}"><div><b>나</b> <small>${esc(n.date ?? '')}</small></div><p>${esc(n.text)}</p>${n.reply ? `<p class="re">↳ <b>${esc(p.name)}</b> ${esc(n.reply)}</p>` : ''}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-wv="noterep:${esc(n.id)}">${ai1} ${n.reply ? '답글 다시 받기' : '답글 받기'}</button><button class="ss-btn sm ghost" data-wv="notedel:${esc(n.id)}"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('') || '<p class="ss-hint">아직 남긴 글이 없어요.</p>'}`) : ''}
        ${others.length ? sec('🌊 파도타기', `<div class="ss-row-btns">${others.map(v => `<button class="ss-btn sm ghost" data-wv="go:${esc(v.name)}">${esc(v.name)}</button>`).join('')}</div>`) : ''}`;
}
function wallHTML() {
    const list = wall(), tc = todayCount();
    return `<h3>📝 내 홈피 방명록</h3><p class="ss-hint">인물들이 내 홈피에 와서 남기고 간 글이에요. TODAY ${tc.today} · TOTAL ${tc.total}</p>
        <div class="ss-row-btns">${gbOn() ? `<button class="ss-btn sm pri" data-wv="guest" title="누군가 한 명이 와서 한 줄 남겨요">${ai1} 누군가에게 방명록 받기</button>` : ''}</div>
        ${list.map(g => note(g)).join('') || '<p class="ss-hint">아직 아무도 다녀가지 않았어요.</p>'}`;
}
// 팝업 하나에서 사람을 갈아타며 본다. who가 없으면 방명록
async function openBox(who) {
    const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-wave';
    let cur = who || null;
    // 🌐 화면 번역: 그린 뒤 사전에 있는 글은 바로 한국어로, 새로 받은 글(영어)은 번역을 걸어 둔다 (끝나면 화면이 다시 훑어진다)
    const draw = () => { try { box.innerHTML = cur ? pageHTML(cur) : wallHTML(); } catch (e) { box.innerHTML = `<p class="ss-hint">그리지 못했어요: ${esc(e?.message ?? e)}</p>`; } try { translateView(box); } catch (e) { ssNote('wave tr', e); } };
    const after = () => { draw(); try { app.rerenderPanels?.(true); scheduleFill(); } catch (e) { ssNote('wave rerender', e); } };
    box.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-wv]'); if (!b || b.disabled) return;
        const [k, ...rest] = b.dataset.wv.split(':'), arg = rest.join(':');
        try {
            if (k === 'go') { cur = arg; draw(); box.scrollTop = 0; box.closest('.popup-content, dialog')?.scrollTo?.(0, 0); return; }
            if (k === 'ilchon' || k === 'guest') { b.disabled = true; b.classList.add('busy'); try { if (k === 'ilchon') await ilchonWrite(cur); else await gbWrite(cur || ''); } finally { b.disabled = false; b.classList.remove('busy'); } after(); return; }
            if (k === 'iledit') { const t = await askInput('일촌평', `${cur}이(가) 나에게 붙인 한마디 (비우면 지워요)`, ilchonOf(cur)?.text ?? ''); if (t === null) return; ilchonSet(cur, t); after(); return; }
            if (k === 'reply') { const g = gbList().find(x => x.id === arg); if (!g) return; const t = await askInput('답글', `${g.who}의 글에 답글 (비우면 지워요)`, g.reply ?? ''); if (t === null) return; gbReply(arg, t); after(); return; }
            if (k === 'del') { gbDelete(arg); after(); return; }
            if (k === 'myil') { const t = await askInput('내가 붙이는 일촌평', `내가 ${cur}에게 붙이는 한마디 (비우면 지워요)`, myIlchonOf(cur)); if (t === null) return; setMyIlchon(cur, t); after(); return; }
            if (k === 'mynote') { const t = await askInput('방명록 남기기', `${cur}의 홈피에 남길 글`, ''); if (!t || !t.trim()) return; sendNote(cur, t); after(); return; }
            if (k === 'noterep') { b.disabled = true; b.classList.add('busy'); try { await noteReplyAI(arg); } finally { b.disabled = false; b.classList.remove('busy'); } after(); return; }
            if (k === 'notedel') { deleteMyNote(arg); after(); }
        } catch (err) { toastr.error(esc(err?.message ?? String(err)), TITLE); }
    });
    draw();
    if (!cur) { try { gbSeen(); } catch (e) { ssNote('wave seen', e); } }
    return popup(box, { large: true });
}
// 📝 방명록 탭 (사람 묶음): 내 홈피에 온 글 · 내가 남긴 글 · 파도타기 — 팝업을 안 열고도 본다
const tabNote = (g) => `<div class="ss-wv-note" data-id="${esc(g.id)}"><div><b>${esc(g.who)}</b> <small>${esc(g.date ?? '')}${g.kind === 'scribble' ? ' · 낙서' : ''}</small></div><p>${esc(g.text)}</p>${g.reply ? `<p class="re">↳ ${esc(g.reply)}</p>` : ''}${g.kind === 'scribble' ? '' : `<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="gbreply" data-arg="${esc(g.id)}">${g.reply ? '답글 고치기' : '답글'}</button><button class="ss-btn sm ghost" data-act="gbdel" data-arg="${esc(g.id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></div>`}</div>`;
app.hpGuestTab = () => {
    try {
        const tc = todayCount(), got = wall(), sent = myNotes(), ppl = visitable().slice(0, 16);
        return `<div class="ss-wave ss-wv-tab"><p class="ss-hint"><b>TODAY</b> ${tc.today} · <b>TOTAL</b> ${tc.total} — 인물들이 내 홈피에 남기고 간 글이에요. 본편 AI에게는 가지 않아요.</p>
            <div class="ss-row-btns"><button class="ss-btn pri" data-act="gbget">${ai1} 누군가에게 방명록 받기</button></div>
            ${sec(`내 홈피에 온 글 <small>${got.length}</small>`, got.map(tabNote).join('') || '<p class="ss-hint">아직 아무도 다녀가지 않았어요.</p>')}
            ${sec(`내가 남긴 글 <small>${sent.length}</small>`, sent.map(n => `<div class="ss-wv-note mine"><div><b>나 → ${esc(n.to)}</b> <small>${esc(n.date ?? '')}</small></div><p>${esc(n.text)}</p>${n.reply ? `<p class="re">↳ <b>${esc(n.to)}</b> ${esc(n.reply)}</p>` : ''}<div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="hpwave" data-arg="${esc(n.to)}">${esc(n.to)}의 홈피로</button></div></div>`).join('') || '<p class="ss-hint">남의 홈피에 글을 남기려면 아래에서 그 사람 홈피로 가요.</p>')}
            ${ppl.length ? sec('🌊 파도타기', `<div class="ss-row-btns">${ppl.map(v => `<button class="ss-btn sm ghost" data-act="hpwave" data-arg="${esc(v.name)}">${esc(v.name)}</button>`).join('')}</div>`) : ''}</div>`;
    } catch (e) { ssNote('guest tab', e); return '<p class="ss-hint">방명록을 그리지 못했어요.</p>'; }
};
const tabDone = () => { try { app.rerenderPanels?.(true); scheduleFill(); } catch (e) { ssNote('guest tab', e); } };
export const openWave = (name) => openBox(name);
export const openWall = () => openBox(null);
// 단추 연결 (shell.js가 모르는 data-act는 여기서 찾는다)
app.extraActions = { ...(app.extraActions ?? {}),
    gbget: async (el, arg, btn) => { if (!gbOn()) return; if (btn) { btn.disabled = true; btn.classList.add('busy'); } try { await gbWrite(''); } catch (e) { toastr.error(esc(e?.message ?? String(e)), TITLE); } finally { if (btn) { btn.disabled = false; btn.classList.remove('busy'); } } try { gbSeen(); } catch (e) { ssNote('guest seen', e); } tabDone(); },
    gbreply: async (el, arg) => { const g = gbList().find(x => x.id === arg); if (!g) return; const t = await askInput('답글', `${g.who}의 글에 답글 (비우면 지워요)`, g.reply ?? ''); if (t === null) return; gbReply(arg, t); tabDone(); },
    gbdel: (el, arg) => { gbDelete(arg); tabDone(); },
    hpwave: (el, arg) => { if (waveOn()) return openWave(arg); }, hpwall: () => { if (waveOn()) return openWall(); } };
