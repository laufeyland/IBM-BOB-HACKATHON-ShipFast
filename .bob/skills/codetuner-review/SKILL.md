---
name: codetuner-review
description: Use when the user wants to review application performance and code efficiency — analyzes benchmarked hot paths, detects bottlenecks, code bloat, and duplication, correlates findings with baseline metrics, and generates a structured optimization review report.
metadata:
  disable-model-invocation: false
  argument-hint: "[scope or route to focus on]"
---

# CodeTuner Review

> **Prerequisites:** This skill consumes output from the `codetuner-benchmark` skill.
> `CONTEXT.md` and `.codetuner/baseline_metrics.json` must exist before running this review.
> This skill is **read-only** — it never modifies application source code.

---

## Step 1 — Load Context and Benchmark Data

1. Read `CONTEXT.md` using `read_file`. This is the primary map of application architecture, routes, data flow, and previously identified bottlenecks.
2. Read `.codetuner/baseline_metrics.json` using `read_file`. Extract:
   - All benchmarked routes and their measured latency (p50, p95, p99)
   - Requests per second, error counts, SQL query counts, and any other available metrics
   - Any routes already flagged as slow or high-traffic
3. If either file is missing, stop and inform the user — the benchmark skill must be run first.

### Efficiency Rule

Do **not** perform a full deep rescan of the repository.

Use `CONTEXT.md` and benchmark metrics to identify which routes, files, functions, and database operations deserve closer inspection. Only read:
- Files directly involved in benchmarked or high-traffic routes
- Functions called along those execution paths
- Database/model code related to those paths
- Nearby dependencies required to verify a suspected issue

Reuse what is already documented in `CONTEXT.md`. Verify any critical claims against actual source code before including them in the report — never blindly trust the context file.

---

## Step 2 — Targeted Source-Code Review

Use `read_file`, `grep`, `FindSymbol`, and `GetSymbolsOverview` to inspect relevant source code without modifying any file.

Look for measurable performance and efficiency problems including:

**Database & I/O**
- N+1 queries, redundant database calls, repeated lookups
- Unbounded queries or result sets
- Unnecessary I/O or network calls
- Missing batching opportunities
- Repeated ORM relationship loading

**Computation & Logic**
- Repeated or unnecessary recalculation
- Inefficient loops, O(n²) or worse algorithms
- Unnecessary nested loops
- Repeated mapping, filtering, or reducing over the same data

**Serialization & Memory**
- Unnecessary serialization/deserialization
- Excessive object creation or copying
- Fetching data that is never used
- Unnecessary intermediate objects

**Request Path**
- Synchronous/blocking operations in hot request paths
- Unnecessary work performed on every request
- Repeated frontend/server work

---

## Step 3 — Code Bloat and Structural Waste Detection

While reviewing, also identify structural inefficiency and code bloat:

**Duplication**
- Duplicated or near-duplicated functions
- Repeated business logic across multiple files
- Repeated conditionals implementing the same behavior
- Duplicated validation logic, repeated parsing or transformations

**Dead Code**
- Unused functions, imports, middleware, or routes
- Dead or unreachable code
- Obsolete utilities or legacy compatibility paths no longer needed

**Structural Waste**
- Redundant wrapper functions
- Abstractions that add complexity without meaningful value
- Multiple database/API calls that could be combined
- Redundant data transformations or repeated serialization

**Inclusion bar:** Only flag a finding if there is evidence of at least one of:
- Duplicated work or execution
- Unnecessary complexity
- Runtime, memory, database, or network overhead
- Meaningful maintenance cost

Do **not** flag code merely because it is long, old, or stylistically imperfect.

---

## Step 4 — Benchmark Correlation

For every performance finding, correlate with benchmark data where possible. Determine:

- Which benchmarked route is affected
- Which function or code path causes the issue
- Which baseline metric likely reflects the problem (p50, p95, p99 latency, RPS, SQL query count, CPU, memory, payload size, DB calls per request)
- Which metric should improve if the issue is fixed

Do **not** claim a problem caused a measured slowdown without supporting evidence.

---

## Step 5 — Classify Each Finding

For every confirmed finding, record:

| Field | Values |
|---|---|
| **Finding ID** | CT-001, CT-002, … |
| **Category** | Performance Bottleneck / Code Bloat / Structural Waste |
| **Severity** | Critical / High / Medium / Low |
| **Confidence** | High / Medium / Low |
| **Refactoring Risk** | High / Medium / Low |
| **Affected route** | e.g. `GET /api/orders` |
| **Affected file** | relative path |
| **Affected function** | function or method name |
| **Root cause** | concise technical description |
| **Evidence** | specific code reference (file + line) |
| **Why it matters** | user-visible or system impact |
| **Benchmark correlation** | which metric, which route |
| **Expected measurable impact** | what should improve and by how much (estimate) |
| **Recommended optimization** | concrete, actionable suggestion |

---

## Step 6 — Rank Findings

Rank all confirmed findings by:

1. Expected measurable performance impact
2. Confidence that the issue is real
3. Execution frequency / importance of the affected route
4. Amount of duplicated or unnecessary work
5. Refactoring risk (lower risk = higher rank when impact is equal)

Prioritize findings that deliver strong measurable improvement with relatively low implementation risk.

---

## Step 7 — Estimate Code Bloat Percentage

Calculate an **Estimated Code Bloat Percentage** for the analyzed scope only.

```
Code Bloat % = (flagged bloated/redundant/dead lines ÷ total analyzed lines) × 100
```

Count lines as bloated only when there is reasonable evidence they belong to:
- Duplicated logic, dead code, or unused code
- Redundant transformations, wrappers, or repeated computations
- Unnecessary compatibility logic or structurally duplicated implementations

Do **not** count comments, formatting, or simply long functions as bloat.

Report:
- Total analyzed lines
- Estimated bloated lines
- Estimated bloat percentage
- Primary sources of bloat

Label this clearly as **"Estimated Code Bloat — analyzed scope only"** — do not imply it represents the entire repository.

---

## Step 8 — Generate the Review Report

Write the final report to `.codetuner/review_report.md` using `write_file` with this structure:

```markdown
# CodeTuner Review Report

## Executive Summary

## Benchmark Overview

## Analyzed Scope

## Performance Bottlenecks

### CT-001 — [Finding Title]

- **Severity:**
- **Confidence:**
- **Risk:**
- **Route:**
- **File:**
- **Function:**
- **Root Cause:**
- **Evidence:**
- **Benchmark Correlation:**
- **Metric to Improve:**
- **Recommended Optimization:**

## Code Efficiency Findings

## Code Bloat & Duplication Findings

## Estimated Code Bloat

- **Analyzed Lines:**
- **Estimated Bloated Lines:**
- **Estimated Code Bloat Percentage:**
- **Main Sources of Bloat:**

## Ranked Optimization Candidates

| Rank | Finding ID | Title | Expected Impact | Confidence | Risk | Metric |
|------|------------|-------|-----------------|------------|------|--------|

## Recommended First Optimization Target

State clearly:
- Which finding to optimize first and why
- Which files and functions are involved
- Which benchmark route should be re-run after the fix
- Which metrics to compare before and after
```

---

## Safety Rules

This skill is **review-only**.

Do **NOT**:
- Modify, refactor, or delete any application source code
- Update dependencies or database schemas
- Modify tests or benchmark results
- Invent or extrapolate performance measurements

Use the `codetuner-refactor` skill to apply optimizations after this review is complete.

---

## Core Principle

> The benchmark tells CodeTuner **where** performance problems may exist.
> The source-code review determines **why** they exist.

Every finding must be grounded in evidence from the source code. The report must give `codetuner-refactor` enough verified information to perform a targeted optimization without rescanning the entire repository.
