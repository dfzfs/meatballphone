// 🧰 앱마다 붙는 공통 도구줄: ✏️ 편집 · ✨ AI로 수정 · 🙈 AI에게 숨기기 · 👁 보일 것 · 🌐 용어집(번역 고정)
//   편집은 바텀시트 입력 칸 → 상태 값은 마지막 답에 「손으로 고침 + 이유」로 적고(기록 · 되돌리기), 설정집은 설정집에 바로
import { app, ctx, settings, saveSettings, getMeta, saveMeta, slot, syncSwipe, bumpMeta } from '../base/st.js';
import { esc, num, short, norm, safeKey, signed } from '../base/util.js';
import { form, sheet, toast, btn } from './kit.js';
import { fold } from '../rules/engine.js';
import { normBook, placeOf, PLACE_KINDS, fxOf } from '../rules/book.js';
import { ask, parseJSON } from '../rules/ai.js';
import { readOps } from '../rules/tags.js';
import { glossList, gloss } from '../base/gloss.js';
import { trOn, trList, flush, trRules, trOrig } from '../extra/translate.js';
export { glossList, gloss };

// 앱 → 영향력 게이지 칸 (🙈 숨기기가 끄는 것)
export const APP_GAUGE = { now: 'stats', bag: 'wallet', rel: 'rel', map: 'map', cal: 'calendar', dice: 'dice', news: 'news', mind: 'mind', quote: 'quote' };
// 👁 보일 것 — 앱 안의 칸
export const PARTS = {
    home: [['hero', '오늘 · 장소'], ['tags', '상태 딱지'], ['scene', '이 장면'], ['doable', '지금 할 수 있는 일'], ['wants', '원하는 것'], ['soon', '곧 일어날 일'], ['stats', '수치'], ['dice', '주사위'], ['with', '같이 있는 사람'], ['turn', '이번 답'], ['cal', '달력'], ['news', '세계 소식']],
    now: [['tags', '상태 딱지'], ['scene', '이 장면'], ['needs', '욕구'], ['gauges', '게이지'], ['attrs', '능력치'], ['turn', '이번 답'], ['with', '같이 있는 사람']],
    rel: [['line', '성격 한 줄'], ['match', '별자리 · 특성 · 궁합'], ['meters', '애정 · 우정 막대'], ['call', '호칭 · 행동'], ['next', '다음 단계'], ['last', '최근 변화'], ['want', '속셈'], ['mem', '감정 기억'], ['taste', '취향'], ['place', '장소 · 생일']],
    map: [['map', '노선도'], ['pins', '인물 목록'], ['goods', '물가'], ['building', '건물 안 · 사진']],
    bag: [['cash', '재산'], ['items', '소지품'], ['shop', '가게']],
};
export const vis = (appId, part) => !(settings().partsOff?.[appId] ?? []).includes(part);
export const hiddenAI = (gid) => !!getMeta()?.hideAI?.[gid];

const EDITABLE = new Set(['now', 'dice', 'bag', 'rel', 'map', 'cal', 'news', 'custom', 'music', 'rec', 'mind', 'quote']);
export function toolbar(appId) {
    const gid = APP_GAUGE[appId], hid = gid && hiddenAI(gid);
    const B = [];
    if (EDITABLE.has(appId)) B.push(`<button class="ml-tool" data-act="t-edit" data-v="${appId}">✏️ 편집</button>`);
    if (['now', 'bag', 'rel', 'map', 'cal', 'news', 'custom'].includes(appId)) B.push(`<button class="ml-tool" data-act="t-ai" data-v="${appId}">✨ AI로 수정</button>`);
    if (gid) B.push(`<button class="ml-tool${hid ? ' on' : ''}" data-act="t-hide" data-v="${gid}" title="${hid ? '본편에 다시 보내기' : '이 앱의 결과값을 본편에 안 보내기'}">${hid ? '🙈 AI에게 숨김' : '🙈 숨기기'}</button>`);
    if (PARTS[appId]) B.push(`<button class="ml-tool" data-act="t-parts" data-v="${appId}">👁 보일 것</button>`);
    B.push('<button class="ml-tool" data-act="t-gloss">🌐 용어집</button>');
    return `<div class="ml-tools2">${B.join('')}</div>`;
}

// 손으로 고친 값 → 마지막 답에 (기록에 ✋ · 줄마다 되돌리기)
const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
export function handLines(lines, why, src = 'hand') {
    const i = lastAI(); if (i < 0) { toast('답이 하나라도 있어야 고칠 수 있어요', 'bad'); return false; }
    const m = ctx().chat[i], sl = slot(m, true);
    if (!sl.ops) sl.ops = readOps(m.mes);
    for (const ln of lines) { const k = ln.slice(0, ln.indexOf(':')).trim(), v = ln.slice(ln.indexOf(':') + 1).trim(); if (k && v) (sl.hand ??= []).push({ k, v, why: short(why, 30), src }); }
    sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); ctx().saveChatDebounced?.(); app.refresh?.();
    return true;
}
const saveBook = () => { getMeta().book.src.from = 'user'; saveMeta(); app.refresh?.(true); };
const fxText = (fx, book) => Object.entries(fx ?? {}).map(([k, v]) => `${book.me.needs.find(n => n.key === k)?.name ?? k} ${v > 0 ? '+' : ''}${v}`).join(', ');
// 「허기 +20, 기분 +3」 → { hunger: 20, mood: 3 } (능력치 이름은 그대로 열쇠)
function fxParse(t, book) {
    const o = {};
    for (const part of String(t ?? '').split(/[,·]/)) {
        const m = /^\s*(.+?)\s*([+\-−]?\s*\d+)\s*$/.exec(part); if (!m) continue;
        const n = book.me.needs.find(x => norm(x.name) === norm(m[1]) || norm(x.key) === norm(m[1])) ?? book.me.gauges.find(x => norm(x.name) === norm(m[1]));
        o[n?.key ?? safeKey(m[1])] = Number(m[2].replace(/\s/g, '').replace('−', '-'));
    }
    return fxOf(o);
}
const listText = (a) => (a ?? []).join(', ');
const listOf = (t) => String(t ?? '').split(/[,、]/).map(x => x.trim()).filter(Boolean);

// ───── 목록 편집 시트: 줄을 누르면 그 항목 입력, ＋로 추가 ─────
function listSheet(title, rows, addLabel, addAct, hint = '') {
    sheet(title, `${hint ? `<div class="ml-hint">${hint}</div>` : ''}<div class="ml-card">${rows.map(r => `<div class="ml-row tap" data-act="${r.act}" data-v="${esc(r.v)}"><span class="ml-ic">${r.icon ?? '•'}</span><span class="ml-tx"><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="ml-val"><i class="ml-chev">›</i></span></div>`).join('') || '<div class="ml-row"><span class="ml-tx"><small>비어 있어요</small></span></div>'}</div><div class="ml-acts">${btn(`＋ ${addLabel}`, addAct, '', 'xs')}</div>`);
}

// ───── 앱별 편집 ─────
export async function editApp(appId) {
    const r = fold(), meta = getMeta(), b = meta.book;
    switch (appId) {
        case 'now': case 'dice':
            return listSheet('✏️ 수치 편집', [
                ...b.me.needs.map(n => ({ act: 'e-need', v: n.key, icon: n.icon, title: `욕구 · ${n.name}`, sub: `지금 ${Math.round(r.S.needs[n.key])} · 시작 ${n.start} · 시간당 −${n.rate}` })),
                ...b.me.gauges.map(g => ({ act: 'e-gauge', v: g.key, icon: '❤️', title: `게이지 · ${g.name}`, sub: `지금 ${r.S.gauges[g.key]} / ${g.max}` })),
                ...b.me.attrs.map(a => ({ act: 'e-attr', v: a.name, icon: '💪', title: `능력치 · ${a.name}`, sub: `지금 ${signed(r.S.attrs[a.name] ?? 0)} · 시작 ${signed(a.v)}` })),
                ...r.S.status.map(s => ({ act: 'e-status', v: s.name, icon: '🏷️', title: `상태 딱지 · ${s.name}`, sub: s.until ? `${Math.round((s.until - r.S.t) / 60)}시간 남음` : '기간 없음' })),
            ], '항목 추가', 'e-add-stat', '욕구는 3~5개가 좋아요 · 지금 값은 이유와 함께 기록돼요');
        case 'bag':
            return listSheet('✏️ 소지품 편집', [{ act: 'edit-cash', v: '', icon: '💰', title: `가진 돈 ${r.S.cash} ${b.world.currency}`, sub: `식사 한 끼 ≈ ${b.world.meal}` }, ...r.S.items.map(it => ({ act: 'e-item', v: it.name, icon: it.worn ? '👕' : '📦', title: `${it.name} ×${it.n}`, sub: [it.worn ? '착용 중' : '', fxText(it.fx, b)].filter(Boolean).join(' · ') }))], '물건 넣기', 'e-item');
        case 'rel':
            return listSheet('✏️ 인물 편집', b.people.map(p => ({ act: 'bk-person', v: p.name, icon: p.face, title: p.name, sub: p.line || '성격 비어 있음' })), '인물 추가', 'bk-person', '설정집의 인물 칸을 고쳐요 · 지금 애정 · 우정은 막대를 눌러 고쳐요');
        case 'map':
            return listSheet('✏️ 장소 편집', b.world.places.map(p => ({ act: 'e-place', v: p.name, icon: PLACE_KINDS[p.kind], title: p.name, sub: [p.line, p.near.length ? `→ ${p.near.join(', ')}` : '', p.goods.length ? `물건 ${p.goods.length}` : ''].filter(Boolean).join(' · ') })), '장소 추가', 'e-place', '「이어진 곳」을 적으면 노선도에 길이 생겨요');
        case 'cal': {
            const fv = await form('✏️ 달력 편집', [
                { k: 'date', label: '날짜로 이동', ph: '3/14', hint: '앞으로만 갈 수 있어요 (지난 날짜는 다음 해)' },
                { k: 'time', label: '시각', ph: '14:30 · 저녁 · +2h', chips: ['아침', '낮', '저녁', '밤', '+1h', '+1일'] },
                { k: 'weather', label: '날씨', type: 'pick', v: r.S.weather, opts: [...new Set([...b.world.weather, '맑음', '흐림', '비', '눈', '안개'])].map(w => [w, w]) },
                { k: 'ev', label: '일정 추가', ph: 'Leon과 저녁 식사 | 3/14', hint: '「내용 | 날짜」 · 약속 장부와 달력에 같이 떠요' },
                { k: 'why', label: '이유', ph: '직접 고침' },
            ]);
            if (!fv) return;
            const L = [];
            if (fv.date.trim()) L.push(`date: ${fv.date.trim()}`);
            if (fv.time.trim()) L.push(/^\+\s*1\s*일$/.test(fv.time.trim()) ? 'pass: 1d' : `time: ${fv.time.trim()}`);
            if (fv.weather && fv.weather !== r.S.weather) L.push(`weather: ${fv.weather}`);
            if (fv.ev.trim()) L.push(`promise: ${fv.ev.trim()}`);
            if (L.length) handLines(L, fv.why || '직접 고침');
            return;
        }
        case 'news': {
            const fv = await form('✏️ 소식 쓰기', [{ k: 'who', label: '누구 이야기', type: 'pick', opts: [['', '세계'], ...b.people.map(p => [p.name, `${p.face} ${esc(p.name)}`])] }, { k: 'text', label: '내용', type: 'area', ph: '경비 교대 뒤 술집에 들렀다' }]);
            if (!fv?.text.trim()) return;
            handLines([fv.who ? `life: ${fv.who} | ${fv.text.trim()}` : `newsline: ${fv.text.trim()}`], '직접 씀');
            return;
        }
        case 'custom': return listSheet('✏️ 내 탭 편집', (meta.custom ?? []).flatMap((t, ti) => t.fields.map(f => ({ act: 'e-cfield', v: `${ti}|${f.name}`, icon: t.icon, title: `${t.name} · ${f.name}`, sub: `지금 ${r.S.custom[t.name]?.[f.name] ?? f.start ?? '-'}${f.max ? ` / ${f.max}` : ''}` }))), '새 탭', 'ctab-new', '칸을 누르면 값 · 단계 · 경계 문구를 고쳐요');
        case 'music': { const fv = await form('✏️ 추천 음악', [{ k: 'taste', label: '내 취향 (검색에 붙음)', v: settings().musicTaste, ph: '예: 시티팝 · 재즈 · 일본 애니 OST' }]); if (fv) { settings().musicTaste = fv.taste; saveSettings(); app.refresh?.(); } return; }
        case 'quote': { meta.recent.quote = []; saveMeta(); toast('최근에 본 구절 목록을 비웠어요'); app.refresh?.(); return; }
        case 'mind': { const fv = await form('✏️ 속마음', [{ k: 'who', label: '누가 말할까', type: 'pick', v: (meta.mindWho ?? ['cast']).join('+'), opts: [['cast', '장면 속 인물'], ['cast+watch', '+ 관전자'], ['cast+cell', '+ 세포들'], ['cast+watch+cell', '셋 다']] }]); if (fv) { meta.mindWho = fv.who.split('+'); saveMeta(); app.refresh?.(); } return; }
        case 'rec': return listSheet('✏️ 책갈피', (meta.marks ?? []).map((m, i) => ({ act: 'e-mark', v: i, icon: '⭐', title: m.name })), '마지막 답 책갈피', 'mark');
    }
}

// 항목 하나 편집 (목록 시트에서 누른 것)
export async function editItem(act, v) {
    const r = fold(), meta = getMeta(), b = meta.book;
    switch (act) {
        case 'e-need': {
            const n = b.me.needs.find(x => x.key === v);
            const fv = await form(`✏️ ${n.icon} ${esc(n.name)}`, [{ k: 'now', label: '지금 값', type: 'number', v: Math.round(r.S.needs[n.key]) }, { k: 'why', label: '이유', ph: '직접 고침' }, { k: 'name', label: '이름', v: n.name }, { k: 'icon', label: '아이콘', v: n.icon }, { k: 'start', label: '시작 값', type: 'number', v: n.start }, { k: 'rate', label: '시간당 줄어드는 양', type: 'number', v: n.rate }, { k: 'del', label: '이 욕구', type: 'pick', v: '', opts: [['', '남기기'], ['del', '빼기']] }]);
            if (!fv) return;
            if (fv.del) { b.me.needs = b.me.needs.filter(x => x.key !== v); return saveBook(); }
            Object.assign(n, { name: short(fv.name, 8) || n.name, icon: short(fv.icon, 4) || n.icon, start: num(fv.start, n.start), rate: Math.max(0, num(fv.rate, n.rate)) });
            const d = num(fv.now) - Math.round(r.S.needs[n.key]);
            saveBook(); if (fv.now !== '' && d) handLines([`${n.name}: ${d > 0 ? '+' : ''}${d}`], fv.why || '직접 고침');
            return;
        }
        case 'e-gauge': {
            const g = b.me.gauges.find(x => x.key === v);
            const fv = await form(`✏️ ${esc(g.name)}`, [{ k: 'now', label: '지금 값', type: 'number', v: r.S.gauges[g.key] }, { k: 'why', label: '이유', ph: '직접 고침' }, { k: 'name', label: '이름', v: g.name }, { k: 'max', label: '최대', type: 'number', v: g.max }, { k: 'desc', label: '0이 되면', v: g.desc }, { k: 'del', label: '이 게이지', type: 'pick', v: '', opts: [['', '남기기'], ['del', '빼기']] }]);
            if (!fv) return;
            if (fv.del) { b.me.gauges = b.me.gauges.filter(x => x.key !== v); return saveBook(); }
            Object.assign(g, { name: short(fv.name, 8) || g.name, max: Math.max(1, num(fv.max, g.max)), desc: short(fv.desc, 40) });
            const d = num(fv.now) - num(r.S.gauges[g.key]); saveBook(); if (fv.now !== '' && d) handLines([`${g.name}: ${d > 0 ? '+' : ''}${d}`], fv.why || '직접 고침');
            return;
        }
        case 'e-attr': {
            const a = b.me.attrs.find(x => x.name === v);
            const fv = await form(`✏️ 💪 ${esc(a.name)}`, [{ k: 'now', label: '지금 값', type: 'number', v: r.S.attrs[a.name] ?? 0, chips: ['-1', '0', '1', '2', '3'] }, { k: 'why', label: '이유', ph: '수련 · 성장' }, { k: 'name', label: '이름', v: a.name }, { k: 'del', label: '이 능력치', type: 'pick', v: '', opts: [['', '남기기'], ['del', '빼기']] }]);
            if (!fv) return;
            if (fv.del) { b.me.attrs = b.me.attrs.filter(x => x.name !== v); return saveBook(); }
            a.name = short(fv.name, 6) || a.name; const d = num(fv.now) - num(r.S.attrs[v]); saveBook(); if (d) handLines([`attr: ${a.name} ${d > 0 ? '+' : ''}${d} | ${fv.why || '직접 고침'}`], fv.why || '직접 고침');
            return;
        }
        case 'e-status': { const fv = await form(`🏷️ ${esc(v)}`, [{ k: 'how', label: '어떻게', type: 'pick', v: 'off', opts: [['off', '지금 풀기'], ['3d', '3일 더'], ['1d', '하루 더']] }]); if (!fv) return; handLines([fv.how === 'off' ? `status: -${v}` : `status: ${v} | ${fv.how}`], '직접 고침'); return; }
        case 'e-add-stat': {
            const fv = await form('＋ 항목 추가', [{ k: 'kind', label: '종류', type: 'pick', v: 'need', opts: [['need', '욕구'], ['gauge', '게이지'], ['attr', '능력치'], ['status', '상태 딱지']] }, { k: 'name', label: '이름', ph: '예: 갈증 · 마나 · 행운 · 감기' }, { k: 'icon', label: '아이콘', v: '•', chips: ['💧', '✨', '🔥', '🧠', '💤'] }, { k: 'n', label: '시간당 줄어듦 · 최대 · 기간', type: 'number', ph: '욕구 2 · 게이지 100 · 딱지는 비움' }]);
            if (!fv?.name.trim()) return;
            const nm = short(fv.name.trim(), 8), key = safeKey(nm);
            if (fv.kind === 'need') b.me.needs.push({ key, name: nm, icon: short(fv.icon, 4) || '•', start: 80, rate: num(fv.n, 2), sym: null });
            if (fv.kind === 'gauge') b.me.gauges.push({ key, name: nm, max: num(fv.n, 100) || 100, start: num(fv.n, 100) || 100, desc: '', color: '#3a8ee6' });
            if (fv.kind === 'attr') b.me.attrs.push({ name: nm, v: 0 });
            if (fv.kind === 'status') { handLines([`status: ${nm}${fv.n ? ` | ${fv.n}d` : ''}`], '직접 붙임'); return; }
            meta.book = normBook(b); return saveBook();
        }
        case 'e-item': {
            const it = v ? r.S.items.find(x => x.name === v) : null;
            const fv = await form(it ? `✏️ ${esc(it.name)}` : '＋ 물건 넣기', [{ k: 'name', label: '이름', v: it?.name ?? '' }, { k: 'n', label: '개수', type: 'number', v: it?.n ?? 1 }, { k: 'worn', label: '착용', type: 'pick', v: it?.worn ? 'y' : 'n', opts: [['n', '안 입음'], ['y', '착용 중']] }, { k: 'fx', label: '효과', v: fxText(it?.fx, b), ph: '허기 +20, 기분 +3 · 입으면 힘 +1' }, { k: 'why', label: '이유', ph: '직접 고침', chips: ['이야기에서 얻음', '이야기에서 잃음', '계산이 틀림'] }]);
            if (!fv?.name.trim()) return;
            const name = short(fv.name.trim(), 20), n = Math.max(0, num(fv.n, 1)), L = [];
            const fx = fxParse(fv.fx, b); (b.world.itemFx ??= {})[name] = fx; saveMeta();
            const cur = it?.n ?? 0;
            if (n > cur) L.push(`got: ${name} | ${n - cur}`); if (n < cur) L.push(n === 0 ? `lost: ${name}` : `item: -${name} | ${cur - n}`);
            if (n > 0 && (fv.worn === 'y') !== !!it?.worn) L.push(`${fv.worn === 'y' ? 'wear' : 'unwear'}: ${name}`);
            if (L.length) handLines(L, fv.why || '직접 고침'); else app.refresh?.(true);
            return;
        }
        case 'e-place': return editPlace(v);
        case 'e-cfield': {
            const [ti, fname] = v.split('|'); const t = meta.custom[Number(ti)], f = t.fields.find(x => x.name === fname);
            const fv = await form(`✏️ ${esc(t.name)} · ${esc(f.name)}`, [{ k: 'now', label: '지금 값', v: r.S.custom[t.name]?.[f.name] ?? '' }, { k: 'max', label: '최대 (숫자 칸)', type: 'number', v: f.max || '' }, { k: 'st', label: '단계 경계', v: (f.stages ?? [30, 70]).join(', '), hint: '「30, 70」 → 낮음 · 보통 · 높음' }, { k: 'say', label: '높음이 되면 (경계 문구)', v: f.say ?? '', ph: '예: 눈빛이 멍해진다' }, { k: 'link', label: '다른 칸과 연결', v: f.link ?? '', ph: '예: 기분 -5 (높음일 때)' }]);
            if (!fv) return;
            Object.assign(f, { max: num(fv.max, 0), stages: listOf(fv.st).map(Number).filter(Number.isFinite).slice(0, 3), say: short(fv.say, 40), link: short(fv.link, 30) }); saveMeta();
            if (String(fv.now) !== String(r.S.custom[t.name]?.[f.name] ?? '')) handLines([`custom: ${t.name} | ${f.name} | ${fv.now}`], '직접 고침'); else app.refresh?.();
            return;
        }
        case 'e-mark': { const m = meta.marks[Number(v)]; const fv = await form('⭐ 책갈피', [{ k: 'name', label: '이름', v: m.name }, { k: 'del', label: '이 책갈피', type: 'pick', v: '', opts: [['', '남기기'], ['del', '지우기']] }]); if (!fv) return; if (fv.del) meta.marks.splice(Number(v), 1); else m.name = short(fv.name, 30) || m.name; saveMeta(); app.refresh?.(); return; }
    }
}
// 📍 장소 하나 (설정집) — 이름 · 종류 · 노선 · 이어진 곳 · 층 · 물건 · 쉬기 효과 · 메모
async function editPlace(name) {
    const meta = getMeta(), b = meta.book, p = name ? placeOf(b, name) : null;
    const others = b.world.places.filter(x => x.name !== name).map(x => x.name);
    const fv = await form(p ? `✏️ ${PLACE_KINDS[p.kind]} ${esc(p.name)}` : '＋ 장소 추가', [
        { k: 'name', label: '이름', v: p?.name ?? '' },
        { k: 'kind', label: '종류', type: 'pick', v: p?.kind ?? 'other', opts: Object.entries(PLACE_KINDS).map(([k, i]) => [k, `${i} ${{ home: '집', shop: '가게', food: '식당', bath: '씻는 곳', work: '일터', street: '거리 · 광장', school: '학교', other: '기타' }[k]}`]) },
        { k: 'line', label: '노선 이름', v: p?.line ?? '', chips: [...new Set(b.world.places.map(x => x.line).filter(Boolean))] },
        { k: 'near', label: '이어진 곳 (쉼표로)', v: listText(p?.near), chips: others.slice(0, 8) },
        { k: 'floors', label: '층 (줄마다 「층: 방, 방」)', type: 'area', v: (p?.floors ?? []).join('\n'), ph: '1층: 식당, 카운터\n2층: 내 방' },
        { k: 'goods', label: '물건 (줄마다 「이름 가격 효과」)', type: 'area', v: (p?.goods ?? []).map(g => `${g.name} ${g.price}${Object.keys(g.fx).length ? ` ${fxText(g.fx, b)}` : ''}`).join('\n'), ph: '빵 3 허기 +20\n꽃 5' },
        { k: 'rest', label: '쉬면', v: fxText(p?.rest, b), ph: '에너지 +25' },
        { k: 'note', label: '메모', v: p?.note ?? '' },
        ...(p ? [{ k: 'del', label: '이 장소', type: 'pick', v: '', opts: [['', '남기기'], ['del', '지우기']] }] : []),
    ]);
    if (!fv?.name.trim()) return;
    if (fv.del) { b.world.places = b.world.places.filter(x => x.name !== name); return saveBook(); }
    // 「이어진 곳」의 반대쪽도 이어 둔다 (노선도가 양쪽에서 같은 길을 본다)
    // 칩으로 고른 이어진 곳은 입력 칸에 덧붙여져 있다
    const goods = String(fv.goods).split('\n').map(l => { const m = /^\s*(.+?)\s+(\d+)\s*(.*)$/.exec(l); return m ? { name: m[1].trim(), price: Number(m[2]), fx: fxParse(m[3], b) } : null; }).filter(Boolean);
    const np = { name: fv.name.trim(), kind: fv.kind || 'other', line: fv.line, near: listOf(fv.near), floors: String(fv.floors).split('\n').map(x => x.trim()).filter(Boolean), goods, rest: fxParse(fv.rest, b), note: fv.note, photo: p?.photo ?? '', x: p?.x, y: p?.y };
    const list = p ? b.world.places.map(x => (x.name === name ? np : x)) : [...b.world.places, np];
    for (const q of list) if (q !== np && np.near.some(n => norm(n) === norm(q.name)) && !q.near.some(n => norm(n) === norm(np.name))) q.near = [...q.near, np.name];
    if (p && p.name !== np.name) for (const q of list) q.near = q.near.map(n => (n === p.name ? np.name : n));
    meta.book = normBook({ ...b, world: { ...b.world, places: list } }); saveBook();
}

// ───── ✨ AI로 수정: 한 줄 지시 → AI 1회 → 바뀔 것 미리 보기 → 확인하면 반영 (되돌리기 가능) ─────
const AI_KEYS = 'loc, time(+2h | 14:30), weather, cash(+10 | -5), got(item | n), lost(item), wear(item), act(name | what), aff(name +3 | why), trust(name -2 | why), status(name | 3d) or status(-name), memory(name | event), promise(text | 3/14), life(name | news), 허기/에너지 등 욕구 이름(+10)';
export async function aiEdit(appId) {
    const fv = await form('✨ AI로 수정', [{ k: 'say', label: '어떻게 바꿀까요?', type: 'area', ph: '예: 아까 산 빵은 사실 두 개였어 · Leon 애정을 조금 낮춰 줘 · 시장 옆에 대장간을 만들어 줘' }], { ok: 'AI에게 맡기기' });
    if (!fv?.say.trim()) return;
    const r = fold(), b = r.book, S = r.S;
    const ctxt = { now: `needs ${JSON.stringify(S.needs)} gauges ${JSON.stringify(S.gauges)} status ${S.status.map(s => s.name).join(',')}`, bag: `cash ${S.cash} items ${S.items.map(i => `${i.name}x${i.n}`).join(', ')}`, rel: Object.entries(S.rel).map(([n, x]) => `${n} aff ${x.aff} trust ${x.trust}`).join(' · '), map: `here ${S.loc} places ${b.world.places.map(p => p.name).join(', ')}`, cal: `time ${S.t} weather ${S.weather}`, news: S.news.slice(0, 5).map(n => n.text).join(' / '), custom: JSON.stringify(S.custom) }[appId] ?? '';
    const bookPart = appId === 'rel' ? JSON.stringify({ people: b.people }).slice(0, 4000) : appId === 'map' ? JSON.stringify({ places: b.world.places.map(({ photo, ...p }) => p) }).slice(0, 4000) : '';
    toast('AI에게 묻는 중…');
    const raw = await ask(`The user wants to change the status window: "${fv.say.trim()}"\nCurrent: ${ctxt}\n${bookPart ? `Rulebook part (JSON): ${bookPart}\nIf the change is about the rulebook (adding/changing people or places), output the FULL changed list as JSON in a \`\`\`json block: ${appId === 'rel' ? '{"people":[...]}' : '{"places":[...]}'}.\n` : ''}If it is about current values, output event lines inside <meatball></meatball> using keys: ${AI_KEYS}. Output nothing else.\n${gloss()}`, 'You edit a status window. Be minimal and exact.');
    const lines = readOps(raw).map(([k, v]) => `${k}: ${v}`), j = parseJSON(raw.replace(/<meatball>[\s\S]*?<\/meatball>/i, ''));
    const patch = j && (Array.isArray(j.people) || Array.isArray(j.places)) ? j : null;
    if (!lines.length && !patch) { toast('바꿀 것을 못 찾았어요', 'bad'); return; }
    const preview = `${lines.length ? `<h4 class="ml-h4">값 바꾸기 (기록에 ✨로 남음)</h4>${lines.map(l => `<div class="ml-rl"><i>•</i>${esc(l)}</div>`).join('')}` : ''}${patch ? `<h4 class="ml-h4">설정집 바꾸기</h4><div class="ml-rl"><i>📘</i>${patch.people ? `인물 ${patch.people.length}명` : `장소 ${patch.places.length}곳`}으로 바뀌어요</div>` : ''}`;
    sheet('✨ 이렇게 바꿀까요?', preview, {
        ok: '반영',
        onOk: () => {
            if (patch) { const meta = getMeta(); meta.book = normBook(patch.people ? { ...meta.book, people: patch.people } : { ...meta.book, world: { ...meta.book.world, places: patch.places.map(p => ({ ...p, photo: placeOf(meta.book, p.name)?.photo ?? '' })) } }); saveBook(); }
            if (lines.length) handLines(lines, `✨ ${fv.say.trim()}`, 'ai');
            toast('반영했어요 · 기록에서 되돌릴 수 있어요', 'good');
        },
    });
}

// ───── 🌐 용어집 (번역 고정): 「Leon → 레온」 — 상태창 화면 · 이름 맞추기 · 미트볼 AI 호출에 늘 같은 말 ─────
export async function editGloss() {
    const meta = getMeta(), all = settings().glossary ?? [], chat = meta.glossary ?? [];
    const rows = [...chat.map((g, i) => ({ ...g, sc: 'chat', i })), ...all.map((g, i) => ({ ...g, sc: 'all', i }))];
    sheet('🌐 용어집 · 번역 고정', `<div class="ml-hint">한 번 정해 두면 상태창 화면 · 이름 맞추기 · 미트볼 AI가 늘 이 말을 써요. 본편에는 안 가요.</div><div class="ml-card">${rows.map(g => `<div class="ml-row tap" data-act="g-edit" data-v="${g.sc}|${g.i}"><span class="ml-tx"><b>${esc(g.from)} → ${esc(g.to)}</b><small>${g.sc === 'all' ? '모든 채팅' : '이 채팅'}</small></span><span class="ml-val"><i class="ml-chev">›</i></span></div>`).join('') || '<div class="ml-row"><span class="ml-tx"><small>아직 없어요</small></span></div>'}</div><div class="ml-acts">${btn('＋ 용어', 'g-edit', '')}${btn('📘 설정집 이름 모두 넣기', 'g-fill', '')}</div>${trOn() ? `<h4 class="ml-h4">번역 사전 <span>영어 저장 · 화면만 한국어 · 누르면 고치기</span></h4><div class="ml-card">${trList().map(([k, v]) => `<div class="ml-row tap" data-act="tr-edit" data-v="${esc(k)}"><span class="ml-tx"><b>${esc(k)} → ${esc(v)}</b></span><span class="ml-val"><i class="ml-chev">›</i></span></div>`).join('') || '<div class="ml-row"><span class="ml-tx"><small>아직 없어요 · 화면을 열면 모아서 번역해요</small></span></div>'}</div><div class="ml-card">${`<div class="ml-row tap" data-act="tr-rules"><span class="ml-tx"><b>📏 번역 규칙</b><small>${esc(trRules() || '없음 · 예: 이름은 원어 발음대로 · 짧게 · 존댓말 없이')}</small></span><span class="ml-val"><i class="ml-chev">›</i></span></div><div class="ml-row tap" data-act="tr-orig"><span class="ml-tx"><b>👁 원문 보기</b><small>${trOrig() ? '지금 영어 그대로 보는 중 · 누르면 다시 번역' : '잠깐 영어 그대로 보기'}</small></span></div>`}</div><div class="ml-acts">${btn('🔄 지금 번역', 'tr-now', '', 'xs')}${btn('♻️ 사전 다시 만들기', 'tr-redo', '', 'xs')}${btn('🗑 사전 비우기', 'tr-clear', '', 'xs')}</div>` : '<div class="ml-hint">영어로 저장하는 채팅이면 확장 설정에서 「상태창 저장 언어: 영어」를 고르세요. 화면만 한국어로 보여요.</div>'}`);
}
export async function glossItem(v) {
    const meta = getMeta();
    const [sc, i] = v ? v.split('|') : ['chat', null], list = sc === 'all' ? (settings().glossary ??= []) : (meta.glossary ??= []), g = i != null ? list[Number(i)] : null;
    const fv = await form(g ? '🌐 용어 고치기' : '＋ 용어', [{ k: 'from', label: '원래 말', v: g?.from ?? '', ph: 'Leon · Gold · Tavern' }, { k: 'to', label: '고정할 말', v: g?.to ?? '', ph: '레온 · 골드 · 여관' }, { k: 'sc', label: '어디에', type: 'pick', v: sc, opts: [['chat', '이 채팅'], ['all', '모든 채팅']] }, ...(g ? [{ k: 'del', label: '이 용어', type: 'pick', v: '', opts: [['', '남기기'], ['del', '지우기']] }] : [])]);
    if (!fv) return;
    if (g) list.splice(Number(i), 1);
    if (!fv.del && fv.from.trim() && fv.to.trim()) (fv.sc === 'all' ? (settings().glossary ??= []) : (meta.glossary ??= [])).push({ from: short(fv.from.trim(), 30), to: short(fv.to.trim(), 30) });
    saveSettings(); saveMeta(); app.refresh?.(true); editGloss();
}
export function glossFill() {
    const meta = getMeta(), b = meta.book, L = (meta.glossary ??= []), have = new Set(L.map(g => norm(g.from)));
    for (const p of b.people) for (const a of p.aka) if (/[a-z]/i.test(a) && !have.has(norm(a))) { L.push({ from: a, to: p.name }); have.add(norm(a)); }
    saveMeta(); app.refresh?.(true); editGloss(); toast(`용어 ${L.length}개`);
}
// 화면에 고정 번역 적용 (상태창 안의 글자만)
export function applyGloss(root) {
    const L = glossList(); if (!L.length || !root) return;
    const res = L.map(g => [new RegExp(g.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), g.to]);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('input, textarea, script, style, .ml-gloss-off') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { let t = n.nodeValue; for (const [re, to] of res) t = t.replace(re, to); if (t !== n.nodeValue) n.nodeValue = t; }
}

// 도구줄 누르기
export async function onTool(act, v) {
    const meta = getMeta();
    switch (act) {
        case 't-edit': return editApp(v);
        case 't-ai': return aiEdit(v);
        case 't-hide': (meta.hideAI ??= {})[v] = !meta.hideAI[v]; saveMeta(); app.refresh?.(); toast(meta.hideAI[v] ? '이 앱의 결과값을 본편에 안 보내요' : '다시 본편에 보내요'); return;
        case 't-parts': {
            const off = settings().partsOff?.[v] ?? [];
            sheet('👁 보일 것', `<div class="ml-card">${PARTS[v].map(([k, n]) => `<label class="ml-row"><span class="ml-tx"><b>${n}</b></span><input type="checkbox" class="ml-sw" data-part="${v}|${k}" ${off.includes(k) ? '' : 'checked'}></label>`).join('')}</div><div class="ml-hint">화면에서만 숨겨요. 계산 · 본편은 그대로예요.</div>`);
            document.querySelector('.ml-bs').addEventListener('change', (e) => { const [a, k] = e.target.dataset.part.split('|'); const s = settings(); s.partsOff ??= {}; const L = new Set(s.partsOff[a] ?? []); e.target.checked ? L.delete(k) : L.add(k); s.partsOff[a] = [...L]; saveSettings(); app.refresh?.(); });
            return;
        }
        case 't-gloss': return editGloss();
        case 'g-edit': return glossItem(v);
        case 'g-fill': return glossFill();
        case 'tr-edit': {
            const cur = meta.tr?.[v] ?? '';
            const fv = await form('🌐 번역 고치기', [{ k: 'to', label: esc(v), v: cur }, { k: 'how', label: '어디에', type: 'pick', v: 'tr', opts: [['tr', '번역 사전 (이 채팅)'], ['fix', '🌐 용어집에 고정'], ['del', '지우고 다시 번역']] }]);
            if (!fv) return;
            if (fv.how === 'del') delete meta.tr[v];
            else if (fv.how === 'fix') { (meta.glossary ??= []).push({ from: v, to: fv.to.trim() || cur }); delete meta.tr[v]; }
            else (meta.tr ??= {})[v] = fv.to.trim() || cur;
            saveMeta(); app.refresh?.(); return editGloss();
        }
        case 'tr-now': await flush(); return editGloss();
        case 'tr-rules': { const fv = await form('📏 번역 규칙', [{ k: 't', label: '규칙 (AI 번역에 같이 감 · 본편엔 안 감)', type: 'area', v: meta.trRules ?? settings().trRules ?? '', chips: ['이름은 원어 발음대로', '짧고 게임 UI처럼', '존댓말 없이', '판타지 말투로'] }, { k: 'sc', label: '어디에', type: 'pick', v: meta.trRules ? 'chat' : 'all', opts: [['chat', '이 채팅'], ['all', '모든 채팅']] }]); if (!fv) return; if (fv.sc === 'chat') meta.trRules = fv.t.trim().slice(0, 200); else { settings().trRules = fv.t.trim().slice(0, 200); meta.trRules = ''; saveSettings(); } saveMeta(); return editGloss(); }
        case 'tr-orig': meta.trOrig = !meta.trOrig; saveMeta(); app.refresh?.(); return editGloss();
        case 'tr-redo': { const keep = new Set(glossList().map(g => g.from)); meta.tr = Object.fromEntries(Object.entries(meta.tr ?? {}).filter(([k]) => keep.has(k))); saveMeta(); app.refresh?.(); setTimeout(() => flush(), 300); return editGloss(); }
        case 'tr-clear': meta.tr = {}; saveMeta(); app.refresh?.(); return editGloss();
        default: return editItem(act, v);
    }
}
export const TOOL_ACTS = new Set(['tr-edit', 'tr-now', 'tr-clear', 'tr-rules', 'tr-orig', 'tr-redo', 't-edit', 't-ai', 't-hide', 't-parts', 't-gloss', 'g-edit', 'g-fill', 'e-need', 'e-gauge', 'e-attr', 'e-status', 'e-add-stat', 'e-item', 'e-place', 'e-cfield', 'e-mark']);
