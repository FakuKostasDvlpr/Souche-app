import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore, type UserProfile } from "@/store/useAuthStore";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Set to true to skip Firebase auth and go straight to Home (for UI development)
const DEV_SKIP_AUTH = true;

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, profile, isLoading, setFirebaseUser, setProfile, setLoading } =
    useAuthStore();

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setProfile({
        uid: "dev-user",
        nombre: "Dev",
        apellido: "User",
        email: "dev@souche.com",
        genero: "hombre",
        rol: "superadmin",
        puntos: 500,
        ganador: false,
        torneoGanado: null,
        emailVerified: true,
        fcmToken: null,
        creadoEn: null,
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inUserGroup = segments[0] === "(user)";

    if (DEV_SKIP_AUTH) {
      // In dev mode: profile null = logged out, go to auth
      if (!profile && !inAuthGroup) {
        router.replace("/(auth)");
      } else if (profile && !inUserGroup) {
        router.replace("/(user)/home");
      }
      return;
    }

    if (!firebaseUser && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (firebaseUser && !firebaseUser.emailVerified && !inAuthGroup) {
      router.replace("/(auth)/verify-email");
    } else if (firebaseUser && firebaseUser.emailVerified && inAuthGroup) {
      router.replace("/(user)/home");
    }
  }, [firebaseUser, profile, isLoading, segments]);

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center bg-souche-black">
          <ActivityIndicator size="large" color="#15783D" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Slot />
    </GestureHandlerRootView>
  );
}
