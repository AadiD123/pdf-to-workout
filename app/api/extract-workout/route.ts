import { NextRequest, NextResponse } from 'next/server';
import { extractWorkoutFromImage, extractWorkoutFromText, matchExercisesToCatalog } from '@/lib/gemini';
import { requireSupabaseUser } from '@/lib/supabaseAuth';
import { WorkoutPlan, WorkoutDay, Exercise } from '@/types/workout';
import { EXERCISE_NAMES } from '@/lib/exerciseCatalog';
import { findCatalogMatch } from '@/lib/exerciseMatch';
import { normalizeExerciseFields } from '@/lib/normalizeExercise';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSupabaseUser(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const text = formData.get('text') as string | null;

    let extractedData: any;

    if (text) {
      // Handle text input
      extractedData = await extractWorkoutFromText(text);
    } else if (file) {
      // Handle file upload
      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = buffer.toString('base64');

      // Extract workout data using Gemini
      extractedData = await extractWorkoutFromImage(base64Data, file.type);
    } else {
      return NextResponse.json(
        { error: 'No file or text provided' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();

    const exerciseNames = new Set<string>();
    extractedData.days?.forEach((day: any) => {
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
        const matchResult = await matchExercisesToCatalog(unknownNames, EXERCISE_NAMES);
        matchResult.matches.forEach((entry) => {
          if (entry.match) {
            nameMap.set(entry.input, entry.match);
          }
        });
      } catch (error) {
        console.error('Failed to match exercise names:', error);
      }
    }

    const applyNameMatch = (name: string) => nameMap.get(name) ?? name;

    // Transform extracted data into WorkoutPlan format
    const workoutPlan: WorkoutPlan = {
      id: `workout-${timestamp}`,
      name: extractedData.name || 'My Workout Plan',
      uploadedAt: new Date().toISOString(),
      days: extractedData.days.map((day: any, dayIndex: number): WorkoutDay => ({
        id: `day-${timestamp}-${dayIndex}`,
        name: day.name || `Day ${dayIndex + 1}`,
        isRestDay: day.isRestDay || false,
        exercises: (day.exercises || []).map((ex: any, exIndex: number): Exercise => {
          const normalized = normalizeExerciseFields({
            weight: ex.weight,
            targetNotes: ex.notes || '',
          });
          return {
            id: `exercise-${timestamp}-${dayIndex}-${exIndex}`,
            name: applyNameMatch(String(ex.name ?? '')),
            type: ex.type || 'reps', // Default to reps if not specified
            sets: ex.sets || 3,
            reps: ex.reps || '10',
            weight: normalized.weight,
            targetNotes: normalized.targetNotes || '',
            notes: '',
            restTime: ex.restTime,
            completed: false,
            completedSets: []
          };
        })
      })),
      sessions: []
    };

    return NextResponse.json(workoutPlan);
  } catch (error) {
    console.error('Error extracting workout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract workout from image' },
      { status: 500 }
    );
  }
}

