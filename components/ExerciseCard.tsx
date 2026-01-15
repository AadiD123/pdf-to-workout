"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { useDialog } from "@/components/DialogProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  Check,
  X,
  Timer,
  Plus,
  RefreshCw,
  Calculator,
  MoreVertical,
} from "lucide-react";
import { Exercise, SetRecord } from "@/types/workout";
import { parseTimeToSeconds, formatSecondsToTime } from "@/lib/timeUtils";
import {
  calculatePlates,
  formatPlateResult,
  getBarbellWeight,
  getPlateConfiguration,
} from "@/lib/plateCalculator";

interface SwipeableRowProps {
  children: ReactNode;
  isSwiped: boolean;
  onSwipe: () => void;
  onSwipeCancel: () => void;
  canDelete: boolean;
}

function SwipeableRow({
  children,
  isSwiped,
  onSwipe,
  onSwipeCancel,
  canDelete,
}: SwipeableRowProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canDelete) return;
    setTouchStart(e.touches[0].clientX);
    setTouchCurrent(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canDelete || touchStart === null) return;
    setTouchCurrent(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!canDelete || touchStart === null || touchCurrent === null) {
      setTouchStart(null);
      setTouchCurrent(null);
      return;
    }

    const diff = touchStart - touchCurrent;

    if (diff > 80) {
      // Swiped left - show delete
      onSwipe();
    } else if (diff < -20 && isSwiped) {
      // Swiped right - cancel delete
      onSwipeCancel();
    } else if (Math.abs(diff) < 10 && isSwiped) {
      // Tap - cancel delete
      onSwipeCancel();
    }

    setTouchStart(null);
    setTouchCurrent(null);
  };

  const getTranslateX = () => {
    if (isSwiped) return -80;
    if (touchStart !== null && touchCurrent !== null) {
      const diff = touchStart - touchCurrent;
      return Math.min(0, -diff);
    }
    return 0;
  };

  return (
    <div
      ref={rowRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
      style={{
        transform: `translateX(${getTranslateX()}px)`,
        transition: touchStart === null ? "transform 0.3s ease-out" : "none",
      }}
    >
      {children}
    </div>
  );
}

interface ExerciseAlternative {
  name: string;
  reason: string;
  equipment: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onUpdateSet: (setNumber: number, updates: Partial<SetRecord>) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateExerciseName: (name: string) => void;
  onUpdateExercise: (updates: Partial<Exercise>) => void;
  onAddSet?: () => void;
  onDeleteSet?: (setNumber: number) => void;
  onDeleteExercise?: () => void;
  canDeleteExercise?: boolean;
  isRestTimerActive?: boolean;
  onRestTimerActiveChange?: (isActive: boolean, restTime?: string) => void;
}

export default function ExerciseCard({
  exercise,
  onUpdateSet,
  onUpdateNotes,
  onUpdateExerciseName,
  onUpdateExercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  canDeleteExercise = false,
  isRestTimerActive = false,
  onRestTimerActiveChange,
}: ExerciseCardProps) {
  const { alert, confirm, prompt } = useDialog();
  const {
    user,
    isLoading: authLoading,
    signInWithEmailOtp,
    getAccessToken,
  } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(exercise.name);
  const [shouldAutoStartTimer, setShouldAutoStartTimer] = useState(false);
  const [swipedSetNumber, setSwipedSetNumber] = useState<number | null>(null);
  const [showSubstituteDialog, setShowSubstituteDialog] = useState(false);
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [editingSetType, setEditingSetType] = useState<number | null>(null);
  const [setTypeMenuPosition, setSetTypeMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const setTypeMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (editingSetType === null) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!setTypeMenuRef.current) return;
      if (setTypeMenuRef.current.contains(event.target as Node)) return;
      setEditingSetType(null);
    };
    const handleScroll = () => {
      setEditingSetType(null);
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [editingSetType]);

  useEffect(() => {
    if (!showActionMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current) return;
      if (actionMenuRef.current.contains(event.target as Node)) return;
      setShowActionMenu(false);
    };
    const handleScroll = () => {
      setShowActionMenu(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showActionMenu]);

  const completedSetsCount = exercise.completedSets.filter(
    (s) => s.completed
  ).length;

  const getSetRecord = (setNumber: number): SetRecord | undefined => {
    return exercise.completedSets.find((s) => s.setNumber === setNumber);
  };

  const getSetType = (setRecord?: SetRecord) => setRecord?.setType ?? "normal";
  const getSetTypeLabel = (setType: SetRecord["setType"]) => {
    switch (setType) {
      case "warmup":
        return "W";
      case "failure":
        return "F";
      case "drop":
        return "D";
      case "normal":
      default:
        return "";
    }
  };
  const getSetTypeClassName = (setType: SetRecord["setType"]) => {
    switch (setType) {
      case "warmup":
        return "text-blue-300";
      case "failure":
        return "text-red-400";
      case "drop":
        return "text-purple-300";
      default:
        return "text-gray-500";
    }
  };

  // Parse target reps - handle ranges like "8-12" or single values like "10"
  const getTargetReps = (): string => {
    if (typeof exercise.reps !== "string" || !exercise.reps) return "";
    // If it's a range, take the lower number as default
    const match = exercise.reps.match(/^(\d+)/);
    return match ? match[1] : exercise.reps;
  };

  // Parse target duration for time-based exercises
  const getTargetDuration = (): number => {
    if (typeof exercise.reps !== "string" || !exercise.reps) return 0;
    return parseTimeToSeconds(exercise.reps);
  };

  // Parse target weight - extract number from string like "135 lbs" or "60kg"
  const getTargetWeight = (): string => {
    if (!exercise.weight) return "";
    if (/rpe/i.test(exercise.weight)) return "";
    const match = exercise.weight.match(/(\d+(?:\.\d+)?)/);
    return match ? match[1] : "";
  };

  const formatRestTime = (value?: string) => {
    if (!value) return "";
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return `${numeric} sec`;
    }
    const rangeMatch = value.match(/(\d+)\s*[-–]\s*\d+/);
    if (rangeMatch) {
      return `${rangeMatch[1]} sec`;
    }
    return value;
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
      "You need to sign in with email to use exercise substitutes.",
      {
        title: "Login required",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
      }
    );

    if (shouldLogin) {
      const email = await prompt("Enter your email to get a sign-in code.", {
        title: "Email sign-in",
        confirmLabel: "Send code",
        cancelLabel: "Cancel",
        placeholder: "you@example.com",
      });
      if (email) {
        await signInWithEmailOtp(email);
        await alert("Check your email for the sign-in code.");
      }
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

  const isTimeBased = exercise.type === "time";
  const handleSaveName = () => {
    if (editedName.trim() && editedName !== exercise.name) {
      onUpdateExerciseName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setEditedName(exercise.name);
    setIsEditingName(false);
  };

  const handleSubstitute = async () => {
    if (!(await ensureAuthenticated())) {
      return;
    }

    setIsLoadingAlternatives(true);
    setShowSubstituteDialog(true);

    try {
      const response = await fetch("/api/substitute-exercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          exerciseName: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          type: exercise.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get alternatives");
      }

      const data = await response.json();
      setAlternatives(data.alternatives);
    } catch (error) {
      console.error("Error getting alternatives:", error);
      void alert("Failed to get exercise alternatives. Please try again.");
      setShowSubstituteDialog(false);
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  const handleSelectAlternative = (alternative: ExerciseAlternative) => {
    onUpdateExerciseName(alternative.name);
    setShowSubstituteDialog(false);
    setAlternatives([]);
  };

  const handleSetComplete = (
    setNumber: number,
    updates: Partial<SetRecord>
  ) => {
    // If marking set as complete and it wasn't already complete, trigger rest timer
    const wasCompleted = getSetRecord(setNumber)?.completed || false;
    const isNowCompleted = updates.completed || false;

    if (!wasCompleted && isNowCompleted) {
      setShouldAutoStartTimer(true);
      if (onRestTimerActiveChange) {
        onRestTimerActiveChange(true, exercise.restTime);
      }
    }

    // Call the parent's onUpdateSet
    onUpdateSet(setNumber, updates);
  };

  return (
    <div className="bg-[#15151c]/80 border border-[#242432] rounded-[12px] overflow-hidden mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      {/* Exercise Name - Editable */}
      <div className="px-4 pt-4 pb-3 bg-[#1a1f29]/70 backdrop-blur border-b border-white/5">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") handleCancelName();
              }}
              className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-[#c6ff5e] focus:outline-none text-gray-100 pb-1"
            />
            <button
              onClick={handleSaveName}
              className="min-w-[44px] min-h-[44px] rounded-lg bg-[#c6ff5e] text-black hover:bg-[#b6f54e] flex items-center justify-center"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelName}
              className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1f232b] text-gray-300 hover:bg-[#2a2f3a] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setIsEditingName(true)}
              className="text-lg font-extrabold uppercase tracking-tight text-gray-100 hover:text-[#c6ff5e] text-left flex-1 min-w-0"
            >
              <span className="line-clamp-2 block">{exercise.name}</span>
            </button>
            <div className="flex-shrink-0">
              <button
                onClick={(event) => {
                  const target = event.currentTarget as HTMLElement;
                  const rect = target.getBoundingClientRect();
                  setActionMenuPosition({
                    top: rect.bottom + 8,
                    left: rect.right - 208,
                  });
                  setShowActionMenu((prev) => !prev);
                }}
                className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] text-gray-400 transition-colors"
                title="Exercise options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="rounded-xl bg-[#11141b] border border-[#242432] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">
            Target
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-300">
            {isTimeBased && <Timer className="w-3.5 h-3.5 text-[#c6ff5e]" />}
            <span className="font-semibold">
              {exercise.sets} × {exercise.reps}
            </span>
            {exercise.weight && (
              <span className="text-gray-400">@ {exercise.weight}</span>
            )}
            {exercise.restTime && (
              <span className="text-gray-500">
                • {formatRestTime(exercise.restTime)}
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Target notes
            </p>
            <textarea
              value={exercise.targetNotes || ""}
              onChange={(e) =>
                onUpdateExercise({ targetNotes: e.target.value })
              }
              placeholder="Add target notes..."
              rows={1}
              className="mt-2 w-full px-2 py-1 text-xs bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent resize-none placeholder:text-gray-600"
              onFocus={(e) => (e.target.rows = 3)}
              onBlur={(e) => {
                if (!e.target.value) e.target.rows = 1;
              }}
            />
          </div>
        </div>
      </div>

      {/* Sets Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#242432]">
              <th className="text-left py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] w-16">
                Set
              </th>
              {!isTimeBased && (
                <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
                  Lbs
                </th>
              )}
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
                {isTimeBased ? "Time" : "Reps"}
              </th>
              <th className="text-center py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] w-12">
                ✓
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(
              (setNumber) => {
                const setRecord = getSetRecord(setNumber);
                const isCompleted = setRecord?.completed || false;
                const isSwiped = swipedSetNumber === setNumber;

                return (
                  <tr key={setNumber} className="relative overflow-visible">
                    {/* Delete button revealed on swipe */}
                    {onDeleteSet && exercise.sets > 1 && isSwiped && (
                      <td
                        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500"
                        style={{ width: "80px" }}
                      >
                        <button
                          onClick={() => {
                            (async () => {
                              if (await confirm("Delete this set?")) {
                                onDeleteSet(setNumber);
                                setSwipedSetNumber(null);
                              }
                            })();
                          }}
                          className="text-white font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    )}

                    <td colSpan={!isTimeBased ? 4 : 3} className="p-0">
                      <SwipeableRow
                        isSwiped={isSwiped}
                        onSwipe={() => setSwipedSetNumber(setNumber)}
                        onSwipeCancel={() => setSwipedSetNumber(null)}
                        canDelete={
                          onDeleteSet !== undefined && exercise.sets > 1
                        }
                      >
                        <table className="w-full">
                          <tbody>
                            <tr
                              className={`
                            border-b border-[#1f2230]
                            ${isCompleted ? "bg-[#0f1915]" : ""}
                          `}
                            >
                              <td className="py-3 px-4 text-sm font-medium text-gray-300">
                                <div className="inline-flex flex-col items-start">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      const target =
                                        event.currentTarget as HTMLElement;
                                      const rect =
                                        target.getBoundingClientRect();
                                      setSetTypeMenuPosition({
                                        top: rect.bottom + 8,
                                        left: rect.left,
                                      });
                                      setEditingSetType((prev) =>
                                        prev === setNumber ? null : setNumber
                                      );
                                    }}
                                    className="text-left"
                                  >
                                    <span className="block">{setNumber}</span>
                                    {getSetTypeLabel(getSetType(setRecord)) && (
                                      <span
                                        className={`text-[10px] font-semibold tracking-[0.28em] uppercase ${getSetTypeClassName(
                                          getSetType(setRecord)
                                        )}`}
                                      >
                                        {getSetTypeLabel(getSetType(setRecord))}
                                      </span>
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Weight column - only for rep-based exercises */}
                              {!isTimeBased && (
                                <td className="py-3 px-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder={getTargetWeight() || "0"}
                                    value={setRecord?.weight || ""}
                                    onChange={(e) =>
                                      handleSetComplete(setNumber, {
                                        setNumber,
                                        reps: setRecord?.reps || 0,
                                        duration: setRecord?.duration,
                                        weight: parseFloat(e.target.value) || 0,
                                        completed:
                                          setRecord?.completed || false,
                                        setType: getSetType(setRecord),
                                      })
                                    }
                                    onFocus={(e) => {
                                      // If empty and has placeholder, offer to use placeholder value
                                      if (
                                        !setRecord?.weight &&
                                        getTargetWeight()
                                      ) {
                                        const targetWeight = parseFloat(
                                          getTargetWeight()
                                        );
                                        if (!isNaN(targetWeight)) {
                                          handleSetComplete(setNumber, {
                                            setNumber,
                                            reps: setRecord?.reps || 0,
                                            duration: setRecord?.duration,
                                            weight: targetWeight,
                                            completed:
                                              setRecord?.completed || false,
                                            setType: getSetType(setRecord),
                                          });
                                        }
                                      }
                                    }}
                                    className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent placeholder:text-gray-500"
                                  />
                                </td>
                              )}

                              {/* Reps or Duration column */}
                              <td className="py-3 px-2">
                                {isTimeBased ? (
                                  // Time-based input with timer format
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder={formatSecondsToTime(
                                      getTargetDuration()
                                    )}
                                    value={
                                      setRecord?.duration
                                        ? formatSecondsToTime(
                                            setRecord.duration
                                          )
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const seconds = parseTimeToSeconds(
                                        e.target.value
                                      );
                                      handleSetComplete(setNumber, {
                                        setNumber,
                                        reps: seconds, // Store in reps for backwards compatibility
                                        duration: seconds,
                                        weight: setRecord?.weight || 0,
                                        completed:
                                          setRecord?.completed || false,
                                        setType: getSetType(setRecord),
                                      });
                                    }}
                                    onFocus={(e) => {
                                      // Auto-fill target duration
                                      if (
                                        !setRecord?.duration &&
                                        getTargetDuration()
                                      ) {
                                        const targetDuration =
                                          getTargetDuration();
                                        handleSetComplete(setNumber, {
                                          setNumber,
                                          reps: targetDuration,
                                          duration: targetDuration,
                                          weight: setRecord?.weight || 0,
                                          completed:
                                            setRecord?.completed || false,
                                          setType: getSetType(setRecord),
                                        });
                                      }
                                    }}
                                    className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent placeholder:text-gray-500"
                                  />
                                ) : (
                                  // Rep-based input
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={getTargetReps() || "0"}
                                    value={setRecord?.reps || ""}
                                    onChange={(e) =>
                                      handleSetComplete(setNumber, {
                                        setNumber,
                                        reps: parseInt(e.target.value) || 0,
                                        duration: setRecord?.duration,
                                        weight: setRecord?.weight || 0,
                                        completed:
                                          setRecord?.completed || false,
                                        setType: getSetType(setRecord),
                                      })
                                    }
                                    onFocus={(e) => {
                                      // If empty and has placeholder, offer to use placeholder value
                                      if (!setRecord?.reps && getTargetReps()) {
                                        const targetReps = parseInt(
                                          getTargetReps()
                                        );
                                        if (!isNaN(targetReps)) {
                                          handleSetComplete(setNumber, {
                                            setNumber,
                                            reps: targetReps,
                                            duration: setRecord?.duration,
                                            weight: setRecord?.weight || 0,
                                            completed:
                                              setRecord?.completed || false,
                                            setType: getSetType(setRecord),
                                          });
                                        }
                                      }
                                    }}
                                    className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent placeholder:text-gray-500"
                                  />
                                )}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => {
                                    // For time-based: check duration, for rep-based: check reps
                                    const hasValue = isTimeBased
                                      ? setRecord?.duration &&
                                        setRecord.duration > 0
                                      : setRecord?.reps && setRecord.reps > 0;

                                    if (!isCompleted && !hasValue) {
                                      return;
                                    }

                                    handleSetComplete(setNumber, {
                                      setNumber,
                                      completed: !isCompleted,
                                      reps: setRecord?.reps || 0,
                                      duration: setRecord?.duration,
                                      weight: setRecord?.weight || 0,
                                      setType: getSetType(setRecord),
                                    });
                                  }}
                                  disabled={
                                    !isCompleted &&
                                    (isTimeBased
                                      ? !setRecord?.duration ||
                                        setRecord.duration === 0
                                      : !setRecord?.reps ||
                                        setRecord.reps === 0)
                                  }
                                  className={`
                        w-11 h-11 rounded-lg flex items-center justify-center transition-colors
                        ${
                          isCompleted
                            ? "bg-[#c6ff5e] text-black hover:bg-[#b6f54e]"
                            : (
                                isTimeBased
                                  ? !setRecord?.duration ||
                                    setRecord.duration === 0
                                  : !setRecord?.reps || setRecord.reps === 0
                              )
                            ? "bg-[#1a1d24] text-gray-600 cursor-not-allowed"
                            : "bg-[#1f232b] text-gray-300 hover:bg-[#2a2f3a] cursor-pointer"
                        }
                      `}
                                >
                                  {isCompleted && <Check className="w-5 h-5" />}
                                </button>
                              </td>
                            </tr>
                            {showPlates && !isTimeBased && (
                              <tr className="border-b border-[#1f2230]">
                                <td colSpan={4} className="px-4 pb-3">
                                  {(() => {
                                    const setWeight =
                                      setRecord?.weight && setRecord.weight > 0
                                        ? setRecord.weight
                                        : parseFloat(getTargetWeight());
                                    if (
                                      !setWeight ||
                                      isNaN(setWeight) ||
                                      setWeight <= 0
                                    ) {
                                      return (
                                        <div className="rounded-lg border border-[#242432] bg-[#101218] px-3 py-2 text-sm text-gray-400">
                                          Enter weight to see plate breakdown.
                                        </div>
                                      );
                                    }
                                    const result = calculatePlates(
                                      setWeight,
                                      getPlateConfiguration(),
                                      getBarbellWeight()
                                    );
                                    const chips = result.plates.flatMap(
                                      (plate) =>
                                        Array.from(
                                          { length: plate.count },
                                          () => plate.weight
                                        )
                                    );
                                    return (
                                      <div className="rounded-lg border border-[#242432] bg-[#101218] px-3 py-2">
                                        <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-[0.2em] mb-2">
                                          <span>Plate Math (per side)</span>
                                          <span className="normal-case tracking-normal text-gray-500">
                                            {formatPlateResult(result)}
                                          </span>
                                        </div>
                                        {!result.exact && (
                                          <div className="mb-2 rounded-md border border-[#3a2a1f] bg-[#1f1712] px-2 py-1 text-xs text-orange-200">
                                            Not possible with your current
                                            plates.
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                          {chips.length > 0 ? (
                                            chips.map((plateWeight, index) => (
                                              <span
                                                key={`${setNumber}-${plateWeight}-${index}`}
                                                className="px-3 py-2 min-h-[44px] rounded-lg bg-[#141823] border border-[#2a2f3a] text-sm font-semibold text-gray-200"
                                              >
                                                {plateWeight}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-sm text-gray-400">
                                              Bar only ({result.barbellWeight}{" "}
                                              lbs)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </SwipeableRow>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-[#242432] flex items-center justify-between gap-3">
        {onAddSet && (
          <button
            onClick={onAddSet}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c6ff5e] bg-[#0f1820] border border-[#1f3440] rounded-lg transition-colors hover:bg-[#13212a]"
          >
            <Plus className="w-4 h-4" />
            Add Set
          </button>
        )}

        {/* Notes expand/collapse */}
        <div className="flex-1">
          <textarea
            value={exercise.notes || ""}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Your notes..."
            rows={1}
            className="w-full px-2 py-1 text-xs bg-transparent border-none text-gray-400 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600"
            onFocus={(e) => (e.target.rows = 3)}
            onBlur={(e) => {
              if (!e.target.value) e.target.rows = 1;
            }}
          />
        </div>
      </div>

      {showActionMenu && actionMenuPosition && (
        <div
          ref={actionMenuRef}
          className="fixed z-50"
          style={{
            top: `${actionMenuPosition.top}px`,
            left: `${actionMenuPosition.left}px`,
          }}
        >
          <div className="w-52 bg-[#15151c] rounded-lg shadow-lg border border-[#242432] py-1">
            {!isTimeBased && (
              <button
                onClick={() => {
                  setShowPlates((prev) => !prev);
                  setShowActionMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b] flex items-center gap-2"
              >
                <Calculator className="w-4 h-4 text-gray-400" />
                {showPlates ? "Hide plate math" : "Show plate math"}
              </button>
            )}
            <button
              onClick={() => {
                handleSubstitute();
                setShowActionMenu(false);
              }}
              disabled={isLoadingAlternatives}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b] flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isLoadingAlternatives ? "animate-spin" : ""
                }`}
              />
              Similar exercises
            </button>
            <button
              onClick={async () => {
                const restValue = await prompt("Enter rest time in seconds.", {
                  title: "Rest timer",
                  confirmLabel: exercise.restTime ? "Update" : "Add",
                  cancelLabel: "Cancel",
                  defaultValue: formatRestTime(exercise.restTime ?? ""),
                  placeholder: "90",
                });
                if (restValue === null) return;
                const trimmed = restValue.trim();
                const rangeMatch = trimmed.match(/(\d+)\s*[-–]\s*\d+/);
                const normalized = rangeMatch ? rangeMatch[1] : trimmed;
                const seconds = Number(normalized);
                if (!trimmed || Number.isNaN(seconds) || seconds <= 0) {
                  await alert("Enter a valid number of seconds.");
                  return;
                }
                onUpdateExercise({ restTime: String(Math.floor(seconds)) });
                setShowActionMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b] flex items-center gap-2"
            >
              <Timer className="w-4 h-4 text-gray-400" />
              {exercise.restTime ? "Edit rest timer" : "Add rest timer"}
            </button>
            {exercise.restTime && (
              <button
                onClick={() => {
                  onUpdateExercise({ restTime: undefined });
                  setShowActionMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Remove rest timer
              </button>
            )}
            {canDeleteExercise && onDeleteExercise && (
              <button
                onClick={() => {
                  (async () => {
                    if (await confirm(`Delete "${exercise.name}"?`)) {
                      onDeleteExercise();
                    }
                  })();
                  setShowActionMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Delete exercise
              </button>
            )}
          </div>
        </div>
      )}

      {editingSetType !== null && setTypeMenuPosition && (
        <div
          ref={setTypeMenuRef}
          className="fixed z-50"
          style={{
            top: `${setTypeMenuPosition.top}px`,
            left: `${setTypeMenuPosition.left}px`,
          }}
        >
          <div className="w-36 rounded-md border border-[#2a2f3a] bg-[#0f1218] py-1 shadow-lg">
            {[
              { value: "warmup", label: "Warm up" },
              { value: "normal", label: "Normal" },
              { value: "failure", label: "Failure" },
              { value: "drop", label: "Drop set" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const setRecord = getSetRecord(editingSetType);
                  handleSetComplete(editingSetType, {
                    setNumber: editingSetType,
                    reps: setRecord?.reps || 0,
                    duration: setRecord?.duration,
                    weight: setRecord?.weight || 0,
                    completed: setRecord?.completed || false,
                    setType: option.value as SetRecord["setType"],
                  });
                  setEditingSetType(null);
                }}
                className={`w-full text-left px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${
                  getSetType(getSetRecord(editingSetType)) === option.value
                    ? "text-[#c6ff5e] bg-[#151c14]"
                    : "text-gray-400 hover:bg-[#1f232b]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Substitute Exercise Dialog */}
      {showSubstituteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#15151c] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-[#242432]">
            <h3 className="text-xl font-bold text-gray-100 mb-4">
              Alternative Exercises
            </h3>

            {isLoadingAlternatives ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 text-[#c6ff5e] animate-spin mb-3" />
                <p className="text-gray-400">Finding alternatives...</p>
              </div>
            ) : alternatives.length > 0 ? (
              <div className="space-y-3">
                {alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAlternative(alt)}
                    className="w-full text-left p-4 rounded-xl border-2 border-[#242432] hover:border-[#c6ff5e] transition-colors"
                  >
                    <h4 className="font-semibold text-gray-100 mb-1">
                      {alt.name}
                    </h4>
                    <p className="text-sm text-gray-400 mb-2">{alt.reason}</p>
                    <p className="text-xs text-gray-500">
                      Equipment: {alt.equipment}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            <button
              onClick={() => {
                setShowSubstituteDialog(false);
                setAlternatives([]);
              }}
              className="w-full mt-4 py-3 px-4 bg-[#1f232b] text-gray-200 rounded-xl font-semibold hover:bg-[#2a2f3a] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
