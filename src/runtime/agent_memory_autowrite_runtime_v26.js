
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function findMemoryRoot() {
  const candidates = [
    path.join(ROOT, "yoru_memory"),
    path.join(ROOT, "memory"),
    ROOT
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "memory_short.md"))) {
      console.log("[memory-autowrite] memory root:", dir);
      return dir;
    }
  }

  console.warn("[memory-autowrite] fallback memory root used");
  return ROOT;
}

const memoryRoot = findMemoryRoot();

function append(file, content) {

  const target = path.join(memoryRoot, file);

  try {

    fs.appendFileSync(
      target,
      "\n" + content + "\n"
    );

    console.log("[memory-autowrite] updated:", file);

  } catch (err) {

    console.warn("[memory-autowrite] failed:", file);

  }

}

function updateShortMemory(text) {

  append(
    "memory_short.md",
    "### interaction\n" + text
  );

}

function updateReflection(text) {

  append(
    "reflection.md",
    "### reflection\n" + text
  );

}

function updateState(text) {

  append(
    "state.md",
    "### state_update\n" + text
  );

}

function memoryAutoWrite(responseText) {

  if (!responseText) return;

  updateShortMemory(responseText);

  updateReflection(
    "last_response_length=" + responseText.length
  );

  updateState(
    "last_response_timestamp=" + Date.now()
  );

}

module.exports = {
  memoryAutoWrite
};
