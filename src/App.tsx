import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/general/ProtectedRoute";
import { SeerLayout } from "./components/seer/SeerLayout";
import Workflows from "./pages/Workflows";
import { ExecutionTrace } from "./pages/ExecutionTrace";
import PublicForm from "./pages/PublicForm";
import './App.css'
import { SignIn, SignUp } from "@clerk/clerk-react";
import { getStoredSignupSource } from "./utils/utm-tracker";
import { KeyboardShortcutProvider } from "@/hooks/utility/useKeyboardShortcuts";
import { StoreInitializer } from "@/components/general/StoreInitializer";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000, // 5 minutes - tools, models, and node types don't change frequently
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <KeyboardShortcutProvider>
          <StoreInitializer />
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/workflows" replace />} />

            <Route
              path="/sign-in/*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                  <SignIn routing="path" path="/sign-in" />
                </div>
              }
            />
            <Route
              path="/sign-up/*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                  <SignUp
                    routing="path"
                    path="/sign-up"
                    afterSignUpUrl={`/workflows?signup_source=${getStoredSignupSource() || 'Direct'}`}
                  />
                </div>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <Settings />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows/:workflowId"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <Workflows />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <Workflows />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/executions/:runId"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <ExecutionTrace />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />

            {/* Public form route - MUST come before NotFound to catch /:suffix */}
            <Route path="/:suffix" element={<PublicForm />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </KeyboardShortcutProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
