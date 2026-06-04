import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getRecap, getKpiPeriods } from '../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.floor(Number(n) || 0))

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const PAGE_SIZE = 10

export default function BonusRecapPage() {
  const navigate = useNavigate()

  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [recap, setRecap] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await getKpiPeriods()
        const data = Array.isArray(res.data) ? res.data : res.data?.data || []
        setPeriods(data)
      } catch (_) {}
    }
    fetchPeriods()
  }, [])

  const fetchRecap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getRecap(selectedPeriod || undefined)
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setRecap(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bonus recap.')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => { fetchRecap() }, [fetchRecap])

  const filtered = recap.filter((r) => {
    if (!search) return true
    const name = (r.employee_name || r.name || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats
  const totalSalesman = recap.length
  const totalBonus = recap.reduce((s, r) => s + (Number(r.bonus_amount) || 0), 0)
  const avgScore = recap.length ? recap.reduce((s, r) => s + (Number(r.final_score) || 0), 0) / recap.length : 0
  const topPerformer = recap.reduce((best, r) => (!best || (Number(r.bonus_amount) || 0) > (Number(best.bonus_amount) || 0)) ? r : best, null)

  const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const AVATAR_COLORS = ['bg-primary-fixed text-primary', 'bg-secondary-fixed text-secondary', 'bg-tertiary-fixed text-tertiary']

  return (
    <Layout>
      <div className="p-gutter">
        {/* Page Header */}
        <div className="mb-stack_lg flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Rekap Bonus Salesman</h2>
            <p className="text-body-md text-outline">
              Overview of performance-based incentives for the current KPI period.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-outline uppercase mb-1">Period Filter</label>
              <select
                className="bg-surface border border-outline-variant rounded-lg px-4 py-2 text-body-md focus:ring-primary focus:border-primary outline-none"
                value={selectedPeriod}
                onChange={(e) => { setSelectedPeriod(e.target.value); setPage(1) }}
              >
                <option value="">All Periods</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.period_name}</option>
                ))}
              </select>
            </div>
            <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:opacity-90 transition-opacity mt-5">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack_lg">
          {/* Total Salesman */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-5">
              <span className="material-symbols-outlined text-8xl">groups</span>
            </div>
            <p className="text-label-sm text-outline uppercase tracking-wider mb-2">Total Salesman Dinilai</p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl">{totalSalesman}</span>
            </div>
            <p className="text-[10px] text-outline mt-4 italic">Current period</p>
          </div>

          {/* Total Bonus */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-5">
              <span className="material-symbols-outlined text-8xl">payments</span>
            </div>
            <p className="text-label-sm text-outline uppercase tracking-wider mb-2">Total Bonus Periode Ini</p>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-xl text-headline-xl text-primary">Rp {fmt(totalBonus)}</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 mt-4">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>

          {/* Avg Score */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-5">
              <span className="material-symbols-outlined text-8xl">verified</span>
            </div>
            <p className="text-label-sm text-outline uppercase tracking-wider mb-2">Rata-rata Final Score</p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl">{avgScore.toFixed(1)}</span>
              <span className="text-xs text-primary font-bold">/ 100</span>
            </div>
          </div>

          {/* Highest Bonus */}
          <div className="bg-primary-container p-6 rounded-xl shadow-md relative overflow-hidden text-on-primary-container">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-9xl">star</span>
            </div>
            <p className="text-label-sm uppercase tracking-wider mb-2 opacity-80">Bonus Tertinggi</p>
            <div className="flex flex-col">
              <span className="font-headline-xl text-headline-xl">Rp {fmt(topPerformer?.bonus_amount || 0)}</span>
              <span className="font-bold text-sm mt-1">
                {topPerformer?.employee_name || topPerformer?.name || '-'}
              </span>
            </div>
            {topPerformer && (
              <div className="mt-4 flex items-center gap-2">
                <span className="bg-on-primary-container text-primary-container text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Elite Performer
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
        )}

        {/* Table Section */}
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-outline-variant">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-1 focus:ring-primary outline-none"
                placeholder="Filter by name..."
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low px-3 py-2 rounded-lg transition-colors border border-outline-variant">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                <span className="font-label-sm text-label-sm">Filters</span>
              </button>
              <button className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low px-3 py-2 rounded-lg transition-colors border border-outline-variant">
                <span className="material-symbols-outlined text-[20px]">sort</span>
                <span className="font-label-sm text-label-sm">Sort</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Nama Salesman', 'Periode', 'Penjualan', 'Avg TRX', 'Presensi', 'Final Score', 'Bonus %', 'Nominal Bonus', 'Action'].map((h) => (
                    <th key={h} className={`px-6 py-4 text-label-sm text-outline uppercase font-bold tracking-wider ${h === 'Final Score' ? 'text-center' : ''} ${h === 'Action' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Spinner /></div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      No bonus data available for this period.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, idx) => {
                    const name = r.employee_name || r.name || 'Unknown'
                    const score = Number(r.final_score || 0)
                    const attendPct = Number(r.attendance_score || 0)
                    return (
                      <tr key={r.id || idx} className="hover:bg-surface-container transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {getInitials(name)}
                            </div>
                            <div>
                              <p className="font-bold text-body-md">{name}</p>
                              <p className="text-[10px] text-outline">{r.position_name || 'Salesman'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-md">{r.period_name || '-'}</td>
                        <td className="px-6 py-4 text-body-md font-semibold">{r.sales_unit || 0} units</td>
                        <td className="px-6 py-4 text-body-md">Rp {fmt(r.avg_transaction || 0)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${attendPct >= 90 ? 'text-green-600 bg-green-50' : 'text-error bg-error-container'}`}>
                            {attendPct}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-headline-md text-headline-md text-primary">{score.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-body-md">{r.bonus_percentage || '-'}</td>
                        <td className="px-6 py-4 text-body-md font-bold text-on-surface">
                          Rp {fmt(r.bonus_amount || 0)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            className="text-primary hover:underline font-bold text-label-sm flex items-center justify-end gap-1 ml-auto"
                            onClick={() => navigate(`/kpi/recap/${r.id}`)}
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                            Detail
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-outline-variant flex items-center justify-between">
            <span className="text-body-md text-outline">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded hover:bg-surface-container-low text-outline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded font-bold text-xs transition-colors ${p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low text-on-surface'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="p-2 rounded hover:bg-surface-container-low text-on-surface disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Weighting + Top Performer */}
        <div className="mt-stack_lg grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 p-6 rounded-xl flex flex-col justify-center bg-white border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-body-lg">KPI Weighting Breakdown</h3>
              <span className="material-symbols-outlined text-outline">info</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Jumlah Penjualan (35%)', pct: 88, status: 'Target Reached', statusClass: 'font-bold' },
                { label: 'Rata-rata Transaksi (25%)', pct: 72, status: 'On Track', statusClass: 'font-bold text-primary' },
                { label: 'Presensi & Kedisiplinan (20%)', pct: 65, status: 'Critical', statusClass: 'font-bold text-error' },
                { label: 'Kepuasan Pelanggan (20%)', pct: 91, status: 'Over Target', statusClass: 'font-bold text-primary' },
              ].map(({ label, pct, status, statusClass }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{label}</span>
                    <span className={statusClass}>{status}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct < 70 ? 'bg-error' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-outline-variant p-6 rounded-xl flex flex-col items-center text-center">
            <span
              className="material-symbols-outlined text-5xl text-primary mb-4"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <h4 className="font-bold text-headline-md">Top Team Performer</h4>
            <p className="text-body-md text-outline mb-6">
              {topPerformer
                ? `${topPerformer.employee_name || topPerformer.name} achieved the highest bonus this period.`
                : 'Complete assessments to see top performers.'}
            </p>
            <button
              className="mt-2 text-primary font-bold text-label-sm border-b-2 border-primary hover:border-transparent transition-all"
              onClick={() => navigate('/kpi/assessments/create')}
            >
              Add Assessment
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
