"use client";

import { WorkoutPlan } from "@/types/workout";
import {
  Dumbbell,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Coffee,
  Plus,
  Settings,
  MoreVertical,
  GripVertical,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import PlateSettings from "./PlateSettings";
import { format, differenceInDays } from "date-fns";
import {
  getSuggestedDay,
  getSuggestedDayMessage,
} from "@/lib/workoutSuggestion";
import { calculateStreak } from "@/lib/streakCalculation";

interface HomeViewProps {
  workoutPlan: WorkoutPlan;
  onStartDay: (dayId: string) => void;
  onViewProgress: () => void;
  onNewWorkout: () => void;
  onAddDay: () => void;
  onReorderDays: (dayOrder: string[]) => void;
  onDeleteDay: (dayId: string) => void;
}

export default function HomeView({
  workoutPlan,
  onStartDay,
  onViewProgress,
  onNewWorkout,
  onAddDay,
  onReorderDays,
  onDeleteDay,
}: HomeViewProps) {
  const { confirm } = useDialog();
  const [showPlateSettings, setShowPlateSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [draggedDayId, setDraggedDayId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragMovedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const currentStreak = calculateStreak(workoutPlan.sessions);

  useEffect(() => {
    if (!isDragging || !draggedDayId) return;
    const handlePointerMove = (event: PointerEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const card = element?.closest("[data-day-id]") as HTMLElement | null;
      const targetId = card?.dataset.dayId;
      if (!targetId || targetId === draggedDayId) return;
      const ids = workoutPlan.days.map((day) => day.id);
      const fromIndex = ids.indexOf(draggedDayId);
      const toIndex = ids.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return;
      ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, draggedDayId);
      dragMovedRef.current = true;
      onReorderDays(ids);
    };
    const handlePointerUp = () => {
      setIsDragging(false);
      setDraggedDayId(null);
      dragMovedRef.current = false;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggedDayId, isDragging, onReorderDays, workoutPlan.days]);

  return (
    <div className="min-h-screen bg-[#101014] text-gray-100 pb-8">
      {/* Header */}
      <div className="bg-[#15151c]/80 backdrop-blur border-b border-[#242432] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Dumbbell className="w-8 h-8 text-[#c6ff5e]" />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-gray-100">
              {workoutPlan.name}
            </h1>
            <p className="text-sm text-gray-500">
              Created {format(new Date(workoutPlan.uploadedAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] transition-colors flex items-center justify-center"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5 text-gray-300" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#15151c] rounded-lg shadow-lg border border-[#242432] py-1 z-20">
                <button
                  onClick={() => {
                    setShowPlateSettings(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#1f232b] flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-[#c6ff5e]" />
                  Plate Weight Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[#1b1716] border border-[#2f2320] rounded-lg p-3">
            <p className="text-xs text-orange-300 font-medium uppercase tracking-[0.2em]">
              Current Streak
            </p>
            <p className="text-2xl font-bold text-orange-200">
              {currentStreak}
            </p>
          </div>
          <button
            onClick={onViewProgress}
            className="flex-1 min-h-[48px] bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            View Progress
          </button>
        </div>

        {lastWorkout && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
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
            <Sparkles className="w-5 h-5 text-[#c6ff5e]" />
            <h2 className="text-lg font-bold text-gray-100">
              Next in Your Plan
            </h2>
          </div>

          <button
            onClick={() => onStartDay(suggestedDay.id)}
            className="w-full bg-gradient-to-r from-[#1f2a18] via-[#1a1f27] to-[#0f1b20] rounded-2xl p-5 shadow-lg active:scale-[0.98] transition-all border border-[#2a2f3a] hover:border-[#c6ff5e]"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1a2216] border border-[#2a3a2b] flex items-center justify-center flex-shrink-0">
                {suggestedDay.isRestDay ? (
                  <Coffee className="w-7 h-7 text-[#c6ff5e]" />
                ) : (
                  <Dumbbell className="w-7 h-7 text-[#c6ff5e]" />
                )}
              </div>

              <div className="flex-1 text-left">
                <h3 className="text-xl font-extrabold uppercase tracking-tight text-gray-100 mb-1">
                  {suggestedDay.name}
                </h3>
                <p className="text-gray-300 text-sm mb-2">
                  {suggestionMessage}
                </p>
                {!suggestedDay.isRestDay && (
                  <p className="text-gray-500 text-xs">
                    {suggestedDay.exercises.length} exercise
                    {suggestedDay.exercises.length !== 1 ? "s" : ""}
                  </p>
                )}
                {suggestedDay.isRestDay && (
                  <p className="text-gray-500 text-xs">
                    Recovery day • No exercises
                  </p>
                )}
              </div>

              <div className="self-center">
                <div className="w-10 h-10 rounded-full bg-[#0f1514] border border-[#2a3a2b] flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-[#c6ff5e]" />
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* All Workout Days */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-100">
            All Days ({workoutPlan.days.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingDays((prev) => !prev)}
              className="min-h-[40px] px-3 rounded-lg bg-[#15151c] border border-[#242432] text-gray-200 transition-colors flex items-center justify-center text-sm font-semibold hover:bg-[#1f232b]"
              title={isEditingDays ? "Done" : "Edit days"}
            >
              {isEditingDays ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Done
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </>
              )}
            </button>
            <button
              onClick={onAddDay}
              className="min-h-[40px] px-3 rounded-lg bg-[#15151c] border border-[#242432] text-gray-200 transition-colors flex items-center justify-center text-sm font-semibold hover:bg-[#1f232b]"
              title="Add a workout day"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Day
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {workoutPlan.days.map((day) => {
            const isSuggested = day.id === suggestedDayId;
            const daySessionCount = workoutPlan.sessions.filter(
              (s) => s.dayId === day.id
            ).length;

            return (
              <div
                key={day.id}
                data-day-id={day.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isEditingDays || isDragging || dragMovedRef.current) return;
                  onStartDay(day.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onStartDay(day.id);
                  }
                }}
                className={`w-full rounded-[12px] p-4 border transition-all active:scale-[0.98] cursor-pointer ${
                  day.isRestDay
                    ? "bg-[#151c17] border-[#273629] hover:border-[#3a5a40]"
                    : "bg-[#15151c] border-[#242432] hover:border-[#c6ff5e]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      day.isRestDay
                        ? "bg-[#1a231b] border-[#2f3b31]"
                        : "bg-[#141823] border-[#2a2f3a]"
                    }`}
                  >
                    {day.isRestDay ? (
                      <Coffee className="w-6 h-6 text-[#c6ff5e]" />
                    ) : (
                      <Dumbbell className="w-6 h-6 text-[#c6ff5e]" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-100">
                        {day.name}
                      </h3>
                      {isSuggested && (
                        <span className="inline-flex items-center text-[10px] uppercase tracking-[0.15em] whitespace-nowrap text-[#c6ff5e] border border-[#2a3a2b] px-2 py-1 rounded-full leading-none">
                          Up next
                        </span>
                      )}
                    </div>
                    {day.isRestDay ? (
                      <p className="text-sm text-[#c6ff5e]">
                        Recovery day • {daySessionCount} time
                        {daySessionCount !== 1 ? "s" : ""} completed
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        {day.exercises.length} exercise
                        {day.exercises.length !== 1 ? "s" : ""} •{" "}
                        {daySessionCount} session
                        {daySessionCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditingDays && (
                      <>
                        <button
                          onClick={() => {
                            (async () => {
                              if (
                                await confirm(
                                  `Delete "${day.name}"? This will remove all exercises for this day.`
                                )
                              ) {
                                onDeleteDay(day.id);
                              }
                            })();
                          }}
                          className="min-w-[32px] min-h-[28px] rounded-md border border-[#2a2f3a] text-red-300 hover:bg-red-500/10 hover:border-red-500/40 flex items-center justify-center"
                          title="Delete day"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div
                          onPointerDown={(event) => {
                            if (event.pointerType === "mouse" && event.button !== 0) {
                              return;
                            }
                            event.preventDefault();
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                            }
                            longPressTimerRef.current = setTimeout(() => {
                              setDraggedDayId(day.id);
                              setIsDragging(true);
                            }, 150);
                          }}
                          onPointerUp={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onPointerLeave={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          className={`min-w-[28px] min-h-[28px] rounded-md border border-[#242432] text-gray-400 flex items-center justify-center touch-none ${
                            isDragging && draggedDayId === day.id
                              ? "cursor-grabbing"
                              : "cursor-grab"
                          }`}
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </>
                    )}
                    <ChevronRight className="w-6 h-6 text-gray-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plate Settings Modal */}
      {showPlateSettings && (
        <PlateSettings onClose={() => setShowPlateSettings(false)} />
      )}
    </div>
  );
}
