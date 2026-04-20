import { useState } from 'react';
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
      setEditing(null);
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Defect | null>(null);
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

  function openEdit(defect: Defect) {
    setEditing(defect);
    setEditForm({
      title: defect.title,
      description: defect.description,
      severity: defect.severity,
      status: defect.status,
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Defect Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isFiltered
              ? `${filtered.length} of ${defects.length} defects`
              : `${defects.length} total defects`}
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
              {canWrite && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600">
                  {isFiltered ? 'No defects match your filters.' : 'No defects logged yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
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
                  {canWrite && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(d)}
                        className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Edit Defect #${editing.id}`} onClose={() => setEditing(null)}>
          <DefectForm
            form={editForm as typeof emptyForm}
            onChange={(f) => setEditForm((p) => ({ ...p, ...f }))}
            onSubmit={() => updateMutation.mutate({ id: editing.id, data: editForm })}
            loading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </div>
  );
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
