import * as vscode from 'vscode';
declare const require: any;
declare const Buffer: any;
const fs: any = require('fs');
const path: any = require('path');
const { Buffer: NodeBuffer } = require('buffer');

export interface AnalysisReport {
  workspaceName: string | null;
  workspacePath: string | null;
  totalFiles: number;
  totalDirs: number;
  extensions: Record<string, number>;
  languageCounts: Record<string, number>;
  entryPointCandidates: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  errors: string[];
}

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
const ENTRY_CANDIDATES = [
  'src/extension.ts',
  'src/index.ts',
  'index.ts',
  'main.ts',
  'app.ts',
  'src/index.js',
  'index.js',
  'main.js',
  'app.js'
];

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.json': 'JSON',
  '.md': 'Markdown'
};

// Common binary/generated file extensions mapped to a general category to avoid
// reading file contents for binary files (performance improvement).
const BINARY_EXTENSION_CATEGORY: Record<string, string> = {
  // images
  '.png': 'Image',
  '.jpg': 'Image',
  '.jpeg': 'Image',
  '.gif': 'Image',
  '.webp': 'Image',
  '.bmp': 'Image',
  '.ico': 'Image',
  '.svg': 'Image',
  // video
  '.mp4': 'Video',
  '.mov': 'Video',
  '.avi': 'Video',
  '.mkv': 'Video',
  // audio
  '.mp3': 'Audio',
  '.wav': 'Audio',
  '.flac': 'Audio',
  '.ogg': 'Audio',
  // archives
  '.zip': 'Archive',
  '.tar': 'Archive',
  '.gz': 'Archive',
  '.tgz': 'Archive',
  '.7z': 'Archive',
  '.rar': 'Archive',
  // binaries / executables
  '.exe': 'Binary',
  '.dll': 'Binary',
  '.so': 'Binary',
  '.dylib': 'Binary',
  '.class': 'Binary',
  // python/serialized
  '.pyc': 'Binary',
  '.pyo': 'Binary',
  '.pkl': 'Binary',
  '.pickle': 'Binary',
  // model formats
  '.pt': 'Model',
  '.pth': 'Model',
  '.onnx': 'Model',
  '.h5': 'Model',
  '.pb': 'Model'
};

async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.promises.open(filePath, 'r');
    const { buffer } = await handle.read(Buffer.alloc(800), 0, 800, 0);
    await handle.close();
    for (let i = 0; i < buffer.length; i++) if (buffer[i] === 0) return true;
    return false;
  } catch (err) {
    return true;
  }
}

export async function analyzeRepository(): Promise<AnalysisReport> {
  const report: AnalysisReport = {
    workspaceName: null,
    workspacePath: null,
    totalFiles: 0,
    totalDirs: 0,
    extensions: {},
    languageCounts: {},
    entryPointCandidates: [],
    errors: []
  };

  const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (!workspaceFolder) return report;

  report.workspaceName = workspaceFolder.name;
  report.workspacePath = workspaceFolder.uri.fsPath;

  async function walk(dir: string) {
    let entries: any[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err: any) {
      report.errors.push(`Failed to read directory ${dir}: ${err?.message ?? String(err)}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        report.totalDirs += 1;
        await walk(fullPath);
      } else if (entry.isFile()) {
        report.totalFiles += 1;
        const ext = path.extname(entry.name).toLowerCase();
        report.extensions[ext] = (report.extensions[ext] || 0) + 1;

        // If extension is known to be a binary/generated type, categorize and
        // skip reading file contents for performance.
        if (ext && Object.prototype.hasOwnProperty.call(BINARY_EXTENSION_CATEGORY, ext)) {
          const category = BINARY_EXTENSION_CATEGORY[ext];
          report.languageCounts[category] = (report.languageCounts[category] || 0) + 1;
          continue;
        }

        // For other files, treat by extension mapping and then avoid binary
        // files by content inspection.
        const lang = EXTENSION_LANGUAGE_MAP[ext] || 'Other';
        report.languageCounts[lang] = (report.languageCounts[lang] || 0) + 1;

        try {
          const binary = await isBinaryFile(fullPath);
          if (binary) continue;
        } catch (err: any) {
          report.errors.push(`Failed to inspect file ${fullPath}: ${err?.message ?? String(err)}`);
          continue;
        }
      }
    }
  }

  await walk(report.workspacePath);

  // entry point candidates
  for (const candidate of ENTRY_CANDIDATES) {
    const candidatePath = path.join(report.workspacePath, candidate);
    try {
      const exists = await fs.promises
        .stat(candidatePath)
        .then((s: any) => s.isFile())
        .catch(() => false);
      if (exists) {
        report.entryPointCandidates.push(candidate);
      }
    } catch (err: any) {
      // ignore
    }
  }

  // package.json
  const pkgPath = path.join(report.workspacePath, 'package.json');
  try {
    const raw = await fs.promises.readFile(pkgPath, { encoding: 'utf8' });
    try {
      const parsed = JSON.parse(raw);
      if (parsed.dependencies && typeof parsed.dependencies === 'object') report.dependencies = parsed.dependencies;
      if (parsed.devDependencies && typeof parsed.devDependencies === 'object') report.devDependencies = parsed.devDependencies;
    } catch (err: any) {
      report.errors.push(`Failed to parse package.json: ${err?.message ?? String(err)}`);
    }
  } catch (err: any) {
    // package.json missing is fine
  }

  return report;
}
