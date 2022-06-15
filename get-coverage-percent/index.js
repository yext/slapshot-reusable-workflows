const core = require('@actions/core');
const lcovParse = require('lcov-parse');

try {
  const coverageFilePath = core.getInput('coverage-file');
  lcovParse(coverageFilePath, (err, data) => {
    if (err) {
      throw new Error(err);
    }
    const totalLines = results.reduce((prev, curr) => prev + curr.lines.found, 0);
    const linesCovered = results.reduce((prev, curr) => prev + curr.lines.hit, 0);
    const percent = 100 * linesCovered / totalLines;
    core.setOutput('coverage-percent', percent);
  });
} catch (error) {
  core.setFailed(error.message);
}
