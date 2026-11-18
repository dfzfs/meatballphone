// 미트볼 상태창 (Meatball Stats) — 공통: 상수 · 유틸 · 설정 · 데이터 모양
import { toEnglish, usedPairs } from './skeleton_en.js'; // 영어 저장일 때 기본 관계 단계도 영어로 (skeleton_en은 아무것도 안 불러서 순환 없음)
import { clamp, clone, num, str, arr, norm, fmtNum, uid, short, DEFAULT_MONTHS, DEFAULT_WEEK, DEFAULT_TIMES, dayIndex, parseClock } from './util.js';
export { clamp, clone, esc, num, str, arr, norm, fmtNum, signed, uid, short, splitBar, rand, randInt, parseNum, DEFAULT_MONTHS, DEFAULT_WEEK, DEFAULT_TIMES, yearDays, dayIndex, addDays, weekday, dateStr, dateShort, eventsOn, parseDate, nextTime, nextTimeWraps, CLOCK_STYLES, parseClock, slotHour, slotOfClock, fmtClock, toClockStyle, timeWords, upcoming, stamp } from './util.js'; // 순수 도구는 util.js로 — 다른 파일은 예전처럼 core.js에서 받아도 된다
export const MODULE = 'statussim';
export const LOG = '[미트볼 상태창]';
export const TITLE = '미트볼 상태창';
export const VERSION = '2.10.0';
export const INJECT_KEY = 'statussim_state';
export const INJECT_KEY2 = 'statussim_people';
export const INJECT_KEY3 = 'statussim_romance'; // 로맨스 보정 · 내 주입문 (v2.6)
export const INJECT_KEY4 = 'statussim_story'; // 🧭 이야기 장치 (v2.8) — 켠 장치의 안내 줄 (하나도 안 켜면 빈 글)
export const PROMPT_IN_CHAT = 1;
export const ROLE_SYSTEM = 0;

// 마스코트 그림 (확장 폴더의 img/) — idle · happy · think · surprise · sad · sleep · party
export const MASCOTS = ['idle', 'happy', 'think', 'surprise', 'sad', 'sleep', 'party'];
export const mascotUrl = (n) => new URL(`../img/mascot_${MASCOTS.includes(n) ? n : 'idle'}.webp`, import.meta.url).href;
// 모듈끼리 서로 부르는 함수·현재 상태를 담는 곳 (순환 import 방지)
// ── app에 거는 것 전부 (새로 걸면 여기에도 적는다 · 거는 파일이 아직 안 불렸을 수 있으니 부를 땐 app.x?.() 로) ──
//   addTrPairs       거는 곳: translate.js           부르는 곳: core.js, skeleton.js
//   storyInject · storyPeek · storyChanged  거는 곳: story.js   부르는 곳: engine.js(setInjection), extra.js, settings_ui.js
//   loadAddons  거는 곳: index.js   부르는 곳: 설정 창에서 아래 기능을 켤 때 app.loadAddons(true) (켠 것도 · 자료도 없으면 addons.js · minihome.js는 아예 안 불러온다)
//   extraInject · gearBonus · ambient · giftAff · contactLore · mergeContactAsk  거는 곳: addons.js   부르는 곳: engine.js(setInjection), dice.js, contact.js, ai.js, extra.js, commands.js
//   gbTexts · gbNudge · ilchon  거는 곳: minihome.js   부르는 곳: addons.js(선물 · 약속), relgraph.js   부르는 곳: (아직 없음 — 방명록 화면을 붙일 때 translate.js에서)
//   askBond          거는 곳: index.js               부르는 곳: (같은 파일)
//   chipOutWas       거는 곳: index.js               부르는 곳: (같은 파일)
//   colMenu          거는 곳: views.js               부르는 곳: (같은 파일)
//   confirmPopup     거는 곳: shell.js               부르는 곳: safe.js
//   copyDump         거는 곳: report.js              부르는 곳: index.js, shell.js, views.js
//   current          거는 곳: index.js               부르는 곳: ai.js, contact.js, engine.js, extra.js, feeds.js, help.js, kit.js, money.js, notify.js, parts.js, pip.js, report.js, safe.js, shell.js, tips.js, translate.js, views.js
//   decorate         거는 곳: index.js               부르는 곳: ai.js, extra.js, pip.js, translate.js
//   enableTip        거는 곳: tips.js                부르는 곳: notify.js
//   ensureUI         거는 곳: shell.js               부르는 곳: (같은 파일)
//   generatingAt     거는 곳: index.js               부르는 곳: (같은 파일)
//   hudExp           거는 곳: shell.js, views.js     부르는 곳: (같은 파일)
//   installRegex     거는 곳: index.js               부르는 곳: safe.js
//   knowHint         거는 곳: tips.js                부르는 곳: notify.js
//   lastGenSkipped   거는 곳: index.js               부르는 곳: (같은 파일)
//   lastSkipReason   거는 곳: index.js               부르는 곳: (같은 파일)
//   measureLoad      거는 곳: index.js               부르는 곳: shell.js
//   neverTip         거는 곳: tips.js                부르는 곳: notify.js
//   notify           거는 곳: notify.js              부르는 곳: contact.js, engine.js, tips.js
//   notifyLatest     거는 곳: index.js               부르는 곳: ai.js
//   openHelp         거는 곳: help.js                부르는 곳: index.js, shell.js
//   openInbox        거는 곳: notify.js              부르는 곳: index.js, shell.js
//   openReport       거는 곳: report.js              부르는 곳: (같은 파일)
//   openSearch       거는 곳: extra.js               부르는 곳: index.js, shell.js
//   openSheet        거는 곳: shell.js               부르는 곳: extra.js, notify.js, tips.js
//   openTrFix        거는 곳: translate.js           부르는 곳: shell.js
//   pipDiag          거는 곳: pip.js                 부르는 곳: help.js
//   pipState         거는 곳: ai.js                  부르는 곳: pip.js
//   playTemp         거는 곳: shell.js               부르는 곳: core.js
//   popup            거는 곳: shell.js               부르는 곳: contact.js, extra.js, money.js, notify.js, translate.js
//   redecorate       거는 곳: index.js               부르는 곳: ai.js, pip.js, translate.js
//   refreshNow       거는 곳: index.js               부르는 곳: ai.js, engine.js, extra.js, pip.js, safe.js, shell.js, tips.js, translate.js, views.js
//   renderHud        거는 곳: shell.js               부르는 곳: notify.js, translate.js
//   renderPanel      거는 곳: shell.js               부르는 곳: contact.js, dice.js, extra.js, fate.js, feeds.js, money.js, parts.js, views.js
//   rerenderPanels   거는 곳: shell.js               부르는 곳: extra.js, notify.js, parts.js, safe.js, translate.js, views.js
//   sellPrice        거는 곳: views.js               부르는 곳: money.js
//   showWhatsNew     거는 곳: index.js               부르는 곳: notify.js
//   sideExp          거는 곳: shell.js, views.js     부르는 곳: (같은 파일)
//   stkMenu          거는 곳: views.js               부르는 곳: (같은 파일)
//   stkSel           거는 곳: views.js               부르는 곳: (같은 파일)
//   stopActionTips   거는 곳: tips.js                부르는 곳: notify.js
//   tileAdd          거는 곳: views.js               부르는 곳: (같은 파일)
//   tileEdit         거는 곳: views.js               부르는 곳: shell.js
//   tileSel          거는 곳: views.js               부르는 곳: (같은 파일)
//   togglePause      거는 곳: shell.js               부르는 곳: (같은 파일)
//   toggleStar       거는 곳: extra.js               부르는 곳: (같은 파일)
//   undoLast         거는 곳: index.js               부르는 곳: views.js
//   userName         거는 곳: shell.js               부르는 곳: contact.js
//   writeEnding      거는 곳: extra.js               부르는 곳: notify.js
export const app = { current: null };

export const DEFAULTS = Object.freeze({
    enabled: true,
    showHud: true,           // 채팅 위 상태 바
    showSide: true,          // 오른쪽 사이드 패널
    showFloat: false,        // 떠 있는 버튼
    hudPos: 'top',           // top | bottom
    hudOpen: true,           // HUD 게이지 줄 펼침
    sideState: 'mini',       // closed | mini | full
    sideMini: ['bars', 'date', 'loc', 'cash', 'contact', 'quest'],
    miniRel: { show: ['aff'], sort: 'aff', n: 3, pick: [] }, // 미니 관계 칸: 보일 수치 · 정렬 · 인원 · 고른 사람
    sideWidth: 400,
    floatPos: null,
    sync: 'tagPlus',         // tag | tagPlus | analyze | off (v2.7: 기본 = 가벼운 모델 맞춤)
    injectDepth: 1,
    injectMode: 'lite',      // lite (기본·추천) | ultra | full (비추천 · 토큰 많음)
    msgCard: 'compact',      // compact | off
    aiProfile: '',
    aiMaxTokens: 6000,
    recentForGen: 20,
    loreChars: 10000,
    autoRegex: true,
    contactInject: true,
    difficulty: 'normal',    // 새 채팅 기본 난이도
    skipQuiet: true,         // 퀵리플라이 /gen 같은 조용한 생성엔 주입 안 함
    oocDetect: true,         // 유저 메시지가 OOC면 그 턴은 주입 안 함
    oocPattern: '^\\s*(\\(\\(|\\[?\\(?\\s*ooc\\b|//|\\[ooc)',
    autoPing: false,         // 자동 선톡 (확장 AI 호출)
    autoPingEvery: 8,
    rushChance: 15,          // 상대가 웃돈 주고 급행으로 답장할 기본 확률 %
    theme: 'white',
    themeCustom: {},
    fontScale: 1,
    radius: 12,
    defaultMods: null,
    ssGenLang: 'ko',         // 상태창(확장 AI) 생성 언어: ko = 바로 한국어 | en = 영어로 생성 → 번역본 저장 | enview = 영어로 저장 · 화면만 번역 (v2.6)
    aiModelOnly: '',         // 🧠 연결 프로필 없이 모델 이름만 (메인 연결과 같은 회사 · 채팅 완성) — 프로필을 고르면 프로필이 먼저 (v2.9.1)
    trModelOnly: '',         //   └ 번역에만 쓸 모델 이름
    popX: true,              // ✨ 「닫기」뿐인 창은 오른쪽 위 ✕로 닫기 (아래 닫기 줄을 숨겨 폰에서 내용 자리를 넓힘 · v2.9.1)
    blurFx: true,            // ✨ 옆 서랍 · 알림의 뒤 흐림 (끄면 글이 또렷하고 폰에서 가벼워요)
    albumBtn: true,          // ✨ 답마다 「추억 앨범에 담기」 단추 (끄면 단추만 숨김 · 앨범 탭은 그대로)
    iconStyle: 'emoji',      // ✨ 화면의 그림 글자: emoji (그대로) | line (선 아이콘 · 화면만 — 저장 · AI 글은 그대로)
    uiFont: '',              // 🔤 미트볼 화면 글꼴 (v2.9.1): '' = 기본 · 'theme' = 실리 테마 글꼴 따라감 · 'dot' = 미트볼 도트 글꼴 · 그 밖 = 글꼴 이름 그대로
    trProfile: '',           // 번역 모델 (연결 프로필, '' = 확장 AI 모델 → 없으면 메인)
    trLang: '한국어',
    trEngine: 'st',          // 번역 담당: st = 실리 기본 번역 (Chat Translation의 Google·DeepL 등 · 무료 · v2.7.2부터 기본) | llm = 번역 모델 (지침 이해 · 토큰)
    trCode: 'ko',            // 실리 기본 번역에 넘길 언어 코드
    trRules: '',
    legacyStatus: false,     // 옛 <status>도 미트볼 것으로 읽기 (v2.5 이전 채팅 호환 · 정규식이 모든 채팅에 걸려서 새로 설치하면 꺼진 채로 · v2.7)
    injWorld: false,         // 세계관 요약·규칙을 매 턴 보낼지 (v2.7.1: 기본 끔 — 보통 카드·로어북에 이미 있어서 중복. 칸 만들 때 참고로는 계속 씀)
    injScan: true,           // 상태 주입문으로 월드인포(로어북) 키워드를 켤지 (끄면 장면 밖 항목이 덜 켜져 토큰 절약 · v2.7)
    autoBake: true,          // 긴 채팅: 오래된 기록을 자동으로 굳혀 계산을 가볍게 (v2.7)
    rewindKeep: 40,          // 편집 기록이 많아 정리할 때 늘 남겨 두는 최근 메시지 수 — 이 안에서는 지우기 · 다시 생성 · 스와이프로 되감김 (v2.7.21 · 예전엔 10 고정)
    bakeAfter: 250,          // 굳히지 않은 메시지가 이만큼 넘으면 (최근 120개는 늘 그대로)
    featureTips: true,       // 💡 이야기에 맞는 순간 안 쓰는 기능을 한 번씩 추천 (기능마다 한 번 · AI 0회 · v2.7)
    actionTips: true,        // 💡 칸에서 뭔가 할 때 「이것도 아세요?」 (v2.7.12 · 알림의 「팁 그만」으로 끔)
    tipGap: 40,              // 추천 사이 최소 턴 (v2.7.12 · 20 → 40) (관련 말 없이 권하는 건 이 두 배)
    tipNever: {},            // 「괜찮아요」 누른 기능 (모든 채팅에서 다시 안 권함)
    hintSeen: {},            // 💡 팁 · ⚠️ 주의: true = 「알아요」 · 숫자 = 보여 준 횟수 (2번이면 그만)
    genMode: 'hybrid',       // 만들기 방식: ai = 전부 AI | hybrid = 기본 틀 + 세계관 칸만 AI (기본·추천) | tpl = 기본 틀만 (AI 0회) (v2.7)
    trAuto: 'st',            // 화면만 번역: 새로 생긴 영어 글 자동 번역 — st = 실리 기본 번역일 때만 (무료) | always = 번역 모델이어도 (AI 호출) | off             // 번역 지침 — LLM: 그대로 전달 · 실리 기본 번역: 「원문 = 번역」 줄만 (이름 고정)
    prompts: {},             // 사용자 수정 프롬프트
    stashTags: true,         // <meatball>을 읽은 뒤 본문에서 떼어 메시지 숨은 칸에 보관 (다른 확장·요약에 안 보임)
    aiFallbackMain: false,   // 연결 프로필 실패·빈 응답 때 메인 연결로 다시 보냄 (기본 끔 = 실패하면 거기서 멈춤)
    profContact: '',         // 기능별 모델 (연결 프로필, '' = 확장 AI 모델)
    profGen: '',
    profFeeds: '',
    profAnalyze: '',
    hpSkinHud: false,        // 🪟 HUD · 미니창 · 보통 상태창도 미니홈피와 같은 색 · 얇은 테두리로 (화면만 · 기본 끔 — 업데이트했다고 늘 보던 화면이 바뀌지 않게. 꾸미기 › 더보기 › 그 밖에서 켬)
    hpLite: false,           // 🪶 미니홈피 가볍게: 옆 창을 그리지 않는다 (꾸미기 › 창)
    hpTheme: 0,              // 📒 미니홈피 포인트 색 (hompy.js THEMES의 번호 · 'c' = 직접 고른 색 hpHue · hpSat)
    // hpSkin: (없음 = 아직 안 고름 → 깔끔으로 보이고 「모양 고르기」 줄이 뜬다) · 'clean' · 'dot'
    hpDark: 'light',         // 📒 밝기: light · dark · auto(기기 따라)
    // 📒 올린 것(모든 채팅 공통 · 세트/코드에는 안 들어감): hpCover 머리 그림 · hpBgImg 바탕 그림(hpBgTile 바둑판) · hpFontFile 글꼴 파일 · hpMoodFaces 기분별 내 그림 · hpCss 내 CSS
    hpSets: [],              // 📒 저장한 꾸밈 세트 [{ name, data }] — 채팅에 묶으면 meta.hpSet = 이름
    hpWins: {},              // 📒 미니홈피에서 끈 창 ({ stats: false } …)
    hpFace: 'none',          // 📒 미니홈피 프로필 그림: none(비워 둠 · 눌러서 넣기) · auto(기분 따라 미트볼) · con:이름 · my:번호
    conPack: false,          // 🐱 콘팩 (v2.8): 미트볼콘 60개를 받아서 쓸지 — 기본은 꺼짐 (기본 14개만) · 프로필 그림 고르기에서 「콘팩 받기」
    hpFaces: [],             // 📒 내가 올린 프로필 그림 (최대 12장 · 긴 변 320px)
    startMode: '',           // 🍙 만들기 창에서 지난번에 고른 시작 방식 ('simple' | 'basic' · 빈 값 = 아직 안 골라 봄 → 처음이면 심플)
    themeAsked: false,       // 🎨 모양 고르기 창을 이미 보여 줬나 (처음 만들 때 · 2.8로 올라온 뒤 한 번 · src/themeask.js)
    hompyFull: false,        // 📒 전체화면으로 열면 미니홈피 모양으로 (v2.8 · 화면만 · 기본 끔 — 확장 설정 › 데이터 · 화면에서 켬)
    sheetFull: false,        // 상태창을 전체화면으로 열기
    genBatch: true,          // 상태창 만들기: 관련 칸끼리 묶어서 한 번에 생성 (17번 → 6번)
    genParallel: 4,
    genBatchSize: 'normal',  // 📦 묶음 크기: normal (2~4칸씩) · big (6칸까지) · one (세계관 뺀 나머지를 한 번에) — 출력 한도가 큰 모델용 (v2.9.1)          // 동시에 보낼 생성 요청 수
    sceneFilter: true,       // 최근 대화에 나온 인물만 자세히 주입, 나머지는 이름만
    sceneTurns: 6,           // 장면 판단에 볼 최근 메시지 수
    pinCap: 8,               // 주입할 고정 메모 최대 개수
    // 🧭 이야기 장치 (v2.8 · 전부 선택 · 기본 끔 — 끄면 AI에게 안 보내고 계산도 안 함 · story.js)
    loopMode: false,         // 🔁 회귀자 모드 — 다시 생성 · 지운 횟수 = 회차, 여러 번 되돌린 장면에서 기시감
    swipeGhost: false,       // 👻 버린 스와이프의 유령 — 가끔 꿈 · 환청으로 새어 나옴
    fateDebt: false,         // 🎲 운명의 빚 — 다시 생성 5번마다 작은 불운
    tensionOn: false,        // 🎬 긴장도 감독 — 평화가 길면 사건, 사건 뒤엔 쉬는 구간
    realGap: false,          // 🕰 현실 시간 연동 — 하루 넘게 안 오면 인물이 알아챔
    glitchView: false,       // 🌫 믿을 수 없는 상태창 — 정신력이 낮거나 취하면 화면이 깨져 보임 (화면만)
    ledgerKnow: false,       // 🧠 누가 뭘 아는지 장부
    ledgerPromise: false,    // 🤝 약속 장부
    guideOn: true,           // 🗝 공략 탭 (사람 묶음): 인물이 일러 주는 조언 · 비밀 게이지 · 눈치 — 누를 때만 AI 1회. 끄면 탭 · 눈치 · 비밀 주입이 모두 사라짐
    peekCost: false,         // 👁 엿보기엔 대가가 있다 (눈치)
    relScar: false,          // 🩹 관계의 흉터
    memoryDrift: false,      // 🕳 기억 왜곡 (AI 1회 + 주입)
    meddleOn: false,         // ✍ 인물이 내 상태창에 손댄다
    tasteBook: false,        // 🎁 취향 도감 (화면만)
    crossMail: false,        // 📻 채팅 간 우편 (누를 때 AI 1회)
    gearOn: false,           // ⚔ 장비 착용 (선택 · addons.js) — 착용한 물건의 효과가 주사위 보정에 더해지고 AI에게 한 줄 감
    ambientOn: false,        // 🌦 날씨 · 시간대 효과 (선택 · addons.js) — 지금은 AI에게 한 줄만 (계산은 그대로)
    ambientShop: false,      //   └ 밤에는 상점에서 사기 · 흥정 막기 (날씨/시간대 효과를 켰을 때만)
    giftTaste: false,        // 🎁 취향 ↔ 선물 (선택 · addons.js) — 좋아하는 선물 ×2 · 싫어하는 선물 −1
    promiseClock: false,     // 🤝 약속 기한 D-day (선택 · addons.js · 약속 장부를 켰을 때만) — 기한이 지나면 자동으로 어김
    trendMore: false,        // 📊 변화 그래프에 게이지 · 내 탭 수치 · 단계 변화/흉터 지점 더하기 (선택)
    mergeContact: false,     // 🔗 인물을 합칠 때 연락 대화도 옮길지 묻기 (선택 · addons.js)
    socialAff: false,        // 💗 연락 · 방명록에서 호감 반영 (선택 · addons.js) — 답장에 따라 호감 ±2까지 · 방명록을 남기면 우정 +1. 그 말풍선/글을 지우면 되돌아감
    hpWave: false,           // 🌊 파도타기 · 일촌평 (선택 · minihome_ui.js) — 미니홈피 일촌 창에서 이름을 누르면 그 사람의 홈피 (토큰 0)
    guestbook: false,        // 📝 방명록 (선택) — 인물이 홈피에 한 줄씩 남김. 「받기」를 누를 때 AI 1회. 끄면 저장 · 호출 · 이벤트 모두 0 (src/minihome.js)
    guestbookAuto: false,    //   └ 이야기 속 하루가 지날 때 자동으로 한 줄 (하루 1회까지 · AI 1회)
    groupChat: false,        // 👥 단체방 (v2.8 · 선택) — 연락에 인물 여럿이 있는 방. 끄면 단추도 안 보이고 아무 영향 없음
    contactAway: true,       // 🔕 상대가 알아서 연락을 꺼 둘 수 있게 (v2.7.23 · 화남 · 일 · 잠 — 그동안 보낸 말은 안 읽힘 · AI 0회)
    contactStayRemote: true, // 🚫 연락 속 인물이 「갈게 · 만나자」 하지 않기 (v2.7.23 · 만남은 본편에서)
    contactRecall: 'short',    // 🧠 연락 속 인물이 지난 대화를 얼마나 읽고 답할지 (v2.7.23): short (최근 14줄 · 편지 8통) · mid (약 6천 자) · long (약 2만 자) · all (보관된 것 전부)
    letterQuick: 's3',       // 💨 편지 퀵 속도 (v2.7.23): now (바로) · s1 · s2 · s3 (시간대 뒤) — 한 시간대 빨라질 때마다 기본 요금만큼 더
    bindContact: false, bindNews: false, bindGossip: false, bindBoard: false, bindSns: false, // 📦 부가 기능을 채팅에 붙일지 (v2.7.23 · 기본 = 따로 보관: 기록을 안 쌓고 · 되감기 안 됨 · 「방금 한 일」로 안 감)
    contactReflect: 'auto',  // 연락 → 본편 반영: off | auto | pinned | summary
    usage: [],               // 확장 AI 사용 기록
    // ── v2.5 ──
    toastMode: 'popup',      // 알림: popup (폰 알림처럼 떴다 사라짐) | toastr (실리 기본 알림) | off
    toastPos: 'top',         // top | bottom
    toastSec: 4,             // 팝업이 보이는 시간 (초)
    daySummary: true,        // 하루가 지나면 하루 정리 카드
    musicApp: 'youtube',     // 추천 곡 ▶ 누르면 열 곳: youtube | ytmusic | spotify | melon
    musicTaste: '',          // 좋아하는 음악 장르 (예: K-pop, 영화 OST)
    musicToast: true,        // 추천 곡이 바뀌면 팝업
    deltaMode: true,         // 변화 위주로 보내기 (N턴마다 전체)
    deltaEvery: 4,
    injEvery: {},            // 칸별 보내는 때: { news: 'kw', ... } — always(기본) | kw(관련 말이 나올 때만) | n3 | n5
    retryJSON: true,         // 확장 AI 답이 깨지면 고쳐 보고, 안 되면 1번 더
    jealousy: true,          // 질투 게이지
    stageLock: false,        // 관계 단계를 넘는 행동을 본편 AI에게 막기 (끄면 단계만 알려 줌)
    // ── v2.7.18: 관계 화면 하나하나 켜고 끄기 (다 끄면 이름 · 애정 · 우정 숫자만) ──
    relStagesOn: true,       // 관계 단계 기능 — 끄면 단계 이름 · 해금 · 다음 단계 · 단계 알림이 화면과 AI 글에서 모두 빠져요 (숫자만)
    relShowUnlock: true,     // 지금 단계에서 해금된 것 (🔓 줄)
    relShowNext: true,       // 다음 단계까지 남은 것 (「다음 「…」까지 애정 25 → …」 줄)
    relShowMemo: true,       // 관계 메모 (카드 아래 회색 글)
    relShowWants: true,      // 인물의 욕구 줄 · 「욕구 AI로 채우기」 막대 (⑤를 켰을 때)
    relShowLife: true,       // 🌙 화면 밖 소식 목록
    relShowPairs: true,      // 인물끼리 관계 목록
    pairAff: false,          // 💞 인물끼리 호감 수치 (pairaff) — 끄면 AI에게 안 가르치고, 적어 와도 반영하지 않고, 화면에도 안 보임
    relRace: false,          // 👑 관계 탭 맨 위 「루트 비교」 — 화면만 (토큰 0). 끄면 최근 변화 집계도 안 함
    relShowBtns: true,       // 카드 오른쪽 단추 (속마음 · 연락 · 이야기에서 빠짐 · 애정 끄기)
    trLlmFallback: true,     // 🌐 실리 번역기가 못 바꾼 글은 묻지 않고 번역 모델로 (v2.7.19)
    mindMode: 'off',         // 💭 속마음 (v2.7.21): off | thought(속마음 한 줄) | emoji(이모티콘) | kaomoji(카모지) — 본편 AI가 <meatball>에 같이 적음 (추가 호출 0)
    mindFreq: 'random',      // always(매 턴) | random(mindPct% 턴만) | tab(프로필 › 속마음 탭에 들어올 때 · 그 턴에 한 번 AI 1회 — v2.9)
    mindPct: 35,
    mindWho: 'cast',         // 💭 누가 말할까 (v2.10): cast(장면 속 인물) | watch(관전자 — 이야기 밖에서 채팅을 보는 사람들)
    mindWatch: ['fan'],      // 켠 관전자 컨셉 (mindcfg.js WATCH · 직접 만든 것은 mindWatchOwn) — 턴마다 1~2명이 랜덤으로
    mindCells: ['jjogae', 'yok', 'woo', 'sul', 'jijeok'], // 🧠 세포들 중 켠 세포 (mindcfg.js CELLS)
    mindWatchOwn: [],        // 직접 만든 관전자 [{ id, name, icon, desc }]
    mindCastMix: true,       // 관전자 모드에서 인물 속마음도 가끔 섞기
    mindTone: 'none',        // 어조 (mindcfg.js TONES) · custom이면 mindToneCustom
    mindToneCustom: '',
    mindToneCast: false,     // 어조를 인물 속마음에도
    mindPop: true,           // 새 속마음 · 한마디가 오면 HUD · 미니바 옆에 말풍선이 톡 튀어나온다
    partsOff: {},            // 👁 보일 것 (v2.7.19): { 탭: [숨긴 것 키, …] } — 화면에서만 숨김 · 모든 채팅 공통
    // ── 로맨스 보정 (v2.6 · 전부 선택 · 기본 꺼짐) ──
    romBond: false,          // 맨 위 단계(연인)는 숫자만으론 안 됨 — 고백 후 「연인 확정」을 눌러야
    romCap: false,           // AI 답 1번에 한 사람의 호감·신뢰가 오를 수 있는 양에 상한
    romCapAff: 5,
    romCapTrust: 5,
    romFatigue: false,       // 같은 사람 호감이 여러 턴 연달아 오르면 점점 덜 오르게
    romFacts: false,         // 「~하지 마」 대신 「지금 관계는 이렇고, 이 사람은 이렇게 군다」를 사실로 알려 줌
    romDrive: false,         // 인물마다 끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것
    romInject: '',           // 내가 넣는 추가 주입문 (비우면 안 보냄)
    contactSimple: false,    // 📱 연락 간단 모드 (v2.7.18 다시 정함 · 기본 꺼짐 = 자세히): 잠깐 가볍게 놀 때 — 편지도 바로 오고, AI가 기억하는 대화가 짧고(최근 몇 줄), 대화는 최근 20개만 남아요. 기능(첨부 · 반응 · 고정 …)은 그대로
    contactSimpleReflect: 'off', // 간단 모드: 연락 내용을 본편 AI에게 — off (안 보냄 · 기본) | recent (가장 최근 연락 한두 줄만)
    contactSimpleFix: '',    // 2.7.16~17에서 모두에게 켜졌던 간단 모드를 한 번 되돌렸는지
    romSpark: false,         // ✨ 설렘 한 스푼: 가끔 장면 속 인물이 지금 단계에 맞는 설레는 한 순간을 스스로 (v2.7.13)
    romSparkPct: 12,         // 그 확률 % (AI 답 1번마다 · 걸린 뒤 3턴은 쉼)
    profHelp: '',            // 미트볼 도우미가 쓸 모델 (연결 프로필, '' = 확장 AI 모델)
    helpMode: 'local',       // 도우미 답 방식: local (README 먼저 · 토큰 0) | ai (바로 AI)
    romDepth: 1,             // 로맨스 보정 주입 깊이 (0 = 맨 끝)
    offscreen: true,         // NPC 화면 밖 생활 (날이 지나면 가끔)
    favTabs: [],             // 즐겨찾기 탭
    bottomNav: false,        // 폰: 탭 바를 아래로 (한 손 모드)
    trNotice: false,         // 🌐 저절로 뜨는 번역 알림 (「한국어로 저장된 칸이 있어요」 · 「번역 실패」): 기본 끔 = 화면에도 알림함에도 안 띄움 — 누른 것에 대한 대답은 그대로
    quiet: false,            // 🔕 조용히: 저절로 뜨는 알림 · 안내 · 번역 경고를 화면에 띄우지 않고 알림함에만 (⚠️ 고장 알림 · 누른 것에 대한 대답은 그대로) — 새로 설치하면 켬
    tidy: null,              // 🧹 기능 정리 (stylepick.js openTidy): { mods: [숨긴 칸], flags: [숨긴 부가 기능] } — 모든 채팅에서 꺼지고 관리 창에도 안 보임 · 자료는 그대로 (다시 꺼내면 돌아옴)
    tidyAsked: false,        // 🧹 업데이트로 받은 사람에게 「기능 정리」 창을 한 번 보여 줬나 (새로 설치한 사람은 스타일로 고르기를 대신 봄)
    stylePick: '',           // 🎨 스타일로 고르기 (stylepick.js): '' = 예전부터 쓰던 사람 (저절로 안 띄움) · 'ask' = 새로 설치 → 관리 탭에 처음 들어갈 때 한 번 · 'done' = 띄웠음
    autoStart: false,        // 🧆 상태창이 없는 채팅을 열면 틀을 바로 만든다 (AI 0회 · 추천 6칸) — 끄면 예전처럼 「만들기」를 눌러야 생긴다 (autostart.js)
                             //    기본 끔: 업데이트로 받은 사람의 옛 채팅에 틀이 저절로 생겨 본편 AI에게 가면 안 된다 → 새로 설치한 사람만 켠다 (index.js init)
    cardOffer: true,         // 카드에 붙은 상태창이 있으면 새 채팅에서 불러올지 물어봄
    autoSave: true,          // 자동 세이브 (오래된 기록을 굳히기 전에 · 최근 3개)
    carry: {},               // 2회차 이어받기 (캐릭터별)
    updateNotice: true,      // 업데이트하면 「바뀐 점」을 한 번 알려 줌 (v2.6)
    lastSeenVersion: '',     // 마지막으로 「바뀐 점」을 본 버전
    lastSeenNote: '',        // 그때 본 내역의 지문 (같은 버전이라도 내역이 바뀌면 다시 알림)
    showMascot: true,        // 마스코트 고양이 보이기
    mascotBuddy: true,       // 상태창 머리에 마스코트 항상 (누르면 반응)
    mascotSound: 'meow',     // 누르면 나는 소리: meow (냥냥) · off (v2.7: 다른 소리 · 내 소리 파일은 뺌)
    mascotVolume: 60,        // 효과음 크기 0~100
    // ── v2.7.3: 기능 켜고 끄기 (모든 채팅) ──
    memoOn: true,            // 📝 메모 칸 — 끄면 모든 채팅에서 메모 탭 · 메모 주입 · AI의 memo 키가 빠져요
    albumOn: true,           // 🖼 추억 앨범 — 끄면 답마다 붙던 앨범 버튼 · 앨범 탭이 사라져요 (담아 둔 건 지우지 않음)
    recordOn: true,          // 📊 플레이 기록 탭
    pipCheck: true,          // 🔍 칩 점검: 마지막 AI 답에 칩이 안 보이면 작은 🔍 표시 → 눌러서 「씹혔나 / 안 보이나」 확인 · 다시 읽기
    freshDot: true,          // 🔴 방금 AI 답에서 바뀐 칸 · 줄에 작은 빨간 점
    questJudge: 'ask',       // 🎲 퀘스트 완료 판정: ask (완료 누르면 판정할지 물어봄) · roll (늘 판정) · off (판정 없이 완료)
    lifeFx: true,            // ✨ 생활 틀의 화면 연출 (단계가 바뀔 때 딱지 · 욕구가 바닥이면 화면 가장자리) — 생활 틀을 넣은 채팅에서만
    questAsk: true,          // v2.9: 단계가 남은 퀘스트를 AI가 「완료」라고 적으면 바로 끝내지 않고 확인을 기다림 (보상도 확인한 뒤에)
    questJudgeAI: false,     // 본편 AI가 「완료」라고 적은 퀘스트도 보상 판정을 자동으로 굴림 (토큰 0)
    extraJudge: true,        // 🎲 흥정(상점) · 일하기 판정 (AI 0회 · v2.7.6)
    questExpire: true,       // ⌛ 퀘스트 기한이 지나면 실패 · 마지막 날 알림 (달력이 켜져 있을 때 · v2.7.5)
    goneInject: true,        // 🗑 버리거나 판 물건을 AI에게 「이제 없음」으로 알려 주기 (다시 꺼내 쓰지 않게)
    chipOutside: false,      // 변동 칩을 본문(.mes_text) 밖 아래에 붙이기 — 번역 확장이 원문을 숨겨 칩이 안 보일 때
    // ── 만들기 재료 · 숨긴 답 · 지우기 확인 · 뒤로 가기 (기타 확장이 밖에서 덧대던 것을 미트볼이 직접) ──
    genRead: 'short',        // 📖 만들기 · 다시 생성 때 채팅 읽기: short (최근 N개 · 앞 700자씩 — 예전 그대로) · last (+ 마지막 답은 전체) · recent (최근 N개를 길게) · all (채팅 전체)
    genReadLen: 700,         // 📖 「최근 채팅」으로 읽을 때 메시지마다 읽을 글자 수 (v2.9.1 · 예전엔 700 고정)
    fixReadCap: 8000,        // 🔍 태그가 빠진 답을 따로 분석할 때 읽을 답 글자 수 — 넘으면 앞 · 뒤 반씩 (v2.9.1 · 예전엔 앞 4,000자만)
    trConvertAsk: true,      // 🌐 「한국어 칸을 영어 저장으로」 바꾸기 전에 묻기 (v2.9.1 · 끄면 바로 · 글만 바뀌고 숫자는 그대로라 안전)
    trAutoConvert: false,    // 🔁 한국어로 저장된 칸이 있는 채팅을 열면 저절로 영어 저장으로 (실리 기본 번역일 때만 · 토큰 0 · 기본 끔)
    genReadCap: 120000,      // 「채팅 전체」로 읽을 때 최대 글자 수 — 넘으면 오래된 메시지부터 앞부분만 남긴다
    genNote: false,          // 📝 만들기 · 다시 생성 때 이 채팅의 작가 노트도 읽기 (페르소나 · 세계관을 작가 노트에 적는 사람용)
    hideSkip: false,         // 🙈 눈 단추로 직접 숨긴 AI 답은 상태 계산에서 빼기 (요약 확장 · /hide로 숨겨진 답은 그대로 더한다)
    askDelete: true,         // 🗑 되돌릴 수 없는 지우기(알림함 비우기 · 비밀 · 기억 · 편지 · 답장 다시 받기)는 한 번 물어보기
    backClose: true,         // ◀ 폰 뒤로 가기로 미트볼 창 닫기 (앱 밖으로 나가지 않게)
    // ── 🛡 간섭 차단 (둘 다 기본 끔 — 끄면 예전과 글자 하나 안 다르다) ──
    guardData: false,        // 데이터 · 동작: 다른 확장이 상태창 자료 · 프롬프트 · 확인 창 · AI 요청에 끼어드는 것을 막는다
    guardLook: false,        // 화면: 다른 확장 · 테마가 미트볼의 색 · 글꼴 · 아이콘 · 단추를 덮는 것을 막는다
    // ── v2.9 새 화면 (전부 기본 끔 — 관리 › 쓸 기능의 칸 밑 · 확장 설정에서 켬) ──
    fortuneTarot: false,     // 🔮 점집: 타로 (운명 칸)
    fortuneOrb: false,       // 🔮 점집: 수정구슬
    fortuneShaman: false,    // 🔮 점집: 무당 · 굿
    mapMetro: false,         // 🚇 새 지도: 노선도 · 인물 핀 · 건물 정면도/평면도 · 집 안 그림 · 지도 꾸미기 (끄면 2.8의 예전 지도)
});
// 전역 끄기 스위치가 있는 칸 (모든 채팅에서 꺼짐 — 채팅마다 켜고 끄는 「쓸 기능」보다 먼저)
export const GLOBAL_OFF = { memo: 'memoOn' };
export const featOn = (k) => settings()[k] !== false;

// 연락: 최근에 주고받은 상대를 맨 앞으로 (본편 주입 순서)
export function touchContact(ct, who) {
    if (!ct || !who) return;
    ct.recent = [who, ...(ct.recent ?? []).filter(x => x !== who)].slice(0, 30);
}

export const MODS = [
    { id: 'profile', name: '프로필', icon: 'fa-id-card', desc: '유저·캐릭터·NPC 프로필 시트' },
    { id: 'stats', name: '수치', icon: 'fa-heart-pulse', desc: '체력 같은 게이지 · 능력치 · 상태 이상' },
    { id: 'dice', name: '주사위', icon: 'fa-dice-d20', desc: '능력치 보정이 붙는 판정' },
    { id: 'wallet', name: '재산', icon: 'fa-coins', desc: '돈 · 소지품' },
    { id: 'shop', name: '상점', icon: 'fa-store', desc: '재산으로 사고팔기', needs: 'wallet' },
    { id: 'home', name: '본거지', icon: 'fa-house-chimney', desc: '방·구역 꾸미기 (가구 배치)' },
    { id: 'rel', name: '관계', icon: 'fa-people-arrows', desc: '애정·우정, 관계 단계, 인물끼리의 관계' },
    { id: 'map', name: '지도', icon: 'fa-map-location-dot', desc: '장소 · 연결 · 현재 위치' },
    { id: 'calendar', name: '달력', icon: 'fa-calendar-days', desc: '세계 안의 날짜 · 시간 · 일정' },
    { id: 'contact', name: '연락', icon: 'fa-envelope', desc: '메신저 또는 편지 (세계관에 맞게)' },
    { id: 'quest', name: '퀘스트', icon: 'fa-scroll', desc: '의뢰 · 목표 · 보상' },
    { id: 'news', name: '뉴스', icon: 'fa-newspaper', desc: '세상 소식 (신문·방송·관보)' },
    { id: 'gossip', name: '가십지', icon: 'fa-wine-glass', desc: '인물들에 대한 소문 · 스캔들' },
    { id: 'board', name: '게시판', icon: 'fa-clipboard-list', desc: '커뮤니티 · 길드 게시판 (글·댓글)' },
    { id: 'ach', name: '업적', icon: 'fa-trophy', desc: '세계관 맞춤 업적' },
    { id: 'memo', name: '메모', icon: 'fa-note-sticky', desc: '꼭 기억할 약속·단서를 📌 고정해 매 턴 AI에게 (요약 확장과 달리 내가 고른 것만)' },
    { id: 'fate', name: '운명', icon: 'fa-hat-wizard', desc: '저주·축복 · 이벤트 카드 · 자동 규칙 · 미니게임 · 점집(타로·수정구슬·무당·굿)' },
    { id: 'sns', name: 'SNS', icon: 'fa-hashtag', desc: '인물들의 SNS 피드 (사진 묘사 · 좋아요 · 댓글)' },
    { id: 'music', name: '추천 음악', icon: 'fa-music', desc: '장면에 어울리는 곡 추천 (▶ 누르면 검색)' },
    { id: 'custom', name: '내 탭', icon: 'fa-shapes', desc: '직접 만드는 탭 — 칸 · 수치 · 글 자유롭게' },
];
// v2.5에 새로 생긴 기능 — 옛 채팅에서는 꺼진 채로 시작 (켜면 그때부터)
export const NEW_MODS_V5 = ['sns', 'music', 'custom'];
// 관계 단계 기본값 (세계관마다 AI가 바꿔 줌)
export const DEFAULT_STAGES = [
    { name: '낯선 사이', at: -100, trust: -100, unlock: '' },
    { name: '아는 사이', at: 0, trust: -100, unlock: '이름 부르기' },
    { name: '친구', at: 25, trust: 10, unlock: '말 편하게 하기 · 사적인 연락' },
    { name: '가까운 사이', at: 45, trust: 25, unlock: '고민 털어놓기 · 단둘이 약속' },
    { name: '특별한 사이', at: 65, trust: 40, unlock: '애칭 · 질투 · 스킨십 조금' },
    { name: '연인', at: 85, trust: 55, unlock: '고백 이후 · 연인다운 행동', love: true },
];
// v2.7: 새 채팅의 관계 수치 = 💗 애정(연애 감정) · 🤝 우정(친함·믿음). 친구는 우정만 오르고, 연인은 애정이 있어야 해요.
// 데이터 키는 그대로 aff · trust (옛 채팅은 이름이 비어 있어 호감 · 신뢰로 보임 — 뜻이 바뀌지 않게)
export const LOVE_AXES = { affName: '애정', trustName: '우정' };
export const LOVE_STAGES = [
    { name: '낯선 사이', at: -100, trust: -100, unlock: '' },
    { name: '아는 사이', at: -100, trust: 0, unlock: '이름 부르기' },
    { name: '친구', at: -100, trust: 25, unlock: '말 편하게 하기 · 사적인 연락' },
    { name: '단짝', at: -100, trust: 50, unlock: '고민 털어놓기 · 단둘이 약속 · 비밀 나누기' },
    { name: '설렘', at: 30, trust: 25, unlock: '서로 의식하기 · 애칭 · 질투 · 스킨십 조금' },
    { name: '연인', at: 65, trust: 35, unlock: '고백 이후 · 연인다운 행동', love: true },
];
const LOVE_AXIS_RE = /애정|연정|사랑|설렘|romance|romantic|love/i;
// 이 채팅의 관계 수치 이름 { aff, trust, love } — love = 애정/우정 방식 (aff는 연애 감정만)
export function relAxes(rel, en = false) {
    const a = String(rel?.affName ?? '').trim(), t = String(rel?.trustName ?? '').trim();
    const love = LOVE_AXIS_RE.test(a);
    if (en) return { aff: love ? 'romance' : a && /^[\x00-\x7f]+$/.test(a) ? a : 'affection', trust: love ? 'friendship' : t && /^[\x00-\x7f]+$/.test(t) ? t : 'trust', love };
    return { aff: a || '호감', trust: t || '신뢰', love };
}
// AI가 만든 단계표 다듬기 (애정/우정 방식): 연애 단계(설렘·썸·연인 …) 앞의 우정 단계는 애정이 필요 없게 (-100)
// → 친구로 지내기만 해도 AI가 애정을 올려야 단계가 오르는 일이 없게
const ROMANCE_STAGE_RE = /설렘|썸|연인|애인|커플|짝사랑|두근|연애|romance|romantic|crush|lover|couple|sweetheart|dating/i;
// 연애 단계가 시작되는 곳 (💗 애정 꺼 둔 사람은 그 앞 단계까지만) — 없으면 -1
// 이름엔 티가 안 나도 해금 내용이 연애인 단계 (「Lingering Warmth — 무심코 스치는 손길 · 독점욕」) (v2.7.19)
const ROMANCE_UNLOCK_RE = /\bkiss|embrac|flirt|possessiv|blush|butterfl|intimate|caress|cuddl|hold(?:ing)? hands|romantic|longing|yearn|lingering touch|스킨십|키스|입맞|포옹|손잡|설레|설렘|독점|애틋|두근|연애|고백/i;
const isRomStage = (x) => x?.love === true || ROMANCE_STAGE_RE.test(String(x?.name ?? '')) || ROMANCE_UNLOCK_RE.test(String(x?.unlock ?? ''));
export function romanceStart(rel) {
    const st = rel?.stages ?? [];
    const love = relAxes(rel).love;
    const k = st.findIndex(x => isRomStage(x) || (love && Number(x?.at) > -100));
    return k;
}
// 연애 느낌 단계가 우정만으로 열리는 사다리 (형제 · 친구가 우정 90이면 「독점욕」 단계로 올라갔음)
export function ladderIssue(rel) {
    if (!rel?.stages?.length || !relAxes(rel).love) return [];
    return rel.stages.filter(x => !x.love && isRomStage(x) && !(Number(x.at) > -100)).map(x => x.name);
}
export function fixLoveLadder(rel) {
    if (!rel?.stages?.length || !relAxes(rel).love) return rel;
    const first = rel.stages.findIndex(isRomStage);
    const loveAt = Number(rel.stages.find(x => x?.love === true)?.at);
    const romAt = loveAt > 0 ? Math.max(15, Math.round(loveAt / 3)) : 20;
    rel.stages.forEach((x, i) => {
        if (first < 0 ? !x.love : i < first) x.at = -100;
        else if (!x.love && !(Number(x.at) > -100)) x.at = romAt; // 연애 느낌 단계엔 애정도 필요하게
    });
    return rel;
}
// 💞 연인 단계: 직접 표시한 단계 → 없으면 이름으로 짐작 (연인·애인·커플·lover…) → 없으면 -1 (우정·신뢰 단계뿐인 세계관)
const LOVE_RE = /연인|애인|커플|부부|약혼|사랑하는|lover|couple|sweetheart|romanc|spouse|married|engaged/i;
export function loveIndex(st) {
    if (!Array.isArray(st)) return -1;
    const k = st.findIndex(x => x?.love === true);
    if (k >= 0) return k;
    return st.findIndex(x => x?.love !== false && LOVE_RE.test(String(x?.name ?? '')));
}
// 프로필에 있는 사람이 관계에서 빠졌으면 채운다 (호감·신뢰 0, 메모 = 프로필 한 줄)
export function relFromProfiles(rel, profile) {
    if (!rel || !Array.isArray(rel.user) || !Array.isArray(profile?.list)) return 0;
    let n = 0;
    for (const p of profile.list) {
        if (!p?.name || p.role === 'user' || findBy(rel.user, p.name)) continue;
        rel.user.push({ name: String(p.name), label: '', aff: 0, trust: 0, memo: short(String(p.summary ?? ''), 90), stage: -1, jealous: 0, met: '' });
        n++;
    }
    return n;
}
// 연인 단계가 없으면 맨 위에 하나 붙인다 (세계관이 동료·사제 단계로만 만들어도 연애 루트는 늘 있게)
export function ensureLove(rel) {
    if (!rel || !Array.isArray(rel.stages) || !rel.stages.length || loveIndex(rel.stages) >= 0) return rel;
    const top = rel.stages[rel.stages.length - 1];
    const en = settings().ssGenLang === 'enview';
    // 맨 위 단계보다 조금 높게 (같으면 그 단계를 건너뜀)
    const lv = relAxes(rel).love; // 애정/우정 방식이면 애정 65 · 우정 35 정도로 (우정 단계 위에 바로)
    rel.stages.push({ name: en ? 'Lovers' : '연인', at: Math.min(100, Math.max(lv ? 65 : 85, top.at + 5)), trust: Math.min(100, Math.max(lv ? 35 : 55, lv ? 35 : top.trust + 5)), unlock: en ? 'after a confession · romantic affection and touch' : '고백 이후 · 연인다운 행동', love: true });
    return rel;
}
// 처음 켜져 있는 기능 (v2.7): 어떤 채팅에도 꼭 필요한 6개만 — 나머지는 이야기에 맞는 순간 💡 기능 추천 알림으로 권한다 (tips.js)
export const REC_MODS = ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar'];
export const defaultModOn = (id) => { const def = settings().defaultMods; return def ? def[id] !== false : REC_MODS.includes(id); };
export const MOD = Object.fromEntries(MODS.map(m => [m.id, m]));
// 🍙 심플 모드 (채팅마다 · meta.simple === true): 탭 없이 타일 판 하나 · 추천 6칸 + 아래 칸만 · 팁 · 추천 · 알림 창을 띄우지 않음 (src/simple.js)
//   타일 한 칸으로 다 보이는 칸만 심플에서 더 켤 수 있다 — 연락 · 상점 · 본거지처럼 탭이 있어야 쓰는 칸은 「기본 모드」에서
export const SIMPLE_EXTRA = ['quest', 'news', 'fate', 'music', 'custom'];
export const SIMPLE_TILES = ['date', 'loc', 'bars', 'rel', 'cash', 'cond', 'quest', 'news', 'fate', 'music', 'custom'];
export const simpleOk = (id) => REC_MODS.includes(id) || SIMPLE_EXTRA.includes(id);
export const isSimple = (meta = getMeta()) => meta?.simple === true;
// 💭 속마음이 아직 가려져 있나 (v2.9): 「볼 때마다 눈치」(peekCost)를 켰고, 이 사람의 지금 속마음을 아직 눌러 보지 않았을 때 — 화면에서만 가린다 (mind.js)
export const mindCovered = (r, meta = getMeta()) => settings().peekCost === true && !!r?.mind?.text && !(Number(meta?.mindSeen?.[r.name] ?? -1) >= r.mind.turn);
export const MOD_IDS = MODS.map(m => m.id);

export const DIFFS = {
    easy: { name: '이지', icon: 'fa-feather', dc: -2, pct: 10, desc: '실수해도 크게 잃지 않고, 돈·도움이 넉넉하며 관계가 빨리 가까워져요. 주사위 난이도 −2.' },
    normal: { name: '보통', icon: 'fa-scale-balanced', dc: 0, pct: 0, desc: '선택에 결과가 따르지만 회복할 수 있어요.' },
    hard: { name: '하드', icon: 'fa-skull', dc: 2, pct: -10, desc: '자원이 귀하고 사람들은 경계해요. 실패는 오래 남아요. 주사위 난이도 +2.' },
};

export const GENRES = [
    { id: 'modern', name: '현대', hint: '현대 한국/도시. 스마트폰 메신저, 원화.', contact: 'phone' },
    { id: 'fantasy', name: '판타지', hint: '검과 마법의 판타지 왕국. 길드, 몬스터, 금화.', contact: 'letter' },
    { id: 'academy', name: '마법학원', hint: '마법 학교/아카데미. 기숙사, 수업, 시험, 교수.', contact: 'letter' },
    { id: 'eastern', name: '동양·무협', hint: '동양풍(무협/선협/궁중). 문파, 객잔, 은자·전.', contact: 'letter' },
    { id: 'medieval', name: '중세', hint: '마법이 거의 없는 중세 유럽풍. 영주, 교회, 장원.', contact: 'letter' },
    { id: 'early', name: '근대', hint: '19세기~20세기 초. 증기, 신문, 전보·편지, 사교계.', contact: 'letter' },
    { id: 'sf', name: 'SF', hint: '우주/사이버펑크. 통신기, 크레딧.', contact: 'phone' },
    { id: 'apoc', name: '아포칼립스', hint: '멸망 이후 생존. 물자가 귀함, 무전기.', contact: 'instant' },
    { id: 'fan', name: '2차 창작', hint: '원작 세계관을 그대로 따름.', contact: 'auto' },
];

export const CONTACT_MODES = {
    auto: { name: '세계관에 맞게 (AI가 정함)', icon: 'fa-wand-magic-sparkles' },
    phone: { name: '휴대폰 메신저', icon: 'fa-mobile-screen-button', app: '메신저' },
    instant: { name: '즉시 통신 (마법 통신구·무전·텔레파시)', icon: 'fa-tower-broadcast', app: '통신구' },
    letter: { name: '편지 (도착까지 시간이 걸림)', icon: 'fa-envelope', app: '편지' },
};

export const COURIER_PRESETS = [
    { name: '배달부', icon: '🚲', min: 2, max: 3, fee: 0, note: '마을 우편 배달부' },
    { name: '갈매기', icon: '🐦', min: 1, max: 3, fee: 0, note: '바닷가라면 갈매기 우편' },
    { name: '강아지', icon: '🐕', min: 1, max: 2, fee: 0, note: '목에 편지통을 단 강아지' },
    { name: '올빼미', icon: '🦉', min: 1, max: 2, fee: 0, note: '밤에 날아가는 올빼미' },
    { name: '전서구', icon: '🕊️', min: 1, max: 2, fee: 0, note: '비둘기 다리에 묶어' },
    { name: '파발마', icon: '🐎', min: 1, max: 2, fee: 0, note: '말 탄 파발꾼' },
    { name: '마법 편지', icon: '✨', min: 0, max: 1, fee: 0, note: '종이학이 되어 날아감' },
];

// ───── 유틸 ─────
// getContext()는 부를 때마다 큰 객체를 새로 만든다 → 같은 동기 실행 안에서는 하나를 같이 쓴다 (계산 한 번에 수천 번 불림 · v2.7)
// await 뒤나 다음 이벤트에선 새로 받으니 채팅이 바뀌어도 옛 값이 남지 않는다
let ctxCache = null;
// 🛡 데이터 보호(guardData): 다른 확장이 SillyTavern.getContext 를 감싸서 확인 창 · AI 요청에 끼어들 수 있다.
// 켜져 있으면 실리태번 모듈에서 직접 받은 getContext 를 쓴다 (감싸개를 거치지 않음). 못 받았으면(옛 실리 · 시험대) 예전처럼 전역 것.
export const pure = { getContext: null, tried: false };
export async function loadPure() {
    if (pure.tried) return !!pure.getContext;
    pure.tried = true;
    for (const url of ['/scripts/st-context.js', '/scripts/extensions.js']) {
        try { const fn = (await import(url)).getContext; if (typeof fn === 'function' && fn().extensionSettings) { pure.getContext = fn; break; } } catch { /* 다음 주소 */ }
    }
    ctxCache = null;
    return !!pure.getContext;
}
let guardOn = false; // settings()가 ctx()를 부르므로 여기서 settings()를 다시 부르지 않게 따로 둔다 — 설정을 읽을 때마다 맞춘다
export const ctx = () => {
    if (ctxCache) return ctxCache;
    ctxCache = guardOn && pure.getContext ? pure.getContext() : SillyTavern.getContext();
    queueMicrotask(() => { ctxCache = null; });
    return ctxCache;
};
// 상태가 바뀔 수 있는 저장이 있었는지 세는 번호 (갱신 때 같은 계산을 또 하지 않게)
// 답 아래 변동 칩 자리. 정규식이 본문에 넣은 <div class="ss-slot">은 실리태번이 메시지 HTML의 클래스에 custom-을 붙여 .custom-ss-slot이 된다
// → 칩 자리를 찾는 곳은 전부 이 둘을 같이 본다 (하나만 보면 우리 칩을 남의 것으로 알고 다시 붙이기 · 번역을 헛돌린다)
export const SLOT_SEL = '.ss-slot, .custom-ss-slot';
export const isSlotEl = (n) => n?.nodeType === 1 && (n.classList.contains('ss-slot') || n.classList.contains('custom-ss-slot'));
export const rev = { n: 0 };
export const ctxReset = () => { ctxCache = null; }; // 채팅이 바뀌는 이벤트 시작에서 확실히 새로 받기

// ───── 오류 기록 (v2.7): 미트볼에서 난 오류·경고만 최근 30개 · 오류 보고문에 씀 (메모리에만 · 저장 안 함) ─────
export const errLog = [];
function recErr(level, args) {
    try {
        const parts = args.filter(a => a !== LOG).map(a => (a instanceof Error ? `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}` : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()));
        errLog.push({ t: Date.now(), level, text: parts.join(' ').slice(0, 1500) });
        if (errLog.length > 30) errLog.shift();
    } catch { /* 기록 실패는 무시 */ }
}
export function ssErr(...a) { recErr('error', a); console.error(...a); }
export function ssWarn(...a) { recErr('warn', a); console.warn(...a); }
// 넘어가도 되지만 흔적은 남길 것 — 콘솔엔 안 찍고 오류 보고문에만 남는다. 빈 catch { } 대신 쓴다
// 📦 묶음 크기 (v2.9.1 · 설정 genBatchSize): normal = 엮인 칸끼리 2~4칸 (예전 그대로) · big = 이어 붙여 6칸까지 · one = 세계관 뺀 나머지를 한 번에
//   출력 한도가 큰 모델(Gemini 4 Argon 등)에서 횟수를 줄인다 — 한 번에 받을수록 잘리면 잃는 것도 크다 (빠진 칸만 따로 다시 받음)
export function sizeGroups(groups) {
    const m = settings().genBatchSize, gs = groups.filter(g => g.length);
    if (m === 'one') return gs.length ? [gs.flat()] : [];
    if (m !== 'big') return gs;
    const out = []; for (const g of gs) { const last = out.at(-1); if (last && last.length + g.length <= 6) last.push(...g); else out.push([...g]); }
    return out;
}
export function ssNote(where, e) { recErr('note', [where, e]); }
export function h(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
}
// 🔗 인물 합치기 (v2.7.23): 합쳐서 없어진 이름(「레온」)을 남은 이름(「Leon」)으로 찾는다 — 표는 관계 칸(rel.alias)에 있고, 계산할 때마다 여기에 걸어 둔다
let aliasMap = null;
export const setAlias = (m) => { aliasMap = m && typeof m === 'object' && Object.keys(m).length ? m : null; };
export function findBy(list, name, field = 'name') {
    let n = norm(name);
    if (aliasMap && Object.hasOwn(aliasMap, n)) n = norm(aliasMap[n]);
    if (!n || !Array.isArray(list)) return null;
    return list.find(x => norm(x?.[field]) === n)
        ?? list.find(x => nameWithin(x?.[field], name))
        ?? trFind(list, name, field);
}
// 이름이 다른 이름 안에 들어 있을 때 같은 사람 · 장소로 볼지 (v2.9.1 · 블루레몬 제보): 예전엔 두 글자 이상 「포함」이면 같다고 봐서
// 「유나」와 「유나린」이 한 사람으로 합쳐지고 「Ann」이 「Anna」에 붙었다 → 낱말 경계로만 (「레온」 ↔ 「레온 하트」) · 뒤에 조사 · 호칭만 붙은 것(「레온이」 「유나 씨」 「Leon's」)은 같게
const NAME_TAIL = /^(?:이|가|은|는|을|를|의|에게|한테|께|와|과|랑|이랑|도|만|님|씨|군|양|선배|형|누나|오빠|언니|'s|’s)$/i;
const nameToks = (x) => String(x ?? '').toLowerCase().split(/[\s·・,，()（）\[\]{}「」『』"“”'_/|]+/).filter(Boolean);
export function nameWithin(a, b) {
    const A = nameToks(a), B = nameToks(b);
    if (!A.length || !B.length) return false;
    const [S, L] = A.join('').length <= B.join('').length ? [A, B] : [B, A];
    if (S.join('').length < 2 || S.join('') === L.join('')) return S.join('') === L.join('') && S.join('').length >= 2;
    for (let i = 0; i + S.length <= L.length; i++) if (S.every((t, j) => L[i + j] === t)) return true; // 낱말 그대로 들어 있음
    const s = S.join(''), l = L.join('');
    return l.startsWith(s) && NAME_TAIL.test(l.slice(s.length)); // 「레온이」 = 레온 + 조사
}
// ───── 화면만 번역 (v2.6): 상태창 데이터는 영어 그대로 (= AI에게도 영어), 화면에 그릴 때만 번역본 ─────
// 번역 사전은 채팅마다 meta.tr = { 영어 원문: 번역 } 에 쌓인다.
// 아주 자주 불린다 (이름 찾기 · 화면 번역기) → settings()의 기본값 채우기를 거치지 않고 바로 읽는다
// 연락 「간단」(v2.7.16 · 기본): 편지 세계도 메신저처럼 바로 주고받음 — 배달 · 도착 시간 · 급행 · 동봉 · 반응 · 고정 · 수정 없음
export const contactSimple = () => { try { return ctx().extensionSettings?.[MODULE]?.contactSimple === true; } catch { return false; } };
export const letterMode = (ct) => ct?.mode === 'letter' && !contactSimple();
// 간단 모드인데 편지 세계: 편지가 바로 오가요 (답도 편지 모양) — 세계 규칙(전화 없음 · 편지로 연락)은 AI에게 그대로 알려요
export const instantLetter = (ct) => ct?.mode === 'letter' && contactSimple();
export const SIMPLE_THREAD = 20; // 간단 모드: 한 사람과의 대화는 최근 20개만 남겨요 (가볍게 · 오래된 건 빠져요)
export const viewTr = () => { try { return ctx().extensionSettings?.[MODULE]?.ssGenLang === 'enview'; } catch { return false; } };
export function trDict() { try { return viewTr() ? (getMeta()?.tr ?? null) : null; } catch { return null; } }
export function trLook(en) { const d = trDict(); const k = String(en ?? '').trim(); return d && Object.hasOwn(d, k) ? d[k] : undefined; }
let trRev = { d: null, n: -1, map: null };
export function trBack(ko) {
    const d = trDict(); if (!d) return undefined;
    const n = Object.keys(d).length;
    if (trRev.d !== d || trRev.n !== n) trRev = { d, n, map: new Map(Object.entries(d).map(([e, k]) => [norm(k), e])) };
    return trRev.map.get(norm(ko));
}
// 화면(번역된 이름)이나 한국어 본편이 번역된 이름으로 부를 때도 영어로 저장된 항목을 찾게
function trFind(list, name, field) {
    const en = trBack(name);
    if (!en) return null;
    const n = norm(en);
    return list.find(x => norm(x?.[field]) === n) ?? null;
}
export const sub = (t) => { try { return ctx().substituteParams(String(t ?? '')); } catch { return String(t ?? ''); } };
// 풀사칭(디렉터)에서는 유저가 이야기 밖에 있으니, 상태창의 「나」 = 주인공
export const userName = () => { try { const p = playOf(); if (p.mode === 'director' && p.hero) return p.hero; return ctx().name1 || 'User'; } catch { return 'User'; } };

// ───── 플레이 방식 ─────
// rp = 롤플 (유저가 주인공, 카드 = 캐릭터) · multi = 다인봇 (유저 1명 + 캐릭터 여럿) · director = 풀사칭 (유저는 지시만, 캐릭터들이 진행)
export const PLAY_MODES = {
    rp: { name: '롤플', icon: 'fa-user-group', desc: '내가 주인공, 카드는 캐릭터 한 명' },
    multi: { name: '다인봇', icon: 'fa-users', desc: '내가 주인공, 캐릭터가 여러 명' },
    director: { name: '풀사칭', icon: 'fa-clapperboard', desc: '나는 디렉터 — 지시만 하고 캐릭터들이 알아서 진행' },
};
// 원클릭 세트 (만들기 창 맨 위): 플레이 방식 + 쓸 기능 + 선택 기능을 한 번에. 누른 뒤에도 아래에서 하나씩 바꿀 수 있다
// set의 선택 기능은 「켜기」만 한다 (다른 채팅에서 켜 둔 것을 끄지 않음)
export const PLAY_SETS = {
    romance: { name: '여성향 연애', icon: 'fa-heart', desc: '1:1 롤플 · 관계 · 연락 · 달력 중심', play: { mode: 'rp' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'memo', 'sns'], set: {} },
    routes: { name: '다인 · 루트 미정', icon: 'fa-users', desc: '내가 주인공, 누구와 이어질지 모름 · 👑 루트 비교 켬', play: { mode: 'multi' }, mods: ['profile', 'rel', 'calendar', 'contact', 'map', 'memo', 'gossip', 'sns'], set: { relRace: true } },
    director: { name: '풀사칭', icon: 'fa-clapperboard', desc: '주인공도 AI가 씀 · 💞 인물끼리 호감 · 👑 루트 비교 켬', play: { mode: 'director' }, mods: ['profile', 'stats', 'rel', 'calendar', 'map', 'memo', 'gossip'], set: { pairAff: true, relRace: true } },
    ensemble: { name: '풀사칭 · 군상극', icon: 'fa-people-group', desc: '주인공 없음 · 인물끼리의 관계만 추적 · 💞 인물끼리 호감 · 👑 루트 비교 켬', play: { mode: 'director', ensemble: true }, mods: ['profile', 'rel', 'calendar', 'map', 'memo', 'gossip', 'news'], set: { pairAff: true, relRace: true } },
};
export function normPlay(p) {
    p = p && typeof p === 'object' ? p : {};
    const mode = PLAY_MODES[p.mode] ? p.mode : 'rp';
    const ensemble = mode === 'director' && (p.ensemble === true || p.ensemble === 'true'); // 군상극: 풀사칭인데 주인공이 없음 (인물끼리의 관계만 추적)
    return { mode, ensemble, hero: ensemble ? '' : String(p.hero ?? '').trim().slice(0, 40), cardIsWorld: !!p.cardIsWorld, cast: Array.isArray(p.cast) ? p.cast.map(String).map(x => x.trim()).filter(Boolean).slice(0, 20) : [] };
}
export function playOf(meta) { try { return normPlay((meta ?? (app.playTemp ? { play: app.playTemp } : getMeta()))?.play); } catch { return normPlay(null); } }
// 풀사칭인데 주인공 이름이 유저(페르소나) 이름과 같은가 — 유저 「루시」가 지시만 하고 AI가 루시 몫까지 쓰는 경우
// 이때 「유저는 이야기 속 인물이 아니다」라고 하면 AI가 헷갈리므로 규칙문을 따로 쓴다 (inj/gen.play.director.self)
export function heroIsUser(p = playOf()) {
    try { return p.mode === 'director' && !!p.hero && norm(p.hero) === norm(ctx().name1 ?? ''); } catch { return false; }
}
// 풀사칭이면 우리 글 속 {{user}}를 주인공 이름으로 (주인공이 없으면 '주인공')
export function swapUser(text, meta) {
    const p = playOf(meta);
    if (p.mode !== 'director') return text;
    return String(text ?? '').replace(/\{\{user\}\}/gi, p.ensemble ? 'the cast' : p.hero || 'the protagonist');
}

// ───── 설정 / 메타 ─────
let filled = null; // 기본값 채우기는 설정 객체마다 한 번만 (예전엔 부를 때마다 110개 키를 훑었음 · 가장 자주 불리는 함수)
export function settings() {
    const { extensionSettings } = ctx();
    if (!extensionSettings[MODULE]) extensionSettings[MODULE] = structuredClone(DEFAULTS);
    const s = extensionSettings[MODULE];
    if (s === filled) return s;
    if (s.uiMode && s.showHud === undefined) { // v1 → v2
        s.showFloat = s.uiMode !== 'side'; s.showSide = s.uiMode !== 'float'; delete s.uiMode;
    }
    if (s.theme && !['white', 'cream', 'ink', 'rose', 'mint', 'st', 'custom'].includes(s.theme)) s.theme = 'white';
    // v2.7: 소리는 냥냥 하나만 — 예전 선택은 냥냥으로, 설정 파일을 무겁게 하던 내 소리 파일은 지운다
    if (s.mascotSound && s.mascotSound !== 'meow' && s.mascotSound !== 'off') s.mascotSound = 'meow';
    // v2.7.19: 2.7.18에서 뺀 기능(의도 먼저 · 먼저 움직이기 · 사건 한 스푼)의 설정이 남아 「켜짐」으로 보이던 것 정리
    for (const k0 of ['romIntent', 'romInit', 'romInitPct', 'storyPush', 'storyPushPct']) delete s[k0];
    if (Object.hasOwn(s, 'mascotSoundFile') || Object.hasOwn(s, 'mascotSoundName')) { delete s.mascotSoundFile; delete s.mascotSoundName; }
    const fresh = !Object.hasOwn(s, 'contactReflect');
    for (const k of Object.keys(DEFAULTS)) if (!Object.hasOwn(s, k)) s[k] = clone(DEFAULTS[k]);
    if (fresh && s.contactInject === false) s.contactReflect = 'off'; // v2.2 이전 '연락 알려 주기' 끔 → 반영 끔
    // v2.7.18: 2.7.16~17은 연락 간단 모드를 예고 없이 모두에게 켰다 → 한 번만 원래(자세히)로 되돌린다 (그 뒤 직접 켜면 그대로)
    if (s.contactSimpleFix !== '2.7.18') { s.contactSimple = false; s.contactSimpleFix = '2.7.18'; }
    // 연결 프로필이 실패하면 멈추는 게 기본 (예전 기본은 「메인 연결로 다시 보내기」) → 한 번만 끔으로 맞춘다 (그 뒤 직접 켜면 그대로)
    if (s.fallbackFix !== '2.7.21') { s.aiFallbackMain = false; s.fallbackFix = '2.7.21'; }
    filled = s;
    guardOn = s.guardData === true;
    return s;
}
export const saveSettings = () => { rev.n++; guardOn = settings().guardData === true; ctx().saveSettingsDebounced(); };
// 👁 보일 것 × AI (v2.7.21): 데이터가 AI에게 가는 항목은 끄면 AI에게도 안 보낸다 (데이터는 남음 · 다시 켜면 그대로)
// 화면 전용(단추 · 안내 · 머리 …)은 여기 없음. 달력 「오늘」은 날짜 · 시간이 빠지면 이야기가 흔들려서 화면 전용으로 둔다.
// rel 은 관계 탭의 relShow… 설정(false = 끔), 다른 탭은 partsOff.
export const AI_PARTS = {
    home: ['hero'],
    profile: ['summary', 'where', 'fields'],
    quest: ['meta', 'desc', 'steps', 'reward'],
    map: ['place', 'ppl'],
    contact: ['sum'],
    gossip: ['foot'],
    sns: ['pic', 'tags', 'replies'],
    rel: ['relShowUnlock', 'relShowMemo', 'relShowWants', 'relShowLife', 'relShowPairs'],
};
export const isAiPart = (tab, key) => !!AI_PARTS[tab]?.includes(key);
// 2.7.21 앞에 꺼 둔 것(그땐 「화면에서만」이었음)은 다시 누르기 전까진 화면에서만 숨긴다 (partsKeepAI)
export function aiOff(tab, key) {
    const set = settings();
    if (!isAiPart(tab, key) || (set.partsKeepAI?.[tab] ?? []).includes(key)) return false;
    return tab === 'rel' ? set[key] === false : (set.partsOff?.[tab] ?? []).includes(key);
}
// 눌러서 바꾼 항목은 「예전 꺼 둔 것」 표시를 지운다 → 이제부터 AI에도 따름
export function partTouched(tab, key) {
    const set = settings(), k = set.partsKeepAI?.[tab];
    if (!k?.includes(key)) return;
    const rest = k.filter(x => x !== key);
    if (rest.length) set.partsKeepAI[tab] = rest; else delete set.partsKeepAI[tab];
}
// 처음 한 번: 지금 꺼져 있는 AI 항목을 「화면에서만」으로 남겨 둔다 → 남긴 개수
export function migrateParts() {
    const set = settings();
    if (set.partsAiMig) return 0;
    const keep = {};
    for (const [tab, keys] of Object.entries(AI_PARTS)) {
        const off = keys.filter(k => tab === 'rel' ? set[k] === false : (set.partsOff?.[tab] ?? []).includes(k));
        if (off.length) keep[tab] = off;
    }
    set.partsKeepAI = keep; set.partsAiMig = true; saveSettings();
    return Object.values(keep).reduce((a, v) => a + v.length, 0);
}

export function getMeta(create = false) {
    const md = ctx().chatMetadata;
    if (!md) return null;
    if (!md[MODULE] && create) {
        md[MODULE] = { v: DATA_V, base: null, startAt: 0, startKey: null, adjust: [], mods: Object.fromEntries(MOD_IDS.map(id => [id, defaultModOn(id)])), off: false, difficulty: settings().difficulty, paused: false, skipOnce: false };
    }
    const m = md[MODULE];
    if (m) {
        m.difficulty ??= 'normal'; m.mods ??= {};
        if (!Array.isArray(m.notes)) m.notes = []; if (!Array.isArray(m.album)) m.album = []; if (!Array.isArray(m.saves)) m.saves = [];
        if (!Array.isArray(m.adjust)) m.adjust = [];
        if ((m.v ?? 1) < DATA_V) migrate(m); // 옛 버전 채팅 데이터를 지금 모양으로 (새 칸·새 항목 채우기)
        if (!cleaned.has(m)) { cleaned.add(m); cleanMeta(m); }
    }
    return m ?? null;
}
// 🧹 깨진 저장 자료 다듬기 (검수 · 채팅을 열 때 한 번): 손으로 고친 파일 · 다른 확장 · 옛 판 때문에 모양이 어긋난 칸이 있으면
//   계산 · 화면이 멈췄다 (편집 기록의 ops가 목록이 아님 · 칸 자료가 글 · 세이브/알림 목록에 null …). 버전과 상관없이 모양만 맞춘다
const cleaned = new WeakSet();
function cleanMeta(m) {
    try {
        const objs = (a) => (Array.isArray(a) ? a.filter(x => x && typeof x === 'object' && !Array.isArray(x)) : []);
        m.notes = objs(m.notes); m.album = objs(m.album); m.saves = objs(m.saves);
        if (!m.mods || typeof m.mods !== 'object' || Array.isArray(m.mods)) m.mods = {};
        m.adjust = objs(m.adjust);
        for (const a of m.adjust) if (a.ops !== undefined) a.ops = Array.isArray(a.ops) ? a.ops.filter(o => Array.isArray(o) && typeof o[0] === 'string') : [];
        const b = m.base;
        if (b && typeof b === 'object') {
            if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) b.data = {};
            // 멀쩡한 칸은 손대지 않는다 (다듬기가 기본 칸을 더하고 · 보관함으로 옮겨서 AI에게 가는 글이 업데이트 전과 달라지면 안 된다)
            //   모양이 틀린 칸만: 칸이 객체가 아님 → 비움 · 목록이어야 할 곳이 목록이 아니거나 객체여야 할 곳이 객체가 아님 → 그 칸만 다듬기
            for (const id of Object.keys(b.data)) {
                const d = b.data[id]; if (d == null) continue;
                if (typeof d !== 'object' || Array.isArray(d) || !NORM[id] || !EMPTY[id]) { b.data[id] = null; continue; }
                const t = EMPTY[id]();
                const bad = Object.keys(t).some(k => d[k] !== undefined && d[k] !== null && (Array.isArray(t[k]) ? !Array.isArray(d[k]) || d[k].some(x => x === null || x === undefined) : t[k] && typeof t[k] === 'object' ? typeof d[k] !== 'object' || Array.isArray(d[k]) : false));
                if (bad) b.data[id] = normalize(id, d);
            }
            if (b.core !== undefined && (!b.core || typeof b.core !== 'object' || Array.isArray(b.core))) b.core = NORM.core(b.core);
        } else if (b !== null && b !== undefined) m.base = null;
    } catch (e) { ssWarn(LOG, 'clean meta', e); }
}
// v1 → v2: 칸 데이터를 새 모양으로 (메시지 id 등) 한 번만 다듬어 둔다
// 저장 데이터 모양 버전 — 칸에 새 항목이 생기면 올린다 (v3: 재산 물가·빚·정기·일거리, 연락 요약·반영, 운명)
export const DATA_V = 5; // v5: 관계 단계·질투·화면 밖 소식, 엔딩, SNS · 추천 음악 · 내 탭, 알림함 · 앨범 · 세이브
function migrate(m) {
    const from = m.v ?? 1;
    try {
        // v5: 새 기능은 옛 채팅에서 꺼진 채로 (토큰이 갑자기 늘지 않게) — 관리 탭에서 켤 수 있다
        if (from < 5) { m.mods ??= {}; for (const id of NEW_MODS_V5) if (m.mods[id] === undefined) m.mods[id] = false; m.newV5 = true; }
        m.notes = arr(m.notes); m.album = arr(m.album); m.saves = arr(m.saves);
        if (m.base?.data) for (const id of Object.keys(m.base.data)) if (m.base.data[id] && NORM[id]) m.base.data[id] = normalize(id, m.base.data[id]);
        if (m.base?.core) m.base.core = NORM.core(m.base.core);
        for (const a of m.adjust ?? []) if (a.set?.data && NORM[a.set.mod]) a.set.data = a.set.mod === 'core' ? NORM.core(a.set.data) : normalize(a.set.mod, a.set.data);
    } catch (e) { ssWarn(LOG, 'migrate', e); }
    m.v = DATA_V;
}
// 저장 (v2.7.14): 실리의 「모아서 저장」은 그 사이 채팅을 옮기면 취소돼서 마지막 변경이 날아갔다.
// → 1초 모아서 한 번 (연타해도 저장은 한 번) + 미트볼 창 밖을 누르거나(채팅 목록 · 캐릭터 고르기 포함) 탭을 내리면 그 자리에서 바로.
//   실리는 채팅을 옮기기 전에 진행 중인 저장이 끝나길 기다려서, 옮기는 클릭보다 먼저 저장이 시작되면 안전하다.
let metaTimer = null, metaChat = '';
const chatNow = () => { try { const c = ctx(); return `${c.groupId ?? ''}|${c.getCurrentChatId?.() ?? ''}`; } catch { return ''; } };
export function flushMeta() {
    if (!metaTimer) return;
    clearTimeout(metaTimer); metaTimer = null;
    if (metaChat === chatNow()) return ctx().saveMetadata?.();
}
// 🛡 자료 봉인(guardData): 미트볼이 저장하거나 화면을 다 그릴 때마다 기준 자료(base · origin)의 지문을 떠 둔다.
// 다음에 화면을 그리려는데 지문이 다르면 = 그 사이 미트볼 밖에서 고친 것 → 떠 둔 대로 되돌린다. 꺼져 있으면 아무것도 안 한다.
const seal = { chat: '', sig: '' };
const sealSig = (m) => JSON.stringify([m.base ?? null, m.origin ?? null]);
export function sealMeta() {
    if (!guardOn) { seal.sig = ''; return; }
    try { const m = ctx().chatMetadata?.[MODULE]; seal.chat = chatNow(); seal.sig = m?.base ? sealSig(m) : ''; } catch (e) { seal.sig = ''; ssNote('봉인', e); }
}
// → 되돌렸으면 true
export function checkSeal() {
    if (!guardOn || !seal.sig) return false;
    try {
        const m = ctx().chatMetadata?.[MODULE];
        if (!m?.base || seal.chat !== chatNow() || sealSig(m) === seal.sig) return false;
        const [b, o] = JSON.parse(seal.sig);
        m.base = b; if (o === null) delete m.origin; else m.origin = o;
        rev.n++;
        (ctx().saveMetadata ?? ctx().saveMetadataDebounced)?.();
        return true;
    } catch (e) { ssNote('봉인 확인', e); return false; }
}
export async function saveMeta(now = false) {
    rev.n++;
    sealMeta();
    const c = ctx();
    if (now || !c.saveMetadata) { clearTimeout(metaTimer); metaTimer = null; return (c.saveMetadata ?? c.saveMetadataDebounced)?.(); }
    clearTimeout(metaTimer);
    metaChat = chatNow();
    metaTimer = setTimeout(() => { metaTimer = null; if (metaChat === chatNow()) ctx().saveMetadata?.()?.catch?.(() => { /* 실리가 알려 줌 */ }); }, 1000);
}
try {
    const outside = (e) => { if (metaTimer && !e.target?.closest?.('.ss-scope, dialog')) flushMeta(); };
    document.addEventListener('pointerdown', outside, { capture: true, passive: true });
    document.addEventListener('keydown', outside, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushMeta(); });
    window.addEventListener('pagehide', () => flushMeta());
} catch (e) { ssNote('나갈 때 저장 걸기 실패', e); }
// on: 주입문을 만드는 중 (가린 칸은 꺼진 것처럼) · skip: 이 칸 하나를 뺀 주입문을 재 볼 때 (칸별 토큰)
export const INJ = { on: false, skip: null };
// 🧹 기능 정리로 숨긴 것 (모든 채팅) — 숨긴 칸은 꺼진 것과 같고, 관리 창 · 추천 · 스타일 고르기에도 안 나온다
export const tidyHidden = (kind, id) => { const t = settings().tidy; return !!t && Array.isArray(t[kind]) && t[kind].includes(id); };
// 🧹 숨긴 부가 기능은 확장 설정 서랍 · 관리 › 전체 설정의 체크 칸도 안 보이게 (한 번 걸어 두면 다시 그려도 그대로 · 시작할 때와 정리할 때 부른다)
export function applyTidyStyle() {
    try {
        const keys = (settings().tidy?.flags ?? []).filter(k => /^[A-Za-z0-9_]+$/.test(k));
        let el = document.getElementById('ss-tidy-style');
        if (!keys.length) { el?.remove(); return; }
        if (!el) { el = document.createElement('style'); el.id = 'ss-tidy-style'; document.head.appendChild(el); }
        el.textContent = `${keys.map(k => `body :is(#ss-settings, .ss-set-body, .ss-scope) label:has(> input[data-s="${k}"])`).join(',\n')} { display: none !important; }`;
    } catch (e) { ssNote('기능 정리 숨김', e); }
}
export function modOnRaw(id, meta = getMeta()) {
    if (!meta) return false;
    if (INJ.skip === id) return false;
    if (tidyHidden('mods', id)) return false;
    if (GLOBAL_OFF[id] && settings()[GLOBAL_OFF[id]] === false) return false; // v2.7.3: 모든 채팅에서 끈 칸
    if (meta.mods?.[id] === false) return false;
    const need = MOD[id]?.needs;
    if (need && meta.mods?.[need] === false) return false;
    return true;
}
// 🙈 가리기 (채팅마다): 켜져 있는 칸이라도 AI에게 보내는 글을 만드는 동안엔 꺼진 것처럼 — 직접 다시 켤 때까지 유지
// INJ.on은 buildInjection이 도는 동안만 true → 화면·버튼·자동 반영은 그대로, 주입문에서만 빠진다
export const isHidden = (id, meta = getMeta()) => !!meta?.hide?.[id];
export function modOn(id, meta = getMeta()) {
    if (!modOnRaw(id, meta)) return false;
    if (INJ.on && meta?.hide?.[id]) return false;
    return true;
}
export function isActive() {
    if (!settings().enabled) return false;
    if (!ctx().getCurrentChatId?.()) return false;
    return !getMeta()?.off;
}
export const ready = () => !!getMeta()?.base;
export const diffOf = (meta = getMeta()) => DIFFS[meta?.difficulty] ? meta.difficulty : 'normal';

// ───── 데이터 모양 ─────

export const EMPTY = {
    core: () => ({ title: '', genre: '', summary: '', tone: '', userRole: '', rules: '', canon: '' }),
    profile: () => ({ mode: 'minimal', list: [] }),
    stats: () => ({ bars: [], attrs: [], conds: [] }),
    dice: () => ({ system: 'd20', rules: '', quick: [], log: [] }),
    wallet: () => ({ currency: '골드', cash: 0, items: [], prices: [], fx: { unit: '', rate: 0 }, loans: [], regular: [], jobs: [] }),
    shop: () => ({ shops: [] }),
    home: () => ({ name: '', desc: '', rooms: [], storage: [], trash: [] }),
    rel: () => ({ user: [], pairs: [], stages: clone(LOVE_STAGES), life: [], ...LOVE_AXES }),
    map: () => ({ name: '', here: '', places: [] }),
    calendar: () => ({ y: 1, m: 1, d: 1, time: '아침', era: '', months: clone(DEFAULT_MONTHS), week: [...DEFAULT_WEEK], times: [...DEFAULT_TIMES], events: [], weather: '', autoWeather: true }),
    contact: () => ({ mode: 'phone', app: '메신저', contacts: [], threads: {}, unread: {}, recent: [], couriers: clone(COURIER_PRESETS.slice(0, 1)), express: { name: '급행 (퀵)', fee: 100 } }),
    quest: () => ({ list: [] }),
    news: () => ({ name: '', items: [] }),
    gossip: () => ({ name: '', issues: [] }),
    board: () => ({ name: '', posts: [] }),
    ach: () => ({ list: [], endings: [] }),
    memo: () => ({ list: [] }),
    fate: () => ({ curses: [], deck: [], drawChance: 20, rules: [], log: [], today: null, readings: [], births: [], omen: null, feeTarot: 0, feeOrb: 0, feeShaman: 0, feeGut: 0 }),
    sns: () => ({ name: '', posts: [] }),
    music: () => ({ taste: '', now: null, log: [] }),
    custom: () => ({ tabs: [] }),
};

// 🔮 점집: 인물의 타고난 것 (생년월일 · 시 · 띠 · 별자리 …) — 점괘 기록과 명식 목록이 같은 모양을 쓴다
export const FORTUNE_PERSON_KEYS = ['birth', 'hour', 'age', 'zodiac', 'star', 'element', 'place', 'nature'];
export const fortunePerson = (p) => Object.fromEntries(FORTUNE_PERSON_KEYS.map(k => [k, short(str(p?.[k]).trim(), k === 'nature' ? 400 : 80)]));
const msgN = (x) => ({
    id: str(x.id) || uid(), from: x.from === 'me' ? 'me' : 'them', text: str(x.text), date: str(x.date),
    at: Number.isFinite(Number(x.at)) ? Number(x.at) : null, arrive: Number.isFinite(Number(x.arrive)) ? Number(x.arrive) : null,
    courier: str(x.courier), express: !!x.express, rush: !!x.rush, pending: !!x.pending, fee: num(x.fee, 0), edited: !!x.edited, ping: !!x.ping,
    kind: MSG_KINDS.includes(x.kind) ? x.kind : 'text', pin: !!x.pin, read: !!x.read, react: str(x.react), orig: str(x.orig), amount: num(x.amount, 0),
    ...(str(x.who).trim() ? { who: str(x.who).trim() } : {}), // 👥 단체방: 누가 한 말인지
    ...(Array.isArray(x.enc) && x.enc.some(e => e && (e.kind === 'gift' || e.kind === 'money')) ? { enc: x.enc.filter(e => e && (e.kind === 'gift' || e.kind === 'money')).map(e => ({ kind: e.kind, text: str(e.text), amount: num(e.amount, 0) })) } : {}), // 편지에 동봉한 물건 · 돈 (지울 때 돌려받기)
});
// 연락 메시지 종류: 글 · 사진/음성/파일/위치 묘사 · 선물 · 송금 · 삭제됨
export const MSG_KINDS = ['text', 'photo', 'voice', 'file', 'place', 'gift', 'money', 'deleted'];
const KIND_TAG = { photo: '사진', voice: '음성 메시지', file: '파일', place: '위치', gift: '선물' };
// AI에게 보여 줄 메시지 한 줄 (첨부·반응·삭제 표시 포함)
export function msgText(m, max = 0) {
    const t = max ? short(m.text, max) : m.text;
    let out;
    if (m.kind === 'deleted') out = `[보냈다가 지운 메시지${m.read && m.orig ? ` — 이미 읽음: ${max ? short(m.orig, max) : m.orig}` : ''}]`;
    else if (m.kind === 'money') out = `[송금 ${fmtNum(m.amount)}]${t ? ` ${t}` : ''}`;
    else if (KIND_TAG[m.kind]) out = `[${KIND_TAG[m.kind]}: ${t}]`;
    else out = t;
    return m.react ? `${out} (반응 ${m.react})` : out;
}
const courierN = (c) => ({ name: str(c.name), icon: str(c.icon, '✉️') || '✉️', min: clamp(Math.round(num(c.min, 1)), 0, 60), max: clamp(Math.round(num(c.max, num(c.min, 1))), 0, 60), fee: Math.max(0, num(c.fee, 0)), note: str(c.note) });

export const NORM = {
    core: (d0) => { const d = d0 && typeof d0 === 'object' ? d0 : {}; return { title: str(d.title), genre: str(d.genre), summary: str(d.summary), tone: str(d.tone), userRole: str(d.userRole), rules: str(d.rules), canon: str(d.canon) }; }, // AI가 세계 핵심을 null · 글로 돌려줘도 멈추지 않게 (검수)
    profile: (d) => ({
        mode: d.mode === 'detailed' ? 'detailed' : 'minimal',
        list: arr(d.list).filter(p => p?.name).map(p => ({
            name: str(p.name), role: ['user', 'main', 'npc'].includes(p.role) ? p.role : 'npc', summary: str(p.summary),
            fields: arr(p.fields).filter(f => f && (f.k || f.v)).map(f => ({ k: str(f.k), v: str(f.v) })),
            home: str(p.home), sched: str(p.sched),
            ...(str(p.emoji).trim() ? { emoji: str(p.emoji).trim().slice(0, 8) } : {}), // 얼굴 이모지 (v2.9 · 프로필 카드의 얼굴을 눌러 바꿈 — 관계에 없는 사람 · 나 자신도)
        })),
    }),
    stats: (d) => ({
        // v2.9 욕구 게이지: decay = 하루에 줄어드는 양(음수면 저절로 참) · stages = 「50:출출함, 25:배고픔」(이하일 때 · 「70+:불안」은 이상일 때) · zero = 바닥(0)일 때 하루마다 다른 게이지에 「체력 -10」
        //   rem · zrem = 소수점 나머지 · stg = 지금 단계 이름 (ops.js needsTick이 적는다). 이 항목이 하나도 없으면 예전과 똑같이 계산한다
        bars: arr(d.bars).filter(b => b?.name).map(b => { const max = Math.max(1, num(b.max, 100)); return { name: str(b.name), cur: clamp(num(b.cur, max), 0, max), max, color: str(b.color), desc: str(b.desc),
            ...(num(b.decay, 0) ? { decay: clamp(num(b.decay, 0), -1000, 1000) } : {}), ...(str(b.stages).trim() ? { stages: str(b.stages).trim() } : {}), ...(str(b.zero).trim() ? { zero: str(b.zero).trim() } : {}),
            ...(num(b.rem, 0) ? { rem: num(b.rem, 0) } : {}), ...(num(b.zrem, 0) ? { zrem: num(b.zrem, 0) } : {}), ...(str(b.stg) ? { stg: str(b.stg) } : {}) }; }),
        attrs: arr(d.attrs).filter(a => a?.name).map(a => ({ name: str(a.name), val: Math.round(num(a.val, 0)), desc: str(a.desc) })),
        conds: arr(d.conds).filter(c => c?.name).map(c => ({ name: str(c.name), desc: str(c.desc), ...(str(c.auto) ? { auto: str(c.auto) } : {}) })), // auto = 이 상태를 만든 욕구 게이지 이름 (단계가 바뀌면 같이 바뀜)
        ...(typeof d.tick === 'number' && Number.isFinite(d.tick) ? { tick: d.tick, days: !!d.days } : {}), // 욕구를 마지막으로 계산한 때 (날 · 달력이 없으면 턴 ÷ 6)
        ...(d.mods && typeof d.mods === 'object' && Object.keys(d.mods).length ? { mods: Object.fromEntries(Object.entries(d.mods).filter(([k, v]) => k && Number.isFinite(Number(v))).slice(0, 12).map(([k, v]) => [str(k), clamp(Number(v), -100, 300)])) } : {}), // 👕 입은 것이 욕구에 주는 보정 (%)
        ...(Number(d.speed) > 0 && Number(d.speed) !== 1 ? { speed: clamp(Number(d.speed), 0.25, 4) } : {}), // 욕구가 줄어드는 속도 (생활 틀 › 느긋 · 보통 · 빠듯 · 혹독)
        ...(arr(d.nlog).length ? { nlog: arr(d.nlog).filter(x => x?.b).slice(-6).map(x => ({ b: str(x.b), n: num(x.n, 0), why: str(x.why), t: num(x.t, 0) })) } : {}), // 저절로 바뀐 것 (최근 6개 · 화면용)
    }),
    dice: (d) => ({
        system: ['d20', 'd100'].includes(d.system) ? d.system : 'd20', rules: str(d.rules),
        quick: arr(d.quick).filter(q => q?.name).map(q => ({ name: str(q.name), attr: str(q.attr), dc: num(q.dc, 0) })),
        log: arr(d.log).filter(l => l && typeof l === 'object').slice(-30), // 깨진 기록(null · 글자)이 섞이면 주사위 탭이 안 열렸다
    }),
    wallet: (d) => ({
        currency: str(d.currency, '골드') || '골드', cash: num(d.cash, 0),
        items: arr(d.items).filter(i => i?.name).map(i => ({ name: str(i.name), qty: Math.max(0, Math.round(num(i.qty, 1))), desc: str(i.desc), effect: str(i.effect) })),
        prices: arr(d.prices).filter(p => p?.name).map(p => ({ name: str(p.name), price: Math.max(0, num(p.price, 0)) })).slice(0, 40),
        fx: { unit: str(d.fx?.unit), rate: Math.max(0, num(d.fx?.rate, 0)) },
        loans: arr(d.loans).filter(l => l && num(l.owed, 0) > 0).map(l => ({
            id: str(l.id) || uid(), kind: ['bank', 'shark', 'pawn'].includes(l.kind) ? l.kind : 'bank', lender: str(l.lender),
            principal: Math.max(0, num(l.principal, 0)), owed: Math.max(0, num(l.owed, 0)), due: Number.isFinite(Number(l.due)) && l.due !== null && l.due !== '' ? Number(l.due) : null,
            item: str(l.item), status: ['open', 'paid', 'late', 'lost'].includes(l.status) ? l.status : 'open',
        })).slice(-30),
        regular: arr(d.regular).filter(r => r?.name).map(r => ({ name: str(r.name), amount: num(r.amount, 0), every: ['day', 'week', 'month'].includes(r.every) ? r.every : 'month', next: Number.isFinite(Number(r.next)) && r.next !== null && r.next !== '' ? Number(r.next) : null })),
        jobs: arr(d.jobs).filter(j => j?.name).map(j => ({ name: str(j.name), pay: Math.max(0, num(j.pay, 0)), effect: str(j.effect) })),
    }),
    shop: (d) => ({
        shops: arr(d.shops).filter(s => s?.name).map(s => ({
            name: str(s.name), desc: str(s.desc), place: str(s.place),
            items: arr(s.items).filter(i => i?.name).map(i => ({ name: str(i.name), price: Math.max(0, num(i.price, 0)), desc: str(i.desc), kind: i.kind === 'deco' ? 'deco' : 'item', stock: Math.round(num(i.stock, -1)), ...(str(i.effect).trim() ? { effect: str(i.effect).trim() } : {}) })), // effect (v2.9): 사면 소지품에 그 효과가 붙어서 「사용」할 수 있다
        })),
    }),
    home: (d) => ({
        name: str(d.name), desc: str(d.desc),
        rooms: arr(d.rooms).filter(r => r?.name).map(r => ({ name: str(r.name), desc: str(r.desc), decor: arr(r.decor).map(String).filter(Boolean), ...(r.floor !== '' && r.floor != null && Number.isFinite(Number(r.floor)) && Math.round(Number(r.floor)) !== 0 ? { floor: clamp(Math.round(Number(r.floor)), -5, 30) } : {}) })), // floor = 몇 층 (선택 · 집 안 그림에서 층별로 나눔 · 0층은 없다 → 안 적은 것(1층)으로)
        storage: arr(d.storage).map(String).filter(Boolean),
        trash: arr(d.trash).filter(t => t?.name).map(t => ({ name: str(t.name), date: str(t.date) })).slice(-20),
    }),
    rel: (d) => {
        const stages = arr(d.stages).filter(x => x?.name).map(x => ({ name: str(x.name), at: clamp(Math.round(num(x.at, 0)), -100, 100), trust: clamp(Math.round(num(x.trust, -100)), -100, 100), unlock: str(x.unlock), ...(x.love === true || x.love === 'true' ? { love: true } : x.love === false || x.love === 'false' ? { love: false } : {}) })).sort((a, b) => a.at - b.at);
        return {
            user: arr(d.user).filter(r => r?.name).map(r => ({ name: str(r.name), label: str(r.label), aff: clamp(Math.round(num(r.aff, 0)), -100, 100), trust: clamp(Math.round(num(r.trust, 0)), -100, 100), memo: str(r.memo), stage: Number.isFinite(Number(r.stage)) && r.stage !== null && r.stage !== '' ? Math.round(Number(r.stage)) : -1, jealous: clamp(Math.round(num(r.jealous, 0)), 0, 100), met: str(r.met), bond: r.bond === true || r.bond === 'true', ...(r.emoji ? { emoji: str(r.emoji).slice(0, 8) } : {}), ...(r.mind?.text ? { mind: { text: str(r.mind.text), turn: Math.round(num(r.mind.turn, 0)) } } : {}), ...(r.noLove === true || r.noLove === 'true' ? { noLove: true } : {}), likes: str(r.likes), dislikes: str(r.dislikes), concern: str(r.concern), ...(['dead', 'left'].includes(r.out) ? { out: r.out } : {}) })),
            pairs: arr(d.pairs).filter(p => p?.a && p?.b).map(p => ({ a: str(p.a), b: str(p.b), label: str(p.label), memo: str(p.memo), ...(p.aff !== null && p.aff !== '' && p.aff !== undefined && Number.isFinite(Number(p.aff)) ? { aff: clamp(Math.round(Number(p.aff)), -100, 100) } : {}) })), // aff는 「인물끼리 호감」을 쓴 쌍에만 생김
            stages: stages.length ? stages : (() => { const st = clone(str(d.affName) ? LOVE_STAGES : DEFAULT_STAGES); if (!viewTr()) return st; const en = toEnglish(st); try { app.addTrPairs?.(usedPairs(en)); } catch { /* 사전 없어도 저장은 영어 */ } return en; })(), // 영어 저장이면 기본 단계도 영어로
            affName: short(str(d.affName), 12), trustName: short(str(d.trustName), 12),
            life: arr(d.life).filter(x => x?.text).map(x => ({ who: str(x.who), text: str(x.text), date: str(x.date) })).slice(-20),
            // 🔗 합친 이름 표 (합친 적이 있을 때만 생김)
            ...(d.alias && typeof d.alias === 'object' && !Array.isArray(d.alias) && Object.keys(d.alias).length ? { alias: Object.fromEntries(Object.entries(d.alias).filter(([k, v]) => k && typeof v === 'string' && v).map(([k, v]) => [norm(k), v])) } : {}),
        };
    },
    map: (d) => ({
        name: str(d.name), here: str(d.here), ...(str(d.spot) ? { spot: str(d.spot) } : {}), // spot = 건물 안 어디 (층 · 방 · 선택)
        places: arr(d.places).filter(p => p?.name).map(p => ({ name: str(p.name), desc: str(p.desc), kind: str(p.kind), x: clamp(num(p.x, NaN), 0, 100), y: clamp(num(p.y, NaN), 0, 100), links: arr(p.links).map(String).filter(Boolean), known: p.known !== false, area: str(p.area), fare: Math.max(0, num(p.fare, 0)), icon: [...str(p.icon).trim()].slice(0, 2).join(''), ...(arr(p.floors).map(String).filter(Boolean).length ? { floors: arr(p.floors).map(x => String(x).trim()).filter(Boolean).slice(0, 12) } : {}) })), // floors = 건물 안 · 층 (아래층부터 · 선택)
    }),
    calendar: (d) => {
        const months = arr(d.months).filter(m => m?.name).map(m => ({ name: str(m.name), days: clamp(Math.round(num(m.days, 30)), 1, 99) }));
        const ms = months.length ? months : clone(DEFAULT_MONTHS);
        const m = clamp(Math.round(num(d.m, 1)), 1, ms.length);
        return {
            y: Math.round(num(d.y, 1)), m, d: clamp(Math.round(num(d.d, 1)), 1, ms[m - 1].days), time: str(d.time, '아침'), era: str(d.era),
            months: ms, week: arr(d.week).length ? arr(d.week).map(String) : [...DEFAULT_WEEK], times: arr(d.times).length ? arr(d.times).map(String) : [...DEFAULT_TIMES],
            events: arr(d.events).filter(e => e?.title).map(e => ({ y: e.y === undefined || e.y === null || e.y === '' ? null : Math.round(num(e.y, 0)), m: clamp(Math.round(num(e.m, 1)), 1, ms.length), d: clamp(Math.round(num(e.d, 1)), 1, 99), title: str(e.title), desc: str(e.desc), repeat: e.repeat === 'yearly' ? 'yearly' : 'once' })),
            weather: str(d.weather), autoWeather: d.autoWeather !== false,
            ...(['24', '12', 'both'].includes(d.clock) ? { clock: d.clock } : {}), // 🕐 시간 적는 법 (안 고르면 열쇠 자체가 없다 = 예전 자료와 같음)
        };
    },
    contact: (d) => {
        const threads = {};
        for (const [k, v] of Object.entries(d.threads && typeof d.threads === 'object' ? d.threads : {})) {
            threads[k] = arr(v).filter(x => x && (x.text || x.pending || (x.kind && x.kind !== 'text'))).map(msgN).slice(-THREAD_MAX); // 송금·삭제됨은 글이 없어도 남긴다
        }
        // 🕵 최면 어플 (v2.7.23): 연락과 따로 쌓이는 대화 (본편 AI에게 안 감)
        const truth = {};
        for (const [k, v] of Object.entries(d.truth && typeof d.truth === 'object' ? d.truth : {})) { const t = arr(v).filter(x => x && x.text).map(msgN).slice(-THREAD_MAX); if (t.length) truth[k] = t; }
        // 👥 단체방 (v2.8): { 방 이름: { members: [이름…], msgs: [말풍선…] } } — 연락과 따로 쌓이고 본편 AI에게 안 감
        const rooms = Object.create(null);
        for (const [k, v] of Object.entries(d.rooms && typeof d.rooms === 'object' ? d.rooms : {})) {
            const members = [...new Set(arr(v?.members).map(x => str(x).trim()).filter(Boolean))].slice(0, 8);
            if (members.length >= 2) rooms[k] = { members, msgs: arr(v?.msgs).filter(x => x && x.text).map(msgN).slice(-THREAD_MAX) };
        }
        const mode = ['phone', 'instant', 'letter'].includes(d.mode) ? d.mode : 'phone';
        const couriers = arr(d.couriers).filter(c => c?.name).map(courierN);
        return {
            mode, app: str(d.app, CONTACT_MODES[mode].app) || CONTACT_MODES[mode].app,
            contacts: arr(d.contacts).filter(c => c?.name).map(c => ({ name: str(c.name), handle: str(c.handle), status: str(c.status), courier: str(c.courier), reflect: ['always', 'pinned', 'never'].includes(c.reflect) ? c.reflect : '', blocked: !!c.blocked, ...(str(c.prompt).trim() ? { prompt: short(str(c.prompt).trim(), 1200) } : {}), ...(c.away && Number.isFinite(Number(c.away.until)) ? { away: { why: str(c.away.why), until: Number(c.away.until), t: Number(c.away.t) || 0 } } : {}) })), // away = 🔕 상대가 연락을 꺼 둠 (v2.7.23)
            summaries: Object.fromEntries(Object.entries(d.summaries && typeof d.summaries === 'object' ? d.summaries : {}).filter(([, v]) => v?.text).map(([k, v]) => [k, { text: str(v.text), n: Math.max(0, Math.round(num(v.n, 0))), ...(v.manual === true ? { manual: true } : {}) }])),
            threads, ...(Object.keys(truth).length ? { truth } : {}), ...(Object.keys(rooms).length ? { rooms: { ...rooms } } : {}), unread: d.unread && typeof d.unread === 'object' ? { ...d.unread } : {},
            recent: arr(d.recent).map(String).filter(Boolean).slice(0, 30),
            couriers: couriers.length ? couriers : clone(COURIER_PRESETS.slice(0, 1)),
            express: (() => { const dn = viewTr() ? 'Express' : '급행 (퀵)'; return { name: str(d.express?.name, dn) || dn, fee: Math.max(0, num(d.express?.fee, 100)) }; })(),
        };
    },
    quest: (d) => ({
        list: arr(d.list).filter(q => q?.title).map(q => ({
            id: str(q.id) || uid(), title: str(q.title), giver: str(q.giver), desc: str(q.desc), place: str(q.place), deadline: str(q.deadline),
            reward: str(q.reward), cash: Math.max(0, num(q.cash, 0)), items: arr(q.items).map(String).filter(Boolean),
            status: ['open', 'active', 'done', 'failed'].includes(q.status) ? q.status : 'open',
            steps: arr(q.steps).map(s => (typeof s === 'string' ? { text: s, done: false } : { text: str(s?.text), done: !!s?.done })).filter(s => s.text),
            paid: !!q.paid,
            ...(q.ask ? { ask: true } : {}), // v2.9: AI가 「완료」라고 적었지만 단계가 남아 있어 확인을 기다리는 중
            ...(q.check && typeof q.check === 'object' ? { check: { attr: str(q.check.attr), dc: Math.max(2, Math.min(30, num(q.check.dc, 12))) } } : {}), // 🎲 완료 판정 (v2.7.3)
            ...(['crit', 'ok', 'fail', 'fumble'].includes(q.judge) ? { judge: q.judge } : {}),
            ...(Number.isFinite(Number(q.since)) && q.since !== null && q.since !== '' ? { since: Math.round(Number(q.since)) } : {}), // 받은 날 (달력 날짜 번호 · 「3일 안에」 계산용 · v2.7.5)
            ...(Number.isFinite(Number(q.due)) && q.due !== null && q.due !== '' && str(q.dueFor) === str(q.deadline) ? { due: Math.round(Number(q.due)), dueFor: str(q.deadline) } : {}), // 기한 날 (달력 날짜 번호 · 기한 글이 바뀌면 다시 계산)
            ...(q.expired ? { expired: true } : {}),
        })),
        archive: arr(d.archive),
        gone: arr(d.gone).map(String).filter(Boolean).slice(-60), // 내가 지운 퀘스트 이름 — AI가 다시 살리지 못하게 (v2.7.3)
    }),
    news: (d) => ({ name: str(d.name), items: arr(d.items).filter(x => x?.title).map(x => ({ id: str(x.id) || uid(), title: str(x.title), body: str(x.body), tag: str(x.tag), date: str(x.date), read: !!x.read })), archive: arr(d.archive) }),
    gossip: (d) => ({ name: str(d.name), issues: arr(d.issues).filter(x => x?.title).map(x => ({ id: str(x.id) || uid(), title: str(x.title), body: str(x.body), about: arr(x.about).map(String).filter(Boolean), heat: clamp(Math.round(num(x.heat, 2)), 1, 3), date: str(x.date), read: !!x.read })), archive: arr(d.archive) }),
    board: (d) => ({
        name: str(d.name),
        posts: arr(d.posts).filter(p => p?.title).map(p => ({
            id: str(p.id) || uid(), author: str(p.author, '익명') || '익명', title: str(p.title), body: str(p.body), date: str(p.date), mine: !!p.mine, tag: str(p.tag),
            replies: arr(p.replies).filter(r => r?.text).map(r => ({ id: str(r.id) || uid(), author: str(r.author, '익명') || '익명', text: str(r.text), mine: !!r.mine })),
        })),
        archive: arr(d.archive),
    }),
    ach: (d) => ({
        list: arr(d.list).filter(a => a?.name).map(a => ({ name: str(a.name), desc: str(a.desc), done: !!a.done, hidden: !!a.hidden, at: str(a.at) })),
        endings: arr(d.endings).filter(e => e?.name).map(e => ({ name: str(e.name), when: str(e.when), desc: str(e.desc), done: !!e.done, at: str(e.at), on: !!e.on })),
    }),
    memo: (d) => ({ list: arr(d.list).filter(m => m?.text).map(m => ({ id: str(m.id) || uid(), text: str(m.text), by: m.by === 'ai' ? 'ai' : 'user', inject: m.inject !== false, pin: !!m.pin })) }),
    fate: (d) => ({
        curses: arr(d.curses).filter(c => c?.name).map(c => ({
            name: str(c.name), desc: str(c.desc), effects: (Array.isArray(c.effects) ? c.effects : String(c.effects ?? '').split(/\s*[,;\n]\s*/)).map(String).map(x => x.trim()).filter(Boolean),
            days: Number.isFinite(Number(c.days)) && Number(c.days) > 0 ? Math.round(Number(c.days)) : null, since: Number.isFinite(Number(c.since)) && c.since !== null && c.since !== '' ? Number(c.since) : null,
            cure: str(c.cure), kind: c.kind === 'bless' ? 'bless' : 'curse', auto: str(c.auto),
        })),
        deck: arr(d.deck).filter(x => x?.title).map(x => ({ title: str(x.title), desc: str(x.desc), kind: ['luck', 'bad', 'event'].includes(x.kind) ? x.kind : 'event', effect: str(x.effect) })).slice(0, 60),
        drawChance: clamp(Math.round(num(d.drawChance, 20)), 0, 100),
        rules: arr(d.rules).filter(r => r?.when && r?.then).map(r => ({ name: str(r.name) || str(r.when), when: str(r.when), then: str(r.then), on: !!r.on })),
        log: arr(d.log).filter(x => x?.title).map(x => ({ title: str(x.title), kind: str(x.kind), date: str(x.date) })).slice(-30),
        today: d.today?.title ? { title: str(d.today.title), desc: str(d.today.desc), day: num(d.today.day, 0) } : null,
        // 🔮 점집 (v2.8.1): 지난 점괘 · 인물별 생년월일(명식) · 오늘의 점괘 한 줄 · 복채 (0 = 물가에 맞춰 자동)
        readings: arr(d.readings).filter(r => r?.who && r?.method).map(r => ({
            id: str(r.id) || uid(), who: str(r.who), method: ['tarot', 'orb', 'shaman', 'gut'].includes(r.method) ? r.method : 'tarot', topic: str(r.topic), q: str(r.q),
            when: str(r.when), basis: r.basis === 'real' ? 'real' : 'story', fee: Math.max(0, Math.round(num(r.fee, 0))), draw: arr(r.draw).map(x => str(x)).filter(Boolean).slice(0, 12),
            teller: str(r.teller), summary: str(r.summary), sections: arr(r.sections).filter(x => x?.text).map(x => ({ title: str(x.title), text: str(x.text), ...(['spirit', 'vision'].includes(x.voice) ? { voice: x.voice } : {}) })).slice(0, 16),
            spirit: str(r.spirit),
            luck: arr(r.luck).filter(l => l?.a && l?.v).map(l => ({ a: str(l.a), v: str(l.v) })).slice(0, 8),
            omen: str(r.omen), advice: str(r.advice), lucky: str(r.lucky), rite: str(r.rite), result: str(r.result), person: fortunePerson(r.person),
        })).slice(-12),
        births: arr(d.births).map(b => ({ name: str(b?.name), ...fortunePerson(b) })).filter(b => b.name).slice(0, 80),
        omen: d.omen?.text ? { id: str(d.omen.id), who: str(d.omen.who), method: str(d.omen.method), text: str(d.omen.text), day: num(d.omen.day, 0) } : null,
        feeTarot: Math.max(0, Math.round(num(d.feeTarot, 0))), feeOrb: Math.max(0, Math.round(num(d.feeOrb, 0))), feeShaman: Math.max(0, Math.round(num(d.feeShaman, 0))), feeGut: Math.max(0, Math.round(num(d.feeGut, 0))),
    }),
    sns: (d) => ({
        name: str(d.name),
        posts: arr(d.posts).filter(p => p?.text || p?.pic).map(p => ({
            id: str(p.id) || uid(), author: str(p.author, '익명') || '익명', text: str(p.text), pic: str(p.pic), tags: str(p.tags), likes: Math.max(0, Math.round(num(p.likes, 0))), date: str(p.date), mine: !!p.mine, liked: !!p.liked,
            replies: arr(p.replies).filter(r => r?.text).map(r => ({ id: str(r.id) || uid(), author: str(r.author, '익명') || '익명', text: str(r.text), mine: !!r.mine })).slice(-30),
        })),
        archive: arr(d.archive),
    }),
    music: (d) => {
        const song = (x) => (x?.title ? { title: str(x.title), artist: str(x.artist), mood: str(x.mood), why: str(x.why), date: str(x.date) } : null);
        return { taste: str(d.taste), now: song(d.now), log: arr(d.log).map(song).filter(Boolean).slice(-30) };
    },
    custom: (d) => ({
        tabs: arr(d.tabs).filter(t => t?.name).map(t => ({
            name: str(t.name), icon: str(t.icon, '📌') || '📌', note: str(t.note), inject: t.inject !== false,
            fields: arr(t.fields).filter(f => f?.k).map(f => {
                const type = ['num', 'bar', 'text'].includes(f.type) ? f.type : (Number.isFinite(Number(f.v)) && f.v !== '' && f.v !== null ? 'num' : 'text');
                const max = Math.max(1, num(f.max, 100));
                return { k: str(f.k), type, v: type === 'text' ? str(f.v) : type === 'bar' ? clamp(num(f.v, 0), 0, max) : num(f.v, 0), max, desc: str(f.desc) };
            }),
        })),
    }),
};
export function normalize(mod, d) {
    try { return tidy(mod, NORM[mod](d && typeof d === 'object' ? d : {})); } catch (e) { ssWarn(LOG, 'normalize', mod, e); return EMPTY[mod](); }
}
// ───── 자동 정리: 오래된 소식·끝난 퀘스트는 보관함(제목만)으로 ─────
export const THREAD_MAX = 200; // 연락: 한 사람과의 대화는 최근 200개까지 보관 (v2.7.23 · 예전 50 — 따로 보관이라 기록이 안 쌓여서 늘림 · AI에게 가는 양은 설정 contactRecall이 정함)
export const ARC_KEEP = { news: 40, gossip: 30, board: 40, quest: 15, sns: 40 };
const arcItem = (x) => ({ title: str(x?.title ?? (x?.text ? `${x.author ?? ''}: ${short(x.text, 40)}` : '')), date: str(x?.date), status: str(x?.status) });
export function tidy(mod, d) {
    if (!d || typeof d !== 'object') return d;
    const keep = ARC_KEEP[mod];
    if (!keep) return d;
    const key = { news: 'items', gossip: 'issues', board: 'posts', quest: 'list', sns: 'posts' }[mod];
    const list = arr(d[key]);
    let moved = [];
    if (mod === 'quest') {
        const ends = list.filter(q => q.status === 'done' || q.status === 'failed');
        if (ends.length > keep) {
            const drop = new Set(ends.slice(0, ends.length - keep));
            moved = [...drop];
            d[key] = list.filter(q => !drop.has(q));
        }
    } else if (list.length > keep) {
        moved = list.slice(0, list.length - keep);
        d[key] = list.slice(-keep);
    }
    d.archive = [...arr(d.archive).map(arcItem), ...moved.map(arcItem)].filter(x => x.title).slice(-200);
    return d;
}

// AI에게 알려 주는 각 칸의 JSON 모양
export const SCHEMA = {
    core: `{"title":"세계관/이야기 이름","genre":"장르","summary":"세계관 요약 3~6문장 (배경·시대·분위기·핵심 갈등)","tone":"서술 톤","userRole":"{{user}}의 위치·역할 한 줄","rules":"이 세계의 중요한 규칙·상식 몇 줄","canon":"원작 이름 (2차 창작일 때만)"}`,
    profile: `{"mode":"minimal|detailed","list":[{"name":"이름","role":"user|main|npc","summary":"한두 줄 소개","fields":[{"k":"항목(나이/외모/성격/말투/능력/좋아하는 것/비밀 등)","v":"내용"}],"home":"사는 곳 (지도 장소 이름)","sched":"일과 — 시간대:장소, 쉼표로 (예: 아침:시장, 낮:항구, 밤:집)"}]}`,
    stats: `{"bars":[{"name":"체력","cur":100,"max":100,"color":"#e2524a","desc":"0이 되면…"}],"attrs":[{"name":"힘","val":2,"desc":"판정 보정치, 보통 -2~+5"}],"conds":[{"name":"상태 이상/버프 이름","desc":"효과"}]}`,
    dice: `{"system":"d20|d100","rules":"이 세계의 판정 규칙 몇 줄 (대성공/대실패의 의미 등)","quick":[{"name":"자주 쓰는 판정 이름(예: 은신)","attr":"보정에 쓸 능력치 이름","dc":12}]}`,
    wallet: `{"currency":"화폐 단위","cash":1000,"items":[{"name":"소지품","qty":1,"desc":"설명","effect":"(쓰면 바뀌는 것, 예: 체력 +20 / 없으면 빈칸)"}],"prices":[{"name":"흔한 물건·서비스 (빵 한 개, 한 끼 식사, 여관 1박, 말 한 필, 한 달 월세 등)","price":10}],"jobs":[{"name":"{{user}}가 할 수 있는 일거리","pay":50,"effect":"일하면 바뀌는 것 (예: 기력 -20)"}],"regular":[{"name":"정기 수입·지출 (월급, 월세 등)","amount":-300,"every":"day|week|month"}],"fx":{"unit":"현실 화폐 (예: 원)","rate":0}}  (fx.rate = 이 화폐 1의 현실 가치, 모르면 0)`,
    shop: `{"shops":[{"name":"상점 이름","desc":"설명","place":"있는 장소","items":[{"name":"상품","price":100,"desc":"설명","kind":"item|deco (deco = 본거지에 놓는 가구·장식)","stock":-1}]}]}`,
    home: `{"name":"본거지 이름","desc":"설명","rooms":[{"name":"방/구역","desc":"지금 모습","decor":["놓여 있는 가구·장식 이름"]}],"storage":["창고에 있는 미배치 가구"]}`,
    rel: `{"user":[{"name":"캐릭터","label":"{{user}}와의 관계 이름","aff":0,"trust":0,"memo":"관계 메모","met":"처음 만난 날 (예: 3월 2일 · 모르면 빈칸)"}],"pairs":[{"a":"캐릭터A","b":"캐릭터B","label":"관계","memo":"메모"}],"stages":[{"name":"관계 단계 이름","at":0,"trust":-100,"unlock":"이 단계에서 새로 생기는 것 (호칭·말투·행동)","love":false}],"affName":"애정","trustName":"우정"}  (aff = 💗 애정: {{user}}에 대한 연애 감정만 — 설렘·끌림·스킨십·고백으로 오르고, 친구·가족·동료는 낮게 · trust = 🤝 우정: 친함·믿음·의지 — 함께 보낸 시간·도움·솔직함으로 오름. 둘 다 -100~100. 친한 친구 = 우정 높고 애정 낮음. stages: 낮은 단계부터 4~7개, at = 필요한 애정, trust = 필요한 우정 · 우정 단계(친구·단짝·동료·사제 …)는 at -100 (애정 필요 없음) · 연애 단계(설렘·연인)만 at에 애정을 적어요 · 연인(커플) 단계 하나는 꼭 넣고 "love": true · affName/trustName은 그대로 "애정"/"우정")`,
    map: `{"name":"지도 이름","here":"현재 위치(장소 이름)","places":[{"name":"장소","desc":"설명","kind":"마을/건물/던전/자연 등","x":50,"y":50,"links":["이어진 장소 이름"],"known":true,"area":"속한 구역 (선택)","fare":0,"icon":"🏠"}]}  (x,y는 0~100 좌표, 겹치지 않게 퍼뜨림 · fare = 그곳까지 가는 요금, 보통 0 · icon = 그 장소를 나타내는 이모지 하나)`,
    calendar: `{"era":"연호/기원(선택)","y":1,"m":1,"d":1,"time":"아침","months":[{"name":"1월","days":31}],"week":["월","화","수","목","금","토","일"],"times":["새벽","아침","낮","저녁","밤","심야"],"weather":"오늘 날씨 (맑음/비/눈 등)","events":[{"y":null,"m":3,"d":14,"title":"일정/기념일/축제","desc":"설명","repeat":"yearly|once"}]}`,
    contact: `{"mode":"phone|instant|letter","app":"연락 수단 이름(스마트폰 메신저 / 마법 통신구 / 편지 등)","contacts":[{"name":"연락 가능한 인물","handle":"아이디/주소(선택)","status":"상태 메시지 또는 사는 곳","courier":"(letter일 때) 이 인물이 주로 쓰는 배달 수단 이름"}],"couriers":[{"name":"배달 수단(배달부/갈매기/올빼미/강아지/전서구/마법 등 세계관에 맞게)","icon":"이모지 1개","min":1,"max":3,"fee":0,"note":"설명"}],"express":{"name":"급행 수단 이름(퀵·특급 파발 등)","fee":100}}  (min/max = 도착까지 걸리는 날 수, fee = 화폐 단위 요금)`,
    quest: `{"list":[{"title":"의뢰/목표 이름","giver":"의뢰인","desc":"내용","place":"장소","deadline":"기한(선택)","reward":"보상 설명","cash":0,"items":["보상 아이템"],"status":"open|active","steps":[{"text":"단계","done":false}],"check":{"attr":"완료 판정에 쓸 능력치 이름 (없으면 빈칸)","dc":12}}]}`,
    news: `{"name":"매체 이름(신문·방송·관보·포털 등 세계관에 맞게)","items":[{"title":"헤드라인","body":"기사 2~4문장","tag":"정치/사회/사건/경제/문화/연예 등"}]}`,
    gossip: `{"name":"가십지 이름","issues":[{"title":"자극적인 제목","body":"소문 내용 2~4문장 (가십지 말투)","about":["관련 인물"],"heat":1}]}  (heat 1~3 = 화제성)`,
    board: `{"name":"게시판 이름(길드 게시판·익명 커뮤니티·학교 게시판 등)","posts":[{"author":"닉네임","title":"글 제목","body":"본문","tag":"말머리","replies":[{"author":"닉네임","text":"댓글"}]}]}`,
    ach: `{"list":[{"name":"업적 이름","desc":"달성 조건","done":false,"hidden":false}],"endings":[{"name":"엔딩 이름","when":"조건 (예: 호감:레온 >= 90 · 돈 >= 100000 · 형식: 돈|게이지이름|호감:이름|신뢰:이름|날짜수 + 비교 + 숫자)","desc":"어떤 엔딩인지 한 줄"}]}`,
    memo: `{"list":[{"text":"메모 내용","by":"user|ai","inject":true,"pin":false}]}`,
    sns: `{"name":"SNS 이름 (인스타·트위터 같은 것 · 세계관에 맞게: 마법 거울 피드, 길드 소식판 등)","posts":[{"author":"작성자 (캐릭터·NPC·지역 주민)","text":"글 (짧게, 그 인물 말투로)","pic":"사진 묘사 (없으면 빈칸)","tags":"#해시태그","likes":12,"replies":[{"author":"닉네임","text":"댓글"}]}]}`,
    music: `{"taste":"","now":{"title":"실제로 있는 곡 제목","artist":"가수","mood":"분위기 한 단어","why":"왜 어울리는지 한 줄"}}`,
    custom: `{"tabs":[{"name":"탭 이름","icon":"이모지 1개","note":"이 탭이 뭔지 한 줄 (AI에게도 전달)","inject":true,"fields":[{"k":"항목 이름","type":"num|bar|text","v":0,"max":100,"desc":"설명"}]}]}  (num = 숫자, bar = 0~max 게이지, text = 글)`,
    fate: `{"curses":[{"name":"저주·축복 이름","kind":"curse|bless","desc":"설명","effects":["가격 +30%","호감 -50%","매일 체력 -5","대출 불가","(그 밖의 효과는 글로)"],"days":7,"cure":"해제 조건"}],"deck":[{"title":"이벤트 카드 이름","kind":"luck|bad|event","desc":"무슨 일이 일어나는지 1~2문장","effect":"바뀌는 상태 (예: cash: +200 / stat: 체력 -10 / item: +행운의 부적 — 여러 개면 ; 로)"}],"drawChance":20,"rules":[{"name":"규칙 이름","when":"돈 <= 0 (형식: 돈|게이지이름|호감:이름|신뢰:이름 + < <= > >= = + 숫자)","then":"그때 일어나는 상태 변화 (예: curse: 빈털터리 | 가격 +10% | 3일 | 돈을 모으면 풀림)"}]}  (drawChance = 하루가 지날 때 카드가 나올 확률 %)`,
};

// 직접 편집 화면 정의 — type: text | area | num | bool | select | tags | list | color
export const EDIT = {
    core: [
        { k: 'title', label: '이름', type: 'text' }, { k: 'genre', label: '장르', type: 'text' }, { k: 'tone', label: '톤', type: 'text' }, { k: 'canon', label: '원작 (2차 창작)', type: 'text' },
        { k: 'userRole', label: '{{user}}의 위치', type: 'text' }, { k: 'summary', label: '세계관 요약', type: 'area' }, { k: 'rules', label: '규칙·상식', type: 'area' },
    ],
    profile: [
        { k: 'mode', label: '프로필 모드', type: 'select', options: [['minimal', '최소 (기존 카드·로어북 참조)'], ['detailed', '상세 (이 시트로만)']] },
        { k: 'list', label: '인물', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'role', label: '구분', type: 'select', options: [['user', '유저'], ['main', '주요'], ['npc', 'NPC']] },
            { k: 'summary', label: '소개', type: 'area' },
            { k: 'home', label: '사는 곳 (지도 장소)', type: 'text' }, { k: 'sched', label: '일과 (예: 아침:시장, 낮:항구, 밤:집)', type: 'text' },
            { k: 'fields', label: '항목', type: 'list', title: 'k', fields: [{ k: 'k', label: '항목', type: 'text' }, { k: 'v', label: '내용', type: 'area' }] },
        ] },
    ],
    stats: [
        { k: 'bars', label: '게이지', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'cur', label: '현재', type: 'num' }, { k: 'max', label: '최대', type: 'num' }, { k: 'color', label: '색', type: 'color' }, { k: 'decay', label: '하루에 줄어드는 양 (0 = 안 줄어듦 · 음수 = 저절로 참)', type: 'num' }, { k: 'stages', label: '단계 (예: 50:출출함, 25:배고픔 · 70+:불안)', type: 'text' }, { k: 'zero', label: '바닥일 때 하루마다 (예: 체력 -10)', type: 'text' }, { k: 'desc', label: '설명', type: 'text' }] },
        { k: 'attrs', label: '능력치 (판정 보정)', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'val', label: '보정', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }] },
        { k: 'conds', label: '상태 이상 · 버프', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '효과', type: 'text' }] },
    ],
    dice: [
        { k: 'system', label: '방식', type: 'select', options: [['d20', 'd20 + 보정 vs 난이도(DC)'], ['d100', 'd100 이하 성공 (보정 ×5)']] },
        { k: 'rules', label: '판정 규칙 (AI에게 전달)', type: 'area' },
        { k: 'quick', label: '빠른 판정', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'attr', label: '능력치', type: 'text' }, { k: 'dc', label: '난이도', type: 'num' }] },
    ],
    wallet: [
        { k: 'currency', label: '화폐 단위', type: 'text' }, { k: 'cash', label: '소지금', type: 'num' },
        { k: 'items', label: '소지품', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'qty', label: '수량', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }, { k: 'effect', label: '사용 효과 (예: 체력 +20)', type: 'text' }] },
        { k: 'prices', label: '물가표', type: 'list', title: 'name', fields: [{ k: 'name', label: '물건 · 서비스', type: 'text' }, { k: 'price', label: '가격', type: 'num' }] },
        { k: 'jobs', label: '일거리', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'pay', label: '일당', type: 'num' }, { k: 'effect', label: '일하면 (예: 기력 -20)', type: 'text' }] },
        { k: 'regular', label: '정기 수입 · 지출', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'amount', label: '금액 (지출은 -)', type: 'num' }, { k: 'every', label: '주기', type: 'select', options: [['day', '매일'], ['week', '매주'], ['month', '매달']] }] },
    ],
    shop: [
        { k: 'shops', label: '상점', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'place', label: '장소', type: 'text' }, { k: 'desc', label: '설명', type: 'text' },
            { k: 'items', label: '상품', type: 'list', title: 'name', fields: [
                { k: 'name', label: '이름', type: 'text' }, { k: 'price', label: '가격', type: 'num' },
                { k: 'kind', label: '종류', type: 'select', options: [['item', '아이템'], ['deco', '가구·장식']] },
                { k: 'stock', label: '재고 (-1 무한)', type: 'num' }, { k: 'desc', label: '설명', type: 'text' },
            ] },
        ] },
    ],
    home: [
        { k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '설명', type: 'area' },
        { k: 'rooms', label: '방 · 구역', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'floor', label: '층 (숫자 · 선택)', type: 'num', blank: true }, { k: 'desc', label: '모습', type: 'area' }, { k: 'decor', label: '배치된 가구 (쉼표)', type: 'tags' }] },
        { k: 'storage', label: '창고 (미배치, 쉼표)', type: 'tags' },
        { k: 'trash', label: '쓰레기통', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'date', label: '버린 날', type: 'text' }] },
    ],
    rel: [
        { k: 'user', label: '{{user}}와의 관계', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'label', label: '관계', type: 'text' }, { k: 'aff', label: '💗 애정 (aff · 옛 채팅은 호감)', type: 'num' }, { k: 'trust', label: '🤝 우정 (trust · 옛 채팅은 신뢰)', type: 'num' }, { k: 'noLove', label: '💗 애정 꺼 두기 — 이 사람은 우정만 (애정이 안 오르고 연애 단계로 안 가요)', type: 'bool' }, { k: 'jealous', label: '질투 (0~100)', type: 'num' }, { k: 'met', label: '처음 만난 날', type: 'text' }, { k: 'memo', label: '메모', type: 'area' }, { k: 'likes', label: '끌리는 것 (로맨스 보정)', type: 'text' }, { k: 'dislikes', label: '싫어하는 것 (로맨스 보정)', type: 'text' }, { k: 'concern', label: '요즘 신경 쓰는 것 (로맨스 보정)', type: 'text' }] },
        { k: 'pairs', label: '인물끼리의 관계', type: 'list', title: 'a', fields: [{ k: 'a', label: 'A', type: 'text' }, { k: 'b', label: 'B', type: 'text' }, { k: 'label', label: '관계', type: 'text' }, { k: 'memo', label: '메모', type: 'text' }] },
        { k: 'affName', label: '💗 aff 수치 이름 (기본 애정 = 연애 감정만 · 비우면 옛 방식 「호감」)', type: 'text' }, { k: 'trustName', label: '🤝 trust 수치 이름 (기본 우정 · 비우면 옛 방식 「신뢰」)', type: 'text' },
        { k: 'stages', label: '관계 단계 (두 수치가 모두 넘으면 해금 · 우정 단계는 필요한 애정 -100)', type: 'list', title: 'name', fields: [{ k: 'name', label: '단계 이름', type: 'text' }, { k: 'at', label: '필요한 애정 (aff · -100 = 상관없음)', type: 'num' }, { k: 'trust', label: '필요한 우정 (trust)', type: 'num' }, { k: 'unlock', label: '해금되는 것 (호칭·말투·행동)', type: 'text' }, { k: 'love', label: '💞 연인 단계 (로맨스 보정 ①: 고백 후 💍 확정이 있어야 올라감)', type: 'bool' }] },
        { k: 'life', label: '화면 밖 소식', type: 'list', title: 'who', fields: [{ k: 'who', label: '누가', type: 'text' }, { k: 'text', label: '한 일', type: 'text' }, { k: 'date', label: '날짜', type: 'text' }] },
    ],
    map: [
        { k: 'name', label: '지도 이름', type: 'text' }, { k: 'here', label: '현재 위치', type: 'text' },
        { k: 'places', label: '장소', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'text' }, { k: 'x', label: 'x (0~100)', type: 'num' }, { k: 'y', label: 'y (0~100)', type: 'num' }, { k: 'links', label: '이어진 곳 (쉼표)', type: 'tags' }, { k: 'floors', label: '안쪽 · 층 (아래층부터 쉼표 · 방은 「2층: 교실/복도」)', type: 'tags' }, { k: 'area', label: '구역', type: 'text' }, { k: 'fare', label: '가는 요금', type: 'num' }, { k: 'known', label: '알려짐', type: 'bool' }, { k: 'desc', label: '설명', type: 'area' }] },
    ],
    calendar: [
        { k: 'weather', label: '오늘 날씨', type: 'text' }, { k: 'autoWeather', label: '날씨 자동으로 바뀜 (계절따라)', type: 'bool' },
        { k: 'era', label: '연호', type: 'text' }, { k: 'y', label: '년', type: 'num' }, { k: 'm', label: '월', type: 'num' }, { k: 'd', label: '일', type: 'num' }, { k: 'time', label: '시간대', type: 'text' },
        { k: 'times', label: '시간대 목록 (쉼표)', type: 'tags' }, { k: 'week', label: '요일 (쉼표)', type: 'tags' },
        { k: 'months', label: '달', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'days', label: '일수', type: 'num' }] },
        { k: 'events', label: '일정', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'y', label: '년 (비우면 매년)', type: 'num' }, { k: 'm', label: '월', type: 'num' }, { k: 'd', label: '일', type: 'num' }, { k: 'repeat', label: '반복', type: 'select', options: [['once', '한 번'], ['yearly', '매년']] }, { k: 'desc', label: '설명', type: 'text' }] },
    ],
    contact: [
        { k: 'mode', label: '연락 방식', type: 'select', options: [['phone', '휴대폰 메신저 (즉시)'], ['instant', '즉시 통신 (마법·무전 등)'], ['letter', '편지 (시간이 걸림)']] },
        { k: 'app', label: '연락 수단 이름', type: 'text' },
        { k: 'contacts', label: '연락처', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'handle', label: '아이디 · 주소', type: 'text' }, { k: 'status', label: '상태 메시지', type: 'text' }, { k: 'reflect', label: '본편 반영', type: 'select', options: [['', '기본 설정 따름'], ['always', '항상 반영'], ['pinned', '📌 고른 것만'], ['never', '반영 안 함 (비밀)']] }, { k: 'blocked', label: '차단', type: 'bool' }, { k: 'courier', label: '이 사람이 쓰는 배달 수단 (편지)', type: 'text' }] },
        { k: 'couriers', label: '배달 수단 (편지)', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'icon', label: '이모지', type: 'text' }, { k: 'min', label: '최소 일수', type: 'num' }, { k: 'max', label: '최대 일수', type: 'num' }, { k: 'fee', label: '요금', type: 'num' }, { k: 'note', label: '설명', type: 'text' }] },
    ],
    quest: [
        { k: 'list', label: '퀘스트', type: 'list', title: 'title', fields: [
            { k: 'title', label: '이름', type: 'text' }, { k: 'giver', label: '의뢰인', type: 'text' }, { k: 'place', label: '장소', type: 'text' }, { k: 'deadline', label: '기한', type: 'text' },
            { k: 'status', label: '상태', type: 'select', options: [['open', '받을 수 있음'], ['active', '진행 중'], ['done', '완료'], ['failed', '실패']] },
            { k: 'desc', label: '내용', type: 'area' }, { k: 'reward', label: '보상 설명', type: 'text' }, { k: 'cash', label: '보상금', type: 'num' }, { k: 'items', label: '보상 아이템 (쉼표)', type: 'tags' },
            { k: 'steps', label: '단계', type: 'list', title: 'text', fields: [{ k: 'text', label: '내용', type: 'text' }, { k: 'done', label: '완료', type: 'bool' }] },
        ] },
    ],
    news: [
        { k: 'name', label: '매체 이름', type: 'text' },
        { k: 'items', label: '기사', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'tag', label: '분류', type: 'text' }, { k: 'date', label: '날짜', type: 'text' }, { k: 'body', label: '본문', type: 'area' }] },
    ],
    gossip: [
        { k: 'name', label: '가십지 이름', type: 'text' },
        { k: 'issues', label: '기사', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'about', label: '관련 인물 (쉼표)', type: 'tags' }, { k: 'heat', label: '화제성 1~3', type: 'num' }, { k: 'date', label: '날짜', type: 'text' }, { k: 'body', label: '내용', type: 'area' }] },
    ],
    board: [
        { k: 'name', label: '게시판 이름', type: 'text' },
        { k: 'posts', label: '글', type: 'list', title: 'title', fields: [
            { k: 'title', label: '제목', type: 'text' }, { k: 'author', label: '작성자', type: 'text' }, { k: 'tag', label: '말머리', type: 'text' }, { k: 'mine', label: '내 글', type: 'bool' }, { k: 'body', label: '본문', type: 'area' },
            { k: 'replies', label: '댓글', type: 'list', title: 'author', fields: [{ k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '내용', type: 'area' }, { k: 'mine', label: '내 댓글', type: 'bool' }] },
        ] },
    ],
    ach: [
        { k: 'list', label: '업적', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '조건', type: 'text' }, { k: 'done', label: '달성', type: 'bool' }, { k: 'hidden', label: '숨김', type: 'bool' }, { k: 'at', label: '달성 시점', type: 'text' }] },
        { k: 'endings', label: '엔딩', type: 'list', title: 'name', fields: [{ k: 'name', label: '엔딩 이름', type: 'text' }, { k: 'when', label: '조건 (예: 호감:레온 >= 90)', type: 'text' }, { k: 'desc', label: '설명', type: 'text' }, { k: 'done', label: '봤음', type: 'bool' }] },
    ],
    memo: [
        { k: 'list', label: '메모', type: 'list', title: 'text', fields: [{ k: 'text', label: '내용', type: 'area' }, { k: 'by', label: '작성', type: 'select', options: [['user', '나'], ['ai', 'AI']] }, { k: 'inject', label: 'AI 반영', type: 'bool' }, { k: 'pin', label: '고정', type: 'bool' }] },
    ],
    sns: [
        { k: 'name', label: 'SNS 이름', type: 'text' },
        { k: 'posts', label: '게시물', type: 'list', title: 'author', fields: [
            { k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '글', type: 'area' }, { k: 'pic', label: '사진 묘사', type: 'text' }, { k: 'tags', label: '해시태그', type: 'text' }, { k: 'likes', label: '좋아요', type: 'num' }, { k: 'mine', label: '내 글', type: 'bool' },
            { k: 'replies', label: '댓글', type: 'list', title: 'author', fields: [{ k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '내용', type: 'area' }, { k: 'mine', label: '내 댓글', type: 'bool' }] },
        ] },
    ],
    music: [
        { k: 'taste', label: '이 채팅에서 좋아하는 음악 (비우면 확장 설정 따름)', type: 'text' },
    ],
    custom: [
        { k: 'tabs', label: '탭', type: 'list', title: 'name', fields: [
            { k: 'name', label: '탭 이름', type: 'text' }, { k: 'icon', label: '이모지', type: 'text' }, { k: 'note', label: '설명 (AI에게도 전달)', type: 'text' }, { k: 'inject', label: 'AI에게 보내기', type: 'bool' },
            { k: 'fields', label: '항목', type: 'list', title: 'k', fields: [{ k: 'k', label: '항목 이름', type: 'text' }, { k: 'type', label: '종류', type: 'select', options: [['num', '숫자'], ['bar', '게이지 (0~최대)'], ['text', '글']] }, { k: 'v', label: '값', type: 'text' }, { k: 'max', label: '최대 (게이지)', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }] },
        ] },
    ],
    fate: [
        { k: 'curses', label: '저주 · 축복', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'select', options: [['curse', '저주'], ['bless', '축복']] }, { k: 'desc', label: '설명', type: 'text' },
            { k: 'effects', label: '효과 (쉼표 · 예: 가격 +30%, 호감 -50%, 매일 체력 -5, 대출 불가)', type: 'tags' }, { k: 'days', label: '남은 기간 (일, 비우면 계속)', type: 'num' }, { k: 'cure', label: '해제 조건', type: 'text' },
        ] },
        { k: 'drawChance', label: '하루가 지날 때 카드가 나올 확률 %', type: 'num' },
        { k: 'deck', label: '이벤트 카드', type: 'list', title: 'title', fields: [
            { k: 'title', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'select', options: [['luck', '행운'], ['bad', '불운'], ['event', '사건']] },
            { k: 'desc', label: '내용', type: 'area' }, { k: 'effect', label: '바뀌는 상태 (예: cash: +200 ; stat: 체력 -10)', type: 'text' },
        ] },
        { k: 'births', label: '🔮 점집: 인물별 생년월일 (명식)', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'birth', label: '생년월일', type: 'text' }, { k: 'hour', label: '태어난 시', type: 'text' }, { k: 'age', label: '나이', type: 'text' },
            { k: 'zodiac', label: '띠', type: 'text' }, { k: 'star', label: '별자리', type: 'text' }, { k: 'element', label: '타고난 기운 (오행 등)', type: 'text' }, { k: 'place', label: '태어난 곳', type: 'text' }, { k: 'nature', label: '타고난 기질', type: 'area' },
        ] },
        { k: 'feeTarot', label: '🔮 복채: 타로 (0 = 물가에 맞춰 자동)', type: 'num' }, { k: 'feeOrb', label: '🔮 복채: 수정구슬 (0 = 자동)', type: 'num' },
        { k: 'feeShaman', label: '🔮 복채: 무당 (0 = 자동)', type: 'num' }, { k: 'feeGut', label: '🔮 굿 값 (0 = 자동)', type: 'num' },
        { k: 'rules', label: '자동 규칙', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'when', label: '조건 (예: 돈 <= 0 / 체력 < 20 / 호감:레온 >= 80)', type: 'text' }, { k: 'then', label: '그러면 (상태 줄 · 여러 개면 ;)', type: 'area' },
        ] },
    ],
};

// ───── 시간 (편지 배달용) ─────
// 달력이 켜져 있으면 "일", 아니면 AI 응답 수("턴")로 잰다
export function useDays(s, meta = getMeta()) { return !!(s?.data?.calendar && modOn('calendar', meta)); }
// 🕐 시간대 (v2.7.23): 하루 안에서도 시간이 흐른다 — 지금 시간대가 하루의 어디쯤인지 0~1 (달력의 시간대 목록 순서 · 목록에 없는 말은 뜻으로 어림)
const SLOT_HINT = [[/새벽|dawn|early morning/i, 0.08], [/오후|afternoon/i, 0.6], [/정오|점심|noon|midday/i, 0.45], [/아침|morning|sunrise/i, 0.25], [/저녁|evening|dusk|sunset/i, 0.72], [/심야|자정|late night|midnight/i, 0.95], [/밤|night/i, 0.85], [/낮|day/i, 0.5]];
export function dayFrac(cal) {
    const raw = String(cal?.time ?? ''), t = norm(raw), times = Array.isArray(cal?.times) ? cal.times : [];
    if (!t) return 0;
    const cm = parseClock(raw); if (cm !== null) return cm / 1440; // 🕐 시각이 적혀 있으면 그 시각만큼
    const i = times.findIndex(x => norm(x) === t);
    if (i >= 0) return i / times.length;
    for (const [re, f] of SLOT_HINT) if (re.test(raw)) return f;
    return 0;
}
// 바로 오가는 메시지(메신저 · 선톡 · AI가 보낸 연락)의 시각 = 그날(또는 그 턴). 시간대까지 재는 것은 편지 답장 기다리기뿐
export function wholeTick(s, meta = getMeta()) { return useDays(s, meta) ? dayIndex(s.data.calendar) : (s?.turn ?? 0); }
export const slotsPerDay = (s) => Math.max(1, s?.data?.calendar?.times?.length || 6);
// 기다리는 시간을 글로: 「2일」 「3시간대」 「1일 2시간대」 「곧」 (달력이 없으면 턴)
export function waitText(delta, s, meta = getMeta()) {
    if (!useDays(s, meta)) return `${Math.max(0, Math.ceil(delta))}턴`;
    const N = slotsPerDay(s), k = Math.round(delta * N);
    if (k <= 0) return '곧';
    const d = Math.floor(k / N), r = k % N;
    return [d ? `${d}일` : '', r ? `${r}시간대` : ''].filter(Boolean).join(' ');
}
export function nowTick(s, meta = getMeta()) { return useDays(s, meta) ? dayIndex(s.data.calendar) + dayFrac(s.data.calendar) : (s?.turn ?? 0); }
export function tickUnit(s, meta = getMeta()) { return useDays(s, meta) ? '일' : '턴'; }
