# CodeTuner Side Panel Extension — Implementation Plan

## Top-Level Overview

Build a VS Code sidebar extension named **CodeTuner** that surfaces a dedicated WebviewView control panel. The panel lets users toggle codetuner skill switches, trigger skill execution via Bob's chat, and view a live metrics comparison table driven by `.codetuner/baseline_metrics.json` and `.codetuner/tuned_metrics.json`.

The extension is **additive-only** — it injects queries into the existing chat via `workbench.action.chat.open` and never replaces it.

### Files to create / modify

| File | Action |
|---|---|
| `package.json` | Extend with full VS Code manifest fields (name, engines, main, contributes, activationEvents) |
| `src/extension.ts` | Register the WebviewViewProvider and subscribe to file system watchers |
| `src/ControlPanelProvider.ts` | New file — implements the WebviewViewProvider with HTML UI, messaging, config reads/writes, and metrics diffing |

---

## Sub-Task 1 — Extend `package.json` with VS Code Manifest

**Status:** `[ ] pending`

**Intent**
The current `package.json` is missing all required VS Code extension manifest keys. Without them `tsc` will compile but the extension cannot load in VS Code and `contributes` cannot declare the view container, webview, or configuration schema.

**Expected Outcomes**
- `name`, `displayName`, `description`, `version`, `publisher`, `engines.vscode`, `main`, `activationEvents`, `categories` are all present.
- An Activity Bar `viewsContainers` entry with id `codetuner-sidebar`, icon `$(zap)`, title `CodeTuner`.
- A `views.codetuner-sidebar` entry with one `webview` view: id `codetunerControlPanel`, name `Control Panel`, type `webview`.
- A `configuration` contribution block under title `CodeTuner Skills` with four boolean properties:
  - `codetuner.skills.benchmarkEnabled` (default `true`)
  - `codetuner.skills.reviewEnabled` (default `true`)
  - `codetuner.skills.modernizeEnabled` (default `true`)
  - `codetuner.skills.refactorEnabled` (default `true`)
- `activationEvents: ["onStartupFinished"]` so the provider registers on startup.
- `main: "./out/extension"` pointing to the compiled output.

**Todo List**
1. Add all required top-level VS Code manifest keys to `package.json` (name, version, publisher, description, engines, main, activationEvents, categories).
2. Add `contributes.viewsContainers.activitybar` array with the CodeTuner container entry.
3. Add `contributes.views` object with the `codetunerControlPanel` webview entry.
4. Add `contributes.configuration` block with the four skill toggle properties.

**Relevant Context**
- Current `package.json` only has `devDependencies` and `scripts` — all other fields must be added.
- VS Code API version pinned at `^1.138.0`.
- `$(zap)` is a built-in codicon available from VS Code 1.74+.

---

## Sub-Task 2 — Implement `src/ControlPanelProvider.ts`

**Status:** `[ ] pending`

**Intent**
Encapsulate all webview logic in a dedicated provider class. The provider handles rendering the UI HTML, receiving messages from the webview (run skill, toggle config), writing config changes back to workspace settings, watching the two metrics JSON files, and pushing updated metrics data into the webview.

**Expected Outcomes**
- Class `ControlPanelProvider` implements `vscode.WebviewViewProvider`.
- `resolveWebviewView` renders the HTML panel with skill cards (benchmark, review, modernize, refactor), toggle switches reading from `codetuner.skills.*`, a "Run" button per skill, and a metrics comparison table section.
- Message handler `webviewView.webview.onDidReceiveMessage` handles:
  - `runSkill` → checks `codetuner.skills.<name>Enabled` config, if `true` calls `vscode.commands.executeCommand('workbench.action.chat.open', { query: 'Use the <skill-name> skill.' })`.
  - `toggleSkill` → calls `vscode.workspace.getConfiguration('codetuner').update('skills.<name>Enabled', value, vscode.ConfigurationTarget.Workspace)`.
- Two `vscode.workspace.createFileSystemWatcher` calls monitor `**/.codetuner/baseline_metrics.json` and `**/.codetuner/tuned_metrics.json`; on change/create they reload and post a `metricsUpdate` message to the webview.
- The webview HTML is returned by a private `_getHtmlForWebview()` method using inline CSS+JS (no external bundler needed).
- The comparison table shows: Route Path, Baseline p95, Tuned p95, Improvement %.
- Watchers and disposables are pushed to the provider's disposables array.

**Todo List**
1. Create `src/ControlPanelProvider.ts` with the `ControlPanelProvider` class skeleton (constructor, `resolveWebviewView`, `_getHtmlForWebview`, `_loadMetrics` helpers).
2. Implement `_getHtmlForWebview()` returning self-contained HTML with CSP, toggle switches, run buttons, and an empty metrics table placeholder.
3. Implement `onDidReceiveMessage` for `runSkill` and `toggleSkill` messages.
4. Implement `_loadMetrics()` to read both JSON files from the workspace and post `metricsUpdate` to the webview.
5. Register `vscode.workspace.createFileSystemWatcher` watchers inside `resolveWebviewView`, dispose them on view disposal.
6. Add inline JS in the HTML that handles `metricsUpdate` messages and renders the comparison table rows.

**Relevant Context**
- `vscode.workspace.workspaceFolders?.[0].uri` provides the workspace root path for finding `.codetuner/*.json`.
- `vscode.workspace.fs.readFile` is the correct async API for reading workspace files.
- `webviewView.webview.options = { enableScripts: true }` must be set before rendering HTML.
- No external npm UI library — pure inline HTML/CSS/JS for zero build complexity.
- **Confirmed metrics JSON shape** (from codetuner-benchmark SKILL.md):
  ```json
  {
    "generated_at": "<ISO-8601>",
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
  The comparison table should key on `method + path` to join baseline and tuned rows. Display columns: Method, Path, Baseline p95, Tuned p95, Improvement %. Missing file → show "No metrics yet" gracefully. Parser should be flexible — use optional chaining so any missing field renders as `—`.
- `ConfigurationTarget.Workspace` writes to `.vscode/settings.json`, which is the correct target.

---

## Sub-Task 3 — Wire `src/extension.ts`

**Status:** `[ ] pending`

**Intent**
Register the `ControlPanelProvider` with VS Code's webview view system so VS Code calls `resolveWebviewView` when the panel is first opened.

**Expected Outcomes**
- `activate()` instantiates `ControlPanelProvider` and calls `vscode.window.registerWebviewViewProvider('codetunerControlPanel', provider)`.
- The registration disposable is pushed to `context.subscriptions`.
- `deactivate()` remains empty (cleanup handled via subscriptions).

**Todo List**
1. Import `ControlPanelProvider` into `extension.ts`.
2. Inside `activate`, instantiate the provider and register it via `vscode.window.registerWebviewViewProvider`.
3. Push the returned disposable to `context.subscriptions`.

**Relevant Context**
- View ID `codetunerControlPanel` must match exactly what is declared in `package.json` contributes.views.
- `context.extensionUri` should be passed to `ControlPanelProvider` constructor so it can resolve resource URIs if needed in the future.

---

## Sub-Task 4 — Compile Verification

**Status:** `[ ] pending`

**Intent**
Run `npm run compile` to confirm zero TypeScript errors across all three files.

**Expected Outcomes**
- `tsc -p ./` exits with code 0.
- `out/extension.js` and `out/ControlPanelProvider.js` are emitted.
- No `TS2xxx` errors.

**Todo List**
1. Run `npm run compile` and capture the output.
2. If errors exist, fix each one (type mismatches, missing imports, strict-null violations) and recompile.

**Relevant Context**
- `strict: true` in tsconfig means all optional chaining for `workspaceFolders?.[0]` must be properly guarded.
- `vscode.workspace.fs.readFile` returns `Uint8Array` — needs `Buffer.from(...).toString()` or `new TextDecoder().decode(...)` to parse JSON.
- The `workbench.action.chat.open` command accepts an options object; TypeScript will accept it as `any` second arg via `executeCommand`.
