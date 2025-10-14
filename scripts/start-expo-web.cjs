const { spawnSync } = require('node:child_process');
const { createServer } = require('node:http');
const { createReadStream, existsSync, statSync } = require('node:fs');
const path = require('node:path');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packagesToBuild = ['clearsky-api'];

for (const workspace of packagesToBuild) {
  const buildResult = spawnSync(
    npmCommand,
    ['run', 'build', '--workspace', workspace],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: process.env.CI ?? '1',
      },
    },
  );

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

const exportResult = spawnSync(
  npmCommand,
  ['run', 'build', '--workspace', 'akari', '--', '--platform', 'web'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
    },
  },
);

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

const port = Number.parseInt(process.env.PLAYWRIGHT_WEB_PORT ?? '8081', 10);
const distDir = path.resolve(__dirname, '../apps/akari/dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const getFilePath = (requestPath) => {
  const urlPath = decodeURIComponent(requestPath.split('?')[0] ?? '/');
  const safePath = urlPath.replace(/^\/+/, '');
  const candidate = path.join(distDir, safePath);

  const htmlCandidate = path.join(distDir, `${safePath}.html`);
  if (
    safePath !== '' &&
    htmlCandidate.startsWith(distDir) &&
    existsSync(htmlCandidate) &&
    statSync(htmlCandidate).isFile()
  ) {
    return htmlCandidate;
  }

  if (candidate.startsWith(distDir) && existsSync(candidate)) {
    const stats = statSync(candidate);

    if (stats.isFile()) {
      return candidate;
    }

    if (stats.isDirectory()) {
      const directoryIndex = path.join(candidate, 'index.html');
      if (
        directoryIndex.startsWith(distDir) &&
        existsSync(directoryIndex) &&
        statSync(directoryIndex).isFile()
      ) {
        return directoryIndex;
      }
    }
  }

  if (safePath.endsWith('/')) {
    const indexFile = path.join(distDir, safePath, 'index.html');
    if (indexFile.startsWith(distDir) && existsSync(indexFile) && statSync(indexFile).isFile()) {
      return indexFile;
    }
  }

  return null;
};

const indexHtmlPath = path.join(distDir, 'index.html');

const server = createServer((request, response) => {
  try {
    const requestedPath = request?.url ?? '/';
    const resolvedPath = getFilePath(requestedPath);

    let filePath = resolvedPath;
    if (!filePath) {
      filePath = indexHtmlPath;
    }

    const extension = path.extname(filePath);
    const contentType = mimeTypes[extension] ?? 'application/octet-stream';

    response.writeHead(200, {
      'Content-Type': contentType,
    });

    createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[WebServer] Static build available at http://127.0.0.1:${port}/`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
