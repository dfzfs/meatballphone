// 📚 설정집이 읽을 곳 고르기 — 카드 · 페르소나 · 첫 메시지 · 최근 대화 · 모든 로어북 (고른 건 잘라 내지 않고 다 읽음)
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
        const row = (x) => `<label class="ml-src${x.size ? '' : ' empty'}"><input type="checkbox" class="ml-src-cb" data-id="${esc(x.id)}" data-size="${x.size}" ${x.on ? 'checked' : ''} ${x.size ? '' : 'disabled'}>`
            + `<span><b>${esc(x.label)}</b>${x.linked && x.id.startsWith('wi:') ? ' <small class="ml-src-tag">연결됨</small>' : ''}<small>${x.size ? `${kChars(x.size)}${x.n != null ? ` · 항목 ${x.n}개` : ''}` : '비어 있음'}</small></span></label>`;
        const books = list.filter(x => x.id.startsWith('wi:')), base = list.filter(x => !x.id.startsWith('wi:'));
        const html = `<div class="ml-hint">고른 것은 <b>잘라 내지 않고 전부</b> 읽어요. 이 채팅이 기억해서 다음에 「로어북에서 다시 채우기」도 같은 걸 읽어요.</div>`
            + `<div class="ml-src-acts"><button type="button" class="ml-btn xs" data-src="linked">연결된 것만</button><button type="button" class="ml-btn xs" data-src="all">모두</button><button type="button" class="ml-btn xs" data-src="none">모두 끄기</button></div>`
            + `<h4 class="ml-h4">💬 카드 · 대화</h4><div class="ml-srcs">${base.map(row).join('')}</div>`
            + `<h4 class="ml-h4">📚 로어북 <span>${books.length}개</span></h4><div class="ml-srcs">${books.map(row).join('') || '<small class="ml-empty">로어북이 없어요</small>'}</div>`
            + '<div class="ml-src-sum"></div>';
        const el = sheet(title, html, { ok: '이걸로 채우기 (AI 1회)', onOk: (box) => { const ids = [...box.querySelectorAll('.ml-src-cb:checked')].map(c => c.dataset.id); const m = getMeta(); if (m) { m.srcPick = ids; saveMeta(); } done = true; res(ids); } });
        const sum = () => {
            const n = [...el.querySelectorAll('.ml-src-cb:checked')].reduce((a, c) => a + Number(c.dataset.size || 0), 0);
            el.querySelector('.ml-src-sum').innerHTML = `고른 양: <b>${kChars(n)}</b> · 약 ${tok(n).toLocaleString()}토큰 (이번 1회만)`
                + (n > SRC_HARD_MAX ? `<br><span class="neg">⚠ ${kChars(SRC_HARD_MAX)}가 넘는 뒷부분은 잘려요. 덜 중요한 로어북을 꺼 주세요.</span>`
                    : n > 60000 ? '<br><span class="neg">⚠ 꽤 길어요. 쓰는 모델이 한 번에 이만큼 못 읽으면 실패할 수 있어요.</span>' : '');
        };
        el.addEventListener('change', (e) => { if (e.target.classList.contains('ml-src-cb')) sum(); });
        el.addEventListener('click', (e) => {
            const b = e.target.closest('[data-src]'); if (!b) return;
            for (const c of el.querySelectorAll('.ml-src-cb:not(:disabled)')) { const x = list.find(y => y.id === c.dataset.id); c.checked = b.dataset.src === 'all' ? true : b.dataset.src === 'none' ? false : !!x?.linked; }
            sum();
        });
        sum();
        new MutationObserver((_, ob) => { if (!el.isConnected) { ob.disconnect(); if (!done) res(null); } }).observe(el.parentElement, { childList: true });
    });
}
