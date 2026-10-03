import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  Modal,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Barley,
  FieldArt,
  Icon,
  IconName,
  RouteArt,
} from './src/components/Art';
import {
  activeRegion,
  duration,
  EMPTY_STATE,
  finishRun,
  pace,
  parseState,
  ranking,
  REGIONS,
  Run,
  seasonAt,
  selectRegion,
  State,
} from './src/lib/domain';
import { useRunner } from './src/lib/useRunner';
const C = {
  bg: '#F6F5EF',
  paper: '#FFFFFF',
  green: '#244A3A',
  dark: '#183D2D',
  gold: '#E7B95C',
  ink: '#263D32',
  muted: '#778176',
  line: '#E5E8DF',
  pale: '#EEF1E8',
};
const KEY = 'barley-run:v1';
type Tab = 'home' | 'tournament' | 'run' | 'impact' | 'profile';
const TABS: { id: Tab; title: string; icon: IconName }[] = [
  { id: 'home', title: '홈', icon: 'home' },
  { id: 'tournament', title: '지역 토너먼트', icon: 'trophy' },
  { id: 'run', title: '러닝', icon: 'run' },
  { id: 'impact', title: '함께 만든 기부', icon: 'heart' },
  { id: 'profile', title: '나의 기록', icon: 'user' },
];
function Button({
  title,
  onPress,
  secondary,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.green }]}>
        {title}
      </Text>
      {icon && (
        <Icon name={icon} color={secondary ? C.green : '#fff'} size={18} />
      )}
    </Pressable>
  );
}
function Badge({
  children,
  gold = false,
}: {
  children: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <View style={[s.badge, gold && { backgroundColor: '#F8ECCF' }]}>
      <Text style={[s.badgeText, gold && { color: '#7B5D20' }]}>
        {children}
      </Text>
    </View>
  );
}
function Heading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <View style={{ gap: 9, marginBottom: 25 }}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={s.pageTitle}>
        {title}
      </Text>
      {text && <Text style={s.sub}>{text}</Text>}
    </View>
  );
}
function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.sectionTitle}>
      <Text accessibilityRole="header" style={s.h2}>
        {title}
      </Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text style={s.link}>{action} ↗</Text>
        </Pressable>
      )}
    </View>
  );
}
function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <View style={s.stat}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.unit}>{unit}</Text>
      </View>
      {note && <Text style={s.small}>{note}</Text>}
    </View>
  );
}
const date = (n: number) =>
  new Date(n).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  });
export default function App() {
  return (
    <SafeAreaProvider>
      <BarleyApp />
    </SafeAreaProvider>
  );
}
function BarleyApp() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const wide = width >= 730;
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<State>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [storageBroken, setStorageBroken] = useState(false);
  const [regionModal, setRegionModal] = useState(false);
  const [regionChoice, setRegionChoice] = useState('yeongdeungpo');
  const [query, setQuery] = useState('');
  const [info, setInfo] = useState('');
  const [resetModal, setResetModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const queue = useRef(Promise.resolve());
  const scroller = useRef<ScrollView>(null);
  const runner = useRunner();
  const season = seasonAt(now);
  const regionId = activeRegion(data.profile, now);
  const region = REGIONS.find((r) => r.id === regionId);
  const board = ranking(data.runs, season.id);
  const myRuns = data.runs.filter((r) => r.seasonId === season.id);
  const total = myRuns.reduce((sum, r) => sum + r.meters, 0);
  const myRank = region ? board.findIndex((r) => r.id === region.id) + 1 : null;
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setData(parseState(raw)))
      .catch(() => {
        setStorageError(
          '기존 기록을 읽지 못했어요. 원본을 덮어쓰지 않도록 저장을 중지했습니다. 브라우저 저장소 설정을 확인하거나 나의 기록에서 초기화해 주세요.',
        );
        setStorageBroken(true);
      })
      .finally(() => setLoaded(true));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);
  function save(next: State) {
    if (storageBroken) {
      setInfo('저장소 오류를 먼저 해결해 주세요.');
      return;
    }
    setData(next);
    queue.current = queue.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setStorageError(''))
      .catch(() =>
        setStorageError(
          '기기 저장에 실패했어요. 현재 화면에는 남아 있지만 앱을 닫으면 유실될 수 있습니다. 저장 공간을 확인해 주세요.',
        ),
      );
  }
  function chooseRegion() {
    try {
      save(selectRegion(data, regionChoice));
      setRegionModal(false);
      setInfo('우리 동네 팀에 합류했어요. 첫 걸음을 시작해 볼까요?');
    } catch (e) {
      setInfo((e as Error).message);
    }
  }
  function endRun() {
    const run = runner.finish();
    if (run) {
      save(finishRun(data, run));
      setInfo(
        `${(run.meters / 1000).toFixed(2)} km 기록을 남겼어요. ${run.mode === 'demo' ? '데모 기록이며 실제 대회에는 반영되지 않습니다.' : '이 기기의 기록에 저장됩니다.'}`,
      );
      setTab('profile');
    }
  }
  function nav(id: Tab) {
    setTab(id);
    setInfo('');
  }
  function RegionButton() {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (region)
            setInfo(
              '이번 시즌 지역은 고정되어 있어요. 다음 시즌 시작 후 다시 선택할 수 있습니다.',
            );
          else if (runner.session)
            setInfo('진행 중인 러닝을 먼저 저장해 주세요.');
          else setRegionModal(true);
        }}
        style={s.regionPill}
      >
        <Icon name="pin" size={16} />
        <Text style={s.regionText}>
          {region ? `${region.city} ${region.name}` : '내 지역 선택'}
        </Text>
        <Text style={s.small}>⌄</Text>
      </Pressable>
    );
  }
  function Leaderboard({ compact = false }: { compact?: boolean }) {
    return (
      <View>
        {board.slice(0, compact ? 4 : 6).map((r, index) => (
          <View key={r.id} style={[s.rankRow, r.id === regionId && s.myRank]}>
            <Text style={[s.rankNumber, index === 0 && { color: '#AE8131' }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View
              style={[
                s.regionAvatar,
                {
                  backgroundColor: ['#F5E9CB', '#E8ECDC', '#E4E9E3'][index % 3],
                },
              ]}
            >
              <Icon name={index === 0 ? 'trophy' : 'pin'} size={20} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={[s.row, { gap: 8 }]}>
                <Text style={s.rankName}>{r.name}</Text>
                {r.id === regionId && <Text style={s.you}>MY TEAM</Text>}
              </View>
              <Text style={s.small}>
                {r.city} · 샘플 러너 {r.people}명
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={s.km}>
                {r.km.toLocaleString('en-US', {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}{' '}
                <Text style={s.small}>km</Text>
              </Text>
              <View
                style={{
                  width: 64,
                  height: 3,
                  backgroundColor: C.pale,
                  borderRadius: 9,
                }}
              >
                <View
                  style={{
                    width: `${(r.km / board[0].km) * 100}%`,
                    height: 3,
                    backgroundColor: index === 0 ? C.gold : '#A1B19A',
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }
  function Home() {
    return (
      <>
        <Heading
          eyebrow="A LITTLE RUN, A BETTER WORLD"
          title="오늘도, 우리 동네를 위해."
          text="혼자 달려도 함께 쌓이는 좋은 변화."
        />
        <View
          style={[s.hero, !wide && { padding: 25, flexDirection: 'column' }]}
        >
          <View style={{ flex: wide ? 1 : undefined, zIndex: 1, gap: 18 }}>
            <View style={s.row}>
              <View style={s.liveDot} />
              <Text style={s.heroEyebrow}>
                SEASON {String(season.number).padStart(2, '0')} ·{' '}
                {season.daysLeft}일 남음
              </Text>
            </View>
            <Text
              style={[s.heroTitle, !wide && { fontSize: 26, lineHeight: 36 }]}
            >
              {wide
                ? '우리가 달린 만큼,\n세상은 조금 더 풍요롭게.'
                : '우리가 달린 만큼,\n세상은 더 풍요롭게.'}
            </Text>
            <Text style={s.heroSub}>
              당신의 1km가 우리 동네의 이름이 되고,{'\n'}함께 모은 마음은 따뜻한
              기부가 됩니다.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => nav('run')}
              style={s.goldButton}
            >
              <Text style={s.goldText}>오늘의 러닝 시작</Text>
              <Icon name="arrow" size={19} />
            </Pressable>
            <Text style={s.heroFoot}>RUN TOGETHER. GROW TOGETHER.</Text>
          </View>
          <View
            style={
              wide
                ? { width: '43%', alignSelf: 'center' }
                : { height: 160, width: '100%', marginTop: -4 }
            }
          >
            <FieldArt small={!wide} />
          </View>
        </View>
        <View style={[s.stats, !wide && { flexWrap: 'wrap' }]}>
          <Stat
            label="나의 이번 시즌 거리"
            value={(total / 1000).toFixed(2)}
            unit="km"
            note={`${myRuns.length}번의 러닝 · 이 기기 기준`}
          />
          <Stat
            label="우리 동네 순위"
            value={myRank ? String(myRank).padStart(2, '0') : '—'}
            unit={myRank ? '/ 6' : ''}
            note={
              region
                ? `${region.name}, 함께 달려요`
                : '이번 시즌 지역을 선택해 주세요'
            }
          />
          <Stat
            label="이번 시즌 기부 예정 · 예시"
            value="328,500"
            unit="원"
            note="실제 광고 수익·기부금이 아닙니다"
          />
        </View>
        <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
          <View style={[s.card, { flex: wide ? 1.2 : undefined }]}>
            <SectionTitle
              title="우리 동네는 지금"
              action="전체 순위"
              onPress={() => nav('tournament')}
            />
            <View
              style={[
                s.row,
                { marginBottom: 15, justifyContent: 'space-between' },
              ]}
            >
              <Text style={s.small}>
                {date(season.start)} — {date(season.end - 1)}
              </Text>
              <Badge>데모 순위</Badge>
            </View>
            <Leaderboard compact />
          </View>
          <View style={[s.card, { flex: wide ? 1 : undefined }]}>
            <SectionTitle title="달리기가 선물이 되는 곳" />
            <View style={s.fieldCard}>
              <Text style={s.fieldSmall}>THIS SEASON’S GOOD</Text>
              <Barley size={69} />
              <Text style={s.fieldTitle}>
                좋은 달리기 끝에,{'\n'}푸른 보리밭 하나.
              </Text>
              <Text style={s.small}>보리밭 가꾸기 · 기부처 콘셉트</Text>
            </View>
            <Text style={[s.body, { marginTop: 18 }]}>
              이번 시즌 1위 지역의 이름으로,{'\n'}더 푸른 내일을 함께 심어요.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => nav('impact')}
              style={s.inlineLink}
            >
              <Text style={s.link}>기부 이야기 살펴보기</Text>
              <Icon name="arrow" size={18} />
            </Pressable>
          </View>
        </View>
        <View style={s.bottomNote}>
          <Barley size={27} color="#8E9D7D" />
          <Text style={s.small}>
            달린 뒤의 시원한 한 잔처럼, 좋은 일도 기분 좋게.
          </Text>
          <Text style={s.wordmarkSmall}>BARLEY RUN</Text>
        </View>
      </>
    );
  }
  function Tournament() {
    return (
      <>
        <Heading
          eyebrow="YOUR DISTRICT, YOUR TEAM"
          title="우리는 동네의 이름으로 달려요."
          text="21일 동안 쌓은 거리로 겨루고, 함께 만든 마음을 나눕니다."
        />
        <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
          <View style={[s.card, { flex: wide ? 1.5 : undefined }]}>
            <SectionTitle
              title={`시즌 ${String(season.number).padStart(2, '0')} 지역 토너먼트`}
            />
            <View
              style={[
                s.row,
                { justifyContent: 'space-between', marginBottom: 24 },
              ]}
            >
              <Text style={s.small}>
                {date(season.start)} — {date(season.end - 1)} · KST
              </Text>
              <Badge gold>D-{season.daysLeft}</Badge>
            </View>
            <View style={s.notice}>
              <Text style={s.small}>
                데모 리그 · 아래 순위는 샘플 거리 + 이 기기의 기록입니다. 실제
                이용자와 경쟁하지 않습니다.
              </Text>
            </View>
            <Leaderboard />
            <Text style={[s.small, { marginTop: 20 }]}>
              지역 누적 거리 순 · 동률 시 공동 우승 정책은 정식 버전에서
              확정합니다.
            </Text>
          </View>
          <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
            <View style={[s.card, { backgroundColor: C.green }]}>
              <Text style={s.heroEyebrow}>MY DISTRICT</Text>
              <Text style={[s.h2, { color: '#fff', marginVertical: 19 }]}>
                {region
                  ? `${region.city} ${region.name}`
                  : '어느 동네와 함께할까요?'}
              </Text>
              <Text style={s.heroSub}>
                {region
                  ? '이번 시즌에는 이 지역과 끝까지 함께해요. 다음 시즌에는 새로운 지역을 선택할 수 있어요.'
                  : '사는 곳이 아니어도 좋아요. 응원하고 싶은 동네의 이름으로 달려보세요.'}
              </Text>
              <View style={{ marginTop: 22 }}>
                <Button
                  title={
                    region ? '우리 동네를 위해 달리기' : '이번 시즌 지역 선택'
                  }
                  onPress={() =>
                    region
                      ? nav('run')
                      : runner.session
                        ? setInfo('진행 중인 러닝을 먼저 저장해 주세요.')
                        : setRegionModal(true)
                  }
                  secondary
                />
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.h2}>함께 달리는 약속</Text>
              {[
                '한 시즌은 21일, 지역 선택은 한 번.',
                '시즌 거리만 합산하고 개인 기록은 유지.',
                '다음 시즌에는 지역을 새로 선택.',
                '우승 지역의 이름으로 기부를 전달.',
              ].map((text, i) => (
                <View key={text} style={[s.row, { marginTop: 18, gap: 12 }]}>
                  <Text style={s.step}>{i + 1}</Text>
                  <Text style={[s.body, { flex: 1 }]}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </>
    );
  }
  function Running() {
    const run = runner.session;
    return (
      <>
        <Heading
          eyebrow="MAKE EVERY KILOMETER COUNT"
          title={
            run?.active
              ? '지금, 좋은 변화가 쌓이고 있어요.'
              : '가볍게 나서요. 함께 달려요.'
          }
          text="빠르지 않아도 괜찮아요. 당신의 모든 한 걸음이 소중하니까요."
        />
        <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
          <View
            style={[
              s.card,
              {
                flex: wide ? 1.5 : undefined,
                alignItems: 'center',
                paddingVertical: 36,
              },
            ]}
          >
            <Badge gold>
              {run
                ? run.mode === 'demo'
                  ? '데모 러닝 · 10배속 시뮬레이션'
                  : 'GPS 러닝 · 전경 측정'
                : 'READY TO RUN'}
            </Badge>
            <Text testID="run-distance" style={s.distance}>
              {((run?.meters ?? 0) / 1000).toFixed(2)}
            </Text>
            <Text style={[s.eyebrow, { marginBottom: 32 }]}>KILOMETERS</Text>
            <View
              style={[
                s.row,
                {
                  width: '100%',
                  justifyContent: 'space-evenly',
                  marginBottom: 30,
                },
              ]}
            >
              <View style={s.center}>
                <Text style={s.label}>러닝 시간</Text>
                <Text style={s.metric}>{duration(run?.seconds ?? 0)}</Text>
              </View>
              <View style={{ width: 1, height: 42, backgroundColor: C.line }} />
              <View style={s.center}>
                <Text style={s.label}>평균 페이스 / km</Text>
                <Text style={s.metric}>
                  {pace(run?.meters ?? 0, run?.seconds ?? 0)}
                </Text>
              </View>
            </View>
            <View style={{ width: '100%', gap: 12 }}>
              {run ? (
                <>
                  <Button
                    title={run.active ? '일시정지' : '이어서 달리기'}
                    disabled={runner.requesting}
                    onPress={() =>
                      run.active ? runner.pause() : void runner.resume()
                    }
                    icon={run.active ? 'pause' : 'play'}
                  />
                  <Button
                    title="종료하고 기록 저장"
                    secondary
                    disabled={runner.requesting || run.seconds <= 0}
                    onPress={endRun}
                  />
                </>
              ) : region ? (
                <>
                  <Button
                    title={
                      runner.requesting ? '위치 권한 확인 중…' : 'GPS 러닝 시작'
                    }
                    disabled={runner.requesting || storageBroken}
                    onPress={() => void runner.start('gps', region.id)}
                    icon="run"
                  />
                  <Button
                    title="데모로 먼저 달려보기"
                    disabled={runner.requesting || storageBroken}
                    secondary
                    onPress={() => void runner.start('demo', region.id)}
                  />
                </>
              ) : (
                <Button
                  title="지역 선택하고 시작하기"
                  disabled={storageBroken}
                  onPress={() => setRegionModal(true)}
                />
              )}
            </View>
            {runner.message ? (
              <Text
                accessibilityRole="alert"
                style={[s.body, { marginTop: 20 }]}
              >
                {runner.message}
              </Text>
            ) : null}
            <Text style={[s.small, { marginTop: 19, textAlign: 'center' }]}>
              {run
                ? `이번 러닝 팀 · ${REGIONS.find((r) => r.id === run.regionId)?.name}`
                : region
                  ? `${region.name}의 한 걸음이 될 준비 완료`
                  : '먼저 이번 시즌 함께할 지역을 골라 주세요'}
            </Text>
          </View>
          <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
            <View style={s.card}>
              <SectionTitle title="오늘은, 어디로 달려볼까요?" />
              <RouteArt />
              <Text style={[s.small, { marginTop: 12 }]}>
                코스 일러스트 · 실제 위치나 기록 경로가 아닙니다.
              </Text>
              <Text style={[s.h2, { marginTop: 22 }]}>
                나의 속도로, 기분 좋게.
              </Text>
              <Text style={[s.body, { marginTop: 10 }]}>
                출발 전 가볍게 스트레칭하고, 익숙한 길부터 시작해 보세요.
              </Text>
            </View>
            <View style={[s.card, { backgroundColor: '#EFEEE3' }]}>
              <Text style={s.h2}>러닝 전 확인해 주세요</Text>
              <Text style={[s.body, { marginTop: 14 }]}>
                GPS 모드는 위치 권한이 필요해요. 이 MVP는 화면을 켜고 앱을 사용
                중일 때만 측정합니다. 앱을 벗어나면 일시정지합니다.{'\n\n'}종료
                버튼을 눌러야 기록이 저장됩니다. 새로고침이나 강제 종료 시 진행
                중인 기록은 사라집니다.{'\n\n'}데모 모드는 가상 거리와 시간이
                10배속으로 쌓이며, 실제 대회 기록이 아닙니다.
              </Text>
            </View>
          </View>
        </View>
      </>
    );
  }
  function Impact() {
    return (
      <>
        <Heading
          eyebrow="GOOD RUNS. REAL CHANGE."
          title="함께 달려서, 함께 나눠요."
          text="우리의 땀이 어디로 향하는지, 처음부터 끝까지 투명하게."
        />
        <View style={s.notice}>
          <Text style={s.body}>
            기부 화면 디자인 예시입니다. 광고 수익·기부 집행·수혜 기관 제휴는
            아직 없습니다.
          </Text>
        </View>
        <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
          <View
            style={[
              s.card,
              { flex: wide ? 1.2 : undefined, backgroundColor: C.green },
            ]}
          >
            <Text style={s.heroEyebrow}>THIS SEASON’S HARVEST</Text>
            <Text style={[s.heroTitle, { marginTop: 24 }]}>
              우리의 달리기가{'\n'}보리밭을 푸르게.
            </Text>
            <FieldArt />
            <Text style={s.heroSub}>
              달리기 후의 시원한 맥주 한 잔에서 시작된 생각.{'\n'}그 기분 좋은
              마음으로, 땅과 이웃을 돌봅니다.
            </Text>
            <View style={{ marginTop: 20 }}>
              <Badge gold>보리밭 가꾸기 · 후보 콘셉트</Badge>
            </View>
          </View>
          <View style={[s.card, { flex: wide ? 1 : undefined }]}>
            <Text style={s.label}>기부 예정액 · 가상 예시</Text>
            <Text style={[s.distance, { fontSize: 43, marginVertical: 16 }]}>
              328,500<Text style={s.unit}> 원</Text>
            </Text>
            <View style={s.progress}>
              <View
                style={{ width: '70%', backgroundColor: C.gold, height: 12 }}
              />
            </View>
            <View
              style={[
                s.row,
                { justifyContent: 'space-between', marginVertical: 15 },
              ]}
            >
              <Text style={s.body}>기부 70%</Text>
              <Text style={s.small}>운영 30%</Text>
            </View>
            <Text style={s.small}>
              UI 설명용 가정 비율입니다. 법정 비율이나 확정 정책이 아닙니다.
            </Text>
            <View style={s.divider} />
            {[
              ['샘플 광고 정산 수익', '469,286원'],
              ['샘플 운영 배분', '140,786원'],
              ['샘플 기부 배분', '328,500원'],
            ].map(([a, b]) => (
              <View
                key={a}
                style={[
                  s.row,
                  { justifyContent: 'space-between', marginBottom: 18 },
                ]}
              >
                <Text style={s.body}>{a}</Text>
                <Text style={s.rankName}>{b}</Text>
              </View>
            ))}
            <Text style={s.small}>
              정식 운영 전 광고 약관, 세금·수수료, 배분 기준과 기부처를 확정하고
              공시합니다. 광고 클릭을 기부 조건으로 유도하지 않습니다.
            </Text>
            <View style={s.divider} />
            <Text style={s.h2}>마음을 보탠 이름들</Text>
            <Text style={[s.body, { marginTop: 12 }]}>
              우승 지역과 함께 달린 러너의 이름을, 동의한 경우에만 감사 페이지에
              남깁니다.
            </Text>
            <View style={[s.row, { marginTop: 18, gap: 9, flexWrap: 'wrap' }]}>
              {['보리러너', '한강산책', '느린발걸음'].map((n) => (
                <Badge key={n}>{n} · 예시</Badge>
              ))}
            </View>
            <View style={{ marginTop: 22 }}>
              <Button
                title="내 이름 공개 설정"
                secondary
                onPress={() => nav('profile')}
              />
            </View>
          </View>
        </View>
        <View style={s.card}>
          <SectionTitle title="기부 전달 내역" />
          <Text style={s.body}>
            아직 전달된 기부가 없어요. 정식 시즌 종료 후 수혜 기관·금액·지역
            이름·전달 증빙을 이곳에서 확인할 수 있습니다.
          </Text>
        </View>
      </>
    );
  }
  function Profile() {
    return (
      <>
        <Heading
          eyebrow="SMALL STEPS, YOUR STORY"
          title="차곡차곡, 나의 좋은 기록."
          text="오늘의 한 걸음도, 오래 기억할 수 있도록."
        />
        <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
          <View style={[s.card, { flex: wide ? 1 : undefined }]}>
            <View style={s.profileAvatar}>
              <Barley size={48} color={C.green} />
            </View>
            <Text style={[s.h2, { marginTop: 18 }]}>
              안녕하세요, {data.profile.name}님.
            </Text>
            <Text style={[s.small, { marginTop: 8 }]}>
              회원가입 없는 로컬 프로필 · 기기 간 동기화 없음
            </Text>
            <Text style={[s.label, { marginTop: 24, marginBottom: 9 }]}>
              감사 페이지에 사용할 닉네임
            </Text>
            <TextInput
              accessibilityLabel="닉네임"
              value={data.profile.name}
              maxLength={16}
              onChangeText={(name) =>
                save({ ...data, profile: { ...data.profile, name } })
              }
              style={s.input}
              editable={!storageBroken}
            />
            <View
              style={[
                s.row,
                { justifyContent: 'space-between', marginTop: 25, gap: 20 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rankName}>기부 감사 페이지에 이름 공개</Text>
                <Text style={[s.small, { marginTop: 7 }]}>
                  선택 동의 · 언제든 철회할 수 있어요.
                </Text>
              </View>
              <Switch
                accessibilityLabel="기부 감사 페이지 이름 공개 동의"
                value={data.profile.consent}
                disabled={storageBroken}
                onValueChange={(consent) =>
                  save({ ...data, profile: { ...data.profile, consent } })
                }
                trackColor={{ false: '#D7DDD3', true: '#8DAB81' }}
                thumbColor={C.green}
              />
            </View>
            <View style={s.divider} />
            <Text style={s.body}>
              시즌이 바뀌어도 개인 러닝 기록은 유지됩니다. 기록과 GPS 좌표는
              현재 기기에만 보관됩니다.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                runner.session
                  ? setInfo('진행 중인 러닝을 먼저 종료해 주세요.')
                  : setResetModal(true)
              }
              style={{ marginTop: 24 }}
            >
              <Text style={{ color: '#9C5344', fontSize: 12 }}>
                이 기기의 기록 모두 삭제
              </Text>
            </Pressable>
          </View>
          <View style={[s.card, { flex: wide ? 1.5 : undefined }]}>
            <SectionTitle title="나의 러닝 기록" />
            <View style={[s.row, { marginBottom: 24, gap: 30 }]}>
              <Stat
                label="전체 누적"
                value={(
                  data.runs.reduce((sum, r) => sum + r.meters, 0) / 1000
                ).toFixed(2)}
                unit="km"
              />
              <Stat
                label="함께 달린 횟수"
                value={String(data.runs.length)}
                unit="회"
              />
            </View>
            {data.runs.length ? (
              data.runs.map((run) => (
                <View style={s.historyRow} key={run.id}>
                  <View style={s.regionAvatar}>
                    <Icon name="run" />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.rankName}>
                      {date(run.startedAt)} ·{' '}
                      {REGIONS.find((r) => r.id === run.regionId)?.name}
                    </Text>
                    <Text style={s.small}>
                      {duration(run.seconds)} · {pace(run.meters, run.seconds)}{' '}
                      / km · {run.mode === 'demo' ? '데모' : 'GPS'}
                    </Text>
                  </View>
                  <Text style={s.km}>
                    {(run.meters / 1000).toFixed(2)}{' '}
                    <Text style={s.small}>km</Text>
                  </Text>
                </View>
              ))
            ) : (
              <View
                style={{ alignItems: 'center', paddingVertical: 32, gap: 20 }}
              >
                <Icon name="run" size={45} color="#9AA88D" />
                <Text style={s.h2}>첫 번째 발자국을 기다려요.</Text>
                <Text style={s.small}>짧은 러닝도 충분히 좋은 시작이에요.</Text>
                <Button title="첫 러닝 시작하기" onPress={() => nav('run')} />
              </View>
            )}
          </View>
        </View>
      </>
    );
  }
  if (!loaded)
    return (
      <SafeAreaView style={[s.app, s.center]}>
        <Barley size={60} />
        <Text style={s.body}>좋은 달리기를 준비하고 있어요…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.app}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {desktop && (
          <View style={s.sidebar}>
            <View style={s.brand}>
              <Barley size={40} />
              <View>
                <Text style={s.brandName}>보리런</Text>
                <Text style={s.brandEnglish}>BARLEY RUN</Text>
              </View>
            </View>
            <Text style={s.sidebarLabel}>RUN FOR SOMETHING GOOD</Text>
            <View style={{ gap: 9 }}>
              {TABS.map((t) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.id }}
                  accessibilityLabel={t.title}
                  key={t.id}
                  onPress={() => nav(t.id)}
                  style={[s.navItem, tab === t.id && s.navSelected]}
                >
                  <Icon
                    name={t.icon}
                    color={tab === t.id ? C.green : '#CBD4C5'}
                  />
                  <Text
                    style={[
                      s.navText,
                      tab === t.id && { color: C.green, fontWeight: '700' },
                    ]}
                  >
                    {t.title}
                  </Text>
                  {t.id === 'run' && runner.session?.active && (
                    <View style={s.liveDot} />
                  )}
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <View style={s.sidebarCallout}>
              <Barley size={35} />
              <Text style={s.sidebarQuote}>
                한 걸음의 시작,{'\n'}한 동네의 좋은 변화.
              </Text>
              <Text style={s.sidebarSmall}>조금 더 기분 좋은 러닝 클럽</Text>
            </View>
            <View style={s.sidebarProfile}>
              <View style={s.miniAvatar}>
                <Text style={{ color: C.green }}>B</Text>
              </View>
              <View>
                <Text style={s.navText}>{data.profile.name || '보리러너'}</Text>
                <Text style={s.sidebarSmall}>LOCAL DEMO MEMBER</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.topbar, !desktop && { paddingHorizontal: 20 }]}>
            {desktop ? (
              <Text style={s.breadcrumb}>
                보리런 <Text style={{ color: '#B4BAB0' }}> / </Text>{' '}
                {TABS.find((t) => t.id === tab)?.title}
              </Text>
            ) : (
              <View style={s.row}>
                <Barley size={28} color={C.green} />
                <Text style={[s.brandName, { color: C.green, fontSize: 21 }]}>
                  보리런
                </Text>
              </View>
            )}
            <View style={[s.row, { gap: 16 }]}>
              {wide && (
                <Text style={s.small}>오늘의 한 걸음이, 내일의 좋은 일로.</Text>
              )}
              <RegionButton />
            </View>
          </View>
          <ScrollView
            ref={scroller}
            style={{ flex: 1 }}
            contentContainerStyle={[s.content, !wide && { padding: 20 }]}
          >
            <View
              style={{ width: '100%', maxWidth: 1180, alignSelf: 'center' }}
            >
              <View style={s.demoStrip}>
                <View style={s.row}>
                  <View style={[s.liveDot, { backgroundColor: '#9AAC83' }]} />
                  <Text style={s.demoLabel}>INTERACTIVE MVP</Text>
                </View>
                <Text style={s.small}>로컬 데모 · 실제 대회·기부 아님</Text>
              </View>
              {storageError ? (
                <View style={s.error}>
                  <Text accessibilityRole="alert" style={s.body}>
                    {storageError}
                  </Text>
                </View>
              ) : null}
              {info ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="알림 닫기"
                  onPress={() => setInfo('')}
                  style={s.notice}
                >
                  <Text accessibilityLiveRegion="polite" style={s.body}>
                    {info} ×
                  </Text>
                </Pressable>
              ) : null}
              {runner.session && tab !== 'run' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTab('run')}
                  style={s.notice}
                >
                  <Text style={s.link}>
                    러닝 {runner.session.active ? '진행 중' : '일시정지'} ·{' '}
                    {duration(runner.session.seconds)} · 돌아가기 →
                  </Text>
                </Pressable>
              )}
              {tab === 'home'
                ? Home()
                : tab === 'tournament'
                  ? Tournament()
                  : tab === 'run'
                    ? Running()
                    : tab === 'impact'
                      ? Impact()
                      : Profile()}
              <Text style={s.footer}>© BARLEY RUN · 좋은 달리기의 시작</Text>
            </View>
          </ScrollView>
          {!desktop && (
            <View style={s.bottomTabs}>
              {TABS.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.id }}
                  accessibilityLabel={t.title}
                  onPress={() => nav(t.id)}
                  style={s.bottomTab}
                >
                  <Icon
                    name={t.icon}
                    color={tab === t.id ? C.green : '#98A192'}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: tab === t.id ? C.green : '#788372',
                      fontWeight: tab === t.id ? '700' : '400',
                    }}
                  >
                    {t.id === 'tournament'
                      ? '토너먼트'
                      : t.id === 'impact'
                        ? '기부'
                        : t.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      <Modal
        visible={regionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionModal(false)}
      >
        <View style={s.backdrop}>
          <View style={s.modal}>
            <View style={s.sectionTitle}>
              <Text style={s.h2}>이번 시즌, 함께할 우리 동네</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="지역 선택 닫기"
                onPress={() => setRegionModal(false)}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <Text style={s.body}>
              선택한 지역은 시즌 종료까지 유지됩니다.{'\n'}MVP에서는 6개 지역을
              먼저 체험할 수 있어요.
            </Text>
            <TextInput
              accessibilityLabel="지역 검색"
              placeholder="지역 이름 검색"
              value={query}
              onChangeText={setQuery}
              style={[s.input, { marginVertical: 18 }]}
            />
            <ScrollView style={{ maxHeight: 295 }}>
              {REGIONS.filter((r) =>
                `${r.city} ${r.name}`.includes(query.trim()),
              ).map((r) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: regionChoice === r.id }}
                  accessibilityLabel={`${r.city} ${r.name}`}
                  key={r.id}
                  onPress={() => setRegionChoice(r.id)}
                  style={[
                    s.regionOption,
                    regionChoice === r.id && {
                      borderColor: C.green,
                      backgroundColor: C.pale,
                    },
                  ]}
                >
                  <Icon name="pin" />
                  <Text style={[s.body, { flex: 1 }]}>
                    {r.city} {r.name}
                  </Text>
                  {regionChoice === r.id && <Icon name="check" />}
                </Pressable>
              ))}
              {!REGIONS.some((r) =>
                `${r.city} ${r.name}`.includes(query.trim()),
              ) && <Text style={s.body}>아직 지원하지 않는 지역입니다.</Text>}
            </ScrollView>
            <View style={{ marginTop: 22 }}>
              <Button
                title={`${REGIONS.find((r) => r.id === regionChoice)?.name} 팀으로 참여하기`}
                disabled={storageBroken}
                onPress={chooseRegion}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={resetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModal(false)}
      >
        <View style={s.backdrop}>
          <View style={s.modal}>
            <Text style={s.h2}>이 기기의 모든 기록을 삭제할까요?</Text>
            <Text style={[s.body, { marginVertical: 20 }]}>
              러닝 경로, 닉네임, 지역 선택과 동의 설정이 모두 삭제됩니다. 복구할
              수 없어요.
            </Text>
            <Button
              title="취소하고 돌아가기"
              onPress={() => setResetModal(false)}
            />
            <View style={{ height: 10 }} />
            <Button
              title="모두 삭제하기"
              secondary
              onPress={() => {
                queue.current = queue.current
                  .then(() => AsyncStorage.removeItem(KEY))
                  .then(() => {
                    setData(EMPTY_STATE);
                    setStorageBroken(false);
                    setStorageError('');
                    setResetModal(false);
                  })
                  .catch(() =>
                    setStorageError(
                      '삭제하지 못했어요. 기기 저장소를 확인해 주세요.',
                    ),
                  );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sidebar: { width: 234, backgroundColor: C.dark, padding: 23, paddingTop: 33 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
  },
  brandName: {
    color: '#FAF6E8',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1,
  },
  brandEnglish: {
    color: '#C6D1BB',
    fontSize: 9,
    letterSpacing: 2.1,
    marginTop: 2,
  },
  sidebarLabel: {
    color: '#9DAD96',
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 38,
    marginBottom: 23,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 11,
  },
  navSelected: { backgroundColor: '#EDF0DF' },
  navText: { color: '#DFE5D8', fontSize: 13 },
  sidebarCallout: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#3A5742',
    borderRadius: 14,
    gap: 10,
    marginTop: 50,
  },
  sidebarQuote: {
    color: '#E4EAD5',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
  },
  sidebarSmall: { color: '#A8B59E', fontSize: 9, marginTop: 5 },
  sidebarProfile: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingTop: 23,
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: '#3B5440',
  },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D9E1CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbar: {
    minHeight: 82,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  breadcrumb: { fontSize: 12, color: C.muted },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DADFD1',
    backgroundColor: '#FAFBF5',
  },
  regionText: { fontSize: 12, color: C.green, fontWeight: '600' },
  content: { padding: 38, paddingTop: 26, paddingBottom: 10 },
  demoStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
    flexWrap: 'wrap',
  },
  demoLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#79866C',
    fontWeight: '700',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: '#85906F',
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 29,
    lineHeight: 40,
    color: C.ink,
    fontWeight: '700',
    letterSpacing: -1.1,
  },
  sub: { color: C.muted, fontSize: 13, lineHeight: 22 },
  hero: {
    backgroundColor: C.green,
    borderRadius: 20,
    padding: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    marginBottom: 22,
  },
  heroEyebrow: {
    fontSize: 10,
    color: '#D7DFBF',
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  liveDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
    marginRight: 5,
  },
  heroTitle: {
    color: '#FAF7EA',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 47,
    letterSpacing: -1.4,
  },
  heroSub: { color: '#D1DCCB', fontSize: 12, lineHeight: 22 },
  heroFoot: { color: '#9FB596', fontSize: 8, letterSpacing: 2.1 },
  goldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 22,
    backgroundColor: C.gold,
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 21,
    borderRadius: 9,
  },
  goldText: { fontSize: 13, color: '#28402D', fontWeight: '700' },
  stats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    backgroundColor: C.paper,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 24,
    gap: 22,
  },
  stat: { flex: 1, gap: 11, minWidth: 125 },
  label: { fontSize: 12, color: C.muted },
  statValue: {
    fontSize: 29,
    fontWeight: '600',
    color: C.green,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 13, color: C.muted, marginLeft: 3 },
  small: { fontSize: 11, color: C.muted, lineHeight: 18 },
  body: { fontSize: 13, lineHeight: 23, color: '#596653' },
  columns: {
    flexDirection: 'row',
    gap: 22,
    marginBottom: 24,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
    padding: 24,
    minWidth: 0,
  },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  h2: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  link: { fontSize: 12, color: C.green, fontWeight: '600', lineHeight: 21 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: C.pale,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#667653', fontSize: 10, fontWeight: '600' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#F0F1EA',
    gap: 12,
  },
  myRank: { backgroundColor: '#F6F7EE', borderRadius: 9 },
  rankNumber: { color: '#96A08E', fontSize: 14, width: 20, fontWeight: '600' },
  regionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankName: { color: C.ink, fontWeight: '600', fontSize: 13 },
  you: { fontSize: 7, color: '#778960', fontWeight: '700' },
  km: {
    fontSize: 15,
    color: C.ink,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  fieldCard: {
    backgroundColor: '#F2F0E3',
    borderRadius: 11,
    padding: 22,
    alignItems: 'center',
    gap: 5,
  },
  fieldSmall: { color: '#909B72', fontSize: 8, letterSpacing: 2 },
  fieldTitle: {
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 31,
    color: C.green,
    marginBottom: 6,
  },
  inlineLink: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 17,
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  wordmarkSmall: {
    marginLeft: 'auto',
    color: '#9CA88D',
    fontSize: 9,
    letterSpacing: 2,
  },
  footer: {
    textAlign: 'center',
    color: '#A1A996',
    fontSize: 9,
    marginTop: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: C.green,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 19,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondary: {
    backgroundColor: '#EFF2E8',
    borderWidth: 1,
    borderColor: '#DCE3D0',
  },
  buttonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  notice: {
    backgroundColor: '#EAF0DE',
    padding: 16,
    borderRadius: 10,
    marginBottom: 22,
  },
  error: {
    backgroundColor: '#F7E5DE',
    padding: 16,
    borderRadius: 10,
    marginBottom: 22,
  },
  step: {
    fontSize: 12,
    color: '#9A8147',
    backgroundColor: '#F7EFDD',
    padding: 6,
    borderRadius: 5,
  },
  distance: {
    fontSize: 82,
    color: C.green,
    fontWeight: '600',
    letterSpacing: -4,
    marginTop: 38,
    marginBottom: 7,
    fontVariant: ['tabular-nums'],
  },
  metric: {
    fontSize: 26,
    color: C.green,
    fontWeight: '500',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  progress: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E4EAD9',
  },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 24 },
  profileAvatar: {
    backgroundColor: '#F1EACF',
    borderRadius: 38,
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8DECF',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.ink,
    fontSize: 14,
    backgroundColor: '#FCFCF8',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#FAFBF6',
    borderTopWidth: 1,
    borderColor: C.line,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 14 : 7,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
    minHeight: 48,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#14251BC0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modal: {
    backgroundColor: C.bg,
    borderRadius: 20,
    padding: 26,
    width: '100%',
    maxWidth: 490,
    maxHeight: '90%',
  },
  regionOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
