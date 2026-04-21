import React from "react";
import { View, Text, ScrollView, Pressable, Alert, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Rect as SvgRect } from "react-native-svg";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import * as Haptics from "expo-haptics";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeColors } from "@/lib/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { AnimatedView, fadeDown } from "@/lib/animations";
import { useAchievement } from "@/contexts/AchievementContext";

type ThemeOptionKey = "light" | "dark" | "system";
type RowTone = "neutral" | "primary" | "gold";

const MEMBER_GLOW_SIZE = 260;

export default function ConfigScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const isAdmin = profile?.rol === "superadmin";

  const theme = useThemeStore((s) => s.theme);
  const manualOverride = useThemeStore((s) => s.manualOverride);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resetToSystem = useThemeStore((s) => s.resetToSystem);

  const activeTheme: ThemeOptionKey = !manualOverride ? "system" : theme;

  const handleThemeChange = (mode: ThemeOptionKey) => {
    Haptics.selectionAsync().catch(() => {});
    if (mode === "system") resetToSystem();
    else setTheme(mode);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => {
          reset();
          signOut(auth).catch(() => {});
        },
      },
    ]);
  };

  const { showAchievement } = useAchievement();

  const triggerDemoToast = () => {
    showAchievement({
      title: "¡CAMPEÓN!",
      subtitle: "BBQ Classic Cup · +500 pts",
      variant: "champion",
    });
  };

  const firstName = profile?.nombre?.split(" ")?.[0] ?? "Miembro";
  const displayPoints = profile?.puntos ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Header */}
        <AnimatedView
          entering={fadeDown(0)}
          style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}
        >
          <Text
            style={{
              color: c.fgMuted,
              fontFamily: "Inter_500Medium",
              fontSize: 11,
              letterSpacing: 3.2,
              textTransform: "uppercase",
            }}
          >
            Tu app
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
            <Text
              style={{
                color: c.fg,
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 38,
                letterSpacing: -1,
                textTransform: "uppercase",
              }}
            >
              Ajustes
            </Text>
            <Text
              style={{
                color: c.lime,
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 38,
                letterSpacing: -1,
              }}
            >
              .
            </Text>
          </View>
        </AnimatedView>

        {/* Member card */}
        <AnimatedView entering={fadeDown(60)} style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              padding: 18,
              overflow: "hidden",
            }}
          >
            {/* Soft radial glow — fades evenly into the card surface */}
            <MemberGlow color={c.lime} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {/* Avatar */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: c.limeAlpha(0.55),
                  backgroundColor: c.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  shadowColor: c.lime,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.55,
                  shadowRadius: 14,
                }}
              >
                <Image
                  source={require("@/assets/logo/ilust.png")}
                  style={{ width: 56, height: 56 }}
                  resizeMode="contain"
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: c.fgMuted,
                    fontFamily: "Inter_500Medium",
                    fontSize: 10,
                    letterSpacing: 2.4,
                    textTransform: "uppercase",
                  }}
                >
                  Miembro
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: c.fg,
                    fontFamily: "SpaceGrotesk_700Bold",
                    fontSize: 22,
                    letterSpacing: -0.5,
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  {firstName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: c.fgDim, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}
                >
                  {profile?.email ?? "—"}
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/(user)/settings/personal" as any)}
                accessibilityLabel="Editar perfil"
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bg,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <Ionicons name="chevron-forward" size={16} color={c.fgMuted} />
              </Pressable>
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 16,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: c.borderLight,
              }}
            >
              <StatCell c={c} icon="sparkles" label="Puntos" value={String(displayPoints)} />
              <StatCell c={c} icon="medal-outline" label="Logros" value="12" />
              <StatCell c={c} icon="star-outline" label="Ranking" value="#47" />
            </View>
          </View>
        </AnimatedView>

        {/* Apariencia */}
        <AnimatedView entering={fadeDown(140)} style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionLabel c={c}>Apariencia</SectionLabel>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: c.fgDim,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Elegí el modo en el que te sentís más cómodo.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ThemeChip
                c={c}
                icon="sunny-outline"
                label="Claro"
                active={activeTheme === "light"}
                onPress={() => handleThemeChange("light")}
              />
              <ThemeChip
                c={c}
                icon="moon-outline"
                label="Oscuro"
                active={activeTheme === "dark"}
                onPress={() => handleThemeChange("dark")}
              />
              <ThemeChip
                c={c}
                icon="phone-portrait-outline"
                label="Sistema"
                active={activeTheme === "system"}
                onPress={() => handleThemeChange("system")}
              />
            </View>
          </View>
        </AnimatedView>

        {/* Preferencias */}
        <AnimatedView entering={fadeDown(200)} style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionLabel c={c}>Preferencias</SectionLabel>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              overflow: "hidden",
            }}
          >
            <SettingsRow
              c={c}
              icon="person-outline"
              title="Datos personales"
              subtitle="Nombre, email, teléfono"
              onPress={() => router.push("/(user)/settings/personal" as any)}
            />
            <Divider c={c} />
            <SettingsRow
              c={c}
              icon="trophy-outline"
              title="Probar logro"
              subtitle="Dispara un toast de achievement"
              tone="primary"
              onPress={triggerDemoToast}
            />
          </View>
        </AnimatedView>

        {/* Admin panel */}
        {isAdmin && (
          <AnimatedView entering={fadeDown(240)} style={{ paddingHorizontal: 20, marginTop: 22 }}>
            <SectionLabel c={c} color={c.gold}>
              Panel Admin
            </SectionLabel>
            <View
              style={{
                borderRadius: 28,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                overflow: "hidden",
              }}
            >
              <SettingsRow c={c} icon="document-text-outline" title="Comprobantes" tone="gold" onPress={() => router.push("/(user)/admin/comprobantes" as any)} />
              <Divider c={c} />
              <SettingsRow c={c} icon="trophy-outline" title="CRM Torneos" tone="gold" onPress={() => router.push("/(user)/admin/crm-torneos" as any)} />
              <Divider c={c} />
              <SettingsRow c={c} icon="fast-food-outline" title="CRM Burgers" tone="gold" onPress={() => router.push("/(user)/admin/crm-burgers" as any)} />
              <Divider c={c} />
              <SettingsRow c={c} icon="people-outline" title="CRM Usuarios" tone="gold" onPress={() => router.push("/(user)/admin/usuarios" as any)} />
              <Divider c={c} />
              <SettingsRow c={c} icon="flash-outline" title="Puntos" tone="gold" onPress={() => router.push("/(user)/admin/points" as any)} />
              <Divider c={c} />
              <SettingsRow c={c} icon="megaphone-outline" title="Anuncios" tone="gold" onPress={() => router.push("/(user)/admin/anuncios" as any)} />
            </View>
          </AnimatedView>
        )}

        {/* Soporte */}
        <AnimatedView entering={fadeDown(280)} style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionLabel c={c}>Soporte</SectionLabel>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              overflow: "hidden",
            }}
          >
            <SettingsRow
              c={c}
              icon="help-circle-outline"
              title="Centro de ayuda"
              subtitle="Preguntas frecuentes y contacto"
              onPress={() => router.push("/(user)/settings/help" as any)}
            />
            <Divider c={c} />
            <SettingsRow
              c={c}
              icon="shield-checkmark-outline"
              title="Privacidad y términos"
              subtitle="Lo que tenés que saber"
              onPress={() => router.push("/(user)/settings/privacy" as any)}
            />
          </View>
        </AnimatedView>

        {/* Logout */}
        <AnimatedView entering={fadeDown(340)} style={{ paddingHorizontal: 20, marginTop: 26 }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              height: 54,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "rgba(255,59,48,0.35)",
              backgroundColor: "rgba(255,59,48,0.10)",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            <Text
              style={{
                color: "#FF3B30",
                fontFamily: "Inter_700Bold",
                fontSize: 14,
                letterSpacing: 0.4,
              }}
            >
              Cerrar sesión
            </Text>
          </Pressable>
          <Text
            style={{
              textAlign: "center",
              marginTop: 14,
              color: c.fgMuted,
              fontFamily: "Inter_500Medium",
              fontSize: 10,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Souche · v1.0.0
          </Text>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────────────── */

function SectionLabel({
  children,
  c,
  color,
}: {
  children: React.ReactNode;
  c: ReturnType<typeof useThemeColors>;
  color?: string;
}) {
  return (
    <Text
      style={{
        color: color ?? c.fgMuted,
        fontFamily: "Inter_600SemiBold",
        fontSize: 11,
        letterSpacing: 3,
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function StatCell({
  c,
  icon,
  label,
  value,
}: {
  c: ReturnType<typeof useThemeColors>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.borderLight,
        backgroundColor: c.bg,
        padding: 10,
        gap: 4,
      }}
    >
      <Ionicons name={icon} size={14} color={c.lime} />
      <Text
        style={{
          color: c.fg,
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 18,
          letterSpacing: -0.3,
          lineHeight: 20,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: c.fgMuted,
          fontFamily: "Inter_500Medium",
          fontSize: 9.5,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ThemeChip({
  c,
  icon,
  label,
  active,
  onPress,
}: {
  c: ReturnType<typeof useThemeColors>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderColor: active ? c.lime : c.borderLight,
        backgroundColor: active ? c.limeAlpha(0.12) : c.bg,
        shadowColor: active ? c.lime : "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: active ? 0.4 : 0,
        shadowRadius: active ? 14 : 0,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Ionicons name={icon} size={20} color={active ? c.lime : c.fgMuted} />
      <Text
        style={{
          color: active ? c.lime : c.fgMuted,
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SettingsRow({
  c,
  icon,
  title,
  subtitle,
  onPress,
  tone = "neutral",
}: {
  c: ReturnType<typeof useThemeColors>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: RowTone;
}) {
  const tokens =
    tone === "primary"
      ? {
          bg: c.limeAlpha(0.12),
          border: c.limeAlpha(0.45),
          icon: c.lime,
          title: c.fg,
        }
      : tone === "gold"
        ? {
            bg: `${c.gold}1F`,
            border: `${c.gold}55`,
            icon: c.gold,
            title: c.gold,
          }
        : {
            bg: "rgba(255,255,255,0.05)",
            border: "rgba(255,255,255,0.10)",
            icon: c.fg,
            title: c.fg,
          };

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: pressed ? c.limeAlpha(0.06) : "transparent",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tokens.bg,
              borderWidth: 1,
              borderColor: tokens.border,
              marginRight: 14,
            }}
          >
            <Ionicons name={icon} size={18} color={tokens.icon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: tokens.title,
                fontFamily: "Inter_700Bold",
                fontSize: 15,
                letterSpacing: -0.1,
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                numberOfLines={1}
                style={{
                  color: c.fgDim,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12.5,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={c.fgMuted}
            style={{ marginLeft: 10 }}
          />
        </View>
      )}
    </Pressable>
  );
}

function Divider({ c }: { c: ReturnType<typeof useThemeColors> }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.borderLight, marginLeft: 74 }} />;
}

function MemberGlow({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -MEMBER_GLOW_SIZE / 2 + 44,
        right: -MEMBER_GLOW_SIZE / 2 + 40,
        width: MEMBER_GLOW_SIZE,
        height: MEMBER_GLOW_SIZE,
      }}
    >
      <Svg width={MEMBER_GLOW_SIZE} height={MEMBER_GLOW_SIZE}>
        <Defs>
          <RadialGradient
            id="memberGlow"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <Stop offset="35%" stopColor={color} stopOpacity={0.16} />
            <Stop offset="70%" stopColor={color} stopOpacity={0.04} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <SvgRect width={MEMBER_GLOW_SIZE} height={MEMBER_GLOW_SIZE} fill="url(#memberGlow)" />
      </Svg>
    </View>
  );
}
