// 🧰 앱마다 붙는 공통 도구줄: ✏️ 편집 · ✨ AI로 수정 · 🙈 AI에게 숨기기 · 👁 보일 것 · 🌐 용어집(번역 고정)
//   편집은 바텀시트 입력 칸 → 상태 값은 마지막 답에 「손으로 고침 + 이유」로 적고(기록 · 되돌리기), 설정집은 설정집에 바로
import { app, ctx, settings, saveSettings, getMeta, saveMeta, msgData, syncSwipe, bumpMeta, saveChatSoon, setEyes } from '../base/st.js';
import { esc, num, short, norm, safeKey, signed, dateText } from '../base/util.js';
import { form, sheet, toast, btn } from './kit.js';
import { quickEdit } from './editnow.js';
import { askLight } from '../rules/classify.js';
import { clsRoute } from '../rules/clsconn.js';
import { fold } from '../rules/engine.js';
import { normBook, placeOf, PLACE_KINDS, fxOf } from '../rules/book.js';
import { ask, parseJSON } from '../rules/ai.js';
import { readOps, kindOf } from '../rules/tags.js';
import { glossList, gloss, applyGloss } from '../base/gloss.js';
export { glossList, gloss };

// 앱 → 영향력 게이지 칸 (🙈 숨기기가 끄는 것)
// 앱 화면 id → 눈 감기 앱 id (추천 음악 · 한 구절 · 기록 · 내 탭까지 모든 앱)
const APPS_MOD = { now: 'stats', bag: 'wallet', rel: 'rel', map: 'map', cal: 'calendar', dice: 'dice', news: 'news', music: 'music', quote: 'quote', mind: 'mind', custom: 'custom' };
export const APP_GAUGE = { now: 'stats', bag: 'wallet', rel: 'rel', map: 'map', cal: 'calendar', dice: 'dice', news: 'news', mind: 'mind', quote: 'quote' };
// 👁 보일 것 — 앱 안의 칸
export const PARTS = {
    home: [['hero', '오늘 · 장소'], ['tags', '상태 딱지'], ['scene', '이 장면'], ['soon', '곧 일어날 일'], ['stats', '수치'], ['dice', '주사위'], ['with', '같이 있는 사람'], ['turn', '이번 답'], ['cal', '달력'], ['news', '세계 소식'], ['today', '오늘 한 줄']],
    now: [['tags', '상태 딱지'], ['scene', '이 장면'], ['needs', '욕구'], ['gauges', '게이지'], ['attrs', '능력치'], ['turn', '이번 답'], ['history', '딱지 이력']],
    rel: [['line', '성격 한 줄'], ['meters', '애정 · 우정 막대'], ['call', '호칭 · 행동'], ['next', '다음 단계'], ['last', '최근 변화'], ['want', '속셈'], ['mem', '감정 기억'], ['taste', '취향'], ['place', '장소 · 생일'], ['thread', '처음 · 연표 (더보기)']],
    map: [['map', '노선도'], ['pins', '인물 목록'], ['goods', '물가'], ['building', '건물 안 · 사진'], ['life', '여기서 있었던 일'], ['foot', '발자국 (자주 간 곳 진하게)']],
    bag: [['cash', '재산'], ['ledger', '가계부'], ['items', '소지품'], ['shop', '가게']],
};
export const vis = (appId, part) => !(settings().partsOff?.[appId] ?? []).includes(part);
export const hiddenAI = (gid) => !!getMeta()?.hideAI?.[gid];

const EDITABLE = new Set(['now', 'dice', 'bag', 'rel', 'map', 'cal', 'news', 'custom', 'music', 'rec', 'mind', 'quote']);
export function toolbar(appId) {
    const gid = APP_GAUGE[appId], hid = gid && hiddenAI(gid);
    const B = [];
    if (EDITABLE.has(appId)) B.push(`<button class="ml-tool" data-act="t-edit" data-v="${appId}">✏️ 편집</button>`);
    if (AI_APPS.has(appId)) B.push(`<button class="ml-tool" data-act="t-ai" data-v="${appId}">✨ AI로 수정</button>`);
    if (PARTS[appId]) B.push(`<button class="ml-tool" data-act="t-parts" data-v="${appId}">👁 보일 것</button>`);
    // 😌 눈 감기 하나로: 누르면 고르기 — 평소 · 🙈 결과만 본편에 숨기기(계속 셈) · 다음 1번 쉬기 · 계속 쉬기
    const mod = APPS_MOD[appId], e = mod && getMeta()?.eyes?.[mod]?.mode;
    if (mod || gid) B.push(`<button class="ml-tool${e || hid ? ' on' : ''}" data-act="t-eye" data-v="${mod ?? ''}|${gid ?? ''}" title="이 앱을 AI에게서 쉬게 하기">${e === 'on' ? '😌 계속 쉼' : e === 'once' ? '😌 다음 1번 쉼' : hid ? '🙈 본편에만 숨김' : '😌 눈 감기'}</button>`);
    B.push('<button class="ml-tool" data-act="t-gloss">🌐 용어집</button>');
    return `<div class="ml-tools2">${B.join('')}</div>`;
}

// 손으로 고친 값 → 마지막 답에 (기록에 ✋ · 줄마다 되돌리기)
const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
export function handLines(lines, why, src = 'hand') {
    const i = lastAI();
    if (i < 0) { // AI 답이 아직 없으면 시작 상태에 붙임 (첫 답이 오면 그 위에서 이어짐)
        const meta = getMeta(); if (!meta) return false;
        for (const ln of lines) { const k = ln.slice(0, ln.indexOf(':')).trim(), v = ln.slice(ln.indexOf(':') + 1).trim(); if (k && v) (meta.preHand ??= []).push({ k, v, why: short(why, 30), src }); }
        saveMeta(); app.refresh?.(true); return true;
    }
    const m = ctx().chat[i], sl = msgData(m, true);
    if (!sl.ops) sl.ops = readOps(m.mes);
    for (const ln of lines) { const k = ln.slice(0, ln.indexOf(':')).trim(), v = ln.slice(ln.indexOf(':') + 1).trim(); if (k && v) (sl.hand ??= []).push({ k, v, why: short(why, 30), src }); }
    sl.rev = (sl.rev ?? 0) + 1; bumpMeta(); syncSwipe(m); saveChatSoon(); app.refresh?.();
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
    sheet(title, `${hint ? `<div class="ml-hint">${hint}</div>` : ''}<div class="ml-card">${rows.map(r => `<div class="ml-row tap" data-act="${r.act}" data-v="${esc(r.v)}"><span class="ml-ic">${r.icon ?? '•'}</span><span class="ml-tx"><b>${esc(r.title)}`
        + `</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="ml-val"><i class="ml-chev">›</i></span></div>`).join('') || '<div class="ml-row"><span class="ml-tx"><small>비어 있어요</small></span></div>'}</div><div class="ml-acts">${btn(`＋ ${addLabel}`, addAct, '', 'xs')}</div>`);
}

// ───── 앱별 편집 ─────
// ✏️ 편집: 먼저 「지금 값」 한 화면(수치 · 소지품 · 관계 · 지도) → 그 안의 「📘 규칙 고치기」로 설정집 칸 (editRules)
export async function editApp(appId) {
    const q = await quickEdit(appId, handLines);
    if (q === null) return editRules(appId);
}
export async function editRules(appId) {
    const r = fold(), meta = getMeta(), b = meta.book;
    switch (appId) {
        case 'now':
        case 'dice':
            return listSheet(
                '✏️ 수치 편집',
                [
                    ...b.me.needs.map((n) => ({
                        act: 'e-need',
                        v: n.key,
                        icon: n.icon,
                        title: `욕구 · ${n.name}`,
                        sub: `지금 ${Math.round(r.S.needs[n.key])} · 시작 ${n.start} · 시간당 −${n.rate}`,
                    })),
                    ...b.me.gauges.map((g) => ({
                        act: 'e-gauge',
                        v: g.key,
                        icon: '❤️',
                        title: `게이지 · ${g.name}`,
                        sub: `지금 ${r.S.gauges[g.key]} / ${g.max}`,
                    })),
                    ...b.me.attrs.map((a) => ({
                        act: 'e-attr',
                        v: a.name,
                        icon: '💪',
                        title: `능력치 · ${a.name}`,
                        sub: `지금 ${signed(r.S.attrs[a.name] ?? 0)} · 시작 ${signed(a.v)}`,
                    })),
                    ...r.S.status.map((s) => ({
                        act: 'e-status',
                        v: s.name,
                        icon: '🏷️',
                        title: `상태 딱지 · ${s.name}`,
                        sub: s.until ? `${Math.round((s.until - r.S.t) / 60)}시간 남음` : '기간 없음',
                    })),
                ],
                '항목 추가',
                'e-add-stat',
                '욕구는 3~5개가 좋아요 · 지금 값은 이유와 함께 기록돼요',
            );
        case 'bag':
            return listSheet(
                '✏️ 소지품 편집',
                [
                    { act: 'edit-cash', v: '', icon: '💰', title: `가진 돈 ${r.S.cash} ${b.world.currency}`, sub: `식사 한 끼 ≈ ${b.world.meal}` },
                    ...r.S.items.map((it) => ({
                        act: 'e-item',
                        v: it.name,
                        icon: it.worn ? '👕' : '📦',
                        title: `${it.name} ×${it.n}`,
                        sub: [it.worn ? '착용 중' : '', fxText(it.fx, b)].filter(Boolean).join(' · '),
                    })),
                ],
                '물건 넣기',
                'e-item',
            );
        case 'rel':
            return listSheet(
                '✏️ 인물 편집',
                b.people.map((p) => ({ act: 'bk-person', v: p.name, icon: p.face, title: p.name, sub: p.line || '성격 비어 있음' })),
                '인물 추가',
                'bk-person',
                '설정집의 인물 칸을 고쳐요 · 지금 애정 · 우정은 막대를 눌러 고쳐요',
            );
        case 'map':
            return listSheet(
                '✏️ 장소 편집',
                b.world.places.map((p) => ({
                    act: 'e-place',
                    v: p.name,
                    icon: PLACE_KINDS[p.kind],
                    title: p.name,
                    sub: [p.line, p.near.length ? `→ ${p.near.join(', ')}` : '', p.goods.length ? `물건 ${p.goods.length}` : '']
                        .filter(Boolean)
                        .join(' · '),
                })),
                '장소 추가',
                'e-place',
                '「이어진 곳」을 적으면 노선도에 길이 생겨요',
            );
        case 'cal': {
            const fv = await form('✏️ 달력 편집', [
                { k: 'date', label: '날짜로 이동', ph: '3/14', hint: '앞으로만 갈 수 있어요 (지난 날짜는 다음 해)' },
                { k: 'time', label: '시각', ph: '14:30 · 저녁 · +2h', chips: ['아침', '낮', '저녁', '밤', '+1h', '+1일'] },
                {
                    k: 'weather',
                    label: '날씨',
                    type: 'pick',
                    v: r.S.weather,
                    opts: [...new Set([...b.world.weather, '맑음', '흐림', '비', '눈', '안개'])].map((w) => [w, w]),
                },
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
            const fv = await form('✏️ 소식 쓰기', [
                { k: 'kind', label: '종류', type: 'pick', v: 'world', opts: [['world', '📰 뉴스'], ['rumor', '💬 소문'], ['feed', '📱 피드'], ['life', '🌙 화면 밖']] },
                { k: 'who', label: '누구 이야기 (피드 · 화면 밖)', type: 'pick', opts: [['', '없음'], ...b.people.map((p) => [p.name, `${p.face} ${esc(p.name)}`])] },
                { k: 'text', label: '내용', type: 'area', ph: '경비 교대 뒤 술집에 들렀다' },
            ]);
            if (!fv?.text.trim()) return;
            const nt = fv.text.trim(), nk = fv.who && (fv.kind === 'feed' || fv.kind === 'life') ? fv.kind : fv.who ? 'life' : fv.kind === 'rumor' ? 'rumor' : 'world';
            handLines([nk === 'feed' || nk === 'life' ? `${nk}: ${fv.who} | ${nt}` : `newsline: ${nk === 'rumor' ? '소문' : '뉴스'} | ${nt}`], '직접 씀');
            return;
        }
        case 'custom':
            return listSheet(
                '✏️ 내 탭 편집',
                (meta.custom ?? []).flatMap((t, ti) =>
                    t.fields.map((f) => ({
                        act: 'e-cfield',
                        v: `${ti}|${f.name}`,
                        icon: t.icon,
                        title: `${t.name} · ${f.name}`,
                        sub: `지금 ${r.S.custom[t.name]?.[f.name] ?? f.start ?? '-'}${f.max ? ` / ${f.max}` : ''}`,
                    })),
                ),
                '새 탭',
                'ctab-new',
                '칸을 누르면 값 · 단계 · 경계 문구를 고쳐요',
            );
        case 'music': {
            const x = r.S.bgm ?? {};
            const fv = await form('✏️ 지금 곡', [
                { k: 'title', label: '곡 제목', v: x.title ?? '' },
                { k: 'artist', label: '가수', v: x.artist ?? '' },
                { k: 'mood', label: '분위기 한 단어', v: x.mood ?? '' },
                { k: 'why', label: '왜 어울리는지', v: x.why ?? '' },
                { k: 'taste', label: '음악 취향 (이 채팅 · 비우면 기본값)', v: meta.musicTaste ?? '' },
            ]);
            if (!fv) return;
            if ((fv.taste ?? '') !== (meta.musicTaste ?? '')) { meta.musicTaste = fv.taste.trim().slice(0, 60); saveMeta(); }
            if (fv.title.trim() && (fv.title !== (x.title ?? '') || fv.artist !== (x.artist ?? '') || fv.mood !== (x.mood ?? '') || fv.why !== (x.why ?? '')))
                handLines([`bgm: ${fv.title.trim()} - ${fv.artist.trim()} | ${fv.mood.trim()} | ${fv.why.trim()}`], '✏️ 곡 직접 고침');
            else app.refresh?.();
            return;
        }
        case 'quote': {
            const x = r.S.quote ?? {};
            const fv = await form('✏️ 지금 구절', [
                { k: 'text', label: '구절', type: 'area', v: x.text ?? '' },
                { k: 'src', label: '출처 (작품 · 사람 · 나라)', v: x.src ?? '' },
                { k: 'mean', label: '한국어 뜻 (외국어일 때)', v: x.mean ?? '' },
                { k: 'why', label: '왜 어울리는지', v: x.why ?? '' },
            ]);
            if (!fv?.text?.trim()) return;
            return handLines([`quote: ${fv.text.trim().replace(/\|/g, '/')} | ${fv.src.trim()} | ${fv.mean.trim()} | ${fv.why.trim()}`], '✏️ 구절 직접 고침');
        }
        case 'mind': {
            const fv = await form('✏️ 속마음', [
                {
                    k: 'who',
                    label: '누가 말할까',
                    type: 'pick',
                    v: (meta.mindWho ?? ['cast']).join('+'),
                    opts: [
                        ['cast', '장면 속 인물'],
                        ['cast+watch', '+ 관전자'],
                        ['cast+cell', '+ 세포들'],
                        ['cast+watch+cell', '셋 다'],
                    ],
                },
            ]);
            if (fv) {
                meta.mindWho = fv.who.split('+');
                saveMeta();
                app.refresh?.();
            }
            return;
        }
        case 'rec':
            return listSheet(
                '✏️ 책갈피',
                (meta.marks ?? []).map((m, i) => ({ act: 'e-mark', v: i, icon: '⭐', title: m.name })),
                '마지막 답 책갈피',
                'mark',
            );
    }
}

// 항목 하나 편집 (목록 시트에서 누른 것)
export async function editItem(act, v) {
    const r = fold(), meta = getMeta(), b = meta.book;
    switch (act) {
        case 'e-need': {
            const n = b.me.needs.find((x) => x.key === v);
            const fv = await form(`✏️ ${n.icon} ${esc(n.name)}`, [
                { k: 'now', label: '지금 값', type: 'number', v: Math.round(r.S.needs[n.key]) },
                { k: 'why', label: '이유', ph: '직접 고침' },
                { k: 'name', label: '이름', v: n.name },
                { k: 'icon', label: '아이콘', v: n.icon },
                { k: 'start', label: '시작 값', type: 'number', v: n.start },
                { k: 'rate', label: '시간당 줄어드는 양', type: 'number', v: n.rate },
                {
                    k: 'del',
                    label: '이 욕구',
                    type: 'pick',
                    v: '',
                    opts: [
                        ['', '남기기'],
                        ['del', '빼기'],
                    ],
                },
            ]);
            if (!fv) return;
            if (fv.del) {
                b.me.needs = b.me.needs.filter((x) => x.key !== v);
                return saveBook();
            }
            Object.assign(n, {
                name: short(fv.name, 8) || n.name,
                icon: short(fv.icon, 4) || n.icon,
                start: num(fv.start, n.start),
                rate: Math.max(0, num(fv.rate, n.rate)),
            });
            const d = num(fv.now) - Math.round(r.S.needs[n.key]);
            saveBook();
            if (fv.now !== '' && d) handLines([`${n.name}: ${d > 0 ? '+' : ''}${d}`], fv.why || '직접 고침');
            return;
        }
        case 'e-gauge': {
            const g = b.me.gauges.find((x) => x.key === v);
            const fv = await form(`✏️ ${esc(g.name)}`, [
                { k: 'now', label: '지금 값', type: 'number', v: r.S.gauges[g.key] },
                { k: 'why', label: '이유', ph: '직접 고침' },
                { k: 'name', label: '이름', v: g.name },
                { k: 'max', label: '최대', type: 'number', v: g.max },
                { k: 'desc', label: '0이 되면', v: g.desc },
                {
                    k: 'del',
                    label: '이 게이지',
                    type: 'pick',
                    v: '',
                    opts: [
                        ['', '남기기'],
                        ['del', '빼기'],
                    ],
                },
            ]);
            if (!fv) return;
            if (fv.del) {
                b.me.gauges = b.me.gauges.filter((x) => x.key !== v);
                return saveBook();
            }
            Object.assign(g, { name: short(fv.name, 8) || g.name, max: Math.max(1, num(fv.max, g.max)), desc: short(fv.desc, 40) });
            const d = num(fv.now) - num(r.S.gauges[g.key]);
            saveBook();
            if (fv.now !== '' && d) handLines([`${g.name}: ${d > 0 ? '+' : ''}${d}`], fv.why || '직접 고침');
            return;
        }
        case 'e-attr': {
            const a = b.me.attrs.find((x) => x.name === v);
            const fv = await form(`✏️ 💪 ${esc(a.name)}`, [
                { k: 'now', label: '지금 값', type: 'number', v: r.S.attrs[a.name] ?? 0, chips: ['-1', '0', '1', '2', '3'] },
                { k: 'why', label: '이유', ph: '수련 · 성장' },
                { k: 'name', label: '이름', v: a.name },
                {
                    k: 'del',
                    label: '이 능력치',
                    type: 'pick',
                    v: '',
                    opts: [
                        ['', '남기기'],
                        ['del', '빼기'],
                    ],
                },
            ]);
            if (!fv) return;
            if (fv.del) {
                b.me.attrs = b.me.attrs.filter((x) => x.name !== v);
                return saveBook();
            }
            a.name = short(fv.name, 6) || a.name;
            const d = num(fv.now) - num(r.S.attrs[v]);
            saveBook();
            if (d) handLines([`attr: ${a.name} ${d > 0 ? '+' : ''}${d} | ${fv.why || '직접 고침'}`], fv.why || '직접 고침');
            return;
        }
        case 'e-status': {
            const fv = await form(`🏷️ ${esc(v)}`, [
                {
                    k: 'how',
                    label: '어떻게',
                    type: 'pick',
                    v: 'off',
                    opts: [
                        ['off', '지금 풀기'],
                        ['3d', '3일 더'],
                        ['1d', '하루 더'],
                    ],
                },
            ]);
            if (!fv) return;
            handLines([fv.how === 'off' ? `status: -${v}` : `status: ${v} | ${fv.how}`], '직접 고침');
            return;
        }
        case 'e-add-stat': {
            const fv = await form('＋ 항목 추가', [
                {
                    k: 'kind',
                    label: '종류',
                    type: 'pick',
                    v: 'need',
                    opts: [
                        ['need', '욕구'],
                        ['gauge', '게이지'],
                        ['attr', '능력치'],
                        ['status', '상태 딱지'],
                    ],
                },
                { k: 'name', label: '이름', ph: '예: 갈증 · 마나 · 행운 · 감기' },
                { k: 'icon', label: '아이콘', v: '•', chips: ['💧', '✨', '🔥', '🧠', '💤'] },
                { k: 'n', label: '시간당 줄어듦 · 최대 · 기간', type: 'number', ph: '욕구 2 · 게이지 100 · 딱지는 비움' },
            ]);
            if (!fv?.name.trim()) return;
            const nm = short(fv.name.trim(), 8),
                key = safeKey(nm);
            if (fv.kind === 'need') b.me.needs.push({ key, name: nm, icon: short(fv.icon, 4) || '•', start: 80, rate: num(fv.n, 2), sym: null });
            if (fv.kind === 'gauge')
                b.me.gauges.push({ key, name: nm, max: num(fv.n, 100) || 100, start: num(fv.n, 100) || 100, desc: '', color: '#3a8ee6' });
            if (fv.kind === 'attr') b.me.attrs.push({ name: nm, v: 0 });
            if (fv.kind === 'status') {
                handLines([`status: ${nm}${fv.n ? ` | ${fv.n}d` : ''}`], '직접 붙임');
                return;
            }
            meta.book = normBook(b);
            return saveBook();
        }
        case 'e-item': {
            const it = v ? r.S.items.find((x) => x.name === v) : null;
            const fv = await form(it ? `✏️ ${esc(it.name)}` : '＋ 물건 넣기', [
                { k: 'name', label: '이름', v: it?.name ?? '' },
                { k: 'n', label: '개수', type: 'number', v: it?.n ?? 1 },
                {
                    k: 'worn',
                    label: '착용',
                    type: 'pick',
                    v: it?.worn ? 'y' : 'n',
                    opts: [
                        ['n', '안 입음'],
                        ['y', '착용 중'],
                    ],
                },
                { k: 'fx', label: '효과', v: fxText(it?.fx, b), ph: '허기 +20, 기분 +3 · 입으면 힘 +1' },
                { k: 'why', label: '이유', ph: '직접 고침', chips: ['이야기에서 얻음', '이야기에서 잃음', '계산이 틀림'] },
            ]);
            if (!fv?.name.trim()) return;
            const name = short(fv.name.trim(), 20),
                n = Math.max(0, num(fv.n, 1)),
                L = [];
            const fx = fxParse(fv.fx, b);
            (b.world.itemFx ??= {})[name] = fx;
            saveMeta();
            const cur = it?.n ?? 0;
            if (n > cur) L.push(`got: ${name} | ${n - cur}`);
            if (n < cur) L.push(n === 0 ? `lost: ${name}` : `item: -${name} | ${cur - n}`);
            if (n > 0 && (fv.worn === 'y') !== !!it?.worn) L.push(`${fv.worn === 'y' ? 'wear' : 'unwear'}: ${name}`);
            if (L.length) handLines(L, fv.why || '직접 고침');
            else app.refresh?.(true);
            return;
        }
        case 'e-place':
            return editPlace(v);
        case 'e-cfield': {
            const [ti, fname] = v.split('|');
            const t = meta.custom[Number(ti)],
                f = t.fields.find((x) => x.name === fname);
            const fv = await form(`✏️ ${esc(t.name)} · ${esc(f.name)}`, [
                { k: 'now', label: '지금 값', v: r.S.custom[t.name]?.[f.name] ?? '' },
                { k: 'max', label: '최대 (숫자 칸)', type: 'number', v: f.max || '' },
                { k: 'st', label: '단계 경계', v: (f.stages ?? [30, 70]).join(', '), hint: '「30, 70」 → 낮음 · 보통 · 높음' },
                { k: 'say', label: '높음이 되면 (경계 문구)', v: f.say ?? '', ph: '예: 눈빛이 멍해진다' },
                { k: 'link', label: '다른 칸과 연결', v: f.link ?? '', ph: '예: 기분 -5 (높음일 때)' },
            ]);
            if (!fv) return;
            Object.assign(f, {
                max: num(fv.max, 0),
                stages: listOf(fv.st).map(Number).filter(Number.isFinite).slice(0, 3),
                say: short(fv.say, 40),
                link: short(fv.link, 30),
            });
            saveMeta();
            if (String(fv.now) !== String(r.S.custom[t.name]?.[f.name] ?? '')) handLines([`custom: ${t.name} | ${f.name} | ${fv.now}`], '직접 고침');
            else app.refresh?.();
            return;
        }
        case 'e-mark': {
            const m = meta.marks[Number(v)];
            const fv = await form('⭐ 책갈피', [
                { k: 'name', label: '이름', v: m.name },
                {
                    k: 'del',
                    label: '이 책갈피',
                    type: 'pick',
                    v: '',
                    opts: [
                        ['', '남기기'],
                        ['del', '지우기'],
                    ],
                },
            ]);
            if (!fv) return;
            if (fv.del) meta.marks.splice(Number(v), 1);
            else m.name = short(fv.name, 30) || m.name;
            saveMeta();
            app.refresh?.();
            return;
        }
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
//   모든 앱 + 설정집. 지금 값은 사건 줄(기록에 ✨ · 되돌리기), 규칙은 설정집 조각(JSON)으로 받는다.
const AI_KEYS = 'loc, time(+2h | 14:30), weather, cash(+10 | -5), got(item | n), lost(item), wear(item), act(name | what), aff(name +3 | why), trust(name -2 | why), '
    + 'status(name | 3d) or status(-name), memory(name | event), promise(text | 3/14), life(name | news), mind(name | short inner thought), '
    + 'bgm(title - artist | mood | why), quote(text | source | Korean meaning | why), need names like 허기/에너지(+10)';
// 앱마다: 지금 값 요약 · 바꿀 수 있는 설정집 조각
const AI_SCOPE = {
    now: { book: ['me'] }, dice: { book: ['me'] }, bag: { book: ['places'] }, rel: { book: ['people'] }, map: { book: ['places'] }, cal: { book: ['world'] },
    news: { book: [] }, music: { book: [] }, quote: { book: [] }, rec: { book: [] }, mind: { book: [] }, custom: { book: [] },
    book: { book: ['world', 'me', 'people', 'places'] },
};
export const AI_APPS = new Set(Object.keys(AI_SCOPE));
function aiNow(appId, r) {
    const S = r.S, b = r.book;
    const all = `place ${S.loc} · time ${dateText(b.world.start, S.t)} · weather ${S.weather} · cash ${S.cash} · needs ${JSON.stringify(S.needs)} · status ${S.status.map((x) => x.name).join(',') || '-'}`;
    return {
        now: `needs ${JSON.stringify(S.needs)} gauges ${JSON.stringify(S.gauges)} attrs ${JSON.stringify(S.attrs)} status ${S.status.map((x) => x.name).join(',') || '-'}`,
        dice: `attrs ${JSON.stringify(S.attrs)} status ${S.status.map((x) => `${x.name}(${x.dice ?? 0})`).join(',') || '-'}`,
        bag: `cash ${S.cash} items ${S.items.map((i) => `${i.name}x${i.n}${i.worn ? '(worn)' : ''}`).join(', ') || '-'}`,
        rel: Object.entries(S.rel).map(([n, x]) => `${n} aff ${x.aff} trust ${x.trust}`).join(' · '),
        map: `here ${S.loc} with ${(S.with ?? []).join(',') || '-'}`,
        cal: `time ${dateText(b.world.start, S.t)} weather ${S.weather} promises ${(S.promises ?? []).map((q) => q.text).join(' / ') || '-'}`,
        news: (S.news ?? []).slice(0, 5).map((n) => n.text).join(' / ') || '-',
        music: S.bgm ? `now song ${S.bgm.title} - ${S.bgm.artist ?? ''} (${S.bgm.mood ?? ''})` : 'no song yet',
        quote: S.quote ? `now quote "${S.quote.text}" — ${S.quote.src ?? ''}` : 'no quote yet',
        mind: Object.entries(S.mind ?? {}).map(([n, t]) => `${n}: ${typeof t === 'string' ? t : JSON.stringify(t)}`).join(' / ') || '-',
        custom: JSON.stringify(S.custom ?? {}),
        rec: all,
        book: all,
    }[appId] ?? all;
}
function aiBookPart(keys, b) {
    const o = {};
    for (const k of keys) {
        if (k === 'world') { const { places, ...w } = b.world; o.world = w; }
        if (k === 'me') o.me = b.me;
        if (k === 'people') o.people = b.people;
        if (k === 'places') o.places = b.world.places.map(({ photo, ...p }) => p);
    }
    return keys.length ? JSON.stringify(o).slice(0, 9000) : '';
}
// 받은 설정집 조각 → 새 설정집 (모르는 칸 · 고를 수 없는 칸은 버림)
function applyBookPatch(book, patch, keys) {
    const nb = { ...book, world: { ...book.world }, me: { ...book.me } };
    if (keys.includes('world') && patch.world && typeof patch.world === 'object') { const { places, ...w } = patch.world; Object.assign(nb.world, w); }
    if (keys.includes('places') && Array.isArray(patch.places)) nb.world.places = patch.places.map((p) => ({ ...p, photo: placeOf(book, p?.name)?.photo ?? '' }));
    if (keys.includes('me') && patch.me && typeof patch.me === 'object') Object.assign(nb.me, patch.me);
    if (keys.includes('people') && Array.isArray(patch.people)) nb.people = patch.people;
    return normBook(nb);
}
function patchSummary(patch, keys) {
    const L = [];
    if (keys.includes('world') && patch.world) L.push(`🌍 세계: ${Object.keys(patch.world).filter((k) => k !== 'places').join(', ') || '-'}`);
    if (keys.includes('me') && patch.me) L.push(`🙋 나: ${Object.keys(patch.me).join(', ')}`);
    if (keys.includes('people') && Array.isArray(patch.people)) L.push(`👥 인물 ${patch.people.length}명으로`);
    if (keys.includes('places') && Array.isArray(patch.places)) L.push(`📍 장소 ${patch.places.length}곳으로`);
    return L;
}
// ✨ 미리 보기 한 줄: 「aff: Leon +5 | 이유」 → 💗 Leon 애정 +5 · 이유
const KEY_NICE = { aff: ['💗', '애정'], trust: ['🤝', '우정'], cash: ['💰', '돈'], earn: ['💰', '받은 돈'], got: ['👜', '얻음'], lost: ['👜', '잃음'], item: ['👜', '물건'], used: ['👜', '씀'], wear: ['👕', '입음'],
    loc: ['📍', '장소'], with: ['👥', '같이 있는 사람'], time: ['🕰️', '시간'], date: ['📅', '날짜'], weather: ['🌦️', '날씨'], status: ['🏷️', '상태'], act: ['💞', '행동'], memory: ['💬', '기억'],
    promise: ['🤝', '약속'], bgm: ['🎵', '곡'], quote: ['📜', '구절'], mind: ['💭', '속마음'], npc: ['👤', '새 인물'], gone: ['🕊️', '빠짐'], attr: ['💪', '능력치'], ate: ['🍽', '먹음'], slept: ['😴', '잠'], newsline: ['📰', '소식'], custom: ['🧩', '내 탭'] };
function niceLine(l) {
    const k = l.slice(0, l.indexOf(':')).trim(), v = l.slice(l.indexOf(':') + 1).trim(), [ic, nm] = KEY_NICE[k.toLowerCase()] ?? ['•', k];
    const [a, ...rest] = v.split('|').map(x => x.trim());
    return `<div class="ml-rl"><i>${ic}</i><b>${esc(nm)}</b> ${esc(a)}${rest.filter(Boolean).length ? ` <span>${esc(rest.filter(Boolean).join(' · '))}</span>` : ''}</div>`;
}
export async function aiEdit(appId) {
    const scope = AI_SCOPE[appId] ?? AI_SCOPE.book, keys = scope.book;
    const fv = await form('✨ AI로 수정', [{ k: 'say', label: '어떻게 바꿀까요?', type: 'area', ph: '예: 아까 산 빵은 사실 두 개였어 · 다은 애정을 조금 낮춰 줘 · 지금 곡을 잔잔한 걸로 · 카페에 케이크를 추가해 줘' }], { ok: 'AI에게 맡기기' });
    if (!fv?.say?.trim()) return;
    const r = fold(); if (!r) { toast('상태창이 아직 없어요', 'bad'); return; }
    const bookPart = aiBookPart(keys, r.book);
    toast('AI에게 묻는 중…');
    let raw = '';
    try {
        const SYS = 'You edit a status window. Be minimal and exact. Change only what the user asked.';
        const Q = `The user wants to change the status window (${appId}): "${fv.say.trim()}"\nCurrent values: ${aiNow(appId, r)}\n`
            + (bookPart ? `Rulebook part (JSON): ${bookPart}\nIf the change is about the rulebook, output ONLY the changed top-level parts as JSON in a \`\`\`json block (same shape; for people/places give the FULL changed list).\n` : '')
            + (appId === 'rel' ? `Relationship stages by aff (affection): ${(r.book.stages ?? []).map(s => `${s.name} ${s.at}+`).join(' · ')}. If the user describes where the relationship is NOW (e.g. "not lovers yet", "crush", "broke up"), change the current aff with an aff line so it lands inside that stage (e.g. aff: Name -25 | why), and if they mean how it STARTED, also change people[].start in the rulebook.\n` : '')
            + `If it is about current values, output event lines inside <meatball></meatball>, ONE per line in the form \`key: value\` (e.g. \`aff: Name -25 | why\`, \`cash: +10 | why\`), using keys: ${AI_KEYS}. Never write key(value). You may output both. Output nothing else.\n${gloss()}`;
        // 가벼운 연결(분류 연결 · 깨끗한 프리셋)이 있으면 그쪽으로 — 본편 프리셋 · 탈옥에 휘둘리지 않고 빠르게
        raw = clsRoute() ? await askLight(SYS, Q) : await ask(Q, SYS);
    } catch (e) { toast(`AI 호출 실패 · ${e.message ?? e}`, 'bad'); return; }
    // 알려 준 키만 (AI가 다른 키를 지어내면 미리 보기에 「알 수 없음」으로 섞이던 것)
    const OKK = new Set(['loc', 'time', 'weather', 'cash', 'got', 'lost', 'item', 'wear', 'unwear', 'act', 'aff', 'trust', 'status', 'memory', 'promise', 'life', 'mind', 'bgm', 'quote', 'need']);
    const nn = [...r.book.me.needs.flatMap(n => [n.name, n.key]), ...r.book.me.gauges.flatMap(g => [g.name, g.key])];
    const lines = readOps(raw).filter(([k]) => OKK.has(kindOf(k, nn))).map(([k, v]) => `${k}: ${v}`);
    const j = keys.length ? parseJSON(String(raw).replace(/<meatball>[\s\S]*?<\/meatball>/i, '')) : null;
    const patch = j && typeof j === 'object' && patchSummary(j, keys).length ? j : null;
    if (!lines.length && !patch) { toast('바꿀 것을 못 찾았어요', 'bad'); return; }
    const preview = `${lines.length ? `<h4 class="ml-h4">지금 값 바꾸기 <span>기록에 ✨로 남고 되돌릴 수 있어요</span></h4>${lines.map((l) => niceLine(l)).join('')}` : ''}`
        + `${patch ? `<h4 class="ml-h4">설정집 바꾸기</h4>${patchSummary(patch, keys).map((x) => `<div class="ml-rl"><i>📘</i>${esc(x)}</div>`).join('')}` : ''}`;
    sheet('✨ 이렇게 바꿀까요?', preview, {
        ok: '반영',
        onOk: () => {
            if (patch) { const meta = getMeta(); meta.book = applyBookPatch(meta.book, patch, keys); saveBook(); }
            if (lines.length) handLines(lines, `✨ ${fv.say.trim()}`, 'ai');
            toast('반영했어요 · 기록에서 되돌릴 수 있어요', 'good');
        },
    });
}

// ───── 🌐 용어집 (표기 고정): 「Leon → 레온」 — 상태창 화면 · 이름 맞추기 · 미트볼 AI 호출에 늘 같은 말 ─────
export async function editGloss() {
    const meta = getMeta(), all = settings().glossary ?? [], chat = meta.glossary ?? [];
    const rows = [...chat.map((g, i) => ({ ...g, sc: 'chat', i })), ...all.map((g, i) => ({ ...g, sc: 'all', i }))];
    sheet(
        '🌐 용어집 · 표기 고정',
        `<div class="ml-hint">한 번 정해 두면 상태창 화면 · 이름 맞추기 · 미트볼 AI가 늘 이 말을 써요. 본편에는 안 가요.</div><div class="ml-card">${
            rows
                .map(
                    (g) =>
                        `<div class="ml-row tap" data-act="g-edit" data-v="${g.sc}|${g.i}"><span class="ml-tx"><b>${esc(g.from)} → ${esc(g.to)}</b>` +
                        `<small>${g.sc === 'all' ? '모든 채팅' : '이 채팅'}</small></span><span class="ml-val"><i class="ml-chev">›</i></span></div>`,
                )
                .join('') || '<div class="ml-row"><span class="ml-tx"><small>아직 없어요</small></span></div>'
        }` +
            `</div><div class="ml-acts">${btn('＋ 용어', 'g-edit', '')}${btn('📘 설정집 이름 모두 넣기', 'g-fill', '')}</div>`
            + '<div class="ml-hint">영어 · 숫자로 된 말은 낱말 그대로만 바꿔요 (「Leo」는 「Leon」 안에서 안 바뀜) · 대소문자 · 띄어쓰기 · 하이픈은 같게 봐요 · 같은 말이면 이 채팅 것이 먼저예요.</div>'
            + (await trSection()),
    );
}
// 🌐 번역 (확장 설정에서 켰을 때만) — 누르면 고치기 · 다시 번역 · 용어집에 고정 · 원문 그대로
async function trSection() {
    const T = await import('../extra/tr.js'); if (T.trMode() === 'off') return '<div class="ml-hint">상태창 번역은 꺼져 있어요 · 확장 설정 › 미트볼폰 › 🌐 상태창 번역에서 무료 · 빠름 또는 제대로(AI)를 골라요.</div>';
    const D = T.dict(), E = Object.entries(D).reverse(), CAT = Object.fromEntries(T.TR_CATS.map(([, c, l]) => [c, l]));
    const rows = E.slice(0, 120).map(([src, e]) => `<div class="ml-row tap ml-tr-off" data-act="tr-item" data-v="${esc(src)}"><span class="ml-tx"><b>${esc(short(src, 40))} → ${esc(short(e.t === src ? '(원문 그대로)' : e.t, 40))}</b>`
        + `<small>${esc(CAT[e.c] ?? e.c)}${e.k ? ' · ✋ 직접 고침' : ''}</small></span><span class="ml-val"><i class="ml-chev">›</i></span></div>`).join('');
    const st = T.trStats;
    return `<h4 class="ml-h4">번역 <span>${T.trMode() === 'ai' ? '제대로 (AI)' : '무료 · 빠름'} · ${E.length}개${st.calls ? ` · 최근 ${st.ms}ms` : ''}${T.trBusy() ? ' · 번역 중' : ''}</span></h4>`
        + (st.lastError ? `<div class="ml-hint bad ml-tr-off">⚠ ${esc(st.lastError)}</div>` : '')
        + `<div class="ml-acts">${btn('🔄 전부 다시', 'tr-re', '')}${T.TR_CATS.map(([, c, l]) => btn(`🔄 ${l}`, 'tr-re', c, 'xs')).join('')}</div>`
        + `<div class="ml-card">${rows || '<div class="ml-row"><span class="ml-tx"><small>아직 없어요 · 새로 나온 말이 생기면 모아서 한 번에 번역해요</small></span></div>'}</div>`
        + (E.length > 120 ? `<div class="ml-hint">최근 120개만 보여요 · 🔍 검색으로 찾을 수 있어요</div>` : '')
        + '<div class="ml-hint">✋ 직접 고친 번역은 「다시」 버튼에서 빠져요 (하나씩 눌러 다시 번역은 돼요).</div>';
}
export async function glossItem(v) {
    const meta = getMeta();
    const [sc, i] = v ? v.split('|') : ['chat', null], list = sc === 'all' ? (settings().glossary ??= []) : (meta.glossary ??= []), g = i != null ? list[Number(i)] : null;
    const fv = await form(g ? '🌐 용어 고치기' : '＋ 용어', [
        { k: 'from', label: '원래 말', v: g?.from ?? '', ph: 'Leon · Gold · Tavern' },
        { k: 'to', label: '고정할 말', v: g?.to ?? '', ph: '레온 · 골드 · 여관' },
        {
            k: 'sc',
            label: '어디에',
            type: 'pick',
            v: sc,
            opts: [
                ['chat', '이 채팅'],
                ['all', '모든 채팅'],
            ],
        },
        ...(g
            ? [
                  {
                      k: 'del',
                      label: '이 용어',
                      type: 'pick',
                      v: '',
                      opts: [
                          ['', '남기기'],
                          ['del', '지우기'],
                      ],
                  },
              ]
            : []),
    ]);
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
export { applyGloss }; // 🌐 base/gloss.js로 옮김 (HUD가 tools.js를 안 불러도 되게)

// 도구줄 누르기
export async function onTool(act, v) {
    const meta = getMeta();
    switch (act) {
        case 't-eye': { // 고르기 시트
            const [mod, gid] = String(v).split('|'), e = mod ? meta?.eyes?.[mod]?.mode ?? '' : '', hid = !!(gid && meta?.hideAI?.[gid]);
            const cur = e || (hid ? 'hide' : 'open');
            const opt = (m, icon, title, sub) => `<div class="ml-row tap${cur === m ? ' on' : ''}" data-act="eye-set" data-v="${mod}|${gid}|${m}"><span class="ml-ic">${icon}</span><span class="ml-tx"><b>${title}${cur === m ? ' ✓' : ''}</b><small>${sub}</small></span></div>`;
            sheet('😌 눈 감기', `<div class="ml-card">${opt('open', '👀', '평소대로', '셈하고 · 본편에도 알려요')}`
                + `${gid ? opt('hide', '🙈', '결과만 본편에 숨기기', '계속 셈해요 (숫자 · 기록은 쌓임) · 본편 AI에게만 안 알려요') : ''}`
                + `${mod ? opt('once', '😌', '다음 답 1번 쉬기', '다음 답은 이 앱을 셈하지도 · 알리지도 않아요 (분류 목록에서도 빠짐)') : ''}`
                + `${mod ? opt('on', '😴', '계속 쉬기', '다시 뜰 때까지 셈하지도 · 알리지도 않아요') : ''}</div>`
                + '<div class="ml-hint">화면에서 칸만 가리려면 「👁 보일 것」을 쓰세요 (AI와는 상관없음).</div>');
            return;
        }
        case 't-rules': document.querySelectorAll('.ml-bs').forEach(x => x.remove()); return editRules(v); // 📘 지금 값 창 → 규칙(설정집)
        case 'eye-set': {
            const [mod, gid, m] = String(v).split('|');
            if (mod) setEyes(mod, m === 'once' || m === 'on' ? m : '');
            if (gid) { meta.hideAI ??= {}; if (m === 'hide') meta.hideAI[gid] = true; else delete meta.hideAI[gid]; saveMeta(); }
            document.querySelector('.ml-bs')?.remove();
            toast({ open: '👀 평소대로', hide: '🙈 결과만 본편에 숨겨요 (계속 셈)', once: '😌 다음 답 1번 쉬어요', on: '😴 다시 뜰 때까지 쉬어요' }[m] ?? '');
            app.refresh?.();
            return;
        }
        case 't-edit':
            return editApp(v);
        case 't-ai':
            return aiEdit(v);
        case 't-hide':
            (meta.hideAI ??= {})[v] = !meta.hideAI[v];
            saveMeta();
            app.refresh?.();
            toast(meta.hideAI[v] ? '이 앱의 결과값을 본편에 안 보내요' : '다시 본편에 보내요');
            return;
        case 't-parts': {
            const off = settings().partsOff?.[v] ?? [];
            sheet(
                '👁 보일 것',
                `<div class="ml-card">${PARTS[v]
                    .map(
                        ([k, n]) =>
                            `<label class="ml-row"><span class="ml-tx"><b>${n}</b></span><input type="checkbox" class="ml-sw" data-part="${v}|${k}` +
                            `" ${off.includes(k) ? '' : 'checked'}></label>`,
                    )
                    .join('')}</div><div class="ml-hint">화면에서만 숨겨요. 계산 · 본편은 그대로예요.</div>`,
            );
            document.querySelector('.ml-bs').addEventListener('change', (e) => {
                const [a, k] = e.target.dataset.part.split('|');
                const s = settings();
                s.partsOff ??= {};
                const L = new Set(s.partsOff[a] ?? []);
                e.target.checked ? L.delete(k) : L.add(k);
                s.partsOff[a] = [...L];
                saveSettings();
                app.refresh?.();
            });
            return;
        }
        case 't-gloss':
            return editGloss();
        case 'g-edit':
            return glossItem(v);
        case 'g-fill':
            return glossFill();
        case 'tr-re': {
            const T = await import('../extra/tr.js'), n = T.retranslate({ cat: v || null });
            toast(n ? `${n}개 다시 번역해요` : '다시 번역할 게 없어요');
            return editGloss();
        }
        case 'tr-item': {
            const T = await import('../extra/tr.js'), e = T.dict()[v]; if (!e) return editGloss();
            const fv = await form('🌐 번역', [
                { k: 't', label: esc(short(v, 120)), v: e.t === v ? '' : e.t, ph: '비우면 원문 그대로' },
                { k: 'how', label: '어떻게', type: 'pick', v: 'fix', opts: [['fix', '이대로 저장 (✋ 고정)'], ['again', '이것만 다시 번역'], ['gloss', '🌐 용어집에 고정'], ['keep', '원문 그대로 두기'], ['del', '지우기']] },
            ]);
            if (!fv) return editGloss();
            const t = String(fv.t ?? '').trim();
            if (fv.how === 'again') T.retranslate({ src: v });
            else if (fv.how === 'gloss') { (meta.glossary ??= []).push({ from: short(v, 60), to: short(t || e.t, 60) }); T.dropTr(v); saveMeta(); }
            else if (fv.how === 'keep') T.setTr(v, v);
            else if (fv.how === 'del') T.dropTr(v);
            else T.setTr(v, t || v);
            return editGloss();
        }
        default:
            return editItem(act, v);
    }
}
export const TOOL_ACTS = new Set(['t-rules', 'eye-set', 't-edit', 't-ai', 't-hide', 't-parts', 't-gloss', 't-eye', 'g-edit', 'g-fill', 'tr-re', 'tr-item', 'e-need', 'e-gauge', 'e-attr', 'e-status', 'e-add-stat', 'e-item', 'e-place', 'e-cfield', 'e-mark']);
