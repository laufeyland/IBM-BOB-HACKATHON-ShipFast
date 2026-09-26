---
name: codetuner-benchmark
description: Use when the user wants to analyze codebase architecture, generate an automated benchmark script, and export initial baseline performance metrics into .codetuner/baseline_metrics.json.
---

# CodeTuner-Benchmark Execution Playbook

When this skill is activated, execute the following 3-step workflow in order. Do not skip a step; each one feeds the next.

---

## Step 1 — Codebase Inspection

Goal: build a full architectural map of the project before generating any benchmark.

1. Use `list_files` (recursive) on the workspace root to enumerate all source directories.
2. Use `GetSymbolsOverview` on every relevant source file to identify:
   - **API route handlers** (Express routers, Next.js API pages, Flask/FastAPI routes, etc.)
   - **Database access layers** (ORM models, raw query helpers, repository classes)
   - **Middleware** (auth, rate-limiting, request logging, error handlers)
   - **External service calls** (HTTP clients, queue producers/consumers)
3. For any symbol whose purpose is unclear from its name alone, use `read_file` on the relevant lines to confirm its role.
4. Use `grep` to locate:
   - All route mount points (`app.use`, `router.get/post/put/delete`, `@app.route`, etc.)
   - All database connection initializations
   - Any explicit caching layers (Redis, in-memory stores)
5. Write a file named `CONTEXT.md` in the project root using `write_file`. Structure it as follows:

```
# Project Architecture Context

## Tech Stack
<detected framework, language, runtime version if discoverable>

## API Routes
| Method | Path | Handler File | Description |
|--------|------|-------------|-------------|
...

## Database Access Layer
<ORM/driver in use, connection pool config if found, list of models/tables>

## Middleware Chain
<ordered list of middleware with brief role description>

## External Dependencies
<any outbound HTTP calls, queues, caches>

## Identified Bottlenecks
<routes with N+1 patterns, missing indexes, synchronous blocking calls, no pagination, etc.>

## Benchmark Target Routes
<a ranked list of 3–5 routes most worth benchmarking, with rationale>
```

---

## Step 2 — Benchmark Script Generation

Goal: produce a runnable, self-contained benchmark script tailored to the detected stack.

### Language selection
- If the project is **Node.js / Express / Next.js**: generate `benchmark.js` using the built-in `node:http` / `undici` / `autocannon` pattern (prefer `autocannon` if it is already in `package.json`; otherwise use `node:http` with `Promise.all` to avoid adding a dependency).
- If the project is **Python / Flask / FastAPI / Django**: generate `benchmark.py` using only `asyncio` + `aiohttp` from the standard ecosystem (no extra install needed beyond `aiohttp`).
- For any other stack, choose the idiomatic HTTP load-testing approach and note the dependency.

### Script requirements
The script must:
1. Accept a `BASE_URL` from an environment variable (default `http://localhost:3000` or the detected dev port).
2. Target **each route listed in "Benchmark Target Routes"** from `CONTEXT.md`.
3. Run **concurrent requests for 5 seconds** per route (concurrency level: 10 workers).
4. Collect per-route raw latency samples and error counts during the run.
5. Compute **p50, p95, p99 latency** (milliseconds), **throughput** (req/sec), and **total error count** for each route.
6. Write all results to **`.codetuner/baseline_metrics.json`** (creating the directory if absent).
7. Also print a human-readable summary table to stdout when finished.

### Output format for `.codetuner/baseline_metrics.json`
```json
{
  "generated_at": "<ISO-8601 timestamp>",
  "base_url": "<BASE_URL used>",
  "duration_seconds": 5,
  "concurrency": 10,
  "routes": [
    {
      "method": "GET",
      "path": "/api/articles",
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

Use `write_file` to save the benchmark script at the project root (`benchmark.js` or `benchmark.py`).
Add a short comment block at the top of the script explaining how to run it.

---

## Step 3 — Metrics Export Validation

Goal: confirm the script is complete and correctly wired to the output path.

1. Use `read_file` to re-read the generated benchmark script and verify:
   - The `.codetuner/` directory is created before writing (e.g. `fs.mkdirSync` / `os.makedirs`).
   - The JSON is written to `.codetuner/baseline_metrics.json` (exact path, no typos).
   - All five metrics fields (`p50_ms`, `p95_ms`, `p99_ms`, `throughput_rps`, `error_count`) are populated for every route.
   - The script exits with code `0` on success and `1` on unrecoverable error.
2. If any of the above are missing, apply a targeted fix with `apply_diff` rather than rewriting the whole file.
3. Report back to the user with:
   - A summary of the routes that will be benchmarked.
   - The exact command to start the benchmark (e.g. `node benchmark.js` or `python benchmark.py`).
   - Any prerequisite steps (server must be running, env vars to set, optional dependency to install).
   - Location of `CONTEXT.md` and `.codetuner/baseline_metrics.json`.

---

## Guardrails

- **Never run the benchmark automatically, ask first.** Generate the script and report instructions; let the user decide execution.
- **Do not modify production source files.** Only create `CONTEXT.md`, `benchmark.js`/`benchmark.py`, and `.codetuner/baseline_metrics.json`.
- **Do not add new npm/pip dependencies** unless the project already uses the package or it is truly unavoidable; always note any new dependency explicitly.
- **Keep the script portable**: no hard-coded absolute paths, no OS-specific shell-isms.
