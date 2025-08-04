'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import ActionButton from './action-button';
import ThreeDotsLoader from './three-dots-loader';
import Brand from './brand';

interface ResumeUploadProps {
  onUploadSuccess: (userData: { userId: string; email: string; name: string; message: string; resumeId: string; sessionToken: string; jwtToken: string; emailVerified: boolean }) => void;
  onUploadError: (error: string) => void;
  onFileSelected?: () => void;
}

export default function ResumeUpload({ onUploadSuccess, onUploadError, onFileSelected }: ResumeUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      setSelectedFile(pdfFile);
      setUploadStatus('idle');
      setStatusMessage('');
      setIsFlipped(true);
      onFileSelected?.();
      // Auto-parse on drop
      uploadAndParse(pdfFile);
    } else {
      setUploadStatus('error');
      setStatusMessage('Please upload a PDF file');
      onUploadError('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadStatus('idle');
        setStatusMessage('');
        setIsFlipped(true);
        onFileSelected?.();
        // Auto-parse on file select
        uploadAndParse(file);
      } else {
        setUploadStatus('error');
        setStatusMessage('Please upload a PDF file');
        onUploadError('Please upload a PDF file');
      }
    }
  };

  const uploadAndParse = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    setStatusMessage('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('🚀🚀🚀 UPLOAD RESPONSE:', response.status, result);

      if (response.ok && result.success) {
        console.log('🚀🚀🚀 CALLING onUploadSuccess!!!');
        setUploadStatus('success');
        setStatusMessage('Resume uploaded successfully! Redirecting...');
        // Don't flip back, keep processing state and redirect immediately
        onUploadSuccess({
          userId: result.userId,
          email: result.email,
          name: result.name,
          message: result.message,
          resumeId: result.resumeId,
          sessionToken: result.sessionToken,
          jwtToken: result.jwtToken,
          emailVerified: result.emailVerified
        });
      } else {
        setUploadStatus('error');
        setIsFlipped(false); // Reset flip state so user can see error message
        // Handle specific 400 error for corrupted resumes
        if (response.status === 400) {
          setStatusMessage('The resume was corrupted and cannot be used. Try another.');
          onUploadError('The resume was corrupted and cannot be used. Try another.');
        } else {
          setStatusMessage(result.error || 'Failed to parse resume');
          onUploadError(result.error || 'Failed to parse resume');
        }
      }
    } catch (error) {
      setUploadStatus('error');
      setIsFlipped(false); // Reset flip state so user can see error message
      setStatusMessage('Network error. Please try again.');
      onUploadError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10' 
            : 'theme-border hover:border-[var(--accent-color)]/60'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <Upload className="w-12 h-12 mx-auto theme-text-tertiary" />
          <div>
            <p className="text-lg font-medium theme-text-primary">
              Upload Your Resume
            </p>
            <p className="theme-text-secondary">
              Drag and drop your PDF resume here, or click to select
            </p>
            <p className="text-sm theme-text-tertiary mt-2">
              Maximum file size: 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && !isUploading && (
        <div className="mt-4">
          {uploadStatus === 'success' ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 dark:text-green-300">
                {statusMessage}
              </span>
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300">
                {statusMessage}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}