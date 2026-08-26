import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { analyzeProject } from '../model/projectAnalyzer';

async function createTestProject(): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'docforge-test-')
  );

  await fs.mkdir(
    path.join(root, 'src', 'components'),
    { recursive: true }
  );

  await fs.mkdir(
    path.join(root, 'node_modules', 'ignored-package'),
    { recursive: true }
  );

  await fs.writeFile(
    path.join(root, 'src', 'App.js'),
    `
import { UserService } from "./service";

export function App() {
  return new UserService();
}
`.trim()
  );

  await fs.writeFile(
    path.join(root, 'src', 'service.ts'),
    `
import { UserCard } from "./components/UserCard";

export class UserService {
  getUser(id: string) {
    return new UserCard();
  }
}
`.trim()
  );

  await fs.writeFile(
    path.join(root, 'src', 'components', 'UserCard.tsx'),
    `
import React from "react";

export function UserCard() {
  return <div>User</div>;
}
`.trim()
  );

  await fs.writeFile(
    path.join(root, 'node_modules', 'ignored-package', 'ignored.js'),
    `
export function ignored() {
  return true;
}
`.trim()
  );

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        name: 'docforge-test-project',
        dependencies: {
          react: '^19.0.0'
        },
        devDependencies: {
          typescript: '^5.0.0'
        }
      },
      null,
      2
    )
  );

  return root;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function run(): Promise<void> {
  const root = await createTestProject();

  try {
    const project = await analyzeProject(root);

    const app = project.files.find(file =>
      file.path.includes('App.js')
    );

    const service = project.files.find(file =>
      file.path.includes('service.ts')
    );

    const card = project.files.find(file =>
      file.path.includes('UserCard.tsx')
    );

    assert(!!app, 'App.js was not detected.');
    assert(!!service, 'service.ts was not detected.');
    assert(!!card, 'UserCard.tsx was not detected.');

    assert(
      app!.language === 'JavaScript',
      'App.js language detection is incorrect.'
    );

    assert(
      service!.language === 'TypeScript',
      'service.ts language detection is incorrect.'
    );

    assert(
      card!.language === 'TypeScript',
      'UserCard.tsx language detection is incorrect.'
    );

    assert(
      app!.functions.includes('App'),
      'App function was not detected.'
    );

    assert(
      service!.classes.includes('UserService'),
      'UserService class was not detected.'
    );

    assert(
      service!.methods.includes('getUser'),
      'getUser method was not detected.'
    );

    assert(
      card!.functions.includes('UserCard'),
      'UserCard TSX function was not detected.'
    );

    assert(
      app!.resolvedImports.some(file =>
        file.includes('service.ts')
      ),
      'App.js -> service.ts import was not resolved.'
    );

    assert(
      service!.resolvedImports.some(file =>
        file.includes('UserCard.tsx')
      ),
      'service.ts -> UserCard.tsx import was not resolved.'
    );

    assert(
      !project.files.some(file =>
        file.path.includes('node_modules')
      ),
      'node_modules content was analyzed.'
    );

    assert(
      project.dependencyGraph.some(edge =>
        edge.from.includes('App.js') &&
        edge.to.includes('service.ts')
      ),
      'App.js dependency graph edge is missing.'
    );

    assert(
      project.dependencyGraph.some(edge =>
        edge.from.includes('service.ts') &&
        edge.to.includes('UserCard.tsx')
      ),
      'service.ts dependency graph edge is missing.'
    );

    assert(
      project.dependencies.react === '^19.0.0',
      'package dependency extraction failed.'
    );

    assert(
      project.devDependencies.typescript === '^5.0.0',
      'devDependency extraction failed.'
    );

    console.log('');
    console.log('========================================');
    console.log('DOCFORGE CORE TESTS PASSED');
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
  console.error('DOCFORGE CORE TESTS FAILED');
  console.error('========================================');
  console.error(error);
  process.exitCode = 1;
});
