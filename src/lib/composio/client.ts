const COMPOSIO_GITHUB_AUTH_CONFIG_ID = import.meta.env.VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID;
const COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID = import.meta.env.VITE_COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID;
const COMPOSIO_ASANA_AUTH_CONFIG_ID = import.meta.env.VITE_COMPOSIO_ASANA_AUTH_CONFIG_ID;
// Fixed Gmail auth config ID (from Composio dashboard)
const COMPOSIO_GMAIL_AUTH_CONFIG_ID = "ac_XXRRIJCJCZRJ";


export function getGithubAuthConfigId(): string | null {
  if (!COMPOSIO_GITHUB_AUTH_CONFIG_ID) {
    console.warn("[Composio] Missing VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID env var");
    return null;
  }

  return COMPOSIO_GITHUB_AUTH_CONFIG_ID;
}

export function getGoogleDriveAuthConfigId(): string | null {
  if (!COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID) {
    console.warn("[Composio] Missing VITE_COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID env var");
    return null;
  }

  return COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID;
}

export function getAsanaAuthConfigId(): string | null {
  if (!COMPOSIO_ASANA_AUTH_CONFIG_ID) {
    console.warn("[Composio] Missing VITE_COMPOSIO_ASANA_AUTH_CONFIG_ID env var");
    return null;
  }

  return COMPOSIO_ASANA_AUTH_CONFIG_ID;
}

export function getGmailAuthConfigId(): string | null {
  // Currently a fixed ID; change to env-based if you need configurability.
  return COMPOSIO_GMAIL_AUTH_CONFIG_ID;
}

export type IntegrationType = "sandbox" | "github" | "googledrive" | "asana" | "gmail";

export function getAuthConfigId(type: IntegrationType): string | null {
  switch (type) {
    case "sandbox":
      return null; // Sandbox doesn't need auth config
    case "github":
      return getGithubAuthConfigId();
    case "googledrive":
      return getGoogleDriveAuthConfigId();
    case "asana":
      return getAsanaAuthConfigId();
    case "gmail":
      return getGmailAuthConfigId();
    default:
      return null;
  }
}

