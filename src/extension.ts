import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('docforge.hello', () => {
    vscode.window.showInformationMessage('DocForge is ready.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
