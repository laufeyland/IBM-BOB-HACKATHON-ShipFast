---
name: codetuner-refactor
description: Use when the user wants to apply performance optimizations from the CodeTuner review — implements the highest-priority verified finding, preserves application behavior, runs tests, reruns benchmarks, and produces a quantified before/after optimization report.
metadata:
  disable-model-invocation: false
  argument-hint: "[finding ID or route to optimize]"
---

# CodeTuner Refactor

> **Prerequisites:** This skill requires output from both `codetuner-benchmark` and `codetuner-review`.
> `CONTEXT.md`, `.codetuner/baseline_metrics.json`, and `.codetuner/review_report.md` must all exist.
> This skill modifies application source code — one finding at a time, with test and benchmark verification.

---

## Step 1 — Load Artifacts

Read all existing CodeTuner artifacts using `read_file`:

1. `CONTEXT.md` — application architecture, routes, data flow
2. `.codetuner/baseline_metrics.json` — measured performance baseline
3. `.codetuner/review_report.md` — confirmed findings, rankings, and recommended optimizations

If any file is missing, stop and inform the user which prerequisite skill needs to run first.

Do **not** perform a new repository scan. Use the review report as the authoritative source of findings — only inspect source files directly involved in the selected optimization.

---

## Step 2 — Validate the Baseline

Before touching any code, verify the baseline benchmark is usable by inspecting `.codetuner/baseline_metrics.json`:

- File exists and is not empty
- Contains actual recorded requests (not zero-count runs)
- Does **not** show a 100% error rate
- The target route has valid latency and throughput measurements

If the baseline is invalid, incomplete, or entirely failing — **STOP**. Do not refactor. Report clearly why a valid before/after comparison cannot be performed. Never optimize against unusable benchmark data.

---

## Step 3 — Select One Optimization Target

By default, select the **highest-ranked finding** from `.codetuner/review_report.md`.

Prioritize findings that have:
1. High expected measurable impact
2. High confidence
3. Low or medium implementation risk
4. A benchmark route that can be reliably re-run

Only optimize **one finding per execution** unless the user explicitly requests multiple. Do not combine unrelated refactors in a single run.

If the user passes a finding ID (e.g. `CT-003`) or a route as an argument, use that as the target instead.

---

## Step 4 — Write a Pre-Refactor Plan

Before modifying any file, produce a concise internal plan (do not write it to disk — use it to guide execution):

- Finding ID and title
- Affected route, file(s), and function(s)
- Current inefficient behavior
- Root cause
- Proposed change — prefer the **smallest change** that removes the verified inefficiency
- Expected metric to improve
- Possible regression risks

Raise any ambiguity before writing code. If the root cause cannot be confirmed by reading the relevant source files, stop and report the uncertainty rather than proceeding on assumption.

---

## Step 5 — Apply the Targeted Refactor

Use `apply_diff`, `search_and_replace`, or `write_file` (for new files only) to apply the optimization.

Applicable changes include:
- Eliminating N+1 queries — batch or eager-load relationships
- Combining redundant database calls
- Caching repeated values within a request scope
- Replacing O(n²) logic with an efficient alternative
- Removing repeated computation, transformations, or serialization
- Consolidating duplicated logic into a single path
- Removing verified dead code, unused imports, or redundant wrappers
- Adding query limits to unbounded result sets
- Reducing unnecessary object or array copying
- Moving blocking work off hot request paths where safe

### Hard Constraints

Do **NOT**:
- Redesign the architecture or rewrite unrelated files
- Rename large portions of the codebase
- Perform stylistic cleanup unrelated to the finding
- Change public API contracts or expected output behavior
- Weaken validation or remove useful tests
- Update dependencies unless strictly required by the selected finding
- Introduce a new framework or library for a localized fix

**Preserve existing behavior.** If a change cannot be made safely within these constraints, report why and skip the optimization.

---

## Step 6 — Track Code Bloat Delta

If the finding involved duplicate logic, dead code, redundant wrappers, or repeated transformations, track:

- Relevant lines of code **before** the change
- Relevant lines of code **after** the change
- Estimated bloated lines removed

Do not delete code solely to improve a bloat percentage. Correctness takes precedence over line count.

---

## Step 7 — Verify with Tests

After applying the change, run the existing relevant tests using `execute_command`.

Record:
- Test command used
- Total tests run
- Tests passed
- Tests failed

**If tests fail:**
1. Determine whether the failure is caused by the refactor.
2. Attempt a minimal correction that stays within the selected optimization scope.
3. Re-run the tests.

**If the refactor cannot pass existing tests after correction — roll back the change.** Do not report a failed optimization as successful.

---

## Step 8 — Preserve the Baseline

Before re-running the benchmark, preserve the original baseline:

1. Copy `.codetuner/baseline_metrics.json` to a safe path (e.g. `.codetuner/baseline_metrics.backup.json`) using `execute_command`.
2. Run the benchmark (Step 9).
3. Save the new results as `.codetuner/tuned_metrics.json`.
4. Restore the original: copy the backup back to `.codetuner/baseline_metrics.json`.

The project must retain **both** files at the end:
- `.codetuner/baseline_metrics.json` — original unmodified baseline
- `.codetuner/tuned_metrics.json` — post-optimization measurements

---

## Step 9 — Re-Benchmark

Run the **same benchmark configuration** used for the baseline. Keep these conditions identical:

- Target route
- Benchmark duration
- Concurrency level
- Dataset and server configuration
- Environment

Do **not** adjust conditions to produce better numbers.

Collect at minimum:
- p50, p95, p99 latency
- Throughput (requests per second)
- Error count

Collect additionally if available: SQL queries per request, CPU usage, memory usage, response payload size, database calls per request.

---

## Step 10 — Calculate Before/After Delta

Compare `.codetuner/baseline_metrics.json` against `.codetuner/tuned_metrics.json`.

For latency (lower is better):
```
Improvement % = ((before − after) / before) × 100
```

For throughput (higher is better):
```
Improvement % = ((after − before) / before) × 100
```

Classify each metric as **improved**, **unchanged**, or **regressed**. Never describe a regression as an improvement.

---

## Step 11 — Regression Decision

The optimization is **successful** only when all of the following hold:
- Relevant tests pass
- Application behavior is preserved
- Errors do not increase unexpectedly
- The target metric improves, or a clearly demonstrated efficiency gain is visible elsewhere

**If performance materially regresses — roll back the code change.** Document the failed attempt honestly in the report. Do not keep a regression because the code looks cleaner.

---

## Step 12 — Recalculate Code Bloat (if applicable)

If the review report included an "Estimated Code Bloat — analyzed scope" figure, recalculate it for the affected scope after refactoring and report:

- Bloat estimate before the change
- Bloat estimate after the change
- Estimated bloated lines removed
- Percentage-point reduction

Do not claim repository-wide bloat reduction unless the entire repository was analyzed.

---

## Step 13 — Generate the Optimization Report

Write the intermediate optimization report to `.codetuner/refactor_report.md` using `write_file`. Create the `.codetuner/` directory first if it does not exist.

**Do NOT create or overwrite the root-level `CODETUNER_REPORT.md`.** That file is owned exclusively by the master `codetuner` skill, which reads `.codetuner/refactor_report.md` when assembling the final report.

Use this structure:

```markdown
# CodeTuner Optimization Report

## Executive Summary

## Optimization Target

- **Finding ID:**
- **Severity:**
- **Confidence:**
- **Risk:**
- **Route:**
- **File:**
- **Function:**

## Root Cause

Verified reason for the inefficiency, with reference to the specific code location.

## Refactoring Applied

- What changed
- Why it changed
- Files modified
- Functions modified

## Code Efficiency Changes

List applicable changes:
- Duplicate logic removed
- Redundant operations eliminated
- Dead code removed
- Unnecessary transformations removed
- Estimated bloated lines removed

## Test Verification

- **Test command:**
- **Tests passed:**
- **Tests failed:**
- **Result:** PASSED / FAILED / ROLLED BACK

## Benchmark Configuration

- **Duration:**
- **Concurrency:**
- **Route:**
- **Environment:**

## Before vs After

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| p50 latency | | | |
| p95 latency | | | |
| p99 latency | | | |
| Throughput (RPS) | | | |
| Errors | | | |

*(Add rows for SQL queries, CPU, memory, payload size if measured)*

## Code Bloat

- **Estimated bloat before:**
- **Estimated bloat after:**
- **Estimated bloated lines removed:**
- **Scope analyzed:**

## Result

**IMPROVED** / **UNCHANGED** / **REGRESSED AND ROLLED BACK**

## Remaining Findings

List the next highest-priority findings from `review_report.md` without implementing them.

## Recommended Next Optimization

Identify the next finding CodeTuner should process.
```

---

## Core Principle

> The Review skill determines **what** should be changed.
> The source code determines **how** it can safely be changed.
> The test suite verifies that behavior remains correct.
> The benchmark proves **whether** the optimization actually helped.

Never claim a speedup without measured before/after evidence.
Never invent benchmark values.
Never keep a refactor that breaks application behavior.
Never perform broad cleanup when a smaller targeted change can solve the verified problem.
