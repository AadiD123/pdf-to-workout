'use client';

import { useState, useEffect } from 'react';
import { WorkoutPlan, SetRecord, WorkoutDay } from '@/types/workout';
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
  deleteWorkoutPlan,
  addDayToPlan,
  moveDayInPlan,
  reorderDaysInPlan,
  deleteDayFromPlan,
  clearAllUserData,
  addExerciseToDay,
  deleteExerciseFromDay,
  addSetToExercise,
  deleteSetFromExercise
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

  const handleAddDay = (day: WorkoutDay) => {
    addDayToPlan(day);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleMoveDay = (dayId: string, direction: 'up' | 'down') => {
    moveDayInPlan(dayId, direction);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleReorderDays = (dayOrder: string[]) => {
    reorderDaysInPlan(dayOrder);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleDeleteDay = (dayId: string) => {
    deleteDayFromPlan(dayId);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleDeleteAllData = () => {
    clearAllUserData();
    setWorkoutPlan(null);
    setAllWorkoutPlans([]);
  };

  const handleAddExercise = (dayId: string, exercise: any) => {
    addExerciseToDay(dayId, exercise);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleDeleteExercise = (dayId: string, exerciseId: string) => {
    deleteExerciseFromDay(dayId, exerciseId);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleAddSet = (dayId: string, exerciseId: string) => {
    addSetToExercise(dayId, exerciseId);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
  };

  const handleDeleteSet = (dayId: string, exerciseId: string, setNumber: number) => {
    deleteSetFromExercise(dayId, exerciseId, setNumber);
    const plan = loadWorkoutPlan();
    setWorkoutPlan(plan);
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

