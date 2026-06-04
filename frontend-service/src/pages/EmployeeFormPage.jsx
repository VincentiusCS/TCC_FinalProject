import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getEmployee, createEmployee, updateEmployee, getPositions } from '../services/api'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const INITIAL_FORM = {
  employee_code: '',
  name: '',
  email: '',
  phone: '',
  position_id: '',
  status: 'active',
  photo_url: '',
}

export default function EmployeeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(INITIAL_FORM)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await getPositions()
        const data = Array.isArray(res.data) ? res.data : res.data?.data || []
        setPositions(data)
      } catch (_) {}
    }
    fetchPositions()
  }, [])

  useEffect(() => {
    if (!isEdit) return
    const fetchEmployee = async () => {
      setFetching(true)
      try {
        const res = await getEmployee(id)
        const emp = res.data?.data || res.data
        setForm({
          employee_code: emp.employee_code || '',
          name: emp.name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          position_id: emp.position_id || emp.position?.id || '',
          status: emp.is_active !== undefined ? (emp.is_active ? 'active' : 'inactive') : (emp.status || 'active'),
          photo_url: emp.photo_url || '',
        })
      } catch (err) {
        setApiError(err.response?.data?.message || 'Failed to load employee data.')
      } finally {
        setFetching(false)
      }
    }
    fetchEmployee()
  }, [id, isEdit])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    if (!form.employee_code.trim()) errs.employee_code = 'Employee code is required.'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      const payload = { ...form, is_active: form.status === 'active' ? 1 : 0 }
      if (isEdit) {
        await updateEmployee(id, payload)
      } else {
        await createEmployee(payload)
      }
      navigate('/employees')
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        setErrors(data.errors)
      } else {
        setApiError(data?.message || 'Failed to save employee.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-gutter">
        {/* Header */}
        <div className="flex items-center gap-4 mb-stack_lg pt-6">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              {isEdit ? 'Edit Employee' : 'Add New Employee'}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isEdit ? 'Update employee information.' : 'Fill in the details for the new employee.'}
            </p>
          </div>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-body-md text-body-md">{apiError}</span>
          </div>
        )}

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-outline-variant shadow-sm p-8 space-y-6">
            {/* Employee Code */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="employee_code">
                Employee Code <span className="text-error">*</span>
              </label>
              <input
                id="employee_code"
                name="employee_code"
                type="text"
                placeholder="e.g. SLM001"
                value={form.employee_code}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-1 outline-none transition-all font-body-md text-body-md bg-surface-container-lowest ${
                  errors.employee_code ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'
                }`}
              />
              {errors.employee_code && <p className="text-error text-label-sm">{errors.employee_code}</p>}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="name">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Andi Pratama"
                value={form.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-1 outline-none transition-all font-body-md text-body-md bg-surface-container-lowest ${
                  errors.name ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'
                }`}
              />
              {errors.name && <p className="text-error text-label-sm">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="email">
                Email Address <span className="text-error">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-1 outline-none transition-all font-body-md text-body-md bg-surface-container-lowest ${
                  errors.email ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'
                }`}
              />
              {errors.email && <p className="text-error text-label-sm">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                placeholder="+62 812-3456-7890"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
              />
            </div>

            {/* Position */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="position_id">
                Position
              </label>
              <select
                id="position_id"
                name="position_id"
                value={form.position_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
              >
                <option value="">— Select Position —</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Photo URL */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="photo_url">
                Photo URL (optional)
              </label>
              <input
                id="photo_url"
                name="photo_url"
                type="text"
                placeholder="https://..."
                value={form.photo_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="px-6 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? <Spinner /> : null}
                {isEdit ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
