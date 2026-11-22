// SpecCraft Board — agent chat: the board's right panel talks to an agent CLI (Claude Code, Codex,
// Gemini, Antigravity) one turn at a time. Each turn is a CLI process in its own process group,
// its output is normalised into parts (text, tool, note) and streamed to the page.
// Chats are kept per machine in .speccraft/.runs/chat/ (git-ignored).

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

let ROOT = '';
let CHAT_DIR = '';
let onChange = () => {};

export function initChat({ root, spec, changed }) {
  ROOT = root;
  CHAT_DIR = path.join(spec, '.runs', 'chat');
  onChange = changed;
}

// ---------------------------------------------------------------- context for the agent

const SYSTEM = `You are talking to the operator through the chat panel of SpecCraft Board, the local dashboard of this SpecCraft project (workflow: AGENTS.md, guide: .speccraft/Readme.md).
- Every message from the operator is one turn. When a skill tells you to ask or confirm something, ask here and end your turn; the operator answers in the next message.
- The panel is narrow: keep replies short and easy to scan (short paragraphs, short lists, no wide tables). Say at the end what you did and what comes next.
- When you start a SpecCraft step, keep .speccraft/.runs/activity.json current as AGENTS.md says, so the board shows your work live.
- Never push, deploy or publish.`;

// ---------------------------------------------------------------- adapters

const short = (s, n = 140) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const relPath = (p) => (typeof p === 'string' && p.startsWith(ROOT) ? path.relative(ROOT, p) || '.' : p);

function claudeToolSummary(name, input = {}) {
  const i = input || {};
  if (i.file_path || i.path || i.notebook_path) return relPath(i.file_path || i.path || i.notebook_path);
  if (i.command) return short(i.command, 160);
  if (i.pattern) return `${i.pattern}${i.path ? ` in ${relPath(i.path)}` : ''}`;
  if (i.query) return short(i.query);
  if (i.url) return short(i.url);
  if (i.skill) return i.skill;
  if (i.description) return short(i.description);
  if (i.todos) return `${i.todos.length} todo(s)`;
  const first = Object.values(i).find((v) => typeof v === 'string');
  return first ? short(first) : '';
}

function innerError(msg) {
  try { const j = JSON.parse(msg); return j?.error?.message || j?.message || msg; } catch { return msg; }
}

export const ADAPTERS = {
  claude: {
    bin: 'claude',
    resume: true,
    models: ['opus', 'sonnet', 'haiku'],
    args({ prompt, session, model, perm }) {
      const a = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--append-system-prompt', SYSTEM];
      if (session) a.push('--resume', session);
      if (model) a.push('--model', model);
      if (perm === 'full') a.push('--dangerously-skip-permissions');
      else a.push('--permission-mode', perm === 'plan' ? 'plan' : 'acceptEdits');
      return a;
    },
    // Claude Code stream-json: system/init, stream_event deltas, assistant messages, user tool results, result.
    event(e, t) {
      if (e.type === 'system' && e.session_id) t.session(e.session_id, e.model);
      else if (e.type === 'stream_event' && e.event?.type === 'content_block_delta' && e.event.delta?.type === 'text_delta') t.delta(e.event.delta.text);
      else if (e.type === 'assistant') {
        for (const c of e.message?.content || []) {
          if (c.type === 'text' && c.text?.trim()) t.text(c.text);
          else if (c.type === 'tool_use') t.tool(c.id, c.name, claudeToolSummary(c.name, c.input));
        }
      } else if (e.type === 'user') {
        for (const c of e.message?.content || []) {
          if (c.type !== 'tool_result') continue;
          const out = Array.isArray(c.content) ? c.content.map((x) => x.text || '').join(' ') : c.content;
          t.toolDone(c.tool_use_id, !c.is_error, c.is_error ? short(out, 200) : '');
        }
      } else if (e.type === 'result') {
        if (e.session_id) t.session(e.session_id);
        t.done(!e.is_error, { cost: e.total_cost_usd, ms: e.duration_ms, error: e.is_error ? short(e.result || e.subtype, 400) : null });
      }
    },
  },
  codex: {
    bin: 'codex',
    resume: true,
    models: [],
    args({ prompt, session, model, perm, first }) {
      const text = first ? `${SYSTEM}\n\n---\n\n${prompt}` : prompt;
      const sandbox = perm === 'plan' ? ['-c', 'sandbox_mode="read-only"'] : ['-c', 'sandbox_mode="workspace-write"', ...(perm === 'full' ? ['-c', 'sandbox_workspace_write.network_access=true'] : [])];
      const m = model ? ['-m', model] : [];
      return session
        ? ['exec', 'resume', '--json', '--skip-git-repo-check', ...m, ...sandbox, session, text]
        : ['exec', '--json', '--skip-git-repo-check', ...m, ...sandbox, text];
    },
    // Codex exec --json: thread.started, item.started / item.completed, turn.completed / turn.failed, error.
    event(e, t) {
      const it = e.item || {};
      if (e.type === 'thread.started' && e.thread_id) t.session(e.thread_id);
      else if (e.type === 'item.started' && it.type === 'command_execution') t.tool(it.id, 'shell', short(it.command, 160));
      else if (e.type === 'item.completed') {
        if (it.type === 'agent_message' && it.text?.trim()) t.text(it.text);
        else if (it.type === 'command_execution') {
          if (!t.has(it.id)) t.tool(it.id, 'shell', short(it.command, 160));
          t.toolDone(it.id, it.exit_code === 0 || it.status === 'completed', it.exit_code ? `exit ${it.exit_code}` : '');
        } else if (it.type === 'file_change') {
          t.tool(it.id, 'edit', short((it.changes || []).map((c) => `${c.kind || ''} ${relPath(c.path)}`.trim()).join(', '), 200));
          t.toolDone(it.id, it.status !== 'failed', '');
        } else if (it.type === 'mcp_tool_call' || it.type === 'web_search') {
          t.tool(it.id, it.type === 'web_search' ? 'web search' : `${it.server || 'mcp'}.${it.tool || ''}`, short(it.query || it.arguments || '', 140));
          t.toolDone(it.id, it.status !== 'failed', '');
        } else if (it.type === 'error' && it.message) t.note(short(it.message, 300));
      } else if (e.type === 'turn.completed') t.done(true, { usage: e.usage });
      else if (e.type === 'turn.failed') t.done(false, { error: short(innerError(e.error?.message || 'turn failed'), 400) });
      else if (e.type === 'error') t.note(short(innerError(e.message || ''), 300), true);
    },
  },
  // No resume and no structured output: the conversation so far goes with every message.
  gemini: {
    bin: 'gemini',
    resume: false,
    text: true,
    models: [],
    args({ prompt, model, perm }) {
      return ['-p', prompt, ...(perm === 'plan' ? [] : ['--yolo']), ...(model ? ['-m', model] : [])];
    },
  },
  antigravity: {
    bin: 'agy',
    resume: false,
    text: true,
    models: null,
    args({ prompt, perm }) {
      return ['-p', prompt, ...(perm === 'plan' ? [] : ['--dangerously-skip-permissions'])];
    },
  },
};

function transcriptPrompt(chat, text) {
  const past = chat.messages.slice(-12).map((m) => {
    if (m.role === 'user') return `Operator: ${short(m.text, 2000)}`;
    const said = (m.parts || []).filter((p) => p.k === 'text').map((p) => p.text).join('\n');
    return said ? `You: ${short(said, 2000)}` : '';
  }).filter(Boolean);
  return `${SYSTEM}\n\n${past.length ? `Conversation so far:\n${past.join('\n\n')}\n\n` : ''}Operator: ${text}`;
}

// ---------------------------------------------------------------- store

const turns = new Map(); // chat id → { child, chat, live, since }
const subscribers = new Map(); // chat id → Set(res)

const chatFile = (id) => path.join(CHAT_DIR, `${id}.json`);
const validId = (id) => /^[a-z0-9-]{8,40}$/.test(String(id || ''));

async function loadChat(id) {
  if (turns.has(id)) return turns.get(id).chat;
  try { return JSON.parse(await fsp.readFile(chatFile(id), 'utf8')); } catch { return null; }
}
async function saveChat(chat) {
  await fsp.mkdir(CHAT_DIR, { recursive: true });
  await fsp.writeFile(chatFile(chat.id), JSON.stringify(chat, null, 1));
}

export async function listChats() {
  let names = [];
  try { names = (await fsp.readdir(CHAT_DIR)).filter((n) => n.endsWith('.json')); } catch { /* none yet */ }
  const out = [];
  for (const n of names) {
    const c = await loadChat(n.replace(/\.json$/, ''));
    if (c) out.push({ id: c.id, title: c.title, agent: c.agent, updated: c.updated, messages: c.messages.length, running: turns.has(c.id) });
  }
  return out.sort((a, b) => b.updated - a.updated).slice(0, 50);
}

export async function getChat(id) {
  if (!validId(id)) throw Object.assign(new Error('Bad chat id.'), { status: 400 });
  const c = await loadChat(id);
  if (!c) throw Object.assign(new Error('Chat not found.'), { status: 404 });
  return { ...c, running: turns.has(id), live: turns.get(id)?.live || '' };
}

export async function deleteChat(id) {
  if (!validId(id) || turns.has(id)) throw Object.assign(new Error('Cannot delete a running chat.'), { status: 409 });
  await fsp.rm(chatFile(id), { force: true });
  return { deleted: true };
}

export function chatStatus() {
  const list = [...turns.values()].map((t) => ({ id: t.chat.id, title: t.chat.title, since: t.since, agent: t.chat.agent }));
  return { running: list };
}

function emit(id, event, data) {
  for (const res of subscribers.get(id) || []) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function streamChat(id, req, res) {
  if (!validId(id)) { res.writeHead(400); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  if (!subscribers.has(id)) subscribers.set(id, new Set());
  subscribers.get(id).add(res);
  const chat = await loadChat(id);
  if (chat) res.write(`event: chat\ndata: ${JSON.stringify({ ...chat, running: turns.has(id), live: turns.get(id)?.live || '' })}\n\n`);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => { clearInterval(ping); subscribers.get(id)?.delete(res); });
}

// ---------------------------------------------------------------- turns

export async function sendMessage(body, { busy }) {
  const text = String(body.text || '').trim().slice(0, 12000);
  if (!text) throw Object.assign(new Error('Write a message first.'), { status: 400 });
  const agentId = String(body.agent || '');
  const adapter = ADAPTERS[agentId];
  if (!adapter) throw Object.assign(new Error('Unknown agent.'), { status: 400 });
  const perm = ['full', 'edit', 'plan'].includes(body.perm) ? body.perm : 'full';
  const model = String(body.model || '').trim();
  if (model && !/^[\w.:@/[\]-]{1,80}$/.test(model)) throw Object.assign(new Error('Bad model name.'), { status: 400 });
  if (busy && perm !== 'plan') throw Object.assign(new Error(`${busy} While it works, the chat can only answer questions: switch the chat to "Read only".`), { status: 409 });

  let chat = body.chat ? await loadChat(String(body.chat)) : null;
  if (body.chat && !chat) throw Object.assign(new Error('Chat not found.'), { status: 404 });
  if (chat && turns.has(chat.id)) throw Object.assign(new Error('The agent is still answering in this chat.'), { status: 409 });
  if (turns.size && (!chat || !turns.has(chat.id))) {
    const other = [...turns.values()][0].chat;
    if (perm !== 'plan') throw Object.assign(new Error(`Another chat is running (${other.title}). Wait for it, or stop it.`), { status: 409 });
  }
  if (chat && chat.agent !== agentId) {
    // a different CLI cannot continue the session: the conversation continues as a transcript
    chat.session = null;
    chat.messages.push({ role: 'note', text: `Switched to ${agentId}. It sees the conversation so far as text.`, at: Date.now() });
  }
  if (!chat) {
    chat = { id: crypto.randomUUID(), title: short(text, 60), agent: agentId, created: Date.now(), updated: Date.now(), session: null, messages: [] };
  }
  const first = !chat.session;
  const transcript = !adapter.resume || (first && chat.messages.some((m) => m.role === 'assistant'));
  chat.agent = agentId;
  chat.model = model;
  chat.perm = perm;
  chat.messages.push({ role: 'user', text, at: Date.now(), label: body.label ? short(body.label, 60) : undefined });
  const reply = { role: 'assistant', parts: [], at: Date.now(), agent: agentId, model, perm, running: true };
  chat.messages.push(reply);
  chat.updated = Date.now();
  await saveChat(chat);

  const prompt = transcript ? transcriptPrompt({ ...chat, messages: chat.messages.slice(0, -2) }, text) : text;
  const args = adapter.args({ prompt, session: adapter.resume ? chat.session : null, model, perm, first: first && !transcript });
  let child;
  try {
    child = spawn(adapter.bin, args, { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, SPECCRAFT_BOARD_CHAT: '1' } });
  } catch (err) {
    reply.running = false;
    reply.parts.push({ k: 'note', error: true, text: `Could not start ${adapter.bin}: ${err.message}` });
    await saveChat(chat);
    return chat;
  }
  const turn = { child, chat, live: '', since: Date.now() };
  turns.set(chat.id, turn);
  onChange();

  const tools = new Map();
  let saveTimer = null;
  const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveChat(chat).catch(() => {}), 400); };
  const publish = () => { emit(chat.id, 'chat', { ...chat, running: true, live: turn.live }); persist(); };
  let finished = false;
  const t = {
    session(id) { if (id && chat.session !== id) { chat.session = id; persist(); } },
    delta(s) { turn.live += s; emit(chat.id, 'delta', { text: s }); },
    text(s) { turn.live = ''; reply.parts.push({ k: 'text', text: s }); publish(); },
    tool(id, name, summary) { tools.set(id, reply.parts.length); reply.parts.push({ k: 'tool', name, summary, state: 'run' }); publish(); },
    has(id) { return tools.has(id); },
    toolDone(id, ok, info) {
      const i = tools.get(id);
      if (i === undefined) return;
      reply.parts[i].state = ok ? 'ok' : 'fail';
      if (info) reply.parts[i].info = info;
      publish();
    },
    note(s, error = false) { reply.parts.push({ k: 'note', text: s, error }); publish(); },
    done(ok, meta = {}) {
      if (finished) return;
      finished = true;
      if (turn.live.trim()) { reply.parts.push({ k: 'text', text: turn.live }); turn.live = ''; }
      if (!ok && meta.error) reply.parts.push({ k: 'note', error: true, text: meta.error });
      reply.ok = ok;
      reply.cost = meta.cost;
      reply.ms = meta.ms || Date.now() - turn.since;
    },
  };

  const out = readline.createInterface({ input: child.stdout });
  out.on('line', (line) => {
    if (adapter.text) { t.delta(`${line}\n`); return; }
    let e;
    try { e = JSON.parse(line); } catch { if (line.trim()) t.delta(`${line}\n`); return; }
    try { adapter.event(e, t); } catch (err) { t.note(`Could not read an event: ${err.message}`, true); }
  });
  let errText = '';
  child.stderr.on('data', (d) => { errText = (errText + d).slice(-4000); });
  child.on('error', (err) => { errText += `\n${err.message}`; });
  child.on('close', async (code, signal) => {
    if (!finished) {
      const stopped = turn.stopped || signal;
      t.done(code === 0 && !stopped, { error: stopped ? 'Stopped.' : code === 0 ? null : short(errText.trim() || `${adapter.bin} exited with code ${code}`, 600) });
      if (code === 0 && !stopped && adapter.text && !reply.parts.some((p) => p.k === 'text')) reply.parts.push({ k: 'note', text: '(no answer)' });
    }
    reply.running = false;
    for (const p of reply.parts) if (p.k === 'tool' && p.state === 'run') p.state = turn.stopped ? 'fail' : 'ok';
    chat.updated = Date.now();
    turns.delete(chat.id);
    clearTimeout(saveTimer);
    await saveChat(chat).catch(() => {});
    emit(chat.id, 'chat', { ...chat, running: false, live: '' });
    onChange();
  });
  return { ...chat, running: true, live: '' };
}

export function stopChat(id) {
  const turn = turns.get(String(id || ''));
  if (!turn) throw Object.assign(new Error('Nothing is running in this chat.'), { status: 409 });
  turn.stopped = true;
  try { process.kill(-turn.child.pid, 'SIGTERM'); } catch { /* gone */ }
  setTimeout(() => { if (turns.get(id) === turn) { try { process.kill(-turn.child.pid, 'SIGKILL'); } catch { /* gone */ } } }, 5000);
  return { stopping: true };
}

export function stopAllChats() {
  for (const turn of turns.values()) { try { process.kill(-turn.child.pid, 'SIGTERM'); } catch { /* gone */ } }
}

export function adapterInfo() {
  return Object.fromEntries(Object.entries(ADAPTERS).map(([k, a]) => [k, { resume: a.resume, models: a.models, structured: !a.text }]));
}

export const chatExists = (id) => fs.existsSync(chatFile(id));
