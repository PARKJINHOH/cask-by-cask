package com.caskbycask.domain.social.batch;

import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import com.caskbycask.domain.social.service.SocialPublicationProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SocialPublicationScheduler {

    private final SocialPublicationRepository publicationRepository;
    private final SocialPublicationProcessor processor;

    @Scheduled(fixedDelayString = "${social-publishing.worker-delay-ms:15000}")
    public void publishPending() {
        List<Long> ids = publicationRepository.findProcessableIds(
                List.of(
                        SocialPublicationStatus.QUEUED,
                        SocialPublicationStatus.RETRY_WAIT,
                        SocialPublicationStatus.VERIFYING
                ),
                LocalDateTime.now(),
                PageRequest.of(0, 10)
        );
        ids.forEach(id -> {
            try {
                processor.process(id);
            } catch (Exception e) {
                log.warn("SNS publication worker could not claim/process job: id={}", id, e);
            }
        });
    }

    @Scheduled(fixedDelayString = "${social-publishing.recovery-delay-ms:300000}")
    public void recoverInterruptedJobs() {
        List<Long> ids = publicationRepository.findStaleIds(
                List.of(
                        SocialPublicationStatus.RENDERING,
                        SocialPublicationStatus.CONTAINER_CREATED,
                        SocialPublicationStatus.PUBLISHING
                ),
                LocalDateTime.now().minusMinutes(10),
                PageRequest.of(0, 50)
        );
        ids.forEach(id -> {
            try {
                processor.recoverInterrupted(id);
            } catch (Exception e) {
                log.warn("Failed to recover interrupted SNS publication: id={}", id, e);
            }
        });
    }
}
