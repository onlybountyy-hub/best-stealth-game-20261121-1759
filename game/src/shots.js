// VEIL — staged scenes for screenshots. One file, one job: given
// ?shot=<name>&seed=<n>, put the game into one frozen, readable moment so
// the maker's screenshots are deterministic renders of the real game.

import { mulberry32 } from './random.js';
import { GUARD_STATE } from './guard.js';

// Freeze the world (guards hold their staged poses; only the clock ticks so
// bobbing objectives and the title sweep still animate).
function freeze(game) {
  game.shotFrozen = true;
}

export function applyShot(game, shot, seed) {
  const rng = mulberry32(seed * 7919 + 13);
  void rng;
  if (shot === 'start') {
    game.screen = 'title';
    freeze(game);
    return;
  }
  if (shot === 'play') {
    game.start(1);
    // Mid-heist: the player sneaks along the top gallery wall while a guard's
    // cone sweeps just past them; one artifact already lifted.
    game.player.x = 9.5; game.player.y = 4.5;
    game.player.sneaking = true;
    game.player.facing = Math.PI / 2;
    game.mission.objectives[0].done = true;
    game.player.collected.push(game.mission.objectives[0]);
    const g0 = game.guards[0];
    g0.x = 11.5; g0.y = 3.5; g0.facing = Math.PI; g0.state = GUARD_STATE.PATROL;
    const g1 = game.guards[1];
    g1.x = 19.5; g1.y = 4.5; g1.facing = 0; g1.awareness = 0.62;
    g1.state = GUARD_STATE.INVESTIGATE;
    const g2 = game.guards[2];
    g2.x = 8.5; g2.y = 9.5; g2.facing = -Math.PI / 2;
    game.elapsed = 74;
    freeze(game);
    return;
  }
  if (shot === 'hide') {
    game.start(2);
    // The close call: crouched in the west bush as a guard's cone passes a
    // tile away; the ledger already in hand, one panel silenced.
    game.player.x = 3.5; game.player.y = 9.5;
    game.player.sneaking = true;
    game.player.facing = 0;
    game.mission.objectives[0].done = true;
    game.mission.objectives[2].done = true;
    game.player.collected.push(game.mission.objectives[0], game.mission.objectives[2]);
    const g = game.guards[2];
    g.x = 15.5; g.y = 9.5; g.facing = Math.PI; g.awareness = 0.45;
    g.state = GUARD_STATE.INVESTIGATE;
    const g2 = game.guards[0];
    g2.x = 6.5; g2.y = 4.5; g2.facing = Math.PI / 2;
    game.elapsed = 131;
    freeze(game);
    return;
  }
  if (shot === 'end') {
    game.start(1);
    game.mission.objectives.forEach((o) => { o.done = true; });
    game.player.collected.push(...game.mission.objectives);
    game.allDone = true;
    game.elapsed = 187;
    game.timesSpotted = 0;
    game.screen = 'complete';
    freeze(game);
    return;
  }
  game.screen = 'title';
}
