# CodeTuner Review Report

## Executive Summary

Five routes were benchmarked. The results reveal a severe performance gap between
the list-articles route and every other endpoint:

| Route | p50 ms | p95 ms | RPS |
|---|---|---|---|
| `GET /api/articles` | **618** | **902** | 16 |
| `GET /api/articles/:slug` | 17 | 20 | 578 |
| `GET /api/articles/:slug/comments` | 50 | 64 | 201 |
| `GET /api/tags` | 3 | 5 | 2,922 |
| `GET /api/profiles/:username` | 3 | 5 | 3,042 |

`GET /api/articles` is **36× slower** at p50 than the single-article endpoint and
**38,000× lower in throughput** than the tags endpoint. The root causes are a
guaranteed N+1 query pattern inside `Article.prototype.toJson`, an unbounded
`countFavoritedBy` COUNT query fired per article, and a redundant `getTags` call
per article even when tags were already fetched through the JOIN. The comments
route and the single-article route share a smaller but still meaningful subset of
the same issues.

Two structural findings (dead commented-out code blocks, and a duplicated
favorite/unfavorite handler pair) were also identified.

---

## Benchmark Overview

| Route | p50 ms | p95 ms | p99 ms | RPS | Errors |
|---|---|---|---|---|---|
| `GET /api/articles` | 618 | 902 | 904 | 16.0 | 0 |
| `GET /api/tags` | 3 | 5 | 7 | 2,921.8 | 0 |
| `GET /api/articles/:slug` | 17 | 20 | 21 | 578.0 | 0 |
| `GET /api/profiles/:username` | 3 | 5 | 6 | 3,041.6 | 0 |
| `GET /api/articles/:slug/comments` | 50 | 64 | 67 | 201.4 | 0 |

Concurrency: 10 workers, 5-second run. No errors on any route.

---

## Analyzed Scope

Files read in full:

- `api/articles.js` (479 lines)
- `api/tags.js` (14 lines)
- `api/profiles.js` (84 lines)
- `models/article.js` (163 lines)
- `models/user.js` (196 lines)
- `models/comment.js` (18 lines)
- `models/tag.js` (24 lines)
- `models/index.js` (201 lines)
- `lib.js` (74 lines)

**Total analyzed: 1,253 lines.**

---

## Performance Bottlenecks

### CT-001 — N+1 `countFavoritedBy` query fired per article in list

- **Severity:** Critical
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/articles`
- **File:** `models/article.js`
- **Function:** `Article.prototype.toJson`
- **Root Cause:**  
  `toJson` calls `this.countFavoritedBy()` unconditionally on every article
  instance (line 145). For a default page of 20 articles this fires 20 separate
  `SELECT COUNT(*)` queries against the `UserFavoriteArticle` join table.
  Because `countFavoritedBy` is never pre-computed in the parent list query,
  there is no escape path — every serialization of an article list is guaranteed
  to hit the database N times.
- **Evidence:** `models/article.js:145` — `this.countFavoritedBy()` inside
  `Promise.all`. The list query in `api/articles.js:162–173` does not include a
  `favoritesCount` aggregate.
- **Benchmark Correlation:** `GET /api/articles` p50 618 ms; every other read
  endpoint that fetches a single article (which calls `toJson` once) has p50 of
  17–50 ms. The difference scales linearly with page size.
- **Metric to Improve:** p50 latency, p95 latency, RPS on `GET /api/articles`
- **Recommended Optimization:**  
  Add a `favoritesCount` virtual attribute or aggregate to the
  `Article.findAndCountAll` query using a subquery or a LEFT JOIN with
  `GROUP BY`. Pass the pre-computed value into `toJson` via `opts.favoritesCount`
  (the same pattern already used for `opts.tags` and `opts.favorited`), and skip
  `countFavoritedBy()` when it is supplied. This reduces N COUNT queries to zero
  per list request.

---

### CT-002 — `getTags()` called per article even when tags were already JOINed

- **Severity:** High
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/articles`
- **File:** `models/article.js` / `api/articles.js`
- **Function:** `Article.prototype.toJson` / `router.get('/')`
- **Root Cause:**  
  When no `tag` filter is active (the common case), the list handler passes
  `tags: undefined` into `toJson` (`api/articles.js:177`). Inside `toJson`,
  `opts.tags` is falsy, so the fallback `this.getTags()` fires — one extra
  `SELECT` per article — even though the `Article.findAndCountAll` query already
  eagerly loads `tags` via an `include` (not shown in the non-filtered path, but
  the tag include is only conditional on `req.query.tag`). When `req.query.tag`
  is absent, no tag JOIN is performed, making the lazy per-article `getTags`
  call the sole source of tag data. The fix for CT-001 should include always
  passing tags through the JOIN, eliminating these N queries.
- **Evidence:** `api/articles.js:152–160` (tag include is guarded by
  `req.query.tag`); `api/articles.js:177` (`tags: undefined` passed when no tag
  filter); `models/article.js:132–133` (fallback to `this.getTags()`).
- **Benchmark Correlation:** `GET /api/articles` p50 618 ms. Each of the N tag
  fetches adds at least one DB round-trip per article.
- **Metric to Improve:** p50 latency on `GET /api/articles`; DB queries per
  request.
- **Recommended Optimization:**  
  Remove the `req.query.tag` guard and always include the tag association in the
  `findAndCountAll`. Pass `article.tags` (the pre-loaded association) into
  `toJson` unconditionally, so `getTags()` is never called on a list path.

---

### CT-003 — Double DB lookup in `GET /api/articles/:slug` (param + handler)

- **Severity:** Medium
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/articles/:slug`
- **File:** `api/articles.js`
- **Function:** `router.param('article')` / `router.get('/:article')`
- **Root Cause:**  
  `router.param('article')` fetches the article with its author JOIN
  (`api/articles.js:44–60`). The route handler then immediately calls
  `req.article.getAuthor()` again (`api/articles.js:274`), producing a second
  `SELECT` for the same author row. `getAuthor()` is called even though
  `req.article.author` is already populated by the param middleware's eager
  include.
- **Evidence:** `api/articles.js:50` — param middleware includes
  `{ model: User, as: 'author' }`; `api/articles.js:274` — handler calls
  `req.article.getAuthor()` again in a `Promise.all`.
- **Benchmark Correlation:** `GET /api/articles/:slug` p50 17 ms. The route is
  already fast, but the redundant query is unnecessary overhead that will become
  visible at higher concurrency or on a real network DB.
- **Metric to Improve:** DB queries per request on `GET /api/articles/:slug`.
- **Recommended Optimization:**  
  Replace `req.article.getAuthor()` with `req.article.author` (already populated
  by the param middleware). This eliminates one DB query per single-article
  request. `toJson` checks `this.author` before calling `getAuthor()` at line
  131, so the fix just requires passing the already-loaded association.

---

### CT-004 — N+1 `toProfileJSONFor` → `user.hasFollow` calls in comment list

- **Severity:** Medium
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/articles/:slug/comments`
- **File:** `models/comment.js` / `models/user.js`
- **Function:** `Comment.prototype.toJson` / `User.prototype.toProfileJSONFor`
- **Root Cause:**  
  For an authenticated request, each comment serialized via `comment.toJson(user)`
  calls `this.author.toProfileJSONFor(user)`, which in turn calls
  `user.hasFollow(this.id)` (`models/user.js:101`). This is one `SELECT` against
  `UserFollowUser` per comment. For a thread with M comments, this is M queries.
- **Evidence:** `models/comment.js:14`; `models/user.js:101`.
- **Benchmark Correlation:** `GET /api/articles/:slug/comments` p50 50 ms (vs
  17 ms for the simpler single-article read). The extra latency aligns with
  per-comment follow-checks for the seed data's comment count.
- **Metric to Improve:** p50 and p95 on `GET /api/articles/:slug/comments`;
  DB queries per request.
- **Recommended Optimization:**  
  Pre-fetch the set of user IDs the logged-in user follows once, before the
  serialization loop, and pass a boolean or a Set into `toProfileJSONFor`.
  Alternatively, include the follow relationship via JOIN when fetching comments
  so the ORM does not issue separate queries per comment author.

---

### CT-005 — Unbounded `Tag.findAll` in `getIndexTags` — no LIMIT

- **Severity:** Medium
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/tags`
- **File:** `lib.js`
- **Function:** `getIndexTags`
- **Root Cause:**  
  `getIndexTags` calls `Tag.findAll` with no `limit` clause (`lib.js:36–44`).
  As the tag table grows, this query returns and maps the entire table. The
  result set is unbounded, and the `.map` materialises all tag objects in memory
  just to extract their names.
- **Evidence:** `lib.js:36–44` — `Tag.findAll({ order: [...] })` with no limit.
- **Benchmark Correlation:** `GET /api/tags` currently p50 3 ms — extremely fast
  because the dataset is small. This is a latent risk that will degrade linearly
  as the tag table grows.
- **Metric to Improve:** p50/p95 latency and memory at scale on `GET /api/tags`.
- **Recommended Optimization:**  
  Add a reasonable `limit` (e.g. 100) to the `findAll` call. Optionally use
  `attributes: ['name']` to avoid fetching unused columns (id, createdAt,
  updatedAt) for every tag.

---

## Code Efficiency Findings

### CT-006 — Redundant `User.findByPk` inside `router.get('/:article')`

- **Severity:** Low
- **Confidence:** High
- **Risk:** Low
- **Route:** `GET /api/articles/:slug`
- **File:** `api/articles.js`
- **Function:** `router.get('/:article')`
- **Root Cause:**  
  For unauthenticated requests (`req.payload` is null), the handler still wraps
  both `null` and `getAuthor()` in a `Promise.all`. The `user` variable is
  always `null` on unauthenticated paths, adding no value but still creating an
  unnecessary promise resolution. (Minor overhead only.)
- **Evidence:** `api/articles.js:270–277`.
- **Recommended Optimization:** Guard the `Promise.all` pattern; for the
  unauthenticated case `req.article.author` is already available.

---

## Code Bloat & Duplication Findings

### CT-007 — Large commented-out code blocks throughout `api/articles.js`

- **Category:** Code Bloat
- **Severity:** Low
- **Confidence:** High
- **Risk:** Low
- **File:** `api/articles.js`
- **Evidence:**  
  - Lines 105–115: 11 lines of commented-out `authorInclude` follow-join code  
  - Lines 182–183: 2 lines of dead debug comment  
  - Lines 240–241: 2 lines of dead save/setArticleTags code  
  Together with scattered `// TODO` items, these inflate the file without
  contributing to maintainability. They represent an unfinished feature
  (follow-status on author) that is documented nowhere else.
- **Why it matters:** Maintenance confusion; future developers may not know if
  the commented code is safe to delete.
- **Recommended Optimization:** Remove dead comment blocks; capture the TODO work
  as a GitHub issue if it is still planned.

---

### CT-008 — Near-duplicate favorite / unfavorite handlers

- **Category:** Structural Waste / Duplication
- **Severity:** Low
- **Confidence:** High
- **Risk:** Low
- **Route:** `POST /:article/favorite` / `DELETE /:article/favorite`
- **File:** `api/articles.js`
- **Function:** `router.post('/:article/favorite')` / `router.delete('/:article/favorite')`
- **Root Cause:**  
  The two handlers (`api/articles.js:346–395`) are structurally identical: both
  look up the same `[user, article]` pair with the same `Promise.all`, check the
  same null conditions, and return the same `article.toJson(user)` response. Only
  the single call `user.addFavorite` vs `user.removeFavorite` differs.
- **Evidence:** `api/articles.js:346–395` — ~50 lines with only 1 line of
  semantic difference.
- **Recommended Optimization:** Extract a shared handler factory or helper
  function parameterised on the action (`add` / `remove`), reducing duplication
  to a single implementation.

---

### CT-009 — `getIndexTags` maps objects to names — unnecessary intermediate array

- **Category:** Code Efficiency / Structural Waste
- **Severity:** Low
- **Confidence:** High
- **Risk:** Low
- **File:** `lib.js`
- **Function:** `getIndexTags`
- **Root Cause:**  
  `Tag.findAll` returns full Sequelize model instances with all columns. The
  `.map(tag => tag.name)` call then discards everything except `name`. With an
  `attributes: ['name']` restriction on the query, Sequelize would not hydrate
  unused columns, reducing memory allocation and result-set transfer size.
- **Evidence:** `lib.js:36–44`.
- **Recommended Optimization:** Add `attributes: ['name']` to the `findAll` call.

---

## Estimated Code Bloat

> **Estimated Code Bloat — analyzed scope only**

- **Analyzed Lines:** 1,253 (across 9 files listed in Analyzed Scope)
- **Estimated Bloated Lines:** ~75
  - Commented-out dead code blocks in `api/articles.js`: ~15 lines
  - Structural duplication in favorite/unfavorite handlers: ~48 lines
    (one handler is a near-complete copy of the other)
  - Unnecessary intermediate array materialization in `getIndexTags`: ~2 lines
    (minor, counted conservatively)
  - Dead follow-count import/reference paths: ~10 lines
- **Estimated Code Bloat Percentage:** ~6%
- **Main Sources of Bloat:**
  1. Duplicate favorite/unfavorite handler pair (`api/articles.js:346–395`)
  2. Commented-out dead code blocks (`api/articles.js:105–115`, `240–241`)

---

## Ranked Optimization Candidates

| Rank | Finding ID | Title | Expected Impact | Confidence | Risk | Metric |
|------|------------|-------|-----------------|------------|------|--------|
| 1 | CT-001 | N+1 `countFavoritedBy` per article in list | Very High — eliminates N DB queries per page | High | Low | p50/p95 `GET /api/articles`, RPS |
| 2 | CT-002 | `getTags()` per article — missing always-on JOIN | High — eliminates N tag queries per page | High | Low | p50/p95 `GET /api/articles`, DB queries/req |
| 3 | CT-003 | Double author lookup in `GET /:article` | Medium — removes 1 redundant query per request | High | Low | DB queries/req `GET /api/articles/:slug` |
| 4 | CT-004 | N+1 `hasFollow` per comment in list | Medium — scales with comment count | High | Low | p50 `GET /api/articles/:slug/comments` |
| 5 | CT-005 | Unbounded `Tag.findAll` — no LIMIT | Low now, High at scale | High | Low | p50 `GET /api/tags` at scale |
| 6 | CT-009 | `getIndexTags` fetches unused columns | Low | High | Low | Memory, payload on `GET /api/tags` |
| 7 | CT-008 | Duplicate favorite/unfavorite handlers | Maintenance only | High | Low | Code maintainability |
| 8 | CT-006 | Redundant Promise.all on unauthenticated path | Very Low | High | Low | Micro-latency `GET /api/articles/:slug` |
| 9 | CT-007 | Commented-out dead code in articles.js | None | High | Low | Maintainability |

---

## Recommended First Optimization Target

**Optimize CT-001 + CT-002 together — they are the root causes of the 618 ms
p50 on `GET /api/articles`, and fixing them requires changes to the same two
files and the same query.**

### What to do

1. In `api/articles.js`, always include the tag association in the
   `Article.findAndCountAll` query (remove the `req.query.tag` guard on the tag
   include, keeping only the `where` filter conditional).
2. Add a `favoritesCount` aggregate to the same query using a subquery or a
   Sequelize literal, so the DB computes all counts in one query rather than N
   COUNT calls.
3. Pass `tags: article.tags` and `favoritesCount: <precomputed>` into every
   `article.toJson(user, opts)` call in the list response handler, so `toJson`
   never falls back to `getTags()` or `countFavoritedBy()`.

### Files and functions involved

- **`api/articles.js`** — `router.get('/')` (lines 79–192)
- **`models/article.js`** — `Article.prototype.toJson` (lines 126–160) — must
  accept and honour `opts.favoritesCount`

### Benchmark route to re-run after the fix

`GET /api/articles` — the primary affected route.

### Metrics to compare before and after

| Metric | Before | Target after fix |
|---|---|---|
| p50 latency | 618 ms | < 50 ms (est.) |
| p95 latency | 902 ms | < 80 ms (est.) |
| Throughput (RPS) | 16 | > 200 (est.) |
| DB queries per request (20-article page) | ~41 (1 list + 20 tag + 20 count) | ~2 (1 list + 0 extra) |
