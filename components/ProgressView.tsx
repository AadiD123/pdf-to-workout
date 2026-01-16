"use client";

import { WorkoutPlan } from "@/types/workout";
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Timer,
  Trash2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { useAuth } from "@/components/AuthProvider";
import { useOtpSignIn } from "@/components/OtpSignInProvider";
import { supabase } from "@/lib/supabaseClient";
import { formatSecondsToDisplay } from "@/lib/timeUtils";

interface ProgressViewProps {
  workoutPlan: WorkoutPlan;
  allWorkoutPlans: WorkoutPlan[]; // All saved workout plans
  onBack: () => void;
  onSwitchPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onNewWorkout: () => void;
  onUpdateWorkoutName: (name: string) => void;
}

export default function ProgressView({
  workoutPlan,
  allWorkoutPlans,
  onBack,
  onSwitchPlan,
  onDeletePlan,
  onNewWorkout,
  onUpdateWorkoutName,
}: ProgressViewProps) {
  const { confirm, alert } = useDialog();
  const { user, isLoading: authLoading } = useAuth();
  const { requestOtpSignIn } = useOtpSignIn();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null
  );
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);
  const [planNameDraft, setPlanNameDraft] = useState(workoutPlan.name);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackPrice, setFeedbackPrice] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const sessions = workoutPlan.sessions;

  // Get days in the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group sessions by date
  const sessionsByDate = new Map<string, typeof sessions>();
  sessions.forEach((session) => {
    const dateKey = format(new Date(session.date), "yyyy-MM-dd");
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, []);
    }
    sessionsByDate.get(dateKey)!.push(session);
  });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "N/A";
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

  const ensureAuthenticated = async () => {
    if (authLoading) {
      await alert("Checking your login status. Please try again.");
      return false;
    }

    if (user) {
      return true;
    }

    const shouldLogin = await confirm(
      "You need to sign in with email to submit feedback.",
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

  const handleSubmitFeedback = async () => {
    setFeedbackError("");
    if (!(await ensureAuthenticated())) {
      return;
    }
    const trimmed = feedbackText.trim();
    if (!trimmed) {
      setFeedbackError("Please share a feature request or bug.");
      return;
    }
    if (!feedbackPrice) {
      setFeedbackError("Please select a pricing option.");
      return;
    }
    if (!user) return;

    setIsSubmittingFeedback(true);
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      plan_id: workoutPlan.id,
      message: trimmed,
      price_preference: feedbackPrice,
    });
    setIsSubmittingFeedback(false);

    if (error) {
      console.error("Failed to submit feedback:", error);
      setFeedbackError("Failed to submit feedback. Please try again.");
      return;
    }

    setFeedbackText("");
    setFeedbackPrice("");
    setShowFeedbackForm(false);
    await alert("Thanks for the feedback!");
  };

  useEffect(() => {
    setPlanNameDraft(workoutPlan.name);
    setIsEditingPlanName(false);
  }, [workoutPlan.id, workoutPlan.name]);

  // Handle escape key for modal
  useEffect(() => {
    if (!showFeedbackForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowFeedbackForm(false);
        setFeedbackError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFeedbackForm]);

  return (
    <div className="min-h-screen bg-[#101014] text-gray-100 pb-8">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-[#15151c]/80 backdrop-blur border-b border-[#242432]">
        <div className="flex p-4 justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] -ml-2 rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6 text-gray-200" />
            </button>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-gray-100 ml-2">
              Progress
            </h1>
          </div>

          <button
            onClick={() => setShowFeedbackForm(true)}
            className="min-h-[48px] px-6 rounded-xl border border-[#242432] bg-[#15151c] text-gray-200 font-semibold hover:bg-[#1f232b] transition-colors"
          >
            Suggestions
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 bg-[#15151c] border border-[#242432] rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">
              Total Workouts
            </p>
            <p className="text-2xl font-bold text-[#c6ff5e]">
              {sessions.length}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={onNewWorkout}
              className="w-full sm:w-auto min-h-[48px] px-6 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-lg font-semibold transition-colors"
            >
              Add New Workout Plan
            </button>
          </div>
        </div>

        {/* Current Plan Info */}
        <div className="bg-[#15151c] border border-[#242432] rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            {isEditingPlanName ? (
              <div className="flex-1">
                <input
                  value={planNameDraft}
                  onChange={(event) => setPlanNameDraft(event.target.value)}
                  className="w-full px-3 py-2 text-base border border-[#2a2f3a] rounded-lg bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                  placeholder="Plan name"
                />
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-gray-100">
                {workoutPlan.name}
              </h2>
            )}
            {isEditingPlanName ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPlanNameDraft(workoutPlan.name);
                    setIsEditingPlanName(false);
                  }}
                  className="min-h-[36px] px-3 rounded-lg border border-[#2a2f3a] text-xs text-gray-300 hover:bg-[#1f232b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const nextName = planNameDraft.trim();
                    if (!nextName) return;
                    onUpdateWorkoutName(nextName);
                    setIsEditingPlanName(false);
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-[#c6ff5e] text-black text-xs font-semibold hover:bg-[#b6f54e] transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingPlanName(true)}
                className="min-h-[36px] px-3 rounded-lg border border-[#2a2f3a] text-xs text-gray-300 hover:bg-[#1f232b] transition-colors"
              >
                Edit name
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Uploaded {format(new Date(workoutPlan.uploadedAt), "MMM d, yyyy")}
          </p>
        </div>

        {/* All Workout Plans */}
        {allWorkoutPlans.length > 1 && (
          <div className="bg-[#15151c] border border-[#242432] rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Your Workout Plans
            </h2>
            <div className="space-y-3">
              {allWorkoutPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    plan.id === workoutPlan.id
                      ? "border-[#c6ff5e] bg-[#1a2216]"
                      : "border-[#242432] bg-[#11141b]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-100">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {plan.sessions.length} workout
                        {plan.sessions.length !== 1 ? "s" : ""} •{" "}
                        {plan.days.length} day
                        {plan.days.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {plan.id !== workoutPlan.id && (
                        <button
                          onClick={() => onSwitchPlan(plan.id)}
                          className="px-3 py-1.5 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Follow
                        </button>
                      )}
                      {plan.id === workoutPlan.id && (
                        <div className="px-3 py-1.5 bg-[#1a2216] text-[#c6ff5e] text-xs font-semibold rounded-lg border border-[#2a3a2b]">
                          Active
                        </div>
                      )}
                      <button
                        onClick={() => {
                          (async () => {
                            if (
                              await confirm(
                                `Delete "${plan.name}"? This will permanently remove all workout history.`
                              )
                            ) {
                              onDeletePlan(plan.id);
                            }
                          })();
                        }}
                        className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex items-center justify-center"
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
        <div className="bg-[#15151c] border border-[#242432] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              Workout Calendar
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(
                      selectedMonth.getFullYear(),
                      selectedMonth.getMonth() - 1
                    )
                  )
                }
                className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#1f232b] flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5 rotate-90 text-gray-300" />
              </button>
              <span className="text-sm font-semibold text-gray-100 min-w-[120px] text-center">
                {format(selectedMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(
                      selectedMonth.getFullYear(),
                      selectedMonth.getMonth() + 1
                    )
                  )
                }
                className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#1f232b] flex items-center justify-center"
              >
                <ChevronUp className="w-5 h-5 rotate-90 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-500 py-2"
              >
                {day}
              </div>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDate.get(dateKey) || [];
              const hasWorkout = daySessions.length > 0;
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square p-1 rounded-lg transition-colors ${
                    hasWorkout
                      ? "bg-[#1a2216] border border-[#2a3a2b]"
                      : isToday
                      ? "bg-[#10161f] border border-[#1f3440]"
                      : ""
                  }`}
                >
                  <div
                    className={`text-center text-sm ${
                      hasWorkout
                        ? "font-bold text-[#c6ff5e]"
                        : isToday
                        ? "font-semibold text-[#c6ff5e]"
                        : "text-gray-300"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {hasWorkout && (
                    <div className="flex justify-center mt-0.5">
                      <div className="w-1 h-1 rounded-full bg-[#c6ff5e]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout Sessions List */}
        <div className="bg-[#15151c] border border-[#242432] rounded-xl p-4">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Workout History
          </h2>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Dumbbell className="w-16 h-16 mx-auto mb-3 opacity-30 text-[#c6ff5e]" />
              <p className="font-medium">No workouts yet</p>
              <p className="text-sm mt-1">
                Complete your first workout to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((session) => {
                  const isExpanded = expandedSessionId === session.id;
                  const totalSets = session.completedExercises.reduce(
                    (acc, ex) => acc + ex.sets.length,
                    0
                  );

                  return (
                    <div
                      key={session.id}
                      className="rounded-lg bg-[#11141b] border border-[#242432] overflow-hidden"
                    >
                      {/* Session Header */}
                      <button
                        onClick={() => toggleSessionExpand(session.id)}
                        className="w-full p-4 text-left hover:bg-[#1f232b] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-100">
                              {session.dayName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(
                                new Date(session.date),
                                "EEEE, MMM d, yyyy • h:mm a"
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.duration && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3 text-[#c6ff5e]" />
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

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {session.completedExercises.length} exercise
                            {session.completedExercises.length !== 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span>
                            {totalSets} set{totalSets !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>

                      {/* Expanded Exercise Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-[#242432] pt-3">
                          {session.completedExercises.map((exercise) => (
                            <div
                              key={exercise.id}
                              className="bg-[#15151c] border border-[#242432] rounded-lg p-3"
                            >
                              <h4 className="font-semibold text-gray-100 mb-2">
                                {exercise.name}
                              </h4>

                              {/* Sets Table */}
                              <div className="space-y-1">
                                {exercise.sets.map((set) => {
                                  const isTimeBased =
                                    set.duration !== undefined &&
                                    set.duration > 0;

                                  return (
                                    <div
                                      key={set.setNumber}
                                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-[#11141b]"
                                    >
                                      <span className="text-gray-500 font-medium">
                                        Set {set.setNumber}
                                      </span>
                                      <div className="flex items-center gap-4">
                                        {set.weight && set.weight > 0 && (
                                          <span className="text-gray-300">
                                            {set.weight} lbs
                                          </span>
                                        )}
                                        <span className="text-gray-300">
                                          {isTimeBased ? (
                                            <>
                                              <Timer className="w-3 h-3 inline mr-1 -mt-0.5 text-[#c6ff5e]" />
                                              {formatSecondsToDisplay(
                                                set.duration || 0
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              {set.reps} rep
                                              {set.reps !== 1 ? "s" : ""}
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {exercise.notes && (
                                <p className="mt-2 text-xs text-gray-500 italic">
                                  Note: {exercise.notes}
                                </p>
                              )}
                            </div>
                          ))}

                          {session.notes && (
                            <div className="bg-[#10161f] border border-[#1f3440] rounded-lg p-3">
                              <p className="text-sm text-gray-300">
                                <span className="font-semibold text-[#c6ff5e]">
                                  Workout Notes:
                                </span>{" "}
                                {session.notes}
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

      {/* Suggestions Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#242432] bg-[#15151c] p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                Help Shape the Future of LiftLeap
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                We build what matters most to you. To help us prioritize this
                feature, tell us what a fully-powered LiftLeap is worth to you.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Features you want or bugs you found:
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[#2a2f3a] bg-[#0f1218] p-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  I would happily pay:
                </label>
                <select
                  value={feedbackPrice}
                  onChange={(event) => setFeedbackPrice(event.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#2a2f3a] bg-[#0f1218] p-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent"
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="$2/mo">$2/mo</option>
                  <option value="$6/mo">$6/mo</option>
                  <option value="$10/mo">$10/mo</option>
                  <option value="$50 Lifetime">$50 Lifetime</option>
                  <option value="$99 Lifetime">$99 Lifetime</option>
                </select>
              </div>
              {feedbackError && (
                <p className="text-sm text-red-300">{feedbackError}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-6">
              <button
                onClick={() => {
                  setShowFeedbackForm(false);
                  setFeedbackError("");
                }}
                className="min-h-[44px] rounded-xl border border-[#242432] bg-[#1f232b] px-5 py-2 text-gray-200 font-semibold hover:bg-[#2a2f3a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback}
                className="min-h-[44px] rounded-xl bg-[#c6ff5e] px-5 py-2 text-black font-semibold hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingFeedback ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
