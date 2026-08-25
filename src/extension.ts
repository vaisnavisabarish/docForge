import * as vscode from 'vscode';
import { analyzeRepository, AnalysisReport } from './scanner/repositoryScanner';

export function activate(context: vscode.ExtensionContext) {
  const hello = vscode.commands.registerCommand('docforge.hello', () => {
    vscode.window.showInformationMessage('DocForge is ready.');
  });

  const analyze = vscode.commands.registerCommand('docforge.analyzeProject', async () => {
    const output = vscode.window.createOutputChannel('DocForge');
    output.clear();
    output.show(true);

    output.appendLine('DOCFORGE PROJECT ANALYSIS');

    let report: AnalysisReport | null = null;
    try {
      report = await analyzeRepository();
    } catch (err) {
      output.appendLine(`Analysis failed: ${String(err)}`);
      return;
    }

    if (!report.workspacePath) {
      output.appendLine('No workspace is open.');
      return;
    }

    output.appendLine('');
    output.appendLine('Project');
    output.appendLine(`- Workspace name: ${report.workspaceName ?? 'Unknown'}`);
    output.appendLine(`- Workspace path: ${report.workspacePath}`);
    output.appendLine('');
    output.appendLine('Statistics');
    output.appendLine(`- Files: ${report.totalFiles}`);
    output.appendLine(`- Directories: ${report.totalDirs}`);
    output.appendLine('');
    output.appendLine('File Types');
    for (const [ext, count] of Object.entries(report.extensions)) {
      output.appendLine(`- ${ext || '<no ext>'}: ${count}`);
    }
    output.appendLine('');
    output.appendLine('Languages');
    for (const [lang, count] of Object.entries(report.languageCounts)) {
      output.appendLine(`- ${lang}: ${count}`);
    }
    output.appendLine('');
    output.appendLine('Entry Point Candidates');
    if (report.entryPointCandidates.length === 0) {
      output.appendLine('- (none detected)');
    } else {
      for (const e of report.entryPointCandidates) output.appendLine(`- ${e}`);
    }
    output.appendLine('');
    output.appendLine('Dependencies');
    if (!report.dependencies && !report.devDependencies) {
      output.appendLine('- (no package.json found or no dependencies)');
    } else {
      if (report.dependencies) {
        output.appendLine('- dependencies:');
        for (const [k, v] of Object.entries(report.dependencies)) output.appendLine(`  - ${k}: ${v}`);
      }
      if (report.devDependencies) {
        output.appendLine('- devDependencies:');
        for (const [k, v] of Object.entries(report.devDependencies)) output.appendLine(`  - ${k}: ${v}`);
      }
    }

    if (report.errors.length) {
      output.appendLine('');
      output.appendLine('Non-fatal errors encountered:');
      for (const e of report.errors) output.appendLine(`- ${e}`);
    }
  });

  context.subscriptions.push(hello, analyze);
}

export function deactivate() {}
