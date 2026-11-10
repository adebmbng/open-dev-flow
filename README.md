# open-dev-flow

A local, engineer-led workspace for taking a software change from discovery to implementation and review. Use a fresh Claude Code, Codex, or OpenCode session for each step, with explicit shared artifacts instead of automatically carrying every conversation forward.

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
- npm and at least one locally installed and authenticated `codex`, `claude`, or `opencode` CLI. OpenCode must support creating a session with `--session` and `--prompt` (verified with v2.2.2).
- Local checkouts for the repositories used by the selected workflow. `node-pty` may require native build tools if a prebuilt binary is not available.

Claude Code sessions are launched with `--dangerously-skip-permissions`, including on resume. They can act with the local user's permissions without prompting. Codex and OpenCode use their configured permissions. The server listens on loopback and is designed for a single local user, not network exposure.

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
5. **Implementation review.** Review the PR links carried from the saved implementation artifact (or enter them manually), run the review, and inspect the generated review artifact and any changes. The configured review skill can publish GitHub reviews and comments.
6. **Inspect and continue.** Use History to view sessions from every step in the current initiative, inspect handoffs and logs, and attach to running sessions. Switching initiatives or steps detaches the terminal view without stopping the agent. The manual Terminal tab runs your own shell in a selected checkout. Claude and OpenCode sessions can be resumed in their original step; Codex resume is not yet exposed.

Shared artifacts can also be edited and saved manually. The server monitors pending captures even if the browser page closes; reconnect to the session to see their status. You can cancel a pending capture and retry when the agent is ready. Cancelling capture does not stop the agent. An automatic capture stops if the artifact was edited while the agent was preparing it. Pending jobs do not survive a server restart. Agent work remains subject to the available CLI, repository access, and authentication; unavailable operations must be reported as gaps.

## Current integrations and limits

The default discovery step expects a `bfi-service-discoveries` checkout containing its `AGENTS.md` and `ste-docs` skill. The implementation-review step currently accepts `bfi-finance` GitHub PR links and includes the selected provider’s installed `auto-review-pr` and `code-review` skill text in its handoff. The handoff records the skill paths and content digests. Set `OPEN_DEV_FLOW_AUTO_REVIEW_SKILL` or `OPEN_DEV_FLOW_CODE_REVIEW_SKILL` to an absolute `SKILL.md` path to override discovery. GIFs follow the skill’s optional GIPHY configuration and depend on its API and network availability. Those integrations must be available for their respective steps; select a different subset of built-in steps if they are not needed. Workspace sessions are instructed not to use Superpowers skills.

The application sends the implementation worktree instructions to the agent; it does not itself create that worktree or verify that the agent followed the instructions. Automatic review capture depends on the agent writing the requested result file before the session ends. Running sessions and manual terminals stop when the server restarts. This version supports one local user and does not implement team hosting.

The built-in stage definitions are in `server.js`, and their instructions are in `skills/`. See [the architecture decision and limitations](docs/architecture.md) for more detail.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidance and [SECURITY.md](SECURITY.md) for reporting vulnerabilities. This project is licensed under the [MIT License](LICENSE).
