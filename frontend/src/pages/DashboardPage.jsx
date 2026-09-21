import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminOverview, setAdminOverview] = useState(null);
  const [driverTrip, setDriverTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      apiRequest('/admin/overview')
        .then((data) => setAdminOverview(data))
        .catch((err) => console.warn('Failed to load admin overview:', err.message))
        .finally(() => setLoading(false));
    } else if (user?.role === 'DRIVER') {
      apiRequest('/driver/active-trip')
        .then((data) => setDriverTrip(data.activeTrip || data.scheduledTrip || null))
        .catch((err) => console.warn('Failed to load driver trip:', err.message))
        .finally(() => setLoading(false));
    } else if (user?.role === 'PARENT') {
      navigate('/parent/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  /* ────────────────── Admin Dashboard ────────────────── */
  if (user?.role === 'ADMIN') {
    const metrics = adminOverview?.metrics;
    const recentTrips = adminOverview?.recent_trips || [];

    return (
      <section>
        <div className="panel hero-panel" style={{ marginBottom: 20 }}>
          <p className="eyebrow">Operations Management</p>
          <h2>Transportation Overview</h2>
          <p>Real-time telemetry, fleet deployment, and student safety monitoring.</p>
        </div>

        {loading ? (
          <div className="page-state" style={{ minHeight: 180 }}>Loading overview metrics…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
              }}
            >
              <Link
                to="/admin/trips"
                className="panel"
                style={{
                  textDecoration: 'none',
                  border: metrics?.active_trips > 0 ? '2px solid #86efac' : '1px solid #e2e8f0',
                  background: metrics?.active_trips > 0 ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>🟢 ACTIVE TRIPS</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
                  {metrics?.active_trips ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>En route now ↗</div>
              </Link>

              <Link to="/admin/students" className="panel" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>STUDENTS</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {metrics?.students ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Manage roster ↗</div>
              </Link>

              <Link to="/admin/parents" className="panel" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>PARENTS</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {metrics?.parents ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Manage links ↗</div>
              </Link>

              <Link to="/admin/drivers" className="panel" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>ACTIVE DRIVERS</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {metrics?.drivers ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Fleet drivers ↗</div>
              </Link>

              <Link to="/admin/buses" className="panel" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>ACTIVE BUSES</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {metrics?.buses ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Vehicles ↗</div>
              </Link>

              <Link to="/admin/routes" className="panel" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>ROUTES & STOPS</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {metrics?.routes ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Configured routes ↗</div>
              </Link>
            </div>

            {/* Recent Trips Table */}
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, margin: 0 }}>Recent Transportation Runs</h3>
                <Link to="/admin/trips" className="table-action-button">
                  View All Trips ↗
                </Link>
              </div>

              {recentTrips.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 14 }}>No trips recorded yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trip</th>
                        <th>Bus</th>
                        <th>Route</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrips.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <strong>#{t.id}</strong> • {t.direction}
                          </td>
                          <td>{t.bus_number}</td>
                          <td>{t.route_name}</td>
                          <td>{t.driver_name}</td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                background:
                                  t.status === 'IN_PROGRESS'
                                    ? '#dcfce7'
                                    : t.status === 'SCHEDULED'
                                    ? '#dbeafe'
                                    : '#f1f5f9',
                                color:
                                  t.status === 'IN_PROGRESS'
                                    ? '#15803d'
                                    : t.status === 'SCHEDULED'
                                    ? '#1d4ed8'
                                    : '#475569',
                              }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link
                              to="/admin/trips"
                              className="table-action-button"
                              style={{ textDecoration: 'none', color: '#0284c7' }}
                            >
                              Inspect Trip
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  /* ────────────────── Driver Dashboard ────────────────── */
  if (user?.role === 'DRIVER') {
    return (
      <section>
        <div className="panel hero-panel" style={{ marginBottom: 20 }}>
          <p className="eyebrow">Driver Workspace</p>
          <h2>Welcome, {user.full_name}</h2>
          <p>Manage daily trips, share live GPS coordinates, and monitor student safety.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="panel" style={{ border: '2px solid #86efac', background: '#f0fdf4' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>🛰️ LIVE LOCATION SHARING</div>
            <h3 style={{ marginTop: 8, fontSize: 18, color: '#14532d' }}>Broadcast Bus GPS</h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>
              Transmit your real device GPS coordinates to track stop arrivals and notify parents automatically.
            </p>
            <button
              type="button"
              className="primary-button"
              style={{ background: '#16a34a', marginTop: 14, width: 'auto' }}
              onClick={() => navigate('/driver/location')}
            >
              Open GPS Broadcaster ↗
            </button>
          </div>

          <div className="panel" style={{ border: '1px solid #bfdbfe', background: '#eff6ff' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>📋 TODAY’S TRIPS</div>
            <h3 style={{ marginTop: 8, fontSize: 18, color: '#1e3a8a' }}>Assigned Schedule</h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>
              View scheduled runs for today, start assigned trips, and verify route stops.
            </p>
            <button
              type="button"
              className="primary-button"
              style={{ background: '#2563eb', marginTop: 14, width: 'auto' }}
              onClick={() => navigate('/driver/trips')}
            >
              View Assigned Trips ↗
            </button>
          </div>

          <div className="panel">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>👥 STUDENT SAFETY</div>
            <h3 style={{ marginTop: 8, fontSize: 18 }}>Attendance & Boarding</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
              Mark students as Boarded, Dropped Off, or Absent for your active trip in real time.
            </p>
            <button
              type="button"
              className="table-action-button"
              style={{ marginTop: 14 }}
              onClick={() => navigate('/driver/students')}
            >
              Manage Boarding ↗
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ────────────────── Parent Dashboard ────────────────── */
  return (
    <section>
      <div className="panel hero-panel" style={{ marginBottom: 20 }}>
        <p className="eyebrow">Parent Portal</p>
        <h2>Welcome, {user?.full_name}</h2>
        <p>Monitor student transport status, track school buses live, and receive real-time arrival alerts.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="panel" style={{ border: '2px solid #86efac', background: '#f0fdf4' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>🚌 LIVE TRACKING</div>
          <h3 style={{ marginTop: 8, fontSize: 18, color: '#14532d' }}>Track Child’s Bus</h3>
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>
            View RedBus-style stop progression, live bus GPS position, and arrival times.
          </p>
          <button
            type="button"
            className="primary-button"
            style={{ background: '#16a34a', marginTop: 14, width: 'auto' }}
            onClick={() => navigate('/parent/tracking')}
          >
            Live Bus Tracker ↗
          </button>
        </div>

        <div className="panel" style={{ border: '1px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>🔔 ALERTS & NOTIFICATIONS</div>
          <h3 style={{ marginTop: 8, fontSize: 18, color: '#1e3a8a' }}>Trip Notifications</h3>
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>
            Review stop-reached alerts, trip start/complete updates, and arrival messages.
          </p>
          <button
            type="button"
            className="primary-button"
            style={{ background: '#2563eb', marginTop: 14, width: 'auto' }}
            onClick={() => navigate('/parent/notifications')}
          >
            View Notifications ↗
          </button>
        </div>
      </div>
    </section>
  );
}
