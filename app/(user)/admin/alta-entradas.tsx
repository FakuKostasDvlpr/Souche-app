import { View, Text } from "react-native";

export default function AltaEntradasScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-souche-black px-8">
      <Text className="text-4xl mb-4">➕</Text>
      <Text className="text-2xl font-black text-white mb-2">Alta de Entradas</Text>
      <Text className="text-center text-souche-gray-400">
        Creá un nuevo torneo/evento desde acá.
      </Text>
    </View>
  );
}
