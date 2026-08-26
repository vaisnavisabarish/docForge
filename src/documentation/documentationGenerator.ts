import { ProjectModel } from '../model/projectModel';
import {
  DocumentationClass,
  DocumentationFile,
  DocumentationFunction,
  DocumentationModel
} from './documentationModel';

export function generateDocumentation(
  project: ProjectModel
): DocumentationModel {
  const files: DocumentationFile[] = project.files.map(file => {
    const functions: DocumentationFunction[] = file.functions.map(name => ({
      name,
      description: `Function defined in ${file.path}.`
    }));

    const classes: DocumentationClass[] = file.classes.map(name => ({
      name,
      description: `Class defined in ${file.path}.`,
      methods: file.methods
    }));

    return {
      path: file.path,
      purpose: `Source file containing ${file.language} code.`,
      functions,
      classes,
      dependencies: file.resolvedImports
    };
  });

  const architecture =
    project.dependencyGraph.length > 0
      ? project.dependencyGraph
          .map(edge => `${edge.from} -> ${edge.to}`)
          .join('\n')
      : 'No internal file dependencies detected.';

  const setupDependencies = Object.keys(project.dependencies);

  const setup =
    setupDependencies.length > 0
      ? `Install the project dependencies: ${setupDependencies.join(', ')}.`
      : 'No package dependencies were detected.';

  return {
    projectName: project.workspaceName,
    overview:
      `This project contains ${project.files.length} supported source files.`,
    architecture,
    setup,
    files
  };
}
