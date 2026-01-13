"use client";

import { WorkoutPlan } from "@/types/workout";
import {
  Dumbbell,
  Calendar,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Coffee,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  getSuggestedDay,
  getSuggestedDayMessage,
} from "@/lib/workoutSuggestion";

interface HomeViewProps {
  workoutPlan: WorkoutPlan;
  onStartDay: (dayId: string) => void;
  onViewProgress: () => void;
  onNewWorkout: () => void;
}

export default function HomeView({
  workoutPlan,
  onStartDay,
  onViewProgress,
  onNewWorkout,
}: HomeViewProps) {
  const totalSessions = workoutPlan.sessions.length;
  const lastWorkout =
    workoutPlan.sessions.length > 0
      ? workoutPlan.sessions[workoutPlan.sessions.length - 1]
      : null;

  const suggestedDayId = getSuggestedDay(workoutPlan);
  const suggestedDay = workoutPlan.days.find((d) => d.id === suggestedDayId);
  const suggestionMessage = suggestedDayId
    ? getSuggestedDayMessage(workoutPlan, suggestedDayId)
    : "";

  const daysSinceLastWorkout = lastWorkout
    ? differenceInDays(new Date(), new Date(lastWorkout.date))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Dumbbell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {workoutPlan.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created {format(new Date(workoutPlan.uploadedAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Workouts
            </p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totalSessions}
            </p>
          </div>
          <div className="flex-1 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Days
            </p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {workoutPlan.days.length}
            </p>
          </div>
        </div>

        {lastWorkout && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last workout: {format(new Date(lastWorkout.date), "MMM d")}
              {daysSinceLastWorkout !== null && daysSinceLastWorkout > 0 && (
                <span className="ml-1">
                  ({daysSinceLastWorkout} day
                  {daysSinceLastWorkout !== 1 ? "s" : ""} ago)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Suggested Day */}
      {suggestedDay && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Next in Your Plan
            </h2>
          </div>

          <button
            onClick={() => onStartDay(suggestedDay.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 shadow-lg active:scale-[0.98] transition-all border-2 border-transparent hover:border-white/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {suggestedDay.isRestDay ? (
                  <Coffee className="w-7 h-7 text-white" />
                ) : (
                  <Dumbbell className="w-7 h-7 text-white" />
                )}
              </div>

              <div className="flex-1 text-left">
                <h3 className="text-xl font-bold text-white mb-1">
                  {suggestedDay.name}
                </h3>
                <p className="text-white/80 text-sm mb-2">
                  {suggestionMessage}
                </p>
                {!suggestedDay.isRestDay && (
                  <p className="text-white/60 text-xs">
                    {suggestedDay.exercises.length} exercise
                    {suggestedDay.exercises.length !== 1 ? "s" : ""}
                  </p>
                )}
                {suggestedDay.isRestDay && (
                  <p className="text-white/60 text-xs">
                    Recovery day • No exercises
                  </p>
                )}
              </div>

              <div className="self-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* All Workout Days */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          All Days
        </h2>

        <div className="space-y-3">
          {workoutPlan.days.map((day) => {
            const isSuggested = day.id === suggestedDayId;
            const daySessionCount = workoutPlan.sessions.filter(
              (s) => s.dayId === day.id
            ).length;

            // Don't show the suggested day again in the list
            if (isSuggested) return null;

            return (
              <button
                key={day.id}
                onClick={() => onStartDay(day.id)}
                className={`w-full rounded-xl p-4 border-2 transition-all active:scale-[0.98] ${
                  day.isRestDay
                    ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      day.isRestDay
                        ? "bg-green-100 dark:bg-green-900/20"
                        : "bg-blue-100 dark:bg-blue-900/20"
                    }`}
                  >
                    {day.isRestDay ? (
                      <Coffee
                        className={`w-6 h-6 ${
                          day.isRestDay
                            ? "text-green-600 dark:text-green-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      />
                    ) : (
                      <Dumbbell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {day.name}
                    </h3>
                    {day.isRestDay ? (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Recovery day • {daySessionCount} time
                        {daySessionCount !== 1 ? "s" : ""} completed
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {day.exercises.length} exercise
                        {day.exercises.length !== 1 ? "s" : ""} •{" "}
                        {daySessionCount} session
                        {daySessionCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 space-y-3">
        <button
          onClick={onViewProgress}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 dark:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          View Progress
        </button>

        <button
          onClick={onNewWorkout}
          className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
        >
          Upload New Workout Plan
        </button>
      </div>
    </div>
  );
}
