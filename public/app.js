// Front end: draws the building and the side panel from /api/events.
// Bots walk between their desk, the 2F meeting table and the 1F approval desk,
// taking the elevator when the floor changes.

const I18N = {
  ko: {
    title: "Blob Office", demo_mode: "데모 · 예시 데이터", hermes_connected: "헤르메스 연결됨", hermes_disconnected: "헤르메스 연결 안 됨",
    feed: "보고함", kanban: "칸반", skills: "스킬·연결", meeting_btn: "회의 열기", building_page: (n) => `${n}관`,
    status_working: "일하는 중", status_needs_approval: "승인 필요", status_done: "완료", status_idle: "대기", status_offline: "꺼짐",
    count_working: "일하는 중", count_needs_approval: "승인 대기", count_done: "방금 완료", count_meeting: "회의",
    col_todo: "할 일", col_running: "진행 중", col_blocked: "승인 대기", col_done: "완료",
    just_now: "방금", m_ago: (m) => `${m}분 전`, h_ago: (h) => `${Math.round(h)}시간 전`,
    demo_reply: "데모 응답", approval_needed: "승인이 필요해요", btn_approve: "진행해 주세요", btn_deny: "하지 마세요",
    chat_empty: (n) => `${n}에게 할 일을 말해 보세요.`, chat_placeholder: (n) => `${n}에게 말 걸기`, btn_send: "보내기",
    kanban_title: "칸반 보드", kanban_desc: "누가 무슨 일을 맡았는지 한눈에 봐요.", unassigned: "담당 없음",
    skills_title: "스킬·연결", skills_desc: "층마다 맡은 업무와, 봇마다 챙겨 준 스킬·연결 도구예요.", label_skills: "스킬", label_tools: "연결 도구", none: "없음",
    feed_title: "보고함", feed_desc: "봇들이 끝낸 일을 여기로 보고해요. 봇을 누르면 말을 걸 수 있어요.",
    feed_meeting_title: "회의 중", feed_meeting_desc: (topic) => `${topic} · 끝나면 칸반에 할 일이 생겨요.`, feed_empty: "아직 보고가 없어요.",
    meeting_sign: (topic, n) => `회의 중 · ${topic} (${n}명)`, approval_sign: "승인 데스크", moving: "이동 중",
  },
  en: {
    title: "Blob Office", demo_mode: "Demo · Sample Data", hermes_connected: "Hermes Connected", hermes_disconnected: "Hermes Disconnected",
    feed: "Feed", kanban: "Kanban", skills: "Skills", meeting_btn: "Start Meeting", building_page: (n) => `Bldg ${n}`,
    status_working: "Working", status_needs_approval: "Needs approval", status_done: "Done", status_idle: "Idle", status_offline: "Offline",
    count_working: "working", count_needs_approval: "waiting approval", count_done: "just done", count_meeting: "in meeting",
    col_todo: "To Do", col_running: "In Progress", col_blocked: "Needs Approval", col_done: "Done",
    just_now: "just now", m_ago: (m) => `${m}m ago`, h_ago: (h) => `${Math.round(h)}h ago`,
    demo_reply: "Demo response", approval_needed: "Approval needed", btn_approve: "Approve", btn_deny: "Deny",
    chat_empty: (n) => `Ask ${n} to do something.`, chat_placeholder: (n) => `Message ${n}`, btn_send: "Send",
    kanban_title: "Kanban Board", kanban_desc: "See at a glance who is doing what.", unassigned: "Unassigned",
    skills_title: "Skills & Tools", skills_desc: "What each floor does, and the skills and tools each bot has.", label_skills: "Skills", label_tools: "Connected Tools", none: "None",
    feed_title: "Feed", feed_desc: "Bots report finished work here. Click a bot to chat.",
    feed_meeting_title: "In Meeting", feed_meeting_desc: (topic) => `${topic} · Tasks will appear on Kanban when finished.`, feed_empty: "No reports yet.",
    meeting_sign: (topic, n) => `Meeting · ${topic} (${n})`, approval_sign: "Approval desk", moving: "on the move",
  },
};
const t = (key, ...args) => {
  const v = I18N[config?.lang === "en" ? "en" : "ko"][key] ?? I18N.ko[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
};

// ---- building geometry (matches assets/building.png, 1672×941) ----
const BG = "assets/building.png";
const W = 1672, H = 941;
const FLOOR_Y = { content: 272, sales: 422, oa: 570, secretary: 718, lobby: 884 };
const SLOT_X = [440, 610, 780, 950, 1110, 1250];
const LOBBY_X = [462, 840, 1230, 1010, 1110, 760];   // slot 0 sits behind the approval desk
const DESK_SLOT_Y = -60;                              // lobby slot 0 stands raised behind the desk
const LIFT_X = 1408;
const MEET_X = [960, 1040, 1120, 1195, 890, 1265];   // around the 2F round table
const ASK_X = [640, 720, 790, 860];                   // in front of the approval desk
const SIZE = 96, WALK = 190, LIFT = 300;              // px, px/s, px/s
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const params = new URLSearchParams(location.search);
let config, state, panel = { kind: "feed", agentId: null }, page = Number(params.get("page")) || 1;
const movers = {};   // id -> { x, y, floor, route: [], from, seg, look }

const agentCfg = (id) => config.agents.find((a) => a.id === id);
const agentState = (id) => state.agents.find((a) => a.id === id);
const floorInfo = (id) => config.floors.find((f) => f.id === id);
const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? t("just_now") : m < 60 ? t("m_ago", m) : t("h_ago", m / 60); };
const botOf = (a) => ({ id: a.id, name: a.name, shape: a.look.shape, color: a.look.color, eye: a.look.eye, acc: a.look.prop });
let faceN = 0;
const face = (a, cls = "face") => `<svg class="${cls}" viewBox="-14 -14 228 228">${botSVG(botOf(a), "idle", 0, 0, "m1", `f${faceN++}`)}</svg>`;

// ---- where should each bot be right now? ----
function homeOf(a) {
  if (a.floor === "lobby") return { floor: "lobby", x: LOBBY_X[a.slot] ?? SLOT_X[a.slot], raised: a.slot === 0 };
  return { floor: a.floor, x: SLOT_X[a.slot] };
}
function targetOf(a, s) {
  if (s.location === "meeting") {
    const i = Math.max(0, state.meeting.members.indexOf(a.id));
    return { floor: "secretary", x: MEET_X[i % MEET_X.length], spot: "meeting" };
  }
  if (s.status === "needs_approval" && !(a.floor === "lobby" && a.slot === 0)) {
    const askers = state.agents.filter((x) => x.status === "needs_approval").map((x) => x.id);
    const i = Math.max(0, askers.indexOf(a.id));
    return { floor: "lobby", x: ASK_X[i % ASK_X.length], spot: "ask" };
  }
  return { ...homeOf(a), spot: "home" };
}
const yOf = (floor, raised) => FLOOR_Y[floor] + (raised ? DESK_SLOT_Y : 0);

// Route: same floor -> walk; other floor -> walk to the lift, ride, walk out.
function plan(m, dest) {
  const route = [];
  if (m.floor === dest.floor) route.push({ x: dest.x, y: yOf(dest.floor, dest.raised), floor: dest.floor });
  else {
    route.push({ x: LIFT_X, y: yOf(m.floor), floor: m.floor });
    route.push({ x: LIFT_X, y: yOf(dest.floor), floor: dest.floor, lift: true });
    route.push({ x: dest.x, y: yOf(dest.floor, dest.raised), floor: dest.floor });
  }
  m.route = route; m.dest = dest; m.seg = null;
}
function syncMovers() {
  for (const a of config.agents) {
    const s = agentState(a.id); if (!s) continue;
    const dest = targetOf(a, s);
    let m = movers[a.id];
    if (!m) { const h = homeOf(a); m = movers[a.id] = { x: h.x, y: yOf(h.floor, h.raised), floor: h.floor, route: [], dest: h }; }
    const same = m.dest && m.dest.floor === dest.floor && m.dest.x === dest.x;
    if (!same) {
      // leaving the raised desk spot: step down first
      if (m.y !== FLOOR_Y[m.floor] && !m.route.length) m.y = FLOOR_Y[m.floor];
      plan(m, dest);
    }
  }
}
function advance(dt) {
  for (const id in movers) {
    const m = movers[id];
    if (!m.route.length) { m.moving = false; m.riding = false; m.vx = 0; continue; }
    const p = m.route[0];
    if (!m.seg) m.seg = { x0: m.x, y0: m.y, d: Math.max(1, Math.hypot(p.x - m.x, p.y - m.y)), u: 0 };
    const speed = p.lift ? LIFT : WALK;
    m.seg.u = Math.min(1, m.seg.u + (speed * dt) / m.seg.d);
    const k = p.lift ? ease(m.seg.u) : m.seg.u;
    const nx = m.seg.x0 + (p.x - m.seg.x0) * k;
    m.vx = (nx - m.x) / Math.max(dt, 1e-3);
    m.x = nx; m.y = m.seg.y0 + (p.y - m.seg.y0) * k;
    m.moving = true; m.riding = !!p.lift;
    if (m.seg.u >= 1) { m.floor = p.floor; m.route.shift(); m.seg = null; }
  }
}

// ---- drawing ----
const EXPR = { working: "work", needs_approval: "think", done: "done", idle: "idle", offline: "sleep" };
function exprOf(a, s, m) {
  if (m.moving && !m.riding) return "walk";
  if (m.riding) return "idle";
  if (s.location === "meeting") return "talk";
  if (s.status === "needs_approval") return m.dest.spot === "ask" ? "talk" : "think";
  return EXPR[s.status] || "idle";
}
function tagSVG(x, y, text, dot, strong) {
  const w = Math.min(260, [...text].length * 12.5 + 30);
  return `<g class="tag" transform="translate(${x - w / 2} ${y})"><rect x="-2" y="-2" width="${w + 4}" height="24" rx="11" fill="#3d3733"/><rect class="fill" width="${w}" height="20" rx="10" fill="${strong ? "#fff1d6" : "#fffaf3"}"/><circle cx="12" cy="10" r="4" fill="${dot}"/><text x="21" y="14.5" font-size="12" font-weight="800" fill="#3d3733">${esc(text)}</text></g>`;
}
const DOT = { working: "#3b82f6", needs_approval: "#f59e0b", done: "#22c55e", idle: "#9ca3af", offline: "#c4bbb2" };

function draw(ms) {
  if (!state) return;
  const tt = (ms % LOOP) / LOOP;
  let s = `<defs><clipPath id="desk"><rect x="408" y="810" width="286" height="90" rx="14"/></clipPath></defs><image href="${BG}" width="${W}" height="${H}"/>`;
  // floor labels
  for (const f of config.floors) {
    const y = FLOOR_Y[f.id] - 128, label = `${f.f} ${config.lang === "en" ? f.en : f.ko}`, w = [...label].length * 12.5 + 40;
    s += `<g transform="translate(24 ${y})"><rect x="-2.5" y="-2.5" width="${w + 5}" height="31" rx="15" fill="#3d3733"/><rect width="${w}" height="26" rx="13" fill="#fffaf3"/><circle cx="14" cy="13" r="5" fill="${f.accent}"/><text x="26" y="18" font-size="13" font-weight="800" fill="#3d3733">${esc(label)}</text></g>`;
  }
  const shown = config.agents.filter((a) => a.page === page || agentState(a.id)?.location === "meeting");
  // elevator cars for riders (and one parked car when nobody rides)
  const riders = shown.filter((a) => movers[a.id]?.riding);
  const cars = riders.length ? riders.map((a) => movers[a.id].y) : [FLOOR_Y.lobby];
  for (const y of cars) s += `<g transform="translate(${LIFT_X - 46} ${y - 124})"><rect width="92" height="126" rx="12" fill="#fffaf3" stroke="#3d3733" stroke-width="3"/><rect x="6" y="6" width="80" height="114" rx="8" fill="#efe6da"/></g>`;
  // the lobby desk owner first, then the desk drawn over them, then everyone else
  const order = shown.slice().sort((a, b) => ((b.floor === "lobby" && b.slot === 0 && !movers[b.id]?.moving) ? 1 : 0) - ((a.floor === "lobby" && a.slot === 0 && !movers[a.id]?.moving) ? 1 : 0));
  const tags = [];
  let deskDrawn = false;
  for (const a of order) {
    const st = agentState(a.id), m = movers[a.id];
    if (!st || !m) continue;
    const owner = a.floor === "lobby" && a.slot === 0 && !m.moving && m.dest.spot === "home";
    if (!owner && !deskDrawn) { s += `<image href="${BG}" width="${W}" height="${H}" clip-path="url(#desk)"/>`; deskDrawn = true; }
    // body turns toward where it walks, or toward the meeting table / the visitor
    let turn = m.moving && !m.riding ? clamp(m.vx / 60, -1, 1) : 0;
    if (!m.moving && st.location === "meeting") turn = clamp((1080 - m.x) / 160, -1, 1) * 0.6;
    if (!m.moving && m.dest.spot === "ask") turn = clamp((462 - m.x) / 200, -1, 1) * 0.6;
    if (owner && state.agents.some((x) => x.status === "needs_approval" && movers[x.id]?.dest.spot === "ask" && !movers[x.id].moving)) turn = 0.55;
    const expr = exprOf(a, st, m);
    const body = botSVG(botOf(a), expr, tt, (a.slot + 1) * 0.17, "m1fast", `a${a.id}`, { turn, lean: m.moving && !m.riding ? turn * 6 : 0 });
    const h = expr === "walk" ? hop((tt * 6) % 1, 0, 0.78) : 0;
    const dim = st.status === "offline" ? ` opacity="0.55"` : "";
    s += `<g class="bot" data-id="${a.id}"${dim}><ellipse cx="${m.x}" cy="${m.y + 1}" rx="${SIZE * 0.3 * (1 - 0.3 * h)}" ry="${SIZE * 0.06}" fill="#3d3733" opacity="${0.2 * (1 - 0.4 * h)}"/>` +
      `<svg x="${m.x - SIZE / 2}" y="${m.y - SIZE * 0.86}" width="${SIZE}" height="${SIZE}" viewBox="-10 -10 220 220" overflow="visible">${body}</svg>` +
      `<rect x="${m.x - SIZE / 2}" y="${m.y - SIZE}" width="${SIZE}" height="${SIZE}" fill="transparent"/></g>`;
    const label = m.moving ? `${a.name} · ${t("moving")}` : st.status === "needs_approval" ? `${a.name} · ${st.task}` : a.name;
    tags.push({ y: m.y, html: tagSVG(m.x, owner ? FLOOR_Y.lobby - 34 : m.y - SIZE * 0.86 - 20, label.length > 22 ? label.slice(0, 21) + "…" : label, DOT[st.status] || DOT.idle, st.status === "needs_approval") });
  }
  if (!deskDrawn) s += `<image href="${BG}" width="${W}" height="${H}" clip-path="url(#desk)"/>`;
  s += tags.sort((p, q) => p.y - q.y).map((x) => x.html).join("");
  // signs
  if (state.meeting.active) s += signSVG(1040, FLOOR_Y.secretary - 140, t("meeting_sign", state.meeting.topic, state.meeting.members.length), "#ffd166");
  if (state.agents.some((x) => x.status === "needs_approval")) s += signSVG(640, FLOOR_Y.lobby - 128, `! ${t("approval_sign")}`, "#fff1d6");
  $("#stage").innerHTML = s;
}
function signSVG(cx, y, text, fill) {
  const w = [...text].length * 13 + 30;
  return `<g transform="translate(${cx - w / 2} ${y})"><rect x="-3" y="-3" width="${w + 6}" height="34" rx="15" fill="#3d3733"/><rect width="${w}" height="28" rx="13" fill="${fill}"/><text x="${w / 2}" y="19" text-anchor="middle" font-size="13" font-weight="900" fill="#3d3733">${esc(text)}</text></g>`;
}

// ---- top bar and panel ----
function renderTop() {
  $("#title").textContent = state.title;
  const badge = $("#mode");
  badge.textContent = state.mode === "demo" ? t("demo_mode") : state.connected ? t("hermes_connected") : t("hermes_disconnected");
  badge.classList.toggle("live", state.mode === "hermes" && state.connected);
  const n = (k) => state.agents.filter((a) => a.status === k).length;
  const meet = state.meeting.active ? state.meeting.members.length : 0;
  $("#counts").innerHTML = [["working", n("working") - meet, DOT.working], ["needs_approval", n("needs_approval"), DOT.needs_approval], ["done", n("done"), DOT.done], ["meeting", meet, "#ffd166"]]
    .filter(([, v]) => v > 0).map(([k, v, c]) => `<span><i style="background:${c}"></i>${t(`count_${k}`)} ${v}</span>`).join("");
  const pg = $("#pages");
  pg.hidden = (config.pages || 1) < 2;
  pg.innerHTML = Array.from({ length: config.pages || 1 }, (_, i) => `<button data-page="${i + 1}" class="${i + 1 === page ? "on" : ""}">${t("building_page", i + 1)}</button>`).join("");
  pg.querySelectorAll("button").forEach((b) => (b.onclick = () => { page = Number(b.dataset.page); renderTop(); }));
}
function openPanel(kind, agentId = null) {
  panel = { kind, agentId };
  document.querySelectorAll("[data-panel]").forEach((b) => b.classList.toggle("on", b.dataset.panel === kind));
  if (state) renderPanel();
}
function renderPanel() {
  const p = $("#panel");
  const notes = (state.notes || []).map((n) => `<div class="note">${esc(n)}</div>`).join("");
  if (panel.kind === "chat" && agentCfg(panel.agentId)) return renderChat(p, notes);
  if (panel.kind === "kanban") return renderKanban(p, notes);
  if (panel.kind === "skills") return renderSkills(p, notes);
  return renderFeed(p, notes);
}
function renderChat(p, notes) {
  const a = agentCfg(panel.agentId), s = agentState(a.id), fl = floorInfo(a.floor);
  const msgs = (state.chats[a.id] || []).map((m) => `<div class="msg msg-${m.role}">${esc(m.text)}${m.demo ? `<span class="demo">${t("demo_reply")}</span>` : ""}</div>`).join("");
  const approval = s.status === "needs_approval" ? `<div class="approve"><strong>${t("approval_needed")}</strong><br>${esc(s.task)}<div class="row"><button class="btn" data-approve="once">${t("btn_approve")}</button><button class="btn ghost" data-approve="deny">${t("btn_deny")}</button></div></div>` : "";
  const old = p.querySelector(".composer input"), keep = old?.value || "";
  const focused = old && document.activeElement === old;
  p.innerHTML = `<div class="p-head"><div class="who">${face(a)}<div><h2>${esc(a.name)}</h2><p>${esc(fl ? `${fl.f} ${config.lang === "en" ? fl.en : fl.ko}` : "")} · ${esc(a.job || a.team || "")}<br>${t(`status_${s.status}`)}${s.task ? ` · ${esc(s.task)}` : ""}</p></div></div></div>
    <div class="p-body">${notes}${approval}${msgs || `<p style="color:var(--muted);font-size:13px">${esc(t("chat_empty", a.name))}</p>`}</div>
    <form class="composer"><input placeholder="${esc(t("chat_placeholder", a.name))}" value="${esc(keep)}" /><button>${t("btn_send")}</button></form>`;
  const body = p.querySelector(".p-body"); body.scrollTop = body.scrollHeight;
  if (focused) p.querySelector(".composer input").focus();
  p.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = p.querySelector("input"), text = input.value.trim();
    if (!text) return;
    input.value = "";
    const r = await post("/api/chat", { agentId: a.id, text });
    if (r.error) alert(r.error);
  });
  p.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => post("/api/approve", { agentId: a.id, choice: b.dataset.approve })));
}
function renderKanban(p, notes) {
  const cols = ["todo", "running", "blocked", "done"].map((k) => {
    const cards = state.kanban.filter((c) => c.status === k);
    return `<div class="col ${k}"><h3>${t(`col_${k}`)}<span>${cards.length}</span></h3>${cards.map((c) => {
      const a = c.assignee && agentCfg(c.assignee);
      return `<div class="card">${esc(c.title)}<div class="by">${a ? `${face(a, "face sm")}${esc(a.name)}` : esc(c.assigneeProfile || t("unassigned"))}</div></div>`;
    }).join("")}</div>`;
  }).join("");
  p.innerHTML = `<div class="p-head"><h2>${t("kanban_title")}</h2><p>${t("kanban_desc")}</p></div><div class="p-body">${notes}<div class="cols">${cols}</div></div>`;
}
function renderSkills(p, notes) {
  const groups = config.floors.map((f) => {
    const list = config.agents.filter((a) => a.floor === f.id);
    if (!list.length) return "";
    return `<div class="floor-group"><h3><i style="background:${f.accent}"></i>${f.f} ${esc(config.lang === "en" ? f.en : f.ko)}</h3>${list.map((a) => {
      const sk = state.skills[a.id] || { skills: [], connectors: [] };
      return `<div class="staff"><div class="who">${face(a)}<div><strong>${esc(a.name)}</strong><span class="job">${esc(a.job || a.team || "")}</span></div></div>
        <div class="label">${t("label_skills")}</div><div class="chips">${sk.skills.map((x) => `<span class="chip">${esc(x)}</span>`).join("") || `<span class="chip">${t("none")}</span>`}</div>
        ${sk.connectors.length ? `<div class="label">${t("label_tools")}</div><div class="chips">${sk.connectors.map((x) => `<span class="chip conn">${esc(x)}</span>`).join("")}</div>` : ""}</div>`;
    }).join("")}</div>`;
  }).join("");
  p.innerHTML = `<div class="p-head"><h2>${t("skills_title")}</h2><p>${t("skills_desc")}</p></div><div class="p-body">${notes}${groups}</div>`;
}
function renderFeed(p, notes) {
  const items = state.feed.map((f) => {
    const a = agentCfg(f.agentId); if (!a) return "";
    const fl = floorInfo(a.floor);
    return `<div class="feed-item">${face(a)}<div><strong>${esc(a.name)}</strong>${fl ? `<span class="floor" style="background:${fl.accent}">${fl.f}</span>` : ""}<time>${ago(f.ts)}</time><br>${esc(f.text)}</div></div>`;
  }).join("");
  p.innerHTML = `<div class="p-head"><h2>${state.meeting.active ? t("feed_meeting_title") : t("feed_title")}</h2><p>${state.meeting.active ? esc(t("feed_meeting_desc", state.meeting.topic)) : t("feed_desc")}</p></div><div class="p-body">${notes}${items || `<p style="color:var(--muted);font-size:13px">${t("feed_empty")}</p>`}</div>`;
}

async function post(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  return r.json();
}
async function loadConfig() {
  config = await (await fetch("/api/config")).json();
  document.documentElement.lang = config.lang || "ko";
  document.title = t("title");
  for (const [sel, key] of [["[data-panel='feed']", "feed"], ["[data-panel='kanban']", "kanban"], ["[data-panel='skills']", "skills"], ["#meetingBtn", "meeting_btn"]]) $(sel).textContent = t(key);
  const lead = config.agents[0];
  if (lead) $("#logoBot").innerHTML = botSVG(botOf(lead), "idle", 0, 0, "m1", "logo");
  page = Math.min(page, config.pages || 1);
}
async function boot() {
  await loadConfig();
  document.querySelectorAll("[data-panel]").forEach((b) => b.addEventListener("click", () => openPanel(b.dataset.panel)));
  $("#meetingBtn").addEventListener("click", async () => { const r = await post("/api/meeting"); if (r.error) alert(r.error); });
  $("#stage").addEventListener("click", (e) => { const g = e.target.closest(".bot"); if (g) openPanel("chat", g.dataset.id); });
  const scene = params.get("scene");
  if (scene) {
    await post("/api/scene", { name: scene });
    openPanel(scene === "chat" ? "chat" : scene === "meeting" ? "feed" : scene, scene === "chat" ? params.get("agent") || "card" : null);
  } else openPanel("feed");
  const es = new EventSource("/api/events");
  es.onmessage = async (e) => {
    state = JSON.parse(e.data);
    if (state.agents.length !== config.agents.length || (state.layoutId && state.layoutId !== config.layoutId)) await loadConfig();
    syncMovers(); renderTop(); renderPanel();
  };
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!window.__frozen) { advance(dt); draw(now); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// For screenshots: step the scene by hand.
window.__step = (ms, steps = 1) => { window.__frozen = true; for (let i = 0; i < steps; i++) advance(0.04); draw(ms); };
boot();
