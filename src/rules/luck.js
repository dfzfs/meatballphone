// 🍀 오늘 운세 쪽지 — 이야기 속 날짜마다 하나 (AI 0회 · 같은 날은 같은 쪽지)
//   선택지 확장이 읽는다: 좋은 행동과 맞는 선택지는 🍀(위험 성공 +10%) · 조심할 행동은 ⚠(−10%)
import { hash, DAY } from '../base/util.js';
const ACTS = [
    { k: 'talk', ko: '먼저 말을 걸면', no: '말을 아낄 것', re: /말|인사|묻|물어|부르|대화|talk|ask/ },
    { k: 'buy', ko: '물건을 사면', no: '지갑 조심', re: /사|구매|산다|주세요|buy/ },
    { k: 'rest', ko: '푹 쉬면', no: '게으름 조심', re: /쉬|잠|눕|휴식|rest|sleep/ },
    { k: 'move', ko: '밖으로 나가면', no: '먼 길 조심', re: /가|간다|이동|향하|나가|go/ },
    { k: 'gift', ko: '선물을 건네면', no: '선물은 다음에', re: /선물|건네|gift/ },
    { k: 'bold', ko: '과감하게 나서면', no: '다툼 조심', re: /싸우|덤비|맞서|공격|뛰어|과감|fight/ },
    { k: 'quiet', ko: '한발 물러서면', no: '피하지 말 것', re: /거절|피하|물러|숨|도망|참|avoid/ },
];
const COLORS = ['빨강', '파랑', '초록', '노랑', '보라', '하양', '검정'];
const pick = (arr, h, k) => arr[(parseInt(hash(`${h}:${k}`), 36)) % arr.length];
export function luckOf(book, S, chatId = '') {
    const day = Math.floor(S.t / DAY), h = `${chatId}:${day}`;
    const good = pick(ACTS, h, 'g'); let bad = pick(ACTS, h, 'b'); if (bad.k === good.k) bad = ACTS[(ACTS.indexOf(good) + 3) % ACTS.length];
    const people = book.people.filter(p => !S.rel[p.name]?.gone), places = book.world.places;
    const who = people.length ? pick(people, h, 'p').name : '', where = places.length ? pick(places, h, 'l').name : '';
    const stars = 1 + (parseInt(hash(`${h}:s`), 36) % 5);
    const toWho = who && ['talk', 'gift'].includes(good.k) ? `${who}에게 ` : '';
    const text = `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} ${toWho}${good.ko} 좋은 날 · ${bad.no}${where ? ` · 행운의 곳 ${where}` : ''} · ${pick(COLORS, h, 'c')}`;
    return { day, stars, text, good: good.k, bad: bad.k, who, where, color: pick(COLORS, h, 'c') };
}
// 글(선택지)이 오늘 운세와 맞는지: 1 = 🍀 · −1 = ⚠ · 0
export function luckFit(luck, label) {
    const t = String(label ?? ''), A = (k) => ACTS.find(a => a.k === k);
    let s = 0;
    if (A(luck.good).re.test(t) || (luck.where && t.includes(luck.where)) || (luck.who && t.includes(luck.who) && luck.good === 'talk')) s += 1;
    if (A(luck.bad).re.test(t)) s -= 1;
    return Math.sign(s);
}
