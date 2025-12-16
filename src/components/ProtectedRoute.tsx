import { Navigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!authClient.isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
