import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

/* ─── helpers ──────────────────────────────────────────── */
const EMPTY_ROUTE_FORM = {
  route_code: '',
  name: '',
  estimated_duration_minutes: '',
  description: '',
  is_active: true,
};

const EMPTY_STOP_FORM = {
  name: '',
  stop_order: '',
  latitude: '',
  longitude: '',
  scheduled_time: '',
  google_maps_url: '',
};

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── route modal (add / edit) ────────────────────────── */
function RouteModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(
    initial
      ? {
          route_code: initial.route_code || '',
          name: initial.name || '',
          estimated_duration_minutes: initial.estimated_duration_minutes ?? '',
          description: initial.description || '',
          is_active: initial.is_active ?? true,
        }
      : EMPTY_ROUTE_FORM
  );

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
      const path = isEdit ? `/admin/routes/${initial.id}` : '/admin/routes';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        route_code: form.route_code.trim(),
        name: form.name.trim(),
        description: form.description ? form.description.trim() : null,
        estimated_duration_minutes: form.estimated_duration_minutes
          ? Number(form.estimated_duration_minutes)
          : null,
        is_active: Boolean(form.is_active),
      };

      const res = await apiRequest(path, {
        method,
        body: JSON.stringify(payload),
      });
      onSave(res.route);
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
        aria-labelledby="route-modal-title"
      >
        <p className="eyebrow">{isEdit ? 'Edit Route' : 'Add Route'}</p>
        <h2 id="route-modal-title" style={{ marginBottom: 18 }}>
          {isEdit ? `Editing — ${initial.route_code}` : 'New Route Setup'}
        </h2>

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="modal-grid">
            <label className="field-label">
              Route Code *
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. RT-HYD-01"
                value={form.route_code}
                onChange={set('route_code')}
                disabled={saving}
                maxLength={40}
              />
            </label>

            <label className="field-label">
              Estimated Duration (Mins)
              <input
                type="number"
                min="1"
                max="65535"
                placeholder="e.g. 45"
                value={form.estimated_duration_minutes}
                onChange={set('estimated_duration_minutes')}
                disabled={saving}
              />
            </label>
          </div>

          <label className="field-label">
            Route Name *
            <input
              type="text"
              required
              placeholder="e.g. Kondapur - Miyapur Route"
              value={form.name}
              onChange={set('name')}
              disabled={saving}
              maxLength={120}
            />
          </label>

          <label className="field-label">
            Description
            <input
              type="text"
              placeholder="e.g. Covers Kondapur, Hafeezpet and Miyapur pickup points"
              value={form.description}
              onChange={set('description')}
              disabled={saving}
            />
          </label>

          {isEdit && (
            <label className="field-label" style={{ marginTop: 10 }}>
              <span style={{ marginBottom: 4 }}>Route Status</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={set('is_active')}
                  disabled={saving}
                />
                <span>Active Route</span>
              </label>
            </label>
          )}

          <div className="modal-actions" style={{ marginTop: 22 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button modal-submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── confirm delete route modal ──────────────────────── */
function ConfirmDeleteRoute({ route, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/routes/${route.id}`, { method: 'DELETE' });
      onConfirm(route.id);
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
        aria-labelledby="delete-route-title"
      >
        <p className="eyebrow">Delete Route</p>
        <h2 id="delete-route-title" style={{ marginBottom: 10 }}>
          Delete {route.route_code}?
        </h2>
        <div className="alert-box alert-box--warning" style={{ marginBottom: 14 }}>
          <strong>Important Safety Notice:</strong>
          <br />
          Deleting this route will also delete all of its stops because the database uses <code>ON DELETE CASCADE</code>.
          <br /><br />
          Routes with existing trips cannot be deleted.
        </div>
        <p style={{ color: '#60708a', marginBottom: 16 }}>
          Are you sure you want to permanently delete route <strong>{route.name}</strong> (<code>{route.route_code}</code>)?
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
            {deleting ? 'Deleting…' : 'Delete Route'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── manage stops modal ──────────────────────────────── */
function ManageStopsModal({ route, onClose, onRouteUpdated }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sub-forms state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [deleteConfirmStop, setDeleteConfirmStop] = useState(null);

  // Form states
  const [stopForm, setStopForm] = useState(EMPTY_STOP_FORM);
  const [actionLoading, setActionLoading] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);

  // Google Maps location resolution state
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [resolvedData, setResolvedData] = useState(null);

  const fetchStops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/routes/${route.id}`);
      setStops(res.stops || []);
      setOrderDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load stops.');
    } finally {
      setLoading(false);
    }
  }, [route.id]);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  function handleSetForm(field) {
    return (e) => {
      setStopForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  // Open add form
  function handleOpenAdd() {
    setStopForm({
      ...EMPTY_STOP_FORM,
      stop_order: '', // blank for auto-append
    });
    setEditingStop(null);
    setShowAddForm(true);
    setResolvedData(null);
    setResolveError('');
    setError('');
    setSuccess('');
  }

  // Open edit form
  function handleOpenEdit(stop) {
    setStopForm({
      name: stop.name || '',
      stop_order: stop.stop_order !== null ? String(stop.stop_order) : '',
      latitude: stop.latitude !== null ? String(stop.latitude) : '',
      longitude: stop.longitude !== null ? String(stop.longitude) : '',
      scheduled_time: stop.scheduled_time ? String(stop.scheduled_time).slice(0, 5) : '',
      google_maps_url: stop.google_maps_url || '',
    });
    setEditingStop(stop);
    setShowAddForm(false);
    setResolvedData(null);
    setResolveError('');
    setError('');
    setSuccess('');
  }

  // Cancel any form
  function handleCancelForm() {
    setShowAddForm(false);
    setEditingStop(null);
    setResolvedData(null);
    setResolveError('');
    setError('');
  }

  // Resolve Google Maps location link into latitude & longitude
  async function handleResolveLocation() {
    const rawUrl = stopForm.google_maps_url?.trim();
    if (!rawUrl) return;

    setResolvingLocation(true);
    setResolveError('');
    setResolvedData(null);

    try {
      const res = await apiRequest('/admin/routes/resolve-location', {
        method: 'POST',
        body: JSON.stringify({ url: rawUrl }),
      });

      if (res.latitude !== undefined && res.longitude !== undefined) {
        setStopForm((prev) => ({
          ...prev,
          latitude: String(res.latitude),
          longitude: String(res.longitude),
        }));
        setResolvedData({
          latitude: res.latitude,
          longitude: res.longitude,
          address: res.formatted_address || null,
        });
      } else {
        throw new Error('Unable to resolve this Google Maps location. Please check the link or enter coordinates manually.');
      }
    } catch (err) {
      setResolveError(
        err.message || 'Unable to resolve this Google Maps location. Please check the link or enter coordinates manually.'
      );
    } finally {
      setResolvingLocation(false);
    }
  }

  // Submit Add Stop
  async function handleCreateStop(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const payload = {
        name: stopForm.name.trim(),
        stop_order: stopForm.stop_order.trim() ? Number(stopForm.stop_order) : null,
        latitude: stopForm.latitude.trim() ? Number(stopForm.latitude) : null,
        longitude: stopForm.longitude.trim() ? Number(stopForm.longitude) : null,
        scheduled_time: stopForm.scheduled_time.trim() || null,
        google_maps_url: stopForm.google_maps_url?.trim() || null,
      };

      await apiRequest(`/admin/routes/${route.id}/stops`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess('Stop added successfully.');
      setShowAddForm(false);
      setStopForm(EMPTY_STOP_FORM);
      await fetchStops();
      if (onRouteUpdated) onRouteUpdated();
    } catch (err) {
      setError(err.message || 'Failed to add stop.');
    } finally {
      setActionLoading(false);
    }
  }

  // Submit Edit Stop
  async function handleUpdateStop(e) {
    e.preventDefault();
    if (!editingStop) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const payload = {
        name: stopForm.name.trim(),
        stop_order: stopForm.stop_order.trim() ? Number(stopForm.stop_order) : null,
        latitude: stopForm.latitude.trim() ? Number(stopForm.latitude) : null,
        longitude: stopForm.longitude.trim() ? Number(stopForm.longitude) : null,
        scheduled_time: stopForm.scheduled_time.trim() || null,
        google_maps_url: stopForm.google_maps_url?.trim() || null,
      };

      await apiRequest(`/admin/routes/${route.id}/stops/${editingStop.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess('Stop updated successfully.');
      setEditingStop(null);
      setStopForm(EMPTY_STOP_FORM);
      await fetchStops();
      if (onRouteUpdated) onRouteUpdated();
    } catch (err) {
      setError(err.message || 'Failed to update stop.');
    } finally {
      setActionLoading(false);
    }
  }

  // Delete Stop
  async function handleDeleteStop(stopId) {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      await apiRequest(`/admin/routes/${route.id}/stops/${stopId}`, {
        method: 'DELETE',
      });
      setSuccess('Stop deleted and remaining stops resequenced.');
      setDeleteConfirmStop(null);
      await fetchStops();
      if (onRouteUpdated) onRouteUpdated();
    } catch (err) {
      setError(err.message || 'Failed to delete stop.');
    } finally {
      setActionLoading(false);
    }
  }

  // Move stop up or down in local array
  function handleMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setStops(updated);
    setOrderDirty(true);
    setError('');
    setSuccess('');
  }

  // Save new order to backend
  async function handleSaveOrder() {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const stop_ids = stops.map((s) => s.id);
      await apiRequest(`/admin/routes/${route.id}/stops/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ stop_ids }),
      });

      setSuccess('Stop order updated successfully.');
      setOrderDirty(false);
      await fetchStops();
      if (onRouteUpdated) onRouteUpdated();
    } catch (err) {
      setError(err.message || 'Failed to save stop order.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card panel"
        style={{ width: 'min(100%, 680px)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-stops-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p className="eyebrow">Route Stop Management</p>
            <h2 id="manage-stops-title" style={{ marginBottom: 4 }}>
              {route.name}
            </h2>
            <p style={{ color: '#60708a', fontSize: 13, margin: 0 }}>
              Route Code: <code>{route.route_code}</code> • Total Stops: <strong>{stops.length}</strong>
            </p>
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

        {success && <div className="alert-box alert-box--success">{success}</div>}
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        {orderDirty && (
          <div className="alert-box alert-box--warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>You have unsaved stop order changes.</span>
            <button
              type="button"
              className="primary-button"
              style={{ width: 'auto', marginTop: 0, padding: '6px 14px', fontSize: 12 }}
              onClick={handleSaveOrder}
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving…' : 'Save New Order'}
            </button>
          </div>
        )}

        {/* ── Add / Edit Stop Form ── */}
        {(showAddForm || editingStop) && (
          <div className="panel" style={{ background: '#f8faff', border: '1px solid #ccd7e6', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12, color: '#162b49' }}>
              {editingStop ? `Edit Stop #${editingStop.stop_order}` : 'Add New Stop'}
            </h3>
            <form onSubmit={editingStop ? handleUpdateStop : handleCreateStop}>
              <div className="modal-grid">
                <label className="field-label" style={{ margin: '8px 0' }}>
                  Stop Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kondapur Bus Shelter"
                    value={stopForm.name}
                    onChange={handleSetForm('name')}
                    disabled={actionLoading}
                    maxLength={120}
                  />
                </label>

                <label className="field-label" style={{ margin: '8px 0' }}>
                  Stop Order (Sequence)
                  <input
                    type="number"
                    min="1"
                    placeholder={showAddForm ? 'Leave blank to append at end' : 'Sequence #'}
                    value={stopForm.stop_order}
                    onChange={handleSetForm('stop_order')}
                    disabled={actionLoading}
                  />
                </label>
              </div>

              {/* Google Maps Location URL & Resolver */}
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #d1dbe8',
                }}
              >
                <label className="field-label" style={{ margin: '0 0 6px 0', fontWeight: 600 }}>
                  Google Maps Location
                  <span style={{ fontWeight: 400, color: '#60708a', marginLeft: 6, fontSize: 12 }}>
                    (paste Google Maps URL here)
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?q=... or https://www.google.com/maps/place/..."
                    value={stopForm.google_maps_url}
                    onChange={handleSetForm('google_maps_url')}
                    disabled={actionLoading || resolvingLocation}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResolveLocation}
                    disabled={actionLoading || resolvingLocation || !stopForm.google_maps_url.trim()}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: actionLoading || resolvingLocation || !stopForm.google_maps_url.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resolvingLocation ? 'Resolving…' : '📍 Resolve Coordinates'}
                  </button>
                </div>

                {resolveError && (
                  <div
                    className="form-error"
                    style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                  >
                    ⚠️ {resolveError}
                  </div>
                )}

                {resolvedData && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 6,
                      color: '#065f46',
                      fontSize: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Resolved Location</strong>
                      <div>
                        Latitude: <code>{resolvedData.latitude}</code> • Longitude: <code>{resolvedData.longitude}</code>
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#047857',
                        background: '#d1fae5',
                        padding: '3px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✓ Location Resolved
                    </span>
                  </div>
                )}
              </div>

              {/* Manual Coordinate Fallback Inputs */}
              <div className="modal-grid">
                <label className="field-label" style={{ margin: '8px 0' }}>
                  Latitude (Manual Fallback)
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 17.4699"
                    value={stopForm.latitude}
                    onChange={handleSetForm('latitude')}
                    disabled={actionLoading}
                  />
                </label>

                <label className="field-label" style={{ margin: '8px 0' }}>
                  Longitude (Manual Fallback)
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 78.3578"
                    value={stopForm.longitude}
                    onChange={handleSetForm('longitude')}
                    disabled={actionLoading}
                  />
                </label>
              </div>

              <div className="modal-grid">
                <label className="field-label" style={{ margin: '8px 0' }}>
                  Scheduled Time (Optional)
                  <input
                    type="time"
                    value={stopForm.scheduled_time}
                    onChange={handleSetForm('scheduled_time')}
                    disabled={actionLoading}
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'center', color: '#60708a', fontSize: 12, paddingTop: 20 }}>
                  Coordinates and scheduled time are optional. Decimal format (-90 to 90 lat, -180 to 180 lng).
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancelForm}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button modal-submit"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving…' : editingStop ? 'Update Stop' : 'Add Stop'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Toolbar for Stops ── */}
        {!showAddForm && !editingStop && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#172033' }}>
              Pickup / Drop-off Stops ({stops.length})
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {orderDirty && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSaveOrder}
                  disabled={actionLoading}
                  style={{ fontSize: 12, padding: '7px 12px' }}
                >
                  Save Order
                </button>
              )}
              <button
                type="button"
                className="primary-button"
                style={{ width: 'auto', marginTop: 0, padding: '7px 14px', fontSize: 13 }}
                onClick={handleOpenAdd}
                disabled={actionLoading}
              >
                + Add Stop
              </button>
            </div>
          </div>
        )}

        {/* ── Stop List ── */}
        {loading ? (
          <div className="page-state" style={{ minHeight: 120 }}>Loading stops…</div>
        ) : stops.length === 0 ? (
          <div className="panel empty-state" style={{ padding: '32px 16px', background: '#f8faff' }}>
            <p>No stops have been added to this route yet.</p>
            {!showAddForm && (
              <button
                className="primary-button"
                style={{ width: 'auto', marginTop: 10 }}
                onClick={handleOpenAdd}
              >
                Add First Stop
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stops.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#fff',
                  border: '1px solid #e3e9f2',
                  borderRadius: 8,
                }}
              >
                {/* Stop info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span
                    className="badge-count"
                    style={{ minWidth: 28, justifyContent: 'center', background: '#eaf3ff', color: '#1e5ca8', fontWeight: 700 }}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#8fa0ba', marginTop: 2 }}>
                      {s.scheduled_time ? `🕒 ${s.scheduled_time.slice(0, 5)} ` : ''}
                      {s.latitude !== null && s.longitude !== null
                        ? `• 📍 (${s.latitude}, ${s.longitude})`
                        : '• 📍 Coordinates not set'}
                      {s.google_maps_url && (
                        <a
                          href={s.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Google Maps link in new tab"
                          style={{ color: '#2563eb', marginLeft: 6, textDecoration: 'none', fontWeight: 500 }}
                        >
                          🌐 Map Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reorder and action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move Stop Up"
                    disabled={idx === 0 || actionLoading}
                    onClick={() => handleMove(idx, -1)}
                    style={{ opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move Stop Down"
                    disabled={idx === stops.length - 1 || actionLoading}
                    onClick={() => handleMove(idx, 1)}
                    style={{ opacity: idx === stops.length - 1 ? 0.3 : 1 }}
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Edit Stop"
                    disabled={actionLoading}
                    onClick={() => handleOpenEdit(s)}
                  >
                    ✏️
                  </button>
                  {deleteConfirmStop?.id === s.id ? (
                    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-sm-danger"
                        disabled={actionLoading}
                        onClick={() => handleDeleteStop(s.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        disabled={actionLoading}
                        onClick={() => setDeleteConfirmStop(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      title="Delete Stop"
                      disabled={actionLoading}
                      onClick={() => setDeleteConfirmStop(s)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page component ─────────────────────────────── */
export function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [routeModal, setRouteModal] = useState(null); // { mode: 'add' } | { mode: 'edit', route }
  const [deleteTarget, setDeleteTarget] = useState(null); // route object
  const [manageStopsRoute, setManageStopsRoute] = useState(null); // route object

  const debouncedSearch = useDebounce(search, 350);
  const limit = 20;

  // Fetch routes
  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      const data = await apiRequest(`/admin/routes?${params}`);
      setRoutes(data.routes || []);
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
    fetchRoutes();
  }, [fetchRoutes]);

  function handleRouteSaved() {
    setRouteModal(null);
    fetchRoutes();
  }

  function handleRouteDeleted() {
    setDeleteTarget(null);
    fetchRoutes();
  }

  const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = Math.min(total, page * limit);

  return (
    <section>
      {/* ── Header ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Routes & Stops</h2>
        <p>Manage school transportation routes and their pickup/drop-off stops.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="students-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by route code, name, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary-button add-btn"
          onClick={() => setRouteModal({ mode: 'add' })}
        >
          + Add Route
        </button>
      </div>

      {/* ── Error & Content ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading routes…</div>
      ) : routes.length === 0 ? (
        <div className="panel empty-state">
          <p>{debouncedSearch ? `No routes match "${debouncedSearch}".` : 'No routes have been created yet.'}</p>
          {!debouncedSearch && (
            <button
              className="primary-button"
              style={{ marginTop: 12, width: 'auto' }}
              onClick={() => setRouteModal({ mode: 'add' })}
            >
              Add First Route
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
                  <th>Route Code</th>
                  <th>Route Name</th>
                  <th>Stops</th>
                  <th>Estimated Duration</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-id">#{r.id}</td>
                    <td className="cell-name">
                      <code>{r.route_code}</code>
                    </td>
                    <td>
                      <strong>{r.name}</strong>
                      {r.description && (
                        <div style={{ fontSize: 12, color: '#8fa0ba', marginTop: 2 }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge-count ${r.stop_count === 0 ? 'badge-count-empty' : ''}`}>
                        📍 {r.stop_count} {r.stop_count === 1 ? 'stop' : 'stops'}
                      </span>
                    </td>
                    <td>
                      {r.estimated_duration_minutes !== null ? `${r.estimated_duration_minutes} mins` : '—'}
                    </td>
                    <td>
                      <span className={`badge-status badge-status--${r.is_active ? 'active' : 'inactive'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => setManageStopsRoute(r)}
                        style={{ marginRight: 6 }}
                      >
                        📍 Manage Stops
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit Route"
                        onClick={() => setRouteModal({ mode: 'edit', route: r })}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Delete Route"
                        onClick={() => setDeleteTarget(r)}
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
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} route${total !== 1 ? 's' : ''}`}
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
      {routeModal?.mode === 'add' && (
        <RouteModal onSave={handleRouteSaved} onClose={() => setRouteModal(null)} />
      )}
      {routeModal?.mode === 'edit' && (
        <RouteModal
          initial={routeModal.route}
          onSave={handleRouteSaved}
          onClose={() => setRouteModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteRoute
          route={deleteTarget}
          onConfirm={handleRouteDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {manageStopsRoute && (
        <ManageStopsModal
          route={manageStopsRoute}
          onClose={() => setManageStopsRoute(null)}
          onRouteUpdated={fetchRoutes}
        />
      )}
    </section>
  );
}
