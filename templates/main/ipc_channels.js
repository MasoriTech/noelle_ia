'use strict';

const IPC = Object.freeze({
  APP_PING: 'app:ping',
  APP_INFO: 'app:info',
  AI_STATUS: 'ai:status',
  AI_CHAT: 'ai:chat',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write'
});

module.exports = { IPC };
