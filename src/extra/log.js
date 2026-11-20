// 📋 미트볼 오류 · 경고 로그 모으기 (켤 때 필요한 부분만 · 보고서 만들기는 report.js)
import { TITLE } from '../base/st.js';
import { short } from '../base/util.js';

// ───── 미트볼 오류 · 경고 로그 (메모리에 50줄) ─────
const LOG = [];
let hooked = false;
export function initLog() {
    if (hooked) return; hooked = true;
    for (const lv of ['warn', 'error', 'info']) {
        const orig = console[lv].bind(console);
        console[lv] = (...a) => {
            try {
                // 🏎 첫 글이 미트볼 표시일 때만 모은다 (다른 확장의 로그 객체를 매번 직렬화하지 않게)
                const h = typeof a[0] === 'string' ? a[0] : '';
                if (h.includes(TITLE) || h.includes('[미트볼')) {
                const t = a.map(x => (x instanceof Error ? `${x.message}` : typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(' ');
                if (t.includes(TITLE) || t.includes('[미트볼')) { LOG.push(`${new Date().toISOString().slice(11, 19)} ${lv} ${short(t, 900)}`); if (LOG.length > 50) LOG.shift(); }
                }
            } catch { /* 로그 모으다 실패해도 그냥 */ }
            orig(...a);
        };
    }
    window.addEventListener('error', (e) => { if (/meatball-lite|meatball-?phone|meatlite/.test(e.filename ?? '')) { LOG.push(`${new Date().toISOString().slice(11, 19)} error ${short(e.message, 300)}`); if (LOG.length > 50) LOG.shift(); } });
}
export const logLines = () => [...LOG];
