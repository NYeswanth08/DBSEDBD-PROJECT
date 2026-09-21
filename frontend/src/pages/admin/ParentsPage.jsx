import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

/* ─── tiny helpers ─────────────────────────────────────── */
const EMPTY_FORM = { name: '', phone: '', email: '', password: '' };

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── parent modal (add / edit) ────────────────────────── */
function ParentModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    phone: initial.phone || '',
    email: initial.email || '',
    password: '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(initial?.parent_id);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const path = isEdit
        ? `/admin/parents/${initial.parent_id}`
        : '/admin/parents';
      const method = isEdit ? 'PUT' : 'POST';
      const { parent } = await apiRequest(path, {
        method,
        body: JSON.stringify(form),
      });
      onSave(parent);
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
        <p className="eyebrow">{isEdit ? 'Edit Parent' : 'Add Parent'}</p>
        <h2 id="modal-title" style={{ marginBottom: 20 }}>
          {isEdit ? `Editing — ${initial.name}` : 'New Parent'}
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
            Phone Number *
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              required
              placeholder="e.g. 9876543210"
            />
          </label>
          <label className="field-label">
            Email Address (optional)
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="e.g. priya.sharma@example.com"
            />
          </label>
          <label className="field-label">
            Portal Login Password {isEdit ? '(leave blank to keep current)' : '(optional, defaults to Parent@12345)'}
            <input
              type="password"
              value={form.password || ''}
              onChange={set('password')}
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'e.g. Parent@12345'}
              autoComplete="new-password"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button modal-submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Parent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── manage linked students modal ──────────────────────── */
function ManageStudentsModal({ parent, onRefreshParents, onClose }) {
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationshipType, setRelationshipType] = useState('GUARDIAN');
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unlinkConfirm, setUnlinkConfirm] = useState(null); // { student_id, name }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [parentRes, availRes] = await Promise.all([
        apiRequest(`/admin/parents/${parent.parent_id}`),
        apiRequest('/admin/parents/available-students'),
      ]);
      setLinkedStudents(parentRes.parent?.students || []);
      setAvailableStudents(availRes.students || []);
      setSelectedStudentId('');
      setRelationshipType('GUARDIAN');
      setIsPrimaryContact(true);
    } catch (err) {
      setError(err.message || 'Failed to load student data.');
    } finally {
      setLoading(false);
    }
  }, [parent.parent_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLink(e) {
    e.preventDefault();
    if (!selectedStudentId) return;
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await apiRequest(`/admin/parents/${parent.parent_id}/students`, {
        method: 'POST',
        body: JSON.stringify({
          student_id: Number(selectedStudentId),
          relationship_type: relationshipType,
          is_primary_contact: isPrimaryContact,
        }),
      });
      setSuccess(res.message || 'Student linked successfully.');
      await loadData();
      onRefreshParents();
    } catch (err) {
      setError(err.message || 'Failed to link student.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlink(student) {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await apiRequest(`/admin/parents/${parent.parent_id}/students/${student.student_id}`, {
        method: 'DELETE',
      });
      setSuccess(res.message || 'Student unlinked successfully.');
      setUnlinkConfirm(null);
      await loadData();
      onRefreshParents();
    } catch (err) {
      setError(err.message || 'Failed to unlink student.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card manage-students-card panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-modal-title"
      >
        <p className="eyebrow">Parent-Student Linking</p>
        <h2 id="manage-modal-title" style={{ marginBottom: 4 }}>
          {parent.name}
        </h2>
        <p style={{ color: '#60708a', fontSize: 13, marginBottom: 18 }}>
          Contact Phone: <strong>{parent.phone}</strong> {parent.email && `• ${parent.email}`}
        </p>

        {success && (
          <div className="alert-box alert-box--success">
            {success}
          </div>
        )}
        {error && (
          <div className="form-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="page-state" style={{ minHeight: 120 }}>Loading student data…</div>
        ) : (
          <>
            {/* ── Currently linked students ── */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10, color: '#172033' }}>
                Currently Linked Students ({linkedStudents.length})
              </h3>

              {linkedStudents.length === 0 ? (
                <div style={{ padding: '16px 0', color: '#8fa0ba', fontSize: 14 }}>
                  No students are currently linked to this parent.
                </div>
              ) : (
                <div>
                  {linkedStudents.map((s) => (
                    <div key={s.student_id} className="student-link-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eef2f6' }}>
                      <div className="student-link-info" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="cell-id">#{s.student_id}</span>
                        <strong>{s.name}</strong>
                        <span style={{ color: '#60708a', fontSize: 13 }}>
                          (Class: {s.class || '—'})
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          textTransform: 'uppercase'
                        }}>
                          {s.relationship_type || 'GUARDIAN'}
                        </span>
                        {s.is_primary_contact ? (
                          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>★ Primary</span>
                        ) : null}
                      </div>
                      <div>
                        {unlinkConfirm?.student_id === s.student_id ? (
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#c0392b' }}>Confirm unlink?</span>
                            <button
                              type="button"
                              className="btn-sm-danger"
                              onClick={() => handleUnlink(s)}
                              disabled={actionLoading}
                            >
                              Yes, Unlink
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                              onClick={() => setUnlinkConfirm(null)}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-sm-danger"
                            onClick={() => setUnlinkConfirm(s)}
                            disabled={actionLoading}
                            title={`Unlink ${s.name}`}
                          >
                            ✖ Unlink
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Link a student (Many-to-Many) ── */}
            <div style={{ background: '#f5f7fb', padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8, color: '#172033' }}>
                + Link a Student to {parent.name}
              </h3>
              <p style={{ color: '#60708a', fontSize: 12, margin: '0 0 12px' }}>
                Select a student to establish a relationship. One student can have multiple guardians (e.g. Father, Mother).
              </p>

              {availableStudents.length === 0 ? (
                <div style={{ color: '#8fa0ba', fontSize: 13 }}>
                  ℹ️ No students found in the system.
                </div>
              ) : (
                <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      className="select-input"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={actionLoading}
                      style={{ flex: 2, minWidth: 200 }}
                    >
                      <option value="">-- Select a student --</option>
                      {availableStudents.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.name} (#{s.student_id}, Class: {s.class || '—'}) {s.linked_parent_names ? `[Linked: ${s.linked_parent_names}]` : '[Unlinked]'}
                        </option>
                      ))}
                    </select>

                    <select
                      className="select-input"
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      disabled={actionLoading}
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isPrimaryContact}
                        onChange={(e) => setIsPrimaryContact(e.target.checked)}
                        disabled={actionLoading}
                      />
                      Primary Contact for this student
                    </label>

                    <button
                      type="submit"
                      className="primary-button add-btn"
                      disabled={!selectedStudentId || actionLoading}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {actionLoading ? 'Linking…' : 'Link Student'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── confirm delete dialog with linked student safety ─── */
function ConfirmDelete({ parent, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isLinked = parent.student_count > 0;

  async function confirm() {
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/admin/parents/${parent.parent_id}`, { method: 'DELETE' });
      onConfirm(parent.parent_id);
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
        <p className="eyebrow">Delete Parent</p>
        <h2 style={{ marginBottom: 10 }}>Remove {parent.name}?</h2>

        {isLinked ? (
          <div className="alert-box alert-box--warning" style={{ margin: '14px 0' }}>
            <strong>Cannot Delete Linked Parent</strong>
            <p style={{ margin: '6px 0 0', color: 'inherit' }}>
              This parent is currently linked to <strong>{parent.student_count} student(s)</strong> ({parent.student_names || 'linked students'}) through contact phone <code>{parent.phone}</code>.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'inherit' }}>
              To delete this parent, please update or reassign the linked student contact numbers first.
            </p>
          </div>
        ) : (
          <p style={{ color: '#60708a', marginBottom: 20 }}>
            This action cannot be undone. The parent record will be permanently deleted.
          </p>
        )}

        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={confirm}
            disabled={deleting || isLinked}
            title={isLinked ? 'Cannot delete: parent is linked to students' : 'Delete parent'}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main parents page ─────────────────────────────────── */
export function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', parent }
  const [manageTarget, setManageTarget] = useState(null); // null | parent
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search);
  const limit = 20;

  const fetchParents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await apiRequest(`/admin/parents?${params}`);
      setParents(data.parents);
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
    fetchParents();
  }, [fetchParents]);

  function handleSaved() {
    setModal(null);
    fetchParents();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    fetchParents();
  }

  const firstRow = (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, total);

  return (
    <section>
      {/* ── header ── */}
      <div className="panel hero-panel" style={{ marginBottom: 18 }}>
        <p className="eyebrow">Admin</p>
        <h2>Parents</h2>
        <p>View and manage registered parents and their linked students.</p>
      </div>

      {/* ── toolbar ── */}
      <div className="students-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary-button add-btn"
          onClick={() => setModal({ mode: 'add' })}
        >
          + Add Parent
        </button>
      </div>

      {/* ── content ── */}
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div className="page-state" style={{ minHeight: 200 }}>Loading parents…</div>
      ) : parents.length === 0 ? (
        <div className="panel empty-state">
          <p>{debouncedSearch ? `No parents match "${debouncedSearch}".` : 'No parents have been added yet.'}</p>
          {!debouncedSearch && (
            <button
              className="primary-button"
              style={{ marginTop: 12, width: 'auto' }}
              onClick={() => setModal({ mode: 'add' })}
            >
              Add First Parent
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
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Linked Students</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.parent_id}>
                    <td className="cell-id">#{p.parent_id}</td>
                    <td className="cell-name">{p.name}</td>
                    <td>{p.phone}</td>
                    <td>{p.email || <span className="cell-empty">—</span>}</td>
                    <td>
                      {p.student_count > 0 ? (
                        <span
                          className="badge-count"
                          style={{ cursor: 'pointer' }}
                          title={`Click to manage linked students: ${p.student_names}`}
                          onClick={() => setManageTarget(p)}
                        >
                          👤 {p.student_count} ({p.student_names})
                        </span>
                      ) : (
                        <span
                          className="badge-count badge-count-empty"
                          style={{ cursor: 'pointer' }}
                          title="Click to link students"
                          onClick={() => setManageTarget(p)}
                        >
                          None
                        </span>
                      )}
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-link-action"
                        style={{ marginRight: 8 }}
                        title="Manage linked students"
                        onClick={() => setManageTarget(p)}
                      >
                        👥 Manage Students
                      </button>
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => setModal({ mode: 'edit', parent: p })}
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        title={p.student_count > 0 ? 'Delete (Linked to students)' : 'Delete'}
                        onClick={() => setDeleteTarget(p)}
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
              {total === 0 ? 'No results' : `${firstRow}–${lastRow} of ${total} parent${total !== 1 ? 's' : ''}`}
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
        <ParentModal onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ParentModal
          initial={modal.parent}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {manageTarget && (
        <ManageStudentsModal
          parent={manageTarget}
          onRefreshParents={fetchParents}
          onClose={() => setManageTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          parent={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
