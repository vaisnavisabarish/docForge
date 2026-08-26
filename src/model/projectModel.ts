export interface ProjectDependency {
  from: string;
  to: string;
}

export interface ProjectModel {
  workspaceName: string;
  workspacePath: string;
  files: SourceFileModel[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  dependencyGraph: ProjectDependency[];
}

export interface SourceFileModel {
  path: string;
  language: string;
  functions: string[];
  classes: string[];
  methods: string[];
  imports: string[];
  resolvedImports: string[];
  exports: string[];
}