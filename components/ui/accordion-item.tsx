import React from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  duration?: number;
  className?: string;
  titleClassName?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  duration = 300,
  className,
  titleClassName,
  icon,
  iconColor = "#A3A3A3",
}: AccordionItemProps) {
  const isExpanded = useSharedValue(defaultOpen);
  const height = useSharedValue(0);

  const derivedHeight = useDerivedValue(() =>
    withTiming(height.value * Number(isExpanded.value), { duration })
  );

  const bodyStyle = useAnimatedStyle(() => ({
    height: derivedHeight.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(isExpanded.value ? "180deg" : "0deg", { duration }),
      },
    ],
  }));

  const toggle = () => {
    isExpanded.value = !isExpanded.value;
  };

  return (
    <View className={cn("overflow-hidden", className)}>
      <Pressable
        onPress={toggle}
        className="flex-row items-center justify-between py-3 active:opacity-70"
      >
        <View className="flex-1 flex-row items-center gap-3">
          {icon && (
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Ionicons name={icon} size={16} color={iconColor} />
            </View>
          )}
          <Text className={cn("text-base font-semibold text-foreground", titleClassName)}>
            {title}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color="#737373" />
        </Animated.View>
      </Pressable>

      <Animated.View style={bodyStyle}>
        <View
          onLayout={(e) => {
            height.value = e.nativeEvent.layout.height;
          }}
          style={{ position: "absolute", width: "100%" }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
