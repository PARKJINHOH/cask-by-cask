package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.client.GoogleTranslationClient;
import com.caskbycask.domain.translation.dto.TranslationRequest;
import com.caskbycask.domain.translation.dto.TranslationResponse;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TranslationService {

    private static final Duration CACHE_WAIT_TIMEOUT = Duration.ofSeconds(8);
    private static final long CACHE_POLL_MS = 200;

    private final TranslationSourceResolver sourceResolver;
    private final TranslationCacheStore cacheStore;
    private final TranslationQuotaService quotaService;
    private final TranslationLockService lockService;
    private final GoogleTranslationClient googleClient;
    private final TranslationMetrics metrics;
    private final ObjectMapper objectMapper;

    @Value("${translation.enabled:false}")
    private boolean enabled;

    public TranslationResponse translate(TranslationRequest request) {
        // 공개 여부를 캐시와 기능 플래그보다 먼저 확인한다. 숨겨진 리소스는 항상 기존 404 규칙을 따른다.
        Map<String, String> sourceFields = sourceResolver.resolve(
                request.resourceType(), request.resourceId());
        LinkedHashMap<String, String> translatableFields = new LinkedHashMap<>();
        sourceFields.forEach((key, value) -> {
            if (value != null && !value.isBlank()) translatableFields.put(key, value);
        });

        // 고정 필드 구조의 빈 문자열은 그대로 돌려주되 Google과 사용량 원장은 건드리지 않는다.
        if (translatableFields.isEmpty()) return response(request, sourceFields);

        if (!enabled || !googleClient.isConfigured()) {
            metrics.increment("disabled");
            throw new CustomException(ErrorCode.TRANSLATION_DISABLED);
        }

        String sourceHash = hash(sourceFields);
        Optional<Map<String, String>> cached = cacheStore.find(
                request.resourceType(), request.resourceId(), request.targetLanguage(), sourceHash);
        if (cached.isPresent()) {
            metrics.increment("cache_hit");
            return response(request, cached.get());
        }

        String lockKey = request.resourceType() + ":" + request.resourceId() + ":"
                + request.targetLanguage().getCode();
        TranslationLockService.LockToken lock = lockService.tryAcquire(lockKey);
        if (lock == null) {
            Map<String, String> waited = waitForCache(request, sourceHash)
                    .orElseThrow(() -> new CustomException(ErrorCode.TRANSLATION_BUSY));
            metrics.increment("cache_wait_hit");
            return response(request, waited);
        }

        try {
            // 잠금 대기 중 다른 요청이 채웠을 수 있으므로 외부 호출 직전에 다시 확인한다.
            Optional<Map<String, String>> rechecked = cacheStore.find(
                    request.resourceType(), request.resourceId(), request.targetLanguage(), sourceHash);
            if (rechecked.isPresent()) {
                metrics.increment("cache_hit");
                return response(request, rechecked.get());
            }

            long characters = translatableFields.values().stream()
                    .mapToLong(TranslationService::codePointLength)
                    .sum();
            quotaService.reserve(characters);

            List<String> keys = new ArrayList<>(translatableFields.keySet());
            List<String> translated = googleClient.translate(
                    keys.stream().map(translatableFields::get).toList(), request.targetLanguage());
            Map<String, String> latestSource = sourceResolver.resolve(
                    request.resourceType(), request.resourceId());
            if (!sourceHash.equals(hash(latestSource))) {
                metrics.increment("source_changed");
                throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
            }

            LinkedHashMap<String, String> translatedFields = new LinkedHashMap<>();
            int translatedIndex = 0;
            for (Map.Entry<String, String> source : sourceFields.entrySet()) {
                translatedFields.put(source.getKey(), source.getValue().isBlank()
                        ? ""
                        : translated.get(translatedIndex++));
            }
            Map<String, String> saved = cacheStore.save(
                    request.resourceType(), request.resourceId(), request.targetLanguage(),
                    sourceHash, translatedFields);
            metrics.increment("provider_success");
            return response(request, saved);
        } finally {
            lockService.release(lock);
        }
    }

    private Optional<Map<String, String>> waitForCache(TranslationRequest request, String sourceHash) {
        Instant deadline = Instant.now().plus(CACHE_WAIT_TIMEOUT);
        while (Instant.now().isBefore(deadline)) {
            try {
                Thread.sleep(CACHE_POLL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            }
            Optional<Map<String, String>> cached = cacheStore.find(
                    request.resourceType(), request.resourceId(), request.targetLanguage(), sourceHash);
            if (cached.isPresent()) return cached;
        }
        metrics.increment("busy");
        return Optional.empty();
    }

    static long codePointLength(String value) {
        return value.codePointCount(0, value.length());
    }

    private String hash(Map<String, String> fields) {
        try {
            byte[] canonical = objectMapper.writeValueAsBytes(fields);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical));
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        }
    }

    private TranslationResponse response(TranslationRequest request, Map<String, String> fields) {
        return new TranslationResponse(
                request.resourceType(), request.resourceId(), request.targetLanguage(), fields);
    }
}
