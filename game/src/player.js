// VEIL — the infiltrator. One file, one job: movement (walk / sneak / run),
// noise, hiding state, picking up objectives and reaching the exit.

import { TILE, PLAYER_WALK, PLAYER_SNEAK, PLAYER_RUN, NOISE_RUN, NOISE_WALK, NOISE_SNEAK } from './config.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = 13;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.still = true;
    this.facing = -Math.PI / 2;
    this.stepTimer = 0;
    this.collected = [];
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.collected = [];
    this.facing = -Math.PI / 2;
  }

  // Returns a noise event {x, y, radius} when a footstep lands, else null.
  update(dt, input, world, onStep) {
    let ix = 0, iy = 0;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    if (input.up) iy -= 1;
    if (input.down) iy += 1;
    this.sneaking = !!input.sneak;
    this.running = !!input.run && !this.sneaking;
    this.moving = ix !== 0 || iy !== 0;
    this.still = !this.moving;
    let noise = null;
    if (this.moving) {
      const len = Math.hypot(ix, iy);
      ix /= len; iy /= len;
      const speed = this.sneaking ? PLAYER_SNEAK : this.running ? PLAYER_RUN : PLAYER_WALK;
      world.moveCircle(this, (ix * speed * dt) / TILE, (iy * speed * dt) / TILE, this.radius);
      this.facing = Math.atan2(iy, ix);
      this.stepTimer -= dt;
      const stepEvery = this.sneaking ? 0.55 : this.running ? 0.26 : 0.38;
      if (this.stepTimer <= 0) {
        this.stepTimer = stepEvery;
        const radius = this.sneaking ? NOISE_SNEAK : this.running ? NOISE_RUN : NOISE_WALK;
        if (radius > 0) noise = { x: this.x, y: this.y, radius };
        if (onStep) onStep(this.sneaking ? 'sneak' : this.running ? 'run' : 'walk');
      }
    }
    return noise;
  }

  tryCollect(world, objectives, onCollect) {
    for (const o of objectives) {
      if (o.done) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y) * TILE;
      if (d < 34) {
        o.done = true;
        this.collected.push(o);
        if (onCollect) onCollect(o);
        return o;
      }
    }
    return null;
  }

  atExit(world) {
    return Math.hypot(world.exit.x - this.x, world.exit.y - this.y) * TILE < 36;
  }
}
