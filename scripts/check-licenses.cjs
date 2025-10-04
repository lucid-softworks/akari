#!/usr/bin/env node
const path = require('node:path');
const checker = require('license-checker');

const rootDir = path.resolve(__dirname, '..');

const DENIED_PATTERNS = [
  /^UNLICENSED$/i,
  /^UNKNOWN$/i,
  /^CC-BY-NC(?:-.+)?$/i,
  /^CC-BY-NC-SA(?:-.+)?$/i
];

const MANUAL_LICENSE_OVERRIDES = new Map([
  ['akari-monorepo@1.3.0', 'MIT'],
  ['akari@1.3.0', 'MIT'],
  ['docs@0.0.1', 'MIT']
]);

function toRelativePackageJsonPath(infoPath) {
  if (!infoPath) {
    return 'package.json';
  }

  const packageJsonPath = path.join(infoPath, 'package.json');
  const relative = path.relative(rootDir, packageJsonPath);
  return relative || 'package.json';
}

function describeLicense(license) {
  if (!license) {
    return 'Unknown';
  }

  if (Array.isArray(license)) {
    return license.map(describeLicense).join(', ');
  }

  if (typeof license === 'object') {
    if (license.type) {
      return describeLicense(license.type);
    }

    return JSON.stringify(license);
  }

  return String(license);
}

function flattenLicenses(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenLicenses);
  }

  if (typeof value === 'object' && value.type) {
    return flattenLicenses(value.type);
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[()]/g, ' ');
    return cleaned
      .split(/(?:\s+OR\s+|\s+AND\s+|\/|,)/i)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  return [];
}

function isDenied(license) {
  return DENIED_PATTERNS.some((pattern) => pattern.test(license));
}

function formatPackageName(identifier) {
  if (!identifier) {
    return 'root package';
  }

  return identifier.replace(/\/node_modules\//g, ' > ');
}

const isCI = Boolean(process.env.CI);

checker.init({ start: rootDir }, (error, packages) => {
  if (error) {
    console.error('Failed to run license checker:', error.message);
    process.exitCode = 1;
    return;
  }

  const violations = [];

  for (const [identifier, info] of Object.entries(packages)) {
    const override = MANUAL_LICENSE_OVERRIDES.get(identifier);
    const licenseText = override ?? info.licenses;
    const tokens = flattenLicenses(licenseText);
    const denied = tokens.filter(isDenied);

    if (denied.length === 0 && tokens.length === 0 && typeof licenseText === 'string' && isDenied(licenseText)) {
      denied.push(licenseText);
    }

    if (denied.length > 0) {
      violations.push({
        identifier: formatPackageName(identifier),
        license: licenseText,
        denied,
        packageJsonPath: toRelativePackageJsonPath(info.path)
      });
    }
  }

  if (violations.length > 0) {
    console.error('The following packages use denied licenses:');
    for (const violation of violations) {
      const description = describeLicense(violation.license);
      const deniedList = violation.denied.join(', ');
      if (isCI) {
        console.log(
          `::error file=${violation.packageJsonPath},title=Denied license detected::${violation.identifier} declares ${description} (denied: ${deniedList})`
        );
      }
      console.error(`- ${violation.identifier}: ${description} (denied: ${deniedList})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All dependency licenses are allowed.');
});
