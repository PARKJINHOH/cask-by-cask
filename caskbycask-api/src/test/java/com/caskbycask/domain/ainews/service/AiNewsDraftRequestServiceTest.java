package com.caskbycask.domain.ainews.service;

import com.caskbycask.domain.ainews.dto.AiNewsDraftRequestDtos;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.AiNewsDraftRequest;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import com.caskbycask.domain.ainews.repository.AiNewsArticleRepository;
import com.caskbycask.domain.ainews.repository.AiNewsDraftRequestRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AiNewsDraftRequestServiceTest {

    @Mock AiNewsDraftRequestRepository requestRepository;
    @Mock AiNewsArticleRepository articleRepository;
    @Mock UserRepository userRepository;
    @Mock AiNewsService aiNewsService;

    private AiNewsDraftRequestService service;
    private User admin;

    @BeforeEach
    void setUp() {
        service = new AiNewsDraftRequestService(requestRepository, articleRepository, userRepository, aiNewsService);
        admin = User.builder().id(9L).email("admin@example.com").password("password")
                .nickname("관리자").role(Role.SUPER_ADMIN).build();
    }

    @Test
    void createNormalizesAndDeduplicatesReferenceUrls() {
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(requestRepository.save(any(AiNewsDraftRequest.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        AiNewsDraftRequestDtos.Response response = service.create(
                new AiNewsDraftRequestDtos.CreateRequest("  국내 출시 소식을 작성해 주세요.  ", List.of(
                        "https://example.com/news/../release",
                        "https://example.com/release"
                )), 9L);

        assertThat(response.prompt()).isEqualTo("국내 출시 소식을 작성해 주세요.");
        assertThat(response.referenceUrls()).containsExactly("https://example.com/release");
        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.PENDING);
    }

    @Test
    void createRejectsMoreThanThreeDistinctReferenceUrls() {
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);

        assertThatThrownBy(() -> service.create(new AiNewsDraftRequestDtos.CreateRequest("작성 요청", List.of(
                "https://example.com/1", "https://example.com/2",
                "https://example.com/3", "https://example.com/4"
        )), 9L)).isInstanceOf(CustomException.class);
    }

    @Test
    void detailReturnsRequestedHistory() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.FAILED);
        given(requestRepository.findById(3L)).willReturn(Optional.of(request));

        AiNewsDraftRequestDtos.Response response = service.detail(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.FAILED);
        assertThat(response.prompt()).isEqualTo("공식 발표를 확인해 작성");
    }

    @ParameterizedTest
    @EnumSource(value = AiNewsDraftRequestStatus.class, names = {"FAILED", "CANCELLED", "COMPLETED"})
    void retryCreatesNewPendingRequestWithoutChangingTerminalOriginal(AiNewsDraftRequestStatus originalStatus) {
        AiNewsDraftRequest original = AiNewsDraftRequest.builder()
                .id(3L)
                .prompt("공식 발표를 확인해 작성")
                .referenceUrl1("https://example.com/release")
                .status(originalStatus)
                .requestedBy(admin)
                .build();
        AiNewsDraftRequest retried = AiNewsDraftRequest.builder()
                .id(4L)
                .prompt(original.getPrompt())
                .referenceUrl1("https://example.com/release")
                .requestedBy(admin)
                .build();
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(original));
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(requestRepository.save(any(AiNewsDraftRequest.class))).willReturn(retried);

        AiNewsDraftRequestDtos.Response response = service.retry(3L, null, 9L);

        ArgumentCaptor<AiNewsDraftRequest> requestCaptor = ArgumentCaptor.forClass(AiNewsDraftRequest.class);
        verify(requestRepository).save(requestCaptor.capture());
        AiNewsDraftRequest saved = requestCaptor.getValue();
        assertThat(saved.getId()).isNull();
        assertThat(saved.getStatus()).isEqualTo(AiNewsDraftRequestStatus.PENDING);
        assertThat(saved.getArticle()).isNull();
        assertThat(saved.getRequestedBy()).isSameAs(admin);
        assertThat(saved.getPrompt()).isEqualTo(original.getPrompt());
        assertThat(saved.referenceUrls()).containsExactly("https://example.com/release");
        assertThat(original.getStatus()).isEqualTo(originalStatus);
        assertThat(response.id()).isEqualTo(4L);
        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.PENDING);
    }

    @Test
    void retryUsesEditedPromptForNewRequestWithoutChangingFailedOriginal() {
        AiNewsDraftRequest original = draftRequest(3L, AiNewsDraftRequestStatus.FAILED);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(original));
        given(userRepository.getByIdOrThrow(9L)).willReturn(admin);
        given(requestRepository.save(any(AiNewsDraftRequest.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        AiNewsDraftRequestDtos.Response response = service.retry(
                3L, new AiNewsDraftRequestDtos.RetryRequest("  수정한 작성 요청  "), 9L);

        ArgumentCaptor<AiNewsDraftRequest> requestCaptor = ArgumentCaptor.forClass(AiNewsDraftRequest.class);
        verify(requestRepository).save(requestCaptor.capture());
        assertThat(requestCaptor.getValue().getPrompt()).isEqualTo("수정한 작성 요청");
        assertThat(original.getPrompt()).isEqualTo("공식 발표를 확인해 작성");
        assertThat(original.getStatus()).isEqualTo(AiNewsDraftRequestStatus.FAILED);
        assertThat(response.prompt()).isEqualTo("수정한 작성 요청");
        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.PENDING);
    }

    @Test
    void retryRejectsPendingRequestWithConflictStatus() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.PENDING);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        assertInvalidStatus(() -> service.retry(3L, null, 9L));

        verify(requestRepository, never()).save(any(AiNewsDraftRequest.class));
        verify(userRepository, never()).getByIdOrThrow(any());
    }

    @ParameterizedTest
    @EnumSource(value = AiNewsDraftRequestStatus.class, names = {"FAILED", "CANCELLED", "COMPLETED"})
    void deleteHistoryRemovesTerminalRequestOnlyAndKeepsArticleUntouched(AiNewsDraftRequestStatus status) {
        AiNewsDraftRequest request = draftRequest(3L, status);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        service.deleteHistory(3L);

        verify(requestRepository).delete(request);
        verify(articleRepository, never()).delete(any(AiNewsArticle.class));
        verify(aiNewsService, never()).delete(any(), any(), any());
    }

    @Test
    void deleteHistoryRejectsPendingRequest() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.PENDING);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        assertInvalidStatus(() -> service.deleteHistory(3L));

        verify(requestRepository, never()).delete(any(AiNewsDraftRequest.class));
    }

    @Test
    void cancelUsesLockedLookupAndRejectsCompletedRequest() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.COMPLETED);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        assertInvalidStatus(() -> service.cancel(3L));

        assertThat(request.getStatus()).isEqualTo(AiNewsDraftRequestStatus.COMPLETED);
    }

    @ParameterizedTest
    @EnumSource(value = AiNewsDraftRequestStatus.class, names = {"PENDING", "FAILED"})
    void cancelKeepsExistingContractForCancellableStatuses(AiNewsDraftRequestStatus status) {
        AiNewsDraftRequest request = draftRequest(3L, status);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        AiNewsDraftRequestDtos.Response response = service.cancel(3L);

        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.CANCELLED);
        assertThat(request.getStatus()).isEqualTo(AiNewsDraftRequestStatus.CANCELLED);
    }

    @Test
    void completeAlwaysCreatesDraftAndLinksItToRequest() {
        AiNewsDraftRequest request = AiNewsDraftRequest.builder()
                .id(3L).prompt("공식 발표를 확인해 작성").requestedBy(admin).build();
        AiNewsArticle article = AiNewsArticle.builder()
                .id(77L).articleType(AiNewsArticleType.RELEASE_NEWS).status(AiNewsArticleStatus.DRAFT)
                .category(AiNewsCategory.WHISKY).title("국내 출시 소식").content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE).dedupeKey("admin-request:3").build();
        AiNewsDtos.ArticleDetailResponse created = mock(AiNewsDtos.ArticleDetailResponse.class);
        given(created.id()).willReturn(77L);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));
        given(articleRepository.findByDedupeKey("admin-request:3")).willReturn(Optional.empty());
        given(aiNewsService.createDraft(any(AiNewsDtos.ArticleUpsertRequest.class), any()))
                .willReturn(created);
        given(articleRepository.findById(77L)).willReturn(Optional.of(article));

        AiNewsDtos.ArticleUpsertRequest result = new AiNewsDtos.ArticleUpsertRequest(
                AiNewsArticleType.RELEASE_NEWS, AiNewsCategory.WHISKY, "국내 출시 소식", "<p>본문</p>",
                "crawler-value", BigDecimal.valueOf(0.9), null, "출시 지문", null, null,
                true, true, null, null, null, "gemini", List.of("위스키"), List.of());

        AiNewsDraftRequestDtos.Response response = service.complete(3L, result);

        ArgumentCaptor<AiNewsDtos.ArticleUpsertRequest> draftCaptor =
                ArgumentCaptor.forClass(AiNewsDtos.ArticleUpsertRequest.class);
        verify(aiNewsService).createDraft(draftCaptor.capture(), org.mockito.ArgumentMatchers.eq(9L));
        assertThat(draftCaptor.getValue().dedupeKey()).isEqualTo("admin-request:3");
        assertThat(draftCaptor.getValue().autoPublishRequested()).isFalse();
        assertThat(draftCaptor.getValue().pinned()).isFalse();
        assertThat(response.status()).isEqualTo(AiNewsDraftRequestStatus.COMPLETED);
        assertThat(response.articleId()).isEqualTo(77L);
    }

    @Test
    void completedRequestIsIdempotentAndDoesNotCreateAnotherArticle() {
        AiNewsArticle article = AiNewsArticle.builder()
                .id(77L).articleType(AiNewsArticleType.RELEASE_NEWS).status(AiNewsArticleStatus.DRAFT)
                .category(AiNewsCategory.WHISKY).title("국내 출시 소식").content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE).dedupeKey("admin-request:3").build();
        AiNewsDraftRequest request = AiNewsDraftRequest.builder()
                .id(3L).prompt("공식 발표를 확인해 작성")
                .status(AiNewsDraftRequestStatus.COMPLETED).article(article).requestedBy(admin).build();
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        AiNewsDraftRequestDtos.Response response = service.complete(3L, releaseResult());

        assertThat(response.articleId()).isEqualTo(77L);
        verify(aiNewsService, never()).createDraft(any(), any());
    }

    @Test
    void completeRejectsCancelledRequestWithConflictStatus() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.CANCELLED);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        assertInvalidStatus(() -> service.complete(3L, releaseResult()));

        verify(aiNewsService, never()).createDraft(any(), any());
    }

    @Test
    void failRejectsTerminalRequestWithConflictStatus() {
        AiNewsDraftRequest request = draftRequest(3L, AiNewsDraftRequestStatus.CANCELLED);
        given(requestRepository.findByIdForUpdate(3L)).willReturn(Optional.of(request));

        assertInvalidStatus(() -> service.fail(3L, new AiNewsDraftRequestDtos.FailRequest("실패")));

        assertThat(request.getStatus()).isEqualTo(AiNewsDraftRequestStatus.CANCELLED);
    }

    private AiNewsDraftRequest draftRequest(Long id, AiNewsDraftRequestStatus status) {
        return AiNewsDraftRequest.builder()
                .id(id)
                .prompt("공식 발표를 확인해 작성")
                .status(status)
                .requestedBy(admin)
                .build();
    }

    private AiNewsDtos.ArticleUpsertRequest releaseResult() {
        return new AiNewsDtos.ArticleUpsertRequest(
                AiNewsArticleType.RELEASE_NEWS, AiNewsCategory.WHISKY, "국내 출시 소식", "<p>본문</p>",
                "crawler-value", BigDecimal.valueOf(0.9), null, "출시 지문", null, null,
                true, true, null, null, null, "gemini", List.of("위스키"), List.of());
    }

    private void assertInvalidStatus(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.AI_NEWS_INVALID_STATUS));
    }
}
