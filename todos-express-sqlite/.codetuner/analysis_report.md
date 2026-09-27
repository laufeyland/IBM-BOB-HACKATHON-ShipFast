# CodeTuner Analysis Report

Generated: 2026-09-27T13:20:00.000Z

## Performance Findings

---

### PERF-001: Unbounded SELECT * on Every GET Request

- **Finding:** All todo rows fetched unconditionally; no pagination or limit
- **Affected file/component:** `routes/index.js` — `fetchTodos()` middleware (line 29)
- **Evidence:** `SELECT * FROM todos` executed on every GET `/`, `/active`, `/completed` request with no LIMIT or WHERE clause
- **Expected impact:** As dataset grows (1000+ todos), latency will increase linearly. Current p50=5ms (small dataset). With 10K todos, expect 80–120ms.
- **Suggested improvement:** Add `LIMIT ?` / pagination. For TodoMVC, capping at 1000 rows is a reasonable safety net.
- **Confidence:** High
- **Risk:** LOW

---

### PERF-002: In-Memory JavaScript Filtering Instead of SQL WHERE Clause

- **Finding:** `/active` and `/completed` routes fetch all todos then filter in Node.js instead of using `WHERE completed = ?` in SQL
- **Affected file/component:** `routes/index.js` — lines 56, 62
- **Evidence:**
  - Line 56: `res.locals.todos.filter(function(todo) { return !todo.completed; })`
  - Line 62: `res.locals.todos.filter(function(todo) { return todo.completed; })`
  - These execute after `fetchTodos` has already fetched every row
- **Expected impact:** On medium datasets (100+ todos), filtering in memory adds 2–50ms overhead. SQL WHERE pushes work to the DB engine (optimisable with index).
- **Suggested improvement:** Refactor `fetchTodos` middleware to accept an optional SQL filter, or create separate `fetchActiveTodos` / `fetchCompletedTodos` middleware that run `SELECT * FROM todos WHERE completed = 0/1`.
- **Confidence:** High
- **Risk:** LOW

**Note:** Also identified as QUALITY-004 (code quality perspective). Merged here.

---

### PERF-003: Missing Database Index on `completed` Column

- **Finding:** No index on `completed` column; filtered queries will do full table scans
- **Affected file/component:** `db.js` — schema definition (lines 9–13)
- **Evidence:** `CREATE TABLE IF NOT EXISTS todos` has no `CREATE INDEX` statement for the `completed` column. Any WHERE or ORDER BY on `completed` scans all rows.
- **Expected impact:** On 500+ rows, O(n) scan latency. With 10K todos, expect 5–10x slower filtered queries.
- **Suggested improvement:** Add `CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);` in `db.js` inside the `serialize()` block, after table creation.
- **Confidence:** High
- **Risk:** LOW

---

### PERF-004: In-Memory Count Aggregation

- **Finding:** `activeCount` and `completedCount` computed via `.filter().length` on all rows in-memory
- **Affected file/component:** `routes/index.js` — lines 39–40
- **Evidence:**
  - Line 39: `res.locals.activeCount = todos.filter(...).length`
  - Line 40: `res.locals.completedCount = todos.length - res.locals.activeCount`
- **Expected impact:** Negligible on small datasets; adds 2–5ms per request on 10K todos.
- **Suggested improvement:** Run `SELECT SUM(CASE WHEN completed IS NULL OR completed = 0 THEN 1 ELSE 0 END) AS active_count FROM todos` separately, or compute in the same query using a subquery. (Lower priority than PERF-002 and PERF-003.)
- **Confidence:** Medium
- **Risk:** LOW

---

### PERF-005: No EJS View Cache Enabled

- **Finding:** EJS templates compiled on every request; no view caching flag set
- **Affected file/component:** `app.js` — `res.render('index')` (lines 52, 58, 64 in routes)
- **Evidence:** `app.set('view cache', ...)` is not present in `app.js`. In development mode Express defaults `view cache` to `false`, meaning EJS re-parses templates each request.
- **Expected impact:** EJS parsing adds ~2–3ms per request. Setting `view cache = true` drops this to <0.5ms. Potential 5–10ms p50/p95 improvement.
- **Suggested improvement:** Add `app.set('view cache', true);` to `app.js` (or ensure it is set for production via `NODE_ENV=production`, which enables it automatically).
- **Confidence:** Medium
- **Risk:** LOW — single flag; no code changes required

---

### PERF-006: No Query Result Caching

- **Finding:** Identical `SELECT * FROM todos` re-executed on every read request; no in-memory cache
- **Affected file/component:** `routes/index.js` — `fetchTodos()` (line 29)
- **Evidence:** Every GET `/`, `/active`, `/completed` hits the DB. No TTL cache, no memoisation.
- **Expected impact:** With a 1-second TTL cache, repeated reads at 1000+ rps could serve ~1000 requests per DB hit instead of 1. Throughput could double; p50 could drop to <1ms on cache hits.
- **Suggested improvement:** Implement simple in-memory Map cache with timestamp-based TTL (no external dependency). Invalidate on every write (POST /). Example: cache key = `'todos'`, TTL = 1000ms.
- **Confidence:** High
- **Risk:** MEDIUM — cache invalidation must cover all write paths or stale data will be served

---

## Code Quality Findings

---

### QUALITY-001: Inconsistent `completed` Boolean-to-DB Conversion

- **Finding:** Three different expressions convert form `completed` to DB integer, with subtly different logic
- **Affected file/component:** `routes/index.js` — POST route handlers
- **Evidence:**
  - Line 75: `req.body.completed == true ? 1 : null` (POST `/` — uses `==` equality)
  - Line 91: `req.body.completed !== undefined ? 1 : null` (POST `/:id` — uses `undefined` check)
  - Line 113: `req.body.completed !== undefined ? 1 : null` (POST `/toggle-all`)
- **Recommended refactor:** Extract a single `completedToDb(value)` helper function and replace all three occurrences.
- **Expected benefit:** Eliminates behavioral inconsistency; single point of change
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-002: Duplicated Title Trim Logic

- **Finding:** `req.body.title.trim()` appears in two route handlers identically
- **Affected file/component:** `routes/index.js` — lines 69, 85
- **Evidence:**
  - Line 69: `req.body.title = req.body.title.trim();`
  - Line 85: `req.body.title = req.body.title.trim();`
- **Recommended refactor:** Extract a middleware function `trimTitle(req, res, next)` or inline at a single shared preprocessing step.
- **Expected benefit:** Single point of maintenance for title sanitisation
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-003: Repeated Redirect URL Pattern (6 duplications)

- **Finding:** `'/' + (req.body.filter || '')` is repeated verbatim in every POST handler
- **Affected file/component:** `routes/index.js` — all POST handlers (lines 71, 77, 95, 104, 115, 124)
- **Evidence:** 6 identical expressions across the file
- **Recommended refactor:** Extract `function redirectPath(filter) { return '/' + (filter || ''); }` and replace all six occurrences.
- **Expected benefit:** Single point of change for redirect URL logic; reduces cognitive load
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-004: In-Memory Filtering — Code Quality Dimension

*(Merged with PERF-002 — see Performance Findings section.)*

---

### QUALITY-005: Boilerplate try/catch Blocks (5 duplications)

- **Finding:** All 5 POST route handlers contain identical `try { ... } catch (err) { next(err); }` wrapper with no additional logic
- **Affected file/component:** `routes/index.js` — all async POST handlers
- **Evidence:** 5 identical catch blocks in the file
- **Recommended refactor:** Create an `asyncHandler` utility:
  ```javascript
  function asyncHandler(fn) {
    return function(req, res, next) {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  ```
  Wrap each async route with `asyncHandler(async function(req, res, next) { ... })`.
- **Expected benefit:** Eliminates 10 lines of boilerplate; makes error handling transparent and auditable
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-006: Unvalidated Filter Parameter

- **Finding:** `req.body.filter` is echoed directly into redirect URLs and template hidden inputs with no whitelist validation
- **Affected file/component:** `routes/index.js` (all POST handlers); `views/index.ejs` (5 locations)
- **Evidence:** Every POST handler uses `req.body.filter` without checking it is one of `['active', 'completed', '']`
- **Recommended refactor:** Add a whitelist check: `const validFilters = ['active', 'completed', '']; const filter = validFilters.includes(req.body.filter) ? req.body.filter : '';`
- **Expected benefit:** Prevents invalid filter values from propagating; security hardening
- **Confidence:** Medium
- **Risk:** LOW (EJS auto-escapes; current XSS risk is low, but validation is best practice)

---

### QUALITY-007: Repeated Template Hidden Input (5 duplications in index.ejs)

- **Finding:** `<% if (filter) { %><input type="hidden" name="filter" value="<%= filter %>"/><% } %>` repeated 5 times in `views/index.ejs`
- **Affected file/component:** `views/index.ejs` (lines 16–18, 26–28, 40–42, 45–47, 71–73)
- **Recommended refactor:** Extract to an EJS include partial: `<%- include('_filter_input', { filter: filter }) %>`
- **Expected benefit:** Single point of change for filter field HTML
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-008: benchmark.js Still Imports mkdirp (Removed Dependency)

- **Finding:** `benchmark.js` still imports `mkdirp` at line 15, but `mkdirp` was removed from `package.json` (MODERN-009). This will cause a runtime error if `node_modules` is freshly installed.
- **Affected file/component:** `benchmark.js` — line 15 (`const mkdirp = require('mkdirp')`)
- **Evidence:**
  - `benchmark.js:15`: `const mkdirp = require('mkdirp');`
  - `package.json`: no `mkdirp` in dependencies or devDependencies
  - `db.js:4`: already uses `fs.mkdirSync('./var/db', { recursive: true })` — the correct replacement
- **Recommended refactor:** Replace `mkdirp.sync('.codetuner')` in benchmark.js with `fs.mkdirSync('.codetuner', { recursive: true })` and remove the mkdirp require.
- **Expected benefit:** Fixes a latent runtime error; aligns with db.js pattern
- **Confidence:** High
- **Risk:** LOW

---

### QUALITY-009: Unused `next` Parameters in GET Route Handlers

- **Finding:** Three GET route handlers declare `next` but never use it
- **Affected file/component:** `routes/index.js` — lines 50, 55, 61
- **Evidence:**
  - Line 50: `function(req, res, next) { ... }` — `next` unused
  - Line 55: `function(req, res, next) { ... }` — `next` unused
  - Line 61: `function(req, res, next) { ... }` — `next` unused
- **Recommended refactor:** Remove unused `next` parameter from these three handlers.
- **Expected benefit:** Cleaner signatures; removes lint warnings
- **Confidence:** High
- **Risk:** LOW

---

## Conflicts and Overlaps

| Type | Items | Resolution |
|------|-------|-----------|
| **Duplicate finding** | PERF-002 (performance) + QUALITY-004 (quality) — both identify in-memory filtering | Merged into PERF-002. Code quality recommendation (QUALITY-004) is subsumed. |
| **No conflicts** | All other findings are complementary; no contradictory recommendations. | — |
