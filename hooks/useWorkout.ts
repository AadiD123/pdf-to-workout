'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkoutPlan, SetRecord, WorkoutDay, Exercise, CompletedExercise, WorkoutSession } from '@/types/workout';
import { supabase } from '@/lib/supabaseClient';
import { upsertExerciseStatsForSession } from '@/lib/exerciseStats';
import { useAuth } from '@/components/AuthProvider';

export function useWorkout() {
  const { user, isLoading: authLoading } = useAuth();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [allWorkoutPlans, setAllWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clonePlan = (plan: WorkoutPlan): WorkoutPlan =>
    JSON.parse(JSON.stringify(plan)) as WorkoutPlan;

  const refreshPlans = useCallback(async () => {
    if (!user) {
      setWorkoutPlan(null);
      setAllWorkoutPlans([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('workout_plans')
      .select('id, name, uploaded_at, data, is_active')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('Failed to load workout plans:', error);
      setWorkoutPlan(null);
      setAllWorkoutPlans([]);
      setIsLoading(false);
      return;
    }

    const plans = (data ?? []).map((row) => {
      const stored = row.data as WorkoutPlan;
      return {
        ...stored,
        id: row.id,
        name: row.name ?? stored?.name ?? 'Workout Plan',
        uploadedAt: row.uploaded_at ?? stored?.uploadedAt ?? new Date().toISOString(),
      };
    });

    const activePlan =
      plans.find((plan) => data?.find((row) => row.id === plan.id)?.is_active) ??
      plans[plans.length - 1] ??
      null;

    setAllWorkoutPlans(plans);
    setWorkoutPlan(activePlan ?? null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshPlans();
  }, [authLoading, refreshPlans]);

  const setActivePlan = async (planId: string) => {
    if (!user) return;
    const { error: clearError } = await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .neq('id', planId);
    if (clearError) {
      console.error('Failed to clear active plan:', clearError);
    }
    const { error: setError } = await supabase
      .from('workout_plans')
      .update({ is_active: true })
      .eq('user_id', user.id)
      .eq('id', planId);
    if (setError) {
      console.error('Failed to set active plan:', setError);
    }
  };

  const upsertPlan = async (plan: WorkoutPlan, makeActive = false) => {
    if (!user) return;
    const { error } = await supabase
      .from('workout_plans')
      .upsert(
        {
          user_id: user.id,
          id: plan.id,
          name: plan.name,
          uploaded_at: plan.uploadedAt,
          data: plan,
          is_active: makeActive,
        },
        { onConflict: 'user_id,id' }
      );
    if (error) {
      console.error('Failed to save workout plan:', error);
      return;
    }
    if (makeActive) {
      await setActivePlan(plan.id);
    }
  };

  const setNewWorkoutPlan = async (plan: WorkoutPlan) => {
    if (!user) return;
    setWorkoutPlan(plan);
    await upsertPlan(plan, true);
    await refreshPlans();
  };

  const handleUpdateSet = async (
    exerciseId: string,
    setNumber: number,
    updates: Partial<SetRecord>
  ) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);

    for (const day of plan.days) {
      const exercise = day.exercises.find((ex) => ex.id === exerciseId);
      if (exercise) {
        const setIndex = exercise.completedSets.findIndex((s) => s.setNumber === setNumber);
        if (setIndex !== -1) {
          exercise.completedSets[setIndex] = {
            ...exercise.completedSets[setIndex],
            ...updates,
            setType:
              updates.setType ??
              exercise.completedSets[setIndex].setType ??
              'normal',
          };
        } else {
          exercise.completedSets.push({
            setNumber,
            reps: 0,
            weight: 0,
            completed: false,
            setType: updates.setType ?? 'normal',
            ...updates,
          });
        }

        exercise.completed =
          exercise.completedSets.filter((s) => s.completed).length === exercise.sets;
        break;
      }
    }

    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleUpdateNotes = async (exerciseId: string, notes: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    for (const day of plan.days) {
      const exerciseIndex = day.exercises.findIndex((ex) => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        day.exercises[exerciseIndex] = {
          ...day.exercises[exerciseIndex],
          notes,
        };
        break;
      }
    }
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleUpdateExerciseName = async (exerciseId: string, name: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    for (const day of plan.days) {
      const exerciseIndex = day.exercises.findIndex((ex) => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        day.exercises[exerciseIndex].name = name;
        break;
      }
    }
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleUpdateExercise = async (
    exerciseId: string,
    updates: Partial<Exercise>
  ) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    for (const day of plan.days) {
      const exerciseIndex = day.exercises.findIndex((ex) => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        day.exercises[exerciseIndex] = {
          ...day.exercises[exerciseIndex],
          ...updates,
        };
        break;
      }
    }
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleUpdateWorkoutName = async (name: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    plan.name = name;
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleUpdateDayName = async (dayId: string, name: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (day) {
      day.name = name;
      setWorkoutPlan(plan);
      await upsertPlan(plan);
    }
  };

  const handleCompleteSession = async (
    dayId: string,
    notes?: string,
    duration?: number
  ) => {
    if (!workoutPlan || !user) return null;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (!day) return null;

    const completedExercises: CompletedExercise[] = day.exercises
      .map((ex) => {
        const isTimeBased = ex.type === 'time';
        return {
          id: ex.id,
          name: ex.name,
          sets: ex.completedSets.filter((set) => {
            const hasValue = isTimeBased
              ? set.duration && set.duration > 0
              : set.reps && set.reps > 0;
            return set.completed && hasValue;
          }),
          notes: ex.notes,
        };
      })
      .filter((ex) => ex.sets.length > 0);

    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString(),
      dayId: day.id,
      dayName: day.name,
      completedExercises,
      duration,
      notes,
    };

    plan.sessions.push(session);

    plan.days.forEach((d) => {
      if (d.id === dayId) {
        d.exercises.forEach((exercise) => {
          exercise.completed = false;
          exercise.completedSets = [];
        });
      }
    });

    setWorkoutPlan(plan);
    await upsertPlan(plan);
    return plan;
  };

  const handleReplaceWorkoutPlan = async (plan: WorkoutPlan) => {
    if (!user) return;
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleResetSession = async (dayId?: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    plan.days.forEach((day) => {
      if (!dayId || day.id === dayId) {
        day.exercises.forEach((exercise) => {
          exercise.completed = false;
          exercise.completedSets = [];
        });
      }
    });
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleClearWorkout = async () => {
    if (!user) return;
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id);
    setWorkoutPlan(null);
  };

  const handleSwitchPlan = async (planId: string) => {
    if (!user) return;
    await setActivePlan(planId);
    await refreshPlans();
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('id', planId);
    if (error) {
      console.error('Failed to delete workout plan:', error);
    }
    await refreshPlans();
  };

  const handleAddDay = async (day: WorkoutDay) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    plan.days.push(day);
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleMoveDay = async (dayId: string, direction: 'up' | 'down') => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const index = plan.days.findIndex((day) => day.id === dayId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plan.days.length) return;
    const updatedDays = [...plan.days];
    [updatedDays[index], updatedDays[targetIndex]] = [
      updatedDays[targetIndex],
      updatedDays[index],
    ];
    plan.days = updatedDays;
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleReorderDays = async (dayOrder: string[]) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const dayMap = new Map(plan.days.map((day) => [day.id, day]));
    const reordered = dayOrder
      .map((id) => dayMap.get(id))
      .filter(Boolean) as WorkoutDay[];
    const remaining = plan.days.filter((day) => !dayOrder.includes(day.id));
    plan.days = [...reordered, ...remaining];
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    plan.days = plan.days.filter((day) => day.id !== dayId);
    setWorkoutPlan(plan);
    await upsertPlan(plan);
  };

  const handleDeleteAllData = async () => {
    if (!user) return;
    await supabase.from('workout_plans').delete().eq('user_id', user.id);
    setWorkoutPlan(null);
    setAllWorkoutPlans([]);
  };

  const handleAddExercise = async (dayId: string, exercise: Exercise) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (day) {
      day.exercises.push(exercise);
      setWorkoutPlan(plan);
      await upsertPlan(plan);
    }
  };

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (day) {
      day.exercises = day.exercises.filter((ex) => ex.id !== exerciseId);
      setWorkoutPlan(plan);
      await upsertPlan(plan);
    }
  };

  const handleAddSet = async (dayId: string, exerciseId: string) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (day) {
      const exercise = day.exercises.find((ex) => ex.id === exerciseId);
      if (exercise) {
        exercise.sets += 1;
        exercise.completedSets.push({
          setNumber: exercise.completedSets.length + 1,
          reps: 0,
          weight: 0,
          completed: false,
          setType: 'normal',
        });
        setWorkoutPlan(plan);
        await upsertPlan(plan);
      }
    }
  };

  const handleDeleteSet = async (dayId: string, exerciseId: string, setNumber: number) => {
    if (!workoutPlan || !user) return;
    const plan = clonePlan(workoutPlan);
    const day = plan.days.find((d) => d.id === dayId);
    if (day) {
      const exercise = day.exercises.find((ex) => ex.id === exerciseId);
      if (exercise && exercise.sets > 1) {
        exercise.sets -= 1;
        exercise.completedSets = exercise.completedSets
          .filter((s) => s.setNumber !== setNumber)
          .map((s, index) => ({ ...s, setNumber: index + 1 }));
        setWorkoutPlan(plan);
        await upsertPlan(plan);
      }
    }
  };

  return {
    workoutPlan,
    allWorkoutPlans,
    isLoading,
    setNewWorkoutPlan,
    handleUpdateSet,
    handleUpdateNotes,
    handleUpdateExerciseName,
    handleUpdateExercise,
    handleUpdateWorkoutName,
    handleUpdateDayName,
    handleCompleteSession,
    handleReplaceWorkoutPlan,
    handleResetSession,
    handleClearWorkout,
    handleSwitchPlan,
    handleDeletePlan,
    handleAddDay,
    handleMoveDay,
    handleReorderDays,
    handleDeleteDay,
    handleDeleteAllData,
    handleAddExercise,
    handleDeleteExercise,
    handleAddSet,
    handleDeleteSet
  };
}

