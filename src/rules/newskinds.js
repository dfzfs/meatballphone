// 📰 세계 소식 종류: 뉴스 · 소문 · 피드 · 화면 밖
//   AI는 사건 줄만 적는다 — newsline: 종류 | 글 · feed: 이름 | 글 · life: 이름 | 화면 밖 생활
//   켤 종류는 사용자가 고르는 것이라 채팅 메타(newsKinds)에 둔다. 기본은 뉴스 · 화면 밖.
import { getMeta, saveMeta } from '../base/st.js';
import { norm, hash } from '../base/util.js';

export const NEWS_KINDS = [
    { id: 'world', icon: '📰', name: '뉴스', what: '세상 일' },
    { id: 'rumor', icon: '💬', name: '소문', what: '동네 · 학교 · 회사에서 도는 말' },
    { id: 'feed', icon: '📱', name: '피드', what: '인물이 SNS에 올린 짧은 글' },
    { id: 'life', icon: '🌙', name: '화면 밖', what: '인물이 화면 밖에서 한 일' },
];
const DEF = { world: true, rumor: false, feed: false, life: true };
export const kindInfo = (id) => NEWS_KINDS.find(k => k.id === id);

// 켠 종류 { world: true, … }
export function kindsOn(meta = getMeta()) { return { ...DEF, ...(meta?.newsKinds ?? {}) }; }
export function toggleKind(id) {
    const m = getMeta(); if (!m || !kindInfo(id)) return;
    m.newsKinds = { ...kindsOn(m), [id]: !kindsOn(m)[id] };
    saveMeta();
}

// newsline 값 → { kind, text }. 종류를 안 적은 옛 줄(newsline: 글)은 뉴스.
const WORD = {
    world: ['뉴스', 'news', 'world', '세상', '세계'],
    rumor: ['소문', 'rumor', 'rumour', 'gossip', '루머'],
    feed: ['피드', 'feed', 'sns'],
    life: ['화면밖', 'life', 'offscreen', '근황'],
};
const WORD_OF = Object.fromEntries(Object.entries(WORD).flatMap(([k, ws]) => ws.map(w => [norm(w), k])));
export function readNewsline(v) {
    const s = String(v ?? '').trim(), m = /^([^|｜]{1,12})\s*[|｜]\s*([\s\S]+)$/.exec(s);
    const k = m && WORD_OF[norm(m[1])];
    return k ? { kind: k, text: m[2].trim() } : { kind: 'world', text: s };
}

// 본편 「적는 법」 줄 — 켠 종류만 · 늘 「가끔」. 🌙 화면 밖은 지금처럼 영향력 3부터.
export function ruleKeys(lv) {
    const on = kindsOn(), K = [];
    if (on.world) K.push('newsline: 뉴스 | 세상 소식 한 줄 (가끔)');
    if (on.rumor) K.push('newsline: 소문 | 동네 · 학교 · 회사에서 도는 말 (가끔)');
    if (on.feed) K.push('feed: 이름 | 그 인물이 SNS에 올린 짧은 글 (가끔)');
    if (on.life && lv >= 3) K.push('life: 이름 | 화면 밖에서 한 일 (가끔)');
    return K;
}
// 분류 모델 목록 [키, 쓰는 법, 언제] — 켠 종류만 · 「가끔」
export function clsKeys() {
    const on = kindsOn(), K = [];
    if (on.world) K.push(['newsline', '뉴스 | 세상 소식 한 줄', '답에 세상 소식이 나왔을 때만 · 가끔']);
    if (on.rumor) K.push(['newsline', '소문 | 도는 말', '동네 · 학교 · 회사 소문이 나왔을 때만 · 가끔']);
    if (on.feed) K.push(['feed', '이름 | SNS 글', '인물이 SNS에 글을 올렸을 때만 · 가끔']);
    if (on.life) K.push(['life', '이름 | 화면 밖에서 한 일', '장면 밖 인물 소식이 나왔을 때만 · 가끔']);
    return K;
}

// 📱 피드 반응 — 글에서 코드가 정한다 (AI 호출 없음 · 다시 계산해도 같음)
const RE = ['❤️', '😂', '😮', '🥺', '👍', '🔥'];
export function reactions(text) {
    const h = parseInt(hash(text), 36) || 0;
    return [0, 1].map(k => ({ e: RE[(h >>> (k * 4)) % RE.length], n: 1 + ((h >>> (8 + k * 6)) % 40) }))
        .filter((x, k, a) => k === 0 || x.e !== a[0].e);
}
