import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

/* ─── helpers ──────────────────────────────────────────── */
const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  employee_code: '',
  license_number: '',
  license_expiry: '',
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

function getExpiryStatus(expiryStr) {
  if (!expiryStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'expired', label: `⚠️ Expired (${expiryStr})` };
  }
  if (diffDays <= 30) {
    return { status: 'warning', label: `⏳ Expiring in ${diffDays}d (${expiryStr})` };
  }
  return { status: 'ok', label: expiryStr };
}

/* ─── driver modal (add / edit) ────────────────────────── */
function DriverModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.driver_id);
  const [form, setForm] = useState(initial ? {
    full_name: initial.full_name || '',
    email: initial.email || '',
    password: '',
    phone: initial.phone || '',
    employee_code: initial.employee_code || '',
    license_number: initial.license_number || '',
    license_expiry: initial.license_expiry || '',
    is_active: initial.is_active ?? true,
  } : EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const path = isEdit
        ? `/admin/drivers/${initial.driver_id}`
        : '/admin/drivers';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = { ...form };
      // If editing and password is empty, don't send it
      if (isEdit && !payload.password) {
        delete payload.password;
      }

      const res = await apiRequest(path, {
        method,
        body: JSON.stringify(payload),
      });
      onSave(res.driver);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card manage-students-card panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-modal-title"
      >
        <p className="eyebrow">{isEdit ? 'Edit Driver' : 'Add Driver'}</p>
        <h2 id="driver-modal-title" style={{ marginBottom: 18 }}>
          {isEdit ? `Editing — ${initial.full_name}` : 'New Driver Registration'}
        </h2>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="modal-grid">
            <label className="field-label">
              Full Name *
              <input
                type="text"
                value={form.full_name}
                onChange={set('full_name')}
                required
                autoFocus
                placeholder="e.g. Rajesh Kumar"
              />
            </label>

            <label className="field-label">
              Email Address *
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                placeholder="e.g. rajesh.driver@schoolbus.local"
              />
            </label>
          </div>

          <div className="modal-grid">
            <label className="field-label">
              {isEdit ? 'New Password (optional)' : 'Password *'}
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required={!isEdit}
                placeholder={isEdit ? 'Leave blank to keep existing' : 'Minimum 6 characters'}
              />
            </label>

            <label className="field-label">
              Phone Number
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. 9876543210"
              />
            </label>
          </div>

          <div className="modal-grid">
            <label className="field-label">
              Employee Code *
              <input
                type="text"
                value={form.employee_code}
                onChange={set('employee_code')}
                required
                placeholder="e.g. DRV-101"
              />
            </label>

            <label className="field-label">
              License Number *
              <input
                type="text"
                value={form.license_number}
                onChange={set('license_number')}
                required
                placeholder="e.g. DL-0420110012345"
              />
            </label>
          </div>

          <div className="modal-grid">
            <label className="field-label">
              License Expiry Date *
              <input
                type="date"
                value={form.license_expiry}
                onChange={set('license_expiry')}
                required
              />
            </label>

            {isEdit && (
              <label className="field-label" style={{ alignSelf: 'center', marginTop: 10 }}>
                <span style={{ marginBottom: 4 }}>Account Status</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={set('is_active')}
                  />
                  <span>Active Driver Account</span>
                </label>
              </label>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button modal-submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── confirm delete dialog with safety feedback ───────── */
function ConfirmDelete({ driver, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/drivers/${driver.driver_id}`, { method: 'DELETE' });
      onConfirm(driver.driver_id);
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
        <p className="eyebrow">Delete Driver</p>
        <h2 style={{ marginBottom: 10 }}>Remove {driver.full_name}?</h2>
        <p style={{ color: '#60708a', marginBottom: 16 }}>
          This action permanently removes the driver profile and their login account.
          Drivers with assigned buses or scheduled trips cannot be deleted.
        </p>

        {error && (
          <div className="form-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="btn-danger" onClick={confirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main drivers page ─────────────────────────────────── */
export function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', driver }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search);
  const limit = 20;

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await apiRequest(`/admin/drivers?${params}`);
      setDrivers(data.drivers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Reset to page 1 on new search query
  const prevSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      prevSearch.current = debouncedSearch;
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  function handleSaved() {
    setModal(null);
    fetchDrivers();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    fetchDrivers();
  }

  const firstRow = (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, total);

  return (
    <section>
      {/* ── header ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Drivers</h2>
        <p>View and manage school bus drivers, licenses, and accounts.</p>
      </div>

      {/* ── toolbar ── */}
      <div className="students-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, code, license, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary-button add-btn"
          onClick={() => setModal({ mode: 'add' })}
        >
          + Add Driver
        </button>
      </div>

      {/* ── content ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading drivers…</div>
      ) : drivers.length === 0 ? (
        <div className="panel empty-state">
          <p>{debouncedSearch ? `No drivers match "${debouncedSearch}".` : 'No drivers have been registered yet.'}</p>
          {!debouncedSearch && (
            <button
              className="primary-button"
              style={{ marginTop: 12, width: 'auto' }}
              onClick={() => setModal({ mode: 'add' })}
            >
              Add First Driver
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
                  <th>Name</th>
                  <th>Employee Code</th>
                  <th>License Number</th>
                  <th>License Expiry</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const expiryInfo = getExpiryStatus(d.license_expiry);
                  return (
                    <tr key={d.driver_id}>
                      <td className="cell-id">#{d.driver_id}</td>
                      <td className="cell-name">
                        <div>{d.full_name}</div>
                        <div style={{ fontSize: 12, color: '#8fa0ba', fontWeight: 400 }}>{d.email}</div>
                      </td>
                      <td><code>{d.employee_code}</code></td>
                      <td>{d.license_number}</td>
                      <td>
                        {expiryInfo ? (
                          expiryInfo.status !== 'ok' ? (
                            <span className={`badge-expiry badge-expiry--${expiryInfo.status}`}>
                              {expiryInfo.label}
                            </span>
                          ) : (
                            expiryInfo.label
                          )
                        ) : (
                          <span className="cell-empty">—</span>
                        )}
                      </td>
                      <td>{d.phone || <span className="cell-empty">—</span>}</td>
                      <td>
                        <span className={`badge-status badge-status--${d.is_active ? 'active' : 'inactive'}`}>
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <button
                          className="icon-btn"
                          title="Edit Driver"
                          onClick={() => setModal({ mode: 'edit', driver: d })}
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Delete Driver"
                          onClick={() => setDeleteTarget(d)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── pagination ── */}
          <div className="pagination">
            <span className="pagination-info">
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} driver${total !== 1 ? 's' : ''}`}
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
        <DriverModal onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <DriverModal
          initial={modal.driver}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          driver={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
