---
name: Optional AI provider setup
description: What to do when the managed AI integration is unavailable or the user declines to provide a provider key.
---

When managed AI access cannot be provisioned and the user declines a secure provider-key request, keep the product fully usable without pretending AI is active: wire the real provider path, return an explicit configuration state, and preserve user input in the UI.

**Why:** A silent mock response undermines trust in an app whose primary value depends on AI.

**How to apply:** Show the unavailable state in the product, keep the assistant endpoint ready for later configuration, and offer activation as a follow-up instead of repeatedly requesting credentials.