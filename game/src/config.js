// VEIL — shared constants: tile size, palette, tuning for the stealth systems.
// One file, one job: every number the rest of the game reads lives here so the
// tuning of movement, sight and sound can be read (and changed) in one place.

export const TILE = 40;
export const MAP_W = 32;
export const MAP_H = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Movement (pixels per second).
export const PLAYER_WALK = 150;
export const PLAYER_SNEAK = 85;
export const PLAYER_RUN = 235;
export const GUARD_PATROL = 62;
export const GUARD_CHASE = 165;
export const GUARD_SEARCH = 95;

// Sight. A guard's cone is 76 degrees wide; detection fills in about 1.1 s at
// point blank in the light and far slower in shadow, at range, or at a crouch.
export const CONE_HALF_ANGLE = (38 * Math.PI) / 180;
export const CONE_RANGE = 265;
export const DETECT_FULL_RATE = 0.95; // per second, best case
export const DETECT_DECAY_RATE = 0.55; // per second, unseen
export const SHADOW_FACTOR = 0.35; // detection multiplier in dark tiles
export const BUSH_FACTOR = 0.12; // detection multiplier hidden in foliage
export const SNEAK_FACTOR = 0.55;
export const RUN_FACTOR = 1.45;
export const SUSPECT_AT = 0.55; // awareness that sends a guard to investigate
export const ALARM_AT = 1.0; // awareness that triggers the chase

// Noise. Running is heard within 190 px; walking is heard within 70 px;
// sneaking is silent. A heard noise sends the nearest calm guard to look.
export const NOISE_RUN = 190;
export const NOISE_WALK = 70;
export const NOISE_SNEAK = 0;

// Catching. A chasing guard that reaches the player ends the mission.
export const CATCH_RADIUS = 24;
// The player must stay out of sight for this long before guards give up.
export const LOSE_SIGHT_TIME = 4.0;

// Palette: a night museum in deep blues, warm lamp pools, danger amber.
export const COLORS = {
  floor: '#1c2438',
  floorAlt: '#202a42',
  lit: '#2c3550',
  dark: '#121828',
  wall: '#3a4666',
  wallTop: '#4d5c85',
  crate: '#5a4632',
  crateTop: '#7a5f45',
  bush: '#1e4d2e',
  bushTop: '#2c6b40',
  player: '#e8e4d8',
  playerRing: '#ffd166',
  guard: '#e4572e',
  guardCalm: '#c94f2e',
  cone: 'rgba(255, 209, 102, 0.20)',
  coneAlert: 'rgba(255, 80, 60, 0.28)',
  exit: '#39d98a',
  objective: '#ffd166',
  hud: '#e8e4d8',
  danger: '#ff5040',
  panel: 'rgba(10, 14, 26, 0.82)',
};
