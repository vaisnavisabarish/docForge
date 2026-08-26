import * as fs from 'fs/promises';
import * as path from 'path';
import { parseSource } from '../parser/treeSitterParser';
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

interface SourceFileMetadata {
  path: string;
  language: string;
  parserLanguage: 'javascript' | 'typescript' | 'tsx';
}

const SUPPORTED_EXTENSIONS: Record<
  string,
  SourceFileMetadata['language'] | undefined
> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript'
};

const PARSER_LANGUAGE_MAP: Record<
  string,
  SourceFileMetadata['parserLanguage'] | undefined
> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx'
};

async function discoverSourceFiles(
  directory: string
): Promise<SourceFileMetadata[]> {
  let entries: import('fs').Dirent[];

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: SourceFileMetadata[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(
          ...(await discoverSourceFiles(path.join(directory, entry.name)))
        );
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const language = SUPPORTED_EXTENSIONS[ext];
      const parserLanguage = PARSER_LANGUAGE_MAP[ext];

      if (language && parserLanguage) {
        files.push({
          path: path.join(directory, entry.name),
          language,
          parserLanguage
        });
      }
    }
  }

  return files;
}

async function readPackageManifest(
  rootPath: string
): Promise<PackageManifest> {
  try {
    const content = await fs.readFile(
      path.join(rootPath, 'package.json'),
      'utf8'
    );

    const manifest: unknown = JSON.parse(content);

    if (!manifest || typeof manifest !== 'object') {
      return {};
    }

    const packageManifest = manifest as PackageManifest;

    return {
      dependencies: packageManifest.dependencies,
      devDependencies: packageManifest.devDependencies
    };
  } catch {
    return {};
  }
}

async function resolveImport(
  rootPath: string,
  importingFilePath: string,
  importSpecifier: string,
  knownFiles: Set<string>
): Promise<string | null> {
  // Ignore external packages such as "react" or "web-tree-sitter".
  if (!importSpecifier.startsWith('.')) {
    return null;
  }

  const importingDirectory = path.dirname(importingFilePath);
  const basePath = path.resolve(importingDirectory, importSpecifier);

  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx')
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = path.normalize(path.resolve(candidate));

    if (knownFiles.has(normalizedCandidate)) {
      return path.relative(rootPath, normalizedCandidate);
    }
  }

  return null;
}

export async function analyzeProject(
  rootPath: string
): Promise<ProjectModel> {
  const files: SourceFileModel[] = [];
  const sourceFiles = await discoverSourceFiles(rootPath);

  const knownFiles = new Set(
    sourceFiles.map(sourceFile =>
      path.normalize(path.resolve(sourceFile.path))
    )
  );

  for (const sourceFile of sourceFiles) {
    try {
      const source = await fs.readFile(sourceFile.path, 'utf8');
      const structure = await parseSource(
        source,
        sourceFile.parserLanguage
      );

      const resolvedImports: string[] = [];

      for (const importStatement of structure.imports) {
        const match = importStatement.match(
          /(?:from\s+|import\s*)['"]([^'"]+)['"]/
        );

        if (!match) {
          continue;
        }

        const resolved = await resolveImport(
          rootPath,
          sourceFile.path,
          match[1],
          knownFiles
        );

        if (resolved && !resolvedImports.includes(resolved)) {
          resolvedImports.push(resolved);
        }
      }

      files.push({
        path: path.relative(rootPath, sourceFile.path),
        language: sourceFile.language,
        ...structure,
        resolvedImports
      });
    } catch {
      // An unreadable or unparseable file should not prevent other files from being analyzed.
    }
  }

  const dependencyGraph = files.flatMap(file =>
    file.resolvedImports.map(target => ({
      from: file.path,
      to: target
    }))
  );

  const manifest = await readPackageManifest(rootPath);

  return {
    workspaceName: path.basename(path.resolve(rootPath)),
    workspacePath: rootPath,
    files,
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {},
    dependencyGraph
  };
}