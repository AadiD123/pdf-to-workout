"use client";

import { useEffect, useState, useCallback } from "react";
import { useWorkout } from "@/hooks/useWorkout";
import { useDialog } from "@/components/DialogProvider";
import { useAuth } from "@/components/AuthProvider";
import { useOtpSignIn } from "@/components/OtpSignInProvider";
import UploadZone from "@/components/UploadZone";
import WorkoutTracker from "@/components/WorkoutTracker";
import ProgressView from "@/components/ProgressView";
import HomeView from "@/components/HomeView";
import InstallPrompt from "@/components/InstallPrompt";
import { pdfToImage } from "@/lib/pdfToImage";
import { Dumbbell, ArrowLeft, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { WorkoutPlan } from "@/types/workout";
import {
  saveActiveWorkoutState,
  loadActiveWorkoutState,
  clearActiveWorkoutState,
  ActiveWorkoutState,
} from "@/lib/localStorage";

export default function Home() {
  const { confirm, alert, prompt } = useDialog();
  const { user, isLoading: authLoading, getAccessToken, signOut } = useAuth();
  const { requestOtpSignIn } = useOtpSignIn();
  const {
    workoutPlan,
    allWorkoutPlans,
    isLoading: workoutLoading,
    setNewWorkoutPlan,
    handleUpdateSet,
    handleUpdateNotes,
    handleUpdateExerciseName,
    handleUpdateExercise,
    handleUpdateWorkoutName,
    handleUpdateDayName,
    handleCompleteSession,
    handleReplaceWorkoutPlan,
    handleResetSession,
    handleClearWorkout,
    handleSwitchPlan,
    handleDeletePlan,
    handleAddDay,
    handleReorderDays,
    handleDeleteDay,
    handleDeleteAllData,
    handleAddExercise,
    handleDeleteExercise,
    handleAddSet,
    handleDeleteSet,
  } = useWorkout();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [view, setView] = useState<"home" | "tracker" | "progress">("home");
  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const [workoutStartTime, setWorkoutStartTime] = useState<number | undefined>(
    undefined
  );
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [pendingDayId, setPendingDayId] = useState<string>("");
  const [activeWorkoutDuration, setActiveWorkoutDuration] = useState(0);
  const [workoutPlanSnapshot, setWorkoutPlanSnapshot] =
    useState<WorkoutPlan | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [restTimerState, setRestTimerState] = useState<ActiveWorkoutState['restTimer'] | undefined>(undefined);
  const [isRestoringWorkout, setIsRestoringWorkout] = useState(false);

  const clonePlan = (plan: WorkoutPlan): WorkoutPlan =>
    JSON.parse(JSON.stringify(plan)) as WorkoutPlan;

  const getPlanSignature = (plan: WorkoutPlan) =>
    JSON.stringify({
      id: plan.id,
      name: plan.name,
      uploadedAt: plan.uploadedAt,
      days: plan.days.map((day) => ({
        id: day.id,
        name: day.name,
        isRestDay: day.isRestDay,
        exercises: day.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          type: exercise.type,
          reps: exercise.reps,
          weight: exercise.weight ?? "",
          restTime: exercise.restTime ?? "",
          targetNotes: exercise.targetNotes ?? "",
          notes: exercise.notes ?? "",
        })),
      })),
    });

  const ensureAuthenticated = async () => {
    if (authLoading) {
      await alert("Checking your login status. Please try again.");
      return false;
    }

    if (user) {
      return true;
    }

    const shouldLogin = await confirm(
      "You need to sign in with email to generate a workout plan.",
      {
        title: "Login required",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
      }
    );

    if (shouldLogin) {
      return await requestOtpSignIn();
    }

    return false;
  };

  const getAuthHeader = async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Missing auth token. Please sign in again.");
    }
    return { Authorization: `Bearer ${token}` };
  };

  const handleUpload = async (file: File) => {
    if (!(await ensureAuthenticated())) {
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      let fileToUpload = file;

      // Convert PDF to image if necessary
      if (file.type === "application/pdf") {
        try {
          fileToUpload = await pdfToImage(file);
        } catch (error) {
          console.error("PDF conversion error:", error);
          throw new Error(
            "Failed to convert PDF. Please try uploading an image instead."
          );
        }
      }

      const formData = new FormData();
      formData.append("image", fileToUpload);

      const response = await fetch("/api/extract-workout", {
        method: "POST",
        headers: await getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract workout");
      }

      const workoutData = await response.json();
      setNewWorkoutPlan(workoutData);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to process file"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    if (!(await ensureAuthenticated())) {
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await fetch("/api/extract-workout", {
        method: "POST",
        headers: await getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract workout");
      }

      const workoutData = await response.json();
      setNewWorkoutPlan(workoutData);
    } catch (error) {
      console.error("Text submission error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to process text"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleBuildManualPlan = async () => {
    if (!(await ensureAuthenticated())) {
      return;
    }

    const now = Date.now();
    const newPlan = {
      id: `plan-${now}`,
      name: "Build as You Go",
      uploadedAt: new Date().toISOString(),
      days: [
        {
          id: `day-${now}`,
          name: "Day 1",
          isRestDay: false,
          exercises: [],
        },
      ],
      sessions: [],
    };

    setNewWorkoutPlan(newPlan);
    setUploadError("");
    setView("home");
  };

  const handleStartDay = async (dayId: string) => {
    if (workoutStartTime) {
      if (dayId === selectedDayId) {
        setView("tracker");
        return;
      }
      await alert(
        "A workout is already active. Resume it or finish it before starting a new one."
      );
      return;
    }

    const day = workoutPlan?.days.find((d) => d.id === dayId);

    // Handle rest days differently
    if (day?.isRestDay) {
      if (await confirm("Mark this rest day as complete?")) {
        handleCompleteSession(dayId, "Rest day completed", 0);
      }
      return;
    }

    setPendingDayId(dayId);
    setShowStartDialog(true);
  };

  const handleConfirmStart = () => {
    const startTime = Date.now();
    setSelectedDayId(pendingDayId);
    setWorkoutStartTime(startTime);
    if (workoutPlan) {
      setWorkoutPlanSnapshot(clonePlan(workoutPlan));
      // Save active workout state
      saveActiveWorkoutState({
        planId: workoutPlan.id,
        dayId: pendingDayId,
        startTime,
        workoutPlan: clonePlan(workoutPlan),
      });
    }
    setView("tracker");
    setShowStartDialog(false);
  };

  const handleBackToHome = () => {
    setView("home");
  };

  const handleDiscardWorkout = async () => {
    if (
      await confirm("Discard this workout? All your progress will be lost.")
    ) {
      setView("home");
      setWorkoutStartTime(undefined);
      setWorkoutPlanSnapshot(null);
      setRestTimerState(undefined);
      clearActiveWorkoutState();
      handleResetSession(selectedDayId);
    }
  };

  const handleNewWorkout = async () => {
    if (
      await confirm(
        "Upload a new workout plan? You can always switch back to your existing plans later."
      )
    ) {
      handleClearWorkout();
      setView("home");
      setWorkoutStartTime(undefined);
    }
  };

  const handleCancelUpload = () => {
    // If there are existing plans, switch back to the most recent one
    if (allWorkoutPlans.length > 0) {
      const mostRecentPlan = allWorkoutPlans[allWorkoutPlans.length - 1];
      handleSwitchPlan(mostRecentPlan.id);
      setView("home");
    }
  };

  const handleResetSessionConfirm = async (dayId?: string) => {
    if (
      await confirm(
        "Are you sure you want to reset your current session? All progress will be lost."
      )
    ) {
      handleResetSession(dayId);
    }
  };

  const handleAddWorkoutDay = (dayName: string, isRestDay: boolean) => {
    handleAddDay({
      id: `day-${Date.now()}`,
      name: dayName.trim(),
      isRestDay,
      exercises: [],
    });
  };

  const handleLogOut = async () => {
    if (await confirm("Are you sure you want to log out?")) {
      await signOut();
    }
  };

  const handleCompleteWorkout = async (dayId: string, notes?: string) => {
    const duration = workoutStartTime
      ? Math.floor((Date.now() - workoutStartTime) / 1000)
      : undefined;

    const snapshot = workoutPlanSnapshot;
    const currentPlan = workoutPlan;
    const hasEdits =
      snapshot &&
      currentPlan &&
      getPlanSignature(snapshot) !== getPlanSignature(currentPlan);

    let shouldSaveEdits = true;
    if (hasEdits) {
      shouldSaveEdits = await confirm(
        "You edited this workout. Save these edits to your plan?",
        {
          title: "Save workout edits",
          confirmLabel: "Save edits",
          cancelLabel: "One-time only",
        }
      );
    }

    const updatedPlan = await handleCompleteSession(dayId, notes, duration);

    if (!shouldSaveEdits && snapshot && updatedPlan) {
      const restoredPlan = clonePlan(snapshot);
      restoredPlan.sessions = updatedPlan.sessions;
      await handleReplaceWorkoutPlan(restoredPlan);
    }

    setWorkoutStartTime(undefined);
    setWorkoutPlanSnapshot(null);
    setRestTimerState(undefined);
    clearActiveWorkoutState();
    setView("home");
  };

  useEffect(() => {
    if (!workoutStartTime) {
      setActiveWorkoutDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveWorkoutDuration(
        Math.floor((Date.now() - workoutStartTime) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
  }, []);

  // Restore active workout state on mount
  const restoreWorkoutState = useCallback(async () => {
    if (workoutLoading || !workoutPlan) return;
    
    const activeState = loadActiveWorkoutState();
    if (activeState && activeState.planId === workoutPlan.id && !isRestoringWorkout) {
      setIsRestoringWorkout(true);
      
      // Restore workout state
      setSelectedDayId(activeState.dayId);
      setWorkoutStartTime(activeState.startTime);
      setWorkoutPlanSnapshot(clonePlan(activeState.workoutPlan));
      
      // Use the saved workout plan directly to restore progress
      await handleReplaceWorkoutPlan(activeState.workoutPlan);
      
      // Restore rest timer if it was active
      if (activeState.restTimer) {
        const { startedAt, isRunning, timeLeft, targetTime } = activeState.restTimer;
        if (isRunning) {
          // Calculate elapsed time since timer was saved
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const newTimeLeft = Math.max(0, timeLeft - elapsed);
          
          setRestTimerState({
            ...activeState.restTimer,
            timeLeft: newTimeLeft,
            isRunning: newTimeLeft > 0,
          });
        } else {
          setRestTimerState(activeState.restTimer);
        }
      }
      
      setView("tracker");
      setIsRestoringWorkout(false);
    }
  }, [workoutLoading, workoutPlan?.id, isRestoringWorkout, handleReplaceWorkoutPlan]);

  useEffect(() => {
    void restoreWorkoutState();
  }, [restoreWorkoutState]);

  // Persist workout state whenever it changes
  useEffect(() => {
    if (!workoutPlan || !workoutStartTime || !selectedDayId) return;
    
    const state: ActiveWorkoutState = {
      planId: workoutPlan.id,
      dayId: selectedDayId,
      startTime: workoutStartTime,
      workoutPlan: clonePlan(workoutPlan),
      restTimer: restTimerState,
    };
    
    saveActiveWorkoutState(state);
  }, [workoutPlan, workoutStartTime, selectedDayId, restTimerState]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const viewTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.2 },
  };

  if (workoutLoading || isRestoringWorkout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101014] text-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-[#c6ff5e] animate-pulse" />
          <p className="text-gray-400">
            {isRestoringWorkout ? "Restoring your workout..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101014] text-gray-100">
      <AnimatePresence mode="wait">
        {!workoutPlan ? (
          <motion.div key="upload" {...viewTransition} layout>
            {/* Header for Upload View */}
            <header className="border-b border-[#242432] bg-[#15151c]/80 backdrop-blur">
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {allWorkoutPlans.length > 0 && (
                    <button
                      onClick={handleCancelUpload}
                      className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] transition-colors"
                      title="Back to home"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                  )}
                  <Dumbbell className="w-8 h-8 text-[#c6ff5e]" />
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-extrabold uppercase tracking-tight text-gray-100">
                      {allWorkoutPlans.length > 0
                        ? "Upload New Plan"
                        : "LiftLeap"}
                    </h1>
                    <span className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] rounded-full border border-[#2a3a2b] bg-[#1a2216] text-[#c6ff5e]">
                      Beta
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => {
                        const message = isStandalone
                          ? "This app is already installed on your device."
                          : isIOS
                          ? 'To install: open Safari, tap Share, then "Add to Home Screen".'
                          : 'Open your browser menu and choose "Install app" or "Add to Home screen".';
                        void alert(message, {
                          title: "Install this app",
                          confirmLabel: "Got it",
                        });
                      }}
                      className="min-w-[40px] min-h-[40px] rounded-lg border border-[#242432] bg-[#15151c] text-gray-300 hover:bg-[#1f232b] transition-colors flex items-center justify-center"
                      title="Install app"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {user ? (
                      <span className="text-xs text-gray-400">Signed in</span>
                    ) : (
                      <button
                        onClick={async () => {
                          await requestOtpSignIn();
                        }}
                        className="min-h-[40px] px-4 rounded-lg bg-[#1f232b] border border-[#242432] text-gray-200 transition-colors text-xs font-semibold hover:bg-[#2a2f3a]"
                      >
                        Sign in with email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="h-[calc(100vh-80px)] sm:h-auto sm:min-h-[calc(100vh-100px)] overflow-hidden sm:overflow-visible">
              <div className="h-full flex flex-col sm:py-12">
                <UploadZone
                  onUpload={handleUpload}
                  onTextSubmit={handleTextSubmit}
                  onRequireAuth={ensureAuthenticated}
                  onGeneratePlan={async (promptText, daysPerWeek) => {
                    if (!(await ensureAuthenticated())) {
                      return;
                    }
                    setIsUploading(true);
                    setUploadError("");
                    try {
                      const response = await fetch("/api/generate-workout", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(await getAuthHeader()),
                        },
                        body: JSON.stringify({
                          prompt: promptText,
                          daysPerWeek,
                        }),
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(
                          error.error || "Failed to generate workout plan"
                        );
                      }
                      const workoutData = await response.json();
                      setNewWorkoutPlan(workoutData);
                    } catch (error) {
                      console.error("Generate plan error:", error);
                      setUploadError(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate workout plan"
                      );
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  isLoading={isUploading}
                  error={uploadError}
                />
                
                {/* Build Manually Button */}
                {!isUploading && (
                  <div className="mt-6 sm:mt-8 mb-4 sm:mb-0 flex flex-col items-center gap-3 px-4">
                    <div className="flex items-center gap-3 w-full max-w-xs">
                      <div className="flex-1 h-px bg-[#242432]"></div>
                      <span className="text-xs uppercase tracking-wider text-gray-500">
                        or
                      </span>
                      <div className="flex-1 h-px bg-[#242432]"></div>
                    </div>
                    <button
                      onClick={handleBuildManualPlan}
                      disabled={isUploading}
                      className="min-h-[48px] px-6 rounded-xl border border-[#2a2f3a] bg-[#15151c] text-gray-300 font-semibold hover:bg-[#1f232b] hover:text-gray-100 hover:border-[#3a3f4a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Build manually as you go
                    </button>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        ) : view === "home" ? (
          <motion.div key="home" {...viewTransition} layout>
            <HomeView
              workoutPlan={workoutPlan}
              onStartDay={handleStartDay}
              onViewProgress={() => setView("progress")}
              onNewWorkout={handleNewWorkout}
              onAddDay={handleAddWorkoutDay}
              onReorderDays={handleReorderDays}
              onDeleteDay={handleDeleteDay}
              onLogOut={handleLogOut}
            />
            {workoutStartTime && workoutPlan && (
              <div className="fixed bottom-0 left-0 right-0 z-30">
                <div className="mx-4 mb-4 rounded-2xl border border-[#2a2f3a] bg-[#12151c]/95 backdrop-blur px-4 py-3 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                        Active workout
                      </p>
                      <p className="text-sm font-semibold text-gray-100 truncate">
                        {workoutPlan.days.find((d) => d.id === selectedDayId)
                          ?.name ?? "Current session"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#c6ff5e] font-semibold">
                        {formatDuration(activeWorkoutDuration)}
                      </span>
                      <button
                        onClick={() => setView("tracker")}
                        className="min-h-[36px] px-3 rounded-lg bg-[#c6ff5e] text-black text-xs font-semibold hover:bg-[#b6f54e]"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : view === "progress" ? (
          <motion.div key="progress" {...viewTransition} layout>
            <ProgressView
              workoutPlan={workoutPlan}
              allWorkoutPlans={allWorkoutPlans}
              onBack={() => setView("home")}
              onSwitchPlan={(planId) => {
                handleSwitchPlan(planId);
                setView("home");
              }}
              onDeletePlan={handleDeletePlan}
              onNewWorkout={handleNewWorkout}
              onUpdateWorkoutName={handleUpdateWorkoutName}
            />
          </motion.div>
        ) : (
          <motion.div key="tracker" {...viewTransition} layout>
            <WorkoutTracker
              workoutPlan={workoutPlan}
              selectedDayId={selectedDayId}
              workoutStartTime={workoutStartTime}
              restoredRestTimer={restTimerState}
              onUpdateSet={handleUpdateSet}
              onUpdateNotes={handleUpdateNotes}
              onUpdateExerciseName={handleUpdateExerciseName}
              onUpdateExercise={handleUpdateExercise}
              onUpdateWorkoutName={handleUpdateWorkoutName}
              onUpdateDayName={handleUpdateDayName}
              onCompleteSession={handleCompleteWorkout}
              onResetSession={handleResetSessionConfirm}
              onBackToHome={handleBackToHome}
              onDiscardWorkout={handleDiscardWorkout}
              onViewProgress={() => setView("progress")}
              onRestTimerChange={setRestTimerState}
              onAddExercise={handleAddExercise}
              onDeleteExercise={handleDeleteExercise}
              onAddSet={handleAddSet}
              onDeleteSet={handleDeleteSet}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Workout Confirmation Dialog */}
      {showStartDialog && workoutPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#15151c] rounded-2xl p-6 max-w-sm w-full border border-[#242432]">
            <h2 className="text-2xl font-bold text-gray-100 mb-3">
              Start Workout?
            </h2>
            <p className="text-gray-400 mb-6">
              Begin your{" "}
              {workoutPlan.days.find((d) => d.id === pendingDayId)?.name}{" "}
              workout session?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmStart}
                className="flex-1 min-h-[48px] py-4 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-xl font-semibold transition-colors"
              >
                Start Workout
              </button>
              <button
                onClick={() => setShowStartDialog(false)}
                className="px-6 py-4 min-h-[48px] bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 rounded-xl font-medium transition-colors"
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
