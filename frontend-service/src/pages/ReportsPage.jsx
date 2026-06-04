import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { getReports, generateReport, downloadReport, getKpiPeriods } from '../services/api'

function Spinner({ size = 5 }) {
  return (
    <svg className={`animate-spin w-${size} h-${size} text-primary`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const PAGE_SIZE = 10

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false)
  const [genPeriod, setGenPeriod] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState('')

  // Download state
  const [downloadingId, setDownloadingId] = useState(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getReports()
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setReports(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
    const fetchPeriods = async () => {
      try {
        const res = await getKpiPeriods()
        const data = Array.isArray(res.data) ? res.data : res.data?.data || []
        setPeriods(data)
      } catch (_) {}
    }
    fetchPeriods()
  }, [fetchReports])

  const handleGenerate = async () => {
    setGenerating(true)
    setGenProgress(0)
    setGenError('')

    // Animate progress
    const interval = setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= 85) { clearInterval(interval); return prev }
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 300)

    try {
      await generateReport(genPeriod || undefined)
      clearInterval(interval)
      setGenProgress(100)
      setTimeout(() => {
        setShowGenModal(false)
        setGenProgress(0)
        setGenerating(false)
        fetchReports()
      }, 800)
    } catch (err) {
      clearInterval(interval)
      setGenError(err.response?.data?.message || 'Failed to generate report.')
      setGenerating(false)
      setGenProgress(0)
    }
  }

  const handleDownload = async (report) => {
    setDownloadingId(report.id)
    try {
      const res = await downloadReport(report.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', report.file_name || `report_${report.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (_) {
      alert('Failed to download report.')
    } finally {
      setDownloadingId(null)
    }
  }

  const totalPages = Math.ceil(reports.length / PAGE_SIZE)
  const paginated = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Layout>
      <div className="p-gutter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pt-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined text-sm">folder_open</span>
              <span className="text-[12px] uppercase tracking-widest">Analytics &amp; Reporting</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">Laporan PDF Rekap Bonus</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Sistem otomatisasi penarikan data rekapitulasi bonus karyawan untuk keperluan audit dan distribusi dokumen formal.
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary-container active:scale-95 transition-all duration-200"
            onClick={() => { setShowGenModal(true); setGenPeriod(''); setGenError('') }}
          >
            <span className="material-symbols-outlined">picture_as_pdf</span>
            <span className="font-bold">Generate Laporan PDF</span>
          </button>
        </div>

        {/* Info Note */}
        <div className="mb-8 flex items-start gap-4 p-4 bg-surface-container-low border-l-4 border-primary rounded-r-lg shadow-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            cloud_done
          </span>
          <div>
            <p className="font-body-md text-body-md font-bold text-on-surface">Penyimpanan Terpusat</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Semua file laporan yang telah di-generate akan disimpan secara aman di{' '}
              <strong>Cloud Storage</strong> perusahaan selama 24 bulan sebelum pengarsipan otomatis.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
        )}

        {/* Reports Table */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined">history</span>
              Riwayat Laporan
            </h3>
            <div className="flex items-center gap-2">
              <button className="p-2 text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 text-outline hover:text-primary transition-colors" onClick={fetchReports}>
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant">
                  {['Nama Laporan', 'Periode', 'Dibuat Oleh', 'Tanggal Generate', 'Aksi'].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider border-b border-outline-variant ${h === 'Aksi' ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex justify-center"><Spinner size={8} /></div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      No reports found. Generate your first report.
                    </td>
                  </tr>
                ) : (
                  paginated.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-container-low transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-error-container text-error rounded">
                            <span className="material-symbols-outlined text-xl">description</span>
                          </div>
                          <div>
                            <p className="font-body-md text-body-md font-bold text-on-surface">
                              {report.file_name || report.report_name || `Report_${report.id}.pdf`}
                            </p>
                            <p className="text-[11px] text-outline">PDF Document</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-surface-container-high rounded text-xs font-bold text-on-surface-variant">
                          {report.period_name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold">
                            {(report.created_by || 'A').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-body-md text-body-md">{report.created_by || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-body-md">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-primary border border-primary rounded-lg hover:bg-primary-fixed transition-all disabled:opacity-50"
                          onClick={() => handleDownload(report)}
                          disabled={downloadingId === report.id}
                        >
                          {downloadingId === report.id ? (
                            <Spinner size={4} />
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          )}
                          <span className="font-label-sm text-label-sm">Download</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-surface border-t border-outline-variant flex items-center justify-between">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Showing {reports.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, reports.length)} of {reports.length} entries
            </span>
            <div className="flex gap-2">
              <button
                className="p-2 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-30"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`w-10 h-10 rounded font-bold transition-colors ${p === page ? 'bg-primary text-white' : 'border border-outline-variant hover:bg-surface-container-low font-bold'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="p-2 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-30"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: 'security',
              title: 'Keamanan Dokumen',
              desc: 'Setiap laporan yang dihasilkan dilengkapi dengan watermark digital dan enkripsi AES-256 untuk perlindungan data sensitif.',
              bg: 'bg-primary-fixed-dim/30 text-primary',
            },
            {
              icon: 'cloud_sync',
              title: 'Cloud Synced',
              desc: 'Sinkronisasi otomatis ke infrastruktur cloud memungkinkan akses laporan dari berbagai departemen yang memiliki otoritas.',
              bg: 'bg-tertiary-fixed/30 text-tertiary',
            },
            {
              icon: 'print',
              title: 'Print Ready',
              desc: 'Format layout PDF dioptimalkan untuk standar kertas A4 perkantoran, lengkap dengan header dan footer legalitas perusahaan.',
              bg: 'bg-secondary-fixed/30 text-secondary',
            },
          ].map(({ icon, title, desc, bg }) => (
            <div key={title} className="p-6 bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              </div>
              <h4 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            {!generating ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-fixed rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">picture_as_pdf</span>
                </div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">Generate Laporan PDF</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Select a KPI period to generate the bonus recap PDF report.
                </p>
                <select
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md mb-4 bg-surface-container-lowest"
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                >
                  <option value="">All Periods</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.period_name}</option>
                  ))}
                </select>
                {genError && (
                  <div className="mb-4 p-3 bg-error-container text-error rounded-lg text-label-sm text-left">
                    {genError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2.5 border border-outline-variant rounded-lg font-body-md hover:bg-surface-container transition-colors"
                    onClick={() => setShowGenModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2"
                    onClick={handleGenerate}
                  >
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Generate
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-primary text-3xl">
                    picture_as_pdf
                  </span>
                </div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">Generating Laporan</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Sistem sedang menarik data dari database dan merangkainya menjadi dokumen PDF...
                </p>
                <div className="w-full bg-surface-container rounded-full h-1.5 mb-2">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${genProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-primary font-bold uppercase tracking-widest">
                  Proses {genProgress}%
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
