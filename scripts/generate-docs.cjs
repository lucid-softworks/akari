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

const documentation = {
  generatedAt: new Date().toISOString(),
  packages: [],
};

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

const parseMethod = (method, sourceFile, filePath) => {
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
  const returnType = method.type ? method.type.getText(sourceFile) : 'void';
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

const parseFunctionLike = (fn, name, sourceFile, filePath, docSources) => {
  const { description, tags } = mergeJsDoc([fn, ...docSources]);
  const paramDocs = parseParametersFromTags(tags, sourceFile);
  const parameters = buildParameterDocs(fn.parameters, paramDocs, sourceFile);
  const returnDescription = readReturnTag(tags);
  const modifiers = [];

  if ((fn.modifiers && hasModifier(fn, ts.SyntaxKind.AsyncKeyword)) || (fn.flags & ts.NodeFlags.Async)) {
    modifiers.push('async');
  }

  const parameterText = fn.parameters.map((parameter) => parameter.getText(sourceFile)).join(', ');
  const returnType = fn.type ? fn.type.getText(sourceFile) : 'void';
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

const parseClass = (node, sourceFile, filePath) => {
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

    const methodDoc = parseMethod(member, sourceFile, filePath);
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
  const sourceDirectory = path.join(repoRoot, 'packages', config.slug, 'src');
  if (!fs.existsSync(sourceDirectory)) {
    continue;
  }

  const classDocs = [];
  const functionDocs = [];
  const files = collectSourceFiles(sourceDirectory);

  for (const filePath of files) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name && isExported(statement)) {
        const classDoc = parseClass(statement, sourceFile, filePath);
        if (classDoc) {
          classDocs.push(classDoc);
        }
        continue;
      }

      if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
        const functionDoc = parseFunctionLike(statement, statement.name.getText(sourceFile), sourceFile, filePath, [statement]);
        if (functionDoc) {
          functionDocs.push(functionDoc);
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
            const functionDoc = parseFunctionLike(initializer, declaration.name.getText(sourceFile), sourceFile, filePath, [declaration, statement]);
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

  documentation.packages.push({
    slug: config.slug,
    title: config.title,
    description: config.description,
    classes: classDocs,
    functions: functionDocs,
  });
}

const outputPath = path.join(repoRoot, 'apps/docs/src/data/docs.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(documentation, null, 2)}\n`, 'utf8');

console.log(`Generated documentation for ${documentation.packages.length} packages.`);
