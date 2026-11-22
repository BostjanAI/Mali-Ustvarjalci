const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.next/standalone');
fs.cpSync(path.join(root, 'public'), path.join(out, 'public'), {
  recursive: true,
});
fs.cpSync(path.join(root, '.next/static'), path.join(out, '.next/static'), {
  recursive: true,
});
process.env.HOSTNAME = 'localhost';
process.env.PORT = process.env.PORT || '3000';
require(path.join(out, 'server.js'));
