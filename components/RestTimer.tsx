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

    // Always prefer plain numeric seconds
    const numeric = Number(str);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return Math.max(0, Math.floor(numeric));
    }

    // Legacy formats support
    const secMatch = str.match(/(\d+)\s*(?:sec|s|second)/);
    if (secMatch) return parseInt(secMatch[1]);

    const minMatch = str.match(/(\d+)\s*(?:min|m|minute)/);
    if (minMatch) return parseInt(minMatch[1]) * 60;

    const timeMatch = str.match(/(\d+):(\d+)/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    }

    return 90;
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
      const nextTarget = defaultRestTime
        ? parseRestTime(defaultRestTime)
        : targetTime;
      setIsOpen(true);
      setTargetTime(nextTarget);
      setTimeLeft(nextTarget);
      setIsRunning(true);

      // Call callback to reset the autoStart trigger
      if (onAutoStartComplete) {
        onAutoStartComplete();
      }
    }
  }, [autoStart, defaultRestTime, targetTime, onAutoStartComplete]);

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
    const newTime = Math.max(0, timeLeft + seconds);
    setTimeLeft(newTime);
    setTargetTime(newTime);
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
        <button
          onClick={() => adjustTime(-15)}
          className="p-1 rounded bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className={`text-lg font-bold ${
          timeLeft === 0
            ? "text-[#c6ff5e]"
            : timeLeft <= 10
            ? "text-red-400"
            : "text-gray-100"
        }`}>
          {formatTime(timeLeft)}
        </span>
        <button
          onClick={() => adjustTime(15)}
          className="p-1 rounded bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200"
        >
          <Plus className="w-3 h-3" />
        </button>
        {!isRunning && (
          <button
            onClick={handleStartPause}
            className="p-1 rounded bg-[#c6ff5e] hover:bg-[#b6f54e] text-black"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
        {isRunning && (
          <button
            onClick={handleStartPause}
            className="p-1 rounded bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200"
          >
            <Pause className="w-3 h-3" />
          </button>
        )}
        <button onClick={handleClose} className="p-1 rounded hover:bg-[#1f232b] text-gray-400">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Inline timer (shown in header)
  if (inline && isOpen) {
    return (
      <div className="bg-[#15151c] rounded-xl border border-[#242432] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#c6ff5e]" />
            <span className="text-sm font-semibold text-gray-300">
              Rest
            </span>
          </div>
          <div
            className={`text-3xl font-bold ${
              timeLeft === 0
                ? "text-[#c6ff5e]"
                : timeLeft <= 10
                ? "text-red-400"
                : "text-gray-100"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[#1f232b] rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft === 0 ? "bg-[#c6ff5e]" : "bg-[#c6ff5e]"
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
                className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={handleStartPause}
            className="flex-1 flex items-center justify-center gap-1 min-h-[44px] py-2 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-lg font-semibold text-sm transition-colors"
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
              className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleReset}
            className="min-w-[44px] min-h-[44px] bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 rounded-lg transition-colors flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {timeLeft === 0 && (
          <div className="mt-2 p-2 bg-[#1a2216] border border-[#2a3a2b] rounded-lg text-center">
            <p className="text-xs text-[#c6ff5e] font-semibold">
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
          className="fixed bottom-4 right-4 z-50 bg-[#15151c] rounded-2xl shadow-2xl border-2 border-[#242432] overflow-hidden"
          style={{ width: "280px" }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-[#c6ff5e]" />
                <h3 className="font-bold text-gray-100">
                  Rest Timer
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-200 p-1"
              >
                ✕
              </button>
            </div>

            {/* Compact Timer Display */}
            <div className="text-center mb-3">
              <div
                className={`text-5xl font-bold ${
                  timeLeft === 0
                    ? "text-[#c6ff5e]"
                    : timeLeft <= 10
                    ? "text-red-400"
                    : "text-gray-100"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              {/* Progress Bar */}
              <div className="h-2 bg-[#1f232b] rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft === 0 ? "bg-[#c6ff5e]" : "bg-[#c6ff5e]"
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
                  className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  ±15s
                </span>
                <button
                  onClick={() => adjustTime(15)}
                  className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleStartPause}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] py-3 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-lg font-semibold transition-colors"
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
                className="px-4 py-3 min-h-[44px] bg-[#1f232b] hover:bg-[#2a2f3a] text-gray-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Completion Message */}
            {timeLeft === 0 && (
              <div className="mt-3 p-2 bg-[#1a2216] border border-[#2a3a2b] rounded-lg text-center">
              <p className="text-sm text-[#c6ff5e] font-semibold">
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
