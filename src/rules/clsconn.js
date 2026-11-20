// 🔌 분류 모델 연결 — 사용자 프리셋에 기대지 않는다.
//   연결 프로필(또는 지금 쓰는 API)에서는 API · 모델 · 인증만 빌리고,
//   프롬프트 · 탈옥 · 길이 · 온도 · 생각 설정은 아래 「미트볼 분류용」 깨끗한 프리셋 값으로 보낸다.
import { ctx, settings, TITLE } from '../base/st.js';
import { short } from '../base/util.js';

// 「미트볼 분류용」 프리셋 (확장 안에 들고 있음 · 사용자 프리셋 대신 이것만 씀)
export const CLS_PRESET = Object.freeze({
    name: '미트볼 분류용',
    temperature: 0,
    top_p: 1,
    max_tokens: 32000, // 🔓 답 길이는 사실상 제한 없음 (모델 최대까지) — 서버가 너무 크다고 하면 그때만 줄여서 다시
    stream: false,
    reasoning_effort: 'min', // 제미니 · 오픈AI · 클로드: 생각은 최소 (가능하면 끔)
    include_reasoning: false, // 생각 글은 돌려받지 않음
});
// 생각 설정을 못 받는 모델이면 이것만 빼고 한 번 더
const NO_THINK = ['reasoning_effort', 'include_reasoning'];
// 생각을 못 끄는 모델 대비로 늘리던 값 (이제 기본이 넉넉해서 같은 값)
const BIG_MAX = 32000;
// 서버가 「답 길이가 너무 크다」고 거절하면 → 8192 → 4096으로 줄여서 다시 (되면 그 연결은 그 값으로 기억)
export const TOO_BIG = /max_?tokens|max_completion_tokens|maximum.{0,30}(?:tokens|output)|too (?:many|large).{0,20}tokens|exceeds?.{0,30}(?:token|limit|maximum)|must be (?:less|at most|<=)|greater than .{0,20}(?:allowed|max)|afford|credits/i;
const CAPS = [8192, 4096];
const EMPTY_ERR = /text empty|empty (?:response|candidate)|MAX_TOKENS|no candidates/i;
const THINK_ERR = /reason|think|budget|unsupported|unknown (?:field|param)|invalid.*(?:param|argument)/i;

export const CURRENT = '@current'; // 「지금 쓰는 API에서 모델만 고르기」
export const clsRoute = () => (settings().clsProfile === CURRENT ? 'current' : settings().clsProfile ? 'profile' : '');

// 지금 쓰는 챗 컴플리션 소스 · 모델
const MODEL_KEY = { makersuite: 'google_model', vertexai: 'vertexai_model', openai: 'openai_model', claude: 'claude_model', openrouter: 'openrouter_model' };
export function currentApi() {
    const c = ctx(), cs = c.chatCompletionSettings ?? {};
    const src = cs.chat_completion_source ?? '';
    const model = c.getChatCompletionModel?.() || cs[MODEL_KEY[src] ?? `${src}_model`] || '';
    return { main: c.mainApi ?? '', src, model };
}
// 프로필 · 지금 연결 이름 (화면 · 보고용)
export function routeText() {
    const r = clsRoute(), s = settings();
    const vx = (src) => (/vertex/i.test(src ?? '') ? ` · 인증 ${vertexKeys().vertexai_auth_mode ?? '기본'}` : '');
    if (r === 'current') { const a = currentApi(); return `지금 API (${a.src || a.main || '?'}) · 모델 ${s.clsModel || a.model || '?'}${vx(a.src)}`; }
    if (r === 'profile') { const p = (ctx().extensionSettings?.connectionManager?.profiles ?? []).find(x => x.id === s.clsProfile); return `프로필 ${p?.name ?? s.clsProfile}${p ? ` (${p.api ?? '?'} · ${p.model ?? '?'})` : ''}${vx(p?.api)}`; }
    return '없음';
}

// 서버가 돌려준 진짜 오류 (실리태번은 「API request failed」로 감싸고 진짜는 cause에 둠)
export function errText(e) {
    const out = [];
    let x = e;
    for (let d = 0; x != null && d < 5; d++) {
        if (typeof x !== 'object') { out.push(String(x)); break; }
        const er = x.error && typeof x.error === 'object' ? x.error : null;
        const st = x.status ?? er?.code ?? x.code ?? '';
        const msg = er?.message ?? (typeof x.error === 'string' ? x.error : '') ?? '';
        const parts = [st, msg || x.message || x.statusText || ''].map(String).filter(Boolean);
        if (!parts.length) { try { parts.push(JSON.stringify(x).slice(0, 400)); } catch { parts.push(String(x)); } }
        if (er?.status && er.status !== st) parts.push(er.status);
        if (Array.isArray(er?.details)) { try { parts.push(JSON.stringify(er.details).slice(0, 300)); } catch { /* 없음 */ } }
        out.push(parts.join(' '));
        x = x.cause;
    }
    return short([...new Set(out.filter(Boolean))].join(' ← '), 900) || '알 수 없는 오류';
}

// 지금 쓰는 API로 바로 (프로필 없이): 연결 칸만 복사 · 나머지는 깨끗한 프리셋
const CONN_KEYS = ['custom_url', 'reverse_proxy', 'proxy_password', 'vertexai_auth_mode', 'vertexai_region', 'vertexai_express_project_id', 'azure_base_url', 'azure_deployment_name', 'azure_api_version', 'zai_endpoint'];
// Vertex 인증 칸 (서비스 계정이면 full · 비면 실리태번 기본값)
const VERTEX = ['vertexai_auth_mode', 'vertexai_region', 'vertexai_express_project_id'];
export function vertexKeys() {
    const cs = ctx().chatCompletionSettings ?? {};
    return Object.fromEntries(VERTEX.filter(k => cs[k] != null && cs[k] !== '').map(k => [k, cs[k]]));
}
async function viaCurrent(messages, P) {
    const c = ctx(), a = currentApi(), svc = c.ChatCompletionService;
    if (a.main && a.main !== 'openai') throw new Error(`지금 API(${a.main})는 챗 컴플리션이 아니에요 → 「분류 모델 연결」에서 연결 프로필을 골라 주세요`);
    if (!svc) throw new Error('이 실리태번엔 ChatCompletionService가 없어요 → 실리태번을 새로 받거나 연결 프로필을 골라 주세요');
    const cs = c.chatCompletionSettings ?? {}, model = settings().clsModel || a.model;
    if (!a.src || !model) throw new Error('지금 API · 모델을 못 읽었어요 → 모델 이름을 적거나 연결 프로필을 골라 주세요');
    const body = { messages, model, chat_completion_source: a.src, ...Object.fromEntries(CONN_KEYS.filter(k => cs[k] != null && cs[k] !== '').map(k => [k, cs[k]])), ...P };
    delete body.name; delete body.top_p;
    // sendRequest = 만든 몸통을 그대로 서버로 (processRequest는 몇몇 연결 칸을 버릴 수 있음 → Vertex 인증 방식이 빠져 Express로 처리됨)
    return svc.sendRequest ? svc.sendRequest(body, true) : svc.processRequest(body, {}, true);
}
// 연결 프로필로: API · 모델 · 인증만 (includePreset: false → 프로필에 묶인 프리셋은 안 씀) · 값은 깨끗한 프리셋으로 덮음
async function viaProfile(messages, P) {
    const svc = ctx().ConnectionManagerRequestService;
    if (!svc) throw new Error('이 실리태번엔 연결 관리자(Connection Manager)가 없어요');
    const { max_tokens, stream, name, ...over } = P; // eslint-disable-line no-unused-vars
    // 프로필은 Vertex 인증 방식 · 리전 · 프로젝트를 안 담음 → 지금 연결 설정에서 채워 넣음 (안 넣으면 서버가 Express(API 키)로 봄)
    const prof = (ctx().extensionSettings?.connectionManager?.profiles ?? []).find(x => x.id === settings().clsProfile);
    if (/vertex/i.test(prof?.api ?? '')) Object.assign(over, vertexKeys());
    return svc.sendRequest(settings().clsProfile, messages, max_tokens, { stream, extractData: true, includePreset: false, includeInstruct: false }, over);
}

// 마지막 요청 기록 (전체 복사 · 시험 버튼)
export const connStats = { lastError: null, lastMs: 0, lastRoute: '', thinkOff: false, bigMax: false };
export const resetThink = () => { connStats.thinkOff = false; connStats.bigMax = false; connStats.cap = 0; }; // 연결을 바꾸면 생각 설정 다시 보내 봄
// 분류 지시 + 글 하나 보내기 → 답 글
export async function sendClean(system, user) {
    const route = clsRoute();
    if (!route) throw new Error('분류 연결 없음');
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const t0 = performance.now();
    // 📏 사용자가 정한 답 길이가 있으면 그 값 그대로 (줄이거나 늘리지 않음)
    const fixed = Number(settings().clsMax) > 0 ? Number(settings().clsMax) : 0;
    let P = { ...CLS_PRESET, ...(fixed ? { max_tokens: fixed } : connStats.cap ? { max_tokens: connStats.cap } : {}) };
    if (connStats.thinkOff) for (const k of NO_THINK) delete P[k];
    const go = () => (route === 'current' ? viaCurrent(messages, P) : viaProfile(messages, P));
    try {
        let r;
        try { r = await go(); } catch (e) {
            // 서버가 빈 답을 오류로 돌려준 경우(「Candidate text empty」 · MAX_TOKENS) → 답 길이를 늘려 한 번 더
            if (fixed && TOO_BIG.test(errText(e))) throw new Error(`이 모델은 답 길이 ${fixed}토큰을 못 받아요 · 설정 › AI › 「분류 답 길이」를 줄여 주세요`);
            if (fixed && EMPTY_ERR.test(errText(e))) throw new Error(`빈 답 · 답 길이 ${fixed}토큰을 생각이 다 쓴 듯해요 · 설정 › AI › 「분류 답 길이」를 늘려 주세요`);
            if (TOO_BIG.test(errText(e)) && !(connStats.cap && connStats.cap <= CAPS.at(-1))) { // 🔓 이 모델은 그렇게 긴 답을 못 받음 → 줄여서 다시
                let ok = false;
                for (const cap of CAPS) { if (connStats.cap && cap >= connStats.cap) continue; P = { ...P, max_tokens: cap }; try { r = await go(); connStats.cap = cap; ok = true; break; } catch (e2) { if (!TOO_BIG.test(errText(e2))) throw e2; } }
                if (!ok) throw e;
            }
            else if (!connStats.bigMax && EMPTY_ERR.test(errText(e))) { P = { ...P, max_tokens: connStats.cap || BIG_MAX }; r = await go(); connStats.bigMax = true; }
            else {
            if (connStats.thinkOff || !THINK_ERR.test(errText(e))) throw e;
            // 이 모델은 생각 설정을 못 받는 듯 → 빼고 한 번 더 (되면 다음부터 계속 뺌 · 안 되면 처음 오류를 그대로)
            P = { ...P }; for (const k of NO_THINK) delete P[k];
            try { r = await go(); } catch { throw e; }
            connStats.thinkOff = true;
            }
        }
        let text = String(r?.content ?? (typeof r === 'string' ? r : '') ?? '');
        // 🧠 생각을 끄지 못하는 모델(생각이 답 길이를 다 씀 → 빈 답): 답 길이를 늘려 한 번 더 · 되면 다음부터 늘린 채로
        if (!text.trim() && !connStats.bigMax && !fixed) { P = { ...P, max_tokens: connStats.cap || BIG_MAX }; r = await go(); text = String(r?.content ?? (typeof r === 'string' ? r : '') ?? ''); if (text.trim()) connStats.bigMax = true; }
        connStats.lastMs = Math.round(performance.now() - t0); connStats.lastRoute = routeText();
        if (!text.trim()) throw new Error(`빈 답 (생각이 답 길이 ${P.max_tokens}토큰을 다 썼거나 안전 필터에 막혔을 수 있어요)${r?.reasoning ? ` · 생각 글 ${String(r.reasoning).length}자` : ''}`);
        connStats.lastError = null;
        return text;
    } catch (e) {
        const text = errText(e), ms = Math.round(performance.now() - t0);
        connStats.lastError = { at: new Date().toISOString(), route: routeText(), ms, text };
        connStats.lastMs = ms; connStats.lastRoute = routeText();
        console.info(`[${TITLE}] 분류 요청 실패 · ${routeText()} · ${ms}ms · ${text}`);
        const err = new Error(text); err.cause = e; throw err;
    }
}
