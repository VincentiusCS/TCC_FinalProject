import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { getKpiPeriods, createKpiPeriod, updateKpiPeriod, deleteKpiPeriod } from '../services/api'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const BLANK_FORM = { period_name: '', month: '', year: new Date().getFullYear(), is_active: false }

export default function KpiPeriodsPage() {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState(BLANK_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addErrors, setAddErrors] = useState({})

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [editErrors, setEditErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchPeriods = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getKpiPeriods()
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setPeriods(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KPI periods.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  const validate = (form) => {
    const errs = {}
    if (!form.period_name?.trim()) errs.period_name = 'Period name is required.'
    if (!form.month) errs.month = 'Month is required.'
    if (!form.year) errs.year = 'Year is required.'
    return errs
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const errs = validate(addForm)
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    setAddLoading(true)
    try {
      await createKpiPeriod({ ...addForm, month: Number(addForm.month), year: Number(addForm.year) })
      setShowAddModal(false)
      setAddForm(BLANK_FORM)
      fetchPeriods()
    } catch (err) {
      setAddErrors({ api: err.response?.data?.message || 'Failed to create period.' })
    } finally {
      setAddLoading(false)
    }
  }

  const openEdit = (period) => {
    setEditTarget(period)
    setEditForm({ period_name: period.period_name, month: period.month, year: period.year, is_active: !!period.is_active })
    setEditErrors({})
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    const errs = validate(editForm)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    setEditLoading(true)
    try {
      await updateKpiPeriod(editTarget.id, { ...editForm, month: Number(editForm.month), year: Number(editForm.year) })
      setEditTarget(null)
      fetchPeriods()
    } catch (err) {
      setEditErrors({ api: err.response?.data?.message || 'Failed to update period.' })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteKpiPeriod(deleteTarget.id)
      setDeleteTarget(null)
      fetchPeriods()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete period.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const FieldError = ({ msg }) => msg ? <p className="text-error text-label-sm mt-1">{msg}</p> : null

  const FormFields = ({ form, onChange, errors }) => (
    <div className="space-y-4">
      {errors.api && (
        <div className="p-3 bg-error-container text-error rounded-lg text-label-sm">{errors.api}</div>
      )}
      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Period Name</label>
        <input
          type="text"
          placeholder="e.g. Q4 2023"
          value={form.period_name}
          onChange={(e) => onChange({ ...form, period_name: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md bg-surface-container-lowest"
        />
        <FieldError msg={errors.period_name} />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <label className="font-label-sm text-label-sm text-on-surface-variant">Status</label>
        <button
          type="button"
          onClick={() => onChange({ ...form, is_active: !form.is_active })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-outline-variant'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-label-sm font-bold ${form.is_active ? 'text-green-700' : 'text-outline'}`}>
          {form.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Month</label>
          <select
            value={form.month}
            onChange={(e) => onChange({ ...form, month: e.target.value })}
            className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md bg-surface-container-lowest"
          >
            <option value="">— Month —</option>
            {MONTHS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <FieldError msg={errors.month} />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Year</label>
          <input
            type="number"
            placeholder="2024"
            min="2020"
            max="2030"
            value={form.year}
            onChange={(e) => onChange({ ...form, year: e.target.value })}
            className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md bg-surface-container-lowest"
          />
          <FieldError msg={errors.year} />
        </div>
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="p-gutter">
        {/* Header */}
        <section className="mb-stack_lg flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6">
          <div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">KPI Periods</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Manage KPI evaluation periods for bonus calculations.</p>
          </div>
          <button
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container shadow-sm transition-all active:scale-95"
            onClick={() => { setShowAddModal(true); setAddForm(BLANK_FORM); setAddErrors({}) }}
          >
            <span className="material-symbols-outlined">add</span>
            Add KPI Period
          </button>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-stack_md mb-stack_lg">
          <div className="bg-surface border border-outline-variant p-stack_md rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-sm uppercase tracking-wider text-outline">Total Periods</span>
              <span className="p-2 bg-primary-fixed text-primary rounded-lg material-symbols-outlined">calendar_month</span>
            </div>
            <div className="text-headline-lg font-bold">{periods.length}</div>
          </div>
          <div className="bg-surface border border-outline-variant p-stack_md rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-sm uppercase tracking-wider text-outline">Active Period</span>
              <span className="p-2 bg-green-100 text-green-700 rounded-lg material-symbols-outlined">event_available</span>
            </div>
            <div className="text-headline-md font-bold text-green-700">
              {periods.find((p) => p.is_active)?.period_name || 'None'}
            </div>
          </div>
          <div className="relative overflow-hidden bg-primary-container rounded-xl shadow-md p-stack_md text-white flex flex-col justify-center">
            <div className="relative z-10">
              <h4 className="font-headline-md mb-1">KPI Period Management</h4>
              <p className="text-body-md opacity-90">Create and manage evaluation periods for accurate bonus calculations.</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>calendar_month</span>
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
          <div className="p-stack_md border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-body-lg">KPI Period List</span>
              <span className="px-2 py-0.5 bg-surface-container-highest text-label-sm rounded-full">{periods.length} Entries</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-label-sm text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Period Name</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Year</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Spinner /></div>
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      No KPI periods found. Create your first period.
                    </td>
                  </tr>
                ) : (
                  periods.map((period) => (
                    <tr key={period.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4 font-bold text-on-surface">{period.period_name}</td>
                      <td className="px-6 py-4 text-body-md text-on-surface-variant">{MONTHS[period.month] || period.month}</td>
                      <td className="px-6 py-4 text-body-md">{period.year}</td>
                      <td className="px-6 py-4">
                        {period.is_active ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-label-sm rounded-full font-bold uppercase">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface-variant text-label-sm rounded-full uppercase">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-body-md text-outline">
                        {period.created_at ? new Date(period.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-all"
                            onClick={() => openEdit(period)}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="p-2 text-error hover:bg-error-container rounded-lg transition-all"
                            onClick={() => setDeleteTarget(period)}
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
        </section>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Add KPI Period</h3>
            <form onSubmit={handleAdd}>
              <FormFields form={addForm} onChange={setAddForm} errors={addErrors} />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                  {addLoading ? <Spinner /> : null} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Edit KPI Period</h3>
            <form onSubmit={handleEdit}>
              <FormFields form={editForm} onChange={setEditForm} errors={editErrors} />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                  {editLoading ? <Spinner /> : null} Save
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
              <h3 className="font-headline-md text-headline-md">Confirm Delete</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              Delete period <strong>{deleteTarget.period_name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 bg-error text-on-error rounded-lg font-body-md font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                {deleteLoading ? <Spinner /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
