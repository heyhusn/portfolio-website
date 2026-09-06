/**
 * One command for the whole site:  npm run dev
 *
 * Runs the Vite dev server and the admin/RAG API together, in one terminal,
 * with prefixed output and a shared shutdown.
 *
 * This exists because the chatbot depends on a second long-running process,
 * and "start the backend in another terminal" is a step that gets forgotten —
 * the only symptom being an "Assistant offline" panel that looks like a bug in
 * the site. It also removes the easiest mistake of all: `npm start` in this
 * directory does nothing useful, because the API's package.json lives in
 * backend/.
 *
 * Use `npm run dev:web` if you deliberately want the front end on its own.
 */
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const backend = path.join(root, "backend");

const COLORS = { api: "\x1b[38;5;149m", web: "\x1b[38;5;111m", warn: "\x1b[38;5;215m", dim: "\x1b[2m", off: "\x1b[0m" };
const isWin = process.platform === "win32";

function prefix(name, color) {
  const tag = `${color}${name.padEnd(3)}${COLORS.off} ${COLORS.dim}│${COLORS.off} `;
  let partial = "";
  return (buf) => {
    const lines = (partial + buf.toString()).split("\n");
    partial = lines.pop() ?? "";
    for (const line of lines) process.stdout.write(tag + line + "\n");
  };
}

const children = [];
function run(name, color, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: isWin, // npm/npx are .cmd shims on Windows
    env: process.env,
  });
  child.stdout.on("data", prefix(name, color));
  child.stderr.on("data", prefix(name, color));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.log(
        `\n${COLORS.warn}${name} exited with code ${code}.${COLORS.off} ` +
          (name === "api"
            ? "The site still runs, but the chatbot will show as offline.\n"
            : "\n")
      );
    }
    if (name === "web") shutdown(code ?? 0, signal);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

/* ------------------------------------------------------------------ */

const hasBackend = fs.existsSync(path.join(backend, "package.json"));
const hasDeps = fs.existsSync(path.join(backend, "node_modules"));

console.log(`${COLORS.dim}site  → http://localhost:5173${COLORS.off}`);
if (hasBackend && hasDeps) {
  console.log(`${COLORS.dim}api   → http://localhost:3001  (admin panel + RAG assistant)${COLORS.off}\n`);
  run("api", COLORS.api, "node", ["--watch", "server.mjs"], backend);
} else if (hasBackend) {
  console.log(
    `\n${COLORS.warn}backend/node_modules is missing — the chatbot and admin panel will be offline.${COLORS.off}\n` +
      `${COLORS.dim}Fix it with:  cd backend && npm install${COLORS.off}\n`
  );
} else {
  console.log(`\n${COLORS.warn}No backend/ found — running the front end only.${COLORS.off}\n`);
}

run("web", COLORS.web, isWin ? "npx.cmd" : "npx", ["vite"], root);
