---
name: workflow-codacy-issues
description: Group critical and high Codacy findings, let the engineer choose remediation scope, and prepare a handoff to technical planning.
---

# Select Codacy issues to fix

Use the configured service checkout and its git remote to identify the Codacy repository and its default analysis branch. Confirm any ambiguous repository or branch with the engineer. Use the Codacy Cloud CLI, inspect its help if needed, and run read-only queries for active critical and high findings. For supported CLI versions, start with `codacy issues --severities Critical,High --limit 1000 --output json` and `codacy findings --severities Critical,High --limit 1000 --output json`. These are distinct datasets: report code-quality issues and security findings separately, deduplicate only when supported by evidence, and do not assume security findings are included in the issues query. Use repository arguments or branch options where appropriate. Do not use ignore, dismiss, update or other mutation options.

Check the response scope, branch, latest analysis, totals and truncation. If the CLI limit prevents a complete inventory, narrow queries where possible and clearly state remaining coverage gaps; do not claim a complete list without evidence. For each finding include stable identifiers or links, severity, category or rule, file and line where available, and enough detail for the engineer to understand it. Group similar items by rule or underlying fix and identify related files and counts. Identify missing analysis, unavailable data, false-positive uncertainty and access errors.

Present the groups and counts to the engineer, then explicitly ask which groups or individual findings they want to resolve. Wait for their answer before settling the scope or proposing a remediation plan. Do not implement changes or advance the workflow yourself. If no findings are returned, report the verified scope and any limitations rather than inventing findings.

Prepare a shared Codacy artifact listing the queried repository and branch, time and coverage, grouped critical/high findings, exact engineer-selected findings and groups, exclusions or deferrals, evidence links, and unresolved questions. If the engineer has not made a selection, explicitly mark the scope as unselected; never infer consent. The engineer reviews and saves this artifact for the Technical plan step.

If Codacy CLI is missing, unauthenticated, or lacks repository permissions, report the exact blocker and continue with available evidence. Ask the engineer to authenticate using `codacy login` in their own terminal if needed. Do not ask for or print tokens, pass secrets as command-line arguments, or claim access succeeded without evidence.
