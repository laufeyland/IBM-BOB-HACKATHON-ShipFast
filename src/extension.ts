import * as vscode from "vscode";
import { ControlPanelProvider } from "./ControlPanelProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ControlPanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ControlPanelProvider.viewId,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

export function deactivate(): void {}
