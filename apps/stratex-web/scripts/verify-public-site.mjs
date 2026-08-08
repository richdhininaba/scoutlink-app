#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const baseUrl = String(process.env.BASE_URL || '').replace(/\/+$/, '');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(message) {
  console.error('FAIL:', message);
  process.exitCode = 1;
}

function pass(message) {
  console.log('PASS:', message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(appRoot, relativePath.replace(/^\//, '')));
}

function concretePublicRoutes(config) {
  const paths = new Set();
  for (const item of config.rewrites || []) {
    if (typeof item.source === 'string' && !item.source.includes(':')) paths.add(item.source);
  }
  for (const item of config.redirects || []) {
    if (typeof item.source === 'string' && !item.source.includes(':')) paths.add(item.source);
  }
  return paths;
}

function localAssetPaths(html) {
  const found = new Set();
  const regex = /(?:src|href)="(\/(?:css|js|images)\/[^"?]+|\/stratex-[^"?]+)"/g;
  let match;
  while ((match = regex.exec(html))) found.add(match[1]);
  return [...found];
}

async function verifyHttpRoute(entry) {
  const url = baseUrl + entry.path;
  const response = await fetch(url, {
    redirect:'follow',
    headers:{'User-Agent':'StratexPublicRegression/1.0'}
  });

  if (response.status !== entry.status) {
    fail(entry.path + ' expected ' + entry.status + ' but returned ' + response.status);
    return;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    fail(entry.path + ' did not return HTML');
    return;
  }

  const body = await response.text();

  for (const required of entry.requiredText || []) {
    if (!body.includes(required)) {
      fail(entry.path + ' missing required content: ' + required);
      return;
    }
  }

  if (
    entry.kind.startsWith('ssr') &&
    /<div id="stratexPublicRoot" aria-live="polite"><\/div>/.test(body)
  ) {
    fail(entry.path + ' returned an empty public SSR root');
    return;
  }

  if (/Page Not Found \| Stratex Analytics/i.test(body)) {
    fail(entry.path + ' unexpectedly returned the Stratex 404 page');
    return;
  }

  pass(entry.path);
}

async function verifyAsset(urlPath) {
  const response = await fetch(baseUrl + urlPath, {
    redirect:'follow',
    headers:{'User-Agent':'StratexPublicRegression/1.0'}
  });
  if (!response.ok) fail(urlPath + ' returned ' + response.status);
  else pass(urlPath);
}

async function main() {
  const manifestPath = path.join(appRoot, 'assets', 'stratex-public-route-manifest.json');
  const vercelPath = path.join(appRoot, 'vercel.json');
  const shellPath = path.join(appRoot, 'pages', 'stratex-public-v5.html');

  for (const file of [manifestPath, vercelPath, shellPath]) {
    if (!fs.existsSync(file)) {
      fail('Missing required file: ' + path.relative(repoRoot, file));
      return;
    }
  }

  let manifest;
  let config;

  try {
    manifest = readJson(manifestPath);
    config = readJson(vercelPath);
  } catch (error) {
    fail('JSON parse error: ' + error.message);
    return;
  }

  const configuredRoutes = concretePublicRoutes(config);

  for (const entry of manifest.routes || []) {
    if (!configuredRoutes.has(entry.path)) {
      fail('Public route missing from vercel.json: ' + entry.path);
    }
  }

  const shell = fs.readFileSync(shellPath, 'utf8');
  for (const asset of localAssetPaths(shell)) {
    if (!exists(asset)) fail('Shell references missing local asset: ' + asset);
  }

  if (exists('/index.html')) {
    fail('apps/stratex-web/index.html exists and can collide with the SSR root route. Delete it.');
  }

  const awardRewrite = (config.rewrites || []).find(item => item.source === '/award-ceremonies');
  if (!awardRewrite || !String(awardRewrite.destination || '').startsWith('/api/stratex-render')) {
    fail('/award-ceremonies must be owned by the SSR renderer');
  }

  if (!process.exitCode) pass('Static public route contract');

  if (!baseUrl) {
    console.log('HTTP checks skipped. Set BASE_URL to run preview/production checks.');
    return;
  }

  for (const entry of manifest.routes || []) {
    try {
      await verifyHttpRoute(entry);
    } catch (error) {
      fail(entry.path + ' request failed: ' + error.message);
    }
  }

  const shellAssets = localAssetPaths(shell);
  for (const asset of shellAssets) {
    try {
      await verifyAsset(asset);
    } catch (error) {
      fail(asset + ' request failed: ' + error.message);
    }
  }

  if (process.exitCode) {
    console.error('\nStratex public regression checks FAILED.');
    process.exit(process.exitCode);
  }

  console.log('\nStratex public regression checks passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
