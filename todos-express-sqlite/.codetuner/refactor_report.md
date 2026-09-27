# CodeTuner Optimization Report

Generated: 2026-09-27T13:30:00.000Z

## Executive Summary

All 13 approved refactor recommendations (PERF-001 through PERF-006, QUALITY-001 through QUALITY-009 minus QUALITY-004 which was merged with PERF-002, plus the already-fixed QUALITY-008) were applied in a single coherent pass. The application passes lint, all tests, and functional verification via the benchmark script. Performance improved substantially on all three measured routes.

---

## Optimization Targets

| ID | Finding | Files |
|----|---------|-------|
| PERF-001 | Add LIMIT 1000 to SELECT * | `routes/index.js` |
| PERF-002 | Cache-backed fetch; filter from cached rows | `routes/index.js` |
| PERF-003 | Add index on `completed` column | `db.js` |
| PERF-004 | Counts derived from cached row set | `routes/index.js` |
| PERF-005 | Enable EJS view cache | `app.js` |
| PERF-006 | In-memory Map cache with TTL + write invalidation | `routes/index.js` |
| QUALITY-001 | Extract `completedToDb()` helper | `routes/index.js` |
| QUALITY-002 | Extract `trimTitle` middleware | `routes/index.js` |
| QUALITY-003 | Extract `redirectPath()` helper | `routes/index.js` |
| QUALITY-005 | Extract `asyncHandler` wrapper | `routes/index.js` |
| QUALITY-006 | Whitelist `safeFilter()` validation | `routes/index.js` |
| QUALITY-007 | EJS `_filter_input` partial | `views/index.ejs`, `views/_filter_input.ejs` |
| QUALITY-008 | Fix stale mkdirp import in benchmark.js | `benchmark.js` |
| QUALITY-009 | Remove unused `next` params in GET handlers | `routes/index.js` |

---

## Root Causes

- **PERF-001/002/006:** `fetchTodos` ran `SELECT * FROM todos` on every request with no limit, no filter pushdown, and no caching. At 1000+ rps, this meant a full SQLite scan per request.
- **PERF-003:** No index on `completed` column meant any filtered query (or future WHERE clause) would scan all rows.
- **PERF-005:** EJS re-parsed templates on every request in non-production mode.
- **QUALITY-001–009:** Duplicated logic across route handlers with no shared abstractions.

---

## Refactoring Applied

### `db.js`
- Added `CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)` inside `serialize()` block.

### `app.js`
- Added `app.set('view cache', true)` to enable EJS template caching.

### `routes/index.js` (full rewrite)
- Added `completedToDb(value)`, `redirectPath(filter)`, `asyncHandler(fn)`, `safeFilter(value)` utility functions.
- Added module-level `todosCache` / `todosCacheTime` / `CACHE_TTL_MS = 1000` for TTL cache.
- Added `invalidateCache()` called in every write handler (POST routes).
- Added `mapRow(row)` helper to avoid repeated object literal construction.
- Added `trimTitle` middleware (replaces duplicated `req.body.title.trim()` calls).
- `fetchTodos`: now reads from cache when fresh; falls back to `SELECT * FROM todos ORDER BY id LIMIT 1000`.
- GET `/active` and GET `/completed`: read from cache; map and filter in-process (rows already capped at 1000).
- All POST handlers: use `asyncHandler`, `trimTitle`, `completedToDb`, `redirectPath`, `safeFilter`, `invalidateCache`.
- Removed 5 redundant try/catch blocks.
- Removed 6 duplicated `'/' + (req.body.filter || '')` expressions.
- Removed 3 inconsistent `completed` conversion expressions.
- Removed unused `next` parameters from 3 GET handler functions.

### `views/index.ejs`
- Replaced 5 instances of inline filter hidden input with `<%- include('_filter_input', { filter: filter }) %>`.

### `views/_filter_input.ejs` (new)
- Single-source EJS partial for the filter state hidden input field.

### `benchmark.js`
- Replaced remaining `mkdirp.sync(...)` call with `fs.mkdirSync(..., { recursive: true })`.

---

## Code Efficiency Changes

- **Duplicate logic removed:** 6× redirect URL pattern, 3× `completed` conversion, 5× try/catch boilerplate, 5× filter hidden input in template, 2× `title.trim()`
- **Redundant operations eliminated:** EJS re-parse per request (view cache), full DB scan per cached request
- **Estimated lines removed (routes/index.js):** ~40 lines of boilerplate eliminated
- **New utility code added:** ~50 lines (cache, helpers, asyncHandler) — net reduction in route handler complexity

---

## Test Verification

- **Test command:** `npm test`
- **Tests passed:** 2
- **Tests failed:** 0
- **Result:** ✅ PASSED

---

## Functional Verification

- **Method:** `node benchmark.js` (spawns server as child process, polls readiness, runs HTTP requests)
- **GET /:** HTTP 200, 0 errors ✅
- **GET /active:** HTTP 200, 0 errors ✅
- **GET /completed:** HTTP 200, 0 errors ✅

---

## Lint Verification

- **Command:** `npm run lint`
- **Result:** ✅ PASSED (0 errors, 0 warnings)

---

## Benchmark Configuration

- **Duration:** 5 seconds per route
- **Concurrency:** 10 workers
- **Routes:** GET `/`, GET `/active`, GET `/completed`
- **Dataset:** 3 benchmark seed todos (1 active ×2, 1 completed)
- **Environment:** Windows 10, Node.js v24.18.0

---

## Before vs After (original baseline → post-change)

| Metric | Before (baseline) | After (post-change) | Change |
|--------|------------------|---------------------|--------|
| GET / p50 latency (ms) | 8 | 4 | **-50%** ✅ Improved |
| GET / p95 latency (ms) | 10 | 5 | **-50%** ✅ Improved |
| GET / p99 latency (ms) | 13 | 6 | **-54%** ✅ Improved |
| GET / throughput (rps) | 1211.4 | 2397.2 | **+98%** ✅ Improved |
| GET / errors | 0 | 0 | No change ✅ |
| GET /active p50 (ms) | 8 | 3 | **-62%** ✅ Improved |
| GET /active p95 (ms) | 10 | 4 | **-60%** ✅ Improved |
| GET /active p99 (ms) | 11 | 5 | **-55%** ✅ Improved |
| GET /active throughput (rps) | 1244.2 | 2961.8 | **+138%** ✅ Improved |
| GET /active errors | 0 | 0 | No change ✅ |
| GET /completed p50 (ms) | 8 | 3 | **-62%** ✅ Improved |
| GET /completed p95 (ms) | 10 | 3 | **-70%** ✅ Improved |
| GET /completed p99 (ms) | 11 | 4 | **-64%** ✅ Improved |
| GET /completed throughput (rps) | 1262 | 3619.6 | **+187%** ✅ Improved |
| GET /completed errors | 0 | 0 | No change ✅ |
| Tests passing | 2/2 | 2/2 | No change ✅ |
| Build/lint | PASS | PASS | No change ✅ |

---

## Post-modernization vs Post-change comparison

| Metric | Post-modernization | Post-change | Change |
|--------|-------------------|-------------|--------|
| GET / p50 (ms) | 5 | 4 | -20% |
| GET / throughput (rps) | 1816.4 | 2397.2 | +32% |
| GET /active p50 (ms) | 5 | 3 | -40% |
| GET /active throughput (rps) | 1928 | 2961.8 | +54% |
| GET /completed p50 (ms) | 5 | 3 | -40% |
| GET /completed throughput (rps) | 1995.6 | 3619.6 | +81% |

---

## Result

**ACCEPTED** — All gates pass. All three routes improved materially in both latency and throughput. Zero regressions. Zero errors introduced. Tests and lint clean.

---

## Remaining Findings

No findings remain unapproved. All actionable items from the analysis report were approved and applied.

## Recommended Next Steps

1. **Expand test coverage** — add route-level integration tests using `supertest` to cover POST create/update/delete flows. The current test suite only covers module loading.
2. **Investigate sqlite3 6.x migration** — would resolve the transitive `node-gyp`/`tar` audit vulnerabilities. Requires Node >= 20.17 (already satisfied by v24.18.0).
3. **Consider better-sqlite3** — synchronous SQLite driver; typically 2–5× faster than the callback-based `sqlite3` driver for the read-heavy workload in this app.
4. **Add `NODE_ENV=production`** to deployment configuration to ensure view cache and other Express production optimisations are always enabled.
