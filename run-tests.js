const { spawnSync } = require("child_process");

const tests = [
  "./out/test/coreAnalyzer.test.js",
  "./out/test/documentationPipeline.test.js"
];

for (const test of tests) {
  console.log(`\nRunning ${test}...`);

  const result = spawnSync(process.execPath, [test], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll DocForge tests passed.");
