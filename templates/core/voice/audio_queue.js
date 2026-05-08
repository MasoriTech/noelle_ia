'use strict';
class AudioQueue { constructor(){ this.items=[]; this.busy=false; } clear(){ this.items=[]; this.busy=false; } }
module.exports = { AudioQueue };
