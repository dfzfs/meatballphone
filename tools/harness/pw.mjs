// Playwright 찾기: 이 컴퓨터에 깔린 것(/opt/npm-tools) → 없으면 저장소에 깐 것(npm install --no-save playwright)
// 다른 곳에 있으면 PW_MODULE=경로 로 알려 준다
const LOCAL = '/opt/npm-tools/node_modules/playwright/index.mjs';
const mod = await import(process.env.PW_MODULE || LOCAL).catch(() => import('playwright'));
export const chromium = mod.chromium;
