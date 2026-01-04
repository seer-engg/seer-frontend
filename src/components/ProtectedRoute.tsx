import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearSignupSource } from "../utils/utm-tracker";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If user just signed up (has signup_source in URL), clear it from localStorage
    // and remove from URL to clean up
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('signup_source')) {
      clearSignupSource();

      // Remove signup_source from URL
      searchParams.delete('signup_source');
      const newSearch = searchParams.toString();
      const newUrl = location.pathname + (newSearch ? `?${newSearch}` : '');

      // Replace the URL without reloading
      navigate(newUrl, { replace: true });

      console.log('[ProtectedRoute] Signup source captured by backend, cleared from localStorage');
    }
  }, [location, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
