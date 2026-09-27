"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const ControlPanelProvider_1 = require("./ControlPanelProvider");
function activate(context) {
    const provider = new ControlPanelProvider_1.ControlPanelProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ControlPanelProvider_1.ControlPanelProvider.viewId, provider, { webviewOptions: { retainContextWhenHidden: true } }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map