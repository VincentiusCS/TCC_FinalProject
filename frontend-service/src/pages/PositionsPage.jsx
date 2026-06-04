import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { getPositions, createPosition, updatePosition, deletePosition } from '../services/api'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-purple-100 text-purple-600',
  'bg-green-100 text-green-600',
  'bg-amber-100 text-amber-600',
]

export default function PositionsPage() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editName, setEditName] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPositions()
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setPositions(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load positions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPositions() }, [fetchPositions])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addName.trim()) { setAddError('Position name is required.'); return }
    setAddLoading(true)
    setAddError('')
    try {
      await createPosition({ position_name: addName.trim() })
      setAddName('')
      setShowAddModal(false)
      fetchPositions()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create position.')
    } finally {
      setAddLoading(false)
    }
  }

  const openEdit = (pos) => {
    setEditTarget(pos)
    setEditName(pos.position_name)
    setEditError('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editName.trim()) { setEditError('Position name is required.'); return }
    setEditLoading(true)
    setEditError('')
    try {
      await updatePosition(editTarget.id, { position_name: editName.trim() })
      setEditTarget(null)
      fetchPositions()
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update position.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deletePosition(deleteTarget.id)
      setDeleteTarget(null)
      fetchPositions()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete position.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <Layout>
      <div className="p-gutter">
        {/* Breadcrumb & Header */}
        <section className="mb-stack_lg flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6">
          <div>
            <nav className="flex items-center gap-2 text-label-sm text-outline mb-2">
              <span>Main Menu</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Human Resources</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">Positions</span>
            </nav>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">Data Jabatan</h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              Kelola hierarki organisasi dan deskripsi pekerjaan secara terpusat.
            </p>
          </div>
          <button
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container shadow-sm transition-all active:scale-95"
            onClick={() => { setShowAddModal(true); setAddName(''); setAddError('') }}
          >
            <span className="material-symbols-outlined">add</span>
            <span>Tambah Jabatan</span>
          </button>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-stack_md mb-stack_lg">
          <div className="bg-surface border border-outline-variant p-stack_md rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-sm uppercase tracking-wider text-outline">Total Jabatan</span>
              <span className="p-2 bg-primary-fixed text-primary rounded-lg material-symbols-outlined">work_outline</span>
            </div>
            <div className="text-headline-lg font-bold">{positions.length}</div>
            <div className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              <span>Active Positions</span>
            </div>
          </div>
          <div className="bg-surface border border-outline-variant p-stack_md rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-sm uppercase tracking-wider text-outline">KPI Aktif</span>
              <span className="p-2 bg-tertiary-fixed text-tertiary rounded-lg material-symbols-outlined">analytics</span>
            </div>
            <div className="text-headline-lg font-bold">{Math.round(positions.length * 0.75)}</div>
            <div className="text-[10px] text-outline mt-2">75% Jabatan terikat KPI</div>
          </div>
          <div className="md:col-span-2 relative overflow-hidden bg-primary-container rounded-xl shadow-md p-stack_md text-white flex flex-col justify-center">
            <div className="relative z-10">
              <h4 className="font-headline-md mb-1">Optimasi Struktur Organisasi</h4>
              <p className="text-body-md opacity-90 max-w-sm">
                Gunakan fitur pemetaan kompetensi untuk menyelaraskan deskripsi jabatan dengan target perusahaan.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>hub</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
        )}

        {/* Table */}
        <section className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-stack_md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-body-lg">Daftar Jabatan</span>
              <span className="px-2 py-0.5 bg-surface-container-highest text-label-sm rounded-full">
                {positions.length} Entries
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-surface-container rounded-lg text-outline flex items-center gap-1 transition-all">
                <span className="material-symbols-outlined">filter_list</span>
                <span className="text-label-sm">Filter</span>
              </button>
              <button className="p-2 hover:bg-surface-container rounded-lg text-outline flex items-center gap-1 transition-all">
                <span className="material-symbols-outlined">download</span>
                <span className="text-label-sm">Export</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-label-sm text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Nama Jabatan</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Deskripsi</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Tanggal Dibuat</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Spinner /></div>
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      No positions found. Add your first position.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos, idx) => (
                    <tr key={pos.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            {getInitials(pos.position_name)}
                          </div>
                          <span className="font-bold text-on-surface">{pos.position_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-body-md text-on-surface-variant truncate">
                          {pos.description || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body-md text-outline">
                          {pos.created_at ? new Date(pos.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-all"
                            title="Edit"
                            onClick={() => openEdit(pos)}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="p-2 text-error hover:bg-error-container rounded-lg transition-all"
                            title="Delete"
                            onClick={() => setDeleteTarget(pos)}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="text-label-sm text-outline">
              Menampilkan {positions.length} data jabatan
            </span>
          </div>
        </section>

        {/* Info Card */}
        <section className="mt-stack_lg bg-surface border border-outline-variant p-stack_md rounded-xl flex gap-stack_md items-start">
          <div className="bg-primary-fixed-dim text-on-primary-fixed p-3 rounded-lg">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div>
            <h5 className="font-bold text-body-lg mb-1">Catatan Penting</h5>
            <p className="text-body-md text-on-surface-variant">
              Menghapus jabatan akan mempengaruhi struktur KPI yang sudah berjalan. Harap pastikan tidak ada
              karyawan yang sedang menjabat di posisi tersebut sebelum menghapus data.
            </p>
          </div>
        </section>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Tambah Jabatan Baru</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Nama Jabatan</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Salesman"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  autoFocus
                />
                {addError && <p className="text-error text-label-sm">{addError}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {addLoading ? <Spinner /> : null}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Edit Jabatan</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Nama Jabatan</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  autoFocus
                />
                {editError && <p className="text-error text-label-sm">{editError}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editLoading ? <Spinner /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-error-container rounded-lg">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Confirm Delete</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Are you sure you want to delete <strong>{deleteTarget.position_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? <Spinner /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
