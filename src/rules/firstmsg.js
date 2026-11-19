// 📜 첫 메시지에서 시작 상태 읽기 — 돈 · 시각 · 장소 (상태창을 처음 만들 때 한 번)
//   못 읽은 칸은 비워 두고, 부르는 쪽이 기본값(끼니 값 × 5 · 집)을 씀
import { ctx } from '../base/st.js';
import { norm } from '../base/util.js';
import { storyOnly } from './tags.js';

const MONEY_KEY = /돈|소지금|잔고|잔액|지갑|현금|재산|money|cash|wallet|funds|gold|💰|💵|💴|💸|🪙/i;
const TIME_KEY = /시간|시각|현재\s*시|time|clock|🕐|🕒|🕘|⏰|⌚/i;
const PLACE_KEY = /장소|위치|현재\s*위치|location|place|📍|🗺/i;

// "32,000원" · "₩32,000" · "3만 2천원" · "120 골드" → 숫자
export function moneyIn(line, currency = '') {
    const s = String(line);
    const man = /(\d+(?:\.\d+)?)\s*만\s*(?:(\d+)\s*천)?\s*(?:원|₩)?/.exec(s);
    if (man) return Math.round(Number(man[1]) * 10000 + Number(man[2] ?? 0) * 1000);
    const cur = currency ? currency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const unit = new RegExp(`(?:[₩$€£¥]\\s*([\\d][\\d,]*(?:\\.\\d+)?))|(?:([\\d][\\d,]*(?:\\.\\d+)?)\\s*(?:원|골드|gold|G\\b|코인|coin|달러|엔|${cur || '원'}))`, 'i').exec(s);
    const raw = unit ? (unit[1] ?? unit[2]) : /(?:[:：]\s*|^\D*)([\d][\d,]{1,}(?:\.\d+)?)/.exec(s)?.[1];
    if (!raw) return null;
    const n = Number(raw.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
}
// "14:30" · "오후 2시 30분" · "PM 2:30" · "밤 11시" → 분
export function clockIn(line) {
    const s = String(line);
    let m = /(오전|오후|아침|낮|저녁|밤|새벽|AM|PM)?\s*(\d{1,2})\s*[:：]\s*(\d{2})\s*(AM|PM)?/i.exec(s);
    let h, mi, ap;
    if (m) { h = Number(m[2]); mi = Number(m[3]); ap = m[1] ?? m[4]; }
    else if ((m = /(오전|오후|아침|낮|저녁|밤|새벽)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/.exec(s))) { h = Number(m[2]); mi = m[4] ? 30 : Number(m[3] ?? 0); ap = m[1]; }
    else return null;
    if (h > 23 || mi > 59) return null;
    const a = String(ap ?? '').toUpperCase();
    if (/오후|저녁|PM/.test(a) && h < 12) h += 12;
    else if (/밤/.test(a) && h >= 6 && h < 12) h += 12;
    else if (/낮/.test(a) && h <= 6) h += 12;
    else if (/오전|새벽|AM|아침/.test(a) && h === 12) h = 0;
    return (h % 24) * 60 + mi;
}
// 줄의 「키: 값」 값 부분
const valueOf = (line) => { const k = line.search(/[:：]/); return (k >= 0 ? line.slice(k + 1) : line.replace(PLACE_KEY, '')).replace(/[*_`|[\]]/g, '').trim(); };

export function parseStart(text, book) {
    const raw = String(text ?? '');
    if (!raw.trim()) return {};
    // 상태줄은 꾸밈 블록 안에 있을 수 있으니 태그만 벗긴 글도 같이 봄
    const plain = raw.replace(/<[^>]+>/g, '\n'), story = storyOnly(raw);
    const lines = plain.split(/\r?\n|\s[|·]\s/).map(x => x.trim()).filter(Boolean);
    const out = {};
    const cur = book?.world?.currency ?? '';
    for (const L of lines) if (out.cash == null && MONEY_KEY.test(L)) { const v = moneyIn(L, cur); if (v != null) out.cash = v; }
    for (const L of lines) if (out.clock == null && TIME_KEY.test(L)) { const v = clockIn(L); if (v != null) out.clock = v; }
    if (out.clock == null) { const v = clockIn(story.slice(0, 600)); if (v != null) out.clock = v; }
    const places = book?.world?.places ?? [];
    for (const L of lines) {
        if (out.loc || !PLACE_KEY.test(L)) continue;
        const v = valueOf(L), hit = places.find(p => norm(v).includes(norm(p.name)) || norm(p.name).includes(norm(v)));
        if (hit) out.loc = hit.name; else if (v && v.length <= 24) out.loc = v;
    }
    if (!out.loc) {
        let best = null;
        for (const p of places) { const k = story.indexOf(p.name); if (k >= 0 && (!best || k < best.k)) best = { k, name: p.name }; }
        if (best) out.loc = best.name;
    }
    return out;
}
// 이 채팅의 첫 메시지 (지금 보이는 스와이프) — 없으면 캐릭터 카드의 첫 메시지
export function firstMessage() {
    const c = ctx(), m = (c.chat ?? []).find(x => !x.is_user && !x.is_system);
    return m?.mes ?? c.characters?.[c.characterId]?.first_mes ?? '';
}
