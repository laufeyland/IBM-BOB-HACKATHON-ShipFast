---
name: codetuner-modernize
description: Use when the user wants to modernize, upgrade, or update their technology stack — detects current versions, researches latest stable releases, produces a recommendation table, requires explicit approval before making any changes, then executes only approved upgrades incrementally.
---

# CodeTuner — Modernization Discovery, Recommendation, and Approval Workflow

Follow every step in order. Do NOT modify any files until Step 7 (user approval) is complete.

---

## Step 1 — Detect the current technology stack

Use `read_file`, `glob`, and `grep` to inspect the project. Identify current versions for every applicable category:

- Runtime (Node.js, Python, Java, Ruby, Go, etc.)
- Programming language and version (TypeScript, Python 3.x, etc.)
- Main framework (NestJS, Next.js, Django, Spring Boot, etc.)
- Major libraries and their versions
- Database / ORM (PostgreSQL, Prisma, SQLAlchemy, etc.)
- Package manager (npm, yarn, pnpm, pip, etc.)
- Build tools (Webpack, Vite, esbuild, Gradle, etc.)
- Testing tools (Jest, Vitest, Pytest, etc.)
- Linting / formatting tools (ESLint, Prettier, Ruff, etc.)
- Deployment / runtime environment (Docker, Kubernetes, Vercel, etc.)
- Other important development tooling (CI, monorepo tools, etc.)

Key files to inspect (use whichever are present):
- `package.json` / `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- `pyproject.toml` / `requirements.txt` / `Pipfile`
- `pom.xml` / `build.gradle`
- `go.mod`
- `.nvmrc` / `.node-version` / `.tool-versions`
- `Dockerfile` / `docker-compose.yml`
- `tsconfig.json`
- `.eslintrc*` / `eslint.config.*`
- `jest.config.*` / `vitest.config.*`
- `vite.config.*` / `webpack.config.*`

Do NOT modify anything in this step.

---

## Step 2 — Research current stable versions

For every technology detected, use `execute_command` to query current version information from authoritative sources at execution time. Do not rely solely on internal model knowledge — version data goes stale.

Strategies by ecosystem:

**npm packages:**
```
npm view <package-name> versions --json
npm view <package-name> dist-tags
```

**Node.js:**
```
Invoke-RestMethod https://nodejs.org/dist/index.json | Select-Object -First 20 | ConvertTo-Json
```

**Python packages:**
```
pip index versions <package>
```
or query PyPI:
```
Invoke-RestMethod https://pypi.org/pypi/<package>/json | Select-Object -ExpandProperty info | Select-Object version
```

For each technology determine and record:
- Current project version (from files)
- Latest stable version (verified at execution time)
- Latest LTS version (where applicable)
- Recommended migration target (NOT automatically the latest — see below)
- Whether the current version is deprecated or end-of-life
- Known breaking changes between current and proposed target
- Migration complexity (Low / Medium / High)
- Compatibility with the rest of the stack

**Recommendation criteria — the latest version is NOT automatically recommended.** Prioritise:
1. Stability and production readiness
2. Long-term support (LTS) window
3. Ecosystem and framework compatibility
4. Migration risk
5. Breaking change surface area

If version information cannot be independently verified, state explicitly:
> "Latest version could not be independently verified."

Never invent a version number.

---

## Step 3 — Generate the modernization recommendation table

Display a Markdown table with one row per technology. Populate columns with data from Steps 1–2 only — do not use example values from this skill file.

```
| Technology | Current | Latest Stable | Recommended Target | Status | Risk | Recommendation |
|------------|---------|---------------|--------------------|--------|------|----------------|
```

**Status values:** `Up to date` | `Outdated` | `EOL` | `Security risk` | `Incompatible`
**Risk values:** `Low` | `Medium` | `High`
**Recommendation values:** `Upgrade` | `Optional` | `Do not upgrade` | `Already current`

---

## Step 4 — Explain every recommendation

Under the table, write a short explanation for each technology using this format:

```
### <Technology>

Current: <version>
Latest stable: <version>
Recommended target: <version>

Reason: <why this upgrade is or isn't recommended>
Expected impact: <Low / Medium / High>
Potential breaking areas:
- <item>
- <item>
```

---

## Step 5 — Classify recommendations

Group each technology into exactly one classification:

**REQUIRED** — current version is EOL, unsupported, has a known security risk, or blocks another migration.

**RECOMMENDED** — upgrade significantly improves maintainability, LTS coverage, compatibility, performance, or developer experience.

**OPTIONAL** — current version is still supported; upgrading provides limited immediate value.

**DO NOT UPGRADE** — newest release would break compatibility, require unnecessary rewrites, conflict with another dependency, or provide little value.

---

## Step 6 — STOP and request user approval

After presenting the table, explanations, and classifications, **stop completely**.

Do NOT:
- Edit any files
- Install or uninstall packages
- Modify `package.json`, lock files, or configuration
- Change runtime versions
- Refactor any code
- Run any migration commands

Ask the user exactly:

> "CodeTuner has completed the modernization assessment.
>
> Please review the proposed migration plan.
>
> You can:
> - Approve all recommended changes
> - Approve only specific upgrades
> - Reject specific upgrades
> - Change a target version
> - Ask for more information about an upgrade
> - Cancel modernization
>
> Which changes would you like CodeTuner to apply?"

Use `ask_followup_question` for this prompt when possible.

---

## Step 7 — Process selective approval

The user may approve everything, a subset, or nothing. They may also override a target version.

Example valid responses:
- "Upgrade Node and TypeScript but leave Express unchanged."
- "Upgrade everything REQUIRED and RECOMMENDED."
- "Use Node 20 instead of Node 22."
- "Cancel."

Build and display an approved plan table:

```
| Technology | Current | Proposed | Decision |
|------------|---------|----------|----------|
| Node.js    | x       | y        | ✅ Approved |
| Express    | x       | y        | ❌ Rejected |
| TypeScript | x       | y        | ⏭ Skipped |
```

Only approved rows proceed to execution. Rejected and skipped rows are never touched.

---

## Step 8 — Generate MODERNIZATION_PLAN.md

Before executing any changes, write `MODERNIZATION_PLAN.md` to the project root using `write_file`.

The file must contain:

1. **Current Stack** — technology and version discovered in Step 1.
2. **Version Research** — versions verified in Step 2, including source notes.
3. **Proposed Stack** — recommended targets from Step 3.
4. **User Decisions** — exact record of approvals and rejections, e.g.:
   ```
   Node.js 12 → Node.js 22 LTS — APPROVED
   Express 4 → Express 5 — REJECTED
   TypeScript 4 → TypeScript 5 — APPROVED
   ```
5. **Migration Order** — dependency-aware sequence (runtime first, then language tooling, then frameworks, then libraries, then tooling, then deprecated API cleanup).
6. **Breaking Changes** — known breaking changes per approved upgrade and which files or patterns are affected.
7. **Validation Strategy** — how correctness will be verified after each step (build, type-check, tests, lint, smoke tests, etc.).

---

## Step 9 — Execute approved changes incrementally

For each approved upgrade, follow this loop:

1. Apply the change (update version in manifest, install updated package, adjust config).
2. Run the project's build command.
3. Run the type-checker (if applicable).
4. Run the test suite.
5. Run the linter.
6. **If all checks pass** → proceed to the next approved upgrade.
7. **If any check fails** → diagnose the failure, repair it, re-run validation, and only then continue.

Use `execute_command` for install, build, test, and lint commands. Follow the migration order recorded in `MODERNIZATION_PLAN.md`. Do not skip ahead.

After all approved upgrades are complete, update `MODERNIZATION_PLAN.md` with the final status of each migration step and any issues encountered.
