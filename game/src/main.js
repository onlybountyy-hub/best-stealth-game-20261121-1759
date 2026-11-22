// VEIL — the game itself: state machine (title / playing / complete / caught),
// the frame loop, mission flow, scoring and saves. One file, one job: own
// the top-level state and hand every other job to its module.

import { TILE, VIEW_W, VIEW_H, MAP_W, MAP_H } from './config.js';
import { MISSIONS } from './levels.js';
import { World } from './world.js';
import { Guard, GUARD_STATE } from './guard.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'veil-save-v1';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.sound = new Sound();
    this.missions = MISSIONS;
    this.screen = 'title';
    this.time = 0;
    this.mission = null;
    this.world = null;
    this.player = null;
    this.guards = [];
    this.ripples = [];
    this.paused = false;
    this.elapsed = 0;
    this.timesSpotted = 0;
    this.allDone = false;
    this.unlocked = 1;
    this.bestTimes = {};
    this.loadSave();
    this.shotMode = null;
  }

  loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      this.unlocked = Math.min(3, Math.max(1, s.unlocked || 1));
      this.bestTimes = s.bestTimes || {};
    } catch (e) { /* fresh save */ }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: this.unlocked, bestTimes: this.bestTimes }));
    } catch (e) { /* storage unavailable */ }
  }

  start(missionId) {
    const def = this.missions.find((m) => m.id === missionId) || this.missions[0];
    this.mission = {
      ...def,
      objectives: def.objectives.map((o) => ({ ...o, x: o.tile[0] + 0.5, y: o.tile[1] + 0.5, done: false })),
    };
    this.world = new World(def.map);
    this.player = new Player(this.world.playerStart);
    this.guards = def.guards.map((g) => new Guard(g));
    this.ripples = [];
    this.elapsed = 0;
    this.timesSpotted = 0;
    this.allDone = false;
    this.paused = false;
    this.screen = 'playing';
  }

  maxAwareness() {
    return this.guards.reduce((m, g) => Math.max(m, g.awareness), 0);
  }

  timerText() {
    const s = Math.floor(this.elapsed);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  onSpotted(guard) {
    this.timesSpotted++;
    this.sound.alert();
  }

  onCaught() {
    this.sound.caught();
    this.screen = 'caught';
  }

  completeMission() {
    this.sound.complete();
    this.screen = 'complete';
    const t = this.timerText();
    const prev = this.bestTimes[this.mission.id];
    if (!prev || this.elapsed < this.parseTime(prev)) this.bestTimes[this.mission.id] = t;
    if (this.mission.id < 3) this.unlocked = Math.max(this.unlocked, this.mission.id + 1);
    this.save();
  }

  parseTime(mmss) {
    const [m, s] = mmss.split(':').map(Number);
    return m * 60 + s;
  }

  update(dt) {
    this.time += dt;
    if (this.shotFrozen) return; // staged screenshot scene: hold every pose
    if (this.screen !== 'playing' || this.paused) return;
    this.elapsed += dt;
    const noise = this.player.update(dt, this.input, this.world, (k) => this.sound.step(k));
    if (noise) {
      this.ripples.push({ x: noise.x, y: noise.y, r: 6, life: 0.8, max: noise.radius });
      for (const g of this.guards) g.hearNoise(noise.x, noise.y, noise.radius);
    }
    for (const r of this.ripples) { r.r += dt * 260; r.life -= dt * 1.4; }
    this.ripples = this.ripples.filter((r) => r.life > 0 && r.r < r.max);
    const picked = this.player.tryCollect(this.world, this.mission.objectives, (o) => {
      this.sound.pickup();
      if (this.mission.objectives.every((x) => x.done)) this.allDone = true;
    });
    if (picked) { /* pickup chime already played */ }
    for (const g of this.guards) {
      const wasChase = g.state === GUARD_STATE.CHASE;
      g.update(dt, this.world, this.player, () => this.onCaught(), (gd) => this.onSpotted(gd));
      if (g.state === GUARD_STATE.CHASE && !wasChase) this.sound.alert();
      if (g.state === GUARD_STATE.INVESTIGATE && g.suspicionPulse <= 0 && g.awareness >= 0.55) {
        g.suspicionPulse = 2;
        this.sound.suspicious();
      }
    }
    if (this.screen !== 'playing') return;
    if (this.allDone && this.player.atExit(this.world)) this.completeMission();
  }

  handleKeys() {
    const inp = this.input;
    if (inp.wasPressed('m')) this.sound.toggleMute();
    if (this.screen === 'title') {
      if (inp.wasPressed('1') && this.unlocked >= 1) this.start(1);
      if (inp.wasPressed('2') && this.unlocked >= 2) this.start(2);
      if (inp.wasPressed('3') && this.unlocked >= 3) this.start(3);
      if (inp.mouse.clicked) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (inp.mouse.x - rect.left) * (VIEW_W / rect.width);
        const my = (inp.mouse.y - rect.top) * (VIEW_H / rect.height);
        this.missions.forEach((m, i) => {
          const x = VIEW_W / 2 - 330 + i * 230, y = 400;
          if (this.unlocked >= m.id && mx >= x && mx <= x + 210 && my >= y && my <= y + 110) this.start(m.id);
        });
      }
      return;
    }
    if (this.screen === 'playing') {
      if (inp.wasPressed('p') || inp.wasPressed('escape')) this.paused = !this.paused;
      if (inp.wasPressed('r')) this.start(this.mission.id);
      return;
    }
    // complete / caught screens.
    if (inp.wasPressed('enter') || inp.wasPressed(' ')) {
      if (this.screen === 'complete' && this.mission.id < 3) this.start(this.mission.id + 1);
      else this.start(this.mission.id);
    }
    if (inp.wasPressed('t')) this.screen = 'title';
  }

  frame(dt) {
    this.handleKeys();
    this.update(dt);
    this.renderer.draw(this);
    this.input.endFrame();
  }

  run() {
    this.input.attach();
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    const seed = Number(params.get('seed') || 1);
    if (shot) {
      applyShot(this, shot, seed);
    } else {
      this.screen = 'title';
    }
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    this.canvas.addEventListener('pointerdown', () => this.sound.ensure(), { once: false });
    window.addEventListener('keydown', () => this.sound.ensure(), { once: true });
  }
}

// Boot.
const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
window.__veil = game; // handy for the smoke test and debugging
game.run();
