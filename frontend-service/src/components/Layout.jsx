import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../services/api'

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'badge', label: 'Employees', path: '/employees' },
  { icon: 'work', label: 'Positions', path: '/positions' },
  { icon: 'calendar_month', label: 'KPI Periods', path: '/kpi/periods' },
  { icon: 'assessment', label: 'KPI Assessment', path: '/kpi/assessments/create' },
  { icon: 'payments', label: 'Bonus Recap', path: '/kpi/recap' },
  { icon: 'analytics', label: 'Reports', path: '/reports' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, dispatch } = useAuth()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (_) {
      // ignore logout errors
    } finally {
      localStorage.removeItem('token')
      dispatch({ type: 'LOGOUT' })
      navigate('/login')
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen overflow-y-auto hidden md:flex w-sidebar_expanded flex-col bg-surface border-r border-outline-variant z-40">
        {/* Logo */}
        <div className="p-gutter flex flex-col items-start gap-1">
          <span className="font-headline-md text-headline-md font-bold text-primary">AutoERP</span>
          <span className="font-body-md text-body-md text-on-surface-variant opacity-70">Management Suite</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={
                  active
                    ? 'flex items-center px-4 py-3 text-primary border-l-4 border-primary bg-primary-fixed font-bold transition-colors duration-200'
                    : 'flex items-center px-4 py-3 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200'
                }
              >
                <span
                  className="material-symbols-outlined mr-3"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-body-md text-body-md">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-gutter mt-auto">
          <div className="bg-surface-container-high rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                person
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-body-md text-body-md font-bold truncate">
                {state.user?.name || state.user?.email || 'Admin User'}
              </p>
              <p className="text-label-sm text-on-surface-variant truncate">
                {state.user?.role || 'Super Admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 right-0 left-0 md:left-sidebar_expanded h-header_height z-30 bg-surface shadow-sm border-b border-outline-variant flex justify-between items-center px-gutter">
        <div className="flex items-center gap-4">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">KPI Management</h1>
        </div>
        <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full w-80 border border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-md w-full outline-none"
            placeholder="Search data, employees, reports..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-all duration-200 text-on-surface-variant">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-all duration-200 text-on-surface-variant">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              person
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-header_height md:pl-sidebar_expanded min-h-screen">
        {children}
      </main>
    </div>
  )
}
