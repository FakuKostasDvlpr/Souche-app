import { create } from "zustand";
import type { User } from "firebase/auth";

export type UserRole = "usuario" | "superadmin";

export interface UserProfile {
  uid: string;
  nombre: string;
  apellido: string;
  email: string;
  foto: string | null;
  genero: "hombre" | "mujer" | "no_especificado";
  rol: UserRole;
  puntos: number;
  ganador: boolean;
  torneoGanado: string | null;
  emailVerified: boolean;
  fcmToken: string | null;
  expoPushToken: string | null;
  loginMethod: "email" | "google" | "apple" | null;
  ip: string | null;
  creadoEn: Date | null;
}

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  isLoading: true,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ firebaseUser: null, profile: null, isLoading: false }),
}));
