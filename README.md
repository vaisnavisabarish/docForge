# DocForge

DocForge is a VS Code extension for analyzing software projects and generating developer documentation from the codebase.

## Features

- Analyze a project repository directly from VS Code
- Detect supported source files
- Detect functions and classes
- Resolve internal file dependencies
- Build a dependency graph
- Detect package dependencies from `package.json`
- Generate structured Markdown documentation
- Optionally enhance documentation using an available VS Code language model
- Fall back to deterministic documentation when AI is unavailable
- Keep detected source-code facts protected from unsupported AI-generated claims

## Installation

### Install from VSIX

1. Download the latest `docforge-*.vsix` file from the project's GitHub Releases page.
2. Open VS Code.
3. Open the Extensions view with `Ctrl+Shift+X`.
4. Click the `...` menu in the Extensions view.
5. Select **Install from VSIX...**
6. Select the downloaded `.vsix` file.
7. Reload VS Code if prompted.

## Usage

1. Open the project you want to document in VS Code.
2. Open the Command Palette with `Ctrl+Shift+P`.
3. Run:

   **DocForge: Analyze Project**

4. Then run:

   **DocForge: Generate Documentation**

DocForge analyzes the project structure and generates a Markdown documentation file containing the project overview, architecture, dependency graph, setup information, and source-file details.

## AI Documentation

When a compatible VS Code language model is available, DocForge can use it to improve the explanatory prose in the generated documentation.

AI-generated content is constrained by the facts collected during project analysis. Detected files, functions, classes, dependencies, and dependency relationships are preserved by DocForge rather than being accepted blindly from the model.

If an AI model is unavailable or returns an unusable response, DocForge falls back to deterministic documentation generation.

## Supported Analysis

The current implementation includes JavaScript and TypeScript parsing and repository analysis using Tree-sitter-based parsing.

## Requirements

- Visual Studio Code
- A DocForge `.vsix` release

For normal VSIX installation and use, users do not need to clone the DocForge source repository or install its development dependencies.

## Development

Clone the repository and install dependencies:

```bash
npm install