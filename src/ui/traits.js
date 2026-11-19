// 🧬 특성 · 야망 · 별자리 · 지금 원하는 것 · 궁합 — 전부 상태창 안의 중간값 (본편엔 결과만)
import { app, getMeta, saveMeta } from '../base/st.js';
import { esc, signed, num } from '../base/util.js';
import { TRAITS, TRAIT_CATS, traitOf, signOf, ELEMENT_KO, ASPIRES, ASPIRE_CATS, aspireOf, aspireSteps, SIGN_TRAIT, CUSTOM_FX, CUSTOM_CON, WHEN, CUSTOM_MAX, conflictOf, customTraits, syncCustomTraits, normCustomTrait, normCustomAspire, traitCompat } from '../../data/traits.js';
import { wantsOf, matchOf, myTraits, traitOn } from '../rules/engine.js';
import { normBook, personOf } from '../rules/book.js';
import { sheet, form, toast, btn } from './kit.js';

const NEED_KO = { hunger: '허기', energy: '에너지', hygiene: '위생', mood: '기분' };
const x2 = (n) => `×${Math.round(n * 100) / 100}`;
// 효과를 짧은 칩 글로 (숫자는 상태창 안에서만)
export const fx = (t) => [
    ...Object.entries(t.dice ?? {}).map(([k, v]) => `🎲 ${k} ${signed(v)}`),
    ...Object.entries(t.rate ?? {}).map(([k, v]) => `${NEED_KO[k] ?? k} ${v < 1 ? '천천히' : '빨리'} 줄어듦`),
    t.aff && `💗 애정 ${x2(t.aff)}`, t.affDown && `💔 애정 깎임 ${x2(t.affDown)}`, t.trust && `🤝 우정 ${x2(t.trust)}`, t.trustDown && `💢 우정 깎임 ${x2(t.trustDown)}`,
    t.early && `💗 애정 60 전 ${x2(t.early)}`, t.late && `💗 애정 60 뒤 ${x2(t.late)}`, t.one && `💍 가장 가까운 한 명 ${x2(t.one)}`,
    t.allure && `✨ 궁합 가중치 +${t.allure}`, t.cold && '🧱 상대가 덜 끌림', t.jealousy && `💢 질투 부름 ${x2(t.jealousy)}`, t.jealousSelf && `😒 질투 타격 ${x2(t.jealousSelf)}`,
    t.joy?.up && `😇 우정 오르면 기분 +${t.joy.up}`, t.joy?.down && `🦹 사이 틀어지면 기분 +${t.joy.down}`, t.giftMul && `🎁 선물 ${x2(t.giftMul)}`, t.roam && `🗺 장소 옮기면 기분 +${t.roam}`,
    t.crowd > 0 && '👥 함께면 기분 덜 줆', t.crowd < 0 && '🌙 혼자면 기분 덜 줆', t.neat && '🧽 위생 낮으면 기분 빨리 줆', t.shy && '🙈 처음엔 느리게 · 가까워지면 빠르게', t.erratic && '🎭 4시간마다 기분 속도 바뀜',
    t.sleep && `😴 잠 회복 ${x2(t.sleep)}`, t.rest && `🛏 쉬기 ${x2(t.rest)}`, t.homeRest && `🏠 집에서 쉬기 ${x2(t.homeRest)}`, t.workCost && `💼 일 피로 ${x2(t.workCost)}`, t.workPay && `💵 일한 값 ${x2(t.workPay)}`, t.aspBonus && `⭐ 야망 보상 ${x2(t.aspBonus)}`,
    t.price && `🛒 값 ${x2(t.price)}`, t.buyMood && `🛍 사면 기분 +${t.buyMood}`, t.food && `🍞 음식 ${x2(t.food)}`, t.foodMood && `😋 먹으면 기분 +${t.foodMood}`, t.bgmMood && '🎧 곡이 흐르면 기분 덜 줆',
    t.luck && `🍀 운세 두 번 굴려 ${t.luck === 'best' ? '좋은' : '나쁜'} 쪽`, t.wx && `🌤 「${t.wx.split('|')[0]}」 날씨에 기분 · 판정 +`, t.wxBad && `🌫 「${t.wxBad.split('|')[0]}」 날씨엔 −`, t.noFumble && '🎲 대실패 → 실패', t.fumble && `🎲 대실패 1~${t.fumble}`,
    t.when && t.when !== 'always' && `⏱ ${WHEN.find(w => w[0] === t.when)?.[1]}만`,
].filter(Boolean);
const card = (t, act, on = false, off = '') => `<button class="ml-trait${on ? ' on' : ''}${off ? ' off' : ''}" data-act="${act}" data-v="${t.id}"${off ? ` title="${esc(off)}"` : ''}><i>${t.icon}</i><b>${esc(t.name)}${t.custom ? ' <u>나만의</u>' : ''}</b><small>${esc(off || t.desc)}</small><em>${esc(fx(t).slice(0, 3).join(' · '))}</em></button>`;

export function traitsView(r) {
    const { book, S } = r; syncCustomTraits(book.me.customTraits);
    const mine = myTraits(book), sign = signOf(book.me.day), asp = aspireOf(book.me.aspire, book);
    let h = `<h4 class="ml-h4">내 특성 <span>3개까지 · 누르면 빼기</span></h4><div class="ml-traits">${mine.map(t => card(t, 'tr-del', traitOn(t, book, S), traitOn(t, book, S) ? '' : `⏱ 지금은 꺼짐 — ${WHEN.find(w => w[0] === t.when)?.[1]}만 켜져요`)).join('')}${mine.length < 3 ? '<button class="ml-trait add" data-act="tr-pick"><i>＋</i><b>특성 고르기</b><small>감정 · 연애 · 사교 · 취미 · 생활 · 나만의 특성</small></button>' : ''}</div>`;
    const eff = mine.filter(t => traitOn(t, book, S)).flatMap(fx);
    if (eff.length) h += `<div class="ml-chips">${eff.map(e => `<span class="ml-chip">${esc(e)}</span>`).join('')}</div>`;
    h += `<h4 class="ml-h4">별자리</h4><div class="ml-rl tap" data-act="tr-day"><i>${sign?.icon ?? '❔'}</i>${sign ? `<b>${sign.name}</b> <span>${ELEMENT_KO[sign.el]} · 생일 ${esc(book.me.day)}</span>` : '<span>생일을 적으면 별자리가 정해져요</span>'}</div>`;
    // 야망
    if (asp) {
        const steps = aspireSteps(asp, book), v = asp.val(S, book), k = steps.filter(x => v >= x).length, next = steps[k];
        h += `<h4 class="ml-h4">야망</h4><div class="ml-rc"><div class="ml-rc-h"><span class="ml-face">${asp.icon}</span><b>${esc(asp.name)}</b><span class="ml-pill love">${k}/${steps.length}단계</span><span class="ml-sp"></span>${asp.manual ? `${btn('−1', 'tr-asp-tick', '-1', 'xs')}${btn('+1 했어요', 'tr-asp-tick', '1', 'xs')}` : ''}${btn('바꾸기', 'tr-asp', '', 'xs')}</div><div class="ml-rl dim"><i>📝</i>${esc(asp.desc)}</div><div class="ml-steps3">${steps.map((x, j) => `<span class="${j < k ? 'done' : j === k ? 'on' : ''}">${Math.round(x)}</span>`).join('')}</div><div class="ml-rl"><i>📈</i>${esc(asp.unit)} ${Math.round(v)}${next != null ? ` <span>→ 다음 ${Math.round(next)}</span>` : ' <span>다 이뤘어요!</span>'}</div><div class="ml-rl dim"><i>🎁</i>단계마다 기분 +${Math.round(10 * mine.reduce((a, t) => a * (t.aspBonus ?? 1), 1))} · 하루 동안 「뿌듯함」 🎲+1</div></div>`;
    } else h += `<h4 class="ml-h4">야망</h4><div class="ml-scene tap" data-act="tr-asp"><i>⭐</i><span><b>야망 고르기</b><small>${ASPIRES.length}가지 · 사랑 · 사람 · 돈 · 경험 · 삶 · 나만의 야망</small></span><em>›</em></div>`;
    // 지금 원하는 것
    const W = wantsOf(book, S);
    h += `<h4 class="ml-h4">지금 원하는 것 <span>이루면 기분 +8 · 이야기 속 몇 시간마다 바뀌어요</span></h4>${W.length ? `<div class="ml-doable">${W.map(w => `<button class="ml-do" data-act="say" data-v="${esc(w.say)}"><i>${w.icon}</i><span><b>${esc(w.text)}</b><small>${esc(w.srcName)} · 누르면 입력창에</small></span></button>`).join('')}</div>` : '<div class="ml-rl dim"><i>·</i>지금은 바라는 게 없어요</div>'}`;
    // 궁합
    const ppl = book.people.filter(p => !S.rel[p.name]?.gone);
    if (ppl.length) h += `<h4 class="ml-h4">궁합 <span>💗 애정 · 🤝 우정이 오르는 폭에 곱해져요</span></h4>${ppl.map(p => { const m = matchOf(book, p.name); const cls = (n) => (n > 1 ? 'pos' : n < 1 ? 'neg' : ''); return `<div class="ml-match tap" data-act="tr-person" data-v="${esc(p.name)}"><span class="ml-face">${p.face}</span><span class="ml-tx"><b>${esc(p.name)} ${m.sign ? `<small>${m.sign.icon} ${m.sign.name}</small>` : ''}</b><small>${(p.traits ?? []).map(id => traitOf(id)).filter(Boolean).map(t => `${t.icon}${esc(t.name)}`).join(' · ') || '특성 없음'}${m.tc.why.length ? ` · ${esc(m.tc.why.join(', '))}` : ''}${m.sc.word ? ` · 별자리 ${m.sc.word}` : ''}</small>${m.tc.opp.map(o => `<small class="ml-opp">⇄ 반대가 끌림 — ${esc(o.text)}</small>`).join('')}</span><em class="${cls(m.mul)}">💗${x2(m.mul)}</em><em class="${cls(m.mulT)}">🤝${x2(m.mulT)}</em></div>`; }).join('')}`;
    return h;
}

// 나만의 특성 만들기 · 고치기
async function editCustom(b, id = '') {
    const L = b.me.customTraits ?? [], cur = L.find(c => c.id === id);
    if (!cur && L.length >= CUSTOM_MAX) { toast(`나만의 특성은 ${CUSTOM_MAX}개까지예요`, 'bad'); return false; }
    const fv = await form(cur ? '🔖 나만의 특성 고치기' : '🔖 나만의 특성 만들기', [
        { k: 'icon', label: '아이콘', v: cur?.icon ?? '🔖', chips: ['🔖', '🌸', '🔥', '🐺', '🍵', '🎻', '🗡️', '👑'] },
        { k: 'name', label: '이름 (10자)', v: cur?.name ?? '', ph: '고양이 집사' },
        { k: 'desc', label: '설명 (40자 · 상태창에만 보여요)', v: cur?.desc ?? '', ph: '고양이만 보면 마음이 풀려요' },
        { k: 'fx', label: '효과 (하나만)', type: 'pick', v: cur?.fx ?? 'mood', opts: CUSTOM_FX.map(f => [f.id, f.name]) },
        { k: 'attr', label: '판정 보너스면 — 능력치', v: cur?.attr ?? '', ph: '힘 · 민첩 · 지능 · 매력 · 감각', chips: b.me.attrs.map(a => a.name) },
        { k: 'pow', label: '세기', type: 'pick', v: String(cur?.pow ?? 1), opts: [['1', '약'], ['2', '강 (조건이나 단점 필요)']] },
        { k: 'when', label: '언제 켜질까', type: 'pick', v: cur?.when ?? 'always', opts: WHEN },
        { k: 'con', label: '단점', type: 'pick', v: cur?.con ?? '', opts: CUSTOM_CON.map(c => [c.id, c.name]) },
    ], { ok: cur ? '고치기' : '만들기', extra: '<div class="ml-hint">📏 조건 · 효과는 정해진 목록에서 하나만 계산돼요. 「강」은 「언제」를 항상이 아닌 걸로 정하거나 단점을 하나 붙여야 켜져요 (아니면 「약」으로 바뀌어요).<br>⚠ 이름 · 설명은 AI에게 가지 않는 상태창 속 값이라 이야기 속 성격에는 잘 안 드러날 수 있어요. 성격으로 보이게 하려면 설정집 「나 · 성격 한 줄」에도 적어 주세요.</div>' });
    if (!fv) return false;
    if (!fv.name.trim()) { toast('이름을 적어 주세요', 'bad'); return false; }
    const n = normCustomTrait({ id: cur?.id, icon: fv.icon, name: fv.name, desc: fv.desc, fx: fv.fx, attr: fv.attr, pow: Number(fv.pow), when: fv.when, con: fv.con });
    if (Number(fv.pow) === 2 && n.pow === 1) toast('조건이나 단점이 없어서 「약」으로 만들었어요', 'mid');
    if (n.attr && !b.me.attrs.some(a => a.name === n.attr)) toast(`「${n.attr}」 능력치가 설정집에 없어서 계산이 안 될 수 있어요`, 'bad');
    b.me.customTraits = cur ? L.map(c => (c.id === cur.id ? n : c)) : [...L, n];
    return n.id;
}

// 고르기 시트
export async function traitAct(act, v) {
    const meta = getMeta(), b = meta.book;
    const save = () => { meta.book = normBook(b); meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true); };
    if (act === 'tr-del') { b.me.traitIds = (b.me.traitIds ?? []).filter(x => x !== v); return save(); }
    if (act === 'tr-pick') {
        syncCustomTraits(b.me.customTraits);
        const cur = b.me.traitIds ?? [], C = customTraits();
        const one = (t) => { const c = conflictOf(t.id, cur.filter(x => x !== t.id)); return card(t, 'tr-add', cur.includes(t.id), c ? `「${traitOf(c)?.name}」와(과) 함께 못 가져요` : ''); };
        sheet('🧬 특성 고르기', `<div class="ml-hint">심즈처럼 3개까지 · 서로 반대인 특성은 함께 못 가져요 · 효과는 상태창 계산에만 쓰여요</div>${TRAIT_CATS.map(([c, n]) => `<h4 class="ml-h4">${n}</h4><div class="ml-traits sm">${TRAITS.filter(t => t.cat === c).map(one).join('')}</div>`).join('')}
            <h4 class="ml-h4">🔖 나만의 특성 <span>${C.length}/${CUSTOM_MAX} · 정해진 효과 하나 + 조건</span></h4><div class="ml-traits sm">${C.map(one).join('')}<button class="ml-trait add" data-act="tr-cnew"><i>＋</i><b>만들기</b><small>효과 하나 · 켜지는 조건 · 단점</small></button></div>
            ${C.length ? `<div class="ml-chips">${C.map(t => `<span class="ml-chip tap" data-act="tr-cedit" data-v="${t.id}">✏️ ${t.icon}${esc(t.name)}</span><span class="ml-chip bad tap" data-act="tr-cdel" data-v="${t.id}">🗑</span>`).join('')}</div>` : ''}`);
        return;
    }
    if (act === 'tr-add') {
        const L = b.me.traitIds ?? []; if (L.includes(v)) return; if (L.length >= 3) { toast('특성은 3개까지예요', 'bad'); return; }
        const c = conflictOf(v, L); if (c) { toast(`「${traitOf(c)?.name}」와(과) 반대라 함께 못 가져요`, 'bad'); return; }
        b.me.traitIds = [...L, v]; document.querySelector('.ml-bs')?.remove(); toast(`${traitOf(v).icon} ${traitOf(v).name}`); return save();
    }
    if (act === 'tr-cnew' || act === 'tr-cedit') { const id = await editCustom(b, act === 'tr-cedit' ? v : ''); if (!id) return; save(); return traitAct('tr-pick'); }
    if (act === 'tr-cdel') { const t = traitOf(v); b.me.customTraits = (b.me.customTraits ?? []).filter(c => c.id !== v); b.me.traitIds = (b.me.traitIds ?? []).filter(x => x !== v); for (const p of b.people) p.traits = (p.traits ?? []).filter(x => x !== v); toast(`🗑 ${t?.name ?? ''} 지웠어요`); save(); return traitAct('tr-pick'); }
    if (act === 'tr-day') { const fv = await form('🎂 내 생일', [{ k: 'day', label: '생일', v: b.me.day, ph: '3월 14일' }]); if (!fv) return; b.me.day = fv.day.trim(); return save(); }
    if (act === 'tr-asp') {
        const c = b.me.aspireCustom;
        sheet('⭐ 야망 고르기', `<div class="ml-hint">평생 목표 하나 · 단계를 넘을 때마다 기분 + 「뿌듯함」 · 「지금 원하는 것」에도 나와요</div>${ASPIRE_CATS.map(([k, n]) => `<h4 class="ml-h4">${n}</h4><div class="ml-traits sm">${ASPIRES.filter(a => a.cat === k).map(a => `<button class="ml-trait${b.me.aspire === a.id ? ' on' : ''}" data-act="tr-asp-set" data-v="${a.id}"><i>${a.icon}</i><b>${esc(a.name)}</b><small>${esc(a.desc)}</small><em>${esc(a.unit)} ${aspireSteps(a, b).map(Math.round).join('→')}</em></button>`).join('')}</div>`).join('')}
            <h4 class="ml-h4">🎯 나만의 야망 <span>셀 것을 하나 골라야 저절로 올라요</span></h4><div class="ml-traits sm">${c ? `<button class="ml-trait${b.me.aspire === 'custom' ? ' on' : ''}" data-act="tr-asp-set" data-v="custom"><i>${c.icon}</i><b>${esc(c.name)}</b><small>${esc(c.desc || '나만의 야망')}</small><em>${esc(aspireOf('custom', b)?.unit ?? '')} ${c.steps.join('→')}</em></button>` : ''}<button class="ml-trait add" data-act="tr-asp-new"><i>${c ? '✏️' : '＋'}</i><b>${c ? '고치기' : '만들기'}</b><small>이름 · 무엇으로 셀지 · 단계</small></button></div>
            ${b.me.aspire ? `<div class="ml-chips"><span class="ml-chip bad tap" data-act="tr-asp-set" data-v="">야망 없애기</span></div>` : ''}`);
        return;
    }
    if (act === 'tr-asp-set') { b.me.aspire = v; document.querySelector('.ml-bs')?.remove(); if (v) toast(`${aspireOf(v, b)?.icon ?? '⭐'} ${aspireOf(v, b)?.name ?? ''}`); return save(); }
    if (act === 'tr-asp-new') {
        const c = b.me.aspireCustom;
        const fv = await form('🎯 나만의 야망', [
            { k: 'icon', label: '아이콘', v: c?.icon ?? '🎯', chips: ['🎯', '🏆', '🗡️', '🎻', '🏰', '🌍', '📖', '🐉'] },
            { k: 'name', label: '이름 (12자)', v: c?.name ?? '', ph: '최고의 기사' },
            { k: 'desc', label: '한 줄 설명', v: c?.desc ?? '', ph: '왕국 제일의 검이 되기' },
            { k: 'base', label: '무엇으로 셀까 (조건)', type: 'pick', v: c?.base ?? 'manual', opts: [['manual', '✋ 직접 체크'], ...ASPIRES.map(a => [a.id, `${a.icon} ${a.unit}`])] },
            { k: 'steps', label: '단계 (작은 수부터 · 쉼표로)', v: (c?.steps ?? [1, 3, 5, 10]).join(', '), ph: '1, 3, 5, 10' },
        ], { ok: '저장', extra: '<div class="ml-hint">📏 「무엇으로 셀까」를 고르면 그 숫자로 저절로 올라가요 (돈은 실제 금액 그대로). 「직접 체크」는 상태창에서 +1을 눌러야 올라요.<br>⚠ 이야기 속에서 이룬 일을 AI가 알아서 세 주지는 않아서, 셀 것을 안 고르면 적용이 잘 안 될 수 있어요.</div>' });
        if (!fv) return; if (!fv.name.trim()) { toast('이름을 적어 주세요', 'bad'); return; }
        b.me.aspireCustom = normCustomAspire({ ...fv, n: c?.n ?? 0 }); b.me.aspire = 'custom'; document.querySelector('.ml-bs')?.remove(); toast(`${b.me.aspireCustom.icon} ${b.me.aspireCustom.name}`); return save();
    }
    if (act === 'tr-asp-tick') { const c = b.me.aspireCustom; if (!c) return; c.n = Math.max(0, num(c.n) + Number(v)); return save(); }
    if (act === 'tr-person') {
        const p = personOf(b, v); if (!p) return;
        syncCustomTraits(b.me.customTraits);
        const opts = [['', '없음'], ...[...TRAITS, ...customTraits()].map(t => [t.id, `${t.icon} ${t.name}`])];
        const tc = traitCompat(b.me.traitIds, p.traits ?? []);
        const fv = await form(`${p.face} ${esc(p.name)}의 특성`, [{ k: 'day', label: '생일', v: p.day, ph: '10월 6일 생일' }, ...[0, 1, 2].map(j => ({ k: `t${j}`, label: `특성 ${j + 1}`, type: 'pick', v: p.traits?.[j] ?? '', opts }))], { extra: `${tc.opp.length ? `<div class="ml-hint">${tc.opp.map(o => `⇄ <b>${esc(o.a.name)} · ${esc(o.b.name)}</b> — ${esc(o.text)} (💗 설렘 + · 🤝 생활은 부딪침)`).join('<br>')}</div>` : ''}<div class="ml-hint">별자리가 정해지면 추천: ${(() => { const s = signOf(p.day); return s ? `${s.name} → ${traitOf(SIGN_TRAIT[s.name])?.name}` : '생일을 적어 주세요'; })()}</div>` });
        if (!fv) return;
        p.day = fv.day; p.traits = [...new Set([fv.t0, fv.t1, fv.t2].filter(Boolean))];
        if (!p.traits.length) { const s = signOf(p.day); if (s) p.traits = [SIGN_TRAIT[s.name]]; }
        return save();
    }
}
export const TRAIT_ACTS = new Set(['tr-del', 'tr-pick', 'tr-add', 'tr-cnew', 'tr-cedit', 'tr-cdel', 'tr-day', 'tr-asp', 'tr-asp-set', 'tr-asp-new', 'tr-asp-tick', 'tr-person']);
export { num };
