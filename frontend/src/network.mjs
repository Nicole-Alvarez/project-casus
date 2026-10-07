export class Connection {
  socket = null;
  stopped = true;
  retries = 0;
  ready = false;
  timer = null;
  constructor({ onMessage, onStatus, onError }) { Object.assign(this,{ onMessage,onStatus,onError }); }
  join(room, name, sprite) { this.disconnect(); this.room = room; this.name = name; this.sprite=sprite; this.stopped = false; this.retries = 0; this.open(); }
  open() {
    this.onStatus(this.retries ? 'Reconnecting' : 'Connecting');
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    this.socket = ws;
    ws.addEventListener('open', () => ws.send(JSON.stringify({ type:'join', room:this.room, name:this.name,sprite:this.sprite })));
    ws.addEventListener('message', event => {
      if (this.socket !== ws) return;
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'error') { this.stopped = true; this.onError(message.message); ws.close(); return; }
      if (message.type === 'welcome') { this.ready = true; this.retries = 0; this.onStatus('Live'); }
      if (message.type === 'welcome' || message.type === 'snapshot') this.onMessage(message);
    });
    ws.addEventListener('error', () => {}); // The close event performs retries and gives one useful error.
    ws.addEventListener('close', () => {
      if (this.socket !== ws) return;
      this.ready = false;
      if (this.stopped) { this.onStatus('Offline'); return; }
      if (++this.retries > 5) { this.stopped = true; this.onStatus('Offline'); this.onError('Could not reach the game server. Check that it is running, then try joining again.'); return; }
      this.onStatus('Reconnecting');
      this.timer = setTimeout(() => this.open(), Math.min(1000 * this.retries,5000));
    });
  }
  input(input) { if (this.ready && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type:'input', ...input })); }
  appearance(sprite) { this.sprite=sprite;if(this.ready&&this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'appearance',sprite})); }
  disconnect() { this.stopped = true; this.ready = false; clearTimeout(this.timer); const ws = this.socket; this.socket = null; ws?.close(); }
}
