import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { binaryAvailable, runCommand, which } from "./process.mjs";
import { parseHeadlessJson } from "./parse.mjs";

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export function resolveClaudeBinary() {
  if (process.env.CLAUDE_BIN) {
    return process.env.CLAUDE_BIN;
  }
  const local = path.join(os.homedir(), ".local", "bin", "claude");
  if (fs.existsSync(local)) {
    return local;
  }
  return which("claude");
}

export function getClaudeAvailability(cwd) {
  const binary = resolveClaudeBinary();
  if (!binary) {
    return {
      available: false,
      binary: null,
      detail: "claude CLI not found. Install Claude Code, or set CLAUDE_BIN."
    };
  }
  const version = binaryAvailable(binary, ["--version"], { cwd });
  if (!version.available) {
    return {
      available: false,
      binary,
      detail: `claude found at ${binary} but --version failed: ${version.detail}`
    };
  }
  return { available: true, binary, detail: version.detail };
}

export function getClaudeAuthStatus() {
  const claudeJson = path.join(os.homedir(), ".claude.json");
  if (!fs.existsSync(claudeJson)) {
    return { loggedIn: false, detail: "not signed in (no ~/.claude.json). Run `claude` and log in." };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(claudeJson, "utf8"));
    if (parsed && typeof parsed === "object") {
      return { loggedIn: true, detail: "signed in" };
    }
  } catch {
    return { loggedIn: false, detail: "~/.claude.json is unreadable. Run `claude` and log in." };
  }
  return { loggedIn: false, detail: "not signed in. Run `claude` and log in." };
}

export function runClaudeReview({ cwd, prompt, schemaJson, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const availability = getClaudeAvailability(cwd);
  if (!availability.available) {
    throw new Error(availability.detail);
  }

  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    schemaJson,
    "--permission-mode",
    "bypassPermissions",
    "--allowedTools",
    "Read,Grep,Glob,Bash",
    "--disallowedTools",
    "Edit,Write,Agent",
    prompt
  ];
  const result = runCommand(availability.binary, args, {
    cwd,
    timeout: timeoutMs
  });
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`Claude timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
  }
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(detail || `Claude exited ${result.status}`);
  }
  return parseHeadlessJson(result.stdout);
}
