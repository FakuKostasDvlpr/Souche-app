import React, { useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const COUNT = 24;
const COLORS = ["#00F068", "#F7AE00", "#EDEFEA"];

interface Particle {
  id: number;
  startX: number;
  targetY: number;
  delay: number;
  rotation: number;
  color: string;
  size: number;
}

function buildParticles(): Particle[] {
  return Array.from({ length: COUNT }).map((_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_W,
    targetY: SCREEN_H + 40,
    delay: Math.random() * 600,
    rotation: (Math.random() - 0.5) * 720,
    color: COLORS[i % COLORS.length],
    size: 4 + Math.random() * 4,
  }));
}

function ParticleDot({ p }: { p: Particle }) {
  const ty = useSharedValue(-30);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(p.delay, withTiming(1, { duration: 120 }));
    ty.value = withDelay(
      p.delay,
      withTiming(p.targetY, {
        duration: 1800 + Math.random() * 600,
        easing: Easing.in(Easing.quad),
      })
    );
    rot.value = withDelay(
      p.delay,
      withTiming(p.rotation, { duration: 2000, easing: Easing.linear })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: ty.value },
      { rotateZ: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: p.startX,
          top: 0,
          width: p.size,
          height: p.size * 2,
        },
        style,
      ]}
    >
      <Svg width={p.size} height={p.size * 2}>
        <Rect width={p.size} height={p.size * 2} fill={p.color} rx={1} />
      </Svg>
    </Animated.View>
  );
}

export function AchievementParticles() {
  const particles = React.useMemo(buildParticles, []);
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <ParticleDot key={p.id} p={p} />
      ))}
    </Animated.View>
  );
}
