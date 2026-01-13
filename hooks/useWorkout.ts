'use client';

import { useState, useEffect } from 'react';
import { WorkoutPlan, SetRecord } from '@/types/workout';
import {
  loadWorkoutPlan,
  saveWorkoutPlan,
  clearWorkoutPlan,
  updateExercise,
  updateExerciseSet,
  updateWorkoutName,
  updateDayName,
  updateExerciseName,
  resetCurrentSession,
  completeCurrentSession,
  loadAllWorkoutPlans,
  switchToWorkoutPlan,
  deleteWorkoutPlan
} from '@/lib/localStorage';

export function useWorkout() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [allWorkoutPlans, setAllWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load workout plan from local storage on mount
  useEffect(() => {
    const plan = loadWorkoutPlan();
    const allPlans = loadAllWorkoutPlans();
    setWorkoutPlan(plan);
    setAllWorkoutPlans(allPlans);
    setIsLoading(false);
  }, []);

  const setNewWorkoutPlan = (plan: WorkoutPlan) => {
    saveWorkoutPlan(plan);
    setWorkoutPlan(plan);
  };

  const handleUpdateSet = (exerciseId: string, setNumber: number, updates: Partial<SetRecord>) => {
    updateExerciseSet(exerciseId, setNumber, updates);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleUpdateNotes = (exerciseId: string, notes: string) => {
    updateExercise(exerciseId, { notes });
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleUpdateExerciseName = (exerciseId: string, name: string) => {
    updateExerciseName(exerciseId, name);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleUpdateWorkoutName = (name: string) => {
    updateWorkoutName(name);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleUpdateDayName = (dayId: string, name: string) => {
    updateDayName(dayId, name);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleCompleteSession = (dayId: string, notes?: string, duration?: number) => {
    completeCurrentSession(dayId, notes, duration);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleResetSession = (dayId?: string) => {
    resetCurrentSession(dayId);
    const updatedPlan = loadWorkoutPlan();
    setWorkoutPlan(updatedPlan);
  };

  const handleClearWorkout = () => {
    clearWorkoutPlan();
    setWorkoutPlan(null);
  };

  const handleSwitchPlan = (planId: string) => {
    switchToWorkoutPlan(planId);
    const plan = loadWorkoutPlan();
    const allPlans = loadAllWorkoutPlans();
    setWorkoutPlan(plan);
    setAllWorkoutPlans(allPlans);
  };

  const handleDeletePlan = (planId: string) => {
    deleteWorkoutPlan(planId);
    const plan = loadWorkoutPlan();
    const allPlans = loadAllWorkoutPlans();
    setWorkoutPlan(plan);
    setAllWorkoutPlans(allPlans);
  };

  return {
    workoutPlan,
    allWorkoutPlans,
    isLoading,
    setNewWorkoutPlan,
    handleUpdateSet,
    handleUpdateNotes,
    handleUpdateExerciseName,
    handleUpdateWorkoutName,
    handleUpdateDayName,
    handleCompleteSession,
    handleResetSession,
    handleClearWorkout,
    handleSwitchPlan,
    handleDeletePlan
  };
}

