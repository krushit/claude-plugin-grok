---
name: setup
description: Check whether the local Claude CLI is ready and optionally toggle the stop-time review gate for Grok
---

Run:

```bash
node "${GROK_PLUGIN_ROOT}/scripts/companion.mjs" setup $ARGUMENTS
```

If `GROK_PLUGIN_ROOT` is unset, use `${CLAUDE_PLUGIN_ROOT}` instead.

Present the command output to the user.
Do not enable or disable the gate unless the user passed `--enable-review-gate` or `--disable-review-gate`.
Do not edit project files.
