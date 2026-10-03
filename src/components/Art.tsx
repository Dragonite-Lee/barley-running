import React from 'react';
import Svg, { Path, Circle, Ellipse, G, Rect } from 'react-native-svg';
export function Barley({
  color = '#E7B95C',
  size = 36,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M15 42L32 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {[0, 1, 2, 3].map((i) => (
        <G key={i} transform={`translate(${i * 3.3},${-i * 7})`}>
          <Ellipse
            cx="17"
            cy="31"
            rx="3.5"
            ry="7"
            rotation="-35"
            origin="17,31"
            fill={color}
          />
          <Ellipse
            cx="27"
            cy="35"
            rx="3.5"
            ry="7"
            rotation="68"
            origin="27,35"
            fill={color}
          />
        </G>
      ))}
    </Svg>
  );
}
export type IconName =
  | 'home'
  | 'trophy'
  | 'run'
  | 'heart'
  | 'user'
  | 'arrow'
  | 'pin'
  | 'clock'
  | 'check'
  | 'pause'
  | 'play'
  | 'close';
const paths: Record<IconName, string> = {
  home: 'M3 10L12 3L21 10V21H15V14H9V21H3Z',
  trophy:
    'M7 3H17V8C17 12 15 14 12 14C9 14 7 12 7 8ZM7 5H3V8C3 11 5 12 8 12M17 5H21V8C21 11 19 12 16 12M12 14V20M7 21H17',
  run: 'M14 7L10 12L6 10M10 12L14 15L11 21M10 12L7 17H2M14 7L18 11H22M16 3H16.01',
  heart:
    'M20.8 5.6C18 2.5 14.4 4 12 6.5C9.6 4 6 2.5 3.2 5.6C-.5 10 6 16 12 21C18 16 24.5 10 20.8 5.6Z',
  user: 'M16 7A4 4 0 1 1 8 7A4 4 0 1 1 16 7M4 21V19C4 12 20 12 20 19V21',
  arrow: 'M4 12H20M14 6L20 12L14 18',
  pin: 'M19 10C19 15 12 22 12 22C12 22 5 15 5 10A7 7 0 1 1 19 10ZM14 10A2 2 0 1 1 10 10A2 2 0 1 1 14 10',
  clock: 'M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12M12 6V12L16 14',
  check: 'M4 12L9 17L20 6',
  pause: 'M8 5V19M16 5V19',
  play: 'M7 4L21 12L7 20Z',
  close: 'M5 5L19 19M19 5L5 19',
};
export function Icon({
  name,
  color = '#244A3A',
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function FieldArt({ small = false }: { small?: boolean }) {
  return (
    <Svg
      width="100%"
      height={small ? 140 : 240}
      viewBox="0 0 480 280"
      accessibilityLabel="보리밭 위를 달리는 러너 일러스트"
    >
      <Circle cx="328" cy="104" r="81" fill="#EDC66F" />
      <Circle
        cx="328"
        cy="104"
        r="101"
        fill="none"
        stroke="#769280"
        strokeDasharray="3 9"
      />
      <Path d="M0 248Q180 149 480 216V280H0Z" fill="#3B654B" />
      <Path d="M0 275Q215 162 480 240V280H0Z" fill="#527A52" />
      {[65, 99, 386, 421, 447].map((x, i) => (
        <G key={x} transform={`translate(${x},${166 + (i % 2) * 22})`}>
          <Path d="M0 82Q-4 44 9 0" stroke="#E7B95C" strokeWidth="2" />
          {[0, 1, 2].map((j) => (
            <G key={j} transform={`translate(${j * 1.5},${j * 14})`}>
              <Ellipse
                cx="0"
                cy="20"
                rx="4"
                ry="10"
                rotation="-35"
                origin="0,20"
                fill="#DDB46B"
              />
              <Ellipse
                cx="10"
                cy="24"
                rx="4"
                ry="10"
                rotation="35"
                origin="10,24"
                fill="#DDB46B"
              />
            </G>
          ))}
        </G>
      ))}
      <Path
        d="M209 120L184 168L135 163"
        stroke="#F4EEDC"
        strokeWidth="19"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M213 127L252 167L225 220"
        stroke="#E6B364"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M222 73L237 106L269 108"
        stroke="#EDC89D"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M222 76L203 119L233 135"
        stroke="#F8F3E5"
        strokeWidth="28"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M212 82L187 108L161 92"
        stroke="#EDC89D"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="237" cy="51" r="16" fill="#EDC89D" />
      <Path
        d="M221 46Q224 25 243 35L254 43"
        fill="#183C2E"
        stroke="#183C2E"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <Path
        d="M133 164L117 168M225 222L240 230"
        stroke="#D9E891"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <Path
        d="M98 108H139M120 126H157"
        stroke="#9EBA9E"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M276 244Q317 230 359 244"
        stroke="#DDB46B"
        strokeWidth="2"
        strokeDasharray="5 6"
        fill="none"
      />
    </Svg>
  );
}
export function RouteArt() {
  return (
    <Svg
      width="100%"
      height={170}
      viewBox="0 0 480 190"
      accessibilityLabel="러닝 코스 예시 일러스트. 실제 GPS 지도가 아닙니다."
    >
      <Rect width="480" height="190" rx="20" fill="#E7ECDE" />
      <Path
        d="M-10 144Q80 60 183 94T490 40"
        stroke="#B9D3D4"
        strokeWidth="37"
        fill="none"
      />
      <Path
        d="M0 30L480 157M70 0L175 190M270 0L348 190M0 173L480 80"
        stroke="#FAF9F1"
        strokeWidth="12"
      />
      <Path
        d="M120 137L91 88L156 57L253 73L298 125L223 152L120 137"
        stroke="#406748"
        strokeWidth="4"
        strokeDasharray="7 5"
        fill="none"
        strokeLinejoin="round"
      />
      <Circle
        cx="120"
        cy="137"
        r="9"
        fill="#E7B95C"
        stroke="#fff"
        strokeWidth="4"
      />
      <Circle
        cx="298"
        cy="125"
        r="6"
        fill="#244A3A"
        stroke="#fff"
        strokeWidth="3"
      />
    </Svg>
  );
}
