import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import db from "./db.ts";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Compare from "./pages/Compare.tsx";
import Match from "./pages/Match.tsx";
import Profile from "./pages/Profile.tsx";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, user, error } = db.useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <div className="animate-pulse text-grape-400 text-xl">Loading...</div>
      </div>
    );
  }
  if (error || !user) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function OnboardedRoute({ children }: { children: React.ReactNode }) {
  const { user } = db.useAuth();
  const { data, isLoading } = db.useQuery(
    user
      ? {
          profiles: {
            $: {
              where: { "user.id": user.id, onboardingComplete: true },
              limit: 1,
            },
          },
        }
      : null,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <div className="animate-pulse text-grape-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!data?.profiles?.length) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <Compare />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/match"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <Match />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
