"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import {
  BARBELL_WEIGHT,
  PlateConfiguration,
  STANDARD_PLATES,
  setBarbellWeightCache,
  setPlateConfigurationCache,
} from "@/lib/plateCalculator";

export interface UserSettings {
  plateConfiguration: PlateConfiguration[];
  barbellWeight: number;
}

interface UserSettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  plateConfiguration: STANDARD_PLATES.map((weight) => ({
    weight,
    available: 10,
  })),
  barbellWeight: BARBELL_WEIGHT,
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function useUserSettings(): UserSettingsContextValue {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return context;
}

export default function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const applySettings = (next: UserSettings) => {
    setSettings(next);
    setPlateConfigurationCache(next.plateConfiguration);
    setBarbellWeightCache(next.barbellWeight);
  };

  const refreshSettings = async () => {
    if (!user) {
      applySettings(defaultSettings);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_settings")
      .select("plate_configuration, barbell_weight")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load user settings:", error);
      applySettings(defaultSettings);
      setIsLoading(false);
      return;
    }

    const next: UserSettings = {
      plateConfiguration:
        (data?.plate_configuration as PlateConfiguration[]) ??
        defaultSettings.plateConfiguration,
      barbellWeight: data?.barbell_weight ?? defaultSettings.barbellWeight,
    };

    if (!data) {
      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          plate_configuration: next.plateConfiguration,
          barbell_weight: next.barbellWeight,
        },
        { onConflict: "user_id" }
      );
    }

    applySettings(next);
    setIsLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    void refreshSettings();
  }, [authLoading, user]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const next: UserSettings = {
      ...settings,
      ...updates,
    };
    applySettings(next);
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        plate_configuration: next.plateConfiguration,
        barbell_weight: next.barbellWeight,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Failed to save user settings:", error);
    }
  };

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      updateSettings,
      refreshSettings,
    }),
    [isLoading, settings]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

