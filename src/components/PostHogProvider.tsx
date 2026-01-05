/**
 * PostHog Provider Component
 * Wraps the app with PostHog analytics initialization
 */
import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { posthog, initPostHog } from '@/lib/posthog'

interface PostHogProviderProps {
  children: React.ReactNode
}

export const PostHogProvider = ({ children }: PostHogProviderProps) => {
  const { isSignedIn, user } = useAuth()
  const hasIdentifiedRef = useRef(false)
  const previousSignedInRef = useRef(isSignedIn)

  // Initialize PostHog once on mount
  useEffect(() => {
    initPostHog()
  }, [])

  // Handle user identification
  useEffect(() => {
    if (isSignedIn && user && !hasIdentifiedRef.current) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      })
      hasIdentifiedRef.current = true

      if (import.meta.env.DEV) {
        console.log('[PostHog] User identified:', user.id)
      }
    }
  }, [isSignedIn, user])

  // Handle sign-out explicitly
  useEffect(() => {
    // Detect sign-out transition
    if (previousSignedInRef.current && !isSignedIn) {
      posthog.reset()
      hasIdentifiedRef.current = false

      if (import.meta.env.DEV) {
        console.log('[PostHog] User signed out, session reset')
      }
    }
    previousSignedInRef.current = isSignedIn
  }, [isSignedIn])

  return <>{children}</>
}
