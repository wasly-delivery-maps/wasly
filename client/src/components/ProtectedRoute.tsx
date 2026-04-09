import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import NotFound from "@/pages/NotFound";

interface ProtectedRouteProps {
  component: React.ComponentType;
  requiredRole?: "customer" | "driver" | "admin";
}

export default function ProtectedRoute({ component: Component, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check if user has required role
  if (requiredRole && user?.role !== requiredRole) {
    return <NotFound />;
  }

  return <Component />;
}
