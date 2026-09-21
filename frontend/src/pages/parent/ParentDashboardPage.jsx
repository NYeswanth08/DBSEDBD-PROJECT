import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import { RedBusJourneyTracker } from "../../components/RedBusJourneyTracker";

// Status badge config
const STATUS_CONFIG = {
  LIVE: { label: "🟢 Live", color: "#15803d", bg: "#dcfce7" },
  BUS_ON_ROUTE: { label: "🚌 Bus On Route", color: "#1d4ed8", bg: "#dbeafe" },
  TRIP_NOT_STARTED: { label: "⏳ Trip Not Started", color: "#92400e", bg: "#fef3c7" },
  STOP_REACHED: { label: "✅ All Stops Reached", color: "#15803d", bg: "#dcfce7" },
  TRIP_COMPLETED: { label: "🏁 Trip Completed", color: "#374151", bg: "#f3f4f6" },
  TRIP_CANCELLED: { label: "❌ Trip Cancelled", color: "#991b1b", bg: "#fee2e2" },
  LOCATION_STALE: { label: "🟡 Location Stale", color: "#92400e", bg: "#fef3c7" },
  NO_LOCATION: { label: "📡 No GPS Signal", color: "#64748b", bg: "#f1f5f9" },
  UNKNOWN: { label: "❓ Unknown", color: "#64748b", bg: "#f1f5f9" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}22`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function StudentCard({ studentData, onViewJourney }) {
  const { student, transport } = studentData;
  const { status, bus, driver, location, journey, trip, pickup_stop, dropoff_stop, student_status } = transport;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>🎒 {student.name}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Class {student.class}</div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Bus Info */}
      {bus && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            background: "#f8faff",
            borderRadius: 10,
            padding: "12px 16px",
            border: "1px solid #e0e7ff",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Bus</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>🚌 {bus.bus_number}</div>
          </div>
          {trip && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Route</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{trip.route_name}</div>
            </div>
          )}
          {trip && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Direction</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                {trip.direction === "PICKUP" ? "🏠→🏫 Pickup" : "🏫→🏠 Dropoff"}
              </div>
            </div>
          )}
          {journey && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Progress</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
                {journey.reached_stops_count}/{journey.total_stops} stops
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Assigned Stops */}
      {(pickup_stop || dropoff_stop || student_status) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            color: "#166534",
          }}
        >
          {student_status && (
            <span>
              <strong>Student Status:</strong>{" "}
              <span
                style={{
                  background: student_status === "BOARDED" || student_status === "ON_BUS" ? "#dcfce7" : student_status === "DROPPED_OFF" ? "#f1f5f9" : "#fef3c7",
                  color: student_status === "BOARDED" || student_status === "ON_BUS" ? "#15803d" : student_status === "DROPPED_OFF" ? "#475569" : "#b45309",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {student_status}
              </span>
            </span>
          )}
          {pickup_stop && (
            <span>
              🚏 <strong>Pickup:</strong> {pickup_stop.name} (Stop #{pickup_stop.stop_order})
            </span>
          )}
          {dropoff_stop && (
            <span>
              🏁 <strong>Dropoff:</strong> {dropoff_stop.name} (Stop #{dropoff_stop.stop_order})
            </span>
          )}
        </div>
      )}


      {/* GPS Location */}
      {location && (
        <div
          style={{
            fontSize: 12,
            color: "#475569",
            background: location.is_stale ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${location.is_stale ? "#fde68a" : "#bbf7d0"}`,
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, color: location.is_stale ? "#92400e" : "#15803d" }}>
            {location.is_stale ? "🟡 Signal Stale" : "🟢 Live GPS"}
          </span>
          <span>📍 {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}</span>
          {location.accuracy !== null && <span>🎯 ±{Math.round(location.accuracy)}m</span>}
          <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
            {location.is_stale
              ? `Last seen ${location.age_seconds}s ago`
              : `Updated: ${new Date(location.recorded_at).toLocaleTimeString()}`}
          </span>
        </div>
      )}

      {/* No location */}
      {!location && trip && (status === "BUS_ON_ROUTE" || status === "NO_LOCATION") && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          📡 GPS data not yet received for this trip.
        </div>
      )}

      {/* View Journey Button */}
      {trip && journey && journey.total_stops > 0 && (
        <button
          onClick={() => onViewJourney(studentData)}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          🗺️ View Live Journey
        </button>
      )}

      {/* No trip message */}
      {!trip && (
        <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
          No active trip found at this time.
        </div>
      )}
    </div>
  );
}

function JourneyModal({ studentData, onClose }) {
  const { student, transport } = studentData;
  const [data, setData] = useState(transport);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiRequest(`/parent/students/${student.student_id}/status`);
      setData(result.transport);
    } catch {
      // silently ignore refresh errors
    } finally {
      setLoading(false);
    }
  }, [student.student_id]);

  useEffect(() => {
    intervalRef.current = setInterval(refresh, 8000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const { trip, location, journey } = data;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 999,
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 720,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          marginTop: 10,
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>
              🗺️ Live Journey — {student.name}
            </div>
            {trip && (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                🚌 {trip.bus_number} · {trip.route_name} ·{" "}
                {trip.direction === "PICKUP" ? "Pickup" : "Dropoff"}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {loading && <span style={{ fontSize: 12, color: "#64748b" }}>Refreshing…</span>}
            <button
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -12 }}>
          🔄 Auto-refreshes every 8 seconds
        </div>

        {/* Journey Tracker */}
        {journey ? (
          <RedBusJourneyTracker journey={journey} location={location} trip={trip} />
        ) : (
          <div style={{ color: "#64748b", fontStyle: "italic", padding: 16 }}>
            Journey data not available.
          </div>
        )}
      </div>
    </div>
  );
}

export function ParentDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiRequest("/parent/dashboard");
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, 10000);
    return () => clearInterval(intervalRef.current);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
        Loading your dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "#dc2626" }}>
        Error: {error}
        <br />
        <button
          onClick={fetchDashboard}
          style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { parent, children } = dashboard || { parent: null, children: [] };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 0" }}>
      {/* Parent Info Banner */}
      {parent && (
        <div
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            borderRadius: 14,
            padding: "20px 24px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>👋 Welcome, {parent.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              📞 {parent.phone}
              {parent.email && ` · ✉️ ${parent.email}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Linked Children</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{children.length}</div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
          🚌 Transport Status
        </h2>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Auto-refreshes every 10s</span>
      </div>

      {/* No children */}
      {children.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#94a3b8",
            border: "2px dashed #e2e8f0",
            borderRadius: 12,
          }}
        >
          No students linked to your account. Please contact the school administrator.
        </div>
      )}

      {/* Student Cards */}
      {children.map((item) => (
        <StudentCard
          key={item.student.student_id}
          studentData={item}
          onViewJourney={setSelectedJourney}
        />
      ))}

      {/* Journey Modal */}
      {selectedJourney && (
        <JourneyModal
          studentData={selectedJourney}
          onClose={() => setSelectedJourney(null)}
        />
      )}
    </div>
  );
}
