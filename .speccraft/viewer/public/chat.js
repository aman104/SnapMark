/* SpecCraft Board — agent chat (right panel). Talks to an agent CLI through the board server:
   one CLI process per turn, the conversation continues in the CLI's own session. */
'use strict';

const CHAT = {
  open: false,
  id: null, // current chat id
  chat: null, // current chat object
  list: [],
  es: null,
  live: '',
  agent: null,
  model: '',
  perm: 'full',
  ready: false,
};
const chatEl = () => document.getElementById('chat');
const cq = (sel) => chatEl().querySelector(sel);
const chatGet = async (p) => {
  const res = await fetch(`${p}${p.includes('?') ? '&' : '?'}token=${encodeURIComponent(TOKEN)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* ignore */ } return null; };

// ------------------------------------------------------------------ quick actions per stage

function chatActions() {
  if (!S) return [];
  const stage = currentStage();
  const m = stage.m;
  const out = [
    { label: 'Where are we?', prompt: 'Use the 00-next skill in status-only mode: where is the project and what is the next step? Do not run anything.' },
  ];
  const nextStep = { label: 'Next step', prompt: 'Use the 00-next skill: run the next step. If it needs my input, ask me here.' };
  if (stage.id === 'spec' || stage.id === 'roadmap') {
    const steps = specSteps();
    const next = steps.find((x) => !x.done);
    if (!docOk('01-Idea.md')) {
      out.push({ label: 'Shape my idea', fill: 'Use the 01-discovery-idea skill with me. My idea: ' });
      if (S.autopilot?.brief) out.push({ label: 'Idea from my brief', prompt: 'Use 01-discovery-idea in Mode 4 (autonomous): write .speccraft/docs/01-Idea.md from the brief in .speccraft/autopilot.md.' });
    } else if (next) {
      out.push(next.roast
        ? { label: 'Roast the idea', prompt: 'Use the 02-discovery-idea-roast skill on .speccraft/docs/01-Idea.md. Show me the verdict and the changes you propose, and wait for my decision.' }
        : { label: `Write ${next.title}`, prompt: `Use the ${next.skill} skill to write ${next.roadmap ? '.speccraft/milestones.md' : `.speccraft/docs/${next.file}`}. Ask me here if something important is unclear.` });
      if (next.roast) out.push({ label: 'Skip to the PRD', prompt: 'Use the 03-discovery-prd skill to write .speccraft/docs/02-General-PRD.md.' });
    }
    if (docOk('01-Idea.md')) out.push({ label: 'Improve the idea', fill: 'Update .speccraft/docs/01-Idea.md (01-discovery-idea, mode 2): ' });
  } else if (stage.id === 'tasks') {
    out.push({ label: `Plan ${m.id} tasks`, prompt: `Use the 08-planning-tasks skill to plan the tasks of ${m.id} — ${m.name}.` });
    out.push({ label: 'Change the roadmap', fill: 'Update the roadmap in .speccraft/milestones.md (07-planning-milestones): ' });
  } else if (stage.id === 'plans') {
    out.push({ label: 'Write the plans', prompt: `Use the 09-planning-task-details skill to write the implementation plans of ${m.id}.` });
  } else if (stage.id === 'build') {
    const tasks = m.tasks || [];
    const review = tasks.find((t) => t.status === '~');
    const blocked = tasks.filter((t) => t.status === '!');
    const pending = tasks.find((t) => t.status === ' ');
    if (review) out.push({ label: `Review ${review.num}`, prompt: `Use the 10-execution-tasks skill, step 7: independently review task ${review.num} — ${review.name}, and merge it if it is approved.` });
    else if (pending) out.push({ label: `Build ${pending.num}`, prompt: `Use the 10-execution-tasks skill: implement task ${pending.num} — ${pending.name} on its task branch, verify it and hand it over for review. Stop after this task.` });
    else if (tasks.length && tasks.every((t) => t.status === 'x')) out.push({ label: `Complete ${m.id}`, prompt: `Use the 10-execution-tasks skill: complete milestone ${m.id} (exit criteria, milestone report).` });
    for (const b of blocked.slice(0, 2)) out.push({ label: `Unblock ${b.num}`, prompt: `Task ${b.num} — ${b.name} is blocked. Read its blocker.md, explain what is needed in two or three sentences and how I can help.` });
  } else if (stage.id === 'review') {
    out.push({ label: `Summarize ${m.id}`, prompt: `Read the milestone report of ${m.id} and summarize for me: what I can see, the demo steps, the exit criteria and the spec changes. Keep it short.` });
    out.push({ label: `Accept ${m.id}`, confirm: `Accept ${m.id}? It is marked accepted, its spec changes are applied and it is merged into the base branch.`, prompt: `I have reviewed ${m.id} and I accept it. Use the 08-planning-tasks skill: record my acceptance, apply the spec changes, merge it and plan the next milestone.` });
    out.push({ label: 'Request changes', fill: `I have reviewed ${m.id} and request these changes (use 08-planning-tasks, rework tasks): ` });
  }
  if (stage.id !== 'review') out.splice(1, 0, nextStep);
  if (S.milestones.length) out.push({ label: 'Feature or fix', fill: 'Use the 12-feature-advisor skill for this: ' });
  out.push({ label: 'Security review', prompt: 'Use the 11-security-researcher skill on this project.' });
  return out;
}

// ------------------------------------------------------------------ rendering

const ICON = { Read: '◱', Write: '✎', Edit: '✎', MultiEdit: '✎', edit: '✎', Bash: '$', shell: '$', Glob: '⌕', Grep: '⌕', WebSearch: '⌕', 'web search': '⌕', WebFetch: '↧', Task: '◇', Agent: '◇', TodoWrite: '☐', Skill: '★' };

function partHtml(p) {
  if (p.k === 'text') return `<div class="msg-text prose">${md(p.text, '')}</div>`;
  if (p.k === 'tool') {
    const st = p.state === 'run' ? '<i class="spin"></i>' : p.state === 'fail' ? '<b class="bad">✕</b>' : '<b class="ok">✓</b>';
    return `<div class="msg-tool ${p.state}" title="${esc(`${p.name} ${p.summary || ''}${p.info ? ` — ${p.info}` : ''}`)}"><span class="ico">${ICON[p.name] || '•'}</span><span class="nm">${esc(p.name)}</span><span class="sm">${esc(p.summary || '')}</span>${st}</div>`;
  }
  return `<div class="msg-note ${p.error ? 'error' : ''}">${esc(p.text)}</div>`;
}

function messageHtml(m, last, running) {
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${esc(m.text)}</div></div>`;
  if (m.role === 'note') return `<div class="msg-note sys">${esc(m.text)}</div>`;
  const live = last && running && CHAT.live ? `<div class="msg-text prose live" id="chatLive">${md(CHAT.live, '')}</div>` : last && running ? '<div class="msg-text prose live" id="chatLive"></div>' : '';
  const waiting = last && running && !m.parts.length && !CHAT.live ? '<div class="msg-wait"><i class="spin"></i> thinking…</div>' : '';
  const meta = !m.running && (m.ms || m.cost) ? `<div class="msg-meta">${m.agent || ''}${m.model ? ` · ${esc(m.model)}` : ''}${m.ms ? ` · ${Math.round(m.ms / 1000)}s` : ''}${m.cost ? ` · $${m.cost.toFixed(3)}` : ''}</div>` : '';
  return `<div class="msg agent">${m.parts.map(partHtml).join('')}${live}${waiting}${meta}</div>`;
}

function renderLog() {
  const log = cq('#chatLog');
  if (!log) return;
  const near = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const c = CHAT.chat;
  const err = CHAT.error ? `<div class="msg-note error chat-error">${esc(CHAT.error)}</div>` : '';
  if (!c || !c.messages.length) {
    log.innerHTML = `<div class="chat-empty">
      <div class="label">Agent chat</div>
      <p>Talk to <b>${esc(agentName(CHAT.agent))}</b> right here: it runs in this project with its skills, so you can go through the whole flow from this board. Pick a quick action below or write your own instruction.</p>
      <p class="muted">It works next to everything else: the Next button, the autopilot and your terminal see the same files.</p>
    </div>${err}`;
    return;
  }
  const lastIdx = c.messages.length - 1;
  log.innerHTML = c.messages.map((m, i) => messageHtml(m, i === lastIdx, c.running)).join('') + err;
  if (near || c.running) log.scrollTop = log.scrollHeight;
}

function renderLive() {
  const el = document.getElementById('chatLive');
  if (!el) { renderLog(); return; }
  el.innerHTML = md(CHAT.live, '');
  const log = cq('#chatLog');
  if (log.scrollHeight - log.scrollTop - log.clientHeight < 160) log.scrollTop = log.scrollHeight;
  cq('.msg-wait')?.remove();
}

const agentName = (id) => S?.control?.agents?.find((a) => a.id === id)?.name || id || 'your agent';

function renderControls() {
  const c = S?.control;
  if (!c?.enabled || !chatEl()) return;
  const agents = c.agents || [];
  if (!CHAT.agent || !agents.some((a) => a.id === CHAT.agent && a.installed)) {
    CHAT.agent = store('speccraft-chat-agent') || c.settings?.agent;
    if (!agents.some((a) => a.id === CHAT.agent && a.installed)) CHAT.agent = agents.find((a) => a.installed)?.id || null;
  }
  const sel = cq('#chatAgent');
  if (document.activeElement !== sel) {
    sel.innerHTML = agents.map((a) => `<option value="${a.id}" ${a.id === CHAT.agent ? 'selected' : ''} ${a.installed ? '' : 'disabled'}>${esc(a.name)}${a.installed ? '' : ' — not installed'}</option>`).join('');
  }
  const info = c.chat?.adapters?.[CHAT.agent] || {};
  const agent = agents.find((a) => a.id === CHAT.agent);
  const model = cq('#chatModel');
  model.disabled = info.models === null;
  model.placeholder = info.models === null ? 'set in the CLI' : agent?.configured ? `default (${agent.configured})` : 'default';
  if (document.activeElement !== model) model.value = CHAT.model;
  cq('#chatModels').innerHTML = [...new Set([...(agent?.configured ? [agent.configured] : []), ...(info.models || [])])].map((m) => `<option value="${esc(m)}"></option>`).join('');
  const perm = cq('#chatPerm');
  if (document.activeElement !== perm) perm.value = CHAT.perm;
  const scriptBusy = S.runs?.running && !S.runs?.session?.chat && !CHAT.chat?.running;
  cq('#chatHint').classList.toggle('warn', !!(scriptBusy && CHAT.perm !== 'plan'));
  cq('#chatHint').textContent = scriptBusy && CHAT.perm !== 'plan' ? 'A script or another agent is working right now. Switch to "Read only" to ask questions meanwhile.' : info.structured === false
    ? `${agent?.name || 'This CLI'} has no session resume: every message carries the conversation so far.`
    : { full: 'Full access: edits files and runs commands (git, tests) without asking, like the scripts.', edit: 'Edits only: changes files; commands that need approval are skipped.', plan: 'Read only: answers and plans, changes nothing. Works while a script runs.' }[CHAT.perm];
}

function renderActions() {
  const box = cq('#chatActions');
  if (!box) return;
  const running = CHAT.chat?.running;
  const acts = chatActions();
  const sig = JSON.stringify([acts.map((a) => a.label), running]);
  if (box.dataset.sig === sig) return;
  box.dataset.sig = sig;
  box.innerHTML = acts.map((a, i) => `<button class="chip ${a.fill ? 'fill' : ''}" data-chat-act="${i}" ${running ? 'disabled' : ''} title="${esc(a.prompt || a.fill)}">${esc(a.label)}${a.fill ? ' …' : ''}</button>`).join('');
  box._acts = acts;
}

function renderPicker() {
  const pick = cq('#chatPick');
  if (!pick || document.activeElement === pick) return;
  const cur = CHAT.id;
  const items = CHAT.list.filter((x) => x.id !== cur);
  pick.innerHTML = `<option value="">${CHAT.chat ? esc(CHAT.chat.title) : 'New chat'}</option>${items.length ? `<optgroup label="Earlier chats">${items.map((x) => `<option value="${x.id}">${esc(x.title)} · ${new Date(x.updated).toLocaleDateString()}${x.running ? ' ●' : ''}</option>`).join('')}</optgroup>` : ''}`;
  pick.value = '';
}

function renderComposer() {
  const running = !!CHAT.chat?.running;
  const btn = cq('#chatSend');
  btn.textContent = running ? '■ Stop' : 'Send';
  btn.classList.toggle('danger', running);
  btn.classList.toggle('primary', !running);
  cq('#chatInput').placeholder = running ? 'The agent is working… you can type your next message' : `Message ${agentName(CHAT.agent)}…`;
  cq('.chat-cfg').classList.toggle('locked', running);
  chatEl().classList.toggle('running', running);
}

function renderChat() {
  if (!chatEl() || !CHAT.ready) return;
  renderControls();
  renderPicker();
  renderActions();
  renderComposer();
  renderLog();
}

// Called by the board after every state update.
function chatOnState() {
  if (!CHAT.ready) chatInit();
  if (!CHAT.ready) return;
  renderControls();
  renderActions();
}

// ------------------------------------------------------------------ data

function connect(id) {
  CHAT.es?.close();
  CHAT.es = null;
  if (!id || !LIVE) return;
  const es = new EventSource(`/api/chat/stream?id=${encodeURIComponent(id)}&token=${encodeURIComponent(TOKEN)}`);
  es.addEventListener('chat', (e) => {
    const c = JSON.parse(e.data);
    if (c.id !== CHAT.id) return;
    const wasRunning = CHAT.chat?.running;
    CHAT.chat = c;
    CHAT.live = c.live || '';
    renderLog();
    renderComposer();
    renderActions();
    if (wasRunning && !c.running) { refreshList(); refresh(true); }
  });
  es.addEventListener('delta', (e) => {
    CHAT.live += JSON.parse(e.data).text;
    renderLive();
  });
  CHAT.es = es;
}

async function refreshList() {
  try { CHAT.list = await chatGet('/api/chat/list'); } catch { CHAT.list = []; }
  renderPicker();
}

async function openChat(id) {
  CHAT.id = id || null;
  CHAT.chat = null;
  CHAT.live = '';
  store('speccraft-chat-id', CHAT.id || '');
  if (id) {
    try {
      CHAT.chat = await chatGet(`/api/chat/get?id=${encodeURIComponent(id)}`);
      CHAT.live = CHAT.chat.live || '';
      if (CHAT.chat.agent) CHAT.agent = CHAT.chat.agent;
      if (CHAT.chat.model !== undefined) CHAT.model = CHAT.chat.model || '';
      if (CHAT.chat.perm) CHAT.perm = CHAT.chat.perm;
    } catch { CHAT.id = null; }
  }
  connect(CHAT.id);
  renderChat();
}

async function sendChat(text, label) {
  text = (text || '').trim();
  if (!text) return;
  if (!CHAT.agent) { toast('No agent CLI found on this machine.', true); return; }
  if (CHAT.chat && CHAT.chat.agent !== CHAT.agent && CHAT.chat.messages.length && !confirm(`This chat was with ${agentName(CHAT.chat.agent)}. ${agentName(CHAT.agent)} cannot continue its session, so it gets the conversation as text. Continue?`)) return;
  const input = cq('#chatInput');
  CHAT.error = '';
  try {
    const c = await api('/api/chat/send', { chat: CHAT.id, text, agent: CHAT.agent, model: CHAT.model, perm: CHAT.perm, label });
    if (input.value.trim() === text) input.value = '';
    autosize();
    if (c.id !== CHAT.id) { CHAT.id = c.id; store('speccraft-chat-id', c.id); connect(c.id); }
    CHAT.chat = c;
    CHAT.live = '';
    renderChat();
    refreshList();
  } catch (err) {
    // keep the reason visible in the chat, not only in a toast
    CHAT.error = /not found/i.test(err.message) && !S?.server
      ? 'This board server is older than the page and has no chat yet. Restart the board once (Ctrl+C in its terminal, then speccraft board).'
      : `Not sent: ${err.message}`;
    renderLog();
    const log = cq('#chatLog');
    log.scrollTop = log.scrollHeight;
    toast(err.message, true);
  }
}

// ------------------------------------------------------------------ panel

function setOpen(open) {
  CHAT.open = open;
  $('#app').classList.toggle('chat-open', open);
  store('speccraft-chat', open ? 'open' : 'closed');
  if (open) { setTimeout(() => cq('#chatInput')?.focus(), 50); renderChat(); }
}

function autosize() {
  const t = cq('#chatInput');
  t.style.height = 'auto';
  t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
}

function chatInit() {
  const el = chatEl();
  if (!el || CHAT.ready || !S) return;
  if (!canControl()) { document.getElementById('chatBtn')?.remove(); el.remove(); return; }
  CHAT.ready = true;
  CHAT.perm = store('speccraft-chat-perm') || 'full';
  CHAT.model = store('speccraft-chat-model') || '';
  el.innerHTML = `
    <div class="chat-head">
      <span class="chat-title"><i class="spin"></i>Agent chat</span>
      <select class="inp chat-pick" id="chatPick" title="Earlier chats"></select>
      <button class="icon-btn" id="chatNew" title="New chat">＋</button>
      <button class="icon-btn" id="chatClose" title="Close the chat ( ] )">✕</button>
    </div>
    <div class="chat-cfg">
      <select class="inp" id="chatAgent" title="Agent CLI"></select>
      <input class="inp" id="chatModel" list="chatModels" spellcheck="false" autocomplete="off" title="Model (empty: the CLI's default)">
      <datalist id="chatModels"></datalist>
      <select class="inp" id="chatPerm" title="What the agent may do">
        <option value="full">Full access</option>
        <option value="edit">Edits only</option>
        <option value="plan">Read only</option>
      </select>
      <div class="chat-hint" id="chatHint"></div>
    </div>
    <div class="chat-log" id="chatLog"></div>
    <div class="chat-actions" id="chatActions"></div>
    <div class="chat-compose">
      <textarea class="inp" id="chatInput" rows="2" title="Enter sends, Shift+Enter adds a new line"></textarea>
      <button class="btn primary" id="chatSend">Send</button>
    </div>`;
  const input = cq('#chatInput');
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (!CHAT.chat?.running) sendChat(input.value);
    }
  });
  cq('#chatSend').addEventListener('click', async () => {
    if (CHAT.chat?.running) {
      try { await api('/api/chat/stop', { chat: CHAT.id }); toast('stopping the agent…'); } catch (err) { toast(err.message, true); }
    } else sendChat(input.value);
  });
  cq('#chatNew').addEventListener('click', () => { if (!CHAT.chat?.running || confirm('The agent is still answering here. Start a new chat anyway? (It keeps working.)')) openChat(null); });
  cq('#chatClose').addEventListener('click', () => setOpen(false));
  cq('#chatPick').addEventListener('change', (e) => { if (e.target.value) openChat(e.target.value); });
  cq('#chatAgent').addEventListener('change', (e) => { CHAT.agent = e.target.value; CHAT.model = ''; store('speccraft-chat-agent', CHAT.agent); store('speccraft-chat-model', ''); renderControls(); renderComposer(); });
  cq('#chatModel').addEventListener('change', (e) => { CHAT.model = e.target.value.trim() === 'default' ? '' : e.target.value.trim(); store('speccraft-chat-model', CHAT.model); });
  cq('#chatPerm').addEventListener('change', (e) => { CHAT.perm = e.target.value; store('speccraft-chat-perm', CHAT.perm); renderControls(); });
  cq('#chatActions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-chat-act]');
    if (!b) return;
    const a = cq('#chatActions')._acts?.[Number(b.dataset.chatAct)];
    if (!a) return;
    if (a.fill) { input.value = a.fill; autosize(); input.focus(); input.setSelectionRange(input.value.length, input.value.length); return; }
    if (a.confirm && !confirm(a.confirm)) return;
    sendChat(a.prompt, a.label);
  });
  document.getElementById('chatBtn')?.addEventListener('click', () => setOpen(!CHAT.open));
  document.addEventListener('keydown', (e) => {
    if (e.key !== ']' || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
    e.preventDefault();
    setOpen(!CHAT.open);
  });
  // Board links can ask the chat to do something: data-chat-prompt="…"
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chat-prompt]');
    if (!b) return;
    e.preventDefault();
    setOpen(true);
    input.value = b.dataset.chatPrompt;
    autosize();
    input.focus();
  });
  autosize();
  renderChat();
  refreshList().then(() => {
    const last = store('speccraft-chat-id');
    if (last && CHAT.list.some((x) => x.id === last)) openChat(last); else openChat(null);
  });
  if (store('speccraft-chat') === 'open') setOpen(true);
}
