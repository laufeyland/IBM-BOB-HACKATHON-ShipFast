---
name: codetuner
description: Use when the user wants to run the full CodeTuner end-to-end workflow — analyzes, improves, modernizes, validates, and measures an existing software project by orchestrating the specialized codetuner-benchmark, codetuner-review, codetuner-modernize, and codetuner-refactor skills.
---

# CodeTuner — Master Orchestration Skill

This skill coordinates the full CodeTuner developer workflow. It does **not** reimplement logic that belongs to the specialized skills. Instead, it invokes them in sequence, enforces the approval gate, and owns the final report.

**Prerequisite skills (must exist):**
- `codetuner-benchmark` — project discovery, `CONTEXT.md`, baseline metrics
- `codetuner-review` — performance and code-quality analysis
- `codetuner-modernize` — stack modernization analysis and execution
- `codetuner-refactor` — targeted performance optimization

---

## Phase 1 — Baseline (Discovery + Context + Benchmark)

Invoke the `codetuner-benchmark` skill using `use_skill`.

This skill is fully responsible for:
- Inspecting the project codebase
- Identifying API routes, database layer, middleware, entry point, and seed mechanism
- Writing `CONTEXT.md` to the project root
- Generating the benchmark script
- Prompting the user to run it
- Saving results to `.codetuner/baseline_metrics.json`

**Do not proceed to Phase 2 until:**
- `CONTEXT.md` exists in the project root
- `.codetuner/baseline_metrics.json` exists and contains at least one route with valid (non-zero, non-100%-error) measurements

If `CONTEXT.md` or `.codetuner/baseline_metrics.json` are already present from a previous run, confirm with the user whether to re-run the benchmark or proceed with the existing baseline. Never silently overwrite the original baseline.

---

## Phase 2 — Modernization Analysis

After the baseline is established, launch one focused analysis subagent using `spawn_subagent`. Use `name: "explore"` (read-only, no code modifications). Pass `fork_context: false` — the subagent receives its full mandate in the description.

Do not proceed to Phase 3 until the subagent has returned its summary.

---

### Subagent — Modernization Analyst

```
name: "explore"
description: |
  You are the CodeTuner Modernization Analyst. Your task is read-only analysis only.
  Do NOT execute any upgrades or modify any file.

  Read the following files for project context:
  - CONTEXT.md (project root)

  Then inspect dependency manifests and configuration files (package.json,
  package-lock.json, .nvmrc, pyproject.toml, requirements.txt, Dockerfile, etc.)
  to identify modernization opportunities.

  Apply the same analysis criteria used by codetuner-modernize Steps 1–5. Inspect:
  - Runtime version (Node.js, Python, Java, etc.)
  - Framework versions (Express, NestJS, Django, Spring Boot, etc.)
  - Major library versions
  - Database/ORM versions
  - Build and test tooling versions
  - Deprecated packages or APIs in use
  - Legacy patterns that have supported modern replacements

  For each technology, use execute_command to query authoritative current version
  information at runtime (npm view, PyPI API, nodejs.org/dist index) — do not rely
  solely on internal model knowledge, which may be stale.

  Determine and record for each:
  - Current version (from project files)
  - Latest stable version (verified at execution time)
  - Latest LTS version where applicable
  - Recommended migration target (NOT automatically the latest — prioritise LTS,
    stability, ecosystem compatibility, and low breaking-change surface)
  - Whether the current version is EOL or has known security issues
  - Known breaking changes between current and proposed target
  - Compatibility with the rest of the stack

  For every recommended change, produce a structured entry:
  - ID: MODERN-001, MODERN-002, …
  - Technology/dependency: name
  - Current version/state
  - Recommended version/state
  - Reason: why the upgrade is or is not recommended
  - Compatibility considerations: known breaking changes, migration effort
  - Expected benefit: security, LTS coverage, performance, DX
  - Confidence: High / Medium / Low
  - Risk: LOW / MEDIUM / HIGH

  If version information cannot be independently verified, state:
  "Latest version could not be independently verified."
  Never invent a version number. Do not execute any upgrades. Do not modify any file.

  Return your findings as a structured Markdown list using the fields above.
```

---

### Aggregation after modernization analysis

After the subagent returns:

1. **Collect** the subagent's structured findings.
2. **Write `.codetuner/modernization_analysis.md`** using `write_file` with the following structure:

```markdown
# CodeTuner Modernization Analysis

Generated: <ISO-8601 timestamp>

## Modernization Findings
<MODERN-XXX entries>
```

Do not proceed to Phase 3 until `.codetuner/modernization_analysis.md` exists.

---

## Phase 3 — Modernization Recommendation Plan and Approval Gate

**Do NOT modify any application code in this phase.**

Synthesise the findings from `.codetuner/modernization_analysis.md` into a recommendation plan presented to the developer.

Produce a Markdown table:

```
| ID | Category | Finding | Current State | Recommendation | Evidence | Expected Benefit | Risk | Confidence |
|----|----------|---------|---------------|----------------|----------|------------------|------|------------|
```

**ID scheme:** `MODERN-001` — use the stable IDs assigned by the subagent. These IDs are referenced by the approval and implementation phases.

**Categories:** `Modernization`

**Risk values:** `LOW` | `MEDIUM` | `HIGH`

Guidelines:
- Show version transitions clearly (e.g. `Node.js 18 → Node.js 22`).
- Do not invent findings not grounded in the subagent output.

**STOP. Do not modify any application code until explicit approval is received.**

Ask the developer:

> "CodeTuner has completed its modernization analysis.
>
> Please review the modernization recommendations above.
>
> You can:
> 1. Approve all modernization recommendations
> 2. Approve specific recommendations by ID (e.g. MODERN-001)
> 3. Reject specific recommendations by ID
> 4. Request more explanation on any finding
> 5. Skip modernization entirely and proceed to code analysis
> 6. Cancel CodeTuner
>
> Which recommendations would you like CodeTuner to apply?"

Use `ask_followup_question` for this prompt.

Record the exact approved set. Build and display an approved-plan table:

```
| ID | Finding | Decision |
|----|---------|----------|
| MODERN-001 | Node.js 18 → Node.js 22 | ✅ Approved |
| MODERN-002 | Express 4 → Express 5 | ❌ Rejected |
```

Only approved `MODERN-XXX` items proceed to Phase 4. If all items are rejected or skipped, proceed directly to Phase 5.

---

## Phase 4 — Modernization Execution

Apply **only** the approved `MODERN-XXX` recommendations:

- Invoke `codetuner-modernize` using `use_skill` at its Step 7 (process selective approval), passing only the approved `MODERN-XXX` items. The modernize skill handles its own incremental execution loop and per-upgrade validation.

Do not implement unapproved recommendations. Do not combine unrelated changes into a single edit. Prefer small, reviewable, reversible modifications.

After all approved modernization upgrades are applied and validated by the `codetuner-modernize` skill, **re-run the benchmark** to capture a post-modernization baseline before continuing:

- Invoke `codetuner-benchmark` using `use_skill`.
- Save results to `.codetuner/post_modernization_metrics.json` — **never overwrite** `.codetuner/baseline_metrics.json`.

Do not proceed to Phase 5 until the post-modernization benchmark is saved (or until the developer confirms they want to skip re-benchmarking).

---

## Phase 5 — Code Analysis (on Modernized Codebase)

Now that modernization is complete, launch two focused analysis subagents **in parallel** using `spawn_subagent`. Issue both `spawn_subagent` calls in the **same turn** so they run concurrently. Both use `name: "explore"` (read-only, no code modifications). Pass `fork_context: false` — each subagent receives its full mandate in the description.

These subagents analyse the **already-modernized** codebase, so their findings and recommendations are grounded in the current state of the code rather than the legacy state.

Do not proceed to Phase 6 until both subagents have returned their summaries.

---

### Subagent 1 — Performance Analyst

```
name: "explore"
description: |
  You are the CodeTuner Performance Analyst. Your task is read-only analysis only.
  Do NOT modify any file.

  Read the following files for project context:
  - CONTEXT.md (project root)
  - .codetuner/baseline_metrics.json
  - .codetuner/post_modernization_metrics.json (if it exists — use as the current performance baseline)

  Then inspect the source files and code paths identified in CONTEXT.md as benchmark
  targets or bottlenecks.

  Identify performance issues such as:
  - Inefficient or slow code paths
  - Repeated expensive operations or unnecessary computation
  - N+1 query patterns and redundant database calls
  - Unbounded queries or result sets
  - Unnecessary API/network calls
  - Blocking operations on hot request paths
  - Avoidable sequential operations that could be batched
  - Excessive serialization or object creation
  - Obvious memory or CPU inefficiencies
  - Any bottleneck that correlates with the measured benchmark latency or throughput

  For every confirmed finding, produce a structured entry:
  - ID: PERF-001, PERF-002, …
  - Finding: concise title
  - Affected file/component: relative path and function name
  - Evidence: specific code location (file + line or function)
  - Expected impact: what metric should improve and by how much (estimate)
  - Suggested improvement: concrete actionable change
  - Confidence: High / Medium / Low
  - Risk: LOW / MEDIUM / HIGH

  Do not claim a performance problem exists unless supported by evidence in the source code
  or benchmark data. Do not modify any file.

  Return your findings as a structured Markdown list using the fields above.
```

---

### Subagent 2 — Code Quality Analyst

```
name: "explore"
description: |
  You are the CodeTuner Code Quality Analyst. Your task is read-only analysis only.
  Do NOT modify any file.

  Read the following files for project context:
  - CONTEXT.md (project root)
  - .codetuner/baseline_metrics.json

  Then inspect the source files identified in CONTEXT.md for maintainability and
  refactoring opportunities.

  Apply the same analysis criteria used by the codetuner-review skill. Look for:
  - Duplicated or near-duplicated logic across files
  - Dead or unreachable code, unused imports, unused functions
  - Excessive function or class complexity
  - Oversized functions or classes that could be decomposed
  - Poor abstractions or unnecessary coupling
  - Repeated validation or transformation logic
  - Redundant wrapper functions or unnecessary indirection
  - Structural waste: multiple DB/API calls that could be combined
  - Safe refactoring opportunities with clear expected benefit

  For every confirmed finding, produce a structured entry:
  - ID: QUALITY-001, QUALITY-002, …
  - Finding: concise title
  - Affected file/component: relative path and function name
  - Evidence: specific code location (file + line or function)
  - Recommended refactor: concrete actionable change
  - Expected benefit: maintainability, performance, or complexity reduction
  - Confidence: High / Medium / Low
  - Risk: LOW / MEDIUM / HIGH

  Only flag findings with clear evidence. Do not flag code merely for being long or
  stylistically imperfect. Do not modify any file.

  Return your findings as a structured Markdown list using the fields above.
```

---

### Aggregation after code analysis

After both subagents return:

1. **Collect** each subagent's structured findings.
2. **Deduplicate** — if two agents identify the same underlying issue, merge into one entry, noting both perspectives.
3. **Resolve conflicts** — if two agents make conflicting recommendations (e.g. Performance Analyst suggests inlining logic that Code Quality Analyst recommends extracting), do NOT silently choose one. Instead:
   - Identify the conflict explicitly.
   - Present both recommendations and their reasoning.
   - Flag the item as **⚠ CONFLICT — requires developer decision** in the combined plan.
4. **Write `.codetuner/analysis_report.md`** using `write_file` with the following structure:

```markdown
# CodeTuner Analysis Report

Generated: <ISO-8601 timestamp>

## Performance Findings
<PERF-XXX entries>

## Code Quality Findings
<QUALITY-XXX entries>

## Conflicts and Overlaps
<any deduplicated or conflicting items with explanation>
```

Do not proceed to Phase 6 until `.codetuner/analysis_report.md` exists.

---

## Phase 6 — Combined Refactor Recommendation Plan and Approval Gate

**Do NOT modify any application code in this phase.**

Synthesise the findings from `.codetuner/analysis_report.md` into a recommendation plan presented to the developer.

Produce a Markdown table:

```
| ID | Category | Finding | Current State | Recommendation | Evidence | Expected Benefit | Risk | Confidence |
|----|----------|---------|---------------|----------------|----------|------------------|------|------------|
```

**ID scheme:** `PERF-001`, `QUALITY-001` — use the stable IDs assigned by the subagents. These IDs are referenced by the approval and implementation phases.

**Categories:** `Performance` | `Code Quality`

**Risk values:** `LOW` | `MEDIUM` | `HIGH`

Guidelines:
- For each finding, state the affected file or component where applicable.
- Flag any conflict items with ⚠ and include a brief explanation of both sides.
- Do not invent findings not grounded in the subagent outputs.

**STOP. Do not modify any application code until explicit approval is received.**

Ask the developer:

> "CodeTuner has completed its code analysis on the modernized codebase.
>
> Please review the recommendations above.
>
> You can:
> 1. Approve all recommendations
> 2. Approve specific recommendations by ID (e.g. PERF-001, QUALITY-003)
> 3. Reject specific recommendations by ID
> 4. Request more explanation on any finding
> 5. Cancel CodeTuner
>
> Which recommendations would you like CodeTuner to apply?"

Use `ask_followup_question` for this prompt.

Record the exact approved set. Build and display an approved-plan table using the stable IDs:

```
| ID | Finding | Decision |
|----|---------|----------|
| PERF-001 | N+1 query on GET /api/articles | ✅ Approved |
| QUALITY-003 | Dead utility functions in utils.js | ✅ Approved |
```

Only approved items proceed to Phase 7. Do not touch rejected or skipped items at any point.

---

## Phase 7 — Refactor Implementation

Apply **only** the approved `PERF-XXX` and `QUALITY-XXX` recommendations:

- Invoke `codetuner-refactor` using `use_skill`. Pass the relevant finding ID and affected file/function from `.codetuner/analysis_report.md`. Run it once per approved finding. Each run writes its results to `.codetuner/refactor_report.md`.

Do not implement unapproved recommendations. Do not combine unrelated changes into a single edit. Prefer small, reviewable, reversible modifications.

---

## Phase 8 — Regression Gate

This phase runs immediately after all approved changes from Phase 7 are applied. It is mandatory. No gate may be skipped.

A change is **not** successful simply because code was modified or one metric improved. Every approved modification must pass all applicable gates before it can be classified as successful. **A change that improves performance but breaks existing functionality is a REGRESSION, not a success.**

Run the four gates in order. Do not proceed past a failed gate without recording the failure and executing the regression handling protocol.

---

### Gate 1 — Build

Run the project's build, type-check, or compile validation using `execute_command`.

If the project built successfully before CodeTuner and **fails** after the change: **REGRESSION DETECTED.**

Do not classify the modification as successful.

Record:
- Command executed
- PASS or FAIL
- Relevant error output (exact error message or stack, not a paraphrase)
- Which approved modification is most likely associated with the failure

---

### Gate 2 — Existing Tests

Run the full test suite using `execute_command`.

Compare results against the baseline test counts recorded in `.codetuner/baseline_metrics.json` or `CONTEXT.md`.

If tests that passed before the modification now fail: **REGRESSION DETECTED.**

Never hide failing tests. New tests added by CodeTuner may be reported, but must not be used to mask failures in the original test suite.

Record:
- Total tests before (from baseline)
- Total tests after (from this run)
- Newly failing test names
- Likely associated modification

---

### Gate 3 — Functional Validation

Where the project provides reproducible functional checks (smoke tests, health endpoints, integration tests), validate that affected routes and features still behave correctly using `execute_command`.

Do not invent functional validation steps that cannot be performed reliably. If functional validation cannot be performed, record: **NOT VERIFIED** — do not assume success.

Record:
- What was checked and how
- PASS / FAIL / NOT VERIFIED for each check

---

### Gate 4 — Post-Change Benchmark

**Preserve the original baseline before re-benchmarking.**

1. Verify `.codetuner/baseline_metrics.json` is intact. If not, **stop** and report the issue — do not fabricate a pre-change baseline.
2. Invoke `codetuner-benchmark` using `use_skill` to re-run the benchmark under conditions as close as possible to the original (same routes, same duration, same concurrency, same environment).
3. Save the new results to `.codetuner/post_change_metrics.json` — **never overwrite** `.codetuner/baseline_metrics.json`.
4. Run the linter if present. Record any new errors or warnings introduced by the changes.

If a metric cannot be compared fairly (e.g. environment changed, route was removed), mark it explicitly as **non-comparable** rather than omitting or fabricating a value.

---

### Change Classification

After all four gates have run, classify each approved recommendation individually using exactly one of the following labels:

**`ACCEPTED`**
A change may be classified as ACCEPTED when:
- Required build validation passes,
- Existing tests do not regress,
- Relevant functional validation passes where available, and
- The intended measurable or verifiable objective is achieved.

**`REGRESSION`**
Use REGRESSION when the modification causes previously working builds, tests, or functional checks to fail.

**`NO_MEASURABLE_IMPROVEMENT`**
Use this when:
- Functionality remains intact, but
- The intended measurable improvement did not occur, or
- The relevant metric became worse without an explicitly approved tradeoff.

**`NOT_VERIFIED`**
Use this when CodeTuner cannot obtain enough reliable evidence to determine whether the change achieved its objective. Never convert NOT_VERIFIED into ACCEPTED.

**Performance rule — a faster application is NOT automatically a successful optimization.**

Example A — REGRESSION (not success):

- Before: API response 500 ms, Tests 42/42 passing
- After: API response 250 ms, Tests 37/42 passing
- Result: **REGRESSION**

Example B — ACCEPTED:

- Before: API response 500 ms, Tests 42/42 passing
- After: API response 310 ms, Tests 42/42 passing, functional checks pass
- Result: **ACCEPTED**

---

### Regression Handling and Rollback Protocol

When a regression is detected on any gate:

1. Identify which approved change most likely caused it and explain the evidence.
2. Attempt one targeted correction that remains strictly within the scope of the developer-approved recommendation. Do not make unapproved changes while attempting to fix a regression.
3. Re-run only the relevant gates after the correction.
4. If the regression is unresolved after the correction attempt:
   - If an isolated, safe rollback of that specific change is possible (e.g. reverting only the affected files using `git restore` or a file restore), perform or propose it to the developer.
   - Do **not** automatically revert unrelated successful changes.
   - If a safe isolated rollback cannot be confirmed, **STOP** and ask the developer before taking any destructive or recovery action.
5. Document the outcome as either `ROLLED BACK` or `REGRESSION — UNRESOLVED` in the regression report and final report.

---

### Regression Report

Write `.codetuner/regression_report.md` using `write_file` with the following structure:

```markdown
# CodeTuner Regression Report

Generated: <ISO-8601 timestamp>

## Gate Results by Recommendation

| Recommendation ID | Build | Tests | Functional Check | Benchmark | Result | Notes |
|-------------------|-------|-------|------------------|-----------|--------|-------|

## Regression Details
<For each REGRESSION or ROLLED BACK entry: exact error, affected modification, correction attempted, outcome>

## Rollback Log
<List of any changes rolled back, the reason, and whether rollback was automatic or manual>
```

Do not proceed to Phase 9 until `.codetuner/regression_report.md` exists.

---

## Phase 9 — Before vs After Comparison

Compare `.codetuner/baseline_metrics.json` against `.codetuner/post_change_metrics.json`.

Produce a comparison table including only metrics that were actually measured in both runs:

```
| Metric                  | Before    | After     | Change     |
|-------------------------|-----------|-----------|------------|
| API p50 latency (ms)    | measured  | measured  | ±%         |
| API p95 latency (ms)    | measured  | measured  | ±%         |
| API p99 latency (ms)    | measured  | measured  | ±%         |
| Throughput (RPS)        | measured  | measured  | ±%         |
| Tests passing           | X/Y       | X/Y       | result     |
| Build                   | PASS/FAIL | PASS/FAIL | result     |
| Outdated dependencies   | X         | Y         | difference |
```

Classify each row:
- **Improved** — measurably better
- **No meaningful change** — within noise margin
- **Regressed** — measurably worse
- **Not measured** — metric unavailable in one or both runs

Never describe a regression as an improvement. Never invent a measurement.

---

## Phase 10 — Final Report

Write `CODETUNER_REPORT.md` to the project root using `write_file`. This file is owned by the master `codetuner` skill and represents the complete record of this run.

Structure:

```markdown
# CodeTuner Report

Generated: <ISO-8601 timestamp>

## 1. Project Summary
<brief description of the project, stack, and scope of this CodeTuner run>

## 2. Initial Baseline
<summary of benchmark results from .codetuner/baseline_metrics.json>

## 3. Modernization Findings
<findings from .codetuner/modernization_analysis.md>

## 4. Modernization Decisions
<exact record of approvals and rejections from Phase 3>

## 5. Modernization Changes Applied
<what was changed, which files, which skill applied it — sourced from MODERNIZATION_PLAN.md; cross-reference approved MODERN-XXX IDs>

## 6. Post-Modernization Baseline
<summary of benchmark results from .codetuner/post_modernization_metrics.json, or "Not measured" if skipped>

## 7. Code Analysis Findings (on Modernized Codebase)
<combined list of findings from .codetuner/analysis_report.md — sourced from the two parallel analysis subagents>

## 8. Refactor Recommendations Presented
<the full recommendation table from Phase 6>

## 9. Refactor Developer Decisions
<exact record of approvals and rejections from Phase 6>

## 10. Refactor Changes Applied
<what was changed, which files, which skill applied it — sourced from .codetuner/refactor_report.md; cross-reference approved finding IDs>

## 11. Change Classification
<sourced from .codetuner/regression_report.md>

Summary table:

| Recommendation ID | Result | Notes |
|-------------------|--------|-------|

Accepted changes: <count>
Regressions: <count — if > 0, do NOT claim overall success>
No measurable improvement: <count>
Not verified: <count>

## 12. Regression Details
<For every REGRESSION entry: the exact error, which approved change caused it, correction attempted, outcome (ROLLED BACK / UNRESOLVED)>
<If no regressions: "None.">

## 13. Before vs After Benchmark
<the comparison table from Phase 9>

## 14. Final Measurable Impact
<evidence-based summary only — what actually improved, did not change, or regressed>

If any regressions remain unresolved, this section must begin with:

> ⚠ CodeTuner completed with unresolved regressions. See Section 12 for details.

Do NOT write "CodeTuner successfully optimized the application" if unresolved regressions remain.

## 15. Files Changed
<list of modified files, with rollback status where applicable>

## 16. Suggested Next Steps
<next highest-priority findings not yet addressed; recommended follow-up CodeTuner run>
```

The report must be evidence-based. Do not claim that CodeTuner improved performance, maintainability, compatibility, or reliability unless the workflow produced evidence supporting that claim. Do not claim overall success while regressions remain unresolved.

---

## Safety Rules

- Never modify application code before developer approval (Phase 3 and Phase 6).
- Never overwrite `.codetuner/baseline_metrics.json` — post-change results go to `.codetuner/post_change_metrics.json`; post-modernization results go to `.codetuner/post_modernization_metrics.json`.
- Never allow any analysis subagent to modify application code — all subagents use `name: "explore"` and are read-only.
- `.codetuner/modernization_analysis.md` and `.codetuner/analysis_report.md` are intermediate artifacts; they are consumed by the master skill and included in the final report.
- Never fabricate benchmark numbers or test results.
- Never hide regressions or rolled-back changes.
- Never hide failing tests — not even behind new tests added by CodeTuner.
- Never upgrade dependencies without explicit approval.
- Never remove working functionality to improve a metric.
- Never make changes outside the approved set.
- Never make unapproved changes while attempting to fix a regression.
- Never convert NOT_VERIFIED into ACCEPTED.
- Never claim success while regressions remain unresolved.
- Never revert unrelated successful changes when rolling back a regression.
- If a safe isolated rollback cannot be confirmed, stop and ask the developer before any destructive action.
- Preserve existing tests whenever possible.
- Prefer reversible, incremental modifications.
- If uncertain about a step, surface the uncertainty rather than proceeding on assumption.
