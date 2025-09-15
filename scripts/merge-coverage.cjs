const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const coverageDirName = 'coverage';
const outputPath = path.join(rootDir, coverageDirName, 'lcov.info');

const coverageFiles = [];

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
      coverageFiles.push(entryPath);
    }
  }
}

walk(rootDir);
coverageFiles.sort();

if (coverageFiles.length === 0) {
  throw new Error('No coverage reports were found to merge.');
}

const mergedLines = [];

for (const filePath of coverageFiles) {
  const reportContent = fs.readFileSync(filePath, 'utf8');
  const lines = reportContent.split(/\r?\n/);
  const workspaceRoot = path.dirname(path.dirname(filePath));
  const relativePrefix = path.relative(rootDir, workspaceRoot).replace(/\\/g, '/');
  const prefix = relativePrefix && relativePrefix !== '.' ? `${relativePrefix}/` : '';

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

function normalizeSourcePath(sourcePath, prefix) {
  if (!sourcePath) {
    return sourcePath;
  }

  let sanitized = sourcePath.replace(/\\/g, '/');

  if (sanitized.startsWith('./')) {
    sanitized = sanitized.slice(2);
  }

  if (sanitized.startsWith('/')) {
    return sanitized;
  }

  const combined = `${prefix}${sanitized}`
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
  if (combined.startsWith('./')) {
    return combined;
  }

  return `./${combined}`;
}
