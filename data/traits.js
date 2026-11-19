// 🧬 특성 — 심즈 3 · 4의 특성 개념을 참고해 이 상태창의 계산에 맞게 새로 정리했다 (이름은 일반 단어 · 설명과 효과는 직접 씀)
//   효과 열쇠: dice { 능력치: n } · rate { 욕구: 배수 } · sleep · rest · homeRest · workCost · workPay · food · foodMood · price · buyMood
//              aff · affDown · trust · trustDown (오르는 · 깎이는 폭 배수)
//              early · late (애정 60 전 / 후에 오르는 폭 배수) · one (가장 가까운 한 사람에게 애정 배수)
//              allure (궁합 가중치: 상대가 나에게 끌리는 정도 +) · cold (상대 입장에서 애정 궁합 −)
//              joy { up, down } (누군가와 사이가 오르거나 틀어질 때 내 기분 +) · giftMul (선물 효과 배수) · roam (새 장소로 가면 기분 +)
//              erratic (몇 시간마다 기분이 줄어드는 속도가 바뀜) · aspBonus (야망 단계 보상 배수)
//              wx { 좋아하는 날씨 정규식 } · wxBad · luck: 'best' | 'worst' · crowd: +1 사람 많을 때 좋음 / −1 혼자일 때 좋음
//              neat · shy · bgmMood · jealousSelf · jealousy · noFumble · fumble (대실패 1~n)
//              when (커스텀 특성: 이 조건일 때만 켜짐)
export const TRAIT_CATS = [['emo', '감정'], ['love', '연애'], ['social', '사교'], ['hobby', '취미'], ['life', '생활']];
export const TRAITS = [
    // 감정
    { id: 'cheerful', cat: 'emo', icon: '😄', name: '명랑함', desc: '웬만한 일은 웃어넘겨요. 기분이 쉽게 꺾이지 않아요', rate: { mood: 0.7 } },
    { id: 'gloomy', cat: 'emo', icon: '🌧️', name: '우울함', desc: '세상이 늘 조금 흐려 보여요. 대신 빗소리가 들리면 마음이 놓여요', rate: { mood: 1.3 }, wx: '비' },
    { id: 'hothead', cat: 'emo', icon: '😤', name: '다혈질', desc: '참을성이 짧고 일단 부딪쳐요. 다투면 우정이 크게 깎여요', dice: { 힘: 1 }, trustDown: 1.4 },
    { id: 'calm', cat: 'emo', icon: '🧘', name: '침착함', desc: '위기에도 숨을 고를 줄 알아요. 대실패가 그냥 실패로 끝나요', noFumble: true },
    { id: 'emotional', cat: 'emo', icon: '🥺', name: '감수성 풍부', desc: '말 한마디에도 마음이 크게 출렁여요. 관계가 크게 오르고 크게 내려요', aff: 1.2, affDown: 1.2 },
    { id: 'stoic', cat: 'emo', icon: '🗿', name: '무덤덤', desc: '속은 몰라도 겉은 늘 잔잔해요. 관계가 천천히 오르고 천천히 식어요', aff: 0.85, affDown: 0.7 },
    { id: 'selfassured', cat: 'emo', icon: '😎', name: '자신만만', desc: '나를 믿는 힘이 있어요. 기분이 잘 버티고 말에 힘이 실려요', rate: { mood: 0.85 }, dice: { 매력: 1 } },
    { id: 'neurotic', cat: 'emo', icon: '😰', name: '예민함', desc: '작은 낌새도 놓치지 않지만, 그만큼 마음이 빨리 닳아요', dice: { 감각: 1 }, rate: { mood: 1.2 } },
    { id: 'erratic', cat: 'emo', icon: '🎭', name: '변덕쟁이', desc: '기분이 날씨처럼 바뀌어요. 몇 시간마다 기분이 훅 꺼지거나 멀쩡해요', erratic: true },
    { id: 'excitable', cat: 'emo', icon: '🤩', name: '흥 많음', desc: '좋은 일엔 누구보다 들떠요. 기분은 잘 버티지만 금방 지쳐요', rate: { mood: 0.8, energy: 1.1 } },
    { id: 'grumpy', cat: 'emo', icon: '😾', name: '심술쟁이', desc: '툴툴대는 게 습관이에요. 기분은 잘 상하지만 다들 그러려니 해서 다퉈도 덜 깎여요', rate: { mood: 1.15 }, trustDown: 0.8 },
    { id: 'brave', cat: 'emo', icon: '🦁', name: '용감함', desc: '위험 앞에서 한 발 먼저 나서요', dice: { 힘: 1, 민첩: 1 } },
    { id: 'coward', cat: 'emo', icon: '🐭', name: '겁쟁이', desc: '무서운 건 피하고 보지만, 덕분에 위험을 먼저 알아채요', dice: { 힘: -1, 감각: 1 } },
    { id: 'lucky', cat: 'emo', icon: '🍀', name: '행운아', desc: '이상하게 일이 잘 풀려요. 운세 주사위를 두 번 굴려 좋은 쪽', luck: 'best' },
    { id: 'unlucky', cat: 'emo', icon: '🐈‍⬛', name: '불운아', desc: '하필이면 늘 나예요. 운세는 두 번 굴려 나쁜 쪽, 대신 머리로 버텨요', luck: 'worst', dice: { 지능: 1 } },
    // 연애
    { id: 'romantic', cat: 'love', icon: '🌹', name: '로맨틱', desc: '분위기에 약하고 설렘을 잘 느껴요. 애정이 잘 올라요', aff: 1.2 },
    { id: 'hopeless', cat: 'love', icon: '💞', name: '사랑에 올인', desc: '사랑에 온 마음을 걸어요. 애정이 크게 오르는 만큼 상처도 깊어요', aff: 1.3, affDown: 1.4 },
    { id: 'irresistible', cat: 'love', icon: '💋', name: '치명적인 매력', desc: '눈길이 저절로 머무는 사람. 누구와든 궁합이 한 단계 좋아지지만 질투도 따라와요', allure: 2, jealousy: 1.3 },
    { id: 'kisser', cat: 'love', icon: '💄', name: '키스 장인', desc: '가까워질수록 더 빛나요. 애정 60을 넘으면 애정이 훨씬 잘 올라요', late: 1.3 },
    { id: 'flirty', cat: 'love', icon: '😘', name: '바람둥이', desc: '누구에게나 살가워요. 애정은 잘 오르지만 질투를 부르기 쉬워요', aff: 1.15, jealousy: 1.5 },
    { id: 'noncommittal', cat: 'love', icon: '🕊️', name: '구속 싫음', desc: '썸은 즐거운데 깊어지면 숨이 막혀요. 애정 60 전엔 빠르고, 그 뒤론 느려요', early: 1.15, late: 0.6 },
    { id: 'loyal', cat: 'love', icon: '💍', name: '일편단심', desc: '한 사람만 바라봐요. 가장 가까운 한 명에게 애정이 더 잘 올라요', one: 1.25 },
    { id: 'unflirty', cat: 'love', icon: '🧱', name: '철벽', desc: '설렘보다 믿음이 먼저예요. 애정은 느리게, 우정은 빠르게. 상대도 쉽게 못 끌려요', aff: 0.75, trust: 1.2, cold: 1 },
    { id: 'jealous', cat: 'love', icon: '😒', name: '질투쟁이', desc: '내 사람이 남과 웃으면 신경 쓰여요. 질투가 생기면 관계가 더 흔들려요', jealousSelf: 1.5 },
    // 사교
    { id: 'charming', cat: 'social', icon: '✨', name: '매력덩이', desc: '말발이 좋고 호감을 잘 사요', dice: { 매력: 1 }, aff: 1.1 },
    { id: 'shy', cat: 'social', icon: '🙈', name: '수줍음', desc: '낯가림이 심해 처음엔 느리지만, 가까워지면 누구보다 깊어져요', shy: true },
    { id: 'outgoing', cat: 'social', icon: '🎉', name: '인싸', desc: '사람 사이에 있어야 충전돼요. 누군가와 있으면 기분이 덜 줄어요', crowd: 1 },
    { id: 'loner', cat: 'social', icon: '🌙', name: '외톨이', desc: '혼자만의 시간이 꼭 필요해요. 혼자 있으면 기분이 덜 줄어요', crowd: -1 },
    { id: 'partyanimal', cat: 'social', icon: '🪩', name: '파티광', desc: '사람 많은 곳이 무대예요. 함께 있으면 신나지만 체력은 빨리 닳아요', crowd: 1, dice: { 매력: 1 }, rate: { energy: 1.1 } },
    { id: 'kind', cat: 'social', icon: '🤍', name: '다정함', desc: '먼저 안부를 묻는 사람. 우정이 잘 쌓여요', trust: 1.2 },
    { id: 'mean', cat: 'social', icon: '😈', name: '못됨', desc: '말에 가시가 있어요. 우정은 덜 쌓이지만 기 싸움엔 강해요', trust: 0.8, dice: { 매력: 1 } },
    { id: 'good', cat: 'social', icon: '😇', name: '착한 사람', desc: '남이 잘되면 내가 기뻐요. 우정이 오를 때마다 기분도 조금 올라요', trust: 1.1, joy: { up: 2 } },
    { id: 'evil', cat: 'social', icon: '🦹', name: '악당', desc: '남의 불행이 꿀맛이에요. 누군가와 틀어지면 오히려 기분이 좋아요', trust: 0.85, joy: { down: 3 } },
    { id: 'goofball', cat: 'social', icon: '🤡', name: '익살꾼', desc: '분위기 메이커. 함께 있는 사람과 우정이 잘 올라요', trust: 1.1, crowd: 1 },
    { id: 'bro', cat: 'social', icon: '🤜', name: '의리파', desc: '친구라면 끝까지 챙겨요. 우정은 잘 쌓이고 잘 안 깨지지만, 연애는 좀 둔해요', trust: 1.2, trustDown: 0.7, aff: 0.9 },
    { id: 'awkward', cat: 'social', icon: '🫣', name: '숫기 없음', desc: '말 걸 타이밍을 늘 놓쳐요. 관계가 천천히 쌓이고 혼자가 편해요', trust: 0.85, aff: 0.9, crowd: -1 },
    { id: 'perceptive', cat: 'social', icon: '👀', name: '눈치 백단', desc: '표정만 봐도 속을 알아요', dice: { 감각: 1 } },
    { id: 'schmoozer', cat: 'social', icon: '🎩', name: '아부왕', desc: '듣기 좋은 말을 잘 골라요. 말발이 좋고 일하면 조금 더 받아요', dice: { 매력: 1 }, workPay: 1.1 },
    { id: 'generous', cat: 'social', icon: '🎁', name: '통이 큰', desc: '주는 게 더 즐거워요. 선물 효과가 훨씬 커요', giftMul: 1.5 },
    { id: 'snob', cat: 'social', icon: '🍷', name: '속물', desc: '좋은 것만 눈에 들어와요. 사면 기분이 좋지만 늘 비싸게 사요', buyMood: 3, price: 1.1 },
    { id: 'mooch', cat: 'social', icon: '🪳', name: '빈대', desc: '얻어먹는 데 재능이 있어요. 물건은 싸게 구하지만 우정이 덜 쌓여요', price: 0.85, trust: 0.9 },
    // 취미
    { id: 'foodie', cat: 'hobby', icon: '🍰', name: '미식가', desc: '한 끼도 대충 못 넘겨요. 먹으면 더 든든하고 기분도 좋아요', food: 1.3, foodMood: 4 },
    { id: 'naturalcook', cat: 'hobby', icon: '🍳', name: '요리 솜씨', desc: '뭘 해 먹어도 맛있어요. 먹으면 조금 더 든든해요', food: 1.2, foodMood: 2 },
    { id: 'glutton', cat: 'hobby', icon: '🍖', name: '먹보', desc: '먹고 돌아서면 배고파요', rate: { hunger: 1.3 } },
    { id: 'bookworm', cat: 'hobby', icon: '📚', name: '책벌레', desc: '글자만 보면 빨려 들어가요. 머리 쓰는 판정에 강해요', dice: { 지능: 1 } },
    { id: 'geek', cat: 'hobby', icon: '🕹️', name: '덕후', desc: '좋아하는 것엔 밤새도록 진심이에요. 머리는 잘 돌지만 배가 빨리 고파요', dice: { 지능: 1 }, rate: { hunger: 1.1 } },
    { id: 'active', cat: 'hobby', icon: '🏃', name: '활동적', desc: '가만히 있으면 좀이 쑤셔요. 몸 쓰는 판정에 강하지만 쉽게 지쳐요', dice: { 힘: 1 }, rate: { energy: 1.15 } },
    { id: 'athletic', cat: 'hobby', icon: '🏋️', name: '운동 마니아', desc: '몸이 곧 재산. 힘이 좋고 체력도 오래 가요', dice: { 힘: 1 }, rate: { energy: 0.9 } },
    { id: 'couch', cat: 'hobby', icon: '📺', name: '소파 귀신', desc: '소파와 한 몸이에요. 집에서 쉬면 금방 회복되지만 몸이 둔해요', homeRest: 1.5, dice: { 힘: -1 } },
    { id: 'artsy', cat: 'hobby', icon: '🎨', name: '예술가', desc: '색과 소리에 예민해요. 감각 판정에 강해요', dice: { 감각: 1 } },
    { id: 'music', cat: 'hobby', icon: '🎧', name: '음악 애호가', desc: '노래 한 곡이면 하루가 버텨져요. 곡이 흐르면 기분이 잘 안 줄어요', bgmMood: 0.6 },
    { id: 'dancer', cat: 'hobby', icon: '💃', name: '춤꾼', desc: '리듬만 있으면 몸이 먼저 움직여요. 몸놀림이 좋고 곡이 흐르면 신나요', dice: { 민첩: 1 }, bgmMood: 0.7 },
    { id: 'adventurous', cat: 'hobby', icon: '🗺️', name: '모험가', desc: '모르는 길이 제일 설레요. 다른 곳으로 옮길 때마다 기분이 올라요', roam: 3, dice: { 민첩: 1 } },
    { id: 'outdoor', cat: 'hobby', icon: '🌿', name: '자연 애호가', desc: '햇볕과 바람이 보약이에요. 맑은 날엔 기분 · 판정이 좋아요', wx: '맑' },
    { id: 'indoor', cat: 'hobby', icon: '🛋️', name: '집순이', desc: '집이 최고예요. 집에선 금방 회복하지만 밖은 피곤해요', homeRest: 1.5, rate: { energy: 1.1 } },
    { id: 'cold', cat: 'hobby', icon: '❄️', name: '추위 좋아함', desc: '차가운 공기가 머리를 맑게 해요. 눈 오는 날 기운이 나고 더위엔 처져요', wx: '눈|추', wxBad: '더' },
    { id: 'hot', cat: 'hobby', icon: '☀️', name: '더위 좋아함', desc: '뜨거운 햇살이 좋아요. 더운 날 기운이 나고 추위엔 처져요', wx: '더|맑', wxBad: '눈|추' },
    // 생활
    { id: 'neat', cat: 'life', icon: '🧽', name: '깔끔쟁이', desc: '먼지 한 톨도 신경 쓰여요. 못 씻으면 기분까지 상해요', neat: true },
    { id: 'squeamish', cat: 'life', icon: '🤢', name: '비위 약함', desc: '더러운 걸 보면 입맛이 뚝. 못 씻으면 기분이 상하고 배가 덜 고파요', neat: true, rate: { hunger: 0.9 } },
    { id: 'slob', cat: 'life', icon: '🧦', name: '털털함', desc: '좀 지저분해도 괜찮아요. 위생이 천천히 줄어요', rate: { hygiene: 0.7 } },
    { id: 'sleeper', cat: 'life', icon: '😴', name: '잠꾸러기', desc: '머리만 대면 잠들어요. 자면 크게 회복돼요', sleep: 1.5 },
    { id: 'insomnia', cat: 'life', icon: '🦉', name: '예민한 잠', desc: '작은 소리에도 깨요. 잠으로 덜 회복되지만 감각은 날카로워요', sleep: 0.8, dice: { 감각: 1 } },
    { id: 'workaholic', cat: 'life', icon: '💼', name: '일벌레', desc: '일이 곧 쉼이에요. 일해도 덜 지치고 더 벌어요', workCost: 0.7, workPay: 1.2 },
    { id: 'ambitious', cat: 'life', icon: '🚀', name: '야심가', desc: '목표가 있어야 살아 있는 느낌. 일하면 더 벌고 야망 보상이 커져요', workPay: 1.15, aspBonus: 1.5 },
    { id: 'lazy', cat: 'life', icon: '🦥', name: '게으름', desc: '내일 할 수 있는 건 내일. 쉬면 잘 회복되지만 일은 힘들어요', rest: 1.5, workCost: 1.3 },
    { id: 'perfectionist', cat: 'life', icon: '📐', name: '완벽주의', desc: '대충은 못 참아요. 꼼꼼하지만 마음이 쉽게 상해요', dice: { 감각: 1 }, rate: { mood: 1.1 } },
    { id: 'frugal', cat: 'life', icon: '🪙', name: '알뜰함', desc: '한 푼이라도 아껴요. 물건을 조금 싸게 사요', price: 0.9 },
    { id: 'shopaholic', cat: 'life', icon: '🛍️', name: '쇼핑 중독', desc: '장바구니가 위로예요. 물건을 사면 기분이 좋아요', buyMood: 5 },
    { id: 'materialistic', cat: 'life', icon: '💎', name: '물욕', desc: '새 물건이 없으면 시들해요. 사면 기분이 오르지만 평소엔 조금 빨리 가라앉아요', buyMood: 4, rate: { mood: 1.1 } },
    { id: 'kleptomaniac', cat: 'life', icon: '🫳', name: '손버릇', desc: '나도 모르게 주머니에… 손이 빠르고 싸게 구하지만, 들키면 크게 틀어져요', dice: { 민첩: 1 }, price: 0.95, trustDown: 1.2 },
    { id: 'clumsy', cat: 'life', icon: '🙃', name: '덤벙이', desc: '발밑을 잘 안 봐요. 손재주 판정이 약하고 대실패가 잦아요', dice: { 민첩: -1 }, fumble: 2 },
    { id: 'absent', cat: 'life', icon: '🫧', name: '건망증', desc: '깜빡하는 게 일상. 실수가 잦지만 나쁜 일도 금방 잊어요', fumble: 2, rate: { mood: 0.9 } },
    { id: 'childish', cat: 'life', icon: '🧸', name: '철부지', desc: '어른인 척은 피곤해요. 머리 쓰는 건 약하지만 잘 웃고 잘 친해져요', dice: { 지능: -1 }, rate: { mood: 0.85 }, trust: 1.1 },
    { id: 'genius', cat: 'life', icon: '🧠', name: '천재', desc: '남들이 한참 걸릴 걸 한눈에 봐요. 머리가 아주 좋아요', dice: { 지능: 2 } },
];

// ───── 커스텀 특성 (나만의 특성) ─────
// 조건: 효과는 아래 목록에서 하나만 · 「강」은 켜지는 조건(언제)이나 단점을 하나 붙여야 고를 수 있음
export const CUSTOM_FX = [
    { id: 'mood', name: '기분이 잘 안 꺾임', make: (p) => ({ rate: { mood: p > 1 ? 0.7 : 0.85 } }) },
    { id: 'energy', name: '잘 안 지침', make: (p) => ({ rate: { energy: p > 1 ? 0.75 : 0.88 } }) },
    { id: 'hunger', name: '배가 덜 고픔', make: (p) => ({ rate: { hunger: p > 1 ? 0.75 : 0.88 } }) },
    { id: 'hygiene', name: '잘 안 더러워짐', make: (p) => ({ rate: { hygiene: p > 1 ? 0.7 : 0.85 } }) },
    { id: 'dice', name: '판정 보너스', attr: true, make: (p, a) => ({ dice: { [a || '매력']: p > 1 ? 2 : 1 } }) },
    { id: 'aff', name: '애정이 잘 오름', make: (p) => ({ aff: p > 1 ? 1.2 : 1.1 }) },
    { id: 'trust', name: '우정이 잘 쌓임', make: (p) => ({ trust: p > 1 ? 1.2 : 1.1 }) },
    { id: 'allure', name: '궁합 가중치', make: (p) => ({ allure: p > 1 ? 2 : 1 }) },
    { id: 'sleep', name: '잠으로 잘 회복', make: (p) => ({ sleep: p > 1 ? 1.4 : 1.2 }) },
    { id: 'price', name: '물건 싸게', make: (p) => ({ price: p > 1 ? 0.85 : 0.93 }) },
    { id: 'buyMood', name: '사면 기분 좋음', make: (p) => ({ buyMood: p > 1 ? 6 : 3 }) },
    { id: 'work', name: '일하면 더 벌기', make: (p) => ({ workPay: p > 1 ? 1.25 : 1.1 }) },
];
export const CUSTOM_CON = [
    { id: '', name: '없음', make: () => ({}) },
    { id: 'moodfast', name: '기분이 빨리 줄어듦', make: () => ({ rate: { mood: 1.2 } }) },
    { id: 'tired', name: '쉽게 지침', make: () => ({ rate: { energy: 1.15 } }) },
    { id: 'hungry', name: '배가 빨리 고픔', make: () => ({ rate: { hunger: 1.15 } }) },
    { id: 'clumsy', name: '대실패 잦음', make: () => ({ fumble: 2 }) },
    { id: 'cold', name: '우정이 덜 쌓임', make: () => ({ trust: 0.9 }) },
    { id: 'pricey', name: '물건이 비쌈', make: () => ({ price: 1.1 }) },
];
export const WHEN = [['always', '항상'], ['alone', '혼자일 때'], ['with', '누군가와 있을 때'], ['night', '밤 (20~6시)'], ['day', '낮 (6~20시)'], ['wet', '비 · 눈 오는 날'], ['home', '집에서'], ['out', '밖에서'], ['low', '욕구가 낮을 때']];
export const CUSTOM_MAX = 6;
const mergeFx = (...L) => L.reduce((o, x) => {
    for (const [k, v] of Object.entries(x)) {
        if (v && typeof v === 'object') { o[k] = { ...(o[k] ?? {}) }; for (const [s, n] of Object.entries(v)) o[k][s] = k === 'dice' ? (o[k][s] ?? 0) + n : (o[k][s] ?? 1) * n; }
        else if (typeof v === 'number' && !['fumble', 'buyMood', 'allure'].includes(k)) o[k] = (o[k] ?? 1) * v;
        else o[k] = typeof v === 'number' ? Math.max(o[k] ?? 0, v) : v;
    }
    return o;
}, {});
// 저장된 정의 → 정리 (이상한 값은 버림 · 조건 규칙 지키기)
export function normCustomTrait(c) {
    if (!c || typeof c !== 'object') return null;
    const name = String(c.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 10); if (!name) return null;
    const fx = CUSTOM_FX.find(f => f.id === c.fx) ?? CUSTOM_FX[0], con = CUSTOM_CON.find(f => f.id === c.con) ?? CUSTOM_CON[0];
    const when = WHEN.some(([w]) => w === c.when) ? c.when : 'always';
    let pow = c.pow === 2 ? 2 : 1; if (pow === 2 && when === 'always' && !con.id) pow = 1; // 조건 없이 「강」은 못 씀
    const id = /^c_[a-z0-9]{2,12}$/.test(c.id ?? '') ? c.id : `c_${Math.random().toString(36).slice(2, 8)}`;
    return { id, name, icon: String(c.icon ?? '').trim().slice(0, 4) || '🔖', desc: String(c.desc ?? '').replace(/\s+/g, ' ').trim().slice(0, 40), fx: fx.id, pow, attr: fx.attr ? (String(c.attr ?? '').trim().slice(0, 6) || '매력') : '', con: con.id, when };
}
const buildCustom = (c) => ({ id: c.id, cat: 'custom', custom: true, icon: c.icon, name: c.name, desc: c.desc || '나만의 특성', when: c.when, ...mergeFx(CUSTOM_FX.find(f => f.id === c.fx).make(c.pow, c.attr), CUSTOM_CON.find(f => f.id === c.con).make()) });
let CUSTOM = [], customRef = null;
// 설정집의 커스텀 특성을 목록에 올린다 (같은 배열이면 건너뜀)
export function syncCustomTraits(list) {
    if (list === customRef) return; customRef = list;
    CUSTOM = (Array.isArray(list) ? list : []).map(normCustomTrait).filter(Boolean).map(buildCustom);
}
export const customTraits = () => CUSTOM;
export const traitOf = (id) => TRAITS.find(t => t.id === id) ?? CUSTOM.find(t => t.id === id) ?? null;
export const isTraitId = (id) => TRAITS.some(t => t.id === id) || /^c_[a-z0-9]{2,12}$/.test(String(id));

// 한 사람이 같이 가질 수 없는 특성 (심즈처럼)
const CONFLICT = [['neat', 'slob'], ['squeamish', 'slob'], ['cheerful', 'gloomy'], ['brave', 'coward'], ['outgoing', 'loner'], ['partyanimal', 'loner'], ['partyanimal', 'awkward'], ['outgoing', 'awkward'], ['kind', 'mean'], ['good', 'evil'],
    ['workaholic', 'lazy'], ['ambitious', 'lazy'], ['frugal', 'shopaholic'], ['frugal', 'snob'], ['snob', 'mooch'], ['indoor', 'outdoor'], ['couch', 'athletic'], ['couch', 'active'], ['cold', 'hot'], ['lucky', 'unlucky'],
    ['romantic', 'unflirty'], ['hopeless', 'unflirty'], ['loyal', 'noncommittal'], ['loyal', 'flirty'], ['hopeless', 'noncommittal'], ['stoic', 'emotional'], ['calm', 'hothead'], ['calm', 'neurotic'], ['sleeper', 'insomnia'], ['genius', 'childish'], ['perfectionist', 'clumsy'], ['selfassured', 'neurotic'], ['shy', 'partyanimal']];
export function conflictOf(id, mine = []) { for (const m of mine) if (CONFLICT.some(([a, b]) => (a === id && b === m) || (a === m && b === id))) return m; return null; }

// ───── 특성끼리 궁합 ─────
// 💗 애정(aff) 축과 🤝 우정(trust) 축을 따로 센다
//   GOOD: 둘 다 + · FRIEND: 우정만 + · BAD: 둘 다 − · OPP(반대가 끌림): 애정 + / 우정 − (설렘은 크지만 생활은 부딪침)
const BAD = [['romantic', 'stoic'], ['hothead', 'hothead'], ['kind', 'mean'], ['jealous', 'flirty'], ['jealous', 'irresistible'], ['frugal', 'shopaholic'], ['cold', 'hot'], ['snob', 'mooch'], ['loyal', 'noncommittal'], ['loyal', 'flirty'],
    ['grumpy', 'goofball'], ['perfectionist', 'clumsy'], ['perfectionist', 'absent'], ['neurotic', 'erratic'], ['squeamish', 'slob'], ['mean', 'mean'], ['ambitious', 'lazy']];
const GOOD = [['romantic', 'romantic'], ['romantic', 'emotional'], ['romantic', 'hopeless'], ['hopeless', 'hopeless'], ['kind', 'kind'], ['kind', 'shy'], ['good', 'kind'], ['good', 'good'], ['evil', 'evil'], ['goofball', 'cheerful'], ['excitable', 'cheerful'],
    ['bookworm', 'genius'], ['geek', 'bookworm'], ['geek', 'geek'], ['outgoing', 'goofball'], ['partyanimal', 'outgoing'], ['calm', 'hothead'], ['stoic', 'calm'], ['loner', 'loner'], ['charming', 'shy'], ['perceptive', 'shy'], ['perceptive', 'awkward'],
    ['loyal', 'loyal'], ['athletic', 'active'], ['foodie', 'naturalcook'], ['glutton', 'naturalcook'], ['dancer', 'music'], ['adventurous', 'outdoor'], ['ambitious', 'workaholic'], ['kisser', 'romantic']];
const FRIEND = [['bro', 'bro'], ['goofball', 'goofball'], ['grumpy', 'grumpy'], ['mooch', 'generous'], ['childish', 'goofball'], ['schmoozer', 'charming'], ['couch', 'indoor']];
// 반대가 끌리는 이유 — 궁합 화면에 그대로 보여 준다
const OPP = [
    ['neat', 'slob', '정돈된 사람은 풀어진 여유가, 털털한 사람은 단단한 질서가 신기해요'],
    ['outgoing', 'loner', '시끄러운 세상과 조용한 방 — 서로가 서로의 피난처가 돼요'],
    ['partyanimal', 'awkward', '먼저 손 내밀어 주는 사람에게 약해져요'],
    ['cheerful', 'gloomy', '햇살은 빗소리에 쉬고, 빗소리는 햇살에 웃어요'],
    ['brave', 'coward', '지켜 주고 싶은 마음과 기대고 싶은 마음이 딱 맞물려요'],
    ['good', 'evil', '금지된 쪽이 더 궁금한 법 — 바로잡고 싶고, 물들이고 싶어요'],
    ['kind', 'mean', '모두에게 못된 사람이 나한테만 다정할 때'],
    ['workaholic', 'lazy', '쉬는 법을 가르쳐 주는 사람, 달리는 법을 보여 주는 사람'],
    ['indoor', 'outdoor', '데리고 나가고 싶고, 붙잡아 두고 싶어요'],
    ['couch', 'athletic', '한 명은 끌고 나가고, 한 명은 소파로 끌어당겨요'],
    ['stoic', 'emotional', '잔잔한 호수에 파도가 치면 — 처음 보는 표정이 나와요'],
    ['romantic', 'unflirty', '철벽일수록 녹이고 싶어지고, 꾸준함에 결국 금이 가요'],
    ['genius', 'childish', '어른 같은 아이와 아이 같은 어른'],
    ['calm', 'neurotic', '불안한 마음은 단단한 사람 곁에서 숨을 쉬어요'],
    ['selfassured', 'shy', '확신에 찬 사람이 수줍은 사람의 속도를 기다려 줄 때'],
    ['frugal', 'snob', '아끼는 사람과 누리는 사람 — 서로의 세상이 궁금해요'],
    ['hothead', 'stoic', '불같은 사람이 아무리 두드려도 꿈쩍 않는 벽에 끌려요'],
];
const pairIn = (L, a, b) => L.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
export function traitCompat(mine = [], theirs = []) {
    let aff = 0, trust = 0; const why = [], opp = [];
    for (const a of mine) for (const b of theirs) {
        const ta = traitOf(a), tb = traitOf(b); if (!ta || !tb) continue;
        const o = pairIn(OPP, a, b);
        if (o) { aff++; trust--; why.push(`${ta.name} ⇄ ${tb.name}`); opp.push({ a: ta, b: tb, text: o[2] }); }
        else if (pairIn(BAD, a, b)) { aff--; trust--; why.push(`${ta.name} ↔ ${tb.name}`); }
        else if (pairIn(GOOD, a, b) || (a === b && ta.cat === 'hobby')) { aff++; trust++; why.push(`${ta.name} ♥ ${tb.name}`); }
        else if (pairIn(FRIEND, a, b)) { trust++; why.push(`${ta.name} 🤝 ${tb.name}`); }
    }
    // ✨ 치명적인 매력: 내 쪽이면 상대가 나에게 끌림(크게) · 상대 쪽이면 내가 끌림 / 🧱 철벽: 상대가 철벽이면 애정 궁합 −
    const al = (ids) => ids.reduce((s, id) => s + (traitOf(id)?.allure ?? 0), 0), co = (ids) => ids.reduce((s, id) => s + (traitOf(id)?.cold ?? 0), 0);
    const mA = al(mine), tA = al(theirs), tC = co(theirs);
    if (mA) { aff += mA; trust += mA / 2; why.push(`✨ 내 매력 +${mA}`); }
    if (tA) { aff += Math.ceil(tA / 2); why.push('✨ 상대의 매력'); }
    if (tC) { aff -= tC; why.push('🧱 상대가 철벽'); }
    return { score: aff, aff, trust, why, opp };
}

// ♌ 별자리 — 생일(「3월 14일」)에서 · 원소 궁합
export const SIGNS = [
    ['염소자리', '♑', 'earth', 1, 19], ['물병자리', '♒', 'air', 2, 18], ['물고기자리', '♓', 'water', 3, 20], ['양자리', '♈', 'fire', 4, 19], ['황소자리', '♉', 'earth', 5, 20], ['쌍둥이자리', '♊', 'air', 6, 21],
    ['게자리', '♋', 'water', 7, 22], ['사자자리', '♌', 'fire', 8, 22], ['처녀자리', '♍', 'earth', 9, 22], ['천칭자리', '♎', 'air', 10, 23], ['전갈자리', '♏', 'water', 11, 22], ['사수자리', '♐', 'fire', 12, 21],
];
export const ELEMENT_KO = { fire: '불', earth: '흙', air: '공기', water: '물' };
// 별자리마다 어울리는 특성 (인물 특성을 자동으로 채울 때 하나 추천)
export const SIGN_TRAIT = { 양자리: 'brave', 황소자리: 'foodie', 쌍둥이자리: 'outgoing', 게자리: 'kind', 사자자리: 'charming', 처녀자리: 'neat', 천칭자리: 'romantic', 전갈자리: 'jealous', 사수자리: 'adventurous', 염소자리: 'workaholic', 물병자리: 'genius', 물고기자리: 'emotional' };
export function signOf(day) {
    const m = /(\d{1,2})\s*[월/.\-]\s*(\d{1,2})/.exec(String(day ?? '')); if (!m) return null;
    const mo = Number(m[1]), d = Number(m[2]); if (!(mo >= 1 && mo <= 12)) return null;
    // 각 별자리의 「끝나는 날」 표: 그 달의 끝 날 이전이면 그 별자리, 아니면 다음
    const i = SIGNS.findIndex(s => s[3] === mo), s = d <= SIGNS[i][4] ? SIGNS[i] : SIGNS[(i + 1) % 12];
    return { name: s[0], icon: s[1], el: s[2] };
}
export function signCompat(a, b) {
    if (!a || !b) return { mul: 1, word: '' };
    if (a.el === b.el) return { mul: 1.2, word: '아주 좋음' };
    const pair = [a.el, b.el].sort().join('-');
    if (pair === 'air-fire' || pair === 'earth-water') return { mul: 1.1, word: '좋음' };
    if (pair === 'fire-water' || pair === 'air-earth') return { mul: 0.85, word: '나쁨' };
    return { mul: 1, word: '보통' };
}

// ⭐ 야망 — 심즈 3의 평생 소원처럼 단계 목표 (지금 상태에서 저절로 확인 · AI 0회)
//   val(S, book) → 지금 값 · want(S, book) → 「지금 원하는 것」 후보 [아이콘, 글, 입력창 문장, 이뤘는지(ch, S, P)]
const live = (S) => Object.entries(S.rel).filter(([, r]) => !r.gone);
const relUp = (n, ax) => (ch) => ch.some(c => c.f === `rel.${n}.${ax}` && c.to > c.from);
const anyUp = (ax) => (ch) => ch.some(c => c.f.startsWith('rel.') && c.f.endsWith(`.${ax}`) && c.to > c.from);
const topBy = (S, f) => live(S).sort((x, y) => f(y[1]) - f(x[1]))[0]?.[0];
const tl = (S, k) => S.tally?.[k] ?? 0;
export const ASPIRE_CATS = [['love', '💗 사랑'], ['social', '🤝 사람'], ['money', '💰 돈'], ['explore', '🧭 경험'], ['life', '🌱 삶']];
export const ASPIRES = [
    // 사랑
    { id: 'lover', cat: 'love', icon: '💘', name: '사랑꾼', desc: '누군가와 연인이 되기', steps: [20, 40, 60, 80], val: (S) => Math.max(0, ...live(S).map(([, r]) => r.aff)), unit: '최고 애정',
        want: (S) => { const n = topBy(S, r => r.aff); return n && ['💘', `${n}와(과) 가까워지기`, `${n}에게 다가간다.`, relUp(n, 'aff')]; } },
    { id: 'soulmate', cat: 'love', icon: '💫', name: '영혼의 짝', desc: '사랑하면서 믿을 수 있는 한 사람', steps: [20, 40, 60, 85], val: (S) => Math.max(0, ...live(S).map(([, r]) => Math.min(r.aff, r.trust))), unit: '애정 · 우정 중 낮은 쪽',
        want: (S) => { const n = topBy(S, r => Math.min(r.aff, r.trust)); if (!n) return null; const r = S.rel[n]; return r.trust < r.aff ? ['🤝', `${n}와(과) 속 깊은 얘기 하기`, `${n}에게 진지한 이야기를 꺼낸다.`, relUp(n, 'trust')] : ['💫', `${n}에게 설렘 주기`, `${n}에게 다정하게 군다.`, relUp(n, 'aff')]; } },
    { id: 'heartbreaker', cat: 'love', icon: '💔', name: '하트브레이커', desc: '여러 사람의 마음 흔들기', steps: [1, 2, 3, 5], val: (S) => live(S).filter(([, r]) => r.aff >= 50).length, unit: '애정 50 넘은 사람',
        want: (S) => { const n = live(S).filter(([, r]) => r.aff < 50).sort((x, y) => y[1].aff - x[1].aff)[0]?.[0]; return n && ['💔', `${n}의 마음 흔들기`, `${n}에게 은근히 추파를 던진다.`, relUp(n, 'aff')]; } },
    // 사람
    { id: 'popular', cat: 'social', icon: '🌟', name: '인기인', desc: '친구 많이 사귀기', steps: [1, 2, 3, 5], val: (S) => live(S).filter(([, r]) => r.trust >= 40).length, unit: '친구(우정 40+)',
        want: () => ['🌟', '누군가와 우정 쌓기', '말을 걸어 본다.', anyUp('trust')] },
    { id: 'bestie', cat: 'social', icon: '👯', name: '단짝 친구', desc: '평생 갈 친구 한 명', steps: [25, 45, 65, 90], val: (S) => Math.max(0, ...live(S).map(([, r]) => r.trust)), unit: '최고 우정',
        want: (S) => { const n = topBy(S, r => r.trust); return n && ['👯', `${n}와(과) 시간 보내기`, `${n}와(과) 같이 시간을 보낸다.`, relUp(n, 'trust')]; } },
    { id: 'socialite', cat: 'social', icon: '📇', name: '마당발', desc: '아는 사람 늘리기', steps: [3, 5, 8, 12], val: (S) => live(S).length, unit: '아는 사람',
        want: () => ['📇', '새로운 사람 만나기', '처음 보는 사람에게 말을 건다.', (ch) => ch.some(c => c.f.startsWith('npc.')) || ch.some(c => c.f.startsWith('rel.') && c.from <= 10 && c.to > c.from)] },
    { id: 'giver', cat: 'social', icon: '🎀', name: '선물 장인', desc: '마음을 담은 선물 주기', steps: [1, 3, 6, 10], val: (S) => tl(S, 'gifts'), unit: '준 선물',
        want: (S) => { const n = topBy(S, r => r.aff + r.trust); return n && ['🎀', `${n}에게 작은 선물 하기`, `${n}에게 줄 선물을 고른다.`, (ch) => ch.some(c => c.f === `rel.${n}.aff` && /🎁/.test(c.why ?? ''))]; } },
    { id: 'nemesis', cat: 'social', icon: '⚔️', name: '숙적 만들기', desc: '나를 싫어하는 사람 만들기 (악역 전용)', steps: [1, 2, 3, 4], val: (S) => live(S).filter(([, r]) => r.trust <= 5).length, unit: '우정 5 이하',
        want: (S) => { const n = live(S).filter(([, r]) => r.trust > 5).sort((x, y) => x[1].trust - y[1].trust)[0]?.[0]; return n && ['⚔️', `${n} 약 올리기`, `${n}을(를) 도발한다.`, (ch) => ch.some(c => c.f === `rel.${n}.trust` && c.to < c.from)]; } },
    // 돈
    { id: 'rich', cat: 'money', icon: '💰', name: '부자', desc: '돈 모으기', steps: [10, 30, 100, 300], scale: 'meal', val: (S) => S.cash, unit: '가진 돈',
        want: () => ['💰', '돈 벌기', '돈 벌 방법을 찾아본다.', (ch) => ch.some(c => c.f === 'cash' && c.to > c.from)] },
    { id: 'tycoon', cat: 'money', icon: '💳', name: '큰손', desc: '돈 쓰는 맛 알기', steps: [10, 40, 120, 400], scale: 'meal', val: (S) => tl(S, 'spent'), unit: '쓴 돈',
        want: () => ['💳', '플렉스 하기', '마음에 드는 걸 산다.', (ch) => ch.some(c => c.f === 'cash' && c.to < c.from)] },
    { id: 'earner', cat: 'money', icon: '🧾', name: '성실한 일꾼', desc: '꾸준히 일하기', steps: [2, 5, 10, 20], val: (S) => tl(S, 'work'), unit: '일한 횟수',
        want: () => ['🧾', '오늘 몫 일하기', '일을 시작한다.', (ch) => ch.some(c => c.why === '일한 값' || (c.f === 'need.energy' && /일/.test(c.why ?? '')))] },
    // 경험
    { id: 'explorer', cat: 'explore', icon: '🧭', name: '탐험가', desc: '여러 곳 가 보기', steps: [2, 4, 6, 9], val: (S) => (S.visited ?? []).length, unit: '가 본 곳',
        want: () => ['🧭', '새로운 곳 가 보기', '안 가 본 곳으로 가 본다.', (ch, S, P) => (S.visited?.length ?? 0) > (P.visited ?? 0)] },
    { id: 'gourmet', cat: 'explore', icon: '🍽️', name: '미식 여행', desc: '여러 음식 먹어 보기', steps: [2, 4, 7, 10], val: (S) => (S.tasted ?? []).length, unit: '먹어 본 음식',
        want: () => ['🍽️', '새 음식 먹어 보기', '안 먹어 본 걸 먹어 보자.', (ch, S, P) => (S.tasted?.length ?? 0) > (P.tasted ?? 0)] },
    { id: 'feast', cat: 'explore', icon: '🍱', name: '대식가', desc: '잘 먹고 잘 살기', steps: [5, 15, 30, 60], val: (S) => tl(S, 'meals'), unit: '먹은 끼니',
        want: () => ['🍱', '든든하게 한 끼', '제대로 한 끼 먹는다.', (ch) => ch.some(c => c.f === 'need.hunger' && c.to > c.from && c.src !== 'time')] },
    { id: 'collector', cat: 'explore', icon: '🧺', name: '수집가', desc: '여러 물건 모으기', steps: [3, 5, 8, 12], val: (S) => S.items.length, unit: '물건 종류',
        want: () => ['🧺', '새 물건 얻기', '쓸 만한 게 있나 찾아본다.', (ch) => ch.some(c => c.f === 'item' && c.from === 0)] },
    { id: 'fashion', cat: 'explore', icon: '👗', name: '멋쟁이', desc: '멋지게 차려입기', steps: [1, 2, 3, 4], val: (S) => S.items.filter(i => i.worn).length, unit: '걸친 것',
        want: () => ['👗', '새 옷 걸쳐 보기', '거울 앞에서 옷을 갈아입는다.', (ch) => ch.some(c => c.f === 'item' && c.to === '착용 중')] },
    // 삶
    { id: 'happy', cat: 'life', icon: '🌈', name: '행복한 삶', desc: '기분 좋은 날 늘리기', steps: [5, 15, 30, 60], val: (S) => tl(S, 'happy'), unit: '기분 70+ 턴',
        want: () => ['🌈', '오늘을 즐기기', '기분 좋은 일을 찾아 나선다.', (ch) => ch.some(c => c.f === 'need.mood' && c.to > c.from && c.src !== 'time')] },
    { id: 'survivor', cat: 'life', icon: '🪨', name: '오뚝이', desc: '바닥에서 다시 일어서기', steps: [1, 3, 6, 10], val: (S) => tl(S, 'recover'), unit: '회복한 횟수', want: () => null },
    { id: 'dreamer', cat: 'life', icon: '🌠', name: '소원 성취', desc: '원하는 것 하나씩 이루기', steps: [3, 8, 15, 25], val: (S) => tl(S, 'wishes'), unit: '이룬 소원', want: () => null },
    { id: 'promise', cat: 'life', icon: '🤙', name: '약속 지킴이', desc: '한 말은 지키기', steps: [1, 3, 5, 8], val: (S) => (S.promises ?? []).filter(p => p.done).length, unit: '지킨 약속',
        want: (S) => { const p = (S.promises ?? []).find(q => !q.done); return p && ['🤙', `약속 지키기: ${p.text}`, `${p.text} — 약속을 지키러 간다.`, (ch, S2, P) => (S2.promises ?? []).filter(q => q.done).length > (P.kept ?? 0)]; } },
    { id: 'gambler', cat: 'life', icon: '🎲', name: '운명 시험', desc: '판정에 몸을 던지기', steps: [3, 8, 15, 30], val: (S) => (S.rolls ?? []).length, unit: '판정',
        want: () => ['🎲', '한번 부딪쳐 보기', '위험을 무릅쓰고 시도한다.', (ch, S, P) => (S.rolls?.length ?? 0) > (P.rolls ?? 0)] },
    { id: 'growth', cat: 'life', icon: '📈', name: '성장', desc: '능력치 키우기', steps: [1, 3, 5, 8], val: (S, b) => Object.entries(S.attrs ?? {}).reduce((s, [k, v]) => s + Math.max(0, v - (b?.me.attrs.find(a => a.name === k)?.v ?? 0)), 0), unit: '오른 능력치',
        want: () => ['📈', '뭔가 연습하기', '실력을 갈고닦는다.', (ch) => ch.some(c => c.f.startsWith('attr.') && c.to > c.from)] },
    { id: 'chronicle', cat: 'life', icon: '📜', name: '이야기꾼', desc: '긴 이야기를 살아 보기', steps: [10, 30, 60, 100], val: (S) => S.turn ?? 0, unit: '지나온 턴', want: () => null },
    { id: 'seasons', cat: 'life', icon: '🍂', name: '계절을 보내며', desc: '이 세계에서 오래 살기', steps: [1, 3, 7, 15], val: (S, b) => Math.floor(S.t / 1440) - Math.floor((b?.world.start.clock ?? 0) / 1440), unit: '지난 날', want: () => null },
];
// 🛠 나만의 야망: 이름 · 아이콘 · 무엇으로 셀지(위 야망의 셈 하나 또는 직접 체크) · 단계 4개
export function normCustomAspire(c) {
    if (!c || typeof c !== 'object') return null;
    const name = String(c.name ?? '').trim().slice(0, 12); if (!name) return null;
    const base = c.base === 'manual' || ASPIRES.some(a => a.id === c.base) ? c.base : 'manual';
    let steps = (Array.isArray(c.steps) ? c.steps : String(c.steps ?? '').split(/[,\s/]+/)).map(Number).filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b).slice(0, 6);
    if (steps.length < 2) steps = [1, 3, 5, 10];
    return { name, icon: String(c.icon ?? '').trim().slice(0, 4) || '🎯', desc: String(c.desc ?? '').trim().slice(0, 40), base, steps, n: Math.max(0, Math.floor(Number(c.n) || 0)) };
}
export function aspireOf(id, book = null) {
    if (id === 'custom') {
        const c = book?.me?.aspireCustom; if (!c) return null;
        const b = ASPIRES.find(a => a.id === c.base);
        return { id: 'custom', custom: true, manual: !b, icon: c.icon, name: c.name, desc: c.desc || (b ? `${b.unit}로 세요` : '직접 체크'), steps: c.steps, val: b ? b.val : () => c.n, unit: b ? b.unit : '직접 체크', want: b?.want ?? (() => null) };
    }
    return ASPIRES.find(a => a.id === id) ?? null;
}
export function aspireSteps(a, book) { return a.scale === 'meal' ? a.steps.map(x => x * (book.world.meal || 10)) : a.steps; }
