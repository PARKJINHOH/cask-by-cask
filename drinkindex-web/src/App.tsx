import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'
import SpiritListPage from '@/pages/SpiritListPage'
import SpiritDetailPage from '@/pages/SpiritDetailPage'
import NoticePage from '@/pages/NoticePage'
import NoticeDetailPage from '@/pages/NoticeDetailPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import MyPage from '@/pages/MyPage'
import SpiritRequestPage from '@/pages/SpiritRequestPage'
import AdminUserPage from '@/pages/admin/AdminUserPage'
import AdminSpiritPage from '@/pages/admin/AdminSpiritPage'
import AdminSpiritDetailPage from '@/pages/admin/AdminSpiritDetailPage'
import AdminRequestPage from '@/pages/admin/AdminRequestPage'
import AdminRequestDetailPage from '@/pages/admin/AdminRequestDetailPage'
import AdminDistilleryPage from '@/pages/admin/AdminDistilleryPage'
import AdminReportPage from '@/pages/admin/AdminReportPage'
import AdminNoticeListPage from '@/pages/admin/AdminNoticeListPage'
import AdminNoticeFormPage from '@/pages/admin/AdminNoticeFormPage'
import AdminNoticePreviewPage from '@/pages/admin/AdminNoticePreviewPage'
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
            <Route path="notices" element={<NoticePage />} />
            <Route path="notices/:id" element={<NoticeDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="mypage" element={<MyPage />} />
              <Route path="request/spirit" element={<SpiritRequestPage />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="spirits" element={<AdminSpiritPage />} />
              <Route path="spirits/:id" element={<AdminSpiritDetailPage />} />
              <Route path="spirits/requests" element={<AdminRequestPage />} />
              <Route path="spirits/requests/:id" element={<AdminRequestDetailPage />} />
              <Route path="distilleries" element={<AdminDistilleryPage />} />
              <Route path="reports" element={<AdminReportPage />} />
              <Route path="notices" element={<AdminNoticeListPage />} />
              <Route path="notices/new" element={<AdminNoticeFormPage />} />
              <Route path="notices/:id" element={<AdminNoticePreviewPage />} />
              <Route path="notices/:id/edit" element={<AdminNoticeFormPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
