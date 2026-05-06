import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'
import SpiritListPage from '@/pages/SpiritListPage'
import SpiritDetailPage from '@/pages/SpiritDetailPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import MyPage from '@/pages/MyPage'
import AdminUserPage from '@/pages/admin/AdminUserPage'
import AdminSpiritPage from '@/pages/admin/AdminSpiritPage'
import AdminRequestPage from '@/pages/admin/AdminRequestPage'
import AdminReportPage from '@/pages/admin/AdminReportPage'
import PrivateRoute from '@/shared/components/PrivateRoute'
import AdminRoute from '@/shared/components/AdminRoute'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<SpiritListPage />} />
            <Route path="spirits/:id" element={<SpiritDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="mypage" element={<MyPage />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="spirits" element={<AdminSpiritPage />} />
              <Route path="spirits/requests" element={<AdminRequestPage />} />
              <Route path="reports" element={<AdminReportPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
