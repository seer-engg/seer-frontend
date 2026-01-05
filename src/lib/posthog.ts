/**
 * PostHog Analytics Client Configuration
 *
 * Based on PostHog React documentation:
 * https://posthog.com/docs/libraries/react
 */
import posthog from 'posthog-js'

export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST

  if (!apiKey || !host) {
    console.warn('[PostHog] Analytics disabled: Missing VITE_POSTHOG_API_KEY or VITE_POSTHOG_HOST')
    return null
  }

  posthog.init(apiKey, {
    api_host: host,
    ui_host: 'https://us.posthog.com', // PostHog dashboard for deep links

    // Enable session recording for debugging user issues
    session_recording: {
      maskAllInputs: true, // Mask sensitive form inputs
      maskTextSelector: '[data-private]', // Mask elements with data-private attribute
    },

    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'], // Only capture these events
      element_allowlist: ['button', 'a', 'form', 'input'], // Only from these elements
    },

    // Performance optimization
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        console.log('[PostHog] Analytics initialized')
      }
    },

    // Respect user privacy
    respect_dnt: true, // Respect Do Not Track browser setting

    // Persistence
    persistence: 'localStorage', // Use localStorage for session persistence

    // Debugging (only in development)
    debug: import.meta.env.DEV,
  })

  return posthog
}

export { posthog }
