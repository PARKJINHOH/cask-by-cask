package com.drinkindex.domain.community.batch;

import com.drinkindex.domain.community.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationCleanupBatch {

    private final NotificationRepository notificationRepository;

    // 매일 새벽 3시 실행 — 90일 초과 알림 Hard Delete
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void deleteOldNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        notificationRepository.deleteOlderThan(cutoff);
        log.info("알림 자동 삭제 완료 — 기준일: {}", cutoff);
    }
}
