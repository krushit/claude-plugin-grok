#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import process from "node:process";

import { getClaudeAuthStatus, getClaudeAvailability } from "./lib/claude.mjs";
import { getConfig, setConfig } from "./lib/state.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const FALLBACK_STATE_ROOT = path.join(os.homedir(), ".grok", "plugins", "data", "claude-plugin-grok", "state");

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--json") {
      options.json = true;
    } else if (token === "--enable-review-gate") {
      options.enable = true;
    } else if (token === "--disable-review-gate") {
      options.disable = true;
    } else if (token === "--cwd") {
      options.cwd = argv[++i];
    }
  }
  return options;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== "setup") {
    process.stderr.write("Usage: node companion.mjs setup [--enable-review-gate|--disable-review-gate] [--json]\n");
    process.exitCode = 1;
    return;
  }

  const options = parseArgs(rest);
  if (options.enable && options.disable) {
    throw new Error("Choose either --enable-review-gate or --disable-review-gate.");
  }

  const cwd = resolveWorkspaceRoot(options.cwd || process.env.GROK_WORKSPACE_ROOT || process.cwd());
  const actionsTaken = [];
  if (options.enable) {
    setConfig(cwd, FALLBACK_STATE_ROOT, "stopReviewGate", true);
    actionsTaken.push(`Enabled the Claude stop-time review gate for ${cwd}.`);
  } else if (options.disable) {
    setConfig(cwd, FALLBACK_STATE_ROOT, "stopReviewGate", false);
    actionsTaken.push(`Disabled the Claude stop-time review gate for ${cwd}.`);
  }

  const claude = getClaudeAvailability(cwd);
  const auth = getClaudeAuthStatus();
  const config = getConfig(cwd, FALLBACK_STATE_ROOT);
  const nextSteps = [];
  if (!claude.available) {
    nextSteps.push("Install Claude Code so `claude` is on PATH, or set CLAUDE_BIN.");
  }
  if (claude.available && !auth.loggedIn) {
    nextSteps.push("Run `claude` and log in.");
  }
  if (!config.stopReviewGate) {
    nextSteps.push("Run `/claude:setup --enable-review-gate` to require a Claude review before Grok can stop.");
  }

  const report = {
    ready: claude.available && auth.loggedIn,
    claude,
    auth,
    reviewGateEnabled: Boolean(config.stopReviewGate),
    actionsTaken,
    nextSteps
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const lines = [
    "# Claude setup for Grok",
    "",
    `Status: ${report.ready ? "ready" : "needs attention"}`,
    "",
    "Checks:",
    `- claude: ${claude.detail}`,
    `- auth: ${auth.detail}`,
    `- review gate: ${report.reviewGateEnabled ? "enabled" : "disabled"}`,
    ""
  ];
  if (actionsTaken.length) {
    lines.push("Actions taken:");
    for (const action of actionsTaken) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }
  if (nextSteps.length) {
    lines.push("Next steps:");
    for (const step of nextSteps) {
      lines.push(`- ${step}`);
    }
  }
  process.stdout.write(`${lines.join("\n").trimEnd()}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
