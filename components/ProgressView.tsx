'use client';

import { WorkoutPlan } from '@/types/workout';
import { ArrowLeft, Calendar, Dumbbell, Clock, ChevronDown, ChevronUp, Play, Timer, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { useState } from 'react';
import { formatSecondsToDisplay } from '@/lib/timeUtils';

interface ProgressViewProps {
  workoutPlan: WorkoutPlan;
  allWorkoutPlans: WorkoutPlan[]; // All saved workout plans
  onBack: () => void;
  onSwitchPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export default function ProgressView({ workoutPlan, allWorkoutPlans, onBack, onSwitchPlan, onDeletePlan }: ProgressViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const sessions = workoutPlan.sessions;
  
  // Get days in the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group sessions by date
  const sessionsByDate = new Map<string, typeof sessions>();
  sessions.forEach(session => {
    const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, []);
    }
    sessionsByDate.get(dateKey)!.push(session);
  });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-8">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-gray-100" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 ml-2">
            Progress
          </h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Current Plan Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {workoutPlan.name}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {sessions.length} workout{sessions.length !== 1 ? 's' : ''}
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uploaded {format(new Date(workoutPlan.uploadedAt), 'MMM d, yyyy')}
          </p>
        </div>

        {/* All Workout Plans */}
        {allWorkoutPlans.length > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Workout Plans
            </h2>
            <div className="space-y-3">
              {allWorkoutPlans.map(plan => (
                <div
                  key={plan.id}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    plan.id === workoutPlan.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {plan.sessions.length} workout{plan.sessions.length !== 1 ? 's' : ''} • {plan.days.length} day{plan.days.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {plan.id !== workoutPlan.id && (
                        <button
                          onClick={() => onSwitchPlan(plan.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Follow
                        </button>
                      )}
                      {plan.id === workoutPlan.id && (
                        <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg">
                          Active
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${plan.name}"? This will permanently remove all workout history.`)) {
                            onDeletePlan(plan.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar View */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Workout Calendar
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronUp className="w-5 h-5 rotate-90" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Days of the month */}
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDate.get(dateKey) || [];
              const hasWorkout = daySessions.length > 0;
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square p-1 rounded-lg transition-colors ${
                    hasWorkout
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                      : ''
                  }`}
                >
                  <div className={`text-center text-sm ${
                    hasWorkout
                      ? 'font-bold text-green-700 dark:text-green-400'
                      : isToday
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {hasWorkout && (
                    <div className="flex justify-center mt-0.5">
                      <div className="w-1 h-1 rounded-full bg-green-600 dark:bg-green-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout Sessions List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Workout History
          </h2>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Dumbbell className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No workouts yet</p>
              <p className="text-sm mt-1">Complete your first workout to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(session => {
                  const isExpanded = expandedSessionId === session.id;
                  const totalSets = session.completedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);

                  return (
                    <div
                      key={session.id}
                      className="rounded-lg bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
                    >
                      {/* Session Header */}
                      <button
                        onClick={() => toggleSessionExpand(session.id)}
                        className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {session.dayName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {format(new Date(session.date), 'EEEE, MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.duration && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                {formatDuration(session.duration)}
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{session.completedExercises.length} exercise{session.completedExercises.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{totalSets} set{totalSets !== 1 ? 's' : ''}</span>
                        </div>
                      </button>

                      {/* Expanded Exercise Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                          {session.completedExercises.map(exercise => (
                            <div key={exercise.id} className="bg-white dark:bg-gray-900 rounded-lg p-3">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {exercise.name}
                              </h4>
                              
                              {/* Sets Table */}
                              <div className="space-y-1">
                                {exercise.sets.map(set => {
                                  const isTimeBased = set.duration !== undefined && set.duration > 0;
                                  
                                  return (
                                    <div
                                      key={set.setNumber}
                                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800/50"
                                    >
                                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                                        Set {set.setNumber}
                                      </span>
                                      <div className="flex items-center gap-4">
                                        {set.weight && set.weight > 0 && (
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {set.weight} lbs
                                          </span>
                                        )}
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {isTimeBased ? (
                                            <>
                                              <Timer className="w-3 h-3 inline mr-1 -mt-0.5" />
                                              {formatSecondsToDisplay(set.duration || 0)}
                                            </>
                                          ) : (
                                            <>
                                              {set.reps} rep{set.reps !== 1 ? 's' : ''}
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {exercise.notes && (
                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                                  Note: {exercise.notes}
                                </p>
                              )}
                            </div>
                          ))}

                          {session.notes && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Workout Notes:</span> {session.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
