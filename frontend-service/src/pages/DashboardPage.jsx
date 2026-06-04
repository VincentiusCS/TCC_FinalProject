import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getEmployees, getKpiPeriods, getRecap, getReports } from '../services/api'

const fmt = (num) => new Intl.NumberFormat('id-ID').format(num)

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    employeeCount: 0,
    activePeriod: null,
    totalBonus: 0,
    reportCount: 0,
  })
  const [topPerformers, setTopPerformers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [empRes, periodsRes, recapRes, reportsRes] = await Promise.allSettled([
          getEmployees(),
          getKpiPeriods(),
          getRecap(),
          getReports(),
        ])

        const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
        const periods = periodsRes.status === 'fulfilled' ? periodsRes.value.data : []
        const recap = recapRes.status === 'fulfilled' ? recapRes.value.data : []
        const reports = reportsRes.status === 'fulfilled' ? reportsRes.value.data : []

        const empArray = Array.isArray(employees) ? employees : employees.data || []
        const periodsArray = Array.isArray(periods) ? periods : periods.data || []
        const recapArray = Array.isArray(recap) ? recap : recap.data || []
        const reportsArray = Array.isArray(reports) ? reports : reports.data || []

        const activePeriod = periodsArray.find((p) => p.is_active) || periodsArray[0]
        const totalBonus = recapArray.reduce((sum, r) => sum + (Number(r.bonus_amount) || 0), 0)

        // Top 3 performers sorted by final_score desc
        const sorted = [...recapArray]
          .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
          .slice(0, 3)

        setStats({
          employeeCount: empArray.length,
          activePeriod,
          totalBonus,
          reportCount: reportsArray.length,
        })
        setTopPerformers(sorted)
      } catch (_) {
        // fail silently, keep defaults
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const getInitials = (name = '') =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()

  const getBadgeColors = [
    'bg-primary-fixed text-primary',
    'bg-secondary-container text-secondary',
    'bg-tertiary-fixed text-tertiary',
  ]

  const getStatusBadge = (score) => {
    if (score >= 90) return <span className="bg-green-100 text-green-700 text-label-sm px-3 py-1 rounded-full uppercase">Exceptional</span>
    if (score >= 70) return <span className="bg-blue-100 text-blue-700 text-label-sm px-3 py-1 rounded-full uppercase">On Target</span>
    return <span className="bg-yellow-100 text-yellow-700 text-label-sm px-3 py-1 rounded-full uppercase">Needs Work</span>
  }

  return (
    <Layout>
      <div className="p-gutter space-y-stack_lg">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Dashboard Overview</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Welcome back. Performance metrics are tracking well this quarter.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="bg-surface border border-outline px-4 py-2 rounded-lg text-primary font-bold text-body-md hover:bg-surface-container transition-colors flex items-center gap-2"
              onClick={() => navigate('/reports')}
            >
              <span className="material-symbols-outlined">download</span>
              Export Summary
            </button>
            <button
              className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-body-md hover:bg-primary-container transition-colors flex items-center gap-2"
              onClick={() => navigate('/kpi/periods')}
            >
              <span className="material-symbols-outlined">add</span>
              New KPI Period
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Total Employees */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-primary-fixed text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="text-label-sm px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
            </div>
            <p className="text-on-surface-variant font-body-md">Total Active Employees</p>
            <h3 className="text-headline-xl font-headline-xl text-primary mt-1">
              {loading ? <Spinner /> : stats.employeeCount}
            </h3>
          </div>

          {/* Active KPI Period */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-tertiary-fixed text-tertiary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">event_available</span>
              </div>
              <span className="text-label-sm px-2 py-1 bg-surface-container-high text-on-surface-variant rounded-full">
                Ongoing
              </span>
            </div>
            <p className="text-on-surface-variant font-body-md">Active KPI Period</p>
            <h3 className="text-headline-xl font-headline-xl text-on-surface mt-1">
              {loading ? (
                <Spinner />
              ) : stats.activePeriod ? (
                stats.activePeriod.period_name || `${stats.activePeriod.month}/${stats.activePeriod.year}`
              ) : (
                'None'
              )}
            </h3>
          </div>

          {/* Total Bonuses */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-secondary-container text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-label-sm px-2 py-1 bg-green-100 text-green-700 rounded-full">Total</span>
            </div>
            <p className="text-on-surface-variant font-body-md">Total Bonuses This Period</p>
            <h3 className="text-headline-xl font-headline-xl text-on-surface mt-1">
              {loading ? <Spinner /> : `Rp ${fmt(stats.totalBonus)}`}
            </h3>
          </div>

          {/* Total PDF Reports */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-surface-container-high text-on-surface group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <span className="text-label-sm px-2 py-1 bg-primary-fixed text-primary rounded-full">Reports</span>
            </div>
            <p className="text-on-surface-variant font-body-md">Total PDF Reports</p>
            <h3 className="text-headline-xl font-headline-xl text-on-surface mt-1">
              {loading ? <Spinner /> : stats.reportCount}
            </h3>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {/* Line Chart: KPI Score Trend */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-headline-md text-headline-md text-on-surface">KPI Score Trend</h4>
              <select className="bg-surface-container-low border-none text-label-sm rounded-lg focus:ring-1 focus:ring-primary">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="relative h-64 w-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00288e" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#00288e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,120 Q50,110 100,80 T200,60 T300,40 T400,20"
                    fill="none"
                    stroke="#00288e"
                    strokeWidth="3"
                  />
                  <path
                    d="M0,120 Q50,110 100,80 T200,60 T300,40 T400,20 L400,150 L0,150 Z"
                    fill="url(#lineGrad)"
                  />
                  <circle cx="100" cy="80" fill="#00288e" r="4" />
                  <circle cx="200" cy="60" fill="#00288e" r="4" />
                  <circle cx="300" cy="40" fill="#00288e" r="4" />
                  <circle cx="400" cy="20" fill="#00288e" r="4" />
                </svg>
              </div>
              <div className="absolute bottom-0 w-full flex justify-between text-label-sm text-on-surface-variant">
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Bonus Distribution */}
          <div className="bg-surface-container-lowest p-stack_lg rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-headline-md text-headline-md text-on-surface">Bonus Distribution (M)</h4>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">more_vert</span>
            </div>
            <div className="flex items-end justify-between h-48 gap-2 pt-4">
              {[45, 60, 85, 70, 95, 100].map((h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-t-lg transition-all cursor-pointer ${
                    i === 5 ? 'bg-primary hover:bg-primary-container' : 'bg-primary/20 hover:bg-primary'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="w-full flex justify-between pt-4 text-label-sm text-on-surface-variant">
              <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
            </div>
          </div>
        </div>

        {/* Top Performers Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-gutter flex items-center justify-between border-b border-outline-variant">
            <h4 className="font-headline-md text-headline-md text-on-surface">Top Performers</h4>
            <button
              className="text-primary font-bold text-body-md hover:underline"
              onClick={() => navigate('/kpi/recap')}
            >
              View All Employees
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Name', 'Sales', 'Final Score', 'Bonus', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-gutter py-4 font-bold text-label-sm text-on-surface-variant uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-gutter py-8 text-center">
                      <div className="flex justify-center"><Spinner /></div>
                    </td>
                  </tr>
                ) : topPerformers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-gutter py-8 text-center text-on-surface-variant font-body-md">
                      No performance data available.
                    </td>
                  </tr>
                ) : (
                  topPerformers.map((performer, idx) => {
                    const name = performer.employee_name || performer.name || 'Unknown'
                    const score = Number(performer.final_score || 0).toFixed(2)
                    const bonus = performer.bonus_amount || 0
                    const sales = performer.sales_unit || '-'
                    return (
                      <tr
                        key={performer.id || idx}
                        className="hover:bg-surface-container-lowest transition-colors cursor-pointer group"
                        onClick={() => performer.id && navigate(`/kpi/recap/${performer.id}`)}
                      >
                        <td className="px-gutter py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${getBadgeColors[idx]} flex items-center justify-center font-bold text-xs`}>
                              {getInitials(name)}
                            </div>
                            <span className="font-body-md text-body-md font-bold">{name}</span>
                          </div>
                        </td>
                        <td className="px-gutter py-4 text-body-md">{sales} units</td>
                        <td className="px-gutter py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 w-16 bg-surface-container-high rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-body-md font-bold text-primary">{score}</span>
                          </div>
                        </td>
                        <td className="px-gutter py-4 text-body-md font-bold">
                          Rp {fmt(bonus)}
                        </td>
                        <td className="px-gutter py-4">{getStatusBadge(Number(score))}</td>
                        <td className="px-gutter py-4 text-right">
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-container">
                            <span className="material-symbols-outlined text-primary">visibility</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
