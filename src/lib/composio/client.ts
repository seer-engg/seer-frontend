import { Composio } from "@composio/core";

let cachedClient: Composio | null = null;

const COMPOSIO_API_KEY = import.meta.env.VITE_COMPOSIO_API_KEY;
const COMPOSIO_GITHUB_AUTH_CONFIG_ID = import.meta.env.VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID;

/**
 * Singleton accessor for the Composio SDK client.
 * Returns null when the browser does not have the required configuration yet.
 */
export function getComposioClient(): Composio | null {
  if (!COMPOSIO_API_KEY) {
    console.warn("[Composio] Missing VITE_COMPOSIO_API_KEY env var");
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new Composio({
      apiKey: COMPOSIO_API_KEY,
      allowTracking: false,
      host: "seer-sparkle-dash",
      disableVersionCheck: import.meta.env.DEV,
    });
  }

  return cachedClient;
}

export function getGithubAuthConfigId(): string | null {
  if (!COMPOSIO_GITHUB_AUTH_CONFIG_ID) {
    console.warn("[Composio] Missing VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID env var");
    return null;
  }

  return COMPOSIO_GITHUB_AUTH_CONFIG_ID;
}

