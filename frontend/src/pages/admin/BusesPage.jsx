import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

/* ─── helpers ──────────────────────────────────────────── */
const EMPTY_FORM = {
  bus_number: '',
  registration_number: '',
  capacity: '',
  assigned_driver_id: '',
  is_active: true,
};

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── bus modal (add / edit) ────────────────────────── */
function BusModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(
    initial
      ? {
          bus_number: initial.bus_number || '',
          registration_number: initial.registration_number || '',
          capacity: initial.capacity ?? '',
          assigned_driver_id: initial.assigned_driver_id ? String(initial.assigned_driver_id) : '',
          is_active: initial.is_active ?? true,
        }
      : EMPTY_FORM
  );

  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchDrivers() {
      setLoadingDrivers(true);
      try {
        const query = isEdit && initial?.id ? `?current_bus_id=${initial.id}` : '';
        const res = await apiRequest(`/admin/buses/available-drivers${query}`);
        if (!cancelled) {
          setAvailableDrivers(res.drivers || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load available drivers:', err);
        }
      } finally {
        if (!cancelled) setLoadingDrivers(false);
      }
    }
    fetchDrivers();
    return () => {
      cancelled = true;
    };
  }, [isEdit, initial?.id]);

  function set(field) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
    };
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const path = isEdit ? `/admin/buses/${initial.id}` : '/admin/buses';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        bus_number: form.bus_number.trim(),
        registration_number: form.registration_number.trim(),
        capacity: Number(form.capacity),
        assigned_driver_id: form.assigned_driver_id ? Number(form.assigned_driver_id) : null,
        is_active: Boolean(form.is_active),
      };

      const res = await apiRequest(path, {
        method,
        body: JSON.stringify(payload),
      });
      onSave(res.bus);
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
        aria-labelledby="bus-modal-title"
      >
        <p className="eyebrow">{isEdit ? 'Edit Bus' : 'Add Bus'}</p>
        <h2 id="bus-modal-title" style={{ marginBottom: 18 }}>
          {isEdit ? `Editing — ${initial.bus_number}` : 'New Bus Registration'}
        </h2>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="modal-grid">
            <label className="field-label">
              Bus Number *
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. BUS-01"
                value={form.bus_number}
                onChange={set('bus_number')}
                disabled={saving}
              />
            </label>

            <label className="field-label">
              Registration Number *
              <input
                type="text"
                required
                placeholder="e.g. AP 09 AB 1234"
                value={form.registration_number}
                onChange={set('registration_number')}
                disabled={saving}
              />
            </label>
          </div>

          <div className="modal-grid">
            <label className="field-label">
              Capacity (Seats) *
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 40"
                value={form.capacity}
                onChange={set('capacity')}
                disabled={saving}
              />
            </label>

            <label className="field-label">
              Assigned Driver
              <select
                className="select-input"
                value={form.assigned_driver_id}
                onChange={set('assigned_driver_id')}
                disabled={saving || loadingDrivers}
              >
                <option value="">-- No Driver Assigned --</option>
                {availableDrivers.map((d) => (
                  <option key={d.id || d.driver_id} value={d.id || d.driver_id}>
                    {d.driver_name || d.full_name} ({d.employee_code})
                    {d.is_currently_assigned ? ' [Currently Assigned]' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isEdit && (
            <label className="field-label" style={{ marginTop: 10 }}>
              <span style={{ marginBottom: 4 }}>Bus Status</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={set('is_active')}
                  disabled={saving}
                />
                <span>Active Bus in Fleet</span>
              </label>
            </label>
          )}

          <div className="modal-actions" style={{ marginTop: 22 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button modal-submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Bus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── confirm delete modal ────────────────────────────── */
function ConfirmDelete({ bus, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/buses/${bus.id}`, { method: 'DELETE' });
      onConfirm(bus.id);
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
        aria-labelledby="delete-bus-title"
      >
        <p className="eyebrow">Delete Bus</p>
        <h2 id="delete-bus-title" style={{ marginBottom: 10 }}>Remove {bus.bus_number}?</h2>
        <p style={{ color: '#60708a', marginBottom: 16 }}>
          This action permanently removes bus <strong>{bus.bus_number}</strong> ({bus.registration_number}).
          Buses with recorded trips cannot be deleted. Any assigned driver will be unassigned automatically.
        </p>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Bus'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page component ─────────────────────────────── */
export function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // modal state
  const [modal, setModal] = useState(null); // { mode: 'add' } | { mode: 'edit', bus }
  const [deleteTarget, setDeleteTarget] = useState(null); // bus object

  const debouncedSearch = useDebounce(search, 350);
  const limit = 20;

  // Fetch buses
  const fetchBuses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      const data = await apiRequest(`/admin/buses?${params}`);
      setBuses(data.buses || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Reset to page 1 on new search term
  const prevSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      prevSearch.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  // Handlers
  function handleSaved() {
    setModal(null);
    fetchBuses();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    fetchBuses();
  }

  const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = Math.min(total, page * limit);

  return (
    <section>
      {/* ── header bar ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Buses</h2>
        <p>View and manage school bus fleet, capacity, and driver assignments.</p>
      </div>

      {/* ── toolbar ── */}
      <div className="students-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by bus number, registration, or driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary-button add-btn"
          onClick={() => setModal({ mode: 'add' })}
        >
          + Add Bus
        </button>
      </div>

      {/* ── content area ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading buses…</div>
      ) : buses.length === 0 ? (
        <div className="panel empty-state">
          <p>{debouncedSearch ? `No buses match "${debouncedSearch}".` : 'No buses have been registered yet.'}</p>
          {!debouncedSearch && (
            <button
              className="primary-button"
              style={{ marginTop: 12, width: 'auto' }}
              onClick={() => setModal({ mode: 'add' })}
            >
              Add First Bus
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
                  <th>Bus Number</th>
                  <th>Registration</th>
                  <th>Capacity</th>
                  <th>Assigned Driver</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {buses.map((b) => (
                  <tr key={b.id}>
                    <td className="cell-id">#{b.id}</td>
                    <td className="cell-name">
                      <strong>{b.bus_number}</strong>
                    </td>
                    <td><code>{b.registration_number}</code></td>
                    <td>{b.capacity} seats</td>
                    <td>
                      {b.driver_name ? (
                        <div>
                          <div>{b.driver_name}</div>
                          <div style={{ fontSize: 12, color: '#8fa0ba', fontWeight: 400 }}>
                            {b.driver_employee_code} {b.driver_phone ? `• ${b.driver_phone}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="cell-empty">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-status badge-status--${b.is_active ? 'active' : 'inactive'}`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <button
                        className="icon-btn"
                        title="Edit Bus"
                        onClick={() => setModal({ mode: 'edit', bus: b })}
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        title="Delete Bus"
                        onClick={() => setDeleteTarget(b)}
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
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} bus${total !== 1 ? 'es' : ''}`}
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
        <BusModal onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <BusModal
          initial={modal.bus}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          bus={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
