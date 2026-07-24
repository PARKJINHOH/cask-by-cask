package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.SocialPublicationAttempt;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.repository.SocialPublicationAttemptRepository;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SocialPublicationStateService {

    private final SocialPublicationRepository publicationRepository;
    private final SocialPublicationAttemptRepository attemptRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<SocialPublication> claim(Long id) {
        SocialPublication publication = publicationRepository.findWithBundleById(id).orElse(null);
        if (publication == null) return Optional.empty();
        if (publication.getStatus() != SocialPublicationStatus.QUEUED
                && publication.getStatus() != SocialPublicationStatus.RETRY_WAIT) {
            return Optional.empty();
        }
        publication.beginAttempt(publication.getCaptionSnapshot(), publication.getImageUrlSnapshot());
        record(publication, "CLAIM", true, null, null);
        return Optional.of(publication);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<SocialPublication> load(Long id) {
        return publicationRepository.findWithBundleById(id);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void snapshot(Long id, String caption, String imageUrl, String renderedImageUrl) {
        SocialPublication publication = required(id);
        publication.setSnapshot(caption, imageUrl);
        if (renderedImageUrl != null) publication.getBundle().setRenderedImageUrl(renderedImageUrl);
        record(publication, "RENDER", true, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void containerCreated(Long id, String containerId) {
        SocialPublication publication = required(id);
        publication.containerCreated(containerId);
        record(publication, "CONTAINER", true, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishing(Long id) {
        required(id).publishing();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void published(Long id, String mediaId, String permalink) {
        SocialPublication publication = required(id);
        publication.published(mediaId, permalink);
        record(publication, "PUBLISH", true, null, permalink);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void awaitingPermalink(Long id, String mediaId, String code, String message) {
        SocialPublication publication = required(id);
        publication.awaitingPermalink(mediaId, code, message);
        record(publication, "PERMALINK", false, code, message);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishedWithoutPermalink(Long id, String code, String message) {
        SocialPublication publication = required(id);
        publication.publishedWithoutPermalink(code, message);
        record(publication, "PERMALINK", false, code, message);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void verifying(Long id, String code, String message) {
        SocialPublication publication = required(id);
        publication.verifying(code, message);
        record(publication, "PUBLISH", false, code, message);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SocialPublicationStatus retryOrFail(Long id, String code, String message, boolean retryable) {
        SocialPublication publication = required(id);
        if (retryable && publication.getAttemptCount() < 5) {
            publication.retryAt(nextRetryAt(publication.getAttemptCount()), code, message);
        } else {
            publication.fail(code, message);
        }
        record(publication, "ERROR", false, code, message);
        return publication.getStatus();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SocialPublicationStatus fail(Long id, String code, String message) {
        SocialPublication publication = required(id);
        publication.fail(code, message);
        record(publication, "ERROR", false, code, message);
        return publication.getStatus();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recoverInterrupted(Long id) {
        SocialPublication publication = required(id);
        publication.recoverAfterWorkerInterruption();
        record(publication, "RECOVER", true, "WORKER_INTERRUPTED",
                "Recovered an interrupted SNS publishing job.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markExternallyDeleted(Long id) {
        SocialPublication publication = required(id);
        publication.markExternallyDeleted();
        record(publication, "RECONCILE", true, "EXTERNALLY_DELETED",
                "The post no longer exists on the external platform.");
    }

    private SocialPublication required(Long id) {
        return publicationRepository.findWithBundleById(id)
                .orElseThrow(() -> new IllegalStateException("SNS publication not found: " + id));
    }

    private void record(SocialPublication publication, String stage, boolean success,
                        String providerCode, String message) {
        attemptRepository.save(SocialPublicationAttempt.builder()
                .publication(publication)
                .attemptNumber(publication.getAttemptCount())
                .stage(stage)
                .success(success)
                .providerCode(providerCode)
                .message(truncate(message))
                .build());
    }

    private static LocalDateTime nextRetryAt(int attemptCount) {
        return switch (attemptCount) {
            case 1 -> LocalDateTime.now().plusMinutes(1);
            case 2 -> LocalDateTime.now().plusMinutes(5);
            case 3 -> LocalDateTime.now().plusMinutes(15);
            case 4 -> LocalDateTime.now().plusHours(1);
            default -> LocalDateTime.now().plusHours(6);
        };
    }

    private static String truncate(String value) {
        return value == null || value.length() <= 1000 ? value : value.substring(0, 1000);
    }
}
