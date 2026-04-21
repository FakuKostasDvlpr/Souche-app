import React, { useEffect, useState, useRef } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AchievementParticles } from "./AchievementParticles";
import { AchievementShimmer } from "./AchievementShimmer";
import type { AchievementPayload } from "@/lib/achievementQueue";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Phase = "enter" | "holdFull" | "collapse" | "banner" | "exit" | "done";

const TIMINGS = {
  enter: 400,
  holdFull: 2100,
  collapse: 400,
  banner: 2000,
  exit: 300,
};

interface Props {
  payload: AchievementPayload;
  onFinish: () => void;
}

const DEFAULT_ICON = require("@/public/cupwin.png");

export function AchievementOverlay({ payload, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [reduceMotion, setReduceMotion] = useState(false);
  const skipRequested = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const backdropOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0.3);
  const trophyY = useSharedValue(0);
  const trophyX = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const titleScale = useSharedValue(1);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(16);
  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(-100);

  const [shimmerKey, setShimmerKey] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      runPhaseReducedMotion();
      return;
    }
    runEnter();
  }, [reduceMotion]);

  function runEnter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    backdropOpacity.value = withTiming(1, { duration: TIMINGS.enter });
    trophyScale.value = withSpring(1, { damping: 10, stiffness: 140 });
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    titleY.value = withDelay(200, withTiming(0, { duration: 300 }));
    setTimeout(() => {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      setShimmerKey((k) => k + 1);
      setPhase("holdFull");
    }, TIMINGS.enter);
  }

  useEffect(() => {
    if (phase !== "holdFull") return;
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    subtitleY.value = withDelay(400, withTiming(0, { duration: 300 }));
    const t = setTimeout(() => startCollapse(), TIMINGS.holdFull);
    return () => clearTimeout(t);
  }, [phase]);

  function startCollapse() {
    if (phase === "collapse" || phase === "banner" || phase === "exit") return;
    setPhase("collapse");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    backdropOpacity.value = withTiming(0, { duration: TIMINGS.collapse });
    trophyScale.value = withTiming(0.35, { duration: TIMINGS.collapse });
    trophyY.value = withTiming(-(SCREEN_H / 2 - 70), {
      duration: TIMINGS.collapse,
    });
    trophyX.value = withTiming(-(SCREEN_W / 2 - 44), {
      duration: TIMINGS.collapse,
    });
    titleScale.value = withTiming(0.38, { duration: TIMINGS.collapse });
    titleY.value = withTiming(-(SCREEN_H / 2 - 72), {
      duration: TIMINGS.collapse,
    });
    subtitleY.value = withTiming(-(SCREEN_H / 2 - 52), {
      duration: TIMINGS.collapse,
    });
    bannerOpacity.value = withDelay(
      TIMINGS.collapse - 100,
      withTiming(1, { duration: 200 })
    );
    bannerY.value = withDelay(
      TIMINGS.collapse - 100,
      withTiming(0, { duration: 200 })
    );
    setTimeout(() => {
      setPhase("banner");
      setShimmerKey((k) => k + 1);
    }, TIMINGS.collapse);
  }

  useEffect(() => {
    if (phase !== "banner") return;
    const t = setTimeout(() => runExit(), TIMINGS.banner);
    return () => clearTimeout(t);
  }, [phase]);

  function runExit() {
    setPhase("exit");
    bannerY.value = withTiming(-100, { duration: TIMINGS.exit });
    bannerOpacity.value = withTiming(0, { duration: TIMINGS.exit }, (done) => {
      if (done) runOnJS(finalize)();
    });
  }

  function finalize() {
    setPhase("done");
    onFinish();
  }

  function runPhaseReducedMotion() {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    titleOpacity.value = withTiming(1, { duration: 200 });
    subtitleOpacity.value = withTiming(1, { duration: 200 });
    trophyScale.value = 1;
    setTimeout(() => {
      backdropOpacity.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(finalize)();
      });
    }, 2200);
  }

  const handleSkip = () => {
    if (skipRequested.current) return;
    skipRequested.current = true;
    if (phase === "enter" || phase === "holdFull") startCollapse();
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: trophyX.value },
      { translateY: trophyY.value },
      { scale: trophyScale.value },
    ],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }, { scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  const showFullScreen =
    phase === "enter" || phase === "holdFull" || phase === "collapse";
  const showBanner =
    phase === "collapse" || phase === "banner" || phase === "exit";
  const showParticles =
    !reduceMotion && (phase === "enter" || phase === "holdFull");

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {showFullScreen && (
        <Animated.View
          pointerEvents={phase === "collapse" ? "none" : "auto"}
          style={[StyleSheet.absoluteFill, backdropStyle]}
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(0,240,104,0.18)", "rgba(0,0,0,0.85)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip}>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
              }}
            >
              <Animated.View style={[{ marginBottom: 20 }, trophyStyle]}>
                <Image
                  source={(payload.icon as any) ?? DEFAULT_ICON}
                  style={{ width: 140, height: 140 }}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.Text
                style={[
                  {
                    color: "#EDEFEA",
                    fontFamily: "SpaceGrotesk_700Bold",
                    fontSize: 44,
                    letterSpacing: -1,
                    textTransform: "uppercase",
                    textAlign: "center",
                  },
                  titleStyle,
                ]}
              >
                {payload.title}
              </Animated.Text>
              {payload.subtitle && (
                <Animated.Text
                  style={[
                    {
                      color: "#00F068",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      marginTop: 10,
                      textAlign: "center",
                      letterSpacing: 1,
                    },
                    subtitleStyle,
                  ]}
                >
                  {payload.subtitle}
                </Animated.Text>
              )}
            </View>
          </Pressable>
          <AchievementShimmer trigger={shimmerKey} />
          {showParticles && <AchievementParticles />}
        </Animated.View>
      )}

      {showBanner && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
            },
            bannerStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              payload.onCta?.();
              runExit();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(0,240,104,0.4)",
              backgroundColor: "rgba(18,26,20,0.92)",
              overflow: "hidden",
            }}
          >
            <Image
              source={(payload.icon as any) ?? DEFAULT_ICON}
              style={{ width: 42, height: 42 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#00F068",
                  fontFamily: "VT323_400Regular",
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                LOGRO DESBLOQUEADO
              </Text>
              <Text
                style={{
                  color: "#EDEFEA",
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 18,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {payload.title}
              </Text>
              {payload.subtitle && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {payload.subtitle}
                </Text>
              )}
            </View>
            <AchievementShimmer trigger={shimmerKey} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
