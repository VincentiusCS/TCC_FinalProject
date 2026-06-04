import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getEmployee, uploadPhoto } from '../services/api'

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function EmployeeDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef(null)

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true)
      try {
        const res = await getEmployee(id)
        setEmployee(res.data?.data || res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load employee.')
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [id])

  const handleFileSelect = (e) => {
    setFileError('')
    setUploadSuccess('')
    const file = e.target.files[0]
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setFileError('Only JPG/PNG files are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File size must be under 2MB.')
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setFileError('')
    try {
      const res = await uploadPhoto(id, selectedFile)
      const updated = res.data?.data || res.data
      setEmployee((prev) => ({ ...prev, photo_url: updated?.photo_url || prev?.photo_url }))
      setUploadSuccess('Photo uploaded successfully!')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setFileError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner />
        </div>
      </Layout>
    )
  }

  if (error || !employee) {
    return (
      <Layout>
        <div className="p-gutter">
          <div className="p-4 bg-error-container text-error rounded-lg">{error || 'Employee not found.'}</div>
          <button onClick={() => navigate('/employees')} className="mt-4 text-primary hover:underline font-body-md">
            ← Back to Employees
          </button>
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
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Employee Detail</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">View and manage employee information.</p>
          </div>
          <button
            onClick={() => navigate(`/employees/${id}/edit`)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit
          </button>
        </div>

        <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Profile Card */}
          <div className="lg:col-span-2 bg-surface rounded-xl border border-outline-variant shadow-sm p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Photo */}
              <div className="relative flex-shrink-0">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.name}
                    className="w-32 h-32 rounded-xl object-cover ring-4 ring-primary-fixed"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-primary-fixed flex items-center justify-center ring-4 ring-primary-fixed/50">
                    <span className="text-primary text-4xl font-bold">
                      {(employee.name || 'U').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-2 -right-2 p-1 rounded-full border-2 border-white ${employee.status?.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}>
                  <span className="material-symbols-outlined text-white text-[16px]">verified</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">{employee.name}</h3>
                <p className="text-primary font-bold tracking-widest text-label-sm mt-1">
                  {employee.employee_code} • {employee.position_name || employee.position?.position_name || 'N/A'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Email</p>
                    <p className="font-body-md text-body-md font-bold truncate">{employee.email}</p>
                  </div>
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Phone</p>
                    <p className="font-body-md text-body-md font-bold">{employee.phone || '-'}</p>
                  </div>
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Status</p>
                    <p className={`font-body-md text-body-md font-bold ${employee.status?.toLowerCase() === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                      {employee.status || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded border border-outline-variant/30">
                    <p className="text-[10px] text-outline uppercase">Joined</p>
                    <p className="font-body-md text-body-md font-bold">
                      {employee.created_at ? new Date(employee.created_at).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Upload Card */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-4">
            <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">photo_camera</span>
              Update Photo
            </h4>

            {uploadSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="font-body-md text-body-md">{uploadSuccess}</span>
              </div>
            )}

            <div
              className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-3xl">image</span>
                  <p className="font-body-md text-body-md text-on-surface font-bold truncate max-w-full">
                    {selectedFile.name}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">upload_file</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Click to select photo
                  </p>
                  <p className="text-label-sm text-outline">JPG or PNG, max 2MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileSelect}
            />

            {fileError && (
              <p className="text-error text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {fileError}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-body-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <Spinner /> : <span className="material-symbols-outlined text-[18px]">upload</span>}
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
