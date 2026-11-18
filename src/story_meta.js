// 🧭 이야기 장치 목록 · 설정 키 (story.js에서 뗌) — 관리 창 · 확장 설정의 스위치 목록이 쓴다. 가볍고 늘 읽힌다
//   장치의 실제 동작(story.js) · 화면(story_ui.js)은 ⚡ 하나라도 켠 사람만 불러온다 (feat.js)
// ───── 장치 목록 (창의 순서 · 설명) ─────
export const DEVICES = [
    { id: 'loop', g: '되감기', icon: '🔁', name: '회귀자 모드', cost: '토큰 0~1줄', desc: '다시 생성 · 지운 횟수를 「회차」로 세요. 같은 장면을 여러 번 되돌리면 인물이 희미한 기시감을 느껴요.' },
    { id: 'ghost', g: '되감기', icon: '👻', name: '버린 스와이프의 유령', cost: '가끔 100토큰쯤', desc: '버려진 스와이프에서 있었던 일이 가끔 꿈 · 환청 · 말실수로 새어 나와요.' },
    { id: 'debt', g: '되감기', icon: '🎲', name: '운명의 빚', cost: '토큰 0~1줄', desc: '다시 생성할 때마다 빚이 1 쌓이고, 5가 되면 다음 답에서 작은 불운으로 갚아요.' },
    { id: 'know', g: '장부', icon: '🧠', name: '누가 뭘 아는지', cost: '매 턴 몇 줄', desc: '사실마다 「아는 사람」을 적어 두고, 모르는 인물이 아는 척하지 않게 AI에게 알려요.' },
    { id: 'promise', g: '장부', icon: '🤝', name: '약속 장부', cost: '매 턴 몇 줄', desc: '내가 한 약속 · 거짓말을 적어 둬요. 지키면 우정이 오르고 어기면 깎여요.' },
    { id: 'peek', g: '숨은 수치', icon: '👁', name: '속마음을 볼 때마다 눈치', cost: '토큰 0~1줄', desc: '프로필 › 속마음에서 속마음이 가려진 채로 와요. 눌러서 볼 때마다 「눈치」가 쌓여 인물이 의심하기 시작해요. (공략 탭의 눈치와 같은 수치)' },
    { id: 'scar', g: '숨은 수치', icon: '🩹', name: '관계의 흉터', cost: '매 턴 1~3줄', desc: '호감이 한 번에 크게 깎였던 일은 흉터로 남아, 비슷한 상황에서 더 예민하게 굴어요.' },
    { id: 'memory', g: '숨은 수치', icon: '🕳', name: '기억 왜곡', cost: 'AI 1회 + 매 턴 몇 줄', desc: '인물이 지난 일을 자기 식으로(유리하게 · 흐릿하게) 기억해요. 본편에서도 그 기억대로 말해요.' },
    { id: 'meddle', g: '침범', icon: '✍', name: '인물이 내 상태창에 손댄다', cost: '토큰 0~1줄', desc: '질투나 애정이 높은 인물이 가끔 낙서를 남기거나 · 자기 이름을 바꿔 놓거나 · 다른 사람을 차단해 놔요 (되돌릴 수 있어요).' },
    { id: 'glitch', g: '침범', icon: '🌫', name: '믿을 수 없는 상태창', cost: '토큰 0', desc: '정신력 · 이성이 낮거나 취하면 상태창 화면이 흔들리고 깨져 보여요 (계산은 그대로).' },
    { id: 'tension', g: '이야기', icon: '🎬', name: '긴장도 감독', cost: '토큰 0~1줄', desc: '평화가 길어지면 긴장이 차올라 사건을 부르고, 사건 뒤엔 쉬는 구간을 줘요.' },
    { id: 'realtime', g: '이야기', icon: '🕰', name: '현실 시간 연동', cost: '토큰 0~1줄', desc: '실제로 하루 넘게 안 오면 인물이 「어디 갔었어」로 반응해요.' },
    { id: 'mail', g: '이야기', icon: '📻', name: '채팅 간 우편', cost: '누를 때 AI 1회', desc: '이 채팅의 인물이 다른 채팅으로 편지를 부쳐요. 다른 채팅에서 온 편지는 여기 떨어뜨릴 수 있어요.' },
    { id: 'taste', g: '소소한 것', icon: '🎁', name: '취향 도감', cost: '토큰 0', desc: '인물별로 드러난 좋아하는 것 · 싫어하는 것을 모아 봐요.' },
];
// 장치 → 설정 키 (core.js의 기본값은 전부 false · 확장 설정의 「이야기 흐름」 「장부」 「관계」 「연락」에서 켠다)
export const KEY = { loop: 'loopMode', ghost: 'swipeGhost', debt: 'fateDebt', tension: 'tensionOn', realtime: 'realGap', glitch: 'glitchView', know: 'ledgerKnow', promise: 'ledgerPromise', peek: 'peekCost', scar: 'relScar', memory: 'memoryDrift', meddle: 'meddleOn', taste: 'tasteBook', mail: 'crossMail' };
