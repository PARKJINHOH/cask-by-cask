package com.caskbycask.domain.ainews.batch;

import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.repository.AiNewsArticleRepository;
import com.caskbycask.domain.ainews.service.AiNewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiNewsPublishScheduler {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private static final int BATCH_SIZE = 100;

    private final AiNewsArticleRepository articleRepository;
    private final AiNewsService aiNewsService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    public void publishDueArticles() {
        LocalDateTime now = LocalDateTime.now(SERVICE_ZONE);
        List<Long> dueIds = articleRepository.findDueScheduledIds(
                AiNewsArticleStatus.SCHEDULED, now, PageRequest.of(0, BATCH_SIZE));

        for (Long id : dueIds) {
            try {
                aiNewsService.publishScheduled(id, now);
            } catch (RuntimeException e) {
                log.error("예약된 AI 소식 발행에 실패했습니다. articleId={}", id, e);
            }
        }
    }
}
