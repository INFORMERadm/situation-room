import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { ProtectedRoute, PublicRoute, OnboardingRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import MarketsDashboard from './pages/MarketsDashboard';
import SmitheryOAuthCallback from './pages/SmitheryOAuthCallback';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WatchlistProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <OnboardingPage />
                </OnboardingRoute>
              }
            />
            <Route
              path="/auth/smithery/callback"
              element={
                <ProtectedRoute>
                  <SmitheryOAuthCallback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <PlatformProvider>
                    <MarketsDashboard />
                  </PlatformProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </WatchlistProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
