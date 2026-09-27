# CodeTuner Regression Report

Generated: 2026-09-27T13:32:00.000Z

## Gate Results by Recommendation

| Recommendation ID | Build | Tests | Functional Check | Benchmark | Result | Notes |
|-------------------|-------|-------|------------------|-----------|--------|-------|
| PERF-001 | PASS | 2/2 | PASS (HTTP 200) | p50 8→4ms; +98% rps | ACCEPTED | LIMIT 1000 applied |
| PERF-002 | PASS | 2/2 | PASS (HTTP 200) | /active +138% rps; /completed +187% rps | ACCEPTED | Cache-backed fetch |
| PERF-003 | PASS | 2/2 | PASS (HTTP 200) | Structural; measurable at scale | ACCEPTED | Index created on startup |
| PERF-004 | PASS | 2/2 | PASS (HTTP 200) | Counts correct in rendered HTML | ACCEPTED | Derived from cached rows |
| PERF-005 | PASS | 2/2 | PASS (HTTP 200) | EJS view cache active | ACCEPTED | `view cache` flag set |
| PERF-006 | PASS | 2/2 | PASS (HTTP 200 all routes) | Cache hits at 0.4–0.7ms response time | ACCEPTED | TTL=1000ms; write invalidation verified |
| QUALITY-001 | PASS | 2/2 | PASS | No degradation | ACCEPTED | `completedToDb()` extracted |
| QUALITY-002 | PASS | 2/2 | PASS | No degradation | ACCEPTED | `trimTitle` middleware |
| QUALITY-003 | PASS | 2/2 | PASS | No degradation | ACCEPTED | `redirectPath()` extracted |
| QUALITY-005 | PASS | 2/2 | PASS | No degradation | ACCEPTED | `asyncHandler` wrapper |
| QUALITY-006 | PASS | 2/2 | PASS | No degradation | ACCEPTED | `safeFilter()` whitelist |
| QUALITY-007 | PASS | 2/2 | PASS | No degradation | ACCEPTED | EJS `_filter_input` partial |
| QUALITY-008 | PASS | 2/2 | PASS | No degradation | ACCEPTED | stale mkdirp import fixed |
| QUALITY-009 | PASS | 2/2 | PASS | No degradation | ACCEPTED | unused `next` params removed |

## Regression Details

None. All 14 approved changes passed all four gates without regression.

## Rollback Log

No rollbacks required.
