import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import {
  distanceMeters,
  Point,
  Run,
  seasonAt,
  validPoint,
  validSegment,
} from './domain';
type Session = {
  id: string;
  startedAt: number;
  regionId: string;
  seasonId: string;
  end: number;
  mode: Run['mode'];
  meters: number;
  seconds: number;
  points: Point[];
  last: Point | null;
  resumedAt: number;
  active: boolean;
};
export function useRunner() {
  const session = useRef<Session | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const [revision, refresh] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const snapshot = () => {
    refresh((n) => n + 1);
  };
  function checkpoint(now = Date.now()) {
    const s = session.current;
    if (!s || !s.active) return;
    const elapsed =
      (Math.max(0, Math.min(now, s.end) - s.resumedAt) / 1000) *
      (s.mode === 'demo' ? 10 : 1);
    s.seconds += elapsed;
    if (s.mode === 'demo') s.meters += elapsed * 3.1;
    s.resumedAt = Math.min(now, s.end);
  }
  function pause() {
    checkpoint();
    if (session.current) {
      session.current.active = false;
      session.current.last = null;
    }
    subscription.current?.remove();
    subscription.current = null;
    snapshot();
  }
  async function watch() {
    subscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 3,
      },
      (location) => {
        const s = session.current;
        if (!s?.active || location.timestamp >= s.end) return;
        const p: Point = { ...location.coords, timestamp: location.timestamp };
        if (!validPoint(p)) {
          setMessage('GPS 정확도가 낮아요. 탁 트인 곳으로 이동해 주세요.');
          return;
        }
        // Outliers are discarded, not installed as the next segment origin.
        if (
          s.last &&
          p.timestamp - s.last.timestamp <= 30000 &&
          !validSegment(s.last, p)
        )
          return;
        if (s.last && validSegment(s.last, p))
          s.meters += distanceMeters(s.last, p);
        s.last = p;
        s.points.push(p);
        setMessage('GPS 수신 중 · 위치는 기기에만 저장됩니다.');
        snapshot();
      },
    );
    if (!session.current?.active) {
      subscription.current.remove();
      subscription.current = null;
    }
  }
  async function start(mode: Run['mode'], regionId: string) {
    if (pending.current || session.current) return;
    pending.current = true;
    setRequesting(true);
    setMessage('');
    try {
      if (mode === 'gps') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted')
          throw new Error(
            '위치 권한이 필요해요. 설정에서 허용하거나 데모 러닝을 선택해 주세요.',
          );
      }
      const now = Date.now(),
        season = seasonAt(now);
      session.current = {
        id: `run-${now}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt: now,
        regionId,
        seasonId: season.id,
        end: season.end,
        mode,
        meters: 0,
        seconds: 0,
        points: [],
        last: null,
        resumedAt: now,
        active: true,
      };
      if (mode === 'gps') await watch();
      snapshot();
    } catch (error) {
      pause();
      session.current = null;
      setMessage(
        error instanceof Error ? error.message : 'GPS를 시작할 수 없어요.',
      );
    } finally {
      pending.current = false;
      setRequesting(false);
    }
  }
  async function resume() {
    const s = session.current;
    if (!s || s.active || pending.current) return;
    if (Date.now() >= s.end) {
      setMessage(
        '시즌이 종료되었어요. 이 기록을 저장하고 새 지역을 선택해 주세요.',
      );
      return;
    }
    pending.current = true;
    setRequesting(true);
    s.resumedAt = Date.now();
    s.active = true;
    try {
      if (s.mode === 'gps') await watch();
      snapshot();
    } catch {
      pause();
      setMessage(
        'GPS 연결에 실패했어요. 위치 설정을 확인하고 다시 시작해 주세요.',
      );
    } finally {
      pending.current = false;
      setRequesting(false);
    }
  }
  function finish(): Run | null {
    pause();
    const s = session.current;
    if (!s || s.seconds <= 0) return null;
    const run: Run = {
      id: s.id,
      startedAt: s.startedAt,
      endedAt: Math.min(Date.now(), s.end),
      seasonId: s.seasonId,
      regionId: s.regionId,
      meters: s.meters,
      seconds: s.seconds,
      mode: s.mode,
      points: s.points,
    };
    session.current = null;
    setMessage('');
    snapshot();
    return run;
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (session.current?.active) {
        checkpoint();
        if (Date.now() >= session.current.end) {
          pause();
          setMessage('시즌이 종료되어 측정을 멈췄어요. 기록을 저장해 주세요.');
        }
        snapshot();
      }
    }, 500);
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && session.current?.active) {
        pause();
        setMessage(
          '앱이 비활성화되어 일시정지했어요. 돌아오면 이어 달려 주세요.',
        );
      }
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      subscription.current?.remove();
    };
  }, []);
  void revision;
  return {
    session: session.current,
    requesting,
    message,
    start,
    pause,
    resume,
    finish,
  };
}
