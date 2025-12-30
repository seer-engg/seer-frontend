import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { SeerLayout } from "./components/seer/SeerLayout";
import Workflows from "./pages/Workflows";
import BlockConfiguration from "./pages/BlockConfiguration";
import Traces from "./pages/Traces";
import TraceDetail from "./pages/TraceDetail";
import WorkflowExecution from "./pages/WorkflowExecution";
import './App.css'
import { SignIn, SignUp } from "@clerk/clerk-react";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
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
                  <SignUp routing="path" path="/sign-up" />
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
              path="/workflows/:workflowId/blocks/:blockId/configure"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <BlockConfiguration />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows/:workflowId/executions"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <WorkflowExecution />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/traces"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <Traces />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/traces/:threadId"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <TraceDetail />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
