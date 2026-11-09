---
name: workflow-implementation-review
description: Run auto-review-pr for the selected implementation PR links, address actionable feedback, and save the results to shared context.
---

# Review implementation PRs

Use the PR links in the handoff as the exact review scope. Invoke `/auto-review-pr` for each link. If the command is not discoverable, read and follow `~/.codex/plugins/cache/bfi-ai-agents/bfi-agent-skills/1.0.0/skills/auto-review-pr/SKILL.md` for the explicitly supplied PRs. Do not search for unrelated PRs. Follow the workspace instruction not to use Superpowers skills; use an available isolated worktree mechanism instead. Preserve the implementation worktree and do not remove it during review cleanup. If the skill, required tooling, GitHub access, or safe review isolation is unavailable, report the limitation rather than claiming a review occurred.

The auto-review-pr workflow can submit GitHub reviews and comments. Follow its specified PR scope and repository permissions. An author may not be able to approve their own PR; report that outcome rather than claiming approval. Respect existing repository instructions and never merge automatically.

Inspect outstanding review feedback and the approved plan. Address actionable feedback in the implementation worktree, run suitable checks, and record changes, commits, actual results, and unresolved or disputed feedback. Push fixes and resolve addressed review threads when the repository workflow and permissions allow, after confirming the fix. Do not claim checks passed when they did not run.

Produce the requested shared `implementation-review` artifact automatically, including PR URLs, reviewed head SHA, findings with evidence, feedback disposition, changes and checks, review submission status, and remaining gaps. Work interactively with the engineer and do not start another stage automatically.
