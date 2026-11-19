// 📚 설정집이 읽을 곳 고르기 — 카드 · 페르소나 · 첫 메시지 · 최근 대화 · 모든 로어북 · 로어북 안 항목(월드 인포)까지 하나씩
//   고른 건 잘라 내지 않고 다 읽음 · 고른 것 = 켠 칸 id들 + 뺀 항목 'wx:책:uid' (새로 생긴 항목은 저절로 들어감)
import { getMeta, saveMeta } from '../base/st.js';
import { esc } from '../base/util.js';
import { sheet } from './kit.js';
import { sourceList, SRC_HARD_MAX } from '../rules/ai.js';

const tok = (n) => Math.round(n / 2.5); // 글자 → 대략 토큰 (한글 · 영어 섞임 기준)
const kChars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}천 자` : `${n}자`);
// 고르면 [id, …]를 돌려줌 · 닫으면 null
export async function pickSources(title = '📚 설정집이 읽을 곳') {
    const list = await sourceList();
    return new Promise((res) => {
        let done = false;
        const base = list.filter(x => !x.id.startsWith('wi:')), books = list.filter(x => x.id.startsWith('wi:'));
        const baseRow = (x) => `<label class="ml-src${x.size ? '' : ' empty'}"><input type="checkbox" class="ml-src-cb" data-id="${esc(x.id)}" data-size="${x.size}" ${x.on ? 'checked' : ''} ${x.size ? '' : 'disabled'}>`
            + `<span><b>${esc(x.label)}</b><small>${x.size ? kChars(x.size) : '비어 있음'}</small></span></label>`;
        const entry = (b, e) => `<label class="ml-src-e" data-q="${esc(`${e.title} ${e.keys}`.toLowerCase())}"><input type="checkbox" class="ml-src-x" data-book="${esc(b.id)}" data-id="${esc(e.id)}" data-size="${e.size}" ${e.on ? 'checked' : ''}>`
            + `<span><b>${esc(e.title)}</b>${e.always ? ' <small class="ml-src-tag">늘 켜짐</small>' : ''}<small>${kChars(e.size)}${e.keys && e.keys !== e.title ? ` · 🔑 ${esc(e.keys)}` : ''}</small><small class="ml-src-peek">${esc(e.peek)}</small></span></label>`;
        const bookRow = (b) => `<div class="ml-src-book" data-book="${esc(b.id)}"><div class="ml-src${b.n ? '' : ' empty'}"><input type="checkbox" class="ml-src-cb" data-id="${esc(b.id)}" ${b.on ? 'checked' : ''} ${b.n ? '' : 'disabled'}>`
            + `<span><b>${esc(b.label)}</b>${b.linked ? ' <small class="ml-src-tag">연결됨</small>' : ''}<small class="ml-src-bsum"></small></span>`
            + `${b.n ? `<button type="button" class="ml-btn xs ml-src-open" data-open="${esc(b.id)}">항목 ${b.n}개 ▾</button>` : ''}</div>`
            + `${b.n ? `<div class="ml-src-items" hidden><div class="ml-src-acts"><input class="ml-in ml-src-find" placeholder="항목 찾기 (이름 · 키)"><button type="button" class="ml-btn xs" data-all="1">모두</button><button type="button" class="ml-btn xs" data-all="0">모두 끄기</button></div>`
                + `${b.items.map(e => entry(b, e)).join('')}</div>` : ''}</div>`;
        const html = '<div class="ml-hint">고른 것은 <b>잘라 내지 않고 전부</b> 읽어요. 로어북은 「항목」을 펼쳐서 월드 인포를 하나씩 고를 수 있어요. 이 채팅이 기억해서 다음에 다시 채울 때도 같은 걸 읽어요.</div>'
            + '<div class="ml-src-acts"><button type="button" class="ml-btn xs" data-src="linked">연결된 로어북만</button><button type="button" class="ml-btn xs" data-src="all">모두</button><button type="button" class="ml-btn xs" data-src="none">모두 끄기</button></div>'
            + `<h4 class="ml-h4">💬 카드 · 대화</h4><div class="ml-srcs">${base.map(baseRow).join('')}</div>`
            + `<h4 class="ml-h4">📚 로어북 <span>${books.length}개</span></h4><div class="ml-srcs">${books.map(bookRow).join('') || '<small class="ml-empty">로어북이 없어요</small>'}</div>`
            + `<h4 class="ml-h4">✍ 추가 지시 <span>AI에게 꼭 지킬 것 · 비워도 돼요</span></h4><textarea class="ml-in ml-src-note" rows="3" placeholder="예: 둘은 아직 연인이 아니고 서로 짝사랑하는 썸 단계 (애정 50 정도) · 돈 단위는 원 · 현대 배경이라 마법 얘기는 빼기">${esc(getMeta()?.srcNote ?? '')}</textarea>`
            + '<div class="ml-src-sum"></div>';
        const el = sheet(title, html, {
            ok: '이걸로 채우기 (AI 1회)',
            onOk: (box) => {
                const ids = [...box.querySelectorAll('.ml-src-cb:checked')].map(c => c.dataset.id).concat([...box.querySelectorAll('.ml-src-x:not(:checked)')].map(c => c.dataset.id));
                const m = getMeta(); if (m) { m.srcPick = ids; m.srcNote = String(box.querySelector('.ml-src-note')?.value ?? '').trim().slice(0, 2000); saveMeta(); }
                done = true; res(ids);
            },
        });
        const sum = () => {
            let n = 0;
            for (const c of el.querySelectorAll('.ml-srcs > .ml-src .ml-src-cb:checked')) n += Number(c.dataset.size || 0);
            for (const bk of el.querySelectorAll('.ml-src-book')) {
                const on = bk.querySelector('.ml-src-cb')?.checked, xs = [...bk.querySelectorAll('.ml-src-x')], picked = xs.filter(x => x.checked), sz = picked.reduce((a, x) => a + Number(x.dataset.size || 0), 0);
                xs.forEach(x => { x.disabled = !on; });
                const s = bk.querySelector('.ml-src-bsum'); if (s) s.textContent = xs.length ? `${on ? `항목 ${picked.length}/${xs.length}개 · ${kChars(sz)}` : `항목 ${xs.length}개 · 안 읽음`}` : '비어 있음';
                if (on) n += sz;
            }
            el.querySelector('.ml-src-sum').innerHTML = `고른 양: <b>${kChars(n)}</b> · 약 ${tok(n).toLocaleString()}토큰 (이번 1회만)`
                + (n > SRC_HARD_MAX ? `<br><span class="neg">⚠ ${kChars(SRC_HARD_MAX)}가 넘는 뒷부분은 잘려요. 덜 중요한 항목을 꺼 주세요.</span>`
                    : n > 60000 ? '<br><span class="neg">⚠ 꽤 길어요. 쓰는 모델이 한 번에 이만큼 못 읽으면 실패할 수 있어요.</span>' : '');
        };
        el.addEventListener('change', (e) => { if (e.target.matches('.ml-src-cb, .ml-src-x')) sum(); });
        el.addEventListener('input', (e) => {
            if (!e.target.classList.contains('ml-src-find')) return;
            const q = e.target.value.trim().toLowerCase();
            e.target.closest('.ml-src-items').querySelectorAll('.ml-src-e').forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); });
        });
        el.addEventListener('click', (e) => {
            const o = e.target.closest('[data-open]');
            if (o) { const it = o.closest('.ml-src-book').querySelector('.ml-src-items'); it.hidden = !it.hidden; o.textContent = o.textContent.replace(/[▾▴]/, it.hidden ? '▾' : '▴'); return; }
            const al = e.target.closest('[data-all]');
            if (al) { al.closest('.ml-src-items').querySelectorAll('.ml-src-e:not([hidden]) .ml-src-x').forEach(x => { x.checked = al.dataset.all === '1'; }); sum(); return; }
            const b = e.target.closest('[data-src]'); if (!b) return;
            for (const c of el.querySelectorAll('.ml-src-cb:not(:disabled)')) {
                const x = list.find(y => y.id === c.dataset.id);
                c.checked = b.dataset.src === 'all' ? true : b.dataset.src === 'none' ? false : x?.id.startsWith('wi:') ? !!x.linked : c.checked;
            }
            sum();
        });
        sum();
        new MutationObserver((_, ob) => { if (!el.isConnected) { ob.disconnect(); if (!done) res(null); } }).observe(el.parentElement, { childList: true });
    });
}
