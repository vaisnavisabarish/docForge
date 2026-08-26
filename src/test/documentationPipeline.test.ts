import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { analyzeProject } from '../model/projectAnalyzer';
import { generateDocumentation } from '../documentation/documentationGenerator';
import {
  renderMarkdown,
  writeMarkdownDocumentation
} from '../documentation/markdownRenderer';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function run(): Promise<void> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'docforge-doc-test-')
  );

  try {
    await fs.mkdir(
      path.join(root, 'src', 'components'),
      { recursive: true }
    );

    await fs.writeFile(
      path.join(root, 'src', 'App.js'),
      `
import Header from "./components/Header";

export function App() {
  return Header();
}
`.trim()
    );

    await fs.writeFile(
      path.join(root, 'src', 'components', 'Header.js'),
      `
export function Header() {
  return "Header";
}
`.trim()
    );

    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify(
        {
          name: 'documentation-test-project',
          dependencies: {
            react: '^19.0.0'
          }
        },
        null,
        2
      )
    );

    const project = await analyzeProject(root);

    const documentation = generateDocumentation(project);

    assert(
      documentation.projectName === path.basename(root),
      'Documentation project name is incorrect.'
    );

    assert(
      documentation.files.length === 2,
      'Documentation file count is incorrect.'
    );

    assert(
      documentation.files.some(file =>
        file.path.includes('App.js')
      ),
      'App.js documentation is missing.'
    );

    assert(
      documentation.files.some(file =>
        file.path.includes('Header.js')
      ),
      'Header.js documentation is missing.'
    );

    assert(
      documentation.files
        .find(file => file.path.includes('App.js'))
        ?.functions.some(fn => fn.name === 'App') === true,
      'App function documentation is missing.'
    );

    assert(
      documentation.files
        .find(file => file.path.includes('App.js'))
        ?.dependencies.some(dep =>
          dep.includes('Header.js')
        ) === true,
      'App dependency documentation is missing.'
    );

    assert(
      documentation.setup.includes('react'),
      'Dependency setup documentation is missing.'
    );

    assert(
      documentation.architecture.includes('App.js') &&
      documentation.architecture.includes('Header.js'),
      'Architecture documentation is missing dependency relationship.'
    );

    const markdown = renderMarkdown(documentation);

    assert(
      markdown.includes('# ' + documentation.projectName),
      'Markdown project heading is missing.'
    );

    assert(
      markdown.includes('## Overview'),
      'Markdown Overview section is missing.'
    );

    assert(
      markdown.includes('## Architecture'),
      'Markdown Architecture section is missing.'
    );

    assert(
      markdown.includes('## Setup'),
      'Markdown Setup section is missing.'
    );

    assert(
      markdown.includes('## Files'),
      'Markdown Files section is missing.'
    );

    assert(
      markdown.includes('src\\App.js'),
      'Markdown App.js section is missing.'
    );

    const outputPath =
      await writeMarkdownDocumentation(root, documentation);

    assert(
      outputPath.endsWith('README.docforge.md'),
      'Markdown output filename is incorrect.'
    );

    const writtenMarkdown =
      await fs.readFile(outputPath, 'utf8');

    assert(
      writtenMarkdown === markdown,
      'Written Markdown does not match rendered Markdown.'
    );

    console.log('');
    console.log('========================================');
    console.log('DOCFORGE DOCUMENTATION TESTS PASSED');
    console.log('========================================');
  } finally {
    await fs.rm(root, {
      recursive: true,
      force: true
    });
  }
}

run().catch(error => {
  console.error('');
  console.error('========================================');
  console.error('DOCFORGE DOCUMENTATION TESTS FAILED');
  console.error('========================================');
  console.error(error);
  process.exitCode = 1;
});


