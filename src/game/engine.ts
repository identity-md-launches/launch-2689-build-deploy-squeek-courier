import type { Rhythm } from './telemetry';

export const WORLD = { width: 800, height: 520 };
export const HOME = { x: 400, y: 286, radius: 49 };
export const DURATION = 60;
export const CAPACITY = 5;
export const SPEED = { resting: 142, running: 210 };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Phase = 'ready' | 'playing' | 'finished';
export interface Point { x: number; y: number }
export interface Seed extends Point { angle: number; id: number }
export interface Rock extends Point { originX: number; originY: number; phase: number; radius: number }
export interface Particle extends Point { vx: number; vy: number; life: number; kind: 'seed' | 'leaf' }
export interface GameState {
  phase: Phase;
  player: Point & { facing: number; walking: boolean };
  seeds: Seed[];
  rocks: Rock[];
  particles: Particle[];
  time: number;
  score: number;
  cargo: number;
  deliveries: number;
  invulnerable: number;
  slow: number;
  elapsed: number;
  event: string;
  eventId: number;
  rng: number;
  nextId: number;
}
export function random(state: GameState): number {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function spawnPoint(state: GameState): Point {
  for (let i = 0; i < 200; i++) {
    const point = { x: 65 + random(state) * 670, y: 65 + random(state) * 390 };
    if (distance(point, HOME) > 105 && distance(point, state.player) > 65 &&
      !state.rocks.some(rock => distance(point, rock) < 58) &&
      !state.seeds.some(seed => distance(point, seed) < 35)) return point;
  }
  return { x: 85, y: 260 };
}
export function createGame(seed = Date.now()): GameState {
  const state: GameState = {
    phase: 'ready', player: { x: 400, y: 358, facing: 1, walking: false },
    seeds: [], rocks: [], particles: [], time: DURATION, score: 0, cargo: 0,
    deliveries: 0, invulnerable: 0, slow: 0, elapsed: 0, event: '', eventId: 0,
    rng: seed >>> 0, nextId: 0,
  };
  for (const [x, y] of [[214, 142], [579, 124], [648, 323], [181, 367], [520, 427], [344, 91]]) {
    state.rocks.push({ x, y, originX: x, originY: y, phase: random(state) * Math.PI * 2, radius: 20 });
  }
  for (let i = 0; i < 17; i++) addSeed(state);
  return state;
}
function addSeed(state: GameState) {
  state.seeds.push({ ...spawnPoint(state), angle: random(state) * Math.PI, id: state.nextId++ });
}
function notify(state: GameState, text: string) { state.event = text; state.eventId++; }
function burst(state: GameState, point: Point, amount: number, kind: Particle['kind']) {
  for (let i = 0; i < amount; i++) state.particles.push({ ...point,
    vx: (random(state) - .5) * 100, vy: (random(state) - .5) * 100,
    life: .65, kind });
}

/** All simulation time stops when the caller is paused or the live rhythm is invalid. */
export function stepGame(state: GameState, input: ReadonlySet<Direction>, dt: number,
  rhythm: Rhythm, allowed: boolean): void {
  if (state.phase !== 'playing' || !allowed || !Number.isFinite(dt) || dt <= 0) {
    state.player.walking = false;
    return;
  }
  // Count real active time even on slower devices, while limiting physics jumps.
  state.time = Math.max(0, state.time - dt);
  dt = Math.min(dt, .05);
  if (state.time <= .00001) {
    state.time = 0;
    state.phase = 'finished';
    state.player.walking = false;
    notify(state, `Run complete. ${state.score} seeds delivered. ${state.cargo} left in your basket.`);
    return;
  }
  state.elapsed += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.slow = Math.max(0, state.slow - dt);
  let dx = Number(input.has('right')) - Number(input.has('left'));
  let dy = Number(input.has('down')) - Number(input.has('up'));
  const length = Math.hypot(dx, dy) || 1;
  dx /= length; dy /= length;
  const speed = SPEED[rhythm] * (state.slow > 0 ? .45 : 1);
  state.player.x = Math.max(32, Math.min(WORLD.width - 32, state.player.x + dx * speed * dt));
  state.player.y = Math.max(43, Math.min(WORLD.height - 36, state.player.y + dy * speed * dt));
  if (dx) state.player.facing = dx > 0 ? 1 : -1;
  state.player.walking = dx !== 0 || dy !== 0;
  for (const rock of state.rocks) {
    if (rhythm === 'running') {
      rock.phase += dt * 1.4;
      rock.x = rock.originX + Math.sin(rock.phase) * 27;
      rock.y = rock.originY + Math.cos(rock.phase * .8) * 15;
    }
    // In rest mode the actual last position is retained, with no jump to the origin.
    if (state.invulnerable === 0 && distance(state.player, rock) < rock.radius + 16) {
      const lost = state.cargo > 0;
      state.cargo = Math.max(0, state.cargo - 1);
      state.invulnerable = 1.3;
      state.slow = .7;
      notify(state, lost ? 'Rock bump! One seed dropped.' : 'Rock bump! Slowed for a moment.');
      burst(state, state.player, 6, 'leaf');
    }
  }
  for (let i = state.seeds.length - 1; i >= 0; i--) {
    if (state.cargo < CAPACITY && distance(state.player, state.seeds[i]) < 26) {
      const seed = state.seeds.splice(i, 1)[0];
      state.cargo++;
      burst(state, seed, 5, 'seed');
      notify(state, state.cargo === CAPACITY ? 'Basket full! Bring five seeds home.' : `${state.cargo} of five seeds collected.`);
      addSeed(state);
    }
  }
  if (state.cargo > 0 && distance(state.player, HOME) < HOME.radius) {
    const delivered = state.cargo;
    state.score += delivered;
    state.cargo = 0;
    state.deliveries++;
    burst(state, HOME, 18, 'seed');
    notify(state, `${delivered} ${delivered === 1 ? 'seed' : 'seeds'} delivered! ${state.score} total.`);
  }
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    return p.life > 0;
  });
}
