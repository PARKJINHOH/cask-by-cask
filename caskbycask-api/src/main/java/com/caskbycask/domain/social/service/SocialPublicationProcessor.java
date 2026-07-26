package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class SocialPublicationProcessor {

    private final SocialPublishingProperties properties;
    private final SocialPublicationStateService stateService;
    private final SocialAccountConnectionRepository connectionRepository;
    private final SocialContentFactory contentFactory;
    private final SocialImageRenderService imageRenderService;
    private final SocialTokenCipher tokenCipher;
    private final MetaSocialClient metaClient;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MeterRegistry meterRegistry;

    public void process(Long publicationId) {
        if (!properties.isEnabled()) return;
        SocialPublication current = stateService.load(publicationId).orElse(null);
        if (current == null) return;
        if (current.getStatus() == SocialPublicationStatus.VERIFYING) {
            verifyUncertain(current);
            return;
        }
        SocialPublication publication = stateService.claim(publicationId).orElse(null);
        if (publication == null) return;
        try {
            SocialAccountConnection connection = connectionRepository.findByPlatform(publication.getPlatform())
                    .orElseThrow(() -> new IllegalStateException(
                            publication.getPlatform() + " 공식 계정이 연결되지 않았습니다."));
            if (connection.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
                throw new IllegalStateException(publication.getPlatform() + " 장기 토큰이 만료되었습니다.");
            }
            String token = tokenCipher.decrypt(connection.getEncryptedAccessToken());

            Prepared prepared = prepare(publication);
            stateService.snapshot(publicationId, prepared.caption(), prepared.publicImageUrl(),
                    prepared.relativeImageUrl());

            String containerId = metaClient.createImageContainer(
                    publication.getPlatform(), connection.getExternalUserId(), token,
                    prepared.publicImageUrl(), prepared.caption());
            stateService.containerCreated(publicationId, containerId);
            metaClient.waitUntilContainerReady(publication.getPlatform(), token, containerId);
            stateService.publishing(publicationId);

            String mediaId = metaClient.publishContainer(
                    publication.getPlatform(), connection.getExternalUserId(), token, containerId);
            String permalink;
            try {
                permalink = metaClient.getPermalink(publication.getPlatform(), token, mediaId);
            } catch (Exception e) {
                stateService.awaitingPermalink(
                        publicationId, mediaId, "PERMALINK_PENDING", safeMessage(e));
                meterRegistry.counter("social.publication", "platform", publication.getPlatform().name(),
                        "result", "permalink_pending").increment();
                log.warn("SNS post was published but permalink lookup failed: publicationId={}, platform={}",
                        publicationId, publication.getPlatform(), e);
                return;
            }
            stateService.published(publicationId, mediaId, permalink);
            meterRegistry.counter("social.publication", "platform", publication.getPlatform().name(),
                    "result", "success").increment();
            notifySuccess(publication, permalink);
        } catch (SocialProviderException e) {
            if (e.isOutcomeUncertain()) {
                stateService.verifying(publicationId, e.getProviderCode(), e.getMessage());
            } else {
                SocialPublicationStatus status = stateService.retryOrFail(
                        publicationId, e.getProviderCode(), e.getMessage(), e.isRetryable());
                if (status == SocialPublicationStatus.FAILED) notifyFailure(publication);
            }
            meterRegistry.counter("social.publication", "platform", publication.getPlatform().name(),
                    "result", "failure").increment();
            log.warn("SNS publication failed: publicationId={}, platform={}, code={}",
                    publicationId, publication.getPlatform(), e.getProviderCode());
        } catch (Exception e) {
            stateService.fail(publicationId, "LOCAL_ERROR", safeMessage(e));
            notifyFailure(publication);
            meterRegistry.counter("social.publication", "platform", publication.getPlatform().name(),
                    "result", "failure").increment();
            log.warn("SNS publication failed locally: publicationId={}, platform={}",
                    publicationId, publication.getPlatform(), e);
        }
    }

    public void recoverInterrupted(Long publicationId) {
        stateService.recoverInterrupted(publicationId);
    }

    private Prepared prepare(SocialPublication publication) {
        if (publication.getCaptionSnapshot() != null
                && publication.getImageUrlSnapshot() != null
                && publication.getAttemptCount() > 1) {
            return new Prepared(publication.getCaptionSnapshot(),
                    publication.getImageUrlSnapshot(), publication.getBundle().getRenderedImageUrl());
        }
        SocialPublicationContent content = contentFactory.create(
                publication.getBundle(), publication.getPlatform());
        if (publication.getBundle().getRenderedImageUrl() != null) {
            String relativeImage = publication.getBundle().getRenderedImageUrl();
            return new Prepared(content.caption(), publicImageUrl(relativeImage), relativeImage);
        }
        String relativeImage = switch (publication.getBundle().getMediaMode()) {
            case REVIEW_IMAGE -> imageRenderService.renderReview(
                    content.sourceImageUrl(), content.imageTitle(), content.imageLabel());
            case DIRECT_UPLOAD -> imageRenderService.renderDirect(
                    publication.getBundle().getDirectImageUrl(), content.imageLabel());
            case TEMPLATE -> imageRenderService.renderTemplate(
                    publication.getBundle().getThumbnailTemplate().getBackgroundImageUrl(),
                    publication.getBundle().getThumbnailText() != null
                            ? publication.getBundle().getThumbnailText() : content.displayTitle(),
                    content.imageLabel());
        };
        return new Prepared(content.caption(), publicImageUrl(relativeImage), relativeImage);
    }

    private void verifyUncertain(SocialPublication publication) {
        try {
            SocialAccountConnection connection = connectionRepository.findByPlatform(publication.getPlatform())
                    .orElseThrow(() -> new IllegalStateException("SNS account is not connected."));
            String token = tokenCipher.decrypt(connection.getEncryptedAccessToken());
            if (publication.getExternalMediaId() != null) {
                String permalink = metaClient.getPermalink(
                        publication.getPlatform(), token, publication.getExternalMediaId());
                stateService.published(publication.getId(), publication.getExternalMediaId(), permalink);
                notifySuccess(publication, permalink);
                return;
            }
            var found = metaClient.findRecentByCaption(
                    publication.getPlatform(), connection.getExternalUserId(), token,
                    publication.getCaptionSnapshot(), publication.getLastAttemptAt());
            if (found.isPresent()) {
                var media = found.get();
                stateService.published(publication.getId(), media.mediaId(), media.permalink());
                notifySuccess(publication, media.permalink());
            } else if (publication.getLastAttemptAt() != null
                    && Duration.between(publication.getLastAttemptAt(), LocalDateTime.now()).toMinutes() >= 30) {
                stateService.fail(publication.getId(), "VERIFY_TIMEOUT",
                        "The provider result could not be verified. Check the platform before retrying.");
                notifyFailure(publication);
            } else {
                stateService.verifying(publication.getId(), "VERIFY_PENDING",
                        "The provider result is still being verified.");
            }
        } catch (Exception e) {
            if (publication.getLastAttemptAt() != null
                    && Duration.between(publication.getLastAttemptAt(), LocalDateTime.now()).toMinutes() >= 30) {
                if (publication.getExternalMediaId() != null) {
                    stateService.publishedWithoutPermalink(publication.getId(), "PERMALINK_UNAVAILABLE",
                            "The post was published, but its direct link could not be retrieved.");
                    notifyLinkUnavailable(publication);
                } else {
                    stateService.fail(publication.getId(), "VERIFY_TIMEOUT",
                            "The provider result could not be verified. Check the platform before retrying.");
                    notifyFailure(publication);
                }
            } else {
                stateService.verifying(publication.getId(), "VERIFY_RETRY",
                        "The provider result check failed temporarily and will be retried.");
            }
            log.warn("Uncertain SNS publication reconciliation failed: publicationId={}",
                    publication.getId(), e);
        }
    }

    private void notifySuccess(SocialPublication publication, String permalink) {
        if (publication.getBundle().getRequestedBy() == null) return;
        User recipient = userRepository.findById(publication.getBundle().getRequestedBy().getId()).orElse(null);
        if (recipient == null) return;
        notificationService.send(
                recipient,
                NotificationType.SOCIAL_PUBLICATION,
                publication.getPlatform().name() + " 게시가 완료되었습니다.",
                "SOCIAL_PUBLICATION",
                publication.getId()
        );
    }

    private void notifyFailure(SocialPublication publication) {
        if (publication.getBundle().getRequestedBy() == null) return;
        User recipient = userRepository.findById(publication.getBundle().getRequestedBy().getId()).orElse(null);
        if (recipient == null) return;
        notificationService.send(
                recipient,
                NotificationType.SOCIAL_PUBLICATION,
                publication.getPlatform().name() + " 게시에 실패했습니다. SNS 게시 이력에서 확인해주세요.",
                "SOCIAL_PUBLICATION",
                publication.getId()
        );
    }

    private void notifyLinkUnavailable(SocialPublication publication) {
        if (publication.getBundle().getRequestedBy() == null) return;
        User recipient = userRepository.findById(publication.getBundle().getRequestedBy().getId()).orElse(null);
        if (recipient == null) return;
        notificationService.send(
                recipient,
                NotificationType.SOCIAL_PUBLICATION,
                publication.getPlatform().name()
                        + " 게시는 완료됐지만 링크를 가져오지 못했습니다. 플랫폼에서 직접 확인해주세요.",
                "SOCIAL_PUBLICATION",
                publication.getId()
        );
    }

    private String publicImageUrl(String relativeImageUrl) {
        if (relativeImageUrl.startsWith("https://")) return relativeImageUrl;
        return properties.getPublicMediaBaseUrl().replaceAll("/+$", "")
                + (relativeImageUrl.startsWith("/") ? relativeImageUrl : "/" + relativeImageUrl);
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        if (message == null || message.isBlank()) return e.getClass().getSimpleName();
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }

    private record Prepared(String caption, String publicImageUrl, String relativeImageUrl) {}
}
