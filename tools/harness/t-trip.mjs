import { open, makeStatus, check } from './lib.mjs';
const { page, close } = await open();
await makeStatus(page, ['profile', 'wallet', 'map', 'calendar']);
const r = await page.evaluate(async () => {
  const app = window.__SS_TEST__.api.app, { addAdjust } = await import('/ext/src/engine.js'), { tripInfo } = await import('/ext/src/tiles.js');
  await addAdjust({ ops: [['_clock', '24']], label: 'c' }); await addAdjust({ ops: [['time', '22:00']], label: 't' });
  const s = app.current.state, mp = s.data.map, far = mp.places.find(p => p.name !== mp.here);
  const ti = tripInfo(s, far.name), d0 = s.data.calendar.d;
  await addAdjust({ ops: [['_travel', far.name]], label: 'go' });
  const c = app.current.state.data.calendar;
  return { arrive: ti.arrive, hops: ti.hops, time: c.time, dd: c.d - d0 };
});

check(r.arrive.endsWith(r.time) && (r.dd > 0) === /다음 날|일 뒤/.test(r.arrive), '시각 달력: 미리 보인 도착 시각 = 실제 도착', JSON.stringify(r));
await close();
