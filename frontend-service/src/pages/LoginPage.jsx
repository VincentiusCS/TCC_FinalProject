import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { dispatch } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      const { token, user } = res.data.data
      localStorage.setItem('token', token)
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      }
      dispatch({ type: 'LOGIN', payload: { token, user } })
      navigate('/')
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Invalid email or password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full">
      {/* Left: Login Form */}
      <section className="w-full lg:w-[450px] xl:w-[500px] flex flex-col justify-center px-gutter md:px-12 lg:px-16 bg-white z-10 relative">
        <div className="mb-stack_lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded-lg">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                insights
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">SalesPulse ERP</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Field Operations &amp; Performance Management
          </p>
        </div>

        <div className="mt-8">
          <h2 className="font-headline-lg text-headline-lg mb-2">Welcome Back</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-stack_lg">
            Please enter your credentials to access the admin portal.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-error rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="font-body-md text-body-md">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label
                className="font-label-sm text-label-sm text-on-surface-variant block"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                className="w-full px-4 py-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
                id="email"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  className="font-label-sm text-label-sm text-on-surface-variant block"
                  htmlFor="password"
                >
                  Password
                </label>
                <a className="font-label-sm text-label-sm text-primary hover:underline transition-all" href="#">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md bg-surface-container-lowest"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label
                className="font-body-md text-body-md text-on-surface-variant select-none cursor-pointer"
                htmlFor="remember"
              >
                Remember me for 30 days
              </label>
            </div>

            <button
              className="w-full bg-primary-container hover:bg-primary text-white font-body-lg text-body-lg font-bold py-4 rounded transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Login to Dashboard
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-stack_lg pt-stack_lg border-t border-outline-variant text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Trouble logging in?{' '}
              <a className="text-primary font-semibold hover:underline" href="#">
                Contact System Administrator
              </a>
            </p>
          </div>
        </div>

        <footer className="absolute bottom-8 left-0 right-0 px-gutter text-center">
          <p className="font-label-sm text-label-sm text-outline">
            © 2024 SalesPulse Automotive Solutions. All rights reserved.
          </p>
        </footer>
      </section>

      {/* Right: Visual Panel */}
      <section className="hidden lg:block flex-1 relative bg-surface-container overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 z-10 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary-container/90 z-0"></div>

        <div className="absolute bottom-0 left-0 right-0 p-16 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-xl">
            <div className="inline-flex items-center px-3 py-1 bg-primary text-white rounded-full font-label-sm text-label-sm mb-4">
              <span
                className="material-symbols-outlined text-[14px] mr-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              v4.2 Enterprise Edition
            </div>
            <h2 className="font-headline-xl text-headline-xl text-white mb-4">
              Precision Intelligence for Automotive Operations
            </h2>
            <p className="font-body-lg text-body-lg text-white/80">
              Streamlining performance metrics, field tracking, and real-time sales logistics across your entire
              enterprise network.
            </p>
            <div className="flex gap-8 mt-8">
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md text-white font-bold">99.9%</span>
                <span className="font-label-sm text-label-sm text-white/60">Uptime Reliability</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md text-white font-bold">12k+</span>
                <span className="font-label-sm text-label-sm text-white/60">Active Dealerships</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating stats card */}
        <div className="absolute top-12 right-12 z-20 w-64 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">trending_up</span>
            </div>
            <span className="text-white/60 font-label-sm text-label-sm">Daily Growth</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary-fixed w-[72%] transition-all duration-1000"></div>
          </div>
          <div className="mt-3 flex justify-between items-end">
            <span className="text-white font-headline-md text-headline-md">+14.2%</span>
            <span className="text-green-400 font-label-sm text-label-sm">Target Reached</span>
          </div>
        </div>
      </section>
    </main>
  )
}
