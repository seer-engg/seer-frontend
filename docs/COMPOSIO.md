# Composio GitHub Integration

The Evals page now lets users authenticate their GitHub account through Composio and pick a repository to evaluate against. This feature relies on the Composio TypeScript SDK and requires a couple of new environment variables at build/runtime.

## Required Environment Variables

Add the following entries to your `.env` file (or Vite environment of choice):

```env
VITE_COMPOSIO_API_KEY=sk_********************************
VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID=ac_************************
```

- `VITE_COMPOSIO_API_KEY`: Your Composio project API key. You can copy it from the Composio dashboard.
- `VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID`: The auth config ID for the GitHub OAuth configuration you already created inside Composio (`ac_xxx`).

> **Note:** These values are exposed to the browser. Use Composio public keys intended for client-side usage and keep privileged keys on the server.

## How the Flow Works

1. We treat the signed-in Supabase user's email as the Composio `userId`.
2. When the Evals page loads, we check `connectedAccounts` for GitHub under that user.
3. If an account exists, we fetch their repositories via the `GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER` tool and present them for selection.
4. If no connection exists, the user can click **Authorize GitHub**, which redirects them through Composio's OAuth consent screen and back to the app.

The resulting connection ID is shown in the query string; we wait for it to become active and refresh the repository list automatically.

