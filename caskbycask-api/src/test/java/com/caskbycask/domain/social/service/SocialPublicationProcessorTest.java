package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialConnectionStatus;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SocialPublicationProcessorTest {

    @Mock
    private SocialPublicationStateService stateService;
    @Mock
    private SocialAccountConnectionRepository connectionRepository;
    @Mock
    private SocialContentFactory contentFactory;
    @Mock
    private SocialImageRenderService imageRenderService;
    @Mock
    private SocialTokenCipher tokenCipher;
    @Mock
    private MetaSocialClient metaClient;
    private SocialPublishingProperties properties;
    private SocialPublicationProcessor processor;

    @BeforeEach
    void setUp() {
        properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        properties.setPublicMediaBaseUrl("https://www.caskbycask.net");
        processor = new SocialPublicationProcessor(
                properties,
                stateService,
                connectionRepository,
                contentFactory,
                imageRenderService,
                tokenCipher,
                metaClient,
                new SimpleMeterRegistry()
        );
    }

    @Test
    void successfulPublicationPersistsEachProviderMilestone() {
        SocialPublication publication = queuedPublication();
        givenConnectedAccount(publication);
        when(stateService.load(11L)).thenReturn(Optional.of(publication));
        when(stateService.claim(11L)).thenReturn(Optional.of(publication));
        when(contentFactory.create(publication.getBundle(), SocialPlatform.INSTAGRAM))
                .thenReturn(new SocialPublicationContent(
                        "caption", "https://source/image.jpg", "/ko/reviews/77", "Review"));
        when(metaClient.createImageContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token",
                "https://www.caskbycask.net/api/social/images/rendered.jpg", "caption"))
                .thenReturn("container");
        when(metaClient.publishContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token", "container"))
                .thenReturn("media");
        when(metaClient.getPermalink(SocialPlatform.INSTAGRAM, "token", "media"))
                .thenReturn("https://instagram.com/p/media");

        processor.process(11L);

        InOrder order = inOrder(stateService, metaClient);
        order.verify(stateService).snapshot(
                11L, "caption",
                "https://www.caskbycask.net/api/social/images/rendered.jpg",
                "/api/social/images/rendered.jpg");
        order.verify(metaClient).createImageContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token",
                "https://www.caskbycask.net/api/social/images/rendered.jpg", "caption");
        order.verify(stateService).containerCreated(11L, "container");
        order.verify(metaClient).waitUntilContainerReady(
                SocialPlatform.INSTAGRAM, "token", "container");
        order.verify(stateService).publishing(11L);
        order.verify(metaClient).publishContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token", "container");
        order.verify(metaClient).getPermalink(SocialPlatform.INSTAGRAM, "token", "media");
        order.verify(stateService).published(
                11L, "media", "https://instagram.com/p/media");
    }

    @Test
    void reviewImageRenderingUsesLocalizedSpiritNameAsCaption() {
        SocialPublication publication = queuedUnrenderedPublication();
        givenConnectedAccount(publication);
        when(stateService.load(11L)).thenReturn(Optional.of(publication));
        when(stateService.claim(11L)).thenReturn(Optional.of(publication));
        when(contentFactory.create(publication.getBundle(), SocialPlatform.INSTAGRAM))
                .thenReturn(new SocialPublicationContent(
                        "caption", "https://source/image.jpg", "/ko/reviews/77",
                        "글렌피딕 12년 캐스크 123", "글렌피딕 12년", "후기",
                        "캐스크 123"));
        when(imageRenderService.renderReview(
                "https://source/image.jpg", "글렌피딕 12년", "캐스크 123", "후기"))
                .thenReturn("/api/social/images/review.jpg");
        when(metaClient.createImageContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token",
                "https://www.caskbycask.net/api/social/images/review.jpg", "caption"))
                .thenReturn("container");
        when(metaClient.publishContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token", "container"))
                .thenReturn("media");
        when(metaClient.getPermalink(SocialPlatform.INSTAGRAM, "token", "media"))
                .thenReturn("https://instagram.com/p/media");

        processor.process(11L);

        verify(imageRenderService).renderReview(
                "https://source/image.jpg", "글렌피딕 12년", "캐스크 123", "후기");
        verify(stateService).snapshot(
                11L, "caption",
                "https://www.caskbycask.net/api/social/images/review.jpg",
                "/api/social/images/review.jpg");
    }

    @Test
    void uncertainPublishOutcomeMovesToVerificationInsteadOfRetryingPublish() {
        SocialPublication publication = queuedPublication();
        givenConnectedAccount(publication);
        when(stateService.load(11L)).thenReturn(Optional.of(publication));
        when(stateService.claim(11L)).thenReturn(Optional.of(publication));
        when(contentFactory.create(publication.getBundle(), SocialPlatform.INSTAGRAM))
                .thenReturn(new SocialPublicationContent(
                        "caption", "https://source/image.jpg", "/ko/reviews/77", "Review"));
        when(metaClient.createImageContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token",
                "https://www.caskbycask.net/api/social/images/rendered.jpg", "caption"))
                .thenReturn("container");
        when(metaClient.publishContainer(
                SocialPlatform.INSTAGRAM, "ig-user", "token", "container"))
                .thenThrow(new SocialProviderException(
                        "NETWORK_ERROR", "Meta API network error.", true, true, null));

        processor.process(11L);

        verify(stateService).verifying(
                11L, "NETWORK_ERROR", "Meta API network error.");
        verify(stateService, never()).retryOrFail(
                eq(11L), anyString(), anyString(), eq(true));
        verify(stateService, never()).published(
                eq(11L), anyString(), anyString());
    }

    @Test
    void verificationFindsExistingPostWithoutCreatingAnotherContainer() {
        SocialPublication publication = verifyingPublication();
        givenConnectedAccount(publication);
        when(stateService.load(11L)).thenReturn(Optional.of(publication));
        when(metaClient.findRecentByCaption(
                SocialPlatform.INSTAGRAM, "ig-user", "token",
                "stable caption", publication.getLastAttemptAt()))
                .thenReturn(Optional.of(new MetaSocialClient.PublishedMedia(
                        "existing-media", "https://instagram.com/p/existing")));

        processor.process(11L);

        verify(stateService, never()).claim(11L);
        verify(metaClient, never()).createImageContainer(
                eq(SocialPlatform.INSTAGRAM), anyString(), anyString(), anyString(), anyString());
        verify(stateService).published(
                11L, "existing-media", "https://instagram.com/p/existing");
    }

    private void givenConnectedAccount(SocialPublication publication) {
        SocialAccountConnection connection = SocialAccountConnection.builder()
                .platform(publication.getPlatform())
                .externalUserId("ig-user")
                .username("official_ig")
                .encryptedAccessToken("encrypted")
                .tokenExpiresAt(LocalDateTime.now().plusDays(30))
                .grantedScopes("instagram_business_basic,instagram_business_content_publish")
                .status(SocialConnectionStatus.CONNECTED)
                .build();
        when(connectionRepository.findByPlatform(publication.getPlatform()))
                .thenReturn(Optional.of(connection));
        when(tokenCipher.decrypt("encrypted")).thenReturn("token");
    }

    private static SocialPublication queuedPublication() {
        return SocialPublication.builder()
                .id(11L)
                .bundle(bundle())
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.QUEUED)
                .build();
    }

    private static SocialPublication queuedUnrenderedPublication() {
        return SocialPublication.builder()
                .id(11L)
                .bundle(SocialPublishBundle.builder()
                        .id(10L)
                        .originType(SocialSourceType.REVIEW)
                        .originId(77L)
                        .contentType(SocialSourceType.REVIEW)
                        .contentId(77L)
                        .locale("ko")
                        .consentVersion("v1")
                        .consentedAt(LocalDateTime.now())
                        .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                        .shortCode("ABC123")
                        .build())
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.QUEUED)
                .build();
    }

    private static SocialPublication verifyingPublication() {
        return SocialPublication.builder()
                .id(11L)
                .bundle(bundle())
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.VERIFYING)
                .captionSnapshot("stable caption")
                .lastAttemptAt(LocalDateTime.now().minusMinutes(5))
                .build();
    }

    private static SocialPublishBundle bundle() {
        return SocialPublishBundle.builder()
                .id(10L)
                .originType(SocialSourceType.REVIEW)
                .originId(77L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(77L)
                .locale("ko")
                .consentVersion("v1")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .renderedImageUrl("/api/social/images/rendered.jpg")
                .shortCode("ABC123")
                .build();
    }
}
