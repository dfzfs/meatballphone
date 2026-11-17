# tools — 개발용 (실리태번은 이 폴더를 읽지 않아요)

- `compat-check.mjs` — 함께 쓰는 테마 확장과의 호환 검사. 그 확장 저장소를 받아 둔 폴더를 주면 두 확장 사이의 약속(호출 스택 함수 이름 · 설정 키 · 주입 칸 · 설정 칸 선택자 · 정리한 보기 열쇠 · 맞춤 시트 클래스)이 깨졌는지 봐요.
  - `node tools/compat-check.mjs <폴더>` (정적) · `--live` (브라우저에서 그 확장의 설정 탭을 우리 설정 칸에 실제로 돌려 봄)
  - AI 부르는 함수 이름(`src/ai.js` · `src/help.js` · `src/translate.js`) · `aiProfile` · `prof*` · `trProfile` 설정 키 · `#ss-settings` · `b.ss-set-h` · `data-s` · `--ss-*` · `statussim_*` 를 바꾸면 이 검사를 꼭 돌려요.
- `harness/` — 가짜 실리태번(`st-stub.js`)에 이 확장을 그대로 올려 Playwright로 눌러 보는 시험대.
  - `node tools/harness/run-all.mjs` — 모든 시나리오 (퀘스트 · 칩 점검 · 빨간 점 · 기능 끄기 · 버린 물건 · 번역 · 탭 전부 열기 · 스와이프)
  - `N=600 node tools/harness/t-perf.mjs` — 긴 채팅 부하 (`TR=1`이면 화면 번역 사전 2500개) · `EXT_DIR=<옛 판 폴더>`로 옛 판과 비교
  - `node tools/harness/bench-solo.mjs` — 「수치만 켠 미트볼」 vs 「수치만 있는 가상의 단독 확장(`mini-stats.js`)」 vs 「확장 없음」 (CPU 4배 느리게 · `RATE=`로 조절 · `bench.html`)
  - `node tools/harness/t-fuzz.mjs` — 모든 탭 · 보기/편집의 버튼을 하나씩 눌러 보기 (약 3분 · run-all엔 안 들어감 · `JUNK=1`이면 AI가 이상한 답을 줄 때 · v2.7.18부터 단추를 이름으로 찾아서 AI 부르는 단추도 실제로 눌러요 — 「AI 호출 20회 넘게」를 확인)

## 파일 지도 (아래에서 위로 쌓여요 — 위 파일만 아래 파일을 불러요)

| 층 | 파일 | 하는 일 |
|---|---|---|
| 바닥 | `src/util.js` | 숫자 · 글자 · 달력 계산. 아무것도 불러오지 않음 |
| 바닥 | `src/core.js` | 상수 · 설정 · 채팅 메타 · 데이터 모양. `util.js`를 다시 내보냄 |
| 계산 | `src/ops.js` | 규칙: `<meatball>` 한 줄(키=값)을 상태에 반영 — 종류마다 `op이름` 함수 + `OPS` 표 |
| 계산 | `src/engine.js` | `<meatball>` 읽기 → 상태 다시 계산(`compute`) → 프롬프트 주입. `ops.js`를 다시 내보냄 |
| AI | `src/prompts.js` · `src/ai.js` · `src/translate.js` | AI 호출 · 번역 |
| 기능 | `contact` · `dice` · `extra` · `fate` · `feeds` · `money` · `notify` · `safe` · `pip` · `tips` · `help` · `report` · `mascot` | 칸 하나씩 |
| 화면 | `src/tiles.js` | 미니 위젯 · 타일 판 |
| 화면 | `src/views.js` | 칸별 화면 · 관리 · 칸 공통 동작. `tiles.js`를 다시 내보냄 |
| 틀 | `src/shell.js` | 패널 · HUD · 사이드 |
| 기능 | `src/story.js` · `src/story_ui.js` | 🧭 이야기 장치 (v2.8): 선택 기능 묶음 — `story.js`는 계산 · 주입 · 이벤트, `story_ui.js`는 탭 아래에 붙는 칸과 단추. 새 장치: `DEVICES` · `KEY`(설정 키 · `core.js` 기본값 false) → `storyInjection`(AI에게 갈 줄) · `afterReply`(답 받은 뒤) → `story_ui.js`의 `BODY` · `HOME`(붙을 탭) · `act` → `settings_ui.js`에 체크 칸 |
| 기능 | `src/minihome.js` | 📒 미니홈피 자료 (화면 없음): `diaryEntries` · `timeline` · `timelineExtra` (다이어리 · 연표 — `state.days`를 읽기만) · `visitable` · `personPage` (파도타기) · `gbList` · `gbWrite` · `gbReply` · `gbDelete` · `gbTick` (방명록 · 설정 `guestbook` · `guestbookAuto`) · `ilchonOf` · `ilchonWrite` · `ilchonSet` (일촌평) · `todayCount` (TODAY) · `wall` (방명록 + 낙서) |
| 기능 | `src/relgraph.js` | 🕸 관계도 자료 (화면 없음): `relGraph` → 점(x · y 0~1)과 선(굵기 w · 성격 tone) · `relGraphOf(이름)` |
| 기능 | `src/addons.js` | 🧩 덧붙이는 기능 (화면 없음 · 전부 기본 끔): 장비 `equipped` · `equip` · `unequip` (`gearOn`) · 날씨/시간대 `ambientOf` (`ambientOn`) · 단체방 알리기 `roomTell` · `setRoomTell` · `roomSummaryAI` · 연락 합치기 `mergeContactThreads` · 약속 기한 `promiseDday` (`promiseClock`) · 연락처 로어북 `loreEntries` · `setContactLore` · 선물 반응 `giftReaction` (`giftTaste`) · `chatSize` · 상태 카드 `cardCanvas` · `cardDownload`. AI에게 가는 줄은 `extraInjection` 한곳. 엮이는 곳: 장비 → 주사위 · 흥정 · 일하기 · 직접 굴린 퀘스트(`app.rollBonus`) · 궂은 날 → 흥정 −2(`app.haggleDC`) · 밤 → 가게 닫음(`ambientShop`) · 선물 취향/약속 어김 → 방명록(`app.gbNudge`) · 방명록 답글 → 우정 +1 · 일촌평 → 관계도. 시험: `t-minihome.mjs` · `t-addons.mjs`. **이 두 파일은 켠 기능이나 그 자료가 있을 때만 불러와요** (`index.js`의 `loadAddons`) — 설정 창에서 켤 때는 `app.loadAddons(true)`를 불러 줘요. 아무것도 안 켠 채로 옛 판과 똑같은지는 `ab-same.mjs`로 비교해요 |
| 기능 | `src/mind.js` | 💭 프로필 탭 안의 「속마음」 칸 (v2.9): 보는 방식 · 뜨는 때(`mindFreq` always · random · tab) · 「지금 받기」(`ai.js fetchMinds`) · 👁 볼 때마다 눈치(`peekCost` · `core.js mindCovered` · `meta.mindSeen`) · 지난 속마음(`rel.user[].mindLog`). 시험: `t-mind.mjs` |
| 기능 | `src/life.js` | 🍞 생활 틀 (v2.9): 욕구 게이지 추천 세트(`withSet`) · 미트볼 상점(`meatShop`) · 생활비 틀(`withBills`) · 👕 옷차림 화면(`gearSection` — 계산은 `addons.js`). 욕구 계산은 `ops.js needsTick`(게이지의 `decay` · `stages` · `zero` · 상태의 `tick` · `speed` · `mods`). 시험: `t-life.mjs` |
| 기능 | `src/simple.js` | 🍙 심플 모드 (채팅마다 `meta.simple`): 탭 없이 타일 판 하나 · 추천 6칸 + `SIMPLE_EXTRA`만 · 팁 · 추천 · 알림 창 없음. `toSimple`(기본 → 심플 · 심플에 없는 칸은 끄기만 하고 `meta.simpleBak`에 적어 둠) · `widen`(심플 → 기본 · 그 칸을 되살림) · `setExtra`(칸 하나 더 켜기 · AI 0회) · `openSimpleMenu`(톱니 창) · `startSimple`(만들기 창). 톱니를 누르거나 모드를 바꿀 때만 불러와요. 심플인지는 `core.js`의 `isSimple()` 하나로 봐요 — 갈리는 곳: `tiles.js`(칸 · 배치) · `shell.js`(HUD · 미니창 · 패널 머리) · `notify.js` · `tips.js` · `wizard.js`. 스타일은 `css/simple.css`. 시험: `t-simple.mjs` |
| 틀 | `src/lazy.js` | 눌렀을 때 불러오는 창 목록 (`help.js` · `wizard.js` · `windows.js`) |
| 틀 | `src/wizard.js` · `src/windows.js` | 처음 만들기 · 프롬프트/꾸미기 창 (눌렀을 때 불러옴) |
| 맨 위 | `src/settings_ui.js` · `src/commands.js` | 확장 설정 서랍 · 슬래시 커맨드 |
| 맨 위 | `index.js` | 이벤트 연결 · 칩 · 갱신 · 업데이트 알림 |

- **새 변화량 종류**: `ops.js`의 `KEYMAP` · `KEY_MOD`에 키 → `op이름` 함수 → `OPS` 표.
- **옛 채팅 한 번 손보기**: `engine.js`의 `fixOldMeta`에 한 줄.
- **위 파일의 함수를 아래 파일에서 불러야 할 때**: import하지 말고 `app.이름`에 걸어요. 건 것은 `core.js` 맨 위 목록에 적어요.
- **넘어가도 되는 오류**: 빈 `catch { }` 대신 `ssNote('어디서', e)` — 콘솔엔 안 찍히고 오류 보고문에만 남아요.
- **스타일**: `style.css`는 `@import`만 있고 내용은 `css/` 폴더에 순서대로 (`base` → `panel` → `hud` → `patches` → `tiles` → `routes`). 뒤 파일이 앞 파일을 덮어써요.

## 작업 순서 — dev에 바로 올리지 않기

`dev`는 `auto_update`로 쓰는 분들에게 바로 나가요. 그래서:
1. 고칠 땐 `dev`에서 작업용 브랜치를 따요 (예: `review/…` · `next`).
2. 거기에 올리면 자동 시험이 돌아요 (Actions 탭). 필요하면 실리태번 확장 설치 창의 브랜치 칸에 그 브랜치 이름을 적어 직접 써 봐요.
3. 시험이 통과하고 써 봐서 괜찮으면 `dev`에 합쳐요. 합칠 땐 `manifest.json` · `src/core.js`의 판 번호와 README · `index.js`의 「바뀐 점」을 같이 올려요.

## 올릴 때마다 자동 시험 (`.github/workflows/test.yml`)

깃허브에 올리면 문법 검사 → 판 번호 확인(`manifest.json` = `src/core.js`) → 시나리오 전부를 돌려요. 결과는 저장소의 Actions 탭에서 봐요.
내 컴퓨터에서 돌릴 땐 Playwright가 `/opt/npm-tools`에 없으면 저장소 폴더에서 `npm install --no-save playwright` 한 번.

## 선택 기능을 넣을 때 (끄면 아무 영향이 없게)

`pairAff` · `relRace`가 본보기예요. 설정 기본값은 `false`, 켰는지는 `=== true`로만 봐요.
- **계산**: 처리기 맨 앞에서 꺼져 있으면 바로 돌아감 (`opPairaff`) · 집계는 켰을 때만 그릇을 만듦 (`compute`의 `recent`).
- **AI에게 가는 글**: 안내 줄(`tagKeysFor`)과 주입 줄(`buildInjection0`)에 켰을 때만 덧붙임.
- **화면**: 켰을 때만 그림. 스타일은 `css/routes.css`.
- **시험**: `t-routes.mjs`처럼 「끄면 주입문이 글자 하나 안 바뀐다」를 같이 확인.
