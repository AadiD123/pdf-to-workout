import { supabase } from "@/lib/supabaseClient";
import { CompletedExercise, WorkoutSession } from "@/types/workout";

export interface ExerciseStats {
  name: string;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  totalDuration: number;
  lastPerformed: string;
}

const buildSessionStats = (session: WorkoutSession) => {
  const statsMap = new Map<string, ExerciseStats>();

  session.completedExercises.forEach((exercise: CompletedExercise) => {
    const existing = statsMap.get(exercise.name);
    const base: ExerciseStats = existing ?? {
      name: exercise.name,
      totalSets: 0,
      totalReps: 0,
      totalVolume: 0,
      totalDuration: 0,
      lastPerformed: session.date,
    };

    const updated = { ...base };
    updated.lastPerformed = session.date;
    updated.totalSets += exercise.sets.length;

    exercise.sets.forEach((set) => {
      if (set.duration && set.duration > 0) {
        updated.totalDuration += set.duration;
      } else {
        const reps = set.reps ?? 0;
        updated.totalReps += reps;
        const weight = set.weight ?? 0;
        updated.totalVolume += reps * weight;
      }
    });

    statsMap.set(exercise.name, updated);
  });

  return statsMap;
};

const coerceStats = (stats: any, name: string, date: string): ExerciseStats => ({
  name,
  totalSets: Number(stats?.totalSets ?? 0),
  totalReps: Number(stats?.totalReps ?? 0),
  totalVolume: Number(stats?.totalVolume ?? 0),
  totalDuration: Number(stats?.totalDuration ?? 0),
  lastPerformed: stats?.lastPerformed ?? date,
});

export async function upsertExerciseStatsForSession(
  userId: string,
  session: WorkoutSession
) {
  const sessionStats = buildSessionStats(session);
  const exerciseNames = Array.from(sessionStats.keys());
  if (exerciseNames.length === 0) return;

  const { data: existing, error } = await supabase
    .from("exercise_stats")
    .select("exercise_name, stats")
    .eq("user_id", userId)
    .in("exercise_name", exerciseNames);

  if (error) {
    console.error("Failed to fetch exercise stats:", error);
    return;
  }

  const existingMap = new Map<string, ExerciseStats>();
  (existing ?? []).forEach((row: any) => {
    existingMap.set(
      row.exercise_name,
      coerceStats(row.stats, row.exercise_name, session.date)
    );
  });

  const updates = exerciseNames.map((name) => {
    const current = existingMap.get(name) ?? {
      name,
      totalSets: 0,
      totalReps: 0,
      totalVolume: 0,
      totalDuration: 0,
      lastPerformed: session.date,
    };
    const delta = sessionStats.get(name)!;
    const next: ExerciseStats = {
      name,
      totalSets: current.totalSets + delta.totalSets,
      totalReps: current.totalReps + delta.totalReps,
      totalVolume: current.totalVolume + delta.totalVolume,
      totalDuration: current.totalDuration + delta.totalDuration,
      lastPerformed: delta.lastPerformed,
    };
    return {
      user_id: userId,
      exercise_name: name,
      stats: next,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from("exercise_stats")
    .upsert(updates, { onConflict: "user_id,exercise_name" });

  if (upsertError) {
    console.error("Failed to update exercise stats:", upsertError);
  }
}

