'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkoutPlan, SetRecord } from '@/types/workout';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';
import { TrendingUp, MoreVertical, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface WorkoutTrackerProps {
  workoutPlan: WorkoutPlan;
  selectedDayId: string;
  workoutStartTime?: number; // Timestamp when workout started
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<SetRecord>) => void;
  onUpdateNotes: (exerciseId: string, notes: string) => void;
  onUpdateExerciseName: (exerciseId: string, name: string) => void;
  onUpdateWorkoutName: (name: string) => void;
  onUpdateDayName: (dayId: string, name: string) => void;
  onCompleteSession: (dayId: string, notes?: string) => void;
  onResetSession: (dayId?: string) => void;
  onBackToHome: () => void;
  onViewProgress: () => void;
}

export default function WorkoutTracker({
  workoutPlan,
  selectedDayId: propSelectedDayId,
  workoutStartTime,
  onUpdateSet,
  onUpdateNotes,
  onUpdateExerciseName,
  onUpdateWorkoutName,
  onUpdateDayName,
  onCompleteSession,
  onResetSession,
  onBackToHome,
  onViewProgress
}: WorkoutTrackerProps) {
  const [sessionNotes, setSessionNotes] = useState('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedDayId] = useState(propSelectedDayId); // Fixed to the day selected from home
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null); // Track which exercise has active timer
  const [restTimerAutoStart, setRestTimerAutoStart] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState<string | undefined>(undefined);

  const selectedDay = workoutPlan.days.find(d => d.id === selectedDayId) || workoutPlan.days[0];
  
  // Update workout duration timer
  useEffect(() => {
    if (workoutStartTime) {
      const interval = setInterval(() => {
        setWorkoutDuration(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [workoutStartTime]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const completedExercisesCount = selectedDay?.exercises.filter(ex => ex.completed).length || 0;
  const totalExercises = selectedDay?.exercises.length || 0;
  const overallProgress = totalExercises > 0 ? (completedExercisesCount / totalExercises) * 100 : 0;


  const handleDiscardWorkout = () => {
    if (confirm('Discard this workout? All your progress will be lost.')) {
      onBackToHome();
    }
  };

  const handleCompleteSession = () => {
    onCompleteSession(selectedDayId, sessionNotes);
    setSessionNotes('');
    setShowCompleteDialog(false);
  };

  const handleReset = () => {
    onResetSession(selectedDayId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24">
      {/* Fixed Header - Strong App Style */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* Top Row: Timers, Title, Menu */}
        <div className="flex items-start justify-between gap-4 p-4">
          {/* Left: Timers */}
          {workoutStartTime && (
            <div className="flex flex-col gap-1.5 min-w-[80px]">
              <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {formatDuration(workoutDuration)}
                </span>
              </div>
              {/* Minimal Rest Timer */}
              {activeRestTimer && (
                <div className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800">
                  <RestTimer 
                    defaultRestTime={restTimerDuration}
                    autoStart={restTimerAutoStart}
                    onAutoStartComplete={() => setRestTimerAutoStart(false)}
                    onClose={() => setActiveRestTimer(null)}
                    inline={true}
                    minimal={true}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Center: Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {workoutPlan.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(workoutPlan.uploadedAt), 'MMM d, yyyy')}
            </p>
          </div>
          
          {/* Right: Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => {
                    onViewProgress();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  View Progress
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Reset Session
                </button>
                <button
                  onClick={() => {
                    handleDiscardWorkout();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Discard Workout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workout Day Title */}
        <div className="px-4 pb-3 pt-1">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {selectedDay?.name}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="p-4 space-y-0">
        {selectedDay?.exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onUpdateSet={(setNumber, updates) => onUpdateSet(exercise.id, setNumber, updates)}
            onUpdateNotes={(notes) => onUpdateNotes(exercise.id, notes)}
            onUpdateExerciseName={(name) => onUpdateExerciseName(exercise.id, name)}
            isRestTimerActive={activeRestTimer === exercise.id}
            onRestTimerActiveChange={(isActive, restTime) => {
              if (isActive) {
                setActiveRestTimer(exercise.id);
                setRestTimerDuration(restTime);
                setRestTimerAutoStart(true);
              } else {
                setActiveRestTimer(null);
              }
            }}
          />
        ))}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-900 via-white dark:via-gray-900 to-transparent">
        <button
          onClick={() => setShowCompleteDialog(true)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg"
        >
          Finish Workout
        </button>
      </div>

      {/* Complete Session Dialog - Mobile Bottom Sheet Style */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowCompleteDialog(false)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full border-t border-gray-200 dark:border-gray-800 sm:border animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Great Work! 💪
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You completed {completedExercisesCount} of {totalExercises} exercises
            </p>
            <div className="space-y-4">
              <div>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did it go? (optional)"
                  rows={3}
                  className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCompleteSession}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors"
                >
                  Save Workout
                </button>
                <button
                  onClick={() => setShowCompleteDialog(false)}
                  className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

