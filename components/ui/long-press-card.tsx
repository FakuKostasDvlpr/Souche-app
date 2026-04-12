import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";

type LongPressCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  minDuration?: number;
  className?: string;
};

export function LongPressCard({
  children,
  onPress,
  onLongPress,
  minDuration = 500,
  className,
}: LongPressCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pressed = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerLongPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLongPress?.();
  };

  const triggerPress = () => {
    onPress?.();
  };

  const longPress = Gesture.LongPress()
    .minDuration(minDuration)
    .onBegin(() => {
      "worklet";
      scale.value = withTiming(0.96, { duration: 150 });
      opacity.value = withTiming(0.85, { duration: 150 });
      pressed.value = true;
      runOnJS(triggerHaptic)();
    })
    .onFinalize((_e, success) => {
      "worklet";
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      if (success) {
        runOnJS(triggerLongPress)();
      } else if (pressed.value) {
        runOnJS(triggerPress)();
      }
      pressed.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={longPress}>
      <Animated.View style={animatedStyle} className={cn(className)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
