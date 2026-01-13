import { NextRequest, NextResponse } from 'next/server';
import { extractWorkoutFromImage } from '@/lib/gemini';
import { WorkoutPlan, WorkoutDay, Exercise } from '@/types/workout';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Extract workout data using Gemini
    const extractedData = await extractWorkoutFromImage(base64Data, file.type);

    const timestamp = Date.now();

    // Transform extracted data into WorkoutPlan format
    const workoutPlan: WorkoutPlan = {
      id: `workout-${timestamp}`,
      name: extractedData.name || 'My Workout Plan',
      uploadedAt: new Date().toISOString(),
      days: extractedData.days.map((day: any, dayIndex: number): WorkoutDay => ({
        id: `day-${timestamp}-${dayIndex}`,
        name: day.name || `Day ${dayIndex + 1}`,
        isRestDay: day.isRestDay || false,
        exercises: (day.exercises || []).map((ex: any, exIndex: number): Exercise => ({
          id: `exercise-${timestamp}-${dayIndex}-${exIndex}`,
          name: ex.name,
          type: ex.type || 'reps', // Default to reps if not specified
          sets: ex.sets || 3,
          reps: ex.reps || '10',
          weight: ex.weight,
          restTime: ex.restTime,
          notes: ex.notes || '',
          completed: false,
          completedSets: []
        }))
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

