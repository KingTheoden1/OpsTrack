import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDefects, createDefect, updateDefect } from '../api/defects';
import { useAuth } from '../context/AuthContext';
import type { Defect, DefectSeverity, DefectStatus } from '../types';

const SEVERITY_COLORS: Record<DefectSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-800',
  high: 'bg-orange-500/20 text-orange-400 border-orange-800',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-800',
  low: 'bg-green-500/20 text-green-400 border-green-800',
};

const STATUS_COLORS: Record<DefectStatus, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-800',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-800',
  resolved: 'bg-green-500/20 text-green-400 border-green-800',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-700',
};

const PAGE_SIZE = 10;

const emptyForm = {
  title: '',
  description: '',
  severity: 'medium' as DefectSeverity,
  status: 'open' as DefectStatus,
};

export default function DefectLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = user?.role === 'admin' || user?.role === 'supervisor';

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects'],
    queryFn: getDefects,
  });

  const createMutation = useMutation({
    mutationFn: createDefect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defects'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Defect> }) => updateDefect(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defects'] });
      // Refresh the selected defect in the slide-over with updated data
      setSelected((prev) => prev ? { ...prev, ...editForm } as Defect : null);
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Defect | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<Partial<Defect>>({});

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<DefectSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DefectStatus | 'all'>('all');

  const filtered = defects.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    const matchesSeverity = filterSeverity === 'all' || d.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const isFiltered = search.trim() !== '' || filterSeverity !== 'all' || filterStatus !== 'all';

  function clearFilters() {
    setSearch('');
    setFilterSeverity('all');
    setFilterStatus('all');
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters change so we never land on an empty page
  useEffect(() => {
    setPage(1);
  }, [search, filterSeverity, filterStatus]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstItem = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, filtered.length);

  function openDetail(defect: Defect) {
    setSelected(defect);
    setEditForm({
      title: defect.title,
      description: defect.description,
      severity: defect.severity,
      status: defect.status,
    });
    updateMutation.reset();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Defect Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isFiltered
              ? `${filtered.length} of ${defects.length} defects`
              : `${defects.length} total defect${defects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Defect
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or description…"
          className="flex-1 min-w-48 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as DefectSeverity | 'all')}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DefectStatus | 'all')}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg border border-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Severity</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Reporter</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-600">
                  {isFiltered ? 'No defects match your filters.' : 'No defects logged yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => openDetail(d)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-500">#{d.id}</td>
                  <td className="px-4 py-3 text-gray-100 max-w-xs truncate">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${SEVERITY_COLORS[d.severity]}`}>
                      {d.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[d.status]}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{d.reporter_email ?? `#${d.reported_by}`}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500 text-xs">
            Showing {firstItem}–{lastItem} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            {getPageNumbers(page, totalPages).map((n, i) =>
              n === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(Number(n))}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === n
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500'
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Log New Defect" onClose={() => setShowCreate(false)}>
          <DefectForm
            form={form}
            onChange={(f) => setForm((p) => ({ ...p, ...f }))}
            onSubmit={() => createMutation.mutate(form)}
            loading={createMutation.isPending}
            submitLabel="Create Defect"
          />
        </Modal>
      )}

      {/* Detail / Edit slide-over */}
      <SlideOver
        defect={selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        editForm={editForm}
        onEditChange={(f) => setEditForm((p) => ({ ...p, ...f }))}
        onSave={() => selected && updateMutation.mutate({ id: selected.id, data: editForm })}
        saving={updateMutation.isPending}
        saved={updateMutation.isSuccess}
      />
    </div>
  );
}

/** Returns page numbers with '...' gaps for large ranges. */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SlideOver({
  defect,
  onClose,
  canWrite,
  editForm,
  onEditChange,
  onSave,
  saving,
  saved,
}: {
  defect: Defect | null;
  onClose: () => void;
  canWrite: boolean;
  editForm: Partial<typeof emptyForm>;
  onEditChange: (f: Partial<typeof emptyForm>) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isOpen = defect !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col
          transition-transform duration-250 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {defect && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800 shrink-0">
              <div className="pr-4">
                <p className="text-xs text-gray-500 mb-1">Defect #{defect.id}</p>
                <h2 className="text-base font-semibold text-gray-100 leading-snug">{defect.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-300 text-2xl leading-none shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Severity</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${SEVERITY_COLORS[defect.severity]}`}>
                    {defect.severity}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[defect.status]}`}>
                    {defect.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reported by</p>
                  <p className="text-sm text-gray-300">{defect.reporter_email ?? `User #${defect.reported_by}`}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Logged</p>
                  <p className="text-sm text-gray-300">{new Date(defect.created_at).toLocaleDateString()}</p>
                </div>
                {defect.updated_at && defect.updated_at !== defect.created_at && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Last updated</p>
                    <p className="text-sm text-gray-300">{new Date(defect.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{defect.description}</p>
              </div>

              {/* Edit form — admin/supervisor only */}
              {canWrite && (
                <div className="border-t border-gray-800 pt-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Edit Defect</p>
                  <DefectForm
                    form={editForm as typeof emptyForm}
                    onChange={onEditChange}
                    onSubmit={onSave}
                    loading={saving}
                    submitLabel={saved ? 'Saved!' : 'Save Changes'}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DefectForm({
  form,
  onChange,
  onSubmit,
  loading,
  submitLabel,
}: {
  form: typeof emptyForm;
  onChange: (f: Partial<typeof emptyForm>) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Title</label>
        <input
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          placeholder="Short description of the defect"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Detailed description…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Severity</label>
          <select
            value={form.severity}
            onChange={(e) => onChange({ severity: e.target.value as DefectSeverity })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Status</label>
          <select
            value={form.status}
            onChange={(e) => onChange({ status: e.target.value as DefectStatus })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || !form.title || !form.description}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
