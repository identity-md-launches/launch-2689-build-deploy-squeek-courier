export const STATUS_URL = 'https://api.squeekchain.com/v1/status';
export const POLL_MS = 10_000;
export const REQUEST_TIMEOUT_MS = 7_000;
// Stop conservatively even when the service permits a longer freshness window.
export const MAX_AGE_MS = 30_000;

export type Mode = 'live' | 'practice-rest' | 'practice-run';
export type Rhythm = 'resting' | 'running';
export interface Measurement {
  observedAt: number;
  staleAfterMs: number;
  freshness: string;
  rhythm: Rhythm;
  rpm: number;
}
export interface Telemetry {
  measurement: Measurement;
  receivedAt: number;
}
export interface Connection {
  data: Telemetry | null;
  state: 'connecting' | 'ready' | 'error';
}
export interface RhythmState {
  valid: boolean;
  rhythm: Rhythm;
  practice: boolean;
  rpm: number | null;
  ageSeconds: number | null;
  reason: 'practice' | 'connecting' | 'unavailable' | 'stale' | 'ready';
}

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;

export function parseTelemetry(value: unknown, now = Date.now()): Telemetry {
  const root = object(value);
  const m = object(root?.measurement);
  if (!m || root?.schemaVersion !== 1) throw new Error('Unsupported telemetry');
  const observedAt = typeof m.observedAt === 'string' ? Date.parse(m.observedAt) : NaN;
  if (!Number.isFinite(observedAt) || typeof m.rpmMilli !== 'number' ||
      !Number.isFinite(m.rpmMilli) || m.rpmMilli < 0 ||
      typeof m.staleAfterSeconds !== 'number' || !Number.isFinite(m.staleAfterSeconds) ||
      m.staleAfterSeconds <= 0 || typeof m.freshness !== 'string' ||
      !['IDLE', 'SPINNING'].includes(String(m.coreStatus))) {
    throw new Error('Invalid wheel measurement');
  }
  return {
    measurement: {
      observedAt,
      staleAfterMs: Math.min(m.staleAfterSeconds * 1000, MAX_AGE_MS),
      freshness: m.freshness,
      rhythm: m.coreStatus === 'SPINNING' ? 'running' : 'resting',
      rpm: m.rpmMilli / 1000,
    },
    receivedAt: now,
  };
}

export function getRhythm(mode: Mode, connection: Connection, now = Date.now()): RhythmState {
  if (mode !== 'live') {
    return { valid: true, rhythm: mode === 'practice-run' ? 'running' : 'resting',
      practice: true, rpm: null, ageSeconds: null, reason: 'practice' };
  }
  const measurement = connection.data?.measurement;
  const age = measurement ? now - measurement.observedAt : null;
  const common = { rhythm: measurement?.rhythm ?? 'resting' as Rhythm, practice: false,
    rpm: null, ageSeconds: age === null ? null : Math.max(0, Math.floor(age / 1000)) };
  if (connection.state === 'connecting') return { ...common, valid: false, reason: 'connecting' };
  if (connection.state === 'error' || !measurement) return { ...common, valid: false, reason: 'unavailable' };
  const valid = measurement.freshness === 'online' && age !== null && age >= -5000 &&
    age < measurement.staleAfterMs && connection.data !== null &&
    now - connection.data.receivedAt < MAX_AGE_MS;
  return { ...common, valid, rpm: valid ? measurement.rpm : null, reason: valid ? 'ready' : 'stale' };
}
