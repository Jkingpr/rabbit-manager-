import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import LandingPage from "@/react-app/pages/Landing";
import LoginPage from "@/react-app/pages/Login";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import RegisterPage from "@/react-app/pages/Register";
import HomePage from "@/react-app/pages/Home";
import SettingsPage from "@/react-app/pages/Settings";
import AdminPage from "@/react-app/pages/Admin";

import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import { InstallPromptBanner } from "@/react-app/components/InstallPromptBanner";

// RabbitManager v2.0.0 - Sistema profesional de gestión cunícola
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <InstallPromptBanner />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/complete-registration" element={<ProtectedRoute><RegisterPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
