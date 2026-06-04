import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import EmployeeFormPage from './pages/EmployeeFormPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import PositionsPage from './pages/PositionsPage'
import KpiPeriodsPage from './pages/KpiPeriodsPage'
import KpiAssessmentFormPage from './pages/KpiAssessmentFormPage'
import BonusRecapPage from './pages/BonusRecapPage'
import BonusDetailPage from './pages/BonusDetailPage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/create" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/kpi/periods" element={<KpiPeriodsPage />} />
            <Route path="/kpi/assessments/create" element={<KpiAssessmentFormPage />} />
            <Route path="/kpi/recap" element={<BonusRecapPage />} />
            <Route path="/kpi/recap/:id" element={<BonusDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
