import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
mkdirSync(".local/dolt", { recursive: true });
const child = spawn("dolt", ["sql-server", "--host", "127.0.0.1", "--port", "3307", "--data-dir", ".local/dolt"], { stdio: "inherit" });
child.on("error", error => { console.error(error.message); process.exit(1); });
child.on("exit", code => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
