import { View, Text } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";

export default function PerfilScreen() {
  const profile = useAuthStore((s) => s.profile);

  const Field = ({ label, value }: { label: string; value: string }) => (
    <View className="mb-4">
      <Text className="text-xs font-bold uppercase text-souche-gray-500">{label}</Text>
      <Text className="mt-1 text-base text-white">{value}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-souche-black px-5 pt-8">
      <View className="items-center mb-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-souche-green mb-3">
          <Text className="text-3xl font-black text-white">
            {profile?.nombre?.charAt(0) ?? "?"}
          </Text>
        </View>
        <Text className="text-xl font-black text-white">
          {profile?.nombre} {profile?.apellido}
        </Text>
        <Text className="text-sm text-souche-gray-400">{profile?.email}</Text>
      </View>

      <View className="rounded-2xl bg-souche-gray-900 border border-souche-gray-800 p-5">
        <Field label="Nombre" value={profile?.nombre ?? "—"} />
        <Field label="Apellido" value={profile?.apellido ?? "—"} />
        <Field label="Email" value={profile?.email ?? "—"} />
        <Field label="Género" value={profile?.genero ?? "—"} />
        <Field label="Rol" value={profile?.rol ?? "usuario"} />
        <Field label="Puntos" value={String(profile?.puntos ?? 0)} />
        <Field
          label="Email verificado"
          value={profile?.emailVerified ? "✅ Sí" : "❌ No"}
        />
      </View>
    </View>
  );
}
