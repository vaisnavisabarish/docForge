import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentationModel } from './documentationModel';

function formatList(items: string[]): string {
  if (items.length === 0) {
    return '- None detected';
  }

  return items.map(item => `- ${item}`).join('\n');
}

export function renderMarkdown(documentation: DocumentationModel): string {
  const lines: string[] = [];

  lines.push(`# ${documentation.projectName}`);
  lines.push('');

  lines.push('## Overview');
  lines.push('');
  lines.push(documentation.overview);
  lines.push('');

  lines.push('## Architecture');
  lines.push('');

  if (documentation.architecture.trim()) {
    lines.push('```text');
    lines.push(documentation.architecture);
    lines.push('```');
  } else {
    lines.push('No internal file dependencies detected.');
  }

  lines.push('');

  lines.push('## Setup');
  lines.push('');
  lines.push(documentation.setup);
  lines.push('');

  lines.push('## Files');
  lines.push('');

  if (documentation.files.length === 0) {
    lines.push('No supported source files detected.');
    lines.push('');
  }

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
      for (const func of file.functions) {
        lines.push(`- **${func.name}** - ${func.description}`);
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

        for (const method of cls.methods) {
          lines.push(`  - Method: \`${method}\``);
        }
      }
    }

    lines.push('');

    lines.push('#### Dependencies');
    lines.push('');
    lines.push(formatList(file.dependencies));
    lines.push('');
  }

  return lines.join('\n');
}

export async function writeMarkdownDocumentation(
  projectRoot: string,
  documentation: DocumentationModel
): Promise<string> {
  const outputPath = path.join(projectRoot, 'README.docforge.md');
  const markdown = renderMarkdown(documentation);

  await fs.writeFile(outputPath, markdown, 'utf8');

  return outputPath;
}
