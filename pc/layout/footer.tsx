'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import posthog from 'posthog-js';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: string;
}

export default function Footer() {
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    async function checkSessionAndSubscription() {
      try {
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        const userData = sessionData.user || null;
        setUser(userData);

        if (userData?.id) {
          // Check subscription status
          const subscriptionResponse = await fetch('/api/subscription/status');
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            setIsSubscribed(subscriptionData.subscriptionStatus === 'starter' || subscriptionData.subscriptionStatus === 'unlimited');
          }
        }
      } catch (error) {
        console.error('Error checking session and subscription:', error);
      }
    }
    
    checkSessionAndSubscription();
  }, []);

  return (
    <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 py-16">
        {/* Company Info */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start mb-4">
            <Image
              src="/favicon-32x32.png"
              alt="resume love"
              width={32}
              height={32}
              className="mr-2"
            />
            <h3 className="text-2xl font-bold theme-text-primary">
              <span className="font-normal">resume</span><span className="font-bold">love</span>
            </h3>
          </div>
          <p className="theme-text-secondary mb-6 leading-relaxed">
            Take the hard work out of tailoring your resume for each job application. Get hired faster with personalized resumes and cover letters.
          </p>
          <div className="text-sm theme-text-tertiary">
            © 2025 resumelove. All rights reserved.
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-center md:text-left">
          <h4 className="text-lg font-semibold theme-text-primary mb-4">Quick Links</h4>
          <div className="space-y-3">
            <div>
              <Link href="/privacy" className="theme-text-secondary hover:theme-text-primary transition-colors">
                Privacy Policy
              </Link>
            </div>
            <div>
              <Link href="/terms" className="theme-text-secondary hover:theme-text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
            <div>
              <Link href="/careers" className="theme-text-secondary hover:theme-text-primary transition-colors">
                Careers
              </Link>
            </div>
          </div>
        </div>

        {/* Contact & Support */}
        <div className="text-center md:text-left">
          <h4 className="text-lg font-semibold theme-text-primary mb-4">Get in Touch</h4>
          <div className="space-y-3">
            {isSubscribed ? (
              <>
                <div>
                  <p className="theme-text-secondary">Questions or need help?</p>
                  <a 
                    href="mailto:helpme@resumelove.app" 
                    className="theme-text-primary hover:opacity-80 transition-opacity font-medium"
                    onClick={() => posthog.capture('help_email_clicked', {
                      email: 'helpme@resumelove.app',
                      user_subscription: 'subscribed'
                    })}
                  >
                    helpme@resumelove.app
                  </a>
                </div>
                <div className="pt-4">
                  <p className="theme-text-tertiary text-sm">
                    We typically respond within 24 hours
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="theme-text-secondary">Need support?</p>
                <p className="theme-text-primary font-medium">
                  Email support is available for paid subscribers
                </p>
                <p className="theme-text-tertiary text-sm mt-2">
                  Upgrade to Starter or Unlimited for email support
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}