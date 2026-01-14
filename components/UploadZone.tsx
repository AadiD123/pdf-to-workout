'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, FileText, Type, Terminal, ScanLine, Plus } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  onTextSubmit: (text: string) => void;
  onManualCreate: (payload: ManualPlanPayload) => void;
  isLoading: boolean;
  error?: string;
}

export interface ManualExerciseInput {
  id: string;
  name: string;
  sets: string;
  type: 'reps' | 'time';
  reps: string;
  weight: string;
  restTime: string;
}

export interface ManualDayInput {
  id: string;
  name: string;
  isRestDay: boolean;
  exercises: ManualExerciseInput[];
}

export interface ManualPlanPayload {
  planName: string;
  days: ManualDayInput[];
}

const createEmptyExercise = (): ManualExerciseInput => ({
  id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  sets: '3',
  type: 'reps',
  reps: '10',
  weight: '',
  restTime: ''
});

const createEmptyDay = (): ManualDayInput => ({
  id: `day-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  isRestDay: false,
  exercises: [createEmptyExercise()]
});

export default function UploadZone({ onUpload, onTextSubmit, onManualCreate, isLoading, error }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text' | 'manual'>('file');
  const [textInput, setTextInput] = useState('');
  const [manualPlanName, setManualPlanName] = useState('');
  const [manualDays, setManualDays] = useState<ManualDayInput[]>([createEmptyDay()]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid file (JPG, PNG, WebP, or PDF)');
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    
    // For PDFs, we'll show a placeholder preview
    if (file.type === 'application/pdf') {
      setPreview('pdf'); // Special value to indicate PDF
    } else {
      reader.readAsDataURL(file);
    }

    // Call onUpload
    onUpload(file);
  };

  const handleClick = () => {
    if (!isLoading && inputMode === 'file') {
      fileInputRef.current?.click();
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextSubmit(textInput);
    }
  };

  const handleManualDayChange = (id: string, updates: Partial<ManualDayInput>) => {
    setManualDays((prev) =>
      prev.map((day) => (day.id === id ? { ...day, ...updates } : day))
    );
  };

  const handleManualExerciseChange = (
    dayId: string,
    exerciseId: string,
    updates: Partial<ManualExerciseInput>
  ) => {
    setManualDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, ...updates } : exercise
              )
            }
          : day
      )
    );
  };

  const handleAddManualDay = () => {
    setManualDays((prev) => [...prev, createEmptyDay()]);
  };

  const handleRemoveManualDay = (id: string) => {
    setManualDays((prev) => prev.filter((day) => day.id !== id));
  };

  const handleAddManualExercise = (dayId: string) => {
    setManualDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, createEmptyExercise()] }
          : day
      )
    );
  };

  const handleRemoveManualExercise = (dayId: string, exerciseId: string) => {
    setManualDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId)
            }
          : day
      )
    );
  };

  const handleManualCreate = () => {
    onManualCreate({
      planName: manualPlanName.trim() || 'Custom Workout Plan',
      days: manualDays
    });

    setManualPlanName('');
    setManualDays([createEmptyDay()]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Toggle between File and Text */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 bg-[#15151c] border border-[#242432] p-1.5 rounded-xl">
        <button
          onClick={() => {
            setInputMode('file');
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === 'file'
              ? 'bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340] shadow-[0_0_18px_rgba(198,255,94,0.15)]'
              : 'text-gray-300 hover:bg-[#1a1d24]'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="w-4 h-4" />
          <span className="text-center">Upload File</span>
        </button>
        <button
          onClick={() => {
            setInputMode('text');
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === 'text'
              ? 'bg-[#1f232b] text-[#00e8ff] border border-[#2f3340] shadow-[0_0_18px_rgba(0,232,255,0.15)]'
              : 'text-gray-300 hover:bg-[#1a1d24]'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Type className="w-4 h-4" />
          <span className="text-center">Paste Text</span>
        </button>
        <button
          onClick={() => {
            setInputMode('manual');
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === 'manual'
              ? 'bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340] shadow-[0_0_18px_rgba(198,255,94,0.15)]'
              : 'text-gray-300 hover:bg-[#1a1d24]'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-center">Build Manually</span>
        </button>
      </div>

      {inputMode === 'file' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
            transition-all duration-200 ease-in-out bg-[#0d0f14]
            ${isDragging 
              ? 'border-[#c6ff5e] bg-[#141820] scale-[1.02]' 
              : 'border-[#2a2f3a] hover:border-[#00e8ff] hover:bg-[#12151c]'
            }
            ${isLoading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
          />

          {preview && !isLoading ? (
            <div className="space-y-4">
              <div className="relative w-full max-h-48 overflow-hidden rounded-xl flex items-center justify-center">
                {preview === 'pdf' ? (
                  <div className="p-8 bg-[#161922] rounded-xl border border-[#242432]">
                    <FileText className="w-16 h-16 text-[#00e8ff]" />
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <p className="text-sm font-medium text-gray-300">
                Signal locked. Parsing workout…
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#2a2f3a] bg-[#151820]">
                <ScanLine className="w-8 h-8 text-[#c6ff5e] scan-pulse" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-100 font-mono">
                  Scanning Logic...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Parsing form and extracting sets (5–10s)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full bg-[#151820] border border-[#242432]">
                <Terminal className="w-10 h-10 text-[#c6ff5e]" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-100 font-mono">
                  Drag & Drop Upload
                </p>
                <p className="text-sm text-gray-400">
                  Tap to select or drop your PDF/image
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#161a24] text-xs font-medium text-gray-300 border border-[#242432]">
                <ImageIcon className="w-4 h-4 text-[#00e8ff]" />
                <span>JPG, PNG, WebP, PDF</span>
              </div>
            </div>
          )}
        </div>
      ) : inputMode === 'text' ? (
        <div className="bg-[#15151c] rounded-2xl p-6 border border-[#242432]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#2a2f3a] bg-[#151820]">
                <ScanLine className="w-8 h-8 text-[#c6ff5e] scan-pulse" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-100 font-mono">
                  Scanning Logic...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Parsing form and extracting sets (5–10s)
                </p>
              </div>
            </div>
          ) : (
            <>
              <label className="block text-gray-200 font-semibold mb-3">
                Paste your workout plan
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Example:&#10;&#10;Day 1: Push&#10;Bench Press - 4x8-12 @ 185lbs, Rest: 90 sec&#10;Overhead Press - 3x10 @ 95lbs&#10;&#10;Day 2: Pull&#10;Deadlift - 4x6 @ 225lbs&#10;Pull-ups - 3x8-10&#10;&#10;Day 3: Rest"
                className="w-full h-64 p-4 border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 resize-none focus:ring-2 focus:ring-[#00e8ff] focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isLoading}
                className="mt-4 w-full min-h-[48px] bg-[#c6ff5e] hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed text-black font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm"
              >
                Generate Workout Plan
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#15151c] rounded-2xl p-6 border border-[#242432]">
          <div className="space-y-5">
            <div>
              <label className="block text-gray-200 font-semibold mb-2">
                Plan name
              </label>
              <input
                value={manualPlanName}
                onChange={(e) => setManualPlanName(e.target.value)}
                placeholder="e.g., Strength Block"
                className="w-full px-4 py-3 text-base border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-gray-200 font-semibold mb-2">
                Days
              </label>
              <div className="space-y-4">
                {manualDays.map((day, dayIndex) => (
                  <div
                    key={day.id}
                    className="bg-[#0f1218] border border-[#2a2f3a] rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-400 font-medium">
                        Day {dayIndex + 1}
                      </p>
                      {manualDays.length > 1 && (
                        <button
                          onClick={() => handleRemoveManualDay(day.id)}
                          className="text-xs text-red-300 hover:text-red-200"
                          disabled={isLoading}
                        >
                          Remove Day
                        </button>
                      )}
                    </div>
                    <input
                      value={day.name}
                      onChange={(e) =>
                        handleManualDayChange(day.id, { name: e.target.value })
                      }
                      placeholder="e.g., Day 1 - Push"
                      className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                      disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleManualDayChange(day.id, {
                            isRestDay: !day.isRestDay
                          })
                        }
                        className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors border ${
                          day.isRestDay
                            ? 'bg-[#1f232b] text-[#c6ff5e] border-[#2f3340]'
                            : 'text-gray-300 border-[#2a2f3a] hover:bg-[#141821]'
                        }`}
                        disabled={isLoading}
                      >
                        {day.isRestDay ? 'Rest Day' : 'Training Day'}
                      </button>
                    </div>

                    {!day.isRestDay && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-gray-200 font-semibold">
                            Exercises
                          </h3>
                          <button
                            onClick={() => handleAddManualExercise(day.id)}
                            className="text-sm text-[#00e8ff] hover:text-[#8ff5ff] font-semibold"
                            disabled={isLoading}
                          >
                            + Add Exercise
                          </button>
                        </div>
                        {day.exercises.map((exercise, index) => (
                          <div
                            key={exercise.id}
                            className="bg-[#0b0e14] border border-[#2a2f3a] rounded-xl p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-400 font-medium">
                                Exercise {index + 1}
                              </p>
                              {day.exercises.length > 1 && (
                                <button
                                  onClick={() =>
                                    handleRemoveManualExercise(day.id, exercise.id)
                                  }
                                  className="text-xs text-red-300 hover:text-red-200"
                                  disabled={isLoading}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <input
                              value={exercise.name}
                              onChange={(e) =>
                                handleManualExerciseChange(day.id, exercise.id, {
                                  name: e.target.value
                                })
                              }
                              placeholder="Exercise name"
                              className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                              disabled={isLoading}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                value={exercise.sets}
                                onChange={(e) =>
                                  handleManualExerciseChange(day.id, exercise.id, {
                                    sets: e.target.value
                                  })
                                }
                                placeholder="Sets"
                                className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                                disabled={isLoading}
                              />
                              <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#2a2f3a] bg-[#0b0e14] p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleManualExerciseChange(day.id, exercise.id, {
                                      type: 'reps'
                                    })
                                  }
                                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                                    exercise.type === 'reps'
                                      ? 'bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340]'
                                      : 'text-gray-300 hover:bg-[#141821]'
                                  }`}
                                  disabled={isLoading}
                                >
                                  Reps-based
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleManualExerciseChange(day.id, exercise.id, {
                                      type: 'time'
                                    })
                                  }
                                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                                    exercise.type === 'time'
                                      ? 'bg-[#1f232b] text-[#00e8ff] border border-[#2f3340]'
                                      : 'text-gray-300 hover:bg-[#141821]'
                                  }`}
                                  disabled={isLoading}
                                >
                                  Time-based
                                </button>
                              </div>
                            </div>
                            <input
                              value={exercise.reps}
                              onChange={(e) =>
                                handleManualExerciseChange(day.id, exercise.id, {
                                  reps: e.target.value
                                })
                              }
                              placeholder={
                                exercise.type === 'time'
                                  ? 'Duration (e.g., 60 sec)'
                                  : 'Reps (e.g., 8-12)'
                              }
                              className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                              disabled={isLoading}
                            />
                            {exercise.type === 'reps' && (
                              <input
                                value={exercise.weight}
                                onChange={(e) =>
                                  handleManualExerciseChange(day.id, exercise.id, {
                                    weight: e.target.value
                                  })
                                }
                                placeholder="Weight (optional)"
                                className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                                disabled={isLoading}
                              />
                            )}
                            <input
                              value={exercise.restTime}
                              onChange={(e) =>
                                handleManualExerciseChange(day.id, exercise.id, {
                                  restTime: e.target.value
                                })
                              }
                              placeholder="Rest time (optional)"
                              className="w-full px-3 py-2 text-sm border border-[#2a2f3a] rounded-lg bg-[#0b0e14] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00e8ff]"
                              disabled={isLoading}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddManualDay}
                  className="text-sm text-[#c6ff5e] hover:text-[#b6f54e] font-semibold"
                  disabled={isLoading}
                >
                  + Add Day
                </button>
              </div>
            </div>
            <button
              onClick={handleManualCreate}
              disabled={isLoading}
              className="w-full min-h-[48px] bg-[#c6ff5e] hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed text-black font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm"
            >
              Create Workout Plan
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/20 border-2 border-red-800">
          <p className="text-sm font-medium text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
