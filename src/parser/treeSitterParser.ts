import { createRequire } from 'module';
import { Language, Node, Parser } from 'web-tree-sitter';

export interface JavaScriptStructure {
  functions: string[];
  classes: string[];
  methods: string[];
  imports: string[];
  exports: string[];
}

type SupportedLanguage = 'javascript' | 'typescript' | 'tsx';

const moduleResolver = createRequire(__filename);
const grammarPaths: Record<SupportedLanguage, string> = {
  javascript: moduleResolver.resolve('tree-sitter-javascript/tree-sitter-javascript.wasm'),
  typescript: moduleResolver.resolve('tree-sitter-typescript/tree-sitter-typescript.wasm'),
  tsx: moduleResolver.resolve('tree-sitter-typescript/tree-sitter-tsx.wasm')
};

const parserPromises: Record<SupportedLanguage, Promise<Parser>> = {} as any;

async function getParser(language: SupportedLanguage): Promise<Parser> {
  if (!parserPromises[language]) {
    parserPromises[language] = (async () => {
      await Parser.init();
      const grammarLanguage = await Language.load(grammarPaths[language]);
      const parser = new Parser();
      parser.setLanguage(grammarLanguage);
      return parser;
    })();
  }

  return parserPromises[language];
}

function nodeName(node: Node): string {
  return node.childForFieldName('name')?.text ?? node.text;
}

async function extractStructure(source: string, language: SupportedLanguage): Promise<JavaScriptStructure> {
  const parser = await getParser(language);
  const tree = parser.parse(source);

  if (!tree) {
    return {
      functions: [],
      classes: [],
      methods: [],
      imports: [],
      exports: []
    };
  }

  try {
    const root = tree.rootNode;
    const classNodes = root.descendantsOfType('class_declaration');

    return {
      functions: root.descendantsOfType('function_declaration').map(nodeName),
      classes: classNodes.map(nodeName),
      methods: classNodes.flatMap(classNode =>
        classNode.descendantsOfType('method_definition').map(nodeName)
      ),
      imports: root.descendantsOfType('import_statement').map(node => node.text),
      exports: root.descendantsOfType('export_statement').map(node => node.text)
    };
  } finally {
    tree.delete();
  }
}

/** Parse source code in the specified language and return its structural elements. */
export async function parseSource(
  source: string,
  language: 'javascript' | 'typescript' | 'tsx'
): Promise<JavaScriptStructure> {
  return extractStructure(source, language);
}

/** Parse JavaScript source and return its top-level structural elements. */
export async function parseJavaScript(source: string): Promise<JavaScriptStructure> {
  return parseSource(source, 'javascript');
}
