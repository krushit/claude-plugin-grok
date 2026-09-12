#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { saveTurnBaseline } from "./lib/git.mjs";
import { resolveStateDir } from "./lib/state.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const FALLBACK_STATE_ROOT = path.join(os.homedir(), ".grok", "plugins", "data", "claude-plugin-grok", "state");

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

try {
  const input = readHookInput();
  const cwd = resolveWorkspaceRoot(
    input.cwd || input.workspaceRoot || process.env.GROK_WORKSPACE_ROOT || process.cwd()
  );
  const sessionId = input.session_id || input.sessionId || process.env.GROK_SESSION_ID || "";
  saveTurnBaseline(cwd, resolveStateDir(cwd, FALLBACK_STATE_ROOT), sessionId);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
}
