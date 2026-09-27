# Modernization Plan

Generated: 2026-09-27T13:12:00.000Z

## 1. Current Stack

| Technology | Current Version | Source |
|-----------|----------------|--------|
| Node.js Runtime | v24.18.0 (no .nvmrc; not pinned) | `node --version` |
| Express | ~4.16.1 (resolved 4.16.4) | package.json |
| EJS | ~2.6.1 (resolved 2.6.2) | package.json |
| sqlite3 | ^5.0.2 (resolved 5.1.7) | package.json |
| morgan | ~1.9.1 (resolved 1.9.1) | package.json |
| cookie-parser | ~1.4.4 (resolved 1.4.7) | package.json |
| http-errors | ~1.6.3 (resolved 1.6.3) | package.json |
| debug | ~2.6.9 (resolved 2.6.9) | package.json |
| mkdirp | ^1.0.4 | package.json |
| helmet | not installed | — |
| ESLint | not installed | — |
| Prettier | not installed | — |
| Test framework | not installed | — |

## 2. Version Research (verified at execution time)

| Technology | Current | Latest Stable | Recommended Target | Source |
|-----------|---------|---------------|--------------------|--------|
| Node.js | v24.18.0 | v26.10.0 | v24.x LTS (Krypton) | nodejs.org/dist/index.json |
| Express | 4.16.4 | 5.2.1 (latest), 4.22.3 (latest-4) | ^4.22.3 | npm view express dist-tags |
| EJS | 2.6.2 | 6.0.1 | ^3.1.10 | npm view ejs |
| sqlite3 | 5.1.7 | 6.0.1 (requires Node >=20.17) | ^5.1.7 (floor correction only) | npm view sqlite3 |
| morgan | 1.9.1 | 1.12.1 | ^1.12.1 | npm view morgan dist-tags |
| cookie-parser | 1.4.7 | 1.4.7 | ~1.4.7 (floor correction) | npm view cookie-parser dist-tags |
| http-errors | 1.6.3 | 2.0.1 | ^1.8.1 | npm view http-errors dist-tags |
| debug | 2.6.9 | 4.4.3 | ^4.0.0 | npm view debug dist-tags |
| mkdirp | 1.0.4 | 1.0.4 | REMOVE — use native fs.mkdirSync | — |
| helmet | — | 8.3.0 | ^8.3.0 | npm view helmet dist-tags |
| ESLint | — | latest | eslint@latest (flat config) | — |
| Prettier | — | latest | prettier@latest | — |
| Mocha | — | latest | mocha@latest | — |

## 3. User Decisions

```
MODERN-001: Node.js pin to v24.x LTS via .nvmrc — APPROVED
MODERN-002: Express 4.16.4 → 4.22.3 — APPROVED
MODERN-003: EJS 2.6.2 → 3.1.10 — APPROVED
MODERN-004: sqlite3 package.json floor ^5.0.2 → ^5.1.7 — APPROVED
MODERN-005: morgan 1.9.1 → 1.12.1 — APPROVED
MODERN-006: cookie-parser floor ~1.4.4 → ~1.4.7 — APPROVED
MODERN-007: http-errors 1.6.3 → 1.8.1 — APPROVED
MODERN-008: debug 2.6.9 → 4.4.3 — APPROVED
MODERN-009: Remove mkdirp; use native fs.mkdirSync in db.js — APPROVED
MODERN-012: DB layer callbacks → async/await in routes/index.js — APPROVED
MODERN-013: Add ESLint, Prettier, Mocha test infrastructure — APPROVED
MODERN-014: Add helmet middleware — APPROVED
```

## 4. Migration Order

1. Pin Node.js version (.nvmrc) — no install needed
2. Update package.json dependency versions — no code changes
3. npm install — apply updated versions
4. Replace mkdirp with native fs.mkdirSync in db.js
5. Add helmet to app.js
6. Refactor routes/index.js to async/await (MODERN-012)
7. Add ESLint + Prettier config (MODERN-013)
8. Add Mocha test scaffolding (MODERN-013)
9. Run server startup smoke test

## 5. Breaking Changes by Approved Upgrade

| Upgrade | Known Breaking Changes | Affected Files |
|---------|----------------------|----------------|
| Express 4.16 → 4.22 | None for this codebase (all 4.x semver compatible) | None |
| EJS 2.6 → 3.1 | Stricter parser; some deprecated options removed. Basic `<%= %>` syntax unchanged. | views/index.ejs, views/error.ejs |
| debug 2.x → 4.x | Env var `DEBUG` handling unchanged; API `require('debug')('ns')` unchanged | bin/www |
| http-errors 1.6 → 1.8 | Backward compatible; same createError() API | app.js |
| morgan 1.9 → 1.12 | Backward compatible | app.js |
| mkdirp removal | db.js must be updated; benchmark.js uses mkdirp too but is not production code | db.js |
| helmet added | New headers sent; could affect integration tests if any check response headers | app.js |
| async/await refactor | Logic semantics preserved; error propagation must be verified | routes/index.js |

## 6. Validation Strategy

After each step:
- Start server: `node ./bin/www` (background), verify HTTP 200 on GET /
- Check no unhandled rejection or startup errors in stderr
- After full set: run smoke test on all three GET routes

## 7. Final Migration Status

| ID | Change | Status | Notes |
|----|--------|--------|-------|
| MODERN-001 | Added `.nvmrc` pinned to Node 24 LTS | ✅ DONE | Matches running runtime v24.18.0 |
| MODERN-002 | Express 4.16.4 → 4.22.3 | ✅ DONE | `npm install` resolved correctly |
| MODERN-003 | EJS 2.6.2 → 3.1.10 | ✅ DONE | Server returns HTTP 200; templates render |
| MODERN-004 | sqlite3 floor `^5.0.2` → `^5.1.7` | ✅ DONE | Lock already at 5.1.7 |
| MODERN-005 | morgan 1.9.1 → 1.12.1 | ✅ DONE | Backward compatible |
| MODERN-006 | cookie-parser floor `~1.4.4` → `~1.4.7` | ✅ DONE | Backward compatible |
| MODERN-007 | http-errors 1.6.3 → 1.8.1 | ✅ DONE | Backward compatible |
| MODERN-008 | debug 2.6.9 → 4.4.3 | ✅ DONE | API unchanged for usage in bin/www |
| MODERN-009 | Removed mkdirp; using `fs.mkdirSync` in db.js | ✅ DONE | Native Node.js API |
| MODERN-012 | routes/index.js refactored to async/await | ✅ DONE | All route handlers use async/await + try/catch |
| MODERN-013 | Added ESLint (flat config), Prettier, Mocha | ✅ DONE | `npm test` 2/2 passing; `npm run lint` clean |
| MODERN-014 | Added helmet middleware to app.js | ✅ DONE | Security headers now sent on all responses |

Audit note: 9 vulnerabilities exist in transitive build-time dependencies of sqlite3@5.1.7 (node-gyp, tar) and mocha (serialize-javascript). These are not runtime exploitable in this application. Resolving would require sqlite3@6.x (outside approved scope).

