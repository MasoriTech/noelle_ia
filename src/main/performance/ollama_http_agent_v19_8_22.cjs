"use strict";

/*
  Noelle/Yoru V19.8.22
  Keep-alive agent para reduzir overhead das chamadas HTTP locais ao Ollama.
*/

const http = require("http");

const OLLAMA_HTTP_AGENT = new http.Agent({
  keepAlive: true,
  maxSockets: 4,
  maxFreeSockets: 2,
  timeout: 30000
});

module.exports = {
  OLLAMA_HTTP_AGENT
};
