const test = require("node:test");
const assert = require("node:assert");
const { parseProfiles, parseSkills } = require("../server/hermes");
const { layoutAgents } = require("../server/layout");
const { t } = require("../server/i18n");

test("parseProfiles reads names with one or more spaces after them", () => {
  const text = [
    " Profile           Model        Gateway   Alias",
    " ◆default          gpt-x        running   —",
    "  dingcolabsoffice gpt-y        stopped   —",
  ].join("\n");
  assert.deepStrictEqual(parseProfiles(text), {
    default: { model: "gpt-x", gateway: "running" },
    dingcolabsoffice: { model: "gpt-y", gateway: "stopped" },
  });
});

test("parseSkills keeps enabled rows only", () => {
  const text = [
    "┃ Name   ┃ Category ┃ Source ┃ Trust ┃ Status   ┃",
    "│ notes  │          │ local  │ local │ enabled  │",
    "│ old    │          │ local  │ local │ disabled │",
  ].join("\n");
  assert.deepStrictEqual(parseSkills(text), ["notes"]);
});

test("layoutAgents puts bots on floors by job and gives each a look", () => {
  const config = { agents: [
    { id: "a", name: "메일봇", job: "메일 분류" },
    { id: "b", name: "shorts-maker", profile: "shorts-maker" },
    { id: "c", name: "x", floor: "oa", prop: "sheet" },
    { id: "d", name: "그냥봇" },
  ] };
  layoutAgents(config);
  const [a, b, c, d] = config.agents;
  assert.strictEqual(a.floor, "secretary");
  assert.strictEqual(a.look.prop, "envelope");
  assert.strictEqual(b.floor, "content");
  assert.strictEqual(b.look.prop, "camera");
  assert.strictEqual(c.floor, "oa");
  assert.strictEqual(c.look.prop, "sheet");
  assert.strictEqual(d.floor, "secretary");
  assert.notStrictEqual(a.look.color, d.look.color);
  assert.strictEqual(config.pages, 1);
});

test("a full floor opens building 2", () => {
  const config = { agents: Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, name: `mail${i}`, job: "메일" })) };
  layoutAgents(config);
  assert.deepStrictEqual(config.agents.map((x) => x.page), [1, 1, 1, 1, 1, 1, 2, 2]);
  assert.strictEqual(config.pages, 2);
});

test("i18n string table returns localized and formatted strings", () => {
  assert.strictEqual(t("ko", "msg_empty"), "메시지가 비어 있어요.");
  assert.strictEqual(t("en", "msg_empty"), "Message cannot be empty.");
  assert.strictEqual(t("en", "meeting_decompose_topic", "Launch", 3), "Launch · Splitting into 3 tasks");
  assert.strictEqual(t("unknown", "msg_empty"), "메시지가 비어 있어요.");
});

test("English demo uses English text and the English example config", () => {
  process.env.OFFICE_DEMO_STILL = "1";
  const fs = require("node:fs");
  const path = require("node:path");
  const { DemoOffice } = require("../server/demo");
  const config = layoutAgents(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", "en", "office.config.json"), "utf8")));
  const office = new DemoOffice(config, () => {});
  const s = office.snapshot();
  const korean = /[가-힣]/;
  assert.strictEqual(config.lang, "en");
  assert.ok(config.agents.every((a) => !korean.test(a.name) && !korean.test(a.job) && !korean.test(a.team)));
  assert.ok(s.kanban.every((k) => !korean.test(k.title)));
  assert.ok(s.agents.every((a) => !korean.test(a.task)));
  assert.ok(s.feed.every((f) => !korean.test(f.text)));
  office.startMeeting();
  assert.ok(!korean.test(office.state.meeting.topic));
});
