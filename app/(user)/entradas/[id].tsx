import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";

const MOCK_TORNEO = {
  id: "1",
  nombre: "Torneo BBQ Classic",
  fecha: "15 Junio 2025",
  lugar: "Souche - Sede Central",
  precio: "$5.000",
  cuposMaximos: 32,
  cuposOcupados: 28,
  descripcion:
    "Competí en el torneo más esperado de Souche. Smash burgers, premios y mucha diversión. Los ganadores se llevan puntos Souche y premios exclusivos.",
  reglas: "Eliminación directa. Cada ronda dura 10 minutos. El jurado decide al ganador.",
  alias: "souche.torneos",
};

type Step = "info" | "transfer" | "comprobante" | "done";

export default function TorneoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const torneo = MOCK_TORNEO;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setComprobanteUri(result.assets[0].uri);
    }
  };

  const pasteFromClipboard = async () => {
    const hasImage = await Clipboard.hasImageAsync();
    if (hasImage) {
      const img = await Clipboard.getImageAsync({ format: "png" });
      if (img?.data) {
        setComprobanteUri(img.data);
      }
    } else {
      Alert.alert("Sin imagen", "No hay ninguna imagen en el portapapeles.");
    }
  };

  const handleSubmit = () => {
    if (!comprobanteUri) {
      Alert.alert("Comprobante requerido", "Subí el comprobante de transferencia para continuar.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
    }, 1500);
  };

  const StepIndicator = () => {
    const steps: { key: Step; label: string }[] = [
      { key: "info", label: "Detalle" },
      { key: "transfer", label: "Transferir" },
      { key: "comprobante", label: "Comprobante" },
      { key: "done", label: "Listo" },
    ];
    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <View className="flex-row items-center justify-center px-5 py-4 gap-1">
        {steps.map((s, i) => (
          <View key={s.key} className="flex-row items-center">
            <View
              className={`h-7 w-7 items-center justify-center rounded-full ${
                i <= currentIdx ? "bg-souche-green" : "bg-souche-gray-800"
              }`}
            >
              {i < currentIdx ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text
                  className={`text-xs font-bold ${
                    i <= currentIdx ? "text-white" : "text-souche-gray-500"
                  }`}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {i < steps.length - 1 && (
              <View
                className={`h-0.5 w-6 ${
                  i < currentIdx ? "bg-souche-green" : "bg-souche-gray-800"
                }`}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-souche-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <StepIndicator />

      {/* STEP 1: Info */}
      {step === "info" && (
        <View className="px-5">
          {/* Image placeholder */}
          <View className="h-48 rounded-2xl bg-souche-gray-800 items-center justify-center mb-5">
            <Ionicons name="image-outline" size={40} color="#525252" />
            <Text className="mt-1 text-xs text-souche-gray-600">Imagen del evento</Text>
          </View>

          <Text className="text-2xl font-black text-white mb-2">
            {torneo.nombre}
          </Text>

          <View className="flex-row flex-wrap gap-3 mb-4">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={14} color="#A3A3A3" />
              <Text className="text-sm text-souche-gray-400">{torneo.fecha}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={14} color="#A3A3A3" />
              <Text className="text-sm text-souche-gray-400">{torneo.lugar}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="people-outline" size={14} color="#A3A3A3" />
              <Text className="text-sm text-souche-gray-400">
                {torneo.cuposOcupados}/{torneo.cuposMaximos} cupos
              </Text>
            </View>
          </View>

          <Text className="text-sm text-souche-gray-300 leading-5 mb-4">
            {torneo.descripcion}
          </Text>

          <View className="rounded-xl bg-souche-gray-900 border border-souche-gray-800 p-4 mb-6">
            <Text className="text-xs font-bold text-souche-gray-500 mb-1">REGLAS</Text>
            <Text className="text-sm text-souche-gray-400">{torneo.reglas}</Text>
          </View>

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-sm text-souche-gray-400">Precio de inscripción</Text>
            <Text className="text-3xl font-black text-souche-green">{torneo.precio}</Text>
          </View>

          <Pressable
            className="rounded-2xl bg-souche-green py-4 active:opacity-80"
            onPress={() => setStep("transfer")}
          >
            <Text className="text-center text-lg font-black text-white">
              Comprar entrada
            </Text>
          </Pressable>
        </View>
      )}

      {/* STEP 2: Transfer */}
      {step === "transfer" && (
        <View className="px-5">
          <Text className="text-xl font-black text-white mb-2">
            Enviá el dinero
          </Text>
          <Text className="text-sm text-souche-gray-400 mb-6">
            Realizá una transferencia por {torneo.precio} al siguiente alias:
          </Text>

          <View className="rounded-2xl border-2 border-dashed border-souche-green/40 bg-souche-green/5 p-6 items-center mb-6">
            <Text className="text-xs font-bold text-souche-gray-500 mb-2">
              ALIAS DE TRANSFERENCIA
            </Text>
            <Text className="text-2xl font-black text-souche-green tracking-wide">
              {torneo.alias}
            </Text>
            <Text className="mt-3 text-xs text-souche-gray-500">
              Monto: {torneo.precio}
            </Text>
          </View>

          <View className="rounded-xl bg-souche-gray-900 border border-souche-gray-800 p-4 mb-6">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={18} color="#F7AE00" />
              <Text className="flex-1 text-sm text-souche-gray-400 leading-5">
                Una vez que hagas la transferencia, tocá el botón de abajo. En el siguiente paso vas a subir el comprobante.
              </Text>
            </View>
          </View>

          <Pressable
            className="rounded-2xl bg-souche-green py-4 active:opacity-80"
            onPress={() => setStep("comprobante")}
          >
            <Text className="text-center text-lg font-black text-white">
              Ya lo envié
            </Text>
          </Pressable>

          <Pressable className="mt-4" onPress={() => setStep("info")}>
            <Text className="text-center text-sm text-souche-gray-500">
              ← Volver al detalle
            </Text>
          </Pressable>
        </View>
      )}

      {/* STEP 3: Upload comprobante */}
      {step === "comprobante" && (
        <View className="px-5">
          <Text className="text-xl font-black text-white mb-2">
            Subí el comprobante
          </Text>
          <Text className="text-sm text-souche-gray-400 mb-6">
            Es obligatorio subir el comprobante para que el negocio confirme tu pago.
          </Text>

          {comprobanteUri ? (
            <View className="rounded-2xl border border-souche-green/30 bg-souche-green/5 p-5 items-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#15783D" />
              <Text className="mt-2 text-sm font-bold text-souche-green">
                Comprobante cargado
              </Text>
              <Pressable
                className="mt-3"
                onPress={() => setComprobanteUri(null)}
              >
                <Text className="text-xs text-souche-gray-500 underline">
                  Cambiar imagen
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3 mb-4">
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-souche-gray-700 bg-souche-gray-900 py-5 active:opacity-80"
                onPress={pickImage}
              >
                <Ionicons name="image-outline" size={22} color="#A3A3A3" />
                <Text className="text-base font-bold text-white">
                  Subir desde galería
                </Text>
              </Pressable>

              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-souche-gray-700 bg-souche-gray-900 py-5 active:opacity-80"
                onPress={pasteFromClipboard}
              >
                <Ionicons name="clipboard-outline" size={22} color="#A3A3A3" />
                <Text className="text-base font-bold text-white">
                  Pegar desde portapapeles
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            className={`rounded-2xl py-4 active:opacity-80 ${
              comprobanteUri ? "bg-souche-green" : "bg-souche-gray-700"
            }`}
            onPress={handleSubmit}
            disabled={loading || !comprobanteUri}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-center text-lg font-black text-white">
                Enviar comprobante
              </Text>
            )}
          </Pressable>

          <Pressable className="mt-4" onPress={() => setStep("transfer")}>
            <Text className="text-center text-sm text-souche-gray-500">
              ← Volver
            </Text>
          </Pressable>
        </View>
      )}

      {/* STEP 4: Done */}
      {step === "done" && (
        <View className="px-5 items-center pt-10">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-souche-green/10 mb-5">
            <Ionicons name="checkmark-circle" size={56} color="#15783D" />
          </View>
          <Text className="text-2xl font-black text-white text-center mb-2">
            ¡Listo!
          </Text>
          <Text className="text-base text-souche-gray-400 text-center mb-8 px-4">
            Te avisaremos cuando el negocio confirme tu pago y recibirás tu entrada con código QR.
          </Text>

          <Pressable
            className="w-full rounded-2xl bg-souche-green py-4 active:opacity-80 mb-3"
            onPress={() => router.push("/(user)/entradas/mis-entradas")}
          >
            <Text className="text-center text-lg font-black text-white">
              Ver mis entradas
            </Text>
          </Pressable>

          <Pressable
            className="w-full rounded-2xl border border-souche-gray-700 py-4 active:opacity-80"
            onPress={() => router.back()}
          >
            <Text className="text-center text-base font-bold text-souche-gray-400">
              Volver a eventos
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
