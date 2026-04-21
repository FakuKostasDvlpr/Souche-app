import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore, type UserProfile } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { VT323_400Regular } from "@expo-google-fonts/vt323";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { ToastProvider } from "@/components/ui/Toast";
import { AppSplash } from "@/components/ui/AppSplash";
import { updateExpoPushToken } from "@/lib/firestore";
import { AchievementProvider } from "@/contexts/AchievementContext";
import { AchievementOverlay } from "@/components/ui/achievement/AchievementOverlay";
import { useGanadorListener } from "@/hooks/useGanadorListener";

SplashScreen.preventAutoHideAsync();

// expo-notifications requires a development build (not available in Expo Go).
// We load it dynamically so the app doesn't crash in Expo Go.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  Notifications = require("expo-notifications");
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === "android") {
    Notifications!.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications!.AndroidImportance.MAX,
    });
  }
} catch {
  // Running in Expo Go — push notifications not supported
}

const registeredTokenUids = new Set<string>();

async function registerPushToken(uid: string) {
  if (!Notifications || registeredTokenUids.has(uid)) return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    if (token?.data) {
      await updateExpoPushToken(uid, token.data);
      registeredTokenUids.add(uid);
    }
  } catch (e) {
    console.warn("registerPushToken failed:", e);
  }
}

// Set to true to skip Firebase auth and go straight to Home (for UI development)
const DEV_SKIP_AUTH = false;

const SPLASH_MIN_MS = 1000;

function GanadorListenerMount() {
  const uid = useAuthStore((s) => s.profile?.uid);
  useGanadorListener(uid ?? null);
  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, profile, isLoading, setFirebaseUser, setProfile, setLoading } =
    useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    VT323_400Regular,
  });
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
        foto: null,
        genero: "hombre",
        rol: "superadmin",
        puntos: 500,
        ganador: false,
        torneoGanado: null,
        emailVerified: true,
        fcmToken: null,
        expoPushToken: null,
        loginMethod: null,
        ip: null,
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
        <AchievementProvider OverlayComponent={AchievementOverlay}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
          <Slot />
          <ToastProvider />
          <GanadorListenerMount />
        </AchievementProvider>
      )}
      {!splashHidden && (
        <AppSplash isReady={splashReady} onHidden={() => setSplashHidden(true)} />
      )}
    </GestureHandlerRootView>
  );
}
