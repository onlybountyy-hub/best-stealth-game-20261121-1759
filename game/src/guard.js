// VEIL — the guards. One file, one job: patrol routes, the detection model
// and the alert state machine (patrol -> suspicious -> chase -> search ->
// return). A guard never knows where the player is unless it can see or hear
// them, and it always gives the player a way out.

import {
  TILE, CONE_HALF_ANGLE, CONE_RANGE, DETECT_FULL_RATE, DETECT_DECAY_RATE,
  SHADOW_FACTOR, BUSH_FACTOR, SNEAK_FACTOR, RUN_FACTOR, SUSPECT_AT, ALARM_AT,
  GUARD_PATROL, GUARD_CHASE, GUARD_SEARCH, CATCH_RADIUS, LOSE_SIGHT_TIME,
} from './config.js';

export const GUARD_STATE = { PATROL: 'patrol', INVESTIGATE: 'investigate', CHASE: 'chase', SEARCH: 'search' };

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def) {
    this.path = def.path.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    this.x = def.x + 0.5;
    this.y = def.y + 0.5;
    this.wait = def.wait || 1.5;
    this.wp = 1 % this.path.length;
    this.waitTimer = 0;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.awareness = 0;
    this.lastSeen = null;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.searchSpot = null;
    this.noiseSpot = null;
    this.suspicionPulse = 0;
    this.faceTarget();
  }

  faceTarget() {
    const t = this.path[this.wp];
    this.facing = Math.atan2(t.y - this.y, t.x - this.x);
  }

  // How fast this guard's awareness fills right now (0 when it cannot see).
  detectionRate(world, player) {
    const dx = player.x - this.x, dy = player.y - this.y;
    const distPx = Math.hypot(dx, dy) * TILE;
    if (distPx > CONE_RANGE) return 0;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, this.facing)) > CONE_HALF_ANGLE) return 0;
    if (!world.hasLineOfSight(this.x, this.y, player.x, player.y)) return 0;
    let rate = DETECT_FULL_RATE * (1 - (distPx / CONE_RANGE) * 0.65);
    const tx = Math.floor(player.x), ty = Math.floor(player.y);
    if (world.isDark(tx, ty)) rate *= SHADOW_FACTOR;
    if (world.isLit(tx, ty)) rate *= 1.35;
    if (world.isBush(tx, ty) && (player.sneaking || player.still)) rate *= BUSH_FACTOR;
    if (player.sneaking) rate *= SNEAK_FACTOR;
    if (player.running) rate *= RUN_FACTOR;
    return rate;
  }

  hearNoise(nx, ny, radiusPx) {
    if (this.state === GUARD_STATE.CHASE) return;
    const d = Math.hypot(nx - this.x, ny - this.y) * TILE;
    if (d <= radiusPx) {
      this.noiseSpot = { x: nx, y: ny };
      if (this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.INVESTIGATE;
        this.awareness = Math.max(this.awareness, SUSPECT_AT);
      }
    }
  }

  update(dt, world, player, onCaught, onSpotted) {
    const rate = this.detectionRate(world, player);
    if (rate > 0) {
      this.awareness = Math.min(1, this.awareness + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      if (this.awareness >= ALARM_AT && this.state !== GUARD_STATE.CHASE) {
        this.state = GUARD_STATE.CHASE;
        onSpotted(this);
      } else if (this.awareness >= SUSPECT_AT && this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.INVESTIGATE;
      }
    } else {
      this.awareness = Math.max(0, this.awareness - DETECT_DECAY_RATE * dt);
      this.loseSightTimer += dt;
      if (this.state === GUARD_STATE.CHASE && this.loseSightTimer > LOSE_SIGHT_TIME) {
        this.state = GUARD_STATE.SEARCH;
        this.searchSpot = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
        this.searchTimer = 5;
      }
    }

    let speed = GUARD_PATROL;
    let target = null;
    if (this.state === GUARD_STATE.PATROL) {
      target = this.path[this.wp];
      if (this.waitTimer > 0) { this.waitTimer -= dt; target = null; }
      else if (this.reached(target)) {
        this.wp = (this.wp + 1) % this.path.length;
        this.waitTimer = this.wait;
        this.faceTarget();
      }
    } else if (this.state === GUARD_STATE.INVESTIGATE) {
      const spot = this.noiseSpot || this.lastSeen;
      target = spot || this.path[this.wp];
      if (spot && this.reached(spot, 0.35)) {
        this.noiseSpot = null;
        this.state = GUARD_STATE.SEARCH;
        this.searchSpot = { ...spot };
        this.searchTimer = 4;
      }
      speed = GUARD_SEARCH;
    } else if (this.state === GUARD_STATE.CHASE) {
      target = this.lastSeen || { x: player.x, y: player.y };
      speed = GUARD_CHASE;
      if (this.reached({ x: player.x, y: player.y }, CATCH_RADIUS / TILE)) onCaught(this);
    } else if (this.state === GUARD_STATE.SEARCH) {
      target = this.searchSpot;
      speed = GUARD_SEARCH;
      this.searchTimer -= dt;
      if (target && this.reached(target, 0.3)) {
        // Arrived at the spot: stand here and look around instead of
        // walking on — and never wipe awareness just for arriving. The
        // guard only gives up when the search timer runs out.
        this.searchSpot = null;
      }
      if (this.searchTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.awareness = 0;
        this.wp = this.nearestWaypoint();
        this.faceTarget();
      }
    }

    if (target) {
      const dx = target.x - this.x, dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        const step = Math.min(dist, (speed * dt) / TILE);
        const nx = this.x + (dx / dist) * step;
        const ny = this.y + (dy / dist) * step;
        world.moveCircle(this, nx - this.x, ny - this.y, 13);
        this.facing = Math.atan2(dy, dx);
      }
    } else if (this.state === GUARD_STATE.SEARCH || this.state === GUARD_STATE.PATROL) {
      // Look around while waiting or searching.
      this.facing += dt * 0.9;
    }
    if (this.suspicionPulse > 0) this.suspicionPulse -= dt;
  }

  reached(t, eps = 0.12) {
    return Math.hypot(t.x - this.x, t.y - this.y) < eps;
  }

  nearestWaypoint() {
    let best = 0, bd = Infinity;
    this.path.forEach((p, i) => {
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
}
