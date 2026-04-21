import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  trigger: number;
  widthPct?: number;
}

export function AchievementShimmer({ trigger, widthPct = 40 }: Props) {
  const tx = useSharedValue(-150);

  useEffect(() => {
    tx.value = -150;
    tx.value = withTiming(300, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${tx.value}%` }, { skewX: "-18deg" }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <Animated.View
        style={[
          { position: "absolute", top: 0, bottom: 0, width: `${widthPct}%` },
          style,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,240,104,0.35)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
