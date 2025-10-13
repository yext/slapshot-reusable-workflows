const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const commitMsg = process.env.COMMIT_MSG;

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const { version: currentVersion, private: isPrivate } = pkg;

if (isPrivate) {
  core.setFailed('Package is private.');
}

const expectedCommitMsg = `release: v${currentVersion}`;
if (!commitMsg === expectedCommitMsg) {
  core.setFailed(`Invalid commit message. \nExpected: '${expectedCommitMsg}'.\nActual: '${commitMsg}'`);
}

core.setOutput('npm_tag', currentVersion.includes('rc') 
  ? 'rc'
  : currentVersion.includes('beta')
    ? 'beta'
    : currentVersion.includes('alpha')
      ? 'alpha'
      : 'latest');