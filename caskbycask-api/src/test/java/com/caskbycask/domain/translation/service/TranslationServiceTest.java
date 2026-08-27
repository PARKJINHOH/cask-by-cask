package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.client.GoogleTranslationClient;
import com.caskbycask.domain.translation.dto.TranslationRequest;
import com.caskbycask.domain.translation.dto.TranslationResponse;
import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TranslationServiceTest {

    @Mock TranslationSourceResolver sourceResolver;
    @Mock TranslationCacheStore cacheStore;
    @Mock TranslationQuotaService quotaService;
    @Mock TranslationLockService lockService;
    @Mock GoogleTranslationClient googleClient;
    @Mock TranslationMetrics metrics;

    private TranslationService service;

    @BeforeEach
    void setUp() {
        service = new TranslationService(
                sourceResolver, cacheStore, quotaService, lockService,
                googleClient, metrics, new ObjectMapper());
        ReflectionTestUtils.setField(service, "enabled", true);
        org.mockito.Mockito.lenient().when(googleClient.isConfigured()).thenReturn(true);
    }

    @Test
    void cacheHitDoesNotReserveQuotaOrCallGoogle() {
        TranslationRequest request = request();
        Map<String, String> source = Map.of("comment", "좋아요");
        given(sourceResolver.resolve(request.resourceType(), request.resourceId())).willReturn(source);
        given(cacheStore.find(
                org.mockito.ArgumentMatchers.eq(request.resourceType()),
                org.mockito.ArgumentMatchers.eq(request.resourceId()),
                org.mockito.ArgumentMatchers.eq(request.targetLanguage()),
                org.mockito.ArgumentMatchers.anyString()))
                .willReturn(Optional.of(Map.of("comment", "Good")));

        TranslationResponse response = service.translate(request);

        assertThat(response.fields()).containsEntry("comment", "Good");
        verify(quotaService, never()).reserve(org.mockito.ArgumentMatchers.anyLong());
        verify(googleClient, never()).translate(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void translatesNonBlankFieldsOnceAndCountsUnicodeCodePoints() {
        TranslationRequest request = request();
        LinkedHashMap<String, String> source = new LinkedHashMap<>();
        source.put("noseNote", "A😀 "); // UTF-16 4 chars, Unicode code points 3
        source.put("tasteNote", "");
        source.put("finishNote", "");
        source.put("comment", "맛");   // 1 code point
        given(sourceResolver.resolve(request.resourceType(), request.resourceId())).willReturn(source);
        given(cacheStore.find(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString()))
                .willReturn(Optional.empty());
        TranslationLockService.LockToken lock = new TranslationLockService.LockToken("key", "token");
        given(lockService.tryAcquire(org.mockito.ArgumentMatchers.anyString())).willReturn(lock);
        given(googleClient.translate(List.of("A😀 ", "맛"), TranslationLanguage.EN))
                .willReturn(List.of("A😀 ", "Taste"));
        given(cacheStore.save(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyMap()))
                .willAnswer(invocation -> invocation.getArgument(4));

        TranslationResponse response = service.translate(request);

        verify(quotaService).reserve(4);
        verify(lockService).release(lock);
        assertThat(response.fields()).containsExactly(
                Map.entry("noseNote", "A😀 "),
                Map.entry("tasteNote", ""),
                Map.entry("finishNote", ""),
                Map.entry("comment", "Taste"));
    }

    @Test
    void emptyPublicContentDoesNotTouchCacheOrQuota() {
        TranslationRequest request = request();
        LinkedHashMap<String, String> emptyFields = new LinkedHashMap<>();
        emptyFields.put("noseNote", "");
        emptyFields.put("tasteNote", "");
        emptyFields.put("finishNote", "");
        emptyFields.put("comment", "");
        given(sourceResolver.resolve(request.resourceType(), request.resourceId())).willReturn(emptyFields);
        ReflectionTestUtils.setField(service, "enabled", false);

        TranslationResponse response = service.translate(request);

        assertThat(response.fields()).containsExactlyEntriesOf(emptyFields);
        verify(cacheStore, never()).find(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
        verify(quotaService, never()).reserve(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void concurrentMissForSameCacheKeyCallsGoogleOnlyOnce() throws Exception {
        TranslationRequest request = request();
        LinkedHashMap<String, String> source = new LinkedHashMap<>();
        source.put("noseNote", "꽃 향");
        source.put("tasteNote", "");
        source.put("finishNote", "");
        source.put("comment", "좋아요");
        given(sourceResolver.resolve(request.resourceType(), request.resourceId())).willReturn(source);

        AtomicReference<Map<String, String>> stored = new AtomicReference<>();
        given(cacheStore.find(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString()))
                .willAnswer(invocation -> Optional.ofNullable(stored.get()));
        TranslationLockService.LockToken lock = new TranslationLockService.LockToken("key", "token");
        AtomicBoolean lockGranted = new AtomicBoolean();
        given(lockService.tryAcquire(org.mockito.ArgumentMatchers.anyString()))
                .willAnswer(invocation -> lockGranted.compareAndSet(false, true) ? lock : null);
        given(googleClient.translate(List.of("꽃 향", "좋아요"), TranslationLanguage.EN))
                .willAnswer(invocation -> {
                    Thread.sleep(100);
                    return List.of("Floral", "Great");
                });
        given(cacheStore.save(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyMap()))
                .willAnswer(invocation -> {
                    Map<String, String> value = new LinkedHashMap<>(invocation.getArgument(4));
                    stored.set(value);
                    return value;
                });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<TranslationResponse> first = executor.submit(() -> {
                start.await();
                return service.translate(request);
            });
            Future<TranslationResponse> second = executor.submit(() -> {
                start.await();
                return service.translate(request);
            });
            start.countDown();

            assertThat(first.get().fields().get("comment")).isEqualTo("Great");
            assertThat(second.get().fields().get("comment")).isEqualTo("Great");
        } finally {
            executor.shutdownNow();
        }

        verify(googleClient, times(1)).translate(List.of("꽃 향", "좋아요"), TranslationLanguage.EN);
        verify(quotaService, times(1)).reserve(6);
    }

    @Test
    void codePointCounterIncludesWhitespaceButCountsEmojiOnce() {
        assertThat(TranslationService.codePointLength("가 😀\n")).isEqualTo(4);
    }

    private TranslationRequest request() {
        return new TranslationRequest(TranslationResourceType.REVIEW, 7L, TranslationLanguage.EN);
    }
}
