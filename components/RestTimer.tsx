"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, Plus, Minus, X } from "lucide-react";

interface RestTimerProps {
  defaultRestTime?: string; // e.g., "90 sec", "2 min", "60s"
  onTimerComplete?: () => void;
  autoStart?: boolean; // Trigger to auto-open and start timer
  onAutoStartComplete?: () => void; // Callback when auto-start is handled
  onClose?: () => void; // Callback when timer is closed
  inline?: boolean; // Whether to show inline (in header) vs floating
  minimal?: boolean; // Minimal design for top-left placement
}

export default function RestTimer({
  defaultRestTime,
  onTimerComplete,
  autoStart = false,
  onAutoStartComplete,
  onClose,
  inline = false,
  minimal = false,
}: RestTimerProps) {
  const [isOpen, setIsOpen] = useState(inline); // Always open if inline
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90); // default 90 seconds
  const [targetTime, setTargetTime] = useState(90);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse rest time from string like "90 sec", "2 min", "60s", "1:30"
  const parseRestTime = (restTimeStr: string): number => {
    if (!restTimeStr) return 90;

    const str = restTimeStr.toLowerCase().trim();

    // Match "90 sec", "90s", "90 seconds"
    const secMatch = str.match(/(\d+)\s*(?:sec|s|second)/);
    if (secMatch) return parseInt(secMatch[1]);

    // Match "2 min", "2m", "2 minutes"
    const minMatch = str.match(/(\d+)\s*(?:min|m|minute)/);
    if (minMatch) return parseInt(minMatch[1]) * 60;

    // Match "1:30" format
    const timeMatch = str.match(/(\d+):(\d+)/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    }

    // Try to parse as plain number (assume seconds)
    const num = parseInt(str);
    return isNaN(num) ? 90 : num;
  };

  // Initialize timer with default rest time
  useEffect(() => {
    if (defaultRestTime) {
      const seconds = parseRestTime(defaultRestTime);
      setTargetTime(seconds);
      setTimeLeft(seconds);
    }
  }, [defaultRestTime]);

  // Auto-start timer when triggered
  useEffect(() => {
    if (autoStart) {
      setIsOpen(true);
      setTimeLeft(targetTime);
      setIsRunning(true);

      // Call callback to reset the autoStart trigger
      if (onAutoStartComplete) {
        onAutoStartComplete();
      }
    }
  }, [autoStart, targetTime, onAutoStartComplete]);

  // Keep inline timers always open
  useEffect(() => {
    if (inline) {
      setIsOpen(true);
    }
  }, [inline]);

  const handleClose = () => {
    setIsOpen(false);
    setIsRunning(false);
    if (onClose) {
      onClose();
    }
  };

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playCompletionSound();
            if (onTimerComplete) onTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onTimerComplete]);

  const playCompletionSound = () => {
    // Try to play browser notification sound
    if (typeof window !== "undefined" && "AudioContext" in window) {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log("Could not play sound:", error);
      }
    }

    // Show browser notification if possible
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rest Complete!", {
        body: "Time to start your next set",
        icon: "/favicon.ico",
        tag: "rest-timer",
      });
    }
  };

  const handleStartPause = () => {
    if (timeLeft === 0) {
      setTimeLeft(targetTime);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(targetTime);
  };

  const adjustTime = (seconds: number) => {
    const newTime = Math.max(0, targetTime + seconds);
    setTargetTime(newTime);
    if (!isRunning) {
      setTimeLeft(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage =
    targetTime > 0 ? ((targetTime - timeLeft) / targetTime) * 100 : 0;

  // Minimal timer (compact, top-left)
  if (minimal && inline && isOpen) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold ${
          timeLeft === 0
            ? "text-green-500"
            : timeLeft <= 10
            ? "text-red-500"
            : "text-gray-900 dark:text-gray-100"
        }`}>
          {formatTime(timeLeft)}
        </span>
        {!isRunning && (
          <button
            onClick={handleStartPause}
            className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
        {isRunning && (
          <button
            onClick={handleStartPause}
            className="p-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            <Pause className="w-3 h-3" />
          </button>
        )}
        <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Inline timer (shown in header)
  if (inline && isOpen) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Rest
            </span>
          </div>
          <div
            className={`text-3xl font-bold ${
              timeLeft === 0
                ? "text-green-500"
                : timeLeft <= 10
                ? "text-red-500"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft === 0 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning && (
            <>
              <button
                onClick={() => adjustTime(-15)}
                className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                <Minus className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={handleStartPause}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>{timeLeft === 0 ? "Restart" : "Start"}</span>
              </>
            )}
          </button>
          {!isRunning && (
            <button
              onClick={() => adjustTime(15)}
              className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {timeLeft === 0 && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
              Rest complete!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Floating Compact Timer */}
      {isOpen && !inline && (
        <div
          className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden"
          style={{ width: "280px" }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  Rest Timer
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                ✕
              </button>
            </div>

            {/* Compact Timer Display */}
            <div className="text-center mb-3">
              <div
                className={`text-5xl font-bold ${
                  timeLeft === 0
                    ? "text-green-500"
                    : timeLeft <= 10
                    ? "text-red-500"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              {/* Progress Bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft === 0 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Adjust Time Buttons */}
            {!isRunning && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={() => adjustTime(-15)}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  ±15s
                </span>
                <button
                  onClick={() => adjustTime(15)}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleStartPause}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>{timeLeft === 0 ? "Restart" : "Start"}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Completion Message */}
            {timeLeft === 0 && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                Rest complete!
              </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
