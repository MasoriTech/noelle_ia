const { classifyIntent } = require('./intent_filter');

function routePrompt(text) {
  const intent = classifyIntent(text);
  return { intent, text };
}

module.exports = { routePrompt };
