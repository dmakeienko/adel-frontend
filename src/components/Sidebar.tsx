import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Sidebar.css';

export function Sidebar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    showNotification('You have been logged out successfully', 'info');
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">AD</div>
        <span className="sidebar-title">ADEL</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to={`/user/${user.sAMAccountName}`}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }
        >
          <svg
            className="sidebar-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          My Account
        </NavLink>

        <button className="sidebar-link logout-button" onClick={handleLogout}>
          <svg
            className="sidebar-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log Out
        </button>
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user.givenName?.charAt(0) || user.sAMAccountName.charAt(0)}
          {user.sn?.charAt(0) || ''}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">
            {user.displayName || user.sAMAccountName}
          </span>
          <span className="sidebar-user-email">{user.mail}</span>
        </div>
      </div>
    </aside>
  );
}
