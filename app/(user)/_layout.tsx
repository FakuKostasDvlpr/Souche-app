import { Tabs } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { SoucheTabBar } from "@/components/ui/TabBar";

const HEADER = {
  headerStyle: { backgroundColor: "#0A0A0A", borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 17, letterSpacing: 0.3 },
  headerShadowVisible: false,
};

export default function UserLayout() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <Tabs
      tabBar={(props) => <SoucheTabBar {...props} />}
      screenOptions={{
        ...HEADER,
        tabBarStyle: { display: "none" },
        animation: "shift",
      }}
    >
      <Tabs.Screen name="home" options={{ headerShown: false, title: "Inicio" }} />
      <Tabs.Screen name="menu" options={{ title: "Nuestro Menú" }} />
      <Tabs.Screen name="eventos" options={{ title: "Eventos" }} />
      <Tabs.Screen name="juego" options={{ headerShown: false, title: "Juego" }} />
      <Tabs.Screen name="config" options={{ headerShown: false, title: "Config" }} />

      <Tabs.Screen name="perfil" options={{ href: null, ...HEADER, title: "Mi Perfil" }} />
      <Tabs.Screen name="puntos" options={{ href: null, ...HEADER, title: "Mis Puntos" }} />
      <Tabs.Screen name="entradas/index" options={{ href: null }} />
      <Tabs.Screen name="entradas/[id]" options={{ href: null, ...HEADER, title: "Detalle" }} />
      <Tabs.Screen name="entradas/mis-entradas" options={{ href: null, ...HEADER, title: "Mis Entradas" }} />
      <Tabs.Screen name="admin/comprobantes" options={{ href: null, ...HEADER, title: "Comprobantes" }} />
      <Tabs.Screen name="admin/alta-entradas" options={{ href: null, ...HEADER, title: "Gestionar Eventos" }} />
      <Tabs.Screen name="admin/usuarios" options={{ href: null, ...HEADER, title: "Usuarios" }} />
      <Tabs.Screen name="admin/ganadores" options={{ href: null, ...HEADER, title: "Ganadores" }} />
      <Tabs.Screen name="admin/crm-menu" options={{ href: null, ...HEADER, title: "CRM Menú" }} />
    </Tabs>
  );
}
