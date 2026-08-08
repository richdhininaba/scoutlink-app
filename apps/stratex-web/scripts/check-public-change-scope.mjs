#!/usr/bin/env node
'use strict';

import { execFileSync } from 'node:child_process';

function changedFiles() {
  const env = String(process.env.CHANGED_FILES || '').trim();
  if (env) return env.split(/\r?\n/).map(v => v.trim()).filter(Boolean);

  try {
    return execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding:'utf8' })
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

const files = changedFiles();
const showcaseTouched = files.some(file =>
  /showcase/i.test(file) ||
  /migration_showcase/i.test(file)
);

if (!showcaseTouched) {
  console.log('No Showcase-specific files changed; scope guard not applicable.');
  process.exit(0);
}

const sharedPublic = [
  'apps/stratex-web/vercel.json',
  'apps/stratex-web/api/stratex-render.js',
  'apps/stratex-web/api/stratex-sitemap.js',
  'apps/stratex-web/pages/stratex-public-v5.html',
  'apps/stratex-web/js/stratex-public-v5.js',
  'apps/stratex-web/css/stratex-public-v5.css',
  'apps/stratex-web/assets/stratex-public-v5-pages.json'
];

const sharedTouched = files.filter(file => sharedPublic.includes(file));

if (sharedTouched.length) {
  console.log('FULL PUBLIC REGRESSION REQUIRED');
  console.log('Showcase work also changed shared public-site files:');
  sharedTouched.forEach(file => console.log(' - ' + file));

  if (process.env.STRATEX_FULL_PUBLIC_REGRESSION !== '1') {
    console.error('Set STRATEX_FULL_PUBLIC_REGRESSION=1 only when the complete public route matrix is being run.');
    process.exit(1);
  }
}

console.log('Showcase scope check passed.');
