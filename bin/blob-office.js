#!/usr/bin/env node
// Usage:
//   npx hermes-blob-office            -> demo mode (sample data, no Hermes needed)
//   npx hermes-blob-office --hermes   -> read real state from Hermes on this computer
//   options: --port 4300, --config path/to/office.config.json (e.g. examples/en/office.config.json for English)
const { start } = require("../server");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

start({
  mode: flag("--hermes") ? "hermes" : "demo",
  port: Number(value("--port", process.env.PORT || 4300)),
  configPath: value("--config", process.env.OFFICE_CONFIG),
});
