import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationBanner } from './components/NotificationBanner';
import { LoginPage } from './pages/LoginPage';
import { UserPage } from './pages/UserPage';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <Navigate to={`/user/${user.sAMAccountName}`} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/user/:username"
        element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <NotificationBanner />
          <AppRoutes />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
