'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function Footer() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setUser(data.user || null);
      } catch (error) {
        console.error('Error checking session:', error);
      }
    }
    
    checkSession();
  }, []);

  return (
    <footer className="theme-bg-primary theme-border-light border-t mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side - Company info */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm theme-text-secondary">
            <span>© 2025 resumelove</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:theme-text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:theme-text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Right side - Support email (only for logged in users) */}
          {user && (
            <div className="text-sm theme-text-secondary">
              Need help? <a href="mailto:helpme@resumelove.app" className="theme-text-primary hover:theme-text-accent transition-colors">helpme@resumelove.app</a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}