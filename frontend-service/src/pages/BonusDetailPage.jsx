import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getRecapDetail } from '../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.floor(Number(n) || 0))

function Spinner() {
  return (
    <svg className="animate-spin w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function BonusDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await getRecapDetail(id)
        setDetail(res.data?.data || res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load bonus detail.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner />
        </div>
      </Layout>
    )
  }

  if (error || !detail) {
    return (
      <Layout>
        <div className="p-gutter">
          <div className="p-4 bg-error-container text-error rounded-lg">{error || 'Detail not found.'}</div>
          <button onClick={() => navigate('/kpi/recap')} className="mt-4 text-primary hover:underline font-body-md">
            ← Back to Bonus Recap
          </button>
        </div>
      </Layout>
    )
  }

  const name = detail.employee_name || detail.name || 'Unknown'
  const employeeCode = detail.employee_code || '-'
  const position = detail.position_name || 'Salesman'
  const period = detail.period_name || '-'
  const finalScore = Number(detail.final_score || 0)
  const bonusAmount = Number(detail.bonus_amount || 0)

  // KPI Breakdown — gunakan scores yang sudah dihitung dari backend
  const salesScore   = Number(detail.sales_score || 0)
  const transScore   = Number(detail.transaction_score || 0)
  const attendScore  = Number(detail.attendance_score || 0)
  const csatScore    = Number(detail.satisfaction_score || 0)

  const kpiRows = [
    {
      criterion: 'Car Sales',
      description: 'Total volume of vehicle sales',
      icon: 'trending_up',
      iconBg: 'bg-blue-50 text-blue-700',
      weight: 35,
      raw: salesScore.toFixed(1),
      weighted: (salesScore * 0.35).toFixed(1),
    },
    {
      criterion: 'Avg Transaction',
      description: 'Average transaction value per sale',
      icon: 'receipt_long',
      iconBg: 'bg-orange-50 text-orange-700',
      weight: 25,
      raw: transScore.toFixed(1),
      weighted: (transScore * 0.25).toFixed(1),
    },
    {
      criterion: 'Attendance & Discipline',
      description: 'Punctuality and presence during shifts',
      icon: 'event_available',
      iconBg: 'bg-green-50 text-green-700',
      weight: 20,
      raw: attendScore.toFixed(1),
      weighted: (attendScore * 0.20).toFixed(1),
    },
    {
      criterion: 'Customer Satisfaction (CSAT)',
      description: 'Post-purchase feedback scores from clients',
      icon: 'sentiment_very_satisfied',
      iconBg: 'bg-purple-50 text-purple-700',
      weight: 20,
      raw: csatScore.toFixed(1),
      weighted: (csatScore * 0.20).toFixed(1),
    },
  ]

  const scoreLabel = finalScore >= 90 ? 'EXCELLENT' : finalScore >= 70 ? 'GOOD' : 'NEEDS IMPROVEMENT'
  const bonusPct = Math.min(100, (finalScore / 100) * 30)

  return (
    <Layout>
      <div className="p-gutter">
        <div className="flex items-center gap-4 mb-stack_lg pt-6 no-print">
          <button
            onClick={() => navigate('/kpi/recap')}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-md text-headline-md font-bold text-primary">Bonus Detail Report</h2>
          <button
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:opacity-90 transition-all font-label-sm text-label-sm"
            onClick={() => window.print()}
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            PRINT REPORT
          </button>
        </div>

        <div className="max-w-5xl mx-auto space-y-gutter">
          {/* Profile + Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* Profile Card */}
            <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-outline-variant shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="relative flex-shrink-0">
                {detail.photo_url ? (
                  <img
                    src={detail.photo_url}
                    alt={name}
                    className="w-32 h-32 rounded-xl object-cover ring-4 ring-primary-fixed"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-primary-fixed flex items-center justify-center ring-4 ring-primary-fixed/50">
                    <span className="text-primary text-4xl font-bold">
                      {name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">{name}</h3>
                    <p className="text-primary font-bold tracking-widest text-label-sm">
                      {employeeCode} • {position.toUpperCase()}
                    </p>
                  </div>
                  <div className="bg-surface-container px-4 py-2 rounded-lg border border-outline-variant">
                    <p className="text-[10px] text-outline uppercase font-bold">Assessment Period</p>
                    <p className="font-body-md text-body-md text-on-surface">{period}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Sales Units</p>
                    <p className="font-body-md text-body-md font-bold">{detail.sales_unit || 0}</p>
                  </div>
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Avg Transaction</p>
                    <p className="font-body-md text-body-md font-bold">Rp {fmt(detail.avg_transaction || 0)}</p>
                  </div>
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Attendance</p>
                    <p className="font-body-md text-body-md font-bold">{detail.attendance_score || 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Score Badge */}
            <div className="kpi-score-badge text-white rounded-xl p-8 flex flex-col justify-between items-center text-center">
              <p className="font-label-sm text-label-sm uppercase tracking-[0.2em] opacity-80">Final Performance Score</p>
              <div className="my-4">
                <span className="text-[64px] font-extrabold leading-none">{finalScore.toFixed(1)}</span>
                <span className="text-2xl opacity-60">/100</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{ width: `${finalScore}%` }} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <p className="font-headline-md text-headline-md">{scoreLabel}</p>
              </div>
            </div>
          </div>

          {/* KPI Score Breakdown */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                KPI Score Breakdown
              </h4>
              <span className="text-label-sm font-label-sm text-outline">Weightage Total: 100%</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface text-outline font-label-sm text-label-sm uppercase">
                    <th className="px-6 py-4 border-b border-outline-variant">Performance Criterion</th>
                    <th className="px-6 py-4 border-b border-outline-variant text-center">Weight (%)</th>
                    <th className="px-6 py-4 border-b border-outline-variant text-center">Raw Score</th>
                    <th className="px-6 py-4 border-b border-outline-variant text-right">Weighted Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {kpiRows.map((row) => (
                    <tr key={row.criterion} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${row.iconBg}`}>
                            <span className="material-symbols-outlined">{row.icon}</span>
                          </div>
                          <div>
                            <p className="font-body-lg text-body-lg font-bold text-on-surface">{row.criterion}</p>
                            <p className="text-xs text-outline">{row.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-code-md text-code-md">{row.weight}%</td>
                      <td className="px-6 py-5 text-center font-code-md text-code-md">{row.raw} / 100</td>
                      <td className="px-6 py-5 text-right font-body-md text-body-md font-bold text-on-surface">{row.weighted}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-container-low font-bold text-on-surface">
                  <tr>
                    <td className="px-6 py-5 text-right uppercase tracking-wider text-label-sm" colSpan={3}>
                      Total Aggregate Score
                    </td>
                    <td className="px-6 py-5 text-right font-headline-md text-headline-md text-primary">
                      {finalScore.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="md:col-span-1 bg-white p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center">
              <p className="text-label-sm font-label-sm text-outline uppercase mb-2">Base Salary Reference</p>
              <p className="text-headline-lg font-headline-lg text-on-surface">Rp 6.000.000</p>
              <div className="mt-4 p-3 bg-secondary-container/30 rounded border border-secondary-fixed text-on-secondary-container">
                <p className="text-[10px] font-bold">POLICY NOTE:</p>
                <p className="text-xs italic leading-tight">
                  Bonus capped at 30% of base salary for "Excellent" rating.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl border-2 border-primary-fixed shadow-md overflow-hidden flex flex-col md:flex-row">
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-label-sm font-label-sm text-outline uppercase">Bonus Calculation</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h2 className="text-headline-xl font-headline-xl text-primary">{bonusPct.toFixed(1)}%</h2>
                    <span className="text-on-surface-variant text-body-md">Multiplier Applied</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                  </div>
                  <div>
                    <p className="text-xs text-outline uppercase font-bold">Payment Status</p>
                    <p className="font-body-md text-body-md text-green-600 font-bold">READY FOR DISBURSEMENT</p>
                  </div>
                </div>
              </div>
              <div className="bg-primary text-white p-8 flex flex-col justify-center items-end min-w-[240px]">
                <p className="text-label-sm font-label-sm uppercase tracking-widest opacity-80 mb-2">Final Bonus Amount</p>
                <p className="text-[28px] font-extrabold leading-none">Rp {fmt(bonusAmount)}</p>
                <div className="mt-6 border-t border-white/20 pt-4 w-full text-right">
                  <p className="text-[10px] opacity-70">Payout Ref: #BN-{id}</p>
                  <p className="text-[10px] opacity-70">Period: {period}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
