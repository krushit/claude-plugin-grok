# Claude plugin for Grok

When Grok tries to stop, Claude reviews that turn and can block it.

This is the reverse of [krushit/grok-plugin-cc](https://github.com/krushit/grok-plugin-cc): that plugin uses Grok as a stop gate inside Claude Code. This plugin uses Claude as a stop gate inside Grok.

The Codex equivalent is [krushit/codex-plugin-grok](https://github.com/krushit/codex-plugin-grok).

## Requirements

- Node.js 18.18+
- Grok Build CLI with plugins/hooks enabled
- `claude` on PATH, signed in (or `CLAUDE_BIN`)

## Install

Do not install until you are ready to test this gate on its own.

```bash
grok plugin marketplace add krushit/claude-plugin-grok
grok plugin install claude --trust
```

Then, in a Grok session:

```text
/claude:setup --enable-review-gate
```

Disable with `/claude:setup --disable-review-gate`. The setting is per workspace.

## What the gate does

On `Stop`, Claude runs a read-only review of the previous Grok turn.

- `ALLOW` — Grok stops
- `BLOCK` — Grok continues; the reason is fed back as the next user message

Status, setup, and review-only turns should `ALLOW` immediately.

> The gate can loop and burn usage. Only enable it when you are watching the session.
