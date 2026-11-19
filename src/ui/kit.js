// 화면 부품: 목록 행 · 묶음 카드 · 칩 · 세그먼트 · 바텀시트 (앱 화면처럼 — 줄글 금지)
import { esc } from '../base/util.js';
import { mascot } from './mascot.js';

// [아이콘] 제목 / 작은 부제 ··· 오른쪽 값 또는 ›
export const row = ({ icon = '', title, sub = '', value = '', act = '', data = '', faint = false, more = false }) =>
    `<div class="ml-row${act ? ' tap' : ''}${faint ? ' faint' : ''}"${act ? ` data-act="${act}"` : ''}${data ? ` data-v="${esc(data)}"` : ''}>${icon ? `<span class="ml-ic">${icon}</span>` : ''}<span class="ml-tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="ml-val">${value}${more ? '<i class="ml-chev">›</i>' : ''}</span></div>`;
export const card = (head, body, tail = '') => (body ? `<section class="ml-sec">${head ? `<h4>${head}${tail ? `<span>${tail}</span>` : ''}</h4>` : ''}<div class="ml-card">${body}</div></section>` : '');
// 색은 의미별 셋만: good · bad · mid
export const chip = (text, kind = 'mid', act = '', data = '') => `<span class="ml-chip ${kind}${act ? ' tap' : ''}"${act ? ` data-act="${act}"` : ''}${data ? ` data-v="${esc(data)}"` : ''}>${text}</span>`;
export const seg = (name, opts, cur) => `<div class="ml-seg" data-seg="${name}">${opts.map(([v, l]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
export const bar = (v, kind = '') => `<span class="ml-bar ${kind}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
export const empty = (text, btn = '', act = '') => `<div class="ml-empty">${mascot('lg', 'think', 'bob')}<p>${text}</p>${btn ? `<button class="ml-btn" data-act="${act}">${btn}</button>` : ''}</div>`;
export const btn = (text, act, data = '', kind = '') => `<button class="ml-btn ${kind}" data-act="${act}"${data ? ` data-v="${esc(data)}"` : ''}>${text}</button>`;

// 바텀시트: 보는 화면과 고치는 화면을 나눈다
export function sheet(title, html, { onOk = null, ok = '저장' } = {}) {
    document.querySelector('.ml-bs')?.remove();
    const el = document.createElement('div');
    el.className = 'ml-bs ml-scope';
    el.innerHTML = `<div class="ml-bs-dim"></div><div class="ml-bs-box"><header><b>${title}</b><button class="ml-x" data-bs="x">✕</button></header><div class="ml-bs-body">${html}</div>${onOk ? `<footer><button class="ml-btn main" data-bs="ok">${ok}</button></footer>` : ''}</div>`;
    // 패널(펼친 화면)이 열려 있으면 그 안에 띄운다 — 화면 전체를 덮지 않게
    (document.getElementById('ml-full') ?? document.body).appendChild(el);
    const close = () => el.remove();
    el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-bs]');
        if (e.target.classList.contains('ml-bs-dim') || b?.dataset.bs === 'x') close();
        if (b?.dataset.bs === 'ok') { if ((await onOk?.(el)) !== false) close(); }
    });
    return el;
}
export function toast(text, kind = 'mid') {
    const host = document.querySelector('.ml-toasts') ?? Object.assign(document.body.appendChild(document.createElement('div')), { className: 'ml-toasts ml-scope' });
    const t = document.createElement('div'); t.className = `ml-toast ${kind}`; t.textContent = text; host.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}
// 입력칸에 이야기 속 행동 문장 넣기 (저절로 보내지 않음)
export function putInput(text) {
    const ta = document.getElementById('send_textarea'); if (!ta) return;
    ta.value = ta.value.trim() ? `${ta.value.trim()} ${text}` : text;
    ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
}

// ✏️ 입력 시트 (실리태번 입력 창 대신 · 패널 안에서): fields = [{ k, label, type: text|number|area|pick, v, opts: [[값, 이름]], hint, chips: [빠른 값] }]
//   → 고른 값 { k: v } 또는 null(닫음)
export function form(title, fields, { ok = '저장', extra = '' } = {}) {
    return new Promise((res) => {
        let done = false;
        const f = (x) => {
            const id = `mlf-${x.k}`, v = esc(x.v ?? '');
            const input = x.type === 'area' ? `<textarea class="ml-in" id="${id}" rows="4">${v}</textarea>`
                : x.type === 'pick' ? `<div class="ml-picks" data-k="${x.k}">${x.opts.map(([val, name]) => `<button type="button" class="ml-btn xs${String(val) === String(x.v ?? '') ? ' on' : ''}" data-pick="${esc(val)}">${name}</button>`).join('')}</div>`
                : `<input class="ml-in" id="${id}" type="${x.type === 'number' ? 'number' : 'text'}" value="${v}" ${x.type === 'number' ? 'inputmode="decimal"' : ''} placeholder="${esc(x.ph ?? '')}">`;
            const chips = x.chips?.length ? `<div class="ml-picks q">${x.chips.map(c => `<button type="button" class="ml-btn xs" data-fill="${x.k}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : '';
            return `<label class="ml-field"><span>${x.label}</span>${input}${chips}${x.hint ? `<small>${x.hint}</small>` : ''}</label>`;
        };
        const el = sheet(title, `<form class="ml-form">${fields.map(f).join('')}${extra}</form>`, {
            ok,
            onOk: (box) => {
                const out = {};
                for (const x of fields) out[x.k] = x.type === 'pick' ? box.querySelector(`.ml-picks[data-k="${x.k}"] .on`)?.dataset.pick ?? '' : box.querySelector(`#mlf-${x.k}`)?.value ?? '';
                done = true; res(out);
            },
        });
        el.addEventListener('click', (e) => {
            const p = e.target.closest('[data-pick]'); if (p) { p.parentElement.querySelectorAll('.on').forEach(b => b.classList.remove('on')); p.classList.add('on'); }
            const q = e.target.closest('[data-fill]'); if (q) { const t = el.querySelector(`#mlf-${q.dataset.fill}`); if (t) { t.value = q.dataset.val; t.focus(); } }
        });
        el.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); el.querySelector('[data-bs="ok"]').click(); });
        new MutationObserver((_, ob) => { if (!el.isConnected) { ob.disconnect(); if (!done) res(null); } }).observe(el.parentElement, { childList: true });
        setTimeout(() => el.querySelector('.ml-in')?.focus(), 30);
    });
}
