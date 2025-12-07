import { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Sidebar } from '../components/Sidebar';
import { UserSearch } from '../components/UserSearch';
import { GroupMembership } from '../components/GroupMembership';
import type { User } from '../types';
import api from '../services/api';
import './UserPage.css';

export function UserPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const loadUser = useCallback(async () => {
    if (!username) return;

    setIsLoadingUser(true);
    try {
      const response = await api.getUser(username);
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        showNotification(response.error || 'User not found', 'error');
        setUser(null);
      }
    } catch {
      showNotification('Failed to load user data', 'error');
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [username, showNotification]);

  useEffect(() => {
    if (isAuthenticated && username) {
      loadUser();
    }
  }, [username, isAuthenticated, loadUser]);

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

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr || dateStr === null) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isViewingOwnProfile = currentUser?.sAMAccountName === username;

  return (
    <div className="user-page">
      <Sidebar />

      <main className="main-content">
        <header className="page-header">
          <div className="header-left">
            <h2>User</h2>
            <UserSearch />
          </div>
        </header>

        {isLoadingUser ? (
          <div className="loading-content">
            <div className="loading-spinner" />
            <p>Loading user data...</p>
          </div>
        ) : user ? (
          <div className="content-area">
            <section className="profile-section">
              <h2>Profile</h2>

              <div className="profile-header">
                <div className="profile-avatar">
                  {user.givenName?.charAt(0) || user.sAMAccountName.charAt(0)}
                  {user.sn?.charAt(0) || ''}
                </div>
                <div className="profile-summary">
                  <h3>{user.displayName || user.sAMAccountName}</h3>
                  <p>{user.title || 'No title'}</p>
                  {!isViewingOwnProfile && (
                    <span className="viewing-other-badge">
                      Viewing another user's profile
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-field">
                  <label>Name</label>
                  <span>{user.givenName || '-'}</span>
                </div>

                <div className="profile-field">
                  <label>Last Name</label>
                  <span>{user.sn || '-'}</span>
                </div>

                <div className="profile-field">
                  <label>Full Name</label>
                  <span>{user.displayName || '-'}</span>
                </div>

                <div className="profile-field full-width">
                  <label>DN</label>
                  <span className="dn-value">{user.dn}</span>
                </div>

                <div className="profile-field">
                  <label>Username</label>
                  <span>{user.sAMAccountName}</span>
                </div>

                <div className="profile-field">
                  <label>Email</label>
                  <span>
                    {user.mail ? (
                      <a href={`mailto:${user.mail}`}>{user.mail}</a>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>

                <div className="profile-field">
                  <label>Account Exp. Date</label>
                  <span>{user.accountExpires === null ? 'Never' : formatDate(user.accountExpires)}</span>
                </div>

                <div className="profile-field">
                  <label>Password Last Set</label>
                  <span>{user.pwdLastSet === null ? 'Not Set' : formatDate(user.pwdLastSet)}</span>
                </div>

                <div className="profile-field">
                  <label>Password Exp. Date</label>
                  <span>{user.passwordExpiryDate === null ? 'Never' : formatDate(user.passwordExpiryDate)}</span>
                </div>

                <div className="profile-field">
                  <label>Account Disabled</label>
                  <span
                    className={`status-badge ${user.enabled ? 'enabled' : 'disabled'}`}
                  >
                    {user.enabled ? 'No' : 'Yes'}
                  </span>
                </div>
              </div>
            </section>

            <GroupMembership user={user} onUpdate={loadUser} />
          </div>
        ) : (
          <div className="not-found">
            <h3>User not found</h3>
            <p>The user "{username}" could not be found in Active Directory.</p>
          </div>
        )}
      </main>
    </div>
  );
}
