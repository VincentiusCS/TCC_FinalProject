import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getEmployees, deleteEmployee } from '../services/api'

const PAGE_SIZE = 10

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [uploadModal, setUploadModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getEmployees()
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || []
      // Normalize is_active (0/1) → status ('active'/'inactive')
      const data = raw.map((e) => ({
        ...e,
        status: e.is_active !== undefined
          ? (e.is_active ? 'active' : 'inactive')
          : (e.status || 'active'),
      }))
      setEmployees(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const filtered = employees
    .filter((e) => {
      if (statusFilter !== 'all' && e.status?.toLowerCase() !== statusFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (e.name || '').toLowerCase().includes(q) ||
               (e.employee_code || '').toLowerCase().includes(q) ||
               (e.email || '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'code') return (a.employee_code || '').localeCompare(b.employee_code || '')
      // newest first (by id desc)
      return (b.id || 0) - (a.id || 0)
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteEmployee(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchEmployees()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete employee.')
    } finally {
      setDeleting(false)
    }
  }

  const activeCount = employees.filter((e) => e.status?.toLowerCase() === 'active').length

  return (
    <Layout>
      <div className="pt-[calc(24px)] md:ml-0 px-gutter pb-stack_lg min-h-screen">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-stack_lg gap-4 pt-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Data Karyawan Salesman</h1>
            <p className="text-body-md text-on-surface-variant">Manage and track your sales team performance and profiles.</p>
          </div>
          <button
            className="bg-primary text-on-primary flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-body-md font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            onClick={() => navigate('/employees/create')}
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Add New Employee
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-outline-variant mb-6 flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              className="bg-transparent border-none outline-none text-body-md w-full"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setPage(1) }}>
                <span className="material-symbols-outlined text-outline text-[18px]">close</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant">
            <span className="text-label-sm text-on-surface-variant uppercase">Status:</span>
            <select
              className="bg-transparent border-none text-body-md focus:ring-0 cursor-pointer py-0"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant">
            <span className="text-label-sm text-on-surface-variant uppercase">Sort by:</span>
            <select
              className="bg-transparent border-none text-body-md focus:ring-0 cursor-pointer py-0"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
            >
              <option value="newest">Newest First</option>
              <option value="code">Code (Asc)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
            </button>
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">download</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-surface rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  {['Photo', 'Employee Code', 'Name', 'Contact Info', 'Position', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider ${h === 'Status' ? 'text-center' : ''} ${h === 'Actions' ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Spinner /></div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4">
                        {emp.photo_url ? (
                          <img
                            src={emp.photo_url}
                            alt={emp.name}
                            className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">
                            {(emp.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-code-md text-code-md font-medium">
                        {emp.employee_code || '-'}
                      </td>
                      <td className="px-6 py-4 font-body-md text-body-md font-semibold text-on-surface">
                        {emp.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-body-md">{emp.email}</span>
                          <span className="text-label-sm text-on-surface-variant">{emp.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface text-label-sm rounded-full">
                          {emp.position_name || emp.position?.position_name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emp.status?.toLowerCase() === 'active' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-bold bg-green-100 text-green-700 uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-bold bg-gray-200 text-gray-600 uppercase">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors"
                            title="Detail"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                          >
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <button
                            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
                            title="Edit"
                            onClick={() => navigate(`/employees/${emp.id}/edit`)}
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
                            title="Upload Photo"
                            onClick={() => setUploadModal(emp)}
                          >
                            <span className="material-symbols-outlined text-[20px]">file_upload</span>
                          </button>
                          <button
                            className="p-1.5 hover:bg-error-container rounded-lg text-error transition-colors"
                            title="Delete"
                            onClick={() => setDeleteConfirm(emp)}
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-t border-outline-variant">
            <p className="text-label-sm text-on-surface-variant">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} employees
            </p>
            <div className="flex items-center gap-2">
              <button
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-50 transition-colors"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-label-sm font-bold transition-colors ${
                    p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-50 transition-colors"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mt-stack_lg grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-container p-6 rounded-xl border border-primary/20 flex items-center gap-4">
            <div className="p-3 bg-primary rounded-lg">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
            </div>
            <div>
              <p className="text-label-sm text-on-primary-container uppercase font-bold tracking-wider">Total Salesforce</p>
              <p className="text-headline-md font-bold text-on-primary-container">{employees.length} Personnel</p>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant flex items-center gap-4">
            <div className="p-3 bg-secondary-container rounded-lg">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>person_check</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Active</p>
              <p className="text-headline-md font-bold text-on-surface">{activeCount} Active</p>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant flex items-center gap-4">
            <div className="p-3 bg-tertiary-fixed rounded-lg">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Active Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-headline-md font-bold text-on-surface">
                  {employees.length ? Math.round((activeCount / employees.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-error-container rounded-lg">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Confirm Delete</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Spinner /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Quick Link Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Upload Photo</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Go to employee detail to upload a photo for <strong>{uploadModal.name}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                onClick={() => setUploadModal(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all"
                onClick={() => { navigate(`/employees/${uploadModal.id}`); setUploadModal(null) }}
              >
                Go to Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
