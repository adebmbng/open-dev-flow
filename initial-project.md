# Engineer-led AI workflow workspace: implementation plan

## Instructions for Codex

Use this document as the starting specification for building a local, web-based workspace for a software engineering team. First inspect the existing workspace and any applicable project instructions. If there is an existing implementation, understand and reuse it. If the workspace is empty, investigate the candidate projects below before choosing a foundation; record the evidence and tradeoffs in a short architecture decision. Then implement the first usable end-to-end version, run appropriate checks, and report what works and what remains.

Do not assume a candidate project has an integration API or a capability until you verify its documentation and source code. Make reasonable implementation choices where details are missing; ask the user only for decisions that block progress. Use mock adapters or documented setup for unavailable external services, and clearly label functionality that is not connected.

## Goal

Provide one shared workspace per engineering change. An engineer moves through six stages, interacting with Claude Code or Codex in each stage. Every stage starts a **new native agent session**, with a fresh context assembled from selected shared artifacts and repository information. The workspace tracks what is ready next and lets the engineer inspect and edit the handoff.

This is an engineer-led workflow. The engineer explores the problem and chooses the design in stages 1–2. In stages 3–6 the agent performs the requested work, with an interactive session for the engineer to monitor, steer, and review. Do not automatically advance or launch the next stage without an explicit engineer action.

## Operating assumptions

- The web application and agent processes run locally on a developer machine for the first version. Structure the code so team-hosted operation can be added later; do not claim multi-user support unless implemented.
- The team supplies locally installed and authenticated Claude Code and/or Codex CLIs. Their normal account, network, and usage requirements still apply. The workspace is local; model inference is not necessarily local.
- Repositories may be separate local checkouts: service implementation, API automation, and UI automation. Allow one checkout to serve multiple roles.
- Use a configurable six-stage workflow, with this sequence supplied as the default. Prefer a simple versioned configuration over building a general-purpose visual workflow editor in the first version.
- A stage session can be resumed within that stage after interruption. Starting a different stage always creates a new session; do not attempt to transfer or convert native agent sessions between providers.
- Conversation transcripts are useful evidence, but structured, reviewable artifacts are the source of shared context. Do not silently treat an AI summary as an approved decision.

## Workflow

### 1. Discovery and Q&A

The engineer asks questions and collaborates with the agent to understand the problem. The agent explores the configured service repositories and any explicitly configured discovery sources, identifies likely impacts and asks for clarification when needed. It must distinguish verified facts from assumptions and cite files or other available evidence.

Shared outputs: problem statement, requirements, affected services and dependencies, impact, constraints, evidence, assumptions, decisions, and unresolved questions. The engineer reviews and edits these before continuing.

### 2. Technical plan and test-data table

Start a new session with the reviewed discovery artifacts. The agent proposes design options and tradeoffs; the engineer discusses them and chooses the design. Produce a technical plan including requirements, chosen and rejected options, service/API/data changes, dependencies, risks, rollout and verification approach, acceptance criteria, and a test-data table. The table should support scenario, preconditions, inputs/data, expected result, data setup, and cleanup as applicable.

The engineer explicitly approves a specific saved version of the plan and test-data table. Record approver identity as supplied locally, timestamp, and a content digest. Editing approved content makes that approval stale and blocks starting stages 3–6 until it is approved again. This local record is a workflow aid, not a substitute for organizational identity or authorization.

### 3. Existing API automation

Start a new session with the approved plan, relevant discovery context, test-data table, and API automation repository instructions. The agent implements tests covering relevant existing behavior before the service implementation, runs appropriate checks where available, and reports changes, commands, results and gaps. Record repository and branch/commit or diff references.

### 4. Existing UI automation

Start a new session with relevant approved artifacts, test data, stage 3 results, and UI automation repository instructions. The agent implements UI automation for test-data preparation and for checking existing behavior as applicable. Record changes, execution results, setup/cleanup needs, and gaps.

### 5. Implementation PR

Start a new session with the approved plan, relevant discovery findings, repository instructions, and baseline test references/results. The agent implements the change and prepares an implementation PR where repository access and authentication allow. Record the branch, commit, PR link, checks, and limitations. If PR creation is unavailable, leave a reviewable branch/diff and a clear explanation. Respect repository instructions and any existing approval requirements.

### 6. New API and UI automation

Start a new session with the approved plan, implementation PR/commit, existing coverage, test data and relevant repository instructions. The agent adds automation for the new behavior, runs feasible checks, and records changes, results and remaining gaps. Support API and UI automation in separate repositories; make the resulting branches or PRs explicit.

## Context and state model

Each change workspace should contain:

- Stable change ID, title, description, status and timestamps.
- Registered repositories: role, local path, optional remote URL and branch/reference. Validate paths and show which files the agent will access.
- Stage definitions and ordering; stage statuses such as not started, in progress, awaiting engineer, completed and blocked. Allow an engineer to revisit a stage without deleting prior history.
- One or more session records per stage, including provider, native session ID when available, working directory, status, creation time and transcript/log reference. Sessions may be resumed within their original stage.
- Versioned shared artifacts: discovery, decisions, requirements, plan, test-data table, baseline API and UI results, implementation result, and new-test results. Store sources and mark unresolved questions and assumptions clearly.
- Plan approval tied to the exact content version/digest; track when it becomes stale.
- A handoff manifest per session: exact artifact versions, repository references, stage instructions and other context passed to the agent. Keep it inspectable and editable before launch; record what was actually sent.

Store metadata in a local database and artifacts as readable files or another easily exportable form. Choose and document the actual storage format after inspecting the chosen foundation. Never store API keys or authentication tokens in artifacts or logs intentionally.

For each stage, provide a sensible default selection of relevant artifacts rather than injecting all prior transcripts. Let the engineer add or remove context and view the final handoff. Clearly show missing, stale, or unapproved inputs before starting. Preserve links to original session transcripts as evidence without depending on the entire transcript for continuity.

## First-version user experience

1. Create a change and register service, API-test and UI-test checkouts.
2. Open a stage, select an available agent and start a fresh session. Show live output and allow interactive follow-ups and permission responses supported by the selected adapter.
3. Capture outputs into shared artifacts; the engineer can review and edit them. Show evidence and distinguish verified facts from assumptions.
4. Review and approve the saved plan and test-data table before starting later stages. Display stale approvals after edits.
5. Show the next suggested stage, its prerequisites and a preview of the context it will receive. The engineer explicitly starts it.
6. Show stage history, results, associated session IDs, artifact versions, repository references and links to PRs or diffs.

Do not make stage completion or advancement depend solely on an agent saying it is done. The engineer can mark a stage complete after reviewing outputs. Make failed or unavailable test execution visible, rather than reporting it as a pass.

## Foundation investigation

Evaluate these as potential building blocks, not required dependencies:

- [CCManager](https://github.com/luyi256/CCManager): investigate its license, deployment, interactive session APIs, Claude/Codex adapters, extensibility, and whether it can expose or persist the session identifiers and handoff needed here.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec): investigate its current license, Claude/Codex support, artifact structure, customization, and whether it helps represent shared change artifacts without dictating an incompatible workflow.
- [Cezarion](https://github.com/hearsay-tools/cezarion): inspect its session interaction and workflow model only if useful; automatic stage advancement is not the desired interaction model.

Compare reuse against implementing a small web application with native agent adapters. Verify project maturity, licensing obligations, permissions, local deployment, and maintenance implications. Do not assume these projects integrate with each other. Select the smallest practical solution that supports interactive sessions and explicit context handoffs; document any missing feature or adaptation.

## Technical requirements and boundaries

- Keep agent adapters separate from workflow and storage. Define operations for availability, start, streaming output, interactive input, supported permission handling, and stage-local resume. Handle differences between providers explicitly rather than claiming feature parity.
- Never assume the native session format is shared between Claude and Codex. Show the selected provider per stage.
- Use explicit working directories and repository mappings. Avoid concurrent agents writing to the same checkout without the engineer knowing; use separate worktrees when appropriate and supported.
- Bind the local server to loopback by default. Protect state-changing endpoints and validate filesystem paths and process arguments. Clearly document the trust boundary before exposing the service on a network.
- Respect native CLI permissions and make agent access visible. A workflow approval for the plan does not automatically approve CLI tool actions, repository writes, PR creation, or merge operations.
- Preserve evidence of failed commands and incomplete work. Do not auto-merge PRs.
- Service discovery integrations depend on the team's environment. Start with registered local repos and make additional sources configurable; do not claim live discovery of infrastructure without a real integration.

## Implementation sequence

1. Inspect the workspace and evaluate the candidate foundations. Document the selected architecture, limitations and how the user starts it.
2. Build the local app shell, change workspace, stage definitions, repository registration and persistent storage.
3. Implement at least one real interactive agent adapter end to end, then the other. If either CLI is unavailable, provide a clearly marked mock adapter and document how to verify the real adapter later.
4. Implement artifacts, version history, the previewable handoff manifest, and fresh sessions per stage.
5. Implement the plan approval and stale-approval behavior, explicit stage completion, and next-stage suggestions.
6. Provide stage-specific templates and prompts for all six stages, including the test-data table and output/result capture.
7. Exercise an end-to-end sample with local fixture repositories. Add targeted tests for context selection, session isolation, approval invalidation and state persistence, plus adapter integration checks where the real CLI is available.
8. Document setup, authentication prerequisites, local launch, sample workflow, storage location, limitations and how to extend stages and repository integrations.

## Acceptance criteria

- An engineer can create a change, configure repository roles, and navigate the six stages in a browser.
- Starting each stage creates a new session and displays the selected agent and exact handoff. Reopening the same stage can resume its own session when the provider supports it.
- Discovery and planning support interactive questions and follow-ups. The engineer can edit shared outputs and select a design.
- The saved plan and test-data table require explicit approval. A subsequent edit invalidates that approval and blocks starting stages 3–6 until reapproved.
- Each later stage receives its selected approved and relevant artifacts, not an implicit dump of every previous conversation. Artifacts, session references and handoff versions survive an application restart.
- The engineer can launch and steer each automation or implementation stage, inspect output, record results and explicitly complete the stage. No next stage starts automatically.
- API/UI test repositories and implementation repositories can be mapped independently. The workspace records actual test results and PR or diff links without fabricating success.
- Local setup instructions and meaningful tests are provided. Any unavailable CLI, integration, unsupported interactive feature or unverified capability is clearly disclosed.

## Suggested first prompt for Codex

> Read `AI_WORKFLOW_IMPLEMENTATION_PLAN.md` and inspect this workspace. Investigate the proposed foundations before selecting one, then build the first usable local web application described in the plan. Keep each stage in a fresh Claude Code or Codex session and pass only explicit shared context between stages. Start by recording your architecture decision, then implement, test and document the result. Ask me only if a missing decision blocks implementation.

