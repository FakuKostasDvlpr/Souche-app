import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore, type UserProfile } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { ToastProvider } from "@/components/ui/Toast";
import { AppSplash } from "@/components/ui/AppSplash";
import { updateExpoPushToken } from "@/lib/firestore";

SplashScreen.preventAutoHideAsync();

async function registerPushToken(uid: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = await Notifications.getExpoPushTokenAsync();
  if (token?.data) {
    await updateExpoPushToken(uid, token.data);
  }
}

// Set to true to skip Firebase auth and go straight to Home (for UI development)
const DEV_SKIP_AUTH = false;

const SPLASH_MIN_MS = 1000;

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, profile, isLoading, setFirebaseUser, setProfile, setLoading } =
    useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  const [fontsLoaded] = useFonts({ BebasNeue: BebasNeue_400Regular });
  const mountTimeRef = useRef(Date.now());
  const [splashReady, setSplashReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

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

    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("🔐 onAuthStateChanged:", user ? `user ${user.uid}` : "no user");
      setFirebaseUser(user);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        // Reactive listener: updates as soon as ensureFirestoreUser creates/patches the doc.
        unsubProfile = onSnapshot(
          doc(db, "users", user.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
              console.log("✅ Profile synced:", snap.data().nombre);
              registerPushToken(user.uid);
            }
            setLoading(false);
          },
          (err) => {
            console.error("❌ Profile listener error:", err);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inUserGroup = segments[0] === "(user)";
    console.log("🧭 Routing check:", { firebaseUser: !!firebaseUser, inAuthGroup, inUserGroup, segments });

    if (DEV_SKIP_AUTH) {
      if (!profile && !inAuthGroup) {
        router.replace("/(auth)");
      } else if (profile && !inUserGroup) {
        router.replace("/(user)/home");
      }
      return;
    }

    if (!firebaseUser && !inAuthGroup) {
      console.log("🔀 Redirecting to auth (no user)");
      router.replace("/(auth)");
    } else if (firebaseUser && inAuthGroup) {
      console.log("🔀 Redirecting to home (user logged in)");
      router.replace("/(user)/home");
    }
  }, [firebaseUser, profile, isLoading, segments]);

  // Enforce minimum 1s splash, then trigger exit animation
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    SplashScreen.hideAsync();
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    const timer = setTimeout(() => setSplashReady(true), remaining);
    return () => clearTimeout(timer);
  }, [fontsLoaded, isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#020805" }}>
      {/* Render app content underneath so it's ready when splash exits */}
      {splashReady && (
        <>
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
          <Slot />
          <ToastProvider />
        </>
      )}
      {!splashHidden && (
        <AppSplash isReady={splashReady} onHidden={() => setSplashHidden(true)} />
      )}
    </GestureHandlerRootView>
  );
}
