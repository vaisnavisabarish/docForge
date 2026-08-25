export interface ProjectModel {
  workspaceName: string;
  workspacePath: string;
  files: SourceFileModel[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface SourceFileModel {
  path: string;
  language: string;
  functions: string[];
  classes: string[];
  methods: string[];
  imports: string[];
  exports: string[];
}
