import { useEffect, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import getErrorMessage from '../utils/getErrorMessage';

function formatTime(value) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

// Har logged-in user ki apni notifications (server sirf apni deta hai).
function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((data) => {
        if (cancelled) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  async function handleMarkRead(notification) {
    try {
      await markNotificationRead(notification.id);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Notifications {unreadCount > 0 && <span className="badge badge-in_clearance">{unreadCount} unread</span>}</h1>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={handleMarkAll}>
            Mark all read
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="muted">You have no notifications.</p>
      ) : (
        <ul className="notification-list">
          {notifications.map((notification) => {
            const unread = notification.status === 'logged';
            return (
              <li key={notification.id} className={`notification${unread ? ' notification-unread' : ''}`}>
                <div className="notification-head">
                  <strong>{notification.title || notification.event}</strong>
                  <span className="muted small">{formatTime(notification.createdAt)}</span>
                </div>
                <p>{notification.message}</p>
                {unread && (
                  <button type="button" className="btn-link" onClick={() => handleMarkRead(notification)}>
                    Mark read
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Notifications;
