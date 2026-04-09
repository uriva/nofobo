import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import db from "./db.ts";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Compare from "./pages/Compare.tsx";
import MyDecisions from "./pages/MyDecisions.tsx";
import Admin from "./pages/Admin.tsx";
import Profile from "./pages/Profile.tsx";
import { CommunityProvider } from "./components/CommunityContext.tsx";
import Spinner from "./components/Spinner.tsx";

function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const { isLoading, user, error } = db.useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <Spinner message="Loading..." size="lg" />
      </div>
    );
  }
  if (error || !user) {
    return <Navigate to="/app/auth" replace />;
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
        <Spinner message="Loading..." size="lg" />
      </div>
    );
  }

  if (!data?.profiles?.length) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <CommunityProvider>{children}</CommunityProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/auth" element={<Auth />} />
        <Route
          path="/app/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/compare"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <Compare />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/decisions"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <MyDecisions />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <Admin />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <OnboardedRoute>
                <Profile />
              </OnboardedRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
