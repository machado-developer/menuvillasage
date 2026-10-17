import nextEnv from "@next/env";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const child = spawn(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Não foi possível iniciar o Prisma CLI:", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
