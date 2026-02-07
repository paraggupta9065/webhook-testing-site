import posthog from 'posthog-js';

// Initialize PostHog
export function initPostHog() {
  const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

  console.log('PostHog initialization:', {
    hasKey: !!posthogKey,
    hasHost: !!posthogHost,
    key: posthogKey ? `${posthogKey.substring(0, 10)}...` : 'missing',
    host: posthogHost || 'missing'
  });

  if (posthogKey && posthogHost) {
    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          console.log('PostHog loaded successfully');
        },
      });
      console.log('PostHog init called');
    } catch (error) {
      console.error('PostHog initialization error:', error);
    }
  } else {
    console.warn('PostHog not initialized: missing credentials');
  }
}

export { posthog };
