/**
 * todos-express-sqlite — Baseline Benchmark
 * Run:    node benchmark.js
 * Output: .codetuner/baseline_metrics.json
 * No arguments or environment variables required.
 */

'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

// ─── Phase 0 — Configuration ────────────────────────────────────────────────
const PORT = 3000;
const DURATION_MS = 5000;
const CONCURRENCY = 10;
const OUTPUT_FILE = '.codetuner/baseline_metrics.json';
const DB_PATH = path.join(__dirname, 'var', 'db', 'todos.db');

// ─── State ───────────────────────────────────────────────────────────────────
let serverProcess = null;
let seededByBenchmark = false;
let seededIds = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function openDb() {
  return new sqlite3.Database(DB_PATH);
}

function dbGet(db, sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );
}

function dbRun(db, sql, params) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    })
  );
}

function closeDb(db) {
  return new Promise((resolve, reject) =>
    db.close((err) => (err ? reject(err) : resolve()))
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function makeRequest(opts) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(opts, (res) => {
      res.resume();
      res.on('end', () => resolve({ latency: Date.now() - start, ok: true }));
    });
    req.on('error', () => resolve({ latency: Date.now() - start, ok: false }));
    req.end();
  });
}

async function benchmarkRoute(method, urlPath) {
  const opts = { hostname: 'localhost', port: PORT, path: urlPath, method };
  const deadline = Date.now() + DURATION_MS;
  const latencies = [];
  let errors = 0;

  async function worker() {
    while (Date.now() < deadline) {
      const result = await makeRequest(opts);
      latencies.push(result.latency);
      if (!result.ok) errors++;
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const throughput = latencies.length / (DURATION_MS / 1000);

  const result = {
    method,
    path: urlPath,
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    throughput_rps: parseFloat(throughput.toFixed(2)),
    total_requests: latencies.length,
    error_count: errors,
  };

  console.log(
    `  ${method.padEnd(4)} ${urlPath.padEnd(20)} p50=${result.p50_ms}ms  p95=${result.p95_ms}ms  p99=${result.p99_ms}ms  rps=${result.throughput_rps}  errors=${errors}`
  );
  return result;
}

// ─── Phase 1 — Seed data check & setup ──────────────────────────────────────
async function setupSeedData() {
  // Ensure DB directory exists (mirrors db.js behaviour)
  fs.mkdirSync(path.join(__dirname, 'var', 'db'), { recursive: true });

  const db = openDb();

  // Ensure table exists (mirrors db.js schema)
  await new Promise((resolve, reject) =>
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          completed INTEGER
        )`,
        (err) => (err ? reject(err) : resolve())
      );
    })
  );

  const row = await dbGet(db, 'SELECT COUNT(*) AS cnt FROM todos', []);

  if (row.cnt > 0) {
    // Data already exists — use live records as-is
    console.log(`[seed] Existing data found (${row.cnt} todos). Using live records.`);
    await closeDb(db);
    return; // seededByBenchmark stays false
  }

  // No data — create minimal seed
  console.log('[seed] No todos found — creating minimal benchmark seed data...');
  seededByBenchmark = true;

  const titles = [
    'Benchmark todo alpha',
    'Benchmark todo beta',
    'Benchmark todo gamma (completed)',
  ];

  const id1 = await dbRun(db, 'INSERT INTO todos (title, completed) VALUES (?, ?)', [titles[0], null]);
  const id2 = await dbRun(db, 'INSERT INTO todos (title, completed) VALUES (?, ?)', [titles[1], null]);
  const id3 = await dbRun(db, 'INSERT INTO todos (title, completed) VALUES (?, ?)', [titles[2], 1]);
  seededIds = [id1, id2, id3];
  console.log(`[seed] Created todos with ids: ${seededIds.join(', ')}`);

  await closeDb(db);
}

// ─── Phase 2 — Server startup ────────────────────────────────────────────────
async function startServer() {
  console.log('[server] Starting server...');
  serverProcess = spawn('node', ['bin/www'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logBuffer = '';
  serverProcess.stdout.on('data', (d) => (logBuffer += d.toString()));
  serverProcess.stderr.on('data', (d) => (logBuffer += d.toString()));

  // Poll for readiness
  const timeout = Date.now() + 15000;
  while (Date.now() < timeout) {
    await sleep(250);
    const alive = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${PORT}/`, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (alive) {
      console.log('[server] Server is ready.');
      return;
    }
  }

  console.error('[server] Server did not become ready within 15 s. Log:');
  console.error(logBuffer);
  throw new Error('Server startup timeout');
}

// ─── Phase 4 — Cleanup & output ─────────────────────────────────────────────
async function cleanup() {
  // Kill server
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await sleep(2000);
    try { serverProcess.kill('SIGKILL'); } catch { }
    serverProcess = null;
    console.log('[server] Server stopped.');
  }

  // Remove benchmark seed data
  if (seededByBenchmark && seededIds.length > 0) {
    const db = openDb();
    for (const id of seededIds) {
      await dbRun(db, 'DELETE FROM todos WHERE id = ?', [id]);
    }
    await closeDb(db);
    console.log('[seed] Benchmark seed data removed.');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  let routeResults = [];

  try {
    // Phase 1 — Seed
    await setupSeedData();

    // Phase 2 — Server
    await startServer();

    // Phase 3 — Benchmark
    console.log(`\n[bench] Benchmarking ${DURATION_MS / 1000}s × ${CONCURRENCY} workers per route...\n`);

    routeResults.push(await benchmarkRoute('GET', '/', 'Home (all todos)'));
    routeResults.push(await benchmarkRoute('GET', '/active', 'Active todos'));
    routeResults.push(await benchmarkRoute('GET', '/completed', 'Completed todos'));

    // Summary table
    console.log('\n[bench] ─────────────────────────────────────────────────────');
    console.log('[bench] Route Summary');
    console.log('[bench] ─────────────────────────────────────────────────────');
    for (const r of routeResults) {
      console.log(
        `[bench] ${r.method} ${r.path.padEnd(20)} | p50=${r.p50_ms}ms p95=${r.p95_ms}ms p99=${r.p99_ms}ms | ${r.throughput_rps} rps | ${r.error_count} errors`
      );
    }
    console.log('[bench] ─────────────────────────────────────────────────────\n');

  } finally {
    // Phase 4 — Always clean up
    await cleanup();

    // Write output
    const output = {
      generated_at: new Date().toISOString(),
      base_url: `http://localhost:${PORT}`,
      duration_seconds: DURATION_MS / 1000,
      concurrency: CONCURRENCY,
      routes: routeResults,
    };

    fs.mkdirSync('.codetuner', { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`[output] Results written to ${OUTPUT_FILE}`);
  }
}

// Phase 5 — Top-level error handler
main().catch(async (err) => {
  console.error('[fatal]', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
