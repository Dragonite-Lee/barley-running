export const SEASON_MS = 21 * 24 * 60 * 60 * 1000;
// Every participant shares one season boundary: 2026-09-28 00:00 KST.
export const SEASON_EPOCH = Date.parse('2026-09-28T00:00:00+09:00');
export function seasonAt(time = Date.now()) {
  const index = Math.floor((time - SEASON_EPOCH) / SEASON_MS);
  const start = SEASON_EPOCH + index * SEASON_MS;
  return {
    id: `season-${index + 1}`,
    number: index + 1,
    start,
    end: start + SEASON_MS,
    daysLeft: Math.ceil((start + SEASON_MS - time) / 86400000),
  };
}
export const REGIONS = [
  {
    id: 'yeongdeungpo',
    name: '영등포구',
    city: '서울',
    km: 1248.6,
    people: 128,
  },
  { id: 'mapo', name: '마포구', city: '서울', km: 1186.2, people: 116 },
  { id: 'seongdong', name: '성동구', city: '서울', km: 1082.4, people: 104 },
  { id: 'songpa', name: '송파구', city: '서울', km: 946.8, people: 98 },
  { id: 'gangnam', name: '강남구', city: '서울', km: 872.1, people: 91 },
  { id: 'haeundae', name: '해운대구', city: '부산', km: 814.5, people: 87 },
];
export type Point = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
};
export type Run = {
  id: string;
  seasonId: string;
  regionId: string;
  startedAt: number;
  endedAt: number;
  meters: number;
  seconds: number;
  mode: 'demo' | 'gps';
  points: Point[];
};
export type Profile = {
  name: string;
  consent: boolean;
  regionId: string | null;
  seasonId: string | null;
};
export type State = { version: 1; profile: Profile; runs: Run[] };
export const EMPTY_STATE: State = {
  version: 1,
  profile: { name: '보리러너', consent: false, regionId: null, seasonId: null },
  runs: [],
};
export function activeRegion(profile: Profile, now = Date.now()) {
  return profile.seasonId === seasonAt(now).id ? profile.regionId : null;
}
export function selectRegion(
  state: State,
  regionId: string,
  now = Date.now(),
): State {
  if (!REGIONS.some((r) => r.id === regionId))
    throw new Error('지원하지 않는 지역입니다.');
  const current = activeRegion(state.profile, now);
  if (current && current !== regionId)
    throw new Error('이번 시즌에는 지역을 변경할 수 없어요.');
  return {
    ...state,
    profile: { ...state.profile, regionId, seasonId: seasonAt(now).id },
  };
}
export function distanceMeters(a: Point, b: Point) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export function validPoint(p: Point) {
  return (
    [p.latitude, p.longitude, p.timestamp].every(Number.isFinite) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    p.accuracy !== null &&
    Number.isFinite(p.accuracy) &&
    p.accuracy >= 0 &&
    p.accuracy <= 40
  );
}
export function validSegment(a: Point, b: Point) {
  if (!validPoint(a) || !validPoint(b)) return false;
  const seconds = (b.timestamp - a.timestamp) / 1000;
  return seconds > 0 && seconds <= 30 && distanceMeters(a, b) / seconds <= 8;
}
export function pace(meters: number, seconds: number) {
  if (meters < 10 || seconds <= 0) return '—';
  const value = Math.round(seconds / (meters / 1000));
  return `${Math.floor(value / 60)}′${String(value % 60).padStart(2, '0')}″`;
}
export function duration(seconds: number) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function ranking(runs: Run[], seasonId: string) {
  return REGIONS.map((region) => ({
    ...region,
    km:
      region.km +
      runs
        .filter((r) => r.seasonId === seasonId && r.regionId === region.id)
        .reduce((s, r) => s + r.meters / 1000, 0),
  })).sort((a, b) => b.km - a.km);
}
export function finishRun(state: State, run: Run): State {
  if (state.runs.some((r) => r.id === run.id)) return state;
  if (
    !Number.isFinite(run.meters) ||
    !Number.isFinite(run.seconds) ||
    run.meters < 0 ||
    run.seconds <= 0 ||
    !REGIONS.some((r) => r.id === run.regionId) ||
    run.seasonId !== seasonAt(run.startedAt).id
  )
    throw new Error('유효하지 않은 러닝 기록입니다.');
  return { ...state, runs: [run, ...state.runs] };
}
export function parseState(raw: string | null): State {
  if (!raw) return EMPTY_STATE;
  const data = JSON.parse(raw) as State;
  if (
    data.version !== 1 ||
    !data.profile ||
    typeof data.profile.name !== 'string' ||
    typeof data.profile.consent !== 'boolean' ||
    !(
      data.profile.regionId === null ||
      REGIONS.some((r) => r.id === data.profile.regionId)
    ) ||
    !(
      data.profile.seasonId === null ||
      typeof data.profile.seasonId === 'string'
    ) ||
    !Array.isArray(data.runs)
  )
    throw new Error('저장 데이터 형식이 올바르지 않습니다.');
  for (const run of data.runs) {
    if (
      !run ||
      typeof run.id !== 'string' ||
      typeof run.seasonId !== 'string' ||
      !REGIONS.some((r) => r.id === run.regionId) ||
      ![run.meters, run.seconds, run.startedAt, run.endedAt].every(
        Number.isFinite,
      ) ||
      run.meters < 0 ||
      run.seconds <= 0 ||
      !['demo', 'gps'].includes(run.mode) ||
      !Array.isArray(run.points) ||
      !run.points.every(validPoint)
    )
      throw new Error('저장된 러닝 기록을 읽을 수 없습니다.');
  }
  return data;
}
