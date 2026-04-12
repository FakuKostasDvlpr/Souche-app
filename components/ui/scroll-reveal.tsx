import { useCallback, useState } from "react";
import { LayoutChangeEvent, ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);

type Direction = "up" | "down";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  style?: ViewStyle;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className,
  style,
}: ScrollRevealProps) {
  const entering =
    direction === "up"
      ? FadeInUp.delay(delay).duration(500).easing(EASE_OUT)
      : FadeInDown.delay(delay).duration(500).easing(EASE_OUT);

  return (
    <Animated.View entering={entering} className={className} style={style}>
      {children}
    </Animated.View>
  );
}
