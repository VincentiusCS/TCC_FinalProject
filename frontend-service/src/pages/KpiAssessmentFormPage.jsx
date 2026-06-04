import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getEmployees, getKpiPeriods, createAssessment } from '../services/api'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const MAX_BONUS = 2000000
const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.floor(n))

export default function KpiAssessmentFormPage() {
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [periods, setPeriods] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [form, setForm] = useState({
    employee_id: '',
    period_id: '',
    sales_unit: '',
    avg_transaction: '',
    attendance_score: '',
    csat_score: '5',
  })

  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const [empRes, periodRes] = await Promise.allSettled([getEmployees(), getKpiPeriods()])
        const emps = empRes.status === 'fulfilled' ? (Array.isArray(empRes.value.data) ? empRes.value.data : empRes.value.data?.data || []) : []
        const prds = periodRes.status === 'fulfilled' ? (Array.isArray(periodRes.value.data) ? periodRes.value.data : periodRes.value.data?.data || []) : []
        setEmployees(emps)
        setPeriods(prds)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setResult(null)
  }

  const calculateKPI = () => {
    const sales = parseFloat(form.sales_unit) || 0
    const trans = parseFloat(form.avg_transaction) || 0
    const attend = parseFloat(form.attendance_score) || 0
    const csat = parseFloat(form.csat_score) || 0

    const salesScore = Math.min(100, (sales / 10) * 100)
    const transScore = Math.min(100, (trans / 15000000) * 100)
    const attendScore = Math.min(100, attend)
    const csatScore = (csat / 5) * 100

    const wSales = salesScore * 0.35
    const wTrans = transScore * 0.25
    const wAttend = attendScore * 0.20
    const wCsat = csatScore * 0.20

    const total = wSales + wTrans + wAttend + wCsat
    const bonus = Math.max(0, Math.min(MAX_BONUS, (total / 100) * MAX_BONUS))
    const bonusPct = (bonus / MAX_BONUS) * 100

    let label = 'Needs Improvement'
    let labelClass = 'text-error'
    if (total >= 90) { label = 'Exceptional Performance'; labelClass = 'text-primary font-bold' }
    else if (total >= 70) { label = 'Target Achieved'; labelClass = 'text-on-surface font-bold' }

    setResult({ total, wSales, wTrans, wAttend, wCsat, bonus, bonusPct, label, labelClass })
  }

  const handleReset = () => {
    setForm({ employee_id: '', period_id: '', sales_unit: '', avg_transaction: '', attendance_score: '', csat_score: '5' })
    setResult(null)
    setSaveError('')
    setSaveSuccess('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')

    if (!form.employee_id || !form.period_id) {
      setSaveError('Please select a salesman and KPI period.')
      return
    }

    setSaving(true)
    try {
      await createAssessment({
        employee_id: form.employee_id,
        period_id: form.period_id,
        sales_unit: Number(form.sales_unit) || 0,
        avg_transaction: Number(form.avg_transaction) || 0,
        attendance_score: Number(form.attendance_score) || 0,
        csat_score: Number(form.csat_score) || 0,
      })
      setSaveSuccess('KPI Assessment saved successfully!')
      setTimeout(() => navigate('/kpi/recap'), 1500)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save KPI assessment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="p-gutter">
        <div className="mb-stack_lg pt-6">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Input Penilaian KPI</h3>
          <p className="text-on-surface-variant font-body-md">Evaluate monthly salesman performance metrics to calculate bonuses.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack_lg">
          {/* Form Section */}
          <div className="lg:col-span-8 flex flex-col gap-stack_lg">
            <section className="bg-white p-8 rounded-xl border border-outline-variant shadow-sm">

              {saveError && (
                <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span className="font-body-md text-body-md">{saveError}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="font-body-md text-body-md">{saveSuccess}</span>
                </div>
              )}

              <form className="space-y-8" onSubmit={handleSave}>
                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack_md">
                  <div className="space-y-2">
                    <label className="font-label-sm text-on-surface-variant block">Salesman</label>
                    <select
                      name="employee_id"
                      value={form.employee_id}
                      onChange={handleChange}
                      className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:border-primary focus:ring-0 outline-none"
                      disabled={loadingData}
                    >
                      <option value="">Select Salesman</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-sm text-on-surface-variant block">KPI Period</label>
                    <select
                      name="period_id"
                      value={form.period_id}
                      onChange={handleChange}
                      className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:border-primary focus:ring-0 outline-none"
                      disabled={loadingData}
                    >
                      <option value="">Select Period</option>
                      {periods.map((p) => (
                        <option key={p.id} value={p.id}>{p.period_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <hr className="border-outline-variant" />

                {/* Metric Inputs */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Car Sales */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">directions_car</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-bold">Car Sales</p>
                        <p className="text-on-surface-variant font-label-sm">Weight: 35%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        name="sales_unit"
                        type="number"
                        placeholder="0"
                        min="0"
                        value={form.sales_unit}
                        onChange={handleChange}
                        className="w-32 p-2 border border-outline-variant rounded-lg text-right font-body-md focus:border-primary focus:ring-0 outline-none"
                      />
                      <span className="text-on-surface-variant font-body-md">Units</span>
                    </div>
                  </div>

                  {/* Average Transaction */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-bold">Average Transaction</p>
                        <p className="text-on-surface-variant font-label-sm">Weight: 25%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        name="avg_transaction"
                        type="number"
                        placeholder="0"
                        min="0"
                        value={form.avg_transaction}
                        onChange={handleChange}
                        className="w-48 p-2 border border-outline-variant rounded-lg text-right font-body-md focus:border-primary focus:ring-0 outline-none"
                      />
                      <span className="text-on-surface-variant font-body-md">Rp</span>
                    </div>
                  </div>

                  {/* Attendance */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined">event_available</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-bold">Attendance</p>
                        <p className="text-on-surface-variant font-label-sm">Weight: 20%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        name="attendance_score"
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        value={form.attendance_score}
                        onChange={handleChange}
                        className="w-32 p-2 border border-outline-variant rounded-lg text-right font-body-md focus:border-primary focus:ring-0 outline-none"
                      />
                      <span className="text-on-surface-variant font-body-md">%</span>
                    </div>
                  </div>

                  {/* Customer Satisfaction */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-surface-dim flex items-center justify-center text-on-surface">
                        <span className="material-symbols-outlined">sentiment_satisfied</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-bold">Customer Satisfaction</p>
                        <p className="text-on-surface-variant font-label-sm">Weight: 20%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        name="csat_score"
                        value={form.csat_score}
                        onChange={handleChange}
                        className="w-48 p-2 border border-outline-variant rounded-lg font-body-md focus:border-primary focus:ring-0 outline-none"
                      >
                        <option value="1">1 - Very Dissatisfied</option>
                        <option value="2">2 - Dissatisfied</option>
                        <option value="3">3 - Neutral</option>
                        <option value="4">4 - Satisfied</option>
                        <option value="5">5 - Excellent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <button
                    type="button"
                    onClick={calculateKPI}
                    className="bg-primary text-on-primary px-8 py-3 rounded-lg font-body-md font-bold hover:opacity-90 active:opacity-80 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">calculate</span>
                    Calculate Score &amp; Bonus
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-white border border-primary text-primary px-8 py-3 rounded-lg font-body-md font-bold hover:bg-surface-container-low transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {saving ? <Spinner /> : null}
                    Save KPI
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-on-surface-variant px-6 py-3 rounded-lg font-body-md hover:bg-surface-container-high transition-all"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </section>

            {/* Policy Note */}
            <div className="bg-primary-container text-on-primary-container p-6 rounded-xl flex items-start gap-4">
              <span className="material-symbols-outlined text-on-primary-container">info</span>
              <div className="space-y-1">
                <p className="font-body-lg font-bold">Policy Reminder</p>
                <p className="text-body-md opacity-90">
                  Bonuses are calculated based on a weighted average of performance scores. The maximum allowable
                  bonus is capped at Rp 2,000,000 per period.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live Result Panel */}
          <div className="lg:col-span-4 space-y-stack_lg">
            <div className="sticky top-24">
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="bg-surface-container-high p-4 border-b border-outline-variant">
                  <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined">analytics</span>
                    Live Result Card
                  </h4>
                </div>
                <div className="p-6 space-y-6">
                  {/* Overall Score */}
                  <div className="text-center py-4">
                    <p className="text-on-surface-variant font-label-sm uppercase tracking-widest">Calculated KPI Score</p>
                    <div className="text-6xl font-bold text-primary py-2">
                      {result ? result.total.toFixed(1) : '0.0'}
                    </div>
                    <div className={`font-body-md italic py-1 ${result ? result.labelClass : 'text-on-surface-variant'}`}>
                      {result ? result.label : '— Waiting for calculation —'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="font-label-sm text-on-surface-variant">Bonus Threshold (Rp 2M Max)</span>
                      <span className="font-body-md font-bold">
                        {result ? `${Math.round(result.bonusPct)}%` : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-700 ease-out"
                        style={{ width: result ? `${result.bonusPct}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Final Bonus */}
                  <div className="bg-surface-container-lowest p-6 rounded-xl border-2 border-dashed border-primary flex flex-col items-center gap-2">
                    <p className="font-label-sm text-on-surface-variant">Final Bonus Payout</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-body-md font-bold text-on-surface-variant">Rp</span>
                      <span className="text-3xl font-bold text-on-surface">
                        {result ? fmt(result.bonus) : '0'}
                      </span>
                    </div>
                  </div>

                  {/* Weight Breakdown */}
                  <div className="space-y-3">
                    <p className="font-label-sm text-on-surface-variant border-b border-outline-variant pb-2">
                      Weight Contribution
                    </p>
                    {[
                      { label: 'Sales (35%)', val: result?.wSales },
                      { label: 'Trans (25%)', val: result?.wTrans },
                      { label: 'Attend (20%)', val: result?.wAttend },
                      { label: 'CSAT (20%)', val: result?.wCsat },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between text-body-md">
                        <span className="text-on-surface-variant">{label}</span>
                        <span className="font-bold">{val !== undefined ? val.toFixed(1) : '0.0'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
