// 🔍 칩 점검 · 🩺 자가 진단 — AI 0회, 지금 채팅만 봄
import { ctx, settings, getMeta, msgData, MODULE } from '../base/st.js';
import { esc, short } from '../base/util.js';
import { fold, opsOf } from '../rules/engine.js';
import { kindOf } from '../rules/tags.js';
import { stats as aiStats } from '../rules/ai.js';
import { injTokens } from '../rules/inject.js';
import { mode, modeNote, clsStats } from '../rules/classify.js';
import { oldActive } from './safecore.js';
import { sheet, btn } from '../ui/kit.js';

// 이벤트 종류 → 앱
const KIND_APP = { need: '📊 수치', ate: '📊 수치', slept: '📊 수치', washed: '📊 수치', rest: '📊 수치', worked: '📊 수치 · 💰 재산', status: '🏷️ 상태', fate: '🏷️ 상태',
    cash: '💰 재산', earn: '💰 재산', buy: '💰 재산', sell: '💰 재산', item: '👜 소지품', got: '👜 소지품', used: '👜 소지품', lost: '👜 소지품', wear: '👕 착용', unwear: '👕 착용',
    gift: '💞 관계', aff: '💞 관계', trust: '💞 관계', act: '💞 관계', memory: '💞 관계', jealous: '💞 관계', npc: '💞 관계', gone: '💞 관계', want: '💞 관계', taste: '💞 관계', pair: '🔗 인물끼리', meddle: '💞 관계',
    loc: '🗺 지도', with: '🗺 지도', time: '📅 달력', pass: '📅 달력', date: '📅 달력', weather: '📅 달력', promise: '📅 달력', anniv: '📅 달력',
    roll: '🎲 주사위', mind: '💭 속마음', watch: '💭 속마음', cell: '💭 속마음', life: '📰 소식', newsline: '📰 소식', feed: '📰 소식', bgm: '🎵 음악', custom: '🧩 내 탭' };
const SRC = { tag: '태그', cls: '분류 모델', hand: '손 고침', ai: 'AI 고침', meddle: '장난' };
export function chipCheck(i) {
    const r = fold(), m = ctx().chat?.[i]; if (!r || !m) return '';
    const book = getMeta().book, ch = r.changes[i] ?? [], fl = r.flags[i] ?? [], sl = msgData(m);
    const ops = opsOf(m, book), needs = [...book.me.needs.flatMap(n => [n.name, n.key]), ...book.me.gauges.flatMap(g => [g.name, g.key])];
    const rows = ops.map(o => {
        const kind = kindOf(o.k, needs), app = KIND_APP[kind], eff = ch.filter(c => c.i === o.j), bad = fl.filter(f => f.i === o.j);
        const st = kind === 'unknown' ? ['bad', '모르는 키 · 건너뜀'] : kind === 'skip' ? ['mid', '옛 키 · 조용히 건너뜀'] : bad.length ? ['bad', bad.map(f => f.text).join(' · ')] : eff.length ? ['good', eff.map(c => `${c.icon} ${c.label}`
            + ` ${typeof c.to === 'number' && typeof c.from === 'number' ? (c.to - c.from > 0 ? '+' : '') + Math.round(c.to - c.from) : esc(String(c.to))}`).join(' · ')] : ['mid', '읽었지만 바뀐 것 없음'];
        return `<div class="ml-row ml-chk ${st[0]}"><span class="ml-tx"><b><code>${esc(short(o.k, 16))}: ${esc(short(o.v, 40))}</code></b><small>${app ?? (kind === 'unknown' ? '❓' : '—')} · ${SRC[o.src] ?? o.src} · ${esc(st[1])}</small></span></div>`;
    });
    const head = `<div class="ml-hint">${sl?.skip ? '⏭ 이 답은 건너뛴 답이에요 (조용한 생성 · 건너뛰기 · OOC)' : sl?.clsFail ? '⚠ 분류 모델이 실패한 답이에요 (칩의 「다시」)' : sl?.src === 'cls' ? '🧭 분류 모델이 목록에서 고른 답이에요' : sl?.ops ? '🏷 본편 AI가 쓴 태그로 읽었어요' : '본문에서 태그를 다시 읽었어요'}</div>`;
    return head + `<div class="ml-card">${rows.join('') || '<div class="ml-row"><span class="ml-tx"><small>이 답에는 줄이 없어요</small></span></div>'}</div>`;
}

// 🩺 자가 진단: 지금 채팅이 잘 돌아가는지 한눈에 · 고칠 곳은 바로 가기
// 진단 줄 목록 [{ lv, title, sub, fix }] — 화면(doctor)과 전체 복사(report)가 같이 씀
export function doctorRows(app, perf) {
    const set = settings(), meta = getMeta(), chat = ctx().chat ?? [], r = meta?.book ? fold() : null, L = [];
    const add = (lv, title, sub, fix = '') => L.push({ lv, title, sub, fix });
    add(set.enabled ? 'good' : 'bad', '켜짐', set.enabled ? '미트볼폰이 켜져 있어요' : '확장 설정에서 켜 주세요');
    if (oldActive()) add('bad', '옛 미트볼과 같이 켜짐', '둘이 같이 켜져 있으면 미트볼폰은 쉬어요 · 옛 미트볼을 끄거나 「옮겨 오기」');
    add(meta?.book ? 'good' : 'bad', '이 채팅 상태창', meta?.book ? `설정집 있음 · 인물 ${meta.book.people.length} · 장소 ${meta.book.world.places.length}` : '아직 없어요 · 홈에서 「만들기」');
    if (meta?.paused) add('mid', '멈춤', '지금 멈춤이에요 · 답이 와도 계산하지 않아요', btn('풀기', 'doc-unpause', '', 'xs'));
    // 태그 비율 (최근 AI 답 12개)
    const ais = []; for (let i = chat.length - 1; i >= 0 && ais.length < 12; i--) if (!chat[i].is_user && !chat[i].is_system) ais.push(i);
    if (ais.length) {
        let tag = 0, cls = 0, fail = 0, skip = 0, none = 0; const unk = {};
        const needs = meta?.book ? [...meta.book.me.needs.flatMap(n => [n.name, n.key]), ...meta.book.me.gauges.flatMap(g => [g.name, g.key])] : [];
        for (const i of ais) {
            const sl = msgData(chat[i]);
            if (sl?.skip) skip++; else if (sl?.clsFail) fail++; else if (sl?.src === 'cls') cls++;
            else if (/<meatball>/i.test(chat[i].mes ?? '') || sl?.ops?.length) tag++; else none++;
            for (const o of opsOf(chat[i])) if (kindOf(o.k, needs) === 'unknown') unk[o.k] = (unk[o.k] ?? 0) + 1;
        }
        const B = mode() === 'B', base = Math.max(1, ais.length - skip);
        if (B && clsStats.lastError) add('bad', '마지막 분류 요청 실패', `${esc(clsStats.lastError.text)} · ${clsStats.lastError.ms}ms · 설정의 「🔌 분류 연결 시험」으로 다시 확인`);
        add(modeNote() ? 'mid' : 'good', `사건 고르기: ${B ? 'B 분류 모델' : 'A 본편 태그'}`, modeNote() || (B ? `분류 ${clsStats.calls}회 · 마지막 ≈${clsStats.lastTok}토큰` : '추가 호출 0회'));
        if (B) {
            const rate = Math.round(cls / base * 100);
            add(fail ? 'bad' : rate >= 70 ? 'good' : 'mid', `분류된 답 ${rate}%`, `최근 ${ais.length}답 · 분류 ${cls} · 실패 ${fail} · 태그 ${tag} · 건너뜀 ${skip} · 없음 ${none}${fail ? ' · 칩의 「다시」를 눌러 보세요' : ''}`);
        } else {
            const rate = Math.round(tag / base * 100);
            add(rate >= 70 ? 'good' : rate >= 40 ? 'mid' : 'bad', `태그 쓴 답 ${rate}%`, `최근 ${ais.length}답 · 태그 ${tag} · 건너뜀 ${skip} · 없음 ${none}${rate < 70 ? ' · B(분류 모델)로 바꾸거나 주입 깊이를 얕게 해 보세요' : ''}`, rate < 70 ? btn('게이지', 'doc-open', 'gauge', 'xs') : '');
        }
        const uk = Object.entries(unk).sort((a, b) => b[1] - a[1]);
        if (uk.length) add('mid', `모르는 키 ${uk.length}종`, uk.slice(0, 6).map(([k, n]) => `${esc(k)}×${n}`).join(' · ') + ' · 그 줄은 건너뛰어요');
    }
    // 확인 필요
    if (r) { const fl = Object.values(r.flags ?? {}).flat().filter(f => !f.soft).length; add(fl ? 'mid' : 'good', `확인 필요 ${fl}개`, fl ? '돈 부족 · 없는 물건 같은 걸 AI가 썼어요 · 기록에서 고치거나 무시' : '어긋난 줄 없음', fl ? btn('기록', 'doc-open', 'rec', 'xs') : ''); }
    // 주입
    const inj = app.lastInj?.() ?? {}, tk = injTokens(inj);
    const sent = !!(inj.rule || inj.facts || inj.hint), noAI = !(ctx().chat ?? []).some(m => !m.is_user && !m.is_system);
    // B 모드는 「적는 법」이 없어서 rule이 비어 있는 게 정상 · 답이 아직 없으면 「아직」(나쁨 아님)
    add(sent ? (tk > 900 ? 'mid' : 'good') : 'mid', `본편에 가는 글 ≈ ${tk} 토큰`, sent ? `${inj.rule ? '적는 법 · ' : ''}결과${inj.hint ? ' · 귀띔' : ''} · 깊이 ${set.injectDepth ?? 1}${tk > 900 ? ' · 조금 길어요 · 게이지를 낮춰 보세요' : ''}` : noAI ? '아직 답이 없어요 · 대화를 시작하면 들어가요' : '이번엔 넣을 결과가 없었어요 (영향력 · 멈춤 · 눈 감기를 확인)');
    // 보조 AI · 부하
    const cm = ctx().ConnectionManagerRequestService, prof = set.profile;
    add(!prof || cm ? 'good' : 'mid', '보조 AI 연결', prof ? (cm ? `프로필: ${esc(prof)}` : '프로필을 골랐지만 연결 관리자가 없어요 · 지금 연결로 대신 보냄') : '지금 연결로 보냄 (프로필 없음)');
    add('good', `보조 AI ${aiStats.calls}회`, aiStats.calls ? `평균 ${Math.round(aiStats.ms / aiStats.calls)}ms · 보충 · 번역 · 설정집 채우기` : '이번 세션엔 아직 안 부름');
    const ms = perf?.turns?.length ? Math.round(perf.turns.reduce((a, t) => a + t.ms, 0) / perf.turns.length) : null;
    if (ms != null) add(ms < 60 ? 'good' : ms < 150 ? 'mid' : 'bad', `답 하나 처리 ${ms}ms`, `최근 ${perf.turns.length}답 평균${ms >= 60 ? ' · 「부하 재기」로 자세히' : ''}`);
    // 저장 크기
    let bytes = 0; for (const m of chat) if (m.extra?.[MODULE]) bytes += JSON.stringify(m.extra[MODULE]).length; bytes += JSON.stringify(meta ?? {}).length;
    add(bytes < 400000 ? 'good' : 'mid', `채팅에 붙은 상태창 데이터 ${Math.round(bytes / 1024)}KB`, bytes < 400000 ? '가벼워요' : '조금 커요 · 오래된 채팅은 새 채팅으로 이어 가 보세요');
    return L;
}
export function doctor(app, perf) {
    const L = doctorRows(app, perf), ok = L.filter(x => x.lv === 'good').length;
    const row = (x) => `<div class="ml-row ml-chk ${x.lv}"><span class="ml-tx"><b>${x.lv === 'good' ? '✅' : x.lv === 'mid' ? '🟡' : '🔴'} ${x.title}</b><small>${x.sub}</small></span>${x.fix ? `<span class="ml-val">${x.fix}</span>` : ''}</div>`;
    sheet('🩺 자가 진단', `<div class="ml-hint">AI 부르지 않고 이 채팅만 봤어요 · ${ok}/${L.length} 좋음</div><div class="ml-card">${L.map(row).join('')}</div>`
        + `<div class="ml-acts">${btn('📋 전체 복사 (문제 보고용)', 'report', '', 'sm')}</div>`);
}
