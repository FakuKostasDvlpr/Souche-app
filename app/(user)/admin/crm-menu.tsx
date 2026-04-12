import { View, Text } from "react-native";

export default function CrmMenuScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-souche-black px-8">
      <Text className="text-4xl mb-4">🍔</Text>
      <Text className="text-2xl font-black text-white mb-2">CRM Menú</Text>
      <Text className="text-center text-souche-gray-400">
        Subí hamburguesas al menú con foto, título, descripción y precio.
      </Text>
    </View>
  );
}
