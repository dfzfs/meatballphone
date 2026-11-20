// 💾 켤 때 꼭 필요한 것만: 옛 미트볼이 켜져 있나 · 카드에 붙인 설정집 가져오기 (백업 · 불러오기 · 옮기기는 safe.js — 쓸 때 받음)
import { ctx, getMeta, saveMeta, MODULE, OLD } from '../base/st.js';
import { normBook } from '../rules/book.js';

// 옛 미트볼(폴더 이름 · manifest 이름)이 같이 켜져 있으면 미트볼폰은 쉰다
export function oldActive() {
    const loaded = [...document.querySelectorAll('script[src], link[href]')].some(e => /third-party\/(meatballstats|meatball-stats)\//i.test(e.src || e.href));
    return loaded && ctx().extensionSettings?.[OLD]?.enabled !== false;
}
export function fromCard() {
    const c = ctx(); if (getMeta()?.book) return;
    const x = c.characters?.[c.characterId]?.data?.extensions?.[MODULE]; if (!x?.book) return;
    const meta = getMeta(true); meta.book = normBook(x.book); meta.start = x.start ?? null; saveMeta();
}
