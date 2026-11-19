// 실리태번과 닿는 곳 하나: 설정 · 채팅 메타 · 메시지마다 적는 칸
import { clone, hash } from './util.js';
import { normBook } from '../rules/book.js';

export const MODULE = 'meatlite';
export const OLD = 'statussim';
export const VERSION = '0.29.1';
export const DATA_V = 2;
export const TITLE = '미트볼 라이트';
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
    look: { accent: '#e07a5f', font: '', size: 1, radius: 14, border: 1, shadow: 1, dark: 'auto' },
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
    trAuto: 'ai',            // 영어 저장일 때 모르는 말: ai(모아서 1회) | off(직접만)
    musicApp: 'youtube',
    musicTaste: '',         // 음악 취향 기본값 (채팅마다 덮어쓰기 가능)
    musicPop: 'on',         // 곡이 바뀌면 작은 알림
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
    { id: 'traits', icon: '🧬', name: '특성' },
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
// 한 번 정리: v0.26에서 지운 기능이 채팅에 남긴 데이터 (설정집은 지금 모양으로 다시 맞춤 · 지운 특성은 가장 가까운 것으로)
function tidyMeta(m) {
    delete m.saves; delete m.autoSave; delete m.mapStyle;
    const F = m.start?.full;
    if (F && typeof F === 'object') {
        // 불러온 상태로 이어지던 채팅: 그 상태를 보통 시작값으로 바꿔 둔다
        const rel = Object.fromEntries(Object.entries(F.rel ?? {}).map(([k, r]) => [k, { aff: r?.aff, trust: r?.trust }]));
        m.start = { name: m.start.name ?? '', cash: F.cash, items: F.items, loc: F.loc, needs: F.needs, gauges: F.gauges, rel, attrs: F.attrs, weather: F.weather, status: F.status, pairs: F.pairs };
    }
    if (m.book?.world) m.book = normBook(m.book);
    m.tidied = 1;
}
export function getMeta(create = false) {
    const md = ctx().chatMetadata;
    if (!md) return null;
    if (!md[MODULE] && create) md[MODULE] = newMeta();
    let m = md[MODULE];
    // 예전 라이트(v0.2.x)가 같은 열쇠에 남긴 기록은 모양이 달라서 새로 시작한다 (설정집 · 칸 목록이 없음)
    if (m && m.app !== 'lite3') { const keep = { book: m.book ?? null, start: m.start ?? null }; md[MODULE] = m = Object.assign(newMeta(), m.book?.world ? keep : {}); }
    if (m) {
        const d = newMeta(); for (const k of Object.keys(d)) if (!Object.hasOwn(m, k)) m[k] = d[k];
        // 새로 생긴 칸은 켠 채로 (목록에 없으면 꺼진 게 아니라 아직 몰랐던 것)
        for (const id of MOD_IDS) if (typeof m.mods[id] !== 'boolean') m.mods[id] = d.mods[id];
        if (!m.tidied) tidyMeta(m);
    }
    return m ?? null;
}
export let metaRev = 0;
export const saveMeta = () => { metaRev++; return ctx().saveMetadataDebounced?.() ?? ctx().saveMetadata?.(); };
export const bumpMeta = () => { metaRev++; };
export const saveSettings = () => { metaRev++; ctx().saveSettingsDebounced(); };
export const modOn = (id, meta = getMeta()) => !!meta?.mods?.[id];
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
