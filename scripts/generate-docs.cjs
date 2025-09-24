#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');

const packageConfigs = [
  {
    slug: 'bluesky-api',
    title: 'Bluesky API',
    description: 'Comprehensive wrapper around the Bluesky app.bsky.* endpoints.',
  },
  {
    slug: 'clearsky-api',
    title: 'ClearSky API',
    description: 'Community analytics endpoints exposed by the ClearSky service.',
  },
  {
    slug: 'tenor-api',
    title: 'Tenor API',
    description: 'Helpers for Tenor GIF search and trending media.',
  },
  {
    slug: 'libretranslate-api',
    title: 'LibreTranslate API',
    description: 'Typed client utilities for the LibreTranslate translation service.',
  },
];

const generatedAt = new Date().toISOString();
const documentation = {
  generatedAt,
  packages: [],
};
const packageCatalogues = new Map();

const TYPE_FORMAT_FLAGS = ts.TypeFormatFlags.NoTruncation;
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });

const getRelativePath = (filePath) => path.relative(repoRoot, filePath);

const collectSourceFiles = (directory) => {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') {
        continue;
      }
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.test.ts')) {
      continue;
    }

    if (entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }

  return files;
};

const hasModifier = (node, kind) => Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));

const isExported = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword) || hasModifier(node, ts.SyntaxKind.DefaultKeyword);

const getCommentText = (comment) => {
  if (!comment) {
    return undefined;
  }

  if (typeof comment === 'string') {
    return comment.trim().replace(/^-\s*/, '');
  }

  let text = '';
  for (const part of comment) {
    if (ts.isJSDocText(part)) {
      text += part.text;
    } else {
      text += part.getText();
    }
  }

  const trimmed = text.trim().replace(/^-\s*/, '');
  return trimmed.length > 0 ? trimmed : undefined;
};

const readJsDoc = (node) => {
  const docs = node?.jsDoc ?? [];
  let description;
  const tags = [];

  for (const doc of docs) {
    const comment = getCommentText(doc.comment);
    if (comment && !description) {
      description = comment;
    }

    if (doc.tags) {
      for (const tag of doc.tags) {
        tags.push(tag);
      }
    }
  }

  return { description, tags };
};

const mergeJsDoc = (nodes) => {
  let description;
  const tags = [];

  for (const node of nodes) {
    if (!node) {
      continue;
    }
    const info = readJsDoc(node);
    if (!description && info.description) {
      description = info.description;
    }
    if (info.tags.length > 0) {
      for (const tag of info.tags) {
        tags.push(tag);
      }
    }
  }

  return { description, tags };
};

const stripExportModifier = (text) => text.replace(/^export\s+(?:default\s+)?(declare\s+)?/, '').trim();

const parseTypeDeclaration = (node, sourceFile, filePath, kind) => {
  const name = node.name ? node.name.getText(sourceFile) : undefined;
  if (!name) {
    return null;
  }

  const { description } = mergeJsDoc([node]);
  const signature = stripExportModifier(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));

  return {
    kind,
    name,
    description,
    signature,
    file: getRelativePath(filePath),
  };
};

const buildParameterDocs = (parameters, paramDocs, sourceFile) => {
  const result = [];

  for (const parameter of parameters) {
    const name = parameter.name.getText(sourceFile);
    const type = parameter.type ? parameter.type.getText(sourceFile) : undefined;
    const optional = Boolean(parameter.questionToken) || Boolean(parameter.initializer);
    const defaultValue = parameter.initializer ? parameter.initializer.getText(sourceFile) : undefined;
    const docComment = paramDocs.get(name);

    const entry = {
      name,
      optional,
    };

    if (type) {
      entry.type = type;
    }

    if (docComment) {
      entry.description = docComment;
    }

    if (defaultValue) {
      entry.defaultValue = defaultValue;
    }

    if (parameter.dotDotDotToken) {
      entry.name = `...${entry.name}`;
    }

    result.push(entry);
  }

  return result;
};

const createSignature = (name, parameters, returnType, modifiers) => {
  const modifierText = modifiers.length > 0 ? `${modifiers.join(' ')} ` : '';
  const parameterText = parameters;
  const suffix = returnType ? `: ${returnType}` : '';
  return `${modifierText}${name}(${parameterText})${suffix}`.trim();
};

const parseParametersFromTags = (tags, sourceFile) => {
  const docs = new Map();
  for (const tag of tags) {
    if (ts.isJSDocParameterTag(tag)) {
      const name = tag.name.getText(sourceFile);
      const comment = getCommentText(tag.comment);
      if (comment) {
        docs.set(name, comment);
      }
    }
  }
  return docs;
};

const readReturnTag = (tags) => {
  for (const tag of tags) {
    if (ts.isJSDocReturnTag(tag)) {
      return getCommentText(tag.comment);
    }
  }
  return undefined;
};

const getReturnTypeText = (node, sourceFile, checker) => {
  const signature = checker.getSignatureFromDeclaration(node);
  if (signature) {
    const returnType = checker.getReturnTypeOfSignature(signature);
    return checker.typeToString(returnType, node, TYPE_FORMAT_FLAGS);
  }

  return node.type ? node.type.getText(sourceFile) : 'void';
};

const parseMethod = (method, sourceFile, filePath, checker) => {
  if (!method.name) {
    return null;
  }

  const name = method.name.getText(sourceFile);
  const { description, tags } = mergeJsDoc([method]);
  const paramDocs = parseParametersFromTags(tags, sourceFile);
  const parameters = buildParameterDocs(method.parameters, paramDocs, sourceFile);
  const returnDescription = readReturnTag(tags);
  const modifiers = [];

  if (hasModifier(method, ts.SyntaxKind.AsyncKeyword)) {
    modifiers.push('async');
  }
  if (hasModifier(method, ts.SyntaxKind.StaticKeyword)) {
    modifiers.push('static');
  }

  const parameterText = method.parameters.map((parameter) => parameter.getText(sourceFile)).join(', ');
  const returnType = getReturnTypeText(method, sourceFile, checker);
  const signature = createSignature(name, parameterText, returnType, modifiers);

  return {
    name,
    signature,
    description,
    parameters,
    returns: returnDescription,
    returnType,
    file: getRelativePath(filePath),
  };
};

const parseFunctionLike = (fn, name, sourceFile, filePath, docSources, checker) => {
  const { description, tags } = mergeJsDoc([fn, ...docSources]);
  const paramDocs = parseParametersFromTags(tags, sourceFile);
  const parameters = buildParameterDocs(fn.parameters, paramDocs, sourceFile);
  const returnDescription = readReturnTag(tags);
  const modifiers = [];

  if ((fn.modifiers && hasModifier(fn, ts.SyntaxKind.AsyncKeyword)) || (fn.flags & ts.NodeFlags.Async)) {
    modifiers.push('async');
  }

  const parameterText = fn.parameters.map((parameter) => parameter.getText(sourceFile)).join(', ');
  const returnType = getReturnTypeText(fn, sourceFile, checker);
  const signature = createSignature(`function ${name}`, parameterText, returnType, modifiers);

  return {
    name,
    signature,
    description,
    parameters,
    returns: returnDescription,
    returnType,
    file: getRelativePath(filePath),
  };
};

const parseClass = (node, sourceFile, filePath, checker) => {
  const name = node.name ? node.name.getText(sourceFile) : 'default';
  const { description } = mergeJsDoc([node]);
  const methods = [];

  for (const member of node.members) {
    if (!ts.isMethodDeclaration(member)) {
      continue;
    }

    if (!member.name || hasModifier(member, ts.SyntaxKind.PrivateKeyword) || hasModifier(member, ts.SyntaxKind.ProtectedKeyword)) {
      continue;
    }

    const methodDoc = parseMethod(member, sourceFile, filePath, checker);
    if (methodDoc) {
      methods.push(methodDoc);
    }
  }

  if (methods.length === 0 && !description) {
    return null;
  }

  methods.sort((a, b) => a.name.localeCompare(b.name));

  return {
    name,
    description,
    file: getRelativePath(filePath),
    methods,
  };
};

for (const config of packageConfigs) {
  const packageRoot = path.join(repoRoot, 'packages', config.slug);
  const sourceDirectory = path.join(packageRoot, 'src');
  if (!fs.existsSync(sourceDirectory)) {
    continue;
  }

  const tsconfigPath = path.join(packageRoot, 'tsconfig.json');
  let parsedConfig;

  if (fs.existsSync(tsconfigPath)) {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
      const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
      throw new Error(`Failed to read ${getRelativePath(tsconfigPath)}: ${message}`);
    }

    parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageRoot);
  }

  const compilerOptions = parsedConfig?.options ?? {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
  };

  const fileNames = (parsedConfig?.fileNames ?? collectSourceFiles(sourceDirectory)).filter((fileName) => {
    if (!fileName.startsWith(sourceDirectory)) {
      return false;
    }

    if (fileName.endsWith('.d.ts') || fileName.endsWith('.test.ts')) {
      return false;
    }

    if (fileName.includes(`${path.sep}__tests__${path.sep}`) || fileName.includes('__tests__/')) {
      return false;
    }

    return true;
  });

  if (fileNames.length === 0) {
    continue;
  }

  const program = ts.createProgram({ rootNames: fileNames, options: compilerOptions });
  const checker = program.getTypeChecker();

  const classDocs = [];
  const functionDocs = [];
  const typeDocs = [];
  for (const filePath of fileNames) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      continue;
    }

    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name && isExported(statement)) {
        const classDoc = parseClass(statement, sourceFile, filePath, checker);
        if (classDoc) {
          classDocs.push(classDoc);
        }
        continue;
      }

      if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
        const functionDoc = parseFunctionLike(
          statement,
          statement.name.getText(sourceFile),
          sourceFile,
          filePath,
          [statement],
          checker,
        );
        if (functionDoc) {
          functionDocs.push(functionDoc);
        }
        continue;
      }

      if (ts.isTypeAliasDeclaration(statement) && isExported(statement)) {
        const typeDoc = parseTypeDeclaration(statement, sourceFile, filePath, 'alias');
        if (typeDoc) {
          typeDocs.push(typeDoc);
        }
        continue;
      }

      if (ts.isInterfaceDeclaration(statement) && isExported(statement)) {
        const typeDoc = parseTypeDeclaration(statement, sourceFile, filePath, 'interface');
        if (typeDoc) {
          typeDocs.push(typeDoc);
        }
        continue;
      }

      if (ts.isEnumDeclaration(statement) && isExported(statement)) {
        const typeDoc = parseTypeDeclaration(statement, sourceFile, filePath, 'enum');
        if (typeDoc) {
          typeDocs.push(typeDoc);
        }
        continue;
      }

      if (ts.isVariableStatement(statement) && isExported(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
            continue;
          }

          const initializer = declaration.initializer;
          if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
            const functionDoc = parseFunctionLike(
              initializer,
              declaration.name.getText(sourceFile),
              sourceFile,
              filePath,
              [declaration, statement],
              checker,
            );
            if (functionDoc) {
              functionDocs.push(functionDoc);
            }
          }
        }
      }
    }
  }

  classDocs.sort((a, b) => a.name.localeCompare(b.name));
  functionDocs.sort((a, b) => a.name.localeCompare(b.name));
  typeDocs.sort((a, b) => a.name.localeCompare(b.name));

  const packageDoc = {
    slug: config.slug,
    title: config.title,
    description: config.description,
    classes: classDocs,
    functions: functionDocs,
    types: typeDocs,
  };

  documentation.packages.push(packageDoc);
  packageCatalogues.set(config.slug, {
    generatedAt,
    packages: [packageDoc],
  });
}

const outputDirectories = [
  path.join(repoRoot, 'apps/docs/src/data'),
  path.join(repoRoot, 'apps/docs/public/data'),
];

for (const directory of outputDirectories) {
  fs.mkdirSync(directory, { recursive: true });
}

const writeOutput = (fileName, payload) => {
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  for (const directory of outputDirectories) {
    const filePath = path.join(directory, fileName);
    fs.writeFileSync(filePath, json, 'utf8');
  }
};

writeOutput('docs.json', documentation);

for (const [slug, packageDoc] of packageCatalogues.entries()) {
  writeOutput(`${slug}.json`, packageDoc);
}

console.log(`Generated documentation for ${documentation.packages.length} packages.`);
