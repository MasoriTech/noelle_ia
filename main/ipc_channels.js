const IPC = Object.freeze({
  APP_STATUS: 'app:status',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',

  AI_CHAT: 'ai:chat',
  AI_STATUS: 'ai:status',

  VOICE_START: 'voice:start',
  VOICE_STOP: 'voice:stop',
  VOICE_STATUS: 'voice:status',

  AVATAR_SET_STATE: 'avatar:set-state',
  AVATAR_LOAD: 'avatar:load',

  STREAM_STATUS: 'stream:status'
});

module.exports = { IPC };
