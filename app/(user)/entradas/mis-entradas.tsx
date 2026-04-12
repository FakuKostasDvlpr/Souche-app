import { View, Text } from "react-native";

export default function MisEntradasScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-souche-black px-8">
      <Text className="text-4xl mb-4">🏆</Text>
      <Text className="text-2xl font-black text-white mb-2">Mis Entradas</Text>
      <Text className="text-center text-souche-gray-400">
        Acá vas a ver tus entradas con su estado y QR.
      </Text>
    </View>
  );
}
