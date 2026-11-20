// 🧵 앱끼리 엮기 묶음: 리듬 · 관계 날씨 · 못 본 날 · 선물 궁합 · 장소 기분 · 동선 · 눈치 알림 · 달력 이모지 · 하이라이트 · 속마음 그때 · 소식 → 지도 · 그날 곡
import { open, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 420, height: 900 });
const turn = async (b, say = 'a') => { await page.evaluate(() => window.__addUser('.')); await page.evaluate(([b, s]) => window.__addAI(`${s}\n<meatball>\n${b}\n</meatball>`), [b, say]); await sleep(220); };
const html = (tab) => page.evaluate(async (t) => { __ML__.app.openSheet(t); await new Promise(r => setTimeout(r, 400)); return document.querySelector('#ml-full')?.innerText ?? ''; }, tab);
try {
    await page.evaluate(() => window.__quickStart()); await sleep(300);
    const { A, P0, P1, P2 } = await page.evaluate(() => { const m = __ML__.getMeta(); for (const k of Object.keys(m.mods)) m.mods[k] = true; m.book.people[0].likes = ['딸기우유']; __ML__.app.refresh?.(true); return { A: m.book.people[0].name, P0: m.book.world.places[0].name, P1: m.book.world.places[1].name, P2: m.book.world.places.find(p => p.name.length >= 2).name }; });
    await turn(`loc: ${P0}\nwith: ${A}\nact: ${A} | 기쁘게 함\ngot: 딸기우유\nmind: ${A} | 기분 좋다\nbgm: 밤편지 - 아이유 | 설렘 | 조용한 밤`);
    await turn(`time: +1d\nwith: ${A}\nact: ${A} | 기쁘게 함`); await turn(`time: +1d\nwith: ${A}\nact: ${A} | 기쁘게 함`);
    await turn(`loc: ${P1}\nwith: 없음\nnewsline: ${P2}에 새 가게가 열렸다`);
    await turn('time: +4d');
    const rel = await html('rel');
    check(/좋아지는 중|그대로/.test(rel), '관계 날씨', rel.slice(0, 200));
    check(/\d+일째 못 봄/.test(rel), 'N일째 못 봄', '');
    check(/좋아할 것/.test(rel), '선물 궁합', rel.slice(rel.indexOf('🗣'), rel.indexOf('🗣') + 300));
    const rec = await html('rec');
    check(/이번 주 하이라이트/.test(rec), '이번 주 하이라이트', rec.slice(0, 300));
    const mind = await html('mind');
    check(/그때 💗\+/.test(mind), '속마음 ↔ 그때 애정', mind.slice(0, 300));
    const cal = await page.evaluate(async () => { __ML__.app.openSheet('cal'); await new Promise(r => setTimeout(r, 400)); return document.querySelectorAll('#ml-full .ml-ce').length; });
    check(cal >= 1, '달력 그날 이모지', String(cal));
    const news = await page.evaluate(async () => { __ML__.app.openSheet('news'); await new Promise(r => setTimeout(r, 400)); return document.querySelectorAll('#ml-full [data-act="map-open"]').length; });
    check(news >= 1, '소식 → 지도 장소', String(news));
    check(!logs.length && !(await page.evaluate(() => window.__errors.length)), '콘솔 오류 없음', logs.join('\n'));
} finally { await close(); }
