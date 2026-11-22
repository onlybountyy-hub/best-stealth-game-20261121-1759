// VEIL — the three missions. One file, one job: the maps, patrol routes and
// objectives for each job. Maps are built by a tiny builder (border, wall
// rectangles, feature placement) so every row is exactly 32 tiles wide by
// construction and every patrol route runs on open floor.

import { MAP_W, MAP_H } from './config.js';

// Legend: '#' wall, '.' floor, 'D' dark floor (slow detection), 'L' lit floor
// (fast detection), 'B' bush (hide while crouched/still), 'C' crate (solid,
// blocks sight), 'P' player start, 'E' exit, '1'..'3' artifacts,
// 'A' alarm panel, 'K' the ledger.
function blank() {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  return g;
}
function border(g) {
  for (let x = 0; x < MAP_W; x++) { g[0][x] = '#'; g[MAP_H - 1][x] = '#'; }
  for (let y = 0; y < MAP_H; y++) { g[y][0] = '#'; g[y][MAP_W - 1] = '#'; }
}
function wall(g, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) g[yy][xx] = '#';
}
function fill(g, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) g[yy][xx] = ch;
}
function set(g, x, y, ch) { g[y][x] = ch; }
function rows(g) { return g.map((r) => r.join('')); }

// A guard patrol: waypoints in tile coordinates, seconds to wait at each end.
function guard(x, y, path, wait = 1.5) {
  return { x, y, path, wait };
}

function mission1() {
  const g = blank();
  border(g);
  // Gallery wings: two horizontal divider walls with door gaps.
  wall(g, 1, 6, 12, 1); wall(g, 15, 6, 16, 1);
  wall(g, 1, 12, 16, 1); wall(g, 19, 12, 12, 1);
  // Display plinths (crates) and dark corners.
  set(g, 8, 2, 'C'); set(g, 23, 3, 'C'); set(g, 8, 10, 'C'); set(g, 23, 9, 'C');
  set(g, 8, 15, 'C'); set(g, 23, 15, 'C');
  fill(g, 2, 2, 2, 2, 'D'); fill(g, 27, 2, 3, 2, 'D');
  fill(g, 2, 15, 2, 2, 'D'); fill(g, 27, 15, 3, 2, 'D');
  fill(g, 14, 8, 3, 3, 'D'); fill(g, 14, 2, 3, 2, 'L');
  set(g, 5, 4, 'B'); set(g, 26, 10, 'B'); set(g, 16, 14, 'B');
  // Objectives, start, exit.
  set(g, 5, 2, '1'); set(g, 26, 2, '2'); set(g, 5, 15, '3');
  set(g, 2, 1, 'P'); set(g, 29, 16, 'E');
  return {
    id: 1, name: 'The Gallery', brief: 'Lift all three artifacts, then slip out the service door — unseen.',
    map: rows(g),
    guards: [
      guard(4, 3, [[4, 3], [11, 3]]),
      guard(24, 4, [[24, 4], [17, 4]]),
      guard(6, 9, [[6, 9], [11, 9]]),
      guard(25, 14, [[25, 14], [18, 14]]),
    ],
    objectives: [
      { kind: 'artifact', label: 'Jade Serpent', tile: [5, 2] },
      { kind: 'artifact', label: 'Silver Comet', tile: [26, 2] },
      { kind: 'artifact', label: 'Ivory Mask', tile: [5, 15] },
    ],
  };
}

function mission2() {
  const g = blank();
  border(g);
  // Vault floor: a ring of strong rooms around a dark central hall.
  wall(g, 1, 6, 10, 1); wall(g, 14, 6, 8, 1); wall(g, 25, 6, 6, 1);
  wall(g, 1, 12, 8, 1); wall(g, 12, 12, 10, 1); wall(g, 25, 12, 6, 1);
  wall(g, 10, 1, 1, 5); wall(g, 10, 7, 1, 5); wall(g, 10, 13, 1, 4);
  wall(g, 21, 1, 1, 5); wall(g, 21, 7, 1, 5); wall(g, 21, 13, 1, 4);
  // Crates, bushes and dark patches for cover.
  set(g, 5, 3, 'C'); set(g, 26, 3, 'C'); set(g, 5, 15, 'C'); set(g, 26, 14, 'C');
  set(g, 16, 8, 'C'); set(g, 15, 8, 'C');
  fill(g, 13, 8, 6, 3, 'D'); fill(g, 2, 8, 3, 2, 'D'); fill(g, 27, 8, 3, 2, 'D');
  fill(g, 13, 2, 3, 2, 'L'); fill(g, 13, 14, 3, 2, 'L');
  set(g, 3, 9, 'B'); set(g, 28, 9, 'B'); set(g, 16, 4, 'B'); set(g, 16, 15, 'B');
  // Two alarm panels to disable, the ledger to steal, then the exit.
  set(g, 3, 2, 'A'); set(g, 28, 15, 'A'); set(g, 16, 2, 'K');
  set(g, 2, 1, 'P'); set(g, 29, 16, 'E');
  return {
    id: 2, name: 'The Vault Floor', brief: 'Silence both alarm panels, steal the Meridian ledger, then leave.',
    map: rows(g),
    guards: [
      guard(4, 4, [[4, 4], [8, 4]]),
      guard(27, 4, [[27, 4], [23, 4]]),
      guard(13, 9, [[13, 9], [18, 9]]),
      guard(5, 14, [[5, 14], [8, 14]]),
      guard(26, 10, [[26, 10], [23, 10]]),
    ],
    objectives: [
      { kind: 'panel', label: 'Alarm panel — west', tile: [3, 2] },
      { kind: 'panel', label: 'Alarm panel — east', tile: [28, 15] },
      { kind: 'ledger', label: 'Meridian ledger', tile: [16, 2] },
    ],
  };
}

function mission3() {
  const g = blank();
  border(g);
  // Rooftop: open ground broken by crate stacks, planters and light pools.
  wall(g, 6, 3, 5, 1); wall(g, 20, 3, 5, 1); wall(g, 6, 14, 5, 1); wall(g, 20, 14, 5, 1);
  wall(g, 14, 6, 4, 1); wall(g, 14, 11, 4, 1);
  set(g, 4, 6, 'C'); set(g, 5, 6, 'C'); set(g, 27, 6, 'C'); set(g, 26, 6, 'C');
  set(g, 4, 11, 'C'); set(g, 5, 11, 'C'); set(g, 27, 11, 'C'); set(g, 26, 11, 'C');
  set(g, 15, 3, 'C'); set(g, 16, 3, 'C'); set(g, 15, 14, 'C'); set(g, 16, 14, 'C');
  fill(g, 2, 8, 3, 2, 'D'); fill(g, 27, 8, 3, 2, 'D'); fill(g, 14, 8, 4, 2, 'D');
  fill(g, 8, 2, 3, 2, 'L'); fill(g, 21, 15, 3, 2, 'L'); fill(g, 8, 15, 3, 2, 'L');
  set(g, 3, 4, 'B'); set(g, 28, 4, 'B'); set(g, 3, 13, 'B'); set(g, 28, 13, 'B');
  set(g, 12, 8, 'B'); set(g, 19, 8, 'B');
  // Three dead drops to collect across the roof, then the extraction stair.
  set(g, 3, 2, '1'); set(g, 28, 2, '2'); set(g, 16, 16, '3');
  set(g, 2, 16, 'P'); set(g, 29, 1, 'E');
  return {
    id: 3, name: 'The Rooftop', brief: 'Collect the three dead drops and reach the extraction stair.',
    map: rows(g),
    guards: [
      guard(7, 5, [[7, 5], [12, 5]]),
      guard(24, 5, [[24, 5], [19, 5]]),
      guard(7, 12, [[7, 12], [12, 12]]),
      guard(24, 12, [[24, 12], [19, 12]]),
      guard(16, 7, [[16, 7], [16, 10]]),
      guard(10, 9, [[10, 9], [21, 9]]),
    ],
    objectives: [
      { kind: 'artifact', label: 'Dead drop — north-west', tile: [3, 2] },
      { kind: 'artifact', label: 'Dead drop — north-east', tile: [28, 2] },
      { kind: 'artifact', label: 'Dead drop — south', tile: [16, 16] },
    ],
  };
}

export const MISSIONS = [mission1(), mission2(), mission3()];
