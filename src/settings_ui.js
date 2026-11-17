// 확장 설정 서랍 — index.js에서 떼어 냄
import { app, ctx, settings, saveSettings, getMeta, saveMeta, MOD, esc, TITLE, VERSION, DIFFS } from './core.js';
import { stashAllSwipes, autoBake } from './engine.js';
import { listProfiles } from './prompts.js';
import { popup } from './kit.js';
import { rerenderPanels, openSheet, openWizard, openPromptWindow, openThemeWindow } from './shell.js';
import { translateSheet, convertToEnglish } from './translate.js';
import { openHelp } from './lazy.js';
import { fullBackup, diagnose } from './safe.js';
import { PRESETS, applyPreset, REL_SHOW } from './extra.js';
import { FREQ_MODS } from './engine.js';
import { MASCOT_SOUNDS, playMascotSound } from './mascot.js';
import { openReport } from './report.js';
import { hintSetting } from './tips.js';

// ───── 확장 설정 서랍 ─────
// 바꾸면 화면을 바로 다시 그려야 하는 스위치 (v2.7.3)
const VIEW_KEYS = new Set(['fortuneTarot', 'fortuneOrb', 'fortuneShaman', 'mapMetro', 'hompyFull', 'hpLite', 'hpSkinHud', 'loopMode', 'swipeGhost', 'fateDebt', 'tensionOn', 'realGap', 'glitchView', 'ledgerKnow', 'ledgerPromise', 'guideOn', 'peekCost', 'relScar', 'memoryDrift', 'meddleOn', 'tasteBook', 'crossMail', 'groupChat', 'extraJudge', 'questExpire', 'memoOn', 'albumOn', 'peekOn', 'recordOn', 'freshDot', 'pipCheck', 'questJudge', 'msgCard', 'chipOutside', 'contactSimple', 'contactSimpleReflect', 'relStagesOn', 'relShowMemo', 'relShowWants', 'relShowLife', 'relShowPairs', 'relShowBtns', 'relShowNext', 'relShowUnlock']);
// 「부가 기능 한 번에 끄기」 — 상태 계산 · 본편 롤플에 꼭 필요하지 않은 것만
const LIGHT_OFF = { memoOn: false, albumOn: false, mindMode: 'off', recordOn: false, daySummary: false, featureTips: false, showMascot: false, mascotBuddy: false, musicToast: false };
const ADDON_SET = new Set(['gearOn', 'ambientOn', 'giftTaste', 'promiseClock', 'mergeContact', 'guestbook', 'hpWave', 'socialAff']); // index.js의 ADDON_KEYS와 같은 목록
// 🟢 켜 둔 선택 기능: 이름(굵은 글씨)이 붙은 체크 칸 가운데 켜진 것을 설정 맨 위에 한 줄로 — 누르면 그 칸으로 간다. 자리는 하나도 옮기지 않는다
function onLine(el) {
    const box = el.querySelector('[data-s-on]'); if (!box) return;
    const on = [...el.querySelectorAll('label.checkbox_label')].map(l => [l.querySelector('input[type="checkbox"][data-s]'), l.querySelector(':scope > b')]).filter(([i, b]) => i?.checked && b);
    box.innerHTML = on.length ? `<small>켜 둔 선택 기능 ${on.length}개</small>${on.map(([i, b]) => `<button type="button" class="ss-set-chip" data-s-go="${esc(i.dataset.s)}">${esc(b.textContent.replace(/^[①-⑳]\s*/, '').trim())}</button>`).join('')}` : '';
}
function profileOptions(sel) {
    return `<option value="">메인 연결 그대로</option>${listProfiles().map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}`;
}
function featOptions(sel) {
    return profileOptions(sel).replace('메인 연결 그대로', '확장 AI 모델 그대로');
}
export function renderSettings() {
    if (document.getElementById('ss-settings')) return;
    const s = settings();
    const o = (k, v, label) => `<option value="${v}" ${String(s[k]) === String(v) ? 'selected' : ''}>${label}</option>`;
    const el = document.createElement('div');
    el.id = 'ss-settings';
    el.className = 'ss-settings';
    el.innerHTML = `<div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>😼 미트볼 상태창 <small>v${VERSION}</small></b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <label class="checkbox_label"><input type="checkbox" data-s="enabled" ${s.enabled ? 'checked' : ''}> 사용</label>
            <div class="ss-set-on" data-s-on></div>
            <div class="ss-set-btns">
                <button class="menu_button" data-s-act="open"><i class="fa-solid fa-gauge-high"></i> 상태창 열기</button>
                <button class="menu_button" data-s-act="wizard" title="장르 · 난이도 · 칸을 하나씩 골라서 AI로 한 번에 만들어요 (보통은 채팅을 열면 틀이 바로 생겨요)"><i class="fa-solid fa-wand-magic-sparkles"></i> 하나씩 골라서 만들기</button>
                <button class="menu_button" data-s-act="prompts"><i class="fa-solid fa-scroll"></i> 프롬프트 · 토큰</button>
                <button class="menu_button" data-s-act="theme"><i class="fa-solid fa-palette"></i> 꾸미기</button>
                <button class="menu_button" data-s-act="help"><i class="fa-solid fa-circle-question"></i> 도우미에게 물어보기</button>
                <button class="menu_button" data-s-act="chaton">이 채팅에서 켜기</button>
            </div>
            <label>새 채팅 기본 난이도<select class="text_pole" data-s="difficulty">${Object.entries(DIFFS).map(([k, v]) => o('difficulty', k, v.name)).join('')}</select></label>
            <label>스토리 → 상태창 자동 반영<select class="text_pole" data-s="sync">
                ${o('sync', 'tag', 'A. 태그 — 메인 AI가 응답 끝에 &lt;meatball&gt; (추천 · 추가 호출 없음)')}
                ${o('sync', 'tagPlus', 'A+B. 태그 + 빠졌을 때만 별도 분석')}
                ${o('sync', 'analyze', 'B. 별도 분석 — 매 응답 뒤 AI 1회 더 (정확 · 비용↑)')}
                ${o('sync', 'off', 'C. 끔 — 직접 편집·추가 지시로만')}</select></label>
            <label>규칙 주입<select class="text_pole" data-s="injectMode">${o('injectMode', 'lite', '간결 — 기본 · 추천')}${o('injectMode', 'ultra', '초압축 — 기호·키워드 · 토큰 최소')}${o('injectMode', 'full', '전체 — 비추천 · 토큰 많음 (매 턴 약 1천 토큰 이상)')}</select>
                <small>초압축은 가벼운 모델이 &lt;meatball&gt;을 빼먹을 수 있어서, 자동 반영을 A+B로 두는 걸 추천해요.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="sceneFilter" ${s.sceneFilter ? 'checked' : ''}> 장면 필터 — 최근 대화에 나온 인물만 자세히, 나머지는 이름·수치만</label>
            <label>장면 판단에 볼 최근 메시지 수<input type="number" min="1" max="40" class="text_pole" data-s="sceneTurns" value="${s.sceneTurns}"></label>
            <label>주입할 고정 메모 최대 개수<input type="number" min="0" max="30" class="text_pole" data-s="pinCap" value="${s.pinCap}"></label>
            <label>메시지 변동 칩<select class="text_pole" data-s="msgCard">${o('msgCard', 'compact', '보이기')}${o('msgCard', 'off', '숨기기')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="chipOutside" ${s.chipOutside ? 'checked' : ''}> 칩을 본문 밖(아래)에 붙이기 <small>(번역 확장이 원문을 숨겨서 칩이 안 보일 때 · 칩이 안 보이면 답 밑 🔍나 <code>/ss-pip</code>)</small></label>
            <b class="ss-set-h">기능 켜고 끄기</b>
            <small>모든 채팅에 걸려요. 꺼 둔 기능은 화면 · AI에게 가는 글 · 계산에서 모두 빠지고, 이미 적어 둔 내용은 지우지 않아요 (다시 켜면 그대로).</small>
            <label class="checkbox_label"><input type="checkbox" data-s="memoOn" ${s.memoOn !== false ? 'checked' : ''}> 📝 메모 칸 <small>(약속 · 단서를 📌 고정해 매 턴 AI에게 — 요약 확장은 지난 이야기를 줄여 주고, 메모는 내가 고른 것만 꼭 기억시켜요. 요약 확장을 쓰면 꺼도 돼요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="albumOn" ${s.albumOn !== false ? 'checked' : ''}> 🖼 추억 앨범 <small>(답마다 붙는 앨범 단추 · 앨범 탭 · 토큰 0 — 끄면 답마다 단추를 붙이지 않아 조금 가벼워요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="recordOn" ${s.recordOn !== false ? 'checked' : ''}> 📊 플레이 기록 탭</label>
            <label class="checkbox_label"><input type="checkbox" data-s="freshDot" ${s.freshDot !== false ? 'checked' : ''}> 🔴 방금 AI 답에서 바뀐 곳에 작은 빨간 점 <small>(탭 · 미니창 · HUD · 줄마다 · 탭을 열면 탭 점은 꺼져요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="pipCheck" ${s.pipCheck !== false ? 'checked' : ''}> 🔍 칩 점검 <small>(마지막 AI 답에 변동 칩이 없으면 작은 🔍 — 눌러서 「변화를 못 읽었나 / 화면에 안 보이나」 확인하고 다시 읽기 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="goneInject" ${s.goneInject !== false ? 'checked' : ''}> 🗑 버리거나 판 물건을 AI에게 「이제 없음」으로 알려 주기 <small>(창고에서 버린 가구 · 판 물건을 AI가 다시 꺼내 쓰지 않게 · 주입 한 줄)</small></label>
            <label>🎲 퀘스트 완료 판정<select class="text_pole" data-s="questJudge">${o('questJudge', 'ask', '물어보기 — 완료 누르면 「판정하고 완료 / 판정 없이 완료」 (기본)')}${o('questJudge', 'roll', '늘 판정 — 대성공 1.5배 · 성공 · 실패 절반 · 대실패 보상 없음')}${o('questJudge', 'off', '끔 — 판정 없이 바로 보상')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="questExpire" ${s.questExpire !== false ? 'checked' : ''}> ⌛ 퀘스트 기한이 지나면 실패로 · 마지막 날 알림 <small>(「3일 안에」 · 「3월 14일까지」 같은 기한을 달력으로 읽어요 · 달력이 켜져 있을 때 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="extraJudge" ${s.extraJudge !== false ? 'checked' : ''}> 🎲 흥정 · 일하기 판정 <small>(상점 물건 옆 🎲로 값을 깎고, 일거리는 d20으로 일당이 달라져요 · AI 0회)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="questAsk" ${s.questAsk !== false ? 'checked' : ''}> 단계가 남은 퀘스트를 AI가 「완료」라고 적으면 확인을 기다리기 <small>(바로 끝내지 않고 퀘스트 탭에서 물어봐요 · 보상도 확인한 뒤에 · 업데이트 뒤의 답부터)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="questJudgeAI" ${s.questJudgeAI ? 'checked' : ''}> 본편 AI가 「완료」라고 적은 퀘스트도 자동으로 보상 판정 <small>(토큰 0 · 같은 답은 늘 같은 결과)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="lightall" title="메모 · 앨범 · 속마음 · 플레이 기록 · 하루 정리 · 팁 · 마스코트를 한 번에 꺼요"><i class="fa-solid fa-feather"></i> 부가 기능 한 번에 끄기</button><button class="menu_button" data-s-act="perf"><i class="fa-solid fa-gauge-simple-high"></i> 부하 재기</button></div>
            <b class="ss-set-h">상태창 언어 · 번역</b>
            <small>상태창 칸(프로필·상점·편지·뉴스…)을 만드는 <b>확장 AI 모델</b>과, 그걸 번역하는 <b>번역 모델</b>을 따로 고를 수 있어요. 롤플 본문과는 상관없어요.</small>
            <label>상태창 생성 언어<select class="text_pole" data-s="ssGenLang">${o('ssGenLang', 'ko', '한국어로 바로 생성 (번역 없음)')}${o('ssGenLang', 'enview', '영어로 저장 · 화면만 번역 — AI에겐 영어, 나한텐 번역본 (추천 · 생성마다 번역 1회)')}${o('ssGenLang', 'en', '영어로 생성 → 번역본을 저장 (AI에게도 번역본이 감 · 예전 방식)')}</select></label>
            <label>번역 모델 (연결 프로필)<div class="ss-set-inline"><select class="text_pole" data-s="trProfile">${profileOptions(s.trProfile).replace('메인 연결 그대로', '확장 AI 모델 그대로 (없으면 메인)')}</select></div></label>
            <label>번역할 언어<input class="text_pole" data-s="trLang" value="${esc(s.trLang)}"></label>
            <label>번역 담당<select class="text_pole" data-s="trEngine">${o('trEngine', 'st', '실리 기본 번역 (추천 · 기본) — Google·DeepL 등 · 무료 · 빠름')}${o('trEngine', 'llm', '번역 모델 (LLM) — 말투·지침을 이해함 · 번역마다 AI 1회 · 토큰 듦')}</select>
                <small>실리 기본 번역은 확장 메뉴 › <b>Chat Translation</b>에서 고른 번역기를 써요.</small></label>
            <label>실리 기본 번역 언어 코드<input class="text_pole" data-s="trCode" value="${esc(s.trCode)}" placeholder="ko"></label>
            <label>번역 지침<textarea class="text_pole" rows="4" data-s="trRules" placeholder="Leon Hart = 레온 하트&#10;Kingdom of Ardel = 아르델 왕국&#10;편지는 반말로 옮길 것">${esc(s.trRules ?? '')}</textarea></label>
            <label>화면만 번역: 본편 AI가 새로 쓴 영어 글 자동 번역<select class="text_pole" data-s="trAuto">${o('trAuto', 'st', '실리 기본 번역일 때만 (무료 · 추천)')}${o('trAuto', 'always', '항상 — 번역 모델이면 새 글이 생길 때 AI 1회씩')}${o('trAuto', 'off', '끔 — 「상태창 전체 번역」을 누를 때만')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="trLlmFallback" ${s.trLlmFallback !== false ? 'checked' : ''}> 실리 번역기가 영어 그대로 돌려준 글은 묻지 않고 번역 모델로 다시 (그 글만 · 토큰 조금)</label>
            <small><b>번역 모델</b>: 적은 글이 그대로 지침으로 가요. <b>실리 기본 번역</b>: 지침을 읽지 못해서 <code>원문 = 번역</code> 모양의 줄만 써요 (이름·용어 고정). 다른 줄은 무시돼요.</small>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="trsheet"><i class="fa-solid fa-language"></i> 상태창 전체 번역</button><button class="menu_button" data-s-act="trprune" title="지금 상태창에 없는 옛 번역을 지워 채팅 파일을 줄이고 화면 번역을 빠르게 (📌 고정한 건 남김 · AI 0회)"><i class="fa-solid fa-broom"></i> 번역 사전 정리</button><button class="menu_button" data-s-act="trclear" title="이 채팅의 번역을 모두 지워요 — 번역이 마음에 안 들 때 통째로 다시 받으려고 (📌 내가 고친 건 남김 · 저장된 상태는 그대로 · 지우는 데 AI 0회)"><i class="fa-solid fa-trash-can"></i> 번역 전체 삭제</button><button class="menu_button" data-s-act="toenglish" title="예전에 한국어로 저장된 칸을 영어 저장으로 바꿔요. 지금 보이는 한국어는 화면 번역으로 남아요."><i class="fa-solid fa-right-left"></i> 한국어로 저장된 칸을 영어 저장으로 바꾸기</button></div>
            <small>「화면만 번역」으로 바꿔도 <b>이미 한국어로 저장된 칸</b>은 그대로 한국어로 AI에게 가요. 위 오른쪽 버튼을 한 번 누르면 이 채팅의 칸들이 영어 저장으로 바뀌고, 지금 보이는 한국어는 화면 번역으로 그대로 남아요. (채팅마다 한 번)</small>
            <b class="ss-set-h">일시정지 · OOC</b>
            <label class="checkbox_label"><input type="checkbox" data-s="oocDetect" ${s.oocDetect ? 'checked' : ''}> 내 메시지가 OOC로 시작하면 그 턴은 상태창 안 보냄 <small>((, (OOC, [OOC, //</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="skipQuiet" ${s.skipQuiet ? 'checked' : ''}> 조용한 생성·퀵리플라이(/gen 등)엔 안 보냄</label>
            <label>OOC로 볼 내 메시지 시작 (정규식 · 고급)<input class="text_pole" data-s="oocPattern" value="${esc(s.oocPattern)}" placeholder="^\\s*(\\(\\(|//)"></label>
            <small>퀵리플라이에서는 <code>/ss-pause</code> · <code>/ss-resume</code> · <code>/ss-skip</code> (다음 1번만)</small>
            <b class="ss-set-h">연락</b>
            <label><b>① 본편 AI가 연락 내용을 얼마나 알게 할까요?</b><select class="text_pole" data-s="contactReflect">${o('contactReflect', 'auto', '자동 — 최근 3줄만 (추천)')}${o('contactReflect', 'pinned', '📌 내가 고른 말풍선만 (말풍선의 📌 · ↕ 구간 고르기)')}${o('contactReflect', 'summary', '한 줄 요약만 (직접 쓰거나 AI가 써 줘요)')}${o('contactReflect', 'off', '아무것도 안 알림')}</select><small>사람마다 따로 정하려면 연락처의 ⋮ 메뉴에서 「항상 · 고른 것만 · 숨기기」.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="contactSimple" ${s.contactSimple === true ? 'checked' : ''}> <b>② 📱 간단 모드</b> — 잠깐 가볍게 놀 때 <small>(<b>켜면</b>: 편지도 바로 와요 · 연락 속 인물은 대화 최근 4줄 · 이야기 3줄만 기억 · 말풍선은 20개까지만 남아요. <b>끄면(기본)</b>: 편지 배달 시간 · 퀵 · 아래 ④만큼 기억 · 말풍선 200개까지)</small></label>
            <label>　└ 간단 모드를 켰을 때는 ① 대신 이것을 써요<select class="text_pole" data-s="contactSimpleReflect">${o('contactSimpleReflect', 'off', '본편 AI에게 안 알림 (기본 · 가장 가벼움)')}${o('contactSimpleReflect', 'recent', '가장 최근 연락 한두 줄만')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoPing" ${s.autoPing ? 'checked' : ''}> <b>③ 먼저 연락 오게</b> — 가끔 누군가 먼저 연락해 와요 <small>(올 때마다 확장 AI 1회)</small></label>
            <label>　└ AI 답 몇 번마다 한 번 올까요<input type="number" min="2" max="100" class="text_pole" data-s="autoPingEvery" value="${s.autoPingEvery}"></label>
            <label>편지 답장이 운 좋게 빨리 올 확률 % <small>(편지 세계에서만 · 호감이 높을수록 더 자주 · 0이면 없음)</small><input type="number" min="0" max="100" class="text_pole" data-s="rushChance" value="${s.rushChance}"></label>
            <label><b>④ 🧠 연락 속 인물이 지난 대화를 얼마나 기억할까요?</b><select class="text_pole" data-s="contactRecall">${o('contactRecall', 'short', '조금 — 최근 14줄 (편지는 8통) · 가장 가벼움')}${o('contactRecall', 'mid', '보통 — 약 6천 자까지 (기본)')}${o('contactRecall', 'long', '많이 — 약 2만 자까지')}${o('contactRecall', 'all', '전부 — 보관된 대화 전부 (200개까지)')}</select><small>답장을 받을 때마다 그 사람과의 대화를 이만큼 읽고 답해요 (한 줄 요약이 있으면 같이). 많을수록 옛일을 잘 기억하지만 답장 1번의 토큰이 늘어요. 본편 채팅은 최근 8개를 같이 봐요. 본편 AI에게 가는 양(①)과는 별개예요.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="contactStayRemote" ${s.contactStayRemote !== false ? 'checked' : ''}> <b>⑤ 🚫 연락에서 「갈게 · 만나자」 하지 않기</b> <small>(연락 속 인물이 지금 오겠다 · 만나자 · 데리러 가겠다고 하지 않아요. 만나자고 하면 자기 식으로 받아넘기고, 실제 만남은 본편에 맡겨요 · 끄면 예전처럼)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="contactAway" ${s.contactAway !== false ? 'checked' : ''}> <b>⑥ 🔕 상대가 알아서 연락 꺼 두기</b> <small>(화났거나 · 일하거나 · 자거나 — 상대가 스스로 한동안 연락을 끊을 수 있어요. 그동안 보낸 말은 안 읽히고 AI도 안 불러요(토큰 0). 이야기 시간이 흐르거나 실제 시간으로 한 칸당 10분이 지나면 풀려요 · 급하면 「그래도 불러내기」 · 끄면 예전처럼 늘 답해요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="groupChat" ${s.groupChat === true ? 'checked' : ''}> <b>⑦ 👥 단체방</b> <small>(연락 목록 위에 「단체방」 단추가 생겨요. 인물 2~6명을 한 방에 넣으면 내 말에 · 서로에게 반응해요 — 인물끼리 호감이 있으면 친한 사이는 편들고 앙숙은 티격태격. 연락과 따로 쌓이고 본편 AI에게 안 가요. 말을 걸 때마다 확장 AI 1회 · 기본 끔)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="crossMail" ${s.crossMail === true ? 'checked' : ''}> <b>⑧ 📻 채팅 간 우편</b> <small>(이 채팅의 인물이 다른 채팅으로 편지를 부치고, 다른 채팅에서 온 편지를 여기 떨어뜨려요. 연락 목록 아래에 칸이 생겨요 · 누를 때 AI 1회 · 기본 끔)</small></label>
            <b class="ss-set-h">📦 채팅을 지우면 같이 되돌릴 칸</b>
            <small><b>체크 안 함 (기본) = 따로 보관</b>: 채팅을 지우거나 다시 생성해도 그 칸은 그대로 남아요. 많이 써도 기록이 안 쌓여요. 「방금 한 일」을 AI에게 알리지 않아요.<br><b>체크 = 채팅에 붙이기</b>: 그 턴을 지우면 그때 한 연락 · 글도 같이 사라져요. 방금 한 일을 AI에게 알려요. 대신 많이 쓰면 기록이 빨리 쌓여요.<br>돈 · 물건이 오간 것(선물 · 송금 · 동봉)은 체크와 상관없이 그 턴을 지우면 되돌아가요.</small>
            <div class="ss-set-inline ss-set-wrap">${[['bindContact', '연락'], ['bindNews', '뉴스'], ['bindGossip', '가십지'], ['bindBoard', '게시판'], ['bindSns', 'SNS']].map(([k, t]) => `<label class="checkbox_label"><input type="checkbox" data-s="${k}" ${s[k] === true ? 'checked' : ''}> ${t}</label>`).join('')}</div>
            <b class="ss-set-h">확장 AI</b>
            <label>확장 AI에 쓸 모델 (연결 프로필)
                <div class="ss-set-inline"><select class="text_pole" data-s="aiProfile">${profileOptions(s.aiProfile)}</select><button class="menu_button" data-s-act="profiles" title="새로고침"><i class="fa-solid fa-rotate"></i></button></div>
                <small>만들기·추가 지시·연락 답장·뉴스 등에만 쓰여요. 롤플 본문은 메인 연결.</small></label>
            <details class="ss-set-more"><summary>기능별 모델 따로 고르기</summary>
                <small>비워 두면 위의 확장 AI 모델을 써요.</small>
                <label>연락 (메신저·편지 답장 · 선톡)<select class="text_pole" data-s="profContact">${featOptions(s.profContact)}</select></label>
                <label>만들기 · 추가 지시 · 다시 생성<select class="text_pole" data-s="profGen">${featOptions(s.profGen)}</select></label>
                <label>소식 (뉴스 · 가십 · 게시판 · 의뢰)<select class="text_pole" data-s="profFeeds">${featOptions(s.profFeeds)}</select></label>
                <label>별도 분석 (자동 반영 B · A+B)<select class="text_pole" data-s="profAnalyze">${featOptions(s.profAnalyze)}</select></label>
                <label>미트볼 도우미 (기능 물어보기)<select class="text_pole" data-s="profHelp">${featOptions(s.profHelp)}</select></label>
            </details>
            <label class="checkbox_label"><input type="checkbox" data-s="aiFallbackMain" ${s.aiFallbackMain ? 'checked' : ''}> 연결 프로필이 실패하면 메인 연결로 다시 보내기 <small>(기본 끔 — 실패하면 거기서 멈추고 알려 줘요 · 비싼 메인 모델로 새는 것 방지)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="genBatch" ${s.genBatch ? 'checked' : ''}> 상태창 만들기: 관련 칸끼리 묶어서 생성 <small>(호출 17번 → 6번 · 빠진 칸만 따로 다시)</small></label>
            <label>동시에 보낼 생성 요청 수 <small>(너무 높으면 API가 거절할 수 있어요)</small><input type="number" min="1" max="8" class="text_pole" data-s="genParallel" value="${s.genParallel}"></label>
            <label>확장 AI 최대 출력 토큰<input type="number" min="500" max="32000" class="text_pole" data-s="aiMaxTokens" value="${s.aiMaxTokens}"></label>
            <label>생성 때 읽을 최근 채팅 수<input type="number" min="0" max="100" class="text_pole" data-s="recentForGen" value="${s.recentForGen}"></label>
            <label>📖 생성 때 채팅 읽는 방식 <small>(만들기 · 칸 다시 생성 · AI로 수정의 재료 — 길게 읽을수록 그 요청의 토큰이 늘어요. 본편 · 다른 확장 AI 호출은 그대로예요)</small><select class="text_pole" data-s="genRead">${o('genRead', 'short', '최근 채팅 · 메시지마다 앞 700자 (기본)')}${o('genRead', 'last', '최근 채팅 + 마지막 답은 전체')}${o('genRead', 'recent', '최근 채팅을 길게 (2,500자씩 · 마지막 답은 전체)')}${o('genRead', 'all', '채팅 전체 (처음부터 끝까지)')}</select></label>
            <label>「채팅 전체」로 읽을 때 최대 글자 수 <small>(넘으면 오래된 메시지부터 앞부분만 남겨요)</small><input type="number" min="4000" max="2000000" step="10000" class="text_pole" data-s="genReadCap" value="${s.genReadCap}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="genNote" ${s.genNote === true ? 'checked' : ''}> 📝 생성 때 이 채팅의 작가 노트도 읽기 <small>(기본 끔 — 페르소나 · 세계관을 작가 노트에 적어 두는 분용. 문체 지시는 무시하고 사실만 참고하게 해요)</small></label>
            <label>생성 때 읽을 로어북 최대 글자 수<input type="number" min="0" max="100000" step="1000" class="text_pole" data-s="loreChars" value="${s.loreChars}"></label>
            <label>상태 주입 깊이 (0 = 맨 끝)<input type="number" min="0" max="20" class="text_pole" data-s="injectDepth" value="${s.injectDepth}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="injWorld" ${s.injWorld ? 'checked' : ''}> 세계관 요약·규칙도 매 턴 보내기 <small>(기본 끔 — 보통 카드·로어북에 이미 있어서 중복이에요. 카드·로어북에 세계관이 없을 때만 켜세요. 끄더라도 칸을 AI로 만들 때는 참고해요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="injScan" ${s.injScan !== false ? 'checked' : ''}> 상태 주입문으로 로어북(월드인포) 켜기 <small>(끄면 근처 장소·의뢰인 이름 때문에 장면 밖 로어북이 켜지지 않아 토큰 절약 · 장소 로어북을 키워드로 켜고 있었다면 그대로 두세요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoBake" ${s.autoBake !== false ? 'checked' : ''}> 긴 채팅 자동 정리 — 오래된 기록을 굳혀서 가볍게 <small>(최근 120개 메시지는 그대로 · 그보다 오래된 답의 스와이프·편집은 상태에 다시 반영되지 않아요)</small></label>
            <label>되감기 범위 (메시지 수) <small>(이 안의 답은 지우거나 다시 생성하면 그 뒤 행동까지 되돌아가요 · 클수록 조금 무거움 · 10~120)</small><input type="number" min="10" max="120" step="5" class="text_pole" data-s="rewindKeep" value="${s.rewindKeep ?? 40}"></label>
            <label>자동 정리를 시작할 메시지 수 <small>(굳히지 않은 메시지가 이만큼 넘으면 · 작을수록 가벼움)</small><input type="number" min="200" max="5000" step="50" class="text_pole" data-s="bakeAfter" value="${s.bakeAfter}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoRegex" ${s.autoRegex ? 'checked' : ''}> &lt;meatball&gt; 숨김 정규식 자동 설치</label>
            <b class="ss-set-h">모델 맞춤 · 토큰 절약</b>
            <small>버튼 하나로 아래 설정들을 한 번에 맞춰요. 처음 설치하면 「기본」이 켜져 있어요.</small>
            <div class="ss-set-btns">${Object.entries(PRESETS).map(([k, p]) => `<button class="menu_button" data-s-preset="${k}" title="${esc(p.desc)}"><i class="fa-solid ${p.icon}"></i> ${esc(p.name)}</button>`).join('')}</div>
            <label class="checkbox_label"><input type="checkbox" data-s="deltaMode" ${s.deltaMode ? 'checked' : ''}> 변화 위주로 보내기 — 몇 턴마다 전체, 그 사이엔 핵심 + 바뀐 것만</label>
            <label>전체를 보내는 간격 (턴)<input type="number" min="2" max="20" class="text_pole" data-s="deltaEvery" value="${s.deltaEvery}"></label>
            <details class="ss-set-more"><summary>칸별 보내는 때</summary>
                <small>「관련 말이 나올 때만」은 최근 대화에 그 칸의 이름(상점 이름, 방 이름, '뉴스' 같은 말)이 나올 때만 보내요.</small>
                ${FREQ_MODS.map(id => `<label>${esc(MOD[id]?.name ?? id)}<select class="text_pole" data-s-every="${id}">${[['always', '매 턴'], ['kw', '관련 말이 나올 때만'], ['n3', '3턴마다'], ['n5', '5턴마다']].map(([v, t]) => `<option value="${v}" ${(s.injEvery?.[id] ?? 'always') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')}
            </details>
            <label class="checkbox_label"><input type="checkbox" data-s="retryJSON" ${s.retryJSON ? 'checked' : ''}> 확장 AI 답이 깨지면 고쳐 보고, 안 되면 1번 더 받기 <small>(가벼운 모델 추천)</small></label>
            <b class="ss-set-h">알림</b>
            <label>알림 방식<select class="text_pole" data-s="toastMode">${o('toastMode', 'popup', '팝업 — 폰 알림처럼 떴다 사라짐 (누르면 그 탭)')}${o('toastMode', 'toastr', '실리태번 기본 알림')}${o('toastMode', 'off', '끔 — 알림함에만 모아 두기')}</select></label>
            <label>팝업 위치<select class="text_pole" data-s="toastPos">${o('toastPos', 'top', '위')}${o('toastPos', 'bottom', '아래')}</select></label>
            <label>팝업이 보이는 시간 (초)<input type="number" min="2" max="20" class="text_pole" data-s="toastSec" value="${s.toastSec}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="daySummary" ${s.daySummary ? 'checked' : ''}> 하루가 지나면 「하루 정리」 카드</label>
            <label class="checkbox_label"><input type="checkbox" data-s="featureTips" ${s.featureTips !== false ? 'checked' : ''}> 💡 팁 · 주의 알림 — 안 쓰는 기능 추천 · 「이것도 아세요?」 · 설정 주의를 가끔 한 번씩 <small>(「알아요」 누르면 다시 안 나옴 · AI 0회)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="actionTips" ${s.actionTips !== false ? 'checked' : ''}> 　└ 칸에서 뭔가 할 때 「이것도 아세요?」 <small>(접속당 1번 · 3시간에 한 번 · 하루 2번까지)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="tipreset"><i class="fa-solid fa-rotate-left"></i> 넘긴 추천 · 팁 다시 보기</button></div>
            <b class="ss-set-h">추천 음악</b>
            <label>좋아하는 음악 (모든 채팅 기본)<input class="text_pole" data-s="musicTaste" value="${esc(s.musicTaste)}" placeholder="예: K-pop 발라드, 영화 OST, 로파이"></label>
            <label>▶ 누르면 열 곳<select class="text_pole" data-s="musicApp">${o('musicApp', 'youtube', '유튜브')}${o('musicApp', 'ytmusic', '유튜브 뮤직')}${o('musicApp', 'spotify', '스포티파이')}${o('musicApp', 'melon', '멜론')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="musicToast" ${s.musicToast ? 'checked' : ''}> 곡이 바뀌면 팝업</label>
            <b class="ss-set-h">👁 보일 것 <small>(모든 탭)</small></b>
            <small>탭마다 맨 위 「보일 것」을 펼쳐 칸 · 단추 · 안내 글을 하나씩 끄고 켜요. 로봇 표시 항목은 끄면 AI에게 보내는 글에서도 빠져요 (내용은 지워지지 않음). 나머지는 화면에서만 숨겨요.</small>
            <div class="ss-set-inline"><button class="menu_button ss-set-btn" data-s-act="partsreset"><i class="fa-solid fa-eye"></i> 숨긴 것 모두 다시 보이기</button></div>
            <b class="ss-set-h">관계</b>
            <small>관계 카드에 보일 것 — 다 끄면 이름 · 애정 · 우정 숫자만 남아요 (관계 탭 위 「보일 것」에서도 바꿔요 · 지우는 게 아니라 다시 켜면 그대로)</small>
            <div class="ss-set-inline ss-set-wrap">${REL_SHOW.map(([k, t, tip]) => `<label class="checkbox_label" title="${esc(tip)}"><input type="checkbox" data-s="${k}" ${s[k] !== false ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>
            <label class="checkbox_label"><input type="checkbox" data-s="stageLock" ${s.stageLock ? 'checked' : ''}> 관계 단계를 넘는 행동 막기 — 「아직 이 단계 이상은 하지 마」라고 본편 AI에게 알려 줘요 (천천히 가까워지는 연애용 · 끄면 단계만 알려 줌)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="jealousy" ${s.jealousy ? 'checked' : ''}> 질투 — 다른 사람과 가까워지면 애정이 높은 사람의 질투가 올라요 (날이 지나면 식음)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="offscreen" ${s.offscreen ? 'checked' : ''}> 화면 밖 생활 — 날이 지나면 본편 AI가 가끔 다른 사람 근황을 적어요</label>
            <small>아래는 선택 기능이에요 (기본 끔). 켜면 관계 탭 아래에 칸이 생겨요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="guideOn" ${s.guideOn !== false ? 'checked' : ''}> <b>🗝 공략 탭</b> <small>(「사람」 묶음에 탭이 생겨요: 인물이 직접 일러 주는 조언 · 비밀 게이지 · 눈치 지수. 누를 때만 AI 1회 · 비밀을 만들면 매 턴 몇 줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="peekCost" ${s.peekCost === true ? 'checked' : ''}> <b>👁 속마음을 볼 때마다 눈치가 올라요</b> <small>(프로필 › 속마음에서 가려진 채로 오고, 눌러 보면 눈치 +1 — 쌓이면 인물이 의심해요 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="relScar" ${s.relScar === true ? 'checked' : ''}> <b>🩹 관계의 흉터</b> <small>(한 번에 10 넘게 깎였던 일이 흉터로 남아 비슷한 상황에서 더 예민해져요 · 매 턴 1~3줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="memoryDrift" ${s.memoryDrift === true ? 'checked' : ''}> <b>🕳 기억 왜곡</b> <small>(인물이 지난 일을 자기 식으로 기억하고 본편에서도 그렇게 말해요 · AI 1회 + 매 턴 몇 줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="meddleOn" ${s.meddleOn === true ? 'checked' : ''}> <b>✍ 인물이 내 상태창에 손댄다</b> <small>(질투 50↑ · 애정 75↑인 인물이 가끔 낙서 · 이름 바꾸기 · 차단을 해 놔요 (관계 탭에서 되돌려요) · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="tasteBook" ${s.tasteBook === true ? 'checked' : ''}> <b>🎁 취향 도감</b> <small>(인물별로 드러난 좋아하는 것 · 싫어하는 것 모아 보기 · 토큰 0)</small></label>
            <b class="ss-set-h">💗 로맨스 보정 <small>(전부 선택 · 기본 꺼짐)</small></b>
            <small>AI가 유저 말에 다 맞춰 주거나, 친구인데 연인처럼 굴거나, 많이 놀았다고 연인 취급하는 걸 줄여요. 숫자를 바꾸는 기능(①②③)은 <b>켠 뒤에 오는 답부터</b> 적용돼서 옛 채팅의 숫자는 그대로예요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="romBond" ${s.romBond ? 'checked' : ''}> ① 연인은 고백으로만 — 맨 위 단계는 숫자만 차선 안 올라가요. 고백이 오가면 관계 탭에서 「💍 연인 확정」 <small>(토큰 거의 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romCap" ${s.romCap ? 'checked' : ''}> ② 한 번에 확 못 오르게 — AI 답 1번에 한 사람의 애정·우정이 오를 수 있는 최대치 <small>(토큰 0)</small></label>
            <div class="ss-set-inline"><label>애정(호감) 최대 +<input type="number" min="1" max="50" class="text_pole" data-s="romCapAff" value="${s.romCapAff}"></label><label>우정(신뢰) 최대 +<input type="number" min="1" max="50" class="text_pole" data-s="romCapTrust" value="${s.romCapTrust}"></label></div>
            <label class="checkbox_label"><input type="checkbox" data-s="romFatigue" ${s.romFatigue ? 'checked' : ''}> ③ 연달아 꼬시면 덜 오르게 — 같은 사람 애정(호감)이 3턴 연속 오르면 60%, 4턴부터 34%만 <small>(토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romFacts" ${s.romFacts ? 'checked' : ''}> ④ 관계를 사실로 알려 주기 — 「하지 마」 대신 「지금은 친구고, 이 단계에선 이렇게 군다 · 선을 넘으려 하면 차가워지지 말고 자기 식으로 피한다」 <small>(장면 인물마다 주입 조금 · 켜면 위 「단계 넘는 행동 막기」 문구는 대신 빠져요)</small></label>
            <details class="ss-set-more"><summary>더 보기 — ⑤ 인물의 욕구 · 주입 깊이</summary>
            <label class="checkbox_label"><input type="checkbox" data-s="romDrive" ${s.romDrive ? 'checked' : ''}> ⑤ 인물의 욕구 — 끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것을 알려 주고, AI가 바뀌면 고쳐 적어요 <small>(관계 편집에서 직접 적을 수도 · 주입 조금)</small></label>
            <label>로맨스 보정 주입 깊이 (0 = 맨 끝 · 모델이 잘 안 지키면 0~1로)<input type="number" min="0" max="20" class="text_pole" data-s="romDepth" value="${s.romDepth}"></label>
            <small>④⑤ 문구는 「프롬프트 · 토큰」 창에서 고칠 수 있어요. ⑤는 관계 탭의 「욕구 AI로 채우기」로 한 번에 채울 수 있어요.</small>
            </details>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="romrec" title="① 연인은 고백으로만 · ② 한 번에 확 못 오르게 · ④ 관계를 사실로"><i class="fa-solid fa-heart"></i> 추천 세트 켜기 (①②④)</button><button class="menu_button" data-s-act="romoff"><i class="fa-solid fa-power-off"></i> 로맨스 보정 모두 끄기</button></div>
            <b class="ss-set-h">✨ 설렘 한 스푼 <small>(기본 꺼짐 · 걸린 턴에만 주입 한 줄)</small></b>
            <small>관계가 너무 정적일 때. 가끔 인물이 <b>지금 관계 단계에 맞게</b> 먼저 설레는 행동을 해요. 친구 사이면 「너라서 그렇지」 같은 말이나 작은 선물까지 — 고백 · 연인 행동은 안 해요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="romSpark" ${s.romSpark ? 'checked' : ''}> ✨ 설렘 한 스푼 — 장면 속 인물이 지금 단계에 맞는 설레는 한 순간을 스스로 <small>(애정 꺼 둔 사람은 우정 표현만)</small></label>
            <label>설렘 확률 % (AI 답 1번마다 · 걸린 뒤 3턴은 쉬어서 최대 4턴에 한 번)<input type="number" min="0" max="100" class="text_pole" data-s="romSparkPct" value="${s.romSparkPct}"></label>
            <small>문구는 「프롬프트 · 토큰」 창에서 고칠 수 있어요. 걸린 턴은 그 창의 「지금 보내는 글」에서 볼 수 있어요.</small>
            <b class="ss-set-h">🧭 이야기 흐름 <small>(전부 선택 · 기본 꺼짐)</small></b>
            <small>켜면 운명 탭(운명 칸을 안 쓰면 관리 탭) 아래에 칸이 생겨요. 끈 것은 AI에게 아무것도 보내지 않아요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="loopMode" ${s.loopMode === true ? 'checked' : ''}> <b>🔁 회귀자 모드</b> <small>(다시 생성 · 지운 횟수를 회차로 세고, 같은 장면을 여러 번 되돌리면 인물이 기시감을 느껴요 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="swipeGhost" ${s.swipeGhost === true ? 'checked' : ''}> <b>👻 버린 스와이프의 유령</b> <small>(버려진 스와이프의 한 토막이 가끔 꿈 · 환청 · 말실수로 새어 나와요 · 가끔 100토큰쯤)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="fateDebt" ${s.fateDebt === true ? 'checked' : ''}> <b>🎲 운명의 빚</b> <small>(다시 생성할 때마다 빚 1, 5가 되면 다음 답에서 작은 불운 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="tensionOn" ${s.tensionOn === true ? 'checked' : ''}> <b>🎬 긴장도 감독</b> <small>(평화가 길면 긴장이 차올라 사건을 부르고, 사건 뒤엔 쉬는 구간 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="realGap" ${s.realGap === true ? 'checked' : ''}> <b>🕰 현실 시간 연동</b> <small>(실제로 하루 넘게 안 오면 인물이 「어디 갔었어」로 반응 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="glitchView" ${s.glitchView === true ? 'checked' : ''}> <b>🌫 믿을 수 없는 상태창</b> <small>(정신력 · 이성이 낮거나 취하면 상태창 화면이 떨리고 깨져 보여요 (계산은 그대로) · 토큰 0)</small></label>
            <b class="ss-set-h">📒 장부 <small>(전부 선택 · 기본 꺼짐)</small></b>
            <small>켜면 메모 탭 아래에 칸이 생겨요. 직접 적거나 「지금 정리」(AI 1회) · 자동 정리로 채워요. 적힌 것은 매 턴 몇 줄씩 AI에게 가요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="ledgerKnow" ${s.ledgerKnow === true ? 'checked' : ''}> <b>🧠 누가 뭘 아는지</b> <small>(사실마다 아는 사람을 적어 두고, 모르는 인물이 아는 척하지 않게 해요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="ledgerPromise" ${s.ledgerPromise === true ? 'checked' : ''}> <b>🤝 약속 장부</b> <small>(내가 한 약속 · 거짓말. 지킴 우정 +2 · 어김 −4)</small></label>
            <b class="ss-set-h">🧩 덧붙이는 기능 <small>(전부 선택 · 기본 꺼짐)</small></b>
            <small>하나도 안 켜면 이 기능들의 파일은 읽지도 않아요. 켠 것만 움직이고, 둘을 같이 켜면 서로 엮여요 (예: 궂은 날엔 흥정이 쉬워져요).</small>
            <label class="checkbox_label"><input type="checkbox" data-s="hpWave" ${s.hpWave === true ? 'checked' : ''}> <b>🌊 파도타기 · 일촌평</b> <small>(전체화면 미니홈피의 일촌 창에서 이름을 누르면 그 사람의 홈피가 열려요 · 이름 밑에 일촌평 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="guestbook" ${s.guestbook === true ? 'checked' : ''}> <b>📝 방명록 · 일촌평 받기</b> <small>(파도타기 화면에서 인물이 남기는 한 줄 · 「받기」를 누를 때 AI 1회)</small></label>
            <label class="checkbox_label">　└ <input type="checkbox" data-s="guestbookAuto" ${s.guestbookAuto === true ? 'checked' : ''}> 방명록 자동 <small>(이야기 속 하루가 지날 때 한 줄 · 하루 1회까지 · AI 1회)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="socialAff" ${s.socialAff === true ? 'checked' : ''}> <b>💗 연락 · 방명록에서 호감 반영</b> <small>(연락 답장 · 방명록 답글에 따라 호감이 −2~+2 움직이고, 방명록을 남기면 우정 +1. 그 말풍선 · 글을 지우거나 채팅을 되감으면 되돌아가요 · 답장마다 토큰 한 줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="ambientOn" ${s.ambientOn === true ? 'checked' : ''}> <b>🌦 날씨 · 시간대 효과</b> <small>(비 · 눈 · 폭풍 · 밤 같은 상황을 AI에게 한 줄 알려요. 궂은 날엔 손님이 없어 흥정 난이도 −2 · 매 턴 0~1줄)</small></label>
            <label class="checkbox_label">　└ <input type="checkbox" data-s="ambientShop" ${s.ambientShop === true ? 'checked' : ''}> 밤에는 가게 닫기 <small>(밤 시간대엔 상점에서 사기 · 흥정이 안 돼요 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="giftTaste" ${s.giftTaste === true ? 'checked' : ''}> <b>🎁 취향에 맞는 선물</b> <small>(관계에 적힌 좋아하는 것이면 호감 2배, 싫어하는 것이면 −1 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="promiseClock" ${s.promiseClock === true ? 'checked' : ''}> <b>⌛ 약속 기한</b> <small>(약속 장부의 「3일 안에」 「3월 14일까지」를 달력으로 읽어, 지나면 자동으로 어김 · 약속 장부를 켰을 때만 · 토큰 0~1줄)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="mergeContact" ${s.mergeContact === true ? 'checked' : ''}> <b>🔗 합칠 때 연락도 옮기기</b> <small>(인물을 합칠 때 연락 대화도 옮길지 물어봐요 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="trendMore" ${s.trendMore === true ? 'checked' : ''}> <b>📊 그래프에 수치 더하기</b> <small>(변화 그래프에 게이지 · 내 탭 숫자 그래프가 하나 더 그려져요 · 토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="fortuneTarot" ${s.fortuneTarot === true ? 'checked' : ''}> <b>🃏 점집: 타로</b> <small>(v2.9 · 기본 끔 — 운명 탭 맨 아래 점집에 타로 언니 · 점 한 번에 AI 1회 · 복채)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="fortuneOrb" ${s.fortuneOrb === true ? 'checked' : ''}> <b>🔮 점집: 수정구슬</b> <small>(v2.9 · 기본 끔 — 마담 엘레오노라 · 점 한 번에 AI 1회 · 복채)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="fortuneShaman" ${s.fortuneShaman === true ? 'checked' : ''}> <b>🪭 점집: 무당 · 굿</b> <small>(v2.9 · 기본 끔 — 박보살 할매의 사주 · 신점, 굿으로 저주 풀기 · 한 번에 AI 1회 · 복채)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="mapMetro" ${s.mapMetro === true ? 'checked' : ''}> <b>🚇 새 지도</b> <small>(v2.9 · 기본 끔 — 노선도 · 이동 모션 · 인물 이모지 핀 · 건물 정면도/층별 평면도 · 본거지 집 안 그림 · 지도 꾸미기. 끄면 예전 지도 · 화면만 · 토큰 0)</small></label>
            <b class="ss-set-h">데이터 · 화면</b>
            <label class="checkbox_label"><input type="checkbox" data-s="hompyFull" ${s.hompyFull !== false ? 'checked' : ''}> <b>📒 전체화면은 미니홈피 모양으로</b> <small>(v2.8 새 화면 · 기본 끔 — 켜면 상태창의 전체화면이 위에 메뉴, 옆에 프로필 · 상태 · 일촌 창, 가운데에 지금 탭이 있는 미니홈피로 열려요. 화면만 바뀌고 계산 · 토큰은 그대로예요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="hpLite" ${s.hpLite === true ? 'checked' : ''}> 🪶 미니홈피 가볍게 <small>(옆 창 없이 가운데 창만 그려요 — 큰 상태창 · 폰에서 화면이 가벼워져요. 꾸미기 › 창에서도 바꿔요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="hpSkinHud" ${s.hpSkinHud === true ? 'checked' : ''}> 🪟 HUD · 보통 상태창도 미니홈피와 같은 모양으로 <small>(기본 끔 — 끄면 예전 모양 그대로)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="updateNotice" ${s.updateNotice !== false ? 'checked' : ''}> 📣 업데이트하면 「바뀐 점」을 한 번 알려 주기</label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="whatsnew"><i class="fa-solid fa-bullhorn"></i> 업데이트 내역</button></div>
            <label class="checkbox_label"><input type="checkbox" data-s="cardOffer" ${s.cardOffer ? 'checked' : ''}> 카드에 상태창이 들어 있으면 새 채팅에서 불러올지 물어보기</label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoStart" ${s.autoStart !== false ? 'checked' : ''}> 상태창이 없는 채팅을 열면 틀을 바로 만들기 <small>(AI 0회 · 추천 6칸의 기본 틀 — 내용은 관리 › 쓸 기능에서 고른 뒤 채워요 · 끄면 「만들기」를 눌러야 생겨요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoSave" ${s.autoSave ? 'checked' : ''}> 자동 세이브 (오래된 기록을 정리하기 전에 · 분기 대비)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="bottomNav" ${s.bottomNav ? 'checked' : ''}> 폰 한 손 모드 — 탭 바를 아래로</label>
            <label class="checkbox_label"><input type="checkbox" data-s="showMascot" ${s.showMascot !== false ? 'checked' : ''}> 🐱 마스코트 고양이 보이기 (빈 화면 · 만들기 · 알림 · 일시정지)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="mascotBuddy" ${s.mascotBuddy !== false ? 'checked' : ''}> 상태창 제목 옆에 마스코트 항상 두기 <small>(누르면 뾱! · 여러 번 빠르게 누르면 신나요)</small></label>
            <label>마스코트 누르면 나는 소리<select class="text_pole" data-s="mascotSound">${MASCOT_SOUNDS.map(([v, t]) => o('mascotSound', v, t)).join('')}</select></label>
            <label>효과음 크기 <small class="ss-mvol">${s.mascotVolume}</small><input type="range" min="0" max="100" step="5" data-s="mascotVolume" value="${s.mascotVolume}"></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="mascotsound"><i class="fa-solid fa-volume-high"></i> 소리 미리 듣기</button></div>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="diag"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button><button class="menu_button" data-s-act="report"><i class="fa-solid fa-bug"></i> 오류 보고문</button><button class="menu_button" data-s-act="copydump" title="최근 메시지 원문 · 상태 전체 · 편집 기록 · 주입문 (가리지 않음 · 고쳐 달라고 붙여 넣는 용)"><i class="fa-solid fa-clipboard"></i> 지금 상태 복사</button><button class="menu_button" data-s-act="backup"><i class="fa-solid fa-box-archive"></i> 이 채팅 전체 백업</button></div>
            <b class="ss-set-h">다른 확장과 같이 쓰기</b>
            <label class="checkbox_label"><input type="checkbox" data-s="hideSkip" ${s.hideSkip === true ? 'checked' : ''}> 🙈 눈 단추로 직접 숨긴 AI 답은 상태 계산에서 빼기 <small>(기본 끔 — 켜면 답의 눈 단추를 누를 때 그 답의 돈 · 호감 변화가 빠지고, 다시 보이게 하면 돌아와요. 요약 확장 · /hide 가 숨긴 옛 답은 예전처럼 계속 더해요. 켜기 전에 숨긴 답은 한 번 보였다가 다시 숨기면 돼요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="askDelete" ${s.askDelete !== false ? 'checked' : ''}> 🗑 되돌릴 수 없는 지우기는 한 번 물어보기 <small>(알림함 비우기 · 비밀 · 기억 · 편지 지우기 · 답장 다시 받기)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="backClose" ${s.backClose !== false ? 'checked' : ''}> ◀ 폰 뒤로 가기로 미트볼 창 닫기 <small>(폰 · 태블릿에서만 · PC에선 아무것도 안 해요 · 끄면 예전처럼 뒤로 가기가 앱 밖으로 나가요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="guardData" ${s.guardData === true ? 'checked' : ''}> <b>🛡 데이터 보호</b> <small>(기본 끔 — 다른 확장이 미트볼의 상태창 자료 · 프롬프트 · 확인 창 · AI 요청에 끼어드는 것을 막아요. 밖에서 바뀐 기준 자료는 되돌리고, 프롬프트 끝에 덧붙은 덩어리는 떼고 보내고, 확인 창 자동 승인 · 다른 모델로 돌리기 · 답 빼기 표식을 건너뛰어요. 다른 확장이 미트볼에 덧댄 기능은 듣지 않게 돼요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="guardLook" ${s.guardLook === true ? 'checked' : ''}> <b>🛡 화면 보호</b> <small>(기본 끔 — 기타 확장이 미트볼의 색 · 글꼴 · 아이콘 · 단추 · 설정 칸 배치를 덮는 것을 막아요. 미트볼 화면만 원래 모양으로 돌아가고 실리태번의 나머지 화면은 테마 그대로예요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="stashTags" ${s.stashTags ? 'checked' : ''}> &lt;meatball&gt;을 읽은 뒤 본문에서 떼어 보관 <small>(추천 · 요약·번역·로그 복사 확장에 변화량 줄이 안 보여요. 고칠 땐 변동 칩의 ✏️)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="legacyStatus" ${s.legacyStatus !== false ? 'checked' : ''}> 옛 &lt;status&gt; 태그도 미트볼 것으로 읽고 숨기기 <small>(v2.5 이전 채팅용 · <b>다른 프리셋이 &lt;status&gt;를 쓰면 끄세요</b> — 끄면 &lt;meatball&gt;만 건드려요)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="stashall"><i class="fa-solid fa-box-archive"></i> 이 채팅의 옛 태그도 모두 보관</button></div>
            <div class="ss-set-btns">
                <button class="menu_button" data-s-act="defmods">지금 기능 구성을 새 채팅 기본값으로</button>
                <button class="menu_button" data-s-act="regex">정규식 설치</button>
                <button class="menu_button" data-s-act="unregex">정규식 제거</button>
            </div>
        </div></div>`;
    el.addEventListener('input', (e) => { if (e.target.dataset.s === 'mascotVolume') { const lb = el.querySelector('.ss-mvol'); if (lb) lb.textContent = e.target.value; } });
    el.addEventListener('change', (e) => {
        const ev = e.target.dataset.sEvery;
        if (ev) { const set = settings(); set.injEvery = { ...(set.injEvery ?? {}), [ev]: e.target.value }; if (e.target.value === 'always') delete set.injEvery[ev]; saveSettings(); app.refreshNow(); return; }
        const k = e.target.dataset.s;
        if (!k) return;
        settings()[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value;
        saveSettings();
        onLine(el);
        if (ADDON_SET.has(k) && settings()[k] === true) app.loadAddons?.(true); // 🧩 덧붙이는 기능은 켤 때 처음 불러온다
        hintSetting(k, settings()[k]); // 방금 바꾼 설정에 주의할 게 있으면 한 번
        if (k === 'guardData' || k === 'guardLook') app.applyGuard?.(); // 🛡 바로 걸고 푼다
        if (k === 'hideSkip') app.sweepHidden?.();
        if (k === 'autoRegex' && e.target.checked) app.installRegex();
        if (k === 'legacyStatus') app.installRegex(); // 정규식도 같이 바꾼다
        if (/^bind[A-Z]/.test(k)) { app.refreshNow(); app.sideSweep?.(); } // 📦 따로 보관으로 돌린 칸은 쌓인 기록을 덩어리 하나로
        if (k === 'ssGenLang' && e.target.value === 'enview') toastr.info('이제부터 만드는 상태창은 영어로 저장되고 화면에만 번역돼요. 이미 한국어로 저장된 칸은 그대로예요.', TITLE);
        if (k === 'mascotSound' || k === 'mascotVolume') playMascotSound(); // 고르면 바로 들려주기
        app.storyChanged?.(); // 🧭 이야기 장치를 켜고 껐을 수 있음 (화면 깨짐 표시 맞추기)
        if (VIEW_KEYS.has(k)) { try { app.applyRetro?.(); } catch { /* 꾸밈일 뿐 */ } app.redecorate(); app.refreshNow(); rerenderPanels(true); app.renderHud?.(); return; } // 화면 모양이 바뀌는 스위치는 바로 다시 그림
        app.refreshNow();
    });
    onLine(el);
    el.addEventListener('click', async (e) => {
        const go = e.target.closest('[data-s-go]')?.dataset.sGo;
        if (go) { const t = el.querySelector(`input[data-s="${CSS.escape(go)}"]`)?.closest('label'); t?.scrollIntoView({ block: 'center', behavior: 'smooth' }); t?.classList.add('ss-set-flash'); setTimeout(() => t?.classList.remove('ss-set-flash'), 1400); return; }
        const pk = e.target.closest('[data-s-preset]')?.dataset.sPreset;
        if (pk) {
            applyPreset(pk);
            const set = settings();
            el.querySelectorAll('[data-s]').forEach(i => { const v = set[i.dataset.s]; if (v === undefined) return; if (i.type === 'checkbox') i.checked = !!v; else i.value = v; });
            el.querySelectorAll('[data-s-every]').forEach(i => { i.value = set.injEvery?.[i.dataset.sEvery] ?? 'always'; });
            return;
        }
        const a = e.target.closest('[data-s-act]')?.dataset.sAct;
        if (!a) return;
        if (a === 'diag') return diagnose();
        if (a === 'report') return openReport();
        if (a === 'copydump') return app.copyDump?.();
        if (a === 'tipreset') { settings().tipNever = {}; settings().hintSeen = {}; saveSettings(); toastr.info('다시 추천해 드릴게요.', TITLE); return; }
        if (a === 'partsreset') { const { resetParts, partsCount } = await import('./parts.js'); const n = partsCount(); resetParts(); toastr.info(n ? `숨겨 둔 ${n}개를 다시 보이게 했어요. (관계 탭의 「보일 것」은 관계 칸에서 따로 켜요)` : '숨긴 게 없어요.', TITLE); return; }
        if (a === 'whatsnew') return app.showWhatsNew(true);
        if (a === 'help') return openHelp();
        if (a === 'toenglish') return convertToEnglish(e.target.closest('button'));
        if (a === 'trprune') { const { pruneTr } = await import('./translate.js'); return pruneTr(); }
        if (a === 'trclear') { const { clearTr } = await import('./translate.js'); return clearTr(e.target.closest('button')); }
        if (a === 'romrec' || a === 'romoff') {
            const set = settings(), on = a === 'romrec';
            if (on) { set.romBond = true; set.romCap = true; set.romFacts = true; }
            else for (const k of ['romBond', 'romCap', 'romFatigue', 'romFacts', 'romDrive', 'romSpark']) set[k] = false;
            saveSettings();
            el.querySelectorAll('[data-s^="rom"]').forEach(i => { if (i.type === 'checkbox') i.checked = !!set[i.dataset.s]; });
            app.refreshNow();
            toastr.success(on ? '추천 세트(①②④)를 켰어요. 지금부터 오는 답에 적용돼요.' : '로맨스 보정을 모두 껐어요. (내 추가 주입문은 그대로예요)', TITLE);
            return;
        }
        if (a === 'mascotsound') { playMascotSound(); return; }
        if (a === 'lightall') {
            const set = settings();
            Object.assign(set, LIGHT_OFF);
            saveSettings();
            el.querySelectorAll('[data-s]').forEach(i => { const v = set[i.dataset.s]; if (v === undefined) return; if (i.type === 'checkbox') i.checked = !!v; else i.value = v; });
            app.redecorate(); app.refreshNow(); rerenderPanels(true);
            toastr.success('메모 · 앨범 · 속마음 · 플레이 기록 · 하루 정리 · 팁 · 마스코트를 껐어요. 하나씩 다시 켤 수 있어요.', TITLE);
            return;
        }
        if (a === 'perf') return app.measureLoad();
        if (a === 'backup') return fullBackup();
        if (a === 'open') openSheet();
        if (a === 'wizard') openWizard();
        if (a === 'prompts') openPromptWindow();
        if (a === 'theme') openThemeWindow();
        if (a === 'chaton') { const m = getMeta(true); m.off = false; await saveMeta(); app.refreshNow(); toastr.success('이 채팅에서 켰어요.', TITLE); }
        if (a === 'profiles') { el.querySelector('[data-s="trProfile"]').innerHTML = profileOptions(settings().trProfile).replace('메인 연결 그대로', '확장 AI 모델 그대로 (없으면 메인)'); el.querySelector('[data-s="aiProfile"]').innerHTML = profileOptions(settings().aiProfile); for (const k of ['profContact', 'profGen', 'profFeeds', 'profAnalyze']) el.querySelector(`[data-s="${k}"]`).innerHTML = featOptions(settings()[k]); toastr.info(`연결 프로필 ${listProfiles().length}개`, TITLE); }
        if (a === 'defmods') { const m = getMeta(); if (!m) return; settings().defaultMods = { ...m.mods }; saveSettings(); toastr.success('저장했어요.', TITLE); }
        if (a === 'regex') app.installRegex() ? toastr.success('설치했어요.', TITLE) : toastr.info('이미 설치되어 있어요.', TITLE);
        if (a === 'unregex') { app.removeRegex(); toastr.info('제거했어요.', TITLE); }
        if (a === 'trsheet') translateSheet(e.target.closest('button'));
        if (a === 'stashall') {
            const chat = ctx().chat ?? [];
            let n = 0;
            for (const m of chat) n += stashAllSwipes(m);
            if (!n) { toastr.info('옮길 태그가 없어요.', TITLE); return; }
            await ctx().saveChat?.();
            await ctx().reloadCurrentChat?.();
            toastr.success(`답 ${n}개의 태그를 보관했어요.`, TITLE);
        }
    });
    document.getElementById('extensions_settings2')?.appendChild(el);
}
