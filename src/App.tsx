import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import LiveRun from "./pages/LiveRun";
import ToolOrchestrator from "./pages/ToolOrchestrator";
import TraceAnalyzer from "./pages/TraceAnalyzer";
import ToolHub from "./pages/ToolHub";
import Settings from "./pages/Settings";
import Evals from "./pages/Evals";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { SeerLayout } from "./components/seer/SeerLayout";
import Agents from "./pages/Agents";
import Workflows from "./pages/Workflows";

import './App.css'
import { SignIn, SignUp } from "@clerk/clerk-react";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/workflows" replace />} />
            <Route path="/agents" element={
              <ProtectedRoute>
                <SeerLayout>
                  <Agents />
                </SeerLayout>
              </ProtectedRoute>
            } />

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
              path="/run/:id"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <LiveRun />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tool-orchestrator"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <ToolOrchestrator />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trace"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <TraceAnalyzer />
                  </SeerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <ToolHub />
                  </SeerLayout>
                </ProtectedRoute>
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
              path="/eval"
              element={
                <ProtectedRoute>
                  <SeerLayout>
                    <Evals />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
