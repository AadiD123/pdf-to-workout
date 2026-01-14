import { WorkoutPlan, WorkoutSession, Exercise, SetRecord, CompletedExercise, WorkoutDay } from '@/types/workout';

const WORKOUT_PLAN_KEY = 'workout-plan';
const CURRENT_SESSION_KEY = 'current-session';
const ALL_WORKOUT_PLANS_KEY = 'all-workout-plans';
const ACTIVE_PLAN_ID_KEY = 'active-plan-id';

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage getItem failed:', error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('localStorage setItem failed:', error);
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('localStorage removeItem failed:', error);
  }
};

export function saveWorkoutPlan(plan: WorkoutPlan): void {
  if (typeof window !== 'undefined') {
    safeSetItem(WORKOUT_PLAN_KEY, JSON.stringify(plan));
    
    // Also save to all plans list
    const allPlans = loadAllWorkoutPlans();
    const existingIndex = allPlans.findIndex(p => p.id === plan.id);
    if (existingIndex !== -1) {
      allPlans[existingIndex] = plan;
    } else {
      allPlans.push(plan);
    }
    safeSetItem(ALL_WORKOUT_PLANS_KEY, JSON.stringify(allPlans));
    safeSetItem(ACTIVE_PLAN_ID_KEY, plan.id);
  }
}

export function loadWorkoutPlan(): WorkoutPlan | null {
  if (typeof window !== 'undefined') {
    const data = safeGetItem(WORKOUT_PLAN_KEY);
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
    safeRemoveItem(WORKOUT_PLAN_KEY);
    safeRemoveItem(CURRENT_SESSION_KEY);
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
    const data = safeGetItem(ALL_WORKOUT_PLANS_KEY);
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
      safeSetItem(WORKOUT_PLAN_KEY, JSON.stringify(plan));
      safeSetItem(ACTIVE_PLAN_ID_KEY, planId);
    }
  }
}

export function getActivePlanId(): string | null {
  if (typeof window !== 'undefined') {
    return safeGetItem(ACTIVE_PLAN_ID_KEY);
  }
  return null;
}

export function deleteWorkoutPlan(planId: string): void {
  if (typeof window !== 'undefined') {
    const allPlans = loadAllWorkoutPlans();
    const filteredPlans = allPlans.filter(p => p.id !== planId);
    
    // If deleting the active plan, switch to another one or clear
    const activePlanId = getActivePlanId();
    if (activePlanId === planId) {
      if (filteredPlans.length > 0) {
        // Switch to the first remaining plan
        switchToWorkoutPlan(filteredPlans[0].id);
      } else {
        // No plans left, clear everything
        clearWorkoutPlan();
      }
    }
    
    // Update the all plans list
    safeSetItem(ALL_WORKOUT_PLANS_KEY, JSON.stringify(filteredPlans));
  }
}

export function addDayToPlan(day: WorkoutDay): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    plan.days.push(day);
    saveWorkoutPlan(plan);
  }
}

export function moveDayInPlan(dayId: string, direction: 'up' | 'down'): void {
  const plan = loadWorkoutPlan();
  if (!plan) return;
  const index = plan.days.findIndex(day => day.id === dayId);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= plan.days.length) return;
  const updatedDays = [...plan.days];
  [updatedDays[index], updatedDays[targetIndex]] = [updatedDays[targetIndex], updatedDays[index]];
  plan.days = updatedDays;
  saveWorkoutPlan(plan);
}

export function reorderDaysInPlan(dayOrder: string[]): void {
  const plan = loadWorkoutPlan();
  if (!plan) return;
  const dayMap = new Map(plan.days.map(day => [day.id, day]));
  const reordered = dayOrder.map(id => dayMap.get(id)).filter(Boolean) as WorkoutDay[];
  const remaining = plan.days.filter(day => !dayOrder.includes(day.id));
  plan.days = [...reordered, ...remaining];
  saveWorkoutPlan(plan);
}

export function deleteDayFromPlan(dayId: string): void {
  const plan = loadWorkoutPlan();
  if (!plan) return;
  plan.days = plan.days.filter(day => day.id !== dayId);
  saveWorkoutPlan(plan);
}

export function clearAllUserData(): void {
  if (typeof window !== 'undefined') {
    safeRemoveItem(WORKOUT_PLAN_KEY);
    safeRemoveItem(CURRENT_SESSION_KEY);
    safeRemoveItem(ALL_WORKOUT_PLANS_KEY);
    safeRemoveItem(ACTIVE_PLAN_ID_KEY);
    safeRemoveItem('plate-configuration');
    safeRemoveItem('barbell-weight');
  }
}

export function addExerciseToDay(dayId: string, exercise: Exercise): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    const day = plan.days.find(d => d.id === dayId);
    if (day) {
      day.exercises.push(exercise);
      saveWorkoutPlan(plan);
    }
  }
}

export function deleteExerciseFromDay(dayId: string, exerciseId: string): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    const day = plan.days.find(d => d.id === dayId);
    if (day) {
      day.exercises = day.exercises.filter(ex => ex.id !== exerciseId);
      saveWorkoutPlan(plan);
    }
  }
}

export function addSetToExercise(dayId: string, exerciseId: string): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    const day = plan.days.find(d => d.id === dayId);
    if (day) {
      const exercise = day.exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        exercise.sets += 1;
        const newSetRecord: SetRecord = {
          setNumber: exercise.completedSets.length + 1,
          reps: 0,
          weight: 0,
          completed: false
        };
        exercise.completedSets.push(newSetRecord);
        saveWorkoutPlan(plan);
      }
    }
  }
}

export function deleteSetFromExercise(dayId: string, exerciseId: string, setNumber: number): void {
  const plan = loadWorkoutPlan();
  if (plan) {
    const day = plan.days.find(d => d.id === dayId);
    if (day) {
      const exercise = day.exercises.find(ex => ex.id === exerciseId);
      if (exercise && exercise.sets > 1) {
        exercise.sets -= 1;
        exercise.completedSets = exercise.completedSets
          .filter(s => s.setNumber !== setNumber)
          .map((s, index) => ({ ...s, setNumber: index + 1 }));
        saveWorkoutPlan(plan);
      }
    }
  }
}

