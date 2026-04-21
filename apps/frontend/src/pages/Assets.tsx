import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../api/assets';
import { useAuth } from '../context/AuthContext';
import type { Asset } from '../types';

const emptyForm = { name: '', type: '', location: '' };
type AssetForm = typeof emptyForm;

export default function Assets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const canWrite = isAdmin || user?.role === 'supervisor';

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: getAssets,
  });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => updateAsset(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setSelected((prev) => (prev ? ({ ...prev, ...editForm } as Asset) : null));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setSelected(null);
      setConfirmDelete(false);
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [editForm, setEditForm] = useState<Partial<AssetForm>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = assets.filter((a) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    );
  });

  function openDetail(asset: Asset) {
    setSelected(asset);
    setEditForm({ name: asset.name, type: asset.type, location: asset.location });
    setConfirmDelete(false);
    updateMutation.reset();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assets</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {assets.length} total asset{assets.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Asset
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, or location…"
          className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-600">
                  {search ? 'No assets match your search.' : 'No assets registered yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => openDetail(a)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-500">#{a.id}</td>
                  <td className="px-4 py-3 text-gray-100 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-gray-400">{a.type}</td>
                  <td className="px-4 py-3 text-gray-400">{a.location}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Register New Asset" onClose={() => setShowCreate(false)}>
          <AssetFormFields
            form={form}
            onChange={(f) => setForm((p) => ({ ...p, ...f }))}
            onSubmit={() => createMutation.mutate(form)}
            loading={createMutation.isPending}
            submitLabel="Create Asset"
          />
        </Modal>
      )}

      {/* Detail / Edit slide-over */}
      <AssetSlideOver
        asset={selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        isAdmin={isAdmin}
        editForm={editForm}
        onEditChange={(f) => setEditForm((p) => ({ ...p, ...f }))}
        onSave={() => selected && updateMutation.mutate({ id: selected.id, data: editForm })}
        saving={updateMutation.isPending}
        saved={updateMutation.isSuccess}
        confirmDelete={confirmDelete}
        onDeleteRequest={() => setConfirmDelete(true)}
        onDeleteCancel={() => setConfirmDelete(false)}
        onDeleteConfirm={() => selected && deleteMutation.mutate(selected.id)}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Slide-over ─────────────────────────────────────────────────────────────────

function AssetSlideOver({
  asset,
  onClose,
  canWrite,
  isAdmin,
  editForm,
  onEditChange,
  onSave,
  saving,
  saved,
  confirmDelete,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
  deleting,
}: {
  asset: Asset | null;
  onClose: () => void;
  canWrite: boolean;
  isAdmin: boolean;
  editForm: Partial<AssetForm>;
  onEditChange: (f: Partial<AssetForm>) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  confirmDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  deleting: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isOpen = asset !== null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col
          transition-transform duration-250 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {asset && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800 shrink-0">
              <div className="pr-4">
                <p className="text-xs text-gray-500 mb-1">Asset #{asset.id}</p>
                <h2 className="text-base font-semibold text-gray-100 leading-snug">{asset.name}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-300 text-2xl leading-none shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-sm text-gray-300">{asset.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="text-sm text-gray-300">{asset.location}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Registered</p>
                  <p className="text-sm text-gray-300">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Edit form */}
              {canWrite && (
                <div className="border-t border-gray-800 pt-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Edit Asset</p>
                  <AssetFormFields
                    form={editForm as AssetForm}
                    onChange={onEditChange}
                    onSubmit={onSave}
                    loading={saving}
                    submitLabel={saved ? 'Saved!' : 'Save Changes'}
                  />
                </div>
              )}

              {/* Delete — admin only */}
              {isAdmin && (
                <div className="border-t border-gray-800 pt-5">
                  {!confirmDelete ? (
                    <button
                      onClick={onDeleteRequest}
                      className="text-sm text-red-500 hover:text-red-400 transition-colors"
                    >
                      Delete asset…
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        This will permanently remove the asset. Are you sure?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={onDeleteConfirm}
                          disabled={deleting}
                          className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                        >
                          {deleting ? 'Deleting…' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={onDeleteCancel}
                          className="text-sm text-gray-500 hover:text-gray-300 px-4 py-1.5 rounded-lg border border-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Form ───────────────────────────────────────────────────────────────────────

function AssetFormFields({
  form,
  onChange,
  onSubmit,
  loading,
  submitLabel,
}: {
  form: AssetForm;
  onChange: (f: Partial<AssetForm>) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Name</label>
        <input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Hydraulic Actuator Unit 4"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Type</label>
        <input
          value={form.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Hydraulic, Avionics, Structural"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-400">Location</label>
        <input
          value={form.location}
          onChange={(e) => onChange({ location: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Bay 3, Frame 245"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={loading || !form.name || !form.type || !form.location}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
