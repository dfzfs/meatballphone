// ✏️ 편집 — dev처럼 한 화면에서 세세하게: 항목마다 이름 · 아이콘 · 설명 · 시작 값 · 속도 … 다 고치고 · ＋ 추가 · 🗑 빼기
//   「지금 값」을 바꾸면 ✋ 직접 줄로 마지막 답에 붙음 (기록 · 칩 · 가계부엔 안 들어감 · 되돌리기 됨)
//   항목 정의(이름 · 설명 · 규칙)는 설정집에 저장
import { getMeta, saveMeta, app } from '../base/st.js';
import { esc, num, safeKey } from '../base/util.js';
import { sheet, toast } from './kit.js';
import { fold } from '../rules/engine.js';
import { normPerson, normPlace, PLACE_KINDS } from '../rules/book.js';

// ───── 칸 하나 ─────
// type: text | area | num | color | bool | select | tags(쉼표) | lines(한 줄에 하나)
function input(f, v) {
    const a = `data-f="${f.k}"`;
    if (f.type === 'area') return `<textarea class="ml-in" ${a} rows="${f.rows ?? 2}" placeholder="${esc(f.ph ?? '')}">${esc(v ?? '')}</textarea>`;
    if (f.type === 'lines') return `<textarea class="ml-in" ${a} rows="${f.rows ?? 3}" placeholder="${esc(f.ph ?? '')}">${esc((v ?? []).join('\n'))}</textarea>`;
    if (f.type === 'bool') return `<input type="checkbox" ${a} ${v ? 'checked' : ''}>`;
    if (f.type === 'color') return `<input type="color" class="ml-in" ${a} value="${esc(v || '#e5484d')}">`;
    if (f.type === 'select') return `<select class="ml-in" ${a}>${f.opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const val = f.type === 'tags' ? (v ?? []).join(', ') : (v ?? '');
    return `<input class="ml-in" ${a} type="${f.type === 'num' ? 'number' : 'text'}" ${f.type === 'num' ? 'inputmode="decimal" step="any"' : ''} value="${esc(val)}" placeholder="${esc(f.ph ?? '')}">`;
}
const fieldHtml = (f, v) => `<label class="ml-field ml-ed-f${f.type === 'bool' ? ' chk' : ''}${f.wide ? ' wide' : ''}"><span>${f.label}</span>${input(f, v)}${f.hint ? `<small>${f.hint}</small>` : ''}</label>`;
function read(box, f) {
    const el = box.querySelector(`[data-f="${f.k}"]`); if (!el) return undefined;
    if (f.type === 'bool') return el.checked;
    if (f.type === 'num') return el.value.trim() === '' ? null : num(el.value);
    if (f.type === 'tags') return el.value.split(/[,，、]/).map(x => x.trim()).filter(Boolean);
    if (f.type === 'lines') return el.value.split('\n').map(x => x.trim()).filter(Boolean);
    return el.value.trim();
}
// ───── 목록 하나 (접었다 펴는 카드 · ＋ · 🗑) ─────
const itemHtml = (sec, it, idx) => `<details class="ml-ed-it" data-idx="${idx}"${it.__new ? ' open' : ''}><summary><i>${esc(sec.icon?.(it) ?? '•')}</i><b>${esc(sec.title(it) || '(새 항목)')}</b>`
    + `${sec.sub ? `<small>${esc(sec.sub(it) ?? '')}</small>` : ''}<button type="button" class="ml-btn xs ml-ed-del" data-ed="del" title="빼기">🗑</button></summary>`
    + `<div class="ml-ed-fs">${sec.fields.map(f => fieldHtml(f, it[f.k])).join('')}</div></details>`;
const secHtml = (sec) => `<section class="ml-ed-sec" data-sec="${sec.k}"><h4 class="ml-h4">${sec.label}${sec.max ? ` <span>최대 ${sec.max}개</span>` : ''}</h4>`
    + `${sec.hint ? `<div class="ml-hint">${sec.hint}</div>` : ''}<div class="ml-ed-list">${sec.items.map((it, i) => itemHtml(sec, it, i)).join('')}</div>`
    + `${sec.add === false ? '' : `<button type="button" class="ml-btn sm ml-ed-add" data-ed="add" data-sec="${sec.k}">＋ ${esc(sec.addLabel ?? '추가')}</button>`}</section>`;

// sections: [{ k, label, fields, items, title(it), icon(it), blank(), max, hint }] · top: 낱칸 [{ k, label, type, v }]
// → { top: { k: v }, lists: { k: [{ ...읽은 값, __i: 원래 번호 | null }] } } 또는 null
export function edSheet(title, sections, top = [], { hint = '' } = {}) {
    return new Promise((res) => {
        let done = false;
        const html = `<form class="ml-form ml-ed">${hint ? `<div class="ml-hint">${hint}</div>` : ''}${top.some(f => f.k !== 'why') ? `<section class="ml-ed-top">${top.filter(f => f.k !== 'why').map(f => fieldHtml(f, f.v)).join('')}</section>` : ''}${sections.map(secHtml).join('')}${top.some(f => f.k === 'why') ? `<section class="ml-ed-top ml-ed-why">${fieldHtml(WHY, '')}</section>` : ''}</form>`;
        const el = sheet(title, html, {
            ok: '저장',
            onOk: (box) => {
                const out = { top: {}, lists: {} };
                for (const f of top) { const tb = box.querySelector(f.k === 'why' ? '.ml-ed-why' : '.ml-ed-top:not(.ml-ed-why)'); if (tb) out.top[f.k] = read(tb, f); }
                for (const sec of sections) {
                    const host = box.querySelector(`.ml-ed-sec[data-sec="${sec.k}"]`);
                    out.lists[sec.k] = [...host.querySelectorAll('.ml-ed-it')].filter(d => !d.classList.contains('gone')).map(d => {
                        const o = {}; for (const f of sec.fields) o[f.k] = read(d, f);
                        o.__i = d.dataset.idx === 'new' ? null : Number(d.dataset.idx); return o;
                    });
                }
                done = true; res(out);
            },
        });
        el.querySelector('.ml-bs-box')?.classList.add('wide');
        el.addEventListener('click', (e) => {
            const b = e.target.closest('[data-ed]'); if (!b) return;
            e.preventDefault(); e.stopPropagation();
            if (b.dataset.ed === 'del') { const d = b.closest('.ml-ed-it'); d.classList.toggle('gone'); b.textContent = d.classList.contains('gone') ? '↩' : '🗑'; b.title = d.classList.contains('gone') ? '되살리기' : '빼기'; return; }
            if (b.dataset.ed === 'add') {
                const sec = sections.find(s => s.k === b.dataset.sec), list = b.parentElement.querySelector('.ml-ed-list');
                if (sec.max && list.querySelectorAll('.ml-ed-it:not(.gone)').length >= sec.max) { toast(`${sec.label}은(는) ${sec.max}개까지예요`); return; }
                const t = document.createElement('div'); t.innerHTML = itemHtml(sec, { ...sec.blank(), __new: true }, 'new');
                const d = t.firstElementChild; d.dataset.idx = 'new'; list.appendChild(d); d.querySelector('[data-f]')?.focus();
            }
        });
        // 이름을 고치면 접힌 줄 제목도 같이
        el.addEventListener('input', (e) => { const d = e.target.closest('.ml-ed-it'); if (d && e.target.dataset.f === 'name') d.querySelector('summary b').textContent = e.target.value || '(새 항목)'; });
        el.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); el.querySelector('[data-bs="ok"]').click(); });
        new MutationObserver((_, ob) => { if (!el.isConnected) { ob.disconnect(); if (!done) res(null); } }).observe(el.parentElement, { childList: true });
    });
}

// ───── 효과 글 ↔ 객체: 「허기+20, 기분-5」 (욕구는 이름으로 · 능력치는 그대로) ─────
export const fxToText = (fx, book) => Object.entries(fx ?? {}).map(([k, v]) => `${book.me.needs.find(n => n.key === k)?.name ?? k}${v > 0 ? '+' : ''}${v}`).join(', ');
export function textToFx(s, book) {
    const o = {};
    for (const part of String(s ?? '').split(/[,，、]/)) {
        const m = /^\s*(.+?)\s*([+\-−]\s*\d+(?:\.\d+)?)\s*$/.exec(part); if (!m) continue;
        const nm = m[1].trim(), k = book.me.needs.find(n => n.name === nm || n.key === nm)?.key ?? safeKey(nm);
        if (k) o[k] = Number(m[2].replace(/\s/g, '').replace('−', '-'));
    }
    return o;
}
const sg = (d) => (d > 0 ? `+${d}` : `${d}`);
const uniqKey = (name, used) => { let k = safeKey(name) || 'x', n = 2; while (used.has(k)) k = `${safeKey(name)}${n++}`; used.add(k); return k; };
const WHY = { k: 'why', label: '이유 (지금 값을 바꿨을 때 기록에 남음)', ph: '직접 고침' };
function finish(book, L, why, handLines) {
    book.src = { ...(book.src ?? {}), from: 'user' }; saveMeta();
    if (L.length) { handLines(L, why || '직접 고침'); toast(`저장했어요 · ✋ 지금 값 ${L.length}개 고침 (기록에서 되돌리기 됨)`, 'good'); }
    else { app.refresh?.(true); toast('저장했어요', 'good'); }
    return true;
}

// ───── 앱별 ─────
// 돌려줌: true(처리함) · null(이 앱은 따로)
export async function fullEdit(appId, handLines) {
    const r = fold(), meta = getMeta(); if (!r || !meta?.book) return null;
    const { S } = r, b = meta.book;
    if (appId === 'now' || appId === 'dice') {
        const needs = { k: 'needs', label: '🍞 욕구 (시간이 지나면 줄어듦)', max: 5, addLabel: '욕구 추가', title: x => x.name, icon: x => x.icon, sub: x => (x.now != null ? `지금 ${x.now}` : ''),
            items: b.me.needs.map(n => ({ ...n, now: Math.round(S.needs[n.key] ?? n.start), sw: n.sym?.주의 ?? '', sd: n.sym?.위험 ?? '' })),
            blank: () => ({ name: '', icon: '•', desc: '', start: 80, rate: 2, sw: '', sd: '' }),
            fields: [{ k: 'name', label: '이름', ph: '예: 갈증' }, { k: 'icon', label: '아이콘', ph: '이모지 1개' }, { k: 'now', label: '지금 값 (0~100)', type: 'num' },
                { k: 'start', label: '시작 값', type: 'num' }, { k: 'rate', label: '시간당 줄어드는 양', type: 'num' },
                { k: 'desc', label: '설명 (AI에게도 감)', type: 'area', wide: true, ph: '무엇을 나타내는지 · 어떻게 채우는지' },
                { k: 'sw', label: '낮을 때 보이는 모습 (주의)', wide: true, ph: '예: 배에서 꼬르륵 소리' }, { k: 'sd', label: '바닥일 때 (위험)', wide: true, ph: '예: 손이 떨리고 어지러움' }] };
        const gauges = { k: 'gauges', label: '❤️ 게이지 (체력 · 마나 같은 것)', max: 4, addLabel: '게이지 추가', title: x => x.name, icon: x => x.icon || '❤️', sub: x => (x.now != null ? `지금 ${x.now} / ${x.max}` : ''),
            items: b.me.gauges.map(g => ({ ...g, now: Math.round(S.gauges[g.key] ?? g.start) })),
            blank: () => ({ name: '', icon: '❤️', desc: '', start: 100, max: 100, color: '#e5484d' }),
            fields: [{ k: 'name', label: '이름', ph: '예: 마나' }, { k: 'icon', label: '아이콘' }, { k: 'now', label: '지금 값', type: 'num' }, { k: 'start', label: '시작 값', type: 'num' },
                { k: 'max', label: '최대', type: 'num' }, { k: 'color', label: '색', type: 'color' }, { k: 'desc', label: '설명 · 0이 되면 (AI에게도 감)', type: 'area', wide: true }] };
        const attrs = { k: 'attrs', label: '💪 능력치 (주사위 보정)', max: 6, addLabel: '능력치 추가', title: x => x.name, icon: () => '💪', sub: x => (x.now != null ? `지금 ${sg(x.now)}` : ''),
            items: b.me.attrs.map(a => ({ ...a, now: S.attrs[a.name] ?? a.v })),
            blank: () => ({ name: '', v: 0, desc: '' }),
            fields: [{ k: 'name', label: '이름', ph: '예: 힘' }, { k: 'now', label: '지금 보정 (−5~10)', type: 'num' }, { k: 'v', label: '시작 보정', type: 'num' }, { k: 'desc', label: '설명 (무엇에 쓰는지)', type: 'area', wide: true }] };
        const top = [{ k: 'st', label: '🏷 지금 상태 딱지 (쉼표 · 지우면 풀림 · 새로 적으면 붙음)', type: 'tags', v: S.status.map(x => x.name), ph: '감기, 기분 좋음' }, WHY];
        const o = await edSheet('✏️ 수치 편집', [needs, gauges, attrs], top, { hint: '항목을 눌러 펼치면 이름 · 아이콘 · 설명 · 시작 값 · 속도를 다 고칠 수 있어요 · ＋로 추가 · 🗑로 빼기' }); if (!o) return true;
        const L = [], used = new Set();
        const N = o.lists.needs.filter(x => x.name).map(x => { const old = x.__i != null ? b.me.needs[x.__i] : null; const key = old ? old.key : uniqKey(x.name, new Set([...b.me.needs.map(n => n.key), ...used]));
            used.add(key); const n = { key, name: x.name.slice(0, 16), icon: (x.icon || '•').slice(0, 4), desc: (x.desc ?? '').slice(0, 160), start: Math.max(0, Math.min(100, x.start ?? 80)), rate: Math.max(0, Math.min(50, x.rate ?? 2)), sym: x.sw || x.sd ? { 주의: x.sw, 위험: x.sd } : null };
            if (old && x.now != null) { const d = Math.round(Math.max(0, Math.min(100, x.now)) - Math.round(S.needs[key] ?? 0)); if (d) L.push(`${n.name}: ${sg(d)}`); }
            return n; });
        if (N.length) b.me.needs = N; else toast('욕구는 하나는 있어야 해서 그대로 뒀어요');
        b.me.gauges = o.lists.gauges.filter(x => x.name).map(x => { const old = x.__i != null ? b.me.gauges[x.__i] : null; const key = old ? old.key : uniqKey(x.name, new Set(b.me.gauges.map(g => g.key)));
            const g = { key, name: x.name.slice(0, 16), icon: (x.icon || '❤️').slice(0, 4), max: Math.max(1, x.max ?? 100), start: x.start ?? x.max ?? 100, desc: (x.desc ?? '').slice(0, 160), color: x.color || '#e5484d' };
            if (old && x.now != null) { const d = Math.round(x.now - (S.gauges[key] ?? g.start)); if (d) L.push(`${g.name}: ${sg(d)}`); }
            return g; });
        b.me.attrs = o.lists.attrs.filter(x => x.name).map(x => { const old = x.__i != null ? b.me.attrs[x.__i] : null; const a = { name: x.name.slice(0, 6), v: Math.max(-5, Math.min(10, x.v ?? 0)), desc: (x.desc ?? '').slice(0, 160) };
            if (old && old.name === a.name && x.now != null) { const d = Math.round(x.now - (S.attrs[a.name] ?? 0)); if (d) L.push(`attr: ${a.name} ${sg(d)}`); }
            return a; });
        const want = o.top.st ?? [], have = S.status.map(x => x.name);
        for (const h of have) if (!want.includes(h)) L.push(`status: -${h}`);
        for (const w of want) if (!have.includes(w)) L.push(`status: ${w}`);
        return finish(b, L, o.top.why, handLines);
    }
    if (appId === 'bag') {
        const items = { k: 'items', label: '🎒 가진 물건', addLabel: '물건 넣기', title: x => x.name, icon: x => (x.worn ? '👕' : '📦'), sub: x => (x.n > 1 ? `×${x.n}` : ''),
            items: S.items.map(it => ({ name: it.name, n: it.n, worn: !!it.worn, fx: fxToText(b.world.itemFx?.[it.name] ?? it.fx, b) })),
            blank: () => ({ name: '', n: 1, worn: false, fx: '' }),
            fields: [{ k: 'name', label: '이름' }, { k: 'n', label: '개수', type: 'num' }, { k: 'worn', label: '입고 · 차고 있음', type: 'bool' },
                { k: 'fx', label: '쓰면 · 입으면 (예: 허기+20, 기분+5, 힘+1)', wide: true, ph: '비우면 효과 없음' }] };
        const top = [{ k: 'cash', label: `💰 가진 돈 (${esc(b.world.currency)})`, type: 'num', v: S.cash }, { k: 'cur', label: '돈 이름', v: b.world.currency },
            { k: 'rate', label: `💱 1${esc(b.world.currency)}이 몇 ${esc(b.world.fx?.unit || '원')}? (0이면 안 보임)`, type: 'num', v: b.world.fx?.rate ?? 0 }, { k: 'unit', label: '비교할 돈 (예: 원)', v: b.world.fx?.unit || '원' },
            { k: 'meal', label: '한 끼 값 (물가 기준)', type: 'num', v: b.world.meal }, WHY];
        const o = await edSheet('✏️ 소지품 편집', [items], top); if (!o) return true;
        const L = [];
        b.world.currency = (o.top.cur || b.world.currency).slice(0, 16);
        b.world.fx = { rate: Math.max(0, o.top.rate ?? 0), unit: (o.top.unit || '원').slice(0, 8) };
        b.world.meal = Math.max(1, o.top.meal ?? b.world.meal);
        if (o.top.cash != null && o.top.cash !== S.cash) L.push(`cash: ${sg(Math.round((o.top.cash - S.cash) * 100) / 100)}`);
        const keep = new Set();
        b.world.itemFx ??= {};
        for (const x of o.lists.items) {
            if (!x.name) continue; const old = x.__i != null ? S.items[x.__i] : null, n = Math.max(0, Math.round(x.n ?? 1));
            const fx = textToFx(x.fx, b); if (Object.keys(fx).length) b.world.itemFx[x.name] = fx; else if (old) delete b.world.itemFx[x.name];
            if (old && old.name === x.name) {
                keep.add(x.__i); const d = n - old.n; if (d > 0) L.push(`got: ${x.name} | ${d}`); if (d < 0) L.push(`item: -${x.name} | ${-d}`);
                if (n > 0 && x.worn !== !!old.worn) L.push(`${x.worn ? 'wear' : 'unwear'}: ${x.name}`);
            } else { if (old) { keep.add(x.__i); L.push(`item: -${old.name} | ${old.n}`); } if (n > 0) { L.push(`got: ${x.name} | ${n}`); if (x.worn) L.push(`wear: ${x.name}`); } }
        }
        S.items.forEach((it, i) => { if (!keep.has(i)) L.push(`item: -${it.name} | ${it.n}`); });
        return finish(b, L, o.top.why, handLines);
    }
    if (appId === 'rel') {
        const R = (n) => S.rel[n] ?? { aff: 10, trust: 10 };
        const acts = (L) => (L ?? []).map(a => `${a.act}${a.d != null ? ` ${sg(a.d)}` : ''}`);
        const people = { k: 'people', label: '👥 인물', addLabel: '인물 추가', title: x => x.name, icon: x => x.face || '🙂', sub: x => x.line,
            items: b.people.map(p => ({ ...p, lv: String(R(p.name).lv ?? 1), bond: String(p.bond ?? 1), aka: p.aka, up: acts(p.up), down: acts(p.down), sa: p.start.aff, st: p.start.trust, na: R(p.name).aff, nt: R(p.name).trust, signs: p.signs.map(s => `${s.at} | ${s.text}`) })),
            blank: () => ({ name: '', face: '🙂', line: '', lv: '1', bond: '1', aka: [], up: [], down: [], sa: 10, st: 10, likes: [], hates: [], want: '', day: '', noLove: false, signs: [] }),
            fields: [{ k: 'name', label: '이름' }, { k: 'face', label: '얼굴 (이모지)' }, { k: 'aka', label: '다른 이름 (쉼표)', type: 'tags' },
                { k: 'line', label: '성격 · 소개 (AI에게도 감)', type: 'area', wide: true },
                { k: 'na', label: '💗 지금 애정', type: 'num' }, { k: 'nt', label: '🤝 지금 우정', type: 'num' }, { k: 'sa', label: '시작 애정', type: 'num' }, { k: 'st', label: '시작 우정', type: 'num' },
                { k: 'noLove', label: '💔 애정 꺼 두기 (우정만)', type: 'bool' },
                { k: 'lv', label: '💍 지금 관계 레벨', type: 'select', opts: [['1', 'Lv.1 연인 전'], ['2', 'Lv.2 💗 연인'], ['3', 'Lv.3 💍 부부']] },
                { k: 'bond', label: '시작 관계 레벨 (공식 관계)', type: 'select', opts: [['1', 'Lv.1 연인 전'], ['2', 'Lv.2 💗 연인'], ['3', 'Lv.3 💍 부부']] },
                { k: 'up', label: '좋아하는 행동 (한 줄에 하나 · 「칭찬 +3」)', type: 'lines', wide: true }, { k: 'down', label: '싫어하는 행동 (「거짓말 -5」)', type: 'lines', wide: true },
                { k: 'likes', label: '좋아하는 것 (쉼표)', type: 'tags', wide: true }, { k: 'hates', label: '싫어하는 것 (쉼표)', type: 'tags', wide: true },
                { k: 'want', label: '지금 원하는 것', wide: true }, { k: 'day', label: '생일 (예: 3월 14일)' },
                { k: 'signs', label: '애정이 오르면 보이는 모습 (「60 | 눈을 피함」)', type: 'lines', wide: true }] };
        const stages = { k: 'stages', label: '💞 관계 단계 (모든 인물 공통)', addLabel: '단계 추가', title: x => x.name, icon: () => '💞', sub: x => `애정 ${x.at}~`,
            items: b.stages.map(s => ({ ...s })), blank: () => ({ at: 50, name: '', call: '', act: '' }),
            fields: [{ k: 'name', label: '단계 이름' }, { k: 'at', label: '필요한 애정', type: 'num' }, { k: 'call', label: '부르는 법' }, { k: 'act', label: '할 수 있는 행동 (AI에게 감)', wide: true }] };
        const o = await edSheet('✏️ 관계 편집', [people, stages], [WHY]); if (!o) return true;
        const L = [];
        const pa = (s) => { const m = /^(.*?)\s*([+\-−]\s*\d+)?$/.exec(s); return { act: m[1].trim(), d: m[2] ? Number(m[2].replace(/\s/g, '').replace('−', '-')) : null }; };
        b.people = o.lists.people.filter(x => x.name).map(x => {
            const old = x.__i != null ? b.people[x.__i] : null;
            const p = normPerson({ ...(old ?? {}), name: x.name, face: x.face, aka: x.aka, line: x.line, start: { aff: x.sa ?? 10, trust: x.st ?? 10 }, noLove: x.noLove, bond: Number(x.bond) || 1, up: x.up.map(pa), down: x.down.map(pa), likes: x.likes, hates: x.hates, want: x.want, day: x.day,
                signs: x.signs.map(s => { const m = /^(\d+)\s*\|\s*(.+)$/.exec(s); return m ? { at: Number(m[1]), text: m[2] } : { at: 60, text: s }; }) });
            if (p && old && old.name === p.name) {
                const cur = R(p.name);
                const lvTo = Number(x.lv) || 1, lvCh = !p.noLove && lvTo !== (cur.lv ?? 1), baseAff = lvCh ? (lvTo > (cur.lv ?? 1) ? 0 : 30) : cur.aff;
                if (x.na != null && !p.noLove) { const d = Math.round(Math.max(0, Math.min(100, x.na)) - baseAff); if (d) L.push(`aff: ${p.name} ${sg(d)}`); }
                if (x.nt != null) { const d = Math.round(Math.max(0, Math.min(100, x.nt)) - cur.trust); if (d) L.push(`trust: ${p.name} ${sg(d)}`); }
                if (lvCh) L.unshift(`bond: ${p.name} | ${lvTo}`); // 레벨 먼저 (애정은 새 레벨 기준)
            }
            return p;
        }).filter(Boolean);
        const st = o.lists.stages.filter(x => x.name).map(x => ({ at: Math.max(0, Math.min(100, x.at ?? 0)), name: x.name.slice(0, 16), call: (x.call ?? '').slice(0, 40), act: (x.act ?? '').slice(0, 100) })).sort((a, c) => a.at - c.at);
        if (st.length >= 2) b.stages = st; else toast('관계 단계는 두 개 이상이어야 해서 그대로 뒀어요');
        return finish(b, L, o.top.why, handLines);
    }
    if (appId === 'map') {
        const goodsTxt = (G) => (G ?? []).map(g => `${g.name} | ${g.price}${Object.keys(g.fx ?? {}).length ? ` | ${fxToText(g.fx, b)}` : ''}`);
        const places = { k: 'places', label: '📍 장소', addLabel: '장소 추가', title: x => x.name, icon: x => PLACE_KINDS[x.kind] ?? '📍', sub: x => x.note,
            items: b.world.places.map(p => ({ ...p, goods: goodsTxt(p.goods), rest: fxToText(p.rest, b) })),
            blank: () => ({ name: '', kind: 'other', line: '', near: [], floors: [], note: '', goods: [], rest: '' }),
            fields: [{ k: 'name', label: '이름' }, { k: 'kind', label: '종류', type: 'select', opts: Object.entries(PLACE_KINDS).map(([k, i]) => [k, `${i} ${{ home: '집', shop: '가게', food: '먹는 곳', bath: '씻는 곳', work: '일터', street: '거리', school: '학교', other: '기타' }[k]}`]) },
                { k: 'note', label: '설명 (AI에게도 감)', type: 'area', wide: true }, { k: 'near', label: '이어진 곳 (쉼표)', type: 'tags', wide: true }, { k: 'line', label: '노선 이름' }, { k: 'floors', label: '층 · 구역 (쉼표)', type: 'tags' },
                { k: 'goods', label: '파는 것 (한 줄에 하나 · 「크림빵 | 3 | 허기+20」)', type: 'lines', wide: true, rows: 4 }, { k: 'rest', label: '여기서 쉬면 (예: 기력+20)', wide: true }] };
        const names = b.world.places.map(p => p.name);
        const top = [{ k: 'loc', label: '📍 지금 장소', type: 'select', v: S.loc, opts: [...new Set([S.loc, ...names].filter(Boolean))].map(p => [p, p]) },
            { k: 'with', label: '👥 같이 있는 사람 (쉼표 · 비우면 혼자)', type: 'tags', v: S.with }, WHY];
        const o = await edSheet('✏️ 지도 편집', [places], top); if (!o) return true;
        const L = [];
        b.world.places = o.lists.places.filter(x => x.name).map(x => {
            const old = x.__i != null ? b.world.places[x.__i] : null;
            const goods = x.goods.map(s => { const [n, p, f] = s.split('|').map(t => t.trim()); return { name: n, price: num(p, 0), fx: textToFx(f, b) }; });
            return normPlace({ ...(old ?? {}), ...x, goods, rest: textToFx(x.rest, b) });
        }).filter(Boolean);
        // 🚇 이어진 곳은 양쪽으로 (A에 B를 적으면 B에도 A)
        for (const p of b.world.places) for (const n of p.near) { const q = b.world.places.find(x => x.name === n); if (q && !q.near.includes(p.name) && q.near.length < 4) q.near.push(p.name); }
        if (o.top.loc && o.top.loc !== S.loc) L.push(`loc: ${o.top.loc}`);
        const w = o.top.with ?? []; if (w.join('|') !== S.with.join('|')) L.push(`with: ${w.length ? w.join(', ') : '없음'}`);
        return finish(b, L, o.top.why, handLines);
    }
    return null;
}
