import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  person_profiles: 'identified_only',
  capture_pageview: false, // We handle this manually
  defaults: '2025-05-24',
  opt_out_capturing_by_default: true, // Opt out by default
  loaded: function(posthog) {
    // Only opt-in on approved production domains
    const approvedDomains = ['resumelove.app'];
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    
    if (approvedDomains.includes(currentDomain)) {
      posthog.opt_in_capturing();
      console.log('PostHog tracking enabled for approved domain:', currentDomain);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('PostHog tracking disabled in development environment');
    } else {
      console.log('PostHog tracking disabled - not on approved domain:', currentDomain);
    }
  }
});