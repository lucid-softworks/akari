const { spawn, spawnSync } = require('node:child_process');

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

const port = process.env.PLAYWRIGHT_WEB_PORT ?? '8081';

const child = spawn(
  npmCommand,
  ['run', 'web', '--workspace', 'akari', '--', '--port', port],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
    },
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
