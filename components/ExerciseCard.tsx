'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Timer } from 'lucide-react';
import { Exercise, SetRecord } from '@/types/workout';
import { parseTimeToSeconds, formatSecondsToTime } from '@/lib/timeUtils';

interface ExerciseCardProps {
  exercise: Exercise;
  onUpdateSet: (setNumber: number, updates: Partial<SetRecord>) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateExerciseName: (name: string) => void;
  isRestTimerActive?: boolean;
  onRestTimerActiveChange?: (isActive: boolean, restTime?: string) => void;
}

export default function ExerciseCard({ 
  exercise, 
  onUpdateSet, 
  onUpdateNotes, 
  onUpdateExerciseName,
  isRestTimerActive = false,
  onRestTimerActiveChange
}: ExerciseCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(exercise.name);
  const [shouldAutoStartTimer, setShouldAutoStartTimer] = useState(false);
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
    if (!exercise.reps) return '';
    // If it's a range, take the lower number as default
    const match = exercise.reps.match(/^(\d+)/);
    return match ? match[1] : exercise.reps;
  };

  // Parse target duration for time-based exercises
  const getTargetDuration = (): number => {
    if (!exercise.reps) return 0;
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
    <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-3">
      {/* Exercise Name - Editable */}
      <div className="px-4 pt-4 pb-2">
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
              className="flex-1 text-lg font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-gray-100 pb-1"
            />
            <button
              onClick={handleSaveName}
              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelName}
              className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 text-left w-full"
          >
            {exercise.name}
          </button>
        )}
      </div>

      {/* Target Info - Show sets x reps/time */}
      <div className="px-4 pb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isTimeBased && <Timer className="w-4 h-4 inline mr-1 -mt-1" />}
          Target: {exercise.sets} sets × {exercise.reps} {isTimeBased ? '' : 'reps'}
          {exercise.weight && <span> @ {exercise.weight}</span>}
          {exercise.restTime && <span> • {exercise.restTime} rest</span>}
        </p>
      </div>

      {/* Sets Table - Strong App Style */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">Set</th>
              {!isTimeBased && (
                <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Lbs</th>
              )}
              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {isTimeBased ? 'Time' : 'Reps'}
              </th>
              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-12">✓</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNumber => {
              const setRecord = getSetRecord(setNumber);
              const isCompleted = setRecord?.completed || false;

              return (
                <tr
                  key={setNumber}
                  className={`
                    border-b border-gray-100 dark:border-gray-800/50
                    ${isCompleted ? 'bg-green-50/30 dark:bg-green-950/10' : ''}
                  `}
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        className="w-full text-center py-2 px-2 text-base font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
                        className="w-full text-center py-2 px-2 text-base font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
                        className="w-full text-center py-2 px-2 text-base font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
                        w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                        ${isCompleted 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : (isTimeBased 
                              ? (!setRecord?.duration || setRecord.duration === 0)
                              : (!setRecord?.reps || setRecord.reps === 0))
                          ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer'
                        }
                      `}
                    >
                      {isCompleted && <Check className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes - Always visible */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <textarea
          value={exercise.notes || ''}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Add notes..."
          rows={exercise.notes && exercise.notes.length > 50 ? 3 : 2}
          className="w-full px-0 py-1 text-sm bg-transparent border-none text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-0 resize-none placeholder-gray-400 dark:placeholder-gray-600"
        />
      </div>
    </div>
  );
}

