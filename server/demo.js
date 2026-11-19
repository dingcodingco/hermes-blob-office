// Demo mode: example data only. Nothing here talks to Hermes.
// Every reply is tagged so viewers can tell it is sample data.
// The office keeps itself busy: bots finish work, pick up new work, and now and then
// one of them needs your approval and walks down to the lobby.

const now = () => Date.now();
const { t } = require("./i18n");
const { textFor } = require("./demo-text");

function initialState(config) {
  const P = textFor(config.lang), WORK = P.work, APPROVALS = P.approvals, SKILLS = P.skills;
  const agents = config.agents.map((a) => ({ id: a.id, name: a.name, team: a.team, profile: a.profile, floor: a.floor, status: "idle", task: "", location: "desk" }));
  const set = (id, status, task) => { const a = agents.find((x) => x.id === id); if (a) Object.assign(a, { status, task: task ?? (WORK[id] || [""])[0] }); };
  ["letter", "note", "celly", "slidey", "gureum", "bureung", "cut", "idea", "antenna"].forEach((id) => set(id, "working"));
  set("chorong", "done", t(config.lang, "task_done_report"));
  set("graphy", "done", t(config.lang, "task_done_report"));
  set("card", "needs_approval", APPROVALS.card);
  set("timer", "idle", "");
  set("copy", "idle", "");
  set("sigma", "working");
  set("weekly", "working");

  const skills = {};
  for (const a of config.agents) {
    const [sk, conn] = SKILLS[a.id] || [[a.job || ""].filter(Boolean), []];
    skills[a.id] = { skills: sk, connectors: conn };
  }
  return {
    mode: "demo",
    connected: false,
    title: config.title,
    agents,
    meeting: { active: false, topic: "", members: [] },
    kanban: P.kanban.map(([id, title, status, assignee]) => ({ id, title, status, assignee })),
    skills,
    feed: [
      { agentId: "graphy", text: WORK.graphy[1], ts: now() - 1000 * 60 * 3 },
      { agentId: "chorong", text: WORK.chorong[1], ts: now() - 1000 * 60 * 25 },
    ],
    chats: {},
  };
}

// A meeting brings one bot from each working floor to the 2F meeting table.
function meetingMembers(agents) {
  const want = ["chorong", "note", "card", "celly", "cut"];
  const ids = agents.map((a) => a.id);
  const picked = want.filter((id) => ids.includes(id));
  return picked.length >= 2 ? picked : ids.slice(0, 4);
}

class DemoOffice {
  constructor(config, emit) {
    this.config = config;
    this.emit = emit;
    this.P = textFor(config.lang);
    this.state = initialState(config);
    this.turn = 0;
  }

  // Keeps the demo office moving on its own.
  async start() {
    if (this.timer || process.env.OFFICE_DEMO_STILL) return;
    this.timer = setInterval(() => this.step(), Number(process.env.OFFICE_DEMO_STEP_MS || 4500));
    this.timer.unref?.();
  }

  step() {
    if (this.state.meeting.active) return;
    const agents = this.state.agents;
    const pick = (pred) => { const xs = agents.filter(pred); return xs[Math.floor(Math.random() * xs.length)]; };
    this.turn++;
    // 1) someone finishes and reports
    const doneOne = pick((a) => a.status === "working");
    if (doneOne) {
      const report = (this.P.work[doneOne.id] || ["", t(this.config.lang, "task_done_report")])[1];
      Object.assign(doneOne, { status: "done", task: report.length > 18 ? report.slice(0, 17) + "…" : report });
      this.state.feed.unshift({ agentId: doneOne.id, text: report, ts: now() });
    }
    // 2) someone rests, someone starts
    const rest = pick((a) => a.status === "done" && a !== doneOne);
    if (rest) Object.assign(rest, { status: "idle", task: "" });
    const starter = pick((a) => a.status === "idle");
    if (starter) Object.assign(starter, { status: "working", task: (this.P.work[starter.id] || [t(this.config.lang, "task_working")])[0] });
    // 3) every few turns, one bot asks for approval (only one at a time)
    if (this.turn % 4 === 0 && !agents.some((a) => a.status === "needs_approval")) {
      const ask = pick((a) => this.P.approvals[a.id] && a.status !== "needs_approval");
      if (ask) Object.assign(ask, { status: "needs_approval", task: this.P.approvals[ask.id] });
    }
    // 4) an approval nobody answered gets an auto "yes" in the demo, so the walk back is seen
    for (const a of agents) {
      if (a.status !== "needs_approval") continue;
      a.waited = (a.waited || 0) + 1;
      if (a.waited >= 3) { a.waited = 0; this.approve(a.id, "once", true); }
    }
    this.state.feed = this.state.feed.slice(0, 30);
    this.emit();
  }

  snapshot() {
    return this.state;
  }

  agent(id) {
    return this.state.agents.find((a) => a.id === id);
  }

  pushChat(agentId, msg) {
    (this.state.chats[agentId] ||= []).push({ ...msg, ts: now() });
  }

  async chat(agentId, text) {
    const a = this.agent(agentId);
    if (!a) throw new Error("unknown agent");
    this.pushChat(agentId, { role: "user", text });
    Object.assign(a, { status: "working", task: t(this.config.lang, "task_processing") });
    this.emit();
    setTimeout(() => {
      const reply = (this.P.work[agentId] || [])[1] || this.P.reply;
      this.pushChat(agentId, { role: "agent", text: reply, demo: true });
      Object.assign(a, { status: "done", task: t(this.config.lang, "task_done_report") });
      this.state.feed.unshift({ agentId, text: reply, ts: now() });
      this.emit();
    }, 2600);
    return { ok: true };
  }

  approve(agentId, choice, auto = false) {
    const a = this.agent(agentId);
    if (!a || a.status !== "needs_approval") return { ok: false };
    const ok = choice !== "deny";
    a.waited = 0;
    Object.assign(a, ok ? { status: "working", task: t(this.config.lang, "task_sending_reply") } : { status: "idle", task: "" });
    if (!auto) this.pushChat(agentId, { role: "user", text: ok ? t(this.config.lang, "chat_approve") : t(this.config.lang, "chat_deny") });
    const card = this.state.kanban.find((k) => k.assignee === agentId && k.status === "blocked");
    if (card) card.status = ok ? "running" : "todo";
    this.emit();
    if (ok) {
      setTimeout(() => {
        Object.assign(a, { status: "done", task: t(this.config.lang, "task_done_report") });
        if (card) card.status = "done";
        this.state.feed.unshift({ agentId, text: this.P.approvedFeed(this.P.approvals[agentId] || ""), ts: now() });
        this.emit();
      }, 2500);
    }
    return { ok: true };
  }

  // Meeting = a kanban card split into child cards for several agents.
  // In Hermes this maps to `hermes kanban decompose`, so the demo shows the same thing.
  startMeeting() {
    const members = meetingMembers(this.state.agents);
    this.state.meeting = { active: true, topic: this.P.meetTopic, members };
    for (const id of members) Object.assign(this.agent(id), { location: "meeting", status: "working", task: t(this.config.lang, "task_meeting") });
    this.emit();
    setTimeout(() => this.endMeeting(), Number(process.env.OFFICE_MEETING_MS || 9000));
    return { ok: true };
  }

  endMeeting() {
    if (!this.state.meeting.active) return;
    const kids = this.P.meetKids.map(([title, assignee]) => ({ title, assignee })).filter((k) => this.agent(k.assignee));
    kids.forEach((k, i) => this.state.kanban.push({ id: `m${Date.now()}${i}`, status: "todo", ...k }));
    for (const id of this.state.meeting.members) Object.assign(this.agent(id), { location: "desk", status: "idle", task: "" });
    const host = this.agent("note") ? "note" : this.state.meeting.members[0];
    this.state.feed.unshift({ agentId: host, text: this.P.meetDone(kids.length), ts: now() });
    this.state.meeting = { active: false, topic: "", members: [] };
    this.emit();
  }

  // Fixed poses for screenshots: ?scene=chat|meeting|kanban|skills
  scene(name) {
    this.state = initialState(this.config);
    if (name === "chat") {
      this.state.chats.card = [
        { role: "user", text: this.P.chatScene[0], ts: now() - 90000 },
        { role: "agent", text: this.P.chatScene[1], demo: true, ts: now() - 60000 },
        { role: "agent", text: this.P.approvals.card, demo: true, ts: now() - 5000 },
      ];
    }
    if (name === "meeting") {
      const members = meetingMembers(this.state.agents);
      this.state.meeting = { active: true, topic: this.P.meetTopic, members };
      for (const id of members) Object.assign(this.agent(id), { location: "meeting", status: "working", task: t(this.config.lang, "task_meeting") });
    }
    this.emit();
    return { ok: true };
  }
}

module.exports = { DemoOffice };
