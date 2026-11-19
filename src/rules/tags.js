// <meatball> 블록 읽기 — 본편 AI가 답 끝에 적는 「키: 값」 줄
// AI는 숫자 대신 사건을 적는다 (ate: 식사 · gift: Leon | 꽃 · slept: 6h). 증감은 엔진이 설정집 규칙으로 계산한다.
import { norm } from '../base/util.js';

// 키 → 종류. 한국어 · 영어 · 흔한 변형을 다 받는다 (플래시급 모델이 키를 조금씩 바꿔 적기 쉽다)
const K = (kind, ...names) => names.map(n => [n, kind]);
export const KEYMAP = Object.fromEntries(
    [
        ...K('ate', 'ate', 'eat', 'meal', 'food', 'drank', 'drink', '먹음', '먹었다', '식사', '마심'),
        ...K('slept', 'slept', 'sleep', 'nap', '잠', '잤다', '수면', '낮잠'),
        ...K('washed', 'washed', 'wash', 'bath', 'shower', '씻음', '씻었다', '목욕', '샤워'),
        ...K('rest', 'rest', 'rested', '쉼', '휴식'),
        ...K('worked', 'worked', 'work', 'job', '일함', '일했다', '노동', '근무'),
        ...K('cash', 'cash', 'money', 'gold', '돈', '소지금', '재산'),
        ...K('buy', 'buy', 'bought', 'paid', 'pay', '샀다', '구매', '지불', '삼'),
        ...K('sell', 'sell', 'sold', '팔았다', '판매'),
        ...K('earn', 'earn', 'earned', 'income', '벌었다', '수입', '받음'),
        ...K('item', 'item', 'items', 'inventory', '소지품', '아이템'),
        ...K('got', 'got', 'get', 'obtained', 'found', '얻음', '얻었다', '주웠다'),
        ...K('used', 'used', 'use', 'consumed', '씀', '썼다', '사용'),
        ...K('lost', 'lost', 'drop', 'dropped', '잃음', '버림', '잃었다'),
        ...K('wear', 'wear', 'wore', 'equip', 'equipped', '입음', '착용', '장착'),
        ...K('unwear', 'unwear', 'unequip', 'took off', '벗음', '해제'),
        ...K('gift', 'gift', 'gave', '선물'),
        ...K('loc', 'loc', 'location', 'place', 'go', 'went', 'moved', '장소', '위치', '이동'),
        ...K('with', 'with', 'scene', 'present', '같이', '함께', '동행', '장면인물'),
        ...K('time', 'time', 'clock', '시간', '시각', '시간대'),
        ...K('pass', 'pass', 'passed', 'elapsed', '경과', '흐름'),
        ...K('date', 'date', 'day', '날짜'),
        ...K('weather', 'weather', '날씨'),
        ...K('aff', 'aff', 'affection', 'love', 'romance', '애정', '호감', '호감도', '애정도'),
        ...K('trust', 'trust', 'friendship', '우정', '신뢰'),
        ...K('act', 'act', 'action', 'did', 'moment', '행동', '사건', '한일'),
        ...K('status', 'status', 'cond', 'condition', 'buff', 'debuff', '상태', '상태이상', '버프', '디버프'),
        ...K('fate', 'fate', 'curse', 'blessing', 'luck', '운명', '저주', '축복', '행운'),
        ...K('roll', 'roll', 'check', '판정', '주사위'),
        ...K('mind', 'mind', 'thought', 'feel', '속마음'),
        ...K('watch', 'watch', 'spectator', 'viewer', '관전', '관전자'),
        ...K('cell', 'cell', 'cells', '세포'),
        ...K('jealous', 'jealous', 'jealousy', '질투'),
        ...K('conflict', 'conflict', '어긋남', '확인'),
    ...K('pair', 'pair', 'between', '인물끼리', '사이', 'pairaff'),
        ...K('life', 'life', 'offscreen', '근황', '화면밖'),
        ...K('promise', 'promise', 'deadline', 'hook', '약속', '마감', '떡밥'),
        ...K('memory', 'memory', 'remember', '기억', '감정기억'),
        ...K('taste', 'taste', '취향'),
        ...K('npc', 'npc', 'new', '인물', '새인물'),
        ...K('gone', 'gone', 'left', 'dead', '떠남', '사망', '퇴장'),
        ...K('want', 'want', 'goal', 'plan', '속셈', '목표'),
        ...K('anniv', 'anniv', 'anniversary', 'birthday', '기념일', '생일'),
        ...K('bgm', 'bgm', 'music', 'song', 'ost', '음악', '노래', '추천곡'),
        ...K('quote', 'quote', 'phrase', '구절', '한구절', '명언'),
        ...K('custom', 'custom', 'tab', '내탭'),
        ...K('newsline', 'newsline', 'worldnews', '세계소식'),
        ...K('feed', 'feed', 'sns', '피드'),
        ...K('meddle', 'meddle', 'touch', '손댐', '낙서'),
        ...K('noted', 'noted', 'noticed', '메모봄'),
        // 옛 미트볼(dev)에서 쓰던 다른 이름들 — 옮긴 채팅 · 옛 프리셋도 그대로 읽힘
        ...K('status', 'conditions'),
        ...K('item', 'inv', 'bag', '가방', '인벤토리'),
        ...K('loc', '발견장소', '새장소'),
        ...K('trust', '신뢰도', '우정도'),
        ...K('pair', '인물관계', '인물호감'),
        ...K('date', 'days', '날짜이동'),
        ...K('time', 'period'),
        ...K('roll', '판정요청'),
        ...K('custom', '탭'),
        ...K('watch', '구경꾼'),
        // 지운 칸 · 옛 미트볼 키 — 오류 없이 조용히 건너뛴다
        ...K(
            'skip',
            'quest',
            'quests',
            'mission',
            '퀘스트',
            '의뢰',
            'news',
            '뉴스',
            '소식',
            'rumor',
            'gossip',
            '소문',
            'post',
            '게시판',
            'ach',
            '업적',
            'msg',
            'message',
            '연락',
            '문자',
            '편지',
            'decor',
            '가구',
            'room',
            '방',
            'stock',
            '상품',
            'memo',
            '메모',
            'note',
            'event',
            '일정',
            'alert',
            '알림',
            'rel',
            '관계',
            'attr',
            '능력치',
            'confess',
            'concern',
            'concern',
            'confess',
        ),
    ].map(([k, v]) => [norm(k), v]),
);
// 옛 미트볼의 수치 · 이름 키 (stat: 체력 -3) — 수치 칸이 이어받는다
const STATISH = new Set(['stat', '수치', 'gauge', '게이지', 'hp']);

export const kindOf = (key, needNames = []) => {
    const k = norm(String(key).replace(/\*\*|__|`/g, ''));
    if (KEYMAP[k]) return KEYMAP[k];
    if (STATISH.has(k)) return 'need';
    if (needNames.some(n => norm(n) === k)) return 'need';
    return 'unknown';
};

// ───── 블록 찾기 (dev 미트볼에서 옮김: 안 닫힌 블록은 「키: 값」 줄이 이어지는 데까지만) ─────
const KV_LINE = /^\s*(?:[-*•]\s*|\d+[.)]\s*)?([^<:：\n]{1,24})[:：]([^\n]*)$/;
const FOREIGN = /<summary\b|<details\b|\|\s*Physical\s*:/i;
function kvRun(rest) {
    let len = 0;
    for (const part of rest.split(/(\n)/)) {
        if (part === '\n' || !part.trim()) { len += part.length; continue; }
        const m = KV_LINE.exec(part);
        if (!m) break;
        if (/^\s*["“”'‘’「『]/.test(m[2]) && !KEYMAP[norm(m[1])]) break;
        len += part.length;
    }
    return rest.slice(0, len).replace(/\s+$/, '');
}
export function blocks(text) {
    const t = String(text ?? ''), out = [], open = /<(meatball|status)>/gi;
    let m;
    while ((m = open.exec(t))) {
        const tag = m[1].toLowerCase(), from = m.index + m[0].length;
        const close = t.toLowerCase().indexOf(`</${tag}>`, from);
        const nxr = /<(?:meatball|status)>/gi; nxr.lastIndex = from; const nx = nxr.exec(t)?.index ?? -1;
        let body, end;
        if (close >= 0 && (nx < 0 || close < nx)) { body = t.slice(from, close); end = close + tag.length + 3; }
        else { body = kvRun(nx < 0 ? t.slice(from) : t.slice(from, nx)); end = from + body.length; }
        let start = m.index; while (start > 0 && /\s/.test(t[start - 1])) start--;
        if (tag === 'meatball' || !FOREIGN.test(body)) out.push({ start, end, body });
        open.lastIndex = Math.max(end, from);
    }
    return out;
}
export const hasTag = (text) => blocks(text).length > 0;
export function stripTags(text) { let t = String(text ?? ''); for (const b of blocks(t).reverse()) t = t.slice(0, b.start) + t.slice(b.end); return t; }
// 분류 모델에 보낼 이야기 본문만: 미트볼 · 상태 블록, 주석, 코드 울타리, 이야기 밖 블록(<scene_plan> · <choices> · <details> 같은 것)을 뺌
//   보통 HTML 꾸밈(<p> · <span> · <div> …)과 본문 그릇(<content> · <story> …)은 글만 남김 · 너무 많이 빠지면 꾸밈만 벗긴 글로
const HTML = new Set(('a abbr b bdi bdo big blockquote br center cite code dd del dfn div dl dt em font h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q rp rt ruby s samp '
    + 'small span strike strong sub sup td th tr tbody thead table tt u ul var wbr section article main aside header footer nav figure figcaption').split(' '));
const BODY = new Set(['content', 'story', 'narrative', 'body', 'text', 'reply', 'response', 'novel', 'roleplay', 'rp', 'output', 'answer', '본문']);
const DROP = new Set(['details', 'script', 'style', 'think', 'thinking', 'reasoning', 'summary', 'template', 'noscript', 'svg']);
export function storyOnly(text) {
    const base = stripTags(text).replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '');
    let t = base, prev;
    do {
        prev = t;
        t = t.replace(/<([A-Za-z가-힣][\w가-힣:-]*)(?=[\s>/])[^>]*>([\s\S]*?)<\/\1\s*>/g, (_, tag, inner) => {
            const n = tag.toLowerCase();
            if (DROP.has(n)) return '';
            return HTML.has(n) || BODY.has(n) ? inner : '';
        });
    } while (t !== prev);
    const clean = (x) => x.replace(/<\/?[A-Za-z][^>]*>/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const out = clean(t), loose = clean(base);
    return out.length >= Math.min(80, loose.length * 0.15) ? out : loose;
}
// 줄 → [키, 값] (꾸밈 · 글머리표 벗김 · 같은 줄 두 번은 한 번만)
export function readOps(text) {
    const ops = [], seen = new Set();
    for (const b of blocks(text)) {
        for (const raw of b.body.split(/\r?\n/)) {
            let clean = raw.replace(/\*\*|__|`/g, '').replace(/^\s*(?:[-*•·]\s*(?=[^\d\s])|\d{1,2}[.)]\s+)/, '');
            { const f = /^\s*([a-z]{2,12})\s*\((.+)\)\s*$/i.exec(clean); if (f && !clean.includes(':')) clean = `${f[1]}: ${f[2]}`; } // 「mind(Leon | …)」처럼 잘못 쓴 줄도 받기
            const m = /^\s*([^:：\n]{1,24}?)\s*[:：]\s*(.+?)\s*$/.exec(clean);
            if (!m) continue;
            const k = `${norm(m[1])}\u0000${norm(m[2])}`;
            if (seen.has(k)) continue;
            seen.add(k); ops.push([m[1].trim(), m[2].trim()]);
        }
    }
    return ops;
}
// 「Leon | 꽃 | 3」 → ['Leon', '꽃', '3']
export const parts = (v) => String(v ?? '').split(/\s*[|｜]\s*/).map(x => x.trim());
