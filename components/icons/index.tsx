import React from "react";
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export function IconHome({ size = 24, color = "#fff", filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path
          d="M12 3L2 12h3v8a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-8h3L12 3z"
          fill={color}
        />
      ) : (
        <Path
          d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function IconBurger({ size = 24, color = "#fff", filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <G>
          <Path d="M4 8a8 8 0 0116 0v1H4V8z" fill={color} />
          <Rect x={3} y={11} width={18} height={3} rx={1} fill={color} opacity={0.7} />
          <Path d="M4 16h16v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1z" fill={color} />
        </G>
      ) : (
        <G>
          <Path
            d="M4 9h16a0 0 0 010 0c0-3.3-3.6-6-8-6S4 5.7 4 9z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M3 12.5h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path
            d="M4 16h16v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      )}
    </Svg>
  );
}

export function IconTicket({ size = 24, color = "#fff", filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path
          d="M2 7a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 00-2 2 2 2 0 002 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3a2 2 0 002-2 2 2 0 00-2-2V7z"
          fill={color}
        />
      ) : (
        <Path
          d="M2 7a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 00-2 2 2 2 0 002 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3a2 2 0 002-2 2 2 0 00-2-2V7z"
          stroke={color}
          strokeWidth={1.8}
        />
      )}
      <Path d="M9 5v14" stroke={filled ? "#0A0A0A" : color} strokeWidth={1.8} strokeDasharray="3 3" />
    </Svg>
  );
}

export function IconGamepad({ size = 24, color = "#fff", filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <G>
          <Path
            d="M6 7h12a4 4 0 014 4v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a4 4 0 014-4z"
            fill={color}
          />
          <Circle cx={8.5} cy={12} r={1.2} fill="#0A0A0A" />
          <Circle cx={15.5} cy={10.5} r={1} fill="#0A0A0A" />
          <Circle cx={15.5} cy={13.5} r={1} fill="#0A0A0A" />
          <Circle cx={14} cy={12} r={1} fill="#0A0A0A" />
          <Circle cx={17} cy={12} r={1} fill="#0A0A0A" />
        </G>
      ) : (
        <G>
          <Path
            d="M6 7h12a4 4 0 014 4v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a4 4 0 014-4z"
            stroke={color}
            strokeWidth={1.8}
          />
          <Path d="M7 12h3M8.5 10.5v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={15.5} cy={10.8} r={0.8} fill={color} />
          <Circle cx={15.5} cy={13.2} r={0.8} fill={color} />
          <Circle cx={14} cy={12} r={0.8} fill={color} />
          <Circle cx={17} cy={12} r={0.8} fill={color} />
        </G>
      )}
    </Svg>
  );
}

export function IconGear({ size = 24, color = "#fff", filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={filled ? undefined : color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.82a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={filled ? undefined : color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSoucheLogo({ size = 40, color = "#15783D" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Defs>
        <LinearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
          <Stop offset="0" stopColor="#15783D" />
          <Stop offset="1" stopColor="#1a9a4e" />
        </LinearGradient>
      </Defs>
      <Circle cx={20} cy={20} r={19} fill="url(#logoGrad)" />
      <Path
        d="M25.5 12.5c-1.5-1.2-3.5-1.5-5.5-1.5-3 0-6 1.5-6 4.5 0 2 1.5 3 3.5 3.5l4 1c1.5.4 2.5 1 2.5 2.5 0 2-2 3.5-5 3.5-2.5 0-4.5-1-5.5-2.5"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconFire({ size = 24, color = "#F7AE00" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.5 4-3 6-3 10a5 5 0 0010 0c0-4-4-5-3-10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22a3 3 0 01-3-3c0-2 3-3 3-6 0 3 3 4 3 6a3 3 0 01-3 3z"
        fill={color}
        opacity={0.3}
      />
    </Svg>
  );
}

export function IconTrophy({ size = 24, color = "#F7AE00" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3h12v5a6 6 0 01-12 0V3zM12 14v3M8 21h8M17 3h2a2 2 0 012 2v1a4 4 0 01-4 4M7 3H5a2 2 0 00-2 2v1a4 4 0 004 4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
