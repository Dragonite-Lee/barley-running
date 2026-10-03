import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeRegion,
  distanceMeters,
  EMPTY_STATE,
  finishRun,
  pace,
  parseState,
  ranking,
  SEASON_EPOCH,
  SEASON_MS,
  seasonAt,
  selectRegion,
  validPoint,
  validSegment,
  type Point,
  type Run,
} from '../src/lib/domain';
const p = (
  latitude: number,
  timestamp: number,
  accuracy: number | null = 5,
): Point => ({ latitude, longitude: 126.9, timestamp, accuracy });
const run: Run = {
  id: 'test-run',
  startedAt: SEASON_EPOCH + 1000,
  endedAt: SEASON_EPOCH + 301000,
  seasonId: 'season-1',
  regionId: 'mapo',
  meters: 1000,
  seconds: 300,
  mode: 'demo',
  points: [],
};
test('season resets precisely after 21 days in KST', () => {
  assert.equal(seasonAt(SEASON_EPOCH).id, 'season-1');
  assert.equal(seasonAt(SEASON_EPOCH + SEASON_MS - 1).id, 'season-1');
  assert.equal(seasonAt(SEASON_EPOCH + SEASON_MS).id, 'season-2');
  assert.equal(seasonAt(SEASON_EPOCH + SEASON_MS).daysLeft, 21);
});
test('region cannot change mid-season but unlocks next season without deleting history', () => {
  const first = selectRegion(
    { ...EMPTY_STATE, runs: [run] },
    'mapo',
    SEASON_EPOCH,
  );
  assert.throws(() => selectRegion(first, 'songpa', SEASON_EPOCH + 10));
  const next = selectRegion(first, 'songpa', SEASON_EPOCH + SEASON_MS);
  assert.equal(activeRegion(next.profile, SEASON_EPOCH + SEASON_MS), 'songpa');
  assert.equal(next.runs.length, 1);
  assert.equal(activeRegion(first.profile, SEASON_EPOCH + SEASON_MS), null);
});
test('unsupported regions are rejected', () =>
  assert.throws(() => selectRegion(EMPTY_STATE, 'unknown')));
test('distance uses geographic meters', () =>
  assert.ok(
    Math.abs(distanceMeters(p(37.5, 0), p(37.501, 1000)) - 111.195) < 0.01,
  ));
test('GPS rejects inaccurate, missing accuracy, stale and impossible-speed points', () => {
  assert.equal(validSegment(p(37.5, 0), p(37.50005, 2000)), true);
  assert.equal(validSegment(p(37.5, 0), p(38.5, 2000)), false);
  assert.equal(validSegment(p(37.5, 0), p(37.50005, 31000)), false);
  assert.equal(validSegment(p(37.5, 0), p(37.50005, 2000, 100)), false);
  assert.equal(validPoint(p(37.5, 2000, null)), false);
  assert.equal(validPoint(p(91, 2000)), false);
});
test('pace is per km with carry handled correctly', () => {
  assert.equal(pace(1000, 300), '5′00″');
  assert.equal(pace(1000, 359.8), '6′00″');
  assert.equal(pace(0, 300), '—');
});
test('finish is idempotent and retains run start-season attribution', () => {
  const first = finishRun(EMPTY_STATE, run);
  assert.equal(finishRun(first, run).runs.length, 1);
  assert.equal(first.runs[0].seasonId, 'season-1');
  assert.throws(() => finishRun(EMPTY_STATE, { ...run, meters: NaN }));
  assert.throws(() => finishRun(EMPTY_STATE, { ...run, seasonId: 'season-2' }));
});
test('leaderboard uses current season runs only', () => {
  assert.equal(
    ranking([run], 'season-1').find((r) => r.id === 'mapo')!.km,
    1187.2,
  );
  assert.equal(
    ranking([run], 'season-2').find((r) => r.id === 'mapo')!.km,
    1186.2,
  );
});
test('persistence preserves consent and runs, rejects corrupt data', () => {
  const value = finishRun(selectRegion(EMPTY_STATE, 'mapo', SEASON_EPOCH), run);
  assert.deepEqual(parseState(JSON.stringify(value)), value);
  assert.deepEqual(parseState(null), EMPTY_STATE);
  assert.throws(() => parseState('{oops'));
  assert.throws(() => parseState('{"version":99}'));
  assert.throws(() =>
    parseState(JSON.stringify({ ...value, runs: [{ ...run, meters: -10 }] })),
  );
});
