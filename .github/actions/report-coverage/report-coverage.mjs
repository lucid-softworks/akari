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

const totals = await loadCoverageTotals();

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

await upsertComment(body);

async function loadCoverageTotals() {
  if (summaryPath) {
    try {
      const summaryContent = await readFile(summaryPath, 'utf8');
      const summaryJson = JSON.parse(summaryContent);
      if (summaryJson?.total && typeof summaryJson.total === 'object') {
        return normalizeTotals(summaryJson.total);
      }
    } catch (error) {
      console.warn(`Failed to read coverage summary at ${summaryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const lcovContent = await readFile(lcovPath, 'utf8');
  return deriveTotalsFromLcov(lcovContent);
}

function normalizeTotals(total) {
  const normalized = {};
  for (const [key, data] of Object.entries(total)) {
    if (!data) {
      continue;
    }
    const { pct, covered, total: totalCount } = data;
    normalized[key] = {
      pct: typeof pct === 'number' ? pct : Number(pct),
      covered: typeof covered === 'number' ? covered : Number(covered),
      total: typeof totalCount === 'number' ? totalCount : Number(totalCount),
    };
  }
  return normalized;
}

function deriveTotalsFromLcov(lcov) {
  const totals = {
    lines: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
  };

  const lines = lcov.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('LH:')) {
      const value = Number.parseInt(line.slice(3), 10);
      if (!Number.isNaN(value)) {
        totals.lines.covered += value;
        totals.statements.covered += value;
      }
    } else if (line.startsWith('LF:')) {
      const value = Number.parseInt(line.slice(3), 10);
      if (!Number.isNaN(value)) {
        totals.lines.total += value;
        totals.statements.total += value;
      }
    } else if (line.startsWith('BRH:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.branches.covered += value;
      }
    } else if (line.startsWith('BRF:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.branches.total += value;
      }
    } else if (line.startsWith('FNH:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.functions.covered += value;
      }
    } else if (line.startsWith('FNF:')) {
      const value = Number.parseInt(line.slice(4), 10);
      if (!Number.isNaN(value)) {
        totals.functions.total += value;
      }
    }
  }

  for (const data of Object.values(totals)) {
    data.pct = computePercent(data.covered, data.total);
  }

  return totals;
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
