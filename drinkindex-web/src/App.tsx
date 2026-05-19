import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'
import MainPage from '@/pages/MainPage'
import SpiritListPage from '@/pages/SpiritListPage'
import SpiritDetailPage from '@/pages/SpiritDetailPage'
import NoticePage from '@/pages/NoticePage'
import NoticeDetailPage from '@/pages/NoticeDetailPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import EmailVerifyPage from '@/pages/EmailVerifyPage'
import MyPage from '@/pages/MyPage'
import RankingPage from '@/pages/RankingPage'
import SpiritRequestPage from '@/pages/SpiritRequestPage'
import NoticeBoardPage from '@/pages/community/NoticeBoardPage'
import FreeBoardPage from '@/pages/community/FreeBoardPage'
import PostDetailPage from '@/pages/community/PostDetailPage'
import PostFormPage from '@/pages/community/PostFormPage'
import NotificationsPage from '@/pages/NotificationsPage'
import MessagesPage from '@/pages/MessagesPage'
import AdminUserPage from '@/pages/admin/AdminUserPage'
import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage'
import AdminSpiritPage from '@/pages/admin/AdminSpiritPage'
import AdminSpiritDetailPage from '@/pages/admin/AdminSpiritDetailPage'
import AdminSpiritFormPage from '@/pages/admin/AdminSpiritFormPage'
import AdminRequestPage from '@/pages/admin/AdminRequestPage'
import AdminRequestDetailPage from '@/pages/admin/AdminRequestDetailPage'
import AdminDistilleryPage from '@/pages/admin/AdminDistilleryPage'
import AdminWineryPage from '@/pages/admin/AdminWineryPage'
import AdminCognacHousePage from '@/pages/admin/AdminCognacHousePage'
import AdminCognacAppellationPage from '@/pages/admin/AdminCognacAppellationPage'
import AdminReportPage from '@/pages/admin/AdminReportPage'
import AdminNoticeListPage from '@/pages/admin/AdminNoticeListPage'
import AdminNoticeFormPage from '@/pages/admin/AdminNoticeFormPage'
import AdminNoticePreviewPage from '@/pages/admin/AdminNoticePreviewPage'
import AdminPopupListPage from '@/pages/admin/AdminPopupListPage'
import AdminPopupFormPage from '@/pages/admin/AdminPopupFormPage'
import AdminBannerListPage from '@/pages/admin/AdminBannerListPage'
import AdminBannerFormPage from '@/pages/admin/AdminBannerFormPage'
import AdminPostReportPage from '@/pages/admin/AdminPostReportPage'
import AdminBadWordPage from '@/pages/admin/AdminBadWordPage'
import AdminEmojiPage from '@/pages/admin/AdminEmojiPage'
import AdminPrefixPage from '@/pages/admin/AdminPrefixPage'
import AdminScorePage from '@/pages/admin/AdminScorePage'
import AdminLevelPage from '@/pages/admin/AdminLevelPage'
import PrivateRoute from '@/shared/components/PrivateRoute'
import AdminRoute from '@/shared/components/AdminRoute'
import TermsPage from '@/pages/legal/TermsPage'
import PrivacyPage from '@/pages/legal/PrivacyPage'
import AdminLegalListPage from '@/pages/admin/AdminLegalListPage'
import AdminLegalFormPage from '@/pages/admin/AdminLegalFormPage'
import AdminEmailPage from '@/pages/admin/AdminEmailPage'
import AdminEmailHistoryPage from '@/pages/admin/AdminEmailHistoryPage'
import ReviewFormPage from '@/pages/ReviewFormPage'
import InquiryPage from '@/pages/InquiryPage'
import AdminInquiryPage from '@/pages/admin/AdminInquiryPage'
import AdminRolePage from '@/pages/admin/AdminRolePage'
import AdminLogPage from '@/pages/admin/AdminLogPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<MainPage />} />
            <Route path="spirits" element={<SpiritListPage />} />
            <Route path="spirits/:id" element={<SpiritDetailPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="notices/:id" element={<NoticeDetailPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="verify-email" element={<EmailVerifyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="inquiry" element={<InquiryPage />} />
            {/* 커뮤니티 */}
            <Route path="community/notice" element={<NoticeBoardPage />} />
            <Route path="community/free" element={<FreeBoardPage />} />
            <Route path="community/:boardType/:id" element={<PostDetailPage />} />
            {/* 공개 읽기용 (비회원 접근 가능) */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="spirits/:id/review/write" element={<ReviewFormPage />} />
              <Route path="spirits/:id/review/:reviewId/edit" element={<ReviewFormPage />} />
              <Route path="community/:boardType/write" element={<PostFormPage />} />
              <Route path="community/:boardType/:id/edit" element={<PostFormPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="mypage" element={<MyPage />} />
              <Route path="request/spirit" element={<SpiritRequestPage />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="spirits" element={<AdminSpiritPage />} />
              <Route path="spirits/new" element={<AdminSpiritFormPage />} />
              <Route path="spirits/:id" element={<AdminSpiritDetailPage />} />
              <Route path="spirits/:id/edit" element={<AdminSpiritFormPage />} />
              <Route path="spirits/requests" element={<AdminRequestPage />} />
              <Route path="spirits/requests/:id" element={<AdminRequestDetailPage />} />
              <Route path="distilleries" element={<AdminDistilleryPage />} />
              <Route path="wineries" element={<AdminWineryPage />} />
              <Route path="cognac-houses" element={<AdminCognacHousePage />} />
              <Route path="cognac-appellations" element={<AdminCognacAppellationPage />} />
              <Route path="reports" element={<AdminReportPage />} />
              <Route path="notices" element={<AdminNoticeListPage />} />
              <Route path="notices/new" element={<AdminNoticeFormPage />} />
              <Route path="notices/:id" element={<AdminNoticePreviewPage />} />
              <Route path="notices/:id/edit" element={<AdminNoticeFormPage />} />
              <Route path="popups" element={<AdminPopupListPage />} />
              <Route path="popups/new" element={<AdminPopupFormPage />} />
              <Route path="popups/:id/edit" element={<AdminPopupFormPage />} />
              <Route path="banners" element={<AdminBannerListPage />} />
              <Route path="banners/new" element={<AdminBannerFormPage />} />
              <Route path="banners/:id/edit" element={<AdminBannerFormPage />} />
              <Route path="community/post-reports" element={<AdminPostReportPage />} />
              <Route path="community/bad-words" element={<AdminBadWordPage />} />
              <Route path="community/emojis" element={<AdminEmojiPage />} />
              <Route path="community/prefixes" element={<AdminPrefixPage />} />
              <Route path="score/points" element={<AdminScorePage />} />
              <Route path="score/levels" element={<AdminLevelPage />} />
              <Route path="legal" element={<AdminLegalListPage />} />
              <Route path="legal/new" element={<AdminLegalFormPage />} />
              <Route path="legal/:id/edit" element={<AdminLegalFormPage />} />
              <Route path="emails/send" element={<AdminEmailPage />} />
              <Route path="emails/history" element={<AdminEmailHistoryPage />} />
              <Route path="inquiries" element={<AdminInquiryPage />} />
              <Route path="roles" element={<AdminRolePage />} />
              <Route path="logs" element={<AdminLogPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
