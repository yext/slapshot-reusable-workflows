const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const tmpDir = process.env.RUNNER_TEMP || os.tmpdir();
  const script = core.getInput('script');
  const scriptPath = path.join(tmpDir, `script-${Date.now()}.sh`);

  fs.writeFileSync(scriptPath, `#!/bin/bash\n${script}`);
  fs.chmodSync(scriptPath, 0o755);

  const workingDirectory = core.getInput('working_directory');
  execSync(scriptPath, {
    stdio: 'inherit',
    cwd: workingDirectory,
    env: process.env,
  });
  fs.unlinkSync(scriptPath);
} catch (error) {
  core.setFailed(error.message);
}