// 🔌 다른 미트볼 확장(미트볼 선택지 등)이 읽는 통로 — 읽기만. 바꾸는 건 늘 본편 답의 사건 태그로.
import { getMeta, saveMeta, ready, VERSION, ctx, msgKey } from '../base/st.js';
import { mode } from '../rules/classify.js';
import { norm, signed, periodName, dateOf, faceOf } from '../base/util.js';
import { fold, derived, diceParts, whereNow, relStage } from '../rules/engine.js';
import { placeOf, personOf, isStar } from '../rules/book.js';
import { luckOf, luckFit } from '../rules/luck.js';
import { addApp, mountApps } from './apps.js';

// 선택지 글 → 대가 미리 보기 (배지 글만) { text: '−3골드 · 허기 +20', ok: false면 흐리게 }
//   먼저 이름으로 맞춘다: 이 가게 물건 → 내 소지품 → 인물 → 장소. 어느 것도 안 맞을 때만 낱말(잠 · 먹 · 씻)로 짐작.
export function preview(label) {
    const r = ready() ? fold() : null; if (!r) return null;
    const { S, book } = r, t = norm(label), out = [], tags = [];
    let ok = true;
    const has = (name) => !!name && t.includes(norm(name));
    const needName = (k) => book.me.needs.find(n => n.key === k)?.name ?? k;
    const fxText = (fx) => Object.entries(fx ?? {}).map(([k, v]) => `${needName(k)} ${signed(v)}`);
    const liked = (thing) => Object.entries(S.rel).filter(([, x]) => !x.gone && x.seen.likes.some(l => norm(thing).includes(norm(l)))).map(([n]) => n);
    // 1) 지금 장소에서 파는 물건
    const here = placeOf(book, S.loc), good = (here?.goods ?? []).find(g => has(g.name));
    if (good) {
        const price = good.price;
        out.push(`−${price}${book.world.currency}`, ...fxText(good.fx));
        if (S.cash < price) { ok = false; out.push('돈 부족'); }
        if (liked(good.name).length) tags.push('🎁');
    }
    // 2) 내 소지품 (먹기 · 쓰기 · 주기)
    const item = !good && S.items.find(it => has(it.name));
    if (item) {
        out.push(...fxText(item.fx));
        if (liked(item.name).length) tags.push('🎁');
    }
    // 3) 인물 (이름 · 다른 이름) — 만날 사람 · 그 사람이 좋아하는 걸 가졌으면 🎁
    const person = book.people.find(p => !S.rel[p.name]?.gone && [p.name, ...(p.aka ?? [])].some(has));
    if (person) {
        const w = S.with.includes(person.name) ? null : whereNow(book, S, person);
        out.push(`${person.face} ${person.name}${w?.place ? ` · ${w.place}` : ''}`);
        if (!tags.includes('🎁') && /(선물|주|건네|gift)/.test(label) && S.items.some(it => liked(it.name).includes(person.name))) tags.push('🎁');
    }
    // 4) 장소 — 가면 만날 사람
    const pl = book.world.places.find(q => q.name !== S.loc && has(q.name));
    if (pl) {
        const who = book.people.filter(p => !S.rel[p.name]?.gone && whereNow(book, S, p)?.place === pl.name).map(p => p.face);
        out.push(`📍${pl.name}${who.length ? ` ${who.join('')}` : ''}`);
    }
    // 5) 아무 이름도 안 맞으면 낱말로 짐작
    if (!out.length) {
        if (/잠|자자|잔다|sleep/.test(label)) out.push(`${needName('energy')} +`);
        else if (/먹|식사|eat/.test(label)) out.push(`${needName('hunger')} +`);
        else if (/씻|샤워|목욕/.test(label)) out.push(`${needName('hygiene')} +`);
    }
    if (!tags.includes('🎁') && /(선물|gift)/.test(label)) tags.push('🎁');
    // 🍀 운세 (오늘 굴렸을 때만)
    const lr = getMeta()?.luckRoll;
    if (lr?.day === Math.floor(S.t / 1440)) { const lk = luckFit(luckOf(book, S, ctx().getCurrentChatId?.(), lr), label); if (lk > 0) tags.unshift('🍀'); if (lk < 0) tags.unshift('⚠'); }
    return out.length || tags.length ? { text: [...tags, ...out].join(' · '), ok } : null;
}
// 지금 상태 요약 (복사본) — 숫자는 선택지 확장 안에서만 쓴다
function state() {
    const r = ready() ? fold() : null; if (!r) return null;
    const { S, book } = r, d = dateOf(book.world.start, S.t);
    return structuredClone({
        t: S.t, date: `${d.mn} ${d.d}일 ${periodName(S.t)}`, loc: S.loc, with: S.with, cash: S.cash, currency: book.world.currency,
        needs: S.needs, gauges: S.gauges, attrs: S.attrs, status: S.status, danger: derived(book, S),
        items: S.items.filter(it => it.n > 0).map(it => ({ name: it.name, n: it.n })), // 소지품 (선물 고르기 등)
    });
}
// 🎬 장면 한 줄용: 지금 장소에서 살 수 있는 것 · 장면 속 인물이 원하는 것(속셈) — 선택지가 장면 줄에 짧게 넣는다
function scene() {
    const r = ready() ? fold() : null; if (!r) return null;
    const { S, book } = r, here = placeOf(book, S.loc);
    const goods = (here?.goods ?? []).map(g => ({ name: g.name, price: g.price }));
    const people = S.with.filter(n => S.rel[n] && !S.rel[n].gone)
        .map(n => ({ name: n, want: S.rel[n].want || personOf(book, n)?.want || '' }));
    return structuredClone({ goods, people });
}
// 👥 인물 목록 (연락 같은 앱용) — ⭐ 주요 인물 먼저 · 떠난 인물 빼고
function people() {
    const r = ready() ? fold() : null; if (!r) return [];
    const { S, book } = r, meta = getMeta();
    return structuredClone(Object.entries(S.rel).filter(([, x]) => !x.gone).map(([name, x]) => {
        const p = personOf(book, name);
        return { name, face: faceOf(x.face || p?.face, '🙂'), star: isStar(meta, book, name), stage: relStage(book, x.aff, name)?.name ?? '', aff: x.aff, trust: x.trust,
            here: S.with.includes(name), likes: x.seen.likes, hates: x.seen.hates, about: p?.line || x.line || '' };
    }).sort((a, b) => b.star - a.star || b.aff - a.aff));
}
// ✋ 앱이 상태에 손대기 (좁은 칸만 · 마지막 AI 답에 손 고침으로 붙음 → 기록에 앱 이름 · 되돌리기 · 리롤 · 삭제를 그대로 따라감)
//   lines: ['cash: -3000 | 송금', 'got: 손편지', 'lost: 우산', 'aff: Law +2 | 다정한 답장', 'trust: Law -1 | 읽씹']
//   허용 키: cash(± 상대값만) · got · lost · aff · trust (한 번에 ±2까지) — 지운 앱 · 눈 감은 앱 · 멈춤 · 이 채팅 끔이면 거절
const ACT_KEYS = new Set(['cash', 'got', 'lost', 'aff', 'trust']);
async function act(lines, why = '', appId = 'app') {
    const meta = getMeta(), r = ready() && !meta?.off && !meta?.paused ? fold() : null; if (!r) return false;
    const { shutKey } = await import('../base/st.js');
    const ok = [];
    for (const raw of Array.isArray(lines) ? lines : [lines]) {
        const ln = String(raw ?? '').trim(), k = ln.slice(0, ln.indexOf(':')).trim().toLowerCase(), v = ln.slice(ln.indexOf(':') + 1).trim();
        if (!ACT_KEYS.has(k) || !v || shutKey(k)) continue;
        if (k === 'cash' && !/^[+\-−]\s*\d/.test(v)) continue; // 돈은 늘이고 줄이기만 (얼마로 「맞추기」 안 됨)
        if (k === 'aff' || k === 'trust') { const m = /^(.*?)\s*([+\-−])\s*(\d+)(.*)$/.exec(v); if (!m) continue; ok.push(`${k}: ${m[1].trim()} ${m[2]}${Math.min(2, Number(m[3]))}${m[4]}`); continue; }
        ok.push(`${k}: ${v}`);
    }
    if (!ok.length) return false;
    const { handLines } = await import('../ui/tools.js');
    return handLines(ok, `${String(appId).slice(0, 16)} · ${String(why ?? '').slice(0, 24)}`, `app:${String(appId).slice(0, 16)}`);
}
// 🎲 선택지 → 분류 모델: 이 사용자 메시지에서 고른 선택과 결과 (주사위 · 대가 · 함정)
//   data를 주면 적어 두고, 안 주면 지금 적힌 것(사용자 메시지 extra.mbc 또는 여기 적힌 것)을 돌려준다
function pendingChoice(i, data) {
    const m = ctx().chat?.[i], meta = getMeta(); if (!m?.is_user || !meta) return null;
    if (data !== undefined) { meta.choices ??= {}; if (data) meta.choices[msgKey(m)] = structuredClone(data); else delete meta.choices[msgKey(m)]; saveMeta(); }
    return structuredClone(m.extra?.mbc ?? meta.choices?.[msgKey(m)] ?? null);
}
export function mount() {
    globalThis.MeatballPhone = globalThis.MeatballLite = Object.freeze({ // 예전 이름(MeatballLite)도 그대로
        version: VERSION,
        ready: () => ready() && !getMeta()?.off, // 이 채팅에서 끈 폰은 없는 것으로 (선택지는 답 밑 목록으로)
        state,
        scene,
        people,
        // 지금 사건 고르기 모드: 'A' 본편 태그 · 'B' 분류 모델 (B면 본편에 「사건 줄을 적어라」를 넣지 않음)
        mode,
        pendingChoice,
        // 🎲 주사위 보정 내역 [{ why, n }] — 능력치 · 욕구 위험 · 상태 딱지(운명 포함) · 착용 장비. 선택지는 여기에 자기 보정만 더한다
        diceParts: (attr = '') => { const r = ready() ? fold() : null; return r ? structuredClone(diceParts(r.book, r.S, attr)) : []; },
        preview,
        // 🍀 오늘 운세 쪽지 + 이 글과 맞는지 (1 · 0 · −1)
        luck: (label = '') => { const r = ready() ? fold() : null; if (!r) return null; const l = luckOf(r.book, r.S, ctx().getCurrentChatId?.(), getMeta()?.luckRoll); if (!l.rolled) return { ...l, fit: 0 }; return { ...l, fit: label ? luckFit(l, label) : 0 }; },
        paused: () => !!getMeta()?.paused,
        // 📲 폰에 앱 넣기 — 앱 쪽은 (globalThis.MeatballPhoneApps ??= []).push({...}) 를 쓰면 켜지는 순서를 신경 안 써도 됨
        addApp,
        act,
    });
    mountApps();
}
export function announce() { document.dispatchEvent(new CustomEvent('meatlite:update')); }
