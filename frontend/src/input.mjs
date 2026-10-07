import { NEUTRAL } from '../../shared/physics.mjs';

const KEYS = { KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', KeyW:'jump', ArrowUp:'jump', Space:'jump', KeyR:'respawn' };
export class Input {
  active = false;
  held = new Set();
  constructor(canvas) {
    window.addEventListener('keydown', event => {
      if (!this.active || /INPUT|TEXTAREA|BUTTON/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
      if (KEYS[event.code]) { event.preventDefault(); this.held.add(event.code); }
    });
    window.addEventListener('keyup', event => { this.held.delete(event.code); });
    window.addEventListener('blur', () => this.release());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.release(); });
    canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll:true }));
    document.querySelectorAll('[data-control]').forEach(button => {
      const key = 'touch-'+button.dataset.control;
      button.addEventListener('pointerdown', event => { if (!this.active) return; event.preventDefault(); button.setPointerCapture(event.pointerId); this.held.add(key); });
      for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, () => this.held.delete(key));
    });
  }
  release() { this.held.clear(); }
  read() {
    const input = { ...NEUTRAL };
    if (!this.active) return input;
    for (const key of this.held) input[key.startsWith('touch-') ? key.slice(6) : KEYS[key]] = true;
    return input;
  }
}
