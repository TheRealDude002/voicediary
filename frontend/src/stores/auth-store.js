// VoiceDiary auth store — mirrors src/stores/auth-store.ts.
// Holds current user + access token (persisted to AsyncStorage so the
// app rehydrates across launches without losing the session).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, setAccessToken } from "@/lib/api-client";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true, // bootstrapping session
      isAuthing: false, // submitting login/register
      error: null,

      bootstrap: async () => {
        // The persisted store already rehydrated accessToken into memory
        // (and AsyncStorage via the api-client). Try to fetch the user.
        const token = get().accessToken;
        if (!token) {
          await setAccessToken(null);
          set({ isLoading: false });
          return;
        }
        await setAccessToken(token);
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: !!user, isLoading: false });
        } catch {
          await setAccessToken(null);
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      login: async (email, password) => {
        set({ isAuthing: true, error: null });
        try {
          const { user, accessToken } = await authApi.login({ email, password });
          await setAccessToken(accessToken);
          set({ user, accessToken, isAuthenticated: true, isAuthing: false });
        } catch (err) {
          set({
            isAuthing: false,
            error: err instanceof Error ? err.message : "Login failed",
          });
          throw err;
        }
      },

      register: async (data) => {
        set({ isAuthing: true, error: null });
        try {
          const { user, accessToken } = await authApi.register(data);
          await setAccessToken(accessToken);
          set({ user, accessToken, isAuthenticated: true, isAuthing: false });
        } catch (err) {
          set({
            isAuthing: false,
            error: err instanceof Error ? err.message : "Registration failed",
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore network errors on logout
        }
        await setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),
    }),
    {
      name: "vd-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
    }
  )
);
