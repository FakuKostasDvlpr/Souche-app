import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AnimatedView,
  AnimatedPressable,
  fadeDown,
  fadeIn,
  slideDown,
  useScalePress,
} from "@/lib/animations";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { IconSoucheLogo, IconTrophy, IconFire, IconTicket } from "@/components/icons";
import { Ionicons } from "@expo/vector-icons";

function PressCard({
  children,
  onPress,
  className: cn = "",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  const { animStyle, onPressIn, onPressOut } = useScalePress();
  return (
    <AnimatedPressable
      style={animStyle}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      className={cn}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const isAdmin = profile?.rol === "superadmin";

  return (
    <SafeAreaView className="flex-1 bg-souche-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Announcement bar */}
        <AnimatedView entering={slideDown(0)}>
          <LinearGradient
            colors={["#15783D", "#1a9a4e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <View className="flex-row items-center gap-2">
              <IconFire size={14} color="#fff" />
              <Text className="flex-1 text-xs font-bold text-white">
                Torneo BBQ Classic — ¡Inscripciones abiertas! Solo 4 cupos.
              </Text>
            </View>
          </LinearGradient>
        </AnimatedView>

        {/* Header */}
        <AnimatedView entering={fadeDown(80)} className="px-5 pt-5 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-white tracking-tight">
              Hola, {profile?.nombre ?? "Usuario"}
            </Text>
            <Text className="mt-0.5 text-sm text-neutral-400">
              Bienvenido a Souche
            </Text>
          </View>
          <PressCard onPress={() => router.push("/(user)/config")} className="h-11 w-11 items-center justify-center rounded-full overflow-hidden">
            <LinearGradient
              colors={["#15783D", "#0f5a2d"]}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text className="text-base font-black text-white">
                {profile?.nombre?.charAt(0) ?? "?"}
              </Text>
            </LinearGradient>
          </PressCard>
        </AnimatedView>

        {/* Quick stats */}
        <AnimatedView entering={fadeDown(160)} className="mx-5 mt-4 flex-row gap-3">
          <PressCard
            onPress={() => router.push("/(user)/puntos")}
            className="flex-1 rounded-2xl overflow-hidden"
          >
            <LinearGradient
              colors={["rgba(21,120,61,0.15)", "rgba(21,120,61,0.05)"]}
              style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(21,120,61,0.2)" }}
            >
              <Ionicons name="star" size={18} color="#15783D" />
              <Text className="mt-2 text-3xl font-black text-souche-green">
                {profile?.puntos ?? 0}
              </Text>
              <Text className="mt-0.5 text-xs font-semibold text-neutral-400">
                Puntos Souche
              </Text>
            </LinearGradient>
          </PressCard>
          <PressCard
            onPress={() => router.push("/(user)/entradas/mis-entradas")}
            className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <Ionicons name="ticket" size={18} color="#A3A3A3" />
            <Text className="mt-2 text-3xl font-black text-white">0</Text>
            <Text className="mt-0.5 text-xs font-semibold text-neutral-400">
              Entradas activas
            </Text>
          </PressCard>
        </AnimatedView>

        {/* Winner banner */}
        <AnimatedView entering={fadeDown(240)} className="mx-5 mt-5 rounded-2xl overflow-hidden">
          <LinearGradient
            colors={["rgba(247,174,0,0.12)", "rgba(247,174,0,0.03)"]}
            style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(247,174,0,0.15)" }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <IconTrophy size={18} />
              <Text className="text-xs font-bold uppercase tracking-widest text-souche-gold">
                Ganador del torneo BBQ
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <LinearGradient
                colors={["#F7AE00", "#c48b00"]}
                style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              >
                <Text className="text-xl font-black text-white">1°</Text>
              </LinearGradient>
              <View className="flex-1">
                <Text className="text-lg font-black text-white">Juan García</Text>
                <Text className="text-xs text-neutral-300">Torneo BBQ — 15 Junio 2025</Text>
                <Text className="text-xs font-bold text-souche-gold mt-0.5">+500 puntos ganados</Text>
              </View>
            </View>
          </LinearGradient>
        </AnimatedView>

        {/* Featured burgers */}
        <AnimatedView entering={fadeDown(320)} className="mt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-white tracking-tight">Nuestro Menú</Text>
            <PressCard onPress={() => router.push("/(user)/menu")}>
              <Text className="text-sm font-bold text-souche-green">Ver todo</Text>
            </PressCard>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {[
              { name: "Souche Classic", price: "$4.500", tag: "POPULAR", tagColor: "#F7AE00" },
              { name: "BBQ Monster", price: "$5.800", tag: "NUEVO", tagColor: "#15783D" },
              { name: "Green Souche", price: "$4.200", tag: null, tagColor: null },
            ].map((b, i) => (
              <PressCard
                key={i}
                onPress={() => router.push("/(user)/menu")}
                className="w-44 rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"
              >
                <View className="h-28 bg-neutral-800 items-center justify-center">
                  <Ionicons name="fast-food" size={26} color="#404040" />
                </View>
                <View className="p-3">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Text className="text-sm font-bold text-white" numberOfLines={1}>{b.name}</Text>
                    {b.tag && (
                      <View style={{ backgroundColor: `${b.tagColor}20`, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ color: b.tagColor!, fontSize: 9, fontWeight: "800" }}>{b.tag}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm font-black text-souche-green">{b.price}</Text>
                </View>
              </PressCard>
            ))}
          </ScrollView>
        </AnimatedView>

        {/* Novedades */}
        <ScrollReveal delay={0} className="px-5 mt-6">
          <Text className="text-lg font-bold text-white tracking-tight mb-3">Novedades</Text>
          <View className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <View className="p-4 border-b border-neutral-800">
              <View className="flex-row items-center gap-2 mb-1.5">
                <View className="h-2 w-2 rounded-full bg-souche-green" />
                <Text className="text-[10px] font-bold text-souche-green tracking-wider">NUEVO</Text>
              </View>
              <Text className="text-base font-bold text-white">
                Torneo BBQ Classic — Inscripciones abiertas
              </Text>
              <Text className="mt-1 text-sm text-neutral-400 leading-5">
                Solo quedan 4 cupos. Anotate antes de que se llenen.
              </Text>
            </View>
            <View className="p-4">
              <Text className="text-base font-bold text-white">Nuevo menú de temporada</Text>
              <Text className="mt-1 text-sm text-neutral-400 leading-5">
                3 hamburguesas nuevas disponibles. Vení a probarlas.
              </Text>
            </View>
          </View>
        </ScrollReveal>

        {/* Nosotros */}
        <ScrollReveal delay={80} className="px-5 mt-6">
          <Text className="mb-3 text-lg font-bold text-white tracking-tight">Nosotros</Text>
          <View className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <View className="flex-row items-center gap-3 mb-3">
              <IconSoucheLogo size={36} />
              <Text className="text-lg font-black text-white tracking-tight">Souche</Text>
            </View>
            <Text className="text-sm text-neutral-300 leading-5">
              Souche nació de la pasión por la hamburguesa artesanal y los
              torneos que unen a la comunidad. Más que un local, es una
              experiencia gastronómica y social.
            </Text>
          </View>
        </ScrollReveal>

        {/* Próximos eventos */}
        <ScrollReveal delay={160} className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-white tracking-tight">Próximos Eventos</Text>
            <PressCard onPress={() => router.push("/(user)/eventos")}>
              <Text className="text-sm font-bold text-souche-green">Ver todos</Text>
            </PressCard>
          </View>
          <PressCard
            onPress={() => router.push("/(user)/eventos")}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <View className="flex-row items-center gap-3">
              <LinearGradient
                colors={["rgba(21,120,61,0.15)", "rgba(21,120,61,0.05)"]}
                style={{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="calendar" size={22} color="#15783D" />
              </LinearGradient>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Torneo BBQ Classic</Text>
                <Text className="text-sm text-neutral-400">15 Jun · Sede Central · $5.000</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#525252" />
            </View>
          </PressCard>
        </ScrollReveal>
      </ScrollView>
    </SafeAreaView>
  );
}
