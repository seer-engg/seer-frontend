# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/bf0920a9-8c3d-4d3e-984c-d2700c32fb05

## Core Architecture Principle

**If workflows and agents are fundamentally different at the UI layer, they should be different at the API layer.**

This principle guides our component design: workflows (deterministic, node-based execution with DAG visualization) and agents (dynamic, message-based conversations with reasoning) have distinct mental models, data structures, and user needs. Rather than forcing unification through shared components or transformation layers, we maintain separate UI components and routes that align with their fundamental differences. This reduces complexity, improves maintainability, and ensures each system can evolve independently.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bf0920a9-8c3d-4d3e-984c-d2700c32fb05) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Bun installed - [install Bun](https://bun.sh/docs/installation)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
bun install

# Step 4: Start the development server with auto-reloading and an instant preview.
bun run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bf0920a9-8c3d-4d3e-984c-d2700c32fb05) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Backend URL Configuration

The frontend can connect to a backend server in three ways (in priority order):

1. **Query parameter** (highest priority): `?backend=http://localhost:8000`
2. **Environment variable**: `VITE_BACKEND_API_URL=http://localhost:8000`
3. **Fallback**: Automatically uses `http://localhost:8000` (Docker default) with a console warning

The backend must implement LangGraph Server API endpoints:
- `/health` - Health check endpoint (returns server info including status, server name, and version)
- `/info` - Server info endpoint (returns same data as `/health` for connectivity checks)

## LangGraph Agent Chat

The dashboard now embeds the reusable Agent Chat UI from `agent-chat-ui` for both the supervisor and eval agents. The shared `AgentChatContainer` component lives in `src/features/agent-chat/AgentChatContainer.tsx` and simply needs an API URL plus an assistant (graph) ID.

You can override the built-in defaults via environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_BACKEND_API_URL` | Backend API base URL | `http://localhost:8000` (fallback) |
| `VITE_AGENT_CHAT_API_URL` | Optional global LangGraph deployment URL fallback | `http://localhost:8000` |
| `VITE_AGENT_CHAT_ASSISTANT_ID` | Optional global assistant ID fallback | _none_ |
| `VITE_EVAL_AGENT_ID` | Eval graph ID | `eval_agent` |
| `VITE_SUPERVISOR_AGENT_ID` | Supervisor graph ID | `supervisor` |