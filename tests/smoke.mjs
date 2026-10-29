// End-to-end smoke test: seed a scratch database, start the app, book an event
// through the form, check it shows up everywhere, reset, check it is gone.
// Run with: npm run test:smoke
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // preinstalled in the environment

const PORT = Number(process.env.SMOKE_PORT ?? 3101);
const BASE = `http://localhost:${PORT}`;
const DB = process.env.SMOKE_DB ?? 'data/smoke.db';
const env = { ...process.env, DEMO_DB: DB };

function manilaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function waitForPort(port, ms = 90_000) {
  const until = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = net.connect(port, '127.0.0.1');
      s.once('connect', () => { s.destroy(); resolve(); });
      s.once('error', () => { s.destroy(); Date.now() > until ? reject(new Error('server did not start')) : setTimeout(tick, 500); });
    };
    tick();
  });
}
function assert(cond, msg) {
  if (!cond) throw new Error(`SMOKE FAILED: ${msg}`);
  console.log('ok -', msg);
}

execSync('npm run db:reset', { env, stdio: 'ignore' });
const server = spawn('npx', ['next', 'dev', '-p', String(PORT)], { env, stdio: 'ignore' });
let browser;
try {
  await waitForPort(PORT);
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const today = manilaToday();
  const date = addDays(today, 35);
  const month = date.slice(0, 7);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  assert((await page.locator('text=Sample data prepared by Growth Architect Studio for CVJ').count()) > 0, 'banner is on the overview');
  assert((await page.locator('[data-unit-card]').count()) === 6, 'six unit cards');

  await page.goto(`${BASE}/events/new`, { waitUntil: 'networkidle' });
  await page.fill('input[name="customerName"]', 'Smoke Test Co');
  await page.fill('input[name="date"]', date);
  await page.fill('input[name="startTime"]', '11:00');
  await page.fill('input[name="endTime"]', '15:00');
  await page.fill('input[name="pax"]', '130');
  await page.selectOption('select[name="venueArea"]', 'Ground Floor');
  await page.fill('input[name="depositPesos"]', '20000');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/\d+$/, { timeout: 30_000 });
  const detailUrl = page.url();
  const manpower = (await page.locator('[data-panel="manpower"]').innerText()).replace(/\s+/g, ' ');
  assert(manpower.includes('6 servers'), 'detail shows 6 servers for 130 guests');
  assert((await page.locator('[data-invoice-row]').count()) === 3, 'three invoice rows');
  const production = (await page.locator('[data-panel="production"]').innerText()).replace(/\s+/g, ' ');
  const dayBefore = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${addDays(date, -1)}T00:00:00Z`));
  assert(production.includes(`Produce on ${dayBefore}`), `production list dated the day before (${dayBefore})`);

  await page.goto(`${BASE}/events?month=${month}`, { waitUntil: 'networkidle' });
  assert((await page.locator('text=Smoke Test Co').count()) > 0, 'booking appears on the events page');
  await page.goto(`${BASE}/schedule?view=week&from=${date}`, { waitUntil: 'networkidle' });
  assert((await page.locator('text=Smoke Test Co').count()) > 0, 'booking appears on the schedule');

  await page.goto(`${BASE}/analytics?range=30`, { waitUntil: 'networkidle' });
  assert((await page.locator('svg[role="img"]').count()) >= 10, 'analytics page renders its charts');
  await page.locator('svg[aria-label="Stacked daily columns"] rect[fill="transparent"]').nth(5).hover();
  await page.waitForTimeout(200);
  assert((await page.locator('[role="status"]').count()) > 0, 'hovering a column shows a tooltip');
  await page.getByRole('button', { name: 'Table' }).first().click();
  assert((await page.locator('figure table tbody tr').count()) === 30, 'table view lists one row per day');

  await page.goto(detailUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-reset-demo]').click();
  await page.waitForURL(`${BASE}/`, { timeout: 60_000 });
  await page.goto(`${BASE}/events?month=${month}`, { waitUntil: 'networkidle' });
  assert((await page.locator('text=Smoke Test Co').count()) === 0, 'booking is gone after reset');
  assert(errors.length === 0, `no browser errors (${errors.join('; ') || 'none'})`);
  console.log('SMOKE OK');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
