// VEIL — everything drawn: the night floor, walls, cover, vision cones,
// guards, the player, objectives, the exit, the HUD, the minimap and the
// menus. One file, one job: turn game state into a readable picture.

import { TILE, VIEW_W, VIEW_H, MAP_W, MAP_H, COLORS, CONE_HALF_ANGLE, CONE_RANGE } from './config.js';
import { GUARD_STATE } from './guard.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dark = document.createElement('canvas');
    this.dark.width = VIEW_W; this.dark.height = VIEW_H;
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (game.screen === 'title') { this.drawTitle(game); return; }
    if (game.screen === 'complete') { this.drawEnd(game, true); return; }
    if (game.screen === 'caught') { this.drawEnd(game, false); return; }
    this.drawWorld(game);
    this.drawHud(game);
    if (game.paused) this.drawPaused(game);
  }

  drawWorld(game) {
    const ctx = this.ctx;
    const world = game.world;
    // Floor.
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const ch = world.tileAt(x, y);
        const px = x * TILE, py = y * TILE;
        if (ch === '#') continue;
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(px, py, TILE, TILE);
        if (ch === 'D') { ctx.fillStyle = COLORS.dark; ctx.fillRect(px, py, TILE, TILE); }
        if (ch === 'L') { ctx.fillStyle = COLORS.lit; ctx.fillRect(px, py, TILE, TILE); }
        if (ch === 'B') {
          ctx.fillStyle = COLORS.bush;
          ctx.beginPath(); ctx.arc(px + 12, py + 14, 12, 0, Math.PI * 2); ctx.arc(px + 28, py + 12, 11, 0, Math.PI * 2); ctx.arc(px + 20, py + 28, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = COLORS.bushTop;
          ctx.beginPath(); ctx.arc(px + 12, py + 14, 5, 0, Math.PI * 2); ctx.arc(px + 28, py + 12, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Subtle tile seams.
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
    // Crates (low cover).
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        if (world.tileAt(x, y) !== 'C') continue;
        const px = x * TILE, py = y * TILE;
        ctx.fillStyle = COLORS.crate;
        rr(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 5); ctx.fill();
        ctx.fillStyle = COLORS.crateTop;
        rr(ctx, px + 3, py + 3, TILE - 6, 12, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.moveTo(px + 3, py + 20); ctx.lineTo(px + TILE - 3, py + 20); ctx.stroke();
      }
    }
    // Walls with a lit top edge.
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        if (world.tileAt(x, y) !== '#') continue;
        const px = x * TILE, py = y * TILE;
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        if (world.tileAt(x, y + 1) !== '#') ctx.fillRect(px, py + TILE - 5, TILE, 5);
        if (world.tileAt(x, y - 1) !== '#') ctx.fillRect(px, py, TILE, 4);
      }
    }
    // Exit zone.
    const ex = world.exit;
    const exPx = ex.x * TILE, exPy = ex.y * TILE;
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(game.time * 3);
    ctx.strokeStyle = COLORS.exit;
    ctx.lineWidth = 3;
    ctx.strokeRect(exPx - 18, exPy - 18, 36, 36);
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.allDone ? 'EXIT — GO!' : 'EXIT', exPx, exPy - 24);
    ctx.restore();
    // Objectives.
    for (const o of game.mission.objectives) {
      if (o.done) continue;
      const ox = o.x * TILE, oy = o.y * TILE;
      const bob = Math.sin(game.time * 2.5 + o.x) * 3;
      ctx.save();
      ctx.shadowColor = COLORS.objective; ctx.shadowBlur = 14;
      ctx.fillStyle = COLORS.objective;
      ctx.beginPath(); ctx.arc(ox, oy + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a1405';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.kind === 'panel' ? '!' : '◆', ox, oy + bob + 0.5);
      ctx.restore();
    }
    // Vision cones (under the guards, over the floor).
    for (const gd of game.guards) {
      const poly = world.conePolygon(gd.x, gd.y, gd.facing, CONE_HALF_ANGLE, CONE_RANGE);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = gd.state === GUARD_STATE.CHASE ? COLORS.coneAlert : COLORS.cone;
      ctx.fill();
    }
    // Noise ripples.
    for (const n of game.ripples) {
      ctx.beginPath();
      ctx.arc(n.x * TILE, n.y * TILE, n.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 209, 102, ${Math.max(0, n.life)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Guards.
    for (const gd of game.guards) this.drawGuard(gd, game);
    // Player.
    this.drawPlayer(game);
    // Darkness: night falls everywhere except near lamps, the player and exits.
    this.drawDarkness(game);
  }

  drawGuard(gd, game) {
    const ctx = this.ctx;
    const px = gd.x * TILE, py = gd.y * TILE;
    const alerted = gd.state === GUARD_STATE.CHASE;
    const suspicious = gd.state === GUARD_STATE.INVESTIGATE || gd.state === GUARD_STATE.SEARCH;
    // Body.
    ctx.save();
    ctx.shadowColor = alerted ? '#ff5040' : '#000'; ctx.shadowBlur = alerted ? 16 : 6;
    ctx.fillStyle = alerted ? '#ff5040' : suspicious ? '#e8a33d' : COLORS.guardCalm;
    ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(gd.facing) * 18, py + Math.sin(gd.facing) * 18); ctx.stroke();
    // Awareness ring.
    if (gd.awareness > 0.05) {
      ctx.strokeStyle = alerted ? '#ff5040' : '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 18, -Math.PI / 2, -Math.PI / 2 + gd.awareness * Math.PI * 2); ctx.stroke();
    }
    // State mark.
    if (alerted || suspicious) {
      ctx.fillStyle = alerted ? '#ff5040' : '#ffd166';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(alerted ? '!' : '?', px, py - 22);
    }
    ctx.restore();
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    const px = p.x * TILE, py = p.y * TILE;
    ctx.save();
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.playerRing;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 15, 0, Math.PI * 2); ctx.stroke();
    // Facing tick and sneak indicator.
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(p.facing) * 16, py + Math.sin(p.facing) * 16); ctx.stroke();
    if (p.sneaking) {
      ctx.fillStyle = '#9fd8ff';
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('…', px, py - 20);
    }
    ctx.restore();
  }

  drawDarkness(game) {
    const dctx = this.dark.getContext('2d');
    dctx.clearRect(0, 0, VIEW_W, VIEW_H);
    dctx.fillStyle = 'rgba(4, 7, 16, 0.55)';
    dctx.fillRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r, a) => {
      const g = dctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
    };
    const p = game.player;
    cut(p.x * TILE, p.y * TILE, 150, 0.85);
    const ex = game.world.exit;
    cut(ex.x * TILE, ex.y * TILE, 90, 0.7);
    for (let y = 0; y < game.world.h; y++) {
      for (let x = 0; x < game.world.w; x++) {
        if (game.world.tileAt(x, y) === 'L') cut((x + 0.5) * TILE, (y + 0.5) * TILE, 95, 0.6);
      }
    }
    dctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.dark, 0, 0);
  }

  drawHud(game) {
    const ctx = this.ctx;
    // Top bar.
    ctx.fillStyle = COLORS.panel;
    rr(ctx, 10, 8, 470, 58, 10); ctx.fill();
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${game.mission.name}  ·  ${game.mission.id}/3`, 24, 30);
    ctx.font = '13px sans-serif';
    const done = game.mission.objectives.filter((o) => o.done).length;
    ctx.fillText(`Objectives  ${done}/${game.mission.objectives.length}    ·    ${game.timerText()}`, 24, 52);
    // Objective checklist.
    ctx.fillStyle = COLORS.panel;
    rr(ctx, 10, 74, 250, 30 + game.mission.objectives.length * 20, 10); ctx.fill();
    game.mission.objectives.forEach((o, i) => {
      ctx.fillStyle = o.done ? COLORS.exit : COLORS.hud;
      ctx.font = '13px sans-serif';
      ctx.fillText(`${o.done ? '✓' : '○'}  ${o.label}`, 24, 100 + i * 20);
    });
    // Detection eye: the highest awareness among guards.
    const heat = game.maxAwareness();
    const ex = VIEW_W - 130, ey = 38;
    ctx.fillStyle = COLORS.panel;
    rr(ctx, ex - 12, ey - 26, 132, 52, 10); ctx.fill();
    ctx.fillStyle = heat >= 1 ? COLORS.danger : heat >= SUSPECT_COLOR_AT ? '#ffd166' : COLORS.hud;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(heat >= 1 ? 'SPOTTED!' : heat >= 0.55 ? 'SUSPICIOUS' : 'UNSEEN', ex, ey);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, ex, ey + 6, 108, 8, 4); ctx.fill();
    ctx.fillStyle = heat >= 1 ? COLORS.danger : '#ffd166';
    rr(ctx, ex, ey + 6, 108 * Math.min(1, heat), 8, 4); ctx.fill();
    // Controls hint.
    ctx.fillStyle = 'rgba(232,228,216,0.75)';
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows — move    Shift — run (loud)    C — sneak    P — pause    M — mute', VIEW_W / 2, VIEW_H - 10);
    this.drawMinimap(game);
  }

  drawMinimap(game) {
    const ctx = this.ctx;
    const s = 4.2, ox = VIEW_W - 150, oy = VIEW_H - 96;
    ctx.fillStyle = COLORS.panel;
    rr(ctx, ox - 6, oy - 6, MAP_W * s + 12, MAP_H * s + 12, 8); ctx.fill();
    for (let y = 0; y < game.world.h; y++) {
      for (let x = 0; x < game.world.w; x++) {
        const ch = game.world.tileAt(x, y);
        if (ch === '#') ctx.fillStyle = '#4d5c85';
        else if (ch === 'C') ctx.fillStyle = '#7a5f45';
        else if (ch === 'D') ctx.fillStyle = '#0e1424';
        else continue;
        ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(ox + (game.world.exit.x - 0.5) * s, oy + (game.world.exit.y - 0.5) * s, s * 2, s * 2);
    for (const o of game.mission.objectives) {
      if (o.done) continue;
      ctx.fillStyle = COLORS.objective;
      ctx.beginPath(); ctx.arc(ox + o.x * s, oy + o.y * s, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const gd of game.guards) {
      ctx.fillStyle = gd.state === GUARD_STATE.CHASE ? '#ff5040' : '#e8a33d';
      ctx.beginPath(); ctx.arc(ox + gd.x * s, oy + gd.y * s, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ox + game.player.x * s, oy + game.player.y * s, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  drawPaused(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 7, 16, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.font = '16px sans-serif';
    ctx.fillText('P or Esc — resume    ·    R — restart mission', VIEW_W / 2, VIEW_H / 2 + 24);
  }

  drawTitle(game) {
    const ctx = this.ctx;
    // Night gradient + a sweeping cone for atmosphere.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0a0f1e'); g.addColorStop(1, '#16203a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(VIEW_W / 2, 300);
    ctx.rotate(-0.5 + Math.sin(game.time * 0.4) * 0.08);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.10)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 420, -0.5, 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 92px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VEIL', VIEW_W / 2, 250);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '22px sans-serif';
    ctx.fillText('A night-infiltration stealth game — move unseen, or not at all.', VIEW_W / 2, 295);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(232,228,216,0.85)';
    ctx.fillText('Three jobs. Guards with eyes, ears and patrols. Shadows are your friends.', VIEW_W / 2, 330);
    // Mission cards.
    game.missions.forEach((m, i) => {
      const x = VIEW_W / 2 - 330 + i * 230, y = 400;
      const unlocked = game.unlocked >= m.id;
      ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
      rr(ctx, x, y, 210, 110, 12); ctx.fill();
      ctx.strokeStyle = unlocked ? '#ffd166' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = unlocked ? 2 : 1;
      rr(ctx, x, y, 210, 110, 12); ctx.stroke();
      ctx.fillStyle = unlocked ? COLORS.hud : 'rgba(232,228,216,0.4)';
      ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${m.id}. ${m.name}`, x + 16, y + 32);
      ctx.font = '13px sans-serif';
      const best = game.bestTimes[m.id];
      ctx.fillText(unlocked ? (best ? `Best: ${best}` : 'Not cleared yet') : 'Locked — clear the job before', x + 16, y + 60);
      ctx.fillText(unlocked ? `${m.objectives.length} objectives` : '', x + 16, y + 84);
    });
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(game.time % 1.6 < 0.8 ? 'Press 1, 2 or 3 — or click a job to begin' : ' ', VIEW_W / 2, 560);
    ctx.fillStyle = 'rgba(232,228,216,0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText('WASD move · Shift run (loud) · C sneak · P pause · M mute', VIEW_W / 2, 600);
  }

  drawEnd(game, won) {
    const ctx = this.ctx;
    ctx.fillStyle = won ? '#0d1f16' : '#230f0d';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = won ? COLORS.exit : COLORS.danger;
    ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(won ? 'GHOSTED IT.' : 'CAUGHT.', VIEW_W / 2, 260);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '20px sans-serif';
    if (won) {
      ctx.fillText(`${game.mission.name} — cleared in ${game.timerText()}`, VIEW_W / 2, 310);
      ctx.fillText(`Times spotted: ${game.timesSpotted}   ·   ${game.timesSpotted === 0 ? 'GHOST — never seen' : 'Seen, but you got away'}`, VIEW_W / 2, 344);
      if (game.mission.id < 3) ctx.fillText('Next job unlocked.', VIEW_W / 2, 378);
    } else {
      ctx.fillText(`${game.mission.name} — a guard laid hands on you.`, VIEW_W / 2, 310);
      ctx.fillText('Patience beats speed. Watch the cones. Use the dark.', VIEW_W / 2, 344);
    }
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Enter — try again      ·      T — title screen', VIEW_W / 2, 430);
  }
}

const SUSPECT_COLOR_AT = 0.55;
