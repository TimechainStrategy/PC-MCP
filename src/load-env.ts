import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load KEY=VALUE pairs from a .env file without overriding non-empty process.env.
 * Empty Cursor/MCP env placeholders are treated as unset so local credentials win.
 */
export function loadDotEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const exported = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = exported.indexOf("=");
    if (eq <= 0) continue;

    const key = exported.slice(0, eq).trim();
    let value = exported.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const current = process.env[key];
    if (current == null || current === "") {
      process.env[key] = value;
    }
  }
}

/** Load `.env` then `.env.local` from the package root (parent of `dist/` or `src/`). */
export function loadProjectEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  loadDotEnvFile(resolve(root, ".env"));
  loadDotEnvFile(resolve(root, ".env.local"));
}
