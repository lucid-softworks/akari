import { readFile } from 'node:fs/promises';

const workspaceRoot = process.cwd().replace(/\\/g, '/');

const marker = '<!-- coverage-report -->';
const token = process.env.GITHUB_TOKEN;
const summaryPath = process.env.COVERAGE_SUMMARY_PATH;
const lcovPath = process.env.LCOV_PATH;
const artifactName = process.env.ARTIFACT_NAME;
const prNumber = process.env.PR_NUMBER;
const repository = process.env.GITHUB_REPOSITORY;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

if (!token) {
  throw new Error('GITHUB_TOKEN is required.');
}

if (!lcovPath) {
  throw new Error('LCOV_PATH is required.');
}

if (!repository) {
  throw new Error('GITHUB_REPOSITORY is required.');
}

if (!prNumber) {
  throw new Error('PR_NUMBER is required when reporting coverage.');
}

const [owner, repo] = repository.split('/');

const { totals, files } = await loadCoverage();

const summaryMetrics = [
  { key: 'lines', label: 'Lines' },
  { key: 'statements', label: 'Statements' },
  { key: 'branches', label: 'Branches' },
  { key: 'functions', label: 'Functions' },
];

const perFileMetrics = [
  { key: 'branches', label: 'Branches' },
  { key: 'functions', label: 'Funcs' },
  { key: 'lines', label: 'Lines' },
];

const rows = [];

for (const metric of summaryMetrics) {
  const data = totals[metric.key];
  if (!data) {
    continue;
  }

  const covered = formatNumber(data.covered);
  const totalCount = formatNumber(data.total);
  const pct = formatPercent(data.pct);
  rows.push(`| ${metric.label} | ${covered} | ${totalCount} | ${pct} |`);
}

if (rows.length === 0) {
  throw new Error('Coverage summary did not include any totals to report.');
}

const table = [
  '| Metric | Covered | Total | % |',
  '| ------ | ------- | ----- | - |',
  ...rows,
].join('\n');

let body = `${marker}\n### Coverage Report\n\n${table}`;

if (artifactName) {
  body += `\n\nThe full HTML coverage report is available in the **${artifactName}** workflow artifact.`;
}

if (Array.isArray(files) && files.length > 0) {
  const fileRows = [];

  const sortedFiles = [...files]
    .map((file) => ({
      ...file,
      path: typeof file.path === 'string' ? file.path : '',
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  let currentDirectory = null;

  for (const file of sortedFiles) {
    const { directory, fileName } = splitPath(file.path);
    const directoryLabel = directory ? `./${directory}/` : './';

    if (directory !== currentDirectory) {
      currentDirectory = directory;
      fileRows.push(`| **${escapeTableCell(directoryLabel)}** | — | — | — | — |`);
    }

    const cells = perFileMetrics
      .map((metric) => formatCoverageCell(file[metric.key]))
      .join(' | ');
    const uncoveredLines = formatUncoveredLines(file.uncoveredLines);

    fileRows.push(
      `| ${indentFileName(fileName)} | ${cells} | ${escapeTableCell(uncoveredLines)} |`,
    );
  }

  if (fileRows.length > 0) {
    const fileTable = [
      '| File | Branches | Funcs | Lines | Uncovered Lines |',
      '| ---- | -------- | ----- | ----- | --------------- |',
      ...fileRows,
    ].join('\n');

    body += `\n\n<details>\n<summary>Per-file coverage</summary>\n\n${fileTable}\n</details>`;
  }
}

await upsertComment(body);

async function loadCoverage() {
  const lcovContent = await readFile(lcovPath, 'utf8');
  const lcovCoverage = deriveCoverageFromLcov(lcovContent);

  if (summaryPath) {
    try {
      const summaryContent = await readFile(summaryPath, 'utf8');
      const summaryJson = JSON.parse(summaryContent);
      if (summaryJson && typeof summaryJson === 'object') {
        const totals = summaryJson?.total && typeof summaryJson.total === 'object' ? normalizeTotals(summaryJson.total) : {};
        const files = [];

        for (const [filePath, data] of Object.entries(summaryJson)) {
          if (filePath === 'total' || !data || typeof data !== 'object') {
            continue;
          }

          const normalized = normalizeTotals(data);

          if (Object.keys(normalized).length > 0) {
            files.push({ path: normalizeFilePath(filePath), ...normalized, uncoveredLines: [] });
          }
        }

        if (Object.keys(totals).length > 0) {
          finalizeCoverageMetrics(totals);

          const uncoveredByPath = new Map(
            lcovCoverage.files.map((file) => [file.path, Array.isArray(file.uncoveredLines) ? file.uncoveredLines : []]),
          );

          const mergedFiles = files.map((file) => ({
            ...file,
            uncoveredLines: uncoveredByPath.get(file.path) ?? [],
          }));

          const seenPaths = new Set(mergedFiles.map((file) => file.path));

          for (const file of lcovCoverage.files) {
            if (!seenPaths.has(file.path)) {
              mergedFiles.push(file);
            }
          }

          return { totals, files: mergedFiles };
        }
      }
    } catch (error) {
      console.warn(`Failed to read coverage summary at ${summaryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return lcovCoverage;
}

function normalizeTotals(total) {
  const normalized = {};
  for (const [key, data] of Object.entries(total)) {
    if (!data) {
      continue;
    }
    const { pct, covered, total: totalCount } = data;
    const coveredNumber = typeof covered === 'number' ? covered : Number(covered);
    const totalNumber = typeof totalCount === 'number' ? totalCount : Number(totalCount);
    const percentNumber = typeof pct === 'number' ? pct : Number(pct);
    normalized[key] = {
      pct: Number.isFinite(percentNumber) ? percentNumber : computePercent(coveredNumber, totalNumber),
      covered: Number.isFinite(coveredNumber) ? coveredNumber : 0,
      total: Number.isFinite(totalNumber) ? totalNumber : 0,
    };
  }
  return normalized;
}

function deriveCoverageFromLcov(lcov) {
  const totals = createEmptyCoverageMetrics();
  const files = [];
  let currentFile = null;

  const pushCurrentFile = () => {
    if (currentFile) {
      finalizeCoverageMetrics(currentFile);
      if (currentFile.uncoveredLines instanceof Set) {
        currentFile.uncoveredLines = Array.from(currentFile.uncoveredLines)
          .filter((value) => typeof value === 'number' && Number.isFinite(value))
          .sort((a, b) => a - b);
      } else if (!Array.isArray(currentFile.uncoveredLines)) {
        currentFile.uncoveredLines = [];
      }
      files.push(currentFile);
      currentFile = null;
    }
  };

  const lines = lcov.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      pushCurrentFile();
      const filePath = normalizeFilePath(line.slice(3).trim());
      currentFile = { path: filePath, ...createEmptyCoverageMetrics(), uncoveredLines: new Set() };
    } else if (line.startsWith('LH:')) {
      const value = Number.parseInt(line.slice(3), 10);
      if (!Number.isNaN(value)) {
        totals.lines.covered += value;
        totals.statements.covered += value;
        if (currentFile) {
          currentFile.lines.covered += value;
          currentFile.statements.covered += value;
        }
      }
    } else if (line.startsWith('LF:')) {
      const value = Number.parseInt(line.slice(3), 10);
      if (!Number.isNaN(value)) {
        totals.lines.total += value;
        totals.statements.total += value;
        if (currentFile) {
          currentFile.lines.total += value;
          currentFile.statements.total += value;
        }
      }
    } else if (line.startsWith('BRH:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.branches.covered += value;
        if (currentFile) {
          currentFile.branches.covered += value;
        }
      }
    } else if (line.startsWith('BRF:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.branches.total += value;
        if (currentFile) {
          currentFile.branches.total += value;
        }
      }
    } else if (line.startsWith('FNH:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.functions.covered += value;
        if (currentFile) {
          currentFile.functions.covered += value;
        }
      }
    } else if (line.startsWith('FNF:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.functions.total += value;
        if (currentFile) {
          currentFile.functions.total += value;
        }
      }
    } else if (line.startsWith('DA:') && currentFile) {
      const data = line.slice(3).split(',');
      const lineNumber = Number.parseInt(data[0], 10);
      const executionCount = Number.parseInt(data[1], 10);
      if (!Number.isNaN(lineNumber) && executionCount === 0) {
        currentFile.uncoveredLines.add(lineNumber);
      }
    } else if (line === 'end_of_record') {
      pushCurrentFile();
    }
  }

  pushCurrentFile();

  finalizeCoverageMetrics(totals);

  return { totals, files };
}

function computePercent(covered, total) {
  if (typeof total !== 'number' || total <= 0) {
    return 0;
  }
  return (covered / total) * 100;
}

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('en-US');
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  const rounded = value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return `${rounded}%`;
}

function formatCoverageCell(data) {
  if (!data || typeof data !== 'object') {
    return '—';
  }

  return formatPercent(data.pct);
}

function escapeTableCell(text) {
  if (typeof text !== 'string') {
    return formatNumber(text);
  }
  return text.replace(/\|/g, '\\|');
}

function indentFileName(fileName) {
  if (typeof fileName !== 'string' || fileName.length === 0) {
    return escapeTableCell(fileName ?? '');
  }
  return `&nbsp;&nbsp;${escapeTableCell(fileName)}`;
}

function createEmptyCoverageMetrics() {
  return {
    lines: { covered: 0, total: 0, pct: 0 },
    statements: { covered: 0, total: 0, pct: 0 },
    branches: { covered: 0, total: 0, pct: 0 },
    functions: { covered: 0, total: 0, pct: 0 },
  };
}

function finalizeCoverageMetrics(metrics) {
  for (const [key, data] of Object.entries(metrics)) {
    if (!data || typeof data !== 'object' || key === 'path' || key === 'uncoveredLines') {
      continue;
    }
    data.pct = computePercent(data.covered, data.total);
  }
}

function formatUncoveredLines(uncovered) {
  if (!Array.isArray(uncovered) || uncovered.length === 0) {
    return '—';
  }

  const sorted = [...new Set(uncovered.filter((value) => typeof value === 'number' && Number.isFinite(value)))].sort(
    (a, b) => a - b,
  );

  if (sorted.length === 0) {
    return '—';
  }

  const maxVisible = 20;
  const visible = sorted.slice(0, maxVisible);
  const remaining = sorted.length - visible.length;
  const base = visible.join(', ');
  return remaining > 0 ? `${base}, …` : base;
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return '';
  }

  const normalized = filePath.replace(/\\/g, '/');

  let relativePath = normalized;

  if (normalized.startsWith(`${workspaceRoot}/`)) {
    relativePath = normalized.slice(workspaceRoot.length + 1);
  }

  if (relativePath.startsWith('./')) {
    return relativePath.slice(2);
  }

  return relativePath;
}

function splitPath(path) {
  const normalized = typeof path === 'string' ? path : '';
  const index = normalized.lastIndexOf('/');
  if (index === -1) {
    return { directory: '', fileName: normalized };
  }
  return {
    directory: normalized.slice(0, index),
    fileName: normalized.slice(index + 1),
  };
}

async function upsertComment(bodyContent) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'akari-coverage-action',
  };

  const existingCommentId = await findExistingComment(headers);

  if (existingCommentId) {
    await request(`${apiBase}/repos/${owner}/${repo}/issues/comments/${existingCommentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body: bodyContent }),
    });
    return;
  }

  await request(`${apiBase}/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: bodyContent }),
  });
}

async function findExistingComment(headers) {
  let page = 1;
  while (true) {
    const response = await request(`${apiBase}/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`, {
      method: 'GET',
      headers,
    });

    const comments = await response.json();

    if (!Array.isArray(comments) || comments.length === 0) {
      return null;
    }

    for (const comment of comments) {
      if (typeof comment?.body === 'string' && comment.body.includes(marker)) {
        return comment.id;
      }
    }

    page += 1;
  }
}

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed with ${response.status} ${response.statusText}: ${text}`);
  }

  return response;
}
