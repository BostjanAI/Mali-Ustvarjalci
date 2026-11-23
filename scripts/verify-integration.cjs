const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['verify-postgres.ts', 'verify-fulfillment-races.ts'])
  cp.execFileSync(
    process.execPath,
    [require.resolve('tsx/cli'), 'scripts/' + file],
    { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true },
  );
