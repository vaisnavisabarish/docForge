import { createRequire } from 'module';
import { Language, Node, Parser } from 'web-tree-sitter';

export interface JavaScriptStructure {
  functions: string[];
  classes: string[];
  methods: string[];
  imports: string[];
  exports: string[];
}

const moduleResolver = createRequire(__filename);
const javascriptGrammarPath = moduleResolver.resolve('tree-sitter-javascript/tree-sitter-javascript.wasm');

let parserPromise: Promise<Parser> | undefined;

async function getParser(): Promise<Parser> {
  if (!parserPromise) {
    parserPromise = (async () => {
      await Parser.init();
      const language = await Language.load(javascriptGrammarPath);
      const parser = new Parser();
      parser.setLanguage(language);
      return parser;
    })();
  }

  return parserPromise;
}

function nodeName(node: Node): string {
  return node.childForFieldName('name')?.text ?? node.text;
}

/** Parse JavaScript source and return its top-level structural elements. */
export async function parseJavaScript(source: string): Promise<JavaScriptStructure> {
  const parser = await getParser();
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
