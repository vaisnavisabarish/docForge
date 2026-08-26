import * as vscode from 'vscode';
import { analyzeProject } from './model/projectAnalyzer';

export function activate(context: vscode.ExtensionContext) {
  const hello = vscode.commands.registerCommand('docforge.hello', () => {
    vscode.window.showInformationMessage('DocForge is ready.');
  });

  const analyze = vscode.commands.registerCommand('docforge.analyzeProject', async () => {
    const output = vscode.window.createOutputChannel('DocForge');
    output.clear();
    output.show(true);

    output.appendLine('DOCFORGE PROJECT ANALYSIS');

    const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!workspaceFolder) {
      output.appendLine('');
      output.appendLine('No workspace is open.');
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    try {
      const model = await analyzeProject(workspacePath);

      output.appendLine('');
      output.appendLine('Project');
      output.appendLine(`- Workspace name: ${model.workspaceName}`);
      output.appendLine(`- Workspace path: ${model.workspacePath}`);

      output.appendLine('');
      output.appendLine('Source Files');
      if (model.files.length === 0) {
        output.appendLine('- (none parsed)');
      } else {
        for (const file of model.files) {
          output.appendLine(`- File: ${file.path}`);
          output.appendLine(`  Language: ${file.language}`);
          output.appendLine(`  Functions: ${file.functions.length > 0 ? file.functions.join(', ') : '(none)'}`);
          output.appendLine(`  Classes: ${file.classes.length > 0 ? file.classes.join(', ') : '(none)'}`);
          output.appendLine(`  Methods: ${file.methods.length > 0 ? file.methods.join(', ') : '(none)'}`);
          output.appendLine(`  Imports: ${file.imports.length > 0 ? file.imports.join(', ') : '(none)'}`);
          output.appendLine(`  Exports: ${file.exports.length > 0 ? file.exports.join(', ') : '(none)'}`);
        }
      }

      output.appendLine('');
      output.appendLine('Dependencies');
      if (Object.keys(model.dependencies).length === 0) {
        output.appendLine('- (none)');
      } else {
        for (const [name, version] of Object.entries(model.dependencies)) {
          output.appendLine(`- ${name}: ${version}`);
        }
      }

      output.appendLine('');
      output.appendLine('Dev Dependencies');
      if (Object.keys(model.devDependencies).length === 0) {
        output.appendLine('- (none)');
      } else {
        for (const [name, version] of Object.entries(model.devDependencies)) {
          output.appendLine(`- ${name}: ${version}`);
        }
      }
    } catch (err) {
      output.appendLine('');
      output.appendLine(`Analysis failed: ${String(err)}`);
    }
  });

  context.subscriptions.push(hello, analyze);
}

export function deactivate() {}
