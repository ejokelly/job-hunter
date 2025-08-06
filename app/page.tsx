'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ReactPageScroller = dynamic(() => import('react-page-scroller'), {
  ssr: false,
});
import ThreeDotsLoader from '@/components/three-dots-loader';
import Header from '@/components/header';
import Footer from '@/components/footer';
import HeroSection from '@/components/HeroSection';
import UploadSection from '@/components/UploadSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import PricingSection from '@/components/PricingSection';
import LoginModal from '@/components/LoginModal';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();

  const handlePageChange = (number: number) => {
    setCurrentPage(number);
  };

  // Load session on component mount
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        const userData = data.user || null
        setSession(userData)
        
        // Redirect if logged in
        if (userData) {
          router.push('/resume/new')
        }
      } catch (error) {
        console.error('Error loading session:', error)
        setSession(null)
      } finally {
        setSessionLoading(false)
      }
    }
    
    loadSession()
  }, [router])

  // Handle subscription cleanup after successful Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cleanup = urlParams.get('cleanup');
    const success = urlParams.get('success');
    
    if (cleanup === 'true' && success === 'true') {
      console.log('🧹 Triggering subscription cleanup after successful checkout');
      
      fetch('/api/stripe/cleanup-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ Subscription cleanup result:', data);
        
        // Remove cleanup parameters from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('cleanup');
        window.history.replaceState({}, document.title, newUrl.toString());
      })
      .catch(error => {
        console.error('❌ Subscription cleanup failed:', error);
      });
    }
  }, []);

  const handleUploadSuccess = async (userData: { userId: string; email: string; name: string; message: string; resumeId: string; sessionToken: string; jwtToken: string; emailVerified: boolean }) => {
    console.log('Upload success, redirecting to resume builder');
    
    // Create session so user stays logged in
    try {
      const sessionResponse = await fetch('/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.userId,
          email: userData.email,
          name: userData.name
        }),
      });

      if (sessionResponse.ok) {
        window.location.href = `/resume/new`;
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleUploadError = (error: string) => {
    console.log('Upload error:', error);
  };


  if (sessionLoading) {
    return (
      <div className="min-h-screen theme-bg-gradient flex items-center justify-center">
        <ThreeDotsLoader />
      </div>
    );
  }

  // Homepage for non-authenticated users
  if (!session) {
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        {/* Header */}
        <Header onLoginClick={() => setShowLoginModal(true)} />
        
        {/* Page Scroller */}
        <ReactPageScroller
          pageOnChange={handlePageChange}
          customPageNumber={currentPage}
          animationTimer={1000}
          animationTimerBuffer={100}
          transitionTimingFunction="cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          containerHeight="100vh"
          containerWidth="100vw"
          blockScrollUp={false}
          blockScrollDown={false}
          renderAllPagesOnFirstRender={false}
        >
          {/* Hero Section */}
          <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
            <HeroSection />
          </div>
          
          {/* Upload Section */}
          <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
            <UploadSection 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
          
          {/* How It Works Section */}
          <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
            <HowItWorksSection />
          </div>
          
          {/* Pricing Section */}
          <div className="h-screen w-screen theme-homepage-bg theme-homepage-text">
            <PricingSection />
          </div>
          
          {/* Footer Section */}
          <div className="h-screen w-screen theme-homepage-bg theme-homepage-text flex items-center justify-center">
            <Footer />
          </div>
        </ReactPageScroller>
        
        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>
    );
  }

}
