import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentationModel } from './documentationModel';

export function renderMarkdown(
  documentation: DocumentationModel
): string {
  const lines: string[] = [];

  lines.push(`# ${documentation.projectName}`);
  lines.push('');

  lines.push('## Overview');
  lines.push('');
  lines.push(documentation.overview);
  lines.push('');

  lines.push('## Architecture');
  lines.push('');
  lines.push(documentation.architecture);
  lines.push('');

  lines.push('### Dependency Graph');
  lines.push('');

  const dependencyLines = documentation.files.flatMap(file =>
    file.dependencies.map(
      dependency => `${file.path} -> ${dependency}`
    )
  );

  if (dependencyLines.length === 0) {
    lines.push('No internal file dependencies detected.');
  } else {
    lines.push('```text');
    lines.push(...dependencyLines);
    lines.push('```');
  }

  lines.push('');

  lines.push('## Setup');
  lines.push('');
  lines.push(documentation.setup);
  lines.push('');

  lines.push('## Files');
  lines.push('');

  for (const file of documentation.files) {
    lines.push(`### ${file.path}`);
    lines.push('');
    lines.push(file.purpose);
    lines.push('');

    lines.push('#### Functions');
    lines.push('');

    if (file.functions.length === 0) {
      lines.push('- None detected');
    } else {
      for (const fn of file.functions) {
        lines.push(`- **${fn.name}** - ${fn.description}`);
      }
    }

    lines.push('');

    lines.push('#### Classes');
    lines.push('');

    if (file.classes.length === 0) {
      lines.push('- None detected');
    } else {
      for (const cls of file.classes) {
        lines.push(`- **${cls.name}** - ${cls.description}`);

        if (cls.methods.length > 0) {
          lines.push('  - Methods:');
          for (const method of cls.methods) {
            lines.push(`    - ${method}`);
          }
        }
      }
    }

    lines.push('');

    lines.push('#### Dependencies');
    lines.push('');

    if (file.dependencies.length === 0) {
      lines.push('- None detected');
    } else {
      for (const dependency of file.dependencies) {
        lines.push(`- ${dependency}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function writeMarkdownDocumentation(
  rootPath: string,
  documentation: DocumentationModel
): Promise<string> {
  const outputPath = path.join(
    rootPath,
    'README.docforge.md'
  );

  const markdown = renderMarkdown(documentation);

  await fs.writeFile(
    outputPath,
    markdown,
    'utf8'
  );

  return outputPath;
}
