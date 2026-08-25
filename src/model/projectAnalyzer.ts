import * as fs from 'fs/promises';
import * as path from 'path';
import { parseJavaScript } from '../parser/treeSitterParser';
import { ProjectModel, SourceFileModel } from './projectModel';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'out',
  'dist',
  'build',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.conda',
  '.idea'
]);

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function discoverJavaScriptFiles(directory: string): Promise<string[]> {
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...await discoverJavaScriptFiles(path.join(directory, entry.name)));
      }
    } else if (entry.isFile() && ['.js', '.jsx'].includes(path.extname(entry.name).toLowerCase())) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

async function readPackageManifest(rootPath: string): Promise<PackageManifest> {
  try {
    const content = await fs.readFile(path.join(rootPath, 'package.json'), 'utf8');
    const manifest: unknown = JSON.parse(content);
    if (!manifest || typeof manifest !== 'object') return {};

    const packageManifest = manifest as PackageManifest;
    return {
      dependencies: packageManifest.dependencies,
      devDependencies: packageManifest.devDependencies
    };
  } catch {
    return {};
  }
}

export async function analyzeProject(rootPath: string): Promise<ProjectModel> {
  const files: SourceFileModel[] = [];
  const javascriptFiles = await discoverJavaScriptFiles(rootPath);

  for (const filePath of javascriptFiles) {
    try {
      const source = await fs.readFile(filePath, 'utf8');
      const structure = await parseJavaScript(source);
      files.push({
        path: path.relative(rootPath, filePath),
        language: 'JavaScript',
        ...structure
      });
    } catch {
      // An unreadable or unparseable file should not prevent other files from being analyzed.
    }
  }

  const manifest = await readPackageManifest(rootPath);
  return {
    workspaceName: path.basename(path.resolve(rootPath)),
    workspacePath: rootPath,
    files,
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {}
  };
}
