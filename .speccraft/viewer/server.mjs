#!/usr/bin/env node
// SpecCraft Board — a read-only local dashboard for the .speccraft workspace.
// Zero dependencies. Usage: node .speccraft/viewer/server.mjs [--port 4545] [--open]

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(HERE, '..');
const ROOT = path.resolve(SPEC, '..');
const PUBLIC = path.join(HERE, 'public');

const argv = process.argv.slice(2);
const argValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const PORT = Number(argValue('--port') ?? process.env.SPECCRAFT_VIEWER_PORT ?? 4545);
const HOST = '127.0.0.1';

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

// ---------------------------------------------------------------- parsers

function parseTableAfter(lines, headingRe) {
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

function parseMilestones(md) {
  const lines = md.split('\n');
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

function parseTasks(md) {
  const tasks = [];
  let title = '';
  for (const line of md.split('\n')) {
    if (!title && /^# /.test(line)) title = line.replace(/^# /, '').trim();
    const m = line.match(/^\[(.)\] (\d{3}) - (.+?) - (.*)$/) || line.match(/^\[(.)\] (\d{3}) - (.+)$/);
    if (m) tasks.push({ status: m[1], num: m[2], name: m[3].trim(), description: (m[4] || '').trim() });
  }
  return { title, tasks };
}

function planSummary(md) {
  if (!md) return null;
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

function reviewSummary(md) {
  if (!md) return null;
  const rounds = [...md.matchAll(/^## Round (\d+)\s*[—-]\s*([^—\n]+?)\s*(?:[—-].*)?$/gm)];
  if (!rounds.length) return { rounds: 0, verdict: null };
  const last = rounds[rounds.length - 1];
  return { rounds: rounds.length, verdict: last[2].trim().toLowerCase() };
}

function parseSections(md) {
  const out = {};
  let cur = null;
  for (const line of (md || '').split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) { cur = h[1].trim(); out[cur] = []; continue; }
    if (cur && line.trim()) out[cur].push(line);
  }
  return out;
}

// ---------------------------------------------------------------- state

async function milestoneFolder(id) {
  for (const d of await listDir(path.join(SPEC, 'milestones'))) {
    if (d.isDirectory() && d.name.startsWith(`${id}-`)) return path.join(SPEC, 'milestones', d.name);
  }
  return null;
}

async function loadMilestoneDetail(m) {
  const dir = await milestoneFolder(m.id);
  m.folder = dir ? rel(dir) : null;
  m.tasks = [];
  m.files = { report: null, summaries: [], screenshots: [] };
  if (!dir) return;
  const tasksMd = await readText(path.join(dir, 'tasks.md'));
  if (tasksMd) m.tasks = parseTasks(tasksMd).tasks;
  const entries = await listDir(dir);
  const taskDirs = new Map();
  for (const e of entries) {
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
    t.plan = planSummary(await readText(path.join(dir, tdName, 'implementation-plan.md')));
    t.review = reviewSummary(await readText(path.join(dir, tdName, 'review.md')));
  }
  m.counts = { pending: 0, review: 0, done: 0, blocked: 0 };
  for (const t of m.tasks) {
    if (t.status === 'x') m.counts.done++;
    else if (t.status === '~') m.counts.review++;
    else if (t.status === '!') m.counts.blocked++;
    else m.counts.pending++;
  }
}

const DOC_STEPS = [
  { file: '01-Idea.md', skill: '01-discovery-idea', title: 'Shape the product idea', gate: true,
    detail: 'Describe your idea. The skill interviews you and writes 01-Idea.md.' },
  { file: '02-General-PRD.md', skill: '03-discovery-prd', title: 'Write the requirements (PRD)',
    detail: 'Optionally stress-test the idea first with 02-discovery-idea-roast.' },
  { file: '03-Design.md', skill: '04-planning-design-system', title: 'Define the design system' },
  { file: '04-Interface-spec.md', skill: '05-planning-interface', title: 'Specify the interface' },
  { file: '05-Tech-Stack.md', skill: '06-planning-tech-stack', title: 'Choose the tech stack' },
];

async function loadGit() {
  const branch = await git(['branch', '--show-current']);
  if (branch === null) return null;
  const [status, log, branches, worktrees] = await Promise.all([
    git(['status', '--porcelain']),
    git(['log', '--oneline', '--first-parent', '-n', '15', '--format=%h%x09%cr%x09%s']),
    git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/milestone/', 'refs/heads/task/', 'refs/heads/attic/']),
    git(['worktree', 'list', '--porcelain']),
  ]);
  const dirty = (status || '').split('\n').filter(Boolean);
  return {
    branch: branch || '(detached)',
    dirty: dirty.length,
    // product changes only: workflow (.speccraft) and toolkit files do not count
    dirtyOutsideSpec: dirty.filter((l) => !/^"?(\.speccraft\/|\.agents\/|\.claude\/|AGENTS\.md|CLAUDE\.md)/.test(l.slice(3))).length,
    log: (log || '').split('\n').filter(Boolean).map((l) => {
      const [hash, when, ...msg] = l.split('\t');
      return { hash, when, message: msg.join('\t') };
    }),
    branches: (branches || '').split('\n').filter(Boolean),
    worktrees: (worktrees || '').split('\n').filter((l) => l.startsWith('worktree ')).length,
  };
}

async function loadRuns() {
  const runsDir = path.join(SPEC, '.runs');
  if (!exists(runsDir)) return { running: false, latest: null };
  const running = exists(path.join(runsDir, 'lock'));
  const stop = await readText(path.join(runsDir, 'STOP'));
  const dirs = (await listDir(runsDir)).filter((d) => d.isDirectory() && /^M\d\d-/.test(d.name)).map((d) => d.name);
  const latestName = dirs.sort().pop();
  let latest = null;
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
      }
    }
    latest = { id: latestName, logs: logs.slice(0, 12), current: logs[0]?.name || null, tail, workers };
  }
  return { running, stop: stop?.trim() || null, latest };
}

function computeNext(state) {
  const cmd = (skill) => ({ claude: `/${skill}`, codex: `$${skill}`, antigravity: `/${skill}` });
  const g = state.git;
  if (g && g.dirtyOutsideSpec > 0) {
    return { kind: 'gate', title: 'Uncommitted changes in the product', detail: `${g.dirtyOutsideSpec} changed product file(s). Commit or stash them before the next step.`, skill: null };
  }
  for (const step of DOC_STEPS) {
    const d = state.docs.find((x) => x.name === step.file);
    if (!d || d.empty) return { kind: step.gate ? 'gate' : 'skill', title: step.title, detail: step.detail || `Creates .speccraft/docs/${step.file}.`, skill: step.skill, commands: cmd(step.skill) };
  }
  const ms = state.milestones;
  if (!ms.length) return { kind: 'skill', title: 'Plan the roadmap', detail: 'Splits v1 into phases and milestones. Review the whole specification afterwards, before any code is written.', skill: '07-planning-milestones', commands: cmd('07-planning-milestones') };
  const branches = g?.branches || [];
  const unmerged = ms.find((m) => m.status === 'x' && m.folder && branches.includes(`milestone/${m.folder.split('/').pop()}`));
  if (unmerged) return { kind: 'skill', title: `Merge accepted ${unmerged.id}`, detail: `${unmerged.id} is accepted but its branch is not merged yet.`, skill: '08-planning-tasks', commands: cmd('08-planning-tasks') };
  const review = ms.find((m) => m.status === '?');
  if (review) return { kind: 'gate', title: `Review ${review.id} — ${review.name}`, detail: 'Read the milestone report, run the demo, then accept it ("accept ' + review.id + '") or request changes.', skill: '08-planning-tasks', commands: cmd('08-planning-tasks'), link: `#/m/${review.id}/report` };
  const active = ms.find((m) => m.status === '>');
  if (!active) {
    const nextPlanned = ms.find((m) => m.status === ' ');
    if (nextPlanned) return { kind: 'skill', title: `Plan tasks for ${nextPlanned.id} — ${nextPlanned.name}`, detail: 'Creates the milestone branch and its task list.', skill: '08-planning-tasks', commands: cmd('08-planning-tasks') };
    return { kind: 'done', title: 'The roadmap is complete', detail: 'Add features or fixes with 12-feature-advisor. Consider a security review with 11-security-researcher.', skill: '12-feature-advisor', commands: cmd('12-feature-advisor') };
  }
  const tasks = active.tasks || [];
  const noPlan = tasks.filter((t) => t.status === ' ' && !t.files['implementation-plan']);
  if (noPlan.length) return { kind: 'skill', title: `Write implementation plans for ${active.id}`, detail: `${noPlan.length} pending task(s) without a plan: ${noPlan.map((t) => t.num).join(', ')}.`, skill: '09-planning-task-details', commands: cmd('09-planning-task-details') };
  const run = '.agents/skills/10-execution-initial/scripts/run-milestone.sh';
  const inReview = tasks.find((t) => t.status === '~');
  const done = new Set(tasks.filter((t) => t.status === 'x').map((t) => t.num));
  const inMilestone = new Set(tasks.map((t) => t.num));
  const eligible = tasks.filter((t) => t.status === ' ' && (t.plan?.deps || []).every((d) => d === t.num || !inMilestone.has(d) || done.has(d)));
  if (state.runs.running) return { kind: 'running', title: `Autonomous run in progress on ${active.id}`, detail: 'Watch the live log below. The run stops at the milestone review or at a blocker.', skill: null };
  if (inReview || eligible.length) {
    const safe = eligible.filter((t) => t.plan?.parallel === 'safe').length;
    const what = inReview ? `review task ${inReview.num}` : `implement task ${eligible[0].num} — ${eligible[0].name}`;
    return { kind: 'skill', title: `Build ${active.id}: ${what}`, detail: `${eligible.length} task(s) ready, ${tasks.filter((t) => t.status === '~').length} in review.`, skill: '10-execution-initial', commands: cmd('10-execution-initial'), run: safe > 1 ? `${run} --parallel 3` : run };
  }
  if (tasks.length && tasks.every((t) => t.status === 'x')) return { kind: 'skill', title: `Complete ${active.id}`, detail: 'Verify the exit criteria and write the milestone report.', skill: '10-execution-initial', commands: cmd('10-execution-initial'), run };
  const blocked = tasks.filter((t) => t.status === '!');
  if (blocked.length) return { kind: 'gate', title: `${active.id} is blocked`, detail: `Resolve ${blocked.map((t) => t.num).join(', ')} (see blocker.md), then change [!] back to [ ].`, skill: null, link: `#/m/${active.id}` };
  return { kind: 'gate', title: `${active.id} has no runnable task`, detail: 'Check dependencies in the implementation plans.', skill: null };
}

async function loadState() {
  const docsDir = path.join(SPEC, 'docs');
  const docs = [];
  for (const d of await listDir(docsDir)) {
    if (!d.isFile() || !d.name.endsWith('.md')) continue;
    const p = path.join(docsDir, d.name);
    const text = await readText(p);
    const st = await fsp.stat(p);
    const h1 = (text || '').match(/^# (.+)$/m);
    docs.push({ name: d.name, path: rel(p), empty: isEmpty(text), title: h1 ? h1[1].trim() : d.name.replace(/\.md$/, ''), mtime: st.mtimeMs, words: text ? text.split(/\s+/).filter(Boolean).length : 0 });
  }
  const msText = await readText(path.join(SPEC, 'milestones.md'));
  const parsed = !isEmpty(msText) ? parseMilestones(msText) : { title: '', roadmap: null, coverage: null, milestones: [] };
  for (const m of parsed.milestones) await loadMilestoneDetail(m);
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
    project: parsed.title || (ideaTitle ? ideaTitle[1].trim() : path.basename(ROOT)),
    root: path.basename(ROOT),
    docs,
    roadmap: parsed.roadmap,
    coverage: parsed.coverage,
    milestones: parsed.milestones,
    progress: { empty: isEmpty(progressText), sections: progress, path: 'progress.md' },
    mockups,
    git: await loadGit(),
    runs: await loadRuns(),
  };
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  try {
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
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err?.stack || err));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is in use. Try: node .speccraft/viewer/server.mjs --port ${PORT + 1}`);
  else console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`SpecCraft Board → ${url}   (workspace: ${SPEC})`);
  watch();
  if (argv.includes('--open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', url] : [url];
    execFile(opener, args, () => {});
  }
});
