package com.caskbycask.domain.social.batch;

import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import com.caskbycask.domain.social.service.MetaSocialClient;
import com.caskbycask.domain.social.service.SocialProviderException;
import com.caskbycask.domain.social.service.SocialPublicationStateService;
import com.caskbycask.domain.social.service.SocialTokenCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SocialExternalDeletionScheduler {

    private final SocialPublicationRepository publicationRepository;
    private final SocialAccountConnectionRepository connectionRepository;
    private final SocialTokenCipher tokenCipher;
    private final MetaSocialClient metaClient;
    private final SocialPublicationStateService stateService;

    @Scheduled(cron = "${social-publishing.reconciliation-cron:0 40 4 * * *}", zone = "Asia/Seoul")
    public void reconcilePublishedPosts() {
        var ids = publicationRepository.findIdsByStatus(
                SocialPublicationStatus.PUBLISHED, PageRequest.of(0, 500));
        for (Long id : ids) {
            try {
                var publication = publicationRepository.findWithBundleById(id).orElse(null);
                if (publication == null || publication.getExternalMediaId() == null) continue;
                var connection = connectionRepository.findByPlatform(publication.getPlatform()).orElse(null);
                if (connection == null) continue;
                metaClient.getPermalink(
                        publication.getPlatform(),
                        tokenCipher.decrypt(connection.getEncryptedAccessToken()),
                        publication.getExternalMediaId());
            } catch (SocialProviderException e) {
                if ("HTTP_404".equals(e.getProviderCode())) {
                    stateService.markExternallyDeleted(id);
                } else {
                    log.warn("SNS external deletion reconciliation failed: id={}, code={}",
                            id, e.getProviderCode());
                }
            } catch (Exception e) {
                log.warn("SNS external deletion reconciliation failed: id={}", id, e);
            }
        }
    }
}
