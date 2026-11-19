import { chromium } from './pw.mjs';
import { serve } from './server.mjs';
const srv = await serve(0); const b = await chromium.launch(); const p = await b.newPage();
await p.goto(`http://127.0.0.1:${srv.address().port}/harness/st-stub.js`);
for (const f of process.argv.slice(2)) { const r = await p.evaluate(async (f) => { try { await import(`/ext/${f}`); return 'ok'; } catch (e) { return String(e); } }, f); console.log(f, r); }
await b.close(); srv.close();
