// VEIL — the level grid: parsing, solid-tile tests, circle collision and
// line of sight. One file, one job: everything that answers "can I stand
// here" and "can I be seen from there".

import { TILE, MAP_W, MAP_H } from './config.js';

export const SOLID = new Set(['#', 'C']);

export class World {
  constructor(mapRows) {
    this.rows = mapRows;
    this.w = MAP_W;
    this.h = MAP_H;
    this.playerStart = null;
    this.exit = null;
    this.objectives = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const ch = mapRows[y][x];
        if (ch === 'P') this.playerStart = { x: x + 0.5, y: y + 0.5 };
        if (ch === 'E') this.exit = { x: x + 0.5, y: y + 0.5 };
        if ('123AK'.includes(ch)) this.objectives.push({ ch, x: x + 0.5, y: y + 0.5 });
      }
    }
    if (!this.playerStart || !this.exit) throw new Error('map needs P and E');
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return '#';
    return this.rows[ty][tx];
  }

  isSolid(tx, ty) {
    return SOLID.has(this.tileAt(tx, ty));
  }

  isDark(tx, ty) {
    return this.tileAt(tx, ty) === 'D';
  }

  isLit(tx, ty) {
    return this.tileAt(tx, ty) === 'L';
  }

  isBush(tx, ty) {
    return this.tileAt(tx, ty) === 'B';
  }

  // Move a circle (in tile units) axis by axis so it slides along walls.
  moveCircle(pos, dx, dy, radius) {
    const r = radius / TILE;
    let nx = pos.x + dx;
    if (!this.circleHits(nx, pos.y, r)) pos.x = nx;
    let ny = pos.y + dy;
    if (!this.circleHits(pos.x, ny, r)) pos.y = ny;
  }

  circleHits(cx, cy, r) {
    const x0 = Math.floor(cx - r), x1 = Math.floor(cx + r);
    const y0 = Math.floor(cy - r), y1 = Math.floor(cy + r);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        const nearX = Math.max(tx, Math.min(cx, tx + 1));
        const nearY = Math.max(ty, Math.min(cy, ty + 1));
        const ddx = cx - nearX, ddy = cy - nearY;
        if (ddx * ddx + ddy * ddy < r * r) return true;
      }
    }
    return false;
  }

  // Line of sight between two points in tile units (DDA over the grid).
  hasLineOfSight(ax, ay, bx, by) {
    let x = Math.floor(ax), y = Math.floor(ay);
    const endX = Math.floor(bx), endY = Math.floor(by);
    const dx = bx - ax, dy = by - ay;
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    let tMaxX = dx === 0 ? Infinity : (stepX > 0 ? x + 1 - ax : ax - x) * tDeltaX;
    let tMaxY = dy === 0 ? Infinity : (stepY > 0 ? y + 1 - ay : ay - y) * tDeltaY;
    let guard = 0;
    while (guard++ < 128) {
      if (x === endX && y === endY) return true;
      if (tMaxX < tMaxY) { tMaxX += tDeltaX; x += stepX; }
      else { tMaxY += tDeltaY; y += stepY; }
      if (x === endX && y === endY) return true;
      if (this.isSolid(x, y)) return false;
    }
    return false;
  }

  // Distance along a ray (in tile units) until it hits a solid tile.
  rayDistance(ox, oy, angle, maxDist) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let x = Math.floor(ox), y = Math.floor(oy);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    let tMaxX = dx === 0 ? Infinity : (stepX > 0 ? x + 1 - ox : ox - x) * tDeltaX;
    let tMaxY = dy === 0 ? Infinity : (stepY > 0 ? y + 1 - oy : oy - y) * tDeltaY;
    let t = 0;
    let guard = 0;
    while (guard++ < 128) {
      if (tMaxX < tMaxY) { t = tMaxX; tMaxX += tDeltaX; x += stepX; }
      else { t = tMaxY; tMaxY += tDeltaY; y += stepY; }
      if (t > maxDist) return maxDist;
      if (this.isSolid(x, y)) return t;
    }
    return maxDist;
  }

  // The guard's vision cone as a polygon (pixel coordinates), clipped by walls.
  conePolygon(gx, gy, facing, halfAngle, rangePx, rays = 26) {
    const maxTiles = rangePx / TILE;
    const pts = [{ x: gx * TILE, y: gy * TILE }];
    for (let i = 0; i <= rays; i++) {
      const a = facing - halfAngle + (2 * halfAngle * i) / rays;
      const d = this.rayDistance(gx, gy, a, maxTiles);
      pts.push({ x: (gx + Math.cos(a) * d) * TILE, y: (gy + Math.sin(a) * d) * TILE });
    }
    return pts;
  }
}
