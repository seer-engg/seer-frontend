/**
 * Debug utilities for PostHog analytics
 * Use this hook to test and verify PostHog implementation
 */
import { posthog } from '@/lib/posthog'

export const usePostHogDebug = () => {
  /**
   * Test if PostHog is loaded and check current user identification
   */
  const testIdentify = () => {
    console.group('[PostHog Debug] Identity Check')
    console.log('PostHog loaded:', posthog.__loaded)
    console.log('Distinct ID:', posthog.get_distinct_id())
    console.log('Email:', posthog.get_property('email'))
    console.log('First Name:', posthog.get_property('firstName'))
    console.log('Last Name:', posthog.get_property('lastName'))
    console.log('Username:', posthog.get_property('username'))
    console.groupEnd()
  }

  /**
   * Capture a test event to verify event tracking works
   */
  const testEvent = () => {
    if (!posthog.__loaded) {
      console.error('[PostHog Debug] PostHog not loaded')
      return
    }

    posthog.capture('debug_test_event', {
      timestamp: Date.now(),
      test: true,
    })
    console.log('[PostHog Debug] Test event captured')
  }

  /**
   * Get all person properties
   */
  const getAllProperties = () => {
    console.group('[PostHog Debug] All Person Properties')
    console.log(posthog.getPersonProperties())
    console.groupEnd()
  }

  return {
    testIdentify,
    testEvent,
    getAllProperties,
  }
}
