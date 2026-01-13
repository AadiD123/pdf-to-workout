'use client';

import { useState } from 'react';
import { useWorkout } from '@/hooks/useWorkout';
import UploadZone from '@/components/UploadZone';
import WorkoutTracker from '@/components/WorkoutTracker';
import ProgressView from '@/components/ProgressView';
import HomeView from '@/components/HomeView';
import InstallPrompt from '@/components/InstallPrompt';
import { pdfToImage } from '@/lib/pdfToImage';
import { Dumbbell } from 'lucide-react';

export default function Home() {
  const {
    workoutPlan,
    allWorkoutPlans,
    isLoading: workoutLoading,
    setNewWorkoutPlan,
    handleUpdateSet,
    handleUpdateNotes,
    handleUpdateExerciseName,
    handleUpdateWorkoutName,
    handleUpdateDayName,
    handleCompleteSession,
    handleResetSession,
    handleClearWorkout,
    handleSwitchPlan
  } = useWorkout();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [view, setView] = useState<'home' | 'tracker' | 'progress'>('home');
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [workoutStartTime, setWorkoutStartTime] = useState<number | undefined>(undefined);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [pendingDayId, setPendingDayId] = useState<string>('');

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      let fileToUpload = file;

      // Convert PDF to image if necessary
      if (file.type === 'application/pdf') {
        try {
          fileToUpload = await pdfToImage(file);
        } catch (error) {
          console.error('PDF conversion error:', error);
          throw new Error('Failed to convert PDF. Please try uploading an image instead.');
        }
      }

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const response = await fetch('/api/extract-workout', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract workout');
      }

      const workoutData = await response.json();
      setNewWorkoutPlan(workoutData);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartDay = (dayId: string) => {
    const day = workoutPlan?.days.find(d => d.id === dayId);
    
    // Handle rest days differently
    if (day?.isRestDay) {
      if (confirm('Mark this rest day as complete?')) {
        handleCompleteSession(dayId, 'Rest day completed', 0);
      }
      return;
    }
    
    setPendingDayId(dayId);
    setShowStartDialog(true);
  };

  const handleConfirmStart = () => {
    setSelectedDayId(pendingDayId);
    setWorkoutStartTime(Date.now());
    setView('tracker');
    setShowStartDialog(false);
  };

  const handleBackToHome = () => {
    if (workoutStartTime) {
      if (confirm('End your workout session? Your progress will be lost unless you finish the workout.')) {
        setView('home');
        setWorkoutStartTime(undefined);
        handleResetSession(selectedDayId);
      }
    } else {
      setView('home');
    }
  };

  const handleNewWorkout = () => {
    if (confirm('Are you sure you want to upload a new workout? This will replace your current workout plan.')) {
      handleClearWorkout();
      setView('home');
      setWorkoutStartTime(undefined);
    }
  };

  const handleResetSessionConfirm = (dayId?: string) => {
    if (confirm('Are you sure you want to reset your current session? All progress will be lost.')) {
      handleResetSession(dayId);
    }
  };

  const handleCompleteWorkout = (dayId: string, notes?: string) => {
    // Calculate workout duration
    const duration = workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : undefined;
    handleCompleteSession(dayId, notes, duration);
    setWorkoutStartTime(undefined);
    setView('home');
  };

  if (workoutLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-blue-500 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {!workoutPlan ? (
        <>
          {/* Header for Upload View */}
          <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Workout Tracker
                </h1>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="text-center mb-8 max-w-2xl">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Transform Your Workout Plans
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Upload an image of your workout plan and we'll convert it into an interactive tracker
                  to help you monitor your progress, track sets and reps, and stay motivated.
                </p>
              </div>
              <UploadZone
                onUpload={handleUpload}
                isLoading={isUploading}
                error={uploadError}
              />
            </div>
          </main>
        </>
      ) : view === 'home' ? (
        <HomeView
          workoutPlan={workoutPlan}
          onStartDay={handleStartDay}
          onViewProgress={() => setView('progress')}
          onNewWorkout={handleNewWorkout}
        />
      ) : view === 'progress' ? (
        <ProgressView
          workoutPlan={workoutPlan}
          allWorkoutPlans={allWorkoutPlans}
          onBack={() => setView('home')}
          onSwitchPlan={(planId) => {
            handleSwitchPlan(planId);
            setView('home');
          }}
        />
      ) : (
        <WorkoutTracker
          workoutPlan={workoutPlan}
          selectedDayId={selectedDayId}
          workoutStartTime={workoutStartTime}
          onUpdateSet={handleUpdateSet}
          onUpdateNotes={handleUpdateNotes}
          onUpdateExerciseName={handleUpdateExerciseName}
          onUpdateWorkoutName={handleUpdateWorkoutName}
          onUpdateDayName={handleUpdateDayName}
          onCompleteSession={handleCompleteWorkout}
          onResetSession={handleResetSessionConfirm}
          onBackToHome={handleBackToHome}
          onViewProgress={() => setView('progress')}
        />
      )}

      {/* Start Workout Confirmation Dialog */}
      {showStartDialog && workoutPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Start Workout?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Begin your {workoutPlan.days.find(d => d.id === pendingDayId)?.name} workout session?
              We'll start tracking your workout time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmStart}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                Start Workout
              </button>
              <button
                onClick={() => setShowStartDialog(false)}
                className="px-6 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
