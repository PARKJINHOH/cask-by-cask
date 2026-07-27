package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.dto.SocialPublicationResponse;
import com.caskbycask.domain.social.dto.SocialPublicDtos;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SocialPublicationQueryService {

    private final SocialPublicationRepository publicationRepository;
    private final SocialContentFactory contentFactory;

    @Transactional(readOnly = true)
    public Page<SocialPublicationResponse> adminHistory(
            SocialPlatform platform, SocialPublicationStatus status, int page, int size) {
        return publicationRepository.findForAdmin(
                        platform, status,
                        PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(SocialPublicationResponse::from);
    }

    @Transactional(readOnly = true)
    public List<SocialPublicDtos.HubItem> publicHub(int size) {
        List<SocialPublication> publications = publicationRepository.findByStatusOrderByPublishedAtDesc(
                SocialPublicationStatus.PUBLISHED,
                PageRequest.of(0, Math.min(Math.max(size, 1) * 6, 100))
        ).getContent();
        Map<ContentKey, List<SocialPublication>> grouped = new LinkedHashMap<>();
        for (SocialPublication publication : publications) {
            var bundle = publication.getBundle();
            if (bundle.isSourceDeleted() || bundle.getContentType() == null || bundle.getContentId() == null) {
                continue;
            }
            ContentKey key = new ContentKey(bundle.getContentType(), bundle.getContentId());
            grouped.computeIfAbsent(key, ignored -> new java.util.ArrayList<>())
                    .add(publication);
        }
        return grouped.values().stream()
                .limit(Math.min(Math.max(size, 1), 50))
                .map(this::toHubItem)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private SocialPublicDtos.HubItem toHubItem(List<SocialPublication> publications) {
        SocialPublication first = publications.getFirst();
        try {
            SocialPublicationContent content = contentFactory.create(first.getBundle(), first.getPlatform());
            Map<SocialPlatform, SocialPublication> latestByPlatform = new LinkedHashMap<>();
            publications.forEach(value -> latestByPlatform.putIfAbsent(value.getPlatform(), value));
            return new SocialPublicDtos.HubItem(
                    first.getBundle().getId(),
                    first.getBundle().getContentType(),
                    first.getBundle().getContentId(),
                    content.displayTitle(),
                    first.getImageUrlSnapshot(),
                    content.destinationPath(),
                    latestByPlatform.values().stream()
                            .map(value -> new SocialPublicDtos.PlatformLink(
                                    value.getPlatform(), value.getPermalink()))
                            .toList(),
                    publications.stream()
                            .map(SocialPublication::getPublishedAt)
                            .filter(java.util.Objects::nonNull)
                            .max(java.time.LocalDateTime::compareTo)
                            .orElse(null)
            );
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private record ContentKey(SocialSourceType type, Long id) {}
}
