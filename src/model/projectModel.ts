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
export interface ProjectSummary {
  totalFiles: number;
  languageCounts: Record<string, number>;
  entryPoints: string[];
  classes: string[];
  functions: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  dependencyRelationships: ProjectDependency[];
}