// 📋 전체 복사 — 문제를 보고할 때 상황을 통째로 넘기는 꾸러미 (사람이 읽는 글 + 맨 아래 원본 JSON)
//   비밀 값(키 이름에 key · token · secret · password · url)은 「(숨김)」 · 연결은 이름만
import { app, ctx, settings, getMeta, msgData, VERSION, TITLE } from '../base/st.js';
import { short } from '../base/util.js';
import { fold, opsOf } from '../rules/engine.js';
import { mode, profiles, clsStats, presetText } from '../rules/classify.js';
import { routeText } from '../rules/clsconn.js';
import { doctorRows, chipCheck } from './doctor.js';
import { sheet, toast } from '../ui/kit.js';

// ───── 미트볼 오류 · 경고 로그 (메모리에 50줄) ─────
const LOG = [];
let hooked = false;
export function initLog() {
    if (hooked) return; hooked = true;
    for (const lv of ['warn', 'error', 'info']) {
        const orig = console[lv].bind(console);
        console[lv] = (...a) => {
            try {
                const t = a.map(x => (x instanceof Error ? `${x.message}` : typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(' ');
                if (t.includes(TITLE) || t.includes('[미트볼')) { LOG.push(`${new Date().toISOString().slice(11, 19)} ${lv} ${short(t, 900)}`); if (LOG.length > 50) LOG.shift(); }
            } catch { /* 로그 모으다 실패해도 그냥 */ }
            orig(...a);
        };
    }
    window.addEventListener('error', (e) => { if (/meatball-lite|meatlite/.test(e.filename ?? '')) { LOG.push(`${new Date().toISOString().slice(11, 19)} error ${short(e.message, 300)}`); if (LOG.length > 50) LOG.shift(); } });
}
export const logLines = () => [...LOG];

// ───── 비밀 값 숨기기 ─────
const SECRET = /key|token|secret|password|passwd|url|auth|cookie/i;
export function scrub(v, depth = 0) {
    if (depth > 12) return '(너무 깊음)';
    if (Array.isArray(v)) return v.map(x => scrub(x, depth + 1));
    if (v && typeof v === 'object') {
        const o = {};
        for (const [k, x] of Object.entries(v)) o[k] = SECRET.test(k) ? '(숨김)' : scrub(x, depth + 1);
        return o;
    }
    if (typeof v === 'string') {
        if (v.length > 4000) return `${v.slice(0, 200)}… (긴 글 ${v.length}자 줄임)`;
        // 글 안에 섞인 주소 · 키 모양도 가림
        return v.replace(/https?:\/\/[^\s"'<>]+/g, '(주소 숨김)').replace(/\b(sk|pk|AIza|ghp|xox[bp])[-_A-Za-z0-9]{12,}/g, '(키 숨김)');
    }
    return v;
}

// ───── 꾸러미 만들기 ─────
function stVersion() {
    const c = ctx();
    return c.getVersion?.() ?? globalThis.SillyTavern?.version ?? document.getElementById('version_display')?.textContent?.trim() ?? '알 수 없음';
}
export function buildReport({ n = 10, noText = false } = {}) {
    const meta = getMeta(), set = settings(), chat = ctx().chat ?? [], r = meta?.book ? fold() : null;
    n = Math.max(1, Math.min(50, Math.round(Number(n) || 10)));
    const prof = profiles(), pname = (id) => (id ? prof.find(p => p.id === id)?.name ?? '(이름 모름)' : '(없음)');
    let choices = '없음';
    try { const d = globalThis.MeatballChoices?.dump?.(); if (d) choices = d; } catch (e) { choices = `dump 실패: ${e.message}`; }
    const from = Math.max(0, chat.length - n * 2), msgs = [];
    for (let i = from; i < chat.length && msgs.length < n * 2; i++) {
        const m = chat[i], sl = msgData(m);
        msgs.push({
            i, who: m.is_user ? 'user' : m.is_system ? 'system' : 'ai', swipe: m.swipe_id ?? 0,
            ...(noText ? {} : { text: m.mes }),
            events: m.is_user ? [] : opsOf(m).map(o => `${o.src}: ${o.k}: ${o.v}`),
            src: sl?.src ?? null, skip: !!sl?.skip, clsFail: !!sl?.clsFail,
            chips: (r?.changes?.[i] ?? []).filter(c => c.src !== 'time').map(c => `${c.icon} ${c.label} ${c.from ?? ''}→${c.to ?? ''} (${c.why ?? ''})`),
            flags: (r?.flags?.[i] ?? []).map(f => f.text),
            mbc: m.extra?.mbc ?? null,
        });
    }
    const perf = app.perfData?.() ?? {};
    const data = {
        when: new Date().toISOString(),
        versions: { lite: VERSION, choices: globalThis.MeatballChoices?.version ?? '없음', sillytavern: stVersion() },
        browser: navigator.userAgent, screen: `${window.innerWidth}×${window.innerHeight}`,
        mode: mode(), clsConnection: pname(set.clsProfile), makeConnection: pname(set.profile),
        apps: meta?.mods ?? {}, influence: { all: set.influence, chat: meta?.influence ?? null },
        settings: set, book: meta?.book ?? null, state: r?.S ?? null, ruleVersions: meta?.ruleVers ?? [],
        messages: msgs,
        lastInjection: app.lastInj?.() ?? {},
        lastClassify: { route: routeText(), preset: presetText(), sent: clsStats.lastSent ?? null, received: clsStats.lastReply ?? null, error: clsStats.lastError ?? null, ms: clsStats.lastMs ?? 0, calls: clsStats.calls, fails: clsStats.fails },
        doctor: (() => { try { return doctorRows(app, perf).map(x => `${x.lv} · ${x.title} · ${String(x.sub).replace(/<[^>]+>/g, '')}`); } catch (e) { return [`실패: ${e.message}`]; } })(),
        chipCheck: msgs.filter(x => x.who === 'ai').slice(-3).map(x => ({ i: x.i, text: (() => { try { return chipCheck(x.i).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); } catch (e) { return e.message; } })() })),
        perf: { turns: perf.turns ?? [], refresh: perf.refresh ?? [] },
        log: logLines(),
        choices,
    };
    const safe = scrub(data);
    // 사람이 읽는 글
    const L = [];
    L.push(`# ${TITLE} 전체 복사 · ${safe.when}`);
    L.push(`판: 라이트 ${safe.versions.lite} · 선택지 ${safe.versions.choices} · 실리태번 ${safe.versions.sillytavern}`);
    L.push(`브라우저: ${safe.browser} · 화면 ${safe.screen}`);
    L.push(`모드: ${safe.mode} · 분류 연결: ${safe.clsConnection} · 만들기 연결: ${safe.makeConnection}`);
    L.push(`켜진 앱: ${Object.entries(safe.apps).filter(([, v]) => v).map(([k]) => k).join(', ') || '-'}`);
    L.push(`숫자 규칙 판: ${safe.ruleVersions.length + 1}판`);
    if (safe.state) L.push(`지금: ${safe.state.loc || '-'} · 돈 ${safe.state.cash} · 같이 ${safe.state.with?.join(', ') || '-'} · 상태 ${safe.state.status?.map(s => s.name).join(', ') || '-'}`);
    L.push('', `## 최근 메시지 ${msgs.length}개${noText ? ' (이야기 글 뺌)' : ''}`);
    for (const m of safe.messages) {
        L.push(`#${m.i} ${m.who} · 스와이프 ${m.swipe}${m.src ? ` · ${m.src}` : ''}${m.skip ? ' · 건너뜀' : ''}${m.clsFail ? ' · 분류 실패' : ''}`);
        if (m.text != null) L.push(`  글: ${short(m.text, 600)}`);
        if (m.events.length) L.push(`  사건: ${m.events.join(' / ')}`);
        if (m.chips.length) L.push(`  칩: ${m.chips.join(' / ')}`);
        if (m.flags.length) L.push(`  확인 필요: ${m.flags.join(' / ')}`);
        if (m.mbc) L.push(`  선택지: ${JSON.stringify(m.mbc)}`);
    }
    L.push('', '## 🩺 자가 진단', ...safe.doctor.map(x => `- ${x}`));
    L.push('', '## 마지막 본편 주입', ...Object.entries(safe.lastInjection).map(([k, v]) => `[${k}]\n${v}`));
    const ce = safe.lastClassify.error;
    L.push('', '## 마지막 분류 모델', `연결: ${safe.lastClassify.route} · ${safe.lastClassify.preset}`, `오류: ${ce ? `${ce.at} · ${ce.ms}ms · ${ce.text}` : '(없음)'}`,
        `보냄:\n${safe.lastClassify.sent ? `${safe.lastClassify.sent.system}\n---\n${safe.lastClassify.sent.user}` : '(없음)'}`, `받음:\n${safe.lastClassify.received ?? '(없음)'}`);
    L.push('', '## 오류 · 경고 로그', ...(safe.log.length ? safe.log : ['(없음)']));
    L.push('', '## 선택지', typeof safe.choices === 'string' ? safe.choices : '(아래 JSON)');
    L.push('', '===== 원본 JSON =====', JSON.stringify(safe, null, 1));
    return { text: L.join('\n'), data: safe };
}
const LIMIT = 30000;
export async function copyReport(opts) {
    const { text } = buildReport(opts);
    const out = text.length > LIMIT ? `${text.slice(0, LIMIT)}\n\n… (${text.length.toLocaleString()}자 중 앞부분만 · 전체는 「파일로 받기」로 받으세요)` : text;
    try { await navigator.clipboard.writeText(out); }
    catch {
        const ta = Object.assign(document.createElement('textarea'), { value: out }); document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } finally { ta.remove(); }
    }
    toast(text.length > LIMIT ? '앞부분을 복사했어요 · 전체는 파일로 받으세요' : '복사했어요', 'good');
    return out;
}
export function fileName(d = new Date()) {
    const p = (x) => String(x).padStart(2, '0');
    return `meatball-lite-report-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`;
}
export function saveReport(opts) {
    const { text } = buildReport(opts), name = fileName();
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    toast(`${name} 받았어요`, 'good');
    return name;
}
// 고르는 시트: 메시지 수 · 이야기 글 빼기 · 복사 / 파일
export function reportSheet() {
    const el = sheet('📋 전체 복사 (문제 보고용)', `<div class="ml-hint">판 번호 · 모드 · 설정 · 설정집 · 지금 상태 · 최근 메시지(사건 · 칩 · 확인 필요 · 선택지 기록) · 본편 주입 · 분류 모델이 주고받은 글 · 자가 진단 · 부하 · 오류 로그를 담아요. API 키 · 연결 주소 · 비밀번호는 「(숨김)」으로 바꿔요.</div>
        <label class="ml-field"><span>최근 메시지 몇 개 (1~50)</span><input type="number" class="text_pole ml-rp-n" min="1" max="50" value="10"></label>
        <label class="checkbox_label"><input type="checkbox" class="ml-rp-notext"> 이야기 글 빼고 (사건 · 칩만)</label>
        <div class="ml-acts"><button class="ml-btn main" data-rp="copy">📋 클립보드에 복사</button><button class="ml-btn" data-rp="file">💾 파일로 받기</button></div>`);
    el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rp]'); if (!b) return; e.stopPropagation();
        const opts = { n: Number(el.querySelector('.ml-rp-n').value), noText: el.querySelector('.ml-rp-notext').checked };
        if (b.dataset.rp === 'copy') copyReport(opts); else saveReport(opts);
    });
    return el;
}
