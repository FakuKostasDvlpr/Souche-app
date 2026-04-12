import { useCallback } from "react";
import { Pressable, ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  SlideInRight,
  SlideInDown,
  SlideInLeft,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  useAnimatedRef,
  runOnJS,
} from "react-native-reanimated";

export const AnimatedView = Animated.View;
export const AnimatedText = Animated.Text;
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);

export const fadeDown = (delay = 0) =>
  FadeInDown.delay(delay).duration(450).easing(EASE_OUT);

export const fadeUp = (delay = 0) =>
  FadeInUp.delay(delay).duration(450).easing(EASE_OUT);

export const fadeIn = (delay = 0) =>
  FadeIn.delay(delay).duration(350).easing(EASE_OUT);

export const zoomIn = (delay = 0) =>
  ZoomIn.delay(delay).duration(350).easing(EASE_OUT);

export const slideRight = (delay = 0) =>
  SlideInRight.delay(delay).duration(400).easing(EASE_OUT);

export const slideLeft = (delay = 0) =>
  SlideInLeft.delay(delay).duration(400).easing(EASE_OUT);

export const slideDown = (delay = 0) =>
  SlideInDown.delay(delay).duration(400).easing(EASE_OUT);

export const stagger = (index: number, base = 0) =>
  fadeDown(base + index * 80);

export function useScalePress(to = 0.97) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));
  const onPressIn = () => { scale.value = to; };
  const onPressOut = () => { scale.value = 1; };
  return { animStyle, onPressIn, onPressOut };
}

export const scrollReveal = FadeInDown.duration(500).easing(EASE_OUT);
