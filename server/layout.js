// Floors, looks and slots for any number of bots.
//
// Each floor of the building is one kind of work. A bot lands on a floor by its `floor`
// field, or by keywords in its job/name/team/profile. Its look is made from the floor
// (body shape + colour family) and its job (the prop it holds), so every new bot looks
// a little different without any drawing. When a floor is full (FLOOR_CAP bots), the next
// bots of that floor go to building 2 ("2관"), and so on.

const FLOOR_CAP = 6;

// Top floor first, the order they are drawn.
const FLOORS = [
  { id: "content",   f: "5F", ko: "콘텐츠 스튜디오", en: "Content Studio", accent: "#e8457f",
    shapes: ["tri", "clover"], colors: ["#ff2d87", "#c03bd1", "#ff5fa2", "#e8457f", "#b0306a", "#d94fc0"],
    props: ["bulb", "camera", "stack", "clock", "chart"],
    words: ["콘텐츠", "릴스", "쇼츠", "영상", "채널", "유튜브", "인스타", "게시", "content", "video", "reels", "shorts", "youtube", "channel"] },
  { id: "sales",     f: "4F", ko: "영업·홍보실", en: "Sales & Marketing", accent: "#ff7a1a",
    shapes: ["square", "cloud"], colors: ["#ff7a1a", "#ff9a3c", "#f26a1b", "#ff8c2a", "#e8601a", "#ffa94d"],
    props: ["case", "palette", "megaphone"],
    words: ["영업", "홍보", "견적", "제안", "카드뉴스", "마케팅", "광고", "sales", "marketing", "proposal", "quote", "promo"] },
  { id: "oa",        f: "3F", ko: "OA·데이터실", en: "Docs & Data", accent: "#2f6bff",
    shapes: ["square", "cloud"], colors: ["#2f6bff", "#4f5bd5", "#3b82f6", "#2563eb", "#5a8dff", "#3f51b5"],
    props: ["sheet", "slides", "marker", "sigma", "magnifier"],
    words: ["엑셀", "ppt", "피피티", "문서", "시트", "데이터", "리뷰", "설문", "집계", "그래프", "리서치", "조사", "excel", "sheet", "slide", "doc", "data", "survey", "research"] },
  { id: "secretary", f: "2F", ko: "비서실", en: "Assistant Office", accent: "#16c26b",
    shapes: ["drop", "clover"], colors: ["#16c26b", "#2fb36a", "#0ea371", "#1f9d55", "#4cc38a", "#12b886"],
    props: ["envelope", "notebook", "calendar", "clipboard", "antenna"],
    words: ["메일", "회의록", "일정", "보고", "소식", "뉴스", "비서", "mail", "minutes", "calendar", "schedule", "report", "news", "assistant", "secretary"] },
  { id: "lobby",     f: "1F", ko: "로비 · 승인 데스크", en: "Lobby & Approvals", accent: "#c9a227",
    shapes: ["dome", "drop"], colors: ["#f4f4f5", "#ffc83d", "#b8a99a", "#e9d8a6", "#d6ccc2", "#ffd166"],
    props: ["stamp", "brief", "box"],
    words: ["승인", "브리핑", "대표", "팀장", "실장", "헤르메스", "총괄", "approve", "approval", "brief", "lead", "manager", "hermes", "default"] },
];

// Job keyword -> prop. First match wins.
const PROP_WORDS = [
  ["stamp", ["승인", "approve"]], ["brief", ["브리핑", "실장", "brief"]], ["box", ["헤르메스", "이사", "옮기", "hermes", "migrat"]],
  ["envelope", ["메일", "mail"]], ["notebook", ["회의록", "minutes", "note"]], ["calendar", ["일정", "calendar", "schedule"]],
  ["clipboard", ["보고", "report"]], ["antenna", ["소식", "뉴스", "추적", "news", "trend"]],
  ["sheet", ["엑셀", "excel"]], ["slides", ["ppt", "피피티", "발표", "slide"]], ["marker", ["요약", "서식", "summary", "doc"]],
  ["sigma", ["시트", "집계", "sheet"]], ["magnifier", ["리뷰", "설문", "조사", "리서치", "review", "survey", "research"]],
  ["case", ["견적", "제안", "proposal", "quote"]], ["palette", ["카드뉴스", "디자인", "design", "card"]], ["megaphone", ["홍보", "문구", "광고", "promo", "copy"]],
  ["bulb", ["주제", "아이디어", "기획", "idea"]], ["camera", ["쇼츠", "릴스", "영상", "촬영", "video", "reels", "shorts"]],
  ["stack", ["여러 편", "대량", "batch"]], ["clock", ["예약", "게시", "schedule"]], ["chart", ["반응", "숫자", "통계", "판매", "analytics", "stats"]],
];

const LIGHT = new Set(["#f4f4f5", "#ffc83d", "#b8a99a", "#e9d8a6", "#d6ccc2", "#ffd166"]);

const text = (a) => [a.job, a.name, a.profile].filter(Boolean).join(" ").toLowerCase();

function floorOf(a) {
  if (a.floor && FLOORS.some((f) => f.id === a.floor)) return a.floor;
  const s = text(a);
  const hit = FLOORS.find((f) => f.words.some((w) => s.includes(w.toLowerCase())));
  return hit ? hit.id : "secretary";
}

function propOf(a, floor, i) {
  if (a.prop) return a.prop;
  const s = text(a);
  const hit = PROP_WORDS.find(([, ws]) => ws.some((w) => s.includes(w.toLowerCase())));
  return hit ? hit[0] : floor.props[i % floor.props.length];
}

function layoutAgents(config) {
  const count = {};
  config.agents.forEach((a) => {
    a.floor = floorOf(a);
    const fl = FLOORS.find((f) => f.id === a.floor);
    const i = (count[a.floor] = (count[a.floor] || 0) + 1) - 1;
    const color = a.color || fl.colors[i % fl.colors.length];
    a.look = { shape: a.shape || fl.shapes[i % fl.shapes.length], color, prop: propOf(a, fl, i), eye: LIGHT.has(color) ? "#111" : "#fff" };
    a.page = Math.floor(i / FLOOR_CAP) + 1;
    a.slot = i % FLOOR_CAP;
    a.team ||= config.lang === "en" ? fl.en : fl.ko;
  });
  config.floors = FLOORS.map(({ words, ...f }) => f);
  config.floorCap = FLOOR_CAP;
  config.pages = Math.max(1, ...config.agents.map((a) => a.page));
  return config;
}

module.exports = { FLOORS, FLOOR_CAP, floorOf, layoutAgents };
