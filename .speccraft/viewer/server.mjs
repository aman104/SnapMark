#!/usr/bin/env node
// SpecCraft Board — a local dashboard and control panel for the .speccraft workspace.
// Zero dependencies. Start it with .speccraft/board, or: node .speccraft/viewer/server.mjs [--port N] [--open] [--read-only]

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initChat, sendMessage, stopChat, stopAllChats, getChat, listChats, deleteChat, streamChat, chatStatus, adapterInfo } from './chat.mjs';
// The state engine of the workflow (shared with 00-next and autopilot.sh): parsing and the next-step decision.
import { readWorkspace, readGit, decide, parseSections, canonicalSkill } from '../../.agents/skills/00-next/scripts/state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(HERE, '..');
const ROOT = path.resolve(SPEC, '..');
const PUBLIC = path.join(HERE, 'public');
const ENGINE_DIR = path.join(ROOT, '.agents', 'skills', '00-next', 'scripts');

const argv = process.argv.slice(2);
const argValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
// Supervisor: the board runs as a child process and restarts itself when its own code changes, e.g.
// after `speccraft` updated it. The page then reloads by itself. Ctrl+C stops both processes.
if (!process.env.SPECCRAFT_BOARD_CHILD) {
  let port = null;
  let restarted = false;
  let child = null;
  const start = () => {
    let args = [...argv];
    if (restarted) args = args.filter((a) => a !== '--open');
    if (port) {
      const i = args.indexOf('--port');
      if (i >= 0) args.splice(i, 2);
      args.push('--port', String(port));
    }
    child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...args], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'], env: { ...process.env, SPECCRAFT_BOARD_CHILD: '1' } });
    child.on('message', (m) => { if (m?.port) port = m.port; });
    child.on('exit', (code, signal) => {
      if (code === 75) { restarted = true; setTimeout(start, 150); return; }
      process.exit(code ?? (signal ? 1 : 0));
    });
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (child) child.kill(sig); else process.exit(0); });
  start();
  await new Promise(() => {}); // the rest of this file runs in the child
}

// Without an explicit port the board takes the first free one from 4545 up.
const PORT_FIXED = argValue('--port') ?? process.env.SPECCRAFT_VIEWER_PORT;
let PORT = Number(PORT_FIXED ?? 4545);
const HOST = '127.0.0.1';
// --read-only hides every control: the board then only shows the files.
const READ_ONLY = argv.includes('--read-only');
// Changes when the server restarts: the page reloads to pick up the new token and code.
const STARTED = Date.now();
// Per-process secret: only the page served by this server can start or stop agents.
const TOKEN = crypto.randomBytes(24).toString('hex');

// ---------------------------------------------------------------- helpers

const exists = (p) => fs.existsSync(p);
const readText = async (p) => {
  try { return await fsp.readFile(p, 'utf8'); } catch { return null; }
};
const listDir = async (p) => {
  try { return (await fsp.readdir(p, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name)); }
  catch { return []; }
};
const rel = (p) => path.relative(SPEC, p).split(path.sep).join('/');
const isEmpty = (t) => t === null || t.trim() === '';

function git(args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: ROOT, timeout, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      resolve(err ? null : stdout.replace(/\s+$/, ''));
    });
  });
}

// ---------------------------------------------------------------- state

async function loadGit() {
  const base = await readGit(ROOT);
  if (!base) return null;
  const [log, worktrees] = await Promise.all([
    git(['log', '--oneline', '--first-parent', '-n', '15', '--format=%h%x09%cr%x09%s']),
    git(['worktree', 'list', '--porcelain']),
  ]);
  return {
    ...base,
    log: (log || '').split('\n').filter(Boolean).map((l) => {
      const [hash, when, ...msg] = l.split('\t');
      return { hash, when, message: msg.join('\t') };
    }),
    worktrees: (worktrees || '').split('\n').filter((l) => l.startsWith('worktree ')).length,
  };
}

async function loadRuns() {
  const runsDir = path.join(SPEC, '.runs');
  if (!exists(runsDir)) return { running: false, latest: null, autopilot: null, working: [] };
  const mtime = async (p) => { try { return (await fsp.stat(p)).mtimeMs; } catch { return null; } };
  const stepFile = path.join(runsDir, 'autopilot.lock', 'step');
  const autopilotStep = exists(path.join(runsDir, 'autopilot.lock'))
    ? ((await readText(stepFile)) || 'starting').trim() : null;
  const autopilotSince = autopilotStep ? (await mtime(stepFile)) || (await mtime(path.join(runsDir, 'autopilot.lock'))) : null;
  const running = exists(path.join(runsDir, 'lock')) || autopilotStep !== null;
  const stop = await readText(path.join(runsDir, 'STOP'));
  // milestone runs (Mnn-*) and autopilot runs (autopilot-*); the most recently changed one is shown
  const dirs = [];
  for (const d of await listDir(runsDir)) {
    if (d.isDirectory() && /^(M\d\d|autopilot)-/.test(d.name)) dirs.push({ name: d.name, mtime: (await fsp.stat(path.join(runsDir, d.name))).mtimeMs });
  }
  dirs.sort((a, b) => a.mtime - b.mtime);
  const latestName = dirs.pop()?.name;
  let latest = null;
  // what the agents are doing right now: the main lane (review, implementation, completion) and parallel workers
  const working = [];
  if (latestName) {
    const dir = path.join(runsDir, latestName);
    const logs = [];
    for (const f of await listDir(dir)) {
      if (f.isFile() && f.name.endsWith('.log')) {
        const st = await fsp.stat(path.join(dir, f.name));
        logs.push({ name: f.name, mtime: st.mtimeMs, size: st.size });
      }
    }
    logs.sort((a, b) => b.mtime - a.mtime);
    let tail = '';
    if (logs[0]) {
      const text = (await readText(path.join(dir, logs[0].name))) || '';
      tail = text.split('\n').slice(-80).join('\n');
    }
    let workers = [];
    for (const w of await listDir(path.join(dir, 'workers'))) {
      if (w.isFile() && /^\d{3}$/.test(w.name) && !exists(path.join(dir, 'workers', `${w.name}.fin`))) {
        const line = (await readText(path.join(dir, 'workers', w.name))) || '';
        workers.push({ task: w.name, slot: line.trim().split(/\s+/)[3] || '?' });
        if (running) working.push({ action: 'implement', task: w.name, lane: `slot ${line.trim().split(/\s+/)[3] || '?'}`, since: await mtime(path.join(dir, 'workers', w.name)) });
      }
    }
    const cur = running ? ((await readText(path.join(dir, 'current'))) || '').trim() : '';
    if (cur) {
      const m = cur.match(/(review|implement) task (\d{3})/);
      working.unshift({ action: m ? m[1] : /completion/.test(cur) ? 'complete' : 'work', task: m ? m[2] : null, lane: 'main', since: await mtime(path.join(dir, 'current')), text: cur });
    }
    latest = { id: latestName, logs: logs.slice(0, 12), current: logs[0]?.name || null, tail, workers };
  }
  return { running, stop: stop?.trim() || null, latest, autopilot: autopilotStep, autopilotSince, working };
}

// An interactive agent session (no script): the agent writes .speccraft/.runs/activity.json when it
// starts a step (AGENTS.md). Without the file, a task branch with fresh uncommitted changes counts too.
// Claude Code hooks (.speccraft/hooks/activity.sh) mark it busy after every tool call and waiting
// when the turn goes back to the user; without hooks, recent file changes count as a sign of life.
const SESSION_FRESH = 15 * 60 * 1000;
const mtimeOf = async (p) => { try { return (await fsp.stat(p)).mtimeMs; } catch { return null; } };

async function loadSession(git) {
  const dir = path.join(SPEC, '.runs');
  const file = path.join(dir, 'activity.json');
  const text = await readText(file);
  let marker = null;
  if (text !== null && text.trim()) {
    try { marker = JSON.parse(text); } catch { marker = { title: text.trim().split('\n')[0].slice(0, 200) }; }
  }
  const markerAt = marker ? await mtimeOf(file) : null;
  // files an agent changes while it works (toolkit files changed by an update do not count)
  const dirty = (git?.dirtyFiles || []).filter((f) => !/^(\.speccraft\/(\.runs|viewer|hooks)\/|\.agents\/|\.claude\/)/.test(f));
  const branchTask = git?.branch?.match(/^task\/(\d{3})-/)?.[1] || null;
  let fileAt = 0;
  for (const f of dirty.slice(0, 80)) fileAt = Math.max(fileAt, (await mtimeOf(path.join(ROOT, f))) || 0);
  let s = marker;
  if (!s && branchTask && dirty.length && Date.now() - fileAt < SESSION_FRESH) {
    s = { skill: '10-execution-tasks', action: 'implement', task: branchTask, inferred: true };
  }
  if (!s) return null;
  const lastSeen = Math.max(markerAt || 0, fileAt);
  const idleAt = await mtimeOf(path.join(dir, 'activity.idle'));
  let state = Date.now() - lastSeen < SESSION_FRESH ? 'active' : 'stale';
  if (marker && idleAt && idleAt >= (markerAt || 0)) state = 'waiting';
  const task = /^\d{3}$/.test(String(s.task || '')) ? String(s.task) : (s.action === 'implement' || s.action === 'review') ? branchTask : null;
  return {
    skill: typeof s.skill === 'string' ? canonicalSkill(s.skill.slice(0, 60)) : null,
    action: typeof s.action === 'string' ? s.action.slice(0, 20) : null,
    task,
    milestone: /^M\d\d$/.test(String(s.milestone || '')) ? s.milestone : null,
    title: typeof s.title === 'string' ? s.title.slice(0, 200) : null,
    since: Date.parse(s.started || '') || markerAt || fileAt || Date.now(),
    lastSeen,
    state,
    inferred: !!s.inferred,
  };
}

const AUTOPILOT = '.agents/skills/00-next/scripts/autopilot.sh';

// The next step: decided by the state engine; the board adds the commands that run it.
function computeNext(state) {
  const cmd = (skill) => ({ claude: `/${skill}`, codex: `$${skill}`, antigravity: `/${skill}` });
  const ap = state.autopilot;
  if (state.runs.autopilot) {
    const until = ap?.stopAt === 'spec' ? 'when the specification is ready' : ap?.stopAt === 'plan' ? 'when the next milestone is planned' : 'when the next milestone waits for your review';
    return { kind: 'running', stage: state.stage.id, title: `Autopilot running — ${state.runs.autopilot}`, detail: `One step per fresh agent process. It stops ${until}, or at a blocker. Watch the live log below.`, skill: null };
  }
  const d = decide(state);
  const n = {
    kind: d.kind === 'point' ? 'gate' : d.kind,
    stage: d.stage, milestone: d.milestone, task: d.task, action: d.action, key: d.key,
    title: d.title, detail: d.detail, skill: d.skill, alt: d.alt || null,
    commands: d.skill ? cmd(d.skill) : undefined,
  };
  const runMilestone = '.agents/skills/10-execution-tasks/scripts/run-milestone.sh';
  if (d.step === 'build') {
    if (state.runs.running) return { kind: 'running', stage: d.stage, milestone: d.milestone, title: state.runs.session ? `An agent session is working on ${d.milestone}` : `Autonomous run in progress on ${d.milestone}`, detail: 'Watch the live log below. The run stops at the milestone review or at a blocker.', skill: null };
    n.run = d.parallelSafe > 1 ? `${runMilestone} --parallel 3` : runMilestone;
  } else if (d.kind === 'skill' && /^0[1-7]/.test(d.skill)) {
    n.run = AUTOPILOT;
    if (d.skill === '01-discovery-idea') n.commands = { claude: '/00-next autopilot full', codex: '$00-next autopilot full', antigravity: '/00-next autopilot full' };
  } else if (d.kind === 'gate' && d.stage === 'review' && d.milestone) {
    n.link = `#/m/${d.milestone}/report`;
    n.run = `${AUTOPILOT} --accept ${d.milestone}`;
  } else if (d.kind === 'gate' && d.skill === '01-discovery-idea') {
    n.run = `${AUTOPILOT} "<your idea>"`;
  } else if (d.kind === 'gate' && d.milestone && d.stage === 'build') {
    n.link = `#/m/${d.milestone}`;
  }
  if (n.kind === 'gate' && !['01-discovery-idea', '08-planning-tasks'].includes(d.skill)) delete n.commands;
  return n;
}

// ---------------------------------------------------------------- control

const AUTOPILOT_SH = path.join(ROOT, '.agents', 'skills', '00-next', 'scripts', 'autopilot.sh');
const BOARD_DIR = path.join(SPEC, '.runs', 'board');
const BOARD_RUN = path.join(BOARD_DIR, 'run.json');
const BOARD_SETTINGS = path.join(BOARD_DIR, 'settings.json');

// Agent CLIs the scripts can drive. Models: the CLIs have no command that lists models, so the
// board offers the documented aliases plus whatever is configured as the CLI's default.
const AGENTS = [
  { id: 'claude', bin: 'claude', name: 'Claude Code', models: ['opus', 'sonnet', 'haiku'], config: ['.claude/settings.json', /"model"\s*:\s*"([^"]+)"/] },
  { id: 'codex', bin: 'codex', name: 'Codex CLI', models: [], config: ['.codex/config.toml', /^\s*model\s*=\s*"([^"]+)"/m] },
  { id: 'gemini', bin: 'gemini', name: 'Gemini CLI', models: [], config: ['.gemini/settings.json', /"model"\s*:\s*(?:\{[^}]*?"name"\s*:\s*)?"([^"]+)"/] },
  { id: 'antigravity', bin: 'agy', name: 'Antigravity CLI', models: null, config: null },
];

function findBin(bin) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const full = path.join(dir, bin);
    try { fs.accessSync(full, fs.constants.X_OK); if (fs.statSync(full).isFile()) return full; } catch { /* next */ }
  }
  return null;
}
const firstLine = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 8000 }, (err, out) => resolve(err ? null : String(out).trim().split('\n')[0].slice(0, 80)));
});

let agentsCache = null;
let agentsAt = 0;
async function detectAgents(force = false) {
  if (agentsCache && !force && Date.now() - agentsAt < 5 * 60 * 1000) return agentsCache;
  agentsCache = await Promise.all(AGENTS.map(async (a) => {
    const bin = findBin(a.bin);
    let configured = null;
    if (bin && a.config) {
      const text = await readText(path.join(process.env.HOME || '', a.config[0]));
      configured = text?.match(a.config[1])?.[1] || null;
    }
    return {
      id: a.id, name: a.name, bin: a.bin, installed: !!bin,
      version: bin ? await firstLine(bin, ['--version']) : null,
      models: a.models, // null: the CLI has no model option
      configured,
    };
  }));
  agentsAt = Date.now();
  return agentsCache;
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const readJson = async (p) => { try { return JSON.parse(await fsp.readFile(p, 'utf8')); } catch { return null; } };
const writeJson = async (p, v) => { await fsp.mkdir(path.dirname(p), { recursive: true }); await fsp.writeFile(p, JSON.stringify(v, null, 2)); };

async function boardSettings() {
  const saved = (await readJson(BOARD_SETTINGS)) || {};
  const agents = await detectAgents();
  const agent = agents.find((a) => a.id === saved.agent && a.installed) || agents.find((a) => a.installed) || agents[0];
  const ap = (await readWorkspace(ROOT, { git: false })).autopilot;
  return {
    agent: agent.id,
    model: !saved.agent || saved.agent === agent.id ? saved.model || '' : '',
    mode: saved.mode === 'full' ? 'full' : 'step',
    stopAt: ['spec', 'plan', 'milestone'].includes(saved.stopAt) ? saved.stopAt : ap?.stopAt || 'milestone',
    parallel: Math.min(Math.max(Number(saved.parallel) || 1, 1), 6),
  };
}

async function boardRun() {
  const run = await readJson(BOARD_RUN);
  if (!run) return null;
  run.running = !run.endedAt && alive(run.pid);
  if (!run.running && !run.endedAt) run.endedAt = Date.now();
  const text = (await readText(path.join(SPEC, run.log))) || '';
  const lines = text.split('\n').filter((l) => l.trim());
  run.tail = lines.slice(-30).join('\n');
  run.result = [...lines].reverse().find((l) => /Autopilot stopped:|^Error:/.test(l))?.replace(/^\[[^\]]+\]\s*/, '') || null;
  // step mode: "--max-steps 1 reached; next would be X" reads better as a finished step
  if (run.result) run.result = run.result.replace(/^Autopilot stopped: --max-steps \d+ reached; next would be (.+)$/, 'Step done. Next: $1').replace(/^Autopilot stopped: /, '');
  return run;
}

const isBusy = async () => (await boardRun())?.running || exists(path.join(SPEC, '.runs', 'lock')) || exists(path.join(SPEC, '.runs', 'autopilot.lock')) || chatStatus().running.length > 0;

// Why a write-capable chat turn cannot start now (a script or the autopilot is working), or null.
async function chatBlocker() {
  if ((await boardRun())?.running) return 'A run started from the board is working.';
  if (exists(path.join(SPEC, '.runs', 'autopilot.lock'))) return 'The autopilot is running.';
  if (exists(path.join(SPEC, '.runs', 'lock'))) return 'An autonomous milestone run is working.';
  return null;
}

// Every run goes through autopilot.sh; text from the page is passed as a separate argument, never through a shell.
async function startRun(kind, body) {
  if (!exists(AUTOPILOT_SH)) throw Object.assign(new Error('autopilot.sh not found in .agents/skills/00-next/scripts/'), { status: 500 });
  if (await isBusy()) throw Object.assign(new Error('An agent is already running.'), { status: 409 });
  const session = await loadSession(await loadGit());
  if (session?.state === 'active') throw Object.assign(new Error(`An agent session is working (${session.title || session.skill || 'task ' + session.task}). Wait until it finishes, or clear its status if it ended.`), { status: 409 });
  const st = await boardSettings();
  const args = ['--agent', st.agent];
  if (st.model) args.push('--model', st.model);
  const step = st.mode !== 'full';
  const text = String(body.text || '').trim().slice(0, 8000);
  if (kind === 'next') {
    // one step; at the build, one task (implementation and its independent review)
    args.push('--max-steps', '1', '--max-tasks', '1', '--stop-at', 'milestone');
  } else if (kind === 'autopilot') {
    args.push('--stop-at', st.stopAt);
    if (st.parallel > 1) args.push('--parallel', String(st.parallel));
  } else if (kind === 'accept') {
    if (!/^M\d\d$/.test(body.milestone || '')) throw Object.assign(new Error('Bad milestone id.'), { status: 400 });
    args.push('--accept', body.milestone, ...(step ? ['--max-steps', '1'] : ['--stop-at', st.stopAt]));
  } else if (kind === 'changes' || kind === 'feature') {
    if (!text) throw Object.assign(new Error('Write what should change first.'), { status: 400 });
    args.push(`--${kind}`, text, ...(step ? ['--max-steps', '1'] : ['--stop-at', st.stopAt]));
  } else {
    throw Object.assign(new Error('Unknown action.'), { status: 400 });
  }
  if (!step && st.parallel > 1 && kind !== 'autopilot') args.push('--parallel', String(st.parallel));
  await fsp.mkdir(BOARD_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logAbs = path.join(BOARD_DIR, `${stamp}-${kind}.log`);
  const fd = fs.openSync(logAbs, 'a');
  fs.writeSync(fd, `$ autopilot.sh ${args.map((a) => (/^[\w./:=-]+$/.test(a) ? a : JSON.stringify(a))).join(' ')}\n`);
  // detached: own process group, so Stop ends the script and every agent it started; the run survives the board
  const child = spawn('bash', [AUTOPILOT_SH, ...args], { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd], env: process.env });
  fs.closeSync(fd);
  const run = { pid: child.pid, kind, mode: st.mode, agent: st.agent, model: st.model, startedAt: Date.now(), log: rel(logAbs) };
  await writeJson(BOARD_RUN, run);
  child.on('exit', async (code, signal) => {
    await writeJson(BOARD_RUN, { ...run, endedAt: Date.now(), exit: code ?? signal });
    broadcast();
  });
  child.unref();
  return run;
}

async function stopRun() {
  const run = await boardRun();
  if (!run?.running) throw Object.assign(new Error('No run started from the board is active. Stop a terminal run with Ctrl+C there.'), { status: 409 });
  try { process.kill(-run.pid, 'SIGTERM'); } catch { /* already gone */ }
  setTimeout(() => { if (alive(run.pid)) { try { process.kill(-run.pid, 'SIGKILL'); } catch { /* gone */ } } }, 15000);
  return { stopping: true };
}

// Replace the content of a "## Heading" section of a markdown file (the section is added if missing).
function setSection(text, heading, body) {
  const lines = (text || '').split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return `${(text || '').replace(/\s*$/, '')}\n\n## ${heading}\n\n${body}\n`;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return [...lines.slice(0, start + 1), '', body, '', ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n');
}

async function saveBrief(text) {
  const file = path.join(SPEC, 'autopilot.md');
  const brief = String(text || '').trim().slice(0, 8000);
  if (!brief) throw Object.assign(new Error('The idea is empty.'), { status: 400 });
  const current = (await readText(file)) || '# Autopilot\n\n## Settings\n\n- Stop at: milestone\n- Roast rounds: 3\n\n## Decisions to review\n';
  await fsp.writeFile(file, setSection(current, 'Brief', brief));
  return { saved: true };
}

async function saveSettings(body) {
  const cur = (await readJson(BOARD_SETTINGS)) || {};
  const next = { ...cur };
  const agents = await detectAgents();
  if (body.agent !== undefined) {
    if (!agents.some((a) => a.id === body.agent && a.installed)) throw Object.assign(new Error('That agent is not installed.'), { status: 400 });
    if (body.agent !== cur.agent) next.model = '';
    next.agent = body.agent;
  }
  if (body.model !== undefined) {
    const m = String(body.model).trim();
    if (m && !/^[\w.:@/[\]-]{1,80}$/.test(m)) throw Object.assign(new Error('Model names use letters, digits and . : @ / [ ] - _ only.'), { status: 400 });
    next.model = m === 'default' ? '' : m;
  }
  if (body.mode !== undefined) next.mode = body.mode === 'full' ? 'full' : 'step';
  if (body.stopAt !== undefined && ['spec', 'plan', 'milestone'].includes(body.stopAt)) next.stopAt = body.stopAt;
  if (body.parallel !== undefined) next.parallel = Math.min(Math.max(Number(body.parallel) || 1, 1), 6);
  await writeJson(BOARD_SETTINGS, next);
  return boardSettings();
}

async function loadControl() {
  if (READ_ONLY) return { enabled: false };
  return { enabled: true, agents: await detectAgents(), settings: await boardSettings(), run: await boardRun(), chat: { ...chatStatus(), adapters: adapterInfo() } };
}

async function loadState() {
  const [ws, gitState] = await Promise.all([readWorkspace(ROOT, { git: false }), loadGit()]);
  const parsed = ws;
  const docsDir = path.join(SPEC, 'docs');
  const progressText = await readText(path.join(SPEC, 'progress.md'));
  const progress = parseSections(progressText);
  const mockups = [];
  for (const f of await listDir(path.join(SPEC, 'mockup'))) {
    if (f.isFile() && f.name !== '.gitkeep') mockups.push({ name: f.name, path: `mockup/${f.name}`, image: /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name) });
  }
  const ideaText = await readText(path.join(docsDir, '01-Idea.md'));
  const ideaTitle = (ideaText || '').match(/^# (?:Idea:\s*)?(.+)$/m);
  const state = {
    generatedAt: Date.now(),
    server: { api: 2, started: STARTED },
    project: parsed.title || (ideaTitle ? ideaTitle[1].trim() : path.basename(ROOT)),
    root: path.basename(ROOT),
    docs: ws.docs,
    roadmap: parsed.roadmap,
    coverage: parsed.coverage,
    milestones: parsed.milestones,
    progress: { empty: isEmpty(progressText), sections: progress, path: 'progress.md' },
    mockups,
    git: gitState,
    runs: await loadRuns(),
    autopilot: ws.autopilot,
    control: await loadControl(),
  };
  // a run started from the board counts as running from its first second
  if (state.control.run?.running && !state.runs.running) state.runs = { ...state.runs, running: true, autopilot: state.runs.autopilot || 'starting' };
  // a chat turn of the board is an agent session at work
  const chatting = READ_ONLY ? [] : chatStatus().running;
  if (!state.runs.running && chatting.length) {
    const session = (await loadSession(state.git)) || {};
    const c = chatting[0];
    state.runs = {
      ...state.runs,
      running: true,
      session: { skill: session.skill || null, action: session.action || null, task: session.task || null, title: session.title || `Chat: ${c.title}`, since: session.since || c.since, lastSeen: Date.now(), state: 'active', chat: c.id },
      working: session.task && ['implement', 'review'].includes(session.action) ? [{ action: session.action, task: session.task, lane: 'chat', since: session.since }] : [],
    };
  }
  // an interactive agent session, when no script is running
  if (!state.runs.running) {
    const session = await loadSession(state.git);
    if (session) {
      state.runs = { ...state.runs, session };
      if (session.state === 'active') {
        state.runs.running = true;
        state.runs.working = session.task && ['implement', 'review'].includes(session.action)
          ? [{ action: session.action, task: session.task, lane: 'agent session', since: session.since }] : [];
      }
    }
  }
  const where = decide(state);
  state.stage = { id: where.stage, milestone: where.milestone };
  state.next = computeNext(state);
  return state;
}

// ---------------------------------------------------------------- live updates

const clients = new Set();
let pending = null;
function broadcast() {
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const res of clients) res.write(`data: ${Date.now()}\n\n`);
  }, 250);
}
// Updates of the board itself: new page files reload open pages, new server code restarts the server.
function watchSelf() {
  let restartTimer = null;
  let reloadTimer = null;
  const restart = () => {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      if (!process.send) { console.log('SpecCraft Board was updated: restart it to use the new version.'); return; }
      if (chatStatus().running.length) { restart(); return; } // wait until the agent in the chat has finished
      console.log('SpecCraft Board was updated: restarting…');
      for (const res of clients) res.write('event: reload\ndata: server\n\n');
      server.close();
      setTimeout(() => process.exit(75), 300);
    }, 1500);
  };
  try {
    fs.watch(HERE, (_e, file) => { if (file && /\.mjs$/.test(file)) restart(); });
    if (exists(ENGINE_DIR)) fs.watch(ENGINE_DIR, (_e, file) => { if (file === 'state.mjs') restart(); });
    fs.watch(PUBLIC, (_e, file) => {
      if (!file) return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { for (const res of clients) res.write('event: reload\ndata: page\n\n'); }, 800);
    });
  } catch { /* watching is optional */ }
}

function watch() {
  try {
    fs.watch(SPEC, { recursive: true }, (_e, file) => {
      if (file && String(file).startsWith('viewer')) return;
      broadcast();
    });
    const gitDir = path.join(ROOT, '.git');
    if (exists(gitDir)) fs.watch(gitDir, () => broadcast());
  } catch {
    let last = '';
    setInterval(async () => {
      const sig = JSON.stringify(await loadState().then((s) => [s.milestones.map((m) => [m.status, m.tasks.map((t) => t.status)]), s.docs.map((d) => d.mtime), s.runs.latest?.logs?.[0]?.mtime, s.git?.log?.[0]?.hash]));
      if (sig !== last) { last = sig; broadcast(); }
    }, 2000);
  }
}

// ---------------------------------------------------------------- http

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.json': 'application/json',
};

function safeJoin(base, p) {
  const full = path.resolve(base, '.' + path.sep + decodeURIComponent(p || ''));
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

async function sendFile(res, file, cache = false) {
  try {
    const data = await fsp.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': cache ? 'max-age=60' : 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

let LOCAL_HOSTS = new Set();
const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > 64 * 1024) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('Bad JSON'), { status: 400 })); } });
  req.on('error', reject);
});
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  // Only this machine's browser, by name: blocks DNS rebinding.
  if (!LOCAL_HOSTS.has(String(req.headers.host || '').toLowerCase())) { res.writeHead(403); return res.end('Forbidden host'); }
  try {
    if (req.method === 'POST') {
      // Writes need the per-process token from the page and a same-origin request.
      const origin = req.headers.origin;
      if (READ_ONLY) return json(res, 403, { error: 'The board runs with --read-only.' });
      if (req.headers['x-speccraft-token'] !== TOKEN || (origin && !LOCAL_HOSTS.has(origin.replace(/^https?:\/\//, '')))) return json(res, 403, { error: 'Reload the page (the board was restarted).' });
      const body = await readBody(req);
      if (url.pathname === '/api/run') { const r = await startRun(String(body.kind || ''), body); broadcast(); return json(res, 200, r); }
      if (url.pathname === '/api/stop') { const r = await stopRun(); return json(res, 200, r); }
      if (url.pathname === '/api/brief') { const r = await saveBrief(body.text); broadcast(); return json(res, 200, r); }
      if (url.pathname === '/api/settings') { const r = await saveSettings(body); broadcast(); return json(res, 200, r); }
      if (url.pathname === '/api/activity/clear') {
        for (const f of ['activity.json', 'activity.idle']) await fsp.rm(path.join(SPEC, '.runs', f), { force: true });
        broadcast();
        return json(res, 200, { cleared: true });
      }
      if (url.pathname === '/api/agents') { const r = await detectAgents(true); broadcast(); return json(res, 200, r); }
      if (url.pathname === '/api/chat/send') {
        const agents = await detectAgents();
        if (!agents.some((a) => a.id === body.agent && a.installed)) return json(res, 400, { error: 'That agent CLI is not installed.' });
        const r = await sendMessage(body, { busy: await chatBlocker() });
        broadcast();
        return json(res, 200, r);
      }
      if (url.pathname === '/api/chat/stop') return json(res, 200, stopChat(body.chat));
      if (url.pathname === '/api/chat/delete') return json(res, 200, await deleteChat(body.chat));
      return json(res, 404, { error: 'Not found' });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await fsp.readFile(path.join(PUBLIC, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html.replace('</head>', `  <meta name="speccraft-token" content="${READ_ONLY ? '' : TOKEN}">\n</head>`));
    }
    if (url.pathname === '/api/whoami') return json(res, 200, { app: 'speccraft-board', root: ROOT });
    if (url.pathname.startsWith('/api/chat/')) {
      // chat contents need the page's token too (EventSource cannot send headers, so it is a query parameter)
      if (READ_ONLY || url.searchParams.get('token') !== TOKEN) return json(res, 403, { error: 'Reload the page (the board was restarted).' });
      if (url.pathname === '/api/chat/list') return json(res, 200, await listChats());
      if (url.pathname === '/api/chat/get') return json(res, 200, await getChat(url.searchParams.get('id')));
      if (url.pathname === '/api/chat/stream') return streamChat(url.searchParams.get('id'), req, res);
    }
    if (url.pathname === '/api/state') {
      const state = await loadState();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(state));
    }
    if (url.pathname === '/api/file') {
      const file = safeJoin(SPEC, url.searchParams.get('path'));
      if (!file) { res.writeHead(400); return res.end('Bad path'); }
      return sendFile(res, file);
    }
    if (url.pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    const file = safeJoin(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    if (!file) { res.writeHead(400); return res.end('Bad path'); }
    return sendFile(res, file, false);
  } catch (err) {
    if (req.method === 'POST' || url.pathname.startsWith('/api/chat/')) return json(res, err.status || 500, { error: err.message || String(err) });
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err?.stack || err));
  }
});

function openBrowser(url) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(opener, args, () => {});
}

// Is the board of this same project already listening on that port?
async function sameBoard(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/whoami`, { signal: AbortSignal.timeout(1500) });
    const who = await res.json();
    return who.app === 'speccraft-board' && who.root === ROOT;
  } catch { return false; }
}

server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') { console.error(err); process.exit(1); }
  if (await sameBoard(PORT)) {
    const url = `http://localhost:${PORT}`;
    console.log(`SpecCraft Board of this project is already running → ${url}`);
    if (argv.includes('--open')) openBrowser(url);
    process.exit(0);
  }
  if (PORT_FIXED || PORT >= 4545 + 20) {
    console.error(`Port ${PORT} is in use. Try another one: --port ${PORT + 1}`);
    process.exit(1);
  }
  PORT += 1;
  server.listen(PORT, HOST);
});

initChat({ root: ROOT, spec: SPEC, changed: () => broadcast() });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopAllChats(); process.exit(0); });

server.on('listening', () => {
  LOCAL_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
  const url = `http://localhost:${PORT}`;
  console.log(`SpecCraft Board → ${url}   (workspace: ${SPEC})${READ_ONLY ? '   read-only' : ''}`);
  if (!READ_ONLY) detectAgents().then((a) => console.log(`Agents: ${a.map((x) => `${x.id}${x.installed ? '' : ' (not installed)'}`).join(', ')}`));
  console.log('Press Ctrl+C to stop the board (runs started from it keep going).');
  process.send?.({ port: PORT });
  watch();
  watchSelf();
  if (argv.includes('--open')) openBrowser(url);
});

server.listen(PORT, HOST);
