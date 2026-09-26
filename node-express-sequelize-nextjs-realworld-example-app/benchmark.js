/**
 * RealWorld Conduit — Baseline Benchmark
 * ========================================
 * Measures p50 / p95 / p99 latency, throughput, and error counts for the 5
 * most performance-sensitive API routes identified in CONTEXT.md.
 *
 * Prerequisites
 * -------------
 *   1. The server must already be running:
 *        node app.js        (SQLite, port 3000)
 *      or with a custom port:
 *        PORT=4000 node app.js
 *
 *   2. Some seed data should exist (articles, tags, a public user profile).
 *      The benchmark targets read-only public endpoints so no auth token is needed.
 *
 *   3. One existing article slug and one existing username must be supplied via
 *      env vars so the parameterised routes can be exercised:
 *        ARTICLE_SLUG=<slug>   (default: "test-article")
 *        PROFILE_USER=<uname>  (default: "testuser")
 *
 * Run
 * ---
 *   node benchmark.js
 *   BASE_URL=http://localhost:3000 ARTICLE_SLUG=my-slug PROFILE_USER=johndoe node benchmark.js
 *
 * Output
 * ------
 *   • Human-readable summary table printed to stdout
 *   • .codetuner/baseline_metrics.json (created/overwritten each run)
 */

'use strict'

const http = require('node:http')
const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')
const { URL } = require('node:url')

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const ARTICLE_SLUG = process.env.ARTICLE_SLUG || 'my-title-0-cygtu6'
const PROFILE_USER = process.env.PROFILE_USER || 'user0'
const DURATION_MS = 5_000          // 5 seconds per route
const CONCURRENCY = 10             // concurrent workers
const OUTPUT_DIR = path.join(__dirname, '.codetuner')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'baseline_metrics.json')

// ─── Target Routes ────────────────────────────────────────────────────────────
// Ranked as per CONTEXT.md § Benchmark Target Routes
const ROUTES = [
  { method: 'GET', path: '/api/articles',                        label: 'List articles (homepage feed)' },
  { method: 'GET', path: '/api/tags',                            label: 'List all tags' },
  { method: 'GET', path: `/api/articles/${ARTICLE_SLUG}`,        label: 'Single article detail' },
  { method: 'GET', path: `/api/profiles/${PROFILE_USER}`,        label: 'User profile' },
  { method: 'GET', path: `/api/articles/${ARTICLE_SLUG}/comments`, label: 'Article comments' },
]

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/** Fire one HTTP request and return { latencyMs, isError }. */
function request(method, urlStr) {
  return new Promise((resolve) => {
    const start = Date.now()
    const parsed = new URL(urlStr)
    const lib = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { Accept: 'application/json' },
    }
    const req = lib.request(options, (res) => {
      // Drain the response body so the socket is freed promptly.
      res.on('data', () => {})
      res.on('end', () => {
        resolve({ latencyMs: Date.now() - start, isError: res.statusCode >= 400 })
      })
    })
    req.on('error', () => {
      resolve({ latencyMs: Date.now() - start, isError: true })
    })
    req.setTimeout(10_000, () => {
      req.destroy()
      resolve({ latencyMs: Date.now() - start, isError: true })
    })
    req.end()
  })
}

// ─── Percentile helper ────────────────────────────────────────────────────────

/** Returns the p-th percentile value from a sorted array of numbers. */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]
}

// ─── Single-route benchmark ───────────────────────────────────────────────────

/**
 * Runs CONCURRENCY workers for DURATION_MS milliseconds against one route.
 * Returns raw metrics.
 */
async function benchmarkRoute(method, routePath) {
  const url = BASE_URL + routePath
  const latencies = []
  let errorCount = 0
  const deadline = Date.now() + DURATION_MS

  // Each worker keeps firing requests until the time window closes.
  async function worker() {
    while (Date.now() < deadline) {
      const { latencyMs, isError } = await request(method, url)
      // Only record measurements taken before (or right at) the deadline so
      // the last in-flight request doesn't skew results too much.
      if (Date.now() <= deadline + 500) {
        latencies.push(latencyMs)
        if (isError) errorCount++
      }
    }
  }

  const workers = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  latencies.sort((a, b) => a - b)
  const totalRequests = latencies.length
  const throughputRps = totalRequests / (DURATION_MS / 1000)

  return {
    p50_ms:         Math.round(percentile(latencies, 50)),
    p95_ms:         Math.round(percentile(latencies, 95)),
    p99_ms:         Math.round(percentile(latencies, 99)),
    throughput_rps: Math.round(throughputRps * 10) / 10,
    total_requests: totalRequests,
    error_count:    errorCount,
  }
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function printTable(results) {
  const col = (s, w) => String(s).padEnd(w)
  const rCol = (s, w) => String(s).padStart(w)
  const sep = '─'.repeat(90)

  console.log('\n' + sep)
  console.log(
    col('Method', 8) +
    col('Path', 35) +
    rCol('p50(ms)', 10) +
    rCol('p95(ms)', 10) +
    rCol('p99(ms)', 10) +
    rCol('req/s', 8) +
    rCol('errors', 8)
  )
  console.log(sep)
  for (const r of results) {
    console.log(
      col(r.method, 8) +
      col(r.path, 35) +
      rCol(r.p50_ms, 10) +
      rCol(r.p95_ms, 10) +
      rCol(r.p99_ms, 10) +
      rCol(r.throughput_rps, 8) +
      rCol(r.error_count, 8)
    )
  }
  console.log(sep + '\n')
}

function writeMetrics(results) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const payload = {
    generated_at:     new Date().toISOString(),
    base_url:         BASE_URL,
    duration_seconds: DURATION_MS / 1000,
    concurrency:      CONCURRENCY,
    routes: results.map((r) => ({
      method:         r.method,
      path:           r.path,
      p50_ms:         r.p50_ms,
      p95_ms:         r.p95_ms,
      p99_ms:         r.p99_ms,
      throughput_rps: r.throughput_rps,
      total_requests: r.total_requests,
      error_count:    r.error_count,
    })),
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nRealWorld Conduit — Baseline Benchmark`)
  console.log(`Base URL  : ${BASE_URL}`)
  console.log(`Duration  : ${DURATION_MS / 1000}s per route  |  Concurrency: ${CONCURRENCY}`)
  console.log(`Routes    : ${ROUTES.length}\n`)

  const results = []
  for (const route of ROUTES) {
    process.stdout.write(`  Benchmarking  ${route.method.padEnd(7)} ${route.path} …`)
    try {
      const metrics = await benchmarkRoute(route.method, route.path)
      results.push({ method: route.method, path: route.path, ...metrics })
      process.stdout.write(
        `  done  (${metrics.total_requests} reqs, ${metrics.p50_ms}ms p50)\n`
      )
    } catch (err) {
      console.error(`\n  ERROR benchmarking ${route.path}: ${err.message}`)
      results.push({
        method: route.method,
        path: route.path,
        p50_ms: 0, p95_ms: 0, p99_ms: 0,
        throughput_rps: 0, total_requests: 0, error_count: -1,
      })
    }
  }

  printTable(results)

  try {
    writeMetrics(results)
    console.log(`Metrics written to: ${OUTPUT_FILE}\n`)
  } catch (err) {
    console.error(`Failed to write metrics file: ${err.message}`)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Unrecoverable error:', err)
  process.exit(1)
})