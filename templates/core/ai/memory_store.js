'use strict';

const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '..', '..', 'data', 'sessions');
const sessionFile = path.join(dataDir, 'chat_session_v20.json');
let turns = [];

function load() {
  try {
    if (fs.existsSync(sessionFile)) {
      const parsed = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      turns = Array.isArray(parsed.turns) ? parsed.turns : [];
    }
  } catch { turns = []; }
}

function save() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify({ updated_at: new Date().toISOString(), turns }, null, 2), 'utf8');
}

function addTurn(turn) {
  if (!turn) return;
  turns.push({ ...turn, at: new Date().toISOString() });
  if (turns.length > 40) turns = turns.slice(-40);
  save();
}

function getRecentMessages(limit = 8) {
  if (!turns.length) load();
  return turns.slice(-Math.max(0, Number(limit) || 8));
}

load();
module.exports = { addTurn, getRecentMessages };
