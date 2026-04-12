import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedView, AnimatedPressable, fadeDown, fadeUp, useScalePress } from "@/lib/animations";

type Gender = "hombre" | "mujer" | "no_especificado";

export default function RegisterScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [genero, setGenero] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const apellidoRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!nombre.trim()) return "Ingresá tu nombre.";
    if (!apellido.trim()) return "Ingresá tu apellido.";
    if (!email.trim() || !email.includes("@")) return "Ingresá un email válido.";
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    if (!genero) return "Seleccioná tu género.";
    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Error", error);
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        genero,
        rol: "usuario",
        puntos: 0,
        ganador: false,
        torneoGanado: null,
        emailVerified: false,
        fcmToken: null,
        creadoEn: serverTimestamp(),
      });

      await sendEmailVerification(user);

      router.replace("/(auth)/verify-email");
    } catch (err: any) {
      const message =
        err.code === "auth/email-already-in-use"
          ? "Este email ya está registrado."
          : err.code === "auth/weak-password"
          ? "La contraseña es muy débil."
          : "Error al crear la cuenta.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const GenderOption = ({ label, value }: { label: string; value: Gender }) => (
    <Pressable
      className={`flex-1 rounded-xl border px-4 py-3 ${
        genero === value
          ? "border-souche-green bg-souche-green/10"
          : "border-souche-gray-700 bg-souche-gray-900"
      }`}
      onPress={() => setGenero(value)}
    >
      <Text
        className={`text-center text-sm font-bold ${
          genero === value ? "text-souche-green" : "text-souche-gray-400"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-souche-black">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 48 }}
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
            Crear cuenta
          </Text>
          <Text className="mb-8 text-base text-neutral-500">
            Registrate para acceder a torneos, menú y premios.
          </Text>
        </AnimatedView>

        <AnimatedView entering={fadeDown(160)}>
        <Text className="mb-2 text-sm font-bold text-neutral-400">Nombre</Text>
        <TextInput
          className="mb-4 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
          placeholder="Juan"
          placeholderTextColor="#525252"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => apellidoRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text className="mb-2 text-sm font-bold text-neutral-400">Apellido</Text>
        <TextInput
          className="mb-4 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
          placeholder="García"
          placeholderTextColor="#525252"
          value={apellido}
          onChangeText={setApellido}
          autoCapitalize="words"
          ref={apellidoRef}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          blurOnSubmit={false}
        />

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
          ref={emailRef}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text className="mb-2 text-sm font-bold text-neutral-400">Contraseña</Text>
        <TextInput
          className="mb-4 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#525252"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          ref={passwordRef}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text className="mb-2 text-sm font-bold text-neutral-400">Repetir contraseña</Text>
        <TextInput
          className="mb-6 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-base text-white"
          placeholder="Repetí la contraseña"
          placeholderTextColor="#525252"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          ref={confirmRef}
          returnKeyType="done"
        />

        <Text className="mb-3 text-sm font-bold text-neutral-400">Género</Text>
        <View className="mb-8 flex-row gap-3">
          <GenderOption label="Hombre" value="hombre" />
          <GenderOption label="Mujer" value="mujer" />
          <GenderOption label="—" value="no_especificado" />
        </View>
        </AnimatedView>

        <AnimatedView entering={fadeUp(300)}>
          <AnimatedPressable
            className="overflow-hidden rounded-2xl"
            onPress={handleRegister}
            disabled={loading}
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
                  Crear cuenta
                </Text>
              )}
            </LinearGradient>
          </AnimatedPressable>

          <AnimatedPressable className="mb-12 mt-5" onPress={() => router.push("/(auth)/login")}>
            <Text className="text-center text-sm text-neutral-500">
              ¿Ya tenés cuenta?{" "}
              <Text className="font-bold text-souche-green">Iniciar sesión</Text>
            </Text>
          </AnimatedPressable>
        </AnimatedView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
