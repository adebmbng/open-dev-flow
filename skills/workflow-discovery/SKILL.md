---
name: workflow-discovery
description: Investigate BFI service impact and requirements through engineer-led Q&A using the configured discovery repository's ste-docs skill.
---

# Discover requirements and service impact

Wait for the engineer to ask the first question. Do not invent a question or drive the discussion with an unsolicited agenda. Help the engineer explore the existing end-to-end process when asked, and let the engineer choose follow-up questions.

Use the configured discovery checkout's `AGENTS.md` and `.claude/skills/ste-docs/SKILL.md` with its references. Follow the evidence method and Simplified Technical English rules in that skill. For each engineer question, use its Q&A answer format: lead with a short direct answer, cite evidence, identify change impact, gaps, and references, and add other sections only when useful. For a compiled artifact, use the skill's document shell and numbered question sections. Preserve questions and answers across the discovery artifact.

Use the discovery bundles first and verify material behavior in available source checkouts. Distinguish graph facts, source-verified facts, inference, and unknowns; identify snapshot limitations. Ask focused questions when needed. Help the engineer understand the problem, requirements, affected services, dependencies, constraints, and impact. Do not select a design or implement changes in this stage.

Work interactively with the engineer. Treat the handoff as context, not permission to bypass native tool approvals. Report uncertainty and preserve evidence of failures.
