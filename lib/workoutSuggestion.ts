import { WorkoutPlan, WorkoutSession } from '@/types/workout';
import { differenceInDays, startOfDay } from 'date-fns';

/**
 * Determines which day in the workout plan the user should do next
 * based on their workout history and the plan structure
 */
export function getSuggestedDay(workoutPlan: WorkoutPlan): string | null {
  const { days, sessions } = workoutPlan;
  
  if (days.length === 0) return null;
  
  // If no sessions yet, suggest the first non-rest day
  if (sessions.length === 0) {
    const firstWorkoutDay = days.find(d => !d.isRestDay);
    return firstWorkoutDay?.id || days[0].id;
  }

  // Get the last session
  const lastSession = sessions[sessions.length - 1];
  const lastSessionDate = startOfDay(new Date(lastSession.date));
  const today = startOfDay(new Date());
  const daysSinceLastWorkout = differenceInDays(today, lastSessionDate);

  // Find the index of the last completed day
  const lastDayIndex = days.findIndex(d => d.id === lastSession.dayId);
  
  if (lastDayIndex === -1) {
    // Last session day not found (maybe from old plan), start from beginning
    const firstWorkoutDay = days.find(d => !d.isRestDay);
    return firstWorkoutDay?.id || days[0].id;
  }

  // Calculate the next day index (cycling through the plan)
  let nextDayIndex = (lastDayIndex + 1) % days.length;
  
  // If it's been more than 7 days, restart from the beginning
  if (daysSinceLastWorkout > 7) {
    const firstWorkoutDay = days.find(d => !d.isRestDay);
    return firstWorkoutDay?.id || days[0].id;
  }

  // Return the next day in the cycle
  return days[nextDayIndex].id;
}

/**
 * Gets a motivational message for the suggested day
 */
export function getSuggestedDayMessage(
  workoutPlan: WorkoutPlan, 
  suggestedDayId: string
): string {
  const day = workoutPlan.days.find(d => d.id === suggestedDayId);
  if (!day) return '';

  const { sessions } = workoutPlan;
  const daysSinceLastWorkout = sessions.length > 0
    ? differenceInDays(new Date(), new Date(sessions[sessions.length - 1].date))
    : 0;

  if (day.isRestDay) {
    return "Time to recover and let your muscles grow!";
  }

  if (sessions.length === 0) {
    return "Let's start your fitness journey!";
  }

  if (daysSinceLastWorkout === 0) {
    return "Back for more? Let's crush it!";
  }

  if (daysSinceLastWorkout === 1) {
    return "Keep the momentum going!";
  }

  if (daysSinceLastWorkout > 7) {
    return "Welcome back! Let's get back on track!";
  }

  return "Ready for your next workout?";
}

