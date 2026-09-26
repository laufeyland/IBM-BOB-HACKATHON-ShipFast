---
name: codetuner-benchmark
description: Use when the user wants to analyze codebase architecture, generate an automated benchmark script, and export initial baseline performance metrics into .codetuner/baseline_metrics.json.
---

# CodeTuner-Benchmark Execution Playbook

When this skill is activated, execute the following 3-step workflow in order.

**Core contract:** the generated benchmark script must be completely zero-interaction. The user runs exactly one command and gets results. The script is responsible for server lifecycle, seed data, benchmarking, cleanup, and output — no arguments, no env vars, no manual steps required.

---

## Step 1 — Codebase Inspection

Goal: understand the project well enough to generate a correct, self-contained script.

1. Use `list_files` (recursive) on the project root to enumerate source directories.
2. Use `GetSymbolsOverview` on relevant source files to identify:
   - API route handlers and their HTTP methods + paths
   - Database access layer (ORM, driver, models)
   - Middleware (auth, rate-limiting, logging, error handlers)
   - App entry point and how the server is started (e.g. `app.listen`, `uvicorn.run`)
3. Use `grep` to find all route mount points and the default port the app binds to.
4. **Seed data investigation** — check for:
   - A `seeders/` directory (Sequelize CLI, Django fixtures, Laravel seeders, etc.)
   - Any `seed`, `fixtures`, `demo-data`, or `generate-*` scripts under `bin/`, `scripts/`, or similar
   - Existing test helpers that create model instances (e.g. `test_lib`, `factories`, `blueprints`)
   - Read any found scripts/modules to understand: what records they create, what identifiers (slugs, usernames, IDs) are produced, and whether they wipe-then-repopulate or append
   - Note the findings — they determine how Phase 1 of the script works
5. Write `CONTEXT.md` in the project root using `write_file`:

```
# Project Architecture Context

## Tech Stack
<framework, language, runtime version>

## API Routes
| Method | Path | Handler File | Description |
|--------|------|-------------|-------------|
...

## Database Access Layer
<ORM/driver, connection config location, list of main models/tables>

## Middleware Chain
<ordered list with brief role description>

## Server Entry Point
<file and command used to start the server, default port>

## Seed / Fixture Mechanism
<path(s) to seed scripts or fixture files; what data they create; known identifiers produced>
<"none found" if absent>

## Identified Bottlenecks
<N+1 queries, missing indexes, synchronous blocking calls, no pagination, etc.>

## Benchmark Target Routes
<ranked list of 3–5 routes most worth benchmarking, with rationale>
```

---

## Step 2 — Benchmark Script Generation

Choose the script language based on the project's primary language:
- **Node.js** → `benchmark.js`, stdlib only (`node:http`, `node:https`, `node:child_process`, `node:fs`, `node:path`)
- **Python** → `benchmark.py`, stdlib + `aiohttp` only (no new installs if `aiohttp` is already present; note it if not)
- Other stacks → idiomatic choice, note any required dependency explicitly

Write the script to `benchmark.js` / `benchmark.py` in the project root using `write_file`.

### The script must execute these phases in order:

#### Phase 0 — Configuration constants
Declare at the top of the file (easy to edit if needed):
- `PORT` — the detected default port
- `DURATION_MS` — `5000`
- `CONCURRENCY` — `10`
- `OUTPUT_FILE` — `.codetuner/baseline_metrics.json`

#### Phase 1 — Seed data check & setup
This phase ensures parameterised routes (e.g. `/api/articles/:slug`) have real values to use.

1. Connect to the database using the **project's own models/ORM module** — never open the DB file directly or import a raw driver.
2. Query a count of a core model (e.g. articles, posts, users) to detect whether usable data exists.
3. **If data exists:** read one representative record per parameterised route from the live DB (e.g. one article slug, one username). Store as variables. Set `seededByBenchmark = false`.
4. **If data is absent:**
   - If a seed script or helper module was found in Step 1: call it programmatically (import + invoke, do not shell out). Use minimal parameters (small dataset — e.g. 2 users, 3 articles). Set `seededByBenchmark = true`.
   - If no seed mechanism exists: write the minimal records needed inline — exactly what the benchmark routes require and nothing more. Set `seededByBenchmark = true`.
   - After seeding, read back the created identifiers from the DB so route paths are always derived from real DB state, never hard-coded strings.
5. Close or release the DB connection before starting the server (avoid locked-file errors on SQLite and similar).

#### Phase 2 — Server startup
1. Spawn the app server as a child process using the detected start command (e.g. `child_process.spawn('node', ['app.js'])` / `subprocess.Popen(['python', 'app.py'])`). Capture stdout+stderr to an internal buffer.
2. Poll a fast endpoint (e.g. the first route in the target list, or `/`) every 250 ms. Timeout after 15 s. If the server never responds, print the captured log buffer and exit with code 1.
3. Keep a reference to the child process for cleanup.

#### Phase 3 — Benchmark
For each route in the benchmark target list (from CONTEXT.md):
- Run `CONCURRENCY` async workers in parallel, each firing requests in a tight loop for `DURATION_MS` milliseconds.
- Collect raw latency samples (ms) and error count.
- Compute **p50, p95, p99** (ms), **throughput** (req/s), **total_requests**, **error_count**.
- Print a one-line progress update to stdout as each route completes.

After all routes finish, print a formatted summary table to stdout.

#### Phase 4 — Cleanup & output
Execute unconditionally, even if Phase 3 had errors:
1. Send SIGTERM to the server child process; if still alive after 2 s, send SIGKILL.
2. If `seededByBenchmark === true`: delete exactly the records created in Phase 1 by their stored IDs — do not issue a bulk `DELETE *`. Log "Benchmark seed data removed."
3. Create `.codetuner/` directory if absent, then write `baseline_metrics.json`:

```json
{
  "generated_at": "<ISO-8601 timestamp>",
  "base_url": "http://localhost:<PORT>",
  "duration_seconds": 5,
  "concurrency": 10,
  "routes": [
    {
      "method": "GET",
      "path": "/api/example",
      "p50_ms": 0,
      "p95_ms": 0,
      "p99_ms": 0,
      "throughput_rps": 0,
      "total_requests": 0,
      "error_count": 0
    }
  ]
}
```

4. Print the output file path and exit with code `0`.

#### Phase 5 — Top-level error handler
Wrap the entire script body. On any unrecoverable error:
1. Kill the server child process if it was started.
2. Remove seed records if `seededByBenchmark === true`.
3. Print the error and exit with code `1`.
Never leave the DB seeded or the server running after a crash.

### Script header comment
```
/**
 * <Project Name> — Baseline Benchmark
 * Run:    node benchmark.js   (or: python benchmark.py)
 * Output: .codetuner/baseline_metrics.json
 * No arguments or environment variables required.
 */
```

---

## Step 3 — Verification & User Prompt

1. Use `read_file` to review the generated script and confirm:
   - Port constant matches the detected default.
   - DB connection goes through the project's own ORM module.
   - Seed detection uses a count query before creating anything.
   - Route path variables are read from the DB, not hard-coded strings.
   - Server is spawned as a child process with a readiness poll.
   - Phase 4 runs unconditionally (i.e. inside a `finally` block or equivalent).
   - Seed cleanup is gated on `seededByBenchmark === true`.
   - Top-level error handler is present.
2. Fix any issues with `apply_diff` before proceeding.
3. Reply to the user with **only** the following — no follow-up questions, no extra options:

---

**Benchmark ready.** Run this single command from the project root:

```
node benchmark.js
```
*(or `python benchmark.py` for Python projects)*

The script will automatically:
- Check for existing data; seed the DB minimally if empty (and clean up afterwards)
- Start and stop the server
- Benchmark `<N>` routes for 5 s each at 10 concurrent workers
- Write results to `.codetuner/baseline_metrics.json`

---

## Guardrails

- **Never run the benchmark.** Generate the script and stop. The user triggers execution.
- **Do not modify any existing source file.** Only create/overwrite `CONTEXT.md`, the benchmark script, and `.codetuner/baseline_metrics.json`.
- **No new dependencies** unless truly unavoidable; always note them explicitly if added.
- **No interactive I/O inside the script** — no prompts, no `readline`, no `input()`.
- **No hard-coded record identifiers.** All slug/username/ID values used in route paths must come from a DB read at runtime.
- **Seed cleanup is not optional.** If the script created records, it must remove exactly those records before exiting — even on error.
