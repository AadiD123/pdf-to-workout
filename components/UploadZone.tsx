"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent, KeyboardEvent } from "react";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Send,
  ScanLine,
  X,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const maxChars = 500;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ensureAuth = async () => {
    if (!onRequireAuth) return true;
    return await onRequireAuth();
  };

  // Auto-resize textarea - keeps it sleek unless user adds multiple lines
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Show scrollbar only when content exceeds max height
      if (textareaRef.current.scrollHeight > 200) {
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  };

  const handleDragOver = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isLoading || !(await ensureAuth())) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!(await ensureAuth())) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
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

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleAttachClick = async () => {
    if (!isLoading) {
      if (!(await ensureAuth())) return;
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!(await ensureAuth())) return;

    const trimmedInput = chatInput.trim();

    // If file is attached, upload it
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
      setChatInput("");
      return;
    }

    // If no input text, show error
    if (!trimmedInput) {
      void alert("Please describe your workout goal or paste your workout plan.");
      return;
    }

    // Determine if this is a workout plan text or a goal description
    // Simple heuristic: if it contains "Day" or exercise-like patterns, treat as plan
    const looksLikeWorkoutPlan = /(?:day\s+\d+|sets?|reps?|@\s*\d+|x\d+|\d+\s*lbs)/i.test(trimmedInput);

    if (looksLikeWorkoutPlan) {
      // Submit as workout plan text
      onTextSubmit(trimmedInput);
    } else {
      // Submit as goal for AI generation
      const days = parseInt(daysPerWeek, 10);
      if (Number.isNaN(days) || days < 1 || days > 7) {
        void alert("Please select training days between 1 and 7.");
        return;
      }
      onGeneratePlan(trimmedInput, days);
    }

    setChatInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  // Initialize textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      textareaRef.current.style.overflowY = "hidden";
    }
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col sm:block sm:h-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-6 py-12 flex-1 justify-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-[#2a2f3a] bg-[#151820]">
            <ScanLine className="w-10 h-10 text-[#c6ff5e] scan-pulse" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-100 font-mono mb-2">
              Processing...
            </p>
            <p className="text-sm text-gray-400">
              Building your workout plan (5–10s)
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Welcome Message - Desktop */}
          <div className="text-center mb-8 px-4 hidden sm:block">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-100 mb-3 uppercase">
              Stop typing, start lifting
            </h2>
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            Make a science-based workout routine personalized to your needs, or upload your routine and begin tracking
            </p>
          </div>

          {/* Mobile: Compact Welcome */}
          <div className="text-center pt-6 pb-4 px-4 sm:hidden flex-1 flex flex-col justify-center uppercase">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-100 mb-2">
              Stop typing, Start lifting
            </h2>
            <p className="text-sm text-gray-400">
              Make a science-based workout routine personalized to your needs, or upload your routine and begin tracking
            </p>
          </div>

          {/* Chat Input Container */}
          <div className="relative w-full max-w-3xl mx-auto px-4 pb-4 sm:px-0 sm:pb-0">
            {/* Drag Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-10 rounded-3xl border-2 border-dashed border-[#c6ff5e] bg-[#c6ff5e]/5 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-[#c6ff5e] mx-auto mb-2" />
                  <p className="text-lg font-semibold text-[#c6ff5e]">
                    Drop your file here
                  </p>
                </div>
              </div>
            )}

            {/* Main Chat Box */}
            <div className="bg-[#15151c] rounded-3xl border border-[#242432] shadow-xl overflow-hidden w-full">
              {/* File Preview */}
              {selectedFile && (
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1f232b] border border-[#2a2f3a]">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-[#151820]">
                      {selectedFile.type === "application/pdf" ? (
                        <FileText className="w-5 h-5 text-[#c6ff5e]" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#c6ff5e]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#2a2f3a] transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={async () => {
                    await ensureAuth();
                  }}
                  placeholder="Describe your goals or paste your routine..."
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none text-base overflow-hidden"
                  style={{ height: "56px", maxHeight: "200px" }}
                  maxLength={maxChars}
                  disabled={isLoading}
                  rows={1}
                />
              </div>

              {/* Bottom Bar */}
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-[#242432]">
                  {/* Left: Attach & Days Selector */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={handleFileInput}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleAttachClick}
                      disabled={isLoading}
                      className="min-w-[40px] min-h-[40px] rounded-lg border border-[#2a2f3a] bg-[#1a1f27] hover:bg-[#1f232b] text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      title="Attach file"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Days per week selector */}
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-[#1a1f27] border border-[#2a2f3a]">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        Days:
                      </span>
                      <select
                        value={daysPerWeek}
                        onChange={(e) => setDaysPerWeek(e.target.value)}
                        className="bg-transparent text-sm text-gray-200 font-medium focus:outline-none cursor-pointer"
                        disabled={isLoading}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Character Count & Send Button */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
                      {chatInput.length}/{maxChars}
                    </span>
                    <button
                      onClick={() => void handleSubmit()}
                      disabled={isLoading || (!selectedFile && !chatInput.trim())}
                      className="min-w-[40px] min-h-[40px] rounded-lg bg-[#c6ff5e] hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:cursor-not-allowed text-black transition-colors flex items-center justify-center shadow-sm"
                      title="Send"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Text - Desktop only */}
            <p className="text-center text-xs text-gray-500 mt-4 px-4 hidden sm:block">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-[#1f232b] border border-[#2a2f3a] text-gray-400 font-mono">
                Enter
              </kbd>{" "}
              to send •{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-[#1f232b] border border-[#2a2f3a] text-gray-400 font-mono">
                Shift + Enter
              </kbd>{" "}
              for new line
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 sm:mt-6 mx-4 p-4 rounded-xl bg-red-950/20 border-2 border-red-800">
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
