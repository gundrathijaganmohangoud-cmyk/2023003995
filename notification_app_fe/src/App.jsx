import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJqZ3VuZHJhdEBnaXRhbS5pbiIsImV4cCI6MTc4MDgxNzA3MiwiaWF0IjoxNzgwODE2MTcyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiOWExZmIzYjAtMjFlZC00NjUzLTk5YWUtYTdmYWU4YzUwN2MyIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiamFnYW4gbW9oYW4gZ291ZCIsInN1YiI6ImU0NTQxNDUxLTFiZTAtNDc1OC1hM2M4LTRhYjY1ODlmZGMzOSJ9LCJlbWFpbCI6ImpndW5kcmF0QGdpdGFtLmluIiwibmFtZSI6ImphZ2FuIG1vaGFuIGdvdWQiLCJyb2xsTm8iOiIyMDIzMDAzOTk1IiwiYWNjZXNzQ29kZSI6IndnS3RnWiIsImNsaWVudElEIjoiZTQ1NDE0NTEtMWJlMC00NzU4LWEzYzgtNGFiNjU4OWZkYzM5IiwiY2xpZW50U2VjcmV0Ijoia3VhRnRCRHZoWmtNVUhORiJ9.MBr7p_kngKbizg6-kDmgxjM-Fni67EHGpuQu7eLaXkw';

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' },
  header: { backgroundColor: '#1a73e8', color: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: { padding: '8px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  activeTab: { backgroundColor: '#1a73e8', color: 'white' },
  inactiveTab: { backgroundColor: '#e0e0e0', color: '#333' },
  filters: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: { padding: '6px 16px', border: '1px solid #ccc', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
  activeFilter: { backgroundColor: '#1a73e8', color: 'white', border: '1px solid #1a73e8' },
  card: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '12px' },
  unreadCard: { backgroundColor: '#e8f0fe', border: '1px solid #1a73e8' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', marginBottom: '6px' },
  placement: { backgroundColor: '#fce8b2', color: '#b06000' },
  result: { backgroundColor: '#d4edda', color: '#155724' },
  event: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  message: { fontSize: '15px', color: '#333', marginBottom: '6px' },
  time: { fontSize: '12px', color: '#888' },
  unreadDot: { display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#1a73e8', borderRadius: '50%', marginRight: '8px' },
  loading: { textAlign: 'center', padding: '40px', color: '#888' },
  error: { textAlign: 'center', padding: '40px', color: 'red' },
  priorityNum: { fontSize: '12px', color: '#888', marginTop: '4px' }
};

function getTypeBadgeStyle(type) {
  if (type === 'Placement') return styles.placement;
  if (type === 'Result') return styles.result;
  return styles.event;
}

function calculatePriority(notification) {
  const weights = { Placement: 3, Result: 2, Event: 1 };
  const weight = weights[notification.Type] || 1;
  const ageHours = (Date.now() - new Date(notification.Timestamp).getTime()) / 3600000;
  const recency = Math.max(0, 10 - ageHours);
  return (weight * 0.5) + (recency * 0.3);
}

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState('all'); // 'all' or 'priority'
  const [filter, setFilter] = useState('All');
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
      });
      setNotifications(res.data.notifications || res.data || []);
    } catch (err) {
      setError('Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id) => {
    setReadIds(prev => [...prev, id]);
  };

  const isRead = (id) => readIds.includes(id);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true;
    return n.Type === filter;
  });

  const priorityNotifications = [...notifications]
    .map(n => ({ ...n, score: calculatePriority(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const displayList = page === 'priority' ? priorityNotifications : filteredNotifications;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>📢 Campus Notifications</h2>
        <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.85 }}>
          Jagan Mohan Goud — 2023003995
        </p>
      </div>

      {/* Page Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(page === 'all' ? styles.activeTab : styles.inactiveTab) }}
          onClick={() => setPage('all')}
        >
          All Notifications
        </button>
        <button
          style={{ ...styles.tab, ...(page === 'priority' ? styles.activeTab : styles.inactiveTab) }}
          onClick={() => setPage('priority')}
        >
          ⭐ Priority Inbox (Top 10)
        </button>
        <button
          style={{ ...styles.tab, ...styles.inactiveTab, marginLeft: 'auto' }}
          onClick={fetchNotifications}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters — only on All tab */}
      {page === 'all' && (
        <div style={styles.filters}>
          {['All', 'Placement', 'Result', 'Event'].map(type => (
            <button
              key={type}
              style={{ ...styles.filterBtn, ...(filter === type ? styles.activeFilter : {}) }}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && <div style={styles.loading}>Loading notifications...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && !error && displayList.length === 0 && (
        <div style={styles.loading}>No notifications found.</div>
      )}

      {!loading && !error && displayList.map((n) => (
        <div
          key={n.ID}
          style={{ ...styles.card, ...(isRead(n.ID) ? {} : styles.unreadCard) }}
          onClick={() => markAsRead(n.ID)}
        >
          <div>
            {!isRead(n.ID) && <span style={styles.unreadDot} />}
            <span style={{ ...styles.badge, ...getTypeBadgeStyle(n.Type) }}>
              {n.Type}
            </span>
          </div>
          <div style={styles.message}>{n.Message}</div>
          <div style={styles.time}>
            {new Date(n.Timestamp).toLocaleString()}
            {isRead(n.ID) && <span style={{ marginLeft: '10px', color: '#34a853' }}>✓ Read</span>}
          </div>
          {page === 'priority' && (
            <div style={styles.priorityNum}>Priority score: {n.score?.toFixed(2)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
