import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedView, AnimatedPressable, fadeDown, fadeUp, useScalePress } from "@/lib/animations";
import { IconSoucheLogo } from "@/components/icons";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Completá todos los campos.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const message =
        err.code === "auth/invalid-credential"
          ? "Email o contraseña incorrectos."
          : err.code === "auth/too-many-requests"
          ? "Demasiados intentos. Intentá más tarde."
          : "Error al iniciar sesión.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const { animStyle, onPressIn, onPressOut } = useScalePress(0.97);

  return (
    <SafeAreaView className="flex-1 bg-souche-black">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 48 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={40}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedView entering={fadeDown(0)}>
          <AnimatedPressable onPress={() => router.back()} className="mb-8">
            <Text className="text-souche-green text-base font-semibold">← Volver</Text>
          </AnimatedPressable>
        </AnimatedView>

        <AnimatedView entering={fadeDown(80)}>
          <Text className="mb-2 text-3xl font-black text-white tracking-tight">
            Iniciar sesión
          </Text>
          <Text className="mb-8 text-base text-neutral-500">
            Ingresá con tu cuenta Souche.
          </Text>
        </AnimatedView>

        <AnimatedView entering={fadeDown(160)}>
          <Text className="mb-2 text-sm font-bold text-neutral-400">Email</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
            placeholder="tu@email.com"
            placeholderTextColor="#525252"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
        </AnimatedView>

        <AnimatedView entering={fadeDown(240)}>
          <Text className="mb-2 text-sm font-bold text-neutral-400">Contraseña</Text>
          <TextInput
            ref={passwordRef}
            className="mb-8 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
            placeholder="Tu contraseña"
            placeholderTextColor="#525252"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </AnimatedView>

        <AnimatedView entering={fadeUp(350)}>
          <AnimatedPressable
            style={animStyle}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handleLogin}
            disabled={loading}
            className="overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={["#15783D", "#1a9a4e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, borderRadius: 16 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-lg font-black text-white">
                  Entrar
                </Text>
              )}
            </LinearGradient>
          </AnimatedPressable>

          <AnimatedPressable className="mt-6 mb-12" onPress={() => router.push("/(auth)/register")}>
            <Text className="text-center text-sm text-neutral-500">
              ¿No tenés cuenta?{" "}
              <Text className="font-bold text-souche-green">Registrarse</Text>
            </Text>
          </AnimatedPressable>
        </AnimatedView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
