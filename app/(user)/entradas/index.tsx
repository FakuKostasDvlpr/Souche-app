import { View, Text } from "react-native";

export default function EntradasScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-souche-black px-8">
      <Text className="text-4xl mb-4">🎟️</Text>
      <Text className="text-2xl font-black text-white mb-2">Comprar Entradas</Text>
      <Text className="text-center text-souche-gray-400">
        Próximamente: lista de torneos disponibles con compra por comprobante.
      </Text>
    </View>
  );
}
