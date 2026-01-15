import { useCallback, useEffect, useMemo, useState } from "react";
import { EXERCISE_NAMES } from "@/lib/exerciseCatalog";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export function useExerciseCatalog() {
  const { user } = useAuth();
  const [customExercises, setCustomExercises] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCustomExercises([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_exercises")
      .select("name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load user exercises:", error);
      setCustomExercises([]);
      setIsLoading(false);
      return;
    }
    setCustomExercises((data ?? []).map((row) => row.name));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCustomExercise = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || !user) return;
      if (customExercises.some((exercise) => exercise.toLowerCase() === trimmed.toLowerCase())) {
        return;
      }
      const { error } = await supabase
        .from("user_exercises")
        .insert({ user_id: user.id, name: trimmed });
      if (error) {
        console.error("Failed to save custom exercise:", error);
        return;
      }
      setCustomExercises((prev) => [...prev, trimmed]);
    },
    [customExercises, user]
  );

  const exerciseNames = useMemo(() => {
    const combined = [...EXERCISE_NAMES, ...customExercises];
    return Array.from(new Set(combined)).sort((a, b) => a.localeCompare(b));
  }, [customExercises]);

  const isCatalogExercise = useCallback(
    (name: string) =>
      EXERCISE_NAMES.some(
        (exercise) => exercise.toLowerCase() === name.trim().toLowerCase()
      ),
    []
  );

  return {
    exerciseNames,
    customExercises,
    isLoading,
    refresh,
    addCustomExercise,
    isCatalogExercise,
  };
}

