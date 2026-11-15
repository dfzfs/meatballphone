// 눌러야 쓰는 창은 그때 불러온다 — 처음 켤 때 읽는 양을 줄임 (도움말 · 만들기 · 프롬프트/꾸미기 창)
// 여기 함수는 진짜 파일을 불러온 뒤 같은 이름의 함수를 그대로 부른다. 새로 미룰 창은 한 줄씩 보탠다
import { app } from './core.js';

const later = (load, name) => async (...a) => (await load())[name](...a);
export const openHelp = later(() => import('./help.js'), 'openHelp');
export const openWizard = later(() => import('./wizard.js'), 'openWizard');
export const openPromptWindow = later(() => import('./windows.js'), 'openPromptWindow');
export const openThemeWindow = later(() => import('./windows.js'), 'openThemeWindow');
app.openHelp = openHelp; // help.js가 불리면 진짜 함수로 바뀐다
