import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

export function DriverTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadTrips() {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/driver/trips');
      setTrips(res.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to load assigned trips.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  async function handleStartTrip(tripId) {
    if (!window.confirm(`Start Trip #${tripId}? You will be directed to live location sharing.`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiRequest(`/driver/trips/${tripId}/start`, { method: 'POST' });
      setSuccess(`Trip #${tripId} started.`);
      navigate('/driver/location');
    } catch (err) {
      setError(err.message || 'Failed to start trip.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteTrip(tripId) {
    if (!window.confirm(`Complete Trip #${tripId}? This will end the trip.`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiRequest(`/driver/trips/${tripId}/complete`, { method: 'POST' });
      setSuccess(`Trip #${tripId} marked as completed.`);
      await loadTrips();
    } catch (err) {
      setError(err.message || 'Failed to complete trip.');
    } finally {
      setActionLoading(false);
    }
  }

  const activeTrips = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'STARTED');
  const scheduledTrips = trips.filter((t) => t.status === 'SCHEDULED');
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED');

  return (
    <section>
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Driver Portal</p>
        <h2>Today’s Assigned Trips</h2>
        <p>View your scheduled runs, start active trips, and manage live journey status.</p>
      </div>

      {error && (
        <div className="alert-box alert-box--warning" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert-box alert-box--success" style={{ marginBottom: 16 }}>
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div className="page-state" style={{ minHeight: 180 }}>Loading trips…</div>
      ) : trips.length === 0 ? (
        <div className="panel empty-state">
          <h3>No Trips Assigned</h3>
          <p style={{ marginTop: 8 }}>
            There are currently no trips assigned to your driver account.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active Trips Section */}
          {activeTrips.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a' }}>🟢</span> Active In-Progress Trips ({activeTrips.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {activeTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="panel"
                    style={{ border: '2px solid #86efac', background: '#f0fdf4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge-count" style={{ background: '#dcfce7', color: '#166534' }}>
                          Trip #{trip.id} • {trip.direction}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                          ● {trip.status}
                        </span>
                      </div>
                      <h4 style={{ marginTop: 8, fontSize: 17, color: '#14532d' }}>
                        Bus {trip.bus_number} — {trip.route_name}
                      </h4>
                      <p style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
                        Date: <strong>{trip.trip_date?.slice(0, 10)}</strong> • Stops: <strong>{trip.stop_count}</strong> • Students: <strong>{trip.student_count}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="primary-button"
                        style={{ background: '#16a34a', flex: 1, margin: 0, padding: '8px 12px' }}
                        onClick={() => navigate('/driver/location')}
                      >
                        🛰️ Live Tracking
                      </button>
                      <button
                        type="button"
                        className="table-action-button"
                        style={{ color: '#0284c7', borderColor: '#bae6fd' }}
                        disabled={actionLoading}
                        onClick={() => handleCompleteTrip(trip.id)}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Trips Section */}
          {scheduledTrips.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#2563eb' }}>🔵</span> Scheduled Upcoming Trips ({scheduledTrips.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {scheduledTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="panel"
                    style={{ border: '1px solid #bfdbfe', background: '#eff6ff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge-count" style={{ background: '#dbeafe', color: '#1e40af' }}>
                          Trip #{trip.id} • {trip.direction}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                          SCHEDULED
                        </span>
                      </div>
                      <h4 style={{ marginTop: 8, fontSize: 17, color: '#1e3a8a' }}>
                        Bus {trip.bus_number} — {trip.route_name}
                      </h4>
                      <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                        Start: <strong>{trip.scheduled_start_at ? new Date(trip.scheduled_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong> • Stops: <strong>{trip.stop_count}</strong>
                      </p>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={actionLoading}
                        style={{ background: '#2563eb', width: '100%', margin: 0, padding: '8px 14px' }}
                        onClick={() => handleStartTrip(trip.id)}
                      >
                        🚀 Start Trip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Trips Section */}
          {completedTrips.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, color: '#64748b' }}>
                Completed Trips ({completedTrips.length})
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Bus</th>
                      <th>Route</th>
                      <th>Direction</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td>#{trip.id}</td>
                        <td>{trip.bus_number}</td>
                        <td>{trip.route_name}</td>
                        <td>{trip.direction}</td>
                        <td>{trip.trip_date?.slice(0, 10)}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              background: trip.status === 'COMPLETED' ? '#f1f5f9' : '#fee2e2',
                              color: trip.status === 'COMPLETED' ? '#475569' : '#b91c1c',
                            }}
                          >
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
