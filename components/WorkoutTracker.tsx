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
  const [isEditingWorkoutName, setIsEditingWorkoutName] = useState(false);
  const [editedWorkoutName, setEditedWorkoutName] = useState(workoutPlan.name);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null); // Track which exercise has active timer
  const [restTimerAutoStart, setRestTimerAutoStart] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState<string | undefined>(undefined);
  const workoutNameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isEditingWorkoutName && workoutNameInputRef.current) {
      workoutNameInputRef.current.focus();
      workoutNameInputRef.current.select();
    }
  }, [isEditingWorkoutName]);

  const handleSaveWorkoutName = () => {
    if (editedWorkoutName.trim() && editedWorkoutName !== workoutPlan.name) {
      onUpdateWorkoutName(editedWorkoutName.trim());
    }
    setIsEditingWorkoutName(false);
  };

  const handleCancelWorkoutName = () => {
    setEditedWorkoutName(workoutPlan.name);
    setIsEditingWorkoutName(false);
  };

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
        <div className="flex items-center justify-between p-4">
          {/* Workout Clock */}
          {workoutStartTime && (
            <div className="absolute top-4 left-4 bg-blue-100 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {formatDuration(workoutDuration)}
              </span>
            </div>
          )}
          
          <div className="flex-1 ml-28">
            {isEditingWorkoutName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={workoutNameInputRef}
                  type="text"
                  value={editedWorkoutName}
                  onChange={(e) => setEditedWorkoutName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveWorkoutName();
                    if (e.key === 'Escape') handleCancelWorkoutName();
                  }}
                  className="flex-1 text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-gray-100"
                />
                <button onClick={handleSaveWorkoutName} className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={handleCancelWorkoutName} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingWorkoutName(true)}
                className="text-xl font-bold text-gray-900 dark:text-gray-100 text-left hover:text-blue-600 dark:hover:text-blue-400"
              >
                {workoutPlan.name}
              </button>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(workoutPlan.uploadedAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="relative">
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
        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {selectedDay?.name}
          </h2>
        </div>

        {/* Centralized Rest Timer */}
        {activeRestTimer && (
          <div className="px-4 pb-2">
            <RestTimer 
              defaultRestTime={restTimerDuration}
              autoStart={restTimerAutoStart}
              onAutoStartComplete={() => setRestTimerAutoStart(false)}
              onClose={() => setActiveRestTimer(null)}
              inline={true}
            />
          </div>
        )}

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

