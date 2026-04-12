import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  IconHome,
  IconBurger,
  IconTicket,
  IconGamepad,
  IconGear,
} from "@/components/icons";

const TAB_ICONS: Record<
  string,
  React.FC<{ size: number; color: string; filled: boolean }>
> = {
  home: IconHome,
  menu: IconBurger,
  eventos: IconTicket,
  juego: IconGamepad,
  config: IconGear,
};

const ACTIVE = "#15783D";
const INACTIVE = "#525252";

function TabItem({
  route,
  label,
  isFocused,
  onPress,
  onLongPress,
}: {
  route: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const Icon = TAB_ICONS[route];

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isFocused ? 1 : 0, { damping: 15 }),
    transform: [{ scale: withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 }) }],
  }));

  const handlePress = () => {
    scale.value = 0.85;
    setTimeout(() => { scale.value = 1; }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (!Icon) return null;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon size={22} color={isFocused ? ACTIVE : INACTIVE} filled={isFocused} />
      </Animated.View>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
}

export function SoucheTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inner}>
        {visibleRoutes.map((route) => {
          const idx = state.routes.indexOf(route);
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === idx;

          return (
            <TabItem
              key={route.key}
              route={route.name}
              label={label}
              isFocused={isFocused}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 10, 0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: 44,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE,
    marginTop: 2,
  },
});
