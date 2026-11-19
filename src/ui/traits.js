// 🧬 특성 · 야망 · 별자리 · 지금 원하는 것 · 궁합 — 전부 상태창 안의 중간값 (본편엔 결과만)
import { app, getMeta, saveMeta } from '../base/st.js';
import { esc, signed, num } from '../base/util.js';
import { TRAITS, TRAIT_CATS, traitOf, signOf, ELEMENT_KO, ASPIRES, aspireOf, aspireSteps, SIGN_TRAIT } from '../../data/traits.js';
import { wantsOf, matchOf, myTraits } from '../rules/engine.js';
import { normBook, personOf } from '../rules/book.js';
import { sheet, form, toast, btn } from './kit.js';

const fx = (t) => [
    ...Object.entries(t.dice ?? {}).map(([k, v]) => `🎲 ${k} ${signed(v)}`),
    ...Object.entries(t.rate ?? {}).map(([k, v]) => `${{ hunger: '허기', energy: '에너지', hygiene: '위생', mood: '기분' }[k] ?? k} ${v < 1 ? '천천히' : '빨리'} 줄어듦`),
    t.aff && `💗 애정 ×${t.aff}`, t.trust && `🤝 우정 ×${t.trust}`, t.sleep && `😴 잠 회복 ×${t.sleep}`, t.rest && `🛏 쉬기 ×${t.rest}`, t.workCost && `💼 일 피로 ×${t.workCost}`,
    t.price && `🛒 값 ×${t.price}`, t.food && `🍞 음식 ×${t.food}`, t.luck && `🍀 운세 두 번 굴려 ${t.luck === 'best' ? '좋은' : '나쁜'} 쪽`, t.wx && `🌤 「${t.wx.split('|')[0]}」 날씨에 기분 · 판정 +`, t.noFumble && '🎲 대실패 → 실패', t.fumble && `🎲 대실패 1~${t.fumble}`,
].filter(Boolean);

export function traitsView(r) {
    const { book, S } = r, mine = myTraits(book), sign = signOf(book.me.day), asp = aspireOf(book.me.aspire);
    let h = `<h4 class="ml-h4">내 특성 <span>3개까지 · 누르면 빼기</span></h4><div class="ml-traits">${mine.map(t => `<button class="ml-trait on" data-act="tr-del" data-v="${t.id}"><i>${t.icon}</i><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}${mine.length < 3 ? '<button class="ml-trait add" data-act="tr-pick"><i>＋</i><b>특성 고르기</b><small>감정 · 취미 · 생활 · 사교</small></button>' : ''}</div>`;
    const eff = mine.flatMap(fx);
    if (eff.length) h += `<div class="ml-chips">${eff.map(e => `<span class="ml-chip">${esc(e)}</span>`).join('')}</div>`;
    h += `<h4 class="ml-h4">별자리</h4><div class="ml-rl tap" data-act="tr-day"><i>${sign?.icon ?? '❔'}</i>${sign ? `<b>${sign.name}</b> <span>${ELEMENT_KO[sign.el]} · 생일 ${esc(book.me.day)}</span>` : '<span>생일을 적으면 별자리가 정해져요</span>'}</div>`;
    // 야망
    if (asp) {
        const steps = aspireSteps(asp, book), v = asp.val(S), k = steps.filter(x => v >= x).length, next = steps[k];
        h += `<h4 class="ml-h4">야망</h4><div class="ml-rc"><div class="ml-rc-h"><span class="ml-face">${asp.icon}</span><b>${asp.name}</b><span class="ml-pill love">${k}/${steps.length}단계</span><span class="ml-sp"></span>${btn('바꾸기', 'tr-asp', '', 'xs')}</div><div class="ml-steps3">${steps.map((x, j) => `<span class="${j < k ? 'done' : j === k ? 'on' : ''}">${Math.round(x)}</span>`).join('')}</div><div class="ml-rl"><i>📈</i>${esc(asp.unit)} ${Math.round(v)}${next != null ? ` <span>→ 다음 ${Math.round(next)}</span>` : ' <span>다 이뤘어요!</span>'}</div><div class="ml-rl dim"><i>🎁</i>단계마다 기분 +10 · 하루 동안 「뿌듯함」 🎲+1</div></div>`;
    } else h += `<h4 class="ml-h4">야망</h4><div class="ml-scene tap" data-act="tr-asp"><i>⭐</i><span><b>야망 고르기</b><small>사랑꾼 · 부자 · 인기인 · 탐험가 · 미식 여행 · 수집가</small></span><em>›</em></div>`;
    // 지금 원하는 것
    const W = wantsOf(book, S);
    h += `<h4 class="ml-h4">지금 원하는 것 <span>이루면 기분 +8</span></h4>${W.length ? `<div class="ml-doable">${W.map(w => `<button class="ml-do" data-act="say" data-v="${esc(w.say)}"><i>${w.icon}</i><span><b>${esc(w.text)}</b><small>누르면 입력창에</small></span></button>`).join('')}</div>` : '<div class="ml-rl dim"><i>·</i>지금은 바라는 게 없어요</div>'}`;
    // 궁합
    const ppl = book.people.filter(p => !S.rel[p.name]?.gone);
    if (ppl.length) h += `<h4 class="ml-h4">궁합 <span>관계가 오르는 폭에 곱해져요</span></h4>${ppl.map(p => { const m = matchOf(book, p.name); return `<div class="ml-match tap" data-act="tr-person" data-v="${esc(p.name)}"><span class="ml-face">${p.face}</span><span class="ml-tx"><b>${esc(p.name)} ${m.sign ? `<small>${m.sign.icon} ${m.sign.name}</small>` : ''}</b><small>${(p.traits ?? []).map(id => `${traitOf(id)?.icon}${traitOf(id)?.name}`).join(' · ') || '특성 없음'}${m.tc.why.length ? ` · ${esc(m.tc.why.join(', '))}` : ''}${m.sc.word ? ` · 별자리 ${m.sc.word}` : ''}</small></span><em class="${m.mul > 1 ? 'pos' : m.mul < 1 ? 'neg' : ''}">×${m.mul}</em></div>`; }).join('')}`;
    return h;
}

// 고르기 시트
export async function traitAct(act, v) {
    const meta = getMeta(), b = meta.book;
    const save = () => { meta.book = normBook(b); meta.book.src.from = 'user'; saveMeta(); app.refresh?.(true); };
    if (act === 'tr-del') { b.me.traitIds = (b.me.traitIds ?? []).filter(x => x !== v); return save(); }
    if (act === 'tr-pick') {
        const cur = new Set(b.me.traitIds ?? []);
        sheet('🧬 특성 고르기', TRAIT_CATS.map(([c, n]) => `<h4 class="ml-h4">${n}</h4><div class="ml-traits sm">${TRAITS.filter(t => t.cat === c).map(t => `<button class="ml-trait${cur.has(t.id) ? ' on' : ''}" data-act="tr-add" data-v="${t.id}"><i>${t.icon}</i><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}</div>`).join(''));
        return;
    }
    if (act === 'tr-add') {
        const L = b.me.traitIds ?? []; if (L.includes(v)) return; if (L.length >= 3) { toast('특성은 3개까지예요', 'bad'); return; }
        b.me.traitIds = [...L, v]; document.querySelector('.ml-bs')?.remove(); toast(`${traitOf(v).icon} ${traitOf(v).name}`); return save();
    }
    if (act === 'tr-day') { const fv = await form('🎂 내 생일', [{ k: 'day', label: '생일', v: b.me.day, ph: '3월 14일' }]); if (!fv) return; b.me.day = fv.day.trim(); return save(); }
    if (act === 'tr-asp') { const fv = await form('⭐ 야망', [{ k: 'a', label: '고르기', type: 'pick', v: b.me.aspire, opts: [['', '없음'], ...ASPIRES.map(a => [a.id, `${a.icon} ${a.name}`])] }]); if (!fv) return; b.me.aspire = fv.a; return save(); }
    if (act === 'tr-person') {
        const p = personOf(b, v); if (!p) return;
        const fv = await form(`${p.face} ${esc(p.name)}의 특성`, [{ k: 'day', label: '생일', v: p.day, ph: '10월 6일 생일' }, ...[0, 1, 2].map(j => ({ k: `t${j}`, label: `특성 ${j + 1}`, type: 'pick', v: p.traits?.[j] ?? '', opts: [['', '없음'], ...TRAITS.map(t => [t.id, `${t.icon} ${t.name}`])] }))], { extra: `<div class="ml-hint">별자리가 정해지면 「${'추천'}」: ${(() => { const s = signOf(p.day); return s ? `${s.name} → ${traitOf(SIGN_TRAIT[s.name])?.name}` : '생일을 적어 주세요'; })()}</div>` });
        if (!fv) return;
        p.day = fv.day; p.traits = [...new Set([fv.t0, fv.t1, fv.t2].filter(Boolean))];
        if (!p.traits.length) { const s = signOf(p.day); if (s) p.traits = [SIGN_TRAIT[s.name]]; }
        return save();
    }
}
export const TRAIT_ACTS = new Set(['tr-del', 'tr-pick', 'tr-add', 'tr-day', 'tr-asp', 'tr-person']);
export { num };
