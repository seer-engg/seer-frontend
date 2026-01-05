/**
 * PostHog Provider Component
 * Wraps the app with PostHog analytics initialization
 */
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { posthog, initPostHog } from '@/lib/posthog'

interface PostHogProviderProps {
  children: React.ReactNode
}

export const PostHogProvider = ({ children }: PostHogProviderProps) => {
  const { isSignedIn, user } = useAuth()

  useEffect(() => {
    // Initialize PostHog on mount
    const client = initPostHog()

    if (!client) {
      return // PostHog not configured
    }

    // Identify user when signed in
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      })
    }

    // Reset on sign out
    return () => {
      if (!isSignedIn) {
        posthog.reset()
      }
    }
  }, [isSignedIn, user])

  return <>{children}</>
}
