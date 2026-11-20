// 실리태번과 닿는 곳 하나: 설정 · 채팅 메타 · 메시지마다 적는 칸
import { clone, hash } from './util.js';
import { normBook } from '../rules/book.js';

export const MODULE = 'meatlite';
export const OLD = 'statussim';
export const VERSION = '0.43.1';
export const DATA_V = 2;
export const TITLE = '미트볼폰';
export const INJ = { facts: 'meatlite_facts', hint: 'meatlite_hint', rule: 'meatlite_rule' };

export const ctx = () => SillyTavern.getContext();
// 위 파일의 함수를 아래 파일에서 부를 때 거는 곳 (refresh · openSheet · toast)
export const app = {};

// ───── 전체 설정 (남긴 것만 · 표는 README) ─────
export const DEFAULTS = Object.freeze({
    enabled: true,
    hud: true,
    hudPos: 'top',          // top | bottom
    minibar: true,
    mascot: true,
    mascotSound: 'meow',     // meow | off
    mascotVolume: 60,
    mascotPick: 'idle',
    conPack: false,          // 🐱 미트볼콘 팩 60개를 받았나 (마켓)      // 평소 모습: 표정 7개 · con:미트볼콘 14개
    look: { accent: '#e07a5f', font: '', size: 1, radius: 14, border: 1, shadow: 1, dark: 'auto', wall: 'cream', wallImg: '', wallDim: 0, icons: 'color', side: 'left' }, // side: 노트북에서 폰 창 자리 (left · right) · 휴대폰은 늘 꽉 참
    home: null, // 홈 위젯 순서 · 숨기기 · 앱 순서 · 독 (home.js homeCfg)
    influence: { all: 2, by: {} },  // 이야기 영향력 게이지 (전체 기본값 · 채팅마다 덮어쓸 수 있음)
    preset: 'flash',        // 본편 지시 프리셋: flash | general
    mode: 'B',              // 사건 고르기: A 본편 태그 · B 분류 모델(가벼운 모델이 답마다 목록에서 고름)
    clsProfile: '',         // 분류 모델 연결: 프로필 id · '@current'(지금 쓰는 API에서 모델만) · 비우면 B는 A로
    clsModel: '',           // '@current'일 때 모델 이름 (비우면 지금 모델)
    skipQuiet: true,        // 퀵리플라이 · /gen 답엔 상태창 안 붙임
    ooc: true,
    oocPattern: '^\\s*(\\(\\(|\\[?\\(?\\s*ooc\\b|//)',
    injectDepth: 1,
    profile: '',            // 상태창 만들기 · 번역에 쓸 연결 프로필 (비우면 지금 연결)
    saveLang: 'ko',         // 상태창 저장 언어: ko | en (en이면 화면 번역)
    trEngine: 'st',          // 번역 담당: st = 실리 기본 번역(무료 · 빠름 · 늘 저절로) | ai = AI(분류 연결 · 토큰)
    trAuto: 'ai',            // 영어 저장일 때 모르는 말: ai(모아서 1회) | off(직접만)
    musicApp: 'youtube',
    musicTaste: '',         // 음악 취향 기본값 (채팅마다 덮어쓰기 가능)
    musicPop: 'on',         // 곡이 바뀌면 작은 알림
    musicPlay: 'phone',     // ▶ 누르면: phone(폰 안 작은 창 · 유튜브 키가 있을 때만) | tab(새 탭)
    ytKey: '',              // 유튜브 API 키 (선택 · 있으면 ▶ 1번에 검색 1회로 영상 id)
    musicPos: null,         // 🎵 작은 창 자리 { d: 노트북 {x,y}, m: 휴대폰 {x,y} }
    pinBook: 'auto',        // 설정집 한두 줄을 본편에 붙일지: auto | off
});
const SETTING_EXTRA = new Set(['glossary', 'trRules', 'partsOff', 'tidied']);
export function settings() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = clone(DEFAULTS);
    const s = es[MODULE];
    for (const k of Object.keys(DEFAULTS)) if (!Object.hasOwn(s, k)) s[k] = clone(DEFAULTS[k]);
    for (const k of Object.keys(DEFAULTS.look)) if (!Object.hasOwn(s.look, k)) s.look[k] = DEFAULTS.look[k];
    if (typeof s.mascotSound === 'boolean') s.mascotSound = s.mascotSound ? 'meow' : 'off';
    // 한 번 정리: 지금 쓰지 않는 옛 설정 키는 지운다
    if ((s.tidied ?? 0) < 2) { for (const k of Object.keys(s)) if (!Object.hasOwn(DEFAULTS, k) && !SETTING_EXTRA.has(k)) delete s[k]; s.tidied = 2; }
    return s;
}

// ───── 칸 (켜고 끄는 단위) ─────
export const MODS = [
    { id: 'stats', icon: '❤️', name: '수치' },
    { id: 'wallet', icon: '👜', name: '소지품' },
    { id: 'rel', icon: '💞', name: '관계' },
    { id: 'map', icon: '🗺️', name: '지도' },
    { id: 'calendar', icon: '📅', name: '달력' },
    { id: 'dice', icon: '🎲', name: '주사위' },
    { id: 'news', icon: '📰', name: '세계 소식' },
    { id: 'record', icon: '📒', name: '기록' },
    { id: 'music', icon: '🎵', name: '추천 음악' },
    { id: 'quote', icon: '📜', name: '한 구절' },
    { id: 'mind', icon: '💭', name: '속마음' },
    { id: 'custom', icon: '🧩', name: '내 탭' },
];
export const MOD_IDS = MODS.map(m => m.id);

// ───── 채팅 메타 ─────
export function newMeta() {
    return {
        app: 'lite3', v: DATA_V, book: null, start: null,
        mods: Object.fromEntries(MOD_IDS.map(id => [id, id !== 'mind'])),
        paused: false, skipNext: false, influence: null, marks: [], hideNums: false, custom: [], recent: {}, mindWho: ['cast'],
    };
}
// 한 번 정리: v0.26 · v0.30에서 지운 기능이 채팅에 남긴 데이터 (설정집은 지금 모양으로 다시 맞춤 · 특성은 v0.30에서 지움)
function tidyMeta(m) {
    delete m.saves; delete m.autoSave; delete m.mapStyle;
    const F = m.start?.full;
    if (F && typeof F === 'object') {
        // 불러온 상태로 이어지던 채팅: 그 상태를 보통 시작값으로 바꿔 둔다
        const rel = Object.fromEntries(Object.entries(F.rel ?? {}).map(([k, r]) => [k, { aff: r?.aff, trust: r?.trust }]));
        m.start = { name: m.start.name ?? '', cash: F.cash, items: F.items, loc: F.loc, needs: F.needs, gauges: F.gauges, rel, attrs: F.attrs, weather: F.weather, status: F.status, pairs: F.pairs };
    }
    if (m.book?.world) m.book = normBook(m.book);
    if (m.mods) delete m.mods.traits;
    m.tidied = 3;
}
export function getMeta(create = false) {
    const md = ctx().chatMetadata;
    if (!md) return null;
    if (!md[MODULE] && create) md[MODULE] = newMeta();
    let m = md[MODULE];
    // 예전 미트볼 라이트(v0.2.x)가 같은 열쇠에 남긴 기록은 모양이 달라서 새로 시작한다 (설정집 · 칸 목록이 없음)
    if (m && m.app !== 'lite3') { const keep = { book: m.book ?? null, start: m.start ?? null }; md[MODULE] = m = Object.assign(newMeta(), m.book?.world ? keep : {}); }
    if (m) {
        const d = newMeta(); for (const k of Object.keys(d)) if (!Object.hasOwn(m, k)) m[k] = d[k];
        // 새로 생긴 칸은 켠 채로 (목록에 없으면 꺼진 게 아니라 아직 몰랐던 것)
        for (const id of MOD_IDS) if (typeof m.mods[id] !== 'boolean') m.mods[id] = d.mods[id];
        if ((m.tidied ?? 0) < 3) tidyMeta(m); // 3: 잘린 얼굴 이모지(「🙇…」) 고치기
    }
    return m ?? null;
}
export let metaRev = 0;
export const saveMeta = () => { metaRev++; saveChatSoon(); };

// ───── 💾 채팅 저장은 여기 한 곳에서만 ─────
//   · 답을 받는 중(스트리밍)에는 절대 저장하지 않음 → 끝나면(GENERATION_ENDED · STOPPED · MESSAGE_RECEIVED) 1초 뒤 한 번
//   · 실리태번 함수는 saveChatDebounced 하나만 (saveChat · saveMetadata를 직접 안 부름 · 채팅 저장에 메타데이터도 같이 감)
//   · 여러 번 불러도 1초 안의 요청은 한 번으로 합침 (윈도우에서 .jsonl 이름 바꾸기가 겹치면 EPERM)
export const AFTER_GEN_MS = 1000;
const SAFETY_MS = 10 * 60 * 1000; // 끝 신호를 못 받았을 때 10분 뒤엔 풀어 줌
export const saveState = { generating: false, want: false, timer: null, safety: null, calls: 0, during: 0 };
function flushLater(ms) {
    clearTimeout(saveState.timer);
    saveState.timer = setTimeout(() => {
        saveState.timer = null;
        if (!saveState.want) return;
        if (saveState.generating) return; // 끝나면 다시 잡힘
        saveState.want = false; saveState.calls++;
        ctx().saveChatDebounced?.();
    }, ms);
}
export function saveChatSoon() {
    saveState.want = true;
    if (!saveState.generating) flushLater(AFTER_GEN_MS);
}
export function genStarted(type, opts, dry) {
    if (dry || type === 'quiet') return; // 미리 재기 · 조용한 생성은 채팅에 답을 흘려 넣지 않음
    saveState.generating = true; clearTimeout(saveState.timer); saveState.timer = null;
    clearTimeout(saveState.safety); saveState.safety = setTimeout(genEnded, SAFETY_MS);
}
export function genEnded() {
    if (!saveState.generating) { if (saveState.want) flushLater(AFTER_GEN_MS); return; }
    saveState.generating = false; clearTimeout(saveState.safety);
    if (saveState.want) flushLater(AFTER_GEN_MS); // 실리태번 자체 저장이 끝난 뒤 한 번
}
export const isGenerating = () => saveState.generating;
export const bumpMeta = () => { metaRev++; };
export const saveSettings = () => { metaRev++; ctx().saveSettingsDebounced(); };
export const modOn = (id, meta = getMeta()) => !!meta?.mods?.[id];
// 😌 눈 감기: 깔린 앱마다 「다음 답 1번」(once) · 「계속」(on) — 그 답엔 그 앱의 사건을 만들지도(본편 · 분류 지시) 받지도 않는다.
//   once는 「몇 번째 AI 답」에 묶여서, 그 답을 리롤해도 감긴 채 · 다음 답부터는 저절로 뜬다.
export const KEY_MOD = {
    loc: 'map', with: 'map', time: 'calendar', weather: 'calendar', date: 'calendar', promise: 'calendar', anniv: 'calendar', noted: 'calendar',
    ate: 'stats', slept: 'stats', washed: 'stats', rest: 'stats', status: 'stats', need: 'stats',
    worked: 'wallet', buy: 'wallet', sell: 'wallet', earn: 'wallet', cash: 'wallet', got: 'wallet', item: 'wallet', used: 'wallet', lost: 'wallet', wear: 'wallet', unwear: 'wallet',
    act: 'rel', gift: 'rel', memory: 'rel', jealous: 'rel', pair: 'rel', npc: 'rel', gone: 'rel', aff: 'rel', trust: 'rel', meddle: 'rel', taste: 'rel',
    roll: 'dice', bgm: 'music', quote: 'quote', mind: 'mind', watch: 'mind', cell: 'mind', life: 'news', newsline: 'news', feed: 'news', custom: 'custom',
};
export function aiNoOf(i) { const c = ctx().chat ?? []; let n = 0; for (let k = 0; k <= i && k < c.length; k++) if (!c[k].is_user && !c[k].is_system) n++; return n; }
export const nextAiNo = () => aiNoOf((ctx().chat?.length ?? 0) - 1) + 1;
export function shut(mod, aiNo = nextAiNo()) {
    const e = getMeta()?.eyes?.[mod]; if (!e || !mod) return false;
    // 「다음 1번」: 다음 답 · 그리고 새 답이 오기 전이면 지금 마지막 답을 다시 만들거나(스와이프) 다시 분류할 때도
    return e.mode === 'on' || (e.mode === 'once' && (aiNo === e.at || (aiNo === e.at - 1 && nextAiNo() === e.at)));
}
export const shutKey = (key, aiNo) => { const mod = KEY_MOD[String(key ?? '').trim().toLowerCase()]; return (!!mod && !modOn(mod)) || shut(mod, aiNo); }; // 🗑 지운 앱의 키도 버림
export function setEyes(mod, mode) {
    const m = getMeta(); if (!m) return;
    m.eyes ??= {};
    if (!mode) delete m.eyes[mod]; else m.eyes[mod] = mode === 'once' ? { mode, at: nextAiNo() } : { mode };
    saveMeta();
}
// 지난 「다음 1번」은 정리
export function tidyEyes() { const m = getMeta(); if (!m?.eyes) return; const n = nextAiNo(); for (const [k, e] of Object.entries(m.eyes)) if (e.mode === 'once' && e.at < n - 1) delete m.eyes[k]; }
export const ready = (meta = getMeta()) => !!meta?.book;

// ───── 메시지마다 적는 칸: extra.meatlite.sw[스와이프 번호] = { ops, hand, undo, fill } ─────
// 원본은 메시지에 있다 → 스와이프 · 지우기 · 브랜치가 저절로 맞는다
export function msgData(m, create = false) {
    if (!m) return null;
    const sid = m.swipe_id ?? 0;
    if (create) { m.extra ??= {}; m.extra[MODULE] ??= {}; m.extra[MODULE].sw ??= {}; m.extra[MODULE].sw[sid] ??= {}; }
    return m.extra?.[MODULE]?.sw?.[sid] ?? null;
}
// 실리는 스와이프를 옮길 때 지금 extra를 스와이프 칸에 다시 적지 않는다 → 직접 맞춰 둔다
export function syncSwipe(m) {
    const sid = m?.swipe_id;
    if (typeof sid !== 'number' || !Array.isArray(m.swipe_info) || !m.swipe_info[sid] || typeof m.swipe_info[sid] !== 'object') return;
    m.swipe_info[sid].extra = clone(m.extra);
}
// 메시지 열쇠 (책갈피 · 이동용) — 보낸 시각 + 이름
export const msgKey = (m) => (m ? hash(`${m.send_date ?? ''}|${m.name ?? ''}|${m.is_user ? 1 : 0}`) : '');
export const userName = () => ctx().name1 || '나';
