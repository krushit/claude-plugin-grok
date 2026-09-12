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

export function getClaudeAuthStatus(cwd) {
  const binary = resolveClaudeBinary();
  if (!binary) {
    return { loggedIn: false, detail: "claude CLI not found. Run `claude auth login`." };
  }
  const result = runCommand(binary, ["auth", "status"], { cwd, timeout: 20_000 });
  const text = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  try {
    const parsed = JSON.parse(result.stdout.trim() || text);
    if (parsed && parsed.loggedIn === true) {
      const who = parsed.email ? ` as ${parsed.email}` : "";
      return { loggedIn: true, detail: `signed in${who}` };
    }
    if (parsed && parsed.loggedIn === false) {
      return { loggedIn: false, detail: "not signed in. Run `claude auth login`." };
    }
  } catch {
    // fall through to text
  }
  if (result.status === 0 && /loggedIn"?\s*:\s*true|signed in|logged in/i.test(text)) {
    return { loggedIn: true, detail: "signed in" };
  }
  return { loggedIn: false, detail: "not signed in. Run `claude auth login`." };
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
    "dontAsk",
    "--allowedTools",
    "Read,Grep,Glob",
    "--disallowedTools",
    "Edit,Write,Agent,Bash",
    "--",
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
