import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
// 레이아웃·라우트 가드는 항상 필요하므로 eager 로드. 페이지는 모두 route 단위 코드 스플리팅.
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'
import PrivateRoute from '@/shared/components/PrivateRoute'
import AdminRoute from '@/shared/components/AdminRoute'

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const MainPage = lazy(() => import('@/pages/MainPage'))
const SpiritListPage = lazy(() => import('@/pages/SpiritListPage'))
const SpiritDetailPage = lazy(() => import('@/pages/SpiritDetailPage'))
const NoticePage = lazy(() => import('@/pages/NoticePage'))
const NoticeDetailPage = lazy(() => import('@/pages/NoticeDetailPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SignupPage = lazy(() => import('@/pages/SignupPage'))
const AccountRecoveryPage = lazy(() => import('@/pages/AccountRecoveryPage'))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage'))
const OAuthSignupPage = lazy(() => import('@/pages/OAuthSignupPage'))
const MyPage = lazy(() => import('@/pages/MyPage'))
const RankingPage = lazy(() => import('@/pages/RankingPage'))
const SpiritRequestPage = lazy(() => import('@/pages/SpiritRequestPage'))
const MySpiritRequestsPage = lazy(() => import('@/pages/MySpiritRequestsPage'))
const ProducerRequestPage = lazy(() => import('@/pages/ProducerRequestPage'))
const FeedbackListPage = lazy(() => import('@/pages/FeedbackListPage'))
const FeedbackFormPage = lazy(() => import('@/pages/FeedbackFormPage'))
const FeedbackDetailPage = lazy(() => import('@/pages/FeedbackDetailPage'))
const AllBoardPage = lazy(() => import('@/pages/community/AllBoardPage'))
const NoticeBoardPage = lazy(() => import('@/pages/community/NoticeBoardPage'))
const FreeBoardPage = lazy(() => import('@/pages/community/FreeBoardPage'))
const PostDetailPage = lazy(() => import('@/pages/community/PostDetailPage'))
const PostFormPage = lazy(() => import('@/pages/community/PostFormPage'))
const ByobListPage = lazy(() => import('@/pages/community/ByobListPage'))
const ByobDetailPage = lazy(() => import('@/pages/community/ByobDetailPage'))
const ByobFormPage = lazy(() => import('@/pages/community/ByobFormPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const AdminUserPage = lazy(() => import('@/pages/admin/AdminUserPage'))
const AdminUserDetailPage = lazy(() => import('@/pages/admin/AdminUserDetailPage'))
const AdminSpiritPage = lazy(() => import('@/pages/admin/AdminSpiritPage'))
const AdminSpiritDetailPage = lazy(() => import('@/pages/admin/AdminSpiritDetailPage'))
const AdminSpiritFormPage = lazy(() => import('@/pages/admin/AdminSpiritFormPage'))
const AdminRequestPage = lazy(() => import('@/pages/admin/AdminRequestPage'))
const AdminRequestDetailPage = lazy(() => import('@/pages/admin/AdminRequestDetailPage'))
const AdminProducerPage = lazy(() => import('@/pages/admin/AdminProducerPage'))
const AdminProducerRequestPage = lazy(() => import('@/pages/admin/AdminProducerRequestPage'))
const AdminProducerRequestDetailPage = lazy(() => import('@/pages/admin/AdminProducerRequestDetailPage'))
const AdminReportPage = lazy(() => import('@/pages/admin/AdminReportPage'))
const AdminNoticeListPage = lazy(() => import('@/pages/admin/AdminNoticeListPage'))
const AdminNoticeFormPage = lazy(() => import('@/pages/admin/AdminNoticeFormPage'))
const AdminNoticePreviewPage = lazy(() => import('@/pages/admin/AdminNoticePreviewPage'))
const AdminPopupListPage = lazy(() => import('@/pages/admin/AdminPopupListPage'))
const AdminPopupFormPage = lazy(() => import('@/pages/admin/AdminPopupFormPage'))
const AdminBannerListPage = lazy(() => import('@/pages/admin/AdminBannerListPage'))
const AdminBannerFormPage = lazy(() => import('@/pages/admin/AdminBannerFormPage'))
const AdminPostReportPage = lazy(() => import('@/pages/admin/AdminPostReportPage'))
const AdminBadWordPage = lazy(() => import('@/pages/admin/AdminBadWordPage'))
const AdminNicknameBadWordPage = lazy(() => import('@/pages/admin/AdminNicknameBadWordPage'))
const AdminEmojiPage = lazy(() => import('@/pages/admin/AdminEmojiPage'))
const AdminPrefixPage = lazy(() => import('@/pages/admin/AdminPrefixPage'))
const AdminScorePage = lazy(() => import('@/pages/admin/AdminScorePage'))
const AdminLevelPage = lazy(() => import('@/pages/admin/AdminLevelPage'))
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'))
const OperationPolicyPage = lazy(() => import('@/pages/legal/OperationPolicyPage'))
const AdminLegalListPage = lazy(() => import('@/pages/admin/AdminLegalListPage'))
const AdminLegalFormPage = lazy(() => import('@/pages/admin/AdminLegalFormPage'))
const AdminEmailPage = lazy(() => import('@/pages/admin/AdminEmailPage'))
const AdminEmailHistoryPage = lazy(() => import('@/pages/admin/AdminEmailHistoryPage'))
const ReviewFormPage = lazy(() => import('@/pages/ReviewFormPage'))
const InquiryPage = lazy(() => import('@/pages/InquiryPage'))
const FaqPage = lazy(() => import('@/pages/FaqPage'))
const EventCalendarPage = lazy(() => import('@/pages/EventCalendarPage'))
const AdminEventCalendarPage = lazy(() => import('@/pages/admin/AdminEventCalendarPage'))
const AdminInquiryPage = lazy(() => import('@/pages/admin/AdminInquiryPage'))
const AdminDealListPage = lazy(() => import('@/pages/admin/AdminDealListPage'))
const AdminDealDetailPage = lazy(() => import('@/pages/admin/AdminDealDetailPage'))
const AdminLogPage = lazy(() => import('@/pages/admin/AdminLogPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminFaqPage = lazy(() => import('@/pages/admin/AdminFaqPage'))
const AdminFaqFormPage = lazy(() => import('@/pages/admin/AdminFaqFormPage'))
const UserBottlePublicPage = lazy(() => import('@/pages/UserBottlePublicPage'))
const PriceTrackerPage = lazy(() => import('@/pages/PriceTrackerPage'))
const SpiritPriceDetailPage = lazy(() => import('@/pages/SpiritPriceDetailPage'))
const PriceRegisterPage = lazy(() => import('@/pages/PriceRegisterPage'))
const AdminPriceReportPage = lazy(() => import('@/pages/admin/AdminPriceReportPage'))
const AdminStorePage = lazy(() => import('@/pages/admin/AdminStorePage'))
const ProducerDetailPage = lazy(() => import('@/pages/ProducerDetailPage'))

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter basename={window.__APP_BASENAME__}>
          <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<MainPage />} />
            <Route path="spirits" element={<SpiritListPage />} />
            <Route path="spirits/:id/:slug?" element={<SpiritDetailPage />} />
            <Route path="notices" element={<NoticePage />} />
            <Route path="notices/:id" element={<NoticeDetailPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="oauth/signup" element={<OAuthSignupPage />} />
            <Route path="account-recovery" element={<AccountRecoveryPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="operation-policy" element={<OperationPolicyPage />} />
            <Route path="inquiry" element={<InquiryPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="calendar" element={<EventCalendarPage />} />
            {/* 커뮤니티 */}
            <Route path="community/all" element={<AllBoardPage />} />
            <Route path="community/notice" element={<NoticeBoardPage />} />
            <Route path="community/free" element={<FreeBoardPage />} />
            <Route path="community/byob" element={<ByobListPage />} />
            <Route path="community/byob/:id" element={<ByobDetailPage />} />
            <Route path="community/:boardType/:id" element={<PostDetailPage />} />
            {/* 공개 읽기용 (비회원 접근 가능) */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users/:userId/bottles" element={<UserBottlePublicPage />} />
            <Route path="producers/:id" element={<ProducerDetailPage />} />
            <Route path="price-tracker" element={<PriceTrackerPage />} />
            <Route path="price-tracker/spirits/:id" element={<SpiritPriceDetailPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="price-tracker/register" element={<PriceRegisterPage />} />
              <Route path="spirits/:id/review/write" element={<ReviewFormPage />} />
              <Route path="spirits/:id/review/:reviewId/edit" element={<ReviewFormPage />} />
              <Route path="community/:boardType/write" element={<PostFormPage />} />
              <Route path="community/:boardType/:id/edit" element={<PostFormPage />} />
              <Route path="community/byob/write" element={<ByobFormPage />} />
              <Route path="community/byob/:id/edit" element={<ByobFormPage />} />
<Route path="mypage" element={<MyPage />} />
              <Route path="request/spirit" element={<SpiritRequestPage />} />
              <Route path="request/spirit/my" element={<MySpiritRequestsPage />} />
              <Route path="request/producer" element={<ProducerRequestPage />} />
              <Route path="request/feedback" element={<FeedbackListPage />} />
              <Route path="request/feedback/new" element={<FeedbackFormPage />} />
              <Route path="request/feedback/:id" element={<FeedbackDetailPage />} />
              <Route path="request/feedback/:id/edit" element={<FeedbackFormPage />} />
            </Route>
            {/* MainLayout 안의 catch-all 404 — 헤더/푸터 유지 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUserPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="users/nickname-bad-words" element={<AdminNicknameBadWordPage />} />
              <Route path="spirits" element={<AdminSpiritPage />} />
              <Route path="spirits/new" element={<AdminSpiritFormPage />} />
              <Route path="spirits/:id" element={<AdminSpiritDetailPage />} />
              <Route path="spirits/requests" element={<AdminRequestPage />} />
              <Route path="spirits/requests/:id" element={<AdminRequestDetailPage />} />
              <Route path="producers" element={<AdminProducerPage />} />
              <Route path="producers/requests" element={<AdminProducerRequestPage />} />
              <Route path="producers/requests/:id" element={<AdminProducerRequestDetailPage />} />
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
              <Route path="events" element={<AdminEventCalendarPage />} />
              <Route path="community/post-reports" element={<AdminPostReportPage />} />
              <Route path="community/bad-words" element={<AdminBadWordPage />} />
              <Route path="community/emojis" element={<AdminEmojiPage />} />
              <Route path="community/prefixes" element={<AdminPrefixPage />} />
              <Route path="price-reports" element={<AdminPriceReportPage />} />
              <Route path="stores" element={<AdminStorePage />} />
              <Route path="deals" element={<AdminDealListPage />} />
              <Route path="deals/:id" element={<AdminDealDetailPage />} />
              <Route path="score/points" element={<AdminScorePage />} />
              <Route path="score/levels" element={<AdminLevelPage />} />
              <Route path="legal" element={<AdminLegalListPage />} />
              <Route path="legal/new" element={<AdminLegalFormPage />} />
              <Route path="legal/:id/edit" element={<AdminLegalFormPage />} />
              <Route path="emails/send" element={<AdminEmailPage />} />
              <Route path="emails/history" element={<AdminEmailHistoryPage />} />
              <Route path="inquiries" element={<AdminInquiryPage />} />
              <Route path="logs" element={<AdminLogPage />} />
              <Route path="faq" element={<AdminFaqPage />} />
              <Route path="faq/new" element={<AdminFaqFormPage />} />
              <Route path="faq/:id/edit" element={<AdminFaqFormPage />} />
              {/* 관리자 영역 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
