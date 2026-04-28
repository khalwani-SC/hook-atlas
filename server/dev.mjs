import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  children.forEach((child) => {
    if (!child.killed) child.kill("SIGTERM");
  });
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const viteBinary = process.platform === "win32" ? "node_modules/.bin/vite.cmd" : "node_modules/.bin/vite";
const viteCommand = existsSync(resolve(process.cwd(), viteBinary)) ? viteBinary : "vite";

run("validation-api", process.execPath, ["server/validation-api.mjs"]);
run("vite", viteCommand, ["--host", "0.0.0.0"]);
