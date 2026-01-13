import { WorkoutSession } from '@/types/workout';
import { differenceInDays, startOfDay } from 'date-fns';

/**
 * Calculate the current workout streak
 * A streak is broken if more than 7 days pass without a workout
 * This allows for rest days (implied as days % 7)
 */
export function calculateStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  // Sort sessions by date (most recent first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const today = startOfDay(new Date());
  let streak = 0;
  let lastWorkoutDate = startOfDay(new Date(sortedSessions[0].date));

  // Check if the streak is still active (last workout within 7 days)
  const daysSinceLastWorkout = differenceInDays(today, lastWorkoutDate);
  if (daysSinceLastWorkout > 7) {
    return 0; // Streak is broken
  }

  // Count consecutive workout days/weeks
  let currentDate = lastWorkoutDate;
  
  for (const session of sortedSessions) {
    const sessionDate = startOfDay(new Date(session.date));
    const daysSinceLast = differenceInDays(currentDate, sessionDate);

    // If more than 7 days between workouts, streak is broken
    if (daysSinceLast > 7) {
      break;
    }

    // Count this workout towards the streak
    streak++;
    currentDate = sessionDate;
  }

  return streak;
}

