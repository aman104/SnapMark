#!/usr/bin/env node
// SpecCraft state engine: reads the .speccraft workspace and decides the next step of the workflow.
// It is the single source of truth for that decision: 00-next, autopilot.sh and SpecCraft Board all
// use it, so they can never disagree. Zero dependencies, Node 18+. Run it from the repository root:
//
//   node .agents/skills/00-next/scripts/state.mjs            status and the next step (for people and agents)
//   node .agents/skills/00-next/scripts/state.mjs --json     the state and the decision as JSON
//   node .agents/skills/00-next/scripts/state.mjs --status   status lines only
//   node .agents/skills/00-next/scripts/state.mjs --shell    the decision as shell variables (autopilot.sh)
//   node .agents/skills/00-next/scripts/state.mjs --dirty    uncommitted product files, one per line
//
// Decision options: --stop-at spec|plan|milestone, --roast-rounds N, --accept Mnn, --changes TEXT,
// --feature TEXT, --milestones-at-start N. The rules are documented in ../SKILL.md -> "Step 3".

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ENGINE_VERSION = 1;

// The specification documents in workflow order, with the skill that writes each of them.
export const SPEC_DOCS = [
  { file: '01-Idea.md', skill: '01-discovery-idea', label: 'Idea', title: 'Shape the product idea' },
  { file: '02-General-PRD.md', skill: '03-discovery-prd', label: 'PRD', title: 'Write the requirements (PRD)' },
  { file: '03-Design.md', skill: '04-planning-design-system', label: 'Design', title: 'Define the design system' },
  { file: '04-Interface-spec.md', skill: '05-planning-interface', label: 'Interface', title: 'Specify the interface' },
  { file: '05-Tech-Stack.md', skill: '06-planning-tech-stack', label: 'Tech stack', title: 'Choose the tech stack' },
];

// Skill names used by older versions, mapped to the current ones (activity markers, old run logs).
export const SKILL_ALIASES = { '10-execution-initial': '10-execution-tasks' };
export const canonicalSkill = (s) => (typeof s === 'string' && SKILL_ALIASES[s]) || s;

// Workflow and toolkit files: their changes never block the next step.
export const NOT_PRODUCT = /^"?(\.speccraft\/|\.agents\/|\.claude\/|AGENTS\.md|CLAUDE\.md)/;

// ---------------------------------------------------------------- file helpers

const exists = (p) => fs.existsSync(p);
const readText = async (p) => {
  try { return await fsp.readFile(p, 'utf8'); } catch { return null; }
};
const listDir = async (p) => {
  try { return (await fsp.readdir(p, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name)); }
  catch { return []; }
};
const isEmpty = (t) => t === null || t === undefined || t.trim() === '';
export const stripComments = (t) => (t || '').replace(/<!--[\s\S]*?-->/g, '');

// ---------------------------------------------------------------- markdown parsers

export function parseTableAfter(lines, headingRe) {
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start < 0) return null;
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) break;
    if (!l.trim().startsWith('|')) { if (rows.length) break; continue; }
    const cells = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  if (!rows.length) return null;
  return { headers: rows[0], rows: rows.slice(1) };
}

// .speccraft/milestones.md: headings "## [s] Mnn - Name", fields "- **Field:** text" with indented items.
export function parseMilestones(md) {
  const lines = (md || '').split('\n');
  const titleLine = lines.find((l) => /^# /.test(l)) || '';
  const title = titleLine.replace(/^# /, '').replace(/^Milestones:\s*/i, '').trim();
  const milestones = [];
  let cur = null;
  let field = null;
  for (const line of lines) {
    const h = line.match(/^## \[(.)\] (M\d\d) - (.+)$/);
    if (h) {
      cur = { status: h[1], id: h[2], name: h[3].trim(), fields: {}, order: [] };
      milestones.push(cur);
      field = null;
      continue;
    }
    if (/^## /.test(line)) { cur = null; continue; }
    if (!cur) continue;
    const f = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (f) {
      field = f[1];
      cur.fields[field] = { text: f[2].trim(), items: [] };
      cur.order.push(field);
      continue;
    }
    const it = line.match(/^\s{2,}- (?:\[( |x|X)\] )?(.*)$/);
    if (it && field) {
      cur.fields[field].items.push({ checked: it[1] === undefined ? null : it[1].toLowerCase() === 'x', text: it[2] });
    }
  }
  for (const m of milestones) {
    const ph = m.fields.Phase?.text || '';
    const num = ph.match(/^(\d+(?:[–-]\d+)?\+?)/);
    m.phase = { label: ph, key: num ? num[1] : ph || '—' };
  }
  return {
    title,
    roadmap: parseTableAfter(lines, /^## Roadmap/),
    coverage: parseTableAfter(lines, /^## Coverage/),
    milestones,
  };
}

// tasks.md of a milestone: "[s] NNN - Name - Description".
export function parseTasks(md) {
  const tasks = [];
  let title = '';
  for (const line of (md || '').split('\n')) {
    if (!title && /^# /.test(line)) title = line.replace(/^# /, '').trim();
    const m = line.match(/^\[(.)\] (\d{3}) - (.+?) - (.*)$/) || line.match(/^\[(.)\] (\d{3}) - (.+)$/);
    if (m) tasks.push({ status: m[1], num: m[2], name: m[3].trim(), description: (m[4] || '').trim() });
  }
  return { title, tasks };
}

export function planSummary(md) {
  if (isEmpty(md)) return null;
  const get = (label) => {
    const m = md.match(new RegExp(`^- \\*\\*${label}:\\*\\*\\s*(.*)$`, 'mi'));
    return m ? m[1].replace(/`/g, '').trim() : null;
  };
  const parallel = get('Parallel');
  return {
    type: get('Type'),
    dependsOn: get('Depends on'),
    deps: (get('Depends on') || '').match(/\b\d{3}\b/g) || [],
    parallel: parallel ? (/^safe/i.test(parallel) ? 'safe' : 'exclusive') : null,
    parallelNote: parallel,
    sources: get('Sources'),
  };
}

export function reviewSummary(md) {
  if (!md) return null;
  const rounds = [...md.matchAll(/^## Round (\d+)\s*[—-]\s*([^—\n]+?)\s*(?:[—-].*)?$/gm)];
  if (!rounds.length) return { rounds: 0, verdict: null };
  const last = rounds[rounds.length - 1];
  return { rounds: rounds.length, verdict: last[2].trim().toLowerCase() };
}

export function parseSections(md) {
  const out = {};
  let cur = null;
  for (const line of (md || '').split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) { cur = h[1].trim(); out[cur] = []; continue; }
    if (cur && line.trim()) out[cur].push(line);
  }
  return out;
}

// .speccraft/autopilot.md and the roast rounds in .speccraft/docs/01-Idea-roast.md.
export function parseAutopilot(text, roastText) {
  const sec = parseSections(stripComments(text));
  const setting = (name) => {
    for (const l of sec.Settings || []) {
      const m = l.match(/^- ([^:]+):\s*(.*)$/);
      if (m && m[1].trim() === name) return m[2].replace(/`/g, '').trim().split(/\s+/)[0] || null;
    }
    return null;
  };
  const verdicts = [...(roastText || '').matchAll(/next round needed[*:\s]*(yes|no)/gi)].map((m) => m[1].toLowerCase());
  const raw = setting('Roast rounds');
  const rounds = raw === null ? NaN : Number(raw);
  return {
    exists: text !== null && text !== undefined,
    stopAt: ['spec', 'plan', 'milestone'].includes(setting('Stop at')) ? setting('Stop at') : 'milestone',
    roastRounds: Number.isInteger(rounds) && rounds >= 0 ? rounds : 3,
    agent: setting('Agent'),
    model: setting('Model'),
    brief: (sec.Brief || []).join('\n').trim(),
    decisions: (sec['Decisions to review'] || []).filter((l) => /^\s*-\s+\S/.test(l)).map((l) => l.replace(/^\s*-\s+/, '')),
    roastDone: ((roastText || '').match(/^## Round \d/gm) || []).length,
    // a missing verdict means "yes": only an explicit "no" ends the roast early
    roastConverged: verdicts.length > 0 && verdicts[verdicts.length - 1] === 'no',
  };
}

// ---------------------------------------------------------------- git

export function gitIn(root, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: root, timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? null : stdout.trimEnd())); // keep leading spaces: porcelain status starts with them
  });
}

const statusPath = (l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '');

export async function readGit(root) {
  const branch = await gitIn(root, ['branch', '--show-current']);
  if (branch === null) return null;
  const [status, branches, merge] = await Promise.all([
    gitIn(root, ['status', '--porcelain']),
    gitIn(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/milestone/', 'refs/heads/task/', 'refs/heads/attic/']),
    gitIn(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']),
  ]);
  const dirty = (status || '').split('\n').filter(Boolean);
  const product = dirty.filter((l) => !NOT_PRODUCT.test(l.slice(3))).map(statusPath);
  return {
    branch: branch || '(detached)',
    dirty: dirty.length,
    dirtyFiles: dirty.slice(0, 200).map(statusPath),
    productDirty: product.slice(0, 200),
    dirtyOutsideSpec: product.length,
    branches: (branches || '').split('\n').filter(Boolean),
    merging: !!merge,
  };
}

// ---------------------------------------------------------------- the workspace

async function milestoneFolder(spec, id) {
  for (const d of await listDir(path.join(spec, 'milestones'))) {
    if (d.isDirectory() && d.name.startsWith(`${id}-`)) return path.join(spec, 'milestones', d.name);
  }
  return null;
}

async function loadMilestoneDetail(spec, m) {
  const rel = (p) => path.relative(spec, p).split(path.sep).join('/');
  const dir = await milestoneFolder(spec, m.id);
  m.folder = dir ? rel(dir) : null;
  m.hasTaskList = false;
  m.tasks = [];
  m.files = { report: null, summaries: [], screenshots: [] };
  if (dir) {
    const tasksMd = await readText(path.join(dir, 'tasks.md'));
    m.hasTaskList = !isEmpty(tasksMd);
    if (tasksMd) m.tasks = parseTasks(tasksMd).tasks;
    const taskDirs = new Map();
    for (const e of await listDir(dir)) {
      if (e.isDirectory() && /^\d{3}-/.test(e.name)) taskDirs.set(e.name.slice(0, 3), e.name);
      if (e.isFile() && e.name === 'milestone-report.md') m.files.report = rel(path.join(dir, e.name));
      if (e.isFile() && e.name.startsWith('run-summary-')) m.files.summaries.push(rel(path.join(dir, e.name)));
    }
    for (const s of await listDir(path.join(dir, 'screenshots'))) {
      if (s.isFile() && /\.(png|jpe?g|gif|webp|svg)$/i.test(s.name)) m.files.screenshots.push(rel(path.join(dir, 'screenshots', s.name)));
    }
    m.files.summaries.reverse();
    for (const t of m.tasks) {
      const tdName = taskDirs.get(t.num);
      t.folder = tdName ? rel(path.join(dir, tdName)) : null;
      t.files = {};
      if (!tdName) continue;
      for (const f of ['implementation-plan.md', 'report.md', 'review.md', 'blocker.md']) {
        const p = path.join(dir, tdName, f);
        if (exists(p)) t.files[f.replace('.md', '')] = rel(p);
      }
      const plan = await readText(path.join(dir, tdName, 'implementation-plan.md'));
      // an empty plan counts as missing
      if (isEmpty(plan)) delete t.files['implementation-plan'];
      t.plan = planSummary(plan);
      t.review = reviewSummary(await readText(path.join(dir, tdName, 'review.md')));
    }
  }
  for (const t of m.tasks) t.files ||= {};
  m.counts = { pending: 0, review: 0, done: 0, blocked: 0 };
  for (const t of m.tasks) {
    if (t.status === 'x') m.counts.done++;
    else if (t.status === '~') m.counts.review++;
    else if (t.status === '!') m.counts.blocked++;
    else m.counts.pending++;
  }
}

// Everything the decision needs, plus the details SpecCraft Board shows. Paths are relative to .speccraft/.
export async function readWorkspace(root, { git = true } = {}) {
  const spec = path.join(root, '.speccraft');
  const docsDir = path.join(spec, 'docs');
  const docs = [];
  for (const d of await listDir(docsDir)) {
    if (!d.isFile() || !d.name.endsWith('.md')) continue;
    const p = path.join(docsDir, d.name);
    const text = await readText(p);
    const st = await fsp.stat(p);
    const h1 = (text || '').match(/^# (.+)$/m);
    docs.push({ name: d.name, path: `docs/${d.name}`, empty: isEmpty(text), title: h1 ? h1[1].trim() : d.name.replace(/\.md$/, ''), mtime: st.mtimeMs, words: text ? text.split(/\s+/).filter(Boolean).length : 0 });
  }
  const msText = await readText(path.join(spec, 'milestones.md'));
  const parsed = parseMilestones(msText);
  for (const m of parsed.milestones) await loadMilestoneDetail(spec, m);
  const autopilot = parseAutopilot(await readText(path.join(spec, 'autopilot.md')), await readText(path.join(docsDir, '01-Idea-roast.md')));
  return {
    engine: ENGINE_VERSION,
    workspace: exists(spec),
    title: parsed.title,
    docs,
    roadmap: parsed.roadmap,
    coverage: parsed.coverage,
    milestones: parsed.milestones,
    autopilot,
    git: git ? await readGit(root) : null,
  };
}

// ---------------------------------------------------------------- the decision

export const docOk = (state, file) => state.docs.some((d) => d.name === file && !d.empty);

// Where the project is, as the stages of SpecCraft Board show it.
export function stageOf(state) {
  const ms = state.milestones;
  if (!SPEC_DOCS.every((d) => docOk(state, d.file))) return { id: 'spec', milestone: null };
  if (!ms.length) return { id: 'roadmap', milestone: null };
  const review = ms.find((m) => m.status === '?');
  if (review) return { id: 'review', milestone: review.id };
  const active = ms.find((m) => m.status === '>');
  if (active) {
    const missing = active.tasks.some((t) => t.status === ' ' && !t.files['implementation-plan']);
    return { id: missing || !active.hasTaskList ? 'plans' : 'build', milestone: active.id };
  }
  const next = ms.find((m) => m.status === ' ');
  if (next) return { id: 'tasks', milestone: next.id };
  return { id: 'done', milestone: null };
}

// Tasks of the active milestone that can be implemented now: pending, with every dependency of this
// milestone done (dependencies on earlier milestones are done by definition).
export function eligibleTasks(m) {
  const tasks = m.tasks || [];
  const done = new Set(tasks.filter((t) => t.status === 'x').map((t) => t.num));
  const inMilestone = new Set(tasks.map((t) => t.num));
  return tasks.filter((t) => t.status === ' ' && (t.plan?.deps || []).every((d) => d === t.num || !inMilestone.has(d) || done.has(d)));
}

const list = (xs, n = 6) => xs.slice(0, n).join(', ') + (xs.length > n ? `, … (${xs.length - n} more)` : '');

/**
 * The next step, by the rules of 00-next -> "Step 3". Returns
 *   { kind: 'skill' | 'gate' | 'point' | 'done', step, skill, key, title, detail, hint, note,
 *     stage, milestone, task, action, ... }
 * kind "skill": run `skill` (step "build" means: run 10-execution-tasks, or run-milestone.sh).
 * kind "gate": only the operator can continue. kind "point": the --stop-at point is reached.
 * key identifies the step and its input: the same key twice in a row means the step made no progress.
 * note is an extra instruction for an unattended agent; hint is the terminal command that continues.
 */
export function decide(state, options = {}) {
  const ap = state.autopilot || parseAutopilot(null, null);
  const o = { stopAt: null, roastRounds: ap.roastRounds, accept: null, changes: '', feature: '', milestonesAtStart: null, ...options };
  const ms = state.milestones || [];
  const stage = stageOf(state);
  const base = { stage: stage.id, milestone: stage.milestone, task: null, action: null, key: null, note: '', hint: '' };
  const make = (kind, fields) => ({ ...base, kind, step: null, skill: null, ...fields });
  const step = (skill, fields) => make('skill', { step: skill, skill, key: skill.slice(0, 2), ...fields });
  const allowed = (what) => !((o.stopAt === 'spec' && (what === 'plan' || what === 'build')) || (o.stopAt === 'plan' && what === 'build'));

  // Rule 1: changes nobody committed, or a merge in progress
  const g = state.git;
  if (g?.productDirty?.length) {
    return make('gate', { title: 'Uncommitted changes in the product', detail: `${g.productDirty.length} changed file(s) outside .speccraft/: ${list(g.productDirty)}. Commit or stash them before the next step.`, files: g.productDirty });
  }
  if (g?.merging) return make('gate', { title: 'A git merge is in progress', detail: 'Finish or abort the merge before the next step.' });

  // Rules 2–6: the specification
  if (!docOk(state, '01-Idea.md')) {
    if (ap.brief) {
      return step('01-discovery-idea', {
        title: 'Turn your brief into the idea',
        detail: 'The brief in .speccraft/autopilot.md is ready: 01-discovery-idea (Mode 4) writes 01-Idea.md from it.',
        note: 'Create .speccraft/docs/01-Idea.md from the brief in .speccraft/autopilot.md -> "Brief", following "Mode 4: Autonomous" of the skill.',
      });
    }
    return make('gate', {
      skill: '01-discovery-idea',
      title: 'Shape the product idea',
      detail: 'Describe your idea: interactively with 01-discovery-idea, or as a brief for the full autopilot, which takes it from the brief to a built first milestone.',
      hint: 'Give the autopilot a brief: autopilot.sh "<your idea>", or write it in .speccraft/autopilot.md -> Brief.',
    });
  }
  if (!docOk(state, '02-General-PRD.md')) {
    const done = ap.roastDone || 0;
    if (done < o.roastRounds && !ap.roastConverged) {
      return step('02-discovery-idea-roast', {
        key: `02:${done}`,
        round: done + 1,
        title: `Roast the idea (round ${done + 1} of up to ${o.roastRounds})`,
        detail: done
          ? `The last round asked for another one. ${o.roastRounds - done} round(s) left before the PRD.`
          : 'Stress-tests the idea, checks competitors and fixes its weak points before the PRD. Optional: skip it with 03-discovery-prd, or set Roast rounds: 0 in .speccraft/autopilot.md.',
        alt: { skill: '03-discovery-prd', title: 'Skip to the PRD' },
        note: `This is roast round ${done + 1} of at most ${o.roastRounds}. Follow the skill's "Autonomous mode": one round, apply the fixes to 01-Idea.md, append the round to .speccraft/docs/01-Idea-roast.md and say whether another round is needed.`,
      });
    }
    return step('03-discovery-prd', {
      title: 'Write the requirements (PRD)',
      detail: done ? `The idea went through ${done} roast round(s)${ap.roastConverged ? ' and converged' : ''}. Creates .speccraft/docs/02-General-PRD.md.` : 'Creates .speccraft/docs/02-General-PRD.md.',
    });
  }
  for (const d of SPEC_DOCS.slice(2)) {
    if (!docOk(state, d.file)) return step(d.skill, { title: d.title, detail: `Creates .speccraft/docs/${d.file}.` });
  }

  // Rule 7: the roadmap
  if (!ms.length) {
    return step('07-planning-milestones', { title: 'Plan the roadmap', detail: 'Splits v1 into phases and milestones in .speccraft/milestones.md. Review the whole specification afterwards, before any code is written.' });
  }

  // A feature or fix requested by the operator (autopilot --feature): 12-feature-advisor adds a milestone.
  if (o.feature && (o.milestonesAtStart === null || ms.length <= o.milestonesAtStart)) {
    return step('12-feature-advisor', {
      key: `12:${ms.length}`,
      title: 'Plan the requested feature or fix',
      detail: 'Updates the specification and adds a milestone for the change.',
      note: `The operator requests this change (their words): <<<${o.feature}>>>. Analyse it, write the feature plan, apply the specification updates yourself (the operator chose to run this unattended, so this request is the approval; record anything debatable in Decisions to review), and append the new milestone.`,
    });
  }

  // Rule 8: an accepted milestone whose branch was not merged yet
  const branches = g?.branches || [];
  const unmerged = ms.find((m) => m.status === 'x' && m.folder && branches.includes(`milestone/${m.folder.split('/').pop()}`));
  if (unmerged) {
    const branch = `milestone/${unmerged.folder.split('/').pop()}`;
    return step('08-planning-tasks', {
      key: `08:merge:${unmerged.id}`,
      milestone: unmerged.id,
      title: `Merge accepted ${unmerged.id}`,
      detail: `${unmerged.id} is accepted, but its branch ${branch} is not merged into the base branch yet.`,
      note: `Milestone ${unmerged.id} is accepted ([x]) but its branch ${branch} is not merged into the base branch yet. Merge it as the skill's Git section describes, then continue with the skill.`,
    });
  }

  // Rule 9: a milestone waits for the operator's review
  const review = ms.find((m) => m.status === '?');
  if (review) {
    const report = review.files?.report ? `.speccraft/${review.files.report}` : `${review.folder ? `.speccraft/${review.folder}` : `.speccraft/milestones/${review.id}-*`}/milestone-report.md`;
    if (o.changes) {
      return step('08-planning-tasks', {
        key: `08:changes:${review.id}`,
        milestone: review.id,
        title: `Plan the changes you requested for ${review.id}`,
        detail: 'Adds rework tasks to the milestone and sets it back to active.',
        note: `The operator reviewed milestone ${review.id} and requests changes (their words): <<<${o.changes}>>>. This is the operator decision of Step 1, case 1 (changes requested): follow "Rework tasks" - record the feedback in the milestone report, add the rework tasks and set ${review.id} back to [>].`,
      });
    }
    if (o.accept === review.id) {
      return step('08-planning-tasks', {
        key: `08:accept:${review.id}`,
        milestone: review.id,
        title: `Accept ${review.id} and plan the next milestone`,
        detail: 'Records your acceptance, applies the spec changes, merges the milestone and plans the next one.',
        note: `The operator has accepted milestone ${review.id}: they reviewed it and started the autopilot with --accept ${review.id} on ${new Date().toISOString().slice(0, 10)}. This is the explicit operator decision required by Step 1, case 1. Accept ${review.id}, apply its spec changes, merge it into the base branch, then plan the tasks of the next milestone.${allowed('plan') ? '' : ' Stop after the merge: do not plan the next milestone in this step.'}`,
      });
    }
    const decisions = ap.decisions?.length || 0;
    return make('gate', {
      skill: '08-planning-tasks',
      milestone: review.id,
      title: `Review ${review.id} — ${review.name}`,
      detail: `${review.id} is built and waits for your review: ${report} (demo steps, exit criteria, spec changes).${decisions ? ` Also check the ${decisions} decision(s) the autopilot made for you in .speccraft/autopilot.md.` : ''} Then accept it or request changes.`,
      hint: `Accept and continue: autopilot.sh --accept ${review.id}. Request changes: autopilot.sh --changes "<what to change>", or write them in the report -> "Operator decision" and run 08-planning-tasks.`,
    });
  }

  // Rule 10: no active milestone
  const active = ms.find((m) => m.status === '>');
  if (!active) {
    const next = ms.find((m) => m.status === ' ');
    if (!next) {
      return make('done', { skill: '12-feature-advisor', title: 'The roadmap is complete', detail: 'Every milestone is accepted. Add features or fixes with 12-feature-advisor; consider a security review with 11-security-researcher.' });
    }
    if (!allowed('plan')) {
      return make('point', { title: 'The specification and the roadmap are ready', detail: 'Stopped here (stop at: spec). Review .speccraft/docs/ and .speccraft/milestones.md.', hint: 'Continue: autopilot.sh --stop-at plan (or --stop-at milestone).' });
    }
    const first = ms.every((m) => m.status === ' ');
    return step('08-planning-tasks', {
      key: `08:plan:${next.id}`,
      milestone: next.id,
      title: `Plan tasks for ${next.id} — ${next.name}`,
      detail: first
        ? 'Creates the milestone branch and its task list. This is the last step before code: review the specification and the roadmap first.'
        : 'Creates the milestone branch and its task list.',
      note: `Plan the tasks of milestone ${next.id} (Step 1, case 3).`,
    });
  }

  // Rules 11–14: the active milestone
  const tasks = active.tasks;
  const dir = active.folder ? `.speccraft/${active.folder}` : null;
  if (!active.hasTaskList) {
    return make('gate', { skill: '08-planning-tasks', milestone: active.id, title: `${active.id} has no task list`, detail: `Milestone ${active.id} is active but has no tasks.md. Run 08-planning-tasks for it.` });
  }
  const noPlan = tasks.filter((t) => t.status === ' ' && !t.files['implementation-plan']);
  if (noPlan.length) {
    if (!allowed('plan')) {
      return make('point', { milestone: active.id, title: `Stopped before planning ${active.id}`, detail: 'Stopped here (stop at: spec).', hint: 'Continue: autopilot.sh --stop-at plan (or --stop-at milestone).' });
    }
    return step('09-planning-task-details', {
      key: `09:${active.id}:${noPlan.length}`,
      milestone: active.id,
      title: `Write implementation plans for ${active.id}`,
      detail: `${noPlan.length} pending task(s) without a plan: ${list(noPlan.map((t) => t.num), 10)}.`,
      note: `Write the implementation plans of milestone ${active.id}: ${noPlan.length} pending task(s) have none.`,
    });
  }
  const inReview = tasks.filter((t) => t.status === '~');
  const eligible = eligibleTasks(active);
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'x');
  const blocked = tasks.filter((t) => t.status === '!');
  if (!inReview.length && !eligible.length && !allDone) {
    if (blocked.length) {
      return make('gate', {
        milestone: active.id,
        title: `${active.id} is blocked`,
        detail: `Task(s) ${blocked.map((t) => t.num).join(', ')} are blocked${tasks.some((t) => t.status === ' ') ? ' and the remaining tasks depend on them' : ''}. Read their blocker.md -> "What is needed" and resolve it, then change [!] back to [ ] in ${dir}/tasks.md.`,
        tasks: blocked.map((t) => t.num),
      });
    }
    return make('gate', { milestone: active.id, title: `${active.id} has no runnable task`, detail: 'The pending tasks wait for each other. Check "Depends on" in their implementation plans.' });
  }
  if (!allowed('build')) {
    return make('point', { milestone: active.id, title: `${active.id} is planned`, detail: `Stopped before the build (stop at: ${o.stopAt}). Review ${dir}/tasks.md and the implementation plans.`, hint: 'Build it: autopilot.sh --stop-at milestone.' });
  }
  const safe = eligible.filter((t) => t.plan?.parallel === 'safe').length;
  const common = { step: 'build', skill: '10-execution-tasks', key: `build:${active.id}`, milestone: active.id, ready: eligible.length, inReview: inReview.length, parallelSafe: safe };
  if (inReview.length) {
    const t = inReview[0];
    return make('skill', { ...common, task: t.num, action: 'review', title: `Build ${active.id}: review task ${t.num}`, detail: `Task ${t.num} — ${t.name} waits for its independent review. ${eligible.length} task(s) ready after it.` });
  }
  if (eligible.length) {
    const t = eligible[0];
    return make('skill', { ...common, task: t.num, action: 'implement', title: `Build ${active.id}: implement task ${t.num} — ${t.name}`, detail: `${eligible.length} task(s) ready${blocked.length ? `, ${blocked.length} blocked` : ''}.` });
  }
  return make('skill', { ...common, action: 'complete', title: `Complete ${active.id}`, detail: 'Every task is merged: verify the exit criteria and write the milestone report.' });
}

// ---------------------------------------------------------------- status text

export function statusLines(state, options = {}) {
  const ap = state.autopilot || parseAutopilot(null, null);
  const roastRounds = options.roastRounds ?? ap.roastRounds;
  const out = [];
  out.push(`Spec:       ${SPEC_DOCS.map((d) => `${d.label} ${docOk(state, d.file) ? '✓' : '·'}`).join('  ')}`);
  if (!docOk(state, '02-General-PRD.md') && docOk(state, '01-Idea.md')) {
    out.push(`Roast:      ${ap.roastDone} round(s) of up to ${roastRounds}${ap.roastConverged ? ', converged' : ''}`);
  }
  const ms = state.milestones || [];
  out.push(`Milestones: ${ms.length ? ms.map((m) => `${m.id} [${m.status}]`).join('  ') : 'none yet'}`);
  const m = ms.find((x) => x.status === '>') || ms.find((x) => x.status === '?');
  if (m) {
    const c = m.counts;
    const blocked = m.tasks.filter((t) => t.status === '!').map((t) => t.num);
    out.push(`Active:     ${m.id} - ${m.name} [${m.status}] — ${c.done} done, ${c.review} in review, ${c.pending} pending, ${c.blocked} blocked${blocked.length ? ` (${blocked.join(', ')})` : ''}`);
    const see = m.fields?.['What you will see']?.text;
    if (see) out.push(`            You will see: ${see}`);
  }
  if (state.git) out.push(`Git:        ${state.git.branch}, ${state.git.productDirty.length ? `${state.git.productDirty.length} uncommitted product file(s)` : state.git.dirty ? 'uncommitted workflow changes' : 'clean'}${state.git.merging ? ', merge in progress' : ''}`);
  if (ap.brief || ap.decisions.length) {
    out.push(`Autopilot:  stop at ${ap.stopAt} · roast ${ap.roastDone}/${roastRounds}${ap.roastConverged ? ' converged' : ''} · ${ap.decisions.length} decision(s) to review`);
  }
  return out;
}

export function nextLines(d) {
  const kind = { skill: '', gate: 'GATE — ', point: 'STOP — ', done: 'DONE — ' }[d.kind];
  const lines = [`Next:       ${kind}${d.skill && d.kind === 'skill' ? `${d.skill} — ` : ''}${d.title}`];
  if (d.detail) lines.push(`            ${d.detail}`);
  if (d.hint) lines.push(`            ${d.hint}`);
  if (d.alt) lines.push(`            Or: ${d.alt.skill} — ${d.alt.title}`);
  return lines;
}

// ---------------------------------------------------------------- CLI

const shq = (v) => `'${String(v ?? '').replace(/'/g, `'\\''`)}'`;

function parseArgs(argv) {
  const opts = {};
  let mode = 'text';
  let root = process.cwd();
  const need = (i) => {
    if (i + 1 >= argv.length) throw new Error(`Option ${argv[i]} needs a value.`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '--shell' || a === '--status' || a === '--dirty') mode = a.slice(2);
    else if (a === '--root') root = need(i++);
    else if (a === '--stop-at') {
      opts.stopAt = need(i++);
      if (!['spec', 'plan', 'milestone'].includes(opts.stopAt)) throw new Error(`--stop-at must be spec, plan or milestone (got '${opts.stopAt}').`);
    } else if (a === '--roast-rounds' || a === '--milestones-at-start') {
      const v = need(i++);
      if (!/^\d+$/.test(v)) throw new Error(`${a} expects a number (got '${v}').`);
      opts[a === '--roast-rounds' ? 'roastRounds' : 'milestonesAtStart'] = Number(v);
    } else if (a === '--accept') opts.accept = need(i++);
    else if (a === '--changes') opts.changes = need(i++);
    else if (a === '--feature') opts.feature = need(i++);
    else if (a === '-h' || a === '--help') mode = 'help';
    else throw new Error(`Unknown option: ${a}`);
  }
  return { mode, root: path.resolve(root), opts };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  }
  const { mode, root, opts } = args;
  if (mode === 'help') {
    const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15);
    process.stdout.write(`${head.map((l) => l.replace(/^\/\/ ?/, '')).join('\n')}\n`);
    return;
  }
  if (!exists(path.join(root, '.speccraft'))) {
    process.stderr.write(`No .speccraft/ in ${root}. Run this from the repository root (or install SpecCraft first).\n`);
    process.exit(1);
  }
  if (mode === 'dirty') {
    const g = await readGit(root);
    if (g?.productDirty.length) process.stdout.write(`${g.productDirty.join('\n')}\n`);
    return;
  }
  const state = await readWorkspace(root);
  const d = decide(state, opts);
  if (mode === 'json') {
    process.stdout.write(`${JSON.stringify({ ...state, next: d }, null, 2)}\n`);
  } else if (mode === 'shell') {
    const review = state.milestones.find((m) => m.status === '?');
    const active = state.milestones.find((m) => m.status === '>');
    const vars = {
      STEP: d.kind === 'skill' ? d.step : '',
      KEY: d.key || '',
      NOTE: d.note || '',
      STOP_KIND: d.kind === 'skill' ? '' : d.kind,
      STOP_MSG: d.kind === 'skill' ? '' : [d.title.replace(/[.]$/, '') + '.', d.detail, d.hint].filter(Boolean).join(' '),
      TITLE: d.title,
      TASK: d.task || '',
      ACTION: d.action || '',
      PARALLEL_SAFE: d.parallelSafe || 0,
      REVIEW: review?.id || '',
      ACTIVE: active?.id || '',
      ACTIVE_DIR: active?.folder ? `.speccraft/${active.folder}` : '',
      MILESTONES: state.milestones.length,
    };
    process.stdout.write(`${Object.entries(vars).map(([k, v]) => `${k}=${shq(v)}`).join('\n')}\n`);
  } else {
    const lines = statusLines(state, opts);
    if (mode === 'text') lines.unshift('SpecCraft status');
    if (mode === 'text') lines.push(...nextLines(d));
    process.stdout.write(`${lines.join('\n')}\n`);
  }
}

const realpath = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
if (process.argv[1] && realpath(path.resolve(process.argv[1])) === realpath(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
