import { View, Text } from "react-native";

export default function UsuariosScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-souche-black px-8">
      <Text className="text-4xl mb-4">👥</Text>
      <Text className="text-2xl font-black text-white mb-2">Usuarios</Text>
      <Text className="text-center text-souche-gray-400">
        Lista de usuarios registrados con puntos, entradas y estado.
      </Text>
    </View>
  );
}
