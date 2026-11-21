/* SpecCraft Board — client. Reads /api/state, renders the .speccraft workspace, live-reloads on change. */
'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let S = null;
let lastUpdate = 0;
const files = new Map();

const TASK = {
  ' ': { cls: 'pending', label: 'pending', mark: '[ ]' },
  '~': { cls: 'review', label: 'in review', mark: '[~]' },
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
  return `<div class="segments">${tasks.map((t) => `<i class="${TASK[t.status]?.cls || 'pending'}" title="${esc(t.num)} ${esc(t.name)}"></i>`).join('')}</div>`;
}
function counts(m) {
  const c = m.counts || { done: 0, review: 0, blocked: 0, pending: 0 };
  return `<div class="counts"><span class="c-done">${c.done} done</span><span class="c-review">${c.review} in review</span><span class="c-blocked">${c.blocked} blocked</span><span class="c-pending">${c.pending} pending</span></div>`;
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
  const running = S.runs?.running;
  return `
    <a class="brand" href="#/"><span class="mark">${'<i></i>'.repeat(9)}</span><span class="brand-name">SpecCraft <span>Board</span></span></a>
    <div class="project-chip"><div class="label">Project</div><div class="name">${esc(S.project)}</div></div>
    <nav class="nav">
      <div class="nav-group">
        <div class="label">Workspace</div>
        <a href="#/" class="${at('#/') || at('')}"><span class="num">◎</span><span class="grow">Overview</span></a>
        <a href="#/roadmap" class="${startsAt('#/roadmap')}"><span class="num">━</span><span class="grow">Roadmap</span></a>
        <a href="#/progress" class="${startsAt('#/progress')}"><span class="num">≡</span><span class="grow">Progress log</span></a>
        <a href="#/runs" class="${startsAt('#/runs')}"><span class="num">▷</span><span class="grow">Runs</span>${running ? '<span class="live run"><i></i></span>' : ''}</a>
        <a href="#/mockups" class="${startsAt('#/mockups')}"><span class="num">▢</span><span class="grow">Mockups</span><span class="label">${S.mockups.length || ''}</span></a>
      </div>
      <div class="nav-group">
        <div class="label"><span>Milestones</span><span>${S.milestones.filter((m) => m.status === 'x').length}/${S.milestones.length}</span></div>
        ${S.milestones.length ? S.milestones.map((m) => `<a href="#/m/${m.id}" class="${startsAt('#/m/' + m.id)}" title="${esc(m.name)}"><span class="num">${m.id}</span><span class="grow">${esc(m.name)}</span><span class="stamp st-${MS[m.status].cls}" style="padding:2px 4px">${esc(MS[m.status].mark)}</span></a>`).join('') : '<a href="#/roadmap" class="empty"><span class="num">—</span><span class="grow">not planned yet</span></a>'}
      </div>
      <div class="nav-group">
        <div class="label">Specification</div>
        ${docsAll.map((d) => {
          const empty = !d.info || d.info.empty;
          const n = d.file.match(/^(\d+)/);
          return `<a href="#/doc/${encodeURIComponent(d.file)}" class="${startsAt('#/doc/' + encodeURIComponent(d.file))} ${empty ? 'empty' : ''}"><span class="num">${n ? n[1] : '·'}</span><span class="grow">${esc(d.title)}</span></a>`;
        }).join('')}
      </div>
    </nav>
    <div class="sidebar-foot">
      <span class="live ${running ? 'run' : 'on'}" id="liveDot"><i></i><span>${running ? 'run in progress' : 'live'}</span></span>
      ${S.git ? `<span class="label" title="git branch">⎇ ${esc(S.git.branch)}${S.git.dirty ? ` · ${S.git.dirty} changed` : ''}</span>` : '<span class="label">no git repository</span>'}
    </div>`;
}

// ------------------------------------------------------------------ pages

function nextPanel(n) {
  const sym = { skill: '→', gate: '!', done: '✓', running: '●' }[n.kind] || '→';
  const label = { skill: 'Next step', gate: 'Needs you', done: 'Complete', running: 'Running' }[n.kind] || 'Next';
  const chips = [];
  if (n.commands) chips.push(copyChip('Claude', n.commands.claude), copyChip('Codex', n.commands.codex), copyChip('Antigravity', n.commands.antigravity));
  if (n.run) chips.push(copyChip('Terminal', n.run));
  return `<section class="panel span-12 fade-in">
    <div class="panel-head"><span class="label">${label}</span>${n.skill ? `<span class="badge">${esc(n.skill)}</span>` : ''}</div>
    <div class="next ${n.kind}">
      <div class="next-kind">${sym}</div>
      <div>
        <h3>${n.link ? `<a href="${n.link}">${esc(n.title)}</a>` : esc(n.title)}</h3>
        <p>${inline(n.detail || '')}</p>
        <div class="cmds">${chips.join('')}${copyChip('Any agent', '/00-next')}</div>
      </div>
    </div>
  </section>`;
}

function attentionItems() {
  const items = [];
  const rev = S.milestones.find((m) => m.status === '?');
  if (rev) items.push({ k: rev.id, text: `<a href="#/m/${rev.id}/report">Milestone awaiting your review</a>`, cls: 'review' });
  for (const t of allTasks().filter((t) => t.status === '!')) items.push({ k: t.num, text: `<a href="#/m/${t.milestone}/t/${t.num}/blocker">Blocked: ${esc(t.name)}</a>`, cls: 'blocked' });
  for (const t of allTasks().filter((t) => t.status === '~')) items.push({ k: t.num, text: `<a href="#/m/${t.milestone}/t/${t.num}">In review: ${esc(t.name)}</a>`, cls: 'review' });
  if (S.runs?.stop) items.push({ k: 'STOP', text: esc(S.runs.stop), cls: 'blocked' });
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

async function pageOverview() {
  const ph = phases();
  const act = activeMilestone();
  const cur = ph.find((p) => p.status === 'active' || p.status === 'review');
  const tasks = allTasks();
  const att = attentionItems();
  const run = S.runs?.latest;
  const docsDone = DOCS.filter((d) => S.docs.find((x) => x.name === d.file && !x.empty)).length;

  return `
  <section class="hero fade-in">
    <div class="label">Project overview</div>
    <h1 class="display">${esc(S.project)}</h1>
    <div class="hero-meta">
      <span>Phase <b>${cur ? esc(`${cur.num} ${cur.name}`) : ph.length && ph.every((p) => p.status === 'done') ? 'all done' : '—'}</b></span>
      <span><b>${ph.filter((p) => p.status === 'done').length}/${ph.length || 0}</b> phases done</span>
      <span><b>${tasks.filter((t) => t.status === 'x').length}/${tasks.length}</b> tasks merged</span>
      <span><b>${docsDone}/5</b> spec documents</span>
    </div>
  </section>
  ${ph.length ? `<section class="panel fade-in" style="padding: var(--s-4) var(--s-4) var(--s-2); margin-bottom: var(--s-5)">${track(true)}</section>` : ''}
  <div class="grid">
    ${nextPanel(S.next)}
    <section class="panel span-7 fade-in">
      <div class="panel-head"><span class="label">Now</span>${act ? stamp(act.status, MS) : ''}</div>
      <div class="panel-body">
        ${act ? `
          <div class="label">${esc(act.phase.label || '')}</div>
          <h3 style="margin:4px 0 10px;font:600 20px/1.25 var(--f-sans)"><a href="#/m/${act.id}"><span class="mono" style="color:var(--ink-3)">${act.id}</span> ${esc(act.name)}</a></h3>
          ${field(act, 'What you will see') ? `<div class="callout" style="margin-bottom:var(--s-4)"><div class="label">What you will see</div><p>${inline(field(act, 'What you will see').text)}</p></div>` : ''}
          ${segments(act.tasks)}${counts(act)}
        ` : `<p class="muted" style="margin:0">No milestone in progress. ${S.milestones.length ? 'The next one starts when its tasks are planned.' : 'The roadmap has not been planned yet.'}</p>`}
      </div>
    </section>
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
    <section class="panel span-5 fade-in">
      <div class="panel-head"><span class="label">Specification</span><span class="label">${docsDone}/5</span></div>
      <div class="panel-body"><div class="docs-list">
        ${DOCS.map((d) => {
          const info = S.docs.find((x) => x.name === d.file);
          const ok = info && !info.empty;
          return `<a class="doc-chip ${ok ? '' : 'missing'}" href="#/doc/${encodeURIComponent(d.file)}"><span class="n">${d.file.slice(0, 2)}</span><span class="t"><div>${esc(d.title)}</div><div class="label">${ok ? `${info.words} words` : `missing · ${d.skill}`}</div></span>${ok ? stamp('x') : ''}</a>`;
        }).join('')}
        ${S.docs.filter((x) => !DOCS.some((d) => d.file === x.name)).map((x) => `<a class="doc-chip" href="#/doc/${encodeURIComponent(x.name)}"><span class="n">${esc(x.name.slice(0, 2))}</span><span class="t"><div>${esc(x.title)}</div><div class="label">${esc(x.name)}</div></span></a>`).join('')}
      </div></div>
    </section>
    ${run ? `<section class="panel ink span-12 fade-in">
      <div class="panel-head"><span class="label">${S.runs.running ? 'Live run' : 'Last run'} · ${esc(run.id)} · ${esc(run.current || '')}</span>${run.workers.map((w) => `<span class="badge">slot ${esc(w.slot)} · ${esc(w.task)}</span>`).join('')}<a class="label" href="#/runs">all logs →</a></div>
      <pre class="term" id="term">${esc(run.tail || '(empty log)')}</pre>
    </section>` : ''}
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
  return `<a class="card" href="#/m/${m.id}/t/${t.num}">
    <div class="top"><span class="tnum">${t.num}</span>${stamp(t.status)}</div>
    <div class="tname">${esc(t.name)}</div>
    <div class="tdesc">${inline(t.description)}</div>
    <div class="tmeta">
      ${t.plan?.parallel ? `<span class="badge ${t.plan.parallel}">${t.plan.parallel}</span>` : t.files?.['implementation-plan'] ? '' : '<span class="badge">no plan</span>'}
      ${r?.rounds ? `<span class="badge">review ×${r.rounds}</span>` : ''}
      ${(t.plan?.deps || []).filter((d) => d !== t.num).slice(0, 4).map((d) => `<span class="badge">↳ ${d}</span>`).join('')}
    </div>
  </a>`;
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
    const cols = [['pending', ' ', 'Pending'], ['review', '~', 'In review'], ['done', 'x', 'Done'], ['blocked', '!', 'Blocked']];
    body = tasks.length ? `<div style="margin-bottom:var(--s-5)">${segments(tasks)}${counts(m)}</div><div class="board">${cols.map(([cls, s, title]) => {
      const list = tasks.filter((t) => t.status === s);
      return `<div><div class="col-head ${cls}"><span class="label">${title}</span><span class="label">${list.length}</span></div><div class="col">${list.map((t) => taskCard(m, t)).join('') || '<div class="none">—</div>'}</div></div>`;
    }).join('')}</div>` : emptyState('No tasks yet', 'Tasks are planned when this milestone becomes active.', '08-planning-tasks');
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
    <div class="meta">${stamp(t.status)}
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

async function pageProgress() {
  if (S.progress.empty) return emptyState('No progress yet', 'The project memory is written by 10-execution-initial after the first task: commands, structure, conventions, decisions and a log of everything delivered.');
  const text = await file('progress.md');
  return `<div class="doc-layout" style="margin-top:var(--s-4)"><article class="prose fade-in">${md(text, '')}</article>${tocHtml()}</div>`;
}

async function pageRuns(logName) {
  const r = S.runs;
  if (!r?.latest) return emptyState('No autonomous runs yet', 'Start one with the run script once a milestone is planned. Its logs appear here live.', null) + `<div class="cmds" style="margin-top:16px">${copyChip('Terminal', '.agents/skills/10-execution-initial/scripts/run-milestone.sh')}${copyChip('Terminal', '.agents/skills/10-execution-initial/scripts/run-milestone.sh --parallel 3')}</div>`;
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
    else if (parts[0] === 'runs') html = await pageRuns(parts[1]);
    else if (parts[0] === 'mockups') html = await pageMockups();
    else html = emptyState('Not found', 'This page does not exist.');
  } catch (err) {
    html = `<pre class="term" style="color:var(--vermilion)">${esc(err.stack || err)}</pre>`;
  }
  $('#sidebar').innerHTML = sidebar(parts);
  $('#crumbs').innerHTML = crumbs(parts);
  $('#page').innerHTML = html;
  const term = $('#term');
  if (term) term.scrollTop = term.scrollHeight;
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  $('#app').classList.remove('menu-open');
}

async function refresh(keepScroll = false) {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    const next = await res.json();
    const sig = JSON.stringify({ ...next, generatedAt: 0 });
    lastUpdate = Date.now();
    if (keepScroll && sig === refresh.sig) return;
    refresh.sig = sig;
    S = next;
    files.clear();
    await render(keepScroll);
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
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    document.getElementById(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
}

$('#menuBtn').addEventListener('click', () => $('#app').classList.toggle('menu-open'));
$('#themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('speccraft-theme', document.documentElement.dataset.theme); } catch { /* ignore */ }
});
try { const th = localStorage.getItem('speccraft-theme'); if (th) document.documentElement.dataset.theme = th; } catch { /* ignore */ }

window.addEventListener('hashchange', () => render(false));

function connect() {
  const es = new EventSource('/events');
  es.onmessage = () => refresh(true);
  es.onerror = () => { const d = $('#liveDot'); if (d) { d.className = 'live'; d.querySelector('span').textContent = 'reconnecting'; } };
}
setInterval(() => {
  if (!lastUpdate) return;
  const s = Math.round((Date.now() - lastUpdate) / 1000);
  $('#updated').textContent = s < 5 ? 'updated just now' : `updated ${s < 60 ? s + 's' : Math.round(s / 60) + 'm'} ago`;
}, 1000);
// ?static disables live updates (for printing or screenshots).
const LIVE = !new URLSearchParams(location.search).has('static');
if (LIVE) setInterval(() => refresh(true), 15000);

refresh().then(() => { if (LIVE) connect(); });
