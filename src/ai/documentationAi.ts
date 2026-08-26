import { ProjectModel } from '../model/projectModel';

export interface DocumentationAiRequest {
  projectName: string;
  prompt: string;
}

export function buildDocumentationAiRequest(
  project: ProjectModel
): DocumentationAiRequest {
  const fileSummaries = project.files.map(file => {
    const functions =
      file.functions.length > 0
        ? file.functions.join(', ')
        : '(none)';

    const classes =
      file.classes.length > 0
        ? file.classes.join(', ')
        : '(none)';

    const imports =
      file.resolvedImports.length > 0
        ? file.resolvedImports.join(', ')
        : '(none)';

    return [
      `File: ${file.path}`,
      `Language: ${file.language}`,
      `Functions: ${functions}`,
      `Classes: ${classes}`,
      `Resolved internal dependencies: ${imports}`
    ].join('\n');
  });

  const dependencyGraph =
    project.dependencyGraph.length > 0
      ? project.dependencyGraph
          .map(edge => `${edge.from} -> ${edge.to}`)
          .join('\n')
      : '(none)';

  const dependencies =
    Object.keys(project.dependencies).length > 0
      ? Object.entries(project.dependencies)
          .map(([name, version]) => `${name}: ${version}`)
          .join('\n')
      : '(none)';

  const prompt = [
    'You are DocForge, a software documentation assistant.',
    '',
    'Your task is to explain a software project using only the supplied project facts.',
    'Do not invent files, functions, classes, dependencies, behavior, or architecture.',
    'If the supplied information is insufficient to determine something, say so.',
    'Write concise, developer-friendly documentation.',
    '',
    `Project: ${project.workspaceName}`,
    '',
    'Source files:',
    fileSummaries.join('\n\n'),
    '',
    'Dependency graph:',
    dependencyGraph,
    '',
    'Package dependencies:',
    dependencies,
    '',
    'Generate:',
    '1. A concise project overview.',
    '2. A clear explanation of the project architecture.',
    '3. A concise explanation of the role of important source files.',
    '4. Useful descriptions of detected functions and classes.',
    '5. A short setup/dependency explanation.',
    '',
    'Do not output Markdown headings.',
    'Return plain text that DocForge can insert into its documentation model.'
  ].join('\n');

  return {
    projectName: project.workspaceName,
    prompt
  };
}
