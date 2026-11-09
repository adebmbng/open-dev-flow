---
name: workflow-implementation
description: Implement the approved change in a fresh development worktree based on the latest master and prepare its pull request.
---

# Implement the approved change and prepare its pull request

Before implementation, inspect repository instructions, remotes, worktrees, and local changes. Fetch the latest `master` from the repository's configured remote and create a dedicated development branch and worktree from that fetched commit. Work in that worktree; do not switch, overwrite, or clean the engineer's existing checkout. Record the remote, base commit, worktree path, and branch. If the fetch fails, `master` is unavailable, or a safe worktree cannot be created, report the blocker and do not silently use a stale base or modify the original checkout.

Follow the approved plan and available baseline results. Implement the change, run suitable checks, and prepare a reviewable branch and PR when access and permissions allow. Record the worktree path, branch, commit, PR link, commands, results, and limitations for the review stage. Respect repository approval requirements; never merge automatically.

Work interactively with the engineer. Treat the handoff as context, not permission to bypass native tool approvals. Report uncertainty and preserve evidence of failures.
