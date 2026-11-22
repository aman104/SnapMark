/* SpecCraft Board — client. Reads /api/state, renders the .speccraft workspace, live-reloads on change. */
'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let S = null;
let lastUpdate = 0;
const files = new Map();
// The page served by the board carries a per-process token; it is required to start or stop agents.
const TOKEN = document.querySelector('meta[name="speccraft-token"]')?.content || '';
const drafts = {}; // text typed into the idea, feature and feedback boxes survives re-renders
async function api(pathname, body = {}) {
  const res = await fetch(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SpecCraft-Token': TOKEN }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
const canControl = () => !!(S?.control?.enabled && TOKEN);

const TASK = {
  ' ': { cls: 'pending', label: 'pending', mark: '[ ]' },
  '~': { cls: 'review', label: 'in progress', mark: '[~]' },
  x: { cls: 'done', label: 'done', mark: '[x]' },
  '!': { cls: 'blocked', label: 'blocked', mark: '[!]' },
};
const MS = {
  ' ': { cls: 'planned', label: 'planned', mark: '[ ]' },
  '>': { cls: 'active', label: 'in progress', mark: '[>]' },
  '?': { cls: 'review', label: 'in review', mark: '[?]' },
  x: { cls: 'done', label: 'accepted', mark: '[x]' },
};
const DOCS = [
  { file: '01-Idea.md', title: 'Idea', skill: '01-discovery-idea' },
  { file: '02-General-PRD.md', title: 'Requirements (PRD)', skill: '03-discovery-prd' },
  { file: '03-Design.md', title: 'Design system', skill: '04-planning-design-system' },
  { file: '04-Interface-spec.md', title: 'Interface spec', skill: '05-planning-interface' },
  { file: '05-Tech-Stack.md', title: 'Tech stack', skill: '06-planning-tech-stack' },
];
const ICON_COPY = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8.5" height="8.5"/><path d="M3 10.5V2.5h8"/></svg>';

const stamp = (s, map = TASK) => {
  const m = map[s] || map[' '];
  return `<span class="stamp st-${m.cls}"><b>${esc(m.mark)}</b>${m.label}</span>`;
};

// ------------------------------------------------------------------ markdown

let MD_BASE = '';
let TOC = [];

function resolvePath(base, href) {
  let p = href.replace(/^\.speccraft\//, '');
  if (p.startsWith('/')) p = p.slice(1);
  else if (base) p = `${base}/${p}`;
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '..') out.pop();
    else if (seg && seg !== '.') out.push(seg);
  }
  return out.join('/');
}
function linkTo(txt, href) {
  const raw = href.replace(/&amp;/g, '&');
  if (/^(https?:|mailto:)/.test(raw)) return `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`;
  if (raw.startsWith('#')) return `<a href="${href}">${txt}</a>`;
  const p = resolvePath(MD_BASE, raw.split('#')[0]);
  if (/^docs\/[^/]+\.md$/.test(p)) return `<a href="#/doc/${encodeURIComponent(p.slice(5))}">${txt}</a>`;
  return `<a href="/api/file?path=${encodeURIComponent(p)}" target="_blank">${txt}</a>`;
}
function imgSrc(src) {
  const raw = src.replace(/&amp;/g, '&');
  if (/^(https?:|data:)/.test(raw)) return src;
  return `/api/file?path=${encodeURIComponent(resolvePath(MD_BASE, raw))}`;
}
function inline(s) {
  if (!s) return '';
  let t = esc(s);
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img alt="${alt}" src="${imgSrc(src)}">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => linkTo(txt, href));
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  t = t.replace(/&lt;br\s*\/?&gt;/gi, '<br>'); // line breaks inside table cells
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return t;
}
function slug(text, used) {
  let s = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
  let k = s; let n = 2;
  while (used.has(k)) k = `${s}-${n++}`;
  used.add(k);
  return k;
}
const isList = (l) => /^\s*([-*+]|\d+[.)])\s+/.test(l);

function listHtml(block) {
  const items = [];
  for (const raw of block) {
    const m = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (m) items.push({ indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] });
    else if (items.length) items[items.length - 1].text += ' ' + raw.trim();
  }
  let html = '';
  const stack = [];
  for (const it of items) {
    while (stack.length && it.indent < stack[stack.length - 1].indent) html += `</li></${stack.pop().tag}>`;
    const top = stack[stack.length - 1];
    if (!top || it.indent > top.indent) {
      const tag = it.ordered ? 'ol' : 'ul';
      stack.push({ indent: it.indent, tag });
      html += `<${tag}>`;
    } else html += '</li>';
    const task = it.text.match(/^\[( |x|X)\]\s+(.*)$/);
    html += task ? `<li class="task ${task[1].trim() ? 'ok' : ''}">${inline(task[2])}` : `<li>${inline(it.text)}`;
  }
  while (stack.length) html += `</li></${stack.pop().tag}>`;
  return html;
}
function tableHtml(block) {
  const rows = block.map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const body = rows.filter((r, i) => !(i === 1 && r.every((c) => /^:?-{2,}:?$/.test(c))));
  const [head, ...rest] = body;
  return `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function frontMatter(fm) {
  const sw = [];
  let inColors = false;
  for (const line of fm.split('\n')) {
    if (/^colors:\s*$/.test(line)) { inColors = true; continue; }
    if (inColors && /^\S/.test(line)) inColors = false;
    const m = inColors && line.match(/^\s+([\w-]+):\s*["']?(#[0-9a-fA-F]{3,8})["']?/);
    if (m) sw.push(m);
  }
  const swatches = sw.length ? `<div class="swatches">${sw.map((m) => `<div class="swatch"><i style="background:${esc(m[2])}"></i><div>${esc(m[1])}<span>${esc(m[2])}</span></div></div>`).join('')}</div>` : '';
  return `${swatches}<details class="fm"><summary class="label">Front matter · design tokens</summary><pre><code>${esc(fm)}</code></pre></details>`;
}
function md(src, base = '') {
  MD_BASE = base;
  TOC = [];
  const used = new Set();
  let out = '';
  let text = (src || '').replace(/\r/g, '');
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 4);
    if (end > 0) { out += frontMatter(text.slice(4, end)); text = text.slice(end + 4); }
  }
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out += `<pre><code>${esc(buf.join('\n'))}</code></pre>`;
      continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const n = h[1].length; const id = slug(h[2], used);
      if (n === 2 || n === 3) TOC.push({ level: n, id, text: h[2] });
      out += `<h${n} id="${id}">${inline(h[2])}</h${n}>`; i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out += '<hr>'; i++; continue; }
    if (/^\s*\|/.test(l)) {
      const buf = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) buf.push(lines[i++]);
      out += tableHtml(buf); continue;
    }
    if (/^\s*>/.test(l)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      const saveToc = TOC; const inner = md(buf.join('\n'), base); TOC = saveToc; MD_BASE = base;
      out += `<blockquote>${inner}</blockquote>`; continue;
    }
    if (isList(l)) {
      const buf = [];
      while (i < lines.length && lines[i].trim() && (isList(lines[i]) || /^\s+\S/.test(lines[i]))) buf.push(lines[i++]);
      out += listHtml(buf); continue;
    }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*```|\s*\||\s*>)/.test(lines[i]) && !isList(lines[i])) buf.push(lines[i++].trim());
    out += `<p>${inline(buf.join(' '))}</p>`;
  }
  return out;
}

// ------------------------------------------------------------------ data helpers

async function file(path) {
  if (!path) return null;
  if (files.has(path)) return files.get(path);
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  const text = res.ok ? await res.text() : null;
  files.set(path, text);
  return text;
}
const milestone = (id) => S.milestones.find((m) => m.id === id);
// Live work of the agents (from .speccraft/.runs): which task is being implemented or reviewed right now.
const workOn = (num) => (S.runs?.working || []).find((w) => w.task === num);
// A pending task that an agent is implementing right now counts as in progress.
const eff = (t) => (t.status === ' ' && workOn(t.num) ? '~' : t.status);
const ACTION = { implement: 'implementing', review: 'reviewing', complete: 'completing', work: 'working' };
function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`;
}
const since = (ts) => (ts ? `<span class="since" data-since="${ts}">${ago(ts)}</span>` : '');
const busy = (w) => `<span class="busy"><i class="spin"></i>${ACTION[w.action] || 'working'}</span>`;
const activeMilestone = () => S.milestones.find((m) => m.status === '>') || S.milestones.find((m) => m.status === '?');
const allTasks = () => S.milestones.flatMap((m) => (m.tasks || []).map((t) => ({ ...t, milestone: m.id })));
const field = (m, name) => m.fields?.[name];
const dirOf = (p) => (p || '').split('/').slice(0, -1).join('/');

function phases() {
  const ms = S.milestones;
  const statusOf = (ids) => {
    const list = ms.filter((m) => ids.includes(m.id));
    if (!list.length) return 'planned';
    if (list.every((m) => m.status === 'x')) return 'done';
    if (list.some((m) => m.status === '>')) return 'active';
    if (list.some((m) => m.status === '?')) return 'review';
    if (list.some((m) => m.status === 'x')) return 'active';
    return 'planned';
  };
  if (S.roadmap?.rows?.length) {
    const H = S.roadmap.headers.map((h) => h.toLowerCase());
    const col = (re) => H.findIndex((h) => re.test(h));
    const iP = Math.max(0, col(/phase/)); const iM = col(/milestone/); const iS = col(/see|outcome/);
    return S.roadmap.rows.map((r) => {
      const cell = r[iP] || '';
      const m = cell.match(/^([\d–\-+]+)\.?\s*(.*)$/);
      const ids = (iM >= 0 ? r[iM] || '' : '').match(/M\d\d/g) || [];
      return { num: m ? m[1] : '', name: m ? m[2] : cell, ids, see: iS >= 0 ? r[iS] : '', status: statusOf(ids) };
    });
  }
  const groups = [];
  for (const m of ms) {
    let g = groups.find((x) => x.key === m.phase.key);
    if (!g) {
      const mm = (m.phase.label || '').match(/^([\d–\-+]+)\s*[—–-]?\s*(.*)$/);
      g = { key: m.phase.key, num: mm ? mm[1] : '', name: mm ? mm[2] : (m.phase.label || m.name), ids: [], see: field(m, 'What you will see')?.text || '' };
      groups.push(g);
    }
    g.ids.push(m.id);
  }
  return groups.map((g) => ({ ...g, status: statusOf(g.ids) }));
}

function segments(tasks) {
  if (!tasks?.length) return '<div class="segments"><i></i></div>';
  return `<div class="segments ${S.runs?.running ? 'live' : ''}">${tasks.map((t) => `<i class="${TASK[eff(t)]?.cls || 'pending'}${workOn(t.num) ? ' working' : ''}" title="${esc(t.num)} ${esc(t.name)}"></i>`).join('')}</div>`;
}
function counts(m) {
  const c = { x: 0, '~': 0, '!': 0, ' ': 0 };
  for (const t of m.tasks || []) c[eff(t)] = (c[eff(t)] || 0) + 1;
  return `<div class="counts"><span class="c-done">${c.x} done</span><span class="c-review">${c['~']} in progress</span><span class="c-blocked">${c['!']} blocked</span><span class="c-pending">${c[' ']} pending</span></div>`;
}
function track(compact = false) {
  const ph = phases();
  if (!ph.length) return '';
  const act = activeMilestone()?.id;
  return `<div class="track ${compact ? 'compact' : ''}">${ph.map((p) => `
    <div class="station ${p.status}">
      <div class="line"><span class="dot"></span></div>
      <div class="num">${esc(p.num || '·')}</div>
      <div class="name">${inline(p.name)}</div>
      <div class="ms">${p.ids.map((id) => `<a href="#/m/${id}" class="${act === id ? 'on' : ''}">${id}</a>`).join('')}</div>
      <div class="see">${inline(p.see)}</div>
    </div>`).join('')}</div>`;
}
function copyChip(tool, text) {
  return `<button class="cmd" data-copy="${esc(text)}" title="Copy"><span class="tool">${esc(tool)}</span><span class="c">${esc(text)}</span>${ICON_COPY}</button>`;
}
function emptyState(title, body, cmd) {
  return `<div class="empty-state fade-in"><div class="label">Nothing here yet</div><h3>${esc(title)}</h3><p>${body}</p>${cmd ? `<div class="cmds">${copyChip('Claude / Antigravity', '/' + cmd)}${copyChip('Codex', '$' + cmd)}</div>` : ''}</div>`;
}

// ------------------------------------------------------------------ sidebar

function sidebar(parts) {
  const at = (h) => (location.hash || '#/') === h ? 'on' : '';
  const startsAt = (h) => (location.hash || '').startsWith(h) ? 'on' : '';
  const docsAll = [...DOCS.map((d) => ({ ...d, info: S.docs.find((x) => x.name === d.file) })),
    ...S.docs.filter((x) => !DOCS.some((d) => d.file === x.name)).map((x) => ({ file: x.name, title: x.title, info: x }))];
  return `
    <a class="brand" href="#/"><span class="mark">${[0, 1, 2, 5, 4, 3, 6, 7, 8].map((o) => `<i style="--o:${o}"></i>`).join('')}</span><span class="brand-name">SpecCraft <span>Board</span></span></a>
    <div class="project-chip"><div class="label">Project</div><div class="name">${esc(S.project)}</div></div>
    <nav class="nav">
      <div class="nav-group">
        <div class="label">Workspace</div>
        <a href="#/" title="Overview" class="${at('#/') || at('')}"><span class="num">◎</span><span class="grow">Overview</span></a>
        <a href="#/roadmap" title="Roadmap" class="${startsAt('#/roadmap')}"><span class="num">━</span><span class="grow">Roadmap</span></a>
        <a href="#/progress" title="Progress log" class="${startsAt('#/progress')}"><span class="num">≡</span><span class="grow">Progress log</span></a>
      </div>
      <div class="nav-group">
        <div class="label">Specification</div>
        ${docsAll.map((d) => {
          const empty = !d.info || d.info.empty;
          const n = d.file.match(/^(\d+)/);
          return `<a href="#/doc/${encodeURIComponent(d.file)}" title="${esc(d.title)}" class="${startsAt('#/doc/' + encodeURIComponent(d.file))} ${empty ? 'empty' : ''}"><span class="num">${n ? n[1] : '·'}</span><span class="grow">${esc(d.title)}</span></a>`;
        }).join('')}
      </div>
      <div class="nav-group">
        <div class="label"><span>Milestones</span><span>${S.milestones.filter((m) => m.status === 'x').length}/${S.milestones.length}</span></div>
        ${S.milestones.length ? S.milestones.map((m) => {
          const live = m.status === '>';
          const busy = live && S.runs?.running;
          return `<a href="#/m/${m.id}" class="${startsAt('#/m/' + m.id)} ${live ? 'ms-live' : ''} ${busy ? 'ms-busy' : ''}" title="${m.id} · ${esc(m.name)} · ${esc(MS[m.status].label)}${busy ? ' · agents at work' : ''}"><span class="num">${m.id}</span><span class="grow">${esc(m.name)}</span><span class="stamp st-${MS[m.status].cls}" style="padding:2px 4px">${busy ? '<i class="spin"></i>' : ''}${esc(MS[m.status].mark)}</span></a>`;
        }).join('') : '<a href="#/roadmap" class="empty"><span class="num">—</span><span class="grow">not planned yet</span></a>'}
      </div>
    </nav>
    <div class="sidebar-foot">
      ${S.git ? `<span class="label" title="git branch">⎇ ${esc(S.git.branch)}${S.git.dirty ? ` · ${S.git.dirty} changed` : ''}</span>` : '<span class="label">no git repository</span>'}
    </div>`;
}

// ------------------------------------------------------------------ pages

function nextPanel(n, span = 'span-12') {
  const sym = { skill: '→', gate: '!', done: '✓', running: '●' }[n.kind] || '→';
  const label = { skill: 'Next step', gate: 'Needs you', done: 'Complete', running: 'Running' }[n.kind] || 'Next';
  const chips = [];
  if (n.commands) chips.push(copyChip('Claude', n.commands.claude), copyChip('Codex', n.commands.codex), copyChip('Antigravity', n.commands.antigravity));
  if (n.run) chips.push(copyChip('Terminal', n.run));
  const cmds = `<div class="cmds">${chips.join('')}${copyChip('Any agent', '/00-next')}</div>`;
  const ctl = canControl();
  return `<section class="panel ${span} fade-in">
    <div class="panel-head"><span class="label">${label}</span>${n.skill ? `<span class="badge">${esc(n.skill)}</span>` : ''}</div>
    <div class="next ${n.kind}">
      <div class="next-kind">${sym}</div>
      <div>
        <h3>${n.link ? `<a href="${n.link}">${esc(n.title)}</a>` : esc(n.title)}</h3>
        <p>${inline(n.detail || '')}</p>
        ${ctl ? nextActions(n) : ''}
        ${ctl ? `<details class="manual" data-preserve="manual"><summary class="label">or run it yourself</summary>${cmds}</details>` : cmds}
      </div>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ control

const needsIdea = () => !S.docs.some((d) => d.name === '01-Idea.md' && !d.empty) && !S.autopilot?.brief;
const draftBox = (key, placeholder, rows = 4) => `<textarea class="inp area" id="sc-${key}" data-draft="${key}" data-preserve="${key}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(drafts[key] || '')}</textarea>`;

// Inline actions for the gates that need the operator: the idea, the milestone review.
function nextActions(n) {
  if (S.runs?.running) return '';
  if (n.kind === 'gate' && needsIdea()) {
    return `<div class="act-form">${draftBox('brief', 'Describe the product in a few sentences: the problem, who it is for, what v1 must do, the type of product (web app, CLI, API, …) and any fixed constraints.', 5)}
      <div class="act-row"><button class="btn primary" data-act="brief-run">▶ Start with this idea</button><button class="btn" data-act="brief">Save only</button>
      <span class="muted act-hint">${S.control.settings.mode === 'full' ? `Full autopilot: idea → roast → spec → plan → build, until “${esc(S.control.settings.stopAt)}”.` : 'Step by step: writes the idea, then waits for your Next.'}</span></div></div>`;
  }
  const review = S.milestones.find((m) => m.status === '?');
  if (n.kind === 'gate' && review) {
    return `<div class="act-form"><div class="act-row"><button class="btn primary" data-act="accept" data-m="${review.id}">✓ Accept ${review.id}</button><a class="btn" href="#/m/${review.id}/report">Read the report</a></div>
      ${draftBox('changes', `What should change in ${review.id}? Each point becomes a rework task.`, 3)}
      <div class="act-row"><button class="btn" data-act="changes">Request changes</button></div></div>`;
  }
  return '';
}

function controlPanel() {
  return `<section class="panel span-12 control fade-in">${controlInner()}</section>`;
}

function controlInner() {
  const c = S.control;
  const st = c.settings;
  const run = c.run;
  const n = S.next;
  const agent = c.agents.find((a) => a.id === st.agent);
  const installed = c.agents.some((a) => a.installed);
  const busy = S.runs?.running;
  const models = agent?.models === null ? null : [...new Set(['default', ...(agent?.configured ? [agent.configured] : []), ...(agent?.models || [])])];
  const blocked = ['gate', 'done'].includes(n.kind);
  let primary;
  if (run?.running) primary = '<button class="btn danger" data-act="stop">■ Stop</button>';
  else if (busy && S.runs?.session) primary = '<button class="btn" disabled title="An interactive agent session is working; it finishes the step itself">Agent session at work</button>';
  else if (busy) primary = '<button class="btn" disabled title="Started in a terminal: stop it there with Ctrl+C">Running in a terminal</button>';
  else if (!installed) primary = '<button class="btn" disabled>No agent CLI found</button>';
  else if (st.mode === 'full') primary = `<button class="btn primary" data-act="run" data-kind="autopilot" ${blocked ? 'disabled' : ''} title="Runs until: ${esc(st.stopAt)}">▶ Start autopilot</button>`;
  else primary = `<button class="btn primary" data-act="run" data-kind="next" ${blocked ? 'disabled' : ''} title="${esc(n.title)}">▶ Next</button>`;
  const sig = JSON.stringify([st, agent?.version, busy, run?.running, n.kind, n.title, installed]);
  const last = run && !run.running ? `<div class="ctl-last"><span class="label">last run</span><span>${esc(run.kind)} · ${esc(run.agent)}${run.model ? ` (${esc(run.model)})` : ''} · ${ago(run.endedAt)} ago${run.exit !== undefined && run.exit !== 0 ? ` · exit ${esc(run.exit)}` : ''}</span>${run.result ? `<span class="res">${esc(run.result)}</span>` : ''}<a class="label" href="/api/file?path=${encodeURIComponent(run.log)}" target="_blank">log →</a></div>` : '';
  return `
    <div class="ctl-row" data-preserve="${esc(sig)}">
      <label class="ctl"><span class="label">Agent</span><select class="inp" data-set="agent">${c.agents.map((a) => `<option value="${a.id}" ${a.id === st.agent ? 'selected' : ''} ${a.installed ? '' : 'disabled'}>${esc(a.name)}${a.installed ? (a.version ? ` · ${esc(a.version)}` : '') : ' — not installed'}</option>`).join('')}</select></label>
      <label class="ctl"><span class="label">Model</span>${models === null ? '<span class="inp ghost">set in the CLI</span>' : `<input class="inp" data-set="model" list="sc-models" value="${esc(st.model || 'default')}" spellcheck="false" autocomplete="off"><datalist id="sc-models">${models.map((m) => `<option value="${esc(m)}">${m === 'default' && agent.configured ? `CLI default: ${esc(agent.configured)}` : ''}</option>`).join('')}</datalist>`}</label>
      <div class="ctl"><span class="label">Mode</span><div class="seg"><button class="${st.mode === 'step' ? 'on' : ''}" data-act="mode" data-mode="step">Step by step</button><button class="${st.mode === 'full' ? 'on' : ''}" data-act="mode" data-mode="full">Full autopilot</button></div></div>
      ${st.mode === 'full' ? `<label class="ctl"><span class="label">Stop at</span><select class="inp" data-set="stopAt">${[['spec', 'spec ready'], ['plan', 'milestone planned'], ['milestone', 'milestone built']].map(([v, l]) => `<option value="${v}" ${st.stopAt === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="ctl"><span class="label">Parallel</span><select class="inp" data-set="parallel">${[1, 2, 3, 4].map((v) => `<option value="${v}" ${st.parallel === v ? 'selected' : ''}>${v === 1 ? 'off' : `${v} tasks`}</option>`).join('')}</select></label>` : ''}
      <div class="ctl ctl-go"><span class="label">&nbsp;</span>${primary}</div>
    </div>
    ${last}`;
}

function featurePanel() {
  if (!canControl() || S.runs?.running || !S.milestones.length) return '';
  return `<section class="panel span-12 fade-in">
    <div class="panel-head"><span class="label">Request a feature or a fix</span><span class="badge">12-feature-advisor</span></div>
    <div class="panel-body act-form">${draftBox('feature', 'Describe the feature or the bug. The agent updates the specification and adds a milestone for it.', 3)}
      <div class="act-row"><button class="btn" data-act="feature">Plan it</button><span class="muted act-hint">${S.control.settings.mode === 'full' ? 'Full autopilot then plans and builds it as well.' : 'Runs the planning step only.'}</span></div></div>
  </section>`;
}

// What an agent is doing while it runs a skill.
const SKILL_DOING = {
  starting: 'Starting the autopilot',
  '01-discovery-idea': 'Writing the idea',
  '02-discovery-idea-roast': 'Roasting the idea',
  '03-discovery-prd': 'Writing the requirements (PRD)',
  '04-planning-design-system': 'Defining the design system',
  '05-planning-interface': 'Specifying the interface',
  '06-planning-tech-stack': 'Choosing the tech stack',
  '07-planning-milestones': 'Planning the roadmap',
  '08-planning-tasks': 'Planning the milestone tasks',
  '09-planning-task-details': 'Writing the implementation plans',
  '12-feature-advisor': 'Planning the requested feature',
};

function sessionTitle(se) {
  if (se.title) return se.title;
  if (se.task) {
    const t = allTasks().find((x) => x.num === se.task);
    return `${se.action === 'review' ? 'Reviewing' : 'Implementing'} ${se.task}${t ? ` — ${t.name}` : ''}`;
  }
  return SKILL_DOING[se.skill] || (se.skill ? `Running ${se.skill}` : 'An agent session is working');
}

// What the agents are doing right now, one item per running agent.
function workItems() {
  const r = S.runs || {};
  const act = activeMilestone();
  const items = [];
  if (r.autopilot && r.autopilot !== 'build') items.push({ title: SKILL_DOING[r.autopilot] ? `${SKILL_DOING[r.autopilot]}${act && /^0[89]/.test(r.autopilot) ? ` for ${(currentStage().m || act).id}` : ''}` : `Autopilot · ${r.autopilot}`, since: r.autopilotSince, lane: r.autopilot });
  for (const w of r.working || []) {
    const t = w.task ? allTasks().find((x) => x.num === w.task) : null;
    let title;
    if (w.action === 'complete') title = `Completing ${act?.id || 'the milestone'}: exit criteria and milestone report`;
    else if (w.task) title = `${w.action === 'review' ? 'Reviewing' : 'Implementing'} ${w.task}${t ? ` — ${t.name}` : ''}`;
    else title = w.text || 'Working';
    items.push({ title, href: t ? `#/m/${t.milestone}/t/${t.num}` : null, since: w.since, lane: w.lane === 'main' ? (w.action === 'review' ? 'independent review' : 'main') : w.lane });
  }
  if (!items.length && r.session) items.push({ title: sessionTitle(r.session), since: r.session.since, lane: 'agent session' });
  if (!items.length) items.push({ title: r.autopilot === 'build' ? `Building ${act?.id || 'the milestone'}: choosing the next task…` : 'Preparing the next step…', since: r.autopilotSince });
  return items;
}

// Live status in the top bar, on every page: the current agent work while a run is active.
function topLive() {
  const se = S.runs?.session;
  if (!S.runs?.running && se?.state === 'waiting') return `<a class="top-work waiting" href="#/" title="The agent session stopped and waits for you"><span class="what">Waiting for you · ${esc(sessionTitle(se))}</span></a>`;
  if (!S.runs?.running) return '<span class="live on" id="liveDot"><i></i><span>live</span></span>';
  const items = workItems();
  const first = items[0];
  const all = items.map((i) => `${i.title}${i.lane ? ` (${i.lane})` : ''}`).join('\n');
  return `<a class="top-work" href="#/" title="${esc(all)}"><i class="spin"></i><span class="what">${esc(first.title)}</span>${items.length > 1 ? `<span class="more">+${items.length - 1}</span>` : ''}${since(first.since)}</a>`;
}

function workPanel(span = 'span-12') {
  const r = S.runs || {};
  const items = workItems();
  const last = (r.latest?.tail || '').split('\n').map((l) => l.trim()).filter(Boolean).pop();
  return `<section class="panel ${span} work">
    <div class="work-bar"></div>
    <div class="panel-head"><span class="label work-title"><i class="spin"></i>Agent at work${r.autopilot ? ' · autopilot' : ''}</span><a class="label" href="#/runs">live log →</a></div>
    <div class="panel-body">
      <div class="work-list">${items.map((i) => `<div class="work-item"><span class="t">${i.href ? `<a href="${i.href}">${esc(i.title)}</a>` : esc(i.title)}</span>${i.lane ? `<span class="badge">${esc(i.lane)}</span>` : '<span></span>'}${since(i.since)}</div>`).join('')}</div>
      ${last ? `<div class="work-last"><span class="label">last output</span><span class="mono">${esc(last.slice(0, 240))}</span></div>` : ''}
    </div>
  </section>`;
}

function attentionItems() {
  const items = [];
  const rev = S.milestones.find((m) => m.status === '?');
  if (rev) items.push({ k: rev.id, text: `<a href="#/m/${rev.id}/report">Milestone awaiting your review</a>`, cls: 'review' });
  for (const t of allTasks().filter((t) => t.status === '!')) items.push({ k: t.num, text: `<a href="#/m/${t.milestone}/t/${t.num}/blocker">Blocked: ${esc(t.name)}</a>`, cls: 'blocked' });
  for (const t of allTasks().filter((t) => t.status === '~')) items.push({ k: t.num, text: `<a href="#/m/${t.milestone}/t/${t.num}">Awaiting review: ${esc(t.name)}</a>`, cls: 'review' });
  if (S.runs?.stop) items.push({ k: 'STOP', text: esc(S.runs.stop), cls: 'blocked' });
  for (const d of (S.autopilot?.decisions || []).slice(-6)) items.push({ k: 'auto', text: `<a href="#/autopilot">${inline(d)}</a>`, cls: 'pending' });
  if (S.git?.dirtyOutsideSpec) items.push({ k: 'git', text: `${S.git.dirtyOutsideSpec} uncommitted change(s) in the product`, cls: 'review' });
  const sec = S.progress.sections || {};
  const assumptions = (sec['Open assumptions to review'] || []).filter((l) => /^\s*-\s+\S/.test(l) && !/^\s*-\s*none/i.test(l));
  for (const a of assumptions.slice(0, 6)) items.push({ k: 'assume', text: inline(a.replace(/^\s*-\s+/, '')), cls: 'pending' });
  return items;
}

function activity() {
  const out = [];
  const log = (S.progress.sections?.Log || []).filter((l) => /^\s*-\s/.test(l)).slice(-10).reverse();
  for (const l of log) {
    const m = l.match(/^\s*-\s*(\[[^\]]+\])\s*(\[[^\]]\])?\s*([\d-]{10})?\s*[—–-]?\s*(.*)$/);
    out.push(m ? `<div><span class="k">${esc((m[3] || '').slice(5) || m[1])}</span><span>${esc(m[1])} ${m[2] ? stampMini(m[2]) : ''} ${inline(m[4])}</span></div>` : `<div><span class="k">·</span><span>${inline(l.replace(/^\s*-\s*/, ''))}</span></div>`);
  }
  return out.join('');
}
function stampMini(mark) {
  const s = mark.replace(/[[\]]/g, '');
  const map = s === '?' || s === '>' ? MS : TASK;
  const m = map[s] || TASK[' '];
  return `<span class="stamp st-${m.cls}" style="padding:1px 4px">${esc(mark)}</span>`;
}

// ------------------------------------------------------------------ overview

// The workflow as the operator sees it: where the project is, what is being done, what comes next.
const STAGES = [
  { id: 'spec', name: 'Specification', sub: 'idea → tech stack' },
  { id: 'roadmap', name: 'Roadmap', sub: 'phases and milestones' },
  { id: 'tasks', name: 'Milestone tasks', sub: 'what to build' },
  { id: 'plans', name: 'Task plans', sub: 'how to build it' },
  { id: 'build', name: 'Build', sub: 'implement and review' },
  { id: 'review', name: 'Your review', sub: 'accept or rework' },
];

const SPEC_STEPS = [
  { skill: '01-discovery-idea', title: 'Idea', file: '01-Idea.md' },
  { skill: '02-discovery-idea-roast', title: 'Idea roast', file: '01-Idea-roast.md', roast: true },
  { skill: '03-discovery-prd', title: 'Requirements (PRD)', file: '02-General-PRD.md' },
  { skill: '04-planning-design-system', title: 'Design system', file: '03-Design.md' },
  { skill: '05-planning-interface', title: 'Interface spec', file: '04-Interface-spec.md' },
  { skill: '06-planning-tech-stack', title: 'Tech stack', file: '05-Tech-Stack.md' },
  { skill: '07-planning-milestones', title: 'Roadmap', file: 'milestones.md', roadmap: true },
];

const docOk = (name) => S.docs.some((d) => d.name === name && !d.empty);
const runningSkill = () => (S.runs?.running ? S.runs.autopilot || S.runs.session?.skill || null : null);
const runningSince = () => S.runs?.autopilotSince || S.runs?.session?.since || null;

// Status of every specification step: done, next, running, todo (or skipped for the roast).
function specSteps() {
  const ap = S.autopilot || { roastDone: 0, roastRounds: 3, roastConverged: false };
  const out = SPEC_STEPS.map((st) => {
    let done;
    let note = '';
    if (st.roadmap) done = S.milestones.length > 0;
    else if (st.roast) {
      const prd = docOk('02-General-PRD.md');
      const pending = !prd && ap.roastRounds > 0 && ap.roastDone < ap.roastRounds && !ap.roastConverged;
      done = !pending;
      note = ap.roastDone ? `${ap.roastDone} round(s)${ap.roastConverged ? ', converged' : ''}` : prd || !ap.roastRounds ? 'skipped' : `up to ${ap.roastRounds} rounds`;
    } else done = docOk(st.file);
    const info = S.docs.find((d) => d.name === st.file);
    if (!note && info && !info.empty) note = `${info.words} words`;
    return { ...st, done, note };
  });
  const next = out.find((st) => !st.done);
  for (const st of out) st.state = st.done ? 'done' : st === next ? (runningSkill() === st.skill ? 'running' : 'next') : 'todo';
  return out;
}

// The stage comes from the state engine (the same one 00-next and the autopilot use).
function currentStage() {
  const st = S.stage || { id: 'spec', milestone: null };
  const m = st.milestone ? S.milestones.find((x) => x.id === st.milestone) : null;
  return m ? { id: st.id, m } : { id: st.id };
}

function stageStepper(stage) {
  const idx = STAGES.findIndex((x) => x.id === stage.id);
  const accepted = S.milestones.filter((m) => m.status === 'x').length;
  return `<div class="stages">${STAGES.map((x, i) => {
    const state = stage.id === 'done' || i < idx ? 'done' : i === idx ? 'current' : 'todo';
    const ms = i >= 2 && stage.m ? stage.m.id : '';
    return `<div class="stage ${state}${state === 'current' && S.runs?.running ? ' running' : ''}">
      <span class="stage-num">${state === 'done' ? '✓' : i + 1}</span>
      <span class="stage-name">${x.name}${ms ? ` <span class="mono">${ms}</span>` : ''}</span>
      <span class="stage-sub">${x.sub}</span>
    </div>`;
  }).join('')}</div>${S.milestones.length ? `<div class="stages-note label">${accepted} of ${S.milestones.length} milestones accepted · the last four stages repeat for every milestone</div>` : ''}`;
}

function stateBadge(state, sinceTs) {
  if (state === 'done') return stamp('x');
  if (state === 'running') return `<span class="busy"><i class="spin"></i>in progress</span>${since(sinceTs)}`;
  if (state === 'next') return '<span class="stamp st-active"><b>▶</b>next</span>';
  return '<span class="stamp st-pending"><b>[ ]</b>to do</span>';
}

// Body of the current stage.
function stageBody(stage) {
  const m = stage.m;
  if (stage.id === 'spec' || stage.id === 'roadmap') {
    const steps = specSteps();
    const done = steps.filter((x) => x.done).length;
    const needIdea = canControl() && !S.runs?.running && needsIdea();
    return `${needIdea ? `<div class="stage-ask"><div class="label">Start here: describe your idea</div>${nextActions(S.next)}</div>` : ''}
      <div class="label stage-count">${done} of ${steps.length} done</div>
      <div class="steps">${steps.map((x, i) => {
        const link = x.roadmap ? (x.done ? '#/roadmap' : '') : x.done || docOk(x.file) ? `#/doc/${encodeURIComponent(x.file)}` : '';
        return `<div class="step ${x.state}">
          <span class="step-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="step-t">${link ? `<a href="${link}">${esc(x.title)}</a>` : esc(x.title)}<span class="step-file mono">${x.roadmap ? '.speccraft/milestones.md' : `docs/${x.file}`}</span></span>
          <span class="step-note">${esc(x.note)}</span>
          <span class="step-skill mono">${x.skill}</span>
          <span class="step-st">${stateBadge(x.state, runningSince())}</span>
        </div>`;
      }).join('')}</div>`;
  }
  if (stage.id === 'tasks') {
    const nextM = m;
    return `<p class="stage-lead">The roadmap is ready. Next: plan the tasks of <b>${nextM.id} — ${esc(nextM.name)}</b> (08-planning-tasks). This creates the milestone branch and its task list.</p>
      ${field(nextM, 'What you will see') ? `<div class="callout" style="margin-bottom:var(--s-4)"><div class="label">${nextM.id} — what you will see</div><p>${inline(field(nextM, 'What you will see').text)}</p></div>` : ''}
      <div class="steps">${S.milestones.map((x) => `<div class="step ${x.status === 'x' ? 'done' : x.id === nextM.id ? (runningSkill() === '08-planning-tasks' ? 'running' : 'next') : 'todo'}">
        <span class="step-num mono">${x.id}</span>
        <span class="step-t"><a href="#/m/${x.id}">${esc(x.name)}</a><span class="step-file">${esc(x.phase.label || '')}</span></span>
        <span class="step-note">${x.tasks?.length ? `${x.tasks.length} tasks` : ''}</span>
        <span class="step-skill mono">${esc(field(x, 'Type')?.text || '')}</span>
        <span class="step-st">${x.status === 'x' ? stamp('x', MS) : x.id === nextM.id ? stateBadge(runningSkill() === '08-planning-tasks' ? 'running' : 'next', runningSince()) : stamp(' ', MS)}</span>
      </div>`).join('')}</div>`;
  }
  if (stage.id === 'plans') {
    const tasks = m.tasks || [];
    const withPlan = tasks.filter((t) => t.files['implementation-plan']).length;
    const busy = runningSkill() === '09-planning-task-details';
    return `${msHead(m)}
      <div class="label stage-count">${withPlan} of ${tasks.length} implementation plans written · 09-planning-task-details</div>
      <div class="steps">${tasks.map((t) => {
        const has = !!t.files['implementation-plan'];
        const built = t.status === 'x';
        const state = has || built ? 'done' : busy ? 'running' : 'next';
        return `<div class="step ${state}">
          <span class="step-num mono">${t.num}</span>
          <span class="step-t"><a href="#/m/${m.id}/t/${t.num}">${esc(t.name)}</a><span class="step-file">${inline(t.description || '').slice(0, 0)}</span></span>
          <span class="step-note">${t.plan?.parallel ? esc(t.plan.parallel) : ''}</span>
          <span class="step-skill mono">${built ? 'built' : has ? 'implementation-plan.md' : 'no plan yet'}</span>
          <span class="step-st">${built ? stamp('x') : state === 'done' ? '<span class="stamp st-done"><b>✓</b>planned</span>' : stateBadge(state, runningSince())}</span>
        </div>`;
      }).join('')}</div>`;
  }
  if (stage.id === 'build') {
    return `${msHead(m)}
      ${S.runs?.running && workItems().length > 1 ? `<div class="work-inline">${workList()}</div>` : ''}
      ${segments(m.tasks)}${counts(m)}
      ${m.tasks?.length ? `<div class="ms-board">${taskBoard(m)}</div>` : ''}`;
  }
  if (stage.id === 'review') {
    const exit = field(m, 'Exit criteria');
    return `${msHead(m)}
      <p class="stage-lead">${m.id} is built. Run the demo from the <a href="#/m/${m.id}/report">milestone report</a>, check the exit criteria${S.autopilot?.decisions?.length ? ` and the <a href="#/autopilot">${S.autopilot.decisions.length} decision(s) the autopilot made</a>` : ''}, then accept it or request changes.</p>
      ${exit?.items?.length ? `<div class="label" style="margin-bottom:6px">Exit criteria</div><ul class="check">${exit.items.map((it) => `<li class="${it.checked ? 'ok' : ''}">${inline(it.text)}</li>`).join('')}</ul>` : ''}
      ${canControl() && !S.runs?.running ? nextActions(S.next) : ''}`;
  }
  return `<p class="stage-lead">Every milestone of the roadmap is accepted. Add a feature or a fix below; it becomes a new milestone.</p>`;
}

function msHead(m) {
  return `<div class="ms-now">
      <div>
        <div class="label">${esc(m.phase.label || '')}</div>
        <h3 class="ms-title"><a href="#/m/${m.id}"><span class="mono">${m.id}</span> ${esc(m.name)}</a> ${stamp(m.status, MS)}</h3>
      </div>
      ${field(m, 'What you will see') ? `<div class="callout"><div class="label">What you will see</div><p>${inline(field(m, 'What you will see').text)}</p></div>` : ''}
    </div>`;
}

function workList() {
  return `<div class="work-list">${workItems().map((i) => `<div class="work-item"><span class="t"><i class="spin"></i> ${i.href ? `<a href="${i.href}">${esc(i.title)}</a>` : esc(i.title)}</span>${i.lane ? `<span class="badge">${esc(i.lane)}</span>` : '<span></span>'}${since(i.since)}</div>`).join('')}</div>`;
}

// One line under the stage title: what is running now, or what the next step is.
function nowLine(stage) {
  const n = S.next;
  const se = S.runs?.session;
  if (!S.runs?.running && se?.state === 'waiting') {
    return `<div class="now-line waiting"><span class="stamp st-review"><b>?</b>waiting for you</span><span><b>${esc(sessionTitle(se))}</b> — the agent session stopped and waits for your answer.</span>${since(se.since)}</div>`;
  }
  if (!S.runs?.running && se?.state === 'stale') {
    return `<div class="now-line stale"><span class="stamp st-pending"><b>…</b>no activity</span><span>An agent session marked <b>${esc(sessionTitle(se))}</b> has shown no activity for ${ago(se.lastSeen)}. If it has ended, clear its status.</span>${canControl() ? '<button class="btn" data-act="clear-activity">Clear</button>' : ''}</div>`;
  }
  if (S.runs?.running) {
    const items = workItems();
    const first = items[0];
    const what = items.length > 1 ? `${items.length} agents at work` : first.title;
    return `<div class="now-line running"><i class="spin"></i><span><b>Now:</b> ${esc(what)}</span>${items.length > 1 ? '' : since(first.since)}<a class="label" href="#/runs">live log →</a></div>`;
  }
  if (n.kind === 'gate' && !['spec', 'review'].includes(stage.id)) {
    return `<div class="now-line gate"><span class="stamp st-blocked"><b>!</b>needs you</span><span><b>${esc(n.title)}.</b> ${inline(n.detail || '')}</span></div>`;
  }
  if (n.kind === 'done') return `<div class="now-line"><span><b>${esc(n.title)}.</b> ${inline(n.detail || '')}</span></div>`;
  return `<div class="now-line"><span class="stamp st-active"><b>▶</b>next</span><span><b>${esc(n.title)}</b>${n.skill ? ` <span class="mono muted">· ${esc(n.skill)}</span>` : ''}</span>${canControl() && n.skill ? `<button class="link-btn" data-chat-prompt="${esc(`Use the ${n.skill} skill: ${n.title}.`)}">do it in the chat →</button>` : ''}</div>`;
}

function stagePanel(stage) {
  const title = { spec: 'Specification', roadmap: 'Roadmap', tasks: 'Milestone tasks', plans: 'Task plans', build: 'Active milestone', review: 'Your review', done: 'Roadmap complete' }[stage.id];
  return `<section class="panel span-12 stage-panel ${S.runs?.running ? 'work' : ''} fade-in">
    ${S.runs?.running ? '<div class="work-bar"></div>' : ''}
    <div class="panel-head"><span class="label">Where you are · ${title}${stage.m ? ` · ${stage.m.id}` : ''}</span>${stage.m ? `<a class="label" href="#/m/${stage.m.id}">milestone →</a>` : ''}</div>
    <div class="panel-body">
      ${nowLine(stage)}
      ${stageBody(stage)}
    </div>
    ${canControl() ? `<div class="stage-foot">${controlInner()}</div>` : `<div class="stage-foot">${nextPanelCmds(S.next)}</div>`}
  </section>`;
}

function nextPanelCmds(n) {
  const chips = [];
  if (n.commands) chips.push(copyChip('Claude', n.commands.claude), copyChip('Codex', n.commands.codex));
  if (n.run) chips.push(copyChip('Terminal', n.run));
  return `<div class="cmds">${chips.join('')}${copyChip('Any agent', '/00-next')}</div>`;
}

// Overview: where the project is and what is being done or comes next, then context and history.
async function pageOverview() {
  const stage = currentStage();
  const att = attentionItems();
  const run = S.runs?.latest;
  const running = !!S.runs?.running;
  const ph = phases();
  const docsDone = DOCS.filter((d) => S.docs.find((x) => x.name === d.file && !x.empty)).length;

  const logPanel = run ? `<section class="panel ink span-12 fade-in">
      <div class="panel-head"><span class="label">${running ? 'Live run' : 'Last run'} · ${esc(run.id)} · ${esc(run.current || '')}</span>${run.workers.map((w) => `<span class="badge">slot ${esc(w.slot)} · ${esc(w.task)}</span>`).join('')}<a class="label" href="#/runs">all logs →</a></div>
      <pre class="term" id="term">${esc(run.tail || '(empty log)')}</pre>
    </section>` : '';

  return `
  <section class="hero hero-compact fade-in">
    <div class="label">Project overview</div>
    <h1 class="display">${esc(S.project)}</h1>
  </section>
  <div class="grid">
    <section class="panel span-12 fade-in" style="padding: var(--s-4)">${stageStepper(stage)}</section>
    ${stagePanel(stage)}
    ${running ? logPanel : ''}
    ${ph.length ? `<section class="panel span-12 fade-in">
      <div class="panel-head"><span class="label">Roadmap</span><a class="label" href="#/roadmap">all phases →</a></div>
      <div class="panel-body" style="padding-bottom: var(--s-2)">${track(true)}</div>
    </section>` : ''}
    <section class="panel span-5 fade-in">
      <div class="panel-head"><span class="label">Needs attention</span><span class="label">${att.length}</span></div>
      <div class="panel-body">${att.length ? `<div class="feed">${att.map((a) => `<div><span class="k"><span class="stamp st-${a.cls}" style="padding:1px 4px">${esc(a.k)}</span></span><span>${a.text}</span></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nothing needs you right now.</p>'}</div>
    </section>
    <section class="panel span-7 fade-in">
      <div class="panel-head"><span class="label">Activity</span><a class="label" href="#/progress">progress log →</a></div>
      <div class="panel-body">
        ${activity() ? `<div class="feed">${activity()}</div>` : '<p class="muted" style="margin:0 0 12px">No progress entries yet.</p>'}
        ${S.git?.log?.length ? `<div class="label" style="margin:18px 0 6px">Git · ${esc(S.git.branch)}</div><div class="feed">${S.git.log.slice(0, 8).map((c) => `<div><span class="k">${esc(c.hash)}</span><span>${esc(c.message)} <span class="muted">· ${esc(c.when)}</span></span></div>`).join('')}</div>` : ''}
      </div>
    </section>
    ${stage.id === 'spec' || stage.id === 'roadmap' ? '' : `<section class="panel span-12 fade-in">
      <div class="panel-head"><span class="label">Specification</span><span class="label">${docsDone}/5</span></div>
      <div class="panel-body"><div class="docs-list docs-row">
        ${DOCS.map((d) => {
          const info = S.docs.find((x) => x.name === d.file);
          const ok = info && !info.empty;
          return `<a class="doc-chip ${ok ? '' : 'missing'}" href="#/doc/${encodeURIComponent(d.file)}"><span class="n">${d.file.slice(0, 2)}</span><span class="t"><div>${esc(d.title)}</div><div class="label">${ok ? `${info.words} words` : `missing · ${d.skill}`}</div></span></a>`;
        }).join('')}
      </div></div>
    </section>`}
    ${featurePanel()}
    ${running ? '' : logPanel}
  </div>`;
}

async function pageRoadmap() {
  const ph = phases();
  if (!S.milestones.length) return emptyState('No roadmap yet', 'The roadmap appears after the specification is complete and the milestones are planned. Every phase will show what you can see at its end.', '07-planning-milestones');
  const groups = ph.map((p) => ({ ...p, ms: p.ids.map(milestone).filter(Boolean) }));
  const orphan = S.milestones.filter((m) => !ph.some((p) => p.ids.includes(m.id)));
  if (orphan.length) groups.push({ num: '+', name: 'Other milestones', see: '', status: 'planned', ms: orphan });
  return `
  <section class="hero fade-in"><div class="label">Roadmap</div><h1 class="display">How ${esc(S.project)} grows</h1></section>
  <section class="panel fade-in" style="padding: var(--s-5) var(--s-4) var(--s-3)">${track(false)}</section>
  ${groups.map((g) => `
    <div class="section-title fade-in"><span class="display" style="font-size:44px">${esc(g.num)}</span><h2>${inline(g.name)}</h2><span class="rule"></span><span class="stamp st-${g.status === 'active' ? 'active' : g.status}">${esc(g.status === 'active' ? 'in progress' : g.status === 'review' ? 'in review' : g.status)}</span></div>
    ${g.see ? `<p class="muted" style="margin:-6px 0 14px">${inline(g.see)}</p>` : ''}
    <section class="panel fade-in"><div class="panel-body rows">
      ${g.ms.map((m) => `
        <a class="row" href="#/m/${m.id}">
          <span class="display" style="font-size:34px;width:64px">${m.id}</span>
          <span class="t"><div class="title">${esc(m.name)}</div><div class="sub">${inline(field(m, 'What you will see')?.text || field(m, 'Goal')?.text || '')}</div>
            <div style="margin-top:10px;max-width:420px">${segments(m.tasks)}</div></span>
          ${stamp(m.status, MS)}
        </a>`).join('')}
    </div></section>`).join('')}
  ${S.coverage ? `<div class="section-title"><h2>Coverage</h2><span class="rule"></span></div><div class="prose" style="max-width:none">${tableHtml(['| ' + S.coverage.headers.join(' | ') + ' |', '|' + S.coverage.headers.map(() => '---').join('|') + '|', ...S.coverage.rows.map((r) => '| ' + r.join(' | ') + ' |')])}</div>` : ''}`;
}

function fieldBlock(m, name) {
  const f = field(m, name);
  if (!f) return '';
  const checklist = f.items.some((it) => it.checked !== null);
  return `<section class="panel field fade-in"><div class="panel-head"><span class="label">${esc(name)}</span></div><div class="panel-body">
    ${f.text ? `<p style="margin:0 0 ${f.items.length ? '10px' : '0'}">${inline(f.text)}</p>` : ''}
    ${f.items.length ? `<ul class="${checklist ? 'check' : ''}">${f.items.map((it) => `<li class="${it.checked ? 'ok' : ''}">${inline(it.text)}</li>`).join('')}</ul>` : ''}
  </div></section>`;
}

function taskCard(m, t) {
  const r = t.review;
  const w = workOn(t.num);
  return `<a class="card ${w ? 'working' : ''}" href="#/m/${m.id}/t/${t.num}">
    <div class="top"><span class="tnum">${t.num}</span>${stamp(eff(t))}</div>
    <div class="tname">${esc(t.name)}</div>
    <div class="tdesc">${inline(t.description)}</div>
    <div class="tmeta">
      ${w ? busy(w) : t.status === '~' ? '<span class="badge">awaiting review</span>' : ''}
      ${t.plan?.parallel ? `<span class="badge ${t.plan.parallel}">${t.plan.parallel}</span>` : t.files?.['implementation-plan'] ? '' : '<span class="badge">no plan</span>'}
      ${r?.rounds ? `<span class="badge">review ×${r.rounds}</span>` : ''}
      ${(t.plan?.deps || []).filter((d) => d !== t.num).slice(0, 4).map((d) => `<span class="badge">↳ ${d}</span>`).join('')}
    </div>
  </a>`;
}

// Task board of a milestone: pending, in progress (incl. tasks an agent is working on), done, blocked.
function taskBoard(m) {
  const cols = [['pending', ' ', 'Pending'], ['review', '~', 'In progress'], ['blocked', '!', 'Blocked'], ['done', 'x', 'Done']];
  return `<div class="board">${cols.map(([cls, s, title]) => {
    const list = (m.tasks || []).filter((t) => eff(t) === s);
    return `<div><div class="col-head ${cls}"><span class="label">${title}</span><span class="label">${list.length}</span></div><div class="col">${list.map((t) => taskCard(m, t)).join('') || '<div class="none">—</div>'}</div></div>`;
  }).join('')}</div>`;
}

async function pageMilestone(id, tab = 'overview') {
  const m = milestone(id);
  if (!m) return emptyState(`${id} not found`, 'This milestone is not in milestones.md.');
  const tasks = m.tasks || [];
  const tabs = [
    ['overview', 'Overview', ''],
    ['tasks', 'Tasks', tasks.length],
    ...(m.files?.report ? [['report', 'Milestone report', '']] : []),
    ...(m.files?.screenshots?.length ? [['screens', 'Screenshots', m.files.screenshots.length]] : []),
    ...(m.files?.summaries?.length ? [['runs', 'Run summaries', m.files.summaries.length]] : []),
  ];
  let body = '';
  if (tab === 'tasks') {
    body = tasks.length ? `<div style="margin-bottom:var(--s-5)">${segments(tasks)}${counts(m)}</div>${taskBoard(m)}` : emptyState('No tasks yet', 'Tasks are planned when this milestone becomes active.', '08-planning-tasks');
  } else if (tab === 'report') {
    body = `<div class="prose fade-in">${md(await file(m.files.report), dirOf(m.files.report))}</div>`;
  } else if (tab === 'screens') {
    body = `<div class="gallery">${m.files.screenshots.map((p) => `<a class="shot" href="/api/file?path=${encodeURIComponent(p)}" target="_blank"><img loading="lazy" src="/api/file?path=${encodeURIComponent(p)}" alt=""><div>${esc(p.split('/').pop())}</div></a>`).join('')}</div>`;
  } else if (tab === 'runs') {
    const first = m.files.summaries[0];
    body = `<div class="cmds" style="margin-bottom:var(--s-5)">${m.files.summaries.map((p) => `<span class="badge">${esc(p.split('/').pop())}</span>`).join('')}</div><div class="prose">${md(await file(first), dirOf(first))}</div>`;
  } else {
    const skip = new Set(['Phase', 'Type', 'What you will see', 'Goal', 'Depends on', 'Estimated size', 'Source']);
    const rest = m.order.filter((k) => !skip.has(k));
    body = `
      ${field(m, 'Goal') ? `<p style="font-size:17px;max-width:75ch;margin:0 0 var(--s-5)">${inline(field(m, 'Goal').text)}</p>` : ''}
      <div class="fields">${rest.map((k) => fieldBlock(m, k)).join('')}</div>`;
  }
  return `
  <div class="m-head fade-in">
    <div class="label">${esc(m.phase.label || 'Milestone')}</div>
    <div class="id">${m.id}</div>
    <h1>${esc(m.name)}</h1>
    <div class="meta">${stamp(m.status, MS)}${field(m, 'Type') ? `<span class="badge">${esc(field(m, 'Type').text)}</span>` : ''}${field(m, 'Estimated size') ? `<span class="badge">${esc(field(m, 'Estimated size').text)}</span>` : ''}${field(m, 'Depends on') ? `<span class="badge">depends on ${esc(field(m, 'Depends on').text)}</span>` : ''}${m.folder ? `<span class="badge">.speccraft/${esc(m.folder)}</span>` : ''}</div>
  </div>
  ${field(m, 'What you will see') ? `<div class="callout fade-in"><div class="label">What you will see</div><p>${inline(field(m, 'What you will see').text)}</p></div>` : ''}
  <nav class="tabs">${tabs.map(([k, label, n]) => `<a href="#/m/${m.id}/${k}" class="${tab === k ? 'on' : ''}">${label}${n !== '' ? `<span class="n">${n}</span>` : ''}</a>`).join('')}</nav>
  ${body}`;
}

async function pageTask(id, num, tab) {
  const m = milestone(id);
  const t = m?.tasks?.find((x) => x.num === num);
  if (!t) return emptyState(`Task ${num} not found`, 'It is not listed in this milestone\'s tasks.md.');
  const order = [['implementation-plan', 'Plan'], ['report', 'Report'], ['review', 'Review'], ['blocker', 'Blocker']].filter(([k]) => t.files[k]);
  const current = tab || (t.status === '!' && t.files.blocker ? 'blocker' : order[0]?.[0]);
  const path = t.files[current];
  return `
  <div class="m-head fade-in">
    <div class="label"><a href="#/m/${m.id}/tasks">${m.id} · ${esc(m.name)}</a></div>
    <div class="id mono" style="font-family:var(--f-mono);font-size:48px">${t.num}</div>
    <h1>${esc(t.name)}</h1>
    <div class="meta">${stamp(eff(t))}${workOn(t.num) ? busy(workOn(t.num)) + since(workOn(t.num).since) : t.status === '~' ? '<span class="badge">awaiting review</span>' : ''}
      ${t.plan?.parallel ? `<span class="badge ${t.plan.parallel}" title="${esc(t.plan.parallelNote || '')}">parallel: ${t.plan.parallel}</span>` : ''}
      ${t.plan?.type ? `<span class="badge">${esc(t.plan.type)}</span>` : ''}
      ${t.review?.rounds ? `<span class="badge">review ×${t.review.rounds} · ${esc(t.review.verdict || '')}</span>` : ''}
      ${(t.plan?.deps || []).filter((d) => d !== t.num).map((d) => { const dt = allTasks().find((x) => x.num === d); return dt ? `<a class="badge" href="#/m/${dt.milestone}/t/${d}">↳ ${d}</a>` : `<span class="badge">↳ ${d}</span>`; }).join('')}
      ${t.folder ? `<span class="badge">task/${esc(t.folder.split('/').pop())}</span>` : ''}
    </div>
  </div>
  <p style="font-size:16px;max-width:75ch;color:var(--ink-2)">${inline(t.description)}</p>
  ${order.length ? `<nav class="tabs">${order.map(([k, label]) => `<a href="#/m/${m.id}/t/${t.num}/${k}" class="${current === k ? 'on' : ''}">${label}</a>`).join('')}</nav>
  <div class="doc-layout"><article class="prose fade-in">${md(await file(path), dirOf(path))}</article>${tocHtml()}</div>`
    : emptyState('No implementation plan yet', 'Plans are written for all pending tasks of the active milestone.', '09-planning-task-details')}`;
}

function tocHtml() {
  if (TOC.length < 3) return '<aside></aside>';
  return `<aside class="toc"><div class="label">On this page</div>${TOC.map((h) => `<a class="l${h.level}" href="javascript:void(0)" data-jump="${h.id}">${inline(h.text)}</a>`).join('')}</aside>`;
}

async function pageDoc(name) {
  const info = S.docs.find((d) => d.name === name);
  const known = DOCS.find((d) => d.file === name);
  if (!info || info.empty) return emptyState(`${known?.title || name} is not written yet`, `This document is created by <span class="mono">${esc(known?.skill || 'a planning skill')}</span>.`, known?.skill);
  const text = await file(info.path);
  return `<div class="label fade-in" style="margin:var(--s-2) 0 var(--s-5)">.speccraft/${esc(info.path)} · ${info.words} words · updated ${new Date(info.mtime).toLocaleString()}</div>
    <div class="doc-layout"><article class="prose fade-in">${md(text, 'docs')}</article>${tocHtml()}</div>`;
}

async function pageAutopilot() {
  const ap = S.autopilot;
  const cmd = '.agents/skills/00-next/scripts/autopilot.sh';
  if (!ap?.exists) return emptyState('No autopilot settings', 'Create .speccraft/autopilot.md by running the installer again, or start the autopilot once: it creates the file.') + `<div class="cmds" style="margin-top:16px">${copyChip('Terminal', `${cmd} "<your idea>"`)}</div>`;
  const text = await file('autopilot.md');
  const state = S.runs?.autopilot ? `<span class="live run"><i></i><span>running · ${esc(S.runs.autopilot)}</span></span>` : '<span>idle</span>';
  return `<section class="hero fade-in"><div class="label">.speccraft/autopilot.md</div><h1 class="display">Autopilot</h1>
    <div class="hero-meta">${state}<span>stop at <b>${esc(ap.stopAt)}</b></span><span>roast <b>${ap.roastDone}</b> / ${ap.roastRounds}${ap.roastConverged ? ' · converged' : ''}</span><span><b>${ap.decisions.length}</b> decision(s) to review</span></div>
    <div class="cmds" style="margin-top:var(--s-4)">${copyChip('Continue', cmd)}${copyChip('Status', `${cmd} --dry-run`)}${copyChip('Spec only', `${cmd} --stop-at spec`)}${copyChip('In a session', '/00-next autopilot full')}</div></section>
    ${canControl() && !S.docs.some((d) => d.name === '01-Idea.md' && !d.empty) ? `<section class="panel fade-in" style="margin-bottom:var(--s-5)"><div class="panel-head"><span class="label">Brief</span></div><div class="panel-body act-form">${draftBox('brief', 'Describe the product in a few sentences.', 5)}<div class="act-row"><button class="btn" data-act="brief">Save the brief</button></div></div></section>` : ''}
    <div class="doc-layout"><article class="prose fade-in">${md(text.replace(/<!--[\s\S]*?-->/g, '').replace(/^# .*\n/, ''), '')}</article>${tocHtml()}</div>`;
}

async function pageProgress() {
  if (S.progress.empty) return emptyState('No progress yet', 'The project memory is written by 10-execution-tasks after the first task: commands, structure, conventions, decisions and a log of everything delivered.');
  const text = await file('progress.md');
  return `<div class="doc-layout" style="margin-top:var(--s-4)"><article class="prose fade-in">${md(text, '')}</article>${tocHtml()}</div>`;
}

async function pageRuns(logName) {
  const r = S.runs;
  if (!r?.latest) return emptyState('No autonomous runs yet', 'Start one with the run script once a milestone is planned. Its logs appear here live.', null) + `<div class="cmds" style="margin-top:16px">${copyChip('Terminal', '.agents/skills/10-execution-tasks/scripts/run-milestone.sh')}${copyChip('Terminal', '.agents/skills/10-execution-tasks/scripts/run-milestone.sh --parallel 3')}${copyChip('Autopilot', '.agents/skills/00-next/scripts/autopilot.sh')}</div>`;
  const L = r.latest;
  const name = logName || L.current;
  const text = name ? await file(`.runs/${L.id}/${name}`) : '';
  return `
  <section class="hero fade-in"><div class="label">${r.running ? 'Run in progress' : 'Last run'}</div><h1 class="display">${esc(L.id)}</h1>
    <div class="hero-meta">${r.running ? '<span class="live run"><i></i><span>running</span></span>' : '<span>finished</span>'}${L.workers.map((w) => `<span>slot <b>${esc(w.slot)}</b> → task <b>${esc(w.task)}</b></span>`).join('')}</div></section>
  ${r.stop ? `<div class="callout" style="border-color:var(--vermilion);background:var(--vermilion-wash);margin-bottom:var(--s-5)"><div class="label" style="color:var(--vermilion)">Stop reason</div><p>${esc(r.stop)}</p></div>` : ''}
  <div class="grid">
    <section class="panel span-4"><div class="panel-head"><span class="label">Logs</span></div><div class="panel-body rows">
      ${L.logs.map((l) => `<a class="row" href="#/runs/${encodeURIComponent(l.name)}" style="grid-template-columns:1fr auto"><span class="t mono" style="font-size:13px;${l.name === name ? 'color:var(--cobalt);font-weight:600' : ''}">${esc(l.name)}</span><span class="label">${Math.max(1, Math.round(l.size / 1024))} KB</span></a>`).join('')}
    </div></section>
    <section class="panel ink span-8"><div class="panel-head"><span class="label">${esc(name || '')}</span></div><pre class="term" id="term" style="max-height:70vh">${esc(text || '(empty)')}</pre></section>
  </div>`;
}

async function pageMockups() {
  if (!S.mockups.length) return emptyState('No mockups', 'Drop wireframes, screenshots, sketches or brand assets into .speccraft/mockup/. Every planning skill reads them.');
  const imgs = S.mockups.filter((m) => m.image);
  const other = S.mockups.filter((m) => !m.image);
  return `<section class="hero fade-in"><div class="label">.speccraft/mockup</div><h1 class="display">Mockups</h1></section>
  <div class="gallery">${imgs.map((m) => `<a class="shot" href="/api/file?path=${encodeURIComponent(m.path)}" target="_blank"><img loading="lazy" src="/api/file?path=${encodeURIComponent(m.path)}" alt=""><div>${esc(m.name)}</div></a>`).join('')}</div>
  ${other.length ? `<div class="section-title"><h2>Other files</h2><span class="rule"></span></div><div class="rows">${other.map((m) => `<a class="row" style="grid-template-columns:1fr auto" href="/api/file?path=${encodeURIComponent(m.path)}" target="_blank"><span class="mono">${esc(m.name)}</span><span class="label">open →</span></a>`).join('')}</div>` : ''}`;
}

// ------------------------------------------------------------------ router

function crumbs(parts) {
  const c = ['<a href="#/">overview</a>'];
  if (parts[0] === 'm' && parts[1]) {
    c.push(`<a href="#/roadmap">roadmap</a>`, `<a href="#/m/${parts[1]}">${esc(parts[1])}</a>`);
    if (parts[2] === 't') c.push(`<a href="#/m/${parts[1]}/tasks">tasks</a>`, `<span>${esc(parts[3])}</span>`);
  } else if (parts[0] === 'doc') c.push('<span>specification</span>', `<span>${esc(parts[1])}</span>`);
  else if (parts[0]) c.push(`<span>${esc(parts[0])}</span>`);
  return c.join('<span class="sep">/</span>');
}

// Patch `el` to match `html`, touching only the nodes that changed.
const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function morph(el, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  patchChildren(el, t.content);
}
function patchChildren(a, b) {
  const an = [...a.childNodes];
  const bn = [...b.childNodes];
  bn.forEach((y, i) => {
    if (an[i]) { patchNode(an[i], y); return; }
    a.appendChild(y);
    if (y.nodeType === 1 && morph.live && !REDUCED()) y.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
  for (let i = an.length - 1; i >= bn.length; i--) an[i].remove();
}
function patchNode(x, y) {
  if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { x.replaceWith(y); return; }
  if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
  if (x.isEqualNode(y)) return;
  if (x.hasAttribute('data-preserve') && x.getAttribute('data-preserve') === y.getAttribute('data-preserve')) return;
  for (const { name } of [...x.attributes]) if (!y.hasAttribute(name)) x.removeAttribute(name);
  for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value) x.setAttribute(name, value);
  patchChildren(x, y);
}

async function render(keepScroll = false) {
  if (!S) return;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const y = window.scrollY;
  let html;
  try {
    if (!parts.length) html = await pageOverview();
    else if (parts[0] === 'roadmap') html = await pageRoadmap();
    else if (parts[0] === 'm' && parts[2] === 't') html = await pageTask(parts[1], parts[3], parts[4]);
    else if (parts[0] === 'm') html = await pageMilestone(parts[1], parts[2]);
    else if (parts[0] === 'doc') html = await pageDoc(parts[1]);
    else if (parts[0] === 'progress') html = await pageProgress();
    else if (parts[0] === 'autopilot') html = await pageAutopilot();
    else if (parts[0] === 'runs') html = await pageRuns(parts[1]);
    else if (parts[0] === 'mockups') html = await pageMockups();
    else html = emptyState('Not found', 'This page does not exist.');
  } catch (err) {
    html = `<pre class="term" style="color:var(--vermilion)">${esc(err.stack || err)}</pre>`;
  }
  if (S && !S.server) html = `<div class="update-banner"><b>SpecCraft Board was updated, but this board server is still the old one.</b> Restart it once: press Ctrl+C in its terminal and run <span class="mono">speccraft board</span> (or <span class="mono">.speccraft/board</span>). From then on it restarts by itself after updates.</div>${html}`;
  liveChrome();
  if (keepScroll) {
    // live update of the same page
    const term = $('#term');
    const follow = !term || term.scrollHeight - term.scrollTop - term.clientHeight < 40;
    morph($('#sidebar'), sidebar(parts));
    morph($('#crumbs'), crumbs(parts));
    morph($('#topLive'), topLive());
    $('.topbar').classList.toggle('running', !!S.runs?.running);
    morph.live = true;
    morph($('#page'), html);
    morph.live = false;
    const t2 = $('#term');
    if (t2 && follow) t2.scrollTop = t2.scrollHeight;
    if (window.scrollY !== y) window.scrollTo(0, y);
    return;
  }
  $('#sidebar').innerHTML = sidebar(parts);
  $('#crumbs').innerHTML = crumbs(parts);
  $('#topLive').innerHTML = topLive();
  $('.topbar').classList.toggle('running', !!S.runs?.running);
  $('#page').innerHTML = html;
  const term = $('#term');
  if (term) term.scrollTop = term.scrollHeight;
  window.scrollTo(0, 0);
  $('#app').classList.remove('menu-open');
}

async function refresh(keepScroll = false) {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    const next = await res.json();
    const sig = JSON.stringify({ ...next, generatedAt: 0 });
    lastUpdate = Date.now();
    beat();
    if (keepScroll && sig === refresh.sig) return;
    refresh.sig = sig;
    if (S?.server && next.server && S.server.started !== next.server.started) { location.reload(); return; }
    const before = S ? snapshot(S) : null;
    S = next;
    files.clear();
    await render(keepScroll);
    if (before) announce(before, snapshot(S));
  } catch {
    $('#updated').textContent = 'offline';
  }
}

// ------------------------------------------------------------------ events

document.addEventListener('click', async (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); } catch { /* ignore */ }
    copy.classList.add('copied');
    toast(`copied: ${copy.dataset.copy}`);
    setTimeout(() => copy.classList.remove('copied'), 1200);
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act) { e.preventDefault(); onAction(act); return; }
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    document.getElementById(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
document.addEventListener('input', (e) => { const k = e.target.dataset?.draft; if (k) drafts[k] = e.target.value; });
document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-set]');
  if (!el) return;
  try { await api('/api/settings', { [el.dataset.set]: el.value }); toast(`${el.dataset.set}: ${el.value}`); } catch (err) { toast(err.message, true); }
  refresh(true);
});
async function onAction(el) {
  const a = el.dataset.act;
  const kindLabel = { next: 'next step', autopilot: 'autopilot', accept: 'acceptance', changes: 'rework planning', feature: 'feature planning' };
  const go = async (kind, extra = {}) => { await api('/api/run', { kind, ...extra }); toast(`started: ${kindLabel[kind]}`); };
  el.disabled = true;
  try {
    if (a === 'mode') await api('/api/settings', { mode: el.dataset.mode });
    else if (a === 'clear-activity') { await api('/api/activity/clear'); toast('session status cleared'); }
    else if (a === 'run') await go(el.dataset.kind);
    else if (a === 'stop') {
      if (!confirm('Stop the running agents? Finished work stays committed; unfinished work is kept on its task branch.')) return;
      await api('/api/stop'); toast('stopping…');
    } else if (a === 'brief' || a === 'brief-run') {
      await api('/api/brief', { text: drafts.brief || '' });
      drafts.brief = '';
      toast('idea saved');
      if (a === 'brief-run') await go(S.control.settings.mode === 'full' ? 'autopilot' : 'next');
    } else if (a === 'accept') {
      if (!confirm(`Accept ${el.dataset.m}? It is marked accepted, its spec changes are applied and it is merged into the base branch.`)) return;
      await go('accept', { milestone: el.dataset.m });
    } else if (a === 'changes' || a === 'feature') {
      await go(a, { text: drafts[a] || '' });
      drafts[a] = '';
    }
  } catch (err) {
    toast(err.message, true);
  } finally {
    el.disabled = false;
    refresh(true);
  }
}
// ------------------------------------------------------------------ life

// The window title, the favicon and the logo follow what the agents do.
function liveChrome() {
  const r = S.runs || {};
  const waiting = !r.running && r.session?.state === 'waiting';
  const app = $('#app');
  app.classList.toggle('is-running', !!r.running);
  app.classList.toggle('is-waiting', waiting);
  const what = r.running ? workItems()[0]?.title : waiting ? `Waiting for you · ${sessionTitle(r.session)}` : '';
  document.title = `${r.running ? '● ' : waiting ? '◐ ' : ''}${what ? `${what} — ` : ''}${S.project} · SpecCraft Board`;
  favicon.mode(r.running ? 'run' : waiting ? 'wait' : 'idle');
  if (typeof chatOnState === 'function') chatOnState();
}

// The 3x3 mark as favicon; while agents work a cobalt cell runs along the snake path of the logo.
const favicon = (() => {
  const SNAKE = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  const INK = '#ece7db';
  const COBALT = '#7d97ff';
  const AMBER = '#e4b44a';
  let mode = null;
  let timer = null;
  let step = 0;
  const cell = (i, fill, hollow) => {
    const x = (i % 3) * 8;
    const y = Math.floor(i / 3) * 8;
    return hollow ? `<rect x='${x + 0.75}' y='${y + 0.75}' width='5.5' height='5.5' fill='none' stroke='${INK}' stroke-width='1.5'/>` : `<rect x='${x}' y='${y}' width='7' height='7' fill='${fill}'/>`;
  };
  const draw = (cells) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 23 23'>${cells.join('')}</svg>`;
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };
  const still = (center) => draw([...Array(9)].map((_, i) => (i === 4 ? cell(i, center) : i === 2 || i === 6 ? cell(i, '', true) : cell(i, INK))));
  const frame = () => {
    const head = SNAKE[step % 9];
    const tail = SNAKE[(step + 8) % 9];
    draw([...Array(9)].map((_, i) => cell(i, i === head ? COBALT : i === tail ? '#4a5a99' : INK)));
    step++;
  };
  return {
    mode(next) {
      if (next === mode) return;
      mode = next;
      clearInterval(timer);
      timer = null;
      if (next === 'run' && !REDUCED()) { timer = setInterval(frame, 160); frame(); }
      else still(next === 'wait' ? AMBER : COBALT);
    },
  };
})();

// A short pulse of the top bar's "updated" label on every refresh.
function beat() {
  const el = $('#updated');
  if (el && !REDUCED()) el.animate([{ color: 'var(--cobalt)' }, { color: 'var(--ink-3)' }], { duration: 900, easing: 'ease-out' });
}

// What changed between two refreshes: tasks, milestones and documents.
function snapshot(st) {
  const tasks = {};
  for (const m of st.milestones || []) for (const t of m.tasks || []) tasks[t.num] = { status: t.status, name: t.name, m: m.id };
  return {
    tasks,
    milestones: Object.fromEntries((st.milestones || []).map((m) => [m.id, { status: m.status, name: m.name }])),
    docs: new Set((st.docs || []).filter((d) => !d.empty).map((d) => d.name)),
  };
}

function announce(a, b) {
  const notes = [];
  const flash = [];
  for (const [num, t] of Object.entries(b.tasks)) {
    const was = a.tasks[num]?.status;
    if (was === undefined || was === t.status) continue;
    flash.push(num);
    if (t.status === 'x') notes.push(`✓ ${num} ${t.name} — approved and merged`);
    else if (t.status === '~') notes.push(`${num} ${t.name} — ready for independent review`);
    else if (t.status === '!') notes.push(`! ${num} ${t.name} — blocked`);
    else if (was === '~') notes.push(`${num} ${t.name} — sent back for changes`);
  }
  for (const [id, m] of Object.entries(b.milestones)) {
    const was = a.milestones[id]?.status;
    if (was === undefined || was === m.status) continue;
    if (m.status === '>') notes.push(`▶ ${id} ${m.name} — started`);
    else if (m.status === '?') notes.push(`${id} ${m.name} — built, waiting for your review`);
    else if (m.status === 'x') notes.push(`✓ ${id} ${m.name} — accepted`);
  }
  if (!Object.keys(a.milestones).length && Object.keys(b.milestones).length) notes.push('Roadmap planned');
  for (const d of b.docs) if (!a.docs.has(d)) notes.push(`${DOCS.find((x) => x.file === d)?.title || d} written`);
  for (const n of notes.slice(0, 4)) notice(n);
  if (REDUCED()) return;
  for (const num of flash) {
    for (const el of document.querySelectorAll(`a.card[href$="/t/${num}"], .step-num`)) {
      if (el.classList.contains('step-num') && el.textContent.trim() !== num) continue;
      (el.closest('.step') || el).animate([
        { boxShadow: '0 0 0 2px var(--cobalt)', background: 'var(--cobalt-wash)' },
        { boxShadow: '0 0 0 0 transparent' },
      ], { duration: 1800, easing: 'ease-out' });
    }
  }
}

// Change notices queue up so none is lost when several arrive at once.
const notices = [];
function notice(msg) {
  notices.push(msg);
  if (notices.length === 1) showNotice();
}
function showNotice() {
  if (!notices.length) return;
  toast(notices[0]);
  setTimeout(() => { notices.shift(); showNotice(); }, 2600);
}

let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on'); t.classList.toggle('err', error);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), error ? 5000 : 2400);
}

// The menu button opens the drawer on phones and collapses the sidebar to a rail on wider screens.
const narrow = () => matchMedia('(max-width: 760px)').matches;
function toggleSidebar() {
  if (narrow()) { $('#app').classList.toggle('menu-open'); return; }
  const collapsed = $('#app').classList.toggle('side-collapsed');
  try { localStorage.setItem('speccraft-sidebar', collapsed ? 'collapsed' : 'open'); } catch { /* ignore */ }
}
$('#menuBtn').addEventListener('click', toggleSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  e.preventDefault();
  toggleSidebar();
});
try { if (localStorage.getItem('speccraft-sidebar') === 'collapsed') $('#app').classList.add('side-collapsed'); } catch { /* ignore */ }

window.addEventListener('hashchange', () => render(false));

function connect() {
  const es = new EventSource('/events');
  // the board was updated: new page files or a restarted server (with a new token)
  es.addEventListener('reload', () => setTimeout(() => location.reload(), 400));
  es.onmessage = () => refresh(true);
  es.onerror = () => { $('#topLive').innerHTML = '<span class="live" id="liveDot"><i></i><span>reconnecting</span></span>'; };
}
setInterval(() => {
  if (!lastUpdate) return;
  const s = Math.round((Date.now() - lastUpdate) / 1000);
  $('#updated').textContent = s < 5 ? 'updated just now' : `updated ${s < 60 ? s + 's' : Math.round(s / 60) + 'm'} ago`;
  for (const el of document.querySelectorAll('[data-since]')) el.textContent = ago(Number(el.dataset.since));
}, 1000);
// ?static disables live updates (for printing or screenshots).
const LIVE = !new URLSearchParams(location.search).has('static');
if (LIVE) setInterval(() => refresh(true), 15000);

refresh().then(() => { if (LIVE) connect(); });
