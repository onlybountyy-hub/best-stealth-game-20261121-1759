// VEIL — keyboard and mouse input. One file, one job: turn key and click
// events into a small state object the player and the menus read.

export class Input {
  constructor() {
    this.up = false; this.down = false; this.left = false; this.right = false;
    this.sneak = false; this.run = false;
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this._onKeyDown = (e) => this.key(e, true);
    this._onKeyUp = (e) => this.key(e, false);
    this._onMouseMove = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };
    this._onMouseDown = () => { this.mouse.clicked = true; };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
  }

  key(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'w' || k === 'arrowup') this.up = down;
    if (k === 's' || k === 'arrowdown') this.down = down;
    if (k === 'a' || k === 'arrowleft') this.left = down;
    if (k === 'd' || k === 'arrowright') this.right = down;
    if (k === 'c' || k === 'control') this.sneak = down;
    if (k === 'shift') this.run = down;
    if (down) this.pressed.add(k);
  }

  // True once for the frame the key went down; callers clear it each frame.
  wasPressed(k) {
    return this.pressed.has(k.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
