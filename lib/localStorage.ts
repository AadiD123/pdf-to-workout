import { WorkoutPlan, WorkoutSession, Exercise, SetRecord, CompletedExercise } from '@/types/workout';

const WORKOUT_PLAN_KEY = 'workout-plan';
const CURRENT_SESSION_KEY = 'current-session';
const ALL_WORKOUT_PLANS_KEY = 'all-workout-plans';
const ACTIVE_PLAN_ID_KEY = 'active-plan-id';

export function saveWorkoutPlan(plan: WorkoutPlan): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WORKOUT_PLAN_KEY, JSON.stringify(plan));
    
    // Also save to all plans list
    const allPlans = loadAllWorkoutPlans();
    const existingIndex = allPlans.findIndex(p => p.id === plan.id);
    if (existingIndex !== -1) {
      allPlans[existingIndex] = plan;
    } else {
      allPlans.push(plan);
    }
    localStorage.setItem(ALL_WORKOUT_PLANS_KEY, JSON.stringify(allPlans));
    localStorage.setItem(ACTIVE_PLAN_ID_KEY, plan.id);
  }
}

export function loadWorkoutPlan(): WorkoutPlan | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(WORKOUT_PLAN_KEY);
    if (data) {
      try {
        return JSON.parse(data) as WorkoutPlan;
      } catch (error) {
        console.error('Error parsing workout plan:', error);
        return null;
      }
    }
  }
  return null;
}

export function clearWorkoutPlan(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKOUT_PLAN_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

export function addWorkoutSession(session: WorkoutSession): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    plan.sessions.push(session);
    saveWorkoutPlan(plan);
  }
}

export function updateWorkoutName(name: string): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    plan.name = name;
    saveWorkoutPlan(plan);
  }
}

export function updateDayName(dayId: string, name: string): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    const day = plan.days.find(d => d.id === dayId);
    if (day) {
      day.name = name;
      saveWorkoutPlan(plan);
    }
  }
}

export function updateExercise(exerciseId: string, updates: Partial<Exercise>): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    // Find exercise across all days
    for (const day of plan.days) {
      const exerciseIndex = day.exercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        day.exercises[exerciseIndex] = {
          ...day.exercises[exerciseIndex],
          ...updates
        };
        saveWorkoutPlan(plan);
        break;
      }
    }
  }
}

export function updateExerciseName(exerciseId: string, name: string): void {
  updateExercise(exerciseId, { name });
}

export function updateExerciseSet(
  exerciseId: string,
  setNumber: number,
  updates: Partial<SetRecord>
): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    // Find exercise across all days
    for (const day of plan.days) {
      const exercise = day.exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        const setIndex = exercise.completedSets.findIndex(s => s.setNumber === setNumber);
        if (setIndex !== -1) {
          exercise.completedSets[setIndex] = {
            ...exercise.completedSets[setIndex],
            ...updates
          };
        } else {
          // Add new set record
          exercise.completedSets.push({
            setNumber,
            reps: 0,
            weight: 0,
            completed: false,
            ...updates
          });
        }
        
        // Update exercise completion status
        exercise.completed = exercise.completedSets.filter(s => s.completed).length === exercise.sets;
        
        saveWorkoutPlan(plan);
        break;
      }
    }
  }
}

export function resetCurrentSession(dayId?: string): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    // Reset exercises in specific day or all days
    plan.days.forEach(day => {
      if (!dayId || day.id === dayId) {
        day.exercises.forEach(exercise => {
          exercise.completed = false;
          exercise.completedSets = [];
        });
      }
    });
    saveWorkoutPlan(plan);
  }
}

export function completeCurrentSession(dayId: string, sessionNotes?: string, duration?: number): WorkoutSession {
  const plan = loadWorkoutPlan();
  if (!plan) {
    throw new Error('No workout plan found');
  }

  // Find the day
  const day = plan.days.find(d => d.id === dayId);
  if (!day) {
    throw new Error('Day not found');
  }

  // Collect completed exercises with full data (sets, reps, weights)
  // Only include exercises with at least one COMPLETED set (not just started)
  const completedExercises: CompletedExercise[] = day.exercises
    .map(ex => {
      const isTimeBased = ex.type === 'time';
      return {
        id: ex.id,
        name: ex.name,
        sets: ex.completedSets.filter(set => {
          // For time-based: check duration, for rep-based: check reps
          const hasValue = isTimeBased 
            ? set.duration && set.duration > 0
            : set.reps && set.reps > 0;
          return set.completed && hasValue;
        }),
        notes: ex.notes
      };
    })
    .filter(ex => ex.sets.length > 0); // Only include exercises with at least one completed set

  const session: WorkoutSession = {
    id: `session-${Date.now()}`,
    date: new Date().toISOString(),
    dayId: day.id,
    dayName: day.name,
    completedExercises,
    duration,
    notes: sessionNotes
  };

  addWorkoutSession(session);
  resetCurrentSession(dayId);
  
  return session;
}

// Helper function to get all exercises across all days
export function getAllExercises(plan: WorkoutPlan): Exercise[] {
  return plan.days.flatMap(day => day.exercises);
}

// Multiple workout plans management
export function loadAllWorkoutPlans(): WorkoutPlan[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(ALL_WORKOUT_PLANS_KEY);
    if (data) {
      try {
        return JSON.parse(data) as WorkoutPlan[];
      } catch (error) {
        console.error('Error parsing all workout plans:', error);
        return [];
      }
    }
  }
  return [];
}

export function switchToWorkoutPlan(planId: string): void {
  if (typeof window !== 'undefined') {
    const allPlans = loadAllWorkoutPlans();
    const plan = allPlans.find(p => p.id === planId);
    if (plan) {
      localStorage.setItem(WORKOUT_PLAN_KEY, JSON.stringify(plan));
      localStorage.setItem(ACTIVE_PLAN_ID_KEY, planId);
    }
  }
}

export function getActivePlanId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ACTIVE_PLAN_ID_KEY);
  }
  return null;
}

