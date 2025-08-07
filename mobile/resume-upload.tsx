'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import posthog from 'posthog-js';

interface MobileResumeUploadProps {
  onUploadSuccess: (userData: { userId: string; email: string; name: string; message: string; resumeId: string; sessionToken: string; jwtToken: string; emailVerified: boolean }) => void;
  onUploadError: (error: string) => void;
  onFileSelected?: () => void;
}

export default function MobileResumeUpload({ onUploadSuccess, onUploadError, onFileSelected }: MobileResumeUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setStatusMessage('Please select a PDF file');
      onUploadError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadStatus('error');
      setStatusMessage('File size must be less than 10MB');
      onUploadError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setStatusMessage('');
    onFileSelected?.();
    
    posthog.capture('mobile_resume_file_selected', {
      file_size: file.size,
      file_name: file.name
    });

    // Auto-upload after file selection
    setTimeout(() => handleUpload(file), 500);
  };

  const handleUpload = async (file?: File) => {
    const fileToUpload = file || selectedFile;
    if (!fileToUpload) return;

    setIsUploading(true);
    setStatusMessage('Uploading and analyzing your resume...');
    
    try {
      const formData = new FormData();
      formData.append('resume', fileToUpload);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const userData = await response.json();
        setUploadStatus('success');
        setStatusMessage('Upload successful! Redirecting...');
        
        posthog.capture('mobile_resume_upload_success', {
          user_id: userData.userId,
          resume_id: userData.resumeId
        });

        onUploadSuccess(userData);
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
      
      posthog.capture('mobile_resume_upload_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {!selectedFile || uploadStatus === 'error' ? (
        /* Upload Form */
        <div className="border-2 border-dashed rounded-2xl p-8 text-center theme-border theme-upload-card">
          <Upload className="w-16 h-16 mx-auto mb-6 theme-text-tertiary" />
          <h3 className="text-xl font-semibold mb-3 theme-text-primary">
            Select your resume
          </h3>
          <p className="theme-text-secondary text-base mb-6">
            or tap to browse files
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
            id="mobile-resume-input"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Choose File
          </button>
          
          <p className="text-sm theme-text-tertiary mt-4">
            PDF files only, max 10MB
          </p>

          {uploadStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{statusMessage}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStatus('idle');
                  setStatusMessage('');
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Processing/Success State */
        <div className="theme-upload-processing-bg rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-xl font-semibold theme-upload-processing-title mb-3">
            {isUploading ? 'Processing Your Resume' : 'Upload Complete!'}
          </h3>
          
          <p className="theme-upload-processing-text text-base leading-relaxed mb-6">
            {isUploading 
              ? 'We are extracting data from your resume. This will take just a moment...'
              : 'Successfully processed your resume! Redirecting to resume builder...'
            }
          </p>
          
          {isUploading && (
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Upload Successful!</span>
            </div>
          )}

          <p className="text-sm theme-text-secondary">
            <strong>File:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        </div>
      )}
    </div>
  );
}