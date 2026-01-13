'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Loader2, FileText } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error?: string;
}

export default function UploadZone({ onUpload, isLoading, error }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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

    // Create preview
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
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-105' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-900/50'
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
                <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <FileText className="w-16 h-16 text-gray-600 dark:text-gray-400" />
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Analyzing your workout...
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Extracting workout data
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This usually takes 5-10 seconds
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-6 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload Workout Plan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tap to select or drag and drop
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
              <ImageIcon className="w-4 h-4" />
              <span>JPG, PNG, WebP, PDF</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

