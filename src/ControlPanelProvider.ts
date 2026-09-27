import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteMetric {
  method?: string;
  path?: string;
  p50_ms?: number;
  p95_ms?: number;
  p99_ms?: number;
  throughput_rps?: number;
  total_requests?: number;
  error_count?: number;
}

interface MetricsFile {
  generated_at?: string;
  base_url?: string;
  duration_seconds?: number;
  concurrency?: number;
  routes?: RouteMetric[];
}

interface MetricsPayload {
  baseline: MetricsFile | null;
  tuned: MetricsFile | null;
}

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

const MASTER_SKILL = {
  id: "codetuner",
  label: "CodeTuner",
  configKey: "codetunerEnabled",
  skillDir: "codetuner",
  description:
    "Full end-to-end workflow — orchestrates Benchmark → Modernize → Review → Refactor " +
    "using subagents to analyze, improve, and measure your entire codebase in one session.",
  query: "Use the codetuner skill.",
  master: true,
} as const;

const SUB_SKILLS = [
  {
    id: "benchmark",
    label: "Benchmark",
    configKey: "benchmarkEnabled",
    skillDir: "codetuner-benchmark",
    description: "Inspect routes, generate a benchmark script, and export baseline metrics",
    query: "Use the codetuner-benchmark skill.",
    master: false,
  },
  {
    id: "modernize",
    label: "Modernize",
    configKey: "modernizeEnabled",
    skillDir: "codetuner-modernize",
    description: "Detect outdated dependencies and upgrade the tech stack",
    query: "Use the codetuner-modernize skill.",
    master: false,
  },
  {
    id: "review",
    label: "Review",
    configKey: "reviewEnabled",
    skillDir: "codetuner-review",
    description: "Identify bottlenecks, N+1 queries, and code inefficiencies",
    query: "Use the codetuner-review skill.",
    master: false,
  },
  {
    id: "refactor",
    label: "Refactor",
    configKey: "refactorEnabled",
    skillDir: "codetuner-refactor",
    description: "Apply highest-priority optimizations from the review report",
    query: "Use the codetuner-refactor skill.",
    master: false,
  },
] as const;

const ALL_SKILLS = [MASTER_SKILL, ...SUB_SKILLS] as const;

type SkillId = (typeof ALL_SKILLS)[number]["id"];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class ControlPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "codetunerControlPanel";

  private _view: vscode.WebviewView | undefined;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (msg: { command: string; skillId?: SkillId; value?: boolean }) => {
        switch (msg.command) {
          case "runSkill":
            this._runSkill(msg.skillId!);
            break;
          case "toggleSkill":
            this._toggleSkill(msg.skillId!, msg.value!);
            break;
          case "ready":
            // Webview has loaded — push current config state and metrics
            this._pushConfig();
            this._loadAndPushMetrics();
            break;
          case "refreshMetrics":
            this._loadAndPushMetrics();
            break;
        }
      },
      null,
      this._disposables
    );

    // Watch ALL .codetuner JSON files — covers every filename the skills produce
    const metricsWatcher = vscode.workspace.createFileSystemWatcher(
      "**/.codetuner/*.json"
    );

    const refresh = () => this._loadAndPushMetrics();
    metricsWatcher.onDidChange(refresh, null, this._disposables);
    metricsWatcher.onDidCreate(refresh, null, this._disposables);

    this._disposables.push(metricsWatcher);

    // Polling fallback: re-read metrics every 5 s while the view is visible.
    // This catches writes that the watcher misses on first creation (a known
    // VS Code limitation when the file is created by an external process).
    const pollInterval = setInterval(() => {
      if (this._view?.visible) {
        this._loadAndPushMetrics();
      }
    }, 5000);
    this._disposables.push({ dispose: () => clearInterval(pollInterval) });

    // Re-push config when workspace settings change
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("codetuner.skills")) {
          this._pushConfig();
        }
      },
      null,
      this._disposables
    );

    webviewView.onDidDispose(() => this._dispose(), null, this._disposables);
  }

  // ---------------------------------------------------------------------------
  // Message senders
  // ---------------------------------------------------------------------------

  private _pushConfig(): void {
    if (!this._view) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration("codetuner.skills");
    const state: Record<string, boolean> = {};
    for (const skill of ALL_SKILLS) {
      // Default OFF — skills are opt-in
      state[skill.configKey] = cfg.get<boolean>(skill.configKey, false);
    }
    this._view.webview.postMessage({ command: "configState", state });
  }

  private async _loadAndPushMetrics(): Promise<void> {
    if (!this._view) {
      return;
    }
    const payload: MetricsPayload = {
      baseline: await this._findMetricsFile(["baseline_metrics.json"]),
      // The master skill writes post_change_metrics.json; standalone refactor writes
      // tuned_metrics.json. Try all candidates and use the most recently modified one.
      tuned: await this._findBestTunedMetrics(),
    };
    this._view.webview.postMessage({ command: "metricsUpdate", payload });
  }

  /**
   * Search the entire workspace for a .codetuner/<filename> file.
   * Returns the content of the first match (most-recently-modified wins when
   * multiple workspaces are open).
   */
  private async _findMetricsFile(
    candidates: string[]
  ): Promise<MetricsFile | null> {
    for (const filename of candidates) {
      const uris = await vscode.workspace.findFiles(
        `**/.codetuner/${filename}`,
        "**/node_modules/**",
        10
      );
      if (uris.length === 0) {
        continue;
      }
      // If multiple hits (multi-root workspace), pick the most recently modified
      let best: vscode.Uri = uris[0];
      if (uris.length > 1) {
        let bestMtime = 0;
        for (const uri of uris) {
          try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.mtime > bestMtime) {
              bestMtime = stat.mtime;
              best = uri;
            }
          } catch {
            // skip unreadable
          }
        }
      }
      try {
        const raw = await vscode.workspace.fs.readFile(best);
        return JSON.parse(new TextDecoder().decode(raw)) as MetricsFile;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Pick the best "tuned" metrics file from all known output filenames,
   * choosing whichever was written most recently across all candidates.
   */
  private async _findBestTunedMetrics(): Promise<MetricsFile | null> {
    // All filenames the skills can produce as a post-optimization result
    const tunedCandidates = [
      "tuned_metrics.json",           // codetuner-refactor (standalone)
      "post_change_metrics.json",     // codetuner master skill (after refactor phase)
      "post_modernization_metrics.json", // codetuner master skill (after modernize phase)
    ];

    let bestMtime = 0;
    let bestData: MetricsFile | null = null;

    for (const filename of tunedCandidates) {
      const uris = await vscode.workspace.findFiles(
        `**/.codetuner/${filename}`,
        "**/node_modules/**",
        10
      );
      for (const uri of uris) {
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.mtime > bestMtime) {
            const raw = await vscode.workspace.fs.readFile(uri);
            const parsed = JSON.parse(
              new TextDecoder().decode(raw)
            ) as MetricsFile;
            bestMtime = stat.mtime;
            bestData = parsed;
          }
        } catch {
          // skip unreadable files
        }
      }
    }

    return bestData;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  private _runSkill(skillId: SkillId): void {
    const skill = ALL_SKILLS.find((s) => s.id === skillId);
    if (!skill) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration("codetuner.skills");
    const enabled = cfg.get<boolean>(skill.configKey, false);
    if (!enabled) {
      vscode.window.showWarningMessage(
        `CodeTuner: "${skill.label}" is toggled off. Enable it first to inject the skill, then run.`
      );
      return;
    }
    // Open Bob/Copilot chat with the skill query pre-filled.
    // workbench.action.chat.open accepts (query?: string) as its first positional arg.
    vscode.commands.executeCommand("workbench.action.chat.open", skill.query);
  }

  private async _toggleSkill(skillId: SkillId, value: boolean): Promise<void> {
    const skill = ALL_SKILLS.find((s) => s.id === skillId);
    if (!skill) {
      return;
    }

    // When toggling the master skill, cascade to all sub-skills first
    if (skill.master && value) {
      // Master turned ON  → inject + enable all sub-skills
      for (const sub of SUB_SKILLS) {
        await this._applySkillToggle(sub, true);
      }
      // Notify webview to lock sub-skill toggles
      this._view?.webview.postMessage({ command: "masterOn" });
    } else if (skill.master && !value) {
      // Master turned OFF → remove + disable all sub-skills, unlock them
      for (const sub of SUB_SKILLS) {
        await this._applySkillToggle(sub, false);
      }
      this._view?.webview.postMessage({ command: "masterOff" });
    }

    // Apply this skill itself
    await this._applySkillToggle(skill, value);
  }

  private async _applySkillToggle(
    skill: (typeof ALL_SKILLS)[number],
    value: boolean
  ): Promise<void> {
    // 1. Persist to workspace settings
    await vscode.workspace
      .getConfiguration("codetuner")
      .update(
        `skills.${skill.configKey}`,
        value,
        vscode.ConfigurationTarget.Workspace
      );

    // 2. Inject or remove SKILL.md in the workspace .bob/skills/ folder
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return;
    }
    const workspaceRoot = folders[0].uri;

    // Source: SKILL.md bundled with this extension
    const sourceUri = vscode.Uri.joinPath(
      this._extensionUri,
      ".bob",
      "skills",
      skill.skillDir,
      "SKILL.md"
    );

    // Destination: <workspace>/.bob/skills/<skillDir>/SKILL.md
    const destDirUri = vscode.Uri.joinPath(
      workspaceRoot,
      ".bob",
      "skills",
      skill.skillDir
    );
    const destUri = vscode.Uri.joinPath(destDirUri, "SKILL.md");

    try {
      if (value) {
        await vscode.workspace.fs.createDirectory(destDirUri);
        const content = await vscode.workspace.fs.readFile(sourceUri);
        await vscode.workspace.fs.writeFile(destUri, content);
      } else {
        try {
          await vscode.workspace.fs.delete(destUri, { useTrash: false });
        } catch {
          // Already absent — fine
        }
        try {
          const remaining = await vscode.workspace.fs.readDirectory(destDirUri);
          if (remaining.length === 0) {
            await vscode.workspace.fs.delete(destDirUri, {
              recursive: false,
              useTrash: false,
            });
          }
        } catch {
          // Directory already gone — fine
        }
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        `CodeTuner: failed to ${value ? "inject" : "remove"} ${skill.label} skill — ${String(err)}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _dispose(): void {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
  }

  // ---------------------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------------------

  private _getHtmlForWebview(): string {
    const subSkillCards = SUB_SKILLS.map(
      (s) => `
      <div class="skill-card" id="card-${s.id}">
        <div class="skill-header">
          <div class="skill-meta">
            <span class="skill-label">${s.label}</span>
            <span class="skill-desc">${s.description}</span>
          </div>
          <label class="toggle" title="Toggle ${s.label} skill injection">
            <input type="checkbox" id="toggle-${s.id}" data-skill="${s.id}"
              onchange="onToggle(this)">
            <span class="slider"></span>
          </label>
        </div>
        <button class="run-btn" data-skill="${s.id}" disabled onclick="onRun(this)">
          &#9654; Run
        </button>
      </div>`
    ).join("");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>CodeTuner</title>
<style>
  :root {
    --ct-radius: 4px;
    --ct-gap: 8px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    padding: 10px 12px 24px;
    line-height: 1.5;
  }

  /* ── Section headings ── */
  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-descriptionForeground));
    padding: 10px 0 6px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
    margin-bottom: 8px;
  }
  .section-title.first { padding-top: 2px; }

  /* ── Master card ── */
  .master-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-focusBorder, var(--vscode-panel-border));
    border-radius: var(--ct-radius);
    padding: 10px 12px;
    margin-bottom: 14px;
  }
  .master-card.disabled { opacity: 0.48; }

  .master-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .master-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }

  .master-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-radius: 3px;
    padding: 1px 5px;
    line-height: 1.6;
  }

  .master-label {
    font-weight: 700;
    font-size: calc(var(--vscode-font-size) + 1px);
    color: var(--vscode-foreground);
  }

  .master-workflow {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
    line-height: 1.55;
  }

  .workflow-steps {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 5px;
    font-size: 10px;
  }

  .ws-step {
    background: var(--vscode-badge-background, var(--vscode-editor-lineHighlightBackground));
    color: var(--vscode-badge-foreground, var(--vscode-foreground));
    border-radius: 3px;
    padding: 1px 6px;
    font-weight: 600;
    font-size: 10px;
  }

  .ws-arrow {
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
  }

  /* ── Regular skill cards ── */
  .skill-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border, var(--vscode-editorWidget-border));
    border-radius: var(--ct-radius);
    padding: 8px 10px;
    margin-bottom: var(--ct-gap);
    transition: border-color 0.12s;
  }
  .skill-card:last-child { margin-bottom: 0; }
  .skill-card.disabled { opacity: 0.48; }
  .skill-card:hover { border-color: var(--vscode-focusBorder); }

  .skill-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .skill-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .skill-label {
    font-weight: 600;
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
  }

  .skill-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: normal;
    word-break: break-word;
  }

  /* ── Toggle switch ── */
  .toggle {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .slider {
    position: absolute;
    inset: 0;
    background: var(--vscode-input-background, #3c3c3c);
    border: 1px solid var(--vscode-checkbox-border, #6b6b6b);
    border-radius: 9px;
    transition: background 0.15s, border-color 0.15s;
  }
  .slider::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    left: 2px;
    top: 2px;
    background: var(--vscode-input-foreground, #ccc);
    border-radius: 50%;
    transition: transform 0.15s;
  }
  .toggle input:checked + .slider {
    background: var(--vscode-button-background);
    border-color: var(--vscode-button-background);
  }
  .toggle input:checked + .slider::after {
    transform: translateX(14px);
    background: var(--vscode-button-foreground, #fff);
  }
  .toggle input:focus-visible + .slider {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 1px;
  }

  /* ── Run buttons ── */
  .run-btn, .master-run-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: none;
    border-radius: var(--ct-radius);
    padding: 5px 10px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    cursor: pointer;
    width: 100%;
    transition: background 0.1s, opacity 0.1s;
  }
  .run-btn {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  }
  .run-btn:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
  }
  .master-run-btn {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .master-run-btn:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
  }
  .run-btn:active:not(:disabled),
  .master-run-btn:active:not(:disabled) { opacity: 0.82; }
  .run-btn:disabled,
  .master-run-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  /* ── Metrics table ── */
  .metrics-wrap { overflow-x: auto; }

  #metrics-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  #metrics-table th,
  #metrics-table td {
    padding: 4px 6px;
    text-align: left;
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-editorWidget-border));
    white-space: nowrap;
  }
  #metrics-table th {
    color: var(--vscode-descriptionForeground);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
  }
  .td-method {
    font-weight: 600;
    font-size: 10px;
    color: var(--vscode-symbolIcon-methodForeground, var(--vscode-charts-blue, #569cd6));
  }
  .td-path {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    color: var(--vscode-foreground);
  }
  .gain-positive { color: var(--vscode-charts-green, #4ec9b0); font-weight: 600; }
  .gain-negative { color: var(--vscode-charts-red, #f44747); font-weight: 600; }
  .gain-neutral  { color: var(--vscode-descriptionForeground); }

  .no-metrics {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    padding: 6px 0;
    font-style: italic;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
  }

  /* ── Locked sub-skill state ── */
  .skill-card.locked {
    opacity: 0.55;
  }
  .skill-card.locked .toggle {
    pointer-events: none;
  }
  .lock-hint {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin-top: 4px;
    display: none;
  }
  .locked + .lock-hint,
  #sub-skills-section.master-active .lock-hint {
    display: block;
  }

  /* ── Refresh button ── */
  .refresh-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .refresh-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }
  .refresh-btn:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-toolbar-hoverBackground);
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════
     SECTION 1 — Master Skill
═══════════════════════════════════════════════════ -->
<div class="section-title first">Master Skill</div>

<div class="master-card" id="card-codetuner">
  <div class="master-header">
    <div class="skill-meta">
      <div class="master-title-row">
        <span class="master-label">CodeTuner</span>
        <span class="master-badge">Full Run</span>
      </div>
      <span class="skill-desc">
        Orchestrates the complete end-to-end workflow using subagents — analyzes, improves,
        modernizes, and measures your entire codebase in one session.
      </span>
    </div>
    <label class="toggle" title="Toggle CodeTuner master skill injection">
      <input type="checkbox" id="toggle-codetuner" data-skill="codetuner"
        onchange="onToggle(this)">
      <span class="slider"></span>
    </label>
  </div>

  <div class="master-workflow">
    <div class="workflow-steps">
      <span class="ws-step">Benchmark</span>
      <span class="ws-arrow">&#8594;</span>
      <span class="ws-step">Modernize</span>
      <span class="ws-arrow">&#8594;</span>
      <span class="ws-step">Review</span>
      <span class="ws-arrow">&#8594;</span>
      <span class="ws-step">Refactor</span>
    </div>
  </div>

  <button class="master-run-btn" id="run-codetuner" data-skill="codetuner" disabled onclick="onRun(this)">
    &#9654; Run Full Workflow
  </button>
</div>

<!-- ═══════════════════════════════════════════════════
     SECTION 2 — Individual Skills
═══════════════════════════════════════════════════ -->
<div id="sub-skills-section">
<div class="section-title" style="margin-top:6px;">Individual Skills</div>
<div id="lock-hint" class="lock-hint" style="margin-bottom:6px;">
  Controlled by Full Run — untoggle it to use individual skills
</div>
${subSkillCards}
</div>

<!-- ═══════════════════════════════════════════════════
     SECTION 3 — Metrics Comparison
═══════════════════════════════════════════════════ -->
<div class="refresh-row" style="margin-top:14px;">
  <div class="section-title" style="margin-top:0;padding-top:0;flex:1">Metrics Comparison</div>
  <button class="refresh-btn" onclick="onRefreshMetrics()" title="Refresh metrics">&#8635; Refresh</button>
</div>
<div id="meta-row" class="meta-row" style="display:none">
  <span id="ts-baseline"></span>
  <span id="ts-tuned"></span>
</div>
<div class="metrics-wrap">
  <div id="no-metrics" class="no-metrics">
    Run <strong>Benchmark</strong> to generate baseline metrics, then <strong>Refactor</strong> to compare improvements.
  </div>
  <table id="metrics-table" style="display:none">
    <thead>
      <tr>
        <th>Method</th>
        <th>Path</th>
        <th>Baseline p95</th>
        <th>Tuned p95</th>
        <th>Gain</th>
      </tr>
    </thead>
    <tbody id="metrics-body"></tbody>
  </table>
</div>

<script>
  const vscode = acquireVsCodeApi();

  // ── Sub-skill IDs ────────────────────────────────────────────────────────────
  const SUB_SKILL_IDS = ['benchmark', 'modernize', 'review', 'refactor'];

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmt(val) {
    return val != null ? val.toFixed(1) + ' ms' : '—';
  }

  function gainClass(pct) {
    if (pct == null) { return 'gain-neutral'; }
    return pct > 0 ? 'gain-positive' : pct < 0 ? 'gain-negative' : 'gain-neutral';
  }

  function gainLabel(pct) {
    if (pct == null) { return '—'; }
    return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  function fmtTs(iso) {
    if (!iso) { return ''; }
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Skill card helpers ───────────────────────────────────────────────────────

  function setSkillEnabled(skillId, enabled) {
    const toggle = document.getElementById('toggle-' + skillId);
    const card   = document.getElementById('card-'   + skillId);
    const btn    = card ? card.querySelector('button') : null;
    if (toggle) { toggle.checked = !!enabled; }
    if (card)   { card.classList.toggle('disabled', !enabled); }
    if (btn)    { btn.disabled = !enabled; }
  }

  function setSubSkillsLocked(locked) {
    const hint = document.getElementById('lock-hint');
    if (hint) { hint.style.display = locked ? '' : 'none'; }
    for (const id of SUB_SKILL_IDS) {
      const card   = document.getElementById('card-' + id);
      const toggle = document.getElementById('toggle-' + id);
      if (card)   { card.classList.toggle('locked', locked); }
      if (toggle) { toggle.disabled = locked; }
    }
  }

  // ── Config state ────────────────────────────────────────────────────────────
  // Receives the full map: { benchmarkEnabled: bool, codetunerEnabled: bool, ... }

  function applyConfigState(state) {
    const masterEnabled = !!state['codetunerEnabled'];

    for (const [key, enabled] of Object.entries(state)) {
      const skillId = key.replace(/Enabled$/, '');
      setSkillEnabled(skillId, enabled);
    }

    // If master is on, lock sub-skills regardless of their individual state
    setSubSkillsLocked(masterEnabled);
  }

  // ── Metrics rendering ───────────────────────────────────────────────────────

  function renderMetrics(payload) {
    const baseline    = payload && payload.baseline;
    const tuned       = payload && payload.tuned;
    const hasBaseline = baseline && Array.isArray(baseline.routes) && baseline.routes.length > 0;

    if (!hasBaseline) {
      document.getElementById('no-metrics').style.display    = '';
      document.getElementById('metrics-table').style.display = 'none';
      document.getElementById('meta-row').style.display      = 'none';
      return;
    }

    // Build tuned-route lookup keyed by "METHOD /path"
    const tunedMap = {};
    if (tuned && Array.isArray(tuned.routes)) {
      for (const r of tuned.routes) {
        tunedMap[(r.method || 'GET').toUpperCase() + ' ' + (r.path || '')] = r;
      }
    }

    const tbody = document.getElementById('metrics-body');
    tbody.innerHTML = '';

    for (const br of baseline.routes) {
      const method    = (br.method || 'GET').toUpperCase();
      const routePath = br.path || '—';
      const tr        = tunedMap[method + ' ' + routePath];

      const baseP95  = br.p95_ms   != null ? br.p95_ms   : null;
      const tunedP95 = tr && tr.p95_ms != null ? tr.p95_ms : null;

      let gainPct = null;
      if (baseP95 != null && tunedP95 != null && baseP95 !== 0) {
        gainPct = ((baseP95 - tunedP95) / baseP95) * 100;
      }

      const row = document.createElement('tr');
      row.innerHTML =
        '<td class="td-method">' + escHtml(method) + '</td>' +
        '<td class="td-path">'   + escHtml(routePath) + '</td>' +
        '<td>' + fmt(baseP95)  + '</td>' +
        '<td>' + fmt(tunedP95) + '</td>' +
        '<td class="' + gainClass(gainPct) + '">' + gainLabel(gainPct) + '</td>';
      tbody.appendChild(row);
    }

    // Timestamps
    const bTs = fmtTs(baseline.generated_at);
    const tTs = tuned ? fmtTs(tuned.generated_at) : '';
    document.getElementById('ts-baseline').textContent = bTs ? 'Baseline: ' + bTs : '';
    document.getElementById('ts-tuned').textContent    = tTs ? 'Tuned: '    + tTs : '';
    document.getElementById('meta-row').style.display  = (bTs || tTs) ? '' : 'none';

    document.getElementById('no-metrics').style.display    = 'none';
    document.getElementById('metrics-table').style.display = '';
  }

  // ── User actions ────────────────────────────────────────────────────────────

  function onToggle(el) {
    vscode.postMessage({ command: 'toggleSkill', skillId: el.dataset.skill, value: el.checked });
  }

  function onRun(el) {
    vscode.postMessage({ command: 'runSkill', skillId: el.dataset.skill });
  }

  function onRefreshMetrics() {
    vscode.postMessage({ command: 'refreshMetrics' });
  }

  // ── Message bus ─────────────────────────────────────────────────────────────

  window.addEventListener('message', function(event) {
    const msg = event.data;
    switch (msg.command) {
      case 'configState':
        applyConfigState(msg.state);
        break;
      case 'metricsUpdate':
        renderMetrics(msg.payload);
        break;
      case 'masterOn':
        // Host confirms master is now active — lock and check all sub-skills
        for (const id of SUB_SKILL_IDS) { setSkillEnabled(id, true); }
        setSubSkillsLocked(true);
        break;
      case 'masterOff':
        // Host confirms master turned off — unlock, uncheck all sub-skills
        for (const id of SUB_SKILL_IDS) { setSkillEnabled(id, false); }
        setSubSkillsLocked(false);
        break;
    }
  });

  // Signal ready — host will push current config + metrics
  vscode.postMessage({ command: 'ready' });
</script>
</body>
</html>`;
  }
}
