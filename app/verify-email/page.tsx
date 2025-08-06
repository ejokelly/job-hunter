'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import Header from '@/pc/auth/header';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    // Verify the token
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/verify-email-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, token }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.error || 'Failed to verify your email.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen theme-bg-gradient">
      <Header />
      <div className="flex items-center justify-center p-8" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="max-w-md w-full">
          <div className="theme-card rounded-lg p-8 text-center">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)]"></div>
                </div>
                <h1 className="text-2xl font-bold theme-text-primary mb-4">Verifying Email</h1>
                <p className="theme-text-secondary">Please wait while we verify your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-500" />
                <h1 className="text-2xl font-bold theme-text-primary mb-4">Email Verified!</h1>
                <p className="theme-text-secondary mb-6">{message}</p>
                <p className="theme-text-tertiary text-sm">
                  You can now close this tab and return to your original window to continue creating your resume.
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
                <h1 className="text-2xl font-bold theme-text-primary mb-4">Verification Failed</h1>
                <p className="theme-text-secondary mb-6">{message}</p>
                <p className="theme-text-tertiary text-sm">
                  Please try requesting a new verification email from your original tab.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}