// 장면 분위기 태그 → 추천 음악 · 한 구절 · 세계 소식 (AI 0회)
import { QUOTES } from '../../data/quotes.js';
import { derived, relStage, worldEvent } from './engine.js';
import { DAY, hash } from '../base/util.js';

export function moodTags(r, last = []) {
    const { S, book } = r, T = new Set();
    for (const d of derived(book, S)) { if (d.key === 'energy') T.add('tired'); if (d.key === 'hunger') T.add('hungry'); if (d.key === 'mood') T.add('sad'); }
    if (/비|눈|rain|snow/i.test(S.weather)) T.add('rain');
    for (const n of S.with) { const r2 = S.rel[n]; if (r2 && relStage(book, r2.aff).at >= 60) T.add('love'); if (r2?.jealous) T.add('jealous'); }
    if (last.some(c => c.f.startsWith('rel.') && c.to < c.from)) T.add('conflict');
    if (last.some(c => c.kind === 'bad')) T.add('bad');
    if (last.some(c => c.kind === 'good')) T.add('good');
    if (S.cash <= book.world.meal) T.add('money');
    const ev = worldEvent(Math.floor(S.t / DAY)); if (ev?.name === '축제' || ev?.name === '장날') T.add('festive');
    if (S.with.length && !T.has('love')) T.add('friend');
    if (!T.size) T.add('calm');
    return [...T];
}
// 한 구절: 태그가 많이 겹치는 것 · 최근에 쓴 것 피함 · 같은 턴에는 같은 것
export function pickQuote(tags, recent = [], turn = 0) {
    const score = (q) => q.tags.filter(t => tags.includes(t)).length - (recent.includes(q.text) ? 5 : 0);
    const best = Math.max(...QUOTES.map(score));
    const pool = QUOTES.filter(q => score(q) === best);
    return pool[parseInt(hash(`${turn}`), 36) % pool.length];
}
const MUSIC = {
    love: ['설레는 어쿠스틱', 'acoustic love song'], sad: ['잔잔한 피아노', 'sad piano'], tired: ['나른한 로파이', 'lofi chill'],
    hungry: ['경쾌한 재즈', 'cafe jazz'], rain: ['빗소리 재즈', 'rainy day jazz'], conflict: ['긴장감 있는 현악', 'tense strings'],
    jealous: ['씁쓸한 R&B', 'bittersweet rnb'], festive: ['축제 브라스', 'festival brass'], friend: ['밝은 인디 팝', 'feel good indie'],
    hope: ['따뜻한 오케스트라', 'hopeful orchestral'], money: ['느긋한 보사노바', 'bossa nova'], bad: ['어두운 앰비언트', 'dark ambient'], good: ['신나는 시티팝', 'city pop'], calm: ['잔잔한 어쿠스틱', 'calm acoustic'],
};
export function pickMusic(tags, taste = '') {
    const t = tags.find(x => MUSIC[x]) ?? 'calm';
    const [label, q] = MUSIC[t];
    return { label, query: `${q}${taste ? ` ${taste}` : ''}`, why: t };
}
