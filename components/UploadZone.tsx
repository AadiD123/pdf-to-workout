"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Type,
  Terminal,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { useDialog } from "@/components/DialogProvider";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  onTextSubmit: (text: string) => void;
  onGeneratePlan: (prompt: string, daysPerWeek: number) => void;
  onRequireAuth: () => Promise<boolean>;
  isLoading: boolean;
  error?: string;
}

export default function UploadZone({
  onUpload,
  onTextSubmit,
  onGeneratePlan,
  onRequireAuth,
  isLoading,
  error,
}: UploadZoneProps) {
  const { alert } = useDialog();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text" | "generate">(
    "file"
  );
  const [textInput, setTextInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const maxGoalChars = 200;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureAuth = async () => {
    if (!onRequireAuth) return true;
    return await onRequireAuth();
  };

  const handleDragOver = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!(await ensureAuth())) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!(await ensureAuth())) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!(await ensureAuth())) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      void alert("Please upload a valid file (JPG, PNG, WebP, or PDF)");
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };

    // For PDFs, we'll show a placeholder preview
    if (file.type === "application/pdf") {
      setPreview("pdf"); // Special value to indicate PDF
    } else {
      reader.readAsDataURL(file);
    }

    // Call onUpload
    onUpload(file);
  };

  const handleClick = async () => {
    if (!isLoading && inputMode === "file") {
      if (!(await ensureAuth())) return;
      fileInputRef.current?.click();
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextSubmit(textInput);
    }
  };

  const handleGenerateSubmit = () => {
    const trimmed = goalInput.trim();
    const days = parseInt(daysPerWeek, 10);
    if (!trimmed) {
      void alert("Describe your goal so I can build your plan.");
      return;
    }
    if (trimmed.length > maxGoalChars) {
      void alert(`Please keep your goal under ${maxGoalChars} characters.`);
      return;
    }
    if (Number.isNaN(days) || days < 1 || days > 7) {
      void alert("Choose a number of training days between 1 and 7.");
      return;
    }
    onGeneratePlan(trimmed, days);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Toggle between File and Text */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 bg-[#15151c] border border-[#242432] p-1.5 rounded-xl">
        <button
          onClick={() => {
            setInputMode("generate");
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === "generate"
              ? "bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340] shadow-[0_0_18px_rgba(198,255,94,0.15)]"
              : "text-gray-300 hover:bg-[#1a1d24]"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-center">Build Plan</span>
        </button>
        <button
          onClick={() => {
            setInputMode("file");
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === "file"
              ? "bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340] shadow-[0_0_18px_rgba(198,255,94,0.15)]"
              : "text-gray-300 hover:bg-[#1a1d24]"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Upload className="w-4 h-4" />
          <span className="text-center">Upload Plan</span>
        </button>
        <button
          onClick={() => {
            setInputMode("text");
            setPreview(null);
          }}
          disabled={isLoading}
          className={`w-full min-h-[44px] py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 tracking-wide text-xs sm:text-sm leading-tight ${
            inputMode === "text"
              ? "bg-[#1f232b] text-[#c6ff5e] border border-[#2f3340] shadow-[0_0_18px_rgba(198,255,94,0.15)]"
              : "text-gray-300 hover:bg-[#1a1d24]"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Type className="w-4 h-4" />
          <span className="text-center">Text Plan</span>
        </button>
      </div>

      {inputMode === "file" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
            transition-all duration-200 ease-in-out bg-[#0d0f14]
            ${
              isDragging
                ? "border-[#c6ff5e] bg-[#141820] scale-[1.02]"
                : "border-[#2a2f3a] hover:border-[#c6ff5e] hover:bg-[#12151c]"
            }
            ${isLoading ? "pointer-events-none opacity-50" : ""}
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
                {preview === "pdf" ? (
                  <div className="p-8 bg-[#161922] rounded-xl border border-[#242432]">
                    <FileText className="w-16 h-16 text-[#c6ff5e]" />
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
                <ImageIcon className="w-4 h-4 text-[#c6ff5e]" />
                <span>JPG, PNG, WebP, PDF</span>
              </div>
            </div>
          )}
        </div>
      ) : inputMode === "text" ? (
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
                onFocus={async () => {
                  await ensureAuth();
                }}
                placeholder="Example:&#10;&#10;Day 1: Push&#10;Bench Press - 4x8-12 @ 185lbs, Rest: 90 sec&#10;Overhead Press - 3x10 @ 95lbs&#10;&#10;Day 2: Pull&#10;Deadlift - 4x6 @ 225lbs&#10;Pull-ups - 3x8-10&#10;&#10;Day 3: Rest"
                className="w-full h-64 p-4 border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 resize-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isLoading}
                className="mt-4 w-full min-h-[48px] bg-[#c6ff5e] hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed text-black font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm"
              >
                Generate Plan
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#15151c] rounded-2xl p-6 border border-[#242432]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#2a2f3a] bg-[#151820]">
                <ScanLine className="w-8 h-8 text-[#c6ff5e] scan-pulse" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-100 font-mono">
                  Building Plan...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Creating your weekly split (5–10s)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-gray-200 font-semibold">
                Describe your goal
              </label>
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onFocus={async () => {
                  await ensureAuth();
                }}
                placeholder="Example: I want to gain muscle, 45 minutes per session, prefer compound lifts."
                className="w-full h-40 p-4 border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 resize-none focus:ring-2 focus:ring-[#c6ff5e] focus:border-transparent transition-all"
                maxLength={maxGoalChars}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {goalInput.length}/{maxGoalChars} characters
                </span>
                <span>Keep it concise for best results</span>
              </div>
              <div>
                <label className="block text-gray-200 font-semibold mb-2">
                  Training days per week
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onFocus={async () => {
                    await ensureAuth();
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setDaysPerWeek("");
                      return;
                    }
                    const numeric = parseInt(value, 10);
                    if (Number.isNaN(numeric)) {
                      setDaysPerWeek("");
                      return;
                    }
                    const clamped = Math.min(7, Math.max(1, numeric));
                    setDaysPerWeek(String(clamped));
                  }}
                  className="w-full px-4 py-3 text-base border border-[#2a2f3a] rounded-xl bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleGenerateSubmit}
                disabled={!goalInput.trim() || isLoading}
                className="w-full min-h-[48px] bg-[#c6ff5e] hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed text-black font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm"
              >
                Build My Engine
              </button>
            </div>
          )}
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
