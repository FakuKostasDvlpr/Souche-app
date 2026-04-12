import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedView, AnimatedPressable, fadeDown, useScalePress } from "@/lib/animations";
import { IconBurger, IconFire } from "@/components/icons";
import { LongPressCard } from "@/components/ui/long-press-card";

const MOCK_MENU = [
  {
    id: "1",
    titulo: "Souche Classic",
    descripcion: "Doble smash patty, cheddar fundido, lechuga, tomate, cebolla caramelizada y salsa Souche.",
    precio: "$4.500",
    categoria: "Burgers",
    badge: "POPULAR",
    disponible: true,
  },
  {
    id: "2",
    titulo: "BBQ Monster",
    descripcion: "Triple smash, bacon crocante, aros de cebolla, cheddar y salsa BBQ ahumada.",
    precio: "$5.800",
    categoria: "Burgers",
    badge: "NUEVO",
    disponible: true,
  },
  {
    id: "3",
    titulo: "Green Souche",
    descripcion: "Burger de garbanzo y espinaca, rúcula, tomate seco, queso de cabra y pesto.",
    precio: "$4.200",
    categoria: "Veggie",
    badge: null,
    disponible: true,
  },
  {
    id: "4",
    titulo: "Papas Souche",
    descripcion: "Papas rústicas con cheddar, bacon bits y salsa Souche.",
    precio: "$2.500",
    categoria: "Sides",
    badge: null,
    disponible: true,
  },
  {
    id: "5",
    titulo: "Chicken Smash",
    descripcion: "Pechuga crispy, coleslaw, pickles, american cheese y mayo de chipotle.",
    precio: "$4.800",
    categoria: "Burgers",
    badge: null,
    disponible: false,
  },
];

const CATEGORIAS = ["Todas", "Burgers", "Veggie", "Sides"];

function PressCard({ children, onPress, className: cn = "" }: { children: React.ReactNode; onPress?: () => void; className?: string }) {
  const { animStyle, onPressIn, onPressOut } = useScalePress();
  return (
    <AnimatedPressable style={animStyle} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} className={cn}>
      {children}
    </AnimatedPressable>
  );
}

export default function MenuScreen() {
  return (
    <ScrollView
      className="flex-1 bg-souche-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <AnimatedView entering={fadeDown(0)} className="px-5 pt-3 pb-2">
        <Text className="text-sm text-neutral-500">
          Hamburguesas artesanales y acompañamientos.
        </Text>
      </AnimatedView>

      {/* Category pills */}
      <AnimatedView entering={fadeDown(80)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORIAS.map((cat, i) => (
            <PressCard
              key={cat}
              className={`rounded-full px-4 py-2.5 ${
                i === 0
                  ? "bg-souche-green"
                  : "border border-neutral-700 bg-neutral-900"
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  i === 0 ? "text-white" : "text-neutral-400"
                }`}
              >
                {cat}
              </Text>
            </PressCard>
          ))}
        </ScrollView>
      </AnimatedView>

      {/* Menu items — Long press for detail */}
      {MOCK_MENU.map((item, idx) => (
        <AnimatedView
          key={item.id}
          entering={fadeDown(160 + idx * 80)}
        >
          <LongPressCard
            className={`mx-5 mb-3 rounded-2xl border bg-neutral-900 overflow-hidden ${
              item.disponible ? "border-neutral-800" : "border-neutral-800 opacity-50"
            }`}
            onPress={() => {
              if (!item.disponible) return;
              Alert.alert(item.titulo, item.descripcion);
            }}
            onLongPress={() => {
              Alert.alert(
                `🍔 ${item.titulo}`,
                `${item.descripcion}\n\nPrecio: ${item.precio}\nCategoría: ${item.categoria}${
                  !item.disponible ? "\n\n⚠️ No disponible actualmente" : ""
                }`,
                [{ text: "Cerrar" }]
              );
            }}
            minDuration={400}
          >
            {/* Photo placeholder */}
            <View className="h-40 bg-neutral-800 items-center justify-center">
              <IconBurger size={32} color="#404040" />
            </View>

            <View className="p-4">
              {/* Header row */}
              <View className="flex-row items-start justify-between mb-1">
                <View className="flex-1 flex-row items-center gap-2">
                  <Text className="text-lg font-black text-white">
                    {item.titulo}
                  </Text>
                  {item.badge && (
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        item.badge === "NUEVO"
                          ? "bg-souche-green/20"
                          : "bg-souche-gold/20"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          item.badge === "NUEVO"
                            ? "text-souche-green"
                            : "text-souche-gold"
                        }`}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-lg font-black text-souche-green">
                  {item.precio}
                </Text>
              </View>

              <Text className="text-sm text-souche-gray-400 leading-5">
                {item.descripcion}
              </Text>

              {!item.disponible && (
                <View className="mt-2 self-start rounded-full bg-red-500/10 px-3 py-1">
                  <Text className="text-xs font-bold text-red-400">
                    NO DISPONIBLE
                  </Text>
                </View>
              )}

              <View className="mt-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <View className="rounded-full bg-neutral-800 px-2.5 py-1">
                    <Text className="text-xs font-semibold text-neutral-400">
                      {item.categoria}
                    </Text>
                  </View>
                </View>
                <Text className="text-[10px] text-neutral-600">Mantené para más info</Text>
              </View>
            </View>
          </LongPressCard>
        </AnimatedView>
      ))}
    </ScrollView>
  );
}
