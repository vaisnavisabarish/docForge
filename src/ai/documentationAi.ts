import { ProjectModel } from '../model/projectModel';
import { DocumentationModel } from '../documentation/documentationModel';
import { generateWithLanguageModel } from './languageModel';

export interface DocumentationAiRequest {
  projectName: string;
  prompt: string;
}

export interface AiFileDocumentation {
  path: string;
  purpose: string;
  functions: Record<string, string>;
  classes: Record<string, string>;
}

export interface AiDocumentationContent {
  overview: string;
  architecture: string;
  setup: string;
  files: AiFileDocumentation[];
}

export function buildDocumentationAiRequest(
  project: ProjectModel
): DocumentationAiRequest {
  const fileSummaries = project.files.map(file => {
    const functions =
      file.functions.length > 0 ? file.functions.join(', ') : '(none)';

    const classes =
      file.classes.length > 0 ? file.classes.join(', ') : '(none)';

    const methods =
      file.methods.length > 0 ? file.methods.join(', ') : '(none)';

    const imports =
      file.resolvedImports.length > 0
        ? file.resolvedImports.join(', ')
        : '(none)';

    return [
      `File: ${file.path}`,
      `Language: ${file.language}`,
      `Functions: ${functions}`,
      `Classes: ${classes}`,
      `Methods: ${methods}`,
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
    'Generate documentation explanations using ONLY the supplied project facts.',
    'Never invent files, functions, classes, dependencies, behavior, architecture, or technologies.',
    'Do not infer runtime behavior, UI behavior, business logic, entry-point status, or file purpose unless the supplied facts explicitly establish it.',
    '',
    `Project: ${project.workspaceName}`,
    '',
    'SOURCE FILE FACTS',
    '=================',
    fileSummaries.join('\n\n'),
    '',
    'DEPENDENCY GRAPH',
    '================',
    dependencyGraph,
    '',
    'PACKAGE DEPENDENCIES',
    '====================',
    dependencies,
    '',
    'Generate:',
    '1. A concise project overview.',
    '2. A clear explanation of the project architecture.',
    '3. A concise explanation of the role of important source files.',
    '4. Useful descriptions of detected functions and classes.',
    '5. A short setup/dependency explanation.',
    '',
    'Return ONLY valid JSON.',
    'Do not use Markdown code fences.',
    'Do not include commentary before or after the JSON.',
    '',
    'The architecture field must explain the supplied dependency graph in prose.',
    'DocForge will separately preserve the exact dependency relationships.',
    '',
    'The JSON must have exactly this structure:',
    '{',
    '  "overview": "string",',
    '  "architecture": "string",',
    '  "setup": "string",',
    '  "files": [',
    '    {',
    '      "path": "exact source file path",',
    '      "purpose": "string",',
    '      "functions": {',
    '        "functionName": "description"',
    '      },',
    '      "classes": {',
    '        "className": "description"',
    '      }',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Include every supplied source file exactly once.',
    '- Preserve every file path exactly as supplied.',
    '- Include every detected function in its file.',
    '- Include every detected class in its file.',
    '- If a file has no functions, return an empty functions object.',
    '- If a file has no classes, return an empty classes object.',
    '- Keep descriptions concise and developer-friendly.',
    '- Do not include dependency lists inside file descriptions.',
    '- Do not invent class methods or function behavior.',
    '- Treat file names, function names, and dependency relationships as structural facts, not proof of runtime behavior.',
    '- Do not claim that a function renders, displays, initializes, authenticates, fetches, stores, calculates, or performs any other behavior unless that behavior is explicitly present in the supplied facts.',
    '- If the supplied facts are insufficient to determine a purpose or behavior, explicitly say that the available project facts are insufficient.',
    '- The architecture explanation must be based only on the supplied dependency graph and file facts.',
    '- The setup explanation must be based on the supplied package dependencies.'  ].join('\n');

  return {
    projectName: project.workspaceName,
    prompt
  };
}

function stripMarkdownCodeFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function validateAiDocumentation(
  value: unknown,
  project: ProjectModel
): AiDocumentationContent {
  if (!value || typeof value !== 'object') {
    throw new Error('AI returned an invalid documentation object.');
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.overview !== 'string' ||
    typeof candidate.architecture !== 'string' ||
    typeof candidate.setup !== 'string' ||
    !Array.isArray(candidate.files)
  ) {
    throw new Error('AI documentation response has an invalid structure.');
  }

  const filesByPath = new Map(
    project.files.map(file => [file.path, file])
  );

  const aiFiles: AiFileDocumentation[] = [];

  for (const fileValue of candidate.files) {
    if (!fileValue || typeof fileValue !== 'object') {
      continue;
    }

    const file = fileValue as Record<string, unknown>;

    if (typeof file.path !== 'string') {
      continue;
    }

    const projectFile = filesByPath.get(file.path);

    if (!projectFile) {
      continue;
    }

    const functions =
      file.functions && typeof file.functions === 'object'
        ? Object.fromEntries(
            Object.entries(file.functions as Record<string, unknown>)
              .filter(
                ([name, description]) =>
                  projectFile.functions.includes(name) &&
                  typeof description === 'string'
              )
              .map(([name, description]) => [
                name,
                description as string
              ])
          )
        : {};

    const classes =
      file.classes && typeof file.classes === 'object'
        ? Object.fromEntries(
            Object.entries(file.classes as Record<string, unknown>)
              .filter(
                ([name, description]) =>
                  projectFile.classes.includes(name) &&
                  typeof description === 'string'
              )
              .map(([name, description]) => [
                name,
                description as string
              ])
          )
        : {};

    aiFiles.push({
      path: file.path,
      purpose:
        typeof file.purpose === 'string'
          ? file.purpose
          : `Source file containing ${projectFile.language} code.`,
      functions,
      classes
    });
  }

  return {
    overview: candidate.overview,
    architecture: candidate.architecture,
    setup: candidate.setup,
    files: aiFiles
  };
}

export async function generateAiDocumentation(
  project: ProjectModel
): Promise<AiDocumentationContent> {
  const request = buildDocumentationAiRequest(project);
  const response = await generateWithLanguageModel(request.prompt);

  const cleanedResponse = stripMarkdownCodeFence(response);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanedResponse);
  } catch {
    throw new Error(
      'The AI returned a response that was not valid JSON.'
    );
  }

  return validateAiDocumentation(parsed, project);
}

export function applyAiDocumentation(
  documentation: DocumentationModel,
  aiDocumentation: AiDocumentationContent
): DocumentationModel {
  const aiFiles = new Map(
    aiDocumentation.files.map(file => [file.path, file])
  );

  return {
    ...documentation,
    overview: aiDocumentation.overview,
    architecture: aiDocumentation.architecture,
    setup: aiDocumentation.setup,
    files: documentation.files.map(file => {
      const aiFile = aiFiles.get(file.path);

      if (!aiFile) {
        return file;
      }

      return {
        ...file,
        purpose: file.purpose,
        functions: file.functions.map(fn => ({
          ...fn
        })),
        classes: file.classes.map(cls => ({
          ...cls
        }))
      };
    })
  };
}
