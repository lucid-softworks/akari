import { readFile } from 'node:fs/promises';

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

const metrics = [
  { key: 'lines', label: 'Lines' },
  { key: 'statements', label: 'Statements' },
  { key: 'branches', label: 'Branches' },
  { key: 'functions', label: 'Functions' },
];

const rows = [];

for (const metric of metrics) {
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

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const cells = metrics
      .map((metric) => formatCoverageCell(file[metric.key]))
      .join(' | ');
    fileRows.push(`| ${escapeTableCell(file.path)} | ${cells} |`);
  }

  if (fileRows.length > 0) {
    const fileTable = [
      '| File | Lines | Statements | Branches | Functions |',
      '| ---- | ----- | ---------- | -------- | --------- |',
      ...fileRows,
    ].join('\n');

    body += `\n\n<details>\n<summary>Per-file coverage</summary>\n\n${fileTable}\n</details>`;
  }
}

await upsertComment(body);

async function loadCoverage() {
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
            files.push({ path: filePath, ...normalized });
          }
        }

        if (Object.keys(totals).length > 0) {
          return { totals, files };
        }
      }
    } catch (error) {
      console.warn(`Failed to read coverage summary at ${summaryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const lcovContent = await readFile(lcovPath, 'utf8');
  return deriveCoverageFromLcov(lcovContent);
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

  const lines = lcov.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      if (currentFile) {
        finalizeCoverageMetrics(currentFile);
        files.push(currentFile);
      }
      const filePath = line.slice(3).trim();
      currentFile = { path: filePath, ...createEmptyCoverageMetrics() };
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
    } else if (line === 'end_of_record' && currentFile) {
      finalizeCoverageMetrics(currentFile);
      files.push(currentFile);
      currentFile = null;
    }
  }

  if (currentFile) {
    finalizeCoverageMetrics(currentFile);
    files.push(currentFile);
  }

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
  return `${value.toFixed(2)}%`;
}

function formatCoverageCell(data) {
  if (!data || typeof data !== 'object') {
    return '—';
  }

  const coveredText = formatNumber(data.covered);
  const totalText = formatNumber(data.total);
  const percentText = formatPercent(data.pct);

  if (coveredText === '—' && totalText === '—') {
    return percentText;
  }

  return `${coveredText}/${totalText} (${percentText})`;
}

function escapeTableCell(text) {
  if (typeof text !== 'string') {
    return formatNumber(text);
  }
  return text.replace(/\|/g, '\\|');
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
    if (!data || typeof data !== 'object' || key === 'path') {
      continue;
    }
    data.pct = computePercent(data.covered, data.total);
  }
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
