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
    max_tokens: 1000,
    stream: false,
    reasoning_effort: 'min', // 제미니 · 오픈AI · 클로드: 생각은 최소 (가능하면 끔)
    include_reasoning: false, // 생각 글은 돌려받지 않음
});
// 생각 설정을 못 받는 모델이면 이것만 빼고 한 번 더
const NO_THINK = ['reasoning_effort', 'include_reasoning'];
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
export const connStats = { lastError: null, lastMs: 0, lastRoute: '', thinkOff: false };
export const resetThink = () => { connStats.thinkOff = false; }; // 연결을 바꾸면 생각 설정 다시 보내 봄
// 분류 지시 + 글 하나 보내기 → 답 글
export async function sendClean(system, user) {
    const route = clsRoute();
    if (!route) throw new Error('분류 연결 없음');
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const t0 = performance.now();
    let P = { ...CLS_PRESET };
    if (connStats.thinkOff) for (const k of NO_THINK) delete P[k];
    const go = () => (route === 'current' ? viaCurrent(messages, P) : viaProfile(messages, P));
    try {
        let r;
        try { r = await go(); } catch (e) {
            if (connStats.thinkOff || !THINK_ERR.test(errText(e))) throw e;
            // 이 모델은 생각 설정을 못 받는 듯 → 빼고 한 번 더 (되면 다음부터 계속 뺌 · 안 되면 처음 오류를 그대로)
            P = { ...P }; for (const k of NO_THINK) delete P[k];
            try { r = await go(); } catch { throw e; }
            connStats.thinkOff = true;
        }
        const text = String(r?.content ?? (typeof r === 'string' ? r : '') ?? '');
        connStats.lastMs = Math.round(performance.now() - t0); connStats.lastRoute = routeText();
        if (!text.trim()) throw new Error(`빈 답 (생각이 답 길이 ${CLS_PRESET.max_tokens}토큰을 다 썼거나 안전 필터에 막혔을 수 있어요)${r?.reasoning ? ` · 생각 글 ${String(r.reasoning).length}자` : ''}`);
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
