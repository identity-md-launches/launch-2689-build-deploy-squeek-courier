import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPACITY, createGame, DURATION, HOME, SPEED, stepGame, WORLD, type Direction } from '../src/game/engine.ts';
import { getRhythm, MAX_AGE_MS, parseTelemetry, type Connection } from '../src/game/telemetry.ts';

const fixture = (now: number, overrides = {}) => ({ schemaVersion: 1, measurement: {
  observedAt: new Date(now).toISOString(), freshness: 'online', staleAfterSeconds: 120,
  coreStatus: 'IDLE', rpmMilli: 0, ...overrides,
} });
const playing = () => { const game = createGame(123); game.phase = 'playing' as const; return game; };
const empty = new Set<Direction>();

test('telemetry parses the actual schema, milli-RPM, and SPINNING state', () => {
  const now = Date.now();
  const connection: Connection = { state: 'ready', data: parseTelemetry(fixture(now, { coreStatus: 'SPINNING', rpmMilli: 42500 }), now) };
  const result = getRhythm('live', connection, now);
  assert.equal(result.valid, true); assert.equal(result.rhythm, 'running'); assert.equal(result.rpm, 42.5);
  assert.equal(connection.data?.measurement.staleAfterMs, MAX_AGE_MS);
});
test('offline, stale, server-declared stale, and future telemetry cannot advance live play', () => {
  const now = Date.now(); const data = parseTelemetry(fixture(now), now);
  for (const state of ['error', 'connecting'] as const) assert.equal(getRhythm('live', { state, data }, now).valid, false);
  assert.equal(getRhythm('live', { state: 'ready', data }, now + MAX_AGE_MS).valid, false);
  for (const overrides of [{ freshness: 'stale' }, { observedAt: new Date(now + 7000).toISOString() }, { staleAfterSeconds: .5 }]) {
    assert.equal(getRhythm('live', { state: 'ready', data: parseTelemetry(fixture(now, overrides), now) }, now + 1000).valid, false);
  }
});
test('bad schema and unknown hamster states fail closed', () => {
  for (const value of [null, {}, { schemaVersion: 2 }, fixture(Date.now(), { rpmMilli: '0' }), fixture(Date.now(), { coreStatus: 'UNKNOWN' }), fixture(Date.now(), { observedAt: 'invalid' }), fixture(Date.now(), { staleAfterSeconds: 0 })]) {
    assert.throws(() => parseTelemetry(value));
  }
});
test('practice modes work without telemetry and never invent live RPM', () => {
  for (const [mode, rhythm] of [['practice-rest', 'resting'], ['practice-run', 'running']] as const) {
    const result = getRhythm(mode, { state: 'error', data: null });
    assert.equal(result.valid, true); assert.equal(result.practice, true); assert.equal(result.rhythm, rhythm); assert.equal(result.rpm, null);
  }
});
test('collection caps the basket at five, and seeds respawn', () => {
  const game = playing(); game.rocks = [];
  game.seeds = Array.from({ length: 8 }, (_, id) => ({ ...game.player, id, angle: 0 }));
  stepGame(game, empty, .016, 'resting', true);
  assert.equal(game.cargo, CAPACITY); assert.equal(game.seeds.length, 8); assert.equal(game.score, 0);
  stepGame(game, empty, .016, 'resting', true); assert.equal(game.cargo, CAPACITY);
});
test('only returning home scores, empties the basket and counts the delivery', () => {
  const game = playing(); game.rocks = []; game.seeds = []; game.cargo = 4;
  stepGame(game, empty, .01, 'resting', true); assert.equal(game.score, 0);
  game.player.x = HOME.x; game.player.y = HOME.y;
  stepGame(game, empty, .01, 'resting', true);
  assert.equal(game.score, 4); assert.equal(game.cargo, 0); assert.equal(game.deliveries, 1);
  stepGame(game, empty, .01, 'resting', true); assert.equal(game.score, 4);
});
test('a collision drops one seed, slows the courier, and grants brief protection', () => {
  const game = playing(); game.seeds = []; game.cargo = 3;
  game.player.x = game.rocks[0].x; game.player.y = game.rocks[0].y;
  stepGame(game, empty, .016, 'resting', true);
  assert.equal(game.cargo, 2); assert.ok(game.slow > 0); assert.ok(game.invulnerable > 0);
  stepGame(game, empty, .016, 'resting', true); assert.equal(game.cargo, 2);
});
test('running is faster, diagonal movement is normalized and courier remains inside the garden', () => {
  function move(rhythm: 'resting' | 'running', directions: Direction[]) {
    const game = playing(); game.rocks = []; game.seeds = [];
    stepGame(game, new Set(directions), .05, rhythm, true); return game;
  }
  const rest = move('resting', ['right']), run = move('running', ['right']), diagonal = move('resting', ['right', 'down']);
  assert.ok(Math.abs(rest.player.x - 400 - SPEED.resting * .05) < .00001); assert.ok(Math.abs(run.player.x - 400 - SPEED.running * .05) < .00001);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 400, diagonal.player.y - 358) - SPEED.resting * .05) < .00001);
  rest.player.x = WORLD.width - 33; stepGame(rest, new Set(['right']), .05, 'running', true);
  assert.ok(rest.player.x <= WORLD.width - 32);
});
test('rocks move while running and retain their exact position when the hamster rests', () => {
  const game = playing(); const before = game.rocks.map(rock => [rock.x, rock.y]);
  stepGame(game, empty, .05, 'running', true);
  assert.notDeepEqual(game.rocks.map(rock => [rock.x, rock.y]), before);
  const stopped = game.rocks.map(rock => [rock.x, rock.y]);
  for (let i = 0; i < 20; i++) stepGame(game, empty, .05, 'resting', true);
  assert.deepEqual(game.rocks.map(rock => [rock.x, rock.y]), stopped);
});
test('pause/invalid telemetry freezes timer, player, rocks, particles and score', () => {
  const game = playing(); game.player.walking = false;
  const before = structuredClone(game);
  for (let i = 0; i < 60; i++) stepGame(game, new Set(['right']), .05, 'running', false);
  assert.deepEqual(game, before);
});
test('60 seconds ends the run and undelivered cargo is never banked', () => {
  const game = playing(); game.rocks = []; game.seeds = []; game.cargo = 5;
  assert.equal(game.time, DURATION);
  for (let i = 0; i < 1200; i++) stepGame(game, empty, .05, 'resting', true);
  assert.equal(game.phase, 'finished'); assert.equal(game.time, 0); assert.equal(game.score, 0); assert.equal(game.cargo, 5);
  game.player.x = HOME.x; game.player.y = HOME.y;
  stepGame(game, empty, .05, 'running', true); assert.equal(game.score, 0);
});

test('slow active frames count their full elapsed time without a physics jump', () => {
  const game = playing(); game.rocks = []; game.seeds = [];
  stepGame(game, new Set(['right']), 1, 'resting', true);
  assert.equal(game.time, 59);
  assert.ok(Math.abs(game.player.x - 400 - SPEED.resting * .05) < .00001);
});
