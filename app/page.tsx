"use client";

import { useState } from "react";
import { useWorkout } from "@/hooks/useWorkout";
import UploadZone, { ManualPlanPayload } from "@/components/UploadZone";
import WorkoutTracker from "@/components/WorkoutTracker";
import ProgressView from "@/components/ProgressView";
import HomeView from "@/components/HomeView";
import InstallPrompt from "@/components/InstallPrompt";
import { pdfToImage } from "@/lib/pdfToImage";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
    handleSwitchPlan,
    handleDeletePlan,
    handleAddDay,
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

  const handleUpload = async (file: File) => {
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
    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await fetch("/api/extract-workout", {
        method: "POST",
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

  const handleManualCreate = (payload: ManualPlanPayload) => {
    const now = Date.now();
    const sanitizedDays = payload.days.map((day, dayIndex) => {
      const exercises = day.isRestDay
        ? []
        : day.exercises
            .filter((exercise) => exercise.name.trim())
            .map((exercise, exerciseIndex) => ({
              id: `exercise-${now}-${dayIndex}-${exerciseIndex}`,
              name: exercise.name.trim(),
              sets: Math.max(1, parseInt(exercise.sets, 10) || 1),
              type: exercise.type,
              reps:
                exercise.reps.trim() ||
                (exercise.type === "time" ? "60 sec" : "10"),
              weight: exercise.weight.trim() || undefined,
              restTime: exercise.restTime.trim() || undefined,
              notes: "",
              completed: false,
              completedSets: [],
            }));

      return {
        id: `day-${now}-${dayIndex}`,
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        isRestDay: day.isRestDay,
        exercises,
      };
    });

    const newPlan = {
      id: `plan-${now}`,
      name: payload.planName,
      uploadedAt: new Date().toISOString(),
      days: sanitizedDays,
      sessions: [],
    };

    setNewWorkoutPlan(newPlan);
    setUploadError("");
    setView("home");
  };

  const handleStartDay = (dayId: string) => {
    const day = workoutPlan?.days.find((d) => d.id === dayId);

    // Handle rest days differently
    if (day?.isRestDay) {
      if (confirm("Mark this rest day as complete?")) {
        handleCompleteSession(dayId, "Rest day completed", 0);
      }
      return;
    }

    setPendingDayId(dayId);
    setShowStartDialog(true);
  };

  const handleConfirmStart = () => {
    setSelectedDayId(pendingDayId);
    setWorkoutStartTime(Date.now());
    setView("tracker");
    setShowStartDialog(false);
  };

  const handleBackToHome = () => {
    if (workoutStartTime) {
      if (
        confirm(
          "End your workout session? Your progress will be lost unless you finish the workout."
        )
      ) {
        setView("home");
        setWorkoutStartTime(undefined);
        handleResetSession(selectedDayId);
      }
    } else {
      setView("home");
    }
  };

  const handleNewWorkout = () => {
    if (
      confirm(
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

  const handleResetSessionConfirm = (dayId?: string) => {
    if (
      confirm(
        "Are you sure you want to reset your current session? All progress will be lost."
      )
    ) {
      handleResetSession(dayId);
    }
  };

  const handleAddWorkoutDay = () => {
    const dayName = prompt(
      "Day name:",
      "Day " + ((workoutPlan?.days.length ?? 0) + 1)
    );
    if (!dayName || !dayName.trim()) return;

    const isRestDay = confirm("Is this a rest day? (OK = Yes, Cancel = No)");

    handleAddDay({
      id: `day-${Date.now()}`,
      name: dayName.trim(),
      isRestDay,
      exercises: [],
    });
  };

  const handleCompleteWorkout = (dayId: string, notes?: string) => {
    // Calculate workout duration
    const duration = workoutStartTime
      ? Math.floor((Date.now() - workoutStartTime) / 1000)
      : undefined;
    handleCompleteSession(dayId, notes, duration);
    setWorkoutStartTime(undefined);
    setView("home");
  };

  const viewTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.2 },
  };

  if (workoutLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101014] text-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-[#c6ff5e] animate-pulse" />
          <p className="text-gray-400">Loading...</p>
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
                  <h1 className="text-2xl font-extrabold uppercase tracking-tight text-gray-100">
                    {allWorkoutPlans.length > 0
                      ? "Upload New Plan"
                      : "Workout Tracker"}
                  </h1>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-8">
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                <div className="text-center mb-8 max-w-2xl">
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-gray-100 mb-4">
                    Transform Your Workout Plans
                  </h2>
                  <p className="text-lg text-gray-400">
                    Upload an image, paste text, or add a PDF of your workout
                    plan and we'll convert it into an interactive tracker to
                    help you monitor your progress, track sets and reps, and
                    stay motivated.
                  </p>
                </div>
                <UploadZone
                  onUpload={handleUpload}
                  onTextSubmit={handleTextSubmit}
                  onManualCreate={handleManualCreate}
                  isLoading={isUploading}
                  error={uploadError}
                />
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
            />
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
            />
          </motion.div>
        ) : (
          <motion.div key="tracker" {...viewTransition} layout>
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
              onViewProgress={() => setView("progress")}
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
