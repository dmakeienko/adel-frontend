import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './LoginPage.css';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showNotification('Please enter username and password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login({ username, password });
      if (result.success) {
        showNotification('Login successful! Welcome to ADEL.', 'success', 10000);
        navigate(`/user/${username}`);
      } else {
        showNotification(result.message || 'Login failed', 'error');
      }
    } catch {
      showNotification('An error occurred during login', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="branding">
          <div className="logo">
            <span className="logo-icon">AD</span>
          </div>
          <h1 className="app-title">ADEL</h1>
          <p className="app-subtitle">Active Directory Easy Liaison</p>
          <p className="app-description">
            A secure web interface for managing Active Directory users and
            groups. Connect to your organization's directory service with your
            existing credentials.
          </p>
        </div>

        {!showForm ? (
          <button
            className="login-button primary-button"
            onClick={() => setShowForm(true)}
          >
            Log In
          </button>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your AD username"
                autoComplete="username"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
