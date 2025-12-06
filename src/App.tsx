import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import Rube from "./pages/Rube";
import ToolHub from "./pages/ToolHub";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { SeerLayout } from "./components/seer/SeerLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <SeerLayout>
                      <Projects />
                    </SeerLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <SeerLayout>
                      <NewProject />
                    </SeerLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rube"
                element={
                  <ProtectedRoute>
                    <SeerLayout>
                      <Rube />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
