// ⚙️ 설정 앱 (폰 안): 칩이 왜 안 붙었나 · 자가 진단 · 부하 · 본편/분류 모델에 가는 글 보기 · 덧붙일 지시 · 모델 바꾸기 · 전체 복사
//   여는 것만으로는 AI 0회 · 무거운 계산 0 (부하 재기 · 연결 시험은 버튼을 눌렀을 때만)
import { app, ctx, settings, saveSettings, getMeta, saveMeta, msgData, VERSION } from '../base/st.js';
import { esc, short, tokens } from '../base/util.js';
import { row, card, btn, toast } from './kit.js';
import { fold, resetCache, opsOf } from '../rules/engine.js';
import { mode, modeNote, profiles, clsStats, testConnection, presetText, isWaiting, buildPrompt } from '../rules/classify.js';
import { CURRENT, currentApi, resetThink, routeText } from '../rules/clsconn.js';
import { doctorRows, chipCheck } from '../extra/doctor.js';

let test = null; // 🔌 마지막 연결 시험 결과 (이 화면에서만)
let perfNow = null; // 🏎 마지막으로 잰 값
const lv = (x) => (x === 'good' ? '✅' : x === 'mid' ? '🟡' : '🔴');
const lastAI = () => { const c = ctx().chat ?? []; for (let i = c.length - 1; i >= 0; i--) if (!c[i].is_user && !c[i].is_system) return i; return -1; };
const pre = (t) => `<pre class="ml-pre">${esc(t || '(비어 있음)')}</pre>`;
const det = (title, body, open = false) => `<details class="ml-det"${open ? ' open' : ''}><summary>${title}</summary>${body}</details>`;

// ───── 🔍 마지막 답에 칩이 왜 없나 (위에서부터 걸리는 것 하나하나) ─────
export function chipWhy() {
    const s = settings(), meta = getMeta(), chat = ctx().chat ?? [], i = lastAI(), L = [];
    const add = (l, t, sub = '', fix = '') => L.push({ l, t, sub, fix });
    if (!s.enabled) add('bad', '미트볼폰이 꺼져 있어요', '확장 설정 › 미트볼폰 › 켜기');
    if (meta?.off) add('bad', '이 채팅에서 꺼져 있어요', '', btn('다시 켜기', 'set-chaton', '', 'xs'));
    if (!meta?.book) add('bad', '설정집이 없어요', '홈에서 「설정집 만들기」');
    if (meta?.setup) add('bad', '쓸 앱을 아직 안 골랐어요', '🛍️ 쓸 앱 고르기에서 「시작」을 눌러야 셈해요');
    if (meta?.paused) add('bad', '멈춤 중이에요', '멈춘 동안 온 답은 셈하지 않아요', btn('풀기', 'set-pause', '0', 'xs'));
    if (meta?.skipNext) add('mid', '다음 1번 건너뛰기가 켜져 있어요', '다음 답은 셈하지 않아요', btn('끄기', 'set-skip', '0', 'xs'));
    if (i < 0) { add('mid', 'AI 답이 아직 없어요'); return { i, L }; }
    const m = chat[i], sl = msgData(m), B = mode() === 'B', r = meta?.book ? fold() : null;
    if (i < (meta?.startAt ?? 0)) add('mid', `#${i}은 시작 지점 앞이에요`, '옛 미트볼에서 옮긴 채팅은 시작 지점부터 셈해요');
    if (sl?.skip) add('mid', '이 답은 건너뛴 답이에요', '조용한 생성 · 퀵리플라이/gen · 다음 1번 건너뛰기 · OOC');
    if (s.mode !== 'A' && !B) add('mid', '분류 모델(B)을 골랐지만 연결이 없어서 A로 돌아요', modeNote() || '아래 「🔌 모델 · 연결」에서 분류 모델 연결을 골라요');
    if (B) {
        if (isWaiting(i)) add('mid', '지금 분류하는 중이에요', '조금 뒤 칩이 붙어요');
        else if (sl?.clsFail) add('bad', '분류 모델이 실패했어요', clsStats.lastError ? esc(short(clsStats.lastError.text, 160)) : '연결 · 형식 오류', btn('🔄 다시 분류', 'set-recls', String(i), 'xs'));
        else if (sl?.src !== 'cls' && !sl?.skip) add('mid', '이 답은 아직 분류되지 않았어요', '답을 받는 동안 꺼져 있었거나 다른 확장이 답을 바꿨을 수 있어요', btn('🔄 분류하기', 'set-recls', String(i), 'xs'));
    } else if (!sl?.skip) {
        const tag = /<meatball>/i.test(m.mes ?? '') || sl?.ops?.length;
        if (!tag) add('bad', '본편 AI가 &lt;meatball&gt; 줄을 안 썼어요', 'A 모드는 본편이 답 끝에 사건 줄을 써야 해요 · B(분류 모델)로 바꾸면 본편은 소설만 써도 돼요');
    }
    const ops = opsOf(m), ch = (r?.changes?.[i] ?? []).filter(c => c.src !== 'time');
    if (ops.length && !ch.length && !(r?.flags?.[i] ?? []).length) add('mid', `줄 ${ops.length}개를 읽었지만 바뀐 게 없어요`, '이미 같은 장소 · 모르는 키 · 설정집에 없는 행동이면 숫자가 안 바뀌어요 · 아래 「줄마다 보기」');
    if (ch.length) {
        const el = document.querySelector(`#chat .mes[mesid="${i}"]`), box = el?.querySelector('.ml-msg');
        if (!el) add('mid', `#${i} 메시지가 화면에 없어요`, '위로 스크롤해 불러오면 붙어요');
        else if (!box) add('mid', `바뀐 것 ${ch.length}개가 있는데 칩이 안 그려졌어요`, '다른 확장 · 테마가 메시지 칸을 덮어썼을 수 있어요', btn('🖌 다시 그리기', 'set-redraw', '', 'xs'));
        else add('good', `칩 ${ch.length}개가 붙어 있어요`, '안 보이면 테마가 가리는 거예요 (🎨 꾸미기 · 실리태번 테마)');
    }
    if (!L.length) add('good', '걸리는 게 없어요', ops.length ? '' : '이번 답에는 바뀐 일이 없었어요');
    return { i, L };
}
const rowOf = (x) => `<div class="ml-row ml-chk ${x.l}"><span class="ml-tx"><b>${lv(x.l)} ${x.t}</b>${x.sub ? `<small>${x.sub}</small>` : ''}</span>${x.fix ? `<span class="ml-val">${x.fix}</span>` : ''}</div>`;

// ───── 화면 ─────
export function setView(r) {
    const s = settings(), meta = getMeta() ?? {}, B = mode() === 'B', inj = app.lastInj?.() ?? {}, perf = app.perfData?.() ?? { turns: [], refresh: [] };
    let h = `<div class="ml-hint">⚙️ 미트볼폰 v${VERSION} · 칩이 안 붙거나 이상할 때 위에서부터 보세요. 여는 것만으로는 AI를 부르지 않아요.</div>`;

    // 1. 칩
    const W = chipWhy();
    h += card(`🔍 마지막 답 칩 점검${W.i >= 0 ? ` <span>#${W.i}</span>` : ''}`, W.L.map(rowOf).join('')
        + (W.i >= 0 && meta.book ? det('줄마다 보기 (어느 앱으로 읽혔나)', chipCheck(W.i)) : ''));

    // 2. 빠른 켜고 끄기
    h += card('⏯ 빠르게', row({ icon: '⏸', title: '전체 멈춤', sub: '멈춘 동안 본편 주입 0 · AI 호출 0', value: btn(meta.paused ? '풀기' : '멈추기', 'set-pause', meta.paused ? '0' : '1', `xs${meta.paused ? ' on' : ''}`) })
        + row({ icon: '⏭', title: '다음 답 1번 건너뛰기', value: btn(meta.skipNext ? '취소' : '건너뛰기', 'set-skip', meta.skipNext ? '0' : '1', `xs${meta.skipNext ? ' on' : ''}`) })
        + row({ icon: '🔌', title: '이 채팅에서 끄기', sub: 'HUD · 폰 · 칩 없음 · 다시 켜면 이어짐', value: btn('끄기', 'p-off', '', 'xs') }));

    // 3. 자가 진단
    let D = []; try { D = doctorRows(app, perf); } catch (e) { D = [{ lv: 'bad', title: '진단 실패', sub: esc(String(e)) }]; }
    const ok = D.filter(x => x.lv === 'good').length;
    h += card(`🩺 자가 진단 <span>${ok}/${D.length} 좋음</span>`, D.map(x => rowOf({ l: x.lv, t: x.title, sub: x.sub, fix: x.fix })).join(''));

    // 4. 모델 · 연결
    const P = profiles(), a = currentApi();
    const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const clsOpts = [['', '고르지 않음 → A로'], [CURRENT, `지금 쓰는 API에서 모델만 (${a.src || a.main || '?'})`], ...P.map(p => [p.id, `프로필: ${p.name}`])];
    if (s.clsProfile && !clsOpts.some(o => o[0] === s.clsProfile)) clsOpts.push([s.clsProfile, `프로필 id: ${s.clsProfile}`]);
    const t = test;
    h += card('🔌 모델 · 연결',
        `<label class="ml-field"><span>사건 고르기</span><select class="ml-in" data-mlset="mode">${opt([['B', 'B. 분류 모델 (본편은 소설만 · 답마다 1회)'], ['A', 'A. 본편 태그 (추가 호출 0회)']], s.mode)}</select></label>`
        + `<label class="ml-field"><span>분류 모델 연결 (가벼운 모델)</span><select class="ml-in" data-mlset="clsProfile">${opt(clsOpts, s.clsProfile)}</select>`
        + `<small>지금: ${esc(routeText() || '없음')} · 🧼 ${esc(presetText())}</small></label>`
        + (s.clsProfile === CURRENT ? `<label class="ml-field"><span>분류 모델 이름</span><input class="ml-in" data-mlset="clsModel" value="${esc(s.clsModel)}" placeholder="비우면 지금 모델 (${esc(a.model || '?')}) · 예: gemini-3.8-flash"></label>` : '')
        + `<label class="ml-field"><span>설정집 만들기 · 번역 연결</span><select class="ml-in" data-mlset="profile">${opt([['', '지금 연결'], ...P.map(p => [p.id, p.name])], s.profile)}</select></label>`
        + (modeNote() ? `<div class="ml-hint">⚠ ${esc(modeNote())}</div>` : '')
        + `<div class="ml-acts">${btn('🔌 분류 연결 시험 (AI 1회)', 'set-test', '', 'sm')}</div>`
        + (t ? `<div class="ml-cls-res ${t.ok ? 'good' : 'bad'}"><b>${t.ok ? '✅ 성공' : '❌ 실패'}</b> · ${t.ms}ms · ${esc(t.route ?? '')}`
            + `${t.ok ? `<br>고른 사건: ${esc((t.ops ?? []).map(([k, v]) => `${k}: ${v}`).join(' · '))}` : `<br>오류: <code>${esc(t.error ?? '')}</code>`}</div>` : ''));

    // 5. 프롬프트 — 보기 · 덧붙이기
    const it = (k, v) => `${k} ≈${tokens(v || '')}토큰`;
    const last = clsStats.lastSent;
    let clsNext = null; if (B && W.i >= 0 && meta.book) { try { clsNext = buildPrompt(W.i); } catch { clsNext = null; } }
    h += card(`📤 프롬프트 <span>본편 ≈${tokens(Object.values(inj).join('\n'))}토큰 · 깊이 ${s.injectDepth}</span>`,
        det(it('본편 · 적는 법', inj.rule), pre(inj.rule || (B ? '(B 모드는 적는 법을 안 넣어요 · 정상)' : '')))
        + det(it('본편 · 지금 사실', inj.facts), pre(inj.facts))
        + det(it('본편 · 귀띔', inj.hint), pre(inj.hint))
        + (B ? det(`분류 모델 · 마지막으로 보낸 글${clsStats.lastTok ? ` ≈${clsStats.lastTok}토큰` : ''}`, last ? pre(`[system]\n${last.system}\n\n[user]\n${last.user}`) + pre(`[받은 답]\n${clsStats.lastReply ?? '(없음)'}`) : pre('이번 세션엔 아직 안 보냈어요')) : '')
        + (clsNext ? det(`분류 모델 · #${W.i}을 다시 분류하면 보낼 글 ≈${clsNext.tok}토큰`, pre(`[system]\n${clsNext.system}\n\n[user]\n${clsNext.user}`)) : '')
        + `<label class="ml-field"><span>✍ 본편에 덧붙일 지시 · 이 채팅만</span><textarea class="ml-in" rows="2" data-mlmeta="injExtra" placeholder="예: 날짜와 시각은 꼭 본문에 한 번 언급해 줘">${esc(meta.injExtra ?? '')}</textarea><small>귀띔 칸 끝에 붙어요 · 비우면 아래 「모든 채팅」 값</small></label>`
        + `<label class="ml-field"><span>✍ 본편에 덧붙일 지시 · 모든 채팅</span><textarea class="ml-in" rows="2" data-mlset="injExtra" placeholder="비우면 없음">${esc(s.injExtra ?? '')}</textarea></label>`
        + (B ? `<label class="ml-field"><span>✍ 분류 모델에 덧붙일 지시</span><textarea class="ml-in" rows="2" data-mlset="clsExtra" placeholder="예: 대화 속 회상은 지금 일어난 일로 치지 마">${esc(s.clsExtra ?? '')}</textarea><small>분류 지시 끝에 붙어요 · 줄 모양(key: value)은 바꾸지 마세요</small></label>` : '')
        + `<label class="ml-field"><span>주입 깊이 (작을수록 답 바로 앞)</span><select class="ml-in" data-mlset="injectDepth">${opt([[0, '0 · 맨 끝'], [1, '1 (기본)'], [2, '2'], [4, '4'], [8, '8']], s.injectDepth)}</select></label>`
        + `<label class="ml-field"><span>본편 지시 (A 모드)</span><select class="ml-in" data-mlset="preset">${opt([['flash', '플래시용 (짧은 키 + 예시)'], ['general', '일반']], s.preset)}</select></label>`);

    // 6. 부하
    const avg = (A) => (A.length ? A.reduce((x, y) => x + y, 0) / A.length : 0), T = perf.turns ?? [];
    h += card('🏎 부하', row({ icon: '⏱', title: '한 턴 처리 (최근 평균)', value: T.length ? `${avg(T.map(x => x.ms)).toFixed(1)}ms` : '-' })
        + row({ icon: '🖼', title: '화면 다시 그리기 (평균)', value: perf.refresh?.length ? `${avg(perf.refresh).toFixed(1)}ms` : '-' })
        + row({ icon: '🧭', title: '분류 모델 호출', sub: `이번 세션 · 실패 ${clsStats.fails ?? 0}`, value: `${clsStats.calls}회` })
        + (perfNow ? row({ icon: '🧮', title: '처음부터 다시 계산', sub: `메시지 ${perfNow.n}개`, value: `${perfNow.full.toFixed(1)}ms` }) + row({ icon: '⚡', title: '바뀐 곳만 계산', value: `${perfNow.inc.toFixed(2)}ms` }) : '')
        + `<div class="ml-acts">${btn('🏎 지금 재기', 'set-perf', '', 'sm')}</div>`);

    // 7. 복사 · 보고
    h += card('📋 복사 · 보고', row({ icon: '📋', title: '전체 복사 (문제 보고용)', sub: '키 · 주소 · 비밀번호는 자동으로 가려요', act: 'report', more: true })
        + row({ icon: '🖌', title: '다시 그리기', sub: 'HUD · 칩 · 폰을 처음부터 다시', act: 'set-redraw', more: true }));
    return h;
}

// ───── 누르기 ─────
export async function setAct(act, v) {
    const meta = getMeta();
    switch (act) {
        case 'set-pause': if (meta) { meta.paused = v === '1'; saveMeta(); app.refresh?.(true); toast(meta.paused ? '⏸ 멈췄어요' : '▶ 다시 셈해요'); } return true;
        case 'set-skip': if (meta) { meta.skipNext = v === '1'; saveMeta(); app.refresh?.(); } return true;
        case 'set-chaton': app.setChatOff?.(false); return true;
        case 'set-recls': app.reclassify?.(Number(v)); toast('🔄 다시 분류해요'); setTimeout(() => app.refresh?.(), 300); return true;
        case 'set-redraw': resetCache(); document.querySelectorAll('.ml-msg').forEach(x => x.remove()); document.getElementById('ml-hud')?.remove(); app.refresh?.(true); toast('🖌 다시 그렸어요'); return true;
        case 'set-test': { toast('🔌 견본 답 하나를 분류해 봐요…'); test = await testConnection(); app.refresh?.(); return true; }
        case 'set-perf': { const t0 = performance.now(); resetCache(); fold(); const full = performance.now() - t0; const t1 = performance.now(); fold(); perfNow = { full, inc: performance.now() - t1, n: ctx().chat?.length ?? 0 }; app.refresh?.(); return true; }
    }
    return false;
}
// 고르기 · 글 칸 바꿈 → 저장 (frame.js changeHandler에서)
export function setChange(el) {
    const k = el.dataset.mlset, mk = el.dataset.mlmeta;
    if (k) {
        const s = settings(); s[k] = k === 'injectDepth' ? Number(el.value) : el.value;
        saveSettings();
        if (k === 'clsProfile' || k === 'clsModel') { resetThink(); test = null; }
        if (k === 'mode' || k === 'clsProfile') toast(mode() === 'B' ? '🧭 B: 분류 모델이 사건을 골라요' : '🏷 A: 본편이 사건 줄을 써요');
    }
    if (mk) { const meta = getMeta(); if (!meta) return; const t = el.value.trim(); if (t) meta[mk] = t.slice(0, 600); else delete meta[mk]; saveMeta(); }
    app.inject?.(); app.refresh?.();
}
