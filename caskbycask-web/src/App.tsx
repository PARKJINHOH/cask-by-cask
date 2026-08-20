import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
// 레이아웃·라우트 가드는 항상 필요하므로 eager 로드. 페이지는 모두 route 단위 코드 스플리팅.
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'
import EditorLayout from '@/layouts/EditorLayout'
import PrivateRoute from '@/shared/components/PrivateRoute'
import AdminRoute from '@/shared/components/AdminRoute'
import AuthSessionBootstrap from '@/domain/auth/components/AuthSessionBootstrap'

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
const PhotoGalleryPage = lazy(() => import('@/views-spa/community/PhotoGalleryPage'))
const PhotoPostDetailPage = lazy(() => import('@/views-spa/community/PhotoPostDetailPage'))
const PhotoCardPage = lazy(() => import('@/views-spa/PhotoCardPage'))
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
const AdminGnbMenuPage = lazy(() => import('@/views-spa/admin/AdminGnbMenuPage'))
const AdminBannerFormPage = lazy(() => import('@/views-spa/admin/AdminBannerFormPage'))
const AdminPostReportPage = lazy(() => import('@/views-spa/admin/AdminPostReportPage'))
const AdminBadWordPage = lazy(() => import('@/views-spa/admin/AdminBadWordPage'))
const AdminNicknameBadWordPage = lazy(() => import('@/views-spa/admin/AdminNicknameBadWordPage'))
const AdminEmojiPage = lazy(() => import('@/views-spa/admin/AdminEmojiPage'))
const AdminPrefixPage = lazy(() => import('@/views-spa/admin/AdminPrefixPage'))
const AdminAiNewsPage = lazy(() => import('@/views-spa/admin/AdminAiNewsPage'))
const AdminAiNewsFormPage = lazy(() => import('@/views-spa/admin/AdminAiNewsFormPage'))
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
const ReviewEditPage = lazy(() => import('@/views-spa/ReviewEditPage'))
const InquiryPage = lazy(() => import('@/views-spa/InquiryPage'))
const FaqPage = lazy(() => import('@/views-spa/FaqPage'))
const EventCalendarPage = lazy(() => import('@/views-spa/EventCalendarPage'))
const AdminEventCalendarPage = lazy(() => import('@/views-spa/admin/AdminEventCalendarPage'))
const AdminInquiryPage = lazy(() => import('@/views-spa/admin/AdminInquiryPage'))
const AdminDealListPage = lazy(() => import('@/views-spa/admin/AdminDealListPage'))
const AdminDealDetailPage = lazy(() => import('@/views-spa/admin/AdminDealDetailPage'))
const AdminLogPage = lazy(() => import('@/views-spa/admin/AdminLogPage'))
const AdminDashboardPage = lazy(() => import('@/views-spa/admin/AdminDashboardPage'))
const AdminWineIngestPage = lazy(() => import('@/views-spa/admin/AdminWineIngestPage'))
const AdminFaqPage = lazy(() => import('@/views-spa/admin/AdminFaqPage'))
const AdminFaqFormPage = lazy(() => import('@/views-spa/admin/AdminFaqFormPage'))
const UserBottlePublicPage = lazy(() => import('@/views-spa/UserBottlePublicPage'))
const UserReviewsPage = lazy(() => import('@/views-spa/UserReviewsPage'))
const PriceTrackerPage = lazy(() => import('@/views-spa/PriceTrackerPage'))
const SpiritPriceDetailPage = lazy(() => import('@/views-spa/SpiritPriceDetailPage'))
const PriceRegisterPage = lazy(() => import('@/views-spa/PriceRegisterPage'))
const AdminPriceReportPage = lazy(() => import('@/views-spa/admin/AdminPriceReportPage'))
const AdminPriceReportDetailPage = lazy(() => import('@/views-spa/admin/AdminPriceReportDetailPage'))
const ProducerDetailPage = lazy(() => import('@/views-spa/ProducerDetailPage'))
const TierListPage = lazy(() => import('@/views-spa/TierListPage'))
const TasteTreePage = lazy(() => import('@/views-spa/TasteTreePage'))
const TasteTreeBuilderPage = lazy(() => import('@/views-spa/TasteTreeBuilderPage'))
const MyTasteTreesPage = lazy(() => import('@/views-spa/MyTasteTreesPage'))
const AdminTasteTreePage = lazy(() => import('@/views-spa/admin/AdminTasteTreePage'))
const AdminTasteTreeBuilderPage = lazy(() => import('@/views-spa/admin/AdminTasteTreeBuilderPage'))
const AdminSocialPage = lazy(() => import('@/views-spa/admin/AdminSocialPage'))
const AdminPhotoCardTemplatePage = lazy(() => import('@/views-spa/admin/AdminPhotoCardTemplatePage'))
const PublicReviewPage = lazy(() => import('@/views-spa/PublicReviewPage'))
const SocialHubPage = lazy(() => import('@/views-spa/SocialHubPage'))
const YoutubeGalleryPage = lazy(() => import('@/views-spa/YoutubeGalleryPage'))
const YoutubeVideoDetailPage = lazy(() => import('@/views-spa/YoutubeVideoDetailPage'))
const YoutubeChannelPage = lazy(() => import('@/views-spa/YoutubeChannelPage'))
const AdminYoutubePage = lazy(() => import('@/views-spa/admin/AdminYoutubePage'))

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBootstrap />
      <BrowserRouter basename={window.__APP_BASENAME__}>
        <ErrorBoundary>
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
            {/* 이미지 갤러리 — 정적 세그먼트라 community/:boardType/:id 보다 먼저 와야 한다 */}
            <Route path="community/photo" element={<PhotoGalleryPage />} />
            {/* 사진 상세는 인스타 형태(왼쪽 사진·오른쪽 댓글) 전용 화면을 쓴다 */}
            <Route path="community/photo/:id" element={<PhotoPostDetailPage />} />
            <Route path="community/byob/:id" element={<ByobDetailPage />} />
            <Route path="community/:boardType/:id" element={<PostDetailPage />} />
            <Route path="tier-lists" element={<TierListPage />} />
            <Route path="tier-lists/:shareKey" element={<TierListPage />} />
            <Route path="taste-trees" element={<TasteTreePage />} />
            <Route path="taste-trees/t/:shareKey" element={<TasteTreePage />} />
            {/* 공개 읽기용 (비회원 접근 가능) */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users/:userId/bottles" element={<UserBottlePublicPage />} />
            <Route path="users/:userId/reviews" element={<UserReviewsPage />} />
            <Route path="producers/:id" element={<ProducerDetailPage />} />
            <Route path="reviews/:reviewId" element={<PublicReviewPage />} />
            <Route path="social" element={<SocialHubPage />} />
            {/* 유튜브 갤러리 — 영상 상세는 DB PK 가 아니라 유튜브 영상 ID 를 경로에 쓴다
                (공유한 주소가 유튜브 쪽 ID 와 그대로 맞물리도록). */}
            <Route path="youtube" element={<YoutubeGalleryPage />} />
            {/* 채널 페이지는 2세그먼트라 :videoKey 와 겹치지 않는다 */}
            <Route path="youtube/channels/:channelRef" element={<YoutubeChannelPage />} />
            <Route path="youtube/:videoKey" element={<YoutubeVideoDetailPage />} />
            <Route path="price-tracker" element={<PriceTrackerPage />} />
            <Route path="price-tracker/spirits/:id" element={<SpiritPriceDetailPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="price-tracker/register" element={<PriceRegisterPage />} />
              <Route path="taste-trees/new" element={<TasteTreeBuilderPage />} />
              <Route path="taste-trees/:id/edit" element={<TasteTreeBuilderPage />} />
              <Route path="taste-trees/mine" element={<MyTasteTreesPage />} />
              <Route path="spirits/:id/review/write" element={<ReviewFormPage />} />
              <Route path="spirits/:id/review/:reviewId/edit" element={<ReviewFormPage />} />
              {/* 마이페이지 내 리뷰 수정 — 정적 세그먼트가 있는 request 경로가 우선 매칭된다 */}
              <Route path="review/request/:requestId" element={<ReviewEditPage />} />
              <Route path="review/:reviewId" element={<ReviewEditPage />} />
              <Route path="community/:boardType/write" element={<PostFormPage />} />
              <Route path="community/:boardType/:id/edit" element={<PostFormPage />} />
              {/* 이미지 갤러리 글쓰기는 포토카드 편집기로 보낸다 —
                  PostFormPage 는 photo 를 FREE 로 저장하므로 진입 자체를 막는다 */}
              <Route path="community/photo/write" element={<Navigate to="/photo-card" replace />} />
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

          {/* 편집기 — 헤더/GNB/푸터 없이 화면 전체를 쓴다.
              정적 경로라 MainLayout 안의 catch-all(*) 보다 먼저 매칭된다.
              비회원도 만들고 내려받을 수 있다(저장본에는 브랜드 마크가 얹힌다) —
              로그인이 필요한 것은 마크 없는 저장·갤러리 업로드·내 템플릿뿐이고,
              그 자리에서 작업을 임시저장한 뒤 로그인으로 보낸다. */}
          <Route element={<EditorLayout />}>
            <Route path="photo-card" element={<PhotoCardPage />} />
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
              <Route path="spirits/wine-crawler" element={<AdminWineIngestPage />} />
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
              <Route path="gnb-menus" element={<AdminGnbMenuPage />} />
              <Route path="events" element={<AdminEventCalendarPage />} />
              <Route path="community/post-reports" element={<AdminPostReportPage />} />
              <Route path="community/ai-news" element={<AdminAiNewsPage />} />
              <Route path="community/ai-news/new" element={<AdminAiNewsFormPage />} />
              <Route path="community/ai-news/:id/edit" element={<AdminAiNewsFormPage />} />
              <Route path="social" element={<AdminSocialPage />} />
              <Route path="youtube" element={<AdminYoutubePage />} />
              <Route path="photo-cards" element={<AdminPhotoCardTemplatePage />} />
              <Route path="community/bad-words" element={<AdminBadWordPage />} />
              <Route path="community/emojis" element={<AdminEmojiPage />} />
              <Route path="community/prefixes" element={<AdminPrefixPage />} />
              <Route path="price-reports" element={<AdminPriceReportPage />} />
              <Route path="price-reports/:id" element={<AdminPriceReportDetailPage />} />
              <Route path="deals" element={<AdminDealListPage />} />
              {/* 정적 경로가 :id 보다 우선 매칭된다 — 등록 모드 */}
              <Route path="deals/new" element={<AdminDealDetailPage />} />
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
              <Route path="taste-trees" element={<AdminTasteTreePage />} />
              <Route path="taste-trees/new" element={<AdminTasteTreeBuilderPage />} />
              <Route path="taste-trees/:id/edit" element={<AdminTasteTreeBuilderPage />} />
              {/* 관리자 영역 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
