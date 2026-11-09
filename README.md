# open-dev-flow

A local, engineer-led workspace for taking a software change from discovery to implementation and review. Use a fresh Claude Code or Codex session for each step, with explicit shared artifacts instead of automatically carrying every conversation forward.

## What it does

- Create an initiative and choose and order its workflow steps.
- Explore the existing system through engineer-led Q&A, then discuss and approve a technical plan and test-data table.
- Optionally run baseline API and UI automation, implement the change, review the PR, and add new automation.
- Preview the artifacts, repository paths, and stage instructions passed to an agent. Review generated artifacts as Markdown, including Mermaid diagrams.
- Use the interactive agent terminal or open a separate manual terminal in a registered checkout.
- Keep versioned artifacts, approval records, session history, and handoff snapshots locally.

The engineer starts each step explicitly. Editing an approved plan or test-data table makes the approval stale. Implementation, review, and automation require the current plan and test data to be approved. Plan approval does not grant separate permissions for agent actions.

## Requirements

- Node.js 22.13 or later; Node.js 24 is recommended.
- npm and at least one locally installed and authenticated `codex` or `claude` CLI.
- Local checkouts for the repositories used by the selected workflow. `node-pty` may require native build tools if a prebuilt binary is not available.

Claude Code sessions are launched with `--dangerously-skip-permissions`, including on resume. They can act with the local user's permissions without prompting. Codex uses its configured permissions. The server listens on loopback and is designed for a single local user, not network exposure.

## Run locally

```sh
npm install
npm start
```

Open [http://127.0.0.1:3210](http://127.0.0.1:3210). To use a different port, run `PORT=3211 npm start`.

State, artifacts, and terminal logs are stored under `.workflow/` by default. Set `WORKFLOW_DATA_DIR` to use another directory. The `.workflow/` and `projects/` directories and installed dependencies are ignored by Git. Terminal output can contain sensitive information, so protect the data directory as you would the associated checkouts.

Run the automated checks with:

```sh
npm test
```

## Workflow

1. **Create an initiative.** Select and arrange the built-in steps, then register the local repository paths. The same checkout can serve multiple roles. Technical plan must precede implementation, review, and automation steps.
2. **Discovery and Q&A.** Ask the agent about the existing system. Generate the discovery artifact from the session, review it, and ask follow-up questions.
3. **Technical plan.** Discuss design options with the agent. Save and approve the plan and test-data table.
4. **Implementation and optional automation.** Start the selected stages explicitly. Implementation is instructed to fetch the latest `master` and use a dedicated worktree. API and UI automation can be skipped or selected independently.
5. **Implementation review.** Supply PR links, run the review, and inspect the generated review artifact and any changes. The configured review skill can publish GitHub reviews and comments.
6. **Inspect and continue.** Use session history to view handoffs and logs. The manual Terminal tab runs your own shell in a selected checkout. Claude sessions can be resumed; Codex resume is not yet exposed.

Shared artifacts can also be edited and saved manually. An automatic capture stops if the artifact was edited while the agent was preparing it. Agent work remains subject to the available CLI, repository access, and authentication; unavailable operations must be reported as gaps.

## Current integrations and limits

The default discovery step expects a `bfi-service-discoveries` checkout containing its `AGENTS.md` and `ste-docs` skill. The implementation-review step currently accepts `bfi-finance` GitHub PR links and uses the locally installed `/auto-review-pr` skill. Those integrations must be available for their respective steps; select a different subset of built-in steps if they are not needed. Workspace sessions are instructed not to use Superpowers skills.

The application sends the implementation worktree instructions to the agent; it does not itself create that worktree or verify that the agent followed the instructions. Automatic review capture depends on the agent writing the requested result file before the session ends. Running sessions and manual terminals stop when the server restarts. This version supports one local user and does not implement team hosting.

The built-in stage definitions are in `server.js`, and their instructions are in `skills/`. See [the architecture decision and limitations](docs/architecture.md) for more detail.
