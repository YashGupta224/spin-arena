/**
 * Smoke test — files exist and parse.
 * Run: npm run test:manual
 *
 * Browser: http://localhost:3000/?test&debug
 *   __GAME__.alive(); __GAME__.playerHp(); __GAME__.bulletCount();
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const required = [
  'index.html',
  'js/main.js',
  'js/config.js',
  'js/sfx.js',
  'js/Fighter.js',
  'js/scenes/BootScene.js',
  'js/scenes/MenuScene.js',
  'js/scenes/GameScene.js',
  'js/scenes/GameOverScene.js',
];

let failed = false;

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error('MISSING:', file);
    failed = true;
    continue;
  }
  if (file.endsWith('.js')) {
    try {
      execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
      console.log('OK:', file);
    } catch (err) {
      console.error('SYNTAX:', file);
      console.error(err.stderr ? err.stderr.toString() : err.message);
      failed = true;
    }
  } else {
    console.log('OK:', file);
  }
}

const configSrc = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
if (!configSrc.includes('testMode') || !configSrc.includes('swordDamage')) {
  console.error('config.js should expose testMode and combat settings');
  failed = true;
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('phaser@3') || !html.includes('js/Fighter.js')) {
  console.error('index.html should load Phaser and Fighter.js');
  failed = true;
}

if (failed) process.exit(1);

console.log('\nAll smoke checks passed.');
console.log('Start game:  npm start  →  http://localhost:3000');
console.log('Test mode:   http://localhost:3000/?test&debug');
