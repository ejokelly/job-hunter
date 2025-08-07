// app/providers.tsx
'use client'

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { usePostHog } from 'posthog-js/react'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
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
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  )
}

function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams, posthog])

  return <></>
}