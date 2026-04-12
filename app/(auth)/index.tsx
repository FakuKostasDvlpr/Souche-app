import { View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedView, fadeDown, fadeUp, zoomIn } from "@/lib/animations";
import { IconSoucheLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function HeroScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo */}
        <AnimatedView entering={zoomIn(100)}>
          <IconSoucheLogo size={88} />
        </AnimatedView>

        <AnimatedView entering={fadeDown(250)} className="mt-6 mb-2">
          <Text variant="h1" className="text-foreground">
            Souche
          </Text>
        </AnimatedView>
        <AnimatedView entering={fadeDown(350)} className="mb-14">
          <Text variant="muted" className="text-center leading-6">
            La experiencia Souche{"\n"}en la palma de tu mano.
          </Text>
        </AnimatedView>

        <AnimatedView entering={fadeUp(500)} className="w-full gap-3">
          <Button
            size="lg"
            className="w-full rounded-xl"
            onPress={() => router.push("/(auth)/login")}
          >
            <Text className="text-lg font-bold text-primary-foreground">
              Iniciar sesión
            </Text>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onPress={() => router.push("/(auth)/register")}
          >
            <Text className="text-lg font-bold text-foreground">
              Registrarse
            </Text>
          </Button>
        </AnimatedView>

        <AnimatedView entering={fadeUp(650)} className="mt-8">
          <Text variant="muted" className="text-center">
            ¿Problemas para ingresar?{"\n"}
            <Text className="text-primary font-semibold">Contactar soporte</Text>
          </Text>
        </AnimatedView>
      </View>
    </SafeAreaView>
  );
}
