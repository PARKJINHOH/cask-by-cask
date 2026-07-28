package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.SocialPublishBundleMedia;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialMediaRole;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SocialPublicationProcessor {

    private final SocialPublishingProperties properties;
    private final SocialPublicationStateService stateService;
    private final SocialAccountConnectionRepository connectionRepository;
    private final SocialContentFactory contentFactory;
    private final SocialImageRenderService imageRenderService;
    private final SocialPublishMediaService publishMediaService;
    private final SocialTokenCipher tokenCipher;
    private final MetaSocialClient metaClient;
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
            stateService.snapshot(publicationId, prepared.caption(),
                    prepared.publicImageUrls().getFirst(),
                    prepared.relativeImageUrls().getFirst());

            String containerId = prepared.publicImageUrls().size() == 1
                    ? metaClient.createImageContainer(
                            publication.getPlatform(), connection.getExternalUserId(), token,
                            prepared.publicImageUrls().getFirst(), prepared.caption())
                    : metaClient.createImageCarouselContainer(
                            publication.getPlatform(), connection.getExternalUserId(), token,
                            prepared.publicImageUrls(), prepared.caption());
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
        } catch (SocialProviderException e) {
            if (e.isOutcomeUncertain()) {
                stateService.verifying(publicationId, e.getProviderCode(), e.getMessage());
            } else {
                stateService.retryOrFail(
                        publicationId, e.getProviderCode(), e.getMessage(), e.isRetryable());
            }
            meterRegistry.counter("social.publication", "platform", publication.getPlatform().name(),
                    "result", "failure").increment();
            log.warn("SNS publication failed: publicationId={}, platform={}, code={}",
                    publicationId, publication.getPlatform(), e.getProviderCode());
        } catch (Exception e) {
            stateService.fail(publicationId, "LOCAL_ERROR", safeMessage(e));
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
        List<SocialPublishBundleMedia> media =
                publishMediaService.find(publication.getBundle().getId());
        if (!media.isEmpty()) {
            SocialPublicationContent content = contentFactory.create(
                    publication.getBundle(), publication.getPlatform());
            boolean news = publication.getBundle().getContentType()
                    == com.caskbycask.domain.social.entity.enums.SocialSourceType.POST;
            boolean includeNewsCover = news
                    && media.size() < MetaSocialClient.maxCarouselImages(publication.getPlatform());
            List<String> relativeImages = new ArrayList<>(
                    media.size() + (includeNewsCover ? 1 : 0));
            if (includeNewsCover) {
                String cover = publication.getBundle().getRenderedImageUrl();
                if (cover == null) {
                    cover = renderBundleImage(publication, content);
                }
                relativeImages.add(cover);
            }
            for (SocialPublishBundleMedia item : media) {
                String relative = item.getRenderedImageUrl();
                if (relative == null) {
                    relative = switch (item.getMediaRole()) {
                        case REPRESENTATIVE -> imageRenderService.renderReview(
                                    item.getSourceImageUrl(),
                                    content.imageTitle(),
                                    content.imageIdentifier(),
                                    content.imageNotice(),
                                    content.imageLabel());
                        case REVIEW_UPLOAD ->
                                imageRenderService.renderDirect(item.getSourceImageUrl(), null);
                        case EDITOR_IMAGE ->
                                imageRenderService.renderEditorImage(item.getSourceImageUrl());
                    };
                    publishMediaService.markRendered(item, relative);
                }
                relativeImages.add(relative);
            }
            String caption = publication.getCaptionSnapshot() != null
                    ? publication.getCaptionSnapshot()
                    : content.caption();
            return new Prepared(
                    caption,
                    relativeImages.stream().map(this::publicImageUrl).toList(),
                    List.copyOf(relativeImages)
            );
        }
        if (publication.getCaptionSnapshot() != null
                && publication.getImageUrlSnapshot() != null
                && publication.getAttemptCount() > 1) {
            return new Prepared(publication.getCaptionSnapshot(),
                    List.of(publication.getImageUrlSnapshot()),
                    List.of(publication.getBundle().getRenderedImageUrl()));
        }
        SocialPublicationContent content = contentFactory.create(
                publication.getBundle(), publication.getPlatform());
        if (publication.getBundle().getRenderedImageUrl() != null) {
            String relativeImage = publication.getBundle().getRenderedImageUrl();
            return new Prepared(content.caption(), List.of(publicImageUrl(relativeImage)),
                    List.of(relativeImage));
        }
        String relativeImage = renderBundleImage(publication, content);
        return new Prepared(content.caption(), List.of(publicImageUrl(relativeImage)),
                List.of(relativeImage));
    }

    private String renderBundleImage(SocialPublication publication,
                                     SocialPublicationContent content) {
        return switch (publication.getBundle().getMediaMode()) {
            case REVIEW_IMAGE -> imageRenderService.renderReview(
                    content.sourceImageUrl(), content.imageTitle(),
                    content.imageIdentifier(), content.imageNotice(),
                    content.imageLabel());
            case DIRECT_UPLOAD -> imageRenderService.renderDirect(
                    publication.getBundle().getDirectImageUrl(), content.imageLabel());
            case TEMPLATE -> imageRenderService.renderTemplate(
                    publication.getBundle().getThumbnailTemplate().getBackgroundImageUrl(),
                    publication.getBundle().getThumbnailText() != null
                            ? publication.getBundle().getThumbnailText() : content.displayTitle(),
                    content.imageLabel());
        };
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
                return;
            }
            var found = metaClient.findRecentByCaption(
                    publication.getPlatform(), connection.getExternalUserId(), token,
                    publication.getCaptionSnapshot(), publication.getLastAttemptAt());
            if (found.isPresent()) {
                var media = found.get();
                stateService.published(publication.getId(), media.mediaId(), media.permalink());
            } else if (publication.getLastAttemptAt() != null
                    && Duration.between(publication.getLastAttemptAt(), LocalDateTime.now()).toMinutes() >= 30) {
                stateService.fail(publication.getId(), "VERIFY_TIMEOUT",
                        "The provider result could not be verified. Check the platform before retrying.");
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
                } else {
                    stateService.fail(publication.getId(), "VERIFY_TIMEOUT",
                            "The provider result could not be verified. Check the platform before retrying.");
                }
            } else {
                stateService.verifying(publication.getId(), "VERIFY_RETRY",
                        "The provider result check failed temporarily and will be retried.");
            }
            log.warn("Uncertain SNS publication reconciliation failed: publicationId={}",
                    publication.getId(), e);
        }
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

    private record Prepared(
            String caption,
            List<String> publicImageUrls,
            List<String> relativeImageUrls
    ) {}
}
