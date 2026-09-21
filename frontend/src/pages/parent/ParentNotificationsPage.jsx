import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const TYPE_CONFIG = {
  STOP_REACHED: { icon: "🚏", label: "Stop Reached", color: "#15803d", bg: "#dcfce7" },
  TRIP_STARTED: { icon: "🚀", label: "Trip Started", color: "#1d4ed8", bg: "#dbeafe" },
  TRIP_COMPLETED: { icon: "🏁", label: "Trip Completed", color: "#374151", bg: "#f3f4f6" },
  TRIP_CANCELLED: { icon: "❌", label: "Trip Cancelled", color: "#991b1b", bg: "#fee2e2" },
  ALERT: { icon: "⚠️", label: "Alert", color: "#b45309", bg: "#fef3c7" },
};

function typeConfig(type) {
  return TYPE_CONFIG[type] || { icon: "🔔", label: type, color: "#475569", bg: "#f1f5f9" };
}

function NotificationItem({ notif, onMarkRead }) {
  const cfg = typeConfig(notif.type);
  const sentAt = notif.sent_at ? new Date(notif.sent_at) : new Date(notif.created_at);

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        background: notif.is_read ? "#ffffff" : "#eff6ff",
        border: `1px solid ${notif.is_read ? "#e2e8f0" : "#bfdbfe"}`,
        borderRadius: 10,
        position: "relative",
      }}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#3b82f6",
          }}
        />
      )}

      {/* Type icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: cfg.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {cfg.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type badge */}
        <div style={{ marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: cfg.color,
              background: cfg.bg,
              padding: "2px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: notif.is_read ? 600 : 800, color: "#1e293b", marginBottom: 4 }}>
          {notif.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{notif.body}</div>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
            fontSize: 11,
            color: "#94a3b8",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span>🕐 {sentAt.toLocaleString()}</span>
          {notif.bus_number && <span>🚌 {notif.bus_number}</span>}
          {notif.route_name && <span>📍 {notif.route_name}</span>}
          {!notif.is_read && (
            <button
              onClick={() => onMarkRead(notif.id)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "1px solid #bfdbfe",
                color: "#3b82f6",
                borderRadius: 6,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, unread: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await apiRequest(`/parent/notifications?page=${page}&limit=20`);
      setNotifications(data.notifications);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  async function handleMarkRead(id) {
    try {
      await apiRequest(`/parent/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setPagination((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await apiRequest("/parent/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setPagination((prev) => ({ ...prev, unread: 0 }));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading && notifications.length === 0) {
    return <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading notifications…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "#dc2626" }}>
        Error: {error}
        <button onClick={() => fetchNotifications(1)} style={{ marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e293b" }}>
            🔔 Notifications
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            {pagination.total} total · {pagination.unread} unread
          </p>
        </div>
        {pagination.unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              opacity: markingAll ? 0.7 : 1,
            }}
          >
            {markingAll ? "Marking…" : "✓ Mark All Read"}
          </button>
        )}
      </div>

      {/* No notifications */}
      {notifications.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "#94a3b8",
            border: "2px dashed #e2e8f0",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔕</div>
          <div style={{ fontWeight: 700 }}>No notifications yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            You will be notified when the bus reaches a stop.
          </div>
        </div>
      )}

      {/* Notification schema note */}
      {notifications.length > 0 && (
        <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
          Note: The is_read field is supported in the database schema.
          Notifications are marked read individually or all at once.
        </div>
      )}

      {/* Notifications list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map((notif) => (
          <NotificationItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {pagination.page > 1 && (
            <button onClick={() => fetchNotifications(pagination.page - 1)} style={{ padding: "6px 14px", cursor: "pointer" }}>
              ← Previous
            </button>
          )}
          <span style={{ padding: "6px 14px", color: "#64748b", fontSize: 13 }}>
            Page {pagination.page}
          </span>
          {pagination.page * pagination.limit < pagination.total && (
            <button onClick={() => fetchNotifications(pagination.page + 1)} style={{ padding: "6px 14px", cursor: "pointer" }}>
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
