// Demo mode: example data only. Nothing here talks to Hermes.
// Every reply is tagged so viewers can tell it is sample data.
// The office keeps itself busy: bots finish work, pick up new work, and now and then
// one of them needs your approval and walks down to the lobby.

const now = () => Date.now();
const { t } = require("./i18n");

// What each bot is busy with, and what it reports when done.
const WORK = {
  moa:       ["승인 대기열 확인", "오늘 승인 4건 처리했어요."],
  chorong:   ["아침 브리핑 정리", "아침 브리핑 보냈어요. 오늘 일정 3개, 승인 대기 1건이에요."],
  her:       ["루틴을 헤르메스로 옮기는 중", "채널 운영 루틴 2개를 헤르메스로 옮겼어요."],
  letter:    ["받은 메일 분류 중", "메일 12통 분류했어요. 답장 초안 3개 써 뒀어요."],
  note:      ["회의록 정리 중", "회의록 정리하고 할 일 5개를 담당자에게 배정했어요."],
  cally:     ["다음 주 회의 시간 맞추는 중", "목요일 오후 2시로 회의 잡았어요. 초대장 보냈어요."],
  weekly:    ["주간 보고 초안 쓰는 중", "주간 보고 초안 올렸어요. 숫자 3곳만 확인해 주세요."],
  antenna:   ["업계 소식 훑는 중", "오늘 업계 소식 5개 요약했어요. X 반응이 큰 건 2개예요."],
  celly:     ["매출 엑셀 정리 중", "매출 엑셀 정리하고 월별 그래프 붙였어요."],
  slidey:    ["회의 자료 PPT 만드는 중", "회의 자료 PPT 8장 초안 만들었어요."],
  yoyak:     ["계약서 요약 중", "계약서 12쪽을 1쪽으로 요약하고 서식 맞췄어요."],
  sigma:     ["시트 자동 집계 돌리는 중", "구글 시트 집계 끝났어요. 이번 주 신청 47건이에요."],
  gureum:    ["고객 리뷰 분석 중", "리뷰 120개 분석했어요. 불만 1위는 배송 속도예요."],
  bureung:   ["견적서 초안 쓰는 중", "견적서 초안 2건 만들었어요."],
  card:      ["카드뉴스 6장 만드는 중", "카드뉴스 6장 완성했어요."],
  hwakseong: ["채널별 홍보 문구 쓰는 중", "인스타·블로그·X용 홍보 문구 3종 썼어요."],
  idea:      ["다음 주 주제 찾는 중", "다음 주 주제 후보 5개 골랐어요."],
  cut:       ["쇼츠 한 편 편집 중", "쇼츠 한 편 완성하고 자막까지 검수했어요."],
  copy:      ["같은 틀로 3편 만드는 중", "같은 틀로 쇼츠 3편 더 만들었어요."],
  timer:     ["예약 게시 걸어 두는 중", "내일 아침 7시 게시 예약 걸어 뒀어요."],
  graphy:    ["반응 숫자 모으는 중", "이번 주 조회수·저장 수 기록했어요. 링크 클릭 31회예요."],
};

// Work that should not go out without you.
const APPROVALS = {
  card:      "카드뉴스 6장, 인스타에 게시해도 될까요?",
  letter:    "고객 3명에게 답장 보내도 될까요?",
  bureung:   "견적서를 거래처에 보내도 될까요?",
  timer:     "내일 아침 7시 예약 게시 걸어도 될까요?",
  hwakseong: "홍보 문구를 X에 올려도 될까요?",
};

const SKILLS = {
  moa: [["승인 규칙", "결제 한도 확인"], ["텔레그램"]], chorong: [["아침 브리핑", "일 나눠 맡기기"], ["구글 캘린더", "텔레그램"]],
  her: [["루틴 옮기기"], ["헤르메스"]], letter: [["메일 분류", "답장 초안"], ["Gmail"]], note: [["회의록 정리", "할 일 배정"], ["노션"]],
  cally: [["회의 시간 조율"], ["구글 캘린더"]], weekly: [["주간 보고 양식"], ["구글 문서"]], antenna: [["업계 소식 요약", "X 실시간 추적"], ["웹 브라우저", "X"]],
  celly: [["엑셀 정리", "그래프 만들기"], ["엑셀"]], slidey: [["PPT 초안"], ["파워포인트"]], yoyak: [["문서 요약", "서식 맞추기"], ["구글 문서"]],
  sigma: [["시트 자동 집계"], ["구글 시트"]], gureum: [["리뷰 분석", "설문 정리"], ["구글 폼"]], bureung: [["견적서 양식", "제안서 초안"], ["Gmail", "구글 시트"]],
  card: [["카드뉴스 템플릿"], ["캔바", "인스타그램"]], hwakseong: [["채널별 문구 규칙"], ["인스타그램", "X"]], idea: [["주제 찾기"], ["유튜브", "웹 브라우저"]],
  cut: [["쇼츠 편집", "자막 검수"], ["캡컷"]], copy: [["같은 틀로 여러 편"], ["캡컷"]], timer: [["예약 게시", "채널별 규칙"], ["유튜브", "인스타그램"]],
  graphy: [["반응 기록", "판매 연결"], ["구글 시트"]],
};

function initialState(config) {
  const agents = config.agents.map((a) => ({ id: a.id, name: a.name, team: a.team, profile: a.profile, floor: a.floor, status: "idle", task: "", location: "desk" }));
  const set = (id, status, task) => { const a = agents.find((x) => x.id === id); if (a) Object.assign(a, { status, task: task ?? (WORK[id] || [""])[0] }); };
  ["letter", "note", "celly", "slidey", "gureum", "bureung", "cut", "idea", "antenna"].forEach((id) => set(id, "working"));
  set("chorong", "done", "아침 브리핑 보냈어요");
  set("graphy", "done", "반응 숫자 기록 끝");
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
    kanban: [
      { id: "t1", title: "카드뉴스 6장 게시", status: "blocked", assignee: "card" },
      { id: "t2", title: "받은 메일 분류·답장 초안", status: "running", assignee: "letter" },
      { id: "t3", title: "매출 엑셀 그래프 보고서", status: "running", assignee: "celly" },
      { id: "t4", title: "회의 자료 PPT 8장", status: "running", assignee: "slidey" },
      { id: "t5", title: "쇼츠 한 편 완성·검수", status: "running", assignee: "cut" },
      { id: "t6", title: "다음 주 주제 후보", status: "todo", assignee: "idea" },
      { id: "t7", title: "견적서 초안 2건", status: "running", assignee: "bureung" },
      { id: "t8", title: "아침 브리핑", status: "done", assignee: "chorong" },
      { id: "t9", title: "반응 숫자 기록", status: "done", assignee: "graphy" },
      { id: "t10", title: "루틴 헤르메스로 옮기기", status: "todo", assignee: "her" },
    ],
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
      const report = (WORK[doneOne.id] || ["", t(this.config.lang, "task_done_report")])[1];
      Object.assign(doneOne, { status: "done", task: report.length > 18 ? report.slice(0, 17) + "…" : report });
      this.state.feed.unshift({ agentId: doneOne.id, text: report, ts: now() });
    }
    // 2) someone rests, someone starts
    const rest = pick((a) => a.status === "done" && a !== doneOne);
    if (rest) Object.assign(rest, { status: "idle", task: "" });
    const starter = pick((a) => a.status === "idle");
    if (starter) Object.assign(starter, { status: "working", task: (WORK[starter.id] || [t(this.config.lang, "task_working")])[0] });
    // 3) every few turns, one bot asks for approval (only one at a time)
    if (this.turn % 4 === 0 && !agents.some((a) => a.status === "needs_approval")) {
      const ask = pick((a) => APPROVALS[a.id] && a.status !== "needs_approval");
      if (ask) Object.assign(ask, { status: "needs_approval", task: APPROVALS[ask.id] });
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
      const reply = (WORK[agentId] || [])[1] || (this.config.lang === "en" ? "Understood. I will let you know when finished." : "알겠어요. 끝나면 알려 드릴게요.");
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
        this.state.feed.unshift({ agentId, text: `${(APPROVALS[agentId] || "").replace(/(해도 될까요\?|걸어도 될까요\?|올려도 될까요\?|보내도 될까요\?)$/, "")} → 승인받고 처리했어요.`, ts: now() });
        this.emit();
      }, 2500);
    }
    return { ok: true };
  }

  // Meeting = a kanban card split into child cards for several agents.
  // In Hermes this maps to `hermes kanban decompose`, so the demo shows the same thing.
  startMeeting() {
    const members = meetingMembers(this.state.agents);
    this.state.meeting = { active: true, topic: "신제품 출시 준비, 할 일 나누기", members };
    for (const id of members) Object.assign(this.agent(id), { location: "meeting", status: "working", task: t(this.config.lang, "task_meeting") });
    this.emit();
    setTimeout(() => this.endMeeting(), Number(process.env.OFFICE_MEETING_MS || 9000));
    return { ok: true };
  }

  endMeeting() {
    if (!this.state.meeting.active) return;
    const kids = [
      { title: "출시 카드뉴스 6장", assignee: "card" },
      { title: "출시 쇼츠 대본", assignee: "cut" },
      { title: "비슷한 상품 가격 비교표", assignee: "celly" },
    ].filter((k) => this.agent(k.assignee));
    kids.forEach((k, i) => this.state.kanban.push({ id: `m${Date.now()}${i}`, status: "todo", ...k }));
    for (const id of this.state.meeting.members) Object.assign(this.agent(id), { location: "desk", status: "idle", task: "" });
    const host = this.agent("note") ? "note" : this.state.meeting.members[0];
    this.state.feed.unshift({ agentId: host, text: `출시 준비 할 일 ${kids.length}개로 나눠서 맡겼어요.`, ts: now() });
    this.state.meeting = { active: false, topic: "", members: [] };
    this.emit();
  }

  // Fixed poses for screenshots: ?scene=chat|meeting|kanban|skills
  scene(name) {
    this.state = initialState(this.config);
    if (name === "chat") {
      this.state.chats.card = [
        { role: "user", text: "출시 카드뉴스 6장 만들어 줘", ts: now() - 90000 },
        { role: "agent", text: "6장 만들었어요. 1장은 표지, 5장은 기능 소개예요.", demo: true, ts: now() - 60000 },
        { role: "agent", text: APPROVALS.card, demo: true, ts: now() - 5000 },
      ];
    }
    if (name === "meeting") {
      const members = meetingMembers(this.state.agents);
      this.state.meeting = { active: true, topic: "신제품 출시 준비, 할 일 나누기", members };
      for (const id of members) Object.assign(this.agent(id), { location: "meeting", status: "working", task: t(this.config.lang, "task_meeting") });
    }
    this.emit();
    return { ok: true };
  }
}

module.exports = { DemoOffice };
