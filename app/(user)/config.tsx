import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { AnimatedView, AnimatedPressable, fadeDown, useScalePress } from "@/lib/animations";
import { IconSoucheLogo } from "@/components/icons";
import { AccordionItem } from "@/components/ui/accordion-item";

export default function ConfigScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const isAdmin = profile?.rol === "superadmin";

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    color = "#fff",
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress: () => void;
    color?: string;
  }) => (
    <Pressable
      className="flex-row items-center justify-between py-4 active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-souche-gray-800">
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text className="text-base font-semibold" style={{ color }}>
          {label}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value && (
          <Text className="text-sm text-souche-gray-500">{value}</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color="#525252" />
      </View>
    </Pressable>
  );

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

  return (
    <SafeAreaView className="flex-1 bg-souche-black" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <AnimatedView entering={fadeDown(0)} className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-black text-white tracking-tight">Configuración</Text>
        </AnimatedView>

        {/* Profile card */}
        <AnimatedView entering={fadeDown(80)} className="mx-5 mt-2 flex-row items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <LinearGradient
            colors={["#15783D", "#0f5a2d"]}
            style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }}
          >
            <Text className="text-xl font-black text-white">
              {profile?.nombre?.charAt(0) ?? "?"}
            </Text>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-lg font-black text-white tracking-tight">
              {profile?.nombre} {profile?.apellido}
            </Text>
            <Text className="text-sm text-neutral-400">{profile?.email}</Text>
            {isAdmin && (
              <View className="mt-1.5 self-start rounded-full bg-souche-gold/20 px-3 py-0.5">
                <Text className="text-xs font-bold text-souche-gold">SUPERADMIN</Text>
              </View>
            )}
          </View>
        </AnimatedView>

        {/* Puntos badge */}
        <AnimatedView entering={fadeDown(160)} className="mx-5 mt-4 overflow-hidden rounded-2xl">
          <LinearGradient
            colors={["rgba(21,120,61,0.12)", "rgba(21,120,61,0.04)"]}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(21,120,61,0.15)" }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="star" size={20} color="#15783D" />
              <Text className="text-sm font-bold text-souche-green">Puntos Souche</Text>
            </View>
            <Text className="text-xl font-black text-souche-green">
              {profile?.puntos ?? 0}
            </Text>
          </LinearGradient>
        </AnimatedView>

        {/* Account section — users only see puntos/entradas */}
        {!isAdmin && (
          <AnimatedView entering={fadeDown(240)} className="mx-5 mt-6">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
              Mi cuenta
            </Text>
            <View className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4">
              <MenuItem
                icon="person-outline"
                label="Mi Perfil"
                onPress={() => router.push("/(user)/perfil")}
              />
              <View className="h-px bg-souche-gray-800" />
              <MenuItem
                icon="star-outline"
                label="Mis Puntos"
                value={`${profile?.puntos ?? 0} pts`}
                onPress={() => router.push("/(user)/puntos")}
              />
              <View className="h-px bg-souche-gray-800" />
              <MenuItem
                icon="ticket-outline"
                label="Mis Entradas"
                onPress={() => router.push("/(user)/entradas/mis-entradas")}
              />
            </View>
          </AnimatedView>
        )}

        {/* Admin — profile only */}
        {isAdmin && (
          <AnimatedView entering={fadeDown(240)} className="mx-5 mt-6">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
              Mi cuenta
            </Text>
            <View className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4">
              <MenuItem
                icon="person-outline"
                label="Mi Perfil"
                onPress={() => router.push("/(user)/perfil")}
              />
            </View>
          </AnimatedView>
        )}

        {/* Admin panel — Accordion */}
        {isAdmin && (
          <AnimatedView entering={fadeDown(320)} className="mx-5 mt-6 rounded-2xl border border-souche-gold/20 bg-neutral-900 px-4">
            <AccordionItem
              title="Panel Admin"
              icon="shield-outline"
              iconColor="#F7AE00"
              defaultOpen={true}
              titleClassName="text-souche-gold font-bold"
            >
              <View className="pb-1">
                <MenuItem
                  icon="calendar-outline"
                  label="Gestionar Eventos"
                  color="#F7AE00"
                  onPress={() => router.push("/(user)/admin/alta-entradas")}
                />
                <View className="h-px bg-souche-gray-800" />
                <MenuItem
                  icon="people-outline"
                  label="CRM Usuarios"
                  color="#F7AE00"
                  onPress={() => router.push("/(user)/admin/usuarios")}
                />
                <View className="h-px bg-souche-gray-800" />
                <MenuItem
                  icon="trophy-outline"
                  label="Ganadores"
                  color="#F7AE00"
                  onPress={() => router.push("/(user)/admin/ganadores")}
                />
                <View className="h-px bg-souche-gray-800" />
                <MenuItem
                  icon="fast-food-outline"
                  label="CRM Menú"
                  color="#F7AE00"
                  onPress={() => router.push("/(user)/admin/crm-menu")}
                />
                <View className="h-px bg-souche-gray-800" />
                <MenuItem
                  icon="megaphone-outline"
                  label="Anuncios"
                  color="#F7AE00"
                  onPress={() => router.push("/(user)/admin/comprobantes")}
                />
              </View>
            </AccordionItem>
          </AnimatedView>
        )}

        {/* Logout */}
        <AnimatedView entering={fadeDown(400)} className="mx-5 mt-6 mb-12">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-4 active:opacity-80"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="text-base font-bold text-red-500">
              Cerrar sesión
            </Text>
          </Pressable>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}
