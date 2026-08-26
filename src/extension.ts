import * as vscode from 'vscode';
import { analyzeProject } from './model/projectAnalyzer';
import { generateDocumentation } from './documentation/documentationGenerator';
import { writeMarkdownDocumentation } from './documentation/markdownRenderer';

export function activate(context: vscode.ExtensionContext) {
  const hello = vscode.commands.registerCommand('docforge.hello', () => {
    vscode.window.showInformationMessage('DocForge is ready.');
  });

  const analyze = vscode.commands.registerCommand(
    'docforge.analyzeProject',
    async () => {
      const output = vscode.window.createOutputChannel('DocForge');
      output.clear();
      output.show(true);

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        output.appendLine('No workspace is open.');
        return;
      }

      output.appendLine('DOCFORGE PROJECT ANALYSIS');
      output.appendLine('');

      try {
        const project = await analyzeProject(workspaceFolder.uri.fsPath);

        output.appendLine('Project');
        output.appendLine(`- Workspace name: ${project.workspaceName}`);
        output.appendLine(`- Workspace path: ${project.workspacePath}`);
        output.appendLine('');

        output.appendLine('Source Files');
        if (project.files.length === 0) {
          output.appendLine('- No supported source files detected.');
        } else {
          for (const file of project.files) {
            output.appendLine(`- ${file.path}`);
            output.appendLine(`  Language: ${file.language}`);
            output.appendLine(
              `  Functions: ${
                file.functions.length > 0
                  ? file.functions.join(', ')
                  : '(none)'
              }`
            );
            output.appendLine(
              `  Classes: ${
                file.classes.length > 0
                  ? file.classes.join(', ')
                  : '(none)'
              }`
            );
            output.appendLine(
              `  Dependencies: ${
                file.resolvedImports.length > 0
                  ? file.resolvedImports.join(', ')
                  : '(none)'
              }`
            );
          }
        }

        output.appendLine('');
        output.appendLine('Dependencies');

        const dependencies = Object.entries(project.dependencies);

        if (dependencies.length === 0) {
          output.appendLine('- (none)');
        } else {
          for (const [name, version] of dependencies) {
            output.appendLine(`- ${name}: ${version}`);
          }
        }

        output.appendLine('');
        output.appendLine('Dependency Graph');

        if (project.dependencyGraph.length === 0) {
          output.appendLine('- No internal dependencies detected.');
        } else {
          for (const edge of project.dependencyGraph) {
            output.appendLine(`- ${edge.from} -> ${edge.to}`);
          }
        }
      } catch (error) {
        output.appendLine(`Analysis failed: ${String(error)}`);
      }
    }
  );

  const generate = vscode.commands.registerCommand(
    'docforge.generateDocumentation',
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        vscode.window.showErrorMessage(
          'DocForge: No workspace is open.'
        );
        return;
      }

      const output = vscode.window.createOutputChannel('DocForge');
      output.clear();
      output.show(true);

      output.appendLine('DOCFORGE DOCUMENTATION GENERATION');
      output.appendLine('');
      output.appendLine('Analyzing project...');

      try {
        const project = await analyzeProject(
          workspaceFolder.uri.fsPath
        );

        output.appendLine(
          `Found ${project.files.length} supported source files.`
        );

        output.appendLine('Building documentation model...');

        const documentation = generateDocumentation(project);

        output.appendLine('Rendering Markdown...');

        const outputPath = await writeMarkdownDocumentation(
          workspaceFolder.uri.fsPath,
          documentation
        );

        output.appendLine('');
        output.appendLine('Documentation generated successfully.');
        output.appendLine(`Output: ${outputPath}`);

        const action = await vscode.window.showInformationMessage(
          'DocForge documentation generated.',
          'Open Documentation'
        );

        if (action === 'Open Documentation') {
          const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(outputPath)
          );

          await vscode.window.showTextDocument(document);
        }
      } catch (error) {
        output.appendLine('');
        output.appendLine(
          `Documentation generation failed: ${String(error)}`
        );

        vscode.window.showErrorMessage(
          `DocForge: Documentation generation failed.`
        );
      }
    }
  );

  context.subscriptions.push(
    hello,
    analyze,
    generate
  );
}
