'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Check, X, Timer, Plus, RefreshCw, Calculator } from 'lucide-react';
import { Exercise, SetRecord } from '@/types/workout';
import { parseTimeToSeconds, formatSecondsToTime } from '@/lib/timeUtils';
import { calculatePlates, formatPlateResult, getPlateConfiguration } from '@/lib/plateCalculator';

interface SwipeableRowProps {
  children: ReactNode;
  isSwiped: boolean;
  onSwipe: () => void;
  onSwipeCancel: () => void;
  canDelete: boolean;
}

function SwipeableRow({ children, isSwiped, onSwipe, onSwipeCancel, canDelete }: SwipeableRowProps) {
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
        transition: touchStart === null ? 'transform 0.3s ease-out' : 'none'
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
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  canDeleteExercise = false,
  isRestTimerActive = false,
  onRestTimerActiveChange
}: ExerciseCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(exercise.name);
  const [shouldAutoStartTimer, setShouldAutoStartTimer] = useState(false);
  const [swipedSetNumber, setSwipedSetNumber] = useState<number | null>(null);
  const [showSubstituteDialog, setShowSubstituteDialog] = useState(false);
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const completedSetsCount = exercise.completedSets.filter(s => s.completed).length;

  const getSetRecord = (setNumber: number): SetRecord | undefined => {
    return exercise.completedSets.find(s => s.setNumber === setNumber);
  };

  // Parse target reps - handle ranges like "8-12" or single values like "10"
  const getTargetReps = (): string => {
    if (typeof exercise.reps !== 'string' || !exercise.reps) return '';
    // If it's a range, take the lower number as default
    const match = exercise.reps.match(/^(\d+)/);
    return match ? match[1] : exercise.reps;
  };

  // Parse target duration for time-based exercises
  const getTargetDuration = (): number => {
    if (typeof exercise.reps !== 'string' || !exercise.reps) return 0;
    return parseTimeToSeconds(exercise.reps);
  };

  // Parse target weight - extract number from string like "135 lbs" or "60kg"
  const getTargetWeight = (): string => {
    if (!exercise.weight) return '';
    const match = exercise.weight.match(/(\d+(?:\.\d+)?)/);
    return match ? match[1] : '';
  };

  const isTimeBased = exercise.type === 'time';
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
    setIsLoadingAlternatives(true);
    setShowSubstituteDialog(true);
    
    try {
      const response = await fetch('/api/substitute-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          type: exercise.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get alternatives');
      }

      const data = await response.json();
      setAlternatives(data.alternatives);
    } catch (error) {
      console.error('Error getting alternatives:', error);
      alert('Failed to get exercise alternatives. Please try again.');
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

  const handleSetComplete = (setNumber: number, updates: Partial<SetRecord>) => {
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
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelName();
              }}
              className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-[#00e8ff] focus:outline-none text-gray-100 pb-1"
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
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {!isTimeBased && (
                <button
                  onClick={() => setShowPlates(!showPlates)}
                  className={`min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] transition-colors ${
                    showPlates ? 'text-[#00e8ff]' : 'text-gray-400'
                  }`}
                  title="Plate calculator"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSubstitute}
                disabled={isLoadingAlternatives}
                className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-[#2a2f3a] hover:bg-[#1a1f27] text-gray-400 transition-colors disabled:opacity-50"
                title="Find substitute"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAlternatives ? 'animate-spin' : ''}`} />
              </button>
              {canDeleteExercise && onDeleteExercise && (
                <button
                  onClick={() => {
                    if (confirm(`Delete "${exercise.name}"?`)) {
                      onDeleteExercise();
                    }
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-lg border border-transparent hover:border-red-500/40 hover:bg-red-500/10 text-red-400 transition-colors"
                  title="Delete exercise"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
            {isTimeBased && <Timer className="w-3.5 h-3.5 text-[#00e8ff]" />}
            <span className="font-semibold">{exercise.sets} × {exercise.reps}</span>
            {exercise.weight && <span className="text-gray-400">@ {exercise.weight}</span>}
            {exercise.restTime && <span className="text-gray-500">• {exercise.restTime}</span>}
          </div>
          {exercise.notes && (
            <p className="text-sm text-gray-500 italic mt-3">
              {exercise.notes}
            </p>
          )}
        </div>
      </div>

      {/* Sets Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#242432]">
              <th className="text-left py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] w-16">Set</th>
              {!isTimeBased && (
                <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Lbs</th>
              )}
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
                {isTimeBased ? 'Time' : 'Reps'}
              </th>
              <th className="text-center py-2 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] w-12">✓</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNumber => {
              const setRecord = getSetRecord(setNumber);
              const isCompleted = setRecord?.completed || false;
              const isSwiped = swipedSetNumber === setNumber;

              return (
                <tr
                  key={setNumber}
                  className="relative overflow-visible"
                >
                  {/* Delete button revealed on swipe */}
                  {onDeleteSet && exercise.sets > 1 && isSwiped && (
                    <td 
                      className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500"
                      style={{ width: '80px' }}
                    >
                      <button
                        onClick={() => {
                          if (confirm('Delete this set?')) {
                            onDeleteSet(setNumber);
                            setSwipedSetNumber(null);
                          }
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
                      canDelete={onDeleteSet !== undefined && exercise.sets > 1}
                    >
                      <table className="w-full">
                        <tbody>
                          <tr className={`
                            border-b border-[#1f2230]
                            ${isCompleted ? 'bg-[#0f1915]' : ''}
                          `}>
                  <td className="py-3 px-4 text-sm font-medium text-gray-300">
                    {setNumber}
                  </td>
                  
                  {/* Weight column - only for rep-based exercises */}
                  {!isTimeBased && (
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={getTargetWeight() || '0'}
                        value={setRecord?.weight || ''}
                        onChange={(e) => handleSetComplete(setNumber, {
                          setNumber,
                          reps: setRecord?.reps || 0,
                          duration: setRecord?.duration,
                          weight: parseFloat(e.target.value) || 0,
                          completed: setRecord?.completed || false
                        })}
                        onFocus={(e) => {
                          // If empty and has placeholder, offer to use placeholder value
                          if (!setRecord?.weight && getTargetWeight()) {
                            const targetWeight = parseFloat(getTargetWeight());
                            if (!isNaN(targetWeight)) {
                              handleSetComplete(setNumber, {
                                setNumber,
                                reps: setRecord?.reps || 0,
                                duration: setRecord?.duration,
                                weight: targetWeight,
                                completed: setRecord?.completed || false
                              });
                            }
                          }
                        }}
                        className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff] focus:border-transparent placeholder:text-gray-500"
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
                        placeholder={formatSecondsToTime(getTargetDuration())}
                        value={setRecord?.duration ? formatSecondsToTime(setRecord.duration) : ''}
                        onChange={(e) => {
                          const seconds = parseTimeToSeconds(e.target.value);
                          handleSetComplete(setNumber, {
                            setNumber,
                            reps: seconds, // Store in reps for backwards compatibility
                            duration: seconds,
                            weight: setRecord?.weight || 0,
                            completed: setRecord?.completed || false
                          });
                        }}
                        onFocus={(e) => {
                          // Auto-fill target duration
                          if (!setRecord?.duration && getTargetDuration()) {
                            const targetDuration = getTargetDuration();
                            handleSetComplete(setNumber, {
                              setNumber,
                              reps: targetDuration,
                              duration: targetDuration,
                              weight: setRecord?.weight || 0,
                              completed: setRecord?.completed || false
                            });
                          }
                        }}
                        className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff] focus:border-transparent placeholder:text-gray-500"
                      />
                    ) : (
                      // Rep-based input
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={getTargetReps() || '0'}
                        value={setRecord?.reps || ''}
                        onChange={(e) => handleSetComplete(setNumber, {
                          setNumber,
                          reps: parseInt(e.target.value) || 0,
                          duration: setRecord?.duration,
                          weight: setRecord?.weight || 0,
                          completed: setRecord?.completed || false
                        })}
                        onFocus={(e) => {
                          // If empty and has placeholder, offer to use placeholder value
                          if (!setRecord?.reps && getTargetReps()) {
                            const targetReps = parseInt(getTargetReps());
                            if (!isNaN(targetReps)) {
                              handleSetComplete(setNumber, {
                                setNumber,
                                reps: targetReps,
                                duration: setRecord?.duration,
                                weight: setRecord?.weight || 0,
                                completed: setRecord?.completed || false
                              });
                            }
                          }
                        }}
                        className="w-full min-h-[44px] text-center py-2 px-2 text-base font-semibold bg-[#0f1218] border border-[#2a2f3a] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff] focus:border-transparent placeholder:text-gray-500"
                      />
                    )}
                  </td>
                  
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        // For time-based: check duration, for rep-based: check reps
                        const hasValue = isTimeBased 
                          ? setRecord?.duration && setRecord.duration > 0
                          : setRecord?.reps && setRecord.reps > 0;
                        
                        if (!isCompleted && !hasValue) {
                          return;
                        }
                        
                        handleSetComplete(setNumber, { 
                          setNumber,
                          completed: !isCompleted,
                          reps: setRecord?.reps || 0,
                          duration: setRecord?.duration,
                          weight: setRecord?.weight || 0
                        });
                      }}
                      disabled={!isCompleted && (
                        isTimeBased 
                          ? (!setRecord?.duration || setRecord.duration === 0)
                          : (!setRecord?.reps || setRecord.reps === 0)
                      )}
                      className={`
                        w-11 h-11 rounded-lg flex items-center justify-center transition-colors
                        ${isCompleted 
                          ? 'bg-[#c6ff5e] text-black hover:bg-[#b6f54e]' 
                          : (isTimeBased 
                              ? (!setRecord?.duration || setRecord.duration === 0)
                              : (!setRecord?.reps || setRecord.reps === 0))
                          ? 'bg-[#1a1d24] text-gray-600 cursor-not-allowed'
                          : 'bg-[#1f232b] text-gray-300 hover:bg-[#2a2f3a] cursor-pointer'
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
                        if (!setWeight || isNaN(setWeight) || setWeight <= 0) {
                          return (
                            <div className="rounded-lg border border-[#242432] bg-[#101218] px-3 py-2 text-sm text-gray-400">
                              Enter weight to see plate breakdown.
                            </div>
                          );
                        }
                        const result = calculatePlates(setWeight, getPlateConfiguration());
                        const chips = result.plates.flatMap((plate) =>
                          Array.from({ length: plate.count }, () => plate.weight)
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
                                Not possible with your current plates.
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
                                  Bar only ({result.barbellWeight} lbs)
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
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-[#242432] flex items-center justify-between gap-3">
        {onAddSet && (
          <button
            onClick={onAddSet}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00e8ff] bg-[#0f1820] border border-[#1f3440] rounded-lg transition-colors hover:bg-[#13212a]"
          >
            <Plus className="w-4 h-4" />
            Add Set
          </button>
        )}
        
        {/* Notes expand/collapse */}
        <div className="flex-1">
          <textarea
            value={exercise.notes || ''}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Notes..."
            rows={1}
            className="w-full px-2 py-1 text-xs bg-transparent border-none text-gray-400 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600"
            onFocus={(e) => e.target.rows = 3}
            onBlur={(e) => {
              if (!e.target.value) e.target.rows = 1;
            }}
          />
        </div>
      </div>

      {/* Substitute Exercise Dialog */}
      {showSubstituteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#15151c] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-[#242432]">
            <h3 className="text-xl font-bold text-gray-100 mb-4">
              Alternative Exercises
            </h3>
            
            {isLoadingAlternatives ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 text-[#00e8ff] animate-spin mb-3" />
                <p className="text-gray-400">Finding alternatives...</p>
              </div>
            ) : alternatives.length > 0 ? (
              <div className="space-y-3">
                {alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAlternative(alt)}
                    className="w-full text-left p-4 rounded-xl border-2 border-[#242432] hover:border-[#00e8ff] transition-colors"
                  >
                    <h4 className="font-semibold text-gray-100 mb-1">
                      {alt.name}
                    </h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {alt.reason}
                    </p>
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

