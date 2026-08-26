export interface DocumentationModel {
  projectName: string;
  overview: string;
  architecture: string;
  setup: string;
  files: DocumentationFile[];
}

export interface DocumentationFile {
  path: string;
  purpose: string;
  functions: DocumentationFunction[];
  classes: DocumentationClass[];
  dependencies: string[];
}

export interface DocumentationFunction {
  name: string;
  description: string;
}

export interface DocumentationClass {
  name: string;
  description: string;
  methods: string[];
}
