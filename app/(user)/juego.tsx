import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/useAuthStore";
import { AnimatedView, AnimatedPressable, fadeDown, zoomIn, useScalePress } from "@/lib/animations";
import { IconGamepad, IconTrophy } from "@/components/icons";
import { AccordionItem } from "@/components/ui/accordion-item";

const TOP_10_MOCK = [
  { nombre: "Juan G.", puntos: 980 },
  { nombre: "María L.", puntos: 850 },
  { nombre: "Carlos R.", puntos: 720 },
  { nombre: "Ana P.", puntos: 690 },
  { nombre: "Lucas M.", puntos: 580 },
];

export default function JuegoScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SafeAreaView className="flex-1 bg-souche-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-5 pt-4">
          <Text className="text-2xl font-black text-white">
            Suma Puntos y Gana
          </Text>
          <Text className="mt-1 text-sm text-souche-gray-400">
            Corré, saltá obstáculos y ganá puntos Souche reales.
          </Text>
        </View>

        {/* Game card */}
        <AnimatedView entering={zoomIn(120)} className="mx-5 mt-5 overflow-hidden rounded-3xl">
          <LinearGradient
            colors={["rgba(21,120,61,0.12)", "rgba(21,120,61,0.02)"]}
            style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderColor: "rgba(21,120,61,0.15)" }}
          >
            <LinearGradient
              colors={["rgba(21,120,61,0.2)", "rgba(21,120,61,0.05)"]}
              style={{ width: 120, height: 120, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 2, borderColor: "rgba(21,120,61,0.2)" }}
            >
              <IconGamepad size={52} color="#15783D" />
            </LinearGradient>

            <Text className="text-xl font-black text-white text-center mb-1">
              Souche Runner
            </Text>
            <Text className="text-sm text-neutral-500 text-center mb-6">
              Endless runner 2D con temática Souche
            </Text>

            <Pressable className="w-full overflow-hidden rounded-2xl active:opacity-80">
              <LinearGradient
                colors={["#15783D", "#1a9a4e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, borderRadius: 16 }}
              >
                <Text className="text-center text-lg font-black text-white">
                  JUGAR
                </Text>
              </LinearGradient>
            </Pressable>

            <Text className="mt-3 text-xs text-neutral-500 text-center">
              Podés ganar puntos 1 vez por día
            </Text>
          </LinearGradient>
        </AnimatedView>

        {/* My stats */}
        <AnimatedView entering={fadeDown(280)} className="mx-5 mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 items-center">
            <IconTrophy size={20} />
            <Text className="mt-2 text-2xl font-black text-white">0</Text>
            <Text className="text-xs text-neutral-500">Mi récord</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 items-center">
            <Ionicons name="flash" size={20} color="#15783D" />
            <Text className="mt-2 text-2xl font-black text-souche-green">0</Text>
            <Text className="text-xs text-neutral-500">Pts ganados hoy</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 items-center">
            <IconGamepad size={20} color="#737373" />
            <Text className="mt-2 text-2xl font-black text-white">0</Text>
            <Text className="text-xs text-neutral-500">Partidas</Text>
          </View>
        </AnimatedView>

        {/* How it works — Accordion */}
        <AnimatedView entering={fadeDown(360)} className="mx-5 mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 px-4">
          <AccordionItem
            title="¿Cómo funciona?"
            icon="help-circle-outline"
            iconColor="#15783D"
            defaultOpen={false}
            titleClassName="text-white"
          >
            <View className="gap-2.5 pb-4">
              <View className="flex-row items-center gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-souche-green/10">
                  <Text className="text-xs font-bold text-souche-green">1</Text>
                </View>
                <Text className="flex-1 text-sm text-souche-gray-300">
                  Tocá <Text className="font-bold text-white">JUGAR</Text> para empezar una partida
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-souche-green/10">
                  <Text className="text-xs font-bold text-souche-green">2</Text>
                </View>
                <Text className="flex-1 text-sm text-souche-gray-300">
                  Esquivá obstáculos y juntá items Souche
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-souche-green/10">
                  <Text className="text-xs font-bold text-souche-green">3</Text>
                </View>
                <Text className="flex-1 text-sm text-souche-gray-300">
                  Tu puntaje se convierte en{" "}
                  <Text className="font-bold text-souche-green">puntos Souche reales</Text>
                </Text>
              </View>
            </View>
          </AccordionItem>
        </AnimatedView>

        {/* Top 10 */}
        <AnimatedView entering={fadeDown(440)} className="mx-5 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-white">
              Top 10 Comunidad
            </Text>
            <Ionicons name="podium-outline" size={18} color="#737373" />
          </View>

          <View className="rounded-2xl border border-souche-gray-800 bg-souche-gray-900 overflow-hidden">
            {TOP_10_MOCK.map((player, index) => (
              <View
                key={index}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index < TOP_10_MOCK.length - 1
                    ? "border-b border-souche-gray-800"
                    : ""
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text
                    className={`text-sm font-black w-6 ${
                      index === 0
                        ? "text-souche-gold"
                        : index === 1
                        ? "text-souche-gray-300"
                        : index === 2
                        ? "text-orange-400"
                        : "text-souche-gray-500"
                    }`}
                  >
                    #{index + 1}
                  </Text>
                  <Text className="text-sm font-semibold text-white">
                    {player.nombre}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-souche-green">
                  {player.puntos} pts
                </Text>
              </View>
            ))}
          </View>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}
