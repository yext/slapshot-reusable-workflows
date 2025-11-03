/**
 * GitHub Action: Verify NPM publish readiness and determine npm dist-tag.
 *
 * This script:
 * - Validates that the commit message matches the package version.
 * - Handles both single-package and monorepo setups.
 * - Determines the appropriate npm dist-tag (latest, alpha, beta, rc).
 *
 * Expected commit message formats:
 * - Single package:  "release: v1.2.3"
 * - Monorepo:        "release: @scope/package@v1.2.3"
 */

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE;
const REPO_PATH = process.env.GITHUB_WORKSPACE;

if (!COMMIT_MESSAGE) {
  core.setFailed('Missing COMMIT_MESSAGE environment variable.');
  process.exit(1);
}

if (!REPO_PATH) {
  core.setFailed('Missing GITHUB_WORKSPACE environment variable.');
  process.exit(1);
}

const githubTag = COMMIT_MESSAGE.replace(/^release:\s*/, '').trim();

try {
  const versionToPublish = verifyPackageVersion();
  const npmTag = resolveNpmTag(versionToPublish);
  core.setOutput('npm_tag', npmTag);
} catch (err) {
  core.setFailed(err.message);
  process.exit(1);
}

/**
 * Determines which npm tag to use based on the version.
 * @param {string} version - The semantic version string.
 * @returns {string} npm dist-tag ('latest', 'alpha', 'beta', 'rc').
 */
function resolveNpmTag(version) {
  if (version.includes('rc')) return 'rc';
  if (version.includes('beta')) return 'beta';
  if (version.includes('alpha')) return 'alpha';
  return 'latest';
}

/**
 * Verifies the package(s) to be published.
 * - If single package: validates version matches commit.
 * - If monorepo: finds correct package under /packages.
 * @returns {string} - The version to be published.
 * @throws {Error} if validation fails.
 */
function verifyPackageVersion() {
  const pkgPath = path.join(REPO_PATH, 'package.json');
  const pkg = readJsonFile(pkgPath);

  const { version: currentVersion, private: isPrivate } = pkg;
  const expectedTag = `v${currentVersion}`;

  if (githubTag === expectedTag) {
    if (isPrivate) throw new Error('Package is private.');
    return currentVersion;
  }

  // Try handling monorepo structure
  const packagesDir = path.join(REPO_PATH, 'packages');
  if (!fs.existsSync(packagesDir)) {
    throw new Error(`Commit message does not match root version.
      Expected: 'release: ${expectedTag}'
      Actual: '${COMMIT_MESSAGE}'`);
  }

  return verifyMonorepoPackage(packagesDir);
}

/**
 * Verifies a package inside a monorepo based on commit message format:
 *   "release: @scope/package@v1.2.3"
 * @param {string} packagesDir - Path to the monorepo "packages" directory.
 * @returns {string} - The version of the matched package.
 * @throws {Error} if the package cannot be found or validated.
 */
function verifyMonorepoPackage(packagesDir) {
  const versionMarker = '@v';
  const versionIndex = githubTag.lastIndexOf(versionMarker);

  if (versionIndex === -1) {
    throw new Error(
      `Invalid commit message format for monorepo package.
      Expected: "release: @scope/package@v1.2.3"
      Actual: "${COMMIT_MESSAGE}"`
    );
  }

  const packageName = githubTag.slice(0, versionIndex);
  const packageVersion = githubTag.slice(versionIndex + versionMarker.length);

  const packageDirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const dir of packageDirs) {
    const packageJsonPath = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) continue;

    const pkg = readJsonFile(packageJsonPath);
    if (pkg.name === packageName && pkg.version === packageVersion && !pkg.private) {
      core.setOutput('working_directory', path.join(packagesDir, dir));
      return pkg.version;
    }
  }

  throw new Error(
    `Could not find a public package matching:
    Name: '${packageName}'
    Version: '${packageVersion}'
    under '${packagesDir}'`
  );
}

/**
 * Reads and parses a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {object} - Parsed JSON content.
 * @throws {Error} if file cannot be read or parsed.
 */
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read or parse JSON file at ${filePath}: ${err.message}`);
  }
}
