const { contextBridge, ipcRenderer } = require('electron');

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

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld('noelle', {
  app: {
    status: () => invoke(IPC.APP_STATUS)
  },
  config: {
    read: (name) => invoke(IPC.CONFIG_READ, name),
    write: (name, data) => invoke(IPC.CONFIG_WRITE, { name, data })
  },
  ai: {
    status: () => invoke(IPC.AI_STATUS),
    chat: (message, options = {}) => invoke(IPC.AI_CHAT, { message, options })
  },
  voice: {
    start: (payload = {}) => invoke(IPC.VOICE_START, payload),
    stop: () => invoke(IPC.VOICE_STOP)
  },
  avatar: {
    setState: (state) => invoke(IPC.AVATAR_SET_STATE, state)
  },
  stream: {
    status: () => invoke(IPC.STREAM_STATUS)
  }
});
