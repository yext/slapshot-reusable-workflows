const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');

try {
  const script = core.getInput('script', { required: true });

  fs.writeFileSync('script.sh', `#!/bin/bash\n${script}`);
  fs.chmodSync('script.sh', 0o755);

  execSync('./script.sh', { stdio: 'inherit' });
} catch (error) {
  core.setFailed(error.message);
}