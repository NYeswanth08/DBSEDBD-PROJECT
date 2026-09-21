import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { RedBusJourneyTracker } from '../../components/RedBusJourneyTracker';

/* ─── helpers ──────────────────────────────────────────── */
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', bg: '#eaf3ff', color: '#1e5ca8' },
  STARTED: { label: 'Started', bg: '#fef3c7', color: '#92400e' },
  IN_PROGRESS: { label: 'In Progress', bg: '#ede9fe', color: '#5b21b6' },
  COMPLETED: { label: 'Completed', bg: '#eefbf3', color: '#166534' },
  CANCELLED: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span
      className="badge-status"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function DirectionBadge({ direction }) {
  const isPickup = direction === 'PICKUP';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: isPickup ? '#fff7ed' : '#eff6ff',
        color: isPickup ? '#c2410c' : '#1d4ed8',
        border: `1px solid ${isPickup ? '#ffedd5' : '#dbeafe'}`,
      }}
    >
      {isPickup ? '🌅 Pickup' : '🌇 Drop-off'}
    </span>
  );
}

/* ─── trip details modal ──────────────────────────────── */
function TripDetailsModal({ tripId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiRequest(`/admin/trips/${tripId}`);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        style={{ width: 'min(100%, 650px)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-details-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Trip Information</p>
            <h2 id="trip-details-title" style={{ marginBottom: 4 }}>
              Trip #{tripId}
            </h2>
            {data && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <DirectionBadge direction={data.trip.direction} />
                <StatusBadge status={data.trip.status} />
                <span style={{ fontSize: 13, color: '#60708a' }}>
                  📅 {data.trip.trip_date}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            ✕ Close
          </button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <div className="page-state" style={{ minHeight: 160 }}>Loading trip details…</div>
        ) : !data ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── Grid of details ── */}
            <div className="modal-grid" style={{ gap: 14 }}>
              {/* Bus & Driver */}
              <div className="panel" style={{ background: '#f8faff', padding: 14, margin: 0 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', color: '#5d769a' }}>
                  Bus & Fleet
                </h4>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{data.bus.bus_number}</div>
                <div style={{ fontSize: 13, color: '#60708a' }}>Reg: {data.bus.registration_number}</div>
                <div style={{ fontSize: 12, color: '#8fa0ba', marginTop: 2 }}>Capacity: {data.bus.capacity} seats</div>
              </div>

              <div className="panel" style={{ background: '#f8faff', padding: 14, margin: 0 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', color: '#5d769a' }}>
                  Assigned Driver
                </h4>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{data.driver.full_name}</div>
                <div style={{ fontSize: 13, color: '#60708a' }}>Code: {data.driver.employee_code}</div>
                <div style={{ fontSize: 12, color: '#8fa0ba', marginTop: 2 }}>
                  License: {data.driver.license_number || '—'} {data.driver.license_expiry ? `(Exp: ${data.driver.license_expiry})` : ''}
                </div>
              </div>
            </div>

            {/* Route & Timings */}
            <div className="panel" style={{ background: '#f8faff', padding: 14, margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', color: '#5d769a' }}>
                  Route Details
                </h4>
                <span style={{ fontSize: 12, color: '#8fa0ba' }}>
                  ⏱️ {data.route.estimated_duration_minutes ? `${data.route.estimated_duration_minutes} mins estimated` : 'Duration not set'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {data.route.name} <code style={{ fontSize: 13 }}>({data.route.route_code})</code>
              </div>
              {data.route.description && (
                <div style={{ fontSize: 13, color: '#60708a', marginTop: 4 }}>{data.route.description}</div>
              )}
            </div>

            {/* Timestamps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e3e9f2', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#8fa0ba', textTransform: 'uppercase', fontWeight: 600 }}>Scheduled Start</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>
                  {data.trip.scheduled_start_at ? new Date(data.trip.scheduled_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e3e9f2', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#8fa0ba', textTransform: 'uppercase', fontWeight: 600 }}>Actual Started</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>
                  {data.trip.started_at ? new Date(data.trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not started'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e3e9f2', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#8fa0ba', textTransform: 'uppercase', fontWeight: 600 }}>Completed At</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>
                  {data.trip.completed_at ? new Date(data.trip.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not completed'}
                </div>
              </div>
            </div>

            {/* Ordered Route Stops */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#172033' }}>
                Route Stops Sequence ({data.stops.length})
              </h4>
              {data.stops.length === 0 ? (
                <div style={{ padding: 12, background: '#f8faff', borderRadius: 8, color: '#8fa0ba', fontSize: 13 }}>
                  No stops configured for this route.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.stops.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#fff',
                        border: '1px solid #e3e9f2',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="badge-count" style={{ minWidth: 26, justifyContent: 'center' }}>
                          #{s.stop_order}
                        </span>
                        <strong>{s.name}</strong>
                      </div>
                      <div style={{ color: '#60708a', fontSize: 12 }}>
                        {s.scheduled_time ? `🕒 ${s.scheduled_time.slice(0, 5)}` : ''}
                        {s.latitude !== null && s.longitude !== null ? ` • 📍 (${s.latitude}, ${s.longitude})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {data.trip.notes && (
              <div style={{ padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13 }}>
                <strong>Trip Notes:</strong> {data.trip.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── add / edit trip modal ───────────────────────────── */
function TripModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);

  // Parse initial scheduled time
  let initialTime = '07:30';
  let initialDate = getTodayString();
  if (initial?.scheduled_start_at) {
    const s = String(initial.scheduled_start_at);
    if (s.includes('T')) {
      const parts = s.split('T');
      initialDate = parts[0];
      initialTime = parts[1].slice(0, 5);
    } else if (s.includes(' ')) {
      const parts = s.split(' ');
      initialDate = parts[0];
      initialTime = parts[1].slice(0, 5);
    }
  } else if (initial?.trip_date) {
    initialDate = initial.trip_date;
  }

  const [form, setForm] = useState({
    bus_id: initial?.bus_id ? String(initial.bus_id) : '',
    driver_id: initial?.driver_id ? String(initial.driver_id) : '',
    route_id: initial?.route_id ? String(initial.route_id) : '',
    trip_date: initialDate,
    direction: initial?.direction || 'PICKUP',
    scheduled_time: initialTime,
    notes: initial?.notes || '',
    status: initial?.status || 'SCHEDULED',
  });

  const [options, setOptions] = useState({ buses: [], drivers: [], routes: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch dropdown options
  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const res = await apiRequest('/admin/trips/options');
        if (!cancelled) setOptions(res);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load trip options.');
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // When bus is selected in Add mode: automatically pre-select assigned driver!
  function handleBusChange(e) {
    const selectedBusId = e.target.value;
    const selectedBus = options.buses.find((b) => String(b.id) === selectedBusId);

    setForm((prev) => ({
      ...prev,
      bus_id: selectedBusId,
      driver_id: selectedBus?.assigned_driver_id ? String(selectedBus.assigned_driver_id) : '',
    }));
  }

  function set(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  // Determine allowed status transitions for edit mode
  const allowedStatuses = [];
  if (!isEdit) {
    allowedStatuses.push('SCHEDULED');
  } else {
    const cur = initial.status;
    allowedStatuses.push(cur);
    if (cur === 'SCHEDULED') {
      allowedStatuses.push('STARTED', 'CANCELLED');
    } else if (cur === 'STARTED') {
      allowedStatuses.push('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    } else if (cur === 'IN_PROGRESS') {
      allowedStatuses.push('COMPLETED', 'CANCELLED');
    }
  }

  const selectedBusObj = options.buses.find((b) => String(b.id) === String(form.bus_id));
  const selectedRouteObj = options.routes.find((r) => String(r.id) === String(form.route_id));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const scheduled_start_at = `${form.trip_date} ${form.scheduled_time}:00`;

      const payload = {
        bus_id: Number(form.bus_id),
        driver_id: Number(form.driver_id),
        route_id: Number(form.route_id),
        trip_date: form.trip_date,
        direction: form.direction,
        scheduled_start_at,
        notes: form.notes.trim() || null,
      };

      if (isEdit) {
        payload.status = form.status;
      }

      const path = isEdit ? `/admin/trips/${initial.id}` : '/admin/trips';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiRequest(path, {
        method,
        body: JSON.stringify(payload),
      });

      onSave(res.trip);
    } catch (err) {
      setError(err.message || 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        style={{ width: 'min(100%, 540px)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-modal-title"
      >
        <p className="eyebrow">{isEdit ? 'Edit Trip' : 'Schedule Trip'}</p>
        <h2 id="trip-modal-title" style={{ marginBottom: 18 }}>
          {isEdit ? `Trip #${initial.id} (${initial.route_code || ''})` : 'New Trip Schedule'}
        </h2>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={submit}>
          {/* ── Bus Selector ── */}
          <label className="field-label">
            Bus *
            <select
              className="select-input"
              value={form.bus_id}
              onChange={handleBusChange}
              required
              disabled={saving || loadingOptions}
            >
              <option value="">-- Select Active Bus --</option>
              {options.buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bus_number} ({b.registration_number})
                  {b.assigned_driver_name ? ` — Driver: ${b.assigned_driver_name}` : ' [No Driver Assigned]'}
                </option>
              ))}
            </select>
          </label>

          {/* Bus warning if no assigned driver */}
          {selectedBusObj && !selectedBusObj.assigned_driver_id && (
            <div className="alert-box alert-box--warning" style={{ fontSize: 12, padding: 8, margin: '-6px 0 10px' }}>
              ⚠️ This bus has no driver assigned. A bus must have an assigned driver to schedule trips.
            </div>
          )}

          {/* ── Driver Selector (Pre-selected from Bus) ── */}
          <label className="field-label">
            Driver *
            <select
              className="select-input"
              value={form.driver_id}
              onChange={set('driver_id')}
              required
              disabled={saving || loadingOptions}
            >
              <option value="">-- Select Assigned Driver --</option>
              {options.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.employee_code})
                  {selectedBusObj?.assigned_driver_id === d.id ? ' [Assigned to this Bus]' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* ── Route Selector ── */}
          <label className="field-label">
            Route *
            <select
              className="select-input"
              value={form.route_id}
              onChange={set('route_id')}
              required
              disabled={saving || loadingOptions}
            >
              <option value="">-- Select Active Route --</option>
              {options.routes.map((r) => (
                <option key={r.id} value={r.id} disabled={r.stop_count === 0}>
                  {r.name} ({r.route_code}) — {r.stop_count} {r.stop_count === 1 ? 'stop' : 'stops'}
                  {r.stop_count === 0 ? ' [No stops - Unavailable]' : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedRouteObj && selectedRouteObj.stop_count === 0 && (
            <div className="alert-box alert-box--warning" style={{ fontSize: 12, padding: 8, margin: '-6px 0 10px' }}>
              ⚠️ Selected route has 0 stops. Add stops in Route Management before creating trips.
            </div>
          )}

          {/* ── Date, Direction, Time Grid ── */}
          <div className="modal-grid">
            <label className="field-label">
              Trip Date *
              <input
                type="date"
                required
                value={form.trip_date}
                onChange={set('trip_date')}
                disabled={saving}
              />
            </label>

            <label className="field-label">
              Direction *
              <select
                className="select-input"
                value={form.direction}
                onChange={set('direction')}
                required
                disabled={saving}
              >
                <option value="PICKUP">🌅 PICKUP (Morning)</option>
                <option value="DROPOFF">🌇 DROPOFF (Evening)</option>
              </select>
            </label>
          </div>

          <div className="modal-grid">
            <label className="field-label">
              Scheduled Start Time *
              <input
                type="time"
                required
                value={form.scheduled_time}
                onChange={set('scheduled_time')}
                disabled={saving}
              />
            </label>

            {isEdit && (
              <label className="field-label">
                Trip Status
                <select
                  className="select-input"
                  value={form.status}
                  onChange={set('status')}
                  disabled={saving || allowedStatuses.length <= 1}
                >
                  {allowedStatuses.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_CONFIG[st]?.label || st}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* ── Notes ── */}
          <label className="field-label">
            Notes (Optional)
            <input
              type="text"
              placeholder="e.g. Regular morning pickup, rain delay note, etc."
              value={form.notes}
              onChange={set('notes')}
              disabled={saving}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: 22 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button modal-submit"
              disabled={saving || (selectedBusObj && !selectedBusObj.assigned_driver_id)}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── confirm delete modal ────────────────────────────── */
function ConfirmDeleteTrip({ trip, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = trip.status === 'SCHEDULED' || trip.status === 'CANCELLED';

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/trips/${trip.id}`, { method: 'DELETE' });
      onConfirm(trip.id);
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-trip-title"
      >
        <p className="eyebrow">Delete Trip</p>
        <h2 id="delete-trip-title" style={{ marginBottom: 10 }}>
          Delete Trip #{trip.id}?
        </h2>

        {!canDelete ? (
          <div className="alert-box alert-box--warning" style={{ marginBottom: 16 }}>
            ⚠️ Trips with status <strong>{trip.status}</strong> cannot be deleted. Only <code>SCHEDULED</code> or <code>CANCELLED</code> trips may be removed.
          </div>
        ) : (
          <p style={{ color: '#60708a', marginBottom: 16 }}>
            Are you sure you want to permanently delete Trip #{trip.id} ({trip.route_name || trip.route_code}) on {trip.trip_date}?
          </p>
        )}

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          {canDelete && (
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── live journey modal (RedBus) ─────────────────────── */
function LiveJourneyModal({ tripId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJourney = useCallback(async () => {
    try {
      const res = await apiRequest(`/trips/${tripId}/journey`);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch live journey.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchJourney();
    const interval = setInterval(fetchJourney, 6000); // Poll every 6 seconds
    return () => clearInterval(interval);
  }, [fetchJourney]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        style={{ width: 'min(100%, 750px)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-journey-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p className="eyebrow">RedBus Live Journey Tracking</p>
            <h2 id="live-journey-title" style={{ marginBottom: 4 }}>
              Trip #{tripId} Live Journey
            </h2>
            {data && (
              <div style={{ fontSize: 13, color: '#60708a', marginTop: 4 }}>
                Bus: <strong>{data.trip.bus_number}</strong> • Route: <strong>{data.trip.route_name}</strong> • Driver: <strong>{data.trip.driver_name}</strong>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            ✕ Close
          </button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <div className="page-state" style={{ minHeight: 180 }}>Loading live journey…</div>
        ) : !data ? null : (
          <RedBusJourneyTracker
            journey={data.journey}
            location={data.location}
            trip={data.trip}
          />
        )}
      </div>
    </div>
  );
}

/* ─── main page component ─────────────────────────────── */
export function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [tripModal, setTripModal] = useState(null); // { mode: 'add' } | { mode: 'edit', trip }
  const [detailsTripId, setDetailsTripId] = useState(null);
  const [liveJourneyTripId, setLiveJourneyTripId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 350);
  const limit = 20;

  // Fetch trips
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter.trim()) params.set('status', statusFilter.trim());
      if (dateFilter.trim()) params.set('date', dateFilter.trim());

      const data = await apiRequest(`/admin/trips?${params}`);
      setTrips(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, dateFilter]);

  // Reset to page 1 on filter changes
  const prevFilters = useRef({ search: debouncedSearch, status: statusFilter, date: dateFilter });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.search !== debouncedSearch || prev.status !== statusFilter || prev.date !== dateFilter) {
      prevFilters.current = { search: debouncedSearch, status: statusFilter, date: dateFilter };
      setPage(1);
    }
  }, [debouncedSearch, statusFilter, dateFilter]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  function handleSaved() {
    setTripModal(null);
    fetchTrips();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    fetchTrips();
  }

  const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = Math.min(total, page * limit);

  return (
    <section>
      {/* ── Header ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Trips</h2>
        <p>Schedule and manage school transportation trips, bus deployments, and driver assignments.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="students-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <input
          className="search-input"
          type="search"
          placeholder="Search route, bus, driver, or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220 }}
        />

        {/* Status Filter */}
        <select
          className="select-input"
          style={{ width: 'auto', minWidth: 140, padding: '9px 12px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="STARTED">Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            className="search-input"
            style={{ width: 'auto', padding: '9px 12px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by trip date"
          />
          {dateFilter && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDateFilter('')}
              style={{ padding: '8px 10px', fontSize: 12 }}
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>

        <button
          className="primary-button add-btn"
          onClick={() => setTripModal({ mode: 'add' })}
          style={{ marginLeft: 'auto' }}
        >
          + Schedule Trip
        </button>
      </div>

      {/* ── Content & Error ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading trips…</div>
      ) : trips.length === 0 ? (
        <div className="panel empty-state">
          <p>
            {debouncedSearch || statusFilter || dateFilter
              ? 'No trips match the specified filters.'
              : 'No trips have been scheduled yet.'}
          </p>
          {!debouncedSearch && !statusFilter && !dateFilter && (
            <button
              className="primary-button"
              style={{ marginTop: 12, width: 'auto' }}
              onClick={() => setTripModal({ mode: 'add' })}
            >
              Schedule First Trip
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Direction</th>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Driver</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td className="cell-id">#{t.id}</td>
                    <td>
                      <strong>{t.trip_date}</strong>
                    </td>
                    <td>
                      <DirectionBadge direction={t.direction} />
                    </td>
                    <td>
                      <strong>{t.route_name}</strong>
                      <div style={{ fontSize: 12, color: '#8fa0ba' }}>{t.route_code}</div>
                    </td>
                    <td>
                      <strong>{t.bus_number}</strong>
                      <div style={{ fontSize: 12, color: '#8fa0ba' }}>{t.registration_number}</div>
                    </td>
                    <td>
                      <strong>{t.driver_name}</strong>
                      <div style={{ fontSize: 12, color: '#8fa0ba' }}>{t.driver_employee_code}</div>
                    </td>
                    <td>
                      {t.scheduled_start_at
                        ? new Date(t.scheduled_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => setLiveJourneyTripId(t.id)}
                        style={{ marginRight: 6, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
                        title="Live Journey Tracking"
                      >
                        🛰️ Track
                      </button>
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => setDetailsTripId(t.id)}
                        style={{ marginRight: 6 }}
                        title="View Trip Details"
                      >
                        👁️ View
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit Trip"
                        onClick={() => setTripModal({ mode: 'edit', trip: t })}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Delete Trip"
                        onClick={() => setDeleteTarget(t)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="pagination">
            <span className="pagination-info">
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} trip${total !== 1 ? 's' : ''}`}
            </span>
            <div className="pagination-controls">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="pagination-page">Page {page} of {totalPages}</span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {tripModal?.mode === 'add' && (
        <TripModal onSave={handleSaved} onClose={() => setTripModal(null)} />
      )}
      {tripModal?.mode === 'edit' && (
        <TripModal
          initial={tripModal.trip}
          onSave={handleSaved}
          onClose={() => setTripModal(null)}
        />
      )}
      {detailsTripId && (
        <TripDetailsModal
          tripId={detailsTripId}
          onClose={() => setDetailsTripId(null)}
        />
      )}
      {liveJourneyTripId && (
        <LiveJourneyModal
          tripId={liveJourneyTripId}
          onClose={() => setLiveJourneyTripId(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteTrip
          trip={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
