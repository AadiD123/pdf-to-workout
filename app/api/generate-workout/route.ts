import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabaseAuth";
import { generateWorkoutFromGoal, matchExercisesToCatalog } from "@/lib/gemini";
import { WorkoutDay, WorkoutPlan, Exercise } from "@/types/workout";
import { EXERCISE_NAMES } from "@/lib/exerciseCatalog";
import { findCatalogMatch } from "@/lib/exerciseMatch";
import { normalizeExerciseFields } from "@/lib/normalizeExercise";

const MAX_PROMPT_CHARS = 200;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSupabaseUser(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const prompt = String(body?.prompt ?? "").trim();
    const daysPerWeek = Number(body?.daysPerWeek ?? 0);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Prompt must be under ${MAX_PROMPT_CHARS} characters` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
      return NextResponse.json(
        { error: "daysPerWeek must be between 1 and 7" },
        { status: 400 }
      );
    }

    const generated = await generateWorkoutFromGoal(prompt, daysPerWeek);

    const exerciseNames = new Set<string>();
    generated.days?.forEach((day: any) => {
      (day.exercises ?? []).forEach((exercise: any) => {
        if (exercise?.name) {
          exerciseNames.add(String(exercise.name));
        }
      });
    });

    const nameMap = new Map<string, string>();
    const unknownNames: string[] = [];
    exerciseNames.forEach((name) => {
      const match = findCatalogMatch(name);
      if (match) {
        nameMap.set(name, match);
      } else {
        unknownNames.push(name);
      }
    });

    if (unknownNames.length > 0) {
      try {
        const matchResult = await matchExercisesToCatalog(
          unknownNames,
          EXERCISE_NAMES
        );
        matchResult.matches.forEach((entry) => {
          if (entry.match) {
            nameMap.set(entry.input, entry.match);
          }
        });
      } catch (error) {
        console.error("Failed to match generated exercises:", error);
      }
    }

    const applyNameMatch = (name: string) => nameMap.get(name) ?? name;

    const timestamp = Date.now();
    const workoutPlan: WorkoutPlan = {
      id: `workout-${timestamp}`,
      name: generated.name || "My Workout Plan",
      uploadedAt: new Date().toISOString(),
      days: (generated.days || []).map((day: any, dayIndex: number): WorkoutDay => ({
        id: `day-${timestamp}-${dayIndex}`,
        name: day.name || `Day ${dayIndex + 1}`,
        isRestDay: day.isRestDay || false,
        exercises: (day.exercises || []).map((ex: any, exIndex: number): Exercise => {
          const normalized = normalizeExerciseFields({
            weight: ex.weight,
            targetNotes: ex.notes || "",
          });
          return {
            id: `exercise-${timestamp}-${dayIndex}-${exIndex}`,
            name: applyNameMatch(String(ex.name ?? "")),
            type: ex.type || "reps",
            sets: ex.sets || 3,
            reps: ex.reps || "10",
            weight: normalized.weight,
            restTime: ex.restTime,
            targetNotes: normalized.targetNotes || "",
            notes: "",
            completed: false,
            completedSets: [],
          };
        }),
      })),
      sessions: [],
    };

    return NextResponse.json(workoutPlan);
  } catch (error) {
    console.error("Error generating workout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate plan" },
      { status: 500 }
    );
  }
}

