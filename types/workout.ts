export interface SetRecord {
  setNumber: number;
  reps: number; // For rep-based exercises
  duration?: number; // For time-based exercises (in seconds)
  weight?: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  type: 'reps' | 'time'; // Whether this exercise is rep-based or time-based
  reps: string; // "8-12" or "10" etc for rep-based, "60 sec" or "1 min" for time-based
  weight?: string;
  restTime?: string;
  notes?: string;
  completed: boolean;
  completedSets: SetRecord[];
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g., "Day 1: Push", "Monday - Upper Body", "Rest Day"
  isRestDay: boolean; // True if this is a rest/recovery day
  exercises: Exercise[];
}

export interface CompletedExercise {
  id: string;
  name: string;
  sets: SetRecord[]; // The actual sets completed
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  dayId: string; // ID of the workout day
  dayName: string; // Name of the workout day
  completedExercises: CompletedExercise[]; // Full exercise data
  duration?: number; // Duration in seconds
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  uploadedAt: string;
  days: WorkoutDay[]; // Organized by days/splits
  sessions: WorkoutSession[];
}

