import { useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { sendEmailVerification } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { firebaseUser, setProfile, profile } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerification = async () => {
    if (!firebaseUser) return;
    setChecking(true);

    try {
      await firebaseUser.reload();

      if (firebaseUser.emailVerified) {
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          emailVerified: true,
        });

        if (profile) {
          setProfile({ ...profile, emailVerified: true });
        }

        router.replace("/(user)/home");
      } else {
        Alert.alert(
          "Todavía no",
          "Tu email aún no fue verificado. Revisá tu bandeja de entrada y hacé click en 'Activar cuenta'."
        );
      }
    } catch {
      Alert.alert("Error", "No se pudo verificar. Intentá de nuevo.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!firebaseUser) return;
    setResending(true);

    try {
      await sendEmailVerification(firebaseUser);
      Alert.alert("Enviado", "Te reenviamos el email de verificación.");
    } catch {
      Alert.alert("Error", "No se pudo reenviar. Intentá en unos minutos.");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-souche-black">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-4 text-5xl">📧</Text>

        <Text className="mb-2 text-center text-2xl font-black text-white">
          Verificá tu email
        </Text>

        <Text className="mb-2 text-center text-base text-souche-gray-400">
          Te enviamos un correo a:
        </Text>

        <Text className="mb-8 text-center text-lg font-bold text-souche-green">
          {firebaseUser?.email ?? "—"}
        </Text>

        <Text className="mb-10 text-center text-sm text-souche-gray-500 leading-6">
          Hacé click en el botón{" "}
          <Text className="font-bold text-white">"Activar cuenta"</Text> que
          encontrás en ese email para completar tu registro.
        </Text>

        <Pressable
          className="mb-4 w-full rounded-xl bg-souche-green px-6 py-4 active:opacity-80"
          onPress={handleCheckVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center text-lg font-bold text-white">
              Ya lo activé
            </Text>
          )}
        </Pressable>

        <Pressable
          className="w-full rounded-xl border border-souche-gray-700 px-6 py-4 active:opacity-80"
          onPress={handleResend}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#15783D" />
          ) : (
            <Text className="text-center text-base font-bold text-souche-gray-300">
              Reenviar email
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
