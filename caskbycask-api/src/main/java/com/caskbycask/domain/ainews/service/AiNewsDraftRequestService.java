package com.caskbycask.domain.ainews.service;

import com.caskbycask.domain.ainews.dto.AiNewsDraftRequestDtos;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.AiNewsDraftRequest;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import com.caskbycask.domain.ainews.repository.AiNewsArticleRepository;
import com.caskbycask.domain.ainews.repository.AiNewsDraftRequestRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AiNewsDraftRequestService {

    private final AiNewsDraftRequestRepository requestRepository;
    private final AiNewsArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final AiNewsService aiNewsService;

    @Transactional(readOnly = true)
    public Page<AiNewsDraftRequestDtos.Response> list(int page, int size) {
        return requestRepository.findAllByOrderByCreatedAtDesc(
                        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))
                .map(AiNewsDraftRequestDtos.Response::from);
    }

    @Transactional
    public AiNewsDraftRequestDtos.Response create(AiNewsDraftRequestDtos.CreateRequest request, Long actorId) {
        User actor = userRepository.getByIdOrThrow(actorId);
        List<String> urls = normalizeUrls(request.referenceUrls());
        AiNewsDraftRequest entity = requestRepository.save(AiNewsDraftRequest.builder()
                .prompt(request.prompt().trim())
                .referenceUrl1(urls.size() > 0 ? urls.get(0) : null)
                .referenceUrl2(urls.size() > 1 ? urls.get(1) : null)
                .referenceUrl3(urls.size() > 2 ? urls.get(2) : null)
                .requestedBy(actor)
                .build());
        return AiNewsDraftRequestDtos.Response.from(entity);
    }

    @Transactional
    public AiNewsDraftRequestDtos.Response cancel(Long id) {
        AiNewsDraftRequest request = get(id);
        if (request.getStatus() != AiNewsDraftRequestStatus.PENDING
                && request.getStatus() != AiNewsDraftRequestStatus.FAILED) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        request.cancel();
        return AiNewsDraftRequestDtos.Response.from(request);
    }

    @Transactional(readOnly = true)
    public AiNewsDraftRequestDtos.Response nextPending() {
        return requestRepository.findFirstByStatusOrderByCreatedAtAsc(AiNewsDraftRequestStatus.PENDING)
                .map(AiNewsDraftRequestDtos.Response::from).orElse(null);
    }

    @Transactional
    public AiNewsDraftRequestDtos.Response complete(Long id, AiNewsDtos.ArticleUpsertRequest result) {
        AiNewsDraftRequest request = get(id);
        if (request.getStatus() == AiNewsDraftRequestStatus.COMPLETED) {
            return AiNewsDraftRequestDtos.Response.from(request);
        }
        if (request.getStatus() != AiNewsDraftRequestStatus.PENDING
                || result.articleType() != AiNewsArticleType.RELEASE_NEWS) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        String dedupeKey = "admin-request:" + id;
        AiNewsArticle article = articleRepository.findByDedupeKey(dedupeKey).orElse(null);
        if (article == null) {
            AiNewsDtos.ArticleUpsertRequest draft = new AiNewsDtos.ArticleUpsertRequest(
                    AiNewsArticleType.RELEASE_NEWS, result.category(), result.title(), result.content(), dedupeKey,
                    result.confidenceScore(), result.canonicalUrlHash(), result.semanticFingerprint(),
                    null, null, false, false, result.imageUrl(), result.imageKind(),
                    result.imageRightsEvidence(), result.modelName(), result.sources());
            AiNewsDtos.ArticleDetailResponse created = aiNewsService.createDraft(draft, request.getRequestedBy().getId());
            article = articleRepository.findById(created.id())
                    .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_NOT_FOUND));
        }
        request.complete(article);
        return AiNewsDraftRequestDtos.Response.from(request);
    }

    @Transactional
    public AiNewsDraftRequestDtos.Response fail(Long id, AiNewsDraftRequestDtos.FailRequest failure) {
        AiNewsDraftRequest request = get(id);
        if (request.getStatus() != AiNewsDraftRequestStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        request.fail(failure.reason().trim());
        return AiNewsDraftRequestDtos.Response.from(request);
    }

    private AiNewsDraftRequest get(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_NOT_FOUND));
    }

    private static List<String> normalizeUrls(List<String> rawUrls) {
        if (rawUrls == null || rawUrls.isEmpty()) return List.of();
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String raw : rawUrls) {
            try {
                URI parsed = URI.create(raw.trim()).normalize();
                String scheme = parsed.getScheme() == null ? null : parsed.getScheme().toLowerCase(Locale.ROOT);
                String host = parsed.getHost() == null ? null : parsed.getHost().toLowerCase(Locale.ROOT);
                if (!("http".equals(scheme) || "https".equals(scheme)) || host == null
                        || parsed.getUserInfo() != null) {
                    throw new CustomException(ErrorCode.INVALID_INPUT);
                }
                String value = parsed.toString();
                if (value.length() > 1500) throw new CustomException(ErrorCode.INVALID_INPUT);
                normalized.add(value);
            } catch (CustomException e) {
                throw e;
            } catch (RuntimeException e) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }
        if (normalized.size() > 3) throw new CustomException(ErrorCode.INVALID_INPUT);
        return new ArrayList<>(normalized);
    }
}
