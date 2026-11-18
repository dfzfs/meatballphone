// 🔎 상태창 검색 — 자료 모으기 · 찾기 · 찾은 말 둘레 보여 주기
// 화면(DOM) · 설정을 모르는 순수 함수만 (util.js만 불러옴) — 그래서 따로 시험해 볼 수 있다.
// - 띄어 쓴 낱말은 모두 들어 있으면 찾음 (「레온 열쇠」 = 레온도 있고 열쇠도 있는 것)
// - 띄어쓰기는 무시 (「검은 열쇠」 = 「검은열쇠」) · 대소문자 무시
// - 「레온이」 「열쇠를」처럼 조사가 붙어도 찾음
// - 칸마다 이름만이 아니라 설명 · 메모 · 댓글 · 단계 · 보상까지 본다
import { norm, short, esc, arr, str, fmtNum } from './util.js';

const PARTICLE = /(에게서|한테서|에서는|으로는|이랑|에게|한테|에서|으로|까지|부터|처럼|이나|은|는|이|가|을|를|의|에|도|와|과|로|랑|만|야|아)$/;
export function terms(q) {
    const out = [];
    for (const w of String(q ?? '').trim().split(/\s+/)) {
        const t = norm(w).replace(/[「」『』"'“”‘’,.!?~·]/g, '');
        if (t) out.push({ t, alt: t.length >= 3 ? t.replace(PARTICLE, '') : t });
    }
    return out;
}
const hasTerm = (hay, x) => hay.includes(x.t) || (x.alt !== x.t && x.alt.length >= 2 && hay.includes(x.alt));

// 「검 은열쇠」처럼 띄어쓰기가 달라도 원문에서 찾고 칠하게 — 글자 사이에 빈칸이 있어도 되는 정규식
const reEsc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function termRe(list) {
    const pats = [...new Set(list.flatMap(x => [x.t, x.alt]).filter(s => s && s.length >= 1))].sort((a, b) => b.length - a.length).map(s => [...s].map(reEsc).join('\\s*'));
    return pats.length ? new RegExp(`(${pats.join('|')})`, 'gi') : null;
}

// 결과 한 줄의 작은 글: 찾은 말이 보이게 그 둘레를 자른다 (앞에서 90자만 자르면 찾은 말이 잘려서 「왜 나왔지?」가 됨)
export function snippet(text, list, n = 90) {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    const re = termRe(list);
    const m = re ? re.exec(t) : null;
    if (!m) return short(t, n);
    const start = Math.max(0, Math.min(m.index - Math.floor(n / 3), t.length - n));
    return `${start > 0 ? '…' : ''}${t.slice(start, start + n).trim()}${start + n < t.length ? '…' : ''}`;
}
// 찾은 말을 <mark>로 칠한 HTML (esc 포함)
export function markHtml(text, list) {
    const s = String(text ?? '');
    const re = termRe(list);
    if (!re) return esc(s);
    return s.split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');
}

// ───── 자료 → 찾을 거리 { icon, title, parts[], tab } ─────
// on(tab) = 그 칸이 켜져 있는지 (꺼진 칸은 눌러도 못 여니까 뺀다) · album = 추억 앨범 목록
// 칸 이름으로 찾기 — 「시간」 「돈」 「날씨」처럼 자료 안엔 없는 말로도 그 칸으로 가게 (지금 값을 같이 보여 줌)
const TAB_KW = {
    profile: ['👤', '프로필', '인물 캐릭터 소개 외모 성격 나이'], rel: ['💞', '관계', '호감 애정 우정 신뢰 단계 연인 친구 질투'], stats: ['❤️', '수치', '체력 기력 게이지 능력치 상태 이상 버프 스탯'],
    dice: ['🎲', '주사위', '판정 굴리기 dc 난이도'], wallet: ['💰', '재산', '돈 소지금 화폐 소지품 아이템 가방 물가 일거리 월급'], shop: ['🏪', '상점', '가게 사기 팔기 구매'],
    home: ['🏠', '본거지', '집 방 가구 창고 쓰레기통'], map: ['🗺', '지도', '장소 위치 이동 길 현재 위치'], calendar: ['📅', '달력', '시간 시각 시계 날짜 오늘 요일 날씨 일정 기념일 계절 아침 저녁 밤'],
    contact: ['💬', '연락', '메신저 문자 편지 카톡 전화 답장'], quest: ['📜', '퀘스트', '의뢰 목표 보상 임무'], news: ['📰', '뉴스', '소식 기사 신문'], gossip: ['🍷', '가십지', '소문 스캔들'],
    board: ['📋', '게시판', '글 댓글 커뮤니티'], ach: ['🏆', '업적', '엔딩 달성'], memo: ['📝', '메모', '약속 단서 고정'], fate: ['🔮', '운명', '저주 축복 카드 이벤트 규칙 점집 타로'],
    sns: ['#️⃣', 'SNS', '피드 좋아요 해시태그'], music: ['🎵', '추천 음악', '노래 곡 bgm 음악'], custom: ['🧩', '내 탭', '직접 만든 탭'],
};
function tabNow(m, d) {
    const x = d[m] ?? {};
    if (m === 'calendar') return [x.era, x.y !== undefined && x.m !== undefined ? `${str(x.y)}년 ${str(x.m)}월 ${str(x.d)}일` : '', x.time ? `시간: ${x.time}` : '', x.weather ? `날씨: ${x.weather}` : ''].filter(Boolean).join(' · ');
    if (m === 'wallet') return x.cash !== undefined ? `소지금 ${fmtNum(Number(x.cash) || 0)}${x.currency ? ` ${x.currency}` : ''}` : '';
    if (m === 'stats') return arr(x.bars).map(b => `${str(b.name)} ${str(b.cur)}/${str(b.max)}`).join(' · ');
    if (m === 'map') return x.here ? `지금 위치: ${x.here}` : '';
    if (m === 'music') return x.now?.title ? `${str(x.now.title)} — ${str(x.now.artist)}` : '';
    return '';
}

export function collect(d, { on = () => true, album = [], days = [], core = null } = {}) {
    d = d && typeof d === 'object' ? d : {};
    const out = [];
    const add = (tab, icon, title, ...parts) => { const it = { tab, icon, title: str(title).trim(), parts: parts.flat(3).filter(x => x !== null && x !== undefined && x !== '').map(String) }; out.push(it); return it; };
    const kv = (k, v) => (str(v).trim() ? `${str(k)}: ${str(v)}` : '');
    for (const [m, [icon, name, kw]] of Object.entries(TAB_KW)) {
        if (!d[m] || !on(m)) continue;
        const it = add(m === 'home' ? 'base' : m, icon, `${name} 칸`, tabNow(m, d));
        it.kw = `${name} ${kw}`.split(' '); it.tabHit = true;
    }
    if (core && typeof core === 'object') add('home', '🌍', core.title || '세계관', core.genre, core.summary, core.userRole, core.rules, core.tone);
    for (const x of arr(days).slice(-60)) add('record', '📆', x?.date, arr(x?.labels));
    if (d.calendar && on('calendar')) { const c = d.calendar; if (arr(c.times).length) add('calendar', '🕐', '시간대', arr(c.times).join(' · ')); }
    if (on('profile')) for (const p of arr(d.profile?.list)) add('profile', '👤', p.name, p.summary, arr(p.fields).map(f => kv(f?.k, f?.v)), p.home ? `사는 곳: ${p.home}` : '', p.sched ? `일과: ${p.sched}` : '');
    if (on('rel')) {
        for (const r of arr(d.rel?.user)) add('rel', '💞', r.name, r.label, r.memo, r.likes ? `끌리는 것: ${r.likes}` : '', r.dislikes ? `싫어하는 것: ${r.dislikes}` : '', r.concern ? `신경 쓰는 것: ${r.concern}` : '', r.met ? `처음 만난 날: ${r.met}` : '');
        for (const p of arr(d.rel?.pairs)) add('rel', '🔗', `${str(p.a)} ↔ ${str(p.b)}`, p.label, p.memo);
        for (const x of arr(d.rel?.life)) add('rel', '🌙', x.who, x.text, x.date);
    }
    if (on('stats')) {
        for (const b of arr(d.stats?.bars)) add('stats', '❤️', b.name, b.desc, b.stages, b.zero);
        for (const a of arr(d.stats?.attrs)) add('stats', '💪', a.name, a.desc);
        for (const c of arr(d.stats?.conds)) add('stats', '🌀', c.name, c.desc);
    }
    if (on('memo')) for (const m of arr(d.memo?.list)) add('memo', '📝', '메모', m.text);
    if (on('contact')) {
        const seen = new Set();
        for (const c of arr(d.contact?.contacts)) { seen.add(str(c.name)); add('contact', '📇', c.name, c.status, c.handle); }
        for (const [who, th] of Object.entries(d.contact?.threads ?? {})) {
            if (!seen.has(who)) add('contact', '📇', who);
            for (const m of arr(th)) { const t = m?.kind === 'deleted' ? '' : str(m?.text); if (t) add('contact', '💬', `${who}${m.from === 'me' ? ' ← 나' : ''}`, t); }
        }
    }
    if (on('quest')) {
        for (const q of arr(d.quest?.list)) add('quest', '📜', q.title, q.desc, q.giver ? `의뢰인: ${q.giver}` : '', q.place ? `장소: ${q.place}` : '', q.reward ? `보상: ${q.reward}` : '', arr(q.items), q.deadline ? `기한: ${q.deadline}` : '', arr(q.steps).map(s => s?.text));
        for (const a of arr(d.quest?.archive)) add('quest', '🗄', a.title, a.date, { done: '완료', failed: '실패' }[a.status] ?? a.status);
    }
    if (on('news')) { for (const x of arr(d.news?.items)) add('news', '📰', x.title, x.body, x.tag); for (const a of arr(d.news?.archive)) add('news', '🗄', a.title, a.date); }
    if (on('gossip')) { for (const x of arr(d.gossip?.issues)) add('gossip', '🍷', x.title, x.body, arr(x.about)); for (const a of arr(d.gossip?.archive)) add('gossip', '🗄', a.title, a.date); }
    if (on('board')) { for (const x of arr(d.board?.posts)) add('board', '📋', x.title, x.body, x.author, x.tag, arr(x.replies).map(r => kv(r?.author, r?.text))); for (const a of arr(d.board?.archive)) add('board', '🗄', a.title, a.date); }
    if (on('sns')) { for (const x of arr(d.sns?.posts)) add('sns', '#️⃣', x.author, x.text, x.pic, x.tags, arr(x.replies).map(r => kv(r?.author, r?.text))); for (const a of arr(d.sns?.archive)) add('sns', '🗄', a.title, a.date); }
    if (on('map')) for (const p of arr(d.map?.places)) add('map', '📍', p.name, p.desc, p.kind, p.area, arr(p.floors), arr(p.links).length ? `이어진 곳: ${arr(p.links).join(', ')}` : '');
    if (on('wallet')) {
        for (const i of arr(d.wallet?.items)) add('wallet', '🎒', i.name, i.desc, i.effect, Number(i.qty) > 1 ? `× ${i.qty}` : '');
        for (const j of arr(d.wallet?.jobs)) add('wallet', '💼', j.name, j.pay ? `일당 ${fmtNum(j.pay)}` : '', j.effect);
        for (const p of arr(d.wallet?.prices)) add('wallet', '🏷', p.name, p.price !== undefined ? fmtNum(p.price) : '');
        for (const r of arr(d.wallet?.regular)) add('wallet', '🔁', r.name, r.amount !== undefined ? fmtNum(r.amount) : '');
    }
    if (on('shop')) for (const sh of arr(d.shop?.shops)) {
        add('shop', '🏪', sh.name, sh.desc, sh.place);
        for (const i of arr(sh.items)) add('shop', '🏪', `${str(sh.name)} · ${str(i.name)}`, `${fmtNum(Number(i.price) || 0)} — ${str(i.desc)}`);
    }
    if (on('home')) {
        const h = d.home ?? {};
        if (h.name || h.desc) add('base', '🏠', h.name || '본거지', h.desc);
        for (const r of arr(h.rooms)) add('base', '🛋', r.name, r.desc, arr(r.decor));
        if (arr(h.storage).length) add('base', '📦', '창고', arr(h.storage));
        for (const t of arr(h.trash)) add('base', '🗑', t?.name ?? t, t?.date);
    }
    if (on('calendar')) for (const e of arr(d.calendar?.events)) add('calendar', '📅', e.title, `${str(e.m)}/${str(e.d)}`, e.desc);
    if (on('ach')) { for (const a of arr(d.ach?.list)) if (!a.hidden || a.done) add('ach', '🏆', a.name, a.desc); for (const e of arr(d.ach?.endings)) add('ach', '🎬', e.name, e.desc); }
    if (on('fate')) {
        for (const c of arr(d.fate?.curses)) add('fate', c.kind === 'bless' ? '✨' : '💀', c.name, c.desc, arr(c.effects), c.cure ? `해제: ${c.cure}` : '');
        for (const c of arr(d.fate?.deck)) add('fate', '🃏', c.title, c.desc, c.effect);
        for (const r of arr(d.fate?.rules)) add('fate', '⚙', r.name, r.when, r.then);
    }
    if (on('dice')) for (const x of arr(d.dice?.quick)) add('dice', '🎲', x.name, x.attr, x.dc ? `DC ${x.dc}` : '');
    if (on('custom')) for (const t of arr(d.custom?.tabs)) {
        if (t.note) add('custom', t.icon || '🧩', t.name, t.note);
        for (const f of arr(t.fields)) add('custom', t.icon || '🧩', `${str(t.name)} · ${str(f.k)}`, str(f.v), f.desc);
    }
    for (const a of arr(album)) add('album', '⭐', a.who, a.text, a.note);
    return out.filter(x => x.title || x.parts.length);
}

// ───── 찾기 → [{ icon, title, text, tab, score }] ─────
// 점수: 제목이 찾는 말과 같음 > 제목에 다 들어 있음 > 제목에 일부 > 내용에만
export function find(items, q, max = 80) {
    const list = terms(q);
    if (!list.length) return { list: [], total: 0, terms: list };
    const whole = norm(q);
    const hits = [];
    for (const it of items) {
        const nt = norm(it.title);
        const np = it.parts.map(norm);
        const nk = (it.kw ?? []).map(norm).filter(Boolean);
        const hay = `${nt}\u0001${np.join('\u0001')}\u0001${nk.join('\u0001')}`;
        if (!list.every(x => hasTerm(hay, x))) continue;
        const inTitle = list.filter(x => hasTerm(nt, x)).length;
        let score = (nt === whole ? 100 : 0) + (inTitle === list.length ? 40 : inTitle * 10) + (nt.startsWith(list[0].t) ? 5 : 0);
        if (it.tabHit && list.every(x => nk.some(k => k === x.t || k === x.alt) || hasTerm(nt, x))) score += 200; // 칸 이름 · 그 칸을 뜻하는 말과 똑같으면 맨 위
        // 보여 줄 작은 글: 찾은 말이 든 줄 먼저 (제목에만 있으면 첫 줄)
        const k = np.findIndex(p => list.some(x => hasTerm(p, x)));
        const text = snippet(k >= 0 ? it.parts[k] : (it.parts[0] ?? ''), list);
        hits.push({ icon: it.icon, title: it.title, text, tab: it.tab, score });
    }
    hits.sort((a, b) => b.score - a.score);
    return { list: hits.slice(0, max), total: hits.length, terms: list };
}
