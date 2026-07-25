package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialDataDeletionRequest;
import com.caskbycask.domain.social.entity.enums.SocialDataDeletionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.social.repository.SocialDataDeletionRequestRepository;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocialMetaCallbackServiceTest {

    @Mock MetaSignedRequestVerifier signedRequestVerifier;
    @Mock SocialAccountConnectionRepository connectionRepository;
    @Mock SocialPublicationRepository publicationRepository;
    @Mock SocialDataDeletionRequestRepository deletionRequestRepository;

    private SocialMetaCallbackService service;

    @BeforeEach
    void setUp() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net/");
        service = new SocialMetaCallbackService(
                signedRequestVerifier,
                properties,
                connectionRepository,
                publicationRepository,
                deletionRequestRepository
        );
    }

    @Test
    void deauthorizationRemovesOnlyMatchingConnection() {
        SocialAccountConnection connection = mock(SocialAccountConnection.class);
        when(signedRequestVerifier.verify(SocialPlatform.THREADS, "signed"))
                .thenReturn(new MetaSignedRequestVerifier.Payload("user-1"));
        when(connectionRepository.findByPlatformAndExternalUserId(
                SocialPlatform.THREADS, "user-1"))
                .thenReturn(Optional.of(connection));

        service.deauthorize(SocialPlatform.THREADS, "signed");

        verify(connectionRepository).delete(connection);
        verifyNoInteractions(publicationRepository, deletionRequestRepository);
    }

    @Test
    void dataDeletionRemovesConnectionAndProviderDerivedPublicationData() {
        SocialAccountConnection connection = mock(SocialAccountConnection.class);
        when(signedRequestVerifier.verify(SocialPlatform.THREADS, "signed"))
                .thenReturn(new MetaSignedRequestVerifier.Payload("user-1"));
        when(connectionRepository.findByPlatformAndExternalUserId(
                SocialPlatform.THREADS, "user-1"))
                .thenReturn(Optional.of(connection));
        when(deletionRequestRepository.existsByConfirmationCode(anyString()))
                .thenReturn(false);

        var result = service.deleteData(SocialPlatform.THREADS, "signed");

        verify(connectionRepository).delete(connection);
        verify(publicationRepository).eraseProviderDataByPlatform(SocialPlatform.THREADS);
        assertThat(result.confirmationCode()).matches("[a-f0-9]{32}");
        assertThat(result.statusUrl()).isEqualTo(
                "https://www.caskbycask.net/api/social/meta/data-deletion/status/"
                        + result.confirmationCode());

        ArgumentCaptor<SocialDataDeletionRequest> captor =
                ArgumentCaptor.forClass(SocialDataDeletionRequest.class);
        verify(deletionRequestRepository).save(captor.capture());
        SocialDataDeletionRequest saved = captor.getValue();
        assertThat(saved.getPlatform()).isEqualTo(SocialPlatform.THREADS);
        assertThat(saved.getStatus()).isEqualTo(SocialDataDeletionStatus.COMPLETED);
        assertThat(saved.getCompletedAt()).isNotNull();
    }

    @Test
    void unknownAccountStillReceivesCompletedDeletionReceiptWithoutErasingHistory() {
        when(signedRequestVerifier.verify(SocialPlatform.THREADS, "signed"))
                .thenReturn(new MetaSignedRequestVerifier.Payload("unknown-user"));
        when(connectionRepository.findByPlatformAndExternalUserId(
                SocialPlatform.THREADS, "unknown-user"))
                .thenReturn(Optional.empty());
        when(deletionRequestRepository.existsByConfirmationCode(anyString()))
                .thenReturn(false);

        service.deleteData(SocialPlatform.THREADS, "signed");

        verify(connectionRepository, never()).delete(any());
        verifyNoInteractions(publicationRepository);
        verify(deletionRequestRepository).save(any(SocialDataDeletionRequest.class));
    }
}
