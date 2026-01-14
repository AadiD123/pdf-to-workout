'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkoutPlan, SetRecord } from '@/types/workout';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';
import { TrendingUp, MoreVertical, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

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
  onAddExercise?: (dayId: string, exercise: any) => void;
  onDeleteExercise?: (dayId: string, exerciseId: string) => void;
  onAddSet?: (dayId: string, exerciseId: string) => void;
  onDeleteSet?: (dayId: string, exerciseId: string, setNumber: number) => void;
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
  onViewProgress,
  onAddExercise,
  onDeleteExercise,
  onAddSet,
  onDeleteSet
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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpMessage] = useState('Level Up!');
  const prevCompletedRef = useRef(0);

  useEffect(() => {
    const previousCount = prevCompletedRef.current;
    prevCompletedRef.current = completedExercisesCount;
    if (completedExercisesCount > previousCount) {
      setShowLevelUp(true);
      const timeout = setTimeout(() => setShowLevelUp(false), 2400);
      return () => clearTimeout(timeout);
    }
  }, [completedExercisesCount]);


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

  const handleAddExercise = () => {
    if (!onAddExercise) return;
    
    const exerciseName = prompt('Enter exercise name:');
    if (!exerciseName || !exerciseName.trim()) return;
    
    const sets = prompt('Number of sets:', '3');
    if (!sets || isNaN(parseInt(sets))) return;
    
    const type = confirm('Is this a time-based exercise? (OK = Yes, Cancel = No)') ? 'time' : 'reps';
    
    const reps = prompt(
      type === 'time' ? 'Duration (e.g., "60 sec", "1 min"):' : 'Reps (e.g., "8-12", "10"):',
      type === 'time' ? '60 sec' : '10'
    );
    if (!reps || !reps.trim()) return;
    
    const weight = type === 'reps' ? prompt('Weight (optional, e.g., "135 lbs"):') : undefined;
    const restTime = prompt('Rest time (optional, e.g., "90 sec"):');
    
    const newExercise = {
      id: `exercise-${Date.now()}`,
      name: exerciseName.trim(),
      type,
      sets: parseInt(sets),
      reps: reps.trim(),
      weight: weight?.trim() || undefined,
      restTime: restTime?.trim() || undefined,
      notes: '',
      completed: false,
      completedSets: []
    };
    
    onAddExercise(selectedDayId, newExercise);
  };

  return (
    <div className="min-h-screen bg-[#101014] text-gray-100 pb-28">
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glow-lime rounded-full border border-[#c6ff5e] bg-[#1a2216] px-4 py-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c6ff5e]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c6ff5e]">
                {levelUpMessage}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Fixed Header - Glass */}
      <div className="sticky top-0 z-10 bg-[#15151c]/80 backdrop-blur border-b border-[#242432]">
        {/* Centered Clock Row */}
        {workoutStartTime && (
          <div className="flex items-center justify-center gap-3 pt-3 pb-2 px-4">
            <div className="bg-[#1b2220] border border-[#2a3a2b] px-4 py-2 rounded-full">
              <span className="text-base font-semibold text-[#c6ff5e]">
                {formatDuration(workoutDuration)}
              </span>
            </div>
            {/* Rest Timer */}
            {activeRestTimer && (
              <div className="bg-[#1a1d24] px-3 py-1.5 rounded-full border border-[#2a2f3a]">
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
        
        {/* Title and Menu Row */}
        <div className="flex items-center justify-between gap-4 px-4 pb-3">
          {/* Title - Can wrap */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold uppercase tracking-tight text-gray-100 line-clamp-2">
              {workoutPlan.name}
            </h1>
            <p className="text-xs text-gray-500">
              {format(new Date(workoutPlan.uploadedAt), 'MMM d, yyyy')}
            </p>
          </div>
          
          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27]"
            >
              <MoreVertical className="w-5 h-5 text-gray-300" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#15151c] rounded-lg shadow-lg border border-[#242432] py-1 z-20">
                <button
                  onClick={() => {
                    onViewProgress();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b]"
                >
                  View Progress
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b]"
                >
                  Reset Session
                </button>
                <button
                  onClick={() => {
                    handleDiscardWorkout();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#1f232b]"
                >
                  Discard Workout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workout Day Title */}
        <div className="px-4 pb-3 pt-1">
          <h2 className="text-lg font-semibold text-gray-300">
            {selectedDay?.name}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[#1f232b]">
          <div
            className="h-full bg-[#c6ff5e] transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="p-4 space-y-2">
        {selectedDay?.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onUpdateSet={(setNumber, updates) => onUpdateSet(exercise.id, setNumber, updates)}
            onUpdateNotes={(notes) => onUpdateNotes(exercise.id, notes)}
            onUpdateExerciseName={(name) => onUpdateExerciseName(exercise.id, name)}
            onAddSet={onAddSet ? () => onAddSet(selectedDayId, exercise.id) : undefined}
            onDeleteSet={onDeleteSet ? (setNumber) => onDeleteSet(selectedDayId, exercise.id, setNumber) : undefined}
            onDeleteExercise={onDeleteExercise ? () => onDeleteExercise(selectedDayId, exercise.id) : undefined}
            canDeleteExercise={selectedDay ? selectedDay.exercises.length > 1 : false}
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

        {/* Add Exercise Button */}
        {onAddExercise && (
          <button
            onClick={() => handleAddExercise()}
            className="w-full py-3 px-4 mt-4 border-2 border-dashed border-[#2a2f3a] rounded-xl text-gray-300 hover:border-[#00e8ff] hover:text-[#00e8ff] transition-colors font-semibold"
          >
            + Add Exercise
          </button>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="bg-[#101014]/90 backdrop-blur border-t border-[#242432] px-4 pb-4 pt-3">
          <button
            onClick={() => setShowCompleteDialog(true)}
            className="w-full min-h-[52px] rounded-xl border border-[#c6ff5e] text-[#c6ff5e] bg-[#151c14] hover:bg-[#1c2418] font-semibold text-lg transition-colors glow-lime-strong"
          >
            Finish Workout
          </button>
        </div>
      </div>

      {/* Complete Session Dialog - Mobile Bottom Sheet Style */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowCompleteDialog(false)}>
          <div 
            className="bg-[#15151c] rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full border-t border-[#242432] sm:border animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[#2a2f3a] rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              Great Work! 💪
            </h2>
            <p className="text-gray-400 mb-4">
              You completed {completedExercisesCount} of {totalExercises} exercises
            </p>
            <div className="space-y-4">
              <div>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did it go? (optional)"
                  rows={3}
                  className="w-full px-4 py-3 text-base border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff] resize-none"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCompleteSession}
                  className="w-full min-h-[52px] bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-xl font-semibold text-lg transition-colors"
                >
                  Save Workout
                </button>
                <button
                  onClick={() => setShowCompleteDialog(false)}
                  className="w-full py-3 text-gray-400 hover:text-gray-100 font-medium transition-colors"
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

