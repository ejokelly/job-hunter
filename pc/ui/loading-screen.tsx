'use client';

import ThreeDotsLoader from './three-dots-loader';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen theme-bg-gradient flex items-center justify-center">
      <ThreeDotsLoader />
    </div>
  );
}