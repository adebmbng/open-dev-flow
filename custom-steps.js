'use strict';
// Custom workflow steps are defined interactively with an agent and stored locally
// under the workspace data directory, never in the repository.
const fs = require('node:fs');
const path = require('node:path');

const limits = { request: 4000, title: 80, description: 300, skill: 100000 };
const idPattern = /^custom-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(title) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return slug || 'step';
}

function uniqueId(title, takenIds) {
  const base = 'custom-' + slugify(title);
  let candidate = base;
  for (let n = 2; takenIds.has(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

function text(value, field, max) {
  if (typeof value !== 'string' || !value.trim()) throw Error(`The step ${field} must be nonempty text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw Error(`The step ${field} must be at most ${max} characters`);
  return trimmed;
}

// Validates an agent-proposed definition. `kinds` lists the artifact kinds that may be used as inputs.
function normalizeDefinition(input, { roles, kinds }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('The step definition must be a JSON object');
  const title = text(input.title, 'title', limits.title).replace(/\s+/g, ' ');
  const description = text(input.description, 'description', limits.description).replace(/\s+/g, ' ');
  const skill = text(input.skill, 'skill', limits.skill);
  if (!roles.includes(input.role)) throw Error(`The step role must be one of: ${roles.join(', ')}`);
  const inputs = input.inputs === undefined ? [] : input.inputs;
  if (!Array.isArray(inputs) || inputs.some(k => typeof k !== 'string' || !kinds.includes(k)) || new Set(inputs).size !== inputs.length) throw Error(`The step inputs must be unique artifact kinds from: ${kinds.join(', ')}`);
  if (input.requiresApproval !== undefined && typeof input.requiresApproval !== 'boolean') throw Error('requiresApproval must be true or false');
  const requiresApproval = input.requiresApproval === true;
  // Approval-gated steps always receive the approved plan and test data.
  const required = requiresApproval ? ['plan', 'test-data'].filter(k => !inputs.includes(k)) : [];
  return { title, description, role: input.role, inputs: [...inputs, ...required], requiresApproval, skill };
}

function toStage(step) {
  return { id: step.id, title: step.title, role: step.role, optional: true, defaultEnabled: false, custom: true, requiresApproval: step.requiresApproval, artifacts: [...step.inputs, step.id], description: step.description, skill: step.skill };
}

function writeAtomic(file, content) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, content, { mode: 0o600 });
  fs.renameSync(temp, file);
}

// Reads stored steps. Invalid files are skipped and reported rather than preventing startup.
function loadStored(dir, { roles, builtinKinds, warn = console.warn }) {
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.json')); } catch { return []; }
  const loaded = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (typeof raw.id !== 'string' || !idPattern.test(raw.id) || file !== `${raw.id}.json`) throw Error('invalid id');
      const inputs = Array.isArray(raw.inputs) ? raw.inputs.filter(k => typeof k === 'string') : [];
      const definition = normalizeDefinition({ ...raw, inputs: [] }, { roles, kinds: [] });
      loaded.push({ ...raw, ...definition, inputs: [...new Set([...inputs, ...definition.inputs])] });
    } catch (e) { warn(`Skipping custom step ${file}: ${e.message}`); }
  }
  loaded.sort((a, b) => String(a.created).localeCompare(String(b.created)) || a.id.localeCompare(b.id));
  const known = new Set([...builtinKinds, ...loaded.map(s => s.id)]);
  return loaded.map(step => ({ ...step, inputs: step.inputs.filter(k => known.has(k) && k !== step.id) }));
}

function interviewPrompt({ request, sessionPolicy, roles, kindSources, example, outputFile }) {
  return `${sessionPolicy}

You are helping an engineer define a new custom workflow step for open-dev-flow, a local workspace where each workflow step is run by a fresh code agent session that receives the step's instructions (its "skill"), selected shared Markdown artifacts from earlier steps, and the configured repository checkout for the step's role.

The engineer's initial request is below. Treat it as a draft that needs refinement:
"""
${request}
"""

How to work:
1. Ask focused clarifying questions, a few at a time, until the purpose, scope, expected outputs, constraints, safety limits, and completion criteria of the step are clear. Do not assume answers. Inspect the open-dev-flow repository only if it helps you understand the conventions; do not modify it.
2. Propose a complete draft definition: title, one-sentence description, repository role, input artifacts, whether plan approval is required, and the full skill text. Explain your choices briefly.
3. Revise the draft based on the engineer's feedback. Only write the file after the engineer explicitly confirms the final draft.
4. Do not perform the step's work yourself, and do not create or modify any other files.

Definition fields:
- "title": short name, at most ${limits.title} characters.
- "description": one sentence, at most ${limits.description} characters, shown in the workflow step list.
- "role": the repository checkout used as the working directory. One of: ${roles.map(r => `"${r}"`).join(', ')} (discovery = service discovery documentation, service = service implementation, api = API automation tests, ui = UI automation tests).
- "inputs": array of shared artifact kinds from earlier steps given to the agent by default. Choose only from: ${kindSources.map(k => `"${k.kind}" (${k.source})`).join(', ')}. The step also gets its own artifact automatically.
- "requiresApproval": true when the step must only run after the engineer approves the technical plan and test-data table (for example, steps that change code); otherwise false. Approval-gated steps must be placed after the Technical plan step.
- "skill": Markdown instructions for the future agent that runs this step. Write it in the second-person imperative style of the built-in skills, state the inputs to use, the interactive and safety rules, what not to do, how to report blockers, and what the step's shared artifact should contain. Do not include YAML front matter.

Example of a built-in skill for style reference only:
"""
${example}
"""

When the engineer confirms, write a UTF-8 JSON object with exactly the keys title, description, role, inputs, requiresApproval and skill to this exact path:
${outputFile}
Write it to a temporary file in the same directory first, then atomically rename it to that path. The workspace validates it and saves the step locally; if it is rejected you will be told why, so fix the problem with the engineer and write it again. After it is accepted, tell the engineer that the step is available under Add workflow step in the workspace.`;
}

module.exports = { limits, idPattern, slugify, uniqueId, normalizeDefinition, toStage, writeAtomic, loadStored, interviewPrompt };
