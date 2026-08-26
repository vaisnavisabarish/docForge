import { ProjectModel, ProjectSummary } from './projectModel';

export function summarizeProject(project: ProjectModel): ProjectSummary {
  const languageCounts: Record<string, number> = {};

  const classes = new Set<string>();
  const functions = new Set<string>();

  for (const file of project.files) {
    languageCounts[file.language] =
      (languageCounts[file.language] || 0) + 1;

    for (const className of file.classes) {
      classes.add(className);
    }

    for (const functionName of file.functions) {
      functions.add(functionName);
    }
  }

  const entryPoints = project.files
    .filter(file => {
      const normalizedPath = file.path.replace(/\\/g, '/');

      return (
        normalizedPath === 'src/index.js' ||
        normalizedPath === 'src/index.ts' ||
        normalizedPath === 'src/index.tsx' ||
        normalizedPath === 'index.js' ||
        normalizedPath === 'index.ts' ||
        normalizedPath === 'index.tsx' ||
        normalizedPath === 'src/extension.ts'
      );
    })
    .map(file => file.path);

  return {
    totalFiles: project.files.length,
    languageCounts,
    entryPoints,
    classes: Array.from(classes).sort(),
    functions: Array.from(functions).sort(),
    dependencies: project.dependencies,
    devDependencies: project.devDependencies,
    dependencyRelationships: project.dependencyGraph
  };
}