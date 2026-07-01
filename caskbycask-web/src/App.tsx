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

const NotFoundPage = lazy(() => import('@/views-spa/NotFoundPage'))
const MainPage = lazy(() => import('@/views-spa/MainPage'))
const SpiritListPage = lazy(() => import('@/views-spa/SpiritListPage'))
const SpiritDetailPage = lazy(() => import('@/views-spa/SpiritDetailPage'))
const NoticePage = lazy(() => import('@/views-spa/NoticePage'))
const NoticeDetailPage = lazy(() => import('@/views-spa/NoticeDetailPage'))
const LoginPage = lazy(() => import('@/views-spa/LoginPage'))
const SignupPage = lazy(() => import('@/views-spa/SignupPage'))
const AccountRecoveryPage = lazy(() => import('@/views-spa/AccountRecoveryPage'))
const OAuthCallbackPage = lazy(() => import('@/views-spa/OAuthCallbackPage'))
const OAuthSignupPage = lazy(() => import('@/views-spa/OAuthSignupPage'))
const MyPage = lazy(() => import('@/views-spa/MyPage'))
const RankingPage = lazy(() => import('@/views-spa/RankingPage'))
const SpiritRequestPage = lazy(() => import('@/views-spa/SpiritRequestPage'))
const MySpiritRequestsPage = lazy(() => import('@/views-spa/MySpiritRequestsPage'))
const ProducerRequestPage = lazy(() => import('@/views-spa/ProducerRequestPage'))
const FeedbackListPage = lazy(() => import('@/views-spa/FeedbackListPage'))
const FeedbackFormPage = lazy(() => import('@/views-spa/FeedbackFormPage'))
const FeedbackDetailPage = lazy(() => import('@/views-spa/FeedbackDetailPage'))
const AllBoardPage = lazy(() => import('@/views-spa/community/AllBoardPage'))
const NoticeBoardPage = lazy(() => import('@/views-spa/community/NoticeBoardPage'))
const FreeBoardPage = lazy(() => import('@/views-spa/community/FreeBoardPage'))
const PostDetailPage = lazy(() => import('@/views-spa/community/PostDetailPage'))
const PostFormPage = lazy(() => import('@/views-spa/community/PostFormPage'))
const ByobListPage = lazy(() => import('@/views-spa/community/ByobListPage'))
const ByobDetailPage = lazy(() => import('@/views-spa/community/ByobDetailPage'))
const ByobFormPage = lazy(() => import('@/views-spa/community/ByobFormPage'))
const NotificationsPage = lazy(() => import('@/views-spa/NotificationsPage'))
const AdminUserPage = lazy(() => import('@/views-spa/admin/AdminUserPage'))
const AdminUserDetailPage = lazy(() => import('@/views-spa/admin/AdminUserDetailPage'))
const AdminSpiritPage = lazy(() => import('@/views-spa/admin/AdminSpiritPage'))
const AdminSpiritDetailPage = lazy(() => import('@/views-spa/admin/AdminSpiritDetailPage'))
const AdminSpiritFormPage = lazy(() => import('@/views-spa/admin/AdminSpiritFormPage'))
const AdminRequestPage = lazy(() => import('@/views-spa/admin/AdminRequestPage'))
const AdminRequestDetailPage = lazy(() => import('@/views-spa/admin/AdminRequestDetailPage'))
const AdminVariantRequestPage = lazy(() => import('@/views-spa/admin/AdminVariantRequestPage'))
const AdminProducerPage = lazy(() => import('@/views-spa/admin/AdminProducerPage'))
const AdminProducerRequestPage = lazy(() => import('@/views-spa/admin/AdminProducerRequestPage'))
const AdminProducerRequestDetailPage = lazy(() => import('@/views-spa/admin/AdminProducerRequestDetailPage'))
const AdminReportPage = lazy(() => import('@/views-spa/admin/AdminReportPage'))
const AdminNoticeListPage = lazy(() => import('@/views-spa/admin/AdminNoticeListPage'))
const AdminNoticeFormPage = lazy(() => import('@/views-spa/admin/AdminNoticeFormPage'))
const AdminNoticePreviewPage = lazy(() => import('@/views-spa/admin/AdminNoticePreviewPage'))
const AdminPopupListPage = lazy(() => import('@/views-spa/admin/AdminPopupListPage'))
const AdminPopupFormPage = lazy(() => import('@/views-spa/admin/AdminPopupFormPage'))
const AdminBannerListPage = lazy(() => import('@/views-spa/admin/AdminBannerListPage'))
const AdminBannerFormPage = lazy(() => import('@/views-spa/admin/AdminBannerFormPage'))
const AdminPostReportPage = lazy(() => import('@/views-spa/admin/AdminPostReportPage'))
const AdminBadWordPage = lazy(() => import('@/views-spa/admin/AdminBadWordPage'))
const AdminNicknameBadWordPage = lazy(() => import('@/views-spa/admin/AdminNicknameBadWordPage'))
const AdminEmojiPage = lazy(() => import('@/views-spa/admin/AdminEmojiPage'))
const AdminPrefixPage = lazy(() => import('@/views-spa/admin/AdminPrefixPage'))
const AdminScorePage = lazy(() => import('@/views-spa/admin/AdminScorePage'))
const AdminLevelPage = lazy(() => import('@/views-spa/admin/AdminLevelPage'))
const TermsPage = lazy(() => import('@/views-spa/legal/TermsPage'))
const PrivacyPage = lazy(() => import('@/views-spa/legal/PrivacyPage'))
const OperationPolicyPage = lazy(() => import('@/views-spa/legal/OperationPolicyPage'))
const AdminLegalListPage = lazy(() => import('@/views-spa/admin/AdminLegalListPage'))
const AdminLegalFormPage = lazy(() => import('@/views-spa/admin/AdminLegalFormPage'))
const AdminEmailPage = lazy(() => import('@/views-spa/admin/AdminEmailPage'))
const AdminEmailHistoryPage = lazy(() => import('@/views-spa/admin/AdminEmailHistoryPage'))
const ReviewFormPage = lazy(() => import('@/views-spa/ReviewFormPage'))
const InquiryPage = lazy(() => import('@/views-spa/InquiryPage'))
const FaqPage = lazy(() => import('@/views-spa/FaqPage'))
const EventCalendarPage = lazy(() => import('@/views-spa/EventCalendarPage'))
const AdminEventCalendarPage = lazy(() => import('@/views-spa/admin/AdminEventCalendarPage'))
const AdminInquiryPage = lazy(() => import('@/views-spa/admin/AdminInquiryPage'))
const AdminDealListPage = lazy(() => import('@/views-spa/admin/AdminDealListPage'))
const AdminDealDetailPage = lazy(() => import('@/views-spa/admin/AdminDealDetailPage'))
const AdminLogPage = lazy(() => import('@/views-spa/admin/AdminLogPage'))
const AdminDashboardPage = lazy(() => import('@/views-spa/admin/AdminDashboardPage'))
const AdminFaqPage = lazy(() => import('@/views-spa/admin/AdminFaqPage'))
const AdminFaqFormPage = lazy(() => import('@/views-spa/admin/AdminFaqFormPage'))
const UserBottlePublicPage = lazy(() => import('@/views-spa/UserBottlePublicPage'))
const UserReviewsPage = lazy(() => import('@/views-spa/UserReviewsPage'))
const PriceTrackerPage = lazy(() => import('@/views-spa/PriceTrackerPage'))
const SpiritPriceDetailPage = lazy(() => import('@/views-spa/SpiritPriceDetailPage'))
const PriceRegisterPage = lazy(() => import('@/views-spa/PriceRegisterPage'))
const AdminPriceReportPage = lazy(() => import('@/views-spa/admin/AdminPriceReportPage'))
const AdminStorePage = lazy(() => import('@/views-spa/admin/AdminStorePage'))
const ProducerDetailPage = lazy(() => import('@/views-spa/ProducerDetailPage'))

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
            <Route path="users/:userId/reviews" element={<UserReviewsPage />} />
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
              <Route path="spirits/requests" element={<AdminRequestPage />} />
              <Route path="spirits/requests/:id" element={<AdminRequestDetailPage />} />
              <Route path="spirits/variant-requests" element={<AdminVariantRequestPage />} />
              <Route path="spirits/:id" element={<AdminSpiritDetailPage />} />
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
