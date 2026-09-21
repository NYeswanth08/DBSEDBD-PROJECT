import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

/* ─── tiny helpers ─────────────────────────────────────── */
const EMPTY_FORM = { name: '', class: '', parent_phone: '' };

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── modal ─────────────────────────────────────────────── */
function StudentModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(initial?.student_id);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const path = isEdit
        ? `/admin/students/${initial.student_id}`
        : '/admin/students';
      const method = isEdit ? 'PUT' : 'POST';
      const { student } = await apiRequest(path, {
        method,
        body: JSON.stringify(form),
      });
      onSave(student);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <p className="eyebrow">{isEdit ? 'Edit Student' : 'Add Student'}</p>
        <h2 id="modal-title" style={{ marginBottom: 20 }}>
          {isEdit ? `Editing — ${initial.name}` : 'New Student'}
        </h2>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={submit}>
          <label className="field-label">
            Full Name *
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              required
              autoFocus
              placeholder="e.g. Priya Sharma"
            />
          </label>
          <label className="field-label">
            Class / Grade
            <input
              type="text"
              value={form.class}
              onChange={set('class')}
              placeholder="e.g. 8A"
            />
          </label>
          <label className="field-label">
            Parent Phone
            <input
              type="tel"
              value={form.parent_phone}
              onChange={set('parent_phone')}
              placeholder="e.g. 9876543210"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button modal-submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── confirm delete dialog ─────────────────────────────── */
function ConfirmDelete({ student, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/students/${student.student_id}`, { method: 'DELETE' });
      onConfirm(student.student_id);
    } catch (err) {
      setError(err.message);
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
      >
        <p className="eyebrow">Delete Student</p>
        <h2 style={{ marginBottom: 10 }}>Remove {student.name}?</h2>
        <p style={{ color: '#60708a', marginBottom: 20 }}>
          This action cannot be undone. The student record will be permanently deleted.
        </p>
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="btn-danger" onClick={confirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── assign transport modal ────────────────────────────── */
function AssignTransportModal({ student, onSave, onClose }) {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState('');

  const [routeStops, setRouteStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);

  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [status, setStatus] = useState('WAITING');
  const [notes, setNotes] = useState('');

  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch available trips and existing transport status on mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        setLoadingTrips(true);
        setError('');
        const [tripsData, statusData] = await Promise.all([
          apiRequest('/admin/trips?limit=50'),
          apiRequest(`/admin/students/${student.student_id}/transport-status`).catch(() => null),
        ]);

        if (!isMounted) return;

        const tripList = tripsData.trips || [];
        setTrips(tripList);

        const existing = statusData?.assignment;
        if (existing) {
          setCurrentAssignment(existing);
          setSelectedTripId(String(existing.trip_id));
          setStatus(existing.status || 'WAITING');
          setNotes(existing.notes || '');
        } else if (tripList.length > 0) {
          // Default to the first in-progress or scheduled trip, or first trip
          const activeTrip = tripList.find((t) => ['IN_PROGRESS', 'STARTED'].includes(t.status)) || tripList[0];
          setSelectedTripId(String(activeTrip.id));
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load trip options.');
      } finally {
        if (isMounted) setLoadingTrips(false);
      }
    }
    loadInitial();
    return () => { isMounted = false; };
  }, [student.student_id]);

  // 2. When selectedTripId changes, fetch route stops for that trip
  useEffect(() => {
    if (!selectedTripId) {
      setRouteStops([]);
      setPickupStopId('');
      setDropoffStopId('');
      return;
    }

    const tripObj = trips.find((t) => String(t.id) === String(selectedTripId));
    if (!tripObj || !tripObj.route_id) return;

    let isMounted = true;
    async function loadStops() {
      try {
        setLoadingStops(true);
        setError('');
        const data = await apiRequest(`/admin/routes/${tripObj.route_id}/stops`);
        if (!isMounted) return;

        const stops = (data.stops || []).sort((a, b) => a.stop_order - b.stop_order);
        setRouteStops(stops);

        // If this matches the current assignment, keep existing stops
        if (currentAssignment && String(currentAssignment.trip_id) === String(selectedTripId)) {
          setPickupStopId(currentAssignment.pickup_stop_id ? String(currentAssignment.pickup_stop_id) : (stops[0]?.id ? String(stops[0].id) : ''));
          setDropoffStopId(currentAssignment.dropoff_stop_id ? String(currentAssignment.dropoff_stop_id) : (stops[stops.length - 1]?.id ? String(stops[stops.length - 1].id) : ''));
        } else {
          // Pre-select first and last stop of the selected route
          if (stops.length > 0) {
            setPickupStopId(String(stops[0].id));
            setDropoffStopId(stops.length > 1 ? String(stops[stops.length - 1].id) : String(stops[0].id));
          } else {
            setPickupStopId('');
            setDropoffStopId('');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load route stops.');
      } finally {
        if (isMounted) setLoadingStops(false);
      }
    }

    loadStops();
    return () => { isMounted = false; };
  }, [selectedTripId, trips, currentAssignment]);

  const selectedTrip = trips.find((t) => String(t.id) === String(selectedTripId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedTripId) {
      setError('Please select a transportation trip.');
      return;
    }

    if (!pickupStopId) {
      setError('Please select a designated pickup stop.');
      return;
    }

    if (!dropoffStopId) {
      setError('Please select a designated dropoff stop.');
      return;
    }

    const pStop = routeStops.find((s) => String(s.id) === String(pickupStopId));
    const dStop = routeStops.find((s) => String(s.id) === String(dropoffStopId));

    if (!pStop) {
      setError('Selected pickup stop does not belong to this route.');
      return;
    }
    if (!dStop) {
      setError('Selected dropoff stop does not belong to this route.');
      return;
    }

    if (pStop.stop_order >= dStop.stop_order) {
      setError(
        `Pickup stop "${pStop.name}" (Order #${pStop.stop_order}) must come before Dropoff stop "${dStop.name}" (Order #${dStop.stop_order}).`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        trip_id: parseInt(selectedTripId, 10),
        pickup_stop_id: parseInt(pickupStopId, 10),
        dropoff_stop_id: parseInt(dropoffStopId, 10),
        status,
        notes: notes.trim() || null,
      };

      const res = await apiRequest(`/admin/students/${student.student_id}/transport-status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess(`Successfully assigned ${student.name} to Trip #${selectedTripId}!`);
      setTimeout(() => {
        onSave(res);
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to assign transport trip.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel manage-students-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transport-modal-title"
      >
        <p className="eyebrow">Transportation Assignment</p>
        <h2 id="transport-modal-title" style={{ marginBottom: 6 }}>
          Assign Trip & Stops
        </h2>
        <p style={{ color: '#60708a', fontSize: 13, marginBottom: 18 }}>
          Student: <strong>{student.name}</strong> (Class: {student.class || 'N/A'}, ID #{student.student_id})
        </p>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        {success && <div className="alert-box alert-box--success" style={{ marginBottom: 14 }}>{success}</div>}

        {loadingTrips ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#60708a' }}>
            Loading trips and current assignment…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Trip Selection */}
            <label className="field-label">
              Select Trip *
              <select
                className="select-input"
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                required
              >
                <option value="">-- Choose a Trip --</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    Trip #{t.id} — {t.route_name || t.route_code} ({t.direction}) | Bus: {t.bus_number || 'N/A'} [{t.status}]
                  </option>
                ))}
              </select>
            </label>

            {selectedTrip && (
              <div
                style={{
                  background: '#f8faff',
                  border: '1px solid #e3e9f2',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><strong>Route:</strong> {selectedTrip.route_name} ({selectedTrip.route_code})</span>
                  <span className={`badge-status ${selectedTrip.status === 'IN_PROGRESS' ? 'badge-status--active' : ''}`}>
                    {selectedTrip.status}
                  </span>
                </div>
                <div style={{ color: '#5d769a', fontSize: 12 }}>
                  Bus: <strong>{selectedTrip.bus_number || 'N/A'}</strong> &bull; Driver: <strong>{selectedTrip.driver_name || 'N/A'}</strong> &bull; Direction: <strong>{selectedTrip.direction}</strong>
                </div>
              </div>
            )}

            {/* Stops Grid */}
            <div className="modal-grid">
              <label className="field-label">
                Designated Pickup Stop *
                <select
                  className="select-input"
                  value={pickupStopId}
                  onChange={(e) => setPickupStopId(e.target.value)}
                  disabled={loadingStops || routeStops.length === 0}
                  required
                >
                  <option value="">
                    {loadingStops ? 'Loading stops…' : routeStops.length === 0 ? '-- No stops found --' : '-- Choose Pickup Stop --'}
                  </option>
                  {routeStops.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.stop_order} — {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Designated Dropoff Stop *
                <select
                  className="select-input"
                  value={dropoffStopId}
                  onChange={(e) => setDropoffStopId(e.target.value)}
                  disabled={loadingStops || routeStops.length === 0}
                  required
                >
                  <option value="">
                    {loadingStops ? 'Loading stops…' : routeStops.length === 0 ? '-- No stops found --' : '-- Choose Dropoff Stop --'}
                  </option>
                  {routeStops.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.stop_order} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Status and Notes */}
            <div className="modal-grid">
              <label className="field-label">
                Initial Transport Status
                <select
                  className="select-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="WAITING">WAITING (Default)</option>
                  <option value="BOARDED">BOARDED</option>
                  <option value="ON_BUS">ON_BUS</option>
                  <option value="DROPPED_OFF">DROPPED_OFF</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </label>

              <label className="field-label">
                Notes (Optional)
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Special pickup instructions"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button modal-submit"
                disabled={saving || loadingStops || routeStops.length === 0}
              >
                {saving ? 'Saving Assignment…' : '🚌 Assign Transport'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────── */
export function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', student }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [transportTarget, setTransportTarget] = useState(null);

  const debouncedSearch = useDebounce(search);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await apiRequest(`/admin/students?${params}`);
      setStudents(data.students);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Reset to page 1 when search changes
  const prevSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      prevSearch.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function handleSaved() {
    setModal(null);
    setTransportTarget(null);
    fetchStudents();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    fetchStudents();
  }

  const firstRow = (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, total);

  return (
    <section>
      {/* ── header ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Students</h2>
        <p>View and manage all student records, parent links, and transportation assignments.</p>
      </div>

      {/* ── toolbar ── */}
      <div className="students-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, class or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary-button add-btn"
          onClick={() => setModal({ mode: 'add' })}
        >
          + Add Student
        </button>
      </div>

      {/* ── content ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading students…</div>
      ) : students.length === 0 ? (
        <div className="panel empty-state">
          <p>{debouncedSearch ? `No students match "${debouncedSearch}".` : 'No students have been added yet.'}</p>
          {!debouncedSearch && (
            <button className="primary-button" style={{ marginTop: 12, width: 'auto' }} onClick={() => setModal({ mode: 'add' })}>
              Add First Student
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
                  <th>Student & Parents</th>
                  <th>Class</th>
                  <th>Trip & Status</th>
                  <th>Pickup → Dropoff</th>
                  <th aria-label="Actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_id}>
                    <td className="cell-id">#{s.student_id}</td>
                    <td>
                      <div className="cell-name">{s.name}</div>
                      {s.linked_parents ? (
                        <div style={{ fontSize: 12, color: '#5d769a', marginTop: 2 }}>
                          Parents: <strong>{s.linked_parents}</strong>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
                          No parent linked
                        </div>
                      )}
                    </td>
                    <td>{s.class || <span className="cell-empty">—</span>}</td>
                    <td>
                      {s.current_trip_id ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="badge-count" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                              Trip #{s.current_trip_id}
                            </span>
                            <span className={`badge-status ${s.transport_status === 'BOARDED' || s.transport_status === 'ON_BUS' ? 'badge-status--active' : ''}`}>
                              {s.transport_status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#5d769a', marginTop: 3 }}>
                            {s.current_bus_number ? `Bus: ${s.current_bus_number}` : ''} {s.current_route_code ? `(${s.current_route_code})` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="cell-empty">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      {s.pickup_stop_name || s.dropoff_stop_name ? (
                        <div style={{ fontSize: 12 }}>
                          <div><span style={{ color: '#16a34a' }}>●</span> <strong>{s.pickup_stop_name || 'Pickup Stop'}</strong></div>
                          <div style={{ color: '#8fa0ba', fontSize: 10, margin: '1px 0 1px 4px' }}>↓</div>
                          <div><span style={{ color: '#dc2626' }}>●</span> <strong>{s.dropoff_stop_name || 'Dropoff Stop'}</strong></div>
                        </div>
                      ) : (
                        <span className="cell-empty">—</span>
                      )}
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-link-action"
                        title="Assign Transportation Trip & Stops"
                        onClick={() => setTransportTarget(s)}
                        style={{ marginRight: 6 }}
                      >
                        🚌 Transport
                      </button>
                      <button
                        className="icon-btn"
                        title="Edit Student"
                        onClick={() => setModal({ mode: 'edit', student: s })}
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        title="Delete Student"
                        onClick={() => setDeleteTarget(s)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── pagination ── */}
          <div className="pagination">
            <span className="pagination-info">
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} student${total !== 1 ? 's' : ''}`}
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

      {/* ── modals ── */}
      {modal?.mode === 'add' && (
        <StudentModal onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <StudentModal
          initial={modal.student}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {transportTarget && (
        <AssignTransportModal
          student={transportTarget}
          onSave={handleSaved}
          onClose={() => setTransportTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          student={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}

