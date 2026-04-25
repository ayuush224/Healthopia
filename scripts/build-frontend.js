const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const apiBaseUrl = String(process.env.FRONTEND_API_URL || '').trim().replace(/\/+$/, '');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileToRoute(sourceFileName, routeDir) {
  const sourceFile = path.join(distDir, sourceFileName);
  const destinationDir = path.join(distDir, routeDir);
  const destinationFile = path.join(destinationDir, 'index.html');

  ensureDir(destinationDir);
  fs.copyFileSync(sourceFile, destinationFile);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(publicDir, distDir, { recursive: true });

fs.writeFileSync(
  path.join(distDir, 'js', 'runtime-config.js'),
  `window.__APP_CONFIG__ = Object.assign({}, window.__APP_CONFIG__, { apiBaseUrl: ${JSON.stringify(apiBaseUrl)} });\n`
);

fs.copyFileSync(path.join(distDir, 'landing.html'), path.join(distDir, 'index.html'));
copyFileToRoute('sign-in.html', 'sign-in');
copyFileToRoute('register.html', 'register');
copyFileToRoute('app.html', 'feed');
copyFileToRoute('app.html', 'profile');
copyFileToRoute('app.html', 'health');
copyFileToRoute('app.html', 'wellness-picks');
