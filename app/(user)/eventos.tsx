import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatedView, AnimatedPressable, fadeDown, useScalePress } from "@/lib/animations";
import { IconTicket } from "@/components/icons";
import { LongPressCard } from "@/components/ui/long-press-card";

const MOCK_TORNEOS = [
  {
    id: "1",
    nombre: "Torneo BBQ Classic",
    fecha: "15 Junio 2025",
    lugar: "Souche - Sede Central",
    precio: "$5.000",
    cuposMaximos: 32,
    cuposOcupados: 28,
    activo: true,
  },
  {
    id: "2",
    nombre: "Torneo Smash Burger",
    fecha: "29 Junio 2025",
    lugar: "Souche - Sede Norte",
    precio: "$3.500",
    cuposMaximos: 16,
    cuposOcupados: 5,
    activo: true,
  },
  {
    id: "3",
    nombre: "Torneo Souche Open",
    fecha: "10 Julio 2025",
    lugar: "Por definir",
    precio: "$4.000",
    cuposMaximos: 64,
    cuposOcupados: 0,
    activo: false,
  },
];

function PressCard({ children, onPress, className: cn = "" }: { children: React.ReactNode; onPress?: () => void; className?: string }) {
  const { animStyle, onPressIn, onPressOut } = useScalePress();
  return (
    <AnimatedPressable style={animStyle} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} className={cn}>
      {children}
    </AnimatedPressable>
  );
}

export default function EventosScreen() {
  const router = useRouter();
  const cuposRestantes = (t: (typeof MOCK_TORNEOS)[0]) =>
    t.cuposMaximos - t.cuposOcupados;

  return (
    <ScrollView className="flex-1 bg-souche-black" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <AnimatedView entering={fadeDown(0)} className="px-5 pt-4 pb-2">
        <Text className="text-sm text-neutral-500">
          Anotate a los próximos torneos y competí por premios.
        </Text>
      </AnimatedView>

      {/* Mis entradas shortcut */}
      <AnimatedView entering={fadeDown(80)}>
        <PressCard
          className="mx-5 mb-5 overflow-hidden rounded-2xl"
          onPress={() => router.push("/(user)/entradas/mis-entradas")}
        >
          <LinearGradient
            colors={["rgba(21,120,61,0.15)", "rgba(21,120,61,0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(21,120,61,0.2)" }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="qr-code" size={18} color="#15783D" />
              <Text className="text-sm font-bold text-souche-green">
                Ver mis entradas y QRs
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#15783D" />
          </LinearGradient>
        </PressCard>
      </AnimatedView>

      {/* Tournament list */}
      {MOCK_TORNEOS.map((torneo, idx) => {
        const restantes = cuposRestantes(torneo);
        const casi_lleno = restantes <= 3 && restantes > 0;

        return (
          <AnimatedView key={torneo.id} entering={fadeDown(160 + idx * 100)}>
          <LongPressCard
            className="mx-5 mb-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
            onPress={() => router.push(`/(user)/entradas/${torneo.id}`)}
            onLongPress={() => {
              Alert.alert(
                torneo.nombre,
                `📅 ${torneo.fecha}\n📍 ${torneo.lugar}\n💰 ${torneo.precio}\n\nCupos: ${torneo.cuposOcupados}/${torneo.cuposMaximos}${
                  !torneo.activo ? "\n\n⏳ Próximamente" : ""
                }`,
                [{ text: "Cerrar" }]
              );
            }}
            minDuration={400}
          >
            {/* Status badge */}
            <View className="flex-row items-center justify-between px-4 pt-4">
              <View
                className={`rounded-full px-3 py-1 ${
                  torneo.activo ? "bg-souche-green/20" : "bg-souche-gray-700/50"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    torneo.activo ? "text-souche-green" : "text-souche-gray-500"
                  }`}
                >
                  {torneo.activo ? "INSCRIPCIÓN ABIERTA" : "PRÓXIMAMENTE"}
                </Text>
              </View>
              {casi_lleno && (
                <View className="rounded-full bg-souche-gold/20 px-3 py-1">
                  <Text className="text-xs font-bold text-souche-gold">
                    {restantes} CUPOS
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View className="px-4 pt-3 pb-4">
              <Text className="text-xl font-black text-white mb-2">
                {torneo.nombre}
              </Text>

              <View className="flex-row items-center gap-2 mb-1.5">
                <Ionicons name="calendar-outline" size={14} color="#A3A3A3" />
                <Text className="text-sm text-souche-gray-400">
                  {torneo.fecha}
                </Text>
              </View>

              <View className="flex-row items-center gap-2 mb-1.5">
                <Ionicons name="location-outline" size={14} color="#A3A3A3" />
                <Text className="text-sm text-souche-gray-400">
                  {torneo.lugar}
                </Text>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-2xl font-black text-souche-green">
                  {torneo.precio}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="people-outline" size={14} color="#A3A3A3" />
                  <Text className="text-sm text-souche-gray-400">
                    {torneo.cuposOcupados}/{torneo.cuposMaximos}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View className="mt-3 h-1.5 rounded-full bg-souche-gray-800 overflow-hidden">
                <View
                  className="h-full rounded-full bg-souche-green"
                  style={{
                    width: `${(torneo.cuposOcupados / torneo.cuposMaximos) * 100}%`,
                  }}
                />
              </View>
            </View>
          </LongPressCard>
          </AnimatedView>
        );
      })}
    </ScrollView>
  );
}
