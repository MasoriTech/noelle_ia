const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function safeRead(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function loadActiveAgent() {

  const configPath = path.join(ROOT, "config", "active_agent.json");

  let active = "yoru";

  try {
    const data = JSON.parse(fs.readFileSync(configPath));
    active = data.active_agent || active;
  } catch {}

  return active;

}

function loadSoul(agentName) {

  const candidatePaths = [
    path.join(ROOT, "agents", agentName, "soul.md"),
    path.join(ROOT, "soul.md")
  ];

  for (const p of candidatePaths) {

    const content = safeRead(p);

    if (content) {
      console.log("[agent-loader] soul.md loaded:", p);
      return content;
    }

  }

  console.warn("[agent-loader] soul.md not found");
  return "";

}

function buildSystemPrompt() {

  const agent = loadActiveAgent();

  const soul = loadSoul(agent);

  const systemPrompt = `ACTIVE_AGENT: ${agent}

${soul}
`;

  global.__NOELLE_ACTIVE_AGENT__ = agent;
  global.__NOELLE_SOUL_PROMPT__ = systemPrompt;

  console.log("[agent-loader] active agent:", agent);

  return systemPrompt;

}

module.exports = {
  buildSystemPrompt,
  loadActiveAgent
};