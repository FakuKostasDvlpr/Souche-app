import { View, Text } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";

export default function PuntosScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <View className="flex-1 bg-souche-black px-5 pt-8">
      <View className="items-center mb-8">
        <Text className="text-5xl font-black text-souche-green">
          {profile?.puntos ?? 0}
        </Text>
        <Text className="mt-2 text-lg text-souche-gray-400">Puntos Souche</Text>
      </View>

      <Text className="mb-3 text-lg font-bold text-white">Historial</Text>
      <View className="rounded-2xl bg-souche-gray-900 border border-souche-gray-800 p-4">
        <Text className="text-sm text-souche-gray-500">
          Tu historial de puntos aparecerá acá.
        </Text>
      </View>
    </View>
  );
}
