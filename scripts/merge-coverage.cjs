const fs = require('fs');
const path = require('path');
const { createCoverageMap, createFileCoverage } = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const rootDir = process.cwd();
const coverageDirName = 'coverage';
const outputPath = path.join(rootDir, coverageDirName, 'lcov.info');

const coverageEntries = [];

function walk(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      walk(entryPath);
      continue;
    }

    if (
      entry.isFile() &&
      entry.name === 'lcov.info' &&
      path.basename(path.dirname(entryPath)) === coverageDirName &&
      path.resolve(entryPath) !== outputPath
    ) {
      const coverageDir = path.dirname(entryPath);
      const workspaceRoot = path.dirname(coverageDir);
      const relativePrefix = path.relative(rootDir, workspaceRoot).replace(/\\/g, '/');
      const prefix = relativePrefix && relativePrefix !== '.' ? relativePrefix : '';
      const coverageJsonPath = path.join(coverageDir, 'coverage-final.json');

      coverageEntries.push({
        lcovPath: entryPath,
        coverageJsonPath,
        prefix,
      });
    }
  }
}

walk(rootDir);
coverageEntries.sort((a, b) => a.lcovPath.localeCompare(b.lcovPath));

if (coverageEntries.length === 0) {
  throw new Error('No coverage reports were found to merge.');
}

const mergedLines = [];

for (const entry of coverageEntries) {
  const { lcovPath, prefix } = entry;
  const reportContent = fs.readFileSync(lcovPath, 'utf8');
  const lines = reportContent.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      const originalPath = line.slice(3).trim();
      const normalized = normalizeSourcePath(originalPath, prefix);
      mergedLines.push(`SF:${normalized}`);
    } else {
      mergedLines.push(line);
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${mergedLines.join('\n')}\n`);

generateHtmlReportFromCoverage(coverageEntries, outputPath);

function normalizeSourcePath(sourcePath, prefix) {
  if (!sourcePath) {
    return sourcePath;
  }

  let sanitized = sourcePath.replace(/\\/g, '/');

  if (sanitized.startsWith('file://')) {
    sanitized = sanitized.slice('file://'.length);
  }

  if (isAbsolutePath(sanitized)) {
    return normalizeAbsolutePath(sanitized);
  }

  const baseDir = path.resolve(rootDir, prefix || '');
  const absoluteFromPrefix = path.resolve(baseDir, sanitized);

  if (isWithinPath(rootDir, absoluteFromPrefix)) {
    return formatRelative(path.relative(rootDir, absoluteFromPrefix));
  }

  const combined = prefix ? `${prefix}/${sanitized}` : sanitized;
  const normalizedCombined = path.posix.normalize(combined);

  if (!normalizedCombined || normalizedCombined === '.') {
    return './';
  }

  if (normalizedCombined.startsWith('../')) {
    return normalizedCombined;
  }

  return normalizedCombined.startsWith('./') ? normalizedCombined : `./${normalizedCombined}`;
}

function generateHtmlReportFromCoverage(entries, mergedLcovPath) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }

  const coverageMap = createCoverageMap({});
  let hasCoverage = false;

  for (const entry of entries) {
    const { coverageJsonPath, lcovPath, prefix } = entry;
    if (coverageJsonPath && fs.existsSync(coverageJsonPath)) {
      const normalizedData = normalizeCoverageJson(coverageJsonPath, prefix);
      coverageMap.merge(normalizedData);
      if (!hasCoverage) {
        hasCoverage = Object.keys(normalizedData).length > 0;
      }
      continue;
    }

    if (!fs.existsSync(lcovPath)) {
      continue;
    }

    const lcovContent = fs.readFileSync(lcovPath, 'utf8');
    const records = parseLcov(lcovContent, prefix);
    if (records.length === 0) {
      continue;
    }

    mergeLcovRecordsIntoCoverageMap(records, coverageMap);
    hasCoverage = true;
  }

  if (!hasCoverage || coverageMap.files().length === 0) {
    return;
  }

  const coverageDir = path.dirname(mergedLcovPath);
  const coverageJsonPath = path.join(coverageDir, 'coverage-final.json');
  fs.writeFileSync(coverageJsonPath, `${JSON.stringify(coverageMap.toJSON(), null, 2)}\n`);

  const context = libReport.createContext({
    dir: coverageDir,
    defaultSummarizer: 'pkg',
    coverageMap,
    sourceFinder: createSourceFinder(),
  });

  reports.create('html', { skipEmpty: false, skipFull: false }).execute(context);

  copyCoverageStyles(coverageDir);
}

function parseLcov(content, prefix) {
  const records = [];
  const lines = content.split(/\r?\n/);
  let currentRecord = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('SF:')) {
      if (currentRecord) {
        records.push(currentRecord);
      }

      const filePath = normalizeSourcePath(line.slice(3).trim(), prefix);
      currentRecord = {
        path: filePath,
        functions: [],
        functionQueue: new Map(),
        lines: new Map(),
        branches: new Map(),
      };
      continue;
    }

    if (!currentRecord) {
      continue;
    }

    if (line === 'end_of_record') {
      records.push(currentRecord);
      currentRecord = null;
      continue;
    }

    if (line.startsWith('FN:')) {
      const data = line.slice(3);
      const commaIndex = data.indexOf(',');
      if (commaIndex === -1) {
        continue;
      }

      const lineNumber = Number.parseInt(data.slice(0, commaIndex), 10);
      const name = data.slice(commaIndex + 1);
      const fn = { line: Number.isNaN(lineNumber) ? 0 : lineNumber, name, hits: 0 };

      currentRecord.functions.push(fn);
      if (!currentRecord.functionQueue.has(name)) {
        currentRecord.functionQueue.set(name, []);
      }
      currentRecord.functionQueue.get(name).push(fn);
      continue;
    }

    if (line.startsWith('FNDA:')) {
      const data = line.slice(5);
      const commaIndex = data.indexOf(',');
      if (commaIndex === -1) {
        continue;
      }

      const hits = Number.parseInt(data.slice(0, commaIndex), 10);
      const name = data.slice(commaIndex + 1);
      const queue = currentRecord.functionQueue.get(name);
      if (queue && queue.length > 0) {
        queue.shift().hits = Number.isNaN(hits) ? 0 : hits;
      } else {
        currentRecord.functions.push({ line: 0, name, hits: Number.isNaN(hits) ? 0 : hits });
      }
      continue;
    }

    if (line.startsWith('DA:')) {
      const data = line.slice(3);
      const parts = data.split(',');
      if (parts.length < 2) {
        continue;
      }

      const lineNumber = Number.parseInt(parts[0], 10);
      const hitCount = Number.parseInt(parts[1], 10);
      if (!Number.isNaN(lineNumber)) {
        currentRecord.lines.set(lineNumber, Number.isNaN(hitCount) ? 0 : hitCount);
      }
      continue;
    }

    if (line.startsWith('BRDA:')) {
      const data = line.slice(5);
      const parts = data.split(',');
      if (parts.length < 4) {
        continue;
      }

      const lineNumber = Number.parseInt(parts[0], 10);
      const blockNumber = parts[1];
      const branchNumber = parts[2];
      const taken = parts[3] === '-' ? 0 : Number.parseInt(parts[3], 10);

      if (Number.isNaN(lineNumber)) {
        continue;
      }

      const key = `${lineNumber}:${blockNumber}`;
      if (!currentRecord.branches.has(key)) {
        currentRecord.branches.set(key, {
          line: lineNumber,
          block: blockNumber,
          locations: [],
          hits: [],
        });
      }

      const branchGroup = currentRecord.branches.get(key);
      branchGroup.locations.push({
        line: lineNumber,
        block: branchNumber,
      });
      branchGroup.hits.push(Number.isNaN(taken) ? 0 : taken);
      continue;
    }
  }

  if (currentRecord) {
    records.push(currentRecord);
  }

  return records;
}

function createFileCoverageFromRecord(record) {
  if (!record || !record.path) {
    return null;
  }

  const fileCoverage = createFileCoverage(record.path);
  const { statementMap, fnMap, branchMap, s, f, b } = fileCoverage.data;

  const sortedLines = Array.from(record.lines.entries()).sort((a, b) => a[0] - b[0]);
  let statementIndex = 0;
  for (const [lineNumber, hitCount] of sortedLines) {
    const id = String(statementIndex++);
    statementMap[id] = createLineLocation(lineNumber);
    s[id] = hitCount;
  }

  let functionIndex = 0;
  for (const fn of record.functions) {
    const id = String(functionIndex++);
    const location = createLineLocation(fn.line);
    fnMap[id] = {
      name: fn.name,
      decl: location,
      loc: location,
      line: fn.line,
    };
    f[id] = fn.hits;
  }

  let branchIndex = 0;
  for (const branchGroup of record.branches.values()) {
    const id = String(branchIndex++);
    const baseLocation = createLineLocation(branchGroup.line);
    branchMap[id] = {
      line: branchGroup.line,
      type: 'branch',
      locations: branchGroup.locations.map(() => createLineLocation(branchGroup.line)),
      loc: baseLocation,
    };
    b[id] = branchGroup.hits;
  }

  return fileCoverage;
}

function createLineLocation(lineNumber) {
  const line = Number.isNaN(lineNumber) ? 0 : lineNumber;
  return {
    start: { line, column: 0 },
    end: { line, column: 0 },
  };
}

function createSourceFinder() {
  return (filePath) => {
    const normalized = filePath.startsWith('./') ? filePath.slice(2) : filePath;
    const absolutePath = path.resolve(rootDir, normalized);

    if (!fs.existsSync(absolutePath)) {
      return `// Source for ${filePath} is not available.`;
    }

    return fs.readFileSync(absolutePath, 'utf8');
  };
}

function copyCoverageStyles(destinationDir) {
  const stylesDir = path.join(rootDir, 'coverage-styles');
  if (!fs.existsSync(stylesDir)) {
    return;
  }

  const styleFiles = fs
    .readdirSync(stylesDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.css'));

  for (const fileName of styleFiles) {
    const sourcePath = path.join(stylesDir, fileName);
    const targetPath = path.join(destinationDir, fileName);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function mergeLcovRecordsIntoCoverageMap(records, coverageMap) {
  for (const record of records) {
    const fileCoverage = createFileCoverageFromRecord(record);
    if (fileCoverage) {
      coverageMap.merge(fileCoverage);
    }
  }
}

function normalizeCoverageJson(coverageJsonPath, prefix) {
  const content = fs.readFileSync(coverageJsonPath, 'utf8');
  let data;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse coverage JSON at ${coverageJsonPath}: ${error.message}`);
  }

  const normalized = {};

  for (const [originalPath, fileData] of Object.entries(data || {})) {
    if (!fileData || typeof fileData !== 'object') {
      continue;
    }

    const normalizedPath = normalizeSourcePath(fileData.path || originalPath, prefix);
    const cloned = cloneFileCoverageData(fileData, normalizedPath, prefix);
    normalized[normalizedPath] = cloned;
  }

  return normalized;
}

function cloneFileCoverageData(fileData, normalizedPath, prefix) {
  const cloned = {
    ...fileData,
    path: normalizedPath,
    statementMap: cloneStatementMap(fileData.statementMap),
    fnMap: cloneFunctionMap(fileData.fnMap),
    branchMap: cloneBranchMap(fileData.branchMap),
    s: { ...(fileData.s || {}) },
    f: { ...(fileData.f || {}) },
    b: cloneBranchHits(fileData.b),
  };

  if (fileData.inputSourceMap) {
    cloned.inputSourceMap = {
      ...fileData.inputSourceMap,
      sources: Array.isArray(fileData.inputSourceMap.sources)
        ? fileData.inputSourceMap.sources.map((source) => normalizeSourcePath(source, prefix))
        : fileData.inputSourceMap.sources,
    };
  }

  return cloned;
}

function cloneStatementMap(statementMap = {}) {
  const cloned = {};
  for (const [key, value] of Object.entries(statementMap)) {
    cloned[key] = cloneLocation(value);
  }
  return cloned;
}

function cloneFunctionMap(fnMap = {}) {
  const cloned = {};
  for (const [key, value] of Object.entries(fnMap)) {
    cloned[key] = {
      ...value,
      decl: cloneLocation(value?.decl),
      loc: cloneLocation(value?.loc),
    };
  }
  return cloned;
}

function cloneBranchMap(branchMap = {}) {
  const cloned = {};
  for (const [key, value] of Object.entries(branchMap)) {
    cloned[key] = {
      ...value,
      loc: cloneLocation(value?.loc),
      locations: Array.isArray(value?.locations)
        ? value.locations.map((location) => cloneLocation(location))
        : [],
    };
  }
  return cloned;
}

function cloneBranchHits(branchHits = {}) {
  const cloned = {};
  for (const [key, value] of Object.entries(branchHits)) {
    cloned[key] = Array.isArray(value) ? [...value] : value;
  }
  return cloned;
}

function cloneLocation(location) {
  if (!location) {
    return location;
  }

  return {
    start: { ...location.start },
    end: { ...location.end },
  };
}

function isAbsolutePath(p) {
  return Boolean(p) && (p.startsWith('/') || /^[a-zA-Z]:\//.test(p));
}

function convertToOsPath(p) {
  if (/^[a-zA-Z]:\//.test(p)) {
    return p;
  }

  return path.resolve('/', p.replace(/^\//, ''));
}

function normalizeAbsolutePath(absolutePath) {
  const osPath = convertToOsPath(absolutePath);
  if (isWithinPath(rootDir, osPath)) {
    return formatRelative(path.relative(rootDir, osPath));
  }

  return absolutePath.replace(/\\/g, '/');
}

function formatRelative(relativePath) {
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));

  if (!normalized || normalized === '.') {
    return './';
  }

  return normalized.startsWith('./') ? normalized : `./${normalized}`;
}

function isWithinPath(baseDir, targetPath) {
  const relative = path.relative(baseDir, targetPath);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}
