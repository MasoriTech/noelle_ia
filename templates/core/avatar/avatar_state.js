'use strict';
const NOELLE_STATE = Object.freeze({ READY: 'ready', LISTENING: 'listening', TRANSCRIBING: 'transcribing', THINKING: 'thinking', SPEAKING: 'speaking', ERROR: 'error' });
let state = NOELLE_STATE.READY;
module.exports = { NOELLE_STATE, getState: () => state, setState: (next) => { state = next || NOELLE_STATE.READY; return state; } };
